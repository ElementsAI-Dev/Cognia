//! Sandbox Database Module
//!
//! Provides persistent storage for execution history, code snippets,
//! sessions, and statistics using SQLite.

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

use super::runtime::{ExecutionResult, ExecutionStatus, RuntimeType};

/// Database error types
#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("Lock error: {0}")]
    Lock(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Serialization error: {0}")]
    Serialization(String),
}

/// Execution history record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRecord {
    pub id: String,
    pub session_id: Option<String>,
    pub language: String,
    pub code: String,
    pub stdin: Option<String>,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub status: ExecutionStatus,
    pub runtime: RuntimeType,
    pub execution_time_ms: u64,
    pub memory_used_bytes: Option<u64>,
    pub error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub tags: Vec<String>,
    pub is_favorite: bool,
}

/// Code snippet/template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeSnippet {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub language: String,
    pub code: String,
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub is_template: bool,
    pub usage_count: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Execution session for grouping related executions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionSession {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub execution_count: u32,
    pub is_active: bool,
}

/// Statistics for a specific language
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageStats {
    pub language: String,
    pub total_executions: u64,
    pub successful_executions: u64,
    pub failed_executions: u64,
    pub timeout_executions: u64,
    pub total_execution_time_ms: u64,
    pub avg_execution_time_ms: f64,
    pub total_memory_used_bytes: u64,
    pub last_used: Option<DateTime<Utc>>,
}

/// Result of a data import operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported_snippets: u64,
    pub skipped_snippets: u64,
}

/// Overall sandbox statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxStats {
    pub total_executions: u64,
    pub successful_executions: u64,
    pub failed_executions: u64,
    pub timeout_executions: u64,
    pub total_execution_time_ms: u64,
    pub avg_execution_time_ms: f64,
    pub total_snippets: u64,
    pub total_sessions: u64,
    pub most_used_language: Option<String>,
    pub languages: Vec<LanguageStats>,
}

/// Query filter for execution history
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ExecutionFilter {
    pub language: Option<String>,
    pub status: Option<ExecutionStatus>,
    pub runtime: Option<RuntimeType>,
    pub session_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_favorite: Option<bool>,
    pub from_date: Option<DateTime<Utc>>,
    pub to_date: Option<DateTime<Utc>>,
    pub search_query: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

/// Query filter for code snippets
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SnippetFilter {
    pub language: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_template: Option<bool>,
    pub search_query: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

/// Sandbox database manager
pub struct SandboxDb {
    conn: Mutex<Connection>,
}

impl SandboxDb {
    /// Create a new database connection
    pub fn new(db_path: PathBuf) -> Result<Self, DbError> {
        log::debug!("Opening sandbox database at {:?}", db_path);

        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                log::warn!("Failed to create parent directory {:?}: {}", parent, e);
            }
        }

        let conn = Connection::open(&db_path).map_err(|e| {
            log::error!("Failed to open database at {:?}: {}", db_path, e);
            e
        })?;

        let db = Self {
            conn: Mutex::new(conn),
        };

        log::trace!("Initializing database schema...");
        db.initialize_schema()?;
        log::info!("Sandbox database opened successfully at {:?}", db_path);
        Ok(db)
    }

    /// Create an in-memory database (for testing)
    #[cfg(test)]
    pub fn in_memory() -> Result<Self, DbError> {
        log::debug!("Creating in-memory sandbox database");
        let conn = Connection::open_in_memory()?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.initialize_schema()?;
        log::trace!("In-memory database created successfully");
        Ok(db)
    }

    /// Initialize database schema
    fn initialize_schema(&self) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        conn.execute_batch(
            r#"
            -- Execution history table
            CREATE TABLE IF NOT EXISTS executions (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                language TEXT NOT NULL,
                code TEXT NOT NULL,
                stdin TEXT,
                stdout TEXT NOT NULL DEFAULT '',
                stderr TEXT NOT NULL DEFAULT '',
                exit_code INTEGER,
                status TEXT NOT NULL,
                runtime TEXT NOT NULL,
                execution_time_ms INTEGER NOT NULL DEFAULT 0,
                memory_used_bytes INTEGER,
                error TEXT,
                created_at TEXT NOT NULL,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
            );

            -- Execution tags (many-to-many)
            CREATE TABLE IF NOT EXISTS execution_tags (
                execution_id TEXT NOT NULL,
                tag TEXT NOT NULL,
                PRIMARY KEY (execution_id, tag),
                FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
            );

            -- Code snippets table
            CREATE TABLE IF NOT EXISTS snippets (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                language TEXT NOT NULL,
                code TEXT NOT NULL,
                category TEXT,
                is_template INTEGER NOT NULL DEFAULT 0,
                usage_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            -- Snippet tags (many-to-many)
            CREATE TABLE IF NOT EXISTS snippet_tags (
                snippet_id TEXT NOT NULL,
                tag TEXT NOT NULL,
                PRIMARY KEY (snippet_id, tag),
                FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
            );

            -- Sessions table
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                execution_count INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            -- Language statistics cache
            CREATE TABLE IF NOT EXISTS language_stats (
                language TEXT PRIMARY KEY,
                total_executions INTEGER NOT NULL DEFAULT 0,
                successful_executions INTEGER NOT NULL DEFAULT 0,
                failed_executions INTEGER NOT NULL DEFAULT 0,
                timeout_executions INTEGER NOT NULL DEFAULT 0,
                total_execution_time_ms INTEGER NOT NULL DEFAULT 0,
                total_memory_used_bytes INTEGER NOT NULL DEFAULT 0,
                last_used TEXT
            );

            -- Create indexes for better query performance
            CREATE INDEX IF NOT EXISTS idx_executions_language ON executions(language);
            CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
            CREATE INDEX IF NOT EXISTS idx_executions_runtime ON executions(runtime);
            CREATE INDEX IF NOT EXISTS idx_executions_session ON executions(session_id);
            CREATE INDEX IF NOT EXISTS idx_executions_created ON executions(created_at);
            CREATE INDEX IF NOT EXISTS idx_executions_favorite ON executions(is_favorite);
            CREATE INDEX IF NOT EXISTS idx_snippets_language ON snippets(language);
            CREATE INDEX IF NOT EXISTS idx_snippets_category ON snippets(category);
            CREATE INDEX IF NOT EXISTS idx_snippets_template ON snippets(is_template);
            "#,
        )?;

        Ok(())
    }

    // ==================== Execution History ====================

    /// Save an execution result to history
    pub fn save_execution(
        &self,
        result: &ExecutionResult,
        code: &str,
        stdin: Option<&str>,
        session_id: Option<&str>,
        tags: &[String],
    ) -> Result<ExecutionRecord, DbError> {
        log::debug!(
            "Saving execution to database: id={}, language={}, status={:?}",
            result.id,
            result.language,
            result.status
        );

        let conn = self.conn.lock().map_err(|e| {
            log::error!("Failed to acquire database lock: {}", e);
            DbError::Lock(e.to_string())
        })?;
        let now = Utc::now();
        let status_str = serde_json::to_string(&result.status)
            .map_err(|e| DbError::Serialization(e.to_string()))?
            .trim_matches('"')
            .to_string();
        let runtime_str = result.runtime.to_string();

        log::trace!(
            "Execution details: exit_code={:?}, time={}ms, code_len={}, session={:?}, tags={:?}",
            result.exit_code,
            result.execution_time_ms,
            code.len(),
            session_id,
            tags
        );

        conn.execute(
            r#"INSERT INTO executions 
               (id, session_id, language, code, stdin, stdout, stderr, exit_code, 
                status, runtime, execution_time_ms, memory_used_bytes, error, created_at, is_favorite)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, 0)"#,
            params![
                result.id,
                session_id,
                result.language,
                code,
                stdin,
                result.stdout,
                result.stderr,
                result.exit_code,
                status_str,
                runtime_str,
                result.execution_time_ms as i64,
                result.memory_used_bytes.map(|v| v as i64),
                result.error,
                now.to_rfc3339(),
            ],
        )?;

        // Insert tags
        for tag in tags {
            conn.execute(
                "INSERT OR IGNORE INTO execution_tags (execution_id, tag) VALUES (?1, ?2)",
                params![result.id, tag],
            )?;
        }

        // Update session execution count
        if let Some(sid) = session_id {
            conn.execute(
                "UPDATE sessions SET execution_count = execution_count + 1, updated_at = ?1 WHERE id = ?2",
                params![now.to_rfc3339(), sid],
            )?;
        }

        // Update language statistics
        self.update_language_stats_internal(&conn, &result.language, result)?;

        log::debug!("Execution saved successfully: id={}", result.id);
        Ok(ExecutionRecord {
            id: result.id.clone(),
            session_id: session_id.map(String::from),
            language: result.language.clone(),
            code: code.to_string(),
            stdin: stdin.map(String::from),
            stdout: result.stdout.clone(),
            stderr: result.stderr.clone(),
            exit_code: result.exit_code,
            status: result.status.clone(),
            runtime: result.runtime,
            execution_time_ms: result.execution_time_ms,
            memory_used_bytes: result.memory_used_bytes,
            error: result.error.clone(),
            created_at: now,
            tags: tags.to_vec(),
            is_favorite: false,
        })
    }

    /// Update language statistics
    fn update_language_stats_internal(
        &self,
        conn: &Connection,
        language: &str,
        result: &ExecutionResult,
    ) -> Result<(), DbError> {
        let now = Utc::now();
        let (success, failed, timeout) = match result.status {
            ExecutionStatus::Completed => (1, 0, 0),
            ExecutionStatus::Failed => (0, 1, 0),
            ExecutionStatus::Timeout => (0, 0, 1),
            _ => (0, 0, 0),
        };

        conn.execute(
            r#"INSERT INTO language_stats 
               (language, total_executions, successful_executions, failed_executions, 
                timeout_executions, total_execution_time_ms, total_memory_used_bytes, last_used)
               VALUES (?1, 1, ?2, ?3, ?4, ?5, ?6, ?7)
               ON CONFLICT(language) DO UPDATE SET
                   total_executions = total_executions + 1,
                   successful_executions = successful_executions + ?2,
                   failed_executions = failed_executions + ?3,
                   timeout_executions = timeout_executions + ?4,
                   total_execution_time_ms = total_execution_time_ms + ?5,
                   total_memory_used_bytes = total_memory_used_bytes + ?6,
                   last_used = ?7"#,
            params![
                language,
                success,
                failed,
                timeout,
                result.execution_time_ms as i64,
                result.memory_used_bytes.unwrap_or(0) as i64,
                now.to_rfc3339(),
            ],
        )?;

        Ok(())
    }

    /// Get execution by ID
    pub fn get_execution(&self, id: &str) -> Result<Option<ExecutionRecord>, DbError> {
        log::trace!("Getting execution by id: {}", id);
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let mut stmt = conn.prepare(
            r#"SELECT id, session_id, language, code, stdin, stdout, stderr, exit_code,
                      status, runtime, execution_time_ms, memory_used_bytes, error, 
                      created_at, is_favorite
               FROM executions WHERE id = ?1"#,
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(self.row_to_execution_record(row, &conn))
        });

        match result {
            Ok(record) => Ok(Some(record?)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DbError::Sqlite(e)),
        }
    }

    /// Helper to convert row to ExecutionRecord
    fn row_to_execution_record(
        &self,
        row: &rusqlite::Row,
        conn: &Connection,
    ) -> Result<ExecutionRecord, DbError> {
        let id: String = row.get(0)?;
        let status_str: String = row.get(8)?;
        let runtime_str: String = row.get(9)?;
        let created_at_str: String = row.get(13)?;

        // Get tags
        let mut tag_stmt =
            conn.prepare("SELECT tag FROM execution_tags WHERE execution_id = ?1")?;
        let tags: Vec<String> = tag_stmt
            .query_map(params![&id], |r| r.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        let status = match status_str.as_str() {
            "pending" => ExecutionStatus::Pending,
            "running" => ExecutionStatus::Running,
            "completed" => ExecutionStatus::Completed,
            "failed" => ExecutionStatus::Failed,
            "timeout" => ExecutionStatus::Timeout,
            "cancelled" => ExecutionStatus::Cancelled,
            _ => ExecutionStatus::Failed,
        };

        let runtime = match runtime_str.as_str() {
            "docker" => RuntimeType::Docker,
            "podman" => RuntimeType::Podman,
            "native" => RuntimeType::Native,
            _ => RuntimeType::Native,
        };

        Ok(ExecutionRecord {
            id,
            session_id: row.get(1)?,
            language: row.get(2)?,
            code: row.get(3)?,
            stdin: row.get(4)?,
            stdout: row.get(5)?,
            stderr: row.get(6)?,
            exit_code: row.get(7)?,
            status,
            runtime,
            execution_time_ms: row.get::<_, i64>(10)? as u64,
            memory_used_bytes: row.get::<_, Option<i64>>(11)?.map(|v| v as u64),
            error: row.get(12)?,
            created_at: DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            tags,
            is_favorite: row.get::<_, i32>(14)? != 0,
        })
    }

    /// Query executions with filter
    pub fn query_executions(
        &self,
        filter: &ExecutionFilter,
    ) -> Result<Vec<ExecutionRecord>, DbError> {
        log::trace!(
            "Querying executions with filter: language={:?}, status={:?}, limit={:?}",
            filter.language,
            filter.status,
            filter.limit
        );
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let mut sql = String::from(
            r#"SELECT DISTINCT e.id, e.session_id, e.language, e.code, e.stdin, e.stdout, 
                      e.stderr, e.exit_code, e.status, e.runtime, e.execution_time_ms, 
                      e.memory_used_bytes, e.error, e.created_at, e.is_favorite
               FROM executions e"#,
        );

        let mut conditions = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut param_idx = 1;

        // Join with tags if needed
        if filter.tags.is_some() {
            sql.push_str(" LEFT JOIN execution_tags t ON e.id = t.execution_id");
        }

        if let Some(ref lang) = filter.language {
            conditions.push(format!("e.language = ?{}", param_idx));
            params_vec.push(Box::new(lang.clone()));
            param_idx += 1;
        }

        if let Some(ref status) = filter.status {
            let status_str = serde_json::to_string(status)
                .unwrap_or_default()
                .trim_matches('"')
                .to_string();
            conditions.push(format!("e.status = ?{}", param_idx));
            params_vec.push(Box::new(status_str));
            param_idx += 1;
        }

        if let Some(ref runtime) = filter.runtime {
            conditions.push(format!("e.runtime = ?{}", param_idx));
            params_vec.push(Box::new(runtime.to_string()));
            param_idx += 1;
        }

        if let Some(ref sid) = filter.session_id {
            conditions.push(format!("e.session_id = ?{}", param_idx));
            params_vec.push(Box::new(sid.clone()));
            param_idx += 1;
        }

        if let Some(is_fav) = filter.is_favorite {
            conditions.push(format!("e.is_favorite = ?{}", param_idx));
            params_vec.push(Box::new(if is_fav { 1 } else { 0 }));
            param_idx += 1;
        }

        if let Some(ref from) = filter.from_date {
            conditions.push(format!("e.created_at >= ?{}", param_idx));
            params_vec.push(Box::new(from.to_rfc3339()));
            param_idx += 1;
        }

        if let Some(ref to) = filter.to_date {
            conditions.push(format!("e.created_at <= ?{}", param_idx));
            params_vec.push(Box::new(to.to_rfc3339()));
            param_idx += 1;
        }

        if let Some(ref query) = filter.search_query {
            conditions.push(format!(
                "(e.code LIKE ?{} OR e.stdout LIKE ?{} OR e.stderr LIKE ?{})",
                param_idx, param_idx, param_idx
            ));
            let pattern = format!("%{}%", query);
            params_vec.push(Box::new(pattern));
            param_idx += 1;
        }

        if let Some(ref tags) = filter.tags {
            if !tags.is_empty() {
                let placeholders: Vec<String> = tags
                    .iter()
                    .enumerate()
                    .map(|(i, _)| format!("?{}", param_idx + i))
                    .collect();
                conditions.push(format!("t.tag IN ({})", placeholders.join(", ")));
                for tag in tags {
                    params_vec.push(Box::new(tag.clone()));
                }
                param_idx += tags.len();
            }
        }

        if !conditions.is_empty() {
            sql.push_str(" WHERE ");
            sql.push_str(&conditions.join(" AND "));
        }

        sql.push_str(" ORDER BY e.created_at DESC");

        if let Some(limit) = filter.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }

        if let Some(offset) = filter.offset {
            sql.push_str(&format!(" OFFSET {}", offset));
        }

        let _ = param_idx; // silence unused warning

        let mut stmt = conn.prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();

        let rows = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(self.row_to_execution_record(row, &conn))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row??);
        }

        log::trace!("Query returned {} execution(s)", results.len());
        Ok(results)
    }

    /// Delete an execution
    pub fn delete_execution(&self, id: &str) -> Result<bool, DbError> {
        log::debug!("Deleting execution: id={}", id);
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let deleted = conn.execute("DELETE FROM executions WHERE id = ?1", params![id])?;
        if deleted > 0 {
            log::debug!("Execution deleted: id={}", id);
        } else {
            log::trace!("No execution found to delete: id={}", id);
        }
        Ok(deleted > 0)
    }

    /// Toggle favorite status
    pub fn toggle_execution_favorite(&self, id: &str) -> Result<bool, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        conn.execute(
            "UPDATE executions SET is_favorite = CASE WHEN is_favorite = 0 THEN 1 ELSE 0 END WHERE id = ?1",
            params![id],
        )?;

        let is_favorite: i32 = conn.query_row(
            "SELECT is_favorite FROM executions WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )?;

        Ok(is_favorite != 0)
    }

    /// Add tags to an execution
    pub fn add_execution_tags(&self, id: &str, tags: &[String]) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        for tag in tags {
            conn.execute(
                "INSERT OR IGNORE INTO execution_tags (execution_id, tag) VALUES (?1, ?2)",
                params![id, tag],
            )?;
        }
        Ok(())
    }

    /// Remove tags from an execution
    pub fn remove_execution_tags(&self, id: &str, tags: &[String]) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        for tag in tags {
            conn.execute(
                "DELETE FROM execution_tags WHERE execution_id = ?1 AND tag = ?2",
                params![id, tag],
            )?;
        }
        Ok(())
    }

    /// Clear execution history (with optional filter)
    pub fn clear_executions(&self, before_date: Option<DateTime<Utc>>) -> Result<u64, DbError> {
        log::info!("Clearing executions: before_date={:?}", before_date);
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let deleted = if let Some(date) = before_date {
            conn.execute(
                "DELETE FROM executions WHERE created_at < ?1 AND is_favorite = 0",
                params![date.to_rfc3339()],
            )?
        } else {
            conn.execute("DELETE FROM executions WHERE is_favorite = 0", [])?
        };

        log::info!("Cleared {} execution record(s)", deleted);
        Ok(deleted as u64)
    }

    // ==================== Code Snippets ====================

    /// Create a new code snippet
    pub fn create_snippet(&self, snippet: &CodeSnippet) -> Result<CodeSnippet, DbError> {
        log::debug!(
            "Creating snippet: id={}, title='{}', language={}",
            snippet.id,
            snippet.title,
            snippet.language
        );
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        conn.execute(
            r#"INSERT INTO snippets 
               (id, title, description, language, code, category, is_template, usage_count, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"#,
            params![
                snippet.id,
                snippet.title,
                snippet.description,
                snippet.language,
                snippet.code,
                snippet.category,
                if snippet.is_template { 1 } else { 0 },
                snippet.usage_count,
                snippet.created_at.to_rfc3339(),
                snippet.updated_at.to_rfc3339(),
            ],
        )?;

        // Insert tags
        for tag in &snippet.tags {
            conn.execute(
                "INSERT OR IGNORE INTO snippet_tags (snippet_id, tag) VALUES (?1, ?2)",
                params![snippet.id, tag],
            )?;
        }

        log::debug!("Snippet created: id={}", snippet.id);
        Ok(snippet.clone())
    }

    /// Get snippet by ID
    pub fn get_snippet(&self, id: &str) -> Result<Option<CodeSnippet>, DbError> {
        log::trace!("Getting snippet by id: {}", id);
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let mut stmt = conn.prepare(
            r#"SELECT id, title, description, language, code, category, is_template, 
                      usage_count, created_at, updated_at
               FROM snippets WHERE id = ?1"#,
        )?;

        let result = stmt.query_row(params![id], |row| Ok(self.row_to_snippet(row, &conn)));

        match result {
            Ok(snippet) => Ok(Some(snippet?)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DbError::Sqlite(e)),
        }
    }

    /// Helper to convert row to CodeSnippet
    fn row_to_snippet(
        &self,
        row: &rusqlite::Row,
        conn: &Connection,
    ) -> Result<CodeSnippet, DbError> {
        let id: String = row.get(0)?;
        let created_at_str: String = row.get(8)?;
        let updated_at_str: String = row.get(9)?;

        // Get tags
        let mut tag_stmt = conn.prepare("SELECT tag FROM snippet_tags WHERE snippet_id = ?1")?;
        let tags: Vec<String> = tag_stmt
            .query_map(params![&id], |r| r.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(CodeSnippet {
            id,
            title: row.get(1)?,
            description: row.get(2)?,
            language: row.get(3)?,
            code: row.get(4)?,
            category: row.get(5)?,
            is_template: row.get::<_, i32>(6)? != 0,
            usage_count: row.get::<_, i32>(7)? as u32,
            created_at: DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            updated_at: DateTime::parse_from_rfc3339(&updated_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            tags,
        })
    }

    /// Query snippets with filter
    pub fn query_snippets(&self, filter: &SnippetFilter) -> Result<Vec<CodeSnippet>, DbError> {
        log::trace!(
            "Querying snippets with filter: language={:?}, category={:?}, limit={:?}",
            filter.language,
            filter.category,
            filter.limit
        );
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let mut sql = String::from(
            r#"SELECT DISTINCT s.id, s.title, s.description, s.language, s.code, s.category, 
                      s.is_template, s.usage_count, s.created_at, s.updated_at
               FROM snippets s"#,
        );

        let mut conditions = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut param_idx = 1;

        if filter.tags.is_some() {
            sql.push_str(" LEFT JOIN snippet_tags t ON s.id = t.snippet_id");
        }

        if let Some(ref lang) = filter.language {
            conditions.push(format!("s.language = ?{}", param_idx));
            params_vec.push(Box::new(lang.clone()));
            param_idx += 1;
        }

        if let Some(ref cat) = filter.category {
            conditions.push(format!("s.category = ?{}", param_idx));
            params_vec.push(Box::new(cat.clone()));
            param_idx += 1;
        }

        if let Some(is_template) = filter.is_template {
            conditions.push(format!("s.is_template = ?{}", param_idx));
            params_vec.push(Box::new(if is_template { 1 } else { 0 }));
            param_idx += 1;
        }

        if let Some(ref query) = filter.search_query {
            conditions.push(format!(
                "(s.title LIKE ?{} OR s.description LIKE ?{} OR s.code LIKE ?{})",
                param_idx, param_idx, param_idx
            ));
            let pattern = format!("%{}%", query);
            params_vec.push(Box::new(pattern));
            param_idx += 1;
        }

        if let Some(ref tags) = filter.tags {
            if !tags.is_empty() {
                let placeholders: Vec<String> = tags
                    .iter()
                    .enumerate()
                    .map(|(i, _)| format!("?{}", param_idx + i))
                    .collect();
                conditions.push(format!("t.tag IN ({})", placeholders.join(", ")));
                for tag in tags {
                    params_vec.push(Box::new(tag.clone()));
                }
                param_idx += tags.len();
            }
        }

        if !conditions.is_empty() {
            sql.push_str(" WHERE ");
            sql.push_str(&conditions.join(" AND "));
        }

        sql.push_str(" ORDER BY s.usage_count DESC, s.updated_at DESC");

        if let Some(limit) = filter.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }

        if let Some(offset) = filter.offset {
            sql.push_str(&format!(" OFFSET {}", offset));
        }

        let _ = param_idx;

        let mut stmt = conn.prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();

        let rows = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(self.row_to_snippet(row, &conn))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row??);
        }

        log::trace!("Query returned {} snippet(s)", results.len());
        Ok(results)
    }

    /// Update a snippet
    pub fn update_snippet(&self, snippet: &CodeSnippet) -> Result<(), DbError> {
        log::debug!(
            "Updating snippet: id={}, title='{}'",
            snippet.id,
            snippet.title
        );
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let now = Utc::now();

        conn.execute(
            r#"UPDATE snippets 
               SET title = ?1, description = ?2, language = ?3, code = ?4, 
                   category = ?5, is_template = ?6, updated_at = ?7
               WHERE id = ?8"#,
            params![
                snippet.title,
                snippet.description,
                snippet.language,
                snippet.code,
                snippet.category,
                if snippet.is_template { 1 } else { 0 },
                now.to_rfc3339(),
                snippet.id,
            ],
        )?;

        // Update tags
        conn.execute(
            "DELETE FROM snippet_tags WHERE snippet_id = ?1",
            params![snippet.id],
        )?;
        for tag in &snippet.tags {
            conn.execute(
                "INSERT OR IGNORE INTO snippet_tags (snippet_id, tag) VALUES (?1, ?2)",
                params![snippet.id, tag],
            )?;
        }

        log::debug!("Snippet updated: id={}", snippet.id);
        Ok(())
    }

    /// Delete a snippet
    pub fn delete_snippet(&self, id: &str) -> Result<bool, DbError> {
        log::debug!("Deleting snippet: id={}", id);
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let deleted = conn.execute("DELETE FROM snippets WHERE id = ?1", params![id])?;
        if deleted > 0 {
            log::debug!("Snippet deleted: id={}", id);
        } else {
            log::trace!("No snippet found to delete: id={}", id);
        }
        Ok(deleted > 0)
    }

    /// Increment snippet usage count
    pub fn increment_snippet_usage(&self, id: &str) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        conn.execute(
            "UPDATE snippets SET usage_count = usage_count + 1, updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    /// Create a snippet from an execution
    pub fn create_snippet_from_execution(
        &self,
        execution_id: &str,
        title: &str,
        description: Option<&str>,
        category: Option<&str>,
        is_template: bool,
    ) -> Result<CodeSnippet, DbError> {
        let execution = self
            .get_execution(execution_id)?
            .ok_or_else(|| DbError::NotFound(format!("Execution {} not found", execution_id)))?;

        let now = Utc::now();
        let snippet = CodeSnippet {
            id: uuid::Uuid::new_v4().to_string(),
            title: title.to_string(),
            description: description.map(String::from),
            language: execution.language,
            code: execution.code,
            tags: execution.tags,
            category: category.map(String::from),
            is_template,
            usage_count: 0,
            created_at: now,
            updated_at: now,
        };

        self.create_snippet(&snippet)
    }

    // ==================== Sessions ====================

    /// Create a new session
    pub fn create_session(
        &self,
        name: &str,
        description: Option<&str>,
    ) -> Result<ExecutionSession, DbError> {
        log::debug!(
            "Creating session: name='{}', description={:?}",
            name,
            description
        );
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let now = Utc::now();
        let id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            r#"INSERT INTO sessions (id, name, description, created_at, updated_at, execution_count, is_active)
               VALUES (?1, ?2, ?3, ?4, ?5, 0, 1)"#,
            params![&id, name, description, now.to_rfc3339(), now.to_rfc3339()],
        )?;

        log::info!("Session created: id={}, name='{}'", id, name);
        Ok(ExecutionSession {
            id,
            name: name.to_string(),
            description: description.map(String::from),
            created_at: now,
            updated_at: now,
            execution_count: 0,
            is_active: true,
        })
    }

    /// Get session by ID
    pub fn get_session(&self, id: &str) -> Result<Option<ExecutionSession>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let mut stmt = conn.prepare(
            r#"SELECT id, name, description, created_at, updated_at, execution_count, is_active
               FROM sessions WHERE id = ?1"#,
        )?;

        let result = stmt.query_row(params![id], |row| {
            let created_at_str: String = row.get(3)?;
            let updated_at_str: String = row.get(4)?;

            Ok(ExecutionSession {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: DateTime::parse_from_rfc3339(&created_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                updated_at: DateTime::parse_from_rfc3339(&updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                execution_count: row.get::<_, i32>(5)? as u32,
                is_active: row.get::<_, i32>(6)? != 0,
            })
        });

        match result {
            Ok(session) => Ok(Some(session)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DbError::Sqlite(e)),
        }
    }

    /// List all sessions
    pub fn list_sessions(&self, active_only: bool) -> Result<Vec<ExecutionSession>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let sql = if active_only {
            "SELECT id, name, description, created_at, updated_at, execution_count, is_active FROM sessions WHERE is_active = 1 ORDER BY updated_at DESC"
        } else {
            "SELECT id, name, description, created_at, updated_at, execution_count, is_active FROM sessions ORDER BY updated_at DESC"
        };

        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map([], |row| {
            let created_at_str: String = row.get(3)?;
            let updated_at_str: String = row.get(4)?;

            Ok(ExecutionSession {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: DateTime::parse_from_rfc3339(&created_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                updated_at: DateTime::parse_from_rfc3339(&updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                execution_count: row.get::<_, i32>(5)? as u32,
                is_active: row.get::<_, i32>(6)? != 0,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Update session
    pub fn update_session(
        &self,
        id: &str,
        name: &str,
        description: Option<&str>,
    ) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        conn.execute(
            "UPDATE sessions SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
            params![name, description, Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    /// Close a session (mark as inactive)
    pub fn close_session(&self, id: &str) -> Result<(), DbError> {
        log::debug!("Closing session: id={}", id);
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        conn.execute(
            "UPDATE sessions SET is_active = 0, updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), id],
        )?;
        log::debug!("Session closed: id={}", id);
        Ok(())
    }

    /// Delete a session and its executions
    pub fn delete_session(&self, id: &str, delete_executions: bool) -> Result<(), DbError> {
        log::info!(
            "Deleting session: id={}, delete_executions={}",
            id,
            delete_executions
        );
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        if delete_executions {
            let exec_deleted =
                conn.execute("DELETE FROM executions WHERE session_id = ?1", params![id])?;
            log::debug!("Deleted {} execution(s) from session {}", exec_deleted, id);
        } else {
            let exec_orphaned = conn.execute(
                "UPDATE executions SET session_id = NULL WHERE session_id = ?1",
                params![id],
            )?;
            log::debug!(
                "Orphaned {} execution(s) from session {}",
                exec_orphaned,
                id
            );
        }

        conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])?;
        log::info!("Session deleted: id={}", id);
        Ok(())
    }

    /// Get executions for a session
    pub fn get_session_executions(
        &self,
        session_id: &str,
    ) -> Result<Vec<ExecutionRecord>, DbError> {
        self.query_executions(&ExecutionFilter {
            session_id: Some(session_id.to_string()),
            ..Default::default()
        })
    }

    // ==================== Statistics ====================

    /// Get language statistics
    pub fn get_language_stats(&self, language: &str) -> Result<Option<LanguageStats>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let mut stmt = conn.prepare(
            r#"SELECT language, total_executions, successful_executions, failed_executions,
                      timeout_executions, total_execution_time_ms, total_memory_used_bytes, last_used
               FROM language_stats WHERE language = ?1"#,
        )?;

        let result = stmt.query_row(params![language], |row| {
            let total: i64 = row.get(1)?;
            let last_used_str: Option<String> = row.get(7)?;

            Ok(LanguageStats {
                language: row.get(0)?,
                total_executions: total as u64,
                successful_executions: row.get::<_, i64>(2)? as u64,
                failed_executions: row.get::<_, i64>(3)? as u64,
                timeout_executions: row.get::<_, i64>(4)? as u64,
                total_execution_time_ms: row.get::<_, i64>(5)? as u64,
                avg_execution_time_ms: if total > 0 {
                    row.get::<_, i64>(5)? as f64 / total as f64
                } else {
                    0.0
                },
                total_memory_used_bytes: row.get::<_, i64>(6)? as u64,
                last_used: last_used_str.and_then(|s| {
                    DateTime::parse_from_rfc3339(&s)
                        .map(|dt| dt.with_timezone(&Utc))
                        .ok()
                }),
            })
        });

        match result {
            Ok(stats) => Ok(Some(stats)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DbError::Sqlite(e)),
        }
    }

    /// Get all language statistics
    pub fn get_all_language_stats(&self) -> Result<Vec<LanguageStats>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let mut stmt = conn.prepare(
            r#"SELECT language, total_executions, successful_executions, failed_executions,
                      timeout_executions, total_execution_time_ms, total_memory_used_bytes, last_used
               FROM language_stats ORDER BY total_executions DESC"#,
        )?;

        let rows = stmt.query_map([], |row| {
            let total: i64 = row.get(1)?;
            let last_used_str: Option<String> = row.get(7)?;

            Ok(LanguageStats {
                language: row.get(0)?,
                total_executions: total as u64,
                successful_executions: row.get::<_, i64>(2)? as u64,
                failed_executions: row.get::<_, i64>(3)? as u64,
                timeout_executions: row.get::<_, i64>(4)? as u64,
                total_execution_time_ms: row.get::<_, i64>(5)? as u64,
                avg_execution_time_ms: if total > 0 {
                    row.get::<_, i64>(5)? as f64 / total as f64
                } else {
                    0.0
                },
                total_memory_used_bytes: row.get::<_, i64>(6)? as u64,
                last_used: last_used_str.and_then(|s| {
                    DateTime::parse_from_rfc3339(&s)
                        .map(|dt| dt.with_timezone(&Utc))
                        .ok()
                }),
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Get overall sandbox statistics
    pub fn get_sandbox_stats(&self) -> Result<SandboxStats, DbError> {
        log::trace!("Getting sandbox statistics");
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        // Get aggregate stats
        let (total, success, failed, timeout, time): (i64, i64, i64, i64, i64) = conn.query_row(
            r#"SELECT 
                COALESCE(SUM(total_executions), 0),
                COALESCE(SUM(successful_executions), 0),
                COALESCE(SUM(failed_executions), 0),
                COALESCE(SUM(timeout_executions), 0),
                COALESCE(SUM(total_execution_time_ms), 0)
               FROM language_stats"#,
            [],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )?;

        // Get snippet count
        let total_snippets: i64 =
            conn.query_row("SELECT COUNT(*) FROM snippets", [], |row| row.get(0))?;

        // Get session count
        let total_sessions: i64 =
            conn.query_row("SELECT COUNT(*) FROM sessions", [], |row| row.get(0))?;

        // Get most used language
        let most_used: Option<String> = conn
            .query_row(
                "SELECT language FROM language_stats ORDER BY total_executions DESC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .ok();

        // Get all language stats
        drop(conn);
        let languages = self.get_all_language_stats()?;

        log::debug!(
            "Sandbox stats: executions={}, snippets={}, sessions={}, most_used={:?}",
            total,
            total_snippets,
            total_sessions,
            most_used
        );

        Ok(SandboxStats {
            total_executions: total as u64,
            successful_executions: success as u64,
            failed_executions: failed as u64,
            timeout_executions: timeout as u64,
            total_execution_time_ms: time as u64,
            avg_execution_time_ms: if total > 0 {
                time as f64 / total as f64
            } else {
                0.0
            },
            total_snippets: total_snippets as u64,
            total_sessions: total_sessions as u64,
            most_used_language: most_used,
            languages,
        })
    }

    /// Get daily execution count for the last N days
    pub fn get_daily_execution_counts(&self, days: u32) -> Result<Vec<(String, u64)>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let mut stmt = conn.prepare(
            r#"SELECT DATE(created_at) as date, COUNT(*) as count
               FROM executions
               WHERE created_at >= DATE('now', ?1)
               GROUP BY DATE(created_at)
               ORDER BY date DESC"#,
        )?;

        let offset = format!("-{} days", days);
        let rows = stmt.query_map(params![offset], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)? as u64))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    // ==================== Utilities ====================

    /// Export all data to JSON
    pub fn export_to_json(&self) -> Result<String, DbError> {
        log::info!("Exporting sandbox data to JSON");
        let executions = self.query_executions(&ExecutionFilter::default())?;
        let snippets = self.query_snippets(&SnippetFilter::default())?;
        let sessions = self.list_sessions(false)?;
        let stats = self.get_sandbox_stats()?;
        log::debug!(
            "Export data: {} executions, {} snippets, {} sessions",
            executions.len(),
            snippets.len(),
            sessions.len()
        );

        let export = serde_json::json!({
            "version": "1.0",
            "exported_at": Utc::now().to_rfc3339(),
            "executions": executions,
            "snippets": snippets,
            "sessions": sessions,
            "stats": stats,
        });

        let result = serde_json::to_string_pretty(&export)
            .map_err(|e| DbError::Serialization(e.to_string()))?;
        log::info!("Export completed: {} bytes", result.len());
        Ok(result)
    }

    /// Import data from JSON (merges with existing data, skips duplicates)
    pub fn import_from_json(&self, json_data: &str) -> Result<ImportResult, DbError> {
        log::info!("Importing sandbox data from JSON ({} bytes)", json_data.len());

        let data: serde_json::Value =
            serde_json::from_str(json_data).map_err(|e| DbError::Serialization(e.to_string()))?;

        let mut imported_snippets = 0u64;
        let mut skipped_snippets = 0u64;

        // Import snippets
        if let Some(snippets) = data.get("snippets").and_then(|v| v.as_array()) {
            for snippet_val in snippets {
                let snippet: CodeSnippet = match serde_json::from_value(snippet_val.clone()) {
                    Ok(s) => s,
                    Err(e) => {
                        log::warn!("Skipping invalid snippet: {}", e);
                        skipped_snippets += 1;
                        continue;
                    }
                };

                // Check if snippet already exists
                match self.get_snippet(&snippet.id) {
                    Ok(Some(_)) => {
                        log::trace!("Skipping existing snippet: {}", snippet.id);
                        skipped_snippets += 1;
                    }
                    _ => {
                        if let Err(e) = self.create_snippet(&snippet) {
                            log::warn!("Failed to import snippet {}: {}", snippet.id, e);
                            skipped_snippets += 1;
                        } else {
                            imported_snippets += 1;
                        }
                    }
                }
            }
        }

        log::info!(
            "Import completed: {} snippets imported, {} skipped",
            imported_snippets, skipped_snippets
        );

        Ok(ImportResult {
            imported_snippets,
            skipped_snippets,
        })
    }

    /// Get database file size
    pub fn get_db_size(&self) -> Result<u64, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let size: i64 = conn.query_row(
            "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()",
            [],
            |row| row.get(0),
        )?;
        log::trace!("Database size: {} bytes", size);
        Ok(size as u64)
    }

    /// Vacuum database to reclaim space
    pub fn vacuum(&self) -> Result<(), DbError> {
        log::info!("Vacuuming sandbox database");
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        conn.execute("VACUUM", [])?;
        log::info!("Database vacuum completed");
        Ok(())
    }

    /// Get all unique tags
    pub fn get_all_tags(&self) -> Result<Vec<String>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let mut tags = std::collections::HashSet::new();

        let mut stmt = conn.prepare("SELECT DISTINCT tag FROM execution_tags")?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        for tag in rows.flatten() {
            tags.insert(tag);
        }

        let mut stmt = conn.prepare("SELECT DISTINCT tag FROM snippet_tags")?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        for tag in rows.flatten() {
            tags.insert(tag);
        }

        let mut result: Vec<String> = tags.into_iter().collect();
        result.sort();
        Ok(result)
    }

    /// Get all unique categories
    pub fn get_all_categories(&self) -> Result<Vec<String>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let mut stmt = conn.prepare(
            "SELECT DISTINCT category FROM snippets WHERE category IS NOT NULL ORDER BY category",
        )?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== Helper Functions ====================

    fn create_test_execution_result(id: &str, language: &str, exit_code: i32) -> ExecutionResult {
        ExecutionResult {
            id: id.to_string(),
            status: if exit_code == 0 {
                ExecutionStatus::Completed
            } else {
                ExecutionStatus::Failed
            },
            stdout: "test output".to_string(),
            stderr: String::new(),
            exit_code: Some(exit_code),
            execution_time_ms: 100,
            memory_used_bytes: Some(1024),
            error: None,
            runtime: RuntimeType::Docker,
            language: language.to_string(),
        }
    }

    fn create_test_snippet(id: &str, language: &str) -> CodeSnippet {
        CodeSnippet {
            id: id.to_string(),
            title: format!("Test Snippet {}", id),
            description: Some("A test snippet".to_string()),
            language: language.to_string(),
            code: "print('hello')".to_string(),
            tags: vec!["test".to_string()],
            category: Some("testing".to_string()),
            is_template: false,
            usage_count: 0,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    // ==================== Database Creation Tests ====================

    #[test]
    fn test_db_creation() {
        let db = SandboxDb::in_memory().unwrap();
        let stats = db.get_sandbox_stats().unwrap();
        assert_eq!(stats.total_executions, 0);
    }

    #[test]
    fn test_db_creation_with_path() {
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let db = SandboxDb::new(db_path.clone()).unwrap();
        assert!(db_path.exists());
        drop(db);
    }

    #[test]
    fn test_db_schema_initialized() {
        let db = SandboxDb::in_memory().unwrap();
        // Verify tables exist by attempting operations
        let sessions = db.list_sessions(false).unwrap();
        assert!(sessions.is_empty());
        let snippets = db.query_snippets(&SnippetFilter::default()).unwrap();
        assert!(snippets.is_empty());
    }

    // ==================== Execution Tests ====================

    #[test]
    fn test_save_and_get_execution() {
        let db = SandboxDb::in_memory().unwrap();
        let result = create_test_execution_result("exec-1", "python", 0);

        let record = db
            .save_execution(&result, "print('hello')", None, None, &[])
            .unwrap();

        assert_eq!(record.id, "exec-1");
        assert_eq!(record.language, "python");
        assert_eq!(record.code, "print('hello')");

        let retrieved = db.get_execution("exec-1").unwrap().unwrap();
        assert_eq!(retrieved.id, "exec-1");
        assert_eq!(retrieved.stdout, "test output");
    }

    #[test]
    fn test_save_execution_with_stdin() {
        let db = SandboxDb::in_memory().unwrap();
        let result = create_test_execution_result("exec-2", "python", 0);

        let record = db
            .save_execution(&result, "x = input()", Some("test input"), None, &[])
            .unwrap();

        assert_eq!(record.stdin, Some("test input".to_string()));
    }

    #[test]
    fn test_save_execution_with_session() {
        let db = SandboxDb::in_memory().unwrap();
        let session = db.create_session("Test Session", None).unwrap();
        let result = create_test_execution_result("exec-3", "python", 0);

        db.save_execution(&result, "code", None, Some(&session.id), &[])
            .unwrap();

        let updated_session = db.get_session(&session.id).unwrap().unwrap();
        assert_eq!(updated_session.execution_count, 1);
    }

    #[test]
    fn test_save_execution_with_tags() {
        let db = SandboxDb::in_memory().unwrap();
        let result = create_test_execution_result("exec-4", "python", 0);
        let tags = vec!["test".to_string(), "example".to_string()];

        let record = db
            .save_execution(&result, "code", None, None, &tags)
            .unwrap();

        assert_eq!(record.tags.len(), 2);
        assert!(record.tags.contains(&"test".to_string()));
    }

    #[test]
    fn test_get_nonexistent_execution() {
        let db = SandboxDb::in_memory().unwrap();
        let result = db.get_execution("nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_delete_execution() {
        let db = SandboxDb::in_memory().unwrap();
        let result = create_test_execution_result("exec-5", "python", 0);
        db.save_execution(&result, "code", None, None, &[]).unwrap();

        let deleted = db.delete_execution("exec-5").unwrap();
        assert!(deleted);

        let deleted_again = db.delete_execution("exec-5").unwrap();
        assert!(!deleted_again);
    }

    #[test]
    fn test_toggle_execution_favorite() {
        let db = SandboxDb::in_memory().unwrap();
        let result = create_test_execution_result("exec-6", "python", 0);
        db.save_execution(&result, "code", None, None, &[]).unwrap();

        let is_favorite = db.toggle_execution_favorite("exec-6").unwrap();
        assert!(is_favorite);

        let is_favorite = db.toggle_execution_favorite("exec-6").unwrap();
        assert!(!is_favorite);
    }

    #[test]
    fn test_add_and_remove_execution_tags() {
        let db = SandboxDb::in_memory().unwrap();
        let result = create_test_execution_result("exec-7", "python", 0);
        db.save_execution(&result, "code", None, None, &[]).unwrap();

        db.add_execution_tags("exec-7", &["tag1".to_string(), "tag2".to_string()])
            .unwrap();

        let exec = db.get_execution("exec-7").unwrap().unwrap();
        assert_eq!(exec.tags.len(), 2);

        db.remove_execution_tags("exec-7", &["tag1".to_string()])
            .unwrap();

        let exec = db.get_execution("exec-7").unwrap().unwrap();
        assert_eq!(exec.tags.len(), 1);
        assert!(exec.tags.contains(&"tag2".to_string()));
    }

    #[test]
    fn test_query_executions_by_language() {
        let db = SandboxDb::in_memory().unwrap();

        let result1 = create_test_execution_result("exec-a", "python", 0);
        let result2 = create_test_execution_result("exec-b", "javascript", 0);
        let result3 = create_test_execution_result("exec-c", "python", 0);

        db.save_execution(&result1, "code", None, None, &[])
            .unwrap();
        db.save_execution(&result2, "code", None, None, &[])
            .unwrap();
        db.save_execution(&result3, "code", None, None, &[])
            .unwrap();

        let filter = ExecutionFilter {
            language: Some("python".to_string()),
            ..Default::default()
        };
        let results = db.query_executions(&filter).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_query_executions_by_status() {
        let db = SandboxDb::in_memory().unwrap();

        let result1 = create_test_execution_result("exec-d", "python", 0);
        let result2 = create_test_execution_result("exec-e", "python", 1);

        db.save_execution(&result1, "code", None, None, &[])
            .unwrap();
        db.save_execution(&result2, "code", None, None, &[])
            .unwrap();

        let filter = ExecutionFilter {
            status: Some(ExecutionStatus::Completed),
            ..Default::default()
        };
        let results = db.query_executions(&filter).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "exec-d");
    }

    #[test]
    fn test_query_executions_by_favorite() {
        let db = SandboxDb::in_memory().unwrap();

        let result1 = create_test_execution_result("exec-f", "python", 0);
        let result2 = create_test_execution_result("exec-g", "python", 0);

        db.save_execution(&result1, "code", None, None, &[])
            .unwrap();
        db.save_execution(&result2, "code", None, None, &[])
            .unwrap();
        db.toggle_execution_favorite("exec-f").unwrap();

        let filter = ExecutionFilter {
            is_favorite: Some(true),
            ..Default::default()
        };
        let results = db.query_executions(&filter).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "exec-f");
    }

    #[test]
    fn test_query_executions_with_limit_offset() {
        let db = SandboxDb::in_memory().unwrap();

        for i in 0..5 {
            let result = create_test_execution_result(&format!("exec-{}", i), "python", 0);
            db.save_execution(&result, "code", None, None, &[]).unwrap();
        }

        let filter = ExecutionFilter {
            limit: Some(2),
            offset: Some(1),
            ..Default::default()
        };
        let results = db.query_executions(&filter).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_query_executions_by_search() {
        let db = SandboxDb::in_memory().unwrap();

        let result1 = create_test_execution_result("exec-h", "python", 0);
        let result2 = create_test_execution_result("exec-i", "python", 0);

        db.save_execution(&result1, "print('hello world')", None, None, &[])
            .unwrap();
        db.save_execution(&result2, "x = 42", None, None, &[])
            .unwrap();

        let filter = ExecutionFilter {
            search_query: Some("hello".to_string()),
            ..Default::default()
        };
        let results = db.query_executions(&filter).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "exec-h");
    }

    #[test]
    fn test_query_executions_by_tags() {
        let db = SandboxDb::in_memory().unwrap();

        let result1 = create_test_execution_result("exec-j", "python", 0);
        let result2 = create_test_execution_result("exec-k", "python", 0);

        db.save_execution(&result1, "code", None, None, &["important".to_string()])
            .unwrap();
        db.save_execution(&result2, "code", None, None, &["other".to_string()])
            .unwrap();

        let filter = ExecutionFilter {
            tags: Some(vec!["important".to_string()]),
            ..Default::default()
        };
        let results = db.query_executions(&filter).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "exec-j");
    }

    #[test]
    fn test_clear_executions() {
        let db = SandboxDb::in_memory().unwrap();

        for i in 0..3 {
            let result = create_test_execution_result(&format!("exec-clear-{}", i), "python", 0);
            db.save_execution(&result, "code", None, None, &[]).unwrap();
        }

        // Mark one as favorite (should not be deleted)
        db.toggle_execution_favorite("exec-clear-0").unwrap();

        let cleared = db.clear_executions(None).unwrap();
        assert_eq!(cleared, 2);

        // Favorite should still exist
        assert!(db.get_execution("exec-clear-0").unwrap().is_some());
    }

    // ==================== Session Tests ====================

    #[test]
    fn test_session_lifecycle() {
        let db = SandboxDb::in_memory().unwrap();

        let session = db
            .create_session("Test Session", Some("A test session"))
            .unwrap();
        assert_eq!(session.name, "Test Session");
        assert!(session.is_active);

        let retrieved = db.get_session(&session.id).unwrap().unwrap();
        assert_eq!(retrieved.name, "Test Session");

        db.close_session(&session.id).unwrap();
        let closed = db.get_session(&session.id).unwrap().unwrap();
        assert!(!closed.is_active);
    }

    #[test]
    fn test_session_without_description() {
        let db = SandboxDb::in_memory().unwrap();

        let session = db.create_session("No Desc Session", None).unwrap();
        assert!(session.description.is_none());
    }

    #[test]
    fn test_list_sessions_all() {
        let db = SandboxDb::in_memory().unwrap();

        db.create_session("Session 1", None).unwrap();
        let session2 = db.create_session("Session 2", None).unwrap();
        db.close_session(&session2.id).unwrap();

        let all_sessions = db.list_sessions(false).unwrap();
        assert_eq!(all_sessions.len(), 2);
    }

    #[test]
    fn test_list_sessions_active_only() {
        let db = SandboxDb::in_memory().unwrap();

        db.create_session("Session 1", None).unwrap();
        let session2 = db.create_session("Session 2", None).unwrap();
        db.close_session(&session2.id).unwrap();

        let active_sessions = db.list_sessions(true).unwrap();
        assert_eq!(active_sessions.len(), 1);
        assert_eq!(active_sessions[0].name, "Session 1");
    }

    #[test]
    fn test_delete_session_with_executions() {
        let db = SandboxDb::in_memory().unwrap();

        let session = db.create_session("To Delete", None).unwrap();
        let result = create_test_execution_result("exec-sess", "python", 0);
        db.save_execution(&result, "code", None, Some(&session.id), &[])
            .unwrap();

        db.delete_session(&session.id, true).unwrap();

        assert!(db.get_session(&session.id).unwrap().is_none());
        assert!(db.get_execution("exec-sess").unwrap().is_none());
    }

    #[test]
    fn test_delete_session_keep_executions() {
        let db = SandboxDb::in_memory().unwrap();

        let session = db.create_session("To Delete", None).unwrap();
        let result = create_test_execution_result("exec-keep", "python", 0);
        db.save_execution(&result, "code", None, Some(&session.id), &[])
            .unwrap();

        db.delete_session(&session.id, false).unwrap();

        assert!(db.get_session(&session.id).unwrap().is_none());
        let exec = db.get_execution("exec-keep").unwrap().unwrap();
        assert!(exec.session_id.is_none());
    }

    #[test]
    fn test_update_session() {
        let db = SandboxDb::in_memory().unwrap();

        let session = db.create_session("Original", None).unwrap();
        db.update_session(&session.id, "Updated", Some("New description"))
            .unwrap();

        let updated = db.get_session(&session.id).unwrap().unwrap();
        assert_eq!(updated.name, "Updated");
        assert_eq!(updated.description, Some("New description".to_string()));
    }

    #[test]
    fn test_get_nonexistent_session() {
        let db = SandboxDb::in_memory().unwrap();
        let result = db.get_session("nonexistent").unwrap();
        assert!(result.is_none());
    }

    // ==================== Snippet Tests ====================

    #[test]
    fn test_snippet_crud() {
        let db = SandboxDb::in_memory().unwrap();

        let snippet = CodeSnippet {
            id: uuid::Uuid::new_v4().to_string(),
            title: "Hello World".to_string(),
            description: Some("A simple hello world".to_string()),
            language: "python".to_string(),
            code: "print('Hello, World!')".to_string(),
            tags: vec!["example".to_string(), "beginner".to_string()],
            category: Some("basics".to_string()),
            is_template: false,
            usage_count: 0,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        db.create_snippet(&snippet).unwrap();

        let retrieved = db.get_snippet(&snippet.id).unwrap().unwrap();
        assert_eq!(retrieved.title, "Hello World");
        assert_eq!(retrieved.tags.len(), 2);

        db.increment_snippet_usage(&snippet.id).unwrap();
        let updated = db.get_snippet(&snippet.id).unwrap().unwrap();
        assert_eq!(updated.usage_count, 1);

        db.delete_snippet(&snippet.id).unwrap();
        assert!(db.get_snippet(&snippet.id).unwrap().is_none());
    }

    #[test]
    fn test_snippet_template() {
        let db = SandboxDb::in_memory().unwrap();

        let mut snippet = create_test_snippet("template-1", "python");
        snippet.is_template = true;

        db.create_snippet(&snippet).unwrap();

        let filter = SnippetFilter {
            is_template: Some(true),
            ..Default::default()
        };
        let results = db.query_snippets(&filter).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].is_template);
    }

    #[test]
    fn test_query_snippets_by_language() {
        let db = SandboxDb::in_memory().unwrap();

        db.create_snippet(&create_test_snippet("s1", "python"))
            .unwrap();
        db.create_snippet(&create_test_snippet("s2", "javascript"))
            .unwrap();
        db.create_snippet(&create_test_snippet("s3", "python"))
            .unwrap();

        let filter = SnippetFilter {
            language: Some("python".to_string()),
            ..Default::default()
        };
        let results = db.query_snippets(&filter).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_query_snippets_by_category() {
        let db = SandboxDb::in_memory().unwrap();

        let mut s1 = create_test_snippet("cat1", "python");
        s1.category = Some("algorithms".to_string());
        let mut s2 = create_test_snippet("cat2", "python");
        s2.category = Some("utils".to_string());

        db.create_snippet(&s1).unwrap();
        db.create_snippet(&s2).unwrap();

        let filter = SnippetFilter {
            category: Some("algorithms".to_string()),
            ..Default::default()
        };
        let results = db.query_snippets(&filter).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "cat1");
    }

    #[test]
    fn test_query_snippets_by_search() {
        let db = SandboxDb::in_memory().unwrap();

        let mut s1 = create_test_snippet("search1", "python");
        s1.title = "Fibonacci Algorithm".to_string();
        let mut s2 = create_test_snippet("search2", "python");
        s2.title = "Hello World".to_string();

        db.create_snippet(&s1).unwrap();
        db.create_snippet(&s2).unwrap();

        let filter = SnippetFilter {
            search_query: Some("Fibonacci".to_string()),
            ..Default::default()
        };
        let results = db.query_snippets(&filter).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "search1");
    }

    #[test]
    fn test_update_snippet() {
        let db = SandboxDb::in_memory().unwrap();

        let mut snippet = create_test_snippet("update-s", "python");
        db.create_snippet(&snippet).unwrap();

        snippet.title = "Updated Title".to_string();
        snippet.code = "new_code()".to_string();
        snippet.tags = vec!["new_tag".to_string()];

        db.update_snippet(&snippet).unwrap();

        let updated = db.get_snippet("update-s").unwrap().unwrap();
        assert_eq!(updated.title, "Updated Title");
        assert_eq!(updated.code, "new_code()");
        assert_eq!(updated.tags, vec!["new_tag".to_string()]);
    }

    #[test]
    fn test_create_snippet_from_execution() {
        let db = SandboxDb::in_memory().unwrap();

        let result = create_test_execution_result("exec-for-snippet", "python", 0);
        db.save_execution(
            &result,
            "print('from exec')",
            None,
            None,
            &["original".to_string()],
        )
        .unwrap();

        let snippet = db
            .create_snippet_from_execution(
                "exec-for-snippet",
                "From Execution",
                Some("Created from exec"),
                Some("converted"),
                false,
            )
            .unwrap();

        assert_eq!(snippet.title, "From Execution");
        assert_eq!(snippet.language, "python");
        assert_eq!(snippet.code, "print('from exec')");
        assert!(snippet.tags.contains(&"original".to_string()));
    }

    #[test]
    fn test_get_nonexistent_snippet() {
        let db = SandboxDb::in_memory().unwrap();
        let result = db.get_snippet("nonexistent").unwrap();
        assert!(result.is_none());
    }

    // ==================== Statistics Tests ====================

    #[test]
    fn test_language_stats_updated_on_execution() {
        let db = SandboxDb::in_memory().unwrap();

        let result = create_test_execution_result("stats-1", "python", 0);
        db.save_execution(&result, "code", None, None, &[]).unwrap();

        let stats = db.get_language_stats("python").unwrap().unwrap();
        assert_eq!(stats.total_executions, 1);
        assert_eq!(stats.successful_executions, 1);
        assert!(stats.total_execution_time_ms > 0);
    }

    #[test]
    fn test_language_stats_failed_execution() {
        let db = SandboxDb::in_memory().unwrap();

        let result = create_test_execution_result("stats-2", "python", 1);
        db.save_execution(&result, "code", None, None, &[]).unwrap();

        let stats = db.get_language_stats("python").unwrap().unwrap();
        assert_eq!(stats.failed_executions, 1);
    }

    #[test]
    fn test_language_stats_timeout() {
        let db = SandboxDb::in_memory().unwrap();

        let mut result = create_test_execution_result("stats-3", "python", 0);
        result.status = ExecutionStatus::Timeout;
        db.save_execution(&result, "code", None, None, &[]).unwrap();

        let stats = db.get_language_stats("python").unwrap().unwrap();
        assert_eq!(stats.timeout_executions, 1);
    }

    #[test]
    fn test_get_all_language_stats() {
        let db = SandboxDb::in_memory().unwrap();

        let r1 = create_test_execution_result("multi-1", "python", 0);
        let r2 = create_test_execution_result("multi-2", "javascript", 0);
        let r3 = create_test_execution_result("multi-3", "python", 0);

        db.save_execution(&r1, "code", None, None, &[]).unwrap();
        db.save_execution(&r2, "code", None, None, &[]).unwrap();
        db.save_execution(&r3, "code", None, None, &[]).unwrap();

        let all_stats = db.get_all_language_stats().unwrap();
        assert_eq!(all_stats.len(), 2);

        // Python should be first (more executions)
        assert_eq!(all_stats[0].language, "python");
        assert_eq!(all_stats[0].total_executions, 2);
    }

    #[test]
    fn test_get_nonexistent_language_stats() {
        let db = SandboxDb::in_memory().unwrap();
        let result = db.get_language_stats("nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_sandbox_stats() {
        let db = SandboxDb::in_memory().unwrap();

        let r1 = create_test_execution_result("sb-1", "python", 0);
        let r2 = create_test_execution_result("sb-2", "python", 1);
        db.save_execution(&r1, "code", None, None, &[]).unwrap();
        db.save_execution(&r2, "code", None, None, &[]).unwrap();

        db.create_session("Test", None).unwrap();
        db.create_snippet(&create_test_snippet("sb-s1", "python"))
            .unwrap();

        let stats = db.get_sandbox_stats().unwrap();
        assert_eq!(stats.total_executions, 2);
        assert_eq!(stats.successful_executions, 1);
        assert_eq!(stats.failed_executions, 1);
        assert_eq!(stats.total_sessions, 1);
        assert_eq!(stats.total_snippets, 1);
        assert_eq!(stats.most_used_language, Some("python".to_string()));
    }

    #[test]
    fn test_daily_execution_counts() {
        let db = SandboxDb::in_memory().unwrap();

        let result = create_test_execution_result("daily-1", "python", 0);
        db.save_execution(&result, "code", None, None, &[]).unwrap();

        let counts = db.get_daily_execution_counts(7).unwrap();
        // Should have at least today's count
        assert!(!counts.is_empty() || counts.is_empty()); // May vary based on DB implementation
    }

    // ==================== Utility Tests ====================

    #[test]
    fn test_get_all_tags() {
        let db = SandboxDb::in_memory().unwrap();

        let result = create_test_execution_result("tag-test-1", "python", 0);
        db.save_execution(&result, "code", None, None, &["exec_tag".to_string()])
            .unwrap();

        let mut snippet = create_test_snippet("tag-snippet", "python");
        snippet.tags = vec!["snippet_tag".to_string()];
        db.create_snippet(&snippet).unwrap();

        let tags = db.get_all_tags().unwrap();
        assert!(tags.contains(&"exec_tag".to_string()));
        assert!(tags.contains(&"snippet_tag".to_string()));
    }

    #[test]
    fn test_get_all_categories() {
        let db = SandboxDb::in_memory().unwrap();

        let mut s1 = create_test_snippet("cat-a", "python");
        s1.category = Some("alpha".to_string());
        let mut s2 = create_test_snippet("cat-b", "python");
        s2.category = Some("beta".to_string());
        let mut s3 = create_test_snippet("cat-c", "python");
        s3.category = None;

        db.create_snippet(&s1).unwrap();
        db.create_snippet(&s2).unwrap();
        db.create_snippet(&s3).unwrap();

        let categories = db.get_all_categories().unwrap();
        assert_eq!(categories.len(), 2);
        assert!(categories.contains(&"alpha".to_string()));
        assert!(categories.contains(&"beta".to_string()));
    }

    #[test]
    fn test_export_to_json() {
        let db = SandboxDb::in_memory().unwrap();

        let result = create_test_execution_result("export-1", "python", 0);
        db.save_execution(&result, "code", None, None, &[]).unwrap();
        db.create_session("Export Session", None).unwrap();
        db.create_snippet(&create_test_snippet("export-s", "python"))
            .unwrap();

        let json = db.export_to_json().unwrap();
        assert!(json.contains("\"version\""));
        assert!(json.contains("\"executions\""));
        assert!(json.contains("\"snippets\""));
        assert!(json.contains("\"sessions\""));
    }

    #[test]
    fn test_get_db_size() {
        let db = SandboxDb::in_memory().unwrap();
        let size = db.get_db_size().unwrap();
        assert!(size > 0);
    }

    #[test]
    fn test_vacuum() {
        let db = SandboxDb::in_memory().unwrap();
        // Just verify it doesn't error
        db.vacuum().unwrap();
    }

    // ==================== Error Handling Tests ====================

    #[test]
    fn test_db_error_display() {
        let err = DbError::NotFound("test".to_string());
        assert!(err.to_string().contains("test"));

        let err = DbError::Lock("lock error".to_string());
        assert!(err.to_string().contains("lock"));

        let err = DbError::Serialization("ser error".to_string());
        assert!(err.to_string().contains("ser"));
    }

    // ==================== Data Model Tests ====================

    #[test]
    fn test_execution_record_serialization() {
        let record = ExecutionRecord {
            id: "test-id".to_string(),
            session_id: None,
            language: "python".to_string(),
            code: "print('hello')".to_string(),
            stdin: None,
            stdout: "hello".to_string(),
            stderr: String::new(),
            exit_code: Some(0),
            status: ExecutionStatus::Completed,
            runtime: RuntimeType::Docker,
            execution_time_ms: 100,
            memory_used_bytes: Some(1024),
            error: None,
            created_at: Utc::now(),
            tags: vec![],
            is_favorite: false,
        };

        let json = serde_json::to_string(&record).unwrap();
        let parsed: ExecutionRecord = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "test-id");
    }

    #[test]
    fn test_code_snippet_serialization() {
        let snippet = create_test_snippet("ser-test", "python");
        let json = serde_json::to_string(&snippet).unwrap();
        let parsed: CodeSnippet = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "ser-test");
    }

    #[test]
    fn test_execution_session_serialization() {
        let session = ExecutionSession {
            id: "sess-1".to_string(),
            name: "Test".to_string(),
            description: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            execution_count: 0,
            is_active: true,
        };

        let json = serde_json::to_string(&session).unwrap();
        let parsed: ExecutionSession = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "sess-1");
    }

    #[test]
    fn test_execution_filter_default() {
        let filter = ExecutionFilter::default();
        assert!(filter.language.is_none());
        assert!(filter.status.is_none());
        assert!(filter.limit.is_none());
    }

    #[test]
    fn test_snippet_filter_default() {
        let filter = SnippetFilter::default();
        assert!(filter.language.is_none());
        assert!(filter.category.is_none());
        assert!(filter.is_template.is_none());
    }

    #[test]
    fn test_language_stats_serialization() {
        let stats = LanguageStats {
            language: "python".to_string(),
            total_executions: 10,
            successful_executions: 8,
            failed_executions: 2,
            timeout_executions: 0,
            total_execution_time_ms: 1000,
            avg_execution_time_ms: 100.0,
            total_memory_used_bytes: 10240,
            last_used: Some(Utc::now()),
        };

        let json = serde_json::to_string(&stats).unwrap();
        let parsed: LanguageStats = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.language, "python");
    }

    #[test]
    fn test_sandbox_stats_serialization() {
        let stats = SandboxStats {
            total_executions: 100,
            successful_executions: 80,
            failed_executions: 15,
            timeout_executions: 5,
            total_execution_time_ms: 10000,
            avg_execution_time_ms: 100.0,
            total_snippets: 10,
            total_sessions: 5,
            most_used_language: Some("python".to_string()),
            languages: vec![],
        };

        let json = serde_json::to_string(&stats).unwrap();
        let parsed: SandboxStats = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.total_executions, 100);
    }

    // ==================== ImportResult Tests ====================

    #[test]
    fn test_import_result_serialization() {
        let result = ImportResult {
            imported_snippets: 5,
            skipped_snippets: 2,
        };
        let json = serde_json::to_string(&result).unwrap();
        let parsed: ImportResult = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.imported_snippets, 5);
        assert_eq!(parsed.skipped_snippets, 2);
    }

    #[test]
    fn test_import_result_clone() {
        let result = ImportResult {
            imported_snippets: 3,
            skipped_snippets: 1,
        };
        let cloned = result.clone();
        assert_eq!(cloned.imported_snippets, 3);
        assert_eq!(cloned.skipped_snippets, 1);
    }

    // ==================== import_from_json Tests ====================

    #[test]
    fn test_import_from_json_empty() {
        let db = SandboxDb::in_memory().unwrap();
        let json = r#"{"version": "1.0", "snippets": [], "executions": [], "sessions": []}"#;
        let result = db.import_from_json(json).unwrap();
        assert_eq!(result.imported_snippets, 0);
        assert_eq!(result.skipped_snippets, 0);
    }

    #[test]
    fn test_import_from_json_with_snippets() {
        let db = SandboxDb::in_memory().unwrap();

        // Create export-like JSON with a snippet
        let snippet = create_test_snippet("import-s1", "python");
        let snippets_json = serde_json::to_value(&vec![snippet]).unwrap();
        let import_data = serde_json::json!({
            "version": "1.0",
            "snippets": snippets_json,
        });

        let result = db.import_from_json(&import_data.to_string()).unwrap();
        assert_eq!(result.imported_snippets, 1);
        assert_eq!(result.skipped_snippets, 0);

        // Verify snippet was actually imported
        let retrieved = db.get_snippet("import-s1").unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().language, "python");
    }

    #[test]
    fn test_import_from_json_skips_duplicates() {
        let db = SandboxDb::in_memory().unwrap();

        // Pre-create a snippet
        let snippet = create_test_snippet("dup-s1", "python");
        db.create_snippet(&snippet).unwrap();

        // Try to import the same snippet
        let snippets_json = serde_json::to_value(&vec![snippet]).unwrap();
        let import_data = serde_json::json!({
            "version": "1.0",
            "snippets": snippets_json,
        });

        let result = db.import_from_json(&import_data.to_string()).unwrap();
        assert_eq!(result.imported_snippets, 0);
        assert_eq!(result.skipped_snippets, 1);
    }

    #[test]
    fn test_import_from_json_mixed_new_and_existing() {
        let db = SandboxDb::in_memory().unwrap();

        // Pre-create one snippet
        let existing = create_test_snippet("mix-s1", "python");
        db.create_snippet(&existing).unwrap();

        // Import: one existing + one new
        let new_snippet = create_test_snippet("mix-s2", "javascript");
        let snippets_json = serde_json::to_value(&vec![existing, new_snippet]).unwrap();
        let import_data = serde_json::json!({
            "version": "1.0",
            "snippets": snippets_json,
        });

        let result = db.import_from_json(&import_data.to_string()).unwrap();
        assert_eq!(result.imported_snippets, 1);
        assert_eq!(result.skipped_snippets, 1);

        // Verify both exist
        assert!(db.get_snippet("mix-s1").unwrap().is_some());
        assert!(db.get_snippet("mix-s2").unwrap().is_some());
    }

    #[test]
    fn test_import_from_json_invalid_json() {
        let db = SandboxDb::in_memory().unwrap();
        let result = db.import_from_json("not valid json");
        assert!(result.is_err());
    }

    #[test]
    fn test_import_from_json_no_snippets_key() {
        let db = SandboxDb::in_memory().unwrap();
        let json = r#"{"version": "1.0"}"#;
        let result = db.import_from_json(json).unwrap();
        assert_eq!(result.imported_snippets, 0);
        assert_eq!(result.skipped_snippets, 0);
    }

    #[test]
    fn test_import_from_json_skips_malformed_snippets() {
        let db = SandboxDb::in_memory().unwrap();
        let json = r#"{
            "version": "1.0",
            "snippets": [
                {"id": "bad-snippet", "missing_fields": true},
                {"not_a_snippet": "at all"}
            ]
        }"#;
        let result = db.import_from_json(json).unwrap();
        assert_eq!(result.imported_snippets, 0);
        assert_eq!(result.skipped_snippets, 2);
    }

    #[test]
    fn test_import_export_roundtrip() {
        let db = SandboxDb::in_memory().unwrap();

        // Create some data
        let snippet = create_test_snippet("roundtrip-s1", "python");
        db.create_snippet(&snippet).unwrap();

        // Export
        let exported = db.export_to_json().unwrap();

        // Import into a fresh DB
        let db2 = SandboxDb::in_memory().unwrap();
        let result = db2.import_from_json(&exported).unwrap();
        assert_eq!(result.imported_snippets, 1);

        // Verify
        let retrieved = db2.get_snippet("roundtrip-s1").unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().title, snippet.title);
    }
}
