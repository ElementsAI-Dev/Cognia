//! Window management module
//!
//! Provides window enumeration, capture by HWND, and window snapping functionality.

use serde::{Deserialize, Serialize};

/// Information about a window
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowInfo {
    /// Window handle as integer (for cross-boundary serialization)
    pub hwnd: isize,
    /// Window title
    pub title: String,
    /// Process name/exe name
    pub process_name: String,
    /// Process ID
    pub pid: u32,
    /// Window position X
    pub x: i32,
    /// Window position Y
    pub y: i32,
    /// Window width
    pub width: u32,
    /// Window height: u32,
    pub height: u32,
    /// Is window minimized
    pub is_minimized: bool,
    /// Is window maximized
    pub is_maximized: bool,
    /// Is window visible
    pub is_visible: bool,
    /// Thumbnail as base64 PNG (small preview)
    pub thumbnail_base64: Option<String>,
}

/// Window snapping configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapConfig {
    /// Distance in pixels to trigger snapping
    pub snap_distance: i32,
    /// Enable snapping to screen edges
    pub snap_to_screen: bool,
    /// Enable snapping to other windows
    pub snap_to_windows: bool,
}

impl Default for SnapConfig {
    fn default() -> Self {
        Self {
            snap_distance: 20,
            snap_to_screen: true,
            snap_to_windows: true,
        }
    }
}

/// Snap result indicating where the window should snap to
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapResult {
    /// Snapped X position (None if no snap)
    pub x: Option<i32>,
    /// Snapped Y position (None if no snap)
    pub y: Option<i32>,
    /// Which edge snapped horizontally ("left", "right", "none")
    pub horizontal_edge: String,
    /// Which edge snapped vertically ("top", "bottom", "none")
    pub vertical_edge: String,
    /// Target window title (if snapping to a window)
    pub snap_target: Option<String>,
}

/// Window manager for enumeration and capture
pub struct WindowManager {
    snap_config: SnapConfig,
}

impl WindowManager {
    pub fn new() -> Self {
        Self {
            snap_config: SnapConfig::default(),
        }
    }

    pub fn with_snap_config(snap_config: SnapConfig) -> Self {
        Self { snap_config }
    }

    pub fn set_snap_config(&mut self, config: SnapConfig) {
        self.snap_config = config;
    }

    pub fn get_snap_config(&self) -> &SnapConfig {
        &self.snap_config
    }

    /// Get all visible windows
    #[cfg(target_os = "windows")]
    pub fn get_windows(&self) -> Vec<WindowInfo> {
        use std::ffi::OsString;
        use std::os::windows::ffi::OsStringExt;
        use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT};
        use windows::Win32::System::ProcessStatus::GetModuleBaseNameW;
        use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
        use windows::Win32::UI::WindowsAndMessaging::{
            EnumWindows, GetWindowInfo, GetWindowLongW, GetWindowRect, GetWindowTextLengthW,
            GetWindowTextW, GetWindowThreadProcessId, IsIconic, IsWindowVisible, IsZoomed,
            GWL_EXSTYLE, GWL_STYLE, WINDOWINFO, WS_EX_TOOLWINDOW, WS_VISIBLE,
        };

        let mut windows: Vec<WindowInfo> = Vec::new();

        unsafe extern "system" fn enum_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
            let windows = &mut *(lparam.0 as *mut Vec<WindowInfo>);

            // Check if window is visible
            if !IsWindowVisible(hwnd).as_bool() {
                return BOOL(1);
            }

            // Skip tool windows
            let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
            if (ex_style as u32 & WS_EX_TOOLWINDOW.0) != 0 {
                return BOOL(1);
            }

            // Get window title
            let title_len = GetWindowTextLengthW(hwnd);
            if title_len == 0 {
                return BOOL(1);
            }

            let mut title_buf = vec![0u16; (title_len + 1) as usize];
            let actual_len = GetWindowTextW(hwnd, &mut title_buf);
            if actual_len == 0 {
                return BOOL(1);
            }

            let title = String::from_utf16_lossy(&title_buf[..actual_len as usize]);

            // Skip empty titles
            if title.trim().is_empty() {
                return BOOL(1);
            }

            // Get window rect
            let mut rect = RECT::default();
            if GetWindowRect(hwnd, &mut rect).is_err() {
                return BOOL(1);
            }

            let width = (rect.right - rect.left) as u32;
            let height = (rect.bottom - rect.top) as u32;

            // Skip windows with zero size
            if width == 0 || height == 0 {
                return BOOL(1);
            }

            // Get process ID and name
            let mut pid: u32 = 0;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));

            let mut process_name = String::from("Unknown");
            if let Ok(process) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                let mut name_buf = [0u16; 260];
                let len = GetModuleBaseNameW(process, None, &mut name_buf);
                if len > 0 {
                    process_name = String::from_utf16_lossy(&name_buf[..len as usize]);
                }
                let _ = windows::Win32::Foundation::CloseHandle(process);
            }

            // Check window state
            let is_minimized = IsIconic(hwnd).as_bool();
            let is_maximized = IsZoomed(hwnd).as_bool();

            windows.push(WindowInfo {
                hwnd: hwnd.0 as isize,
                title,
                process_name,
                pid,
                x: rect.left,
                y: rect.top,
                width,
                height,
                is_minimized,
                is_maximized,
                is_visible: true,
                thumbnail_base64: None,
            });

            BOOL(1) // Continue enumeration
        }

        unsafe {
            let _ = EnumWindows(Some(enum_callback), LPARAM(&mut windows as *mut _ as isize));
        }

        // Sort by Z-order (front to back) - windows at front first
        // EnumWindows already returns in Z-order

        windows
    }

    /// Get windows with thumbnails
    #[cfg(target_os = "windows")]
    pub fn get_windows_with_thumbnails(&self, thumbnail_size: u32) -> Vec<WindowInfo> {
        let mut windows = self.get_windows();

        for window in &mut windows {
            if !window.is_minimized {
                window.thumbnail_base64 =
                    self.capture_window_thumbnail(window.hwnd, thumbnail_size);
            }
        }

        windows
    }

    /// Capture a small thumbnail of a window
    #[cfg(target_os = "windows")]
    fn capture_window_thumbnail(&self, hwnd: isize, max_size: u32) -> Option<String> {
        use base64::{engine::general_purpose::STANDARD, Engine};
        use windows::Win32::Foundation::{HWND, RECT};
        use windows::Win32::Graphics::Gdi::{
            BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
            GetDIBits, ReleaseDC, SelectObject, SetStretchBltMode, StretchBlt, BITMAPINFO,
            BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HALFTONE, SRCCOPY,
        };
        use windows::Win32::UI::WindowsAndMessaging::GetWindowRect;

        unsafe {
            let hwnd = HWND(hwnd as *mut _);

            // Get window rect
            let mut rect = RECT::default();
            if GetWindowRect(hwnd, &mut rect).is_err() {
                return None;
            }

            let width = (rect.right - rect.left) as u32;
            let height = (rect.bottom - rect.top) as u32;

            if width == 0 || height == 0 {
                return None;
            }

            // Calculate thumbnail dimensions while maintaining aspect ratio
            let (thumb_width, thumb_height) = if width > height {
                let tw = max_size.min(width);
                let th = (height as f64 * tw as f64 / width as f64) as u32;
                (tw, th.max(1))
            } else {
                let th = max_size.min(height);
                let tw = (width as f64 * th as f64 / height as f64) as u32;
                (tw.max(1), th)
            };

            // Get screen DC
            let screen_dc = GetDC(HWND::default());
            if screen_dc.is_invalid() {
                return None;
            }

            // Create memory DCs
            let src_dc = CreateCompatibleDC(screen_dc);
            let dst_dc = CreateCompatibleDC(screen_dc);
            if src_dc.is_invalid() || dst_dc.is_invalid() {
                if !src_dc.is_invalid() {
                    let _ = DeleteDC(src_dc);
                }
                if !dst_dc.is_invalid() {
                    let _ = DeleteDC(dst_dc);
                }
                ReleaseDC(HWND::default(), screen_dc);
                return None;
            }

            // Create bitmaps
            let src_bitmap = CreateCompatibleBitmap(screen_dc, width as i32, height as i32);
            let dst_bitmap =
                CreateCompatibleBitmap(screen_dc, thumb_width as i32, thumb_height as i32);
            if src_bitmap.is_invalid() || dst_bitmap.is_invalid() {
                if !src_bitmap.is_invalid() {
                    let _ = DeleteObject(src_bitmap);
                }
                if !dst_bitmap.is_invalid() {
                    let _ = DeleteObject(dst_bitmap);
                }
                let _ = DeleteDC(src_dc);
                let _ = DeleteDC(dst_dc);
                ReleaseDC(HWND::default(), screen_dc);
                return None;
            }

            let old_src = SelectObject(src_dc, src_bitmap);
            let old_dst = SelectObject(dst_dc, dst_bitmap);

            // Capture window area
            if BitBlt(
                src_dc,
                0,
                0,
                width as i32,
                height as i32,
                screen_dc,
                rect.left,
                rect.top,
                SRCCOPY,
            )
            .is_err()
            {
                SelectObject(src_dc, old_src);
                SelectObject(dst_dc, old_dst);
                let _ = DeleteObject(src_bitmap);
                let _ = DeleteObject(dst_bitmap);
                let _ = DeleteDC(src_dc);
                let _ = DeleteDC(dst_dc);
                ReleaseDC(HWND::default(), screen_dc);
                return None;
            }

            // Scale down to thumbnail
            let _ = SetStretchBltMode(dst_dc, HALFTONE);
            if !StretchBlt(
                dst_dc,
                0,
                0,
                thumb_width as i32,
                thumb_height as i32,
                src_dc,
                0,
                0,
                width as i32,
                height as i32,
                SRCCOPY,
            )
            .as_bool()
            {
                SelectObject(src_dc, old_src);
                SelectObject(dst_dc, old_dst);
                let _ = DeleteObject(src_bitmap);
                let _ = DeleteObject(dst_bitmap);
                let _ = DeleteDC(src_dc);
                let _ = DeleteDC(dst_dc);
                ReleaseDC(HWND::default(), screen_dc);
                return None;
            }

            // Get bitmap bits
            let mut bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: thumb_width as i32,
                    biHeight: -(thumb_height as i32),
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    ..Default::default()
                },
                bmiColors: [Default::default()],
            };

            let mut pixels: Vec<u8> = vec![0; (thumb_width * thumb_height * 4) as usize];
            let lines = GetDIBits(
                dst_dc,
                dst_bitmap,
                0,
                thumb_height,
                Some(pixels.as_mut_ptr() as *mut _),
                &mut bmi,
                DIB_RGB_COLORS,
            );

            // Cleanup
            SelectObject(src_dc, old_src);
            SelectObject(dst_dc, old_dst);
            let _ = DeleteObject(src_bitmap);
            let _ = DeleteObject(dst_bitmap);
            let _ = DeleteDC(src_dc);
            let _ = DeleteDC(dst_dc);
            ReleaseDC(HWND::default(), screen_dc);

            if lines == 0 {
                return None;
            }

            // Convert BGRA to RGBA
            for chunk in pixels.chunks_exact_mut(4) {
                chunk.swap(0, 2);
            }

            // Encode as PNG
            let mut png_data = Vec::new();
            {
                let mut encoder = png::Encoder::new(&mut png_data, thumb_width, thumb_height);
                encoder.set_color(png::ColorType::Rgba);
                encoder.set_depth(png::BitDepth::Eight);
                encoder.set_compression(png::Compression::Fast);

                if let Ok(mut writer) = encoder.write_header() {
                    if writer.write_image_data(&pixels).is_err() {
                        return None;
                    }
                } else {
                    return None;
                }
            }

            Some(STANDARD.encode(&png_data))
        }
    }

    /// Capture a specific window by HWND
    #[cfg(target_os = "windows")]
    pub fn capture_window_by_hwnd(&self, hwnd: isize) -> Result<super::ScreenshotResult, String> {
        use windows::Win32::Foundation::{HWND, RECT};
        use windows::Win32::Graphics::Gdi::{
            BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
            GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB,
            DIB_RGB_COLORS, SRCCOPY,
        };
        use windows::Win32::UI::WindowsAndMessaging::{GetWindowRect, GetWindowTextW};

        unsafe {
            let hwnd = HWND(hwnd as *mut _);

            // Get window title
            let mut title_buf = [0u16; 256];
            let len = GetWindowTextW(hwnd, &mut title_buf);
            let window_title = if len > 0 {
                Some(String::from_utf16_lossy(&title_buf[..len as usize]))
            } else {
                None
            };

            // Get window rect
            let mut rect = RECT::default();
            GetWindowRect(hwnd, &mut rect).map_err(|e| e.to_string())?;

            let x = rect.left;
            let y = rect.top;
            let width = (rect.right - rect.left) as u32;
            let height = (rect.bottom - rect.top) as u32;

            if width == 0 || height == 0 {
                return Err("Window has zero size".to_string());
            }

            // Get screen DC
            let screen_dc = GetDC(HWND::default());
            if screen_dc.is_invalid() {
                return Err("Failed to get screen DC".to_string());
            }

            // Create compatible DC and bitmap
            let mem_dc = CreateCompatibleDC(screen_dc);
            if mem_dc.is_invalid() {
                ReleaseDC(HWND::default(), screen_dc);
                return Err("Failed to create compatible DC".to_string());
            }

            let bitmap = CreateCompatibleBitmap(screen_dc, width as i32, height as i32);
            if bitmap.is_invalid() {
                let _ = DeleteDC(mem_dc);
                ReleaseDC(HWND::default(), screen_dc);
                return Err("Failed to create bitmap".to_string());
            }

            let old_bitmap = SelectObject(mem_dc, bitmap);

            // Copy screen region to bitmap
            if BitBlt(
                mem_dc,
                0,
                0,
                width as i32,
                height as i32,
                screen_dc,
                x,
                y,
                SRCCOPY,
            )
            .is_err()
            {
                SelectObject(mem_dc, old_bitmap);
                let _ = DeleteObject(bitmap);
                let _ = DeleteDC(mem_dc);
                ReleaseDC(HWND::default(), screen_dc);
                return Err("BitBlt failed".to_string());
            }

            // Prepare bitmap info
            let mut bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: width as i32,
                    biHeight: -(height as i32),
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    ..Default::default()
                },
                bmiColors: [Default::default()],
            };

            // Allocate buffer for pixel data
            let mut pixels: Vec<u8> = vec![0; (width * height * 4) as usize];

            // Get bitmap bits
            let lines = GetDIBits(
                mem_dc,
                bitmap,
                0,
                height,
                Some(pixels.as_mut_ptr() as *mut _),
                &mut bmi,
                DIB_RGB_COLORS,
            );

            // Cleanup
            SelectObject(mem_dc, old_bitmap);
            let _ = DeleteObject(bitmap);
            let _ = DeleteDC(mem_dc);
            ReleaseDC(HWND::default(), screen_dc);

            if lines == 0 {
                return Err("GetDIBits failed".to_string());
            }

            // Convert BGRA to RGBA
            for chunk in pixels.chunks_exact_mut(4) {
                chunk.swap(0, 2);
            }

            // Encode as PNG
            let png_data = self.encode_png(&pixels, width, height)?;

            let metadata = super::ScreenshotMetadata {
                timestamp: chrono::Utc::now().timestamp_millis(),
                width,
                height,
                mode: "window".to_string(),
                monitor_index: None,
                window_title,
                region: Some(super::CaptureRegion {
                    x,
                    y,
                    width,
                    height,
                }),
                file_path: None,
                ocr_text: None,
            };

            Ok(super::ScreenshotResult {
                image_data: png_data,
                metadata,
            })
        }
    }

    /// Encode RGBA pixels as PNG
    fn encode_png(&self, pixels: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
        let mut png_data = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut png_data, width, height);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            encoder.set_compression(png::Compression::Fast);

            let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
            writer.write_image_data(pixels).map_err(|e| e.to_string())?;
        }
        Ok(png_data)
    }

    /// Calculate snap position for a window being moved
    #[cfg(target_os = "windows")]
    pub fn calculate_snap_position(
        &self,
        window_hwnd: isize,
        proposed_x: i32,
        proposed_y: i32,
        window_width: u32,
        window_height: u32,
    ) -> SnapResult {
        use windows::Win32::UI::WindowsAndMessaging::{
            GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
            SM_YVIRTUALSCREEN,
        };

        let mut result = SnapResult {
            x: None,
            y: None,
            horizontal_edge: "none".to_string(),
            vertical_edge: "none".to_string(),
            snap_target: None,
        };

        let snap_dist = self.snap_config.snap_distance;
        let window_right = proposed_x + window_width as i32;
        let window_bottom = proposed_y + window_height as i32;

        // Snap to screen edges
        if self.snap_config.snap_to_screen {
            unsafe {
                let screen_left = GetSystemMetrics(SM_XVIRTUALSCREEN);
                let screen_top = GetSystemMetrics(SM_YVIRTUALSCREEN);
                let screen_right = screen_left + GetSystemMetrics(SM_CXVIRTUALSCREEN);
                let screen_bottom = screen_top + GetSystemMetrics(SM_CYVIRTUALSCREEN);

                // Left edge
                if (proposed_x - screen_left).abs() <= snap_dist {
                    result.x = Some(screen_left);
                    result.horizontal_edge = "left".to_string();
                    result.snap_target = Some("Screen".to_string());
                }
                // Right edge
                else if (window_right - screen_right).abs() <= snap_dist {
                    result.x = Some(screen_right - window_width as i32);
                    result.horizontal_edge = "right".to_string();
                    result.snap_target = Some("Screen".to_string());
                }

                // Top edge
                if (proposed_y - screen_top).abs() <= snap_dist {
                    result.y = Some(screen_top);
                    result.vertical_edge = "top".to_string();
                    result.snap_target = Some("Screen".to_string());
                }
                // Bottom edge
                else if (window_bottom - screen_bottom).abs() <= snap_dist {
                    result.y = Some(screen_bottom - window_height as i32);
                    result.vertical_edge = "bottom".to_string();
                    result.snap_target = Some("Screen".to_string());
                }
            }
        }

        // Snap to other windows
        if self.snap_config.snap_to_windows {
            let other_windows = self.get_windows();

            for other in &other_windows {
                // Skip self and minimized windows
                if other.hwnd == window_hwnd || other.is_minimized {
                    continue;
                }

                let other_right = other.x + other.width as i32;
                let other_bottom = other.y + other.height as i32;

                // Check horizontal snapping (if not already snapped)
                if result.x.is_none() {
                    // Snap left edge to other's right edge
                    if (proposed_x - other_right).abs() <= snap_dist {
                        result.x = Some(other_right);
                        result.horizontal_edge = "left".to_string();
                        result.snap_target = Some(other.title.clone());
                    }
                    // Snap right edge to other's left edge
                    else if (window_right - other.x).abs() <= snap_dist {
                        result.x = Some(other.x - window_width as i32);
                        result.horizontal_edge = "right".to_string();
                        result.snap_target = Some(other.title.clone());
                    }
                    // Snap left to left
                    else if (proposed_x - other.x).abs() <= snap_dist {
                        result.x = Some(other.x);
                        result.horizontal_edge = "left".to_string();
                        result.snap_target = Some(other.title.clone());
                    }
                    // Snap right to right
                    else if (window_right - other_right).abs() <= snap_dist {
                        result.x = Some(other_right - window_width as i32);
                        result.horizontal_edge = "right".to_string();
                        result.snap_target = Some(other.title.clone());
                    }
                }

                // Check vertical snapping (if not already snapped)
                if result.y.is_none() {
                    // Snap top edge to other's bottom edge
                    if (proposed_y - other_bottom).abs() <= snap_dist {
                        result.y = Some(other_bottom);
                        result.vertical_edge = "top".to_string();
                        if result.snap_target.is_none() {
                            result.snap_target = Some(other.title.clone());
                        }
                    }
                    // Snap bottom edge to other's top edge
                    else if (window_bottom - other.y).abs() <= snap_dist {
                        result.y = Some(other.y - window_height as i32);
                        result.vertical_edge = "bottom".to_string();
                        if result.snap_target.is_none() {
                            result.snap_target = Some(other.title.clone());
                        }
                    }
                    // Snap top to top
                    else if (proposed_y - other.y).abs() <= snap_dist {
                        result.y = Some(other.y);
                        result.vertical_edge = "top".to_string();
                        if result.snap_target.is_none() {
                            result.snap_target = Some(other.title.clone());
                        }
                    }
                    // Snap bottom to bottom
                    else if (window_bottom - other_bottom).abs() <= snap_dist {
                        result.y = Some(other_bottom - window_height as i32);
                        result.vertical_edge = "bottom".to_string();
                        if result.snap_target.is_none() {
                            result.snap_target = Some(other.title.clone());
                        }
                    }
                }
            }
        }

        result
    }

    // Non-Windows implementations
    #[cfg(not(target_os = "windows"))]
    pub fn get_windows(&self) -> Vec<WindowInfo> {
        Vec::new()
    }

    #[cfg(not(target_os = "windows"))]
    pub fn get_windows_with_thumbnails(&self, _thumbnail_size: u32) -> Vec<WindowInfo> {
        Vec::new()
    }

    #[cfg(not(target_os = "windows"))]
    pub fn capture_window_by_hwnd(&self, _hwnd: isize) -> Result<super::ScreenshotResult, String> {
        Err("Window capture not implemented for this platform".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn calculate_snap_position(
        &self,
        _window_hwnd: isize,
        _proposed_x: i32,
        _proposed_y: i32,
        _window_width: u32,
        _window_height: u32,
    ) -> SnapResult {
        SnapResult {
            x: None,
            y: None,
            horizontal_edge: "none".to_string(),
            vertical_edge: "none".to_string(),
            snap_target: None,
        }
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

    #[test]
    fn test_window_manager_new() {
        let manager = WindowManager::new();
        assert_eq!(manager.snap_config.snap_distance, 20);
    }

    #[test]
    fn test_snap_config_default() {
        let config = SnapConfig::default();
        assert_eq!(config.snap_distance, 20);
        assert!(config.snap_to_screen);
        assert!(config.snap_to_windows);
    }

    #[test]
    fn test_window_info_serialization() {
        let info = WindowInfo {
            hwnd: 12345,
            title: "Test Window".to_string(),
            process_name: "test.exe".to_string(),
            pid: 1000,
            x: 100,
            y: 200,
            width: 800,
            height: 600,
            is_minimized: false,
            is_maximized: false,
            is_visible: true,
            thumbnail_base64: None,
        };

        let json = serde_json::to_string(&info).unwrap();
        let deserialized: WindowInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.hwnd, 12345);
        assert_eq!(deserialized.title, "Test Window");
    }

    #[test]
    fn test_snap_result_serialization() {
        let result = SnapResult {
            x: Some(100),
            y: None,
            horizontal_edge: "left".to_string(),
            vertical_edge: "none".to_string(),
            snap_target: Some("Target Window".to_string()),
        };

        let json = serde_json::to_string(&result).unwrap();
        let deserialized: SnapResult = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.x, Some(100));
        assert_eq!(deserialized.y, None);
    }
}
