//! System state monitoring
//!
//! Monitors system resources and state.

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use sysinfo::Networks;

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
    sys: Mutex<sysinfo::System>,
    networks: Mutex<Networks>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        log::debug!("Creating new SystemMonitor");
        let mut sys = sysinfo::System::new_all();
        // Initial CPU refresh so the first real call returns meaningful data
        sys.refresh_cpu_all();
        Self {
            sys: Mutex::new(sys),
            networks: Mutex::new(Networks::new_with_refreshed_list()),
        }
    }

    /// Get current system state
    pub fn get_state(&self) -> SystemState {
        log::trace!("Retrieving system state");
        let state = SystemState {
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
        };
        log::trace!(
            "System state: cpu={:.1}%, mem={:.1}%, processes={}",
            state.cpu_usage,
            state.memory_percent,
            state.process_count
        );
        state
    }

    fn get_cpu_usage(&self) -> f64 {
        use sysinfo::CpuRefreshKind;
        let mut sys = self.sys.lock();
        sys.refresh_cpu_specifics(CpuRefreshKind::nothing().with_cpu_usage());
        let usage = sys.global_cpu_usage() as f64;
        // Clamp to valid range
        usage.clamp(0.0, 100.0)
    }

    fn get_memory_used(&self) -> u64 {
        let mut sys = self.sys.lock();
        sys.refresh_memory();
        sys.used_memory()
    }

    fn get_memory_total(&self) -> u64 {
        let sys = self.sys.lock();
        sys.total_memory()
    }

    fn get_memory_percent(&self) -> f64 {
        let total = self.get_memory_total();
        if total > 0 {
            (self.get_memory_used() as f64 / total as f64) * 100.0
        } else {
            0.0
        }
    }

    fn get_disk_info(&self) -> Vec<DiskInfo> {
        use sysinfo::Disks;
        let disks_list = Disks::new_with_refreshed_list();
        disks_list
            .iter()
            .map(|d| {
                let total = d.total_space();
                let available = d.available_space();
                let used = total.saturating_sub(available);
                let percent = if total > 0 {
                    (used as f64 / total as f64) * 100.0
                } else {
                    0.0
                };
                DiskInfo {
                    name: d.name().to_string_lossy().to_string(),
                    mount_point: d.mount_point().to_string_lossy().to_string(),
                    total_bytes: total,
                    used_bytes: used,
                    free_bytes: available,
                    usage_percent: percent,
                }
            })
            .collect()
    }

    fn get_network_state(&self) -> NetworkState {
        let mut networks = self.networks.lock();
        networks.refresh(true);

        let mut total_sent: u64 = 0;
        let mut total_received: u64 = 0;
        let mut has_interface = false;
        let mut iface_name = String::new();

        for (name, data) in networks.iter() {
            has_interface = true;
            total_sent += data.total_transmitted();
            total_received += data.total_received();
            // Pick first non-loopback interface name as connection type hint
            if iface_name.is_empty() && !name.to_lowercase().contains("loopback") && !name.starts_with("lo") {
                iface_name = name.clone();
            }
        }

        let connection_type = if iface_name.is_empty() {
            "Unknown".to_string()
        } else {
            iface_name
        };

        NetworkState {
            is_connected: has_interface && (total_received > 0 || total_sent > 0),
            connection_type,
            bytes_sent: total_sent,
            bytes_received: total_received,
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
                    Some(status.BatteryLifeTime / 60)
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

    fn get_uptime(&self) -> u64 {
        sysinfo::System::uptime()
    }

    fn get_process_count(&self) -> u32 {
        use sysinfo::ProcessRefreshKind;
        let mut sys = self.sys.lock();
        sys.refresh_processes_specifics(
            sysinfo::ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing(),
        );
        sys.processes().len() as u32
    }

    #[cfg(target_os = "windows")]
    fn get_power_mode(&self) -> PowerMode {
        use windows::Win32::System::Power::GetSystemPowerStatus;
        use windows::Win32::System::Power::SYSTEM_POWER_STATUS;

        unsafe {
            let mut status = SYSTEM_POWER_STATUS::default();
            if GetSystemPowerStatus(&mut status).is_ok() {
                // ACLineStatus: 0 = offline (battery), 1 = online (AC)
                // SystemStatusFlag: 0 = no power saver, 1 = power saver active
                if status.SystemStatusFlag == 1 {
                    PowerMode::PowerSaver
                } else if status.ACLineStatus == 1 {
                    // On AC power — assume high performance or balanced
                    PowerMode::HighPerformance
                } else {
                    PowerMode::Balanced
                }
            } else {
                PowerMode::Unknown
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    fn get_power_mode(&self) -> PowerMode {
        PowerMode::Unknown
    }

    #[cfg(target_os = "windows")]
    fn get_display_info(&self) -> Vec<DisplayInfo> {
        use windows::Win32::Foundation::{BOOL, LPARAM, RECT};
        use windows::Win32::Graphics::Gdi::{EnumDisplayMonitors, HDC, HMONITOR};

        let mut displays = Vec::new();

        unsafe extern "system" fn enum_callback(
            monitor: HMONITOR,
            _hdc: HDC,
            _rect: *mut RECT,
            lparam: LPARAM,
        ) -> BOOL {
            use windows::Win32::Graphics::Gdi::{
                EnumDisplaySettingsW, MONITORINFOEXW, DEVMODEW, ENUM_CURRENT_SETTINGS,
            };
            use windows::Win32::UI::HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI};
            use windows::Win32::Graphics::Gdi::GetMonitorInfoW;
            use windows::core::PCWSTR;

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
                    &info.szDevice[..info
                        .szDevice
                        .iter()
                        .position(|&c| c == 0)
                        .unwrap_or(info.szDevice.len())],
                );

                // Get real refresh rate via EnumDisplaySettingsW
                let mut devmode = DEVMODEW {
                    dmSize: std::mem::size_of::<DEVMODEW>() as u16,
                    ..Default::default()
                };
                let refresh_rate = if EnumDisplaySettingsW(
                    PCWSTR(info.szDevice.as_ptr()),
                    ENUM_CURRENT_SETTINGS,
                    &mut devmode,
                ).as_bool() {
                    devmode.dmDisplayFrequency
                } else {
                    60
                };

                // Get real DPI / scale factor via GetDpiForMonitor
                let mut dpi_x: u32 = 96;
                let mut dpi_y: u32 = 96;
                let _ = GetDpiForMonitor(monitor, MDT_EFFECTIVE_DPI, &mut dpi_x, &mut dpi_y);
                let scale_factor = dpi_x as f64 / 96.0;

                displays.push(DisplayInfo {
                    index: displays.len(),
                    name,
                    width: (rect.right - rect.left) as u32,
                    height: (rect.bottom - rect.top) as u32,
                    refresh_rate,
                    is_primary,
                    scale_factor,
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

    #[cfg(not(target_os = "windows"))]
    fn get_display_info(&self) -> Vec<DisplayInfo> {
        Vec::new()
    }

    #[cfg(not(target_os = "windows"))]
    fn get_battery_state(&self) -> Option<BatteryState> {
        None
    }
}

impl Default for SystemMonitor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_monitor_new() {
        let monitor = SystemMonitor::new();
        // Should create without panicking
        let _ = monitor;
    }

    #[test]
    fn test_system_monitor_default() {
        let monitor = SystemMonitor::default();
        let _ = monitor;
    }

    #[test]
    fn test_get_state() {
        let monitor = SystemMonitor::new();
        let state = monitor.get_state();

        // Memory total should be >= used
        assert!(state.memory_total >= state.memory_used);
        // Memory percent should be in valid range
        assert!(state.memory_percent >= 0.0 && state.memory_percent <= 100.0);
        // CPU usage should be in valid range
        assert!(state.cpu_usage >= 0.0 && state.cpu_usage <= 100.0);
    }

    #[test]
    fn test_system_state_serialization() {
        let state = SystemState {
            cpu_usage: 25.5,
            memory_used: 8_000_000_000,
            memory_total: 16_000_000_000,
            memory_percent: 50.0,
            disks: vec![DiskInfo {
                name: "C:".to_string(),
                mount_point: "C:\\".to_string(),
                total_bytes: 500_000_000_000,
                used_bytes: 250_000_000_000,
                free_bytes: 250_000_000_000,
                usage_percent: 50.0,
            }],
            network: NetworkState {
                is_connected: true,
                connection_type: "WiFi".to_string(),
                bytes_sent: 1000,
                bytes_received: 2000,
            },
            battery: Some(BatteryState {
                percent: 75.0,
                is_charging: true,
                time_remaining_minutes: Some(120),
            }),
            uptime_seconds: 3600,
            process_count: 150,
            power_mode: PowerMode::Balanced,
            displays: vec![DisplayInfo {
                index: 0,
                name: "Primary".to_string(),
                width: 1920,
                height: 1080,
                refresh_rate: 60,
                is_primary: true,
                scale_factor: 1.0,
            }],
        };

        let json = serde_json::to_string(&state);
        assert!(json.is_ok());

        let parsed: Result<SystemState, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());

        let parsed_state = parsed.unwrap();
        assert_eq!(parsed_state.cpu_usage, 25.5);
        assert_eq!(parsed_state.memory_percent, 50.0);
    }

    #[test]
    fn test_disk_info_serialization() {
        let disk = DiskInfo {
            name: "D:".to_string(),
            mount_point: "D:\\".to_string(),
            total_bytes: 1_000_000_000_000,
            used_bytes: 500_000_000_000,
            free_bytes: 500_000_000_000,
            usage_percent: 50.0,
        };

        let json = serde_json::to_string(&disk);
        assert!(json.is_ok());

        let parsed: Result<DiskInfo, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
        assert_eq!(parsed.unwrap().name, "D:");
    }

    #[test]
    fn test_network_state_serialization() {
        let network = NetworkState {
            is_connected: true,
            connection_type: "Ethernet".to_string(),
            bytes_sent: 1024,
            bytes_received: 2048,
        };

        let json = serde_json::to_string(&network);
        assert!(json.is_ok());

        let parsed: Result<NetworkState, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
        assert!(parsed.unwrap().is_connected);
    }

    #[test]
    fn test_battery_state_serialization() {
        let battery = BatteryState {
            percent: 80.0,
            is_charging: false,
            time_remaining_minutes: Some(90),
        };

        let json = serde_json::to_string(&battery);
        assert!(json.is_ok());

        let parsed: Result<BatteryState, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
        assert_eq!(parsed.unwrap().percent, 80.0);
    }

    #[test]
    fn test_battery_state_no_time_remaining() {
        let battery = BatteryState {
            percent: 100.0,
            is_charging: true,
            time_remaining_minutes: None,
        };

        let json = serde_json::to_string(&battery);
        assert!(json.is_ok());

        let parsed: Result<BatteryState, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
        assert!(parsed.unwrap().time_remaining_minutes.is_none());
    }

    #[test]
    fn test_power_mode_serialization() {
        let modes = vec![
            PowerMode::HighPerformance,
            PowerMode::Balanced,
            PowerMode::PowerSaver,
            PowerMode::Unknown,
        ];

        for mode in modes {
            let json = serde_json::to_string(&mode);
            assert!(json.is_ok());

            let parsed: Result<PowerMode, _> = serde_json::from_str(&json.unwrap());
            assert!(parsed.is_ok());
        }
    }

    #[test]
    fn test_power_mode_equality() {
        assert_eq!(PowerMode::Balanced, PowerMode::Balanced);
        assert_ne!(PowerMode::Balanced, PowerMode::PowerSaver);
        assert_ne!(PowerMode::HighPerformance, PowerMode::Unknown);
    }

    #[test]
    fn test_display_info_serialization() {
        let display = DisplayInfo {
            index: 0,
            name: "DISPLAY1".to_string(),
            width: 2560,
            height: 1440,
            refresh_rate: 144,
            is_primary: true,
            scale_factor: 1.25,
        };

        let json = serde_json::to_string(&display);
        assert!(json.is_ok());

        let parsed: Result<DisplayInfo, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());

        let parsed_display = parsed.unwrap();
        assert_eq!(parsed_display.width, 2560);
        assert_eq!(parsed_display.height, 1440);
        assert!(parsed_display.is_primary);
    }

    #[test]
    fn test_system_state_clone() {
        let state = SystemState {
            cpu_usage: 30.0,
            memory_used: 4_000_000_000,
            memory_total: 8_000_000_000,
            memory_percent: 50.0,
            disks: Vec::new(),
            network: NetworkState {
                is_connected: false,
                connection_type: "None".to_string(),
                bytes_sent: 0,
                bytes_received: 0,
            },
            battery: None,
            uptime_seconds: 7200,
            process_count: 50,
            power_mode: PowerMode::PowerSaver,
            displays: Vec::new(),
        };

        let cloned = state.clone();
        assert_eq!(cloned.cpu_usage, state.cpu_usage);
        assert_eq!(cloned.memory_percent, state.memory_percent);
        assert_eq!(cloned.uptime_seconds, state.uptime_seconds);
    }

    #[test]
    fn test_system_state_debug() {
        let state = SystemState {
            cpu_usage: 10.0,
            memory_used: 1_000_000_000,
            memory_total: 2_000_000_000,
            memory_percent: 50.0,
            disks: Vec::new(),
            network: NetworkState {
                is_connected: true,
                connection_type: "WiFi".to_string(),
                bytes_sent: 0,
                bytes_received: 0,
            },
            battery: None,
            uptime_seconds: 100,
            process_count: 10,
            power_mode: PowerMode::Balanced,
            displays: Vec::new(),
        };

        let debug_str = format!("{:?}", state);
        assert!(debug_str.contains("cpu_usage"));
        assert!(debug_str.contains("memory_percent"));
    }

    #[test]
    fn test_disk_info_clone() {
        let disk = DiskInfo {
            name: "E:".to_string(),
            mount_point: "E:\\".to_string(),
            total_bytes: 100,
            used_bytes: 50,
            free_bytes: 50,
            usage_percent: 50.0,
        };

        let cloned = disk.clone();
        assert_eq!(cloned.name, disk.name);
        assert_eq!(cloned.total_bytes, disk.total_bytes);
    }

    #[test]
    fn test_network_state_clone() {
        let network = NetworkState {
            is_connected: true,
            connection_type: "5G".to_string(),
            bytes_sent: 500,
            bytes_received: 1000,
        };

        let cloned = network.clone();
        assert_eq!(cloned.connection_type, "5G");
        assert_eq!(cloned.bytes_received, 1000);
    }

    #[test]
    fn test_display_info_clone() {
        let display = DisplayInfo {
            index: 1,
            name: "Secondary".to_string(),
            width: 1920,
            height: 1080,
            refresh_rate: 60,
            is_primary: false,
            scale_factor: 1.0,
        };

        let cloned = display.clone();
        assert_eq!(cloned.index, 1);
        assert!(!cloned.is_primary);
    }

    #[test]
    fn test_system_state_with_multiple_disks() {
        let state = SystemState {
            cpu_usage: 0.0,
            memory_used: 0,
            memory_total: 0,
            memory_percent: 0.0,
            disks: vec![
                DiskInfo {
                    name: "C:".to_string(),
                    mount_point: "C:\\".to_string(),
                    total_bytes: 500_000_000_000,
                    used_bytes: 250_000_000_000,
                    free_bytes: 250_000_000_000,
                    usage_percent: 50.0,
                },
                DiskInfo {
                    name: "D:".to_string(),
                    mount_point: "D:\\".to_string(),
                    total_bytes: 1_000_000_000_000,
                    used_bytes: 100_000_000_000,
                    free_bytes: 900_000_000_000,
                    usage_percent: 10.0,
                },
            ],
            network: NetworkState {
                is_connected: true,
                connection_type: "WiFi".to_string(),
                bytes_sent: 0,
                bytes_received: 0,
            },
            battery: None,
            uptime_seconds: 0,
            process_count: 0,
            power_mode: PowerMode::Balanced,
            displays: Vec::new(),
        };

        assert_eq!(state.disks.len(), 2);
        assert_eq!(state.disks[0].name, "C:");
        assert_eq!(state.disks[1].name, "D:");
    }

    #[test]
    fn test_system_state_with_multiple_displays() {
        let state = SystemState {
            cpu_usage: 0.0,
            memory_used: 0,
            memory_total: 0,
            memory_percent: 0.0,
            disks: Vec::new(),
            network: NetworkState {
                is_connected: true,
                connection_type: "Ethernet".to_string(),
                bytes_sent: 0,
                bytes_received: 0,
            },
            battery: None,
            uptime_seconds: 0,
            process_count: 0,
            power_mode: PowerMode::HighPerformance,
            displays: vec![
                DisplayInfo {
                    index: 0,
                    name: "Primary".to_string(),
                    width: 2560,
                    height: 1440,
                    refresh_rate: 165,
                    is_primary: true,
                    scale_factor: 1.0,
                },
                DisplayInfo {
                    index: 1,
                    name: "Secondary".to_string(),
                    width: 1920,
                    height: 1080,
                    refresh_rate: 60,
                    is_primary: false,
                    scale_factor: 1.0,
                },
            ],
        };

        assert_eq!(state.displays.len(), 2);
        assert!(state.displays[0].is_primary);
        assert!(!state.displays[1].is_primary);
    }
}
