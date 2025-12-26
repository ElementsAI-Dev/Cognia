//! System tray module for Cognia
//!
//! Provides system tray functionality with menu items for common actions.

use tauri::{AppHandle, Manager};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};

/// Creates the system tray menu
fn create_tray_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    #[cfg(target_os = "macos")]
    {
        Menu::builder(app)
            .item(&MenuItem::with_id("show-window", "显示窗口", true, Some("show"))?)
            .item(&MenuItem::with_id("hide-window", "隐藏窗口", true, Some("hide"))?)
            .separator()
            .item(&MenuItem::with_id("quit", "退出", true, Some("quit"))?)
            .build()
    }

    #[cfg(not(target_os = "macos"))]
    {
        Menu::builder(app)
            .item(&MenuItem::with_id("show-window", "显示", true, Some("show"))?)
            .item(&MenuItem::with_id("hide-window", "隐藏", true, Some("hide"))?)
            .separator()
            .item(&MenuItem::with_id("quit", "退出", true, Some("quit"))?)
            .build()
    }
}

/// Creates and initializes the system tray
pub fn create_tray(app: &AppHandle) -> Result<(), tauri::Error> {
    let menu = create_tray_menu(app)?;

    TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .tooltip("Cognia AI Assistant")
        .on_tray_icon_event(|tray, event| {
            match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: _,
                    ..
                } => {
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        if let Ok(visible) = window.is_visible() {
                            if visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                }
                TrayIconEvent::DoubleClick { .. } => {
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

/// Handles tray menu item clicks
pub fn handle_tray_menu_event(app: &AppHandle, item_id: String) {
    match item_id.as_str() {
        "show-window" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "hide-window" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}
