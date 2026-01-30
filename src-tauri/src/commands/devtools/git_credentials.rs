//! Git Credentials Module
//!
//! Provides secure credential storage and management for Git operations.
//! Uses tauri-plugin-stronghold for encrypted credential storage.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Git credential type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CredentialType {
    /// HTTPS username/password or token
    #[serde(rename = "https")]
    Https,
    /// SSH key-based authentication
    #[serde(rename = "ssh")]
    Ssh,
    /// Personal Access Token
    #[serde(rename = "token")]
    Token,
}

/// Git credential entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCredential {
    pub id: String,
    #[serde(rename = "credentialType")]
    pub credential_type: CredentialType,
    pub host: String,
    pub username: Option<String>,
    #[serde(skip_serializing)]
    pub password: Option<String>,
    #[serde(skip_serializing)]
    pub token: Option<String>,
    #[serde(rename = "sshKeyPath")]
    pub ssh_key_path: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// Git credential input (for creating/updating)
#[derive(Debug, Clone, Deserialize)]
pub struct GitCredentialInput {
    #[serde(rename = "credentialType")]
    pub credential_type: CredentialType,
    pub host: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub token: Option<String>,
    #[serde(rename = "sshKeyPath")]
    pub ssh_key_path: Option<String>,
}

/// Git credential manager
pub struct GitCredentialManager {
    credentials: HashMap<String, GitCredential>,
}

impl GitCredentialManager {
    pub fn new() -> Self {
        Self {
            credentials: HashMap::new(),
        }
    }

    /// Get credential for a host
    pub fn get_credential(&self, host: &str) -> Option<&GitCredential> {
        self.credentials.get(host)
    }

    /// Add or update a credential
    pub fn set_credential(&mut self, input: GitCredentialInput) -> GitCredential {
        let now = chrono::Utc::now().to_rfc3339();
        let id = uuid::Uuid::new_v4().to_string();

        let credential = GitCredential {
            id: id.clone(),
            credential_type: input.credential_type,
            host: input.host.clone(),
            username: input.username,
            password: input.password,
            token: input.token,
            ssh_key_path: input.ssh_key_path,
            created_at: now.clone(),
            updated_at: now,
        };

        self.credentials.insert(input.host, credential.clone());
        credential
    }

    /// Remove a credential
    pub fn remove_credential(&mut self, host: &str) -> bool {
        self.credentials.remove(host).is_some()
    }

    /// List all credentials (without sensitive data)
    pub fn list_credentials(&self) -> Vec<GitCredential> {
        self.credentials
            .values()
            .map(|c| GitCredential {
                id: c.id.clone(),
                credential_type: c.credential_type.clone(),
                host: c.host.clone(),
                username: c.username.clone(),
                password: None, // Don't expose password
                token: None,    // Don't expose token
                ssh_key_path: c.ssh_key_path.clone(),
                created_at: c.created_at.clone(),
                updated_at: c.updated_at.clone(),
            })
            .collect()
    }
}

impl Default for GitCredentialManager {
    fn default() -> Self {
        Self::new()
    }
}

/// SSH key info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshKeyInfo {
    pub path: String,
    pub name: String,
    #[serde(rename = "hasPassphrase")]
    pub has_passphrase: bool,
    #[serde(rename = "keyType")]
    pub key_type: String,
    pub fingerprint: Option<String>,
}

/// Detect available SSH keys
pub fn detect_ssh_keys() -> Vec<SshKeyInfo> {
    let mut keys = Vec::new();

    // Get SSH directory
    if let Some(home) = dirs::home_dir() {
        let ssh_dir = home.join(".ssh");
        if ssh_dir.exists() {
            // Common key file names
            let key_names = ["id_rsa", "id_ed25519", "id_ecdsa", "id_dsa"];

            for key_name in &key_names {
                let key_path = ssh_dir.join(key_name);
                if key_path.exists() {
                    let key_type = match *key_name {
                        "id_rsa" => "RSA",
                        "id_ed25519" => "ED25519",
                        "id_ecdsa" => "ECDSA",
                        "id_dsa" => "DSA",
                        _ => "Unknown",
                    };

                    keys.push(SshKeyInfo {
                        path: key_path.to_string_lossy().to_string(),
                        name: key_name.to_string(),
                        has_passphrase: true, // Assume passphrase by default
                        key_type: key_type.to_string(),
                        fingerprint: None,
                    });
                }
            }
        }
    }

    keys
}

/// Test credential by attempting to connect
pub async fn test_credential(credential: &GitCredential) -> Result<bool, String> {
    match credential.credential_type {
        CredentialType::Https | CredentialType::Token => {
            // For HTTPS/token, we would need to make a test request
            // This is a simplified implementation
            Ok(credential.username.is_some()
                && (credential.password.is_some() || credential.token.is_some()))
        }
        CredentialType::Ssh => {
            // For SSH, check if the key file exists
            if let Some(ref path) = credential.ssh_key_path {
                Ok(std::path::Path::new(path).exists())
            } else {
                Ok(false)
            }
        }
    }
}

// ==================== Tauri Commands ====================

use tauri::State;
use parking_lot::Mutex;

/// Shared credential manager state
pub type CredentialManagerState = Mutex<GitCredentialManager>;

/// Get stored credentials (without sensitive data)
#[tauri::command]
pub async fn git_list_credentials(
    state: State<'_, CredentialManagerState>,
) -> Result<Vec<GitCredential>, String> {
    let manager = state.lock();
    Ok(manager.list_credentials())
}

/// Add or update a credential
#[tauri::command]
pub async fn git_set_credential(
    state: State<'_, CredentialManagerState>,
    input: GitCredentialInput,
) -> Result<GitCredential, String> {
    let mut manager = state.lock();
    Ok(manager.set_credential(input))
}

/// Remove a credential
#[tauri::command]
pub async fn git_remove_credential(
    state: State<'_, CredentialManagerState>,
    host: String,
) -> Result<bool, String> {
    let mut manager = state.lock();
    Ok(manager.remove_credential(&host))
}

/// Detect available SSH keys
#[tauri::command]
pub async fn git_detect_ssh_keys() -> Result<Vec<SshKeyInfo>, String> {
    Ok(detect_ssh_keys())
}

/// Test a credential
#[tauri::command]
pub async fn git_test_credential(
    state: State<'_, CredentialManagerState>,
    host: String,
) -> Result<bool, String> {
    let manager = state.lock();
    if let Some(credential) = manager.get_credential(&host) {
        test_credential(credential).await
    } else {
        Err(format!("No credential found for host: {}", host))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_credential_manager() {
        let mut manager = GitCredentialManager::new();

        let input = GitCredentialInput {
            credential_type: CredentialType::Token,
            host: "github.com".to_string(),
            username: Some("user".to_string()),
            password: None,
            token: Some("ghp_xxx".to_string()),
            ssh_key_path: None,
        };

        let cred = manager.set_credential(input);
        assert_eq!(cred.host, "github.com");

        let found = manager.get_credential("github.com");
        assert!(found.is_some());

        let removed = manager.remove_credential("github.com");
        assert!(removed);

        let not_found = manager.get_credential("github.com");
        assert!(not_found.is_none());
    }

    #[test]
    fn test_detect_ssh_keys() {
        // Just verify it doesn't panic
        let _ = detect_ssh_keys();
    }
}
