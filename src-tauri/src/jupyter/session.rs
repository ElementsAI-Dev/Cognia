//! Jupyter Session Management
//!
//! Manages multiple kernel sessions and their lifecycle.

#![allow(dead_code)]

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
        let session_id = format!("session-{}", uuid::Uuid::new_v4());
        let kernel_id = format!("kernel-{}", uuid::Uuid::new_v4());

        // Create and start kernel
        let mut kernel = JupyterKernel::new(
            kernel_id.clone(),
            env_path.to_string(),
            self.config.clone(),
        );
        kernel.start().await?;

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

        self.kernels.insert(kernel_id, kernel);
        self.sessions.insert(session_id.clone(), session.clone());

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
        let kernel_id = self
            .sessions
            .get(session_id)
            .and_then(|s| s.kernel_id.clone())
            .ok_or_else(|| "Session not found or has no kernel".to_string())?;

        let kernel = self
            .kernels
            .get_mut(&kernel_id)
            .ok_or_else(|| "Kernel not found".to_string())?;

        let result = kernel.execute(code).await?;

        // Update session activity
        if let Some(session) = self.sessions.get_mut(session_id) {
            session.last_activity_at = Some(chrono::Utc::now().to_rfc3339());
        }

        Ok(result)
    }

    /// Get variables from a session's kernel
    pub async fn get_variables(&mut self, session_id: &str) -> Result<Vec<VariableInfo>, String> {
        let kernel_id = self
            .sessions
            .get(session_id)
            .and_then(|s| s.kernel_id.clone())
            .ok_or_else(|| "Session not found or has no kernel".to_string())?;

        let kernel = self
            .kernels
            .get_mut(&kernel_id)
            .ok_or_else(|| "Kernel not found".to_string())?;

        kernel.get_variables().await
    }

    /// Restart a session's kernel
    pub async fn restart_kernel(&mut self, session_id: &str) -> Result<(), String> {
        let kernel_id = self
            .sessions
            .get(session_id)
            .and_then(|s| s.kernel_id.clone())
            .ok_or_else(|| "Session not found or has no kernel".to_string())?;

        let kernel = self
            .kernels
            .get_mut(&kernel_id)
            .ok_or_else(|| "Kernel not found".to_string())?;

        kernel.restart().await
    }

    /// Interrupt a session's kernel
    pub async fn interrupt_kernel(&mut self, session_id: &str) -> Result<(), String> {
        let kernel_id = self
            .sessions
            .get(session_id)
            .and_then(|s| s.kernel_id.clone())
            .ok_or_else(|| "Session not found or has no kernel".to_string())?;

        let kernel = self
            .kernels
            .get_mut(&kernel_id)
            .ok_or_else(|| "Kernel not found".to_string())?;

        kernel.interrupt().await
    }

    /// Delete a session and stop its kernel
    pub async fn delete_session(&mut self, session_id: &str) -> Result<(), String> {
        if let Some(session) = self.sessions.remove(session_id) {
            if let Some(kernel_id) = session.kernel_id {
                if let Some(mut kernel) = self.kernels.remove(&kernel_id) {
                    kernel.stop().await?;
                }
            }
        }
        Ok(())
    }

    /// List all sessions
    pub fn list_sessions(&self) -> Vec<JupyterSession> {
        self.sessions.values().cloned().collect()
    }

    /// List all kernels
    pub fn list_kernels(&self) -> Vec<KernelInfo> {
        self.kernels.values().map(|k| k.get_info()).collect()
    }

    /// Get kernel status
    pub fn get_kernel_status(&self, kernel_id: &str) -> Option<KernelStatus> {
        self.kernels.get(kernel_id).map(|k| k.status)
    }

    /// Cleanup dead kernels
    pub async fn cleanup_dead_kernels(&mut self) {
        let dead_kernel_ids: Vec<String> = self
            .kernels
            .iter()
            .filter(|(_, k)| k.status == KernelStatus::Dead)
            .map(|(id, _)| id.clone())
            .collect();

        for id in dead_kernel_ids {
            self.kernels.remove(&id);
        }

        // Update sessions to remove references to dead kernels
        for session in self.sessions.values_mut() {
            if let Some(ref kernel_id) = session.kernel_id {
                if !self.kernels.contains_key(kernel_id) {
                    session.kernel_id = None;
                }
            }
        }
    }

    /// Cleanup idle kernels based on timeout
    pub async fn cleanup_idle_kernels(&mut self, timeout_secs: u64) {
        let now = chrono::Utc::now();
        let timeout = chrono::Duration::seconds(timeout_secs as i64);

        let idle_kernel_ids: Vec<String> = self
            .kernels
            .iter()
            .filter(|(_, k)| {
                if let Some(last_activity) = k.last_activity_at {
                    now.signed_duration_since(last_activity) > timeout
                } else {
                    false
                }
            })
            .map(|(id, _)| id.clone())
            .collect();

        for id in idle_kernel_ids {
            if let Some(mut kernel) = self.kernels.remove(&id) {
                let _ = kernel.stop().await;
            }
        }
    }

    /// Shutdown all kernels
    pub async fn shutdown_all(&mut self) {
        for (_, mut kernel) in self.kernels.drain() {
            let _ = kernel.stop().await;
        }
        self.sessions.clear();
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::new(KernelConfig::default())
    }
}

/// Thread-safe session manager wrapper
pub struct SharedSessionManager(Arc<RwLock<SessionManager>>);

impl SharedSessionManager {
    pub fn new(config: KernelConfig) -> Self {
        Self(Arc::new(RwLock::new(SessionManager::new(config))))
    }

    pub async fn create_session(
        &self,
        name: &str,
        env_path: &str,
    ) -> Result<JupyterSession, String> {
        self.0.write().await.create_session(name, env_path).await
    }

    pub async fn execute(
        &self,
        session_id: &str,
        code: &str,
    ) -> Result<KernelExecutionResult, String> {
        self.0.write().await.execute(session_id, code).await
    }

    pub async fn get_variables(&self, session_id: &str) -> Result<Vec<VariableInfo>, String> {
        self.0.write().await.get_variables(session_id).await
    }

    pub async fn restart_kernel(&self, session_id: &str) -> Result<(), String> {
        self.0.write().await.restart_kernel(session_id).await
    }

    pub async fn interrupt_kernel(&self, session_id: &str) -> Result<(), String> {
        self.0.write().await.interrupt_kernel(session_id).await
    }

    pub async fn delete_session(&self, session_id: &str) -> Result<(), String> {
        self.0.write().await.delete_session(session_id).await
    }

    pub async fn list_sessions(&self) -> Vec<JupyterSession> {
        self.0.read().await.list_sessions()
    }

    pub async fn list_kernels(&self) -> Vec<KernelInfo> {
        self.0.read().await.list_kernels()
    }

    pub async fn shutdown_all(&self) {
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
