//! Cognia Tauri application library
//!
//! This is the main entry point for the Tauri desktop application.

mod awareness;
mod chat_widget;
mod commands;
mod context;
mod http;
mod jupyter;
mod mcp;
mod sandbox;
mod screen_recording;
mod screenshot;
mod selection;
mod tray;

use awareness::AwarenessManager;
use chat_widget::ChatWidgetWindow;
use commands::jupyter::JupyterState;
use context::ContextManager;
use mcp::McpManager;
use sandbox::SandboxState;
use screen_recording::ScreenRecordingManager;
use screenshot::ScreenshotManager;
use selection::SelectionManager;
use tauri::{Emitter, Manager, RunEvent, WindowEvent};
use tauri_plugin_log::{Target, TargetKind, RotationStrategy, TimezoneStrategy};
use commands::vector::VectorStoreState;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize CrabNebula DevTools for debugging (only in development builds)
    #[cfg(debug_assertions)]
    let devtools = tauri_plugin_devtools::init();

    let mut builder = tauri::Builder::default();

    // Register DevTools plugin (only in development builds)
    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(devtools);
    }

    // Single instance plugin with deep-link integration - prevents multiple instances
    // Can be disabled by compiling with --no-default-features or removing "single-instance" feature
    #[cfg(feature = "single-instance")]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            log::info!(
                "Another instance attempted to start with args: {:?}, cwd: {:?}",
                argv,
                cwd
            );
            
            // Focus the existing main window when another instance tries to start
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
            
            // Check for deep link URLs in arguments (cognia://)
            for arg in &argv {
                if arg.starts_with("cognia://") {
                    log::info!("Deep link detected: {}", arg);
                    let _ = app.emit("deep-link-open", serde_json::json!({
                        "url": arg
                    }));
                }
            }
            
            // Emit event to frontend so it can handle the arguments if needed
            let _ = app.emit("single-instance", serde_json::json!({
                "args": argv,
                "cwd": cwd
            }));
        }));
    }

    builder = builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // .plugin(tauri_plugin_updater::Builder::new().build()) // Disabled until updater is configured
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_geolocation::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(build_log_plugin());

    // Autostart plugin - only available on desktop platforms
    #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
    {
        builder = builder.plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ));
        log::debug!("Autostart plugin initialized");
    }

    // Initialize Stronghold plugin with argon2 password hashing
    // Salt file is stored in app local data directory for secure key derivation
    {
        let salt_path_for_stronghold = std::env::temp_dir().join("cognia_stronghold_salt.txt");
        builder = builder.plugin(
            tauri_plugin_stronghold::Builder::with_argon2(&salt_path_for_stronghold).build()
        );
        log::debug!("Stronghold plugin configured with salt path: {:?}", salt_path_for_stronghold);
    }

    builder.setup(|app| {
            log::info!("Cognia application starting...");

            // Initialize system tray
            if let Err(e) = tray::create_tray(app.handle()) {
                log::error!("Failed to create system tray: {}", e);
            } else {
                // Initialize tray state after managers are set up
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    // Small delay to ensure all managers are initialized
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                    tray::init_tray_state(&handle);
                });
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

            // Initialize Screen Recording Manager
            let screen_recording_manager = ScreenRecordingManager::new(app.handle().clone());
            app.manage(screen_recording_manager);

            // Initialize Context Manager
            let context_manager = ContextManager::new();
            app.manage(context_manager);

            // Initialize Awareness Manager
            let awareness_manager = AwarenessManager::new();
            app.manage(awareness_manager);

            // Initialize Chat Widget Window
            let chat_widget_window = ChatWidgetWindow::new(app.handle().clone());
            app.manage(chat_widget_window);
            log::info!("Chat widget window manager initialized");

            // Register global shortcut for chat widget toggle
            let app_handle_for_shortcut = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
                
                // Parse the shortcut
                let shortcut: Shortcut = "CommandOrControl+Shift+Space".parse().unwrap();
                
                // Register the shortcut
                if let Err(e) = app_handle_for_shortcut.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, _event| {
                    if let Some(manager) = app.try_state::<ChatWidgetWindow>() {
                        match manager.toggle() {
                            Ok(visible) => {
                                log::debug!("Chat widget toggled via shortcut: {}", if visible { "shown" } else { "hidden" });
                            }
                            Err(e) => {
                                log::error!("Failed to toggle chat widget: {}", e);
                            }
                        }
                    }
                }) {
                    log::error!("Failed to register chat widget shortcut: {}", e);
                } else {
                    log::info!("Global shortcut registered: Ctrl+Shift+Space for chat widget");
                }
            });

            // Initialize Jupyter State
            let jupyter_state = JupyterState::new();
            app.manage(jupyter_state);
            log::info!("Jupyter state initialized");

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
            commands::mcp::mcp_test_connection,
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
            // Clipboard context awareness commands
            commands::selection::clipboard_analyze_content,
            commands::selection::clipboard_get_current_with_analysis,
            commands::selection::clipboard_transform_content,
            commands::selection::clipboard_write_text,
            commands::selection::clipboard_read_text,
            commands::selection::clipboard_write_html,
            commands::selection::clipboard_clear,
            commands::selection::clipboard_get_suggested_actions,
            commands::selection::clipboard_extract_entities,
            commands::selection::clipboard_check_sensitive,
            commands::selection::clipboard_get_stats,
            commands::selection::clipboard_detect_category,
            commands::selection::clipboard_detect_language,
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
            // Window management commands
            commands::screenshot::screenshot_get_windows,
            commands::screenshot::screenshot_get_windows_with_thumbnails,
            commands::screenshot::screenshot_capture_window_by_hwnd,
            commands::screenshot::screenshot_capture_window_by_hwnd_with_history,
            commands::screenshot::screenshot_calculate_snap,
            commands::screenshot::screenshot_get_snap_config,
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
            // Environment commands
            commands::environment::environment_get_platform,
            commands::environment::environment_check_tool,
            commands::environment::environment_check_all_tools,
            commands::environment::environment_install_tool,
            commands::environment::environment_uninstall_tool,
            commands::environment::environment_open_tool_website,
            commands::environment::environment_get_python_versions,
            commands::environment::environment_get_node_versions,
            // Virtual environment commands
            commands::environment::environment_create_venv,
            commands::environment::environment_list_venvs,
            commands::environment::environment_delete_venv,
            commands::environment::environment_list_packages,
            commands::environment::environment_install_packages,
            commands::environment::environment_run_in_venv,
            commands::environment::environment_get_available_python_versions,
            commands::environment::environment_install_python_version,
            commands::environment::environment_execute_python,
            commands::environment::environment_execute_python_stream,
            commands::environment::environment_execute_python_file,
            commands::environment::environment_get_python_info,
            // Jupyter commands
            commands::jupyter::jupyter_create_session,
            commands::jupyter::jupyter_list_sessions,
            commands::jupyter::jupyter_get_session,
            commands::jupyter::jupyter_delete_session,
            commands::jupyter::jupyter_list_kernels,
            commands::jupyter::jupyter_restart_kernel,
            commands::jupyter::jupyter_interrupt_kernel,
            commands::jupyter::jupyter_execute,
            commands::jupyter::jupyter_quick_execute,
            commands::jupyter::jupyter_execute_cell,
            commands::jupyter::jupyter_execute_notebook,
            commands::jupyter::jupyter_get_variables,
            commands::jupyter::jupyter_inspect_variable,
            commands::jupyter::jupyter_check_kernel_available,
            commands::jupyter::jupyter_ensure_kernel,
            commands::jupyter::jupyter_shutdown_all,
            // Proxy commands
            commands::proxy::proxy_detect_all,
            commands::proxy::proxy_test,
            commands::proxy::proxy_get_system,
            commands::proxy::proxy_check_port,
            commands::proxy::proxy_get_clash_info,
            // Screen recording commands
            commands::screen_recording::recording_get_status,
            commands::screen_recording::recording_get_duration,
            commands::screen_recording::recording_start_fullscreen,
            commands::screen_recording::recording_start_window,
            commands::screen_recording::recording_start_region,
            commands::screen_recording::recording_pause,
            commands::screen_recording::recording_resume,
            commands::screen_recording::recording_stop,
            commands::screen_recording::recording_cancel,
            commands::screen_recording::recording_get_config,
            commands::screen_recording::recording_update_config,
            commands::screen_recording::recording_get_monitors,
            commands::screen_recording::recording_check_ffmpeg,
            commands::screen_recording::recording_get_audio_devices,
            commands::screen_recording::recording_get_history,
            commands::screen_recording::recording_delete,
            commands::screen_recording::recording_clear_history,
            // Chat widget commands
            commands::chat_widget::chat_widget_show,
            commands::chat_widget::chat_widget_hide,
            commands::chat_widget::chat_widget_toggle,
            commands::chat_widget::chat_widget_is_visible,
            commands::chat_widget::chat_widget_get_status,
            commands::chat_widget::chat_widget_get_config,
            commands::chat_widget::chat_widget_update_config,
            commands::chat_widget::chat_widget_set_pinned,
            commands::chat_widget::chat_widget_set_position,
            commands::chat_widget::chat_widget_focus_input,
            commands::chat_widget::chat_widget_send_text,
            commands::chat_widget::chat_widget_destroy,
            // Git commands
            commands::git::git_get_platform,
            commands::git::git_check_installed,
            commands::git::git_install,
            commands::git::git_open_website,
            commands::git::git_get_config,
            commands::git::git_set_config,
            commands::git::git_init,
            commands::git::git_clone,
            commands::git::git_is_repo,
            commands::git::git_status,
            commands::git::git_stage,
            commands::git::git_stage_all,
            commands::git::git_unstage,
            commands::git::git_commit,
            commands::git::git_log,
            commands::git::git_file_status,
            commands::git::git_diff,
            commands::git::git_diff_between,
            commands::git::git_push,
            commands::git::git_pull,
            commands::git::git_fetch,
            commands::git::git_remotes,
            commands::git::git_add_remote,
            commands::git::git_remove_remote,
            commands::git::git_branches,
            commands::git::git_create_branch,
            commands::git::git_delete_branch,
            commands::git::git_checkout,
            commands::git::git_merge,
            commands::git::git_stash,
            commands::git::git_reset,
            commands::git::git_discard_changes,
            commands::git::git_create_gitignore,
            commands::git::git_export_chat,
            commands::git::git_export_designer,
            commands::git::git_restore_chat,
            commands::git::git_restore_designer,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::WindowEvent {
                    label,
                    event: WindowEvent::CloseRequested { .. },
                    ..
                } => {
                    if label == "main" {
                        // Perform cleanup before window closes
                        log::info!("Main window close requested, performing cleanup...");
                        
                        // Stop selection manager
                        if let Some(manager) = app_handle.try_state::<SelectionManager>() {
                            if let Err(e) = manager.stop() {
                                log::warn!("Failed to stop selection manager: {}", e);
                            }
                        }
                        
                        // Cleanup MCP manager
                        if let Some(manager) = app_handle.try_state::<McpManager>() {
                            tauri::async_runtime::block_on(async {
                                manager.shutdown().await;
                            });
                        }
                        
                        log::info!("Cleanup completed");
                    }
                }
                RunEvent::ExitRequested { .. } => {
                    // Allow the app to exit
                    log::info!("Exit requested");
                }
                RunEvent::Exit => {
                    log::info!("Application exiting");
                }
                _ => {}
            }
        });
}

/// Build the logging plugin with comprehensive configuration
/// 
/// Configures multiple log targets:
/// - Stdout: Console output for development
/// - Webview: Browser console for debugging frontend-backend interaction
/// - LogDir: Persistent log files with rotation for production debugging
fn build_log_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri_plugin_log::Builder::new()
        // Set default log level based on build mode
        .level(if cfg!(debug_assertions) {
            log::LevelFilter::Debug
        } else {
            log::LevelFilter::Info
        })
        // Configure per-module log levels
        .level_for("app_lib", log::LevelFilter::Debug)
        .level_for("app_lib::mcp", log::LevelFilter::Debug)
        .level_for("app_lib::commands", log::LevelFilter::Debug)
        .level_for("app_lib::selection", log::LevelFilter::Debug)
        .level_for("app_lib::screenshot", log::LevelFilter::Debug)
        .level_for("app_lib::sandbox", log::LevelFilter::Debug)
        .level_for("app_lib::awareness", log::LevelFilter::Debug)
        .level_for("app_lib::context", log::LevelFilter::Debug)
        .level_for("app_lib::screen_recording", log::LevelFilter::Debug)
        // Filter out noisy third-party crate logs
        .level_for("hyper", log::LevelFilter::Warn)
        .level_for("reqwest", log::LevelFilter::Warn)
        .level_for("tao", log::LevelFilter::Warn)
        .level_for("wry", log::LevelFilter::Warn)
        .level_for("tokio", log::LevelFilter::Warn)
        .level_for("tracing", log::LevelFilter::Warn)
        // Configure log targets
        .targets([
            // Console output (stdout)
            Target::new(TargetKind::Stdout),
            // Webview console for browser devtools
            Target::new(TargetKind::Webview),
            // Persistent log file in app log directory
            Target::new(TargetKind::LogDir {
                file_name: Some("cognia".to_string()),
            }),
        ])
        // Log rotation: keep all rotated files instead of discarding
        .rotation_strategy(RotationStrategy::KeepAll)
        // Maximum log file size: 10MB before rotation
        .max_file_size(10 * 1024 * 1024)
        // Use local timezone for log timestamps
        .timezone_strategy(TimezoneStrategy::UseLocal)
        // Custom log format: [LEVEL][TARGET] MESSAGE
        .format(|out, message, record| {
            out.finish(format_args!(
                "[{}][{}] {}",
                record.level(),
                record.target(),
                message
            ))
        })
        .build()
}

