//! Window information gathering
//!
//! Provides functionality to get information about windows on the system.

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
        Self {
            #[cfg(target_os = "windows")]
            _marker: std::marker::PhantomData,
        }
    }

    /// Get information about the currently active (foreground) window
    #[cfg(target_os = "windows")]
    pub fn get_active_window(&self) -> Result<WindowInfo, String> {
        use windows::Win32::Foundation::{HWND, RECT, MAX_PATH};
        use windows::Win32::UI::WindowsAndMessaging::{
            GetForegroundWindow, GetWindowTextW, GetClassNameW, GetWindowRect,
            IsIconic, IsZoomed, IsWindowVisible,
        };
        use windows::Win32::System::Threading::{
            OpenProcess, GetProcessId, QueryFullProcessImageNameW,
            PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_NAME_WIN32,
        };

        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.0.is_null() {
                return Err("No foreground window".to_string());
            }

            self.get_window_info(hwnd)
        }
    }

    #[cfg(target_os = "windows")]
    fn get_window_info(&self, hwnd: windows::Win32::Foundation::HWND) -> Result<WindowInfo, String> {
        use windows::Win32::Foundation::{RECT, MAX_PATH, CloseHandle};
        use windows::Win32::UI::WindowsAndMessaging::{
            GetWindowTextW, GetClassNameW, GetWindowRect,
            IsIconic, IsZoomed, IsWindowVisible, GetWindowThreadProcessId,
        };
        use windows::Win32::System::Threading::{
            OpenProcess, QueryFullProcessImageNameW,
            PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_NAME_WIN32,
        };

        unsafe {
            // Get window title
            let mut title_buf = [0u16; 512];
            let title_len = GetWindowTextW(hwnd, &mut title_buf);
            let title = String::from_utf16_lossy(&title_buf[..title_len as usize]);

            // Get class name
            let mut class_buf = [0u16; 256];
            let class_len = GetClassNameW(hwnd, &mut class_buf);
            let class_name = String::from_utf16_lossy(&class_buf[..class_len as usize]);

            // Get process ID
            let mut process_id: u32 = 0;
            GetWindowThreadProcessId(hwnd, Some(&mut process_id));

            // Get process name and path
            let (process_name, exe_path) = self.get_process_info(process_id);

            // Get window rect
            let mut rect = RECT::default();
            let _ = GetWindowRect(hwnd, &mut rect);

            // Get window state
            let is_minimized = IsIconic(hwnd).as_bool();
            let is_maximized = IsZoomed(hwnd).as_bool();
            let is_visible = IsWindowVisible(hwnd).as_bool();

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
            OpenProcess, QueryFullProcessImageNameW,
            PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_NAME_WIN32,
        };

        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id);
            if let Ok(handle) = handle {
                let mut path_buf = [0u16; MAX_PATH as usize];
                let mut size = path_buf.len() as u32;
                
                if QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, windows::core::PWSTR(path_buf.as_mut_ptr()), &mut size).is_ok() {
                    let path = String::from_utf16_lossy(&path_buf[..size as usize]);
                    let name = std::path::Path::new(&path)
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();
                    
                    let _ = CloseHandle(handle);
                    return (name, Some(path));
                }
                let _ = CloseHandle(handle);
            }
            
            ("Unknown".to_string(), None)
        }
    }

    /// Get all visible windows
    #[cfg(target_os = "windows")]
    pub fn get_all_windows(&self) -> Result<Vec<WindowInfo>, String> {
        use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
        use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, IsWindowVisible, GetWindowTextLengthW};

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
            let _ = EnumWindows(
                Some(enum_callback),
                LPARAM(&mut windows as *mut _ as isize),
            );
        }

        Ok(windows)
    }

    /// Find windows by title (partial match)
    #[cfg(target_os = "windows")]
    pub fn find_windows_by_title(&self, title_pattern: &str) -> Result<Vec<WindowInfo>, String> {
        let all_windows = self.get_all_windows()?;
        let pattern = title_pattern.to_lowercase();
        
        Ok(all_windows
            .into_iter()
            .filter(|w| w.title.to_lowercase().contains(&pattern))
            .collect())
    }

    /// Find windows by process name
    #[cfg(target_os = "windows")]
    pub fn find_windows_by_process(&self, process_name: &str) -> Result<Vec<WindowInfo>, String> {
        let all_windows = self.get_all_windows()?;
        let name = process_name.to_lowercase();
        
        Ok(all_windows
            .into_iter()
            .filter(|w| w.process_name.to_lowercase().contains(&name))
            .collect())
    }

    // Non-Windows implementations
    #[cfg(not(target_os = "windows"))]
    pub fn get_active_window(&self) -> Result<WindowInfo, String> {
        Err("Window info not available on this platform".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn get_all_windows(&self) -> Result<Vec<WindowInfo>, String> {
        Ok(Vec::new())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn find_windows_by_title(&self, _title_pattern: &str) -> Result<Vec<WindowInfo>, String> {
        Ok(Vec::new())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn find_windows_by_process(&self, _process_name: &str) -> Result<Vec<WindowInfo>, String> {
        Ok(Vec::new())
    }
}

impl Default for WindowManager {
    fn default() -> Self {
        Self::new()
    }
}
