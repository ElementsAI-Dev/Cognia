//! Skill Seekers Tauri Commands
//!
//! Exposes Skill Seekers CLI integration to the frontend for generating
//! AI skills from documentation, GitHub repositories, and PDFs.

use crate::skill_seekers::{
    EnhanceConfig, EnhanceSkillInput, GeneratedSkill, GitHubScrapeConfig, PackageSkillInput,
    PageEstimation, PresetConfig, ScrapeGitHubInput, ScrapePdfInput, ScrapeWebsiteInput,
    SkillGenerationJob, SkillSeekersService, SkillSeekersServiceConfig, SkillSeekersState,
    WebsiteScrapeConfig,
};
use std::path::PathBuf;
use tauri::{AppHandle, State};

/// Create skill seekers service for app state
pub fn create_skill_seekers_service(
    app_data_dir: PathBuf,
    app_handle: AppHandle,
) -> SkillSeekersState {
    match SkillSeekersService::new(app_data_dir) {
        Ok(mut service) => {
            service.set_app_handle(app_handle);
            SkillSeekersState::new(service)
        }
        Err(e) => {
            log::error!("Failed to create skill seekers service: {}", e);
            panic!("Failed to initialize skill seekers service: {}", e);
        }
    }
}

// ========== Installation Commands ==========

/// Check if skill-seekers is installed
#[tauri::command]
pub async fn skill_seekers_is_installed(
    state: State<'_, SkillSeekersState>,
) -> Result<bool, String> {
    let service = state.0.read().await;
    Ok(service.is_installed().await)
}

/// Get installed version
#[tauri::command]
pub async fn skill_seekers_get_version(
    state: State<'_, SkillSeekersState>,
) -> Result<Option<String>, String> {
    let service = state.0.read().await;
    Ok(service.get_version().await)
}

/// Install skill-seekers in virtual environment
#[tauri::command]
pub async fn skill_seekers_install(
    state: State<'_, SkillSeekersState>,
    extras: Option<Vec<String>>,
) -> Result<String, String> {
    let service = state.0.read().await;
    service.install(extras).await.map_err(|e| e.to_string())
}

// ========== Configuration Commands ==========

/// Get service configuration
#[tauri::command]
pub async fn skill_seekers_get_config(
    state: State<'_, SkillSeekersState>,
) -> Result<SkillSeekersServiceConfig, String> {
    let service = state.0.read().await;
    Ok(service.get_config().await)
}

/// Update service configuration
#[tauri::command]
pub async fn skill_seekers_update_config(
    state: State<'_, SkillSeekersState>,
    config: SkillSeekersServiceConfig,
) -> Result<(), String> {
    let service = state.0.read().await;
    service
        .update_config(config)
        .await
        .map_err(|e| e.to_string())
}

/// List available preset configurations
#[tauri::command]
pub async fn skill_seekers_list_presets(
    state: State<'_, SkillSeekersState>,
) -> Result<Vec<PresetConfig>, String> {
    let service = state.0.read().await;
    service
        .list_preset_configs()
        .await
        .map_err(|e| e.to_string())
}

// ========== Scraping Commands ==========

/// Scrape a documentation website
#[tauri::command]
pub async fn skill_seekers_scrape_website(
    state: State<'_, SkillSeekersState>,
    input: ScrapeWebsiteInput,
) -> Result<String, String> {
    let service = state.0.read().await;
    service
        .scrape_website(input)
        .await
        .map_err(|e| e.to_string())
}

/// Scrape a GitHub repository
#[tauri::command]
pub async fn skill_seekers_scrape_github(
    state: State<'_, SkillSeekersState>,
    input: ScrapeGitHubInput,
) -> Result<String, String> {
    let service = state.0.read().await;
    service
        .scrape_github(input)
        .await
        .map_err(|e| e.to_string())
}

/// Extract from a PDF document
#[tauri::command]
pub async fn skill_seekers_scrape_pdf(
    state: State<'_, SkillSeekersState>,
    input: ScrapePdfInput,
) -> Result<String, String> {
    let service = state.0.read().await;
    service.scrape_pdf(input).await.map_err(|e| e.to_string())
}

// ========== Enhancement & Packaging Commands ==========

/// Enhance an existing skill with AI
#[tauri::command]
pub async fn skill_seekers_enhance(
    state: State<'_, SkillSeekersState>,
    input: EnhanceSkillInput,
) -> Result<(), String> {
    let service = state.0.read().await;
    service
        .enhance_skill(input)
        .await
        .map_err(|e| e.to_string())
}

/// Package a skill for a target platform
#[tauri::command]
pub async fn skill_seekers_package(
    state: State<'_, SkillSeekersState>,
    input: PackageSkillInput,
) -> Result<String, String> {
    let service = state.0.read().await;
    service
        .package_skill(input)
        .await
        .map_err(|e| e.to_string())
}

// ========== Utility Commands ==========

/// Estimate page count for a URL
#[tauri::command]
pub async fn skill_seekers_estimate_pages(
    state: State<'_, SkillSeekersState>,
    url: String,
    config_name: Option<String>,
) -> Result<PageEstimation, String> {
    let service = state.0.read().await;
    service
        .estimate_pages(&url, config_name.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Validate a configuration file
#[tauri::command]
pub async fn skill_seekers_validate_config(
    state: State<'_, SkillSeekersState>,
    config_path: String,
) -> Result<bool, String> {
    let service = state.0.read().await;
    service
        .validate_config(&config_path)
        .await
        .map_err(|e| e.to_string())
}

// ========== Job Management Commands ==========

/// List all jobs
#[tauri::command]
pub async fn skill_seekers_list_jobs(
    state: State<'_, SkillSeekersState>,
) -> Result<Vec<SkillGenerationJob>, String> {
    let service = state.0.read().await;
    Ok(service.list_jobs().await)
}

/// Get job by ID
#[tauri::command]
pub async fn skill_seekers_get_job(
    state: State<'_, SkillSeekersState>,
    job_id: String,
) -> Result<Option<SkillGenerationJob>, String> {
    let service = state.0.read().await;
    Ok(service.get_job(&job_id).await)
}

/// Cancel a running job
#[tauri::command]
pub async fn skill_seekers_cancel_job(
    state: State<'_, SkillSeekersState>,
    job_id: String,
) -> Result<(), String> {
    let service = state.0.read().await;
    service.cancel_job(&job_id).await.map_err(|e| e.to_string())
}

/// Resume a paused job
#[tauri::command]
pub async fn skill_seekers_resume_job(
    state: State<'_, SkillSeekersState>,
    job_id: String,
) -> Result<(), String> {
    let service = state.0.read().await;
    service.resume_job(&job_id).await.map_err(|e| e.to_string())
}

/// Clean up old jobs
#[tauri::command]
pub async fn skill_seekers_cleanup_jobs(
    state: State<'_, SkillSeekersState>,
    max_age_days: Option<u32>,
) -> Result<u32, String> {
    let service = state.0.read().await;
    service
        .cleanup_jobs(max_age_days.unwrap_or(30))
        .await
        .map_err(|e| e.to_string())
}

// ========== Generated Skills Commands ==========

/// List all generated skills
#[tauri::command]
pub async fn skill_seekers_list_generated(
    state: State<'_, SkillSeekersState>,
) -> Result<Vec<GeneratedSkill>, String> {
    let service = state.0.read().await;
    Ok(service.list_generated_skills().await)
}

/// Get generated skill by ID
#[tauri::command]
pub async fn skill_seekers_get_generated(
    state: State<'_, SkillSeekersState>,
    skill_id: String,
) -> Result<Option<GeneratedSkill>, String> {
    let service = state.0.read().await;
    Ok(service.get_generated_skill(&skill_id).await)
}

/// Get app data directory path
#[tauri::command]
pub async fn skill_seekers_get_app_data_dir(
    state: State<'_, SkillSeekersState>,
) -> Result<String, String> {
    let service = state.0.read().await;
    Ok(service.get_app_data_dir().to_string_lossy().to_string())
}

/// Get output directory path
#[tauri::command]
pub async fn skill_seekers_get_output_dir(
    state: State<'_, SkillSeekersState>,
) -> Result<String, String> {
    let service = state.0.read().await;
    Ok(service.get_output_dir().to_string_lossy().to_string())
}

/// Get venv path
#[tauri::command]
pub async fn skill_seekers_get_venv_path(
    state: State<'_, SkillSeekersState>,
) -> Result<String, String> {
    let service = state.0.read().await;
    Ok(service.get_venv_path().to_string_lossy().to_string())
}

// ========== Quick Generate Commands ==========

/// Quick generate skill from URL (uses defaults)
#[tauri::command]
pub async fn skill_seekers_quick_generate_website(
    state: State<'_, SkillSeekersState>,
    url: String,
    name: String,
    auto_enhance: bool,
    auto_install: bool,
) -> Result<String, String> {
    let service = state.0.read().await;

    let input = ScrapeWebsiteInput {
        config: WebsiteScrapeConfig {
            name,
            base_url: url,
            ..Default::default()
        },
        preset_config: None,
        enhance: if auto_enhance {
            Some(EnhanceConfig::default())
        } else {
            None
        },
        package: None,
        auto_install,
    };

    service
        .scrape_website(input)
        .await
        .map_err(|e| e.to_string())
}

/// Quick generate skill from GitHub repo (uses defaults)
#[tauri::command]
pub async fn skill_seekers_quick_generate_github(
    state: State<'_, SkillSeekersState>,
    repo: String,
    auto_enhance: bool,
    auto_install: bool,
) -> Result<String, String> {
    let service = state.0.read().await;

    let input = ScrapeGitHubInput {
        config: GitHubScrapeConfig {
            repo,
            ..Default::default()
        },
        enhance: if auto_enhance {
            Some(EnhanceConfig::default())
        } else {
            None
        },
        package: None,
        auto_install,
    };

    service
        .scrape_github(input)
        .await
        .map_err(|e| e.to_string())
}

/// Quick generate skill from preset config
#[tauri::command]
pub async fn skill_seekers_quick_generate_preset(
    state: State<'_, SkillSeekersState>,
    preset_name: String,
    auto_enhance: bool,
    auto_install: bool,
) -> Result<String, String> {
    let service = state.0.read().await;

    let input = ScrapeWebsiteInput {
        config: WebsiteScrapeConfig::default(),
        preset_config: Some(preset_name),
        enhance: if auto_enhance {
            Some(EnhanceConfig::default())
        } else {
            None
        },
        package: None,
        auto_install,
    };

    service
        .scrape_website(input)
        .await
        .map_err(|e| e.to_string())
}
