//! Skill Seekers Service Implementation
//!
//! Core service for managing Skill Seekers CLI execution, job management,
//! and integration with the virtual environment system.

use crate::skill_seekers::types::*;
use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use serde_json;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;

/// Event names for Tauri
const EVENT_PROGRESS: &str = "skill-seekers:progress";
const EVENT_LOG: &str = "skill-seekers:log";
const EVENT_JOB_COMPLETED: &str = "skill-seekers:job-completed";

/// Skill Seekers service
pub struct SkillSeekersService {
    /// App data directory
    app_data_dir: PathBuf,
    /// Output directory for generated skills
    output_dir: PathBuf,
    /// Virtual environment path
    venv_path: PathBuf,
    /// Persistent store
    store: Arc<RwLock<SkillSeekersStore>>,
    /// Store file path
    store_path: PathBuf,
    /// Active jobs (job_id -> child process)
    active_jobs: Arc<Mutex<HashMap<String, Child>>>,
    /// Tauri app handle
    app_handle: Option<AppHandle>,
}

impl SkillSeekersService {
    /// Create a new SkillSeekersService
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        let output_dir = app_data_dir.join("skill-seekers").join("output");
        let venv_path = app_data_dir.join("skill-seekers").join("venv");
        let store_path = app_data_dir.join("skill-seekers").join("store.json");

        // Ensure directories exist
        fs::create_dir_all(&output_dir)?;
        fs::create_dir_all(venv_path.parent().unwrap_or(&app_data_dir))?;

        // Load or create store
        let store = if store_path.exists() {
            let content = fs::read_to_string(&store_path)?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            let mut store = SkillSeekersStore::default();
            store.config.output_dir = output_dir.to_string_lossy().to_string();
            store.config.venv_path = venv_path.to_string_lossy().to_string();
            store
        };

        Ok(Self {
            app_data_dir,
            output_dir,
            venv_path,
            store: Arc::new(RwLock::new(store)),
            store_path,
            active_jobs: Arc::new(Mutex::new(HashMap::new())),
            app_handle: None,
        })
    }

    /// Set the Tauri app handle for event emission
    pub fn set_app_handle(&mut self, handle: AppHandle) {
        self.app_handle = Some(handle);
    }

    /// Save store to disk
    async fn save_store(&self) -> Result<()> {
        let store = self.store.read().await;
        let content = serde_json::to_string_pretty(&*store)?;
        fs::write(&self.store_path, content)?;
        Ok(())
    }

    /// Get the app data directory
    pub fn get_app_data_dir(&self) -> &Path {
        &self.app_data_dir
    }

    /// Get the output directory
    pub fn get_output_dir(&self) -> &Path {
        &self.output_dir
    }

    /// Get the venv path
    pub fn get_venv_path(&self) -> &Path {
        &self.venv_path
    }

    /// Get Python executable path in venv
    fn get_python_path(&self) -> PathBuf {
        if cfg!(target_os = "windows") {
            self.venv_path.join("Scripts").join("python.exe")
        } else {
            self.venv_path.join("bin").join("python")
        }
    }

    /// Get pip executable path in venv
    fn get_pip_path(&self) -> PathBuf {
        if cfg!(target_os = "windows") {
            self.venv_path.join("Scripts").join("pip.exe")
        } else {
            self.venv_path.join("bin").join("pip")
        }
    }

    /// Check if skill-seekers is installed
    pub async fn is_installed(&self) -> bool {
        let store = self.store.read().await;
        store.installed && self.get_python_path().exists()
    }

    /// Get installed version
    pub async fn get_version(&self) -> Option<String> {
        let store = self.store.read().await;
        store.version.clone()
    }

    /// Install skill-seekers in virtual environment
    pub async fn install(&self, extras: Option<Vec<String>>) -> Result<String> {
        // Create venv if it doesn't exist
        if !self.get_python_path().exists() {
            self.create_venv().await?;
        }

        // Build pip install command
        let pip_path = self.get_pip_path();
        let package = if let Some(extras) = extras {
            if extras.is_empty() {
                "skill-seekers".to_string()
            } else {
                format!("skill-seekers[{}]", extras.join(","))
            }
        } else {
            "skill-seekers[gemini,openai]".to_string()
        };

        log::info!("Installing {} in venv...", package);

        let output = Command::new(&pip_path)
            .args(["install", "--upgrade", &package])
            .output()
            .await
            .context("Failed to run pip install")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow!("Failed to install skill-seekers: {}", stderr));
        }

        // Get installed version
        let version = self.get_installed_version().await?;

        // Update store
        {
            let mut store = self.store.write().await;
            store.installed = true;
            store.version = Some(version.clone());
        }
        self.save_store().await?;

        log::info!("skill-seekers {} installed successfully", version);
        Ok(version)
    }

    /// Create virtual environment using uv or python -m venv
    async fn create_venv(&self) -> Result<()> {
        let venv_path = self.venv_path.to_string_lossy().to_string();
        log::info!("Creating virtual environment at {}...", venv_path);

        // Try uv first
        let uv_result = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", &format!("uv venv \"{}\"", venv_path)])
                .output()
                .await
        } else {
            Command::new("sh")
                .args(["-c", &format!("uv venv '{}'", venv_path)])
                .output()
                .await
        };

        match uv_result {
            Ok(output) if output.status.success() => {
                log::info!("Virtual environment created with uv");
                return Ok(());
            }
            _ => {
                log::info!("uv not available, falling back to python -m venv");
            }
        }

        // Fallback to python -m venv
        let python_result = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", &format!("python -m venv \"{}\"", venv_path)])
                .output()
                .await
        } else {
            Command::new("sh")
                .args(["-c", &format!("python3 -m venv '{}'", venv_path)])
                .output()
                .await
        };

        match python_result {
            Ok(output) if output.status.success() => {
                log::info!("Virtual environment created with python -m venv");
                Ok(())
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(anyhow!("Failed to create venv: {}", stderr))
            }
            Err(e) => Err(anyhow!("Failed to create venv: {}", e)),
        }
    }

    /// Get installed skill-seekers version
    async fn get_installed_version(&self) -> Result<String> {
        let python_path = self.get_python_path();
        let output = Command::new(&python_path)
            .args(["-m", "pip", "show", "skill-seekers"])
            .output()
            .await
            .context("Failed to get package info")?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.starts_with("Version:") {
                    return Ok(line.trim_start_matches("Version:").trim().to_string());
                }
            }
        }
        Ok("unknown".to_string())
    }

    /// Get service configuration
    pub async fn get_config(&self) -> SkillSeekersServiceConfig {
        let store = self.store.read().await;
        store.config.clone()
    }

    /// Update service configuration
    pub async fn update_config(&self, config: SkillSeekersServiceConfig) -> Result<()> {
        {
            let mut store = self.store.write().await;
            store.config = config;
        }
        self.save_store().await
    }

    /// List all jobs
    pub async fn list_jobs(&self) -> Vec<SkillGenerationJob> {
        let store = self.store.read().await;
        store.jobs.values().cloned().collect()
    }

    /// Get job by ID
    pub async fn get_job(&self, job_id: &str) -> Option<SkillGenerationJob> {
        let store = self.store.read().await;
        store.jobs.get(job_id).cloned()
    }

    /// List generated skills
    pub async fn list_generated_skills(&self) -> Vec<GeneratedSkill> {
        let store = self.store.read().await;
        store.skills.values().cloned().collect()
    }

    /// Get generated skill by ID
    pub async fn get_generated_skill(&self, skill_id: &str) -> Option<GeneratedSkill> {
        let store = self.store.read().await;
        store.skills.get(skill_id).cloned()
    }

    // ========== Scraping Operations ==========

    /// Scrape a documentation website
    pub async fn scrape_website(&self, input: ScrapeWebsiteInput) -> Result<String> {
        if !self.is_installed().await {
            return Err(anyhow!(
                "skill-seekers is not installed. Call install() first."
            ));
        }

        let job_id = Uuid::new_v4().to_string();
        let skill_name = if input.preset_config.is_some() {
            input.preset_config.clone().unwrap()
        } else {
            input.config.name.clone()
        };

        // Create job
        let job = SkillGenerationJob::new(job_id.clone(), SourceType::Website, skill_name.clone());
        {
            let mut store = self.store.write().await;
            store.jobs.insert(job_id.clone(), job);
        }
        self.save_store().await?;

        // Build command arguments
        let mut args = vec!["scrape".to_string()];

        if let Some(preset) = &input.preset_config {
            args.push("--config".to_string());
            args.push(format!("configs/{}.json", preset));
        } else {
            args.push("--url".to_string());
            args.push(input.config.base_url.clone());
            args.push("--name".to_string());
            args.push(input.config.name.clone());

            if input.config.max_pages != 300 {
                args.push("--max-pages".to_string());
                args.push(input.config.max_pages.to_string());
            }

            if input.config.async_mode {
                args.push("--async".to_string());
                args.push("--workers".to_string());
                args.push(input.config.workers.to_string());
            }
        }

        // Add enhancement if requested
        if let Some(enhance) = &input.enhance {
            match enhance.mode {
                EnhanceMode::Local => args.push("--enhance-local".to_string()),
                EnhanceMode::Api => args.push("--enhance".to_string()),
            }
        }

        // Set output directory
        args.push("--output".to_string());
        args.push(self.output_dir.to_string_lossy().to_string());

        // Run the command
        self.run_skill_seekers_command(
            &job_id,
            args,
            input.enhance,
            input.package,
            input.auto_install,
        )
        .await?;

        Ok(job_id)
    }

    /// Scrape a GitHub repository
    pub async fn scrape_github(&self, input: ScrapeGitHubInput) -> Result<String> {
        if !self.is_installed().await {
            return Err(anyhow!(
                "skill-seekers is not installed. Call install() first."
            ));
        }

        let job_id = Uuid::new_v4().to_string();
        let skill_name = input.config.name.clone().unwrap_or_else(|| {
            input
                .config
                .repo
                .split('/')
                .next_back()
                .unwrap_or("repo")
                .to_string()
        });

        // Create job
        let job = SkillGenerationJob::new(job_id.clone(), SourceType::GitHub, skill_name.clone());
        {
            let mut store = self.store.write().await;
            store.jobs.insert(job_id.clone(), job);
        }
        self.save_store().await?;

        // Build command arguments
        let mut args = vec![
            "github".to_string(),
            "--repo".to_string(),
            input.config.repo.clone(),
        ];

        // Code analysis depth
        args.push("--code-analysis-depth".to_string());
        args.push(match input.config.code_analysis_depth {
            CodeAnalysisDepth::Surface => "surface".to_string(),
            CodeAnalysisDepth::Medium => "medium".to_string(),
            CodeAnalysisDepth::Deep => "deep".to_string(),
        });

        if input.config.include_issues {
            args.push("--include-issues".to_string());
            args.push("--max-issues".to_string());
            args.push(input.config.max_issues.to_string());
        }

        if input.config.include_changelog {
            args.push("--include-changelog".to_string());
        }

        if input.config.include_releases {
            args.push("--include-releases".to_string());
        }

        // Set output directory
        args.push("--output".to_string());
        args.push(self.output_dir.to_string_lossy().to_string());

        // Run the command
        self.run_skill_seekers_command(
            &job_id,
            args,
            input.enhance,
            input.package,
            input.auto_install,
        )
        .await?;

        Ok(job_id)
    }

    /// Extract from a PDF document
    pub async fn scrape_pdf(&self, input: ScrapePdfInput) -> Result<String> {
        if !self.is_installed().await {
            return Err(anyhow!(
                "skill-seekers is not installed. Call install() first."
            ));
        }

        let job_id = Uuid::new_v4().to_string();
        let skill_name = input.config.name.clone();

        // Create job
        let job = SkillGenerationJob::new(job_id.clone(), SourceType::Pdf, skill_name.clone());
        {
            let mut store = self.store.write().await;
            store.jobs.insert(job_id.clone(), job);
        }
        self.save_store().await?;

        // Build command arguments
        let mut args = vec![
            "pdf".to_string(),
            "--pdf".to_string(),
            input.config.pdf_path.clone(),
            "--name".to_string(),
            input.config.name.clone(),
        ];

        // Set output directory
        args.push("--output".to_string());
        args.push(self.output_dir.to_string_lossy().to_string());

        // Run the command
        self.run_skill_seekers_command(
            &job_id,
            args,
            input.enhance,
            input.package,
            input.auto_install,
        )
        .await?;

        Ok(job_id)
    }

    // ========== Enhancement & Packaging ==========

    /// Enhance an existing skill
    pub async fn enhance_skill(&self, input: EnhanceSkillInput) -> Result<()> {
        if !self.is_installed().await {
            return Err(anyhow!(
                "skill-seekers is not installed. Call install() first."
            ));
        }

        let mut args = vec!["enhance".to_string(), input.skill_dir.clone()];

        match input.config.mode {
            EnhanceMode::Local => {
                // Local mode is default, no additional args needed
            }
            EnhanceMode::Api => {
                args.push("--mode".to_string());
                args.push("api".to_string());
                args.push("--provider".to_string());
                args.push(match input.config.provider {
                    EnhanceProvider::Anthropic => "anthropic".to_string(),
                    EnhanceProvider::Google => "google".to_string(),
                    EnhanceProvider::OpenAI => "openai".to_string(),
                });
            }
        }

        args.push("--quality".to_string());
        args.push(match input.config.quality {
            EnhanceQuality::Minimal => "minimal".to_string(),
            EnhanceQuality::Standard => "standard".to_string(),
            EnhanceQuality::Comprehensive => "comprehensive".to_string(),
        });

        // Set API key environment variable if provided
        let mut env_vars = HashMap::new();
        if let Some(api_key) = &input.config.api_key {
            let env_name = match input.config.provider {
                EnhanceProvider::Anthropic => "ANTHROPIC_API_KEY",
                EnhanceProvider::Google => "GOOGLE_API_KEY",
                EnhanceProvider::OpenAI => "OPENAI_API_KEY",
            };
            env_vars.insert(env_name.to_string(), api_key.clone());
        }

        self.run_simple_command(args, Some(env_vars)).await
    }

    /// Package a skill for a target platform
    pub async fn package_skill(&self, input: PackageSkillInput) -> Result<String> {
        if !self.is_installed().await {
            return Err(anyhow!(
                "skill-seekers is not installed. Call install() first."
            ));
        }

        let mut args = vec!["package".to_string(), input.skill_dir.clone()];

        args.push("--target".to_string());
        args.push(match input.config.target {
            PackageTarget::Claude => "claude".to_string(),
            PackageTarget::Gemini => "gemini".to_string(),
            PackageTarget::OpenAI => "openai".to_string(),
            PackageTarget::Markdown => "markdown".to_string(),
        });

        if let Some(output) = &input.config.output_filename {
            args.push("--output".to_string());
            args.push(output.clone());
        }

        self.run_simple_command(args, None).await?;

        // Determine output file path
        let skill_name = Path::new(&input.skill_dir)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let extension = match input.config.target {
            PackageTarget::Gemini => "tar.gz",
            _ => "zip",
        };

        let suffix = match input.config.target {
            PackageTarget::Claude => "",
            PackageTarget::Gemini => "-gemini",
            PackageTarget::OpenAI => "-openai",
            PackageTarget::Markdown => "-markdown",
        };

        let package_path = format!("{}{}.{}", skill_name, suffix, extension);
        Ok(package_path)
    }

    // ========== Utility Operations ==========

    /// List available preset configurations
    pub async fn list_preset_configs(&self) -> Result<Vec<PresetConfig>> {
        // These are built into skill-seekers
        Ok(vec![
            PresetConfig {
                name: "react".to_string(),
                display_name: "React".to_string(),
                description: "React documentation from react.dev".to_string(),
                category: "web-frameworks".to_string(),
                config_path: "configs/react.json".to_string(),
                icon: Some("⚛️".to_string()),
                estimated_pages: Some(200),
            },
            PresetConfig {
                name: "vue".to_string(),
                display_name: "Vue.js".to_string(),
                description: "Vue.js documentation".to_string(),
                category: "web-frameworks".to_string(),
                config_path: "configs/vue.json".to_string(),
                icon: Some("💚".to_string()),
                estimated_pages: Some(150),
            },
            PresetConfig {
                name: "django".to_string(),
                display_name: "Django".to_string(),
                description: "Django web framework documentation".to_string(),
                category: "web-frameworks".to_string(),
                config_path: "configs/django.json".to_string(),
                icon: Some("🎸".to_string()),
                estimated_pages: Some(300),
            },
            PresetConfig {
                name: "fastapi".to_string(),
                display_name: "FastAPI".to_string(),
                description: "FastAPI modern Python web framework".to_string(),
                category: "web-frameworks".to_string(),
                config_path: "configs/fastapi.json".to_string(),
                icon: Some("⚡".to_string()),
                estimated_pages: Some(100),
            },
            PresetConfig {
                name: "godot".to_string(),
                display_name: "Godot Engine".to_string(),
                description: "Godot game engine documentation".to_string(),
                category: "game-engines".to_string(),
                config_path: "configs/godot.json".to_string(),
                icon: Some("🎮".to_string()),
                estimated_pages: Some(500),
            },
            PresetConfig {
                name: "unity".to_string(),
                display_name: "Unity".to_string(),
                description: "Unity game engine documentation".to_string(),
                category: "game-engines".to_string(),
                config_path: "configs/unity.json".to_string(),
                icon: Some("🎯".to_string()),
                estimated_pages: Some(400),
            },
            PresetConfig {
                name: "nextjs".to_string(),
                display_name: "Next.js".to_string(),
                description: "Next.js React framework documentation".to_string(),
                category: "web-frameworks".to_string(),
                config_path: "configs/nextjs.json".to_string(),
                icon: Some("▲".to_string()),
                estimated_pages: Some(200),
            },
            PresetConfig {
                name: "tailwindcss".to_string(),
                display_name: "Tailwind CSS".to_string(),
                description: "Tailwind CSS utility framework".to_string(),
                category: "css-frameworks".to_string(),
                config_path: "configs/tailwindcss.json".to_string(),
                icon: Some("🎨".to_string()),
                estimated_pages: Some(150),
            },
            PresetConfig {
                name: "typescript".to_string(),
                display_name: "TypeScript".to_string(),
                description: "TypeScript language documentation".to_string(),
                category: "languages".to_string(),
                config_path: "configs/typescript.json".to_string(),
                icon: Some("📘".to_string()),
                estimated_pages: Some(300),
            },
            PresetConfig {
                name: "rust".to_string(),
                display_name: "Rust".to_string(),
                description: "Rust programming language documentation".to_string(),
                category: "languages".to_string(),
                config_path: "configs/rust.json".to_string(),
                icon: Some("🦀".to_string()),
                estimated_pages: Some(400),
            },
        ])
    }

    /// Estimate page count for a URL
    pub async fn estimate_pages(
        &self,
        url: &str,
        config_name: Option<&str>,
    ) -> Result<PageEstimation> {
        if !self.is_installed().await {
            return Err(anyhow!(
                "skill-seekers is not installed. Call install() first."
            ));
        }

        let mut args = vec!["estimate".to_string()];

        if let Some(config) = config_name {
            args.push("--config".to_string());
            args.push(format!("configs/{}.json", config));
        } else {
            args.push("--url".to_string());
            args.push(url.to_string());
        }

        let output = self.run_simple_command_output(args, None).await?;

        // Parse output - skill-seekers outputs JSON for estimate
        // Try to parse JSON output, fall back to defaults if parsing fails
        let estimation = if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&output) {
            PageEstimation {
                estimated_pages: parsed
                    .get("estimated_pages")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(100) as u32,
                estimated_minutes: parsed
                    .get("estimated_minutes")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(15) as u32,
                has_llms_txt: parsed
                    .get("has_llms_txt")
                    .and_then(|v| v.as_bool())
                    .unwrap_or_else(|| output.contains("llms.txt")),
            }
        } else {
            // Fallback: try to extract numbers from text output
            let pages = output
                .lines()
                .find(|l| l.contains("pages") || l.contains("Pages"))
                .and_then(|l| l.split_whitespace().find_map(|w| w.parse::<u32>().ok()))
                .unwrap_or(100);
            let minutes = (pages as f64 * 0.15).ceil() as u32; // ~0.15 min per page
            PageEstimation {
                estimated_pages: pages,
                estimated_minutes: minutes.max(1),
                has_llms_txt: output.contains("llms.txt"),
            }
        };

        Ok(estimation)
    }

    /// Validate a configuration file
    pub async fn validate_config(&self, config_path: &str) -> Result<bool> {
        if !self.is_installed().await {
            return Err(anyhow!(
                "skill-seekers is not installed. Call install() first."
            ));
        }

        let args = vec!["validate".to_string(), config_path.to_string()];

        match self.run_simple_command(args, None).await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// Cancel a running job
    pub async fn cancel_job(&self, job_id: &str) -> Result<()> {
        let mut active_jobs = self.active_jobs.lock().await;
        if let Some(mut child) = active_jobs.remove(job_id) {
            child.kill().await.ok();
        }

        // Update job status
        {
            let mut store = self.store.write().await;
            if let Some(job) = store.jobs.get_mut(job_id) {
                job.cancel();
            }
        }
        self.save_store().await?;

        // Emit event
        if let Some(handle) = &self.app_handle {
            let _ = handle.emit(
                EVENT_JOB_COMPLETED,
                JobCompletedEvent {
                    job_id: job_id.to_string(),
                    success: false,
                    skill_path: None,
                    error: Some("Job cancelled by user".to_string()),
                },
            );
        }

        Ok(())
    }

    /// Resume a paused job
    pub async fn resume_job(&self, job_id: &str) -> Result<()> {
        let job = self
            .get_job(job_id)
            .await
            .ok_or_else(|| anyhow!("Job not found"))?;

        if job.status != JobStatus::Paused {
            return Err(anyhow!("Job is not paused"));
        }

        let checkpoint_id = job
            .checkpoint_id
            .ok_or_else(|| anyhow!("No checkpoint available"))?;

        let args = vec!["resume".to_string(), checkpoint_id];

        self.run_simple_command(args, None).await?;

        // Update job status
        {
            let mut store = self.store.write().await;
            if let Some(job) = store.jobs.get_mut(job_id) {
                job.status = JobStatus::Running;
                job.started_at = Some(Utc::now());
            }
        }
        self.save_store().await
    }

    /// Clean up old jobs
    pub async fn cleanup_jobs(&self, max_age_days: u32) -> Result<u32> {
        let cutoff = Utc::now() - chrono::Duration::days(max_age_days as i64);
        let mut removed = 0;

        {
            let mut store = self.store.write().await;
            store.jobs.retain(|_, job| {
                let keep = job.created_at > cutoff
                    || job.status == JobStatus::Running
                    || job.status == JobStatus::Paused;
                if !keep {
                    removed += 1;
                }
                keep
            });
        }
        self.save_store().await?;

        Ok(removed)
    }

    // ========== Internal Command Execution ==========

    /// Run a skill-seekers command with full job tracking
    async fn run_skill_seekers_command(
        &self,
        job_id: &str,
        args: Vec<String>,
        _enhance: Option<EnhanceConfig>,
        package: Option<PackageConfig>,
        auto_install: bool,
    ) -> Result<()> {
        let python_path = self.get_python_path();
        let job_id_owned = job_id.to_string();
        let app_handle = self.app_handle.clone();
        let store = Arc::clone(&self.store);
        let active_jobs = Arc::clone(&self.active_jobs);
        let output_dir = self.output_dir.clone();
        let store_path = self.store_path.clone();

        // Update job to running
        {
            let mut store = store.write().await;
            if let Some(job) = store.jobs.get_mut(&job_id_owned) {
                job.start();
                job.output_dir = Some(output_dir.to_string_lossy().to_string());
            }
        }

        // Build the full command
        let mut cmd = Command::new(&python_path);
        cmd.args(["-m", "skill_seekers"]);
        cmd.args(&args);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        // Set GitHub token if available
        {
            let store_read = store.read().await;
            if let Some(token) = &store_read.config.github_token {
                cmd.env("GITHUB_TOKEN", token);
            }
        }

        // Spawn the process
        let child = cmd
            .spawn()
            .context("Failed to spawn skill-seekers process")?;

        // Store the child process
        {
            let mut jobs = active_jobs.lock().await;
            jobs.insert(job_id_owned.clone(), child);
        }

        // Get the child back for reading output
        let mut child = {
            let mut jobs = active_jobs.lock().await;
            jobs.remove(&job_id_owned).unwrap()
        };

        // Read stdout for progress
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        // Spawn task to read output
        let job_id_for_task = job_id_owned.clone();
        let app_handle_for_task = app_handle.clone();
        let store_for_task = Arc::clone(&store);

        tokio::spawn(async move {
            if let Some(stdout) = stdout {
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();

                while let Ok(Some(line)) = lines.next_line().await {
                    // Parse progress from line
                    if let Some(progress) = Self::parse_progress_line(&line) {
                        // Update store
                        {
                            let mut store = store_for_task.write().await;
                            if let Some(job) = store.jobs.get_mut(&job_id_for_task) {
                                job.update_progress(progress.clone());
                            }
                        }

                        // Emit progress event
                        if let Some(handle) = &app_handle_for_task {
                            let _ = handle.emit(
                                EVENT_PROGRESS,
                                ProgressEvent {
                                    job_id: job_id_for_task.clone(),
                                    progress,
                                },
                            );
                        }
                    }

                    // Emit log event
                    if let Some(handle) = &app_handle_for_task {
                        let _ = handle.emit(
                            EVENT_LOG,
                            LogEvent {
                                job_id: job_id_for_task.clone(),
                                level: "info".to_string(),
                                message: line,
                                timestamp: Utc::now(),
                            },
                        );
                    }
                }
            }
        });

        // Wait for completion
        let status = child.wait().await?;

        // Collect stderr
        let error_output = if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            let mut output = String::new();
            while let Ok(Some(line)) = lines.next_line().await {
                output.push_str(&line);
                output.push('\n');
            }
            output
        } else {
            String::new()
        };

        // Update job status
        {
            let mut store = store.write().await;
            if let Some(job) = store.jobs.get_mut(&job_id_owned) {
                if status.success() {
                    // Find the generated skill path
                    let skill_path = output_dir.join(&job.name).to_string_lossy().to_string();
                    job.complete(skill_path);
                } else {
                    job.fail(error_output.clone());
                }
            }

            // Save store
            let content = serde_json::to_string_pretty(&*store)?;
            fs::write(&store_path, content)?;
        }

        // Emit completion event
        if let Some(handle) = &app_handle {
            let job = {
                let store = store.read().await;
                store.jobs.get(&job_id_owned).cloned()
            };

            if let Some(job) = job {
                let _ = handle.emit(
                    EVENT_JOB_COMPLETED,
                    JobCompletedEvent {
                        job_id: job_id_owned.clone(),
                        success: job.status == JobStatus::Completed,
                        skill_path: job.skill_path.clone(),
                        error: job.error.clone(),
                    },
                );
            }
        }

        // Handle post-processing (enhance, package, install)
        if status.success() {
            let skill_dir = {
                let store = store.read().await;
                store
                    .jobs
                    .get(&job_id_owned)
                    .and_then(|j| j.skill_path.clone())
            };

            if let Some(skill_dir) = skill_dir {
                // Enhancement is handled inline by CLI if --enhance flag was passed
                // Package if requested and not already done
                if let Some(pkg_config) = package {
                    if let Err(e) = self
                        .package_skill(PackageSkillInput {
                            skill_dir: skill_dir.clone(),
                            config: pkg_config,
                        })
                        .await
                    {
                        log::warn!("Failed to package skill: {}", e);
                    }
                }

                // Auto-install to library if requested
                if auto_install {
                    // TODO: Call skill installation service
                    log::info!("Auto-install requested for {}", skill_dir);
                }
            }
        }

        Ok(())
    }

    /// Run a simple command and wait for completion
    async fn run_simple_command(
        &self,
        args: Vec<String>,
        env_vars: Option<HashMap<String, String>>,
    ) -> Result<()> {
        let python_path = self.get_python_path();

        let mut cmd = Command::new(&python_path);
        cmd.args(["-m", "skill_seekers"]);
        cmd.args(&args);

        if let Some(vars) = env_vars {
            for (key, value) in vars {
                cmd.env(key, value);
            }
        }

        let output = cmd.output().await.context("Failed to run command")?;

        if output.status.success() {
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(anyhow!("Command failed: {}", stderr))
        }
    }

    /// Run a simple command and return output
    async fn run_simple_command_output(
        &self,
        args: Vec<String>,
        env_vars: Option<HashMap<String, String>>,
    ) -> Result<String> {
        let python_path = self.get_python_path();

        let mut cmd = Command::new(&python_path);
        cmd.args(["-m", "skill_seekers"]);
        cmd.args(&args);

        if let Some(vars) = env_vars {
            for (key, value) in vars {
                cmd.env(key, value);
            }
        }

        let output = cmd.output().await.context("Failed to run command")?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(anyhow!("Command failed: {}", stderr))
        }
    }

    /// Parse progress information from CLI output line
    fn parse_progress_line(line: &str) -> Option<JobProgress> {
        // skill-seekers outputs progress in various formats
        // Try to parse common patterns

        // Pattern: "Scraping page 50/100..."
        if line.contains("Scraping page") {
            if let Some(caps) = line.split("Scraping page").nth(1).and_then(|s| {
                s.trim()
                    .split('/')
                    .collect::<Vec<_>>()
                    .first()
                    .map(|v| v.trim())
            }) {
                if let Ok(current) = caps.parse::<u32>() {
                    let total = line
                        .split('/')
                        .nth(1)
                        .and_then(|s| s.split(|c: char| !c.is_ascii_digit()).next())
                        .and_then(|s| s.parse::<u32>().ok());

                    let percent = total
                        .map(|t| ((current as f32 / t as f32) * 100.0) as u8)
                        .unwrap_or(50);

                    return Some(JobProgress {
                        phase: JobPhase::Scraping,
                        percent,
                        message: line.to_string(),
                        pages_scraped: current,
                        pages_total: total,
                        current_file: None,
                    });
                }
            }
        }

        // Pattern: "Building skill..."
        if line.contains("Building") {
            return Some(JobProgress {
                phase: JobPhase::Building,
                percent: 70,
                message: line.to_string(),
                pages_scraped: 0,
                pages_total: None,
                current_file: None,
            });
        }

        // Pattern: "Enhancing..."
        if line.contains("Enhancing") || line.contains("enhance") {
            return Some(JobProgress {
                phase: JobPhase::Enhancing,
                percent: 85,
                message: line.to_string(),
                pages_scraped: 0,
                pages_total: None,
                current_file: None,
            });
        }

        // Pattern: "Complete" or "Done"
        if line.contains("Complete") || line.contains("Done") || line.contains("Success") {
            return Some(JobProgress {
                phase: JobPhase::Done,
                percent: 100,
                message: line.to_string(),
                pages_scraped: 0,
                pages_total: None,
                current_file: None,
            });
        }

        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_service_creation() {
        let temp_dir = tempdir().unwrap();
        let service = SkillSeekersService::new(temp_dir.path().to_path_buf()).unwrap();

        assert!(!service.is_installed().await);
        assert!(service.list_jobs().await.is_empty());
    }

    #[test]
    fn test_parse_progress_scraping() {
        let line = "Scraping page 50/100...";
        let progress = SkillSeekersService::parse_progress_line(line);

        assert!(progress.is_some());
        let p = progress.unwrap();
        assert_eq!(p.phase, JobPhase::Scraping);
        assert_eq!(p.pages_scraped, 50);
        assert_eq!(p.pages_total, Some(100));
    }

    #[test]
    fn test_parse_progress_building() {
        let line = "Building skill structure...";
        let progress = SkillSeekersService::parse_progress_line(line);

        assert!(progress.is_some());
        assert_eq!(progress.unwrap().phase, JobPhase::Building);
    }

    #[test]
    fn test_parse_progress_done() {
        let line = "Complete! Skill created successfully.";
        let progress = SkillSeekersService::parse_progress_line(line);

        assert!(progress.is_some());
        let p = progress.unwrap();
        assert_eq!(p.phase, JobPhase::Done);
        assert_eq!(p.percent, 100);
    }

    #[tokio::test]
    async fn test_config_persistence() {
        let temp_dir = tempdir().unwrap();
        let service = SkillSeekersService::new(temp_dir.path().to_path_buf()).unwrap();

        let mut config = service.get_config().await;
        config.auto_enhance = true;
        config.github_token = Some("test-token".to_string());

        service.update_config(config.clone()).await.unwrap();

        // Create new service to test persistence
        let service2 = SkillSeekersService::new(temp_dir.path().to_path_buf()).unwrap();
        let loaded_config = service2.get_config().await;

        assert!(loaded_config.auto_enhance);
        assert_eq!(loaded_config.github_token, Some("test-token".to_string()));
    }

    #[tokio::test]
    async fn test_list_preset_configs() {
        let temp_dir = tempdir().unwrap();
        let service = SkillSeekersService::new(temp_dir.path().to_path_buf()).unwrap();

        let configs = service.list_preset_configs().await.unwrap();

        assert!(!configs.is_empty());
        assert!(configs.iter().any(|c| c.name == "react"));
        assert!(configs.iter().any(|c| c.name == "vue"));
        assert!(configs.iter().any(|c| c.name == "godot"));
    }
}
