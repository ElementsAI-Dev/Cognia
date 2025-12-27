//! System state monitoring
//!
//! Monitors system resources and state.

use serde::{Deserialize, Serialize};

/// System state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemState {
    /// CPU usage percentage (0-100)
    pub cpu_usage: f64,
    /// Memory usage in bytes
    pub memory_used: u64,
    /// Total memory in bytes
    pub memory_total: u64,
    /// Memory usage percentage
    pub memory_percent: f64,
    /// Disk usage information
    pub disks: Vec<DiskInfo>,
    /// Network state
    pub network: NetworkState,
    /// Battery state (if applicable)
    pub battery: Option<BatteryState>,
    /// System uptime in seconds
    pub uptime_seconds: u64,
    /// Number of running processes
    pub process_count: u32,
    /// Current power mode
    pub power_mode: PowerMode,
    /// Display state
    pub displays: Vec<DisplayInfo>,
}

/// Disk information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    pub usage_percent: f64,
}

/// Network state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkState {
    pub is_connected: bool,
    pub connection_type: String,
    pub bytes_sent: u64,
    pub bytes_received: u64,
}

/// Battery state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatteryState {
    pub percent: f64,
    pub is_charging: bool,
    pub time_remaining_minutes: Option<u32>,
}

/// Power mode
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PowerMode {
    HighPerformance,
    Balanced,
    PowerSaver,
    Unknown,
}

/// Display information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayInfo {
    pub index: usize,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub refresh_rate: u32,
    pub is_primary: bool,
    pub scale_factor: f64,
}

/// System monitor
pub struct SystemMonitor {
    #[cfg(target_os = "windows")]
    _marker: std::marker::PhantomData<()>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        Self {
            #[cfg(target_os = "windows")]
            _marker: std::marker::PhantomData,
        }
    }

    /// Get current system state
    #[cfg(target_os = "windows")]
    pub fn get_state(&self) -> SystemState {
        SystemState {
            cpu_usage: self.get_cpu_usage(),
            memory_used: self.get_memory_used(),
            memory_total: self.get_memory_total(),
            memory_percent: self.get_memory_percent(),
            disks: self.get_disk_info(),
            network: self.get_network_state(),
            battery: self.get_battery_state(),
            uptime_seconds: self.get_uptime(),
            process_count: self.get_process_count(),
            power_mode: self.get_power_mode(),
            displays: self.get_display_info(),
        }
    }

    #[cfg(target_os = "windows")]
    fn get_cpu_usage(&self) -> f64 {
        // Simplified CPU usage - would need PDH or WMI for accurate reading
        0.0
    }

    #[cfg(target_os = "windows")]
    fn get_memory_used(&self) -> u64 {
        use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
        
        unsafe {
            let mut mem_info = MEMORYSTATUSEX {
                dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
                ..Default::default()
            };
            
            if GlobalMemoryStatusEx(&mut mem_info).is_ok() {
                mem_info.ullTotalPhys - mem_info.ullAvailPhys
            } else {
                0
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn get_memory_total(&self) -> u64 {
        use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
        
        unsafe {
            let mut mem_info = MEMORYSTATUSEX {
                dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
                ..Default::default()
            };
            
            if GlobalMemoryStatusEx(&mut mem_info).is_ok() {
                mem_info.ullTotalPhys
            } else {
                0
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn get_memory_percent(&self) -> f64 {
        let total = self.get_memory_total();
        if total > 0 {
            (self.get_memory_used() as f64 / total as f64) * 100.0
        } else {
            0.0
        }
    }

    #[cfg(target_os = "windows")]
    fn get_disk_info(&self) -> Vec<DiskInfo> {
        use windows::Win32::Storage::FileSystem::{
            GetLogicalDrives, GetDiskFreeSpaceExW, GetVolumeInformationW,
        };
        use windows::core::PCWSTR;

        let mut disks = Vec::new();

        unsafe {
            let drives = GetLogicalDrives();
            
            for i in 0..26 {
                if (drives & (1 << i)) != 0 {
                    let letter = (b'A' + i as u8) as char;
                    let path: Vec<u16> = format!("{}:\\", letter).encode_utf16().chain(std::iter::once(0)).collect();
                    
                    let mut free_bytes: u64 = 0;
                    let mut total_bytes: u64 = 0;
                    let mut total_free: u64 = 0;
                    
                    if GetDiskFreeSpaceExW(
                        PCWSTR(path.as_ptr()),
                        Some(&mut free_bytes),
                        Some(&mut total_bytes),
                        Some(&mut total_free),
                    ).is_ok() {
                        let used = total_bytes - free_bytes;
                        let percent = if total_bytes > 0 {
                            (used as f64 / total_bytes as f64) * 100.0
                        } else {
                            0.0
                        };

                        disks.push(DiskInfo {
                            name: format!("{}:", letter),
                            mount_point: format!("{}:\\", letter),
                            total_bytes,
                            used_bytes: used,
                            free_bytes,
                            usage_percent: percent,
                        });
                    }
                }
            }
        }

        disks
    }

    #[cfg(target_os = "windows")]
    fn get_network_state(&self) -> NetworkState {
        // Simplified network state
        NetworkState {
            is_connected: true,
            connection_type: "Unknown".to_string(),
            bytes_sent: 0,
            bytes_received: 0,
        }
    }

    #[cfg(target_os = "windows")]
    fn get_battery_state(&self) -> Option<BatteryState> {
        use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

        unsafe {
            let mut status = SYSTEM_POWER_STATUS::default();
            if GetSystemPowerStatus(&mut status).is_ok() {
                // Check if battery is present
                if status.BatteryFlag == 128 {
                    // No battery
                    return None;
                }

                let percent = if status.BatteryLifePercent <= 100 {
                    status.BatteryLifePercent as f64
                } else {
                    100.0
                };

                let is_charging = status.ACLineStatus == 1;
                
                let time_remaining = if status.BatteryLifeTime != 0xFFFFFFFF {
                    Some((status.BatteryLifeTime / 60) as u32)
                } else {
                    None
                };

                Some(BatteryState {
                    percent,
                    is_charging,
                    time_remaining_minutes: time_remaining,
                })
            } else {
                None
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn get_uptime(&self) -> u64 {
        use windows::Win32::System::SystemInformation::GetTickCount64;
        
        unsafe {
            GetTickCount64() / 1000
        }
    }

    #[cfg(target_os = "windows")]
    fn get_process_count(&self) -> u32 {
        use windows::Win32::System::ProcessStatus::EnumProcesses;

        unsafe {
            let mut pids = vec![0u32; 1024];
            let mut bytes_returned: u32 = 0;
            
            if EnumProcesses(
                pids.as_mut_ptr(),
                (pids.len() * std::mem::size_of::<u32>()) as u32,
                &mut bytes_returned,
            ).is_ok() {
                bytes_returned / std::mem::size_of::<u32>() as u32
            } else {
                0
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn get_power_mode(&self) -> PowerMode {
        // Would need to query power scheme
        PowerMode::Balanced
    }

    #[cfg(target_os = "windows")]
    fn get_display_info(&self) -> Vec<DisplayInfo> {
        use windows::Win32::Foundation::{BOOL, LPARAM, RECT};
        use windows::Win32::Graphics::Gdi::{
            EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFOEXW,
        };

        let mut displays = Vec::new();

        unsafe extern "system" fn enum_callback(
            monitor: HMONITOR,
            _hdc: HDC,
            _rect: *mut RECT,
            lparam: LPARAM,
        ) -> BOOL {
            let displays = &mut *(lparam.0 as *mut Vec<DisplayInfo>);

            let mut info = MONITORINFOEXW {
                monitorInfo: windows::Win32::Graphics::Gdi::MONITORINFO {
                    cbSize: std::mem::size_of::<MONITORINFOEXW>() as u32,
                    ..Default::default()
                },
                ..Default::default()
            };

            if GetMonitorInfoW(monitor, &mut info.monitorInfo).as_bool() {
                let rect = info.monitorInfo.rcMonitor;
                let is_primary = (info.monitorInfo.dwFlags & 1) != 0;

                let name = String::from_utf16_lossy(
                    &info.szDevice[..info.szDevice.iter().position(|&c| c == 0).unwrap_or(info.szDevice.len())],
                );

                displays.push(DisplayInfo {
                    index: displays.len(),
                    name,
                    width: (rect.right - rect.left) as u32,
                    height: (rect.bottom - rect.top) as u32,
                    refresh_rate: 60, // Would need EnumDisplaySettings for actual rate
                    is_primary,
                    scale_factor: 1.0, // Would need GetDpiForMonitor
                });
            }

            BOOL(1)
        }

        unsafe {
            let _ = EnumDisplayMonitors(
                HDC::default(),
                None,
                Some(enum_callback),
                LPARAM(&mut displays as *mut _ as isize),
            );
        }

        displays
    }

    // Non-Windows implementations
    #[cfg(not(target_os = "windows"))]
    pub fn get_state(&self) -> SystemState {
        SystemState {
            cpu_usage: 0.0,
            memory_used: 0,
            memory_total: 0,
            memory_percent: 0.0,
            disks: Vec::new(),
            network: NetworkState {
                is_connected: false,
                connection_type: "Unknown".to_string(),
                bytes_sent: 0,
                bytes_received: 0,
            },
            battery: None,
            uptime_seconds: 0,
            process_count: 0,
            power_mode: PowerMode::Unknown,
            displays: Vec::new(),
        }
    }
}

impl Default for SystemMonitor {
    fn default() -> Self {
        Self::new()
    }
}
