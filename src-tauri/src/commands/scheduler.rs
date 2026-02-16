//! Tauri commands for system scheduler
//!
//! Provides commands for creating, managing, and executing system-level scheduled tasks.

use log::{debug, error, info};
use tauri::State;

use crate::scheduler::{
    CreateSystemTaskInput, SchedulerCapabilities, SchedulerState, SystemTask, SystemTaskId,
    TaskConfirmationRequest, TaskRunResult,
};

/// Response type for operations that may require confirmation
#[derive(serde::Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum TaskOperationResponse {
    /// Operation completed successfully
    Success { task: Box<SystemTask> },
    /// Confirmation required before proceeding
    ConfirmationRequired {
        confirmation: TaskConfirmationRequest,
    },
    /// Operation failed
    Error { message: String },
}

/// Get scheduler capabilities for the current platform
#[tauri::command]
pub fn scheduler_get_capabilities(state: State<'_, SchedulerState>) -> SchedulerCapabilities {
    state.capabilities()
}

/// Check if the system scheduler is available
#[tauri::command]
pub fn scheduler_is_available(state: State<'_, SchedulerState>) -> bool {
    state.is_available()
}

/// Check if running with elevated privileges
#[tauri::command]
pub fn scheduler_is_elevated(state: State<'_, SchedulerState>) -> bool {
    state.is_elevated()
}

/// Create a new system task
///
/// If confirmation is required (high-risk operations), returns ConfirmationRequired.
/// Set `confirmed` to true after user confirmation.
#[tauri::command]
pub async fn scheduler_create_task(
    state: State<'_, SchedulerState>,
    input: CreateSystemTaskInput,
    confirmed: bool,
) -> Result<TaskOperationResponse, String> {
    debug!(
        "Creating system task: name={}, confirmed={}",
        input.name, confirmed
    );

    match state.create_task_with_confirmation(input, confirmed).await {
        Ok(Ok(task)) => {
            info!("System task created successfully: {}", task.id);
            Ok(TaskOperationResponse::Success {
                task: Box::new(task),
            })
        }
        Ok(Err(confirmation)) => {
            debug!("Task creation requires confirmation: {:?}", confirmation);
            Ok(TaskOperationResponse::ConfirmationRequired { confirmation })
        }
        Err(e) => {
            error!("Failed to create system task: {}", e);
            Ok(TaskOperationResponse::Error {
                message: e.to_string(),
            })
        }
    }
}

/// Update an existing system task
#[tauri::command]
pub async fn scheduler_update_task(
    state: State<'_, SchedulerState>,
    task_id: SystemTaskId,
    input: CreateSystemTaskInput,
    confirmed: bool,
) -> Result<TaskOperationResponse, String> {
    debug!(
        "Updating system task: id={}, confirmed={}",
        task_id, confirmed
    );

    match state.update_task(&task_id, input, confirmed).await {
        Ok(Ok(task)) => {
            info!("System task updated successfully: {}", task.id);
            Ok(TaskOperationResponse::Success {
                task: Box::new(task),
            })
        }
        Ok(Err(confirmation)) => {
            debug!("Task update requires confirmation: {:?}", confirmation);
            Ok(TaskOperationResponse::ConfirmationRequired { confirmation })
        }
        Err(e) => {
            error!("Failed to update system task: {}", e);
            Ok(TaskOperationResponse::Error {
                message: e.to_string(),
            })
        }
    }
}

/// Delete a system task
#[tauri::command]
pub async fn scheduler_delete_task(
    state: State<'_, SchedulerState>,
    task_id: SystemTaskId,
) -> Result<bool, String> {
    debug!("Deleting system task: {}", task_id);

    match state.delete_task(&task_id).await {
        Ok(deleted) => {
            if deleted {
                info!("System task deleted: {}", task_id);
            }
            Ok(deleted)
        }
        Err(e) => {
            error!("Failed to delete system task: {}", e);
            Err(e.to_string())
        }
    }
}

/// Get a system task by ID
#[tauri::command]
pub async fn scheduler_get_task(
    state: State<'_, SchedulerState>,
    task_id: SystemTaskId,
) -> Result<Option<SystemTask>, String> {
    match state.get_task(&task_id).await {
        Ok(task) => Ok(task),
        Err(e) => {
            error!("Failed to get system task: {}", e);
            Err(e.to_string())
        }
    }
}

/// List all Cognia-managed system tasks
#[tauri::command]
pub async fn scheduler_list_tasks(
    state: State<'_, SchedulerState>,
) -> Result<Vec<SystemTask>, String> {
    match state.list_tasks().await {
        Ok(tasks) => {
            debug!("Listed {} system tasks", tasks.len());
            Ok(tasks)
        }
        Err(e) => {
            error!("Failed to list system tasks: {}", e);
            Err(e.to_string())
        }
    }
}

/// Enable a system task
#[tauri::command]
pub async fn scheduler_enable_task(
    state: State<'_, SchedulerState>,
    task_id: SystemTaskId,
) -> Result<bool, String> {
    debug!("Enabling system task: {}", task_id);

    match state.enable_task(&task_id).await {
        Ok(success) => {
            if success {
                info!("System task enabled: {}", task_id);
            }
            Ok(success)
        }
        Err(e) => {
            error!("Failed to enable system task: {}", e);
            Err(e.to_string())
        }
    }
}

/// Disable a system task
#[tauri::command]
pub async fn scheduler_disable_task(
    state: State<'_, SchedulerState>,
    task_id: SystemTaskId,
) -> Result<bool, String> {
    debug!("Disabling system task: {}", task_id);

    match state.disable_task(&task_id).await {
        Ok(success) => {
            if success {
                info!("System task disabled: {}", task_id);
            }
            Ok(success)
        }
        Err(e) => {
            error!("Failed to disable system task: {}", e);
            Err(e.to_string())
        }
    }
}

/// Run a system task immediately
#[tauri::command]
pub async fn scheduler_run_task_now(
    state: State<'_, SchedulerState>,
    task_id: SystemTaskId,
) -> Result<TaskRunResult, String> {
    debug!("Running system task now: {}", task_id);

    match state.run_task_now(&task_id).await {
        Ok(result) => {
            info!(
                "System task run completed: id={}, success={}",
                task_id, result.success
            );
            Ok(result)
        }
        Err(e) => {
            error!("Failed to run system task: {}", e);
            Err(e.to_string())
        }
    }
}

/// Cancel a pending confirmation
#[tauri::command]
pub async fn scheduler_cancel_confirmation(
    state: State<'_, SchedulerState>,
    task_id: SystemTaskId,
) -> Result<bool, String> {
    Ok(state.cancel_confirmation(&task_id).await)
}

/// Get all pending confirmations
#[tauri::command]
pub async fn scheduler_get_pending_confirmations(
    state: State<'_, SchedulerState>,
) -> Result<Vec<TaskConfirmationRequest>, String> {
    Ok(state.get_pending_confirmations().await)
}

/// Request admin elevation
#[tauri::command]
pub async fn scheduler_request_elevation(state: State<'_, SchedulerState>) -> Result<bool, String> {
    match state.request_elevation().await {
        Ok(elevated) => Ok(elevated),
        Err(e) => Err(e.to_string()),
    }
}

/// Confirm a pending task operation
#[tauri::command]
pub async fn scheduler_confirm_task(
    state: State<'_, SchedulerState>,
    task_id: SystemTaskId,
) -> Result<Option<SystemTask>, String> {
    debug!("Confirming pending task: {}", task_id);

    match state.confirm_task(&task_id).await {
        Ok(task) => {
            if task.is_some() {
                info!("Task confirmed: {}", task_id);
            }
            Ok(task)
        }
        Err(e) => {
            error!("Failed to confirm task: {}", e);
            Err(e.to_string())
        }
    }
}

/// Validate a system task input without creating it
#[tauri::command]
pub fn scheduler_validate_task(
    state: State<'_, SchedulerState>,
    input: CreateSystemTaskInput,
) -> Result<ValidationResult, String> {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    // Validate name
    if input.name.is_empty() {
        errors.push("Task name is required".to_string());
    } else if input.name.len() > 255 {
        errors.push("Task name must be 255 characters or less".to_string());
    }

    // Validate trigger
    match &input.trigger {
        crate::scheduler::SystemTaskTrigger::Cron { expression, .. } => {
            if expression.split_whitespace().count() != 5 {
                errors.push("Cron expression must have exactly 5 fields".to_string());
            }
        }
        crate::scheduler::SystemTaskTrigger::Interval { seconds } => {
            if *seconds < 60 {
                warnings.push(
                    "Intervals less than 60 seconds may impact system performance".to_string(),
                );
            }
        }
        crate::scheduler::SystemTaskTrigger::Once { run_at } => {
            if crate::scheduler::service::parse_datetime(run_at).is_none() {
                errors.push("Invalid datetime format for run_at".to_string());
            }
        }
        _ => {}
    }

    // Validate action
    match &input.action {
        crate::scheduler::SystemTaskAction::ExecuteScript { language, code, .. } => {
            if code.is_empty() {
                errors.push("Script code cannot be empty".to_string());
            }
            if language.is_empty() {
                errors.push("Script language is required".to_string());
            }
            // Security warning for scripts
            warnings.push(
                "Scripts will be executed with the privileges specified. Review carefully."
                    .to_string(),
            );
        }
        crate::scheduler::SystemTaskAction::RunCommand { command, .. } => {
            if command.is_empty() {
                errors.push("Command cannot be empty".to_string());
            }
        }
        crate::scheduler::SystemTaskAction::LaunchApp { path, .. } => {
            if path.is_empty() {
                errors.push("Application path cannot be empty".to_string());
            }
        }
    }

    // Build temporary task to calculate risk
    let temp_task = crate::scheduler::SystemTask {
        id: "validation".to_string(),
        name: input.name.clone(),
        description: input.description.clone(),
        trigger: input.trigger.clone(),
        action: input.action.clone(),
        run_level: input.run_level,
        status: crate::scheduler::SystemTaskStatus::Enabled,
        requires_admin: false,
        tags: input.tags.clone(),
        created_at: None,
        updated_at: None,
        last_run_at: None,
        next_run_at: None,
        last_result: None,
    };

    let risk_level = temp_task.calculate_risk_level();
    let requires_admin = temp_task.check_requires_admin() || state.requires_admin(&temp_task);
    warnings.extend(temp_task.generate_warnings());

    Ok(ValidationResult {
        valid: errors.is_empty(),
        errors,
        warnings,
        risk_level,
        requires_admin,
    })
}

/// Validation result
#[derive(serde::Serialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub risk_level: crate::scheduler::RiskLevel,
    pub requires_admin: bool,
}
