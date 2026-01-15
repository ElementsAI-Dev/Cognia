//! Skill Tauri Commands
//!
//! Exposes skill management functionality to the frontend.

use crate::skill::{
    DiscoverableSkill, InstalledSkill, LocalSkill, Skill, SkillError, SkillRepo, SkillService,
};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

/// Skill service state wrapper
pub struct SkillServiceState(pub Arc<RwLock<SkillService>>);

/// Create skill service for app state
pub fn create_skill_service(app_data_dir: PathBuf) -> SkillServiceState {
    match SkillService::new(app_data_dir) {
        Ok(service) => SkillServiceState(Arc::new(RwLock::new(service))),
        Err(e) => {
            log::error!("Failed to create skill service: {}", e);
            panic!("Failed to initialize skill service: {}", e);
        }
    }
}

// ========== Repository Commands ==========

/// List all configured skill repositories
#[tauri::command]
pub async fn skill_list_repos(state: State<'_, SkillServiceState>) -> Result<Vec<SkillRepo>, String> {
    let service = state.0.read().await;
    Ok(service.list_repos().await)
}

/// Add a skill repository
#[tauri::command]
pub async fn skill_add_repo(
    state: State<'_, SkillServiceState>,
    owner: String,
    name: String,
    branch: Option<String>,
) -> Result<(), String> {
    let service = state.0.read().await;
    let repo = SkillRepo {
        owner,
        name,
        branch: branch.unwrap_or_else(|| "main".to_string()),
        enabled: true,
    };
    service.add_repo(repo).await.map_err(|e| e.to_string())
}

/// Remove a skill repository
#[tauri::command]
pub async fn skill_remove_repo(
    state: State<'_, SkillServiceState>,
    owner: String,
    name: String,
) -> Result<(), String> {
    let service = state.0.read().await;
    service.remove_repo(&owner, &name).await.map_err(|e| e.to_string())
}

/// Toggle repository enabled state
#[tauri::command]
pub async fn skill_toggle_repo(
    state: State<'_, SkillServiceState>,
    owner: String,
    name: String,
    enabled: bool,
) -> Result<(), String> {
    let service = state.0.read().await;
    service.toggle_repo(&owner, &name, enabled).await.map_err(|e| e.to_string())
}

// ========== Discovery Commands ==========

/// Discover skills from all enabled repositories
#[tauri::command]
pub async fn skill_discover(
    state: State<'_, SkillServiceState>,
) -> Result<Vec<DiscoverableSkill>, String> {
    let service = state.0.read().await;
    service.discover_skills().await.map_err(|e| e.to_string())
}

/// Get all skills (merged view)
#[tauri::command]
pub async fn skill_get_all(state: State<'_, SkillServiceState>) -> Result<Vec<Skill>, String> {
    let service = state.0.read().await;
    service.get_all_skills().await.map_err(|e| e.to_string())
}

/// Scan for local unregistered skills
#[tauri::command]
pub async fn skill_scan_local(
    state: State<'_, SkillServiceState>,
) -> Result<Vec<LocalSkill>, String> {
    let service = state.0.read().await;
    service.scan_local_skills().await.map_err(|e| e.to_string())
}

// ========== Installation Commands ==========

/// Install a skill from repository
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn skill_install(
    state: State<'_, SkillServiceState>,
    key: String,
    name: String,
    description: String,
    directory: String,
    repo_owner: String,
    repo_name: String,
    repo_branch: String,
    readme_url: Option<String>,
) -> Result<InstalledSkill, String> {
    let service = state.0.read().await;
    let skill = DiscoverableSkill {
        key,
        name,
        description,
        directory,
        readme_url,
        repo_owner,
        repo_name,
        repo_branch,
    };
    service.install_skill(&skill).await.map_err(|e| e.to_string())
}

/// Install a skill from local path
#[tauri::command]
pub async fn skill_install_local(
    state: State<'_, SkillServiceState>,
    source_path: String,
    name: Option<String>,
) -> Result<InstalledSkill, String> {
    let service = state.0.read().await;
    let path = std::path::Path::new(&source_path);
    service
        .install_local_skill(path, name.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Register a local skill already in SSOT directory
#[tauri::command]
pub async fn skill_register_local(
    state: State<'_, SkillServiceState>,
    directory: String,
) -> Result<InstalledSkill, String> {
    let service = state.0.read().await;
    service.register_local_skill(&directory).await.map_err(|e| e.to_string())
}

/// Uninstall a skill
#[tauri::command]
pub async fn skill_uninstall(
    state: State<'_, SkillServiceState>,
    id: String,
) -> Result<(), String> {
    let service = state.0.read().await;
    service.uninstall_skill(&id).await.map_err(|e| e.to_string())
}

// ========== State Management Commands ==========

/// Get all installed skills
#[tauri::command]
pub async fn skill_get_installed(
    state: State<'_, SkillServiceState>,
) -> Result<Vec<InstalledSkill>, String> {
    let service = state.0.read().await;
    Ok(service.get_installed_skills().await)
}

/// Get a specific installed skill
#[tauri::command]
pub async fn skill_get(
    state: State<'_, SkillServiceState>,
    id: String,
) -> Result<Option<InstalledSkill>, String> {
    let service = state.0.read().await;
    Ok(service.get_installed_skill(&id).await)
}

/// Get a specific installed skill or return error (uses SkillError)
#[tauri::command]
pub async fn skill_get_required(
    state: State<'_, SkillServiceState>,
    id: String,
) -> Result<InstalledSkill, String> {
    let service = state.0.read().await;
    service.get_skill_or_error(&id).await.map_err(|e: SkillError| e.to_string())
}

/// Validate if a skill can be installed
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn skill_validate_install(
    state: State<'_, SkillServiceState>,
    key: String,
    name: String,
    description: String,
    directory: String,
    repo_owner: String,
    repo_name: String,
    repo_branch: String,
    readme_url: Option<String>,
) -> Result<(), String> {
    let service = state.0.read().await;
    let skill = DiscoverableSkill {
        key,
        name,
        description,
        directory,
        readme_url,
        repo_owner,
        repo_name,
        repo_branch,
    };
    service.validate_install(&skill).await.map_err(|e: SkillError| e.to_string())
}

/// Enable a skill
#[tauri::command]
pub async fn skill_enable(
    state: State<'_, SkillServiceState>,
    id: String,
) -> Result<(), String> {
    let service = state.0.read().await;
    service.enable_skill(&id).await.map_err(|e| e.to_string())
}

/// Disable a skill
#[tauri::command]
pub async fn skill_disable(
    state: State<'_, SkillServiceState>,
    id: String,
) -> Result<(), String> {
    let service = state.0.read().await;
    service.disable_skill(&id).await.map_err(|e| e.to_string())
}

/// Update skill metadata
#[tauri::command]
pub async fn skill_update(
    state: State<'_, SkillServiceState>,
    id: String,
    category: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<(), String> {
    let service = state.0.read().await;
    service.update_skill(&id, category, tags).await.map_err(|e| e.to_string())
}

// ========== Content Commands ==========

/// Read skill content (SKILL.md)
#[tauri::command]
pub async fn skill_read_content(
    state: State<'_, SkillServiceState>,
    directory: String,
) -> Result<String, String> {
    let service = state.0.read().await;
    service.read_skill_content(&directory).map_err(|e| e.to_string())
}

/// List skill resource files
#[tauri::command]
pub async fn skill_list_resources(
    state: State<'_, SkillServiceState>,
    directory: String,
) -> Result<Vec<String>, String> {
    let service = state.0.read().await;
    service.list_skill_resources(&directory).map_err(|e| e.to_string())
}

/// Read a skill resource file
#[tauri::command]
pub async fn skill_read_resource(
    state: State<'_, SkillServiceState>,
    directory: String,
    resource_path: String,
) -> Result<String, String> {
    let service = state.0.read().await;
    service.read_skill_resource(&directory, &resource_path).map_err(|e| e.to_string())
}

/// Get SSOT directory path
#[tauri::command]
pub async fn skill_get_ssot_dir(
    state: State<'_, SkillServiceState>,
) -> Result<String, String> {
    let service = state.0.read().await;
    Ok(service.get_ssot_dir().to_string_lossy().to_string())
}

// ========== Security Scanning Commands ==========

use crate::skill::{SecurityScanOptions, SecurityScanReport, SkillSecurityScanner};

/// Scan an installed skill for security issues
#[tauri::command]
pub async fn skill_scan_installed(
    state: State<'_, SkillServiceState>,
    directory: String,
    options: Option<SecurityScanOptions>,
) -> Result<SecurityScanReport, String> {
    let service = state.0.read().await;
    let scanner = SkillSecurityScanner::new();
    let opts = options.unwrap_or_default();
    scanner
        .scan_installed(service.get_ssot_dir(), &directory, &opts)
        .map_err(|e| e.to_string())
}

/// Scan a local path for security issues (pre-install check)
#[tauri::command]
pub async fn skill_scan_path(
    path: String,
    options: Option<SecurityScanOptions>,
) -> Result<SecurityScanReport, String> {
    let scanner = SkillSecurityScanner::new();
    let opts = options.unwrap_or_default();
    let skill_path = std::path::Path::new(&path);
    if !skill_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    scanner.scan(skill_path, &opts).map_err(|e| e.to_string())
}

/// Get the number of security rules available
#[tauri::command]
pub fn skill_security_rule_count() -> usize {
    SkillSecurityScanner::new().rule_count()
}
