use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;

use tokio::sync::RwLock;

use super::constants::{WORKFLOW_RUNTIME_CACHE_LIMIT, WORKFLOW_RUNTIME_RETENTION_LIMIT};
use super::{WorkflowExecutionRecord, WorkflowRuntimeStorage};

#[derive(Default)]
pub struct WorkflowRuntimeManager {
    executions: HashMap<String, WorkflowExecutionRecord>,
    cancelled_executions: HashSet<String>,
    paused_executions: HashSet<String>,
}

pub struct WorkflowRuntimeState {
    manager: Arc<RwLock<WorkflowRuntimeManager>>,
    storage: Option<Arc<WorkflowRuntimeStorage>>,
}

impl Default for WorkflowRuntimeState {
    fn default() -> Self {
        Self::new_in_memory()
    }
}

impl WorkflowRuntimeState {
    pub fn new_in_memory() -> Self {
        Self {
            manager: Arc::new(RwLock::new(WorkflowRuntimeManager::default())),
            storage: None,
        }
    }

    pub fn from_db_path(db_path: PathBuf) -> Result<Self, String> {
        let storage = WorkflowRuntimeStorage::new(db_path).map_err(|error| error.to_string())?;
        Self::from_storage(storage)
    }

    fn from_storage(storage: WorkflowRuntimeStorage) -> Result<Self, String> {
        let recent = storage
            .load_recent(WORKFLOW_RUNTIME_CACHE_LIMIT)
            .map_err(|error| error.to_string())?;
        let mut manager = WorkflowRuntimeManager::default();
        for record in recent {
            manager
                .executions
                .insert(record.execution_id.clone(), record);
        }
        Ok(Self {
            manager: Arc::new(RwLock::new(manager)),
            storage: Some(Arc::new(storage)),
        })
    }

    #[cfg(test)]
    pub(crate) fn from_test_storage(storage: WorkflowRuntimeStorage) -> Self {
        Self::from_storage(storage).unwrap_or_else(|_| Self::new_in_memory())
    }

    pub(crate) fn storage(&self) -> Option<Arc<WorkflowRuntimeStorage>> {
        self.storage.clone()
    }

    pub(crate) fn manager(&self) -> Arc<RwLock<WorkflowRuntimeManager>> {
        self.manager.clone()
    }
}

impl WorkflowRuntimeManager {
    pub(crate) fn get_execution(&self, execution_id: &str) -> Option<WorkflowExecutionRecord> {
        self.executions.get(execution_id).cloned()
    }

    pub(crate) fn list_executions(
        &self,
        workflow_id: Option<&str>,
        limit: Option<usize>,
    ) -> Vec<WorkflowExecutionRecord> {
        let mut list = self
            .executions
            .values()
            .filter(|record| {
                workflow_id
                    .map(|id| record.workflow_id == id)
                    .unwrap_or(true)
            })
            .cloned()
            .collect::<Vec<_>>();

        list.sort_by(|a, b| b.started_at.cmp(&a.started_at));
        if let Some(limit) = limit {
            list.truncate(limit);
        }
        list
    }

    pub(crate) fn insert_cancelled(&mut self, execution_id: String) {
        self.cancelled_executions.insert(execution_id);
    }

    pub(crate) fn remove_cancelled(&mut self, execution_id: &str) {
        self.cancelled_executions.remove(execution_id);
    }

    pub(crate) fn contains_cancelled(&self, execution_id: &str) -> bool {
        self.cancelled_executions.contains(execution_id)
    }

    pub(crate) fn insert_paused(&mut self, execution_id: String) {
        self.paused_executions.insert(execution_id);
    }

    pub(crate) fn remove_paused(&mut self, execution_id: &str) {
        self.paused_executions.remove(execution_id);
    }

    pub(crate) fn contains_paused(&self, execution_id: &str) -> bool {
        self.paused_executions.contains(execution_id)
    }
}

fn trim_memory_cache(manager: &mut WorkflowRuntimeManager) {
    if manager.executions.len() <= WORKFLOW_RUNTIME_CACHE_LIMIT {
        return;
    }
    let mut sorted = manager
        .executions
        .values()
        .map(|record| (record.started_at.clone(), record.execution_id.clone()))
        .collect::<Vec<_>>();
    sorted.sort_by(|a, b| b.0.cmp(&a.0));
    for (_, execution_id) in sorted.into_iter().skip(WORKFLOW_RUNTIME_CACHE_LIMIT) {
        manager.executions.remove(&execution_id);
    }
}

pub(crate) async fn persist_execution(
    state: &WorkflowRuntimeState,
    record: WorkflowExecutionRecord,
) {
    {
        let manager_ref = state.manager();
        let mut manager = manager_ref.write().await;
        manager
            .executions
            .insert(record.execution_id.clone(), record.clone());
        trim_memory_cache(&mut manager);
    }

    if let Some(storage) = state.storage() {
        if let Err(error) = storage.upsert_execution(&record, WORKFLOW_RUNTIME_RETENTION_LIMIT) {
            log::warn!("[workflow-runtime] persist to sqlite failed: {error}");
        }
    }
}

pub(crate) async fn get_execution_from_memory(
    state: &WorkflowRuntimeState,
    execution_id: &str,
) -> Option<WorkflowExecutionRecord> {
    let manager_ref = state.manager();
    let manager = manager_ref.read().await;
    manager.get_execution(execution_id)
}

pub(crate) async fn get_execution_from_storage(
    state: &WorkflowRuntimeState,
    execution_id: &str,
) -> Option<WorkflowExecutionRecord> {
    state
        .storage()
        .and_then(|storage| storage.get_execution(execution_id).ok().flatten())
}

pub(crate) async fn is_cancelled(state: &WorkflowRuntimeState, execution_id: &str) -> bool {
    let manager_ref = state.manager();
    let manager = manager_ref.read().await;
    manager.contains_cancelled(execution_id)
}

pub(crate) async fn is_paused(state: &WorkflowRuntimeState, execution_id: &str) -> bool {
    let manager_ref = state.manager();
    let manager = manager_ref.read().await;
    manager.contains_paused(execution_id)
}

pub(crate) async fn clear_execution_flags(state: &WorkflowRuntimeState, execution_id: &str) {
    let manager_ref = state.manager();
    let mut manager = manager_ref.write().await;
    manager.remove_cancelled(execution_id);
    manager.remove_paused(execution_id);
}

pub(crate) async fn mark_cancelled(state: &WorkflowRuntimeState, execution_id: &str) {
    let manager_ref = state.manager();
    let mut manager = manager_ref.write().await;
    manager.insert_cancelled(execution_id.to_string());
    manager.remove_paused(execution_id);
}

pub(crate) async fn mark_paused(state: &WorkflowRuntimeState, execution_id: &str) {
    let manager_ref = state.manager();
    let mut manager = manager_ref.write().await;
    manager.insert_paused(execution_id.to_string());
}

pub(crate) async fn clear_paused(state: &WorkflowRuntimeState, execution_id: &str) {
    let manager_ref = state.manager();
    let mut manager = manager_ref.write().await;
    manager.remove_paused(execution_id);
}

pub(crate) async fn list_memory_executions(
    state: &WorkflowRuntimeState,
    workflow_id: Option<&str>,
    limit: Option<usize>,
) -> Vec<WorkflowExecutionRecord> {
    let manager_ref = state.manager();
    let manager = manager_ref.read().await;
    manager.list_executions(workflow_id, limit)
}
