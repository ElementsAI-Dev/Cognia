//! System Scheduler Module
//!
//! Provides cross-platform system-level task scheduling with support for:
//! - Windows Task Scheduler
//! - macOS launchd
//! - Linux systemd
//!
//! Features:
//! - Script execution in sandbox
//! - Cron-style scheduling
//! - On-boot and on-logon triggers
//! - Risk assessment and confirmation
//! - Admin elevation handling

pub mod error;
pub mod service;
pub mod types;

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "linux")]
pub mod linux;

use std::sync::Arc;
use tokio::sync::RwLock;
use log::info;

pub use error::{Result, SchedulerError};
pub use service::SystemScheduler;
pub use types::*;

/// Global scheduler state
pub struct SchedulerState {
    scheduler: Arc<dyn SystemScheduler>,
    /// Tasks pending confirmation (task_id -> confirmation request)
    pending_confirmations: RwLock<std::collections::HashMap<String, TaskConfirmationRequest>>,
}

impl SchedulerState {
    /// Create a new scheduler state with platform-appropriate scheduler
    pub fn new() -> Self {
        let scheduler: Arc<dyn SystemScheduler> = Self::create_platform_scheduler();

        info!(
            "Scheduler state initialized: os={}, backend={}",
            scheduler.capabilities().os,
            scheduler.capabilities().backend
        );

        Self {
            scheduler,
            pending_confirmations: RwLock::new(std::collections::HashMap::new()),
        }
    }

    /// Create the appropriate scheduler for the current platform
    #[cfg(target_os = "windows")]
    fn create_platform_scheduler() -> Arc<dyn SystemScheduler> {
        Arc::new(windows::WindowsScheduler::new())
    }

    #[cfg(target_os = "macos")]
    fn create_platform_scheduler() -> Arc<dyn SystemScheduler> {
        Arc::new(macos::MacOSScheduler::new())
    }

    #[cfg(target_os = "linux")]
    fn create_platform_scheduler() -> Arc<dyn SystemScheduler> {
        Arc::new(linux::LinuxScheduler::new())
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    fn create_platform_scheduler() -> Arc<dyn SystemScheduler> {
        Arc::new(NoopScheduler::new())
    }

    /// Get scheduler capabilities
    pub fn capabilities(&self) -> SchedulerCapabilities {
        self.scheduler.capabilities()
    }

    /// Check if scheduler is available
    pub fn is_available(&self) -> bool {
        self.scheduler.is_available()
    }

    /// Check if running with elevated privileges
    pub fn is_elevated(&self) -> bool {
        self.scheduler.is_elevated()
    }

    /// Check if a task requires admin privileges (delegates to platform scheduler)
    pub fn requires_admin(&self, task: &SystemTask) -> bool {
        self.scheduler.requires_admin(task)
    }

    /// Create a task with confirmation flow
    pub async fn create_task_with_confirmation(
        &self,
        input: CreateSystemTaskInput,
        confirmed: bool,
    ) -> Result<std::result::Result<SystemTask, TaskConfirmationRequest>> {
        // Build a temporary task to assess risk
        let temp_task = SystemTask {
            id: SystemTask::generate_id(),
            name: input.name.clone(),
            description: input.description.clone(),
            trigger: input.trigger.clone(),
            action: input.action.clone(),
            run_level: input.run_level,
            status: SystemTaskStatus::Enabled,
            requires_admin: false,
            tags: input.tags.clone(),
            created_at: None,
            updated_at: None,
            last_run_at: None,
            next_run_at: None,
            last_result: None,
        };

        let requires_admin = temp_task.check_requires_admin();
        let risk_level = temp_task.calculate_risk_level();

        // Check if confirmation is needed
        let needs_confirmation = matches!(risk_level, RiskLevel::High | RiskLevel::Critical)
            || requires_admin
            || matches!(temp_task.action, SystemTaskAction::ExecuteScript { .. });

        if needs_confirmation && !confirmed {
            // Generate confirmation request
            let confirmation = TaskConfirmationRequest {
                task_id: Some(temp_task.id.clone()),
                operation: TaskOperation::Create,
                risk_level,
                requires_admin,
                warnings: temp_task.generate_warnings(),
                details: TaskConfirmationDetails {
                    task_name: temp_task.name.clone(),
                    action_summary: Some(Self::summarize_action(&temp_task.action)),
                    trigger_summary: Some(Self::summarize_trigger(&temp_task.trigger)),
                    script_preview: Self::get_script_preview(&temp_task.action),
                },
            };

            // Store pending confirmation
            {
                let mut pending = self.pending_confirmations.write().await;
                pending.insert(temp_task.id.clone(), confirmation.clone());
            }

            return Ok(Err(confirmation));
        }

        // Check admin requirement
        if requires_admin && !self.is_elevated() {
            return Err(SchedulerError::AdminRequired(
                "Administrator privileges required for this task".to_string(),
            ));
        }

        // Create the task
        let task = self.scheduler.create_task(input).await?;
        Ok(Ok(task))
    }

    /// Confirm a pending task creation
    pub async fn confirm_task(&self, task_id: &str) -> Result<Option<SystemTask>> {
        let confirmation = {
            let mut pending = self.pending_confirmations.write().await;
            pending.remove(task_id)
        };

        if confirmation.is_none() {
            return Ok(None);
        }

        // Task was already prepared, but we need to retrieve the input
        // In practice, you'd store the input alongside the confirmation
        // For now, return None as the frontend should re-submit with confirmed=true
        Ok(None)
    }

    /// Cancel a pending confirmation
    pub async fn cancel_confirmation(&self, task_id: &str) -> bool {
        let mut pending = self.pending_confirmations.write().await;
        pending.remove(task_id).is_some()
    }

    /// Get all pending confirmations
    pub async fn get_pending_confirmations(&self) -> Vec<TaskConfirmationRequest> {
        let pending = self.pending_confirmations.read().await;
        pending.values().cloned().collect()
    }

    /// Update a task
    pub async fn update_task(
        &self,
        id: &str,
        input: CreateSystemTaskInput,
        confirmed: bool,
    ) -> Result<std::result::Result<SystemTask, TaskConfirmationRequest>> {
        // Similar confirmation flow for updates
        let temp_task = SystemTask {
            id: id.to_string(),
            name: input.name.clone(),
            description: input.description.clone(),
            trigger: input.trigger.clone(),
            action: input.action.clone(),
            run_level: input.run_level,
            status: SystemTaskStatus::Enabled,
            requires_admin: false,
            tags: input.tags.clone(),
            created_at: None,
            updated_at: None,
            last_run_at: None,
            next_run_at: None,
            last_result: None,
        };

        let requires_admin = temp_task.check_requires_admin();
        let risk_level = temp_task.calculate_risk_level();

        let needs_confirmation = matches!(risk_level, RiskLevel::High | RiskLevel::Critical)
            || requires_admin;

        if needs_confirmation && !confirmed {
            let confirmation = TaskConfirmationRequest {
                task_id: Some(id.to_string()),
                operation: TaskOperation::Update,
                risk_level,
                requires_admin,
                warnings: temp_task.generate_warnings(),
                details: TaskConfirmationDetails {
                    task_name: temp_task.name.clone(),
                    action_summary: Some(Self::summarize_action(&temp_task.action)),
                    trigger_summary: Some(Self::summarize_trigger(&temp_task.trigger)),
                    script_preview: Self::get_script_preview(&temp_task.action),
                },
            };

            return Ok(Err(confirmation));
        }

        if requires_admin && !self.is_elevated() {
            return Err(SchedulerError::AdminRequired(
                "Administrator privileges required for this task".to_string(),
            ));
        }

        let task = self.scheduler.update_task(id, input).await?;
        Ok(Ok(task))
    }

    /// Delete a task
    pub async fn delete_task(&self, id: &str) -> Result<bool> {
        self.scheduler.delete_task(id).await
    }

    /// Get a task by ID
    pub async fn get_task(&self, id: &str) -> Result<Option<SystemTask>> {
        self.scheduler.get_task(id).await
    }

    /// List all tasks
    pub async fn list_tasks(&self) -> Result<Vec<SystemTask>> {
        self.scheduler.list_tasks().await
    }

    /// Enable a task
    pub async fn enable_task(&self, id: &str) -> Result<bool> {
        self.scheduler.enable_task(id).await
    }

    /// Disable a task
    pub async fn disable_task(&self, id: &str) -> Result<bool> {
        self.scheduler.disable_task(id).await
    }

    /// Run a task immediately
    pub async fn run_task_now(&self, id: &str) -> Result<TaskRunResult> {
        self.scheduler.run_task_now(id).await
    }

    /// Request admin elevation
    pub async fn request_elevation(&self) -> Result<bool> {
        self.scheduler.request_elevation().await
    }

    /// Summarize an action for display
    fn summarize_action(action: &SystemTaskAction) -> String {
        match action {
            SystemTaskAction::ExecuteScript { language, .. } => {
                format!("Execute {} script", language)
            }
            SystemTaskAction::RunCommand { command, args, .. } => {
                if args.is_empty() {
                    format!("Run command: {}", command)
                } else {
                    format!("Run command: {} {}", command, args.join(" "))
                }
            }
            SystemTaskAction::LaunchApp { path, .. } => {
                format!("Launch application: {}", path)
            }
        }
    }

    /// Summarize a trigger for display
    fn summarize_trigger(trigger: &SystemTaskTrigger) -> String {
        match trigger {
            SystemTaskTrigger::Cron { expression, .. } => {
                format!("Cron schedule: {}", expression)
            }
            SystemTaskTrigger::Interval { seconds } => {
                if *seconds < 60 {
                    format!("Every {} seconds", seconds)
                } else if *seconds < 3600 {
                    format!("Every {} minutes", seconds / 60)
                } else {
                    format!("Every {} hours", seconds / 3600)
                }
            }
            SystemTaskTrigger::Once { run_at } => {
                format!("Once at {}", run_at)
            }
            SystemTaskTrigger::OnBoot { delay_seconds } => {
                if *delay_seconds > 0 {
                    format!("On system boot (after {} seconds delay)", delay_seconds)
                } else {
                    "On system boot".to_string()
                }
            }
            SystemTaskTrigger::OnLogon { user } => {
                if let Some(u) = user {
                    format!("On {} logon", u)
                } else {
                    "On user logon".to_string()
                }
            }
            SystemTaskTrigger::OnEvent { source, event_id } => {
                format!("On event {} from {}", event_id, source)
            }
        }
    }

    /// Get script preview (first few lines)
    fn get_script_preview(action: &SystemTaskAction) -> Option<String> {
        if let SystemTaskAction::ExecuteScript { code, .. } = action {
            let lines: Vec<&str> = code.lines().take(5).collect();
            let preview = lines.join("\n");
            if code.lines().count() > 5 {
                Some(format!("{}...", preview))
            } else {
                Some(preview)
            }
        } else {
            None
        }
    }
}

impl Default for SchedulerState {
    fn default() -> Self {
        Self::new()
    }
}

/// No-op scheduler for unsupported platforms
#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
pub struct NoopScheduler;

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
impl NoopScheduler {
    pub fn new() -> Self {
        Self
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
#[async_trait::async_trait]
impl SystemScheduler for NoopScheduler {
    fn capabilities(&self) -> SchedulerCapabilities {
        SchedulerCapabilities {
            os: std::env::consts::OS.to_string(),
            backend: "none".to_string(),
            available: false,
            can_elevate: false,
            supported_triggers: vec![],
            max_tasks: 0,
        }
    }

    fn is_available(&self) -> bool {
        false
    }

    async fn create_task(&self, _input: CreateSystemTaskInput) -> Result<SystemTask> {
        Err(SchedulerError::NotAvailable(
            "System scheduler not available on this platform".to_string(),
        ))
    }

    async fn update_task(&self, _id: &str, _input: CreateSystemTaskInput) -> Result<SystemTask> {
        Err(SchedulerError::NotAvailable(
            "System scheduler not available on this platform".to_string(),
        ))
    }

    async fn delete_task(&self, _id: &str) -> Result<bool> {
        Ok(false)
    }

    async fn get_task(&self, _id: &str) -> Result<Option<SystemTask>> {
        Ok(None)
    }

    async fn list_tasks(&self) -> Result<Vec<SystemTask>> {
        Ok(vec![])
    }

    async fn enable_task(&self, _id: &str) -> Result<bool> {
        Ok(false)
    }

    async fn disable_task(&self, _id: &str) -> Result<bool> {
        Ok(false)
    }

    async fn run_task_now(&self, _id: &str) -> Result<TaskRunResult> {
        Err(SchedulerError::NotAvailable(
            "System scheduler not available on this platform".to_string(),
        ))
    }

    fn requires_admin(&self, _task: &SystemTask) -> bool {
        false
    }

    async fn request_elevation(&self) -> Result<bool> {
        Ok(false)
    }

    fn is_elevated(&self) -> bool {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_id_generation() {
        let id1 = SystemTask::generate_id();
        let id2 = SystemTask::generate_id();
        assert!(id1.starts_with("cognia-task-"));
        assert!(id2.starts_with("cognia-task-"));
        assert_ne!(id1, id2);
    }

    #[test]
    fn test_risk_level_calculation() {
        let task = SystemTask {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: None,
            trigger: SystemTaskTrigger::Interval { seconds: 60 },
            action: SystemTaskAction::RunCommand {
                command: "/usr/bin/echo".to_string(),
                args: vec!["hello".to_string()],
                working_dir: None,
                env: std::collections::HashMap::new(),
            },
            run_level: RunLevel::User,
            status: SystemTaskStatus::Enabled,
            requires_admin: false,
            tags: vec![],
            created_at: None,
            updated_at: None,
            last_run_at: None,
            next_run_at: None,
            last_result: None,
        };

        assert_eq!(task.calculate_risk_level(), RiskLevel::Low);
    }

    #[test]
    fn test_admin_script_is_critical() {
        let task = SystemTask {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: None,
            trigger: SystemTaskTrigger::OnBoot { delay_seconds: 0 },
            action: SystemTaskAction::ExecuteScript {
                language: "python".to_string(),
                code: "print('hello')".to_string(),
                working_dir: None,
                args: vec![],
                env: std::collections::HashMap::new(),
                timeout_secs: 300,
                memory_mb: 512,
                use_sandbox: false,
            },
            run_level: RunLevel::Administrator,
            status: SystemTaskStatus::Enabled,
            requires_admin: true,
            tags: vec![],
            created_at: None,
            updated_at: None,
            last_run_at: None,
            next_run_at: None,
            last_result: None,
        };

        assert_eq!(task.calculate_risk_level(), RiskLevel::Critical);
    }
}
