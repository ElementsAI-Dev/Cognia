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
        use windows::Win32::Foundation::{HWND, RECT};
        use windows::Win32::Graphics::Gdi::{
            BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject,
            GetDC, GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER,
            BI_RGB, DIB_RGB_COLORS, SRCCOPY,
        };
        use windows::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN};

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
        use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowRect, GetWindowTextW};

        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.0 == std::ptr::null_mut() {
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
    pub fn capture_region(&self, x: i32, y: i32, width: u32, height: u32) -> Result<ScreenshotResult, String> {
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
            BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject,
            GetDC, GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER,
            BI_RGB, DIB_RGB_COLORS, SRCCOPY,
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
            let result = BitBlt(mem_dc, 0, 0, width as i32, height as i32, screen_dc, x, y, SRCCOPY);
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
                    Some(CaptureRegion { x, y, width, height })
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
                let work_rect = info.monitorInfo.rcWork;
                let is_primary = (info.monitorInfo.dwFlags & 1) != 0; // MONITORINFOF_PRIMARY

                let name = String::from_utf16_lossy(
                    &info.szDevice[..info.szDevice.iter().position(|&c| c == 0).unwrap_or(info.szDevice.len())],
                );

                monitors.push(MonitorInfo {
                    index: monitors.len(),
                    name,
                    x: rect.left,
                    y: rect.top,
                    width: (rect.right - rect.left) as u32,
                    height: (rect.bottom - rect.top) as u32,
                    is_primary,
                    scale_factor: 1.0, // TODO: Get actual DPI scale
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
    pub fn capture_screen(&self, _monitor_index: Option<usize>) -> Result<ScreenshotResult, String> {
        Err("Screenshot not implemented for this platform".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn capture_active_window(&self) -> Result<ScreenshotResult, String> {
        Err("Screenshot not implemented for this platform".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn capture_region(&self, _x: i32, _y: i32, _width: u32, _height: u32) -> Result<ScreenshotResult, String> {
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
