use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use chrono::Utc;
use rusqlite::{params, Connection, Transaction};
use serde_json::Value as JsonValue;

use crate::chat_runtime::migrations::initialize_chat_schema;
use crate::chat_runtime::models::{ChatBackupPayload, ChatImportResult, ChatMessagesPage};

#[derive(Debug, thiserror::Error)]
pub enum ChatRuntimeStorageError {
    #[error("sqlite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("lock error: {0}")]
    Lock(String),

    #[error("serialization error: {0}")]
    Serialization(String),

    #[error("validation error: {0}")]
    Validation(String),
}

pub struct ChatRuntimeStorage {
    conn: Mutex<Connection>,
}

impl ChatRuntimeStorage {
    pub fn new(db_path: PathBuf) -> Result<Self, ChatRuntimeStorageError> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|error| ChatRuntimeStorageError::Serialization(error.to_string()))?;
        }

        let conn = Connection::open(db_path)?;
        initialize_chat_schema(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn in_memory() -> Result<Self, ChatRuntimeStorageError> {
        let conn = Connection::open_in_memory()?;
        initialize_chat_schema(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn with_connection<T>(
        &self,
        operation: impl FnOnce(&mut Connection) -> Result<T, ChatRuntimeStorageError>,
    ) -> Result<T, ChatRuntimeStorageError> {
        let mut conn = self
            .conn
            .lock()
            .map_err(|error| ChatRuntimeStorageError::Lock(error.to_string()))?;
        operation(&mut conn)
    }

    fn upsert_session_tx(
        tx: &Transaction<'_>,
        session: &JsonValue,
    ) -> Result<(), ChatRuntimeStorageError> {
        let id = required_field(session, "id")?;
        let created_at = optional_field(session, "createdAt").unwrap_or_else(now_iso);
        let updated_at = optional_field(session, "updatedAt").unwrap_or_else(now_iso);
        let project_id = optional_field(session, "projectId");
        let folder_id = optional_field(session, "folderId");
        let payload_json = serde_json::to_string(session)
            .map_err(|error| ChatRuntimeStorageError::Serialization(error.to_string()))?;

        tx.execute(
            r#"
            INSERT INTO sessions (id, payload_json, project_id, folder_id, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(id) DO UPDATE SET
              payload_json=excluded.payload_json,
              project_id=excluded.project_id,
              folder_id=excluded.folder_id,
              created_at=excluded.created_at,
              updated_at=excluded.updated_at
            "#,
            params![
                id,
                payload_json,
                project_id,
                folder_id,
                created_at,
                updated_at
            ],
        )?;
        Ok(())
    }

    fn upsert_message_tx(
        tx: &Transaction<'_>,
        message: &JsonValue,
    ) -> Result<(), ChatRuntimeStorageError> {
        let id = required_field(message, "id")?;
        let session_id = required_field(message, "sessionId")?;
        let branch_id = optional_field(message, "branchId");
        let created_at = optional_field(message, "createdAt").unwrap_or_else(now_iso);
        let payload_json = serde_json::to_string(message)
            .map_err(|error| ChatRuntimeStorageError::Serialization(error.to_string()))?;

        tx.execute(
            r#"
            INSERT INTO messages (id, session_id, branch_id, created_at, payload_json)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(id) DO UPDATE SET
              session_id=excluded.session_id,
              branch_id=excluded.branch_id,
              created_at=excluded.created_at,
              payload_json=excluded.payload_json
            "#,
            params![id, session_id, branch_id, created_at, payload_json],
        )?;
        Ok(())
    }

    fn upsert_project_tx(
        tx: &Transaction<'_>,
        project: &JsonValue,
    ) -> Result<(), ChatRuntimeStorageError> {
        let id = required_field(project, "id")?;
        let created_at = optional_field(project, "createdAt").unwrap_or_else(now_iso);
        let updated_at = optional_field(project, "updatedAt").unwrap_or_else(now_iso);
        let payload_json = serde_json::to_string(project)
            .map_err(|error| ChatRuntimeStorageError::Serialization(error.to_string()))?;

        tx.execute(
            r#"
            INSERT INTO projects (id, payload_json, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(id) DO UPDATE SET
              payload_json=excluded.payload_json,
              created_at=excluded.created_at,
              updated_at=excluded.updated_at
            "#,
            params![id, payload_json, created_at, updated_at],
        )?;
        Ok(())
    }

    fn upsert_knowledge_file_tx(
        tx: &Transaction<'_>,
        knowledge_file: &JsonValue,
    ) -> Result<(), ChatRuntimeStorageError> {
        let id = required_field(knowledge_file, "id")?;
        let project_id = required_field(knowledge_file, "projectId")?;
        let created_at = optional_field(knowledge_file, "createdAt").unwrap_or_else(now_iso);
        let updated_at = optional_field(knowledge_file, "updatedAt").unwrap_or_else(now_iso);
        let payload_json = serde_json::to_string(knowledge_file)
            .map_err(|error| ChatRuntimeStorageError::Serialization(error.to_string()))?;

        tx.execute(
            r#"
            INSERT INTO knowledge_files (id, project_id, payload_json, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(id) DO UPDATE SET
              project_id=excluded.project_id,
              payload_json=excluded.payload_json,
              created_at=excluded.created_at,
              updated_at=excluded.updated_at
            "#,
            params![id, project_id, payload_json, created_at, updated_at],
        )?;
        Ok(())
    }

    fn upsert_summary_tx(
        tx: &Transaction<'_>,
        summary: &JsonValue,
    ) -> Result<(), ChatRuntimeStorageError> {
        let id = required_field(summary, "id")?;
        let session_id = required_field(summary, "sessionId")?;
        let summary_type = optional_field(summary, "type");
        let created_at = optional_field(summary, "createdAt").unwrap_or_else(now_iso);
        let updated_at = optional_field(summary, "updatedAt").unwrap_or_else(now_iso);
        let payload_json = serde_json::to_string(summary)
            .map_err(|error| ChatRuntimeStorageError::Serialization(error.to_string()))?;

        tx.execute(
            r#"
            INSERT INTO summaries (id, session_id, summary_type, created_at, updated_at, payload_json)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(id) DO UPDATE SET
              session_id=excluded.session_id,
              summary_type=excluded.summary_type,
              created_at=excluded.created_at,
              updated_at=excluded.updated_at,
              payload_json=excluded.payload_json
            "#,
            params![
                id,
                session_id,
                summary_type,
                created_at,
                updated_at,
                payload_json
            ],
        )?;
        Ok(())
    }

    pub fn upsert_session(&self, session: JsonValue) -> Result<(), ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let tx = conn.unchecked_transaction()?;
            Self::upsert_session_tx(&tx, &session)?;
            tx.commit()?;
            Ok(())
        })
    }

    pub fn list_sessions(&self) -> Result<Vec<JsonValue>, ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let mut statement = conn.prepare(
                "SELECT payload_json FROM sessions ORDER BY updated_at DESC, created_at DESC",
            )?;
            let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
            parse_payload_rows(rows)
        })
    }

    pub fn delete_session(&self, session_id: &str) -> Result<(), ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let tx = conn.unchecked_transaction()?;
            tx.execute(
                "DELETE FROM messages WHERE session_id = ?1",
                params![session_id],
            )?;
            tx.execute(
                "DELETE FROM summaries WHERE session_id = ?1",
                params![session_id],
            )?;
            tx.execute("DELETE FROM sessions WHERE id = ?1", params![session_id])?;
            tx.commit()?;
            Ok(())
        })
    }

    pub fn clear_sessions(&self) -> Result<(), ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let tx = conn.unchecked_transaction()?;
            tx.execute("DELETE FROM messages", [])?;
            tx.execute("DELETE FROM summaries", [])?;
            tx.execute("DELETE FROM sessions", [])?;
            tx.commit()?;
            Ok(())
        })
    }

    pub fn clear_domain_data(&self) -> Result<(), ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let tx = conn.unchecked_transaction()?;
            tx.execute("DELETE FROM messages", [])?;
            tx.execute("DELETE FROM summaries", [])?;
            tx.execute("DELETE FROM knowledge_files", [])?;
            tx.execute("DELETE FROM sessions", [])?;
            tx.execute("DELETE FROM projects", [])?;
            tx.commit()?;
            Ok(())
        })
    }

    pub fn upsert_messages_batch(
        &self,
        messages: Vec<JsonValue>,
    ) -> Result<usize, ChatRuntimeStorageError> {
        if messages.is_empty() {
            return Ok(0);
        }
        self.with_connection(|conn| {
            let tx = conn.unchecked_transaction()?;
            for message in &messages {
                Self::upsert_message_tx(&tx, message)?;
            }
            tx.commit()?;
            Ok(messages.len())
        })
    }

    pub fn list_messages(&self) -> Result<Vec<JsonValue>, ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let mut statement =
                conn.prepare("SELECT payload_json FROM messages ORDER BY created_at ASC")?;
            let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
            parse_payload_rows(rows)
        })
    }

    pub fn get_messages_page(
        &self,
        session_id: Option<String>,
        branch_id: Option<String>,
        limit: usize,
        offset: usize,
    ) -> Result<ChatMessagesPage, ChatRuntimeStorageError> {
        let normalized_limit = limit.max(1).min(500);
        let all_messages = self.list_messages()?;
        let filtered = all_messages
            .into_iter()
            .filter(|message| {
                let message_session_id = optional_field(message, "sessionId");
                let message_branch_id = optional_field(message, "branchId");
                let session_ok = match &session_id {
                    Some(expected) => message_session_id.as_deref() == Some(expected.as_str()),
                    None => true,
                };
                let branch_ok = match &branch_id {
                    Some(expected) => message_branch_id.as_deref() == Some(expected.as_str()),
                    None => true,
                };
                session_ok && branch_ok
            })
            .collect::<Vec<_>>();
        let total = filtered.len();
        let items = filtered
            .into_iter()
            .skip(offset)
            .take(normalized_limit)
            .collect::<Vec<_>>();
        let has_more = offset + items.len() < total;

        Ok(ChatMessagesPage {
            items,
            limit: normalized_limit,
            offset,
            total,
            has_more,
        })
    }

    pub fn delete_messages_by_session(
        &self,
        session_id: &str,
    ) -> Result<(), ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            conn.execute(
                "DELETE FROM messages WHERE session_id = ?1",
                params![session_id],
            )?;
            Ok(())
        })
    }

    pub fn upsert_project(&self, project: JsonValue) -> Result<(), ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let tx = conn.unchecked_transaction()?;
            Self::upsert_project_tx(&tx, &project)?;
            tx.commit()?;
            Ok(())
        })
    }

    pub fn list_projects(&self) -> Result<Vec<JsonValue>, ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let mut statement =
                conn.prepare("SELECT payload_json FROM projects ORDER BY updated_at DESC")?;
            let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
            parse_payload_rows(rows)
        })
    }

    pub fn delete_project(&self, project_id: &str) -> Result<(), ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let tx = conn.unchecked_transaction()?;
            tx.execute(
                "DELETE FROM knowledge_files WHERE project_id = ?1",
                params![project_id],
            )?;
            tx.execute("DELETE FROM projects WHERE id = ?1", params![project_id])?;
            tx.commit()?;
            Ok(())
        })
    }

    pub fn upsert_knowledge_files_batch(
        &self,
        knowledge_files: Vec<JsonValue>,
    ) -> Result<usize, ChatRuntimeStorageError> {
        if knowledge_files.is_empty() {
            return Ok(0);
        }
        self.with_connection(|conn| {
            let tx = conn.unchecked_transaction()?;
            for file in &knowledge_files {
                Self::upsert_knowledge_file_tx(&tx, file)?;
            }
            tx.commit()?;
            Ok(knowledge_files.len())
        })
    }

    pub fn list_knowledge_files(&self) -> Result<Vec<JsonValue>, ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let mut statement =
                conn.prepare("SELECT payload_json FROM knowledge_files ORDER BY created_at DESC")?;
            let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
            parse_payload_rows(rows)
        })
    }

    pub fn upsert_summary(&self, summary: JsonValue) -> Result<(), ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let tx = conn.unchecked_transaction()?;
            Self::upsert_summary_tx(&tx, &summary)?;
            tx.commit()?;
            Ok(())
        })
    }

    pub fn list_summaries(&self) -> Result<Vec<JsonValue>, ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let mut statement =
                conn.prepare("SELECT payload_json FROM summaries ORDER BY updated_at DESC")?;
            let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
            parse_payload_rows(rows)
        })
    }

    pub fn delete_summary(&self, summary_id: &str) -> Result<(), ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            conn.execute("DELETE FROM summaries WHERE id = ?1", params![summary_id])?;
            Ok(())
        })
    }

    pub fn delete_summaries_by_session(
        &self,
        session_id: &str,
    ) -> Result<(), ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            conn.execute(
                "DELETE FROM summaries WHERE session_id = ?1",
                params![session_id],
            )?;
            Ok(())
        })
    }

    pub fn export_backup(&self) -> Result<ChatBackupPayload, ChatRuntimeStorageError> {
        Ok(ChatBackupPayload {
            sessions: self.list_sessions()?,
            messages: self.list_messages()?,
            projects: self.list_projects()?,
            knowledge_files: self.list_knowledge_files()?,
            summaries: self.list_summaries()?,
        })
    }

    pub fn import_backup(
        &self,
        payload: ChatBackupPayload,
    ) -> Result<ChatImportResult, ChatRuntimeStorageError> {
        self.with_connection(|conn| {
            let tx = conn.unchecked_transaction()?;
            for session in &payload.sessions {
                Self::upsert_session_tx(&tx, session)?;
            }
            for message in &payload.messages {
                Self::upsert_message_tx(&tx, message)?;
            }
            for project in &payload.projects {
                Self::upsert_project_tx(&tx, project)?;
            }
            for knowledge_file in &payload.knowledge_files {
                Self::upsert_knowledge_file_tx(&tx, knowledge_file)?;
            }
            for summary in &payload.summaries {
                Self::upsert_summary_tx(&tx, summary)?;
            }
            tx.commit()?;

            Ok(ChatImportResult {
                imported_sessions: payload.sessions.len(),
                imported_messages: payload.messages.len(),
                imported_projects: payload.projects.len(),
                imported_knowledge_files: payload.knowledge_files.len(),
                imported_summaries: payload.summaries.len(),
            })
        })
    }
}

pub struct ChatRuntimeState {
    storage: Arc<ChatRuntimeStorage>,
}

impl Default for ChatRuntimeState {
    fn default() -> Self {
        let storage = ChatRuntimeStorage::in_memory()
            .expect("chat runtime in-memory storage should initialize");
        Self {
            storage: Arc::new(storage),
        }
    }
}

impl ChatRuntimeState {
    pub fn from_db_path(db_path: PathBuf) -> Result<Self, String> {
        let storage = ChatRuntimeStorage::new(db_path).map_err(|error| error.to_string())?;
        Ok(Self {
            storage: Arc::new(storage),
        })
    }

    pub fn upsert_session(&self, session: JsonValue) -> Result<(), String> {
        self.storage
            .upsert_session(session)
            .map_err(|error| error.to_string())
    }

    pub fn list_sessions(&self) -> Result<Vec<JsonValue>, String> {
        self.storage
            .list_sessions()
            .map_err(|error| error.to_string())
    }

    pub fn delete_session(&self, session_id: &str) -> Result<(), String> {
        self.storage
            .delete_session(session_id)
            .map_err(|error| error.to_string())
    }

    pub fn clear_sessions(&self) -> Result<(), String> {
        self.storage
            .clear_sessions()
            .map_err(|error| error.to_string())
    }

    pub fn clear_domain_data(&self) -> Result<(), String> {
        self.storage
            .clear_domain_data()
            .map_err(|error| error.to_string())
    }

    pub fn upsert_messages_batch(&self, messages: Vec<JsonValue>) -> Result<usize, String> {
        self.storage
            .upsert_messages_batch(messages)
            .map_err(|error| error.to_string())
    }

    pub fn list_messages(&self) -> Result<Vec<JsonValue>, String> {
        self.storage
            .list_messages()
            .map_err(|error| error.to_string())
    }

    pub fn get_messages_page(
        &self,
        session_id: Option<String>,
        branch_id: Option<String>,
        limit: usize,
        offset: usize,
    ) -> Result<ChatMessagesPage, String> {
        self.storage
            .get_messages_page(session_id, branch_id, limit, offset)
            .map_err(|error| error.to_string())
    }

    pub fn delete_messages_by_session(&self, session_id: &str) -> Result<(), String> {
        self.storage
            .delete_messages_by_session(session_id)
            .map_err(|error| error.to_string())
    }

    pub fn upsert_project(&self, project: JsonValue) -> Result<(), String> {
        self.storage
            .upsert_project(project)
            .map_err(|error| error.to_string())
    }

    pub fn list_projects(&self) -> Result<Vec<JsonValue>, String> {
        self.storage
            .list_projects()
            .map_err(|error| error.to_string())
    }

    pub fn delete_project(&self, project_id: &str) -> Result<(), String> {
        self.storage
            .delete_project(project_id)
            .map_err(|error| error.to_string())
    }

    pub fn upsert_knowledge_files_batch(
        &self,
        knowledge_files: Vec<JsonValue>,
    ) -> Result<usize, String> {
        self.storage
            .upsert_knowledge_files_batch(knowledge_files)
            .map_err(|error| error.to_string())
    }

    pub fn list_knowledge_files(&self) -> Result<Vec<JsonValue>, String> {
        self.storage
            .list_knowledge_files()
            .map_err(|error| error.to_string())
    }

    pub fn upsert_summary(&self, summary: JsonValue) -> Result<(), String> {
        self.storage
            .upsert_summary(summary)
            .map_err(|error| error.to_string())
    }

    pub fn list_summaries(&self) -> Result<Vec<JsonValue>, String> {
        self.storage
            .list_summaries()
            .map_err(|error| error.to_string())
    }

    pub fn delete_summary(&self, summary_id: &str) -> Result<(), String> {
        self.storage
            .delete_summary(summary_id)
            .map_err(|error| error.to_string())
    }

    pub fn delete_summaries_by_session(&self, session_id: &str) -> Result<(), String> {
        self.storage
            .delete_summaries_by_session(session_id)
            .map_err(|error| error.to_string())
    }

    pub fn export_backup(&self) -> Result<ChatBackupPayload, String> {
        self.storage
            .export_backup()
            .map_err(|error| error.to_string())
    }

    pub fn import_backup(&self, payload: ChatBackupPayload) -> Result<ChatImportResult, String> {
        self.storage
            .import_backup(payload)
            .map_err(|error| error.to_string())
    }
}

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn optional_field(value: &JsonValue, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(|inner| inner.as_str())
        .map(|inner| inner.to_string())
}

fn required_field(value: &JsonValue, key: &str) -> Result<String, ChatRuntimeStorageError> {
    optional_field(value, key)
        .filter(|inner| !inner.trim().is_empty())
        .ok_or_else(|| {
            ChatRuntimeStorageError::Validation(format!("missing required field: {key}"))
        })
}

fn parse_payload_rows<F>(
    rows: rusqlite::MappedRows<'_, F>,
) -> Result<Vec<JsonValue>, ChatRuntimeStorageError>
where
    F: FnMut(&rusqlite::Row<'_>) -> Result<String, rusqlite::Error>,
{
    let mut result = Vec::new();
    for row in rows {
        let payload = row?;
        let parsed = serde_json::from_str::<JsonValue>(&payload)
            .map_err(|error| ChatRuntimeStorageError::Serialization(error.to_string()))?;
        result.push(parsed);
    }
    Ok(result)
}
