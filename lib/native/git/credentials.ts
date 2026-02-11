/**
 * Git Credentials Management
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import { loggers } from '@/lib/logger';
import type {
  GitCredential,
  GitCredentialInput,
  SshKeyInfo,
} from '@/types/system/git';

const log = loggers.native;

/** List all stored Git credentials (sensitive data excluded) */
export async function listCredentials(): Promise<GitCredential[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<GitCredential[]>('git_list_credentials');
  } catch (error) {
    log.error('Failed to list Git credentials', error as Error);
    return [];
  }
}

/** Add or update a Git credential */
export async function setCredential(
  input: GitCredentialInput
): Promise<GitCredential> {
  if (!isTauri()) {
    throw new Error('Git credentials require Tauri desktop environment');
  }

  return invoke<GitCredential>('git_set_credential', { input });
}

/** Remove a Git credential by host */
export async function removeCredential(host: string): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('Git credentials require Tauri desktop environment');
  }

  return invoke<boolean>('git_remove_credential', { host });
}

/** Detect available SSH keys on the system */
export async function detectSshKeys(): Promise<SshKeyInfo[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<SshKeyInfo[]>('git_detect_ssh_keys');
  } catch (error) {
    log.error('Failed to detect SSH keys', error as Error);
    return [];
  }
}

/** Test if a credential is valid */
export async function testCredential(host: string): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('Git credentials require Tauri desktop environment');
  }

  return invoke<boolean>('git_test_credential', { host });
}
