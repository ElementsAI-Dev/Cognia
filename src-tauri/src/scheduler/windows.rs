//! Windows Task Scheduler implementation
//!
//! Uses schtasks.exe command-line tool for compatibility.
//! For production, consider using Windows COM API via windows-rs crate.

// cfg(target_os = "windows") is already applied at module level in mod.rs

use async_trait::async_trait;
use log::{debug, error, info, warn};
use std::process::Command;

use super::error::{Result, SchedulerError};
use super::service::{generate_task_name, is_cognia_task, now_iso, SystemScheduler, TASK_PREFIX};
use super::types::{
    CreateSystemTaskInput, RunLevel, SchedulerCapabilities, SystemTask, SystemTaskAction,
    SystemTaskStatus, SystemTaskTrigger, TaskRunResult,
};

/// Windows Task Scheduler implementation
pub struct WindowsScheduler {
    /// Whether the scheduler is available
    available: bool,
    /// Whether running elevated
    elevated: bool,
}

impl WindowsScheduler {
    /// Create a new Windows scheduler instance
    pub fn new() -> Self {
        let available = Self::check_schtasks_available();
        let elevated = Self::check_elevated();

        info!(
            "Windows scheduler initialized: available={}, elevated={}",
            available, elevated
        );

        Self {
            available,
            elevated,
        }
    }

    /// Check if schtasks.exe is available
    fn check_schtasks_available() -> bool {
        Command::new("schtasks")
            .arg("/Query")
            .arg("/TN")
            .arg("\\")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    /// Check if running with elevated privileges
    fn check_elevated() -> bool {
        // Try to query SYSTEM folder - only works if elevated
        Command::new("schtasks")
            .args(["/Query", "/TN", "\\Microsoft\\Windows\\"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    /// Convert trigger to schtasks schedule parameters
    fn trigger_to_schtasks_args(trigger: &SystemTaskTrigger) -> Result<Vec<String>> {
        match trigger {
            SystemTaskTrigger::Cron { expression, .. } => {
                // Parse cron and convert to schtasks format
                // schtasks supports: MINUTE, HOURLY, DAILY, WEEKLY, MONTHLY, ONCE, ONSTART, ONLOGON
                Self::cron_to_schtasks(expression)
            }
            SystemTaskTrigger::Interval { seconds } => {
                let minutes = (*seconds / 60).max(1);
                Ok(vec![
                    "/SC".to_string(),
                    "MINUTE".to_string(),
                    "/MO".to_string(),
                    minutes.to_string(),
                ])
            }
            SystemTaskTrigger::Once { run_at } => {
                // Parse datetime and extract date/time
                let dt = chrono::DateTime::parse_from_rfc3339(run_at).map_err(|e| {
                    SchedulerError::InvalidConfig(format!("Invalid datetime: {}", e))
                })?;
                Ok(vec![
                    "/SC".to_string(),
                    "ONCE".to_string(),
                    "/SD".to_string(),
                    dt.format("%m/%d/%Y").to_string(),
                    "/ST".to_string(),
                    dt.format("%H:%M").to_string(),
                ])
            }
            SystemTaskTrigger::OnBoot { delay_seconds } => {
                let mut args = vec!["/SC".to_string(), "ONSTART".to_string()];
                if *delay_seconds > 0 {
                    args.push("/DELAY".to_string());
                    let mins = (*delay_seconds / 60).max(1);
                    args.push(format!("0000:{:02}:00", mins.min(59)));
                }
                Ok(args)
            }
            SystemTaskTrigger::OnLogon { user } => {
                let mut args = vec!["/SC".to_string(), "ONLOGON".to_string()];
                if let Some(u) = user {
                    args.push("/RU".to_string());
                    args.push(u.clone());
                }
                Ok(args)
            }
            SystemTaskTrigger::OnEvent { source, event_id } => {
                // ONEVENT requires XML task definition, use workaround
                warn!("OnEvent trigger requires XML, falling back to manual setup");
                Err(SchedulerError::InvalidConfig(format!(
                    "OnEvent trigger (source={}, id={}) requires manual XML configuration",
                    source, event_id
                )))
            }
        }
    }

    /// Convert simplified cron expression to schtasks format
    fn cron_to_schtasks(expression: &str) -> Result<Vec<String>> {
        let parts: Vec<&str> = expression.split_whitespace().collect();
        if parts.len() != 5 {
            return Err(SchedulerError::InvalidCron(format!(
                "Expected 5 parts, got {}",
                parts.len()
            )));
        }

        let (minute, hour, dom, _month, dow) = (parts[0], parts[1], parts[2], parts[3], parts[4]);

        // Common patterns
        match (minute, hour, dom, dow) {
            // Every minute
            ("*", "*", "*", "*") => Ok(vec!["/SC".to_string(), "MINUTE".to_string()]),
            // Every N minutes
            (m, "*", "*", "*") if m.starts_with("*/") => {
                let interval: u32 = m[2..].parse().map_err(|_| {
                    SchedulerError::InvalidCron("Invalid minute interval".to_string())
                })?;
                Ok(vec![
                    "/SC".to_string(),
                    "MINUTE".to_string(),
                    "/MO".to_string(),
                    interval.to_string(),
                ])
            }
            // Every hour at specific minute
            (m, "*", "*", "*") if m.parse::<u32>().is_ok() => Ok(vec![
                "/SC".to_string(),
                "HOURLY".to_string(),
                "/ST".to_string(),
                format!("00:{:02}", m.parse::<u32>().unwrap()),
            ]),
            // Daily at specific time
            (m, h, "*", "*") if m.parse::<u32>().is_ok() && h.parse::<u32>().is_ok() => Ok(vec![
                "/SC".to_string(),
                "DAILY".to_string(),
                "/ST".to_string(),
                format!(
                    "{:02}:{:02}",
                    h.parse::<u32>().unwrap(),
                    m.parse::<u32>().unwrap()
                ),
            ]),
            // Weekly on specific days
            (m, h, "*", days) if m.parse::<u32>().is_ok() && h.parse::<u32>().is_ok() => {
                let day_str = Self::convert_dow(days)?;
                Ok(vec![
                    "/SC".to_string(),
                    "WEEKLY".to_string(),
                    "/D".to_string(),
                    day_str,
                    "/ST".to_string(),
                    format!(
                        "{:02}:{:02}",
                        h.parse::<u32>().unwrap(),
                        m.parse::<u32>().unwrap()
                    ),
                ])
            }
            // Monthly on specific day
            (m, h, day, "*")
                if m.parse::<u32>().is_ok()
                    && h.parse::<u32>().is_ok()
                    && day.parse::<u32>().is_ok() =>
            {
                Ok(vec![
                    "/SC".to_string(),
                    "MONTHLY".to_string(),
                    "/D".to_string(),
                    day.to_string(),
                    "/ST".to_string(),
                    format!(
                        "{:02}:{:02}",
                        h.parse::<u32>().unwrap(),
                        m.parse::<u32>().unwrap()
                    ),
                ])
            }
            _ => Err(SchedulerError::InvalidCron(format!(
                "Unsupported cron pattern: {}",
                expression
            ))),
        }
    }

    /// Convert cron day-of-week to schtasks format
    fn convert_dow(dow: &str) -> Result<String> {
        if dow == "*" {
            return Ok("*".to_string());
        }

        let days: Vec<&str> = if dow.contains(',') {
            dow.split(',').collect()
        } else if dow.contains('-') {
            // Range like 1-5 (Mon-Fri)
            let parts: Vec<&str> = dow.split('-').collect();
            if parts.len() != 2 {
                return Err(SchedulerError::InvalidCron("Invalid day range".to_string()));
            }
            let start: u32 = parts[0]
                .parse()
                .map_err(|_| SchedulerError::InvalidCron("Invalid day number".to_string()))?;
            let end: u32 = parts[1]
                .parse()
                .map_err(|_| SchedulerError::InvalidCron("Invalid day number".to_string()))?;
            return Ok((start..=end)
                .map(Self::num_to_day)
                .collect::<Vec<_>>()
                .join(","));
        } else {
            vec![dow]
        };

        let converted: Vec<String> = days
            .iter()
            .map(|d| {
                if let Ok(num) = d.parse::<u32>() {
                    Self::num_to_day(num)
                } else {
                    d.to_uppercase()
                }
            })
            .collect();

        Ok(converted.join(","))
    }

    /// Convert numeric day (0-6, Sunday=0) to schtasks format
    fn num_to_day(num: u32) -> String {
        match num {
            0 | 7 => "SUN".to_string(),
            1 => "MON".to_string(),
            2 => "TUE".to_string(),
            3 => "WED".to_string(),
            4 => "THU".to_string(),
            5 => "FRI".to_string(),
            6 => "SAT".to_string(),
            _ => "MON".to_string(),
        }
    }

    /// Build the action command for schtasks
    fn build_action_command(action: &SystemTaskAction) -> Result<(String, Vec<String>)> {
        match action {
            SystemTaskAction::ExecuteScript {
                language,
                code,
                working_dir,
                args,
                env,
                timeout_secs,
                memory_mb,
                use_sandbox,
            } => {
                // For scripts, we invoke Cognia's sandbox executor
                // The script is passed via a temporary file or base64 encoded
                let code_b64 =
                    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, code);

                // Build command to invoke Cognia with script execution
                // Using PowerShell to handle complex arguments
                let mut ps_args = vec![
                    "-NoProfile".to_string(),
                    "-ExecutionPolicy".to_string(),
                    "Bypass".to_string(),
                    "-Command".to_string(),
                ];

                let sandbox_flag = if *use_sandbox {
                    "--sandbox"
                } else {
                    "--native"
                };
                let cognia_cmd = format!(
                    "& '{}' execute-script --language {} {} --timeout {} --memory {} --code-b64 '{}'",
                    Self::get_cognia_exe_path(),
                    language,
                    sandbox_flag,
                    timeout_secs,
                    memory_mb,
                    code_b64
                );

                // Add environment variables
                let env_setup: String = env
                    .iter()
                    .map(|(k, v)| format!("$env:{}='{}'; ", k, v.replace("'", "''")))
                    .collect();

                // Add working directory
                let cd_cmd = working_dir
                    .as_ref()
                    .map(|d| format!("Set-Location '{}'; ", d))
                    .unwrap_or_default();

                // Add additional args
                let extra_args: String = args
                    .iter()
                    .map(|a| format!(" '{}'", a.replace("'", "''")))
                    .collect();

                ps_args.push(format!(
                    "{}{}{}{}",
                    env_setup, cd_cmd, cognia_cmd, extra_args
                ));

                Ok(("powershell.exe".to_string(), ps_args))
            }
            SystemTaskAction::RunCommand {
                command,
                args,
                working_dir,
                env,
            } => {
                // For commands, use cmd.exe wrapper for env and directory handling
                let mut cmd_parts = vec![];

                // Set environment variables
                for (k, v) in env {
                    cmd_parts.push(format!("set {}={}", k, v));
                }

                // Change directory
                if let Some(dir) = working_dir {
                    cmd_parts.push(format!("cd /d \"{}\"", dir));
                }

                // Add the actual command
                let full_cmd = if args.is_empty() {
                    command.clone()
                } else {
                    format!("{} {}", command, args.join(" "))
                };
                cmd_parts.push(full_cmd);

                let cmd_line = cmd_parts.join(" && ");

                Ok(("cmd.exe".to_string(), vec!["/C".to_string(), cmd_line]))
            }
            SystemTaskAction::LaunchApp { path, args } => Ok((path.clone(), args.clone())),
        }
    }

    /// Get path to Cognia executable
    fn get_cognia_exe_path() -> String {
        std::env::current_exe()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| "cognia.exe".to_string())
    }

    /// Parse schtasks /Query output to extract task info
    fn parse_task_query(output: &str, task_name: &str) -> Option<SystemTask> {
        // Basic parsing of schtasks output
        let mut status = SystemTaskStatus::Unknown;
        let mut next_run = None;
        let mut last_run = None;

        for line in output.lines() {
            let line = line.trim();
            if line.starts_with("Status:") {
                let s = line.trim_start_matches("Status:").trim();
                status = match s {
                    "Ready" => SystemTaskStatus::Enabled,
                    "Running" => SystemTaskStatus::Running,
                    "Disabled" => SystemTaskStatus::Disabled,
                    _ => SystemTaskStatus::Unknown,
                };
            } else if line.starts_with("Next Run Time:") {
                let t = line.trim_start_matches("Next Run Time:").trim();
                if t != "N/A" {
                    next_run = Some(t.to_string());
                }
            } else if line.starts_with("Last Run Time:") {
                let t = line.trim_start_matches("Last Run Time:").trim();
                if t != "N/A" {
                    last_run = Some(t.to_string());
                }
            }
        }

        // Extract actual name from full path
        let name = task_name
            .trim_start_matches('\\')
            .trim_start_matches(TASK_PREFIX)
            .to_string();

        Some(SystemTask {
            id: task_name.to_string(),
            name,
            description: None,
            trigger: SystemTaskTrigger::Interval { seconds: 0 }, // Cannot determine from query
            action: SystemTaskAction::RunCommand {
                command: String::new(),
                args: vec![],
                working_dir: None,
                env: std::collections::HashMap::new(),
            },
            run_level: RunLevel::User,
            status,
            requires_admin: false,
            tags: vec![],
            created_at: None,
            updated_at: None,
            last_run_at: last_run,
            next_run_at: next_run,
            last_result: None,
        })
    }
}

impl Default for WindowsScheduler {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl SystemScheduler for WindowsScheduler {
    fn capabilities(&self) -> SchedulerCapabilities {
        SchedulerCapabilities {
            os: "windows".to_string(),
            backend: "Task Scheduler".to_string(),
            available: self.available,
            can_elevate: true,
            supported_triggers: vec![
                "cron".to_string(),
                "interval".to_string(),
                "once".to_string(),
                "on_boot".to_string(),
                "on_logon".to_string(),
            ],
            max_tasks: 0, // Unlimited
        }
    }

    fn is_available(&self) -> bool {
        self.available
    }

    async fn create_task(&self, input: CreateSystemTaskInput) -> Result<SystemTask> {
        if !self.available {
            return Err(SchedulerError::NotAvailable(
                "Task Scheduler not available".to_string(),
            ));
        }

        let task_name = generate_task_name(&input.name);
        let full_name = format!("\\{}", task_name);

        // Check if task already exists
        let check = Command::new("schtasks")
            .args(["/Query", "/TN", &full_name])
            .output()?;

        if check.status.success() {
            return Err(SchedulerError::TaskAlreadyExists(task_name));
        }

        // Build command arguments
        let mut args = vec!["/Create".to_string(), "/TN".to_string(), full_name.clone()];

        // Add trigger arguments
        let trigger_args = Self::trigger_to_schtasks_args(&input.trigger)?;
        args.extend(trigger_args);

        // Add action
        let (program, prog_args) = Self::build_action_command(&input.action)?;
        args.push("/TR".to_string());
        if prog_args.is_empty() {
            args.push(format!("\"{}\"", program));
        } else {
            args.push(format!("\"{}\" {}", program, prog_args.join(" ")));
        }

        // Run level
        if input.run_level == RunLevel::Administrator {
            args.push("/RL".to_string());
            args.push("HIGHEST".to_string());
        }

        // Force create (overwrite)
        args.push("/F".to_string());

        debug!("Creating task with args: {:?}", args);

        let output = Command::new("schtasks").args(&args).output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("Failed to create task: {}", stderr);

            if stderr.contains("Access is denied") {
                return Err(SchedulerError::AdminRequired(
                    "Administrator privileges required to create this task".to_string(),
                ));
            }

            return Err(SchedulerError::Platform(stderr.to_string()));
        }

        info!("Created system task: {}", task_name);

        // Build and return task object
        let mut task = SystemTask {
            id: full_name,
            name: input.name,
            description: input.description,
            trigger: input.trigger,
            action: input.action,
            run_level: input.run_level,
            status: SystemTaskStatus::Enabled,
            requires_admin: false,
            tags: input.tags,
            created_at: Some(now_iso()),
            updated_at: Some(now_iso()),
            last_run_at: None,
            next_run_at: None,
            last_result: None,
        };

        task.requires_admin = task.check_requires_admin();

        Ok(task)
    }

    async fn update_task(&self, id: &str, input: CreateSystemTaskInput) -> Result<SystemTask> {
        // Delete and recreate (schtasks doesn't have a proper update)
        self.delete_task(id).await?;
        self.create_task(input).await
    }

    async fn delete_task(&self, id: &str) -> Result<bool> {
        if !self.available {
            return Err(SchedulerError::NotAvailable(
                "Task Scheduler not available".to_string(),
            ));
        }

        let output = Command::new("schtasks")
            .args(["/Delete", "/TN", id, "/F"])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("does not exist") {
                return Ok(false);
            }
            if stderr.contains("Access is denied") {
                return Err(SchedulerError::AdminRequired(
                    "Administrator privileges required to delete this task".to_string(),
                ));
            }
            return Err(SchedulerError::Platform(stderr.to_string()));
        }

        info!("Deleted system task: {}", id);
        Ok(true)
    }

    async fn get_task(&self, id: &str) -> Result<Option<SystemTask>> {
        if !self.available {
            return Err(SchedulerError::NotAvailable(
                "Task Scheduler not available".to_string(),
            ));
        }

        let output = Command::new("schtasks")
            .args(["/Query", "/TN", id, "/V", "/FO", "LIST"])
            .output()?;

        if !output.status.success() {
            return Ok(None);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(Self::parse_task_query(&stdout, id))
    }

    async fn list_tasks(&self) -> Result<Vec<SystemTask>> {
        if !self.available {
            return Err(SchedulerError::NotAvailable(
                "Task Scheduler not available".to_string(),
            ));
        }

        let output = Command::new("schtasks")
            .args(["/Query", "/FO", "LIST"])
            .output()?;

        if !output.status.success() {
            return Ok(vec![]);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut tasks = Vec::new();

        // Parse output to find Cognia tasks
        let mut current_task_name = String::new();
        for line in stdout.lines() {
            if line.starts_with("TaskName:") {
                current_task_name = line.trim_start_matches("TaskName:").trim().to_string();
            } else if !current_task_name.is_empty() && is_cognia_task(&current_task_name) {
                // Get detailed info for this task
                if let Ok(Some(task)) = self.get_task(&current_task_name).await {
                    tasks.push(task);
                }
                current_task_name.clear();
            }
        }

        Ok(tasks)
    }

    async fn enable_task(&self, id: &str) -> Result<bool> {
        let output = Command::new("schtasks")
            .args(["/Change", "/TN", id, "/ENABLE"])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(SchedulerError::Platform(stderr.to_string()));
        }

        Ok(true)
    }

    async fn disable_task(&self, id: &str) -> Result<bool> {
        let output = Command::new("schtasks")
            .args(["/Change", "/TN", id, "/DISABLE"])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(SchedulerError::Platform(stderr.to_string()));
        }

        Ok(true)
    }

    async fn run_task_now(&self, id: &str) -> Result<TaskRunResult> {
        let start = std::time::Instant::now();

        let output = Command::new("schtasks")
            .args(["/Run", "/TN", id])
            .output()?;

        let duration_ms = start.elapsed().as_millis() as u64;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Ok(TaskRunResult {
                success: false,
                exit_code: output.status.code(),
                stdout: None,
                stderr: Some(stderr.to_string()),
                error: Some(stderr.to_string()),
                duration_ms: Some(duration_ms),
            });
        }

        Ok(TaskRunResult {
            success: true,
            exit_code: Some(0),
            stdout: Some(String::from_utf8_lossy(&output.stdout).to_string()),
            stderr: None,
            error: None,
            duration_ms: Some(duration_ms),
        })
    }

    fn requires_admin(&self, task: &SystemTask) -> bool {
        task.check_requires_admin()
    }

    async fn request_elevation(&self) -> Result<bool> {
        // On Windows, we need to restart the process with elevation
        // This is typically done via ShellExecuteW with "runas" verb
        // For now, return false and let the UI handle elevation request
        warn!("Elevation request - application restart required");
        Err(SchedulerError::AdminRequired(
            "Please restart Cognia as Administrator to perform this operation".to_string(),
        ))
    }

    fn is_elevated(&self) -> bool {
        self.elevated
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cron_to_schtasks_every_minute() {
        let result = WindowsScheduler::cron_to_schtasks("* * * * *");
        assert!(result.is_ok());
        let args = result.unwrap();
        assert!(args.contains(&"MINUTE".to_string()));
    }

    #[test]
    fn test_cron_to_schtasks_every_5_minutes() {
        let result = WindowsScheduler::cron_to_schtasks("*/5 * * * *");
        assert!(result.is_ok());
        let args = result.unwrap();
        assert!(args.contains(&"MINUTE".to_string()));
        assert!(args.contains(&"5".to_string()));
    }

    #[test]
    fn test_cron_to_schtasks_daily() {
        let result = WindowsScheduler::cron_to_schtasks("0 9 * * *");
        assert!(result.is_ok());
        let args = result.unwrap();
        assert!(args.contains(&"DAILY".to_string()));
        assert!(args.contains(&"09:00".to_string()));
    }

    #[test]
    fn test_generate_task_name() {
        assert_eq!(generate_task_name("My Task"), "Cognia_My_Task");
        assert_eq!(generate_task_name("test-task"), "Cognia_test-task");
    }

    #[test]
    fn test_is_cognia_task() {
        assert!(is_cognia_task("Cognia_MyTask"));
        assert!(!is_cognia_task("OtherTask"));
    }
}
