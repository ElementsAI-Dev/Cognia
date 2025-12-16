//! Cognia Tauri application library
//!
//! This is the main entry point for the Tauri desktop application.

mod commands;
mod mcp;

use mcp::McpManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Get app data directory for MCP config storage
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            // Initialize MCP Manager
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

            Ok(())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
