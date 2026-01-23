/**
 * Skill Seekers Native API
 *
 * TypeScript bindings for the Skill Seekers CLI integration.
 * Provides functions to generate AI skills from documentation,
 * GitHub repositories, and PDF documents.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// ========== Type Definitions ==========

/** Source type for skill generation */
export type SourceType = 'website' | 'github' | 'pdf' | 'unified';

/** Code analysis depth for GitHub scraping */
export type CodeAnalysisDepth = 'surface' | 'medium' | 'deep';

/** AI provider for enhancement */
export type EnhanceProvider = 'anthropic' | 'google' | 'openai';

/** Enhancement mode */
export type EnhanceMode = 'local' | 'api';

/** Enhancement quality level */
export type EnhanceQuality = 'minimal' | 'standard' | 'comprehensive';

/** Target platform for packaging */
export type PackageTarget = 'claude' | 'gemini' | 'openai' | 'markdown';

/** Job status */
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

/** Job phase */
export type JobPhase = 'init' | 'scraping' | 'building' | 'enhancing' | 'packaging' | 'installing' | 'done';

/** URL patterns for scraping */
export interface UrlPatterns {
  include: string[];
  exclude: string[];
}

/** CSS selectors for content extraction */
export interface ContentSelectors {
  main_content: string;
  title: string;
  code_blocks: string;
  navigation?: string;
  sidebar?: string;
}

/** Category keywords for auto-categorization */
export interface CategoryKeywords {
  getting_started: string[];
  api: string[];
  guides: string[];
  examples: string[];
  configuration: string[];
}

/** Website scrape configuration */
export interface WebsiteScrapeConfig {
  name: string;
  base_url: string;
  description?: string;
  start_urls?: string[];
  selectors?: ContentSelectors;
  url_patterns?: UrlPatterns;
  categories?: CategoryKeywords;
  rate_limit?: number;
  max_pages?: number;
  async_mode?: boolean;
  workers?: number;
}

/** GitHub repository scrape configuration */
export interface GitHubScrapeConfig {
  repo: string;
  name?: string;
  include_issues?: boolean;
  max_issues?: number;
  include_changelog?: boolean;
  include_releases?: boolean;
  code_analysis_depth?: CodeAnalysisDepth;
  exclude_dirs?: string[];
}

/** PDF extraction configuration */
export interface PdfScrapeConfig {
  pdf_path: string;
  name: string;
  enable_ocr?: boolean;
  extract_tables?: boolean;
  extract_images?: boolean;
}

/** Enhancement configuration */
export interface EnhanceConfig {
  mode?: EnhanceMode;
  provider?: EnhanceProvider;
  api_key?: string;
  quality?: EnhanceQuality;
}

/** Package configuration */
export interface PackageConfig {
  target?: PackageTarget;
  output_filename?: string;
}

/** Job progress information */
export interface JobProgress {
  phase: JobPhase;
  percent: number;
  message: string;
  pages_scraped: number;
  pages_total?: number;
  current_file?: string;
}

/** Skill generation job */
export interface SkillGenerationJob {
  id: string;
  source_type: SourceType;
  name: string;
  status: JobStatus;
  progress: JobProgress;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  outputDir?: string;
  skillPath?: string;
  checkpointId?: string;
  resumable: boolean;
}

/** Preset configuration metadata */
export interface PresetConfig {
  name: string;
  displayName: string;
  description: string;
  category: string;
  configPath: string;
  icon?: string;
  estimatedPages?: number;
}

/** Generated skill metadata */
export interface GeneratedSkill {
  id: string;
  name: string;
  description: string;
  sourceType: SourceType;
  source: string;
  outputDir: string;
  skillMdPath: string;
  packagePath?: string;
  createdAt: string;
  enhancedAt?: string;
  installed: boolean;
  installedSkillId?: string;
  fileSize: number;
  pageCount?: number;
}

/** Service configuration */
export interface SkillSeekersServiceConfig {
  outputDir: string;
  venvPath: string;
  defaultProvider: EnhanceProvider;
  githubToken?: string;
  autoEnhance: boolean;
  autoInstall: boolean;
  checkpointInterval: number;
}

/** Page estimation result */
export interface PageEstimation {
  estimatedPages: number;
  estimatedMinutes: number;
  hasLlmsTxt: boolean;
}

/** Progress event payload */
export interface ProgressEvent {
  jobId: string;
  progress: JobProgress;
}

/** Job completed event payload */
export interface JobCompletedEvent {
  jobId: string;
  success: boolean;
  skillPath?: string;
  error?: string;
}

/** Log event payload */
export interface LogEvent {
  jobId: string;
  level: string;
  message: string;
  timestamp: string;
}

// ========== Input Types ==========

/** Input for website scraping */
export interface ScrapeWebsiteInput {
  config: WebsiteScrapeConfig;
  presetConfig?: string;
  enhance?: EnhanceConfig;
  package?: PackageConfig;
  autoInstall?: boolean;
}

/** Input for GitHub scraping */
export interface ScrapeGitHubInput {
  config: GitHubScrapeConfig;
  enhance?: EnhanceConfig;
  package?: PackageConfig;
  autoInstall?: boolean;
}

/** Input for PDF extraction */
export interface ScrapePdfInput {
  config: PdfScrapeConfig;
  enhance?: EnhanceConfig;
  package?: PackageConfig;
  autoInstall?: boolean;
}

/** Input for enhancing an existing skill */
export interface EnhanceSkillInput {
  skillDir: string;
  config: EnhanceConfig;
}

/** Input for packaging a skill */
export interface PackageSkillInput {
  skillDir: string;
  config: PackageConfig;
}

// ========== Utility Functions ==========

/** Check if running in Tauri environment */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

// ========== Installation API ==========

/** Check if skill-seekers is installed */
export async function isInstalled(): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>('skill_seekers_is_installed');
}

/** Get installed version */
export async function getVersion(): Promise<string | null> {
  if (!isTauri()) return null;
  return invoke<string | null>('skill_seekers_get_version');
}

/** Install skill-seekers in virtual environment */
export async function install(extras?: string[]): Promise<string> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<string>('skill_seekers_install', { extras });
}

// ========== Configuration API ==========

/** Get service configuration */
export async function getConfig(): Promise<SkillSeekersServiceConfig> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<SkillSeekersServiceConfig>('skill_seekers_get_config');
}

/** Update service configuration */
export async function updateConfig(config: SkillSeekersServiceConfig): Promise<void> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<void>('skill_seekers_update_config', { config });
}

/** List available preset configurations */
export async function listPresets(): Promise<PresetConfig[]> {
  if (!isTauri()) return [];
  return invoke<PresetConfig[]>('skill_seekers_list_presets');
}

// ========== Scraping API ==========

/** Scrape a documentation website */
export async function scrapeWebsite(input: ScrapeWebsiteInput): Promise<string> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<string>('skill_seekers_scrape_website', { input });
}

/** Scrape a GitHub repository */
export async function scrapeGitHub(input: ScrapeGitHubInput): Promise<string> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<string>('skill_seekers_scrape_github', { input });
}

/** Extract from a PDF document */
export async function scrapePdf(input: ScrapePdfInput): Promise<string> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<string>('skill_seekers_scrape_pdf', { input });
}

// ========== Enhancement & Packaging API ==========

/** Enhance an existing skill with AI */
export async function enhanceSkill(input: EnhanceSkillInput): Promise<void> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<void>('skill_seekers_enhance', { input });
}

/** Package a skill for a target platform */
export async function packageSkill(input: PackageSkillInput): Promise<string> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<string>('skill_seekers_package', { input });
}

// ========== Utility API ==========

/** Estimate page count for a URL */
export async function estimatePages(url: string, configName?: string): Promise<PageEstimation> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<PageEstimation>('skill_seekers_estimate_pages', { url, configName });
}

/** Validate a configuration file */
export async function validateConfig(configPath: string): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>('skill_seekers_validate_config', { configPath });
}

// ========== Job Management API ==========

/** List all jobs */
export async function listJobs(): Promise<SkillGenerationJob[]> {
  if (!isTauri()) return [];
  return invoke<SkillGenerationJob[]>('skill_seekers_list_jobs');
}

/** Get job by ID */
export async function getJob(jobId: string): Promise<SkillGenerationJob | null> {
  if (!isTauri()) return null;
  return invoke<SkillGenerationJob | null>('skill_seekers_get_job', { jobId });
}

/** Cancel a running job */
export async function cancelJob(jobId: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<void>('skill_seekers_cancel_job', { jobId });
}

/** Resume a paused job */
export async function resumeJob(jobId: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<void>('skill_seekers_resume_job', { jobId });
}

/** Clean up old jobs */
export async function cleanupJobs(maxAgeDays?: number): Promise<number> {
  if (!isTauri()) return 0;
  return invoke<number>('skill_seekers_cleanup_jobs', { maxAgeDays });
}

// ========== Generated Skills API ==========

/** List all generated skills */
export async function listGenerated(): Promise<GeneratedSkill[]> {
  if (!isTauri()) return [];
  return invoke<GeneratedSkill[]>('skill_seekers_list_generated');
}

/** Get generated skill by ID */
export async function getGenerated(skillId: string): Promise<GeneratedSkill | null> {
  if (!isTauri()) return null;
  return invoke<GeneratedSkill | null>('skill_seekers_get_generated', { skillId });
}

/** Get output directory path */
export async function getOutputDir(): Promise<string> {
  if (!isTauri()) return '';
  return invoke<string>('skill_seekers_get_output_dir');
}

/** Get venv path */
export async function getVenvPath(): Promise<string> {
  if (!isTauri()) return '';
  return invoke<string>('skill_seekers_get_venv_path');
}

// ========== Quick Generate API ==========

/** Quick generate skill from URL */
export async function quickGenerateWebsite(
  url: string,
  name: string,
  autoEnhance = false,
  autoInstall = false
): Promise<string> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<string>('skill_seekers_quick_generate_website', {
    url,
    name,
    autoEnhance,
    autoInstall,
  });
}

/** Quick generate skill from GitHub repo */
export async function quickGenerateGitHub(
  repo: string,
  autoEnhance = false,
  autoInstall = false
): Promise<string> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<string>('skill_seekers_quick_generate_github', {
    repo,
    autoEnhance,
    autoInstall,
  });
}

/** Quick generate skill from preset config */
export async function quickGeneratePreset(
  presetName: string,
  autoEnhance = false,
  autoInstall = false
): Promise<string> {
  if (!isTauri()) {
    throw new Error('Skill Seekers requires Tauri environment');
  }
  return invoke<string>('skill_seekers_quick_generate_preset', {
    presetName,
    autoEnhance,
    autoInstall,
  });
}

// ========== Event Listeners ==========

/** Subscribe to progress events */
export async function onProgress(
  callback: (event: ProgressEvent) => void
): Promise<UnlistenFn> {
  return listen<ProgressEvent>('skill-seekers:progress', (event) => {
    callback(event.payload);
  });
}

/** Subscribe to job completed events */
export async function onJobCompleted(
  callback: (event: JobCompletedEvent) => void
): Promise<UnlistenFn> {
  return listen<JobCompletedEvent>('skill-seekers:job-completed', (event) => {
    callback(event.payload);
  });
}

/** Subscribe to log events */
export async function onLog(callback: (event: LogEvent) => void): Promise<UnlistenFn> {
  return listen<LogEvent>('skill-seekers:log', (event) => {
    callback(event.payload);
  });
}

// ========== Default Export ==========

const skillSeekersApi = {
  // Installation
  isInstalled,
  getVersion,
  install,
  // Configuration
  getConfig,
  updateConfig,
  listPresets,
  // Scraping
  scrapeWebsite,
  scrapeGitHub,
  scrapePdf,
  // Enhancement & Packaging
  enhanceSkill,
  packageSkill,
  // Utility
  estimatePages,
  validateConfig,
  // Job Management
  listJobs,
  getJob,
  cancelJob,
  resumeJob,
  cleanupJobs,
  // Generated Skills
  listGenerated,
  getGenerated,
  getOutputDir,
  getVenvPath,
  // Quick Generate
  quickGenerateWebsite,
  quickGenerateGitHub,
  quickGeneratePreset,
  // Events
  onProgress,
  onJobCompleted,
  onLog,
};

export default skillSeekersApi;
