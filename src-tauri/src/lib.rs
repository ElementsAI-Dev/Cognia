//! Cognia Tauri application library
//!
//! This is the main entry point for the Tauri desktop application.

mod commands;
mod mcp;

use mcp::McpManager;
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
            commands::vector::vector_get_points,
            commands::vector::vector_search_points,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

