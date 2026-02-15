//! Cognia Tauri application library
//!
//! This is the main entry point for the Tauri desktop application.

mod awareness;
mod chat_widget;
mod assistant_bubble;
mod commands;
mod context;
mod http;
mod input_completion;
mod jupyter;
mod mcp;
mod plugin;
mod port_utils;
mod process;
mod sandbox;
mod scheduler;
mod screen_recording;
mod screenshot;
mod selection;
mod skill;
mod skill_seekers;
mod external_agent;
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
use scheduler::SchedulerState;
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

                #[cfg(target_os = "windows")]
                {
                    // On Windows, use SetConsoleCtrlHandler to intercept Ctrl+C at the Win32 level.
                    // Returning TRUE from the handler suppresses the default "Terminate batch job (Y/N)?" prompt.
                    use std::sync::OnceLock;
                    use windows::Win32::System::Console::{SetConsoleCtrlHandler, CTRL_C_EVENT, CTRL_CLOSE_EVENT};
                    use windows::Win32::Foundation::BOOL;

                    static EXIT_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();
                    let _ = EXIT_HANDLE.set(handle.clone());

                    unsafe extern "system" fn ctrl_handler(ctrl_type: u32) -> BOOL {
                        if ctrl_type == CTRL_C_EVENT || ctrl_type == CTRL_CLOSE_EVENT {
                            log::info!("Console ctrl event {} detected, performing graceful shutdown", ctrl_type);
                            if let Some(h) = EXIT_HANDLE.get() {
                                perform_full_cleanup(h);
                                h.exit(0);
                            }
                            // Return TRUE to suppress default handler ("Terminate batch job" prompt)
                            BOOL(1)
                        } else {
                            // Let the system handle other events
                            BOOL(0)
                        }
                    }

                    unsafe {
                        if let Err(e) = SetConsoleCtrlHandler(Some(ctrl_handler), true) {
                            log::error!("Failed to set console ctrl handler: {}", e);
                        } else {
                            log::info!("Windows console ctrl handler registered");
                        }
                    }
                }

                #[cfg(not(target_os = "windows"))]
                {
                    tauri::async_runtime::spawn(async move {
                        if tokio::signal::ctrl_c().await.is_ok() {
                            log::info!("Ctrl+C detected, performing graceful shutdown");
                            perform_full_cleanup(&handle);
                            handle.exit(0);
                        }
                    });
                }
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

            // Initialize Recording Toolbar
            let recording_toolbar = screen_recording::RecordingToolbar::new(app.handle().clone());
            app.manage(recording_toolbar);
            log::info!("Recording toolbar initialized");

            // Initialize Context Manager
            let context_manager = ContextManager::new();
            app.manage(context_manager);

            // Initialize Awareness Manager
            let awareness_manager = AwarenessManager::new();
            app.manage(awareness_manager);

            // Initialize Input Completion Manager
            let input_completion_manager = input_completion::InputCompletionManager::new(app.handle().clone());
            app.manage(input_completion_manager);
            log::info!("Input completion manager initialized");

            // Initialize Plugin Manager
            let plugin_manager_state = commands::extensions::plugin::create_plugin_manager(app_data_dir.clone());
            app.manage(plugin_manager_state);
            log::info!("Plugin manager initialized");

            // Initialize Skill Service
            let skill_service_state = commands::extensions::skill::create_skill_service(app_data_dir.clone());
            app.manage(skill_service_state);
            log::info!("Skill service initialized");

            // Initialize Skill Seekers Service
            let skill_seekers_state = commands::extensions::skill_seekers::create_skill_seekers_service(
                app_data_dir.clone(),
                app.handle().clone(),
            );
            app.manage(skill_seekers_state);
            log::info!("Skill Seekers service initialized");

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

            // Initialize Tray Config State
            let tray_config_state = commands::system::tray::TrayConfigState::default();
            app.manage(tray_config_state);
            log::info!("Tray config state initialized");

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
            let jupyter_cleanup_state = jupyter_state.clone();
            app.manage(jupyter_state);
            log::info!("Jupyter state initialized");

            // Periodic Jupyter kernel cleanup (every 5 minutes)
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));
                interval.tick().await; // skip first immediate tick
                loop {
                    interval.tick().await;
                    log::debug!("Running periodic Jupyter kernel cleanup");
                    jupyter_cleanup_state.perform_cleanup().await;
                }
            });

            // Initialize Git Credentials Manager
            let git_credentials_state: commands::devtools::git_credentials::CredentialManagerState =
                parking_lot::Mutex::new(commands::devtools::git_credentials::GitCredentialManager::default());
            app.manage(git_credentials_state);
            log::info!("Git credentials manager initialized");

            // Initialize Git History Manager
            let git_history_state: commands::devtools::git_history::HistoryManagerState =
                parking_lot::Mutex::new(commands::devtools::git_history::GitHistoryManager::default());
            app.manage(git_history_state);
            log::info!("Git history manager initialized");

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

            // Initialize System Scheduler State
            let scheduler_state = SchedulerState::new();
            app.manage(scheduler_state);
            log::info!("System scheduler state initialized");

            // Initialize External Agent State
            let external_agent_state = external_agent::ExternalAgentState::default();
            app.manage(external_agent_state);
            log::info!("External agent state initialized");

            // Initialize ACP Terminal State
            let acp_terminal_state = external_agent::AcpTerminalState::default();
            app.manage(acp_terminal_state);
            log::info!("ACP terminal state initialized");

            // Setup splash screen and main window with real progress events
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Helper to emit progress to splash screen
                let emit_progress = |stage: &str, progress: u8, message: &str| {
                    if let Some(splash) = app_handle.get_webview_window("splashscreen") {
                        let _ = splash.emit(
                            "init-progress",
                            serde_json::json!({
                                "stage": stage,
                                "progress": progress,
                                "message": message
                            }),
                        );
                    }
                };

                // Stage 1: Initializing
                emit_progress("init", 0, "Initializing...");
                tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

                // Stage 2: Loading core modules
                emit_progress("core", 15, "Loading core modules...");
                tokio::time::sleep(tokio::time::Duration::from_millis(400)).await;

                // Stage 3: Initializing providers
                emit_progress("providers", 35, "Initializing providers...");
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

                // Stage 4: Loading themes
                emit_progress("themes", 55, "Loading themes...");
                tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

                // Stage 5: Preparing workspace
                emit_progress("workspace", 75, "Preparing workspace...");
                tokio::time::sleep(tokio::time::Duration::from_millis(400)).await;

                // Stage 6: Almost ready
                emit_progress("almost", 90, "Almost ready...");
                tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

                // Stage 7: Ready
                emit_progress("ready", 100, "Ready!");
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

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
            commands::providers::mcp::mcp_respond_sampling,
            commands::providers::mcp::mcp_set_roots,
            commands::providers::mcp::mcp_get_roots,
            commands::providers::mcp::mcp_list_resource_templates,
            commands::providers::mcp::mcp_complete,
            commands::providers::mcp::mcp_cancel_request,
            commands::providers::mcp::mcp_subscribe_resource,
            commands::providers::mcp::mcp_unsubscribe_resource,
            commands::providers::mcp::mcp_get_server_capabilities,
            commands::providers::mcp::mcp_get_server_info,
            commands::providers::mcp::mcp_is_server_connected,
            commands::providers::mcp::mcp_set_server_enabled,
            commands::providers::mcp::mcp_set_server_auto_start,
            commands::providers::mcp::mcp_get_config_path,
            commands::providers::mcp::mcp_get_full_config,
            commands::providers::mcp::mcp_shutdown,
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
            commands::window::selection::selection_search_history_by_time,
            commands::window::selection::selection_clear_history,
            commands::window::selection::selection_export_history,
            commands::window::selection::selection_import_history,
            // Clipboard history commands
            commands::window::clipboard_commands::clipboard_get_history,
            commands::window::clipboard_commands::clipboard_search_history,
            commands::window::clipboard_commands::clipboard_get_pinned,
            commands::window::clipboard_commands::clipboard_pin_entry,
            commands::window::clipboard_commands::clipboard_unpin_entry,
            commands::window::clipboard_commands::clipboard_delete_entry,
            commands::window::clipboard_commands::clipboard_clear_unpinned,
            commands::window::clipboard_commands::clipboard_clear_all,
            commands::window::clipboard_commands::clipboard_copy_entry,
            commands::window::clipboard_commands::clipboard_check_update,
            // Clipboard context awareness commands
            commands::window::clipboard_commands::clipboard_analyze_content,
            commands::window::clipboard_commands::clipboard_get_current_with_analysis,
            commands::window::clipboard_commands::clipboard_transform_content,
            commands::window::clipboard_commands::clipboard_write_text,
            commands::window::clipboard_commands::clipboard_read_text,
            commands::window::clipboard_commands::clipboard_write_html,
            commands::window::clipboard_commands::clipboard_clear,
            commands::window::clipboard_commands::clipboard_get_suggested_actions,
            commands::window::clipboard_commands::clipboard_extract_entities,
            commands::window::clipboard_commands::clipboard_check_sensitive,
            commands::window::clipboard_commands::clipboard_get_stats,
            commands::window::clipboard_commands::clipboard_detect_category,
            commands::window::clipboard_commands::clipboard_detect_language,
            // Smart selection commands
            commands::window::smart_selection_commands::selection_smart_expand,
            commands::window::smart_selection_commands::selection_auto_expand,
            commands::window::smart_selection_commands::selection_get_modes,
            // Text type detection & toolbar config
            commands::window::smart_selection_commands::selection_detect_text_type,
            commands::window::selection::selection_get_toolbar_config,
            commands::window::selection::selection_get_stats_summary,
            commands::window::selection::selection_time_since_last_detection,
            commands::window::selection::selection_get_last_text,
            commands::window::selection::selection_clear_last_text,
            commands::window::selection::selection_get_last_selection,
            // Screenshot commands
            commands::media::screenshot::screenshot_capture_fullscreen,
            commands::media::screenshot::screenshot_capture_window,
            commands::media::screenshot::screenshot_capture_region,
            commands::media::screenshot::screenshot_start_region_selection,
            commands::media::screenshot::screenshot_ocr,
            commands::media::screenshot::screenshot_apply_annotations,
            commands::media::screenshot::screenshot_validate_selection,
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
            commands::media::screenshot::screenshot_get_all_history,
            commands::media::screenshot::screenshot_search_history_by_label,
            commands::media::screenshot::screenshot_get_pinned_history,
            commands::media::screenshot::screenshot_clear_all_history,
            commands::media::screenshot::screenshot_get_history_stats,
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
            commands::media::screenshot::screenshot_set_ocr_language,
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
            commands::media::screenshot::screenshot_set_snap_config,
            commands::media::screenshot::screenshot_get_window_at_point,
            commands::media::screenshot::screenshot_get_child_elements,
            commands::media::screenshot::screenshot_calculate_selection_snap,
            commands::media::screenshot::screenshot_get_pixel_color,
            // Screenshot annotator management commands
            commands::media::screenshot::screenshot_annotator_init,
            commands::media::screenshot::screenshot_annotator_add,
            commands::media::screenshot::screenshot_annotator_undo,
            commands::media::screenshot::screenshot_annotator_clear,
            commands::media::screenshot::screenshot_annotator_get_all,
            commands::media::screenshot::screenshot_annotator_export,
            commands::media::screenshot::screenshot_annotator_import,
            // Detailed OCR commands
            commands::media::screenshot::screenshot_ocr_extract_detailed,
            commands::media::screenshot::screenshot_get_current_ocr_language,
            commands::media::screenshot::screenshot_is_ocr_available,
            commands::media::screenshot::screenshot_get_ocr_engine_languages,
            // Context commands
            commands::context::context::context_get_full,
            commands::context::context::context_get_window,
            commands::context::context::context_get_app,
            commands::context::context::context_get_file,
            commands::context::context::context_get_browser,
            commands::context::context::context_get_browser_suggested_actions,
            commands::context::context::context_get_editor,
            commands::context::context::context_is_code_editor,
            commands::context::context::context_get_all_windows,
            commands::context::context::context_clear_cache,
            commands::context::context::context_find_windows_by_title,
            commands::context::context::context_find_windows_by_process,
            commands::context::context::context_set_cache_duration,
            commands::context::context::context_get_cache_duration,
            commands::context::context::context_analyze_ui_automation,
            commands::context::context::context_get_text_at,
            commands::context::context::context_get_element_at,
            commands::context::context::context_analyze_screen,
            commands::context::context::context_clear_screen_cache,
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
            // Activity tracker extended commands
            commands::context::awareness::awareness_get_activities_by_type,
            commands::context::awareness::awareness_get_activities_in_range,
            commands::context::awareness::awareness_get_activities_by_application,
            commands::context::awareness::awareness_get_activity_stats,
            commands::context::awareness::awareness_set_activity_tracking_enabled,
            commands::context::awareness::awareness_is_activity_tracking_enabled,
            commands::context::awareness::awareness_export_activity_history,
            commands::context::awareness::awareness_import_activity_history,
            // Smart suggestions extended commands
            commands::context::awareness::awareness_dismiss_suggestion,
            commands::context::awareness::awareness_clear_dismissed_suggestions,
            commands::context::awareness::awareness_is_suggestion_dismissed,
            commands::context::awareness::awareness_get_dismissed_suggestions,
            // Focus tracker extended commands
            commands::context::awareness::awareness_get_all_focus_sessions,
            commands::context::awareness::awareness_get_focus_session_count,
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
            commands::devtools::sandbox::sandbox_get_all_languages,
            commands::devtools::sandbox::sandbox_get_available_languages,
            commands::devtools::sandbox::sandbox_update_session,
            commands::devtools::sandbox::sandbox_get_session_executions,
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
            commands::system::environment::environment_set_tool_enabled,
            commands::system::environment::environment_install_tool,
            commands::system::environment::environment_uninstall_tool,
            commands::system::environment::environment_open_tool_website,
            commands::system::environment::environment_get_python_versions,
            commands::system::environment::environment_get_node_versions,
            commands::system::environment::environment_list_env_vars,
            commands::system::environment::environment_upsert_env_var,
            commands::system::environment::environment_delete_env_var,
            commands::system::environment::environment_import_env_file,
            commands::system::environment::environment_export_env_file,
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
            commands::devtools::jupyter::jupyter_cleanup,
            commands::devtools::jupyter::jupyter_get_cached_variables,
            commands::devtools::jupyter::jupyter_get_kernel_status,
            commands::devtools::jupyter::jupyter_is_kernel_alive,
            commands::devtools::jupyter::jupyter_get_session_by_id,
            commands::devtools::jupyter::jupyter_get_config,
            commands::devtools::jupyter::jupyter_validate_config,
            commands::devtools::jupyter::jupyter_open_notebook,
            commands::devtools::jupyter::jupyter_save_notebook,
            commands::devtools::jupyter::jupyter_get_notebook_info,
            // Proxy commands
            commands::system::proxy::proxy_detect_all,
            commands::system::proxy::proxy_test,
            commands::system::proxy::proxy_test_multi,
            commands::system::proxy::proxy_get_system,
            commands::system::proxy::proxy_check_port,
            commands::system::proxy::proxy_get_clash_info,
            commands::system::proxy::proxy_http_request,
            commands::system::proxy::set_backend_proxy,
            commands::system::proxy::get_backend_proxy,
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
            commands::media::screen_recording::video_trim_with_progress,
            commands::media::screen_recording::video_convert,
            commands::media::screen_recording::video_convert_with_progress,
            commands::media::screen_recording::video_get_info,
            commands::media::screen_recording::video_generate_thumbnail,
            commands::media::screen_recording::video_generate_thumbnail_with_progress,
            commands::media::screen_recording::video_check_encoding_support,
            commands::media::screen_recording::video_cancel_processing,
            // FFmpeg commands
            commands::media::screen_recording::ffmpeg_get_info,
            commands::media::screen_recording::ffmpeg_get_install_guide,
            commands::media::screen_recording::ffmpeg_check_hardware_acceleration,
            commands::media::screen_recording::ffmpeg_check_version,
            // Storage management commands
            commands::media::screen_recording::storage_get_aggregated_status,
            commands::media::screen_recording::storage_get_stats,
            commands::media::screen_recording::storage_get_config,
            commands::media::screen_recording::storage_update_config,
            commands::media::screen_recording::storage_generate_recording_filename,
            commands::media::screen_recording::storage_get_recording_path,
            commands::media::screen_recording::storage_generate_screenshot_filename,
            commands::media::screen_recording::storage_get_screenshot_path,
            commands::media::screen_recording::storage_is_exceeded,
            commands::media::screen_recording::storage_get_usage_percent,
            commands::media::screen_recording::storage_cleanup,
            commands::media::screen_recording::storage_list_files,
            commands::media::screen_recording::storage_get_file,
            commands::media::screen_recording::recording_get_app_data_dir,
            commands::media::screen_recording::recording_get_recordings_dir,
            commands::media::screen_recording::recording_calculate_toolbar_position,
            // Recording toolbar commands
            commands::media::screen_recording::recording_toolbar_show,
            commands::media::screen_recording::recording_toolbar_hide,
            commands::media::screen_recording::recording_toolbar_is_visible,
            commands::media::screen_recording::recording_toolbar_set_position,
            commands::media::screen_recording::recording_toolbar_get_position,
            commands::media::screen_recording::recording_toolbar_snap_to_edge,
            commands::media::screen_recording::recording_toolbar_toggle_compact,
            commands::media::screen_recording::recording_toolbar_get_config,
            commands::media::screen_recording::recording_toolbar_update_config,
            commands::media::screen_recording::recording_toolbar_get_state,
            commands::media::screen_recording::recording_toolbar_update_state,
            commands::media::screen_recording::recording_toolbar_set_hovered,
            commands::media::screen_recording::recording_toolbar_is_hovered,
            commands::media::screen_recording::recording_toolbar_destroy,
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
            commands::window::chat_widget::chat_widget_open_main,
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
            commands::window::window_diagnostics::close_splashscreen,
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
            commands::devtools::git::git_full_status,
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
            commands::devtools::git::git_export_data,
            commands::devtools::git::git_list_exports,
            commands::devtools::git::git_export_history,
            commands::devtools::git::git_restore_chat,
            commands::devtools::git::git_restore_designer,
            commands::devtools::git::git_blame,
            commands::devtools::git::git_blame_line,
            commands::devtools::git::git_revert,
            commands::devtools::git::git_revert_abort,
            commands::devtools::git::git_tag_list,
            commands::devtools::git::git_tag_create,
            commands::devtools::git::git_tag_delete,
            commands::devtools::git::git_tag_push,
            commands::devtools::git::git_cherry_pick,
            commands::devtools::git::git_cherry_pick_abort,
            commands::devtools::git::git_rename_branch,
            commands::devtools::git::git_show_commit,
            commands::devtools::git::git_merge_abort,
            commands::devtools::git::git_log_graph,
            commands::devtools::git::git_repo_stats,
            commands::devtools::git::git_checkpoint_create,
            commands::devtools::git::git_checkpoint_list,
            commands::devtools::git::git_checkpoint_restore,
            commands::devtools::git::git_checkpoint_delete,
            // Git credentials commands
            commands::devtools::git_credentials::git_list_credentials,
            commands::devtools::git_credentials::git_set_credential,
            commands::devtools::git_credentials::git_remove_credential,
            commands::devtools::git_credentials::git_detect_ssh_keys,
            commands::devtools::git_credentials::git_test_credential,
            // Git history commands (undo/redo)
            commands::devtools::git_history::git_record_operation,
            commands::devtools::git_history::git_get_operation,
            commands::devtools::git_history::git_get_repositories,
            commands::devtools::git_history::git_get_history,
            commands::devtools::git_history::git_undo_last,
            commands::devtools::git_history::git_clear_history,
            commands::devtools::git_history::git_reflog,
            commands::devtools::git_history::git_recover_to_reflog,
            // Git2 native library commands
            commands::devtools::git2_ops::git2_is_available,
            commands::devtools::git2_ops::git2_is_repo,
            commands::devtools::git2_ops::git2_get_status,
            commands::devtools::git2_ops::git2_get_file_status,
            commands::devtools::git2_ops::git2_get_branches,
            commands::devtools::git2_ops::git2_stage_files,
            commands::devtools::git2_ops::git2_stage_all,
            commands::devtools::git2_ops::git2_create_commit,
            commands::devtools::git2_ops::git2_init_repo,
            commands::devtools::git2_ops::git2_fetch_remote,
            // Multi-VCS commands (git, jj, hg, svn)
            commands::devtools::vcs::vcs_detect,
            commands::devtools::vcs::vcs_is_type_available,
            commands::devtools::vcs::vcs_check_installed,
            commands::devtools::vcs::vcs_get_info,
            commands::devtools::vcs::vcs_blame,
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
            // Tray commands
            commands::system::tray::tray_get_state,
            commands::system::tray::tray_get_config,
            commands::system::tray::tray_set_config,
            commands::system::tray::tray_set_display_mode,
            commands::system::tray::tray_toggle_display_mode,
            commands::system::tray::tray_set_item_visibility,
            commands::system::tray::tray_set_compact_items,
            commands::system::tray::tray_update_tooltip,
            commands::system::tray::tray_set_busy,
            commands::system::tray::tray_refresh_menu,
            commands::system::tray::tray_get_default_compact_items,
            commands::system::tray::tray_get_all_item_ids,
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
            commands::extensions::plugin::plugin_get_directory,
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
            commands::extensions::plugin::plugin_python_runtime_info,
            commands::extensions::plugin::plugin_python_is_initialized,
            commands::extensions::plugin::plugin_python_get_info,
            commands::extensions::plugin::plugin_python_unload,
            commands::extensions::plugin::plugin_python_list,
            commands::extensions::plugin::plugin_show_notification,
            // Skill commands
            commands::extensions::skill::skill_list_repos,
            commands::extensions::skill::skill_add_repo,
            commands::extensions::skill::skill_remove_repo,
            commands::extensions::skill::skill_toggle_repo,
            commands::extensions::skill::skill_discover,
            commands::extensions::skill::skill_discover_all,
            commands::extensions::skill::skill_search,
            commands::extensions::skill::skill_get_all,
            commands::extensions::skill::skill_scan_local,
            commands::extensions::skill::skill_install,
            commands::extensions::skill::skill_install_local,
            commands::extensions::skill::skill_register_local,
            commands::extensions::skill::skill_uninstall,
            commands::extensions::skill::skill_get_installed,
            commands::extensions::skill::skill_get,
            commands::extensions::skill::skill_get_required,
            commands::extensions::skill::skill_get_state,
            commands::extensions::skill::skill_validate_install,
            commands::extensions::skill::skill_enable,
            commands::extensions::skill::skill_disable,
            commands::extensions::skill::skill_update,
            commands::extensions::skill::skill_read_content,
            commands::extensions::skill::skill_write_content,
            commands::extensions::skill::skill_list_resources,
            commands::extensions::skill::skill_read_resource,
            commands::extensions::skill::skill_write_resource,
            commands::extensions::skill::skill_get_ssot_dir,
            commands::extensions::skill::skill_scan_installed,
            commands::extensions::skill::skill_scan_path,
            commands::extensions::skill::skill_security_rule_count,
            // Skill Seekers commands
            commands::extensions::skill_seekers::skill_seekers_is_installed,
            commands::extensions::skill_seekers::skill_seekers_get_version,
            commands::extensions::skill_seekers::skill_seekers_install,
            commands::extensions::skill_seekers::skill_seekers_get_config,
            commands::extensions::skill_seekers::skill_seekers_update_config,
            commands::extensions::skill_seekers::skill_seekers_list_presets,
            commands::extensions::skill_seekers::skill_seekers_scrape_website,
            commands::extensions::skill_seekers::skill_seekers_scrape_github,
            commands::extensions::skill_seekers::skill_seekers_scrape_pdf,
            commands::extensions::skill_seekers::skill_seekers_enhance,
            commands::extensions::skill_seekers::skill_seekers_package,
            commands::extensions::skill_seekers::skill_seekers_estimate_pages,
            commands::extensions::skill_seekers::skill_seekers_validate_config,
            commands::extensions::skill_seekers::skill_seekers_list_jobs,
            commands::extensions::skill_seekers::skill_seekers_get_job,
            commands::extensions::skill_seekers::skill_seekers_cancel_job,
            commands::extensions::skill_seekers::skill_seekers_resume_job,
            commands::extensions::skill_seekers::skill_seekers_cleanup_jobs,
            commands::extensions::skill_seekers::skill_seekers_list_generated,
            commands::extensions::skill_seekers::skill_seekers_get_generated,
            commands::extensions::skill_seekers::skill_seekers_get_app_data_dir,
            commands::extensions::skill_seekers::skill_seekers_get_output_dir,
            commands::extensions::skill_seekers::skill_seekers_get_venv_path,
            commands::extensions::skill_seekers::skill_seekers_quick_generate_website,
            commands::extensions::skill_seekers::skill_seekers_quick_generate_github,
            commands::extensions::skill_seekers::skill_seekers_quick_generate_preset,
            // Input completion commands
            commands::input_completion::input_completion_start,
            commands::input_completion::input_completion_stop,
            commands::input_completion::input_completion_get_ime_state,
            commands::input_completion::input_completion_get_suggestion,
            commands::input_completion::input_completion_accept,
            commands::input_completion::input_completion_dismiss,
            commands::input_completion::input_completion_get_status,
            commands::input_completion::input_completion_update_config,
            commands::input_completion::input_completion_get_config,
            commands::input_completion::input_completion_trigger,
            commands::input_completion::input_completion_is_running,
            commands::input_completion::input_completion_get_stats,
            commands::input_completion::input_completion_reset_stats,
            commands::input_completion::input_completion_clear_cache,
            commands::input_completion::input_completion_test_connection,
            commands::input_completion::input_completion_submit_feedback,
            // System scheduler commands
            commands::scheduler::scheduler_get_capabilities,
            commands::scheduler::scheduler_is_available,
            commands::scheduler::scheduler_is_elevated,
            commands::scheduler::scheduler_create_task,
            commands::scheduler::scheduler_update_task,
            commands::scheduler::scheduler_delete_task,
            commands::scheduler::scheduler_get_task,
            commands::scheduler::scheduler_list_tasks,
            commands::scheduler::scheduler_enable_task,
            commands::scheduler::scheduler_disable_task,
            commands::scheduler::scheduler_run_task_now,
            commands::scheduler::scheduler_cancel_confirmation,
            commands::scheduler::scheduler_get_pending_confirmations,
            commands::scheduler::scheduler_request_elevation,
            commands::scheduler::scheduler_confirm_task,
            commands::scheduler::scheduler_validate_task,
            // External agent commands
            external_agent::spawn_external_agent,
            external_agent::send_to_external_agent,
            external_agent::kill_external_agent,
            external_agent::get_external_agent_status,
            external_agent::list_external_agents,
            external_agent::kill_all_external_agents,
            external_agent::receive_external_agent_stderr,
            external_agent::is_external_agent_running,
            external_agent::get_external_agent_info,
            external_agent::set_external_agent_running,
            external_agent::set_external_agent_failed,
            // ACP Terminal commands
            external_agent::acp_terminal_create,
            external_agent::acp_terminal_output,
            external_agent::acp_terminal_kill,
            external_agent::acp_terminal_release,
            external_agent::acp_terminal_wait_for_exit,
            external_agent::acp_terminal_write,
            external_agent::acp_terminal_get_session_terminals,
            external_agent::acp_terminal_kill_session_terminals,
            external_agent::acp_terminal_is_running,
            external_agent::acp_terminal_get_info,
            external_agent::acp_terminal_list,
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

    // 3. Stop screen recording and shutdown MCP manager synchronously with timeout
    if let Ok(rt_handle) = tokio::runtime::Handle::try_current() {
        let app_clone = app.clone();
        let cleanup_result = std::thread::spawn(move || {
            rt_handle.block_on(async move {
                let cleanup_future = async {
                    if let Some(mgr) = app_clone.try_state::<ScreenRecordingManager>() {
                        let _ = mgr.stop().await;
                        log::debug!("Screen recording stopped");
                    }
                    if let Some(mgr) = app_clone.try_state::<McpManager>() {
                        mgr.shutdown().await;
                        log::debug!("MCP manager shut down");
                    }
                };
                // Give async cleanup at most 2 seconds to finish
                let _ = tokio::time::timeout(
                    tokio::time::Duration::from_secs(2),
                    cleanup_future,
                ).await;
            });
        }).join();
        if let Err(_) = cleanup_result {
            log::warn!("Async cleanup thread panicked");
        }
    }

    // 4. Remove tray icon FIRST (fast operation, prevents "Error removing system tray icon")
    if let Some(tray) = app.tray_by_id("main-tray") {
        // Clear menu to release resources, then hide to trigger OS cleanup
        let _ = tray.set_menu(None::<tauri::menu::Menu<tauri::Wry>>);
        let _ = tray.set_visible(false);
        log::debug!("Tray icon removed");
    }

    // 5. Destroy ALL windows (auxiliary + main) to allow Win32 class unregistration
    destroy_all_windows(app);

    // Allow WebView2 to fully tear down its Win32 window classes
    std::thread::sleep(std::time::Duration::from_millis(200));

    log::info!("Full cleanup completed");
}

/// Tear down all windows safely to prevent Win32 class unregistration errors
fn destroy_all_windows(app: &tauri::AppHandle) {
    // 1. Auxiliary windows first (chat widget, selection toolbar, assistant bubble, splash)

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

    // Small delay between auxiliary and main window destruction
    std::thread::sleep(std::time::Duration::from_millis(50));

    // 2. Main window LAST - prevents ERROR_CLASS_HAS_WINDOWS (Error 1412)
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        let _ = window.close();
        log::debug!("Main window closed");
    }
}
