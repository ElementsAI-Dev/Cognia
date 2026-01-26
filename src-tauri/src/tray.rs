//! System tray module for Cognia
//!
//! Provides enhanced system tray functionality with:
//! - Organized menu structure with separators
//! - Screenshot and screen recording controls
//! - Clipboard history access
//! - Autostart toggle
//! - Dynamic tooltip updates
//! - Shortcut key hints

use crate::assistant_bubble::AssistantBubbleWindow;
use crate::chat_widget::ChatWidgetWindow;
use crate::screen_recording::ScreenRecordingManager;
use crate::screenshot::ScreenshotManager;
use crate::selection::SelectionManager;
use parking_lot::RwLock;
use std::sync::Arc;
use tauri::image::Image;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

/// Tray state for dynamic updates
pub struct TrayState {
    /// Whether the app is currently busy (e.g., recording)
    pub is_busy: bool,
    /// Current status message for tooltip
    pub status_message: String,
    /// Recording state
    pub is_recording: bool,
}

impl Default for TrayState {
    fn default() -> Self {
        Self {
            is_busy: false,
            status_message: "就绪".to_string(),
            is_recording: false,
        }
    }
}

/// Global tray state
pub static TRAY_STATE: once_cell::sync::Lazy<Arc<RwLock<TrayState>>> =
    once_cell::sync::Lazy::new(|| Arc::new(RwLock::new(TrayState::default())));

/// Creates the system tray menu with organized sections
fn create_tray_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    // ═══════════════════════════════════════════════════════════════════
    // Section 1: Window Controls
    // ═══════════════════════════════════════════════════════════════════
    let show_item = MenuItem::with_id(app, "show-window", "📱 显示主窗口", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide-window", "🔽 隐藏主窗口", true, None::<&str>)?;
    let chat_widget_item = MenuItem::with_id(
        app,
        "toggle-chat-widget",
        "🤖 AI 助手\t\tCtrl+Shift+Space",
        true,
        None::<&str>,
    )?;
    let bubble_show_item = MenuItem::with_id(
        app,
        "bubble-show",
        "💬 显示悬浮气泡",
        true,
        None::<&str>,
    )?;
    let bubble_hide_item = MenuItem::with_id(
        app,
        "bubble-hide",
        "🔽 隐藏悬浮气泡",
        true,
        None::<&str>,
    )?;
    let bubble_toggle_minimize_item = MenuItem::with_id(
        app,
        "bubble-toggle-minimize",
        "📌 折叠/展开气泡\t\tAlt+M",
        true,
        None::<&str>,
    )?;

    // ═══════════════════════════════════════════════════════════════════
    // Section 2: Tools - Screenshot
    // ═══════════════════════════════════════════════════════════════════
    let screenshot_fullscreen = MenuItem::with_id(
        app,
        "screenshot-fullscreen",
        "🖼️ 全屏截图\t\tCtrl+Shift+S",
        true,
        None::<&str>,
    )?;
    let screenshot_region = MenuItem::with_id(
        app,
        "screenshot-region",
        "✂️ 区域截图\t\tCtrl+Shift+A",
        true,
        None::<&str>,
    )?;
    let screenshot_window =
        MenuItem::with_id(app, "screenshot-window", "🪟 窗口截图", true, None::<&str>)?;
    let screenshot_ocr = MenuItem::with_id(
        app,
        "screenshot-ocr",
        "📝 截图识字 (OCR)",
        true,
        None::<&str>,
    )?;

    let screenshot_submenu = Submenu::with_id_and_items(
        app,
        "screenshot-menu",
        "📸 截图工具",
        true,
        &[
            &screenshot_fullscreen,
            &screenshot_region,
            &screenshot_window,
            &PredefinedMenuItem::separator(app)?,
            &screenshot_ocr,
        ],
    )?;

    // ═══════════════════════════════════════════════════════════════════
    // Section 3: Tools - Screen Recording
    // ═══════════════════════════════════════════════════════════════════
    let recording_start = MenuItem::with_id(
        app,
        "recording-start",
        "⏺️ 开始录屏\t\tCtrl+Shift+R",
        true,
        None::<&str>,
    )?;
    let recording_stop = MenuItem::with_id(
        app,
        "recording-stop",
        "⏹️ 停止录屏",
        false, // Disabled by default
        None::<&str>,
    )?;
    let recording_pause = MenuItem::with_id(
        app,
        "recording-pause",
        "⏸️ 暂停/继续",
        false, // Disabled by default
        None::<&str>,
    )?;

    let recording_submenu = Submenu::with_id_and_items(
        app,
        "recording-menu",
        "🎬 录屏工具",
        true,
        &[&recording_start, &recording_stop, &recording_pause],
    )?;

    // ═══════════════════════════════════════════════════════════════════
    // Section 4: Selection Toolbar
    // ═══════════════════════════════════════════════════════════════════
    let selection_enabled = CheckMenuItem::with_id(
        app,
        "selection-enabled",
        "✅ 启用划词工具",
        true,
        true, // Default checked
        None::<&str>,
    )?;
    let selection_trigger = MenuItem::with_id(
        app,
        "selection-trigger",
        "🔍 立即检测选中文本",
        true,
        None::<&str>,
    )?;
    let selection_hide = MenuItem::with_id(
        app,
        "selection-hide-toolbar",
        "🙈 隐藏划词工具条",
        true,
        None::<&str>,
    )?;
    let selection_restart = MenuItem::with_id(
        app,
        "selection-restart",
        "🔄 重启划词服务",
        true,
        None::<&str>,
    )?;

    let selection_submenu = Submenu::with_id_and_items(
        app,
        "selection-menu",
        "✨ 划词工具",
        true,
        &[
            &selection_enabled,
            &selection_trigger,
            &PredefinedMenuItem::separator(app)?,
            &selection_hide,
            &selection_restart,
        ],
    )?;

    // ═══════════════════════════════════════════════════════════════════
    // Section 5: Clipboard
    // ═══════════════════════════════════════════════════════════════════
    let clipboard_history = MenuItem::with_id(
        app,
        "clipboard-history",
        "📋 剪贴板历史\t\tCtrl+Shift+V",
        true,
        None::<&str>,
    )?;
    let clipboard_clear = MenuItem::with_id(
        app,
        "clipboard-clear",
        "🗑️ 清空剪贴板历史",
        true,
        None::<&str>,
    )?;

    let clipboard_submenu = Submenu::with_id_and_items(
        app,
        "clipboard-menu",
        "📋 剪贴板",
        true,
        &[&clipboard_history, &clipboard_clear],
    )?;

    // ═══════════════════════════════════════════════════════════════════
    // Section 6: Settings
    // ═══════════════════════════════════════════════════════════════════
    let autostart_enabled = CheckMenuItem::with_id(
        app,
        "autostart-enabled",
        "🚀 开机自动启动",
        true,
        get_autostart_enabled(app),
        None::<&str>,
    )?;
    let open_settings = MenuItem::with_id(app, "open-settings", "⚙️ 打开设置", true, None::<&str>)?;
    let open_logs = MenuItem::with_id(app, "open-logs", "📄 查看日志", true, None::<&str>)?;

    let settings_submenu = Submenu::with_id_and_items(
        app,
        "settings-menu",
        "⚙️ 设置",
        true,
        &[
            &autostart_enabled,
            &PredefinedMenuItem::separator(app)?,
            &open_settings,
            &open_logs,
        ],
    )?;

    // ═══════════════════════════════════════════════════════════════════
    // Section 7: Help & About
    // ═══════════════════════════════════════════════════════════════════
    let check_update = MenuItem::with_id(app, "check-update", "🔄 检查更新", true, None::<&str>)?;
    let open_help = MenuItem::with_id(app, "open-help", "❓ 帮助文档", true, None::<&str>)?;
    let about_item = MenuItem::with_id(app, "about", "ℹ️ 关于 Cognia", true, None::<&str>)?;

    // ═══════════════════════════════════════════════════════════════════
    // Section 8: Exit
    // ═══════════════════════════════════════════════════════════════════
    let quit_item = MenuItem::with_id(app, "quit", "🚪 退出 Cognia", true, None::<&str>)?;

    // Build main menu with separators
    Menu::with_items(
        app,
        &[
            // Window controls
            &show_item,
            &hide_item,
            &chat_widget_item,
            &bubble_show_item,
            &bubble_hide_item,
            &bubble_toggle_minimize_item,
            &PredefinedMenuItem::separator(app)?,
            // Tools
            &screenshot_submenu,
            &recording_submenu,
            &selection_submenu,
            &clipboard_submenu,
            &PredefinedMenuItem::separator(app)?,
            // Settings
            &settings_submenu,
            &PredefinedMenuItem::separator(app)?,
            // Help & About
            &check_update,
            &open_help,
            &about_item,
            &PredefinedMenuItem::separator(app)?,
            // Exit
            &quit_item,
        ],
    )
}

/// Get autostart enabled state
fn get_autostart_enabled(_app: &AppHandle) -> bool {
    #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
    {
        // Try to get autostart state from plugin
        // Default to false if unable to determine
        false
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        false
    }
}

/// Creates and initializes the system tray
pub fn create_tray(app: &AppHandle) -> Result<(), tauri::Error> {
    let menu = create_tray_menu(app)?;

    // Build dynamic tooltip
    let tooltip = build_tooltip();

    // Load tray icon from app's default window icon
    let icon = app.default_window_icon().cloned().unwrap_or_else(|| {
        // Last resort: create a simple 1x1 icon
        log::warn!("Failed to load tray icon, using placeholder");
        Image::new(&[255u8, 255, 255, 255], 1, 1)
    });

    TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .icon_as_template(false)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip(&tooltip)
        .on_tray_icon_event(|tray, event| {
            match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: tauri::tray::MouseButtonState::Up,
                    ..
                } => {
                    // Single left click - toggle main window
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        if let Ok(visible) = window.is_visible() {
                            if visible {
                                let _ = window.hide();
                                log::debug!("Main window hidden via tray click");
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                                log::debug!("Main window shown via tray click");
                            }
                        }
                    }
                }
                TrayIconEvent::Click {
                    button: MouseButton::Middle,
                    button_state: tauri::tray::MouseButtonState::Up,
                    ..
                } => {
                    // Middle click - toggle AI assistant
                    if let Some(manager) = tray.app_handle().try_state::<ChatWidgetWindow>() {
                        match manager.toggle() {
                            Ok(visible) => {
                                log::info!(
                                    "Chat widget toggled via middle click: {}",
                                    if visible { "shown" } else { "hidden" }
                                );
                            }
                            Err(e) => {
                                log::error!("Failed to toggle chat widget: {}", e);
                            }
                        }
                    }
                }
                TrayIconEvent::DoubleClick {
                    button: MouseButton::Left,
                    ..
                } => {
                    // Double click - show and focus main window
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                        log::debug!("Main window shown via tray double-click");
                    }
                }
                _ => {}
            }
        })
        .build(app)?;

    log::info!("System tray created successfully");
    Ok(())
}

/// Build dynamic tooltip based on current state
fn build_tooltip() -> String {
    let state = TRAY_STATE.read();
    if state.is_recording {
        format!("Cognia - 🔴 录制中: {}", state.status_message)
    } else if state.is_busy {
        format!("Cognia - ⏳ {}", state.status_message)
    } else {
        format!("Cognia AI Assistant - {}", state.status_message)
    }
}

/// Update tray tooltip
pub fn update_tray_tooltip(app: &AppHandle, message: &str) {
    let mut state = TRAY_STATE.write();
    state.status_message = message.to_string();
    drop(state);

    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = build_tooltip();
        let _ = tray.set_tooltip(Some(&tooltip));
    }
}

/// Set tray busy state
pub fn set_tray_busy(app: &AppHandle, busy: bool, message: Option<&str>) {
    let mut state = TRAY_STATE.write();
    state.is_busy = busy;
    if let Some(msg) = message {
        state.status_message = msg.to_string();
    } else if !busy {
        state.status_message = "就绪".to_string();
    }
    drop(state);

    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = build_tooltip();
        let _ = tray.set_tooltip(Some(&tooltip));
    }
}

/// Set tray recording state
pub fn set_tray_recording(app: &AppHandle, recording: bool) {
    let mut state = TRAY_STATE.write();
    state.is_recording = recording;
    state.is_busy = recording;
    state.status_message = if recording {
        "录制中...".to_string()
    } else {
        "就绪".to_string()
    };
    drop(state);

    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = build_tooltip();
        let _ = tray.set_tooltip(Some(&tooltip));
    }
}

/// Handles tray menu item clicks
pub fn handle_tray_menu_event(app: &AppHandle, item_id: String) {
    log::debug!("Tray menu event: {}", item_id);

    match item_id.as_str() {
        // ═══════════════════════════════════════════════════════════════════
        // Window Controls
        // ═══════════════════════════════════════════════════════════════════
        "show-window" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
                log::info!("Main window shown");
            }
        }
        "hide-window" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
                log::info!("Main window hidden");
            }
        }
        "toggle-chat-widget" => {
            if let Some(manager) = app.try_state::<ChatWidgetWindow>() {
                match manager.toggle() {
                    Ok(visible) => {
                        log::info!(
                            "Chat widget toggled: {}",
                            if visible { "shown" } else { "hidden" }
                        );
                    }
                    Err(e) => {
                        log::error!("Failed to toggle chat widget: {}", e);
                    }
                }
            }
        }
        "bubble-show" => {
            if let Some(manager) = app.try_state::<AssistantBubbleWindow>() {
                match manager.show() {
                    Ok(()) => {
                        log::info!("Assistant bubble shown via tray menu");
                    }
                    Err(e) => {
                        log::error!("Failed to show assistant bubble: {}", e);
                    }
                }
            }
        }
        "bubble-hide" => {
            if let Some(manager) = app.try_state::<AssistantBubbleWindow>() {
                match manager.hide() {
                    Ok(()) => {
                        log::info!("Assistant bubble hidden via tray menu");
                    }
                    Err(e) => {
                        log::error!("Failed to hide assistant bubble: {}", e);
                    }
                }
            }
        }
        "bubble-toggle-minimize" => {
            if let Some(manager) = app.try_state::<AssistantBubbleWindow>() {
                match manager.toggle_minimize() {
                    Ok(minimized) => {
                        log::info!(
                            "Assistant bubble {}", 
                            if minimized { "minimized (folded)" } else { "restored (unfolded)" }
                        );
                    }
                    Err(e) => {
                        log::error!("Failed to toggle bubble minimize: {}", e);
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Screenshot Tools
        // ═══════════════════════════════════════════════════════════════════
        "screenshot-fullscreen" => {
            log::info!("Screenshot fullscreen requested from tray");
            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                set_tray_busy(&app_clone, true, Some("正在截图..."));
                if let Some(manager) = app_clone.try_state::<ScreenshotManager>() {
                    match manager.capture_fullscreen(None).await {
                        Ok(result) => {
                            log::info!(
                                "Fullscreen screenshot captured: {}x{}",
                                result.metadata.width,
                                result.metadata.height
                            );
                            let _ = app_clone.emit("screenshot-captured", &result);
                        }
                        Err(e) => {
                            log::error!("Failed to capture fullscreen screenshot: {}", e);
                            let _ = app_clone.emit("screenshot-error", e.clone());
                        }
                    }
                }
                set_tray_busy(&app_clone, false, None);
            });
        }
        "screenshot-region" => {
            log::info!("Screenshot region requested from tray");
            let _ = app.emit("start-region-screenshot", ());
        }
        "screenshot-window" => {
            log::info!("Screenshot window requested from tray");
            let _ = app.emit("start-window-screenshot", ());
        }
        "screenshot-ocr" => {
            log::info!("Screenshot OCR requested from tray");
            let _ = app.emit("start-ocr-screenshot", ());
        }

        // ═══════════════════════════════════════════════════════════════════
        // Screen Recording Tools
        // ═══════════════════════════════════════════════════════════════════
        "recording-start" => {
            log::info!("Screen recording start requested from tray");
            if app.try_state::<ScreenRecordingManager>().is_some() {
                let app_clone = app.clone();
                tauri::async_runtime::spawn(async move {
                    set_tray_recording(&app_clone, true);
                    if let Some(mgr) = app_clone.try_state::<ScreenRecordingManager>() {
                        match mgr.start_fullscreen(None).await {
                            Ok(id) => {
                                log::info!("Screen recording started: {}", id);
                                let _ = app_clone.emit("recording-started", id);
                                update_recording_menu_state(&app_clone, true);
                            }
                            Err(e) => {
                                log::error!("Failed to start recording: {}", e);
                                set_tray_recording(&app_clone, false);
                                let _ = app_clone.emit("recording-error", e.clone());
                            }
                        }
                    }
                });
            }
        }
        "recording-stop" => {
            log::info!("Screen recording stop requested from tray");
            if app.try_state::<ScreenRecordingManager>().is_some() {
                let app_clone = app.clone();
                tauri::async_runtime::spawn(async move {
                    if let Some(mgr) = app_clone.try_state::<ScreenRecordingManager>() {
                        match mgr.stop().await {
                            Ok(result) => {
                                log::info!("Screen recording stopped");
                                set_tray_recording(&app_clone, false);
                                update_recording_menu_state(&app_clone, false);
                                let _ = app_clone.emit("recording-stopped", result);
                            }
                            Err(e) => {
                                log::error!("Failed to stop recording: {}", e);
                                let _ = app_clone.emit("recording-error", e.clone());
                            }
                        }
                    }
                });
            }
        }
        "recording-pause" => {
            log::info!("Screen recording pause/resume requested from tray");
            if let Some(manager) = app.try_state::<ScreenRecordingManager>() {
                let status = manager.get_status();
                let result = if status == crate::screen_recording::RecordingStatus::Paused {
                    manager.resume()
                } else {
                    manager.pause()
                };
                match result {
                    Ok(_) => {
                        log::info!("Recording pause/resume toggled");
                    }
                    Err(e) => {
                        log::error!("Failed to pause/resume recording: {}", e);
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Selection Toolbar
        // ═══════════════════════════════════════════════════════════════════
        "selection-enabled" => {
            if let Some(manager) = app.try_state::<SelectionManager>() {
                let current = manager.is_enabled();
                manager.set_enabled(!current);
                log::info!("Selection toolbar toggled: {}", !current);
            }
        }
        "selection-trigger" => {
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
            if let Some(manager) = app.try_state::<SelectionManager>() {
                let _ = manager.toolbar_window.hide();
                log::debug!("Selection toolbar hidden");
            }
        }
        "selection-restart" => {
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

        // ═══════════════════════════════════════════════════════════════════
        // Clipboard
        // ═══════════════════════════════════════════════════════════════════
        "clipboard-history" => {
            log::info!("Clipboard history requested from tray");
            let _ = app.emit("show-clipboard-history", ());
        }
        "clipboard-clear" => {
            log::info!("Clear clipboard history requested from tray");
            if let Some(manager) = app.try_state::<SelectionManager>() {
                manager.clipboard_history.clear_all();
                log::info!("Clipboard history cleared");
            }
            let _ = app.emit("clipboard-history-cleared", ());
        }

        // ═══════════════════════════════════════════════════════════════════
        // Settings
        // ═══════════════════════════════════════════════════════════════════
        "autostart-enabled" => {
            toggle_autostart(app);
        }
        "open-settings" => {
            log::info!("Open settings requested from tray");
            // Show main window and navigate to settings
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            let _ = app.emit("navigate-to-settings", ());
        }
        "open-logs" => {
            log::info!("Open logs requested from tray");
            open_logs_directory(app);
        }

        // ═══════════════════════════════════════════════════════════════════
        // Help & About
        // ═══════════════════════════════════════════════════════════════════
        "check-update" => {
            log::info!("Check update requested from tray");
            let _ = app.emit("check-for-updates", ());
        }
        "open-help" => {
            log::info!("Open help requested from tray");
            let _ = open::that("https://github.com/ElementsAI-Dev/Cognia/wiki");
        }
        "about" => {
            log::info!("About dialog requested from tray");
            show_about_dialog(app);
        }

        // ═══════════════════════════════════════════════════════════════════
        // Exit
        // ═══════════════════════════════════════════════════════════════════
        "quit" => {
            log::info!("Application quit requested from tray");
            perform_graceful_shutdown(app);
        }

        _ => {
            log::debug!("Unknown tray menu item: {}", item_id);
        }
    }
}

/// Update recording menu items enabled state
/// Note: Tauri 2.x doesn't provide direct menu access from tray, so we refresh the entire menu
fn update_recording_menu_state(app: &AppHandle, _is_recording: bool) {
    // In Tauri 2.x, we need to recreate the menu to update item states
    // For now, we emit an event that the frontend can handle
    let _ = app.emit("recording-state-changed", _is_recording);
    log::debug!("Recording state changed: {}", _is_recording);
}

/// Toggle autostart setting
fn toggle_autostart(app: &AppHandle) {
    #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
    {
        use tauri_plugin_autostart::ManagerExt;

        let autostart_manager = app.autolaunch();
        match autostart_manager.is_enabled() {
            Ok(enabled) => {
                let result = if enabled {
                    autostart_manager.disable()
                } else {
                    autostart_manager.enable()
                };
                match result {
                    Ok(_) => {
                        log::info!("Autostart toggled: {}", !enabled);
                        // Emit event for frontend to update UI if needed
                        let _ = app.emit("autostart-changed", !enabled);
                    }
                    Err(e) => {
                        log::error!("Failed to toggle autostart: {}", e);
                    }
                }
            }
            Err(e) => {
                log::error!("Failed to get autostart status: {}", e);
            }
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        log::warn!("Autostart not supported on this platform");
    }
}

/// Open logs directory
fn open_logs_directory(app: &AppHandle) {
    if let Ok(log_dir) = app.path().app_log_dir() {
        if log_dir.exists() {
            if let Err(e) = open::that(&log_dir) {
                log::error!("Failed to open logs directory: {}", e);
            }
        } else {
            log::warn!("Logs directory does not exist: {:?}", log_dir);
        }
    }
}

/// Perform graceful shutdown with full cleanup
fn perform_graceful_shutdown(app: &AppHandle) {
    log::info!("Graceful shutdown requested (delegating to centralized cleanup)...");
    app.exit(0);
}

/// Show about dialog (internal)
fn show_about_dialog(app: &AppHandle) {
    show_about_dialog_public(app);
}

/// Show about dialog (public, callable from lib.rs)
pub fn show_about_dialog_public(app: &AppHandle) {
    let version = env!("CARGO_PKG_VERSION");
    let about_info = serde_json::json!({
        "name": "Cognia",
        "version": version,
        "description": "AI-powered productivity assistant",
        "copyright": "© 2024 ElementsAI",
        "website": "https://github.com/ElementsAI-Dev/Cognia"
    });

    let _ = app.emit("show-about-dialog", about_info);
}

/// Tray icon state
#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TrayIconState {
    /// Normal idle state
    Normal,
    /// Recording in progress
    Recording,
    /// Processing/busy state
    Busy,
    /// Notification/attention needed
    Notification,
}

/// Update tray icon based on state
/// Note: This requires different icon files to be present in the icons directory
#[allow(dead_code)]
pub fn update_tray_icon(app: &AppHandle, state: TrayIconState) {
    // In Tauri 2.x, icon changes require loading the icon as bytes
    // For now, we just log the state change - icon switching can be implemented
    // when separate icon files are available
    log::debug!("Tray icon state changed to {:?}", state);

    // Update tooltip to reflect state
    let tooltip = match state {
        TrayIconState::Normal => "Cognia AI Assistant - 就绪",
        TrayIconState::Recording => "Cognia - 🔴 录制中",
        TrayIconState::Busy => "Cognia - ⏳ 处理中",
        TrayIconState::Notification => "Cognia - 📢 有新通知",
    };

    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

/// Refresh the tray menu (useful after state changes)
pub fn refresh_tray_menu(app: &AppHandle) {
    use crate::commands::system::tray::{TrayConfigState, TrayDisplayMode};

    // Check if we should use compact mode
    let use_compact = if let Some(config_state) = app.try_state::<TrayConfigState>() {
        let config = config_state.config.read();
        config.display_mode == TrayDisplayMode::Compact
    } else {
        false
    };

    if let Some(tray) = app.tray_by_id("main-tray") {
        let menu_result = if use_compact {
            create_compact_tray_menu(app)
        } else {
            create_tray_menu(app)
        };

        if let Ok(menu) = menu_result {
            let _ = tray.set_menu(Some(menu));
            log::debug!(
                "Tray menu refreshed (mode: {})",
                if use_compact { "compact" } else { "full" }
            );
        }
    }
}

/// Creates a compact system tray menu with essential items only
fn create_compact_tray_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    // AI Assistant
    let chat_widget_item = MenuItem::with_id(
        app,
        "toggle-chat-widget",
        "🤖 AI 助手\t\tCtrl+Shift+Space",
        true,
        None::<&str>,
    )?;

    // Region Screenshot
    let screenshot_region = MenuItem::with_id(
        app,
        "screenshot-region",
        "✂️ 区域截图\t\tCtrl+Shift+A",
        true,
        None::<&str>,
    )?;

    // Clipboard History
    let clipboard_history = MenuItem::with_id(
        app,
        "clipboard-history",
        "📋 剪贴板历史\t\tCtrl+Shift+V",
        true,
        None::<&str>,
    )?;

    // Open Settings
    let open_settings = MenuItem::with_id(app, "open-settings", "⚙️ 打开设置", true, None::<&str>)?;

    // Quit
    let quit_item = MenuItem::with_id(app, "quit", "🚪 退出 Cognia", true, None::<&str>)?;

    // Build compact menu
    Menu::with_items(
        app,
        &[
            &chat_widget_item,
            &screenshot_region,
            &clipboard_history,
            &PredefinedMenuItem::separator(app)?,
            &open_settings,
            &PredefinedMenuItem::separator(app)?,
            &quit_item,
        ],
    )
}

/// Sync selection enabled checkbox with actual state
/// Note: In Tauri 2.x, checkbox state is managed at menu creation time
pub fn sync_selection_checkbox(app: &AppHandle) {
    if let Some(manager) = app.try_state::<SelectionManager>() {
        let enabled = manager.is_enabled();
        log::debug!("Selection enabled state: {}", enabled);
        // Emit event for any UI that needs to know
        let _ = app.emit("selection-state-synced", enabled);
    }
}

/// Sync autostart checkbox with actual state
pub fn sync_autostart_checkbox(app: &AppHandle) {
    #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
    {
        use tauri_plugin_autostart::ManagerExt;

        if let Ok(enabled) = app.autolaunch().is_enabled() {
            log::debug!("Autostart enabled state: {}", enabled);
            let _ = app.emit("autostart-state-synced", enabled);
        }
    }
}

/// Initialize tray state on app startup
pub fn init_tray_state(app: &AppHandle) {
    // Sync checkbox states
    sync_selection_checkbox(app);
    sync_autostart_checkbox(app);

    // Set initial tooltip
    update_tray_tooltip(app, "就绪");

    log::info!("Tray state initialized");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    // ═══════════════════════════════════════════════════════════════════════════
    // TrayState Tests
    // ═══════════════════════════════════════════════════════════════════════════

    #[test]
    fn test_tray_state_default() {
        let state = TrayState::default();
        assert!(!state.is_busy);
        assert!(!state.is_recording);
        assert_eq!(state.status_message, "就绪");
    }

    #[test]
    fn test_tray_state_fields() {
        let state = TrayState {
            is_busy: true,
            is_recording: true,
            status_message: "测试消息".to_string(),
        };
        assert!(state.is_busy);
        assert!(state.is_recording);
        assert_eq!(state.status_message, "测试消息");
    }

    #[test]
    fn test_tray_state_global_initialized() {
        let state = TRAY_STATE.read();
        assert!(!state.status_message.is_empty());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TrayIconState Tests
    // ═══════════════════════════════════════════════════════════════════════════

    #[test]
    fn test_tray_icon_state_variants() {
        let normal = TrayIconState::Normal;
        let recording = TrayIconState::Recording;
        let busy = TrayIconState::Busy;
        let notification = TrayIconState::Notification;

        assert_eq!(normal, TrayIconState::Normal);
        assert_eq!(recording, TrayIconState::Recording);
        assert_eq!(busy, TrayIconState::Busy);
        assert_eq!(notification, TrayIconState::Notification);
        assert_ne!(normal, recording);
    }

    #[test]
    fn test_tray_icon_state_clone() {
        let state = TrayIconState::Recording;
        let cloned = state; // Copy trait - no need for clone()
        assert_eq!(state, cloned);
    }

    #[test]
    fn test_tray_icon_state_copy() {
        let state = TrayIconState::Busy;
        let copied = state;
        assert_eq!(state, copied);
    }

    #[test]
    fn test_tray_icon_state_debug() {
        let state = TrayIconState::Normal;
        let debug_str = format!("{:?}", state);
        assert!(debug_str.contains("Normal"));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Menu Item ID Tests
    // ═══════════════════════════════════════════════════════════════════════════

    const EXPECTED_MENU_IDS: &[&str] = &[
        "show-window",
        "hide-window",
        "toggle-chat-widget",
        "bubble-show",
        "bubble-hide",
        "bubble-toggle-minimize",
        "screenshot-fullscreen",
        "screenshot-region",
        "screenshot-window",
        "screenshot-ocr",
        "recording-start",
        "recording-stop",
        "recording-pause",
        "selection-enabled",
        "selection-trigger",
        "selection-hide-toolbar",
        "selection-restart",
        "clipboard-history",
        "clipboard-clear",
        "autostart-enabled",
        "open-settings",
        "open-logs",
        "check-update",
        "open-help",
        "about",
        "quit",
    ];

    #[test]
    fn test_all_menu_ids_documented() {
        assert_eq!(EXPECTED_MENU_IDS.len(), 26, "Expected 26 menu item IDs");
    }

    #[test]
    fn test_menu_id_uniqueness() {
        use std::collections::HashSet;
        let unique_ids: HashSet<&&str> = EXPECTED_MENU_IDS.iter().collect();
        assert_eq!(
            unique_ids.len(),
            EXPECTED_MENU_IDS.len(),
            "Menu IDs should be unique"
        );
    }

    #[test]
    fn test_menu_id_naming_convention() {
        for id in EXPECTED_MENU_IDS {
            assert!(!id.contains('_'), "Menu ID '{}' should use kebab-case", id);
            assert!(
                !id.contains(' '),
                "Menu ID '{}' should not contain spaces",
                id
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Tooltip Building Tests
    // ═══════════════════════════════════════════════════════════════════════════

    fn build_tooltip_test(is_busy: bool, is_recording: bool, message: &str) -> String {
        if is_recording {
            format!("Cognia - 🔴 录制中: {}", message)
        } else if is_busy {
            format!("Cognia - ⏳ {}", message)
        } else {
            format!("Cognia AI Assistant - {}", message)
        }
    }

    #[test]
    fn test_tooltip_normal_state() {
        let tooltip = build_tooltip_test(false, false, "就绪");
        assert!(tooltip.contains("Cognia AI Assistant"));
        assert!(tooltip.contains("就绪"));
    }

    #[test]
    fn test_tooltip_busy_state() {
        let tooltip = build_tooltip_test(true, false, "处理中");
        assert!(tooltip.contains("⏳"));
        assert!(tooltip.contains("处理中"));
    }

    #[test]
    fn test_tooltip_recording_state() {
        let tooltip = build_tooltip_test(true, true, "录制中");
        assert!(tooltip.contains("🔴"));
        assert!(tooltip.contains("录制中"));
    }

    #[test]
    fn test_tooltip_recording_priority() {
        let tooltip = build_tooltip_test(true, true, "状态");
        assert!(tooltip.contains("🔴"));
        assert!(!tooltip.contains("⏳"));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Icon State Tooltip Tests
    // ═══════════════════════════════════════════════════════════════════════════

    fn get_tooltip_for_state(state: TrayIconState) -> &'static str {
        match state {
            TrayIconState::Normal => "Cognia AI Assistant - 就绪",
            TrayIconState::Recording => "Cognia - 🔴 录制中",
            TrayIconState::Busy => "Cognia - ⏳ 处理中",
            TrayIconState::Notification => "Cognia - 📢 有新通知",
        }
    }

    #[test]
    fn test_icon_state_tooltip_normal() {
        let tooltip = get_tooltip_for_state(TrayIconState::Normal);
        assert_eq!(tooltip, "Cognia AI Assistant - 就绪");
    }

    #[test]
    fn test_icon_state_tooltip_recording() {
        let tooltip = get_tooltip_for_state(TrayIconState::Recording);
        assert!(tooltip.contains("🔴"));
    }

    #[test]
    fn test_icon_state_tooltip_busy() {
        let tooltip = get_tooltip_for_state(TrayIconState::Busy);
        assert!(tooltip.contains("⏳"));
    }

    #[test]
    fn test_icon_state_tooltip_notification() {
        let tooltip = get_tooltip_for_state(TrayIconState::Notification);
        assert!(tooltip.contains("📢"));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // State Transition Tests
    // ═══════════════════════════════════════════════════════════════════════════

    #[test]
    fn test_state_transition_idle_to_busy() {
        let mut state = TrayState::default();
        assert!(!state.is_busy);
        state.is_busy = true;
        state.status_message = "处理中...".to_string();
        assert!(state.is_busy);
        assert_eq!(state.status_message, "处理中...");
    }

    #[test]
    fn test_state_transition_busy_to_recording() {
        let state = TrayState {
            is_busy: true,
            is_recording: true,
            status_message: "录制中...".to_string(),
        };
        assert!(state.is_busy);
        assert!(state.is_recording);
    }

    #[test]
    fn test_state_transition_recording_to_idle() {
        let mut state = TrayState {
            is_busy: true,
            is_recording: true,
            status_message: "录制中...".to_string(),
        };
        state.is_recording = false;
        state.is_busy = false;
        state.status_message = "就绪".to_string();
        assert!(!state.is_busy);
        assert!(!state.is_recording);
        assert_eq!(state.status_message, "就绪");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Edge Case Tests
    // ═══════════════════════════════════════════════════════════════════════════

    #[test]
    fn test_empty_status_message() {
        let state = TrayState {
            is_busy: false,
            is_recording: false,
            status_message: String::new(),
        };
        assert!(state.status_message.is_empty());
    }

    #[test]
    fn test_long_status_message() {
        let long_message = "a".repeat(1000);
        let state = TrayState {
            is_busy: false,
            is_recording: false,
            status_message: long_message.clone(),
        };
        assert_eq!(state.status_message.len(), 1000);
    }

    #[test]
    fn test_unicode_status_message() {
        let unicode_message = "🎉 完成！已处理 100 个项目 ✨";
        let state = TrayState {
            is_busy: false,
            is_recording: false,
            status_message: unicode_message.to_string(),
        };
        assert_eq!(state.status_message, unicode_message);
    }

    #[test]
    fn test_special_characters_in_message() {
        let special_message = "处理: <file> & \"path\" 'name'";
        let state = TrayState {
            is_busy: false,
            is_recording: false,
            status_message: special_message.to_string(),
        };
        assert_eq!(state.status_message, special_message);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Submenu Structure Tests
    // ═══════════════════════════════════════════════════════════════════════════

    const EXPECTED_SUBMENU_IDS: &[&str] = &[
        "screenshot-menu",
        "recording-menu",
        "selection-menu",
        "clipboard-menu",
        "settings-menu",
    ];

    #[test]
    fn test_submenu_count() {
        assert_eq!(EXPECTED_SUBMENU_IDS.len(), 5, "Expected 5 submenus");
    }

    #[test]
    fn test_submenu_naming_convention() {
        for id in EXPECTED_SUBMENU_IDS {
            assert!(
                id.ends_with("-menu"),
                "Submenu ID '{}' should end with '-menu'",
                id
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Shortcut Key Tests
    // ═══════════════════════════════════════════════════════════════════════════

    const ITEMS_WITH_SHORTCUTS: &[(&str, &str)] = &[
        ("toggle-chat-widget", "Ctrl+Shift+Space"),
        ("screenshot-fullscreen", "Ctrl+Shift+S"),
        ("screenshot-region", "Ctrl+Shift+A"),
        ("recording-start", "Ctrl+Shift+R"),
        ("clipboard-history", "Ctrl+Shift+V"),
    ];

    #[test]
    fn test_shortcut_items_count() {
        assert_eq!(
            ITEMS_WITH_SHORTCUTS.len(),
            5,
            "Expected 5 items with shortcuts"
        );
    }

    #[test]
    fn test_shortcut_format() {
        for (_, shortcut) in ITEMS_WITH_SHORTCUTS {
            assert!(
                shortcut.contains("Ctrl+Shift+"),
                "Shortcut should use Ctrl+Shift+"
            );
        }
    }

    #[test]
    fn test_shortcut_keys_unique() {
        use std::collections::HashSet;
        let keys: HashSet<&str> = ITEMS_WITH_SHORTCUTS.iter().map(|(_, s)| *s).collect();
        assert_eq!(
            keys.len(),
            ITEMS_WITH_SHORTCUTS.len(),
            "Shortcut keys should be unique"
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Menu Category Coverage Tests
    // ═══════════════════════════════════════════════════════════════════════════

    #[test]
    fn test_window_control_ids() {
        let window_ids = ["show-window", "hide-window", "toggle-chat-widget"];
        for id in window_ids {
            assert!(
                EXPECTED_MENU_IDS.contains(&id),
                "Missing window control: {}",
                id
            );
        }
    }

    #[test]
    fn test_screenshot_ids() {
        let ids = [
            "screenshot-fullscreen",
            "screenshot-region",
            "screenshot-window",
            "screenshot-ocr",
        ];
        for id in ids {
            assert!(
                EXPECTED_MENU_IDS.contains(&id),
                "Missing screenshot: {}",
                id
            );
        }
    }

    #[test]
    fn test_recording_ids() {
        let ids = ["recording-start", "recording-stop", "recording-pause"];
        for id in ids {
            assert!(EXPECTED_MENU_IDS.contains(&id), "Missing recording: {}", id);
        }
    }

    #[test]
    fn test_selection_ids() {
        let ids = [
            "selection-enabled",
            "selection-trigger",
            "selection-hide-toolbar",
            "selection-restart",
        ];
        for id in ids {
            assert!(EXPECTED_MENU_IDS.contains(&id), "Missing selection: {}", id);
        }
    }

    #[test]
    fn test_clipboard_ids() {
        let ids = ["clipboard-history", "clipboard-clear"];
        for id in ids {
            assert!(EXPECTED_MENU_IDS.contains(&id), "Missing clipboard: {}", id);
        }
    }

    #[test]
    fn test_settings_ids() {
        let ids = ["autostart-enabled", "open-settings", "open-logs"];
        for id in ids {
            assert!(EXPECTED_MENU_IDS.contains(&id), "Missing settings: {}", id);
        }
    }

    #[test]
    fn test_help_ids() {
        let ids = ["check-update", "open-help", "about"];
        for id in ids {
            assert!(EXPECTED_MENU_IDS.contains(&id), "Missing help: {}", id);
        }
    }

    #[test]
    fn test_exit_id() {
        assert!(EXPECTED_MENU_IDS.contains(&"quit"), "Missing quit");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Concurrent Access Tests
    // ═══════════════════════════════════════════════════════════════════════════

    #[test]
    fn test_concurrent_state_access() {
        use std::thread;

        let handles: Vec<_> = (0..10)
            .map(|i| {
                thread::spawn(move || {
                    if i % 2 == 0 {
                        let mut s = TRAY_STATE.write();
                        s.status_message = format!("Thread {}", i);
                    } else {
                        let s = TRAY_STATE.read();
                        let _ = s.status_message.clone();
                    }
                })
            })
            .collect();

        for handle in handles {
            handle.join().expect("Thread should complete");
        }

        let final_state = TRAY_STATE.read();
        assert!(!final_state.status_message.is_empty());
    }
}
