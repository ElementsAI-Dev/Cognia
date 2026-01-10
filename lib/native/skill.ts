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
    key: skill.key,
    name: skill.name,
    description: skill.description,
    directory: skill.directory,
    repoOwner: skill.repoOwner,
    repoName: skill.repoName,
    repoBranch: skill.repoBranch,
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

/**
 * Get a specific installed skill
 */
export async function getSkill(id: string): Promise<InstalledSkill | null> {
  return invoke<InstalledSkill | null>('skill_get', { id });
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

// ========== Utility Functions ==========

/**
 * Check if running in Tauri environment
 */
export function isNativeSkillAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
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
