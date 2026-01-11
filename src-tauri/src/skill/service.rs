//! Skills Service Implementation
//!
//! Provides skill management with SSOT (Single Source of Truth) architecture:
//! - Central skills directory at app data dir
//! - Repository-based skill discovery and download
//! - Installation and uninstallation management

use crate::skill::types::*;
use anyhow::{anyhow, Context, Result};
use reqwest::Client;
use std::collections::HashMap;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::timeout;
use zip::ZipArchive;

/// Skills service for managing skill lifecycle
pub struct SkillService {
    /// HTTP client for downloads
    http_client: Client,
    /// SSOT directory path
    ssot_dir: PathBuf,
    /// Skill store (persisted state)
    store: Arc<RwLock<SkillStore>>,
    /// Store file path
    store_path: PathBuf,
}

impl SkillService {
    /// Create a new SkillService
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        let ssot_dir = app_data_dir.join("skills");
        fs::create_dir_all(&ssot_dir)?;

        let store_path = app_data_dir.join("skill_store.json");
        let store = if store_path.exists() {
            let content = fs::read_to_string(&store_path)?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            SkillStore::default()
        };

        let http_client = Client::builder()
            .user_agent("cognia-skills")
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .context("Failed to create HTTP client")?;

        Ok(Self {
            http_client,
            ssot_dir,
            store: Arc::new(RwLock::new(store)),
            store_path,
        })
    }

    /// Get the SSOT directory path
    pub fn get_ssot_dir(&self) -> &Path {
        &self.ssot_dir
    }

    /// Save store to disk
    async fn save_store(&self) -> Result<()> {
        let store = self.store.read().await;
        let content = serde_json::to_string_pretty(&*store)?;
        fs::write(&self.store_path, content)?;
        Ok(())
    }

    // ========== Repository Management ==========

    /// List all configured repositories
    pub async fn list_repos(&self) -> Vec<SkillRepo> {
        let store = self.store.read().await;
        store.repos.clone()
    }

    /// Add a repository
    pub async fn add_repo(&self, repo: SkillRepo) -> Result<()> {
        let mut store = self.store.write().await;
        
        // Check if already exists
        if let Some(existing) = store.repos.iter_mut().find(|r| r.owner == repo.owner && r.name == repo.name) {
            *existing = repo;
        } else {
            store.repos.push(repo);
        }
        
        drop(store);
        self.save_store().await
    }

    /// Remove a repository
    pub async fn remove_repo(&self, owner: &str, name: &str) -> Result<()> {
        let mut store = self.store.write().await;
        store.repos.retain(|r| !(r.owner == owner && r.name == name));
        drop(store);
        self.save_store().await
    }

    /// Toggle repository enabled state
    pub async fn toggle_repo(&self, owner: &str, name: &str, enabled: bool) -> Result<()> {
        let mut store = self.store.write().await;
        if let Some(repo) = store.repos.iter_mut().find(|r| r.owner == owner && r.name == name) {
            repo.enabled = enabled;
        }
        drop(store);
        self.save_store().await
    }

    // ========== Skill Discovery ==========

    /// Discover skills from all enabled repositories
    pub async fn discover_skills(&self) -> Result<Vec<DiscoverableSkill>> {
        let repos = {
            let store = self.store.read().await;
            store.repos.iter().filter(|r| r.enabled).cloned().collect::<Vec<_>>()
        };

        let mut all_skills = Vec::new();

        for repo in repos {
            match self.fetch_repo_skills(&repo).await {
                Ok(skills) => all_skills.extend(skills),
                Err(e) => log::warn!("Failed to fetch skills from {}/{}: {}", repo.owner, repo.name, e),
            }
        }

        // Deduplicate by key
        let mut seen = HashMap::new();
        all_skills.retain(|skill| {
            let key = skill.key.to_lowercase();
            if let std::collections::hash_map::Entry::Vacant(e) = seen.entry(key) {
                e.insert(true);
                true
            } else {
                false
            }
        });

        // Sort by name
        all_skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(all_skills)
    }

    /// Fetch skills from a single repository
    async fn fetch_repo_skills(&self, repo: &SkillRepo) -> Result<Vec<DiscoverableSkill>> {
        let temp_dir = timeout(
            std::time::Duration::from_secs(60),
            self.download_repo(repo),
        )
        .await
        .map_err(|_| anyhow!("Download timeout after 60 seconds"))??;

        let mut skills = Vec::new();
        self.scan_dir_recursive(&temp_dir, &temp_dir, repo, &mut skills)?;

        // Cleanup temp dir
        let _ = fs::remove_dir_all(&temp_dir);

        Ok(skills)
    }

    /// Recursively scan directory for SKILL.md files
    fn scan_dir_recursive(
        &self,
        current_dir: &Path,
        base_dir: &Path,
        repo: &SkillRepo,
        skills: &mut Vec<DiscoverableSkill>,
    ) -> Result<()> {
        let skill_md = current_dir.join("SKILL.md");

        if skill_md.exists() {
            let directory = if current_dir == base_dir {
                repo.name.clone()
            } else {
                current_dir
                    .strip_prefix(base_dir)
                    .unwrap_or(current_dir)
                    .to_string_lossy()
                    .to_string()
            };

            if let Ok(skill) = self.build_skill_from_metadata(&skill_md, &directory, repo) {
                skills.push(skill);
            }

            // Don't recurse into subdirectories of a skill
            return Ok(());
        }

        // Recurse into subdirectories
        if let Ok(entries) = fs::read_dir(current_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    // Skip hidden directories
                    if let Some(name) = path.file_name() {
                        if !name.to_string_lossy().starts_with('.') {
                            self.scan_dir_recursive(&path, base_dir, repo, skills)?;
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Build DiscoverableSkill from SKILL.md metadata
    fn build_skill_from_metadata(
        &self,
        skill_md: &Path,
        directory: &str,
        repo: &SkillRepo,
    ) -> Result<DiscoverableSkill> {
        let meta = Self::parse_skill_metadata(skill_md)?;

        Ok(DiscoverableSkill {
            key: format!("{}/{}:{}", repo.owner, repo.name, directory),
            name: meta.name.unwrap_or_else(|| directory.to_string()),
            description: meta.description.unwrap_or_default(),
            directory: directory.to_string(),
            readme_url: Some(format!(
                "https://github.com/{}/{}/tree/{}/{}",
                repo.owner, repo.name, repo.branch, directory
            )),
            repo_owner: repo.owner.clone(),
            repo_name: repo.name.clone(),
            repo_branch: repo.branch.clone(),
        })
    }

    /// Parse SKILL.md YAML frontmatter
    fn parse_skill_metadata(path: &Path) -> Result<SkillMetadata> {
        let content = fs::read_to_string(path)?;
        let content = content.trim_start_matches('\u{feff}'); // Remove BOM

        // Extract YAML frontmatter between --- delimiters
        let parts: Vec<&str> = content.splitn(3, "---").collect();
        if parts.len() < 3 {
            return Ok(SkillMetadata::default());
        }

        let front_matter = parts[1].trim();
        let meta: SkillMetadata = serde_yaml::from_str(front_matter).unwrap_or_default();

        Ok(meta)
    }

    // ========== Skill Installation ==========

    /// Install a skill from repository
    pub async fn install_skill(&self, skill: &DiscoverableSkill) -> Result<InstalledSkill> {
        // Use directory last segment as install name
        let install_name = Path::new(&skill.directory)
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| skill.directory.clone());

        let dest = self.ssot_dir.join(&install_name);

        // Check if already installed
        {
            let store = self.store.read().await;
            if store.skills.contains_key(&install_name) {
                return Err(anyhow!("Skill already installed: {}", install_name));
            }
        }

        // Download if not exists in SSOT
        if !dest.exists() {
            let repo = SkillRepo {
                owner: skill.repo_owner.clone(),
                name: skill.repo_name.clone(),
                branch: skill.repo_branch.clone(),
                enabled: true,
            };

            let temp_dir = timeout(
                std::time::Duration::from_secs(60),
                self.download_repo(&repo),
            )
            .await
            .map_err(|_| anyhow!("Download timeout"))??;

            let source = temp_dir.join(&skill.directory);
            if !source.exists() {
                let _ = fs::remove_dir_all(&temp_dir);
                return Err(anyhow!("Skill directory not found in repository: {}", skill.directory));
            }

            Self::copy_dir_recursive(&source, &dest)?;
            let _ = fs::remove_dir_all(&temp_dir);
        }

        // Create installed skill record
        let installed_skill = InstalledSkill {
            id: skill.key.clone(),
            name: skill.name.clone(),
            description: if skill.description.is_empty() {
                None
            } else {
                Some(skill.description.clone())
            },
            directory: install_name.clone(),
            repo_owner: Some(skill.repo_owner.clone()),
            repo_name: Some(skill.repo_name.clone()),
            repo_branch: Some(skill.repo_branch.clone()),
            readme_url: skill.readme_url.clone(),
            installed_at: chrono::Utc::now().timestamp(),
            enabled: true,
            category: None,
            tags: vec![],
        };

        // Save to store
        {
            let mut store = self.store.write().await;
            store.skills.insert(install_name, installed_skill.clone());
        }
        self.save_store().await?;

        log::info!("Skill {} installed successfully", installed_skill.name);

        Ok(installed_skill)
    }

    /// Install skill from local path
    pub async fn install_local_skill(&self, source_path: &Path, name: Option<&str>) -> Result<InstalledSkill> {
        if !source_path.exists() {
            return Err(anyhow!("Source path does not exist: {}", source_path.display()));
        }

        let skill_md = source_path.join("SKILL.md");
        let meta = if skill_md.exists() {
            Self::parse_skill_metadata(&skill_md)?
        } else {
            SkillMetadata::default()
        };

        let install_name = name
            .map(|s| s.to_string())
            .or_else(|| meta.name.clone())
            .unwrap_or_else(|| {
                source_path
                    .file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|| "unnamed-skill".to_string())
            });

        let dest = self.ssot_dir.join(&install_name);

        // Check if already installed
        {
            let store = self.store.read().await;
            if store.skills.contains_key(&install_name) {
                return Err(anyhow!("Skill already installed: {}", install_name));
            }
        }

        // Copy to SSOT
        if source_path != dest {
            Self::copy_dir_recursive(source_path, &dest)?;
        }

        let installed_skill = InstalledSkill {
            id: format!("local:{}", install_name),
            name: meta.name.unwrap_or_else(|| install_name.clone()),
            description: meta.description,
            directory: install_name.clone(),
            repo_owner: None,
            repo_name: None,
            repo_branch: None,
            readme_url: None,
            installed_at: chrono::Utc::now().timestamp(),
            enabled: true,
            category: meta.category,
            tags: meta.tags.unwrap_or_default(),
        };

        // Save to store
        {
            let mut store = self.store.write().await;
            store.skills.insert(install_name, installed_skill.clone());
        }
        self.save_store().await?;

        log::info!("Local skill {} installed successfully", installed_skill.name);

        Ok(installed_skill)
    }

    /// Uninstall a skill
    pub async fn uninstall_skill(&self, id: &str) -> Result<()> {
        let directory = {
            let store = self.store.read().await;
            let skill = store.skills.values().find(|s| s.id == id);
            skill.map(|s| s.directory.clone())
        };

        let directory = directory.ok_or_else(|| anyhow!("Skill not found: {}", id))?;

        // Remove from SSOT
        let skill_path = self.ssot_dir.join(&directory);
        if skill_path.exists() {
            fs::remove_dir_all(&skill_path)?;
        }

        // Remove from store
        {
            let mut store = self.store.write().await;
            store.skills.remove(&directory);
        }
        self.save_store().await?;

        log::info!("Skill {} uninstalled successfully", id);

        Ok(())
    }

    // ========== Skill State Management ==========

    /// Get all installed skills
    pub async fn get_installed_skills(&self) -> Vec<InstalledSkill> {
        let store = self.store.read().await;
        store.skills.values().cloned().collect()
    }

    /// Get an installed skill by ID
    pub async fn get_installed_skill(&self, id: &str) -> Option<InstalledSkill> {
        let store = self.store.read().await;
        store.skills.values().find(|s| s.id == id).cloned()
    }

    /// Enable a skill
    pub async fn enable_skill(&self, id: &str) -> Result<()> {
        let mut store = self.store.write().await;
        if let Some(skill) = store.skills.values_mut().find(|s| s.id == id) {
            skill.enabled = true;
        } else {
            return Err(anyhow!("Skill not found: {}", id));
        }
        drop(store);
        self.save_store().await
    }

    /// Disable a skill
    pub async fn disable_skill(&self, id: &str) -> Result<()> {
        let mut store = self.store.write().await;
        if let Some(skill) = store.skills.values_mut().find(|s| s.id == id) {
            skill.enabled = false;
        } else {
            return Err(anyhow!("Skill not found: {}", id));
        }
        drop(store);
        self.save_store().await
    }

    /// Update skill metadata
    pub async fn update_skill(&self, id: &str, category: Option<String>, tags: Option<Vec<String>>) -> Result<()> {
        let mut store = self.store.write().await;
        if let Some(skill) = store.skills.values_mut().find(|s| s.id == id) {
            if let Some(cat) = category {
                skill.category = Some(cat);
            }
            if let Some(t) = tags {
                skill.tags = t;
            }
        } else {
            return Err(anyhow!("Skill not found: {}", id));
        }
        drop(store);
        self.save_store().await
    }

    // ========== Skill Validation with SkillError ==========

    /// Get an installed skill or return SkillError
    pub async fn get_skill_or_error(&self, id: &str) -> std::result::Result<InstalledSkill, SkillError> {
        let store = self.store.read().await;
        store
            .skills
            .values()
            .find(|s| s.id == id)
            .cloned()
            .ok_or_else(|| SkillError::NotFound(id.to_string()))
    }

    /// Validate skill can be installed (not already installed)
    pub async fn validate_install(&self, skill: &DiscoverableSkill) -> std::result::Result<(), SkillError> {
        let install_name = Path::new(&skill.directory)
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| skill.directory.clone());

        let store = self.store.read().await;
        if store.skills.contains_key(&install_name) {
            return Err(SkillError::AlreadyInstalled(install_name));
        }
        Ok(())
    }

    /// Check download with timeout, returns SkillError::DownloadTimeout on timeout
    #[allow(dead_code)]
    pub async fn check_download_timeout<T, F>(&self, duration_secs: u64, future: F) -> std::result::Result<T, SkillError>
    where
        F: std::future::Future<Output = std::result::Result<T, SkillError>>,
    {
        timeout(std::time::Duration::from_secs(duration_secs), future)
            .await
            .map_err(|_| SkillError::DownloadTimeout(duration_secs))?
    }

    // ========== Skill Content ==========

    /// Read skill content (SKILL.md)
    pub fn read_skill_content(&self, directory: &str) -> Result<String> {
        let skill_md = self.ssot_dir.join(directory).join("SKILL.md");
        if !skill_md.exists() {
            return Err(anyhow!("SKILL.md not found for: {}", directory));
        }
        Ok(fs::read_to_string(skill_md)?)
    }

    /// List skill resources
    pub fn list_skill_resources(&self, directory: &str) -> Result<Vec<String>> {
        let skill_dir = self.ssot_dir.join(directory);
        if !skill_dir.exists() {
            return Err(anyhow!("Skill directory not found: {}", directory));
        }

        let mut resources = Vec::new();
        Self::collect_files(&skill_dir, &skill_dir, &mut resources)?;
        Ok(resources)
    }

    fn collect_files(dir: &Path, base: &Path, files: &mut Vec<String>) -> Result<()> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() {
                if let Ok(rel) = path.strip_prefix(base) {
                    files.push(rel.to_string_lossy().to_string());
                }
            } else if path.is_dir() {
                Self::collect_files(&path, base, files)?;
            }
        }
        Ok(())
    }

    /// Read a skill resource file
    pub fn read_skill_resource(&self, directory: &str, resource_path: &str) -> Result<String> {
        let file_path = self.ssot_dir.join(directory).join(resource_path);
        if !file_path.exists() {
            return Err(anyhow!("Resource not found: {}/{}", directory, resource_path));
        }
        Ok(fs::read_to_string(file_path)?)
    }

    // ========== Local Skills Discovery ==========

    /// Scan SSOT directory for unregistered skills
    pub async fn scan_local_skills(&self) -> Result<Vec<LocalSkill>> {
        let store = self.store.read().await;
        let registered: std::collections::HashSet<_> = store.skills.keys().collect();

        let mut local_skills = Vec::new();

        for entry in fs::read_dir(&self.ssot_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if !path.is_dir() {
                continue;
            }

            let dir_name = entry.file_name().to_string_lossy().to_string();
            
            // Skip hidden directories
            if dir_name.starts_with('.') {
                continue;
            }

            // Skip already registered skills
            if registered.contains(&dir_name) {
                continue;
            }

            let skill_md = path.join("SKILL.md");
            let has_skill_md = skill_md.exists();

            let (name, description) = if has_skill_md {
                match Self::parse_skill_metadata(&skill_md) {
                    Ok(meta) => (
                        meta.name.unwrap_or_else(|| dir_name.clone()),
                        meta.description,
                    ),
                    Err(_) => (dir_name.clone(), None),
                }
            } else {
                (dir_name.clone(), None)
            };

            local_skills.push(LocalSkill {
                directory: dir_name,
                name,
                description,
                path: path.to_string_lossy().to_string(),
                has_skill_md,
            });
        }

        Ok(local_skills)
    }

    /// Register a local skill
    pub async fn register_local_skill(&self, directory: &str) -> Result<InstalledSkill> {
        let skill_path = self.ssot_dir.join(directory);
        if !skill_path.exists() {
            return Err(anyhow!("Skill directory not found: {}", directory));
        }

        let skill_md = skill_path.join("SKILL.md");
        let meta = if skill_md.exists() {
            Self::parse_skill_metadata(&skill_md)?
        } else {
            SkillMetadata::default()
        };

        let installed_skill = InstalledSkill {
            id: format!("local:{}", directory),
            name: meta.name.unwrap_or_else(|| directory.to_string()),
            description: meta.description,
            directory: directory.to_string(),
            repo_owner: None,
            repo_name: None,
            repo_branch: None,
            readme_url: None,
            installed_at: chrono::Utc::now().timestamp(),
            enabled: true,
            category: meta.category,
            tags: meta.tags.unwrap_or_default(),
        };

        // Save to store
        {
            let mut store = self.store.write().await;
            store.skills.insert(directory.to_string(), installed_skill.clone());
        }
        self.save_store().await?;

        Ok(installed_skill)
    }

    // ========== Combined API ==========

    /// Get all skills (merged view of discoverable, installed, and local)
    pub async fn get_all_skills(&self) -> Result<Vec<Skill>> {
        let installed = self.get_installed_skills().await;
        let installed_dirs: std::collections::HashSet<_> = installed.iter().map(|s| s.directory.clone()).collect();

        let mut skills: Vec<Skill> = installed.into_iter().map(|s| Skill {
            key: s.id.clone(),
            name: s.name,
            description: s.description.unwrap_or_default(),
            directory: s.directory,
            readme_url: s.readme_url,
            installed: true,
            enabled: Some(s.enabled),
            repo_owner: s.repo_owner,
            repo_name: s.repo_name,
            repo_branch: s.repo_branch,
            category: s.category,
            tags: Some(s.tags),
        }).collect();

        // Try to get discoverable skills (don't fail if network error)
        if let Ok(discoverable) = self.discover_skills().await {
            for skill in discoverable {
                let install_name = Path::new(&skill.directory)
                    .file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|| skill.directory.clone());

                if !installed_dirs.contains(&install_name) {
                    skills.push(Skill {
                        key: skill.key,
                        name: skill.name,
                        description: skill.description,
                        directory: skill.directory,
                        readme_url: skill.readme_url,
                        installed: false,
                        enabled: None,
                        repo_owner: Some(skill.repo_owner),
                        repo_name: Some(skill.repo_name),
                        repo_branch: Some(skill.repo_branch),
                        category: None,
                        tags: None,
                    });
                }
            }
        }

        skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(skills)
    }

    // ========== Download Helpers ==========

    /// Download repository to temp directory
    async fn download_repo(&self, repo: &SkillRepo) -> Result<PathBuf> {
        let temp_dir = tempfile::tempdir()?;
        let temp_path = temp_dir.path().to_path_buf();
        // Persist the temp directory by forgetting about it (keeps it around)
        std::mem::forget(temp_dir);

        let branches = if repo.branch.is_empty() {
            vec!["main", "master"]
        } else {
            vec![repo.branch.as_str(), "main", "master"]
        };

        let mut last_error = None;
        for branch in branches {
            let url = format!(
                "https://github.com/{}/{}/archive/refs/heads/{}.zip",
                repo.owner, repo.name, branch
            );

            match self.download_and_extract(&url, &temp_path).await {
                Ok(_) => return Ok(temp_path),
                Err(e) => {
                    last_error = Some(e);
                    continue;
                }
            }
        }

        Err(last_error.unwrap_or_else(|| anyhow!("All branches failed to download")))
    }

    /// Download and extract ZIP archive
    async fn download_and_extract(&self, url: &str, dest: &Path) -> Result<()> {
        let response = self.http_client.get(url).send().await?;
        
        if !response.status().is_success() {
            return Err(anyhow!("Download failed with status: {}", response.status()));
        }

        let bytes = response.bytes().await?;
        let cursor = Cursor::new(bytes);
        let mut archive = ZipArchive::new(cursor).map_err(|e| anyhow!("Invalid ZIP archive: {}", e))?;

        // Get root directory name
        let root_name = if !archive.is_empty() {
            let first_file = archive.by_index(0).map_err(|e| anyhow!("Archive error: {}", e))?;
            first_file.name().split('/').next().unwrap_or("").to_string()
        } else {
            return Err(anyhow!("Empty archive"));
        };

        // Extract files
        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| anyhow!("Archive error: {}", e))?;
            let file_path = file.name();

            let relative_path = if let Some(stripped) = file_path.strip_prefix(&format!("{}/", root_name)) {
                stripped
            } else {
                continue;
            };

            if relative_path.is_empty() {
                continue;
            }

            let outpath = dest.join(relative_path);

            if file.is_dir() {
                fs::create_dir_all(&outpath)?;
            } else {
                if let Some(parent) = outpath.parent() {
                    fs::create_dir_all(parent)?;
                }
                let mut outfile = fs::File::create(&outpath)?;
                std::io::copy(&mut file, &mut outfile)?;
            }
        }

        Ok(())
    }

    /// Recursively copy directory
    fn copy_dir_recursive(src: &Path, dest: &Path) -> Result<()> {
        fs::create_dir_all(dest)?;

        for entry in fs::read_dir(src)? {
            let entry = entry?;
            let path = entry.path();
            let dest_path = dest.join(entry.file_name());

            if path.is_dir() {
                Self::copy_dir_recursive(&path, &dest_path)?;
            } else {
                fs::copy(&path, &dest_path)?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_service() -> (SkillService, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let service = SkillService::new(temp_dir.path().to_path_buf()).unwrap();
        (service, temp_dir)
    }

    fn create_skill_md(dir: &Path, name: &str, description: &str) {
        fs::create_dir_all(dir).unwrap();
        let content = format!(
            "---\nname: {}\ndescription: {}\n---\n\nSkill content here.",
            name, description
        );
        fs::write(dir.join("SKILL.md"), content).unwrap();
    }

    #[test]
    fn test_service_creation() {
        let (service, _temp) = create_test_service();
        assert!(service.get_ssot_dir().exists());
    }

    #[test]
    fn test_ssot_dir_creation() {
        let temp_dir = TempDir::new().unwrap();
        let service = SkillService::new(temp_dir.path().to_path_buf()).unwrap();
        let ssot_dir = service.get_ssot_dir();
        assert!(ssot_dir.exists());
        assert!(ssot_dir.is_dir());
    }

    #[tokio::test]
    async fn test_list_repos_default() {
        let (service, _temp) = create_test_service();
        let repos = service.list_repos().await;
        assert_eq!(repos.len(), 2);
        assert_eq!(repos[0].owner, "anthropics");
        assert_eq!(repos[1].owner, "ComposioHQ");
    }

    #[tokio::test]
    async fn test_add_repo() {
        let (service, _temp) = create_test_service();
        
        let repo = SkillRepo {
            owner: "test-owner".to_string(),
            name: "test-repo".to_string(),
            branch: "main".to_string(),
            enabled: true,
        };
        
        service.add_repo(repo).await.unwrap();
        
        let repos = service.list_repos().await;
        assert_eq!(repos.len(), 3);
        assert!(repos.iter().any(|r| r.owner == "test-owner"));
    }

    #[tokio::test]
    async fn test_add_repo_update_existing() {
        let (service, _temp) = create_test_service();
        
        let repo1 = SkillRepo {
            owner: "test".to_string(),
            name: "repo".to_string(),
            branch: "main".to_string(),
            enabled: true,
        };
        service.add_repo(repo1).await.unwrap();
        
        let repo2 = SkillRepo {
            owner: "test".to_string(),
            name: "repo".to_string(),
            branch: "develop".to_string(),
            enabled: false,
        };
        service.add_repo(repo2).await.unwrap();
        
        let repos = service.list_repos().await;
        let test_repo = repos.iter().find(|r| r.owner == "test").unwrap();
        assert_eq!(test_repo.branch, "develop");
        assert!(!test_repo.enabled);
    }

    #[tokio::test]
    async fn test_remove_repo() {
        let (service, _temp) = create_test_service();
        
        service.remove_repo("anthropics", "skills").await.unwrap();
        
        let repos = service.list_repos().await;
        assert_eq!(repos.len(), 1);
        assert!(!repos.iter().any(|r| r.owner == "anthropics"));
    }

    #[tokio::test]
    async fn test_toggle_repo() {
        let (service, _temp) = create_test_service();
        
        service.toggle_repo("anthropics", "skills", false).await.unwrap();
        
        let repos = service.list_repos().await;
        let repo = repos.iter().find(|r| r.owner == "anthropics").unwrap();
        assert!(!repo.enabled);
    }

    #[tokio::test]
    async fn test_get_installed_skills_empty() {
        let (service, _temp) = create_test_service();
        let installed = service.get_installed_skills().await;
        assert!(installed.is_empty());
    }

    #[tokio::test]
    async fn test_install_local_skill() {
        let (service, temp) = create_test_service();
        
        // Create a local skill directory
        let skill_dir = temp.path().join("local-skill");
        create_skill_md(&skill_dir, "local-test", "A local test skill");
        
        let installed = service.install_local_skill(&skill_dir, None).await.unwrap();
        
        assert_eq!(installed.name, "local-test");
        assert!(installed.id.starts_with("local:"));
        assert!(installed.enabled);
    }

    #[tokio::test]
    async fn test_install_local_skill_with_custom_name() {
        let (service, temp) = create_test_service();
        
        let skill_dir = temp.path().join("my-skill");
        create_skill_md(&skill_dir, "original-name", "A skill");
        
        let installed = service.install_local_skill(&skill_dir, Some("custom-name")).await.unwrap();
        
        assert_eq!(installed.directory, "custom-name");
    }

    #[tokio::test]
    async fn test_install_local_skill_already_installed() {
        let (service, temp) = create_test_service();
        
        let skill_dir = temp.path().join("test-skill");
        create_skill_md(&skill_dir, "test", "Test skill");
        
        service.install_local_skill(&skill_dir, None).await.unwrap();
        
        // Try to install again
        let result = service.install_local_skill(&skill_dir, None).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("already installed"));
    }

    #[tokio::test]
    async fn test_uninstall_skill() {
        let (service, temp) = create_test_service();
        
        let skill_dir = temp.path().join("to-uninstall");
        create_skill_md(&skill_dir, "uninstall-test", "Will be uninstalled");
        
        let installed = service.install_local_skill(&skill_dir, None).await.unwrap();
        
        // Verify installed
        assert!(service.get_installed_skill(&installed.id).await.is_some());
        
        // Uninstall
        service.uninstall_skill(&installed.id).await.unwrap();
        
        // Verify removed
        assert!(service.get_installed_skill(&installed.id).await.is_none());
    }

    #[tokio::test]
    async fn test_uninstall_nonexistent_skill() {
        let (service, _temp) = create_test_service();
        
        let result = service.uninstall_skill("nonexistent").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_enable_disable_skill() {
        let (service, temp) = create_test_service();
        
        let skill_dir = temp.path().join("toggle-skill");
        create_skill_md(&skill_dir, "toggle-test", "Toggle test");
        
        let installed = service.install_local_skill(&skill_dir, None).await.unwrap();
        assert!(installed.enabled);
        
        // Disable
        service.disable_skill(&installed.id).await.unwrap();
        let skill = service.get_installed_skill(&installed.id).await.unwrap();
        assert!(!skill.enabled);
        
        // Enable
        service.enable_skill(&installed.id).await.unwrap();
        let skill = service.get_installed_skill(&installed.id).await.unwrap();
        assert!(skill.enabled);
    }

    #[tokio::test]
    async fn test_update_skill_metadata() {
        let (service, temp) = create_test_service();
        
        let skill_dir = temp.path().join("update-skill");
        create_skill_md(&skill_dir, "update-test", "Update test");
        
        let installed = service.install_local_skill(&skill_dir, None).await.unwrap();
        
        service.update_skill(
            &installed.id,
            Some("development".to_string()),
            Some(vec!["tag1".to_string(), "tag2".to_string()]),
        ).await.unwrap();
        
        let skill = service.get_installed_skill(&installed.id).await.unwrap();
        assert_eq!(skill.category, Some("development".to_string()));
        assert_eq!(skill.tags, vec!["tag1", "tag2"]);
    }

    #[tokio::test]
    async fn test_read_skill_content() {
        let (service, temp) = create_test_service();
        
        let skill_dir = temp.path().join("content-skill");
        create_skill_md(&skill_dir, "content-test", "Content test");
        
        let installed = service.install_local_skill(&skill_dir, None).await.unwrap();
        
        let content = service.read_skill_content(&installed.directory).unwrap();
        assert!(content.contains("name: content-test"));
        assert!(content.contains("Skill content here"));
    }

    #[tokio::test]
    async fn test_list_skill_resources() {
        let (service, temp) = create_test_service();
        
        let skill_dir = temp.path().join("resource-skill");
        create_skill_md(&skill_dir, "resource-test", "Resource test");
        
        // Add extra resource files
        fs::write(skill_dir.join("helper.js"), "// helper").unwrap();
        fs::create_dir_all(skill_dir.join("scripts")).unwrap();
        fs::write(skill_dir.join("scripts/build.sh"), "#!/bin/bash").unwrap();
        
        let installed = service.install_local_skill(&skill_dir, None).await.unwrap();
        
        let resources = service.list_skill_resources(&installed.directory).unwrap();
        assert!(resources.contains(&"SKILL.md".to_string()));
        assert!(resources.contains(&"helper.js".to_string()));
    }

    #[tokio::test]
    async fn test_read_skill_resource() {
        let (service, temp) = create_test_service();
        
        let skill_dir = temp.path().join("read-resource-skill");
        create_skill_md(&skill_dir, "read-resource-test", "Test");
        fs::write(skill_dir.join("config.json"), r#"{"key": "value"}"#).unwrap();
        
        let installed = service.install_local_skill(&skill_dir, None).await.unwrap();
        
        let content = service.read_skill_resource(&installed.directory, "config.json").unwrap();
        assert!(content.contains("\"key\": \"value\""));
    }

    #[tokio::test]
    async fn test_scan_local_skills() {
        let (service, _temp) = create_test_service();
        
        // Create an unregistered skill directly in SSOT
        let ssot = service.get_ssot_dir().to_path_buf();
        let unregistered = ssot.join("unregistered-skill");
        create_skill_md(&unregistered, "unregistered", "Not registered");
        
        let local = service.scan_local_skills().await.unwrap();
        assert_eq!(local.len(), 1);
        assert_eq!(local[0].directory, "unregistered-skill");
        assert!(local[0].has_skill_md);
    }

    #[tokio::test]
    async fn test_register_local_skill() {
        let (service, _temp) = create_test_service();
        
        // Create skill directly in SSOT
        let ssot = service.get_ssot_dir().to_path_buf();
        let skill_dir = ssot.join("register-me");
        create_skill_md(&skill_dir, "register-test", "To be registered");
        
        let installed = service.register_local_skill("register-me").await.unwrap();
        
        assert_eq!(installed.name, "register-test");
        assert!(installed.id.starts_with("local:"));
        
        // Should no longer appear in local scan
        let local = service.scan_local_skills().await.unwrap();
        assert!(local.iter().all(|s| s.directory != "register-me"));
    }

    #[test]
    fn test_parse_skill_metadata() {
        let temp = TempDir::new().unwrap();
        let skill_md = temp.path().join("SKILL.md");
        
        let content = r#"---
name: test-skill
description: A test skill description
category: development
tags:
  - test
  - example
---

# Test Skill

This is the skill content.
"#;
        fs::write(&skill_md, content).unwrap();
        
        let meta = SkillService::parse_skill_metadata(&skill_md).unwrap();
        assert_eq!(meta.name, Some("test-skill".to_string()));
        assert_eq!(meta.description, Some("A test skill description".to_string()));
    }

    #[test]
    fn test_parse_skill_metadata_minimal() {
        let temp = TempDir::new().unwrap();
        let skill_md = temp.path().join("SKILL.md");
        
        let content = r#"---
name: minimal
---

Content only.
"#;
        fs::write(&skill_md, content).unwrap();
        
        let meta = SkillService::parse_skill_metadata(&skill_md).unwrap();
        assert_eq!(meta.name, Some("minimal".to_string()));
        assert!(meta.description.is_none());
    }

    #[test]
    fn test_parse_skill_metadata_no_frontmatter() {
        let temp = TempDir::new().unwrap();
        let skill_md = temp.path().join("SKILL.md");
        
        fs::write(&skill_md, "Just content, no frontmatter.").unwrap();
        
        let meta = SkillService::parse_skill_metadata(&skill_md).unwrap();
        assert!(meta.name.is_none());
    }

    #[test]
    fn test_copy_dir_recursive() {
        let temp = TempDir::new().unwrap();
        let src = temp.path().join("src");
        let dest = temp.path().join("dest");
        
        // Create source structure
        fs::create_dir_all(src.join("sub")).unwrap();
        fs::write(src.join("file.txt"), "content").unwrap();
        fs::write(src.join("sub/nested.txt"), "nested content").unwrap();
        
        SkillService::copy_dir_recursive(&src, &dest).unwrap();
        
        assert!(dest.join("file.txt").exists());
        assert!(dest.join("sub/nested.txt").exists());
        assert_eq!(fs::read_to_string(dest.join("file.txt")).unwrap(), "content");
    }

    #[tokio::test]
    async fn test_get_all_skills() {
        let (service, temp) = create_test_service();
        
        // Install some local skills
        let skill1 = temp.path().join("skill1");
        create_skill_md(&skill1, "skill-one", "First skill");
        service.install_local_skill(&skill1, None).await.unwrap();
        
        let skill2 = temp.path().join("skill2");
        create_skill_md(&skill2, "skill-two", "Second skill");
        service.install_local_skill(&skill2, None).await.unwrap();
        
        let all = service.get_all_skills().await.unwrap();
        
        // Should have at least our 2 installed skills
        assert!(all.len() >= 2);
        assert!(all.iter().any(|s| s.name == "skill-one"));
        assert!(all.iter().any(|s| s.name == "skill-two"));
        
        // Installed skills should be marked as installed
        let skill_one = all.iter().find(|s| s.name == "skill-one").unwrap();
        assert!(skill_one.installed);
    }

    #[tokio::test]
    async fn test_store_persistence() {
        let temp = TempDir::new().unwrap();
        let data_dir = temp.path().to_path_buf();
        
        // Create service and add data
        {
            let service = SkillService::new(data_dir.clone()).unwrap();
            let skill_dir = temp.path().join("persist-skill");
            create_skill_md(&skill_dir, "persist-test", "Persist test");
            service.install_local_skill(&skill_dir, None).await.unwrap();
        }
        
        // Create new service instance and verify data persisted
        {
            let service = SkillService::new(data_dir).unwrap();
            let installed = service.get_installed_skills().await;
            assert_eq!(installed.len(), 1);
            assert_eq!(installed[0].name, "persist-test");
        }
    }
}
