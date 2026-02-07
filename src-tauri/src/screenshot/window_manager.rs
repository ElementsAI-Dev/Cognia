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
    /// Enable snapping to UI elements within windows
    pub snap_to_elements: bool,
    /// Show visual guide lines when snapping
    pub show_guide_lines: bool,
    /// Enable magnetic edge snapping during region selection
    pub magnetic_edges: bool,
}

/// Information about a UI element within a window
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementInfo {
    /// Element bounds - X position
    pub x: i32,
    /// Element bounds - Y position
    pub y: i32,
    /// Element width
    pub width: u32,
    /// Element height
    pub height: u32,
    /// Element type/class name
    pub element_type: String,
    /// Element text/name if available
    pub name: Option<String>,
    /// Parent window HWND
    pub parent_hwnd: isize,
}

/// Visual snap guide line for UI feedback
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapGuide {
    /// Guide orientation: "horizontal" or "vertical"
    pub orientation: String,
    /// Position (x for vertical, y for horizontal)
    pub position: i32,
    /// Start point of the guide line
    pub start: i32,
    /// End point of the guide line
    pub end: i32,
    /// Source of the snap (window title or "screen")
    pub source: String,
}

/// Result of selection snap calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionSnapResult {
    /// Snapped X position of selection
    pub x: i32,
    /// Snapped Y position of selection
    pub y: i32,
    /// Snapped width of selection
    pub width: u32,
    /// Snapped height of selection
    pub height: u32,
    /// Whether any edge was snapped
    pub snapped: bool,
    /// Visual guide lines to display
    pub guides: Vec<SnapGuide>,
}

impl Default for SnapConfig {
    fn default() -> Self {
        Self {
            snap_distance: 20,
            snap_to_screen: true,
            snap_to_windows: true,
            snap_to_elements: false,
            show_guide_lines: true,
            magnetic_edges: true,
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

    #[allow(dead_code)]
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
        use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT};
        use windows::Win32::System::ProcessStatus::GetModuleBaseNameW;
        use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
        use windows::Win32::UI::WindowsAndMessaging::{
            EnumWindows, GetWindowLongW, GetWindowRect, GetWindowTextLengthW,
            GetWindowTextW, GetWindowThreadProcessId, IsIconic, IsWindowVisible, IsZoomed,
            GWL_EXSTYLE, WS_EX_TOOLWINDOW,
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

    /// Get the window at a specific screen point (for auto-detection during selection)
    #[cfg(target_os = "windows")]
    pub fn get_window_at_point(&self, x: i32, y: i32) -> Option<WindowInfo> {
        use windows::Win32::Foundation::{POINT, RECT};
        use windows::Win32::System::ProcessStatus::GetModuleBaseNameW;
        use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
        use windows::Win32::UI::WindowsAndMessaging::{
            GetAncestor, GetWindowRect, GetWindowTextLengthW, GetWindowTextW,
            GetWindowThreadProcessId, IsIconic, IsWindowVisible, IsZoomed, WindowFromPoint,
            GA_ROOT,
        };

        unsafe {
            let point = POINT { x, y };
            let hwnd = WindowFromPoint(point);

            if hwnd.0.is_null() {
                return None;
            }

            // Get the top-level window
            let root_hwnd = GetAncestor(hwnd, GA_ROOT);
            let target_hwnd = if root_hwnd.0.is_null() {
                hwnd
            } else {
                root_hwnd
            };

            // Check if visible
            if !IsWindowVisible(target_hwnd).as_bool() {
                return None;
            }

            // Get window title
            let title_len = GetWindowTextLengthW(target_hwnd);
            if title_len == 0 {
                return None;
            }

            let mut title_buf = vec![0u16; (title_len + 1) as usize];
            let actual_len = GetWindowTextW(target_hwnd, &mut title_buf);
            if actual_len == 0 {
                return None;
            }

            let title = String::from_utf16_lossy(&title_buf[..actual_len as usize]);

            // Get window rect
            let mut rect = RECT::default();
            if GetWindowRect(target_hwnd, &mut rect).is_err() {
                return None;
            }

            let width = (rect.right - rect.left) as u32;
            let height = (rect.bottom - rect.top) as u32;

            if width == 0 || height == 0 {
                return None;
            }

            // Get process info
            let mut pid: u32 = 0;
            GetWindowThreadProcessId(target_hwnd, Some(&mut pid));

            let mut process_name = String::from("Unknown");
            if let Ok(process) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                let mut name_buf = [0u16; 260];
                let len = GetModuleBaseNameW(process, None, &mut name_buf);
                if len > 0 {
                    process_name = String::from_utf16_lossy(&name_buf[..len as usize]);
                }
                let _ = windows::Win32::Foundation::CloseHandle(process);
            }

            Some(WindowInfo {
                hwnd: target_hwnd.0 as isize,
                title,
                process_name,
                pid,
                x: rect.left,
                y: rect.top,
                width,
                height,
                is_minimized: IsIconic(target_hwnd).as_bool(),
                is_maximized: IsZoomed(target_hwnd).as_bool(),
                is_visible: true,
                thumbnail_base64: None,
            })
        }
    }

    /// Get child elements of a window (for element-level detection)
    #[cfg(target_os = "windows")]
    pub fn get_child_elements(&self, hwnd: isize, max_depth: u32) -> Vec<ElementInfo> {
        use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT};
        use windows::Win32::UI::WindowsAndMessaging::{
            EnumChildWindows, GetClassNameW, GetWindowRect, GetWindowTextW, IsWindowVisible,
        };

        let mut elements: Vec<ElementInfo> = Vec::new();
        let parent_hwnd = HWND(hwnd as *mut _);

        unsafe extern "system" fn enum_callback(child_hwnd: HWND, lparam: LPARAM) -> BOOL {
            let elements = &mut *(lparam.0 as *mut Vec<ElementInfo>);

            // Check visibility
            if !IsWindowVisible(child_hwnd).as_bool() {
                return BOOL(1);
            }

            // Get element rect
            let mut rect = RECT::default();
            if GetWindowRect(child_hwnd, &mut rect).is_err() {
                return BOOL(1);
            }

            let width = (rect.right - rect.left) as u32;
            let height = (rect.bottom - rect.top) as u32;

            // Skip tiny elements
            if width < 5 || height < 5 {
                return BOOL(1);
            }

            // Get class name
            let mut class_buf = [0u16; 256];
            let class_len = GetClassNameW(child_hwnd, &mut class_buf);
            let element_type = if class_len > 0 {
                String::from_utf16_lossy(&class_buf[..class_len as usize])
            } else {
                "Unknown".to_string()
            };

            // Get text/name
            let mut text_buf = [0u16; 256];
            let text_len = GetWindowTextW(child_hwnd, &mut text_buf);
            let name = if text_len > 0 {
                Some(String::from_utf16_lossy(&text_buf[..text_len as usize]))
            } else {
                None
            };

            elements.push(ElementInfo {
                x: rect.left,
                y: rect.top,
                width,
                height,
                element_type,
                name,
                parent_hwnd: child_hwnd.0 as isize,
            });

            BOOL(1) // Continue enumeration
        }

        unsafe {
            let _ = EnumChildWindows(
                parent_hwnd,
                Some(enum_callback),
                LPARAM(&mut elements as *mut _ as isize),
            );
        }

        // Limit results based on max_depth (higher depth = more elements)
        let max_elements = (max_depth as usize * 50).clamp(50, 500);
        if elements.len() > max_elements {
            elements.truncate(max_elements);
        }

        elements
    }

    /// Calculate snapped selection rectangle during region selection
    #[cfg(target_os = "windows")]
    pub fn calculate_selection_snap(
        &self,
        selection_x: i32,
        selection_y: i32,
        selection_width: u32,
        selection_height: u32,
    ) -> SelectionSnapResult {
        use windows::Win32::UI::WindowsAndMessaging::{
            GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
            SM_YVIRTUALSCREEN,
        };

        let snap_dist = self.snap_config.snap_distance;
        let mut result = SelectionSnapResult {
            x: selection_x,
            y: selection_y,
            width: selection_width,
            height: selection_height,
            snapped: false,
            guides: Vec::new(),
        };

        if !self.snap_config.magnetic_edges {
            return result;
        }

        let sel_right = selection_x + selection_width as i32;
        let sel_bottom = selection_y + selection_height as i32;

        // Snap to screen edges
        if self.snap_config.snap_to_screen {
            unsafe {
                let screen_left = GetSystemMetrics(SM_XVIRTUALSCREEN);
                let screen_top = GetSystemMetrics(SM_YVIRTUALSCREEN);
                let screen_right = screen_left + GetSystemMetrics(SM_CXVIRTUALSCREEN);
                let screen_bottom = screen_top + GetSystemMetrics(SM_CYVIRTUALSCREEN);

                // Left edge
                if (selection_x - screen_left).abs() <= snap_dist {
                    result.x = screen_left;
                    result.snapped = true;
                    if self.snap_config.show_guide_lines {
                        result.guides.push(SnapGuide {
                            orientation: "vertical".to_string(),
                            position: screen_left,
                            start: screen_top,
                            end: screen_bottom,
                            source: "Screen".to_string(),
                        });
                    }
                }

                // Right edge
                if (sel_right - screen_right).abs() <= snap_dist {
                    result.width = (screen_right - result.x) as u32;
                    result.snapped = true;
                    if self.snap_config.show_guide_lines {
                        result.guides.push(SnapGuide {
                            orientation: "vertical".to_string(),
                            position: screen_right,
                            start: screen_top,
                            end: screen_bottom,
                            source: "Screen".to_string(),
                        });
                    }
                }

                // Top edge
                if (selection_y - screen_top).abs() <= snap_dist {
                    result.y = screen_top;
                    result.snapped = true;
                    if self.snap_config.show_guide_lines {
                        result.guides.push(SnapGuide {
                            orientation: "horizontal".to_string(),
                            position: screen_top,
                            start: screen_left,
                            end: screen_right,
                            source: "Screen".to_string(),
                        });
                    }
                }

                // Bottom edge
                if (sel_bottom - screen_bottom).abs() <= snap_dist {
                    result.height = (screen_bottom - result.y) as u32;
                    result.snapped = true;
                    if self.snap_config.show_guide_lines {
                        result.guides.push(SnapGuide {
                            orientation: "horizontal".to_string(),
                            position: screen_bottom,
                            start: screen_left,
                            end: screen_right,
                            source: "Screen".to_string(),
                        });
                    }
                }
            }
        }

        // Snap to window edges
        if self.snap_config.snap_to_windows {
            let windows = self.get_windows();

            for window in &windows {
                if window.is_minimized {
                    continue;
                }

                let win_right = window.x + window.width as i32;
                let win_bottom = window.y + window.height as i32;

                // Snap selection left to window left
                if (result.x - window.x).abs() <= snap_dist {
                    result.x = window.x;
                    result.snapped = true;
                    if self.snap_config.show_guide_lines {
                        result.guides.push(SnapGuide {
                            orientation: "vertical".to_string(),
                            position: window.x,
                            start: window.y,
                            end: win_bottom,
                            source: window.title.clone(),
                        });
                    }
                }

                // Snap selection left to window right
                if (result.x - win_right).abs() <= snap_dist {
                    result.x = win_right;
                    result.snapped = true;
                }

                // Snap selection right to window right
                let current_right = result.x + result.width as i32;
                if (current_right - win_right).abs() <= snap_dist {
                    result.width = (win_right - result.x) as u32;
                    result.snapped = true;
                    if self.snap_config.show_guide_lines {
                        result.guides.push(SnapGuide {
                            orientation: "vertical".to_string(),
                            position: win_right,
                            start: window.y,
                            end: win_bottom,
                            source: window.title.clone(),
                        });
                    }
                }

                // Snap selection right to window left
                if (current_right - window.x).abs() <= snap_dist {
                    result.width = (window.x - result.x) as u32;
                    result.snapped = true;
                }

                // Snap selection top to window top
                if (result.y - window.y).abs() <= snap_dist {
                    result.y = window.y;
                    result.snapped = true;
                    if self.snap_config.show_guide_lines {
                        result.guides.push(SnapGuide {
                            orientation: "horizontal".to_string(),
                            position: window.y,
                            start: window.x,
                            end: win_right,
                            source: window.title.clone(),
                        });
                    }
                }

                // Snap selection top to window bottom
                if (result.y - win_bottom).abs() <= snap_dist {
                    result.y = win_bottom;
                    result.snapped = true;
                }

                // Snap selection bottom to window bottom
                let current_bottom = result.y + result.height as i32;
                if (current_bottom - win_bottom).abs() <= snap_dist {
                    result.height = (win_bottom - result.y) as u32;
                    result.snapped = true;
                    if self.snap_config.show_guide_lines {
                        result.guides.push(SnapGuide {
                            orientation: "horizontal".to_string(),
                            position: win_bottom,
                            start: window.x,
                            end: win_right,
                            source: window.title.clone(),
                        });
                    }
                }

                // Snap selection bottom to window top
                if (current_bottom - window.y).abs() <= snap_dist {
                    result.height = (window.y - result.y) as u32;
                    result.snapped = true;
                }
            }
        }

        // Deduplicate guides
        result.guides.dedup_by(|a, b| {
            a.orientation == b.orientation && a.position == b.position
        });

        result
    }

    /// Get pixel color at screen coordinates
    #[cfg(target_os = "windows")]
    pub fn get_pixel_color(&self, x: i32, y: i32) -> Option<String> {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::Graphics::Gdi::{GetDC, GetPixel, ReleaseDC};

        unsafe {
            let dc = GetDC(HWND::default());
            if dc.is_invalid() {
                return None;
            }

            let color = GetPixel(dc, x, y);
            ReleaseDC(HWND::default(), dc);

            // CLR_INVALID is 0xFFFFFFFF - check if color is invalid
            let color_value: u32 = color.0;
            if color_value == 0xFFFFFFFF {
                return None;
            }

            // Extract RGB components (GetPixel returns BGR)
            let r = (color_value & 0xFF) as u8;
            let g = ((color_value >> 8) & 0xFF) as u8;
            let b = ((color_value >> 16) & 0xFF) as u8;

            Some(format!("#{:02X}{:02X}{:02X}", r, g, b))
        }
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

    #[cfg(not(target_os = "windows"))]
    pub fn get_window_at_point(&self, _x: i32, _y: i32) -> Option<WindowInfo> {
        None
    }

    #[cfg(not(target_os = "windows"))]
    pub fn get_child_elements(&self, _hwnd: isize, _max_depth: u32) -> Vec<ElementInfo> {
        Vec::new()
    }

    #[cfg(not(target_os = "windows"))]
    pub fn calculate_selection_snap(
        &self,
        selection_x: i32,
        selection_y: i32,
        selection_width: u32,
        selection_height: u32,
    ) -> SelectionSnapResult {
        SelectionSnapResult {
            x: selection_x,
            y: selection_y,
            width: selection_width,
            height: selection_height,
            snapped: false,
            guides: Vec::new(),
        }
    }

    #[cfg(not(target_os = "windows"))]
    pub fn get_pixel_color(&self, _x: i32, _y: i32) -> Option<String> {
        None
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

    #[test]
    fn test_snap_config_new_fields() {
        let config = SnapConfig::default();
        assert!(!config.snap_to_elements);
        assert!(config.show_guide_lines);
        assert!(config.magnetic_edges);
    }

    #[test]
    fn test_element_info_serialization() {
        let element = ElementInfo {
            x: 50,
            y: 100,
            width: 200,
            height: 30,
            element_type: "Button".to_string(),
            name: Some("Submit".to_string()),
            parent_hwnd: 12345,
        };

        let json = serde_json::to_string(&element).unwrap();
        let deserialized: ElementInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.x, 50);
        assert_eq!(deserialized.y, 100);
        assert_eq!(deserialized.element_type, "Button");
        assert_eq!(deserialized.name, Some("Submit".to_string()));
    }

    #[test]
    fn test_snap_guide_serialization() {
        let guide = SnapGuide {
            orientation: "vertical".to_string(),
            position: 100,
            start: 0,
            end: 1080,
            source: "Screen".to_string(),
        };

        let json = serde_json::to_string(&guide).unwrap();
        let deserialized: SnapGuide = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.orientation, "vertical");
        assert_eq!(deserialized.position, 100);
        assert_eq!(deserialized.source, "Screen");
    }

    #[test]
    fn test_selection_snap_result_serialization() {
        let result = SelectionSnapResult {
            x: 100,
            y: 200,
            width: 800,
            height: 600,
            snapped: true,
            guides: vec![
                SnapGuide {
                    orientation: "vertical".to_string(),
                    position: 100,
                    start: 0,
                    end: 1080,
                    source: "Screen".to_string(),
                },
            ],
        };

        let json = serde_json::to_string(&result).unwrap();
        let deserialized: SelectionSnapResult = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.x, 100);
        assert_eq!(deserialized.y, 200);
        assert!(deserialized.snapped);
        assert_eq!(deserialized.guides.len(), 1);
    }

    #[test]
    fn test_selection_snap_result_no_snap() {
        let result = SelectionSnapResult {
            x: 150,
            y: 250,
            width: 400,
            height: 300,
            snapped: false,
            guides: vec![],
        };

        assert!(!result.snapped);
        assert!(result.guides.is_empty());
    }

    #[test]
    fn test_window_manager_get_window_at_point() {
        let manager = WindowManager::new();
        // This will return None on non-Windows or if no window at origin
        let _result = manager.get_window_at_point(0, 0);
        // Just ensure it doesn't panic
    }

    #[test]
    fn test_window_manager_get_child_elements() {
        let manager = WindowManager::new();
        // This will return empty vec on non-Windows or invalid hwnd
        let elements = manager.get_child_elements(0, 1);
        // Just ensure it returns a valid vec (possibly empty)
        assert!(elements.len() <= 100); // We limit to 100
    }

    #[test]
    fn test_window_manager_calculate_selection_snap() {
        let manager = WindowManager::new();
        let result = manager.calculate_selection_snap(100, 100, 400, 300);

        // Result should have valid dimensions
        assert!(result.width > 0);
        assert!(result.height > 0);
    }

    #[test]
    fn test_window_manager_get_pixel_color() {
        let manager = WindowManager::new();
        // May return None on non-Windows
        let _color = manager.get_pixel_color(0, 0);
        // Just ensure it doesn't panic
    }

    #[test]
    fn test_snap_config_custom() {
        let config = SnapConfig {
            snap_distance: 30,
            snap_to_screen: false,
            snap_to_windows: true,
            snap_to_elements: true,
            show_guide_lines: false,
            magnetic_edges: false,
        };

        assert_eq!(config.snap_distance, 30);
        assert!(!config.snap_to_screen);
        assert!(config.snap_to_windows);
        assert!(config.snap_to_elements);
        assert!(!config.show_guide_lines);
        assert!(!config.magnetic_edges);
    }
}
