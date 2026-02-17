use std::collections::HashMap;

use crate::workflow_runtime::constants::WORKFLOW_RUNTIME_CACHE_LIMIT;
use crate::workflow_runtime::runtime_state::{
    clear_paused, get_execution_from_memory, get_execution_from_storage, list_memory_executions,
    mark_cancelled, mark_paused, persist_execution,
};
use crate::workflow_runtime::utils::now_iso;
use crate::workflow_runtime::{
    WorkflowExecutionRecord, WorkflowExecutionStatus, WorkflowRuntimeState,
};

pub async fn cancel_execution(state: &WorkflowRuntimeState, execution_id: &str) -> bool {
    mark_cancelled(state, execution_id).await;

    let mut record = get_execution_from_memory(state, execution_id).await;
    if record.is_none() {
        record = get_execution_from_storage(state, execution_id).await;
    }
    if let Some(mut record) = record {
        record.status = WorkflowExecutionStatus::Cancelled;
        record.completed_at = Some(now_iso());
        persist_execution(state, record).await;
        true
    } else {
        false
    }
}

pub async fn pause_execution(state: &WorkflowRuntimeState, execution_id: &str) -> bool {
    mark_paused(state, execution_id).await;
    let mut record = get_execution_from_memory(state, execution_id).await;
    if record.is_none() {
        record = get_execution_from_storage(state, execution_id).await;
    }
    if let Some(mut record) = record {
        if record.status == WorkflowExecutionStatus::Running {
            record.status = WorkflowExecutionStatus::Paused;
            persist_execution(state, record).await;
            return true;
        }
        return record.status == WorkflowExecutionStatus::Paused;
    }
    false
}

pub async fn resume_execution(state: &WorkflowRuntimeState, execution_id: &str) -> bool {
    clear_paused(state, execution_id).await;
    let mut record = get_execution_from_memory(state, execution_id).await;
    if record.is_none() {
        record = get_execution_from_storage(state, execution_id).await;
    }
    if let Some(mut record) = record {
        if record.status == WorkflowExecutionStatus::Paused {
            record.status = WorkflowExecutionStatus::Running;
            persist_execution(state, record).await;
            return true;
        }
        return record.status == WorkflowExecutionStatus::Running;
    }
    false
}

pub async fn get_execution(
    state: &WorkflowRuntimeState,
    execution_id: &str,
) -> Option<WorkflowExecutionRecord> {
    if let Some(record) = get_execution_from_memory(state, execution_id).await {
        return Some(record);
    }
    get_execution_from_storage(state, execution_id).await
}

pub async fn list_executions(
    state: &WorkflowRuntimeState,
    workflow_id: Option<&str>,
    limit: Option<usize>,
) -> Vec<WorkflowExecutionRecord> {
    let memory_records = list_memory_executions(state, workflow_id, limit).await;

    let Some(storage) = state.storage() else {
        return memory_records;
    };

    let fetch_limit = limit
        .map(|value| value.max(memory_records.len()))
        .unwrap_or(WORKFLOW_RUNTIME_CACHE_LIMIT);
    let storage_records = storage
        .list_executions(workflow_id, Some(fetch_limit))
        .unwrap_or_default();

    let mut merged = HashMap::new();
    for record in storage_records {
        merged.insert(record.execution_id.clone(), record);
    }
    for record in memory_records {
        merged.insert(record.execution_id.clone(), record);
    }

    let mut list = merged.into_values().collect::<Vec<_>>();
    list.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    if let Some(limit) = limit {
        list.truncate(limit);
    }
    list
}
