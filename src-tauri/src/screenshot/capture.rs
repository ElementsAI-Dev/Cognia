//! Screen capture implementation
//!
//! Provides low-level screen capture functionality using platform-specific APIs.

use super::{CaptureRegion, MonitorInfo, ScreenshotMetadata};
use serde::{Deserialize, Serialize};

/// Capture mode
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CaptureMode {
    FullScreen,
    Window,
    Region,
    Monitor(usize),
}

/// Screenshot result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotResult {
    /// PNG encoded image data
    #[serde(with = "base64_serde")]
    pub image_data: Vec<u8>,
    /// Screenshot metadata
    pub metadata: ScreenshotMetadata,
}

mod base64_serde {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    pub fn serialize<S>(bytes: &Vec<u8>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let encoded = STANDARD.encode(bytes);
        String::serialize(&encoded, serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        STANDARD.decode(&s).map_err(serde::de::Error::custom)
    }
}

/// Screen capture engine
pub struct ScreenshotCapture {
    #[cfg(target_os = "windows")]
    _marker: std::marker::PhantomData<()>,
}

impl ScreenshotCapture {
    pub fn new() -> Self {
        Self {
            #[cfg(target_os = "windows")]
            _marker: std::marker::PhantomData,
        }
    }

    /// Capture entire screen or specific monitor
    #[cfg(target_os = "windows")]
    pub fn capture_screen(&self, monitor_index: Option<usize>) -> Result<ScreenshotResult, String> {
        use windows::Win32::UI::WindowsAndMessaging::{
            GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
            SM_YVIRTUALSCREEN,
        };

        unsafe {
            let (x, y, width, height) = if let Some(idx) = monitor_index {
                let monitors = self.get_monitors();
                if idx >= monitors.len() {
                    return Err(format!("Monitor index {} out of range", idx));
                }
                let m = &monitors[idx];
                (m.x, m.y, m.width, m.height)
            } else {
                // Virtual screen (all monitors)
                (
                    GetSystemMetrics(SM_XVIRTUALSCREEN),
                    GetSystemMetrics(SM_YVIRTUALSCREEN),
                    GetSystemMetrics(SM_CXVIRTUALSCREEN) as u32,
                    GetSystemMetrics(SM_CYVIRTUALSCREEN) as u32,
                )
            };

            self.capture_region_internal(x, y, width, height, CaptureMode::FullScreen, None)
        }
    }

    /// Capture active window
    #[cfg(target_os = "windows")]
    pub fn capture_active_window(&self) -> Result<ScreenshotResult, String> {
        use windows::Win32::Foundation::RECT;
        use windows::Win32::UI::WindowsAndMessaging::{
            GetForegroundWindow, GetWindowRect, GetWindowTextW,
        };

        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.0.is_null() {
                return Err("No active window found".to_string());
            }

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

            self.capture_region_internal(x, y, width, height, CaptureMode::Window, window_title)
        }
    }

    /// Capture specific region
    #[cfg(target_os = "windows")]
    pub fn capture_region(
        &self,
        x: i32,
        y: i32,
        width: u32,
        height: u32,
    ) -> Result<ScreenshotResult, String> {
        self.capture_region_internal(x, y, width, height, CaptureMode::Region, None)
    }

    #[cfg(target_os = "windows")]
    fn capture_region_internal(
        &self,
        x: i32,
        y: i32,
        width: u32,
        height: u32,
        mode: CaptureMode,
        window_title: Option<String>,
    ) -> Result<ScreenshotResult, String> {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::Graphics::Gdi::{
            BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
            GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB,
            DIB_RGB_COLORS, SRCCOPY,
        };

        if width == 0 || height == 0 {
            return Err("Invalid capture dimensions".to_string());
        }

        unsafe {
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

            // Copy screen to bitmap
            let result = BitBlt(
                mem_dc,
                0,
                0,
                width as i32,
                height as i32,
                screen_dc,
                x,
                y,
                SRCCOPY,
            );
            if result.is_err() {
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
                    biHeight: -(height as i32), // Negative for top-down
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    biSizeImage: 0,
                    biXPelsPerMeter: 0,
                    biYPelsPerMeter: 0,
                    biClrUsed: 0,
                    biClrImportant: 0,
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

            // Cleanup GDI objects
            SelectObject(mem_dc, old_bitmap);
            let _ = DeleteObject(bitmap);
            let _ = DeleteDC(mem_dc);
            ReleaseDC(HWND::default(), screen_dc);

            if lines == 0 {
                return Err("GetDIBits failed".to_string());
            }

            // Convert BGRA to RGBA
            for chunk in pixels.chunks_exact_mut(4) {
                chunk.swap(0, 2); // Swap B and R
            }

            // Encode as PNG
            let png_data = self.encode_png(&pixels, width, height)?;

            let metadata = ScreenshotMetadata {
                timestamp: chrono::Utc::now().timestamp_millis(),
                width,
                height,
                mode: match mode {
                    CaptureMode::FullScreen => "fullscreen".to_string(),
                    CaptureMode::Window => "window".to_string(),
                    CaptureMode::Region => "region".to_string(),
                    CaptureMode::Monitor(i) => format!("monitor_{}", i),
                },
                monitor_index: match mode {
                    CaptureMode::Monitor(i) => Some(i),
                    _ => None,
                },
                window_title,
                region: if matches!(mode, CaptureMode::Region) {
                    Some(CaptureRegion {
                        x,
                        y,
                        width,
                        height,
                    })
                } else {
                    None
                },
                file_path: None,
                ocr_text: None,
            };

            Ok(ScreenshotResult {
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

    /// Get list of available monitors
    #[cfg(target_os = "windows")]
    pub fn get_monitors(&self) -> Vec<MonitorInfo> {
        use windows::Win32::Foundation::{BOOL, LPARAM, RECT};
        use windows::Win32::Graphics::Gdi::{
            EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFOEXW,
        };
        use windows::Win32::UI::HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI};

        let mut monitors = Vec::new();

        unsafe extern "system" fn enum_callback(
            monitor: HMONITOR,
            _hdc: HDC,
            _rect: *mut RECT,
            lparam: LPARAM,
        ) -> BOOL {
            let monitors = &mut *(lparam.0 as *mut Vec<MonitorInfo>);

            let mut info = MONITORINFOEXW {
                monitorInfo: windows::Win32::Graphics::Gdi::MONITORINFO {
                    cbSize: std::mem::size_of::<MONITORINFOEXW>() as u32,
                    ..Default::default()
                },
                ..Default::default()
            };

            if GetMonitorInfoW(monitor, &mut info.monitorInfo).as_bool() {
                let rect = info.monitorInfo.rcMonitor;
                let _work_rect = info.monitorInfo.rcWork;
                let is_primary = (info.monitorInfo.dwFlags & 1) != 0; // MONITORINFOF_PRIMARY

                let name = String::from_utf16_lossy(
                    &info.szDevice[..info
                        .szDevice
                        .iter()
                        .position(|&c| c == 0)
                        .unwrap_or(info.szDevice.len())],
                );

                // Get DPI scale factor for this monitor
                let scale_factor = {
                    let mut dpi_x: u32 = 96;
                    let mut dpi_y: u32 = 96;
                    if GetDpiForMonitor(monitor, MDT_EFFECTIVE_DPI, &mut dpi_x, &mut dpi_y).is_ok()
                    {
                        dpi_x as f64 / 96.0
                    } else {
                        1.0
                    }
                };

                monitors.push(MonitorInfo {
                    index: monitors.len(),
                    name,
                    x: rect.left,
                    y: rect.top,
                    width: (rect.right - rect.left) as u32,
                    height: (rect.bottom - rect.top) as u32,
                    is_primary,
                    scale_factor,
                });
            }

            BOOL(1) // Continue enumeration
        }

        unsafe {
            let _ = EnumDisplayMonitors(
                HDC::default(),
                None,
                Some(enum_callback),
                LPARAM(&mut monitors as *mut _ as isize),
            );
        }

        monitors
    }

    // Non-Windows implementations
    #[cfg(not(target_os = "windows"))]
    pub fn capture_screen(
        &self,
        _monitor_index: Option<usize>,
    ) -> Result<ScreenshotResult, String> {
        Err("Screenshot not implemented for this platform".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn capture_active_window(&self) -> Result<ScreenshotResult, String> {
        Err("Screenshot not implemented for this platform".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn capture_region(
        &self,
        _x: i32,
        _y: i32,
        _width: u32,
        _height: u32,
    ) -> Result<ScreenshotResult, String> {
        Err("Screenshot not implemented for this platform".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn get_monitors(&self) -> Vec<MonitorInfo> {
        Vec::new()
    }
}

impl Default for ScreenshotCapture {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== CaptureMode Tests ====================

    #[test]
    fn test_capture_mode_fullscreen() {
        let mode = CaptureMode::FullScreen;
        let json = serde_json::to_string(&mode).unwrap();
        let deserialized: CaptureMode = serde_json::from_str(&json).unwrap();
        assert!(matches!(deserialized, CaptureMode::FullScreen));
    }

    #[test]
    fn test_capture_mode_window() {
        let mode = CaptureMode::Window;
        let json = serde_json::to_string(&mode).unwrap();
        let deserialized: CaptureMode = serde_json::from_str(&json).unwrap();
        assert!(matches!(deserialized, CaptureMode::Window));
    }

    #[test]
    fn test_capture_mode_region() {
        let mode = CaptureMode::Region;
        let json = serde_json::to_string(&mode).unwrap();
        let deserialized: CaptureMode = serde_json::from_str(&json).unwrap();
        assert!(matches!(deserialized, CaptureMode::Region));
    }

    #[test]
    fn test_capture_mode_monitor() {
        let mode = CaptureMode::Monitor(2);
        let json = serde_json::to_string(&mode).unwrap();
        let deserialized: CaptureMode = serde_json::from_str(&json).unwrap();
        if let CaptureMode::Monitor(idx) = deserialized {
            assert_eq!(idx, 2);
        } else {
            panic!("Wrong capture mode");
        }
    }

    #[test]
    fn test_capture_mode_clone() {
        let mode = CaptureMode::Monitor(1);
        let cloned = mode.clone();
        if let CaptureMode::Monitor(idx) = cloned {
            assert_eq!(idx, 1);
        } else {
            panic!("Clone failed");
        }
    }

    #[test]
    fn test_capture_mode_debug() {
        let mode = CaptureMode::FullScreen;
        let debug_str = format!("{:?}", mode);
        assert!(debug_str.contains("FullScreen"));
    }

    // ==================== ScreenshotCapture Tests ====================

    #[test]
    fn test_screenshot_capture_new() {
        let capture = ScreenshotCapture::new();
        // Just verify it can be created without panic
        // Note: ScreenshotCapture may be a ZST (zero-sized type) so we just verify construction works
        let _ = &capture;
    }

    #[test]
    fn test_screenshot_capture_default() {
        let capture = ScreenshotCapture::default();
        // Note: ScreenshotCapture may be a ZST (zero-sized type) so we just verify construction works
        let _ = &capture;
    }

    #[test]
    fn test_encode_png_basic() {
        let capture = ScreenshotCapture::new();
        // Create a simple 2x2 red image (RGBA)
        let pixels: Vec<u8> = vec![
            255, 0, 0, 255, // Red pixel
            255, 0, 0, 255, // Red pixel
            255, 0, 0, 255, // Red pixel
            255, 0, 0, 255, // Red pixel
        ];

        let result = capture.encode_png(&pixels, 2, 2);
        assert!(result.is_ok());

        let png_data = result.unwrap();
        // PNG signature starts with specific bytes
        assert!(png_data.len() > 8);
        assert_eq!(png_data[0..8], [137, 80, 78, 71, 13, 10, 26, 10]);
    }

    #[test]
    fn test_encode_png_various_sizes() {
        let capture = ScreenshotCapture::new();

        // Test 1x1
        let pixels = vec![0u8; 4];
        let result = capture.encode_png(&pixels, 1, 1);
        assert!(result.is_ok());

        // Test 10x10
        let pixels = vec![128u8; 10 * 10 * 4];
        let result = capture.encode_png(&pixels, 10, 10);
        assert!(result.is_ok());

        // Test 100x100
        let pixels = vec![255u8; 100 * 100 * 4];
        let result = capture.encode_png(&pixels, 100, 100);
        assert!(result.is_ok());
    }

    #[test]
    fn test_encode_png_transparent() {
        let capture = ScreenshotCapture::new();
        // Semi-transparent blue
        let pixels: Vec<u8> = vec![
            0, 0, 255, 128, 0, 0, 255, 128, 0, 0, 255, 128, 0, 0, 255, 128,
        ];

        let result = capture.encode_png(&pixels, 2, 2);
        assert!(result.is_ok());
    }

    #[test]
    fn test_encode_png_gradient() {
        let capture = ScreenshotCapture::new();
        // Create a simple gradient
        let mut pixels = Vec::with_capacity(4 * 4 * 4);
        for i in 0..16 {
            let v = (i * 16) as u8;
            pixels.extend_from_slice(&[v, v, v, 255]);
        }

        let result = capture.encode_png(&pixels, 4, 4);
        assert!(result.is_ok());
    }

    // ==================== base64_serde Tests ====================

    #[test]
    fn test_screenshot_result_serialization() {
        let result = ScreenshotResult {
            image_data: vec![1, 2, 3, 4, 5],
            metadata: ScreenshotMetadata {
                timestamp: 1234567890,
                width: 100,
                height: 100,
                mode: "fullscreen".to_string(),
                monitor_index: None,
                window_title: None,
                region: None,
                file_path: None,
                ocr_text: None,
            },
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("AQIDBAU=")); // Base64 of [1,2,3,4,5]

        let deserialized: ScreenshotResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.image_data, vec![1, 2, 3, 4, 5]);
        assert_eq!(deserialized.metadata.width, 100);
    }

    #[test]
    fn test_screenshot_result_empty_image() {
        let result = ScreenshotResult {
            image_data: vec![],
            metadata: ScreenshotMetadata {
                timestamp: 0,
                width: 0,
                height: 0,
                mode: "region".to_string(),
                monitor_index: None,
                window_title: None,
                region: None,
                file_path: None,
                ocr_text: None,
            },
        };

        let json = serde_json::to_string(&result).unwrap();
        let deserialized: ScreenshotResult = serde_json::from_str(&json).unwrap();
        assert!(deserialized.image_data.is_empty());
    }

    #[test]
    fn test_screenshot_result_large_data() {
        let large_data: Vec<u8> = (0..1000).map(|i| (i % 256) as u8).collect();
        let result = ScreenshotResult {
            image_data: large_data.clone(),
            metadata: ScreenshotMetadata {
                timestamp: 0,
                width: 100,
                height: 10,
                mode: "window".to_string(),
                monitor_index: Some(0),
                window_title: Some("Test".to_string()),
                region: None,
                file_path: None,
                ocr_text: None,
            },
        };

        let json = serde_json::to_string(&result).unwrap();
        let deserialized: ScreenshotResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.image_data, large_data);
    }

    #[test]
    fn test_screenshot_result_clone() {
        let result = ScreenshotResult {
            image_data: vec![10, 20, 30],
            metadata: ScreenshotMetadata {
                timestamp: 999,
                width: 50,
                height: 50,
                mode: "region".to_string(),
                monitor_index: None,
                window_title: None,
                region: Some(CaptureRegion {
                    x: 0,
                    y: 0,
                    width: 50,
                    height: 50,
                }),
                file_path: None,
                ocr_text: None,
            },
        };

        let cloned = result.clone();
        assert_eq!(cloned.image_data, result.image_data);
        assert_eq!(cloned.metadata.width, result.metadata.width);
    }

    // ==================== Platform-specific Tests ====================

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_capture_screen_not_windows() {
        let capture = ScreenshotCapture::new();
        let result = capture.capture_screen(None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not implemented"));
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_capture_active_window_not_windows() {
        let capture = ScreenshotCapture::new();
        let result = capture.capture_active_window();
        assert!(result.is_err());
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_capture_region_not_windows() {
        let capture = ScreenshotCapture::new();
        let result = capture.capture_region(0, 0, 100, 100);
        assert!(result.is_err());
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_get_monitors_not_windows() {
        let capture = ScreenshotCapture::new();
        let monitors = capture.get_monitors();
        assert!(monitors.is_empty());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_get_monitors_windows() {
        let capture = ScreenshotCapture::new();
        let monitors = capture.get_monitors();
        // Should have at least one monitor on a real system
        // But in CI this might not work, so we just check it doesn't panic
        let _ = monitors.len();
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_capture_region_invalid_dimensions() {
        let capture = ScreenshotCapture::new();

        // Zero width
        let result = capture.capture_region(0, 0, 0, 100);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid capture dimensions"));

        // Zero height
        let result = capture.capture_region(0, 0, 100, 0);
        assert!(result.is_err());
    }
}
