//! Window information gathering
//!
//! Provides functionality to get information about windows on the system.

use log::{debug, trace, warn};
use serde::{Deserialize, Serialize};

/// Information about a window
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowInfo {
    /// Window handle (platform-specific)
    pub handle: u64,
    /// Window title
    pub title: String,
    /// Window class name
    pub class_name: String,
    /// Process ID
    pub process_id: u32,
    /// Process name
    pub process_name: String,
    /// Executable path
    pub exe_path: Option<String>,
    /// Window position
    pub x: i32,
    pub y: i32,
    /// Window size
    pub width: u32,
    pub height: u32,
    /// Whether the window is minimized
    pub is_minimized: bool,
    /// Whether the window is maximized
    pub is_maximized: bool,
    /// Whether the window is focused
    pub is_focused: bool,
    /// Whether the window is visible
    pub is_visible: bool,
}

/// Window manager for querying window information
pub struct WindowManager {
    #[cfg(target_os = "windows")]
    _marker: std::marker::PhantomData<()>,
}

impl WindowManager {
    pub fn new() -> Self {
        trace!("Creating new WindowManager");
        Self {
            #[cfg(target_os = "windows")]
            _marker: std::marker::PhantomData,
        }
    }

    /// Get information about the currently active (foreground) window
    #[cfg(target_os = "windows")]
    pub fn get_active_window(&self) -> Result<WindowInfo, String> {
        use windows::Win32::Foundation::{HWND, MAX_PATH, RECT};
        use windows::Win32::System::Threading::{
            GetProcessId, OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
            PROCESS_QUERY_LIMITED_INFORMATION,
        };
        use windows::Win32::UI::WindowsAndMessaging::{
            GetClassNameW, GetForegroundWindow, GetWindowRect, GetWindowTextW, IsIconic,
            IsWindowVisible, IsZoomed,
        };

        trace!("Getting active (foreground) window");
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.0.is_null() {
                debug!("No foreground window found");
                return Err("No foreground window".to_string());
            }
            trace!("Foreground window handle: {:?}", hwnd.0);

            self.get_window_info(hwnd)
        }
    }

    #[cfg(target_os = "windows")]
    fn get_window_info(
        &self,
        hwnd: windows::Win32::Foundation::HWND,
    ) -> Result<WindowInfo, String> {
        use windows::Win32::Foundation::{CloseHandle, MAX_PATH, RECT};
        use windows::Win32::System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
            PROCESS_QUERY_LIMITED_INFORMATION,
        };
        use windows::Win32::UI::WindowsAndMessaging::{
            GetClassNameW, GetWindowRect, GetWindowTextW, GetWindowThreadProcessId, IsIconic,
            IsWindowVisible, IsZoomed,
        };

        trace!("Getting window info for handle: {:?}", hwnd.0);
        unsafe {
            // Get window title
            let mut title_buf = [0u16; 512];
            let title_len = GetWindowTextW(hwnd, &mut title_buf);
            let title = String::from_utf16_lossy(&title_buf[..title_len as usize]);
            trace!("Window title: '{}'", title);

            // Get class name
            let mut class_buf = [0u16; 256];
            let class_len = GetClassNameW(hwnd, &mut class_buf);
            let class_name = String::from_utf16_lossy(&class_buf[..class_len as usize]);
            trace!("Window class: '{}'", class_name);

            // Get process ID
            let mut process_id: u32 = 0;
            GetWindowThreadProcessId(hwnd, Some(&mut process_id));
            trace!("Process ID: {}", process_id);

            // Get process name and path
            let (process_name, exe_path) = self.get_process_info(process_id);
            trace!("Process name: '{}', exe_path: {:?}", process_name, exe_path);

            // Get window rect
            let mut rect = RECT::default();
            let _ = GetWindowRect(hwnd, &mut rect);
            trace!(
                "Window rect: x={}, y={}, width={}, height={}",
                rect.left,
                rect.top,
                rect.right - rect.left,
                rect.bottom - rect.top
            );

            // Get window state
            let is_minimized = IsIconic(hwnd).as_bool();
            let is_maximized = IsZoomed(hwnd).as_bool();
            let is_visible = IsWindowVisible(hwnd).as_bool();
            trace!(
                "Window state: minimized={}, maximized={}, visible={}",
                is_minimized,
                is_maximized,
                is_visible
            );

            debug!(
                "Window info retrieved: '{}' ({}) [{}x{}] process={}",
                title,
                class_name,
                (rect.right - rect.left),
                (rect.bottom - rect.top),
                process_name
            );

            Ok(WindowInfo {
                handle: hwnd.0 as u64,
                title,
                class_name,
                process_id,
                process_name,
                exe_path,
                x: rect.left,
                y: rect.top,
                width: (rect.right - rect.left) as u32,
                height: (rect.bottom - rect.top) as u32,
                is_minimized,
                is_maximized,
                is_focused: true, // This is the foreground window
                is_visible,
            })
        }
    }

    #[cfg(target_os = "windows")]
    fn get_process_info(&self, process_id: u32) -> (String, Option<String>) {
        use windows::Win32::Foundation::{CloseHandle, MAX_PATH};
        use windows::Win32::System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
            PROCESS_QUERY_LIMITED_INFORMATION,
        };

        trace!("Getting process info for PID: {}", process_id);
        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id);
            if let Ok(handle) = handle {
                let mut path_buf = [0u16; MAX_PATH as usize];
                let mut size = path_buf.len() as u32;

                if QueryFullProcessImageNameW(
                    handle,
                    PROCESS_NAME_WIN32,
                    windows::core::PWSTR(path_buf.as_mut_ptr()),
                    &mut size,
                )
                .is_ok()
                {
                    let path = String::from_utf16_lossy(&path_buf[..size as usize]);
                    let name = std::path::Path::new(&path)
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();

                    let _ = CloseHandle(handle);
                    trace!("Process info: name='{}', path='{}'", name, path);
                    return (name, Some(path));
                }
                let _ = CloseHandle(handle);
                warn!("Failed to query process image name for PID: {}", process_id);
            } else {
                warn!("Failed to open process for PID: {}", process_id);
            }

            debug!(
                "Could not get process info for PID: {}, returning 'Unknown'",
                process_id
            );
            ("Unknown".to_string(), None)
        }
    }

    /// Get all visible windows
    #[cfg(target_os = "windows")]
    pub fn get_all_windows(&self) -> Result<Vec<WindowInfo>, String> {
        use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
        use windows::Win32::UI::WindowsAndMessaging::{
            EnumWindows, GetWindowTextLengthW, IsWindowVisible,
        };

        debug!("Enumerating all visible windows");
        let mut windows = Vec::new();

        unsafe extern "system" fn enum_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
            let windows = &mut *(lparam.0 as *mut Vec<WindowInfo>);

            // Only include visible windows with titles
            if IsWindowVisible(hwnd).as_bool() && GetWindowTextLengthW(hwnd) > 0 {
                let manager = WindowManager::new();
                if let Ok(info) = manager.get_window_info(hwnd) {
                    windows.push(info);
                }
            }

            BOOL(1) // Continue enumeration
        }

        unsafe {
            let _ = EnumWindows(Some(enum_callback), LPARAM(&mut windows as *mut _ as isize));
        }

        debug!("Enumerated {} visible windows with titles", windows.len());
        Ok(windows)
    }

    /// Find windows by title (partial match)
    #[cfg(target_os = "windows")]
    pub fn find_windows_by_title(&self, title_pattern: &str) -> Result<Vec<WindowInfo>, String> {
        debug!("Finding windows by title pattern: '{}'", title_pattern);
        let all_windows = self.get_all_windows()?;
        let pattern = title_pattern.to_lowercase();

        let matched: Vec<WindowInfo> = all_windows
            .into_iter()
            .filter(|w| w.title.to_lowercase().contains(&pattern))
            .collect();

        debug!(
            "Found {} windows matching title pattern '{}'",
            matched.len(),
            title_pattern
        );
        for w in &matched {
            trace!("  - '{}' ({})", w.title, w.process_name);
        }
        Ok(matched)
    }

    /// Find windows by process name
    #[cfg(target_os = "windows")]
    pub fn find_windows_by_process(&self, process_name: &str) -> Result<Vec<WindowInfo>, String> {
        debug!("Finding windows by process name: '{}'", process_name);
        let all_windows = self.get_all_windows()?;
        let name = process_name.to_lowercase();

        let matched: Vec<WindowInfo> = all_windows
            .into_iter()
            .filter(|w| w.process_name.to_lowercase().contains(&name))
            .collect();

        debug!(
            "Found {} windows for process '{}'",
            matched.len(),
            process_name
        );
        for w in &matched {
            trace!("  - '{}' ({})", w.title, w.process_name);
        }
        Ok(matched)
    }

    // Non-Windows implementations
    #[cfg(not(target_os = "windows"))]
    pub fn get_active_window(&self) -> Result<WindowInfo, String> {
        debug!("get_active_window called on non-Windows platform");
        Err("Window info not available on this platform".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn get_all_windows(&self) -> Result<Vec<WindowInfo>, String> {
        debug!("get_all_windows called on non-Windows platform");
        Ok(Vec::new())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn find_windows_by_title(&self, _title_pattern: &str) -> Result<Vec<WindowInfo>, String> {
        debug!("find_windows_by_title called on non-Windows platform");
        Ok(Vec::new())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn find_windows_by_process(&self, _process_name: &str) -> Result<Vec<WindowInfo>, String> {
        debug!("find_windows_by_process called on non-Windows platform");
        Ok(Vec::new())
    }
}

impl Default for WindowManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // WindowInfo tests
    #[test]
    fn test_window_info_creation() {
        let window = WindowInfo {
            handle: 12345,
            title: "Test Window".to_string(),
            class_name: "TestClass".to_string(),
            process_id: 1234,
            process_name: "test.exe".to_string(),
            exe_path: Some("C:\\test.exe".to_string()),
            x: 100,
            y: 200,
            width: 800,
            height: 600,
            is_minimized: false,
            is_maximized: false,
            is_focused: true,
            is_visible: true,
        };

        assert_eq!(window.handle, 12345);
        assert_eq!(window.title, "Test Window");
        assert_eq!(window.class_name, "TestClass");
        assert_eq!(window.process_id, 1234);
        assert_eq!(window.process_name, "test.exe");
        assert_eq!(window.exe_path, Some("C:\\test.exe".to_string()));
        assert_eq!(window.x, 100);
        assert_eq!(window.y, 200);
        assert_eq!(window.width, 800);
        assert_eq!(window.height, 600);
        assert!(!window.is_minimized);
        assert!(!window.is_maximized);
        assert!(window.is_focused);
        assert!(window.is_visible);
    }

    #[test]
    fn test_window_info_without_exe_path() {
        let window = WindowInfo {
            handle: 1,
            title: "Window".to_string(),
            class_name: "Class".to_string(),
            process_id: 100,
            process_name: "proc.exe".to_string(),
            exe_path: None,
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            is_minimized: false,
            is_maximized: false,
            is_focused: false,
            is_visible: true,
        };

        assert!(window.exe_path.is_none());
    }

    #[test]
    fn test_window_info_minimized() {
        let window = WindowInfo {
            handle: 1,
            title: "Minimized".to_string(),
            class_name: "Class".to_string(),
            process_id: 100,
            process_name: "proc.exe".to_string(),
            exe_path: None,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            is_minimized: true,
            is_maximized: false,
            is_focused: false,
            is_visible: false,
        };

        assert!(window.is_minimized);
        assert!(!window.is_maximized);
        assert!(!window.is_visible);
    }

    #[test]
    fn test_window_info_maximized() {
        let window = WindowInfo {
            handle: 1,
            title: "Maximized".to_string(),
            class_name: "Class".to_string(),
            process_id: 100,
            process_name: "proc.exe".to_string(),
            exe_path: None,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            is_minimized: false,
            is_maximized: true,
            is_focused: true,
            is_visible: true,
        };

        assert!(!window.is_minimized);
        assert!(window.is_maximized);
    }

    #[test]
    fn test_window_info_serialization() {
        let window = WindowInfo {
            handle: 12345,
            title: "Test".to_string(),
            class_name: "Class".to_string(),
            process_id: 100,
            process_name: "test.exe".to_string(),
            exe_path: Some("C:\\test.exe".to_string()),
            x: 10,
            y: 20,
            width: 800,
            height: 600,
            is_minimized: false,
            is_maximized: true,
            is_focused: true,
            is_visible: true,
        };

        let json = serde_json::to_string(&window);
        assert!(json.is_ok());

        let parsed: WindowInfo = serde_json::from_str(&json.unwrap()).unwrap();
        assert_eq!(parsed.handle, 12345);
        assert_eq!(parsed.title, "Test");
        assert_eq!(parsed.width, 800);
        assert!(parsed.is_maximized);
    }

    #[test]
    fn test_window_info_deserialization() {
        let json = r#"{
            "handle": 99999,
            "title": "Deserialized Window",
            "class_name": "DeserClass",
            "process_id": 555,
            "process_name": "deser.exe",
            "exe_path": null,
            "x": 50,
            "y": 75,
            "width": 640,
            "height": 480,
            "is_minimized": true,
            "is_maximized": false,
            "is_focused": false,
            "is_visible": false
        }"#;

        let window: WindowInfo = serde_json::from_str(json).unwrap();
        assert_eq!(window.handle, 99999);
        assert_eq!(window.title, "Deserialized Window");
        assert_eq!(window.process_id, 555);
        assert!(window.exe_path.is_none());
        assert!(window.is_minimized);
    }

    #[test]
    fn test_window_info_clone() {
        let window = WindowInfo {
            handle: 1,
            title: "Original".to_string(),
            class_name: "Class".to_string(),
            process_id: 100,
            process_name: "proc.exe".to_string(),
            exe_path: Some("path".to_string()),
            x: 10,
            y: 20,
            width: 100,
            height: 200,
            is_minimized: false,
            is_maximized: false,
            is_focused: true,
            is_visible: true,
        };

        let cloned = window.clone();
        assert_eq!(cloned.handle, 1);
        assert_eq!(cloned.title, "Original");
        assert_eq!(cloned.exe_path, Some("path".to_string()));
    }

    #[test]
    fn test_window_info_debug() {
        let window = WindowInfo {
            handle: 1,
            title: "Debug".to_string(),
            class_name: "Class".to_string(),
            process_id: 100,
            process_name: "proc.exe".to_string(),
            exe_path: None,
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            is_minimized: false,
            is_maximized: false,
            is_focused: false,
            is_visible: true,
        };

        let debug_str = format!("{:?}", window);
        assert!(debug_str.contains("Debug"));
        assert!(debug_str.contains("WindowInfo"));
    }

    // WindowManager tests
    #[test]
    fn test_window_manager_new() {
        let manager = WindowManager::new();
        let _ = manager; // Just verify it can be created
    }

    #[test]
    fn test_window_manager_default() {
        let manager = WindowManager::default();
        let _ = manager;
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_get_active_window_non_windows() {
        let manager = WindowManager::new();
        let result = manager.get_active_window();
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Window info not available on this platform"
        );
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_get_all_windows_non_windows() {
        let manager = WindowManager::new();
        let result = manager.get_all_windows();
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_find_windows_by_title_non_windows() {
        let manager = WindowManager::new();
        let result = manager.find_windows_by_title("test");
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_find_windows_by_process_non_windows() {
        let manager = WindowManager::new();
        let result = manager.find_windows_by_process("test.exe");
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    // Edge case tests
    #[test]
    fn test_window_info_empty_strings() {
        let window = WindowInfo {
            handle: 0,
            title: String::new(),
            class_name: String::new(),
            process_id: 0,
            process_name: String::new(),
            exe_path: None,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            is_minimized: false,
            is_maximized: false,
            is_focused: false,
            is_visible: false,
        };

        assert!(window.title.is_empty());
        assert!(window.class_name.is_empty());
        assert!(window.process_name.is_empty());
    }

    #[test]
    fn test_window_info_negative_coordinates() {
        let window = WindowInfo {
            handle: 1,
            title: "Offscreen".to_string(),
            class_name: "Class".to_string(),
            process_id: 100,
            process_name: "proc.exe".to_string(),
            exe_path: None,
            x: -100,
            y: -50,
            width: 800,
            height: 600,
            is_minimized: false,
            is_maximized: false,
            is_focused: false,
            is_visible: true,
        };

        assert_eq!(window.x, -100);
        assert_eq!(window.y, -50);
    }

    #[test]
    fn test_window_info_large_dimensions() {
        let window = WindowInfo {
            handle: 1,
            title: "Large".to_string(),
            class_name: "Class".to_string(),
            process_id: 100,
            process_name: "proc.exe".to_string(),
            exe_path: None,
            x: 0,
            y: 0,
            width: 7680,  // 8K width
            height: 4320, // 8K height
            is_minimized: false,
            is_maximized: true,
            is_focused: true,
            is_visible: true,
        };

        assert_eq!(window.width, 7680);
        assert_eq!(window.height, 4320);
    }

    #[test]
    fn test_window_info_unicode_title() {
        let window = WindowInfo {
            handle: 1,
            title: "日本語タイトル - 中文标题 - 한국어".to_string(),
            class_name: "Class".to_string(),
            process_id: 100,
            process_name: "proc.exe".to_string(),
            exe_path: None,
            x: 0,
            y: 0,
            width: 800,
            height: 600,
            is_minimized: false,
            is_maximized: false,
            is_focused: true,
            is_visible: true,
        };

        assert!(window.title.contains("日本語"));
        assert!(window.title.contains("中文"));
        assert!(window.title.contains("한국어"));

        // Test serialization with unicode
        let json = serde_json::to_string(&window).unwrap();
        let parsed: WindowInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.title, window.title);
    }

    #[test]
    fn test_window_info_special_chars_in_path() {
        let window = WindowInfo {
            handle: 1,
            title: "Test".to_string(),
            class_name: "Class".to_string(),
            process_id: 100,
            process_name: "test app.exe".to_string(),
            exe_path: Some("C:\\Program Files (x86)\\Test App\\test app.exe".to_string()),
            x: 0,
            y: 0,
            width: 800,
            height: 600,
            is_minimized: false,
            is_maximized: false,
            is_focused: true,
            is_visible: true,
        };

        assert!(window
            .exe_path
            .as_ref()
            .unwrap()
            .contains("Program Files (x86)"));

        // Test serialization with special chars
        let json = serde_json::to_string(&window).unwrap();
        let parsed: WindowInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.exe_path, window.exe_path);
    }

    #[test]
    fn test_window_info_max_handle() {
        let window = WindowInfo {
            handle: u64::MAX,
            title: "Max Handle".to_string(),
            class_name: "Class".to_string(),
            process_id: u32::MAX,
            process_name: "proc.exe".to_string(),
            exe_path: None,
            x: i32::MAX,
            y: i32::MIN,
            width: u32::MAX,
            height: u32::MAX,
            is_minimized: false,
            is_maximized: false,
            is_focused: true,
            is_visible: true,
        };

        assert_eq!(window.handle, u64::MAX);
        assert_eq!(window.process_id, u32::MAX);

        // Test serialization with max values
        let json = serde_json::to_string(&window).unwrap();
        let parsed: WindowInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.handle, u64::MAX);
    }
}
