use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use chrono::Utc;
use rusqlite::{params, Connection};
use serde_json::Value as JsonValue;

use super::{
    WorkflowExecutionRecord, WorkflowExecutionStatus, WorkflowRuntimeLogEntry, WorkflowStepState,
};

#[derive(Debug, thiserror::Error)]
pub enum WorkflowRuntimeStorageError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("lock error: {0}")]
    Lock(String),

    #[error("serialization error: {0}")]
    Serialization(String),
}

pub struct WorkflowRuntimeStorage {
    conn: Mutex<Connection>,
}

impl WorkflowRuntimeStorage {
    pub fn new(db_path: PathBuf) -> Result<Self, WorkflowRuntimeStorageError> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|error| WorkflowRuntimeStorageError::Serialization(error.to_string()))?;
        }

        let conn = Connection::open(db_path)?;
        let storage = Self {
            conn: Mutex::new(conn),
        };
        storage.initialize_schema()?;
        Ok(storage)
    }

    #[cfg(test)]
    pub fn in_memory() -> Result<Self, WorkflowRuntimeStorageError> {
        let conn = Connection::open_in_memory()?;
        let storage = Self {
            conn: Mutex::new(conn),
        };
        storage.initialize_schema()?;
        Ok(storage)
    }

    fn initialize_schema(&self) -> Result<(), WorkflowRuntimeStorageError> {
        let conn = self
            .conn
            .lock()
            .map_err(|error| WorkflowRuntimeStorageError::Lock(error.to_string()))?;
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS workflow_runtime_executions (
                execution_id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                status TEXT NOT NULL,
                request_id TEXT,
                trigger_id TEXT,
                is_replay INTEGER,
                input_json TEXT NOT NULL,
                output_json TEXT,
                step_states_json TEXT NOT NULL,
                logs_json TEXT NOT NULL DEFAULT '[]',
                error TEXT,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_workflow_runtime_executions_workflow_started
                ON workflow_runtime_executions(workflow_id, started_at DESC);

            CREATE INDEX IF NOT EXISTS idx_workflow_runtime_executions_request_id
                ON workflow_runtime_executions(request_id);
            "#,
        )?;
        self.ensure_logs_json_column(&conn)?;
        Ok(())
    }

    fn ensure_logs_json_column(
        &self,
        conn: &Connection,
    ) -> Result<(), WorkflowRuntimeStorageError> {
        let mut stmt = conn.prepare("PRAGMA table_info(workflow_runtime_executions)")?;
        let columns = stmt.query_map([], |row| row.get::<_, String>(1))?;

        let mut has_logs_json = false;
        for column in columns {
            if column? == "logs_json" {
                has_logs_json = true;
                break;
            }
        }

        if !has_logs_json {
            conn.execute(
                "ALTER TABLE workflow_runtime_executions ADD COLUMN logs_json TEXT NOT NULL DEFAULT '[]'",
                [],
            )?;
        }

        Ok(())
    }

    pub fn upsert_execution(
        &self,
        record: &WorkflowExecutionRecord,
        keep_latest: usize,
    ) -> Result<(), WorkflowRuntimeStorageError> {
        let input_json = serde_json::to_string(&record.input)
            .map_err(|error| WorkflowRuntimeStorageError::Serialization(error.to_string()))?;
        let output_json = record
            .output
            .as_ref()
            .map(serde_json::to_string)
            .transpose()
            .map_err(|error| WorkflowRuntimeStorageError::Serialization(error.to_string()))?;
        let step_states_json = serde_json::to_string(&record.step_states)
            .map_err(|error| WorkflowRuntimeStorageError::Serialization(error.to_string()))?;
        let logs_json = serde_json::to_string(&record.logs)
            .map_err(|error| WorkflowRuntimeStorageError::Serialization(error.to_string()))?;
        let now = Utc::now().to_rfc3339();

        let conn = self
            .conn
            .lock()
            .map_err(|error| WorkflowRuntimeStorageError::Lock(error.to_string()))?;

        conn.execute(
            r#"
            INSERT INTO workflow_runtime_executions (
                execution_id,
                workflow_id,
                status,
                request_id,
                trigger_id,
                is_replay,
                input_json,
                output_json,
                step_states_json,
                logs_json,
                error,
                started_at,
                completed_at,
                updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
            ON CONFLICT(execution_id) DO UPDATE SET
                workflow_id = excluded.workflow_id,
                status = excluded.status,
                request_id = excluded.request_id,
                trigger_id = excluded.trigger_id,
                is_replay = excluded.is_replay,
                input_json = excluded.input_json,
                output_json = excluded.output_json,
                step_states_json = excluded.step_states_json,
                logs_json = excluded.logs_json,
                error = excluded.error,
                started_at = excluded.started_at,
                completed_at = excluded.completed_at,
                updated_at = excluded.updated_at
            "#,
            params![
                record.execution_id,
                record.workflow_id,
                execution_status_to_str(&record.status),
                record.request_id,
                record.trigger_id,
                record.is_replay.map(|value| if value { 1 } else { 0 }),
                input_json,
                output_json,
                step_states_json,
                logs_json,
                record.error,
                record.started_at,
                record.completed_at,
                now,
            ],
        )?;

        if keep_latest > 0 {
            conn.execute(
                r#"
                DELETE FROM workflow_runtime_executions
                WHERE execution_id IN (
                    SELECT execution_id
                    FROM workflow_runtime_executions
                    ORDER BY started_at DESC
                    LIMIT -1 OFFSET ?1
                )
                "#,
                params![keep_latest as i64],
            )?;
        }

        Ok(())
    }

    pub fn get_execution(
        &self,
        execution_id: &str,
    ) -> Result<Option<WorkflowExecutionRecord>, WorkflowRuntimeStorageError> {
        let conn = self
            .conn
            .lock()
            .map_err(|error| WorkflowRuntimeStorageError::Lock(error.to_string()))?;
        let mut stmt = conn.prepare(
            r#"
            SELECT
                execution_id,
                workflow_id,
                status,
                request_id,
                trigger_id,
                is_replay,
                input_json,
                output_json,
                step_states_json,
                logs_json,
                error,
                started_at,
                completed_at
            FROM workflow_runtime_executions
            WHERE execution_id = ?1
            "#,
        )?;

        let row = stmt.query_row(params![execution_id], map_row_to_execution_record);
        match row {
            Ok(record) => Ok(Some(record)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(error) => Err(error.into()),
        }
    }

    pub fn list_executions(
        &self,
        workflow_id: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<WorkflowExecutionRecord>, WorkflowRuntimeStorageError> {
        let conn = self
            .conn
            .lock()
            .map_err(|error| WorkflowRuntimeStorageError::Lock(error.to_string()))?;

        let sql = if workflow_id.is_some() {
            if limit.is_some() {
                r#"
                SELECT
                    execution_id,
                    workflow_id,
                    status,
                    request_id,
                    trigger_id,
                    is_replay,
                    input_json,
                    output_json,
                    step_states_json,
                    logs_json,
                    error,
                    started_at,
                    completed_at
                FROM workflow_runtime_executions
                WHERE workflow_id = ?1
                ORDER BY started_at DESC
                LIMIT ?2
                "#
            } else {
                r#"
                SELECT
                    execution_id,
                    workflow_id,
                    status,
                    request_id,
                    trigger_id,
                    is_replay,
                    input_json,
                    output_json,
                    step_states_json,
                    logs_json,
                    error,
                    started_at,
                    completed_at
                FROM workflow_runtime_executions
                WHERE workflow_id = ?1
                ORDER BY started_at DESC
                "#
            }
        } else if limit.is_some() {
            r#"
            SELECT
                execution_id,
                workflow_id,
                status,
                request_id,
                trigger_id,
                is_replay,
                input_json,
                output_json,
                step_states_json,
                logs_json,
                error,
                started_at,
                completed_at
            FROM workflow_runtime_executions
            ORDER BY started_at DESC
            LIMIT ?1
            "#
        } else {
            r#"
            SELECT
                execution_id,
                workflow_id,
                status,
                request_id,
                trigger_id,
                is_replay,
                input_json,
                output_json,
                step_states_json,
                logs_json,
                error,
                started_at,
                completed_at
            FROM workflow_runtime_executions
            ORDER BY started_at DESC
            "#
        };

        let mut stmt = conn.prepare(sql)?;
        let rows = match (workflow_id, limit) {
            (Some(workflow_id), Some(limit)) => stmt.query_map(
                params![workflow_id, limit as i64],
                map_row_to_execution_record,
            )?,
            (Some(workflow_id), None) => {
                stmt.query_map(params![workflow_id], map_row_to_execution_record)?
            }
            (None, Some(limit)) => {
                stmt.query_map(params![limit as i64], map_row_to_execution_record)?
            }
            (None, None) => stmt.query_map([], map_row_to_execution_record)?,
        };

        let mut records = Vec::new();
        for row in rows {
            records.push(row?);
        }
        Ok(records)
    }

    pub fn load_recent(
        &self,
        limit: usize,
    ) -> Result<Vec<WorkflowExecutionRecord>, WorkflowRuntimeStorageError> {
        self.list_executions(None, Some(limit))
    }
}

fn map_row_to_execution_record(
    row: &rusqlite::Row<'_>,
) -> Result<WorkflowExecutionRecord, rusqlite::Error> {
    let input_json = row.get::<_, String>("input_json")?;
    let output_json = row.get::<_, Option<String>>("output_json")?;
    let step_states_json = row.get::<_, String>("step_states_json")?;
    let logs_json = row
        .get::<_, Option<String>>("logs_json")?
        .unwrap_or_else(|| "[]".to_string());
    let status = row.get::<_, String>("status")?;

    let input: HashMap<String, JsonValue> =
        serde_json::from_str(&input_json).unwrap_or_else(|_| HashMap::new());
    let output: Option<HashMap<String, JsonValue>> =
        output_json.and_then(|value| serde_json::from_str(&value).ok());
    let step_states: Vec<WorkflowStepState> =
        serde_json::from_str(&step_states_json).unwrap_or_else(|_| Vec::new());
    let logs: Vec<WorkflowRuntimeLogEntry> =
        serde_json::from_str(&logs_json).unwrap_or_else(|_| Vec::new());

    Ok(WorkflowExecutionRecord {
        execution_id: row.get("execution_id")?,
        workflow_id: row.get("workflow_id")?,
        status: execution_status_from_str(&status),
        request_id: row.get("request_id")?,
        input,
        output,
        step_states,
        logs,
        error: row.get("error")?,
        started_at: row.get("started_at")?,
        completed_at: row.get("completed_at")?,
        trigger_id: row.get("trigger_id")?,
        is_replay: row
            .get::<_, Option<i32>>("is_replay")?
            .map(|value| value == 1),
    })
}

fn execution_status_to_str(status: &WorkflowExecutionStatus) -> &'static str {
    match status {
        WorkflowExecutionStatus::Running => "running",
        WorkflowExecutionStatus::Paused => "paused",
        WorkflowExecutionStatus::Completed => "completed",
        WorkflowExecutionStatus::Failed => "failed",
        WorkflowExecutionStatus::Cancelled => "cancelled",
    }
}

fn execution_status_from_str(status: &str) -> WorkflowExecutionStatus {
    match status {
        "running" => WorkflowExecutionStatus::Running,
        "paused" => WorkflowExecutionStatus::Paused,
        "completed" => WorkflowExecutionStatus::Completed,
        "failed" => WorkflowExecutionStatus::Failed,
        "cancelled" => WorkflowExecutionStatus::Cancelled,
        _ => WorkflowExecutionStatus::Failed,
    }
}

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};
    use tempfile::NamedTempFile;

    use super::*;
    use crate::workflow_runtime::{
        WorkflowRuntimeLogEntry, WorkflowRuntimeLogLevel, WorkflowStepState, WorkflowStepStatus,
    };

    fn make_record(index: usize, workflow_id: &str) -> WorkflowExecutionRecord {
        WorkflowExecutionRecord {
            execution_id: format!("exec-{index}"),
            workflow_id: workflow_id.to_string(),
            status: WorkflowExecutionStatus::Completed,
            request_id: Some(format!("req-{}", index % 3)),
            input: HashMap::from([("value".to_string(), JsonValue::Number(index.into()))]),
            output: Some(HashMap::from([(
                "result".to_string(),
                JsonValue::String(format!("ok-{index}")),
            )])),
            step_states: vec![WorkflowStepState {
                step_id: format!("step-{index}"),
                status: WorkflowStepStatus::Completed,
                input: None,
                output: None,
                error: None,
                started_at: None,
                completed_at: None,
                retry_count: 0,
            }],
            logs: vec![WorkflowRuntimeLogEntry {
                event_id: format!("event-{index}"),
                level: WorkflowRuntimeLogLevel::Info,
                code: Some("workflow.test.log".to_string()),
                request_id: Some(format!("req-{}", index % 3)),
                execution_id: format!("exec-{index}"),
                workflow_id: workflow_id.to_string(),
                step_id: Some(format!("step-{index}")),
                trace_id: Some(format!("trace-{index}")),
                timestamp: Utc::now().to_rfc3339(),
                message: Some("test log".to_string()),
                error: None,
                data: Some(JsonValue::Object(
                    [("index".to_string(), JsonValue::Number(index.into()))]
                        .into_iter()
                        .collect(),
                )),
            }],
            error: None,
            started_at: Utc
                .timestamp_opt(1_700_000_000 + index as i64, 0)
                .single()
                .unwrap_or_else(Utc::now)
                .to_rfc3339(),
            completed_at: Some(
                Utc.timestamp_opt(1_700_000_100 + index as i64, 0)
                    .single()
                    .unwrap_or_else(Utc::now)
                    .to_rfc3339(),
            ),
            trigger_id: Some("trigger-test".to_string()),
            is_replay: Some(false),
        }
    }

    #[test]
    fn persists_and_reads_execution() {
        let storage = WorkflowRuntimeStorage::in_memory().expect("storage init failed");
        let record = make_record(1, "workflow-a");

        storage
            .upsert_execution(&record, 1000)
            .expect("upsert should succeed");

        let loaded = storage
            .get_execution("exec-1")
            .expect("query should succeed")
            .expect("record should exist");
        assert_eq!(loaded.execution_id, "exec-1");
        assert_eq!(loaded.workflow_id, "workflow-a");
        assert_eq!(loaded.request_id.as_deref(), Some("req-1"));
        assert_eq!(loaded.logs.len(), 1);
    }

    #[test]
    fn loads_from_same_file_after_restart() {
        let file = NamedTempFile::new().expect("temp file create failed");
        let path = file.path().to_path_buf();

        {
            let storage = WorkflowRuntimeStorage::new(path.clone()).expect("storage init failed");
            storage
                .upsert_execution(&make_record(10, "workflow-a"), 1000)
                .expect("upsert should succeed");
        }

        let storage = WorkflowRuntimeStorage::new(path).expect("storage reopen failed");
        let loaded = storage
            .get_execution("exec-10")
            .expect("query should succeed")
            .expect("record should exist");
        assert_eq!(loaded.execution_id, "exec-10");
    }

    #[test]
    fn supports_query_by_workflow_and_limit() {
        let storage = WorkflowRuntimeStorage::in_memory().expect("storage init failed");
        for index in 0..6 {
            let workflow_id = if index % 2 == 0 {
                "workflow-a"
            } else {
                "workflow-b"
            };
            storage
                .upsert_execution(&make_record(index, workflow_id), 1000)
                .expect("upsert should succeed");
        }

        let records = storage
            .list_executions(Some("workflow-a"), Some(2))
            .expect("query should succeed");
        assert_eq!(records.len(), 2);
        assert!(records
            .iter()
            .all(|record| record.workflow_id == "workflow-a"));
    }

    #[test]
    fn keeps_only_latest_records_after_retention_limit() {
        let storage = WorkflowRuntimeStorage::in_memory().expect("storage init failed");

        for index in 0..1005 {
            storage
                .upsert_execution(&make_record(index, "workflow-a"), 1000)
                .expect("upsert should succeed");
        }

        let records = storage
            .list_executions(None, None)
            .expect("query should succeed");
        assert_eq!(records.len(), 1000);
        assert!(records.iter().all(|record| !record.logs.is_empty()));
        for dropped in 0..5 {
            let execution_id = format!("exec-{dropped}");
            assert!(
                records
                    .iter()
                    .all(|record| record.execution_id != execution_id),
                "old execution should be cleaned: {execution_id}"
            );
        }
    }

    #[test]
    fn migrates_legacy_schema_with_missing_logs_column() {
        let conn = Connection::open_in_memory().expect("in-memory sqlite should open");
        conn.execute_batch(
            r#"
            CREATE TABLE workflow_runtime_executions (
                execution_id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                status TEXT NOT NULL,
                request_id TEXT,
                trigger_id TEXT,
                is_replay INTEGER,
                input_json TEXT NOT NULL,
                output_json TEXT,
                step_states_json TEXT NOT NULL,
                error TEXT,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                updated_at TEXT NOT NULL
            );
            "#,
        )
        .expect("legacy schema should initialize");

        let storage = WorkflowRuntimeStorage {
            conn: Mutex::new(conn),
        };
        storage
            .initialize_schema()
            .expect("schema migration should succeed");

        let record = make_record(42, "workflow-migration");
        storage
            .upsert_execution(&record, 1000)
            .expect("upsert should succeed after migration");

        let loaded = storage
            .get_execution("exec-42")
            .expect("query should succeed")
            .expect("record should exist");
        assert_eq!(loaded.logs.len(), 1);
        assert_eq!(
            loaded.logs.first().and_then(|entry| entry.code.as_deref()),
            Some("workflow.test.log")
        );
    }
}
