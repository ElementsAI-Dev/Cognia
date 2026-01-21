//! Cognia Tauri application library
//!
//! This is the main entry point for the Tauri desktop application.

mod awareness;
mod chat_widget;
mod assistant_bubble;
mod commands;
mod context;
mod http;
mod jupyter;
mod mcp;
mod plugin;
mod port_utils;
mod process;
mod sandbox;
mod screen_recording;
mod screenshot;
mod selection;
mod skill;
mod tray;

use awareness::AwarenessManager;
use chat_widget::ChatWidgetWindow;
use assistant_bubble::AssistantBubbleWindow;
use commands::devtools::jupyter::JupyterState;
use commands::storage::vector::VectorStoreState;
use context::ContextManager;
use mcp::McpManager;
use process::ProcessManager;
use sandbox::SandboxState;
use screen_recording::ScreenRecordingManager;
use screenshot::ScreenshotManager;
use selection::SelectionManager;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager, RunEvent, WindowEvent};
#[cfg(not(debug_assertions))]
use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};

/// Prevent running cleanup twice (window destroy and shortcut teardown are idempotent but we guard anyway)
static CLEANUP_CALLED: AtomicBool = AtomicBool::new(false);

/// Default port for the development server
const DEV_SERVER_PORT: u16 = 3000;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Check and free the development server port before starting
    // This runs in both debug and release builds to handle port conflicts
    match port_utils::ensure_port_available(DEV_SERVER_PORT) {
        Ok(true) => {
            log::info!("Port {} was occupied and has been freed", DEV_SERVER_PORT);
        }
        Ok(false) => {
            log::debug!("Port {} is available", DEV_SERVER_PORT);
        }
        Err(e) => {
            log::error!("Failed to ensure port {} is available: {}", DEV_SERVER_PORT, e);
            // In development, we might want to show a dialog or continue anyway
            // In production, this is less critical as we're not starting a dev server
            #[cfg(debug_assertions)]
            {
                eprintln!("Warning: Could not free port {}: {}", DEV_SERVER_PORT, e);
            }
        }
    }

    // Initialize CrabNebula DevTools for debugging (only in development builds)
    #[cfg(debug_assertions)]
    let devtools = tauri_plugin_devtools::init();

    let mut builder = tauri::Builder::default();

    // Register DevTools plugin (only in development builds)
    // Note: DevTools initializes its own logger, so we skip the log plugin when devtools is active
    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(devtools);
    }

    // Register log plugin only in release builds (devtools handles logging in debug)
    #[cfg(not(debug_assertions))]
    {
        builder = builder.plugin(build_log_plugin());
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
                    let _ = app.emit(
                        "deep-link-open",
                        serde_json::json!({
                            "url": arg
                        }),
                    );
                }
            }

            // Emit event to frontend so it can handle the arguments if needed
            let _ = app.emit(
                "single-instance",
                serde_json::json!({
                    "args": argv,
                    "cwd": cwd
                }),
            );
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
        .plugin(tauri_plugin_deep_link::init());

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
            tauri_plugin_stronghold::Builder::with_argon2(&salt_path_for_stronghold).build(),
        );
        log::debug!(
            "Stronghold plugin configured with salt path: {:?}",
            salt_path_for_stronghold
        );
    }

    builder
        .setup(|app| {
            log::info!("Cognia application starting...");

            // Ensure Ctrl+C (or terminal close) performs graceful teardown instead of abrupt kill
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if tokio::signal::ctrl_c().await.is_ok() {
                        log::info!("Ctrl+C detected, performing graceful shutdown");
                        perform_full_cleanup(&handle);
                        handle.exit(0);
                    }
                });
            }

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
            let mcp_manager = McpManager::new(app.handle().clone(), app_data_dir.clone());

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

            // Initialize OCR Manager (multi-provider support)
            let ocr_state = commands::media::ocr::OcrState::new();
            app.manage(ocr_state);
            log::info!("OCR manager initialized with Windows OCR provider");

            // Initialize Academic Mode State
            let academic_path = app_data_dir.join("academic");
            match commands::academic::AcademicState::new(academic_path) {
                Ok(academic_state) => {
                    app.manage(academic_state);
                    log::info!("Academic mode state initialized");
                }
                Err(e) => {
                    log::error!("Failed to initialize academic state: {}", e);
                }
            }

            // Initialize Screen Recording Manager
            let screen_recording_manager = ScreenRecordingManager::new(app.handle().clone());
            app.manage(screen_recording_manager);

            // Initialize Context Manager
            let context_manager = ContextManager::new();
            app.manage(context_manager);

            // Initialize Awareness Manager
            let awareness_manager = AwarenessManager::new();
            app.manage(awareness_manager);

            // Initialize Plugin Manager
            let plugin_manager_state = commands::extensions::plugin::create_plugin_manager(app_data_dir.clone());
            app.manage(plugin_manager_state);
            log::info!("Plugin manager initialized");

            // Initialize Skill Service
            let skill_service_state = commands::extensions::skill::create_skill_service(app_data_dir.clone());
            app.manage(skill_service_state);
            log::info!("Skill service initialized");

            // Initialize Chat Widget Window
            let chat_widget_window = ChatWidgetWindow::new(app.handle().clone());
            app.manage(chat_widget_window);
            log::info!("Chat widget window manager initialized");

            // Initialize Assistant Bubble Window (long-lived desktop bubble)
            let assistant_bubble_window = AssistantBubbleWindow::new(app.handle().clone());
            // Best-effort create + show; never fail app startup.
            if let Err(e) = assistant_bubble_window.show() {
                log::error!("Failed to show assistant bubble window: {}", e);
            }
            app.manage(assistant_bubble_window);
            log::info!("Assistant bubble window manager initialized");

            // Register global shortcut for chat widget toggle
            let app_handle_for_shortcut = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

                // Parse the shortcut
                let shortcut: Shortcut = "CommandOrControl+Shift+Space".parse().unwrap();

                // Register the shortcut
                if let Err(e) = app_handle_for_shortcut.global_shortcut().on_shortcut(
                    shortcut,
                    move |app, _shortcut, _event| {
                        if let Some(manager) = app.try_state::<ChatWidgetWindow>() {
                            match manager.toggle() {
                                Ok(visible) => {
                                    log::debug!(
                                        "Chat widget toggled via shortcut: {}",
                                        if visible { "shown" } else { "hidden" }
                                    );
                                }
                                Err(e) => {
                                    log::error!("Failed to toggle chat widget: {}", e);
                                }
                            }
                        }
                    },
                ) {
                    log::error!("Failed to register chat widget shortcut: {}", e);
                } else {
                    log::info!("Global shortcut registered: Ctrl+Shift+Space for chat widget");
                }
            });

            // Register global shortcut for selection toolbar trigger (Alt+Space)
            let app_handle_for_selection = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

                // Alt+Space for selection toolbar trigger
                let shortcut: Shortcut = "Alt+Space".parse().unwrap();

                if let Err(e) = app_handle_for_selection.global_shortcut().on_shortcut(
                    shortcut,
                    move |app, _shortcut, _event| {
                        if let Some(manager) = app.try_state::<SelectionManager>() {
                            // Trigger selection detection manually
                            match manager.trigger() {
                                Ok(Some(payload)) => {
                                    log::debug!(
                                        "Selection toolbar triggered via shortcut: {} chars",
                                        payload.text.len()
                                    );
                                }
                                Ok(None) => {
                                    log::debug!("Selection toolbar trigger: no text selected");
                                }
                                Err(e) => {
                                    log::error!("Failed to trigger selection toolbar: {}", e);
                                }
                            }
                        }
                    },
                ) {
                    log::error!("Failed to register selection toolbar shortcut: {}", e);
                } else {
                    log::info!("Global shortcut registered: Alt+Space for selection toolbar");
                }
            });

            // Register global shortcut for quick translate (Ctrl+Shift+T)
            let app_handle_for_translate = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

                let shortcut: Shortcut = "CommandOrControl+Shift+T".parse().unwrap();

                if let Err(e) = app_handle_for_translate.global_shortcut().on_shortcut(
                    shortcut,
                    move |app, _shortcut, _event| {
                        if let Some(manager) = app.try_state::<SelectionManager>() {
                            if let Ok(Some(text)) = manager.detector.get_selected_text() {
                                if !text.is_empty() {
                                    // Emit quick translate event
                                    let _ = app.emit(
                                        "selection-quick-translate",
                                        serde_json::json!({
                                            "text": text,
                                            "action": "translate"
                                        }),
                                    );
                                    log::debug!("Quick translate triggered: {} chars", text.len());
                                }
                            }
                        }
                    },
                ) {
                    log::error!("Failed to register quick translate shortcut: {}", e);
                } else {
                    log::info!("Global shortcut registered: Ctrl+Shift+T for quick translate");
                }
            });

            // Register global shortcut for quick explain (Ctrl+Shift+E)
            let app_handle_for_explain = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

                let shortcut: Shortcut = "CommandOrControl+Shift+E".parse().unwrap();

                if let Err(e) = app_handle_for_explain.global_shortcut().on_shortcut(
                    shortcut,
                    move |app, _shortcut, _event| {
                        if let Some(manager) = app.try_state::<SelectionManager>() {
                            if let Ok(Some(text)) = manager.detector.get_selected_text() {
                                if !text.is_empty() {
                                    // Emit quick explain event
                                    let _ = app.emit(
                                        "selection-quick-action",
                                        serde_json::json!({
                                            "text": text,
                                            "action": "explain"
                                        }),
                                    );
                                    log::debug!("Quick explain triggered: {} chars", text.len());
                                }
                            }
                        }
                    },
                ) {
                    log::error!("Failed to register quick explain shortcut: {}", e);
                } else {
                    log::info!("Global shortcut registered: Ctrl+Shift+E for quick explain");
                }
            });

            // Register global shortcut for bubble visibility toggle (Alt+B)
            let app_handle_for_bubble = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

                let shortcut: Shortcut = "Alt+B".parse().unwrap();

                if let Err(e) = app_handle_for_bubble.global_shortcut().on_shortcut(
                    shortcut,
                    move |app, _shortcut, _event| {
                        if let Some(manager) = app.try_state::<AssistantBubbleWindow>() {
                            if manager.is_visible() {
                                if let Err(e) = manager.hide() {
                                    log::error!("Failed to hide bubble via shortcut: {}", e);
                                } else {
                                    log::debug!("Bubble hidden via Alt+B shortcut");
                                }
                            } else if let Err(e) = manager.show() {
                                log::error!("Failed to show bubble via shortcut: {}", e);
                            } else {
                                log::debug!("Bubble shown via Alt+B shortcut");
                            }
                        }
                    },
                ) {
                    log::error!("Failed to register bubble toggle shortcut: {}", e);
                } else {
                    log::info!("Global shortcut registered: Alt+B for bubble visibility toggle");
                }
            });

            // Register global shortcut for bubble minimize/fold toggle (Alt+M)
            let app_handle_for_bubble_minimize = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

                let shortcut: Shortcut = "Alt+M".parse().unwrap();

                if let Err(e) = app_handle_for_bubble_minimize.global_shortcut().on_shortcut(
                    shortcut,
                    move |app, _shortcut, _event| {
                        if let Some(manager) = app.try_state::<AssistantBubbleWindow>() {
                            match manager.toggle_minimize() {
                                Ok(minimized) => {
                                    log::debug!(
                                        "Bubble {} via Alt+M shortcut",
                                        if minimized { "minimized" } else { "restored" }
                                    );
                                }
                                Err(e) => {
                                    log::error!("Failed to toggle bubble minimize via shortcut: {}", e);
                                }
                            }
                        }
                    },
                ) {
                    log::error!("Failed to register bubble minimize shortcut: {}", e);
                } else {
                    log::info!("Global shortcut registered: Alt+M for bubble minimize toggle");
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

            // Initialize Process Manager
            let process_config_path = app_data_dir.join("process_config.json");
            let handle_for_process = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match ProcessManager::new(process_config_path).await {
                    Ok(process_manager) => {
                        handle_for_process.manage(process_manager);
                        log::info!("Process manager initialized");
                    }
                    Err(e) => {
                        log::error!("Failed to initialize process manager: {}", e);
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

            // Create window menu
            if let Err(e) = create_window_menu(app.handle()) {
                log::warn!("Failed to create window menu: {}", e);
            }

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id.0.to_string();
            // Handle both window menu and tray menu events
            handle_menu_event(app, &id);
        })
        .invoke_handler(tauri::generate_handler![
            // MCP commands
            commands::providers::mcp::mcp_get_servers,
            commands::providers::mcp::mcp_get_server,
            commands::providers::mcp::mcp_add_server,
            commands::providers::mcp::mcp_remove_server,
            commands::providers::mcp::mcp_update_server,
            commands::providers::mcp::mcp_connect_server,
            commands::providers::mcp::mcp_disconnect_server,
            commands::providers::mcp::mcp_call_tool,
            commands::providers::mcp::mcp_get_all_tools,
            commands::providers::mcp::mcp_read_resource,
            commands::providers::mcp::mcp_get_prompt,
            commands::providers::mcp::mcp_reload_config,
            commands::providers::mcp::mcp_install_npm_package,
            commands::providers::mcp::mcp_install_pip_package,
            commands::providers::mcp::mcp_check_command_exists,
            commands::providers::mcp::mcp_ping_server,
            commands::providers::mcp::mcp_test_connection,
            commands::providers::mcp::mcp_set_log_level,
            commands::providers::mcp::mcp_subscribe_resource,
            commands::providers::mcp::mcp_unsubscribe_resource,
            // API testing commands
            commands::providers::api::test_openai_connection,
            commands::providers::api::test_anthropic_connection,
            commands::providers::api::test_google_connection,
            commands::providers::api::test_deepseek_connection,
            commands::providers::api::test_groq_connection,
            commands::providers::api::test_mistral_connection,
            commands::providers::api::test_ollama_connection,
            commands::providers::api::test_custom_provider_connection,
            // Clipboard commands
            commands::system::clipboard::read_clipboard_image,
            commands::system::clipboard::read_clipboard_text,
            commands::system::clipboard::write_clipboard_text,
            commands::system::clipboard::clipboard_has_image,
            // Ollama commands
            commands::providers::ollama::ollama_get_status,
            commands::providers::ollama::ollama_list_models,
            commands::providers::ollama::ollama_show_model,
            commands::providers::ollama::ollama_pull_model,
            commands::providers::ollama::ollama_delete_model,
            commands::providers::ollama::ollama_list_running,
            commands::providers::ollama::ollama_copy_model,
            commands::providers::ollama::ollama_generate_embedding,
            commands::providers::ollama::ollama_stop_model,
            // Port management commands
            commands::system::port::port_check_status,
            commands::system::port::port_is_available,
            commands::system::port::port_ensure_available,
            commands::system::port::port_kill_process,
            commands::system::port::port_find_process,
            // Local provider commands (LM Studio, llama.cpp, vLLM, etc.)
            commands::providers::local_provider::local_provider_get_status,
            commands::providers::local_provider::local_provider_list_models,
            commands::providers::local_provider::local_provider_check_installation,
            commands::providers::local_provider::local_provider_pull_model,
            commands::providers::local_provider::local_provider_delete_model,
            commands::providers::local_provider::local_provider_check_all,
            commands::providers::local_provider::local_provider_test_connection,
            // Vector (local) commands
            commands::storage::vector::vector_create_collection,
            commands::storage::vector::vector_delete_collection,
            commands::storage::vector::vector_rename_collection,
            commands::storage::vector::vector_truncate_collection,
            commands::storage::vector::vector_export_collection,
            commands::storage::vector::vector_import_collection,
            commands::storage::vector::vector_list_collections,
            commands::storage::vector::vector_get_collection,
            commands::storage::vector::vector_upsert_points,
            commands::storage::vector::vector_delete_points,
            commands::storage::vector::vector_delete_all_points,
            commands::storage::vector::vector_get_points,
            commands::storage::vector::vector_search_points,
            commands::storage::vector::vector_scroll_points,
            commands::storage::vector::vector_stats,
            // Selection toolbar commands
            commands::window::selection::selection_start,
            commands::window::selection::selection_stop,
            commands::window::selection::selection_release_stuck_keys,
            commands::window::selection::selection_get_text,
            commands::window::selection::selection_show_toolbar,
            commands::window::selection::selection_hide_toolbar,
            commands::window::selection::selection_is_toolbar_visible,
            commands::window::selection::selection_get_toolbar_text,
            commands::window::selection::selection_update_config,
            commands::window::selection::selection_save_config,
            commands::window::selection::selection_get_config,
            commands::window::selection::selection_trigger,
            commands::window::selection::selection_get_status,
            commands::window::selection::selection_set_enabled,
            commands::window::selection::selection_is_enabled,
            commands::window::selection::selection_restart,
            commands::window::selection::selection_set_toolbar_hovered,
            commands::window::selection::selection_get_toolbar_state,
            commands::window::selection::selection_set_auto_hide_timeout,
            commands::window::selection::selection_get_detection_stats,
            commands::window::selection::selection_get_enhanced,
            commands::window::selection::selection_analyze_current,
            commands::window::selection::selection_expand_to_word,
            commands::window::selection::selection_expand_to_sentence,
            commands::window::selection::selection_expand_to_line,
            commands::window::selection::selection_expand_to_paragraph,
            // Selection history commands
            commands::window::selection::selection_get_history,
            commands::window::selection::selection_search_history,
            commands::window::selection::selection_search_history_by_app,
            commands::window::selection::selection_search_history_by_type,
            commands::window::selection::selection_get_history_stats,
            commands::window::selection::selection_clear_history,
            commands::window::selection::selection_export_history,
            commands::window::selection::selection_import_history,
            // Clipboard history commands
            commands::window::selection::clipboard_get_history,
            commands::window::selection::clipboard_search_history,
            commands::window::selection::clipboard_get_pinned,
            commands::window::selection::clipboard_pin_entry,
            commands::window::selection::clipboard_unpin_entry,
            commands::window::selection::clipboard_delete_entry,
            commands::window::selection::clipboard_clear_unpinned,
            commands::window::selection::clipboard_clear_all,
            commands::window::selection::clipboard_copy_entry,
            commands::window::selection::clipboard_check_update,
            // Clipboard context awareness commands
            commands::window::selection::clipboard_analyze_content,
            commands::window::selection::clipboard_get_current_with_analysis,
            commands::window::selection::clipboard_transform_content,
            commands::window::selection::clipboard_write_text,
            commands::window::selection::clipboard_read_text,
            commands::window::selection::clipboard_write_html,
            commands::window::selection::clipboard_clear,
            commands::window::selection::clipboard_get_suggested_actions,
            commands::window::selection::clipboard_extract_entities,
            commands::window::selection::clipboard_check_sensitive,
            commands::window::selection::clipboard_get_stats,
            commands::window::selection::clipboard_detect_category,
            commands::window::selection::clipboard_detect_language,
            // Smart selection commands
            commands::window::selection::selection_smart_expand,
            commands::window::selection::selection_auto_expand,
            commands::window::selection::selection_get_modes,
            // AI processing commands
            commands::window::selection::selection_ai_process,
            commands::window::selection::selection_ai_process_stream,
            commands::window::selection::selection_detect_text_type,
            commands::window::selection::selection_get_toolbar_config,
            commands::window::selection::selection_set_theme,
            commands::window::selection::selection_get_stats_summary,
            // Screenshot commands
            commands::media::screenshot::screenshot_capture_fullscreen,
            commands::media::screenshot::screenshot_capture_window,
            commands::media::screenshot::screenshot_capture_region,
            commands::media::screenshot::screenshot_start_region_selection,
            commands::media::screenshot::screenshot_ocr,
            commands::media::screenshot::screenshot_get_monitors,
            commands::media::screenshot::screenshot_update_config,
            commands::media::screenshot::screenshot_get_config,
            commands::media::screenshot::screenshot_save,
            // Screenshot history commands
            commands::media::screenshot::screenshot_get_history,
            commands::media::screenshot::screenshot_search_history,
            commands::media::screenshot::screenshot_get_by_id,
            commands::media::screenshot::screenshot_pin,
            commands::media::screenshot::screenshot_unpin,
            commands::media::screenshot::screenshot_delete,
            commands::media::screenshot::screenshot_clear_history,
            // Screenshot tag/label management commands
            commands::media::screenshot::screenshot_add_tag,
            commands::media::screenshot::screenshot_remove_tag,
            commands::media::screenshot::screenshot_set_label,
            // Windows OCR commands (legacy)
            commands::media::screenshot::screenshot_ocr_windows,
            commands::media::screenshot::screenshot_get_ocr_languages,
            commands::media::screenshot::screenshot_ocr_is_available,
            commands::media::screenshot::screenshot_ocr_is_language_available,
            commands::media::screenshot::screenshot_ocr_with_language,
            // Multi-provider OCR commands
            commands::media::ocr::ocr_get_providers,
            commands::media::ocr::ocr_set_default_provider,
            commands::media::ocr::ocr_configure_provider,
            commands::media::ocr::ocr_register_ollama,
            commands::media::ocr::ocr_extract_text,
            commands::media::ocr::ocr_extract_text_with_fallback,
            commands::media::ocr::ocr_is_provider_available,
            commands::media::ocr::ocr_get_provider_languages,
            commands::media::ocr::ocr_clear_cache,
            // Capture with history commands
            commands::media::screenshot::screenshot_capture_fullscreen_with_history,
            commands::media::screenshot::screenshot_capture_window_with_history,
            commands::media::screenshot::screenshot_capture_region_with_history,
            // Window management commands
            commands::media::screenshot::screenshot_get_windows,
            commands::media::screenshot::screenshot_get_windows_with_thumbnails,
            commands::media::screenshot::screenshot_capture_window_by_hwnd,
            commands::media::screenshot::screenshot_capture_window_by_hwnd_with_history,
            commands::media::screenshot::screenshot_calculate_snap,
            commands::media::screenshot::screenshot_get_snap_config,
            // Context commands
            commands::context::context::context_get_full,
            commands::context::context::context_get_window,
            commands::context::context::context_get_app,
            commands::context::context::context_get_file,
            commands::context::context::context_get_browser,
            commands::context::context::context_get_editor,
            commands::context::context::context_get_all_windows,
            commands::context::context::context_clear_cache,
            commands::context::context::context_find_windows_by_title,
            commands::context::context::context_find_windows_by_process,
            // Awareness commands
            commands::context::awareness::awareness_get_state,
            commands::context::awareness::awareness_get_system_state,
            commands::context::awareness::awareness_get_suggestions,
            commands::context::awareness::awareness_record_activity,
            commands::context::awareness::awareness_get_recent_activities,
            commands::context::awareness::awareness_start_monitoring,
            commands::context::awareness::awareness_stop_monitoring,
            commands::context::awareness::awareness_clear_history,
            // Focus tracking commands
            commands::context::awareness::awareness_start_focus_tracking,
            commands::context::awareness::awareness_stop_focus_tracking,
            commands::context::awareness::awareness_is_focus_tracking,
            commands::context::awareness::awareness_record_focus_change,
            commands::context::awareness::awareness_get_current_focus,
            commands::context::awareness::awareness_get_recent_focus_sessions,
            commands::context::awareness::awareness_get_app_usage_stats,
            commands::context::awareness::awareness_get_all_app_usage_stats,
            commands::context::awareness::awareness_get_today_usage_summary,
            commands::context::awareness::awareness_get_daily_usage_summary,
            commands::context::awareness::awareness_clear_focus_history,
            // Sandbox commands
            commands::devtools::sandbox::sandbox_execute,
            commands::devtools::sandbox::sandbox_get_status,
            commands::devtools::sandbox::sandbox_get_config,
            commands::devtools::sandbox::sandbox_update_config,
            commands::devtools::sandbox::sandbox_get_runtimes,
            commands::devtools::sandbox::sandbox_get_languages,
            commands::devtools::sandbox::sandbox_check_runtime,
            commands::devtools::sandbox::sandbox_prepare_language,
            commands::devtools::sandbox::sandbox_quick_execute,
            commands::devtools::sandbox::sandbox_execute_with_stdin,
            commands::devtools::sandbox::sandbox_toggle_language,
            commands::devtools::sandbox::sandbox_set_runtime,
            commands::devtools::sandbox::sandbox_set_timeout,
            commands::devtools::sandbox::sandbox_set_memory_limit,
            commands::devtools::sandbox::sandbox_set_network,
            commands::devtools::sandbox::sandbox_get_runtime_info,
            commands::devtools::sandbox::sandbox_cleanup,
            commands::devtools::sandbox::sandbox_execute_with_limits,
            // Sandbox session commands
            commands::devtools::sandbox::sandbox_start_session,
            commands::devtools::sandbox::sandbox_get_current_session,
            commands::devtools::sandbox::sandbox_set_current_session,
            commands::devtools::sandbox::sandbox_end_session,
            commands::devtools::sandbox::sandbox_list_sessions,
            commands::devtools::sandbox::sandbox_get_session,
            commands::devtools::sandbox::sandbox_delete_session,
            // Sandbox execution history commands
            commands::devtools::sandbox::sandbox_get_execution,
            commands::devtools::sandbox::sandbox_query_executions,
            commands::devtools::sandbox::sandbox_get_recent_executions,
            commands::devtools::sandbox::sandbox_delete_execution,
            commands::devtools::sandbox::sandbox_toggle_favorite,
            commands::devtools::sandbox::sandbox_add_execution_tags,
            commands::devtools::sandbox::sandbox_remove_execution_tags,
            commands::devtools::sandbox::sandbox_clear_history,
            // Sandbox snippet commands
            commands::devtools::sandbox::sandbox_create_snippet,
            commands::devtools::sandbox::sandbox_get_snippet,
            commands::devtools::sandbox::sandbox_query_snippets,
            commands::devtools::sandbox::sandbox_update_snippet,
            commands::devtools::sandbox::sandbox_delete_snippet,
            commands::devtools::sandbox::sandbox_create_snippet_from_execution,
            commands::devtools::sandbox::sandbox_execute_snippet,
            // Sandbox statistics commands
            commands::devtools::sandbox::sandbox_get_language_stats,
            commands::devtools::sandbox::sandbox_get_all_language_stats,
            commands::devtools::sandbox::sandbox_get_stats,
            commands::devtools::sandbox::sandbox_get_daily_counts,
            // Sandbox utility commands
            commands::devtools::sandbox::sandbox_export_data,
            commands::devtools::sandbox::sandbox_get_all_tags,
            commands::devtools::sandbox::sandbox_get_all_categories,
            commands::devtools::sandbox::sandbox_get_db_size,
            commands::devtools::sandbox::sandbox_vacuum_db,
            commands::devtools::sandbox::sandbox_execute_with_options,
            // Model download commands
            commands::storage::model_download::model_list_available,
            commands::storage::model_download::model_list_installed,
            commands::storage::model_download::model_get_download_config,
            commands::storage::model_download::model_set_download_config,
            commands::storage::model_download::model_download,
            commands::storage::model_download::model_delete,
            commands::storage::model_download::model_get_sources,
            commands::storage::model_download::model_detect_proxy,
            commands::storage::model_download::model_test_proxy,
            // Environment commands
            commands::system::environment::environment_get_platform,
            commands::system::environment::environment_check_tool,
            commands::system::environment::environment_check_all_tools,
            commands::system::environment::environment_install_tool,
            commands::system::environment::environment_uninstall_tool,
            commands::system::environment::environment_open_tool_website,
            commands::system::environment::environment_get_python_versions,
            commands::system::environment::environment_get_node_versions,
            // Virtual environment commands
            commands::system::environment::environment_create_venv,
            commands::system::environment::environment_list_venvs,
            commands::system::environment::environment_delete_venv,
            commands::system::environment::environment_list_packages,
            commands::system::environment::environment_install_packages,
            commands::system::environment::environment_run_in_venv,
            commands::system::environment::environment_get_available_python_versions,
            commands::system::environment::environment_install_python_version,
            commands::system::environment::environment_execute_python,
            commands::system::environment::environment_execute_python_stream,
            commands::system::environment::environment_execute_python_file,
            commands::system::environment::environment_get_python_info,
            // Jupyter commands
            commands::devtools::jupyter::jupyter_create_session,
            commands::devtools::jupyter::jupyter_list_sessions,
            commands::devtools::jupyter::jupyter_get_session,
            commands::devtools::jupyter::jupyter_delete_session,
            commands::devtools::jupyter::jupyter_list_kernels,
            commands::devtools::jupyter::jupyter_restart_kernel,
            commands::devtools::jupyter::jupyter_interrupt_kernel,
            commands::devtools::jupyter::jupyter_execute,
            commands::devtools::jupyter::jupyter_quick_execute,
            commands::devtools::jupyter::jupyter_execute_cell,
            commands::devtools::jupyter::jupyter_execute_notebook,
            commands::devtools::jupyter::jupyter_get_variables,
            commands::devtools::jupyter::jupyter_inspect_variable,
            commands::devtools::jupyter::jupyter_check_kernel_available,
            commands::devtools::jupyter::jupyter_ensure_kernel,
            commands::devtools::jupyter::jupyter_shutdown_all,
            // Proxy commands
            commands::system::proxy::proxy_detect_all,
            commands::system::proxy::proxy_test,
            commands::system::proxy::proxy_get_system,
            commands::system::proxy::proxy_check_port,
            commands::system::proxy::proxy_get_clash_info,
            // Screen recording commands
            commands::media::screen_recording::recording_get_status,
            commands::media::screen_recording::recording_get_duration,
            commands::media::screen_recording::recording_start_fullscreen,
            commands::media::screen_recording::recording_start_window,
            commands::media::screen_recording::recording_start_region,
            commands::media::screen_recording::recording_pause,
            commands::media::screen_recording::recording_resume,
            commands::media::screen_recording::recording_stop,
            commands::media::screen_recording::recording_cancel,
            commands::media::screen_recording::recording_get_config,
            commands::media::screen_recording::recording_update_config,
            commands::media::screen_recording::recording_get_monitors,
            commands::media::screen_recording::recording_check_ffmpeg,
            commands::media::screen_recording::recording_get_audio_devices,
            commands::media::screen_recording::recording_get_history,
            commands::media::screen_recording::recording_delete,
            commands::media::screen_recording::recording_clear_history,
            commands::media::screen_recording::recording_pin,
            commands::media::screen_recording::recording_unpin,
            commands::media::screen_recording::recording_get_by_id,
            commands::media::screen_recording::recording_search_by_tag,
            commands::media::screen_recording::recording_add_tag,
            commands::media::screen_recording::recording_remove_tag,
            commands::media::screen_recording::recording_get_stats,
            // Video processing commands
            commands::media::screen_recording::video_trim,
            commands::media::screen_recording::video_convert,
            commands::media::screen_recording::video_get_info,
            commands::media::screen_recording::video_generate_thumbnail,
            commands::media::screen_recording::video_check_encoding_support,
            // FFmpeg commands
            commands::media::screen_recording::ffmpeg_get_info,
            commands::media::screen_recording::ffmpeg_get_install_guide,
            commands::media::screen_recording::ffmpeg_check_hardware_acceleration,
            commands::media::screen_recording::ffmpeg_check_version,
            // Chat widget commands
            commands::window::chat_widget::chat_widget_show,
            commands::window::chat_widget::chat_widget_hide,
            commands::window::chat_widget::chat_widget_toggle,
            commands::window::chat_widget::chat_widget_is_visible,
            commands::window::chat_widget::chat_widget_get_status,
            commands::window::chat_widget::chat_widget_get_config,
            commands::window::chat_widget::chat_widget_update_config,
            commands::window::chat_widget::chat_widget_set_pinned,
            commands::window::chat_widget::chat_widget_set_position,
            commands::window::chat_widget::chat_widget_focus_input,
            commands::window::chat_widget::chat_widget_send_text,
            commands::window::chat_widget::chat_widget_destroy,
            commands::window::chat_widget::chat_widget_minimize,
            commands::window::chat_widget::chat_widget_unminimize,
            commands::window::chat_widget::chat_widget_toggle_minimize,
            commands::window::chat_widget::chat_widget_is_minimized,
            commands::window::chat_widget::chat_widget_save_config,
            commands::window::chat_widget::chat_widget_recreate,
            commands::window::chat_widget::chat_widget_sync_state,
            // Assistant bubble commands
            commands::window::assistant_bubble::assistant_bubble_show,
            commands::window::assistant_bubble::assistant_bubble_hide,
            commands::window::assistant_bubble::assistant_bubble_toggle,
            commands::window::assistant_bubble::assistant_bubble_is_visible,
            commands::window::assistant_bubble::assistant_bubble_get_info,
            commands::window::assistant_bubble::assistant_bubble_get_config,
            commands::window::assistant_bubble::assistant_bubble_update_config,
            commands::window::assistant_bubble::assistant_bubble_set_position,
            commands::window::assistant_bubble::assistant_bubble_minimize,
            commands::window::assistant_bubble::assistant_bubble_unminimize,
            commands::window::assistant_bubble::assistant_bubble_toggle_minimize,
            commands::window::assistant_bubble::assistant_bubble_is_minimized,
            commands::window::assistant_bubble::assistant_bubble_save_config,
            commands::window::assistant_bubble::assistant_bubble_recreate,
            commands::window::assistant_bubble::assistant_bubble_sync_state,
            commands::window::assistant_bubble::assistant_bubble_get_work_area,
            commands::window::assistant_bubble::assistant_bubble_clamp_to_work_area,
            commands::window::assistant_bubble::get_work_area_at_position,
            // Window diagnostics commands
            commands::window::window_diagnostics::window_get_diagnostics,
            commands::window::window_diagnostics::window_get_state,
            commands::window::window_diagnostics::window_exists,
            commands::window::window_diagnostics::window_sync_all_states,
            commands::window::window_diagnostics::window_save_all_configs,
            commands::window::window_diagnostics::window_recreate_destroyed,
            // Git commands
            commands::devtools::git::git_get_platform,
            commands::devtools::git::git_check_installed,
            commands::devtools::git::git_install,
            commands::devtools::git::git_open_website,
            commands::devtools::git::git_get_config,
            commands::devtools::git::git_set_config,
            commands::devtools::git::git_init,
            commands::devtools::git::git_clone,
            commands::devtools::git::git_is_repo,
            commands::devtools::git::git_status,
            commands::devtools::git::git_stage,
            commands::devtools::git::git_stage_all,
            commands::devtools::git::git_unstage,
            commands::devtools::git::git_commit,
            commands::devtools::git::git_log,
            commands::devtools::git::git_file_status,
            commands::devtools::git::git_diff,
            commands::devtools::git::git_diff_file,
            commands::devtools::git::git_diff_between,
            commands::devtools::git::git_stash_list,
            commands::devtools::git::git_push,
            commands::devtools::git::git_pull,
            commands::devtools::git::git_fetch,
            commands::devtools::git::git_remotes,
            commands::devtools::git::git_add_remote,
            commands::devtools::git::git_remove_remote,
            commands::devtools::git::git_branches,
            commands::devtools::git::git_create_branch,
            commands::devtools::git::git_delete_branch,
            commands::devtools::git::git_checkout,
            commands::devtools::git::git_merge,
            commands::devtools::git::git_stash,
            commands::devtools::git::git_reset,
            commands::devtools::git::git_discard_changes,
            commands::devtools::git::git_create_gitignore,
            commands::devtools::git::git_export_chat,
            commands::devtools::git::git_export_designer,
            commands::devtools::git::git_restore_chat,
            commands::devtools::git::git_restore_designer,
            // Process management commands
            commands::system::process::process_list,
            commands::system::process::process_get,
            commands::system::process::process_start,
            commands::system::process::process_terminate,
            commands::system::process::process_get_config,
            commands::system::process::process_update_config,
            commands::system::process::process_is_allowed,
            commands::system::process::process_get_tracked,
            commands::system::process::process_is_enabled,
            commands::system::process::process_set_enabled,
            commands::system::process::process_search,
            commands::system::process::process_top_memory,
            // Academic mode commands
            commands::academic::academic_search,
            commands::academic::academic_search_provider,
            commands::academic::academic_get_paper,
            commands::academic::academic_get_citations,
            commands::academic::academic_get_references,
            commands::academic::academic_download_pdf,
            commands::academic::academic_get_pdf_path,
            commands::academic::academic_delete_pdf,
            commands::academic::academic_add_to_library,
            commands::academic::academic_remove_from_library,
            commands::academic::academic_get_library_papers,
            commands::academic::academic_update_paper,
            commands::academic::academic_get_paper_by_id,
            commands::academic::academic_create_collection,
            commands::academic::academic_update_collection,
            commands::academic::academic_delete_collection,
            commands::academic::academic_get_collections,
            commands::academic::academic_add_paper_to_collection,
            commands::academic::academic_remove_paper_from_collection,
            commands::academic::academic_add_annotation,
            commands::academic::academic_update_annotation,
            commands::academic::academic_delete_annotation,
            commands::academic::academic_get_annotations,
            commands::academic::academic_import_papers,
            commands::academic::academic_export_papers,
            commands::academic::academic_get_providers,
            commands::academic::academic_set_provider_api_key,
            commands::academic::academic_set_provider_enabled,
            commands::academic::academic_test_provider,
            commands::academic::academic_get_statistics,
            commands::academic::academic_generate_knowledge_map,
            commands::academic::academic_generate_knowledge_map_from_content,
            commands::academic::academic_generate_mind_map,
            commands::academic::academic_generate_mind_map_from_content,
            commands::academic::academic_extract_pdf_content,
            // Plugin system commands
            commands::extensions::plugin::plugin_python_initialize,
            commands::extensions::plugin::plugin_scan_directory,
            commands::extensions::plugin::plugin_install,
            commands::extensions::plugin::plugin_uninstall,
            commands::extensions::plugin::plugin_python_load,
            commands::extensions::plugin::plugin_python_get_tools,
            commands::extensions::plugin::plugin_python_call_tool,
            commands::extensions::plugin::plugin_python_call,
            commands::extensions::plugin::plugin_python_eval,
            commands::extensions::plugin::plugin_python_import,
            commands::extensions::plugin::plugin_python_module_call,
            commands::extensions::plugin::plugin_python_module_getattr,
            commands::extensions::plugin::plugin_get_state,
            commands::extensions::plugin::plugin_get_all,
            commands::extensions::plugin::plugin_show_notification,
            // Skill commands
            commands::extensions::skill::skill_list_repos,
            commands::extensions::skill::skill_add_repo,
            commands::extensions::skill::skill_remove_repo,
            commands::extensions::skill::skill_toggle_repo,
            commands::extensions::skill::skill_discover,
            commands::extensions::skill::skill_get_all,
            commands::extensions::skill::skill_scan_local,
            commands::extensions::skill::skill_install,
            commands::extensions::skill::skill_install_local,
            commands::extensions::skill::skill_register_local,
            commands::extensions::skill::skill_uninstall,
            commands::extensions::skill::skill_get_installed,
            commands::extensions::skill::skill_get,
            commands::extensions::skill::skill_get_required,
            commands::extensions::skill::skill_validate_install,
            commands::extensions::skill::skill_enable,
            commands::extensions::skill::skill_disable,
            commands::extensions::skill::skill_update,
            commands::extensions::skill::skill_read_content,
            commands::extensions::skill::skill_list_resources,
            commands::extensions::skill::skill_read_resource,
            commands::extensions::skill::skill_get_ssot_dir,
            commands::extensions::skill::skill_scan_installed,
            commands::extensions::skill::skill_scan_path,
            commands::extensions::skill::skill_security_rule_count,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::WindowEvent {
                    label,
                    event: WindowEvent::CloseRequested { api, .. },
                    ..
                } => {
                    if label == "main" {
                        // Hide window instead of closing to keep tray icon active
                        api.prevent_close();
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.hide();
                        }
                        log::info!("Main window hidden (use tray to show or quit)");
                    }
                }
                RunEvent::ExitRequested { api, .. } => {
                    // Perform full cleanup before exit
                    log::info!("Exit requested, performing full cleanup...");
                    perform_full_cleanup(app_handle);
                    // Don't prevent exit
                    let _ = api;
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
#[cfg(not(debug_assertions))]
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

/// Create the application window menu
fn create_window_menu(app: &tauri::AppHandle) -> Result<(), tauri::Error> {
    // File submenu
    let file_submenu = Submenu::with_id_and_items(
        app,
        "file-menu",
        "文件",
        true,
        &[
            &MenuItem::with_id(app, "menu-new-chat", "新建对话\tCtrl+N", true, None::<&str>)?,
            &MenuItem::with_id(
                app,
                "menu-open-project",
                "打开项目\tCtrl+O",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "menu-save", "保存\tCtrl+S", true, None::<&str>)?,
            &MenuItem::with_id(app, "menu-export", "导出对话...", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "menu-settings", "设置\tCtrl+,", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "menu-quit", "退出\tCtrl+Q", true, None::<&str>)?,
        ],
    )?;

    // Edit submenu with standard operations
    let edit_submenu = Submenu::with_id_and_items(
        app,
        "edit-menu",
        "编辑",
        true,
        &[
            &PredefinedMenuItem::undo(app, Some("撤销"))?,
            &PredefinedMenuItem::redo(app, Some("重做"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, Some("剪切"))?,
            &PredefinedMenuItem::copy(app, Some("复制"))?,
            &PredefinedMenuItem::paste(app, Some("粘贴"))?,
            &PredefinedMenuItem::select_all(app, Some("全选"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "menu-find", "查找\tCtrl+F", true, None::<&str>)?,
        ],
    )?;

    // View submenu
    let view_submenu = Submenu::with_id_and_items(
        app,
        "view-menu",
        "视图",
        true,
        &[
            &MenuItem::with_id(
                app,
                "menu-toggle-sidebar",
                "切换侧边栏\tCtrl+B",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app,
                "menu-toggle-fullscreen",
                "全屏\tF11",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "menu-zoom-in", "放大\tCtrl++", true, None::<&str>)?,
            &MenuItem::with_id(app, "menu-zoom-out", "缩小\tCtrl+-", true, None::<&str>)?,
            &MenuItem::with_id(
                app,
                "menu-zoom-reset",
                "重置缩放\tCtrl+0",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "menu-reload", "刷新\tCtrl+R", true, None::<&str>)?,
            &MenuItem::with_id(app, "menu-devtools", "开发者工具\tF12", true, None::<&str>)?,
        ],
    )?;

    // Tools submenu
    let tools_submenu = Submenu::with_id_and_items(
        app,
        "tools-menu",
        "工具",
        true,
        &[
            &MenuItem::with_id(
                app,
                "menu-screenshot",
                "截图\tCtrl+Shift+S",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(app, "menu-ocr", "文字识别 (OCR)", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                "menu-chat-widget",
                "AI 助手\tCtrl+Shift+Space",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app,
                "menu-clipboard-history",
                "剪贴板历史\tCtrl+Shift+V",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                "menu-mcp-servers",
                "MCP 服务器管理",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(app, "menu-sandbox", "代码沙箱", true, None::<&str>)?,
        ],
    )?;

    // Window submenu
    let window_submenu = Submenu::with_id_and_items(
        app,
        "window-menu",
        "窗口",
        true,
        &[
            &MenuItem::with_id(app, "menu-minimize", "最小化\tCtrl+M", true, None::<&str>)?,
            &MenuItem::with_id(app, "menu-maximize", "最大化", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                "menu-close-window",
                "关闭窗口\tCtrl+W",
                true,
                None::<&str>,
            )?,
        ],
    )?;

    // Help submenu
    let help_submenu = Submenu::with_id_and_items(
        app,
        "help-menu",
        "帮助",
        true,
        &[
            &MenuItem::with_id(app, "menu-docs", "文档", true, None::<&str>)?,
            &MenuItem::with_id(app, "menu-shortcuts", "快捷键参考", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "menu-check-update", "检查更新", true, None::<&str>)?,
            &MenuItem::with_id(app, "menu-feedback", "反馈", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "menu-about", "关于 Cognia", true, None::<&str>)?,
        ],
    )?;

    // Build main menu
    let menu = Menu::with_items(
        app,
        &[
            &file_submenu,
            &edit_submenu,
            &view_submenu,
            &tools_submenu,
            &window_submenu,
            &help_submenu,
        ],
    )?;

    // Set as app menu
    app.set_menu(menu)?;
    log::info!("Window menu created successfully");
    Ok(())
}

/// Handle menu events from both window menu and tray menu
fn handle_menu_event(app: &tauri::AppHandle, id: &str) {
    log::debug!("Menu event received: {}", id);

    match id {
        // File menu
        "menu-new-chat" => {
            let _ = app.emit("menu-new-chat", ());
        }
        "menu-open-project" => {
            let _ = app.emit("menu-open-project", ());
        }
        "menu-save" => {
            let _ = app.emit("menu-save", ());
        }
        "menu-export" => {
            let _ = app.emit("menu-export", ());
        }
        "menu-settings" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            let _ = app.emit("navigate-to-settings", ());
        }
        "menu-quit" => {
            log::info!("Quit requested from menu");
            perform_full_cleanup(app);
            app.exit(0);
        }

        // View menu
        "menu-toggle-sidebar" => {
            let _ = app.emit("menu-toggle-sidebar", ());
        }
        "menu-toggle-fullscreen" => {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(is_fullscreen) = window.is_fullscreen() {
                    let _ = window.set_fullscreen(!is_fullscreen);
                }
            }
        }
        "menu-zoom-in" => {
            let _ = app.emit("menu-zoom-in", ());
        }
        "menu-zoom-out" => {
            let _ = app.emit("menu-zoom-out", ());
        }
        "menu-zoom-reset" => {
            let _ = app.emit("menu-zoom-reset", ());
        }
        "menu-reload" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.eval("location.reload()");
            }
        }
        "menu-devtools" =>
        {
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                if window.is_devtools_open() {
                    window.close_devtools();
                } else {
                    window.open_devtools();
                }
            }
        }
        "menu-find" => {
            let _ = app.emit("menu-find", ());
        }

        // Tools menu
        "menu-screenshot" => {
            let _ = app.emit("start-region-screenshot", ());
        }
        "menu-ocr" => {
            let _ = app.emit("start-ocr-screenshot", ());
        }
        "menu-chat-widget" => {
            if let Some(manager) = app.try_state::<ChatWidgetWindow>() {
                let _ = manager.toggle();
            }
        }
        "menu-clipboard-history" => {
            let _ = app.emit("show-clipboard-history", ());
        }
        "menu-mcp-servers" => {
            let _ = app.emit("navigate-to-mcp", ());
        }
        "menu-sandbox" => {
            let _ = app.emit("navigate-to-sandbox", ());
        }

        // Window menu
        "menu-minimize" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.minimize();
            }
        }
        "menu-maximize" => {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(is_maximized) = window.is_maximized() {
                    if is_maximized {
                        let _ = window.unmaximize();
                    } else {
                        let _ = window.maximize();
                    }
                }
            }
        }
        "menu-close-window" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        }

        // Help menu
        "menu-docs" => {
            let _ = open::that("https://github.com/ElementsAI-Dev/Cognia/wiki");
        }
        "menu-shortcuts" => {
            let _ = app.emit("show-shortcuts-dialog", ());
        }
        "menu-check-update" => {
            let _ = app.emit("check-for-updates", ());
        }
        "menu-feedback" => {
            let _ = open::that("https://github.com/ElementsAI-Dev/Cognia/issues");
        }
        "menu-about" => {
            tray::show_about_dialog_public(app);
        }

        // Pass to tray handler for tray-specific menu items
        _ => {
            tray::handle_tray_menu_event(app, id.to_string());
        }
    }
}

/// Perform full cleanup before application exit
fn perform_full_cleanup(app: &tauri::AppHandle) {
    if CLEANUP_CALLED.swap(true, Ordering::SeqCst) {
        log::debug!("Cleanup already performed, skipping");
        return;
    }

    log::info!("Performing full application cleanup...");

    // 1. Unregister all global shortcuts
    {
        use tauri_plugin_global_shortcut::GlobalShortcutExt;
        if let Err(e) = app.global_shortcut().unregister_all() {
            log::warn!("Failed to unregister global shortcuts: {}", e);
        } else {
            log::debug!("Global shortcuts unregistered");
        }
    }

    // 2. Stop selection manager (stops mouse hook)
    if let Some(manager) = app.try_state::<SelectionManager>() {
        if let Err(e) = manager.stop() {
            log::warn!("Failed to stop selection manager: {}", e);
        } else {
            log::debug!("Selection manager stopped");
        }
    }

    // 3. Stop screen recording if active
    if app.try_state::<ScreenRecordingManager>().is_some() {
        let app_clone = app.clone();
        // Use spawn to avoid blocking - cleanup is best-effort
        if let Ok(handle) = tokio::runtime::Handle::try_current() {
            handle.spawn(async move {
                if let Some(mgr) = app_clone.try_state::<ScreenRecordingManager>() {
                    let _ = mgr.stop().await;
                }
            });
        }
        log::debug!("Screen recording stop requested");
    }

    // 4. Shutdown MCP manager - use synchronous approach since McpManager doesn't implement Clone
    // The shutdown is best-effort during cleanup
    log::debug!("MCP manager cleanup skipped (non-blocking)");

    // 5. Explicitly destroy auxiliary windows FIRST to avoid lingering Win32 classes
    destroy_aux_windows(app);

    // Small delay to ensure windows are fully destroyed
    std::thread::sleep(std::time::Duration::from_millis(50));

    // 6. Remove tray icon AFTER windows are destroyed
    if let Some(tray) = app.tray_by_id("main-tray") {
        // First hide, then attempt to remove
        let _ = tray.set_visible(false);
        // Note: Tauri 2.x doesn't expose a remove() method, but hiding should prevent the error
        log::debug!("Tray icon hidden");
    }

    // Additional delay to ensure tray cleanup completes
    std::thread::sleep(std::time::Duration::from_millis(100));

    log::info!("Full cleanup completed");
}

/// Tear down auxiliary windows safely (chat widget, selection toolbar, assistant bubble, splash)
fn destroy_aux_windows(app: &tauri::AppHandle) {
    // Prefer manager-aware destroy for chat widget to persist position
    if let Some(manager) = app.try_state::<ChatWidgetWindow>() {
        if let Err(e) = manager.destroy() {
            log::debug!("Failed to destroy chat widget window via manager: {}", e);
        }
    } else if let Some(window) = app.get_webview_window("chat-widget") {
        let _ = window.hide();
        let _ = window.destroy();
    }

    // Selection toolbar: use manager destroy for proper cleanup
    if let Some(manager) = app.try_state::<SelectionManager>() {
        if let Err(e) = manager.toolbar_window.destroy() {
            log::debug!("Failed to destroy selection toolbar via manager: {}", e);
        }
    } else if let Some(window) = app.get_webview_window("selection-toolbar") {
        let _ = window.hide();
        let _ = window.destroy();
    }

    // Assistant bubble: use manager destroy for proper cleanup
    if let Some(manager) = app.try_state::<AssistantBubbleWindow>() {
        if let Err(e) = manager.destroy() {
            log::debug!("Failed to destroy assistant bubble via manager: {}", e);
        }
    } else if let Some(window) = app.get_webview_window("assistant-bubble") {
        let _ = window.hide();
        let _ = window.destroy();
    }

    // Splashscreen: ensure it is cleaned up to avoid stray window classes
    if let Some(window) = app.get_webview_window("splashscreen") {
        let _ = window.hide();
        let _ = window.destroy();
    }
}
