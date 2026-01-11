//! Skills Type Definitions
//!
//! Data structures for the skills management system.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ========== Core Types ==========

/// Discoverable skill from a repository
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverableSkill {
    /// Unique identifier: "owner/name:directory"
    pub key: String,
    /// Display name (parsed from SKILL.md)
    pub name: String,
    /// Skill description
    pub description: String,
    /// Directory name (last segment of install path)
    pub directory: String,
    /// GitHub README URL
    #[serde(rename = "readmeUrl")]
    pub readme_url: Option<String>,
    /// Repository owner
    #[serde(rename = "repoOwner")]
    pub repo_owner: String,
    /// Repository name
    #[serde(rename = "repoName")]
    pub repo_name: String,
    /// Branch name
    #[serde(rename = "repoBranch")]
    pub repo_branch: String,
}

/// Installed skill record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledSkill {
    /// Unique identifier
    pub id: String,
    /// Display name
    pub name: String,
    /// Description
    pub description: Option<String>,
    /// Directory name in SSOT
    pub directory: String,
    /// Repository owner (if from repo)
    #[serde(rename = "repoOwner")]
    pub repo_owner: Option<String>,
    /// Repository name (if from repo)
    #[serde(rename = "repoName")]
    pub repo_name: Option<String>,
    /// Branch name (if from repo)
    #[serde(rename = "repoBranch")]
    pub repo_branch: Option<String>,
    /// README URL
    #[serde(rename = "readmeUrl")]
    pub readme_url: Option<String>,
    /// Installation timestamp (Unix epoch)
    #[serde(rename = "installedAt")]
    pub installed_at: i64,
    /// Whether skill is enabled
    pub enabled: bool,
    /// Skill category
    pub category: Option<String>,
    /// Tags for filtering
    pub tags: Vec<String>,
}

/// Skill object (combined view for API compatibility)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    /// Unique identifier
    pub key: String,
    /// Display name
    pub name: String,
    /// Skill description
    pub description: String,
    /// Directory name
    pub directory: String,
    /// README URL
    #[serde(rename = "readmeUrl")]
    pub readme_url: Option<String>,
    /// Whether installed
    pub installed: bool,
    /// Whether enabled (only if installed)
    pub enabled: Option<bool>,
    /// Repository owner
    #[serde(rename = "repoOwner")]
    pub repo_owner: Option<String>,
    /// Repository name
    #[serde(rename = "repoName")]
    pub repo_name: Option<String>,
    /// Branch name
    #[serde(rename = "repoBranch")]
    pub repo_branch: Option<String>,
    /// Category
    pub category: Option<String>,
    /// Tags
    pub tags: Option<Vec<String>>,
}

/// Skill repository configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillRepo {
    /// GitHub user/organization name
    pub owner: String,
    /// Repository name
    pub name: String,
    /// Branch (default "main")
    pub branch: String,
    /// Whether enabled
    pub enabled: bool,
}

impl Default for SkillRepo {
    fn default() -> Self {
        Self {
            owner: String::new(),
            name: String::new(),
            branch: "main".to_string(),
            enabled: true,
        }
    }
}

/// Skill installation state (legacy compatibility)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillState {
    /// Whether installed
    pub installed: bool,
    /// Installation time
    #[serde(rename = "installedAt")]
    pub installed_at: DateTime<Utc>,
}

/// Persistent storage for skill configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillStore {
    /// Installed skills by directory
    pub skills: HashMap<String, InstalledSkill>,
    /// Repository list
    pub repos: Vec<SkillRepo>,
}

impl Default for SkillStore {
    fn default() -> Self {
        SkillStore {
            skills: HashMap::new(),
            repos: vec![
                SkillRepo {
                    owner: "anthropics".to_string(),
                    name: "skills".to_string(),
                    branch: "main".to_string(),
                    enabled: true,
                },
                SkillRepo {
                    owner: "ComposioHQ".to_string(),
                    name: "awesome-claude-skills".to_string(),
                    branch: "master".to_string(),
                    enabled: true,
                },
            ],
        }
    }
}

/// Skill metadata parsed from SKILL.md YAML frontmatter
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SkillMetadata {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub author: Option<String>,
    pub version: Option<String>,
}

/// Local (unmanaged) skill found in directories
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalSkill {
    /// Directory name
    pub directory: String,
    /// Parsed name
    pub name: String,
    /// Description
    pub description: Option<String>,
    /// Full path
    pub path: String,
    /// Whether has SKILL.md
    #[serde(rename = "hasSkillMd")]
    pub has_skill_md: bool,
}

// ========== API Request/Response Types ==========

/// Input for installing a skill from repository
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallSkillInput {
    /// Repository owner
    pub owner: String,
    /// Repository name
    pub repo: String,
    /// Branch
    pub branch: Option<String>,
    /// Directory path within repo
    pub directory: String,
}

/// Input for adding a repository
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddRepoInput {
    /// Repository owner
    pub owner: String,
    /// Repository name
    pub name: String,
    /// Branch (defaults to "main")
    pub branch: Option<String>,
}

/// Skill discovery result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillDiscoveryResult {
    /// Discoverable skills from repos
    pub discoverable: Vec<DiscoverableSkill>,
    /// Installed skills
    pub installed: Vec<InstalledSkill>,
    /// Local (unmanaged) skills
    pub local: Vec<LocalSkill>,
}

/// Skill error types
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum SkillError {
    /// Skill not found
    NotFound(String),
    /// Skill already installed
    AlreadyInstalled(String),
    /// Download timeout
    DownloadTimeout(u64),
    /// IO error
    Io(String),
    /// Network error
    Network(String),
    /// Parse error
    Parse(String),
}

impl std::fmt::Display for SkillError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SkillError::NotFound(name) => write!(f, "Skill not found: {}", name),
            SkillError::AlreadyInstalled(name) => write!(f, "Skill already installed: {}", name),
            SkillError::DownloadTimeout(secs) => write!(f, "Download timeout after {} seconds", secs),
            SkillError::Io(msg) => write!(f, "IO error: {}", msg),
            SkillError::Network(msg) => write!(f, "Network error: {}", msg),
            SkillError::Parse(msg) => write!(f, "Parse error: {}", msg),
        }
    }
}

impl std::error::Error for SkillError {}

impl From<std::io::Error> for SkillError {
    fn from(err: std::io::Error) -> Self {
        SkillError::Io(err.to_string())
    }
}

impl From<reqwest::Error> for SkillError {
    fn from(err: reqwest::Error) -> Self {
        SkillError::Network(err.to_string())
    }
}

impl From<serde_json::Error> for SkillError {
    fn from(err: serde_json::Error) -> Self {
        SkillError::Parse(err.to_string())
    }
}

impl Serialize for SkillError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Skill search filters
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SkillSearchFilters {
    /// Filter by category
    pub category: Option<String>,
    /// Filter by tags
    pub tags: Option<Vec<String>>,
    /// Filter by installed status
    pub installed: Option<bool>,
    /// Filter by enabled status
    pub enabled: Option<bool>,
    /// Search query
    pub query: Option<String>,
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_skill_repo_default() {
        let repo = SkillRepo::default();
        assert_eq!(repo.owner, "");
        assert_eq!(repo.name, "");
        assert_eq!(repo.branch, "main");
        assert!(repo.enabled);
    }

    #[test]
    fn test_skill_store_default() {
        let store = SkillStore::default();
        assert!(store.skills.is_empty());
        assert_eq!(store.repos.len(), 2);
        assert_eq!(store.repos[0].owner, "anthropics");
        assert_eq!(store.repos[0].name, "skills");
        assert_eq!(store.repos[1].owner, "ComposioHQ");
    }

    #[test]
    fn test_discoverable_skill_serialization() {
        let skill = DiscoverableSkill {
            key: "owner/repo:dir".to_string(),
            name: "Test Skill".to_string(),
            description: "A test skill".to_string(),
            directory: "test-dir".to_string(),
            readme_url: Some("https://example.com".to_string()),
            repo_owner: "owner".to_string(),
            repo_name: "repo".to_string(),
            repo_branch: "main".to_string(),
        };

        let json = serde_json::to_string(&skill).unwrap();
        assert!(json.contains("\"key\":\"owner/repo:dir\""));
        assert!(json.contains("\"readmeUrl\":\"https://example.com\""));
        assert!(json.contains("\"repoOwner\":\"owner\""));
    }

    #[test]
    fn test_discoverable_skill_deserialization() {
        let json = r#"{
            "key": "owner/repo:dir",
            "name": "Test Skill",
            "description": "A test skill",
            "directory": "test-dir",
            "readmeUrl": null,
            "repoOwner": "owner",
            "repoName": "repo",
            "repoBranch": "main"
        }"#;

        let skill: DiscoverableSkill = serde_json::from_str(json).unwrap();
        assert_eq!(skill.key, "owner/repo:dir");
        assert_eq!(skill.name, "Test Skill");
        assert!(skill.readme_url.is_none());
    }

    #[test]
    fn test_installed_skill_serialization() {
        let skill = InstalledSkill {
            id: "local:test".to_string(),
            name: "Test".to_string(),
            description: Some("Test description".to_string()),
            directory: "test".to_string(),
            repo_owner: None,
            repo_name: None,
            repo_branch: None,
            readme_url: None,
            installed_at: 1234567890,
            enabled: true,
            category: Some("development".to_string()),
            tags: vec!["test".to_string(), "example".to_string()],
        };

        let json = serde_json::to_string(&skill).unwrap();
        assert!(json.contains("\"installedAt\":1234567890"));
        assert!(json.contains("\"enabled\":true"));
    }

    #[test]
    fn test_skill_combined_view() {
        let skill = Skill {
            key: "test-key".to_string(),
            name: "Test".to_string(),
            description: "Test description".to_string(),
            directory: "test".to_string(),
            readme_url: None,
            installed: true,
            enabled: Some(true),
            repo_owner: Some("owner".to_string()),
            repo_name: Some("repo".to_string()),
            repo_branch: Some("main".to_string()),
            category: None,
            tags: Some(vec!["tag1".to_string()]),
        };

        assert!(skill.installed);
        assert_eq!(skill.enabled, Some(true));
    }

    #[test]
    fn test_local_skill() {
        let skill = LocalSkill {
            directory: "my-skill".to_string(),
            name: "My Skill".to_string(),
            description: Some("A local skill".to_string()),
            path: "/path/to/skill".to_string(),
            has_skill_md: true,
        };

        let json = serde_json::to_string(&skill).unwrap();
        assert!(json.contains("\"hasSkillMd\":true"));
    }

    #[test]
    fn test_skill_metadata_default() {
        let meta = SkillMetadata::default();
        assert!(meta.name.is_none());
        assert!(meta.description.is_none());
        assert!(meta.category.is_none());
        assert!(meta.tags.is_none());
    }

    #[test]
    fn test_skill_error_display() {
        let err = SkillError::NotFound("test-skill".to_string());
        assert_eq!(err.to_string(), "Skill not found: test-skill");

        let err = SkillError::AlreadyInstalled("test".to_string());
        assert_eq!(err.to_string(), "Skill already installed: test");

        let err = SkillError::DownloadTimeout(60);
        assert_eq!(err.to_string(), "Download timeout after 60 seconds");
    }

    #[test]
    fn test_skill_error_serialization() {
        let err = SkillError::NotFound("test".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert_eq!(json, "\"Skill not found: test\"");
    }

    #[test]
    fn test_add_repo_input() {
        let input = AddRepoInput {
            owner: "test-owner".to_string(),
            name: "test-repo".to_string(),
            branch: Some("develop".to_string()),
        };

        let json = serde_json::to_string(&input).unwrap();
        let parsed: AddRepoInput = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.owner, "test-owner");
        assert_eq!(parsed.branch, Some("develop".to_string()));
    }

    #[test]
    fn test_skill_search_filters_default() {
        let filters = SkillSearchFilters::default();
        assert!(filters.category.is_none());
        assert!(filters.tags.is_none());
        assert!(filters.installed.is_none());
        assert!(filters.enabled.is_none());
        assert!(filters.query.is_none());
    }
}
