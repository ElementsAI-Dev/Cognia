//! Jupyter Session Management
//!
//! Manages multiple kernel sessions and their lifecycle.

#![allow(dead_code)]

use log::{debug, error, info, trace, warn};
use super::kernel::{JupyterKernel, KernelConfig, KernelStatus};
use super::{KernelExecutionResult, KernelInfo, VariableInfo};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Session information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JupyterSession {
    pub id: String,
    pub name: String,
    #[serde(rename = "kernelId")]
    pub kernel_id: Option<String>,
    #[serde(rename = "envPath")]
    pub env_path: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "lastActivityAt")]
    pub last_activity_at: Option<String>,
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Session manager for handling multiple kernels
pub struct SessionManager {
    kernels: HashMap<String, JupyterKernel>,
    sessions: HashMap<String, JupyterSession>,
    config: KernelConfig,
}

impl SessionManager {
    /// Create a new session manager
    pub fn new(config: KernelConfig) -> Self {
        info!("Creating new SessionManager");
        debug!(
            "SessionManager config: timeout={}s, max_output={}, startup_timeout={}s, idle_timeout={}s",
            config.timeout_secs,
            config.max_output_size,
            config.startup_timeout_secs,
            config.idle_timeout_secs
        );
        Self {
            kernels: HashMap::new(),
            sessions: HashMap::new(),
            config,
        }
    }

    /// Create a new session with a kernel
    pub async fn create_session(
        &mut self,
        name: &str,
        env_path: &str,
    ) -> Result<JupyterSession, String> {
        info!("Creating session '{}' with env_path={}", name, env_path);
        let session_id = format!("session-{}", uuid::Uuid::new_v4());
        let kernel_id = format!("kernel-{}", uuid::Uuid::new_v4());
        debug!(
            "Generated IDs: session_id={}, kernel_id={}",
            session_id, kernel_id
        );

        // Create and start kernel
        debug!("Creating kernel for session {}", session_id);
        let mut kernel = JupyterKernel::new(
            kernel_id.clone(),
            env_path.to_string(),
            self.config.clone(),
        );
        
        if let Err(e) = kernel.start().await {
            error!(
                "Failed to start kernel {} for session {}: {}",
                kernel_id, session_id, e
            );
            return Err(e);
        }

        // Create session
        let session = JupyterSession {
            id: session_id.clone(),
            name: name.to_string(),
            kernel_id: Some(kernel_id.clone()),
            env_path: env_path.to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            last_activity_at: Some(chrono::Utc::now().to_rfc3339()),
            metadata: HashMap::new(),
        };

        self.kernels.insert(kernel_id.clone(), kernel);
        self.sessions.insert(session_id.clone(), session.clone());

        info!(
            "Session '{}' created successfully: session_id={}, kernel_id={}",
            name, session_id, kernel_id
        );
        debug!(
            "SessionManager now has {} sessions and {} kernels",
            self.sessions.len(),
            self.kernels.len()
        );

        Ok(session)
    }

    /// Get a session by ID
    pub fn get_session(&self, session_id: &str) -> Option<&JupyterSession> {
        self.sessions.get(session_id)
    }

    /// Get a kernel by ID
    pub fn get_kernel(&self, kernel_id: &str) -> Option<&JupyterKernel> {
        self.kernels.get(kernel_id)
    }

    /// Get a mutable kernel by ID
    pub fn get_kernel_mut(&mut self, kernel_id: &str) -> Option<&mut JupyterKernel> {
        self.kernels.get_mut(kernel_id)
    }

    /// Execute code in a session
    pub async fn execute(
        &mut self,
        session_id: &str,
        code: &str,
    ) -> Result<KernelExecutionResult, String> {
        let code_preview = if code.len() > 50 {
            format!("{}...", &code[..50])
        } else {
            code.to_string()
        };
        debug!(
            "Session {} execute: {}",
            session_id,
            code_preview.replace('\n', "\\n")
        );

        let kernel_id = self
            .sessions
            .get(session_id)
            .and_then(|s| s.kernel_id.clone())
            .ok_or_else(|| {
                error!("Session {} not found or has no kernel", session_id);
                "Session not found or has no kernel".to_string()
            })?;

        trace!("Session {} maps to kernel {}", session_id, kernel_id);

        let kernel = self
            .kernels
            .get_mut(&kernel_id)
            .ok_or_else(|| {
                error!("Kernel {} not found for session {}", kernel_id, session_id);
                "Kernel not found".to_string()
            })?;

        let result = kernel.execute(code).await?;

        // Update session activity
        if let Some(session) = self.sessions.get_mut(session_id) {
            session.last_activity_at = Some(chrono::Utc::now().to_rfc3339());
            trace!("Session {} activity timestamp updated", session_id);
        }

        debug!(
            "Session {} execute completed: success={}, execution_count={}",
            session_id, result.success, result.execution_count
        );

        Ok(result)
    }

    /// Get variables from a session's kernel
    pub async fn get_variables(&mut self, session_id: &str) -> Result<Vec<VariableInfo>, String> {
        debug!("Session {}: Getting variables", session_id);
        let kernel_id = self
            .sessions
            .get(session_id)
            .and_then(|s| s.kernel_id.clone())
            .ok_or_else(|| {
                error!("Session {} not found or has no kernel", session_id);
                "Session not found or has no kernel".to_string()
            })?;

        let kernel = self
            .kernels
            .get_mut(&kernel_id)
            .ok_or_else(|| {
                error!("Kernel {} not found for session {}", kernel_id, session_id);
                "Kernel not found".to_string()
            })?;

        let vars = kernel.get_variables().await?;
        debug!(
            "Session {}: Retrieved {} variables",
            session_id,
            vars.len()
        );
        Ok(vars)
    }

    /// Restart a session's kernel
    pub async fn restart_kernel(&mut self, session_id: &str) -> Result<(), String> {
        info!("Session {}: Restarting kernel", session_id);
        let kernel_id = self
            .sessions
            .get(session_id)
            .and_then(|s| s.kernel_id.clone())
            .ok_or_else(|| {
                error!("Session {} not found or has no kernel", session_id);
                "Session not found or has no kernel".to_string()
            })?;

        debug!("Session {} kernel {} restart initiated", session_id, kernel_id);
        let kernel = self
            .kernels
            .get_mut(&kernel_id)
            .ok_or_else(|| {
                error!("Kernel {} not found for session {}", kernel_id, session_id);
                "Kernel not found".to_string()
            })?;

        kernel.restart().await?;
        info!("Session {}: Kernel {} restarted successfully", session_id, kernel_id);
        Ok(())
    }

    /// Interrupt a session's kernel
    pub async fn interrupt_kernel(&mut self, session_id: &str) -> Result<(), String> {
        info!("Session {}: Interrupting kernel", session_id);
        let kernel_id = self
            .sessions
            .get(session_id)
            .and_then(|s| s.kernel_id.clone())
            .ok_or_else(|| {
                error!("Session {} not found or has no kernel", session_id);
                "Session not found or has no kernel".to_string()
            })?;

        let kernel = self
            .kernels
            .get_mut(&kernel_id)
            .ok_or_else(|| {
                error!("Kernel {} not found for session {}", kernel_id, session_id);
                "Kernel not found".to_string()
            })?;

        kernel.interrupt().await?;
        info!("Session {}: Kernel {} interrupt completed", session_id, kernel_id);
        Ok(())
    }

    /// Delete a session and stop its kernel
    pub async fn delete_session(&mut self, session_id: &str) -> Result<(), String> {
        info!("Deleting session {}", session_id);
        if let Some(session) = self.sessions.remove(session_id) {
            debug!("Session {} removed from sessions map", session_id);
            if let Some(kernel_id) = session.kernel_id {
                debug!("Stopping kernel {} for deleted session {}", kernel_id, session_id);
                if let Some(mut kernel) = self.kernels.remove(&kernel_id) {
                    if let Err(e) = kernel.stop().await {
                        warn!(
                            "Failed to stop kernel {} during session {} deletion: {}",
                            kernel_id, session_id, e
                        );
                    } else {
                        debug!("Kernel {} stopped successfully", kernel_id);
                    }
                } else {
                    warn!(
                        "Kernel {} not found when deleting session {}",
                        kernel_id, session_id
                    );
                }
            }
            info!("Session {} deleted successfully", session_id);
        } else {
            debug!("Session {} not found for deletion (may already be deleted)", session_id);
        }
        debug!(
            "SessionManager now has {} sessions and {} kernels",
            self.sessions.len(),
            self.kernels.len()
        );
        Ok(())
    }

    /// List all sessions
    pub fn list_sessions(&self) -> Vec<JupyterSession> {
        let sessions = self.sessions.values().cloned().collect::<Vec<_>>();
        trace!("Listing {} sessions", sessions.len());
        sessions
    }

    /// List all kernels
    pub fn list_kernels(&self) -> Vec<KernelInfo> {
        let kernels = self.kernels.values().map(|k| k.get_info()).collect::<Vec<_>>();
        trace!("Listing {} kernels", kernels.len());
        kernels
    }

    /// Get kernel status
    pub fn get_kernel_status(&self, kernel_id: &str) -> Option<KernelStatus> {
        let status = self.kernels.get(kernel_id).map(|k| k.status);
        trace!("Kernel {} status: {:?}", kernel_id, status);
        status
    }

    /// Cleanup dead kernels
    pub async fn cleanup_dead_kernels(&mut self) {
        debug!("Starting dead kernel cleanup");
        let dead_kernel_ids: Vec<String> = self
            .kernels
            .iter()
            .filter(|(_, k)| k.status == KernelStatus::Dead)
            .map(|(id, _)| id.clone())
            .collect();

        if dead_kernel_ids.is_empty() {
            trace!("No dead kernels to clean up");
        } else {
            info!("Cleaning up {} dead kernels: {:?}", dead_kernel_ids.len(), dead_kernel_ids);
        }

        for id in &dead_kernel_ids {
            self.kernels.remove(id);
            debug!("Removed dead kernel {}", id);
        }

        // Update sessions to remove references to dead kernels
        let mut orphaned_sessions = 0;
        for session in self.sessions.values_mut() {
            if let Some(ref kernel_id) = session.kernel_id {
                if !self.kernels.contains_key(kernel_id) {
                    debug!(
                        "Session {} kernel {} is dead, removing reference",
                        session.id, kernel_id
                    );
                    session.kernel_id = None;
                    orphaned_sessions += 1;
                }
            }
        }

        if orphaned_sessions > 0 {
            info!("{} sessions now have no kernel after cleanup", orphaned_sessions);
        }
    }

    /// Cleanup idle kernels based on timeout
    pub async fn cleanup_idle_kernels(&mut self, timeout_secs: u64) {
        debug!("Starting idle kernel cleanup (timeout={}s)", timeout_secs);
        let now = chrono::Utc::now();
        let timeout = chrono::Duration::seconds(timeout_secs as i64);

        let idle_kernel_ids: Vec<String> = self
            .kernels
            .iter()
            .filter(|(_, k)| {
                if let Some(last_activity) = k.last_activity_at {
                    let idle_duration = now.signed_duration_since(last_activity);
                    let is_idle = idle_duration > timeout;
                    if is_idle {
                        debug!(
                            "Kernel {} is idle for {}s (threshold: {}s)",
                            k.id,
                            idle_duration.num_seconds(),
                            timeout_secs
                        );
                    }
                    is_idle
                } else {
                    false
                }
            })
            .map(|(id, _)| id.clone())
            .collect();

        if idle_kernel_ids.is_empty() {
            trace!("No idle kernels to clean up");
        } else {
            info!("Cleaning up {} idle kernels: {:?}", idle_kernel_ids.len(), idle_kernel_ids);
        }

        for id in idle_kernel_ids {
            if let Some(mut kernel) = self.kernels.remove(&id) {
                info!("Stopping idle kernel {}", id);
                if let Err(e) = kernel.stop().await {
                    warn!("Failed to stop idle kernel {}: {}", id, e);
                } else {
                    debug!("Idle kernel {} stopped successfully", id);
                }
            }
        }
    }

    /// Shutdown all kernels
    pub async fn shutdown_all(&mut self) {
        let kernel_count = self.kernels.len();
        let session_count = self.sessions.len();
        info!(
            "Shutting down all kernels and sessions ({} kernels, {} sessions)",
            kernel_count, session_count
        );

        for (id, mut kernel) in self.kernels.drain() {
            debug!("Shutting down kernel {}", id);
            if let Err(e) = kernel.stop().await {
                warn!("Failed to stop kernel {} during shutdown: {}", id, e);
            }
        }
        self.sessions.clear();
        info!("All kernels and sessions shut down successfully");
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        debug!("Creating SessionManager with default config");
        Self::new(KernelConfig::default())
    }
}

/// Thread-safe session manager wrapper
pub struct SharedSessionManager(Arc<RwLock<SessionManager>>);

impl SharedSessionManager {
    pub fn new(config: KernelConfig) -> Self {
        info!("Creating SharedSessionManager (thread-safe wrapper)");
        Self(Arc::new(RwLock::new(SessionManager::new(config))))
    }

    pub async fn create_session(
        &self,
        name: &str,
        env_path: &str,
    ) -> Result<JupyterSession, String> {
        trace!("SharedSessionManager: Acquiring write lock for create_session");
        self.0.write().await.create_session(name, env_path).await
    }

    pub async fn execute(
        &self,
        session_id: &str,
        code: &str,
    ) -> Result<KernelExecutionResult, String> {
        trace!("SharedSessionManager: Acquiring write lock for execute");
        self.0.write().await.execute(session_id, code).await
    }

    pub async fn get_variables(&self, session_id: &str) -> Result<Vec<VariableInfo>, String> {
        trace!("SharedSessionManager: Acquiring write lock for get_variables");
        self.0.write().await.get_variables(session_id).await
    }

    pub async fn restart_kernel(&self, session_id: &str) -> Result<(), String> {
        trace!("SharedSessionManager: Acquiring write lock for restart_kernel");
        self.0.write().await.restart_kernel(session_id).await
    }

    pub async fn interrupt_kernel(&self, session_id: &str) -> Result<(), String> {
        trace!("SharedSessionManager: Acquiring write lock for interrupt_kernel");
        self.0.write().await.interrupt_kernel(session_id).await
    }

    pub async fn delete_session(&self, session_id: &str) -> Result<(), String> {
        trace!("SharedSessionManager: Acquiring write lock for delete_session");
        self.0.write().await.delete_session(session_id).await
    }

    pub async fn list_sessions(&self) -> Vec<JupyterSession> {
        trace!("SharedSessionManager: Acquiring read lock for list_sessions");
        self.0.read().await.list_sessions()
    }

    pub async fn list_kernels(&self) -> Vec<KernelInfo> {
        trace!("SharedSessionManager: Acquiring read lock for list_kernels");
        self.0.read().await.list_kernels()
    }

    pub async fn shutdown_all(&self) {
        trace!("SharedSessionManager: Acquiring write lock for shutdown_all");
        self.0.write().await.shutdown_all().await
    }
}

impl Clone for SharedSessionManager {
    fn clone(&self) -> Self {
        Self(Arc::clone(&self.0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_manager_creation() {
        let manager = SessionManager::default();
        assert!(manager.list_sessions().is_empty());
        assert!(manager.list_kernels().is_empty());
    }

    #[test]
    fn test_jupyter_session_serialization() {
        let session = JupyterSession {
            id: "test-session".to_string(),
            name: "Test Session".to_string(),
            kernel_id: Some("test-kernel".to_string()),
            env_path: "/path/to/env".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            last_activity_at: None,
            metadata: HashMap::new(),
        };

        let json = serde_json::to_string(&session).unwrap();
        assert!(json.contains("kernelId"));
        assert!(json.contains("envPath"));
    }
}
