use chrono::Utc;
use rusqlite::{params, Connection};

pub const CHAT_DB_SCHEMA_VERSION: i64 = 1;

pub fn initialize_chat_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        r#"
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            payload_json TEXT NOT NULL,
            project_id TEXT,
            folder_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            branch_id TEXT,
            created_at TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            payload_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS knowledge_files (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS summaries (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            summary_type TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS backup_jobs (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            meta_json TEXT
        );

        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
        CREATE INDEX IF NOT EXISTS idx_messages_session_created ON messages(session_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_branch_created ON messages(session_id, branch_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_knowledge_files_project ON knowledge_files(project_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_summaries_session_created ON summaries(session_id, created_at DESC);
        "#,
    )?;

    conn.execute(
        "INSERT INTO meta (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        params![
            "schema_version",
            CHAT_DB_SCHEMA_VERSION.to_string(),
            Utc::now().to_rfc3339()
        ],
    )?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn read_schema_version(conn: &Connection) -> String {
        conn.query_row(
            "SELECT value FROM meta WHERE key = 'schema_version'",
            [],
            |row| row.get::<_, String>(0),
        )
        .expect("schema version should be present")
    }

    #[test]
    fn initialize_writes_current_schema_version() {
        let conn = Connection::open_in_memory().expect("in-memory sqlite should open");
        initialize_chat_schema(&conn).expect("schema initialization should succeed");

        assert_eq!(read_schema_version(&conn), CHAT_DB_SCHEMA_VERSION.to_string());
    }

    #[test]
    fn initialize_overwrites_stale_schema_version() {
        let conn = Connection::open_in_memory().expect("in-memory sqlite should open");
        initialize_chat_schema(&conn).expect("schema initialization should succeed");

        conn.execute(
            "UPDATE meta SET value = ?1 WHERE key = 'schema_version'",
            params!["9999"],
        )
        .expect("schema version should be mutable in test setup");

        initialize_chat_schema(&conn).expect("schema initialization should refresh version");
        assert_eq!(read_schema_version(&conn), CHAT_DB_SCHEMA_VERSION.to_string());
    }
}
