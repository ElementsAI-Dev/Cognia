//! Plugin Performance Metrics
//!
//! Provides performance monitoring and metrics collection for plugins.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

/// Execution timing information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionTiming {
    /// Total execution time in milliseconds
    pub total_ms: u64,
    /// Minimum execution time
    pub min_ms: u64,
    /// Maximum execution time
    pub max_ms: u64,
    /// Average execution time
    pub avg_ms: f64,
    /// Number of executions
    pub count: u64,
}

/// Tool execution metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolMetrics {
    /// Tool name
    pub tool_name: String,
    /// Plugin ID
    pub plugin_id: String,
    /// Successful calls
    pub success_count: u64,
    /// Failed calls
    pub error_count: u64,
    /// Timing information
    pub timing: ExecutionTiming,
    /// Last execution timestamp (Unix ms)
    pub last_execution_ms: u64,
}

/// Plugin resource usage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginResourceUsage {
    /// Memory usage in bytes (estimated)
    pub memory_bytes: u64,
    /// CPU time in milliseconds
    pub cpu_time_ms: u64,
    /// Network bytes sent
    pub network_bytes_sent: u64,
    /// Network bytes received
    pub network_bytes_received: u64,
    /// File operations count
    pub file_ops_count: u64,
}

/// Plugin health status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PluginHealthStatus {
    /// Plugin is healthy
    Healthy,
    /// Plugin has warnings
    Warning,
    /// Plugin is degraded
    Degraded,
    /// Plugin is unhealthy
    Unhealthy,
}

/// Plugin health check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginHealthCheck {
    /// Plugin ID
    pub plugin_id: String,
    /// Health status
    pub status: PluginHealthStatus,
    /// Response time in milliseconds
    pub response_time_ms: u64,
    /// Error rate (0.0 - 1.0)
    pub error_rate: f64,
    /// Warnings
    pub warnings: Vec<String>,
    /// Last check timestamp (Unix ms)
    pub last_check_ms: u64,
}

/// Plugin metrics summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginMetricsSummary {
    /// Plugin ID
    pub plugin_id: String,
    /// Total tool calls
    pub total_calls: u64,
    /// Total errors
    pub total_errors: u64,
    /// Error rate (0.0 - 1.0)
    pub error_rate: f64,
    /// Average response time in milliseconds
    pub avg_response_time_ms: f64,
    /// Resource usage
    pub resource_usage: PluginResourceUsage,
    /// Health status
    pub health_status: PluginHealthStatus,
    /// Uptime in seconds
    pub uptime_seconds: u64,
}

/// Internal counter for atomic metrics
struct AtomicCounter {
    value: AtomicU64,
}

impl AtomicCounter {
    fn new() -> Self {
        Self {
            value: AtomicU64::new(0),
        }
    }

    fn increment(&self) -> u64 {
        self.value.fetch_add(1, Ordering::Relaxed)
    }

    fn add(&self, value: u64) -> u64 {
        self.value.fetch_add(value, Ordering::Relaxed)
    }

    fn get(&self) -> u64 {
        self.value.load(Ordering::Relaxed)
    }
}

/// Internal timing tracker
struct TimingTracker {
    total_ms: AtomicU64,
    min_ms: AtomicU64,
    max_ms: AtomicU64,
    count: AtomicU64,
}

impl TimingTracker {
    fn new() -> Self {
        Self {
            total_ms: AtomicU64::new(0),
            min_ms: AtomicU64::new(u64::MAX),
            max_ms: AtomicU64::new(0),
            count: AtomicU64::new(0),
        }
    }

    fn record(&self, duration_ms: u64) {
        self.total_ms.fetch_add(duration_ms, Ordering::Relaxed);
        self.count.fetch_add(1, Ordering::Relaxed);
        
        // Update min
        loop {
            let current = self.min_ms.load(Ordering::Relaxed);
            if duration_ms >= current {
                break;
            }
            if self.min_ms.compare_exchange_weak(current, duration_ms, Ordering::Relaxed, Ordering::Relaxed).is_ok() {
                break;
            }
        }
        
        // Update max
        loop {
            let current = self.max_ms.load(Ordering::Relaxed);
            if duration_ms <= current {
                break;
            }
            if self.max_ms.compare_exchange_weak(current, duration_ms, Ordering::Relaxed, Ordering::Relaxed).is_ok() {
                break;
            }
        }
    }

    fn get_timing(&self) -> ExecutionTiming {
        let count = self.count.load(Ordering::Relaxed);
        let total = self.total_ms.load(Ordering::Relaxed);
        let min = self.min_ms.load(Ordering::Relaxed);
        let max = self.max_ms.load(Ordering::Relaxed);
        
        ExecutionTiming {
            total_ms: total,
            min_ms: if min == u64::MAX { 0 } else { min },
            max_ms: max,
            avg_ms: if count > 0 { total as f64 / count as f64 } else { 0.0 },
            count,
        }
    }
}

/// Plugin metrics collector
pub struct PluginMetricsCollector {
    /// Tool metrics by (plugin_id, tool_name)
    tool_metrics: HashMap<(String, String), ToolMetricsInternal>,
    /// Plugin load times
    plugin_load_times: HashMap<String, Instant>,
    /// Resource usage by plugin
    resource_usage: HashMap<String, PluginResourceUsageInternal>,
}

struct ToolMetricsInternal {
    plugin_id: String,
    tool_name: String,
    success_count: AtomicCounter,
    error_count: AtomicCounter,
    timing: TimingTracker,
    last_execution_ms: AtomicU64,
}

struct PluginResourceUsageInternal {
    memory_bytes: AtomicCounter,
    cpu_time_ms: AtomicCounter,
    network_bytes_sent: AtomicCounter,
    network_bytes_received: AtomicCounter,
    file_ops_count: AtomicCounter,
}

impl PluginMetricsCollector {
    /// Create a new metrics collector
    pub fn new() -> Self {
        Self {
            tool_metrics: HashMap::new(),
            plugin_load_times: HashMap::new(),
            resource_usage: HashMap::new(),
        }
    }

    /// Record plugin load
    pub fn record_plugin_load(&mut self, plugin_id: &str) {
        self.plugin_load_times.insert(plugin_id.to_string(), Instant::now());
        self.resource_usage.insert(plugin_id.to_string(), PluginResourceUsageInternal {
            memory_bytes: AtomicCounter::new(),
            cpu_time_ms: AtomicCounter::new(),
            network_bytes_sent: AtomicCounter::new(),
            network_bytes_received: AtomicCounter::new(),
            file_ops_count: AtomicCounter::new(),
        });
    }

    /// Record plugin unload
    pub fn record_plugin_unload(&mut self, plugin_id: &str) {
        self.plugin_load_times.remove(plugin_id);
        self.resource_usage.remove(plugin_id);
        // Remove tool metrics for this plugin
        self.tool_metrics.retain(|(pid, _), _| pid != plugin_id);
    }

    /// Record a tool call
    pub fn record_tool_call(
        &mut self,
        plugin_id: &str,
        tool_name: &str,
        duration: Duration,
        success: bool,
    ) {
        let key = (plugin_id.to_string(), tool_name.to_string());
        
        let metrics = self.tool_metrics.entry(key).or_insert_with(|| {
            ToolMetricsInternal {
                plugin_id: plugin_id.to_string(),
                tool_name: tool_name.to_string(),
                success_count: AtomicCounter::new(),
                error_count: AtomicCounter::new(),
                timing: TimingTracker::new(),
                last_execution_ms: AtomicU64::new(0),
            }
        });

        if success {
            metrics.success_count.increment();
        } else {
            metrics.error_count.increment();
        }

        metrics.timing.record(duration.as_millis() as u64);
        metrics.last_execution_ms.store(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            Ordering::Relaxed,
        );
    }

    /// Record network usage
    pub fn record_network_usage(&self, plugin_id: &str, bytes_sent: u64, bytes_received: u64) {
        if let Some(usage) = self.resource_usage.get(plugin_id) {
            usage.network_bytes_sent.add(bytes_sent);
            usage.network_bytes_received.add(bytes_received);
        }
    }

    /// Record file operation
    pub fn record_file_operation(&self, plugin_id: &str) {
        if let Some(usage) = self.resource_usage.get(plugin_id) {
            usage.file_ops_count.increment();
        }
    }

    /// Record memory usage
    pub fn record_memory_usage(&self, plugin_id: &str, bytes: u64) {
        if let Some(usage) = self.resource_usage.get(plugin_id) {
            usage.memory_bytes.add(bytes);
        }
    }

    /// Get tool metrics
    pub fn get_tool_metrics(&self, plugin_id: &str, tool_name: &str) -> Option<ToolMetrics> {
        let key = (plugin_id.to_string(), tool_name.to_string());
        self.tool_metrics.get(&key).map(|m| ToolMetrics {
            tool_name: m.tool_name.clone(),
            plugin_id: m.plugin_id.clone(),
            success_count: m.success_count.get(),
            error_count: m.error_count.get(),
            timing: m.timing.get_timing(),
            last_execution_ms: m.last_execution_ms.load(Ordering::Relaxed),
        })
    }

    /// Get all tool metrics for a plugin
    pub fn get_plugin_tool_metrics(&self, plugin_id: &str) -> Vec<ToolMetrics> {
        self.tool_metrics
            .iter()
            .filter(|((pid, _), _)| pid == plugin_id)
            .map(|(_, m)| ToolMetrics {
                tool_name: m.tool_name.clone(),
                plugin_id: m.plugin_id.clone(),
                success_count: m.success_count.get(),
                error_count: m.error_count.get(),
                timing: m.timing.get_timing(),
                last_execution_ms: m.last_execution_ms.load(Ordering::Relaxed),
            })
            .collect()
    }

    /// Get resource usage for a plugin
    pub fn get_resource_usage(&self, plugin_id: &str) -> Option<PluginResourceUsage> {
        self.resource_usage.get(plugin_id).map(|u| PluginResourceUsage {
            memory_bytes: u.memory_bytes.get(),
            cpu_time_ms: u.cpu_time_ms.get(),
            network_bytes_sent: u.network_bytes_sent.get(),
            network_bytes_received: u.network_bytes_received.get(),
            file_ops_count: u.file_ops_count.get(),
        })
    }

    /// Get plugin uptime in seconds
    pub fn get_plugin_uptime(&self, plugin_id: &str) -> Option<u64> {
        self.plugin_load_times
            .get(plugin_id)
            .map(|t| t.elapsed().as_secs())
    }

    /// Get plugin metrics summary
    pub fn get_metrics_summary(&self, plugin_id: &str) -> Option<PluginMetricsSummary> {
        let uptime = self.get_plugin_uptime(plugin_id)?;
        let resource_usage = self.get_resource_usage(plugin_id)?;
        let tool_metrics = self.get_plugin_tool_metrics(plugin_id);

        let total_calls: u64 = tool_metrics.iter().map(|m| m.success_count + m.error_count).sum();
        let total_errors: u64 = tool_metrics.iter().map(|m| m.error_count).sum();
        let total_time: u64 = tool_metrics.iter().map(|m| m.timing.total_ms).sum();

        let error_rate = if total_calls > 0 {
            total_errors as f64 / total_calls as f64
        } else {
            0.0
        };

        let avg_response_time = if total_calls > 0 {
            total_time as f64 / total_calls as f64
        } else {
            0.0
        };

        let health_status = self.calculate_health_status(error_rate, avg_response_time);

        Some(PluginMetricsSummary {
            plugin_id: plugin_id.to_string(),
            total_calls,
            total_errors,
            error_rate,
            avg_response_time_ms: avg_response_time,
            resource_usage,
            health_status,
            uptime_seconds: uptime,
        })
    }

    /// Perform health check for a plugin
    pub fn perform_health_check(&self, plugin_id: &str) -> Option<PluginHealthCheck> {
        let summary = self.get_metrics_summary(plugin_id)?;
        let mut warnings = Vec::new();

        if summary.error_rate > 0.1 {
            warnings.push(format!("High error rate: {:.1}%", summary.error_rate * 100.0));
        }

        if summary.avg_response_time_ms > 1000.0 {
            warnings.push(format!("Slow response time: {:.0}ms", summary.avg_response_time_ms));
        }

        if summary.resource_usage.memory_bytes > 100 * 1024 * 1024 {
            warnings.push("High memory usage".to_string());
        }

        Some(PluginHealthCheck {
            plugin_id: plugin_id.to_string(),
            status: summary.health_status,
            response_time_ms: summary.avg_response_time_ms as u64,
            error_rate: summary.error_rate,
            warnings,
            last_check_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        })
    }

    /// Calculate health status based on metrics
    fn calculate_health_status(&self, error_rate: f64, avg_response_time: f64) -> PluginHealthStatus {
        if error_rate > 0.5 || avg_response_time > 10000.0 {
            PluginHealthStatus::Unhealthy
        } else if error_rate > 0.2 || avg_response_time > 5000.0 {
            PluginHealthStatus::Degraded
        } else if error_rate > 0.05 || avg_response_time > 2000.0 {
            PluginHealthStatus::Warning
        } else {
            PluginHealthStatus::Healthy
        }
    }
}

impl Default for PluginMetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_collector_new() {
        let collector = PluginMetricsCollector::new();
        assert!(collector.tool_metrics.is_empty());
        assert!(collector.plugin_load_times.is_empty());
    }

    #[test]
    fn test_record_plugin_load() {
        let mut collector = PluginMetricsCollector::new();
        collector.record_plugin_load("test-plugin");
        
        assert!(collector.plugin_load_times.contains_key("test-plugin"));
        assert!(collector.resource_usage.contains_key("test-plugin"));
    }

    #[test]
    fn test_record_plugin_unload() {
        let mut collector = PluginMetricsCollector::new();
        collector.record_plugin_load("test-plugin");
        collector.record_plugin_unload("test-plugin");
        
        assert!(!collector.plugin_load_times.contains_key("test-plugin"));
        assert!(!collector.resource_usage.contains_key("test-plugin"));
    }

    #[test]
    fn test_record_tool_call() {
        let mut collector = PluginMetricsCollector::new();
        collector.record_plugin_load("test-plugin");
        
        collector.record_tool_call("test-plugin", "my_tool", Duration::from_millis(100), true);
        collector.record_tool_call("test-plugin", "my_tool", Duration::from_millis(200), true);
        collector.record_tool_call("test-plugin", "my_tool", Duration::from_millis(150), false);
        
        let metrics = collector.get_tool_metrics("test-plugin", "my_tool").unwrap();
        assert_eq!(metrics.success_count, 2);
        assert_eq!(metrics.error_count, 1);
        assert_eq!(metrics.timing.count, 3);
    }

    #[test]
    fn test_execution_timing() {
        let tracker = TimingTracker::new();
        tracker.record(100);
        tracker.record(200);
        tracker.record(150);
        
        let timing = tracker.get_timing();
        assert_eq!(timing.count, 3);
        assert_eq!(timing.total_ms, 450);
        assert_eq!(timing.min_ms, 100);
        assert_eq!(timing.max_ms, 200);
        assert!((timing.avg_ms - 150.0).abs() < 0.01);
    }

    #[test]
    fn test_plugin_uptime() {
        let mut collector = PluginMetricsCollector::new();
        collector.record_plugin_load("test-plugin");
        
        std::thread::sleep(Duration::from_millis(10));
        
        let uptime = collector.get_plugin_uptime("test-plugin");
        assert!(uptime.is_some());
    }

    #[test]
    fn test_health_status_healthy() {
        let collector = PluginMetricsCollector::new();
        let status = collector.calculate_health_status(0.01, 500.0);
        assert_eq!(status, PluginHealthStatus::Healthy);
    }

    #[test]
    fn test_health_status_warning() {
        let collector = PluginMetricsCollector::new();
        let status = collector.calculate_health_status(0.1, 2500.0);
        assert_eq!(status, PluginHealthStatus::Warning);
    }

    #[test]
    fn test_health_status_degraded() {
        let collector = PluginMetricsCollector::new();
        let status = collector.calculate_health_status(0.3, 6000.0);
        assert_eq!(status, PluginHealthStatus::Degraded);
    }

    #[test]
    fn test_health_status_unhealthy() {
        let collector = PluginMetricsCollector::new();
        let status = collector.calculate_health_status(0.6, 15000.0);
        assert_eq!(status, PluginHealthStatus::Unhealthy);
    }

    #[test]
    fn test_metrics_summary() {
        let mut collector = PluginMetricsCollector::new();
        collector.record_plugin_load("test-plugin");
        collector.record_tool_call("test-plugin", "tool1", Duration::from_millis(100), true);
        collector.record_tool_call("test-plugin", "tool1", Duration::from_millis(100), false);
        
        let summary = collector.get_metrics_summary("test-plugin").unwrap();
        assert_eq!(summary.total_calls, 2);
        assert_eq!(summary.total_errors, 1);
        assert!((summary.error_rate - 0.5).abs() < 0.01);
    }
}
