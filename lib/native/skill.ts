/**
 * Skill Native Module - Tauri commands for skill management
 *
 * Provides access to the Rust-based skill service for:
 * - Repository management (list, add, remove, toggle)
 * - Skill discovery from remote repositories
 * - Skill installation and uninstallation
 * - Skill state management (enable, disable, update)
 * - Skill content reading
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/native/utils';

// ========== Types ==========

/**
 * Skill repository configuration
 */
export interface SkillRepo {
  owner: string;
  name: string;
  branch: string;
  enabled: boolean;
}

/**
 * Discoverable skill from a repository
 */
export interface DiscoverableSkill {
  key: string;
  name: string;
  description: string;
  directory: string;
  readmeUrl: string | null;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
}

/**
 * Installed skill record
 */
export interface InstalledSkill {
  id: string;
  name: string;
  description: string | null;
  directory: string;
  repoOwner: string | null;
  repoName: string | null;
  repoBranch: string | null;
  readmeUrl: string | null;
  installedAt: number;
  enabled: boolean;
  category: string | null;
  tags: string[];
}

/**
 * Combined skill view
 */
export interface NativeSkill {
  key: string;
  name: string;
  description: string;
  directory: string;
  readmeUrl: string | null;
  installed: boolean;
  enabled: boolean | null;
  repoOwner: string | null;
  repoName: string | null;
  repoBranch: string | null;
  category: string | null;
  tags: string[] | null;
}

/**
 * Local unregistered skill
 */
export interface LocalSkill {
  directory: string;
  name: string;
  description: string | null;
  path: string;
  hasSkillMd: boolean;
}

// ========== Repository Commands ==========

/**
 * List all configured skill repositories
 */
export async function listSkillRepos(): Promise<SkillRepo[]> {
  return invoke<SkillRepo[]>('skill_list_repos');
}

/**
 * Add a skill repository
 */
export async function addSkillRepo(
  owner: string,
  name: string,
  branch?: string
): Promise<void> {
  return invoke('skill_add_repo', { owner, name, branch });
}

/**
 * Remove a skill repository
 */
export async function removeSkillRepo(owner: string, name: string): Promise<void> {
  return invoke('skill_remove_repo', { owner, name });
}

/**
 * Toggle repository enabled state
 */
export async function toggleSkillRepo(
  owner: string,
  name: string,
  enabled: boolean
): Promise<void> {
  return invoke('skill_toggle_repo', { owner, name, enabled });
}

// ========== Discovery Commands ==========

/**
 * Discover skills from all enabled repositories
 */
export async function discoverSkills(): Promise<DiscoverableSkill[]> {
  return invoke<DiscoverableSkill[]>('skill_discover');
}

/**
 * Get all skills (merged view of discoverable, installed, and local)
 */
export async function getAllSkills(): Promise<NativeSkill[]> {
  return invoke<NativeSkill[]>('skill_get_all');
}

/**
 * Discover all skills (discoverable + installed + local)
 */
export async function discoverAllSkills(): Promise<{
  discoverable: DiscoverableSkill[];
  installed: InstalledSkill[];
  local: LocalSkill[];
}> {
  return invoke('skill_discover_all');
}

/**
 * Search and filter skills
 */
export async function searchSkills(filters: {
  category?: string;
  tags?: string[];
  installed?: boolean;
  enabled?: boolean;
  query?: string;
}): Promise<NativeSkill[]> {
  return invoke('skill_search', { filters });
}

/**
 * Scan for local unregistered skills
 */
export async function scanLocalSkills(): Promise<LocalSkill[]> {
  return invoke<LocalSkill[]>('skill_scan_local');
}

// ========== Installation Commands ==========

/**
 * Install a skill from repository
 */
export async function installSkill(skill: DiscoverableSkill): Promise<InstalledSkill> {
  return invoke<InstalledSkill>('skill_install', {
    owner: skill.repoOwner,
    repo: skill.repoName,
    branch: skill.repoBranch,
    directory: skill.directory,
    name: skill.name,
    description: skill.description,
    readmeUrl: skill.readmeUrl,
  });
}

/**
 * Install a skill from local path
 */
export async function installLocalSkill(
  sourcePath: string,
  name?: string
): Promise<InstalledSkill> {
  return invoke<InstalledSkill>('skill_install_local', { sourcePath, name });
}

/**
 * Register a local skill already in SSOT directory
 */
export async function registerLocalSkill(directory: string): Promise<InstalledSkill> {
  return invoke<InstalledSkill>('skill_register_local', { directory });
}

/**
 * Uninstall a skill
 */
export async function uninstallSkill(id: string): Promise<void> {
  return invoke('skill_uninstall', { id });
}

// ========== State Management Commands ==========

/**
 * Get all installed skills
 */
export async function getInstalledSkills(): Promise<InstalledSkill[]> {
  return invoke<InstalledSkill[]>('skill_get_installed');
}

export async function getSkill(id: string): Promise<InstalledSkill | null> {
  return invoke<InstalledSkill | null>('skill_get', { id });
}

/**
 * Get a specific installed skill or throw error
 */
export async function getSkillRequired(id: string): Promise<InstalledSkill> {
  return invoke<InstalledSkill>('skill_get_required', { id });
}

/**
 * Get skill state (legacy compatibility)
 */
export async function getSkillState(id: string): Promise<{
  installed: boolean;
  installedAt: string;
}> {
  return invoke('skill_get_state', { id });
}

/**
 * Enable a skill
 */
export async function enableSkill(id: string): Promise<void> {
  return invoke('skill_enable', { id });
}

/**
 * Disable a skill
 */
export async function disableSkill(id: string): Promise<void> {
  return invoke('skill_disable', { id });
}

/**
 * Update skill metadata
 */
export async function updateSkill(
  id: string,
  category?: string,
  tags?: string[]
): Promise<void> {
  return invoke('skill_update', { id, category, tags });
}

// ========== Content Commands ==========

/**
 * Read skill content (SKILL.md)
 */
export async function readSkillContent(directory: string): Promise<string> {
  return invoke<string>('skill_read_content', { directory });
}

/**
 * List skill resource files
 */
export async function listSkillResources(directory: string): Promise<string[]> {
  return invoke<string[]>('skill_list_resources', { directory });
}

/**
 * Read a skill resource file
 */
export async function readSkillResource(
  directory: string,
  resourcePath: string
): Promise<string> {
  return invoke<string>('skill_read_resource', { directory, resourcePath });
}

/**
 * Get SSOT directory path
 */
export async function getSkillSsotDir(): Promise<string> {
  return invoke<string>('skill_get_ssot_dir');
}

// ========== Security Scanning Types ==========

/**
 * Security finding severity level
 */
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Security finding category
 */
export type SecurityCategory =
  | 'command_execution'
  | 'code_injection'
  | 'filesystem_access'
  | 'network_access'
  | 'sensitive_data'
  | 'privilege_escalation'
  | 'obfuscated_code'
  | 'other';

/**
 * A single security finding from scanning
 */
export interface SecurityFinding {
  ruleId: string;
  title: string;
  description: string;
  severity: SecuritySeverity;
  category: SecurityCategory;
  filePath: string;
  line: number;
  column: number;
  snippet: string | null;
  suggestion: string | null;
}

/**
 * Summary statistics for a security scan
 */
export interface SecurityScanSummary {
  filesScanned: number;
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  isSafe: boolean;
  riskScore: number;
}

/**
 * Complete security scan report
 */
export interface SecurityScanReport {
  skillId: string;
  skillName: string | null;
  scannedPath: string;
  scannedAt: number;
  durationMs: number;
  summary: SecurityScanSummary;
  findings: SecurityFinding[];
}

/**
 * Options for security scanning
 */
export interface SecurityScanOptions {
  maxFileSize?: number;
  maxFiles?: number;
  extensions?: string[];
  skipPatterns?: string[];
  minSeverity?: SecuritySeverity;
}

// ========== Security Scanning Commands ==========

/**
 * Scan an installed skill for security issues
 */
export async function scanInstalledSkill(
  directory: string,
  options?: SecurityScanOptions
): Promise<SecurityScanReport> {
  return invoke<SecurityScanReport>('skill_scan_installed', { directory, options });
}

/**
 * Scan a local path for security issues (pre-install check)
 */
export async function scanSkillPath(
  path: string,
  options?: SecurityScanOptions
): Promise<SecurityScanReport> {
  return invoke<SecurityScanReport>('skill_scan_path', { path, options });
}

/**
 * Get the number of security rules available
 */
export async function getSecurityRuleCount(): Promise<number> {
  return invoke<number>('skill_security_rule_count');
}

// ========== Utility Functions ==========

/**
 * Check if running in Tauri environment
 */
export function isNativeSkillAvailable(): boolean {
  return isTauri();
}

/**
 * Safe wrapper for skill operations that may fail in non-Tauri environments
 */
export async function safeSkillInvoke<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!isNativeSkillAvailable()) {
    return fallback;
  }
  try {
    return await operation();
  } catch (error) {
    console.error('Skill operation failed:', error);
    return fallback;
  }
}
