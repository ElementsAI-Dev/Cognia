use std::path::PathBuf;
use std::sync::Mutex;

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value as JsonValue;

#[derive(Debug, Clone)]
pub struct SpeedPassRuntimeStoredSnapshot {
    pub user_id: String,
    pub revision: i64,
    pub snapshot: JsonValue,
    pub updated_at: String,
}

#[derive(Debug, thiserror::Error)]
pub enum SpeedPassRuntimeStorageError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("lock error: {0}")]
    Lock(String),

    #[error("serialization error: {0}")]
    Serialization(String),

    #[error("revision conflict: expected {expected}, actual {actual}")]
    RevisionConflict { expected: i64, actual: i64 },
}

pub struct SpeedPassRuntimeStorage {
    conn: Mutex<Connection>,
}

impl SpeedPassRuntimeStorage {
    pub fn new(db_path: PathBuf) -> Result<Self, SpeedPassRuntimeStorageError> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|error| SpeedPassRuntimeStorageError::Serialization(error.to_string()))?;
        }

        let conn = Connection::open(db_path)?;
        let storage = Self {
            conn: Mutex::new(conn),
        };
        storage.initialize_schema()?;
        Ok(storage)
    }

    pub fn in_memory() -> Result<Self, SpeedPassRuntimeStorageError> {
        let conn = Connection::open_in_memory()?;
        let storage = Self {
            conn: Mutex::new(conn),
        };
        storage.initialize_schema()?;
        Ok(storage)
    }

    fn initialize_schema(&self) -> Result<(), SpeedPassRuntimeStorageError> {
        let conn = self
            .conn
            .lock()
            .map_err(|error| SpeedPassRuntimeStorageError::Lock(error.to_string()))?;

        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS speedpass_snapshots (
                user_id TEXT PRIMARY KEY,
                revision INTEGER NOT NULL,
                snapshot_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS speedpass_migrations (
                migration_key TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL,
                meta_json TEXT
            );

            CREATE TABLE IF NOT EXISTS speedpass_backups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                snapshot_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_speedpass_backups_source_created
                ON speedpass_backups(source, created_at DESC);
            "#,
        )?;

        Ok(())
    }

    pub fn load_snapshot(
        &self,
        user_id: &str,
    ) -> Result<Option<SpeedPassRuntimeStoredSnapshot>, SpeedPassRuntimeStorageError> {
        let conn = self
            .conn
            .lock()
            .map_err(|error| SpeedPassRuntimeStorageError::Lock(error.to_string()))?;

        let row = conn
            .query_row(
                r#"
                SELECT user_id, revision, snapshot_json, updated_at
                FROM speedpass_snapshots
                WHERE user_id = ?1
                "#,
                params![user_id],
                |row| {
                    let snapshot_json = row.get::<_, String>("snapshot_json")?;
                    let snapshot = serde_json::from_str::<JsonValue>(&snapshot_json)
                        .unwrap_or(JsonValue::Object(serde_json::Map::new()));
                    Ok(SpeedPassRuntimeStoredSnapshot {
                        user_id: row.get("user_id")?,
                        revision: row.get("revision")?,
                        snapshot,
                        updated_at: row.get("updated_at")?,
                    })
                },
            )
            .optional()?;

        Ok(row)
    }

    pub fn save_snapshot(
        &self,
        user_id: &str,
        snapshot: &JsonValue,
        expected_revision: Option<i64>,
    ) -> Result<SpeedPassRuntimeStoredSnapshot, SpeedPassRuntimeStorageError> {
        let snapshot_json = serde_json::to_string(snapshot)
            .map_err(|error| SpeedPassRuntimeStorageError::Serialization(error.to_string()))?;
        let updated_at = Utc::now().to_rfc3339();

        let mut conn = self
            .conn
            .lock()
            .map_err(|error| SpeedPassRuntimeStorageError::Lock(error.to_string()))?;
        let tx = conn.transaction()?;

        let current_revision = tx
            .query_row(
                "SELECT revision FROM speedpass_snapshots WHERE user_id = ?1",
                params![user_id],
                |row| row.get::<_, i64>(0),
            )
            .optional()?;

        let next_revision = match current_revision {
            Some(actual_revision) => {
                if let Some(expected) = expected_revision {
                    if expected != actual_revision {
                        return Err(SpeedPassRuntimeStorageError::RevisionConflict {
                            expected,
                            actual: actual_revision,
                        });
                    }
                }
                actual_revision + 1
            }
            None => {
                if let Some(expected) = expected_revision {
                    if expected > 0 {
                        return Err(SpeedPassRuntimeStorageError::RevisionConflict {
                            expected,
                            actual: 0,
                        });
                    }
                }
                1
            }
        };

        tx.execute(
            r#"
            INSERT INTO speedpass_snapshots (user_id, revision, snapshot_json, updated_at)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(user_id) DO UPDATE SET
                revision = excluded.revision,
                snapshot_json = excluded.snapshot_json,
                updated_at = excluded.updated_at
            "#,
            params![user_id, next_revision, snapshot_json, updated_at],
        )?;

        tx.commit()?;

        Ok(SpeedPassRuntimeStoredSnapshot {
            user_id: user_id.to_string(),
            revision: next_revision,
            snapshot: snapshot.clone(),
            updated_at,
        })
    }

    pub fn save_backup(
        &self,
        source: &str,
        snapshot: &JsonValue,
    ) -> Result<(), SpeedPassRuntimeStorageError> {
        let snapshot_json = serde_json::to_string(snapshot)
            .map_err(|error| SpeedPassRuntimeStorageError::Serialization(error.to_string()))?;
        let created_at = Utc::now().to_rfc3339();

        let conn = self
            .conn
            .lock()
            .map_err(|error| SpeedPassRuntimeStorageError::Lock(error.to_string()))?;
        conn.execute(
            r#"
            INSERT INTO speedpass_backups (source, snapshot_json, created_at)
            VALUES (?1, ?2, ?3)
            "#,
            params![source, snapshot_json, created_at],
        )?;

        Ok(())
    }

    pub fn is_migration_applied(
        &self,
        migration_key: &str,
    ) -> Result<bool, SpeedPassRuntimeStorageError> {
        let conn = self
            .conn
            .lock()
            .map_err(|error| SpeedPassRuntimeStorageError::Lock(error.to_string()))?;
        let count = conn.query_row(
            "SELECT COUNT(1) FROM speedpass_migrations WHERE migration_key = ?1",
            params![migration_key],
            |row| row.get::<_, i64>(0),
        )?;
        Ok(count > 0)
    }

    pub fn mark_migration(
        &self,
        migration_key: &str,
        meta: Option<&JsonValue>,
    ) -> Result<bool, SpeedPassRuntimeStorageError> {
        let meta_json = meta
            .map(serde_json::to_string)
            .transpose()
            .map_err(|error| SpeedPassRuntimeStorageError::Serialization(error.to_string()))?;
        let applied_at = Utc::now().to_rfc3339();

        let conn = self
            .conn
            .lock()
            .map_err(|error| SpeedPassRuntimeStorageError::Lock(error.to_string()))?;

        let changed = conn.execute(
            r#"
            INSERT OR IGNORE INTO speedpass_migrations (migration_key, applied_at, meta_json)
            VALUES (?1, ?2, ?3)
            "#,
            params![migration_key, applied_at, meta_json],
        )?;

        Ok(changed > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_snapshot(seed: i64) -> JsonValue {
        serde_json::json!({
            "textbooks": {
                format!("tb-{seed}"): {
                    "id": format!("tb-{seed}"),
                    "name": "Linear Algebra"
                }
            },
            "globalStats": {
                "totalStudyTimeMs": seed
            }
        })
    }

    #[test]
    fn saves_and_loads_snapshot_with_revision() {
        let storage = SpeedPassRuntimeStorage::in_memory().expect("storage init should succeed");
        let first = storage
            .save_snapshot("local-user", &sample_snapshot(1), None)
            .expect("first save should succeed");
        assert_eq!(first.revision, 1);

        let second = storage
            .save_snapshot("local-user", &sample_snapshot(2), Some(1))
            .expect("second save should succeed");
        assert_eq!(second.revision, 2);

        let loaded = storage
            .load_snapshot("local-user")
            .expect("load should succeed")
            .expect("snapshot should exist");
        assert_eq!(loaded.revision, 2);
        assert_eq!(
            loaded
                .snapshot
                .get("globalStats")
                .and_then(|value| value.get("totalStudyTimeMs"))
                .and_then(|value| value.as_i64()),
            Some(2)
        );
    }

    #[test]
    fn returns_revision_conflict() {
        let storage = SpeedPassRuntimeStorage::in_memory().expect("storage init should succeed");
        storage
            .save_snapshot("local-user", &sample_snapshot(1), None)
            .expect("first save should succeed");

        let conflict = storage
            .save_snapshot("local-user", &sample_snapshot(2), Some(99))
            .expect_err("should return conflict");

        match conflict {
            SpeedPassRuntimeStorageError::RevisionConflict { expected, actual } => {
                assert_eq!(expected, 99);
                assert_eq!(actual, 1);
            }
            other => panic!("unexpected error: {other}"),
        }
    }

    #[test]
    fn marks_migration_idempotently() {
        let storage = SpeedPassRuntimeStorage::in_memory().expect("storage init should succeed");
        let key = "legacy-localstorage-v1:local-user";
        let meta = serde_json::json!({ "source": "localStorage" });

        let first = storage
            .mark_migration(key, Some(&meta))
            .expect("first mark should succeed");
        let second = storage
            .mark_migration(key, Some(&meta))
            .expect("second mark should succeed");

        assert!(first);
        assert!(!second);
        assert!(storage
            .is_migration_applied(key)
            .expect("query should succeed"));
    }
}
