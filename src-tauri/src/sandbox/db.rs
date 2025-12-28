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
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&db_path)?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.initialize_schema()?;
        Ok(db)
    }

    /// Create an in-memory database (for testing)
    #[allow(dead_code)]
    pub fn in_memory() -> Result<Self, DbError> {
        let conn = Connection::open_in_memory()?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.initialize_schema()?;
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
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let now = Utc::now();
        let status_str = serde_json::to_string(&result.status)
            .map_err(|e| DbError::Serialization(e.to_string()))?
            .trim_matches('"')
            .to_string();
        let runtime_str = result.runtime.to_string();

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
        let mut tag_stmt = conn.prepare("SELECT tag FROM execution_tags WHERE execution_id = ?1")?;
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
    pub fn query_executions(&self, filter: &ExecutionFilter) -> Result<Vec<ExecutionRecord>, DbError> {
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
            conditions.push(format!("(e.code LIKE ?{} OR e.stdout LIKE ?{} OR e.stderr LIKE ?{})", 
                param_idx, param_idx, param_idx));
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
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        let rows = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(self.row_to_execution_record(row, &conn))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row??);
        }

        Ok(results)
    }

    /// Delete an execution
    pub fn delete_execution(&self, id: &str) -> Result<bool, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let deleted = conn.execute("DELETE FROM executions WHERE id = ?1", params![id])?;
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
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        
        let deleted = if let Some(date) = before_date {
            conn.execute(
                "DELETE FROM executions WHERE created_at < ?1 AND is_favorite = 0",
                params![date.to_rfc3339()],
            )?
        } else {
            conn.execute("DELETE FROM executions WHERE is_favorite = 0", [])?
        };

        Ok(deleted as u64)
    }

    // ==================== Code Snippets ====================

    /// Create a new code snippet
    pub fn create_snippet(&self, snippet: &CodeSnippet) -> Result<CodeSnippet, DbError> {
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

        Ok(snippet.clone())
    }

    /// Get snippet by ID
    pub fn get_snippet(&self, id: &str) -> Result<Option<CodeSnippet>, DbError> {
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
    fn row_to_snippet(&self, row: &rusqlite::Row, conn: &Connection) -> Result<CodeSnippet, DbError> {
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
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        let rows = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(self.row_to_snippet(row, &conn))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row??);
        }

        Ok(results)
    }

    /// Update a snippet
    pub fn update_snippet(&self, snippet: &CodeSnippet) -> Result<(), DbError> {
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
        conn.execute("DELETE FROM snippet_tags WHERE snippet_id = ?1", params![snippet.id])?;
        for tag in &snippet.tags {
            conn.execute(
                "INSERT OR IGNORE INTO snippet_tags (snippet_id, tag) VALUES (?1, ?2)",
                params![snippet.id, tag],
            )?;
        }

        Ok(())
    }

    /// Delete a snippet
    pub fn delete_snippet(&self, id: &str) -> Result<bool, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let deleted = conn.execute("DELETE FROM snippets WHERE id = ?1", params![id])?;
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
    pub fn create_session(&self, name: &str, description: Option<&str>) -> Result<ExecutionSession, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let now = Utc::now();
        let id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            r#"INSERT INTO sessions (id, name, description, created_at, updated_at, execution_count, is_active)
               VALUES (?1, ?2, ?3, ?4, ?5, 0, 1)"#,
            params![id, name, description, now.to_rfc3339(), now.to_rfc3339()],
        )?;

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
    #[allow(dead_code)]
    pub fn update_session(&self, id: &str, name: &str, description: Option<&str>) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        conn.execute(
            "UPDATE sessions SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
            params![name, description, Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    /// Close a session (mark as inactive)
    pub fn close_session(&self, id: &str) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        conn.execute(
            "UPDATE sessions SET is_active = 0, updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    /// Delete a session and its executions
    pub fn delete_session(&self, id: &str, delete_executions: bool) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        
        if delete_executions {
            conn.execute("DELETE FROM executions WHERE session_id = ?1", params![id])?;
        } else {
            conn.execute("UPDATE executions SET session_id = NULL WHERE session_id = ?1", params![id])?;
        }

        conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Get executions for a session
    #[allow(dead_code)]
    pub fn get_session_executions(&self, session_id: &str) -> Result<Vec<ExecutionRecord>, DbError> {
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
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )?;

        // Get snippet count
        let total_snippets: i64 = conn.query_row(
            "SELECT COUNT(*) FROM snippets",
            [],
            |row| row.get(0),
        )?;

        // Get session count
        let total_sessions: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sessions",
            [],
            |row| row.get(0),
        )?;

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

        Ok(SandboxStats {
            total_executions: total as u64,
            successful_executions: success as u64,
            failed_executions: failed as u64,
            timeout_executions: timeout as u64,
            total_execution_time_ms: time as u64,
            avg_execution_time_ms: if total > 0 { time as f64 / total as f64 } else { 0.0 },
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
        let executions = self.query_executions(&ExecutionFilter::default())?;
        let snippets = self.query_snippets(&SnippetFilter::default())?;
        let sessions = self.list_sessions(false)?;
        let stats = self.get_sandbox_stats()?;

        let export = serde_json::json!({
            "version": "1.0",
            "exported_at": Utc::now().to_rfc3339(),
            "executions": executions,
            "snippets": snippets,
            "sessions": sessions,
            "stats": stats,
        });

        serde_json::to_string_pretty(&export).map_err(|e| DbError::Serialization(e.to_string()))
    }

    /// Get database file size
    pub fn get_db_size(&self) -> Result<u64, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let size: i64 = conn.query_row(
            "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()",
            [],
            |row| row.get(0),
        )?;
        Ok(size as u64)
    }

    /// Vacuum database to reclaim space
    pub fn vacuum(&self) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        conn.execute("VACUUM", [])?;
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

        let mut stmt = conn.prepare("SELECT DISTINCT category FROM snippets WHERE category IS NOT NULL ORDER BY category")?;
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

    #[test]
    fn test_db_creation() {
        let db = SandboxDb::in_memory().unwrap();
        let stats = db.get_sandbox_stats().unwrap();
        assert_eq!(stats.total_executions, 0);
    }

    #[test]
    fn test_session_lifecycle() {
        let db = SandboxDb::in_memory().unwrap();
        
        let session = db.create_session("Test Session", Some("A test session")).unwrap();
        assert_eq!(session.name, "Test Session");
        assert!(session.is_active);

        let retrieved = db.get_session(&session.id).unwrap().unwrap();
        assert_eq!(retrieved.name, "Test Session");

        db.close_session(&session.id).unwrap();
        let closed = db.get_session(&session.id).unwrap().unwrap();
        assert!(!closed.is_active);
    }

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
}
