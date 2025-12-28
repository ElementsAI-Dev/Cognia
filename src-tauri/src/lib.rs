//! Cognia Tauri application library
//!
//! This is the main entry point for the Tauri desktop application.

mod awareness;
mod commands;
mod context;
mod mcp;
mod sandbox;
mod screenshot;
mod selection;
mod tray;

use awareness::AwarenessManager;
use context::ContextManager;
use mcp::McpManager;
use sandbox::SandboxState;
use screenshot::ScreenshotManager;
use selection::SelectionManager;
use tauri::Manager;
use commands::vector::VectorStoreState;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // Initialize logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize system tray
            if let Err(e) = tray::create_tray(app.handle()) {
                log::error!("Failed to create system tray: {}", e);
            }

            // Get app data directory for MCP config storage
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            // Initialize vector store state (local JSON persistence)
            let vector_path = app_data_dir.join("vector_store.json");
            let vector_state = Arc::new(
                VectorStoreState::new(vector_path)
                    .expect("Failed to initialize vector store state"),
            );
            app.manage(vector_state);

            // Initialize MCP Manager
            let sandbox_data_dir = app_data_dir.clone();
            let mcp_manager = McpManager::new(app.handle().clone(), app_data_dir);

            // Store manager in app state
            app.manage(mcp_manager);

            // Initialize MCP manager in background
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let manager = handle.state::<McpManager>();
                if let Err(e) = manager.initialize().await {
                    log::error!("Failed to initialize MCP manager: {}", e);
                }
            });

            // Initialize Selection Manager
            let selection_manager = SelectionManager::new(app.handle().clone());
            app.manage(selection_manager);

            // Start selection detection if enabled
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let manager = handle.state::<SelectionManager>();
                if let Err(e) = manager.start().await {
                    log::error!("Failed to start selection manager: {}", e);
                }
            });

            // Initialize Screenshot Manager
            let screenshot_manager = ScreenshotManager::new(app.handle().clone());
            app.manage(screenshot_manager);

            // Initialize Context Manager
            let context_manager = ContextManager::new();
            app.manage(context_manager);

            // Initialize Awareness Manager
            let awareness_manager = AwarenessManager::new();
            app.manage(awareness_manager);

            // Initialize Sandbox State
            let sandbox_config_path = sandbox_data_dir.join("sandbox_config.json");
            let handle_for_sandbox = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match SandboxState::new(sandbox_config_path).await {
                    Ok(sandbox_state) => {
                        handle_for_sandbox.manage(sandbox_state);
                        log::info!("Sandbox state initialized");
                    }
                    Err(e) => {
                        log::error!("Failed to initialize sandbox state: {}", e);
                    }
                }
            });

            // Setup splash screen and main window
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Simulate setup tasks
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

                // Close splash screen and show main window
                if let Some(splash) = app_handle.get_webview_window("splashscreen") {
                    let _ = splash.close();
                }
                if let Some(main) = app_handle.get_webview_window("main") {
                    let _ = main.show();
                }
            });

            Ok(())
        })
        .on_menu_event(|app, event| {
            tray::handle_tray_menu_event(app, event.id.0.to_string());
        })
        .invoke_handler(tauri::generate_handler![
            // MCP commands
            commands::mcp::mcp_get_servers,
            commands::mcp::mcp_get_server,
            commands::mcp::mcp_add_server,
            commands::mcp::mcp_remove_server,
            commands::mcp::mcp_update_server,
            commands::mcp::mcp_connect_server,
            commands::mcp::mcp_disconnect_server,
            commands::mcp::mcp_call_tool,
            commands::mcp::mcp_get_all_tools,
            commands::mcp::mcp_read_resource,
            commands::mcp::mcp_get_prompt,
            commands::mcp::mcp_reload_config,
            commands::mcp::mcp_install_npm_package,
            commands::mcp::mcp_install_pip_package,
            commands::mcp::mcp_check_command_exists,
            commands::mcp::mcp_ping_server,
            commands::mcp::mcp_set_log_level,
            commands::mcp::mcp_subscribe_resource,
            commands::mcp::mcp_unsubscribe_resource,
            // API testing commands
            commands::api::test_openai_connection,
            commands::api::test_anthropic_connection,
            commands::api::test_google_connection,
            commands::api::test_deepseek_connection,
            commands::api::test_groq_connection,
            commands::api::test_mistral_connection,
            commands::api::test_ollama_connection,
            commands::api::test_custom_provider_connection,
            // Clipboard commands
            commands::clipboard::read_clipboard_image,
            commands::clipboard::read_clipboard_text,
            commands::clipboard::write_clipboard_text,
            commands::clipboard::clipboard_has_image,
            // Ollama commands
            commands::ollama::ollama_get_status,
            commands::ollama::ollama_list_models,
            commands::ollama::ollama_show_model,
            commands::ollama::ollama_pull_model,
            commands::ollama::ollama_delete_model,
            commands::ollama::ollama_list_running,
            commands::ollama::ollama_copy_model,
            commands::ollama::ollama_generate_embedding,
            commands::ollama::ollama_stop_model,
            // Vector (local) commands
            commands::vector::vector_create_collection,
            commands::vector::vector_delete_collection,
            commands::vector::vector_rename_collection,
            commands::vector::vector_truncate_collection,
            commands::vector::vector_export_collection,
            commands::vector::vector_import_collection,
            commands::vector::vector_list_collections,
            commands::vector::vector_get_collection,
            commands::vector::vector_upsert_points,
            commands::vector::vector_delete_points,
            commands::vector::vector_delete_all_points,
            commands::vector::vector_get_points,
            commands::vector::vector_search_points,
            commands::vector::vector_scroll_points,
            commands::vector::vector_stats,
            // Selection toolbar commands
            commands::selection::selection_start,
            commands::selection::selection_stop,
            commands::selection::selection_get_text,
            commands::selection::selection_show_toolbar,
            commands::selection::selection_hide_toolbar,
            commands::selection::selection_is_toolbar_visible,
            commands::selection::selection_get_toolbar_text,
            commands::selection::selection_update_config,
            commands::selection::selection_get_config,
            commands::selection::selection_trigger,
            commands::selection::selection_get_status,
            commands::selection::selection_set_enabled,
            commands::selection::selection_is_enabled,
            commands::selection::selection_restart,
            commands::selection::selection_set_toolbar_hovered,
            commands::selection::selection_set_auto_hide_timeout,
            commands::selection::selection_get_detection_stats,
            commands::selection::selection_get_enhanced,
            commands::selection::selection_analyze_current,
            commands::selection::selection_expand_to_word,
            commands::selection::selection_expand_to_sentence,
            commands::selection::selection_expand_to_line,
            commands::selection::selection_expand_to_paragraph,
            // Selection history commands
            commands::selection::selection_get_history,
            commands::selection::selection_search_history,
            commands::selection::selection_search_history_by_app,
            commands::selection::selection_search_history_by_type,
            commands::selection::selection_get_history_stats,
            commands::selection::selection_clear_history,
            commands::selection::selection_export_history,
            commands::selection::selection_import_history,
            // Clipboard history commands
            commands::selection::clipboard_get_history,
            commands::selection::clipboard_search_history,
            commands::selection::clipboard_get_pinned,
            commands::selection::clipboard_pin_entry,
            commands::selection::clipboard_unpin_entry,
            commands::selection::clipboard_delete_entry,
            commands::selection::clipboard_clear_unpinned,
            commands::selection::clipboard_clear_all,
            commands::selection::clipboard_copy_entry,
            commands::selection::clipboard_check_update,
            // Smart selection commands
            commands::selection::selection_smart_expand,
            commands::selection::selection_auto_expand,
            commands::selection::selection_get_modes,
            // AI processing commands
            commands::selection::selection_ai_process,
            commands::selection::selection_ai_process_stream,
            commands::selection::selection_detect_text_type,
            commands::selection::selection_get_toolbar_config,
            commands::selection::selection_set_theme,
            commands::selection::selection_get_stats_summary,
            // Screenshot commands
            commands::screenshot::screenshot_capture_fullscreen,
            commands::screenshot::screenshot_capture_window,
            commands::screenshot::screenshot_capture_region,
            commands::screenshot::screenshot_start_region_selection,
            commands::screenshot::screenshot_ocr,
            commands::screenshot::screenshot_get_monitors,
            commands::screenshot::screenshot_update_config,
            commands::screenshot::screenshot_get_config,
            commands::screenshot::screenshot_save,
            // Screenshot history commands
            commands::screenshot::screenshot_get_history,
            commands::screenshot::screenshot_search_history,
            commands::screenshot::screenshot_get_by_id,
            commands::screenshot::screenshot_pin,
            commands::screenshot::screenshot_unpin,
            commands::screenshot::screenshot_delete,
            commands::screenshot::screenshot_clear_history,
            // Windows OCR commands
            commands::screenshot::screenshot_ocr_windows,
            commands::screenshot::screenshot_get_ocr_languages,
            // Capture with history commands
            commands::screenshot::screenshot_capture_fullscreen_with_history,
            commands::screenshot::screenshot_capture_window_with_history,
            commands::screenshot::screenshot_capture_region_with_history,
            // Context commands
            commands::context::context_get_full,
            commands::context::context_get_window,
            commands::context::context_get_app,
            commands::context::context_get_file,
            commands::context::context_get_browser,
            commands::context::context_get_editor,
            commands::context::context_get_all_windows,
            commands::context::context_clear_cache,
            commands::context::context_find_windows_by_title,
            commands::context::context_find_windows_by_process,
            // Awareness commands
            commands::awareness::awareness_get_state,
            commands::awareness::awareness_get_system_state,
            commands::awareness::awareness_get_suggestions,
            commands::awareness::awareness_record_activity,
            commands::awareness::awareness_get_recent_activities,
            commands::awareness::awareness_start_monitoring,
            commands::awareness::awareness_stop_monitoring,
            commands::awareness::awareness_clear_history,
            // Focus tracking commands
            commands::awareness::awareness_start_focus_tracking,
            commands::awareness::awareness_stop_focus_tracking,
            commands::awareness::awareness_is_focus_tracking,
            commands::awareness::awareness_record_focus_change,
            commands::awareness::awareness_get_current_focus,
            commands::awareness::awareness_get_recent_focus_sessions,
            commands::awareness::awareness_get_app_usage_stats,
            commands::awareness::awareness_get_all_app_usage_stats,
            commands::awareness::awareness_get_today_usage_summary,
            commands::awareness::awareness_get_daily_usage_summary,
            commands::awareness::awareness_clear_focus_history,
            // Sandbox commands
            commands::sandbox::sandbox_execute,
            commands::sandbox::sandbox_get_status,
            commands::sandbox::sandbox_get_config,
            commands::sandbox::sandbox_update_config,
            commands::sandbox::sandbox_get_runtimes,
            commands::sandbox::sandbox_get_languages,
            commands::sandbox::sandbox_check_runtime,
            commands::sandbox::sandbox_prepare_language,
            commands::sandbox::sandbox_quick_execute,
            commands::sandbox::sandbox_execute_with_stdin,
            commands::sandbox::sandbox_toggle_language,
            commands::sandbox::sandbox_set_runtime,
            commands::sandbox::sandbox_set_timeout,
            commands::sandbox::sandbox_set_memory_limit,
            commands::sandbox::sandbox_set_network,
            commands::sandbox::sandbox_get_runtime_info,
            commands::sandbox::sandbox_cleanup,
            commands::sandbox::sandbox_execute_with_limits,
            // Sandbox session commands
            commands::sandbox::sandbox_start_session,
            commands::sandbox::sandbox_get_current_session,
            commands::sandbox::sandbox_set_current_session,
            commands::sandbox::sandbox_end_session,
            commands::sandbox::sandbox_list_sessions,
            commands::sandbox::sandbox_get_session,
            commands::sandbox::sandbox_delete_session,
            // Sandbox execution history commands
            commands::sandbox::sandbox_get_execution,
            commands::sandbox::sandbox_query_executions,
            commands::sandbox::sandbox_get_recent_executions,
            commands::sandbox::sandbox_delete_execution,
            commands::sandbox::sandbox_toggle_favorite,
            commands::sandbox::sandbox_add_execution_tags,
            commands::sandbox::sandbox_remove_execution_tags,
            commands::sandbox::sandbox_clear_history,
            // Sandbox snippet commands
            commands::sandbox::sandbox_create_snippet,
            commands::sandbox::sandbox_get_snippet,
            commands::sandbox::sandbox_query_snippets,
            commands::sandbox::sandbox_update_snippet,
            commands::sandbox::sandbox_delete_snippet,
            commands::sandbox::sandbox_create_snippet_from_execution,
            commands::sandbox::sandbox_execute_snippet,
            // Sandbox statistics commands
            commands::sandbox::sandbox_get_language_stats,
            commands::sandbox::sandbox_get_all_language_stats,
            commands::sandbox::sandbox_get_stats,
            commands::sandbox::sandbox_get_daily_counts,
            // Sandbox utility commands
            commands::sandbox::sandbox_export_data,
            commands::sandbox::sandbox_get_all_tags,
            commands::sandbox::sandbox_get_all_categories,
            commands::sandbox::sandbox_get_db_size,
            commands::sandbox::sandbox_vacuum_db,
            commands::sandbox::sandbox_execute_with_options,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

