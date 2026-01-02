//! System tray module for Cognia
//!
//! Provides system tray functionality with menu items for common actions.

use crate::chat_widget::ChatWidgetWindow;
use crate::selection::SelectionManager;
use tauri::{AppHandle, Manager};
use tauri::menu::{Menu, MenuItem, CheckMenuItem, Submenu};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};

/// Creates the system tray menu
fn create_tray_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    // Create menu items
    let show_item = MenuItem::with_id(app, "show-window", "显示窗口", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide-window", "隐藏窗口", true, None::<&str>)?;
    let chat_widget_item = MenuItem::with_id(
        app,
        "toggle-chat-widget",
        "AI 助手 (Ctrl+Shift+Space)",
        true,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    
    // Create selection toolbar submenu items
    let selection_enabled = CheckMenuItem::with_id(
        app,
        "selection-enabled",
        "启用划词",
        true,
        true, // Default checked
        None::<&str>,
    )?;
    let selection_trigger = MenuItem::with_id(
        app,
        "selection-trigger",
        "立即检测选中",
        true,
        None::<&str>,
    )?;
    let selection_hide = MenuItem::with_id(
        app,
        "selection-hide-toolbar",
        "隐藏工具条",
        true,
        None::<&str>,
    )?;
    let selection_restart = MenuItem::with_id(
        app,
        "selection-restart",
        "重启服务",
        true,
        None::<&str>,
    )?;

    // Create selection submenu
    let selection_submenu = Submenu::with_id_and_items(
        app,
        "selection-menu",
        "划词工具",
        true,
        &[
            &selection_enabled,
            &selection_trigger,
            &selection_hide,
            &selection_restart,
        ],
    )?;

    // Build main menu
    Menu::with_items(
        app,
        &[
            &show_item,
            &hide_item,
            &chat_widget_item,
            &selection_submenu,
            &quit_item,
        ],
    )
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
        "toggle-chat-widget" => {
            // Toggle chat widget visibility
            if let Some(manager) = app.try_state::<ChatWidgetWindow>() {
                match manager.toggle() {
                    Ok(visible) => {
                        log::info!("Chat widget toggled: {}", if visible { "shown" } else { "hidden" });
                    }
                    Err(e) => {
                        log::error!("Failed to toggle chat widget: {}", e);
                    }
                }
            }
        }
        "selection-enabled" => {
            // Toggle selection toolbar enabled state
            if let Some(manager) = app.try_state::<SelectionManager>() {
                let current = manager.is_enabled();
                manager.set_enabled(!current);
                log::info!("Selection toolbar toggled: {}", !current);
            }
        }
        "selection-trigger" => {
            // Manually trigger selection detection
            if let Some(manager) = app.try_state::<SelectionManager>() {
                match manager.trigger() {
                    Ok(Some(payload)) => {
                        log::info!("Manual selection triggered: {} chars", payload.text.len());
                    }
                    Ok(None) => {
                        log::debug!("No text selected");
                    }
                    Err(e) => {
                        log::error!("Failed to trigger selection: {}", e);
                    }
                }
            }
        }
        "selection-hide-toolbar" => {
            // Hide the selection toolbar
            if let Some(manager) = app.try_state::<SelectionManager>() {
                let _ = manager.toolbar_window.hide();
            }
        }
        "selection-restart" => {
            // Restart the selection service
            if let Some(manager) = app.try_state::<SelectionManager>() {
                let _ = manager.stop();
                let app_clone = app.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    if let Some(mgr) = app_clone.try_state::<SelectionManager>() {
                        if let Err(e) = mgr.start().await {
                            log::error!("Failed to restart selection service: {}", e);
                        } else {
                            log::info!("Selection service restarted");
                        }
                    }
                });
            }
        }
        "quit" => {
            // Stop selection manager before quitting
            if let Some(manager) = app.try_state::<SelectionManager>() {
                let _ = manager.stop();
            }
            app.exit(0);
        }
        _ => {
            log::debug!("Unknown tray menu item: {}", item_id);
        }
    }
}
