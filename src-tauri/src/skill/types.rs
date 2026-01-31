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
    /// Optional display name (from SKILL.md)
    pub name: Option<String>,
    /// Optional description (from SKILL.md)
    pub description: Option<String>,
    /// Optional README URL
    #[serde(rename = "readmeUrl")]
    pub readme_url: Option<String>,
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

// ========== Security Scanning Types ==========

/// Severity level for security findings
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SecuritySeverity {
    /// Critical security issue - must be fixed
    Critical,
    /// High severity - strongly recommended to fix
    High,
    /// Medium severity - should be reviewed
    Medium,
    /// Low severity - informational
    Low,
    /// Informational only
    Info,
}

impl SecuritySeverity {
    /// Get numeric weight for sorting (higher = more severe)
    pub fn weight(&self) -> u8 {
        match self {
            SecuritySeverity::Critical => 5,
            SecuritySeverity::High => 4,
            SecuritySeverity::Medium => 3,
            SecuritySeverity::Low => 2,
            SecuritySeverity::Info => 1,
        }
    }
}

/// Category of security finding
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SecurityCategory {
    /// Dangerous command execution
    CommandExecution,
    /// Code injection vulnerabilities
    CodeInjection,
    /// Filesystem access risks
    FilesystemAccess,
    /// Network/external access
    NetworkAccess,
    /// Sensitive data exposure
    SensitiveData,
    /// Privilege escalation
    PrivilegeEscalation,
    /// Obfuscated or suspicious code
    ObfuscatedCode,
    /// Other security concerns
    Other,
}

/// A single security finding from scanning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityFinding {
    /// Unique rule identifier
    #[serde(rename = "ruleId")]
    pub rule_id: String,
    /// Human-readable title
    pub title: String,
    /// Detailed description of the issue
    pub description: String,
    /// Severity level
    pub severity: SecuritySeverity,
    /// Category of finding
    pub category: SecurityCategory,
    /// Relative file path within the skill
    #[serde(rename = "filePath")]
    pub file_path: String,
    /// Line number (1-indexed, 0 if unknown)
    pub line: u32,
    /// Column number (1-indexed, 0 if unknown)
    pub column: u32,
    /// Code snippet showing the issue
    pub snippet: Option<String>,
    /// Suggested fix or remediation
    pub suggestion: Option<String>,
}

/// Summary statistics for a security scan
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SecurityScanSummary {
    /// Total files scanned
    #[serde(rename = "filesScanned")]
    pub files_scanned: u32,
    /// Total findings count
    #[serde(rename = "totalFindings")]
    pub total_findings: u32,
    /// Count by severity
    pub critical: u32,
    pub high: u32,
    pub medium: u32,
    pub low: u32,
    pub info: u32,
    /// Whether the skill is considered safe to install
    #[serde(rename = "isSafe")]
    pub is_safe: bool,
    /// Risk score (0-100, higher = more risk)
    #[serde(rename = "riskScore")]
    pub risk_score: u32,
}

/// Complete security scan report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityScanReport {
    /// Skill identifier or path that was scanned
    #[serde(rename = "skillId")]
    pub skill_id: String,
    /// Skill name (if available)
    #[serde(rename = "skillName")]
    pub skill_name: Option<String>,
    /// Path that was scanned
    #[serde(rename = "scannedPath")]
    pub scanned_path: String,
    /// Scan timestamp (Unix epoch milliseconds)
    #[serde(rename = "scannedAt")]
    pub scanned_at: i64,
    /// Scan duration in milliseconds
    #[serde(rename = "durationMs")]
    pub duration_ms: u64,
    /// Summary statistics
    pub summary: SecurityScanSummary,
    /// Individual findings
    pub findings: Vec<SecurityFinding>,
}

impl SecurityScanReport {
    /// Create a new empty report
    pub fn new(skill_id: String, scanned_path: String) -> Self {
        Self {
            skill_id,
            skill_name: None,
            scanned_path,
            scanned_at: chrono::Utc::now().timestamp_millis(),
            duration_ms: 0,
            summary: SecurityScanSummary::default(),
            findings: Vec::new(),
        }
    }

    /// Calculate summary from findings
    pub fn calculate_summary(&mut self) {
        self.summary.total_findings = self.findings.len() as u32;
        self.summary.critical = 0;
        self.summary.high = 0;
        self.summary.medium = 0;
        self.summary.low = 0;
        self.summary.info = 0;

        for finding in &self.findings {
            match finding.severity {
                SecuritySeverity::Critical => self.summary.critical += 1,
                SecuritySeverity::High => self.summary.high += 1,
                SecuritySeverity::Medium => self.summary.medium += 1,
                SecuritySeverity::Low => self.summary.low += 1,
                SecuritySeverity::Info => self.summary.info += 1,
            }
        }

        // Calculate risk score (weighted sum, capped at 100)
        let risk = (self.summary.critical * 25)
            + (self.summary.high * 15)
            + (self.summary.medium * 8)
            + (self.summary.low * 3)
            + self.summary.info;
        self.summary.risk_score = risk.min(100);

        // Safe if no critical or high findings
        self.summary.is_safe = self.summary.critical == 0 && self.summary.high == 0;
    }

    /// Sort findings by severity (most severe first)
    pub fn sort_findings(&mut self) {
        self.findings.sort_by(|a, b| {
            b.severity.weight().cmp(&a.severity.weight())
                .then_with(|| a.file_path.cmp(&b.file_path))
                .then_with(|| a.line.cmp(&b.line))
        });
    }
}

/// Options for security scanning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityScanOptions {
    /// Maximum file size to scan (bytes)
    #[serde(rename = "maxFileSize", default = "default_max_file_size")]
    pub max_file_size: u64,
    /// Maximum total files to scan
    #[serde(rename = "maxFiles", default = "default_max_files")]
    pub max_files: u32,
    /// File extensions to scan (empty = all text files)
    #[serde(default)]
    pub extensions: Vec<String>,
    /// Skip files matching these patterns
    #[serde(rename = "skipPatterns", default)]
    pub skip_patterns: Vec<String>,
    /// Minimum severity to report
    #[serde(rename = "minSeverity", default)]
    pub min_severity: Option<SecuritySeverity>,
}

fn default_max_file_size() -> u64 {
    1024 * 1024 // 1MB
}

fn default_max_files() -> u32 {
    500
}

impl Default for SecurityScanOptions {
    fn default() -> Self {
        Self {
            max_file_size: default_max_file_size(),
            max_files: default_max_files(),
            extensions: vec![],
            skip_patterns: vec![
                "node_modules".to_string(),
                ".git".to_string(),
                "__pycache__".to_string(),
                ".venv".to_string(),
            ],
            min_severity: None,
        }
    }
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

    // ========== Security Scanning Tests ==========

    #[test]
    fn test_security_severity_weight() {
        assert!(SecuritySeverity::Critical.weight() > SecuritySeverity::High.weight());
        assert!(SecuritySeverity::High.weight() > SecuritySeverity::Medium.weight());
        assert!(SecuritySeverity::Medium.weight() > SecuritySeverity::Low.weight());
        assert!(SecuritySeverity::Low.weight() > SecuritySeverity::Info.weight());
        assert_eq!(SecuritySeverity::Critical.weight(), 5);
        assert_eq!(SecuritySeverity::Info.weight(), 1);
    }

    #[test]
    fn test_security_severity_serialization() {
        let severity = SecuritySeverity::Critical;
        let json = serde_json::to_string(&severity).unwrap();
        assert_eq!(json, "\"critical\"");

        let parsed: SecuritySeverity = serde_json::from_str("\"high\"").unwrap();
        assert_eq!(parsed, SecuritySeverity::High);
    }

    #[test]
    fn test_security_category_serialization() {
        let category = SecurityCategory::CommandExecution;
        let json = serde_json::to_string(&category).unwrap();
        assert_eq!(json, "\"command_execution\"");

        let parsed: SecurityCategory = serde_json::from_str("\"code_injection\"").unwrap();
        assert_eq!(parsed, SecurityCategory::CodeInjection);
    }

    #[test]
    fn test_security_finding_serialization() {
        let finding = SecurityFinding {
            rule_id: "SEC001".to_string(),
            title: "Test Finding".to_string(),
            description: "Test description".to_string(),
            severity: SecuritySeverity::High,
            category: SecurityCategory::CommandExecution,
            file_path: "test.js".to_string(),
            line: 10,
            column: 5,
            snippet: Some("eval(x)".to_string()),
            suggestion: Some("Don't use eval".to_string()),
        };

        let json = serde_json::to_string(&finding).unwrap();
        assert!(json.contains("\"ruleId\":\"SEC001\""));
        assert!(json.contains("\"filePath\":\"test.js\""));
        assert!(json.contains("\"severity\":\"high\""));
    }

    #[test]
    fn test_security_scan_summary_default() {
        let summary = SecurityScanSummary::default();
        assert_eq!(summary.files_scanned, 0);
        assert_eq!(summary.total_findings, 0);
        assert_eq!(summary.critical, 0);
        assert_eq!(summary.high, 0);
        assert_eq!(summary.medium, 0);
        assert_eq!(summary.low, 0);
        assert_eq!(summary.info, 0);
        assert!(!summary.is_safe);
        assert_eq!(summary.risk_score, 0);
    }

    #[test]
    fn test_security_scan_report_new() {
        let report = SecurityScanReport::new("test-skill".to_string(), "/path/to/skill".to_string());
        assert_eq!(report.skill_id, "test-skill");
        assert_eq!(report.scanned_path, "/path/to/skill");
        assert!(report.skill_name.is_none());
        assert!(report.findings.is_empty());
        assert_eq!(report.duration_ms, 0);
    }

    #[test]
    fn test_security_scan_report_calculate_summary() {
        let mut report = SecurityScanReport::new("test".to_string(), "/path".to_string());
        report.findings = vec![
            SecurityFinding {
                rule_id: "SEC001".to_string(),
                title: "Critical".to_string(),
                description: "".to_string(),
                severity: SecuritySeverity::Critical,
                category: SecurityCategory::CommandExecution,
                file_path: "a.js".to_string(),
                line: 1,
                column: 1,
                snippet: None,
                suggestion: None,
            },
            SecurityFinding {
                rule_id: "SEC002".to_string(),
                title: "High".to_string(),
                description: "".to_string(),
                severity: SecuritySeverity::High,
                category: SecurityCategory::CodeInjection,
                file_path: "b.js".to_string(),
                line: 2,
                column: 1,
                snippet: None,
                suggestion: None,
            },
            SecurityFinding {
                rule_id: "SEC003".to_string(),
                title: "Medium".to_string(),
                description: "".to_string(),
                severity: SecuritySeverity::Medium,
                category: SecurityCategory::NetworkAccess,
                file_path: "c.js".to_string(),
                line: 3,
                column: 1,
                snippet: None,
                suggestion: None,
            },
        ];

        report.calculate_summary();

        assert_eq!(report.summary.total_findings, 3);
        assert_eq!(report.summary.critical, 1);
        assert_eq!(report.summary.high, 1);
        assert_eq!(report.summary.medium, 1);
        assert_eq!(report.summary.low, 0);
        assert_eq!(report.summary.info, 0);
        assert!(!report.summary.is_safe); // Has critical/high findings
        assert!(report.summary.risk_score > 0);
    }

    #[test]
    fn test_security_scan_report_sort_findings() {
        let mut report = SecurityScanReport::new("test".to_string(), "/path".to_string());
        report.findings = vec![
            SecurityFinding {
                rule_id: "SEC001".to_string(),
                title: "Low".to_string(),
                description: "".to_string(),
                severity: SecuritySeverity::Low,
                category: SecurityCategory::Other,
                file_path: "a.js".to_string(),
                line: 1,
                column: 1,
                snippet: None,
                suggestion: None,
            },
            SecurityFinding {
                rule_id: "SEC002".to_string(),
                title: "Critical".to_string(),
                description: "".to_string(),
                severity: SecuritySeverity::Critical,
                category: SecurityCategory::CommandExecution,
                file_path: "b.js".to_string(),
                line: 2,
                column: 1,
                snippet: None,
                suggestion: None,
            },
        ];

        report.sort_findings();

        assert_eq!(report.findings[0].severity, SecuritySeverity::Critical);
        assert_eq!(report.findings[1].severity, SecuritySeverity::Low);
    }

    #[test]
    fn test_security_scan_report_is_safe() {
        let mut report = SecurityScanReport::new("test".to_string(), "/path".to_string());
        report.findings = vec![
            SecurityFinding {
                rule_id: "SEC001".to_string(),
                title: "Info".to_string(),
                description: "".to_string(),
                severity: SecuritySeverity::Info,
                category: SecurityCategory::Other,
                file_path: "a.js".to_string(),
                line: 1,
                column: 1,
                snippet: None,
                suggestion: None,
            },
        ];

        report.calculate_summary();
        assert!(report.summary.is_safe); // Only info findings = safe
    }

    #[test]
    fn test_security_scan_options_default() {
        let opts = SecurityScanOptions::default();
        assert_eq!(opts.max_file_size, 1024 * 1024);
        assert_eq!(opts.max_files, 500);
        assert!(opts.extensions.is_empty());
        assert!(!opts.skip_patterns.is_empty());
        assert!(opts.skip_patterns.contains(&"node_modules".to_string()));
        assert!(opts.min_severity.is_none());
    }
}
