/**
 * Git Event Listeners
 */

import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isTauri } from '../utils';
import type { GitOperationProgress } from '@/types/system/git';

/** Listen for Git operation progress events */
export async function onGitProgress(
  callback: (progress: GitOperationProgress) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<GitOperationProgress>('git-operation-progress', (event) => {
    callback(event.payload);
  });
}

/** Listen for Git installation progress events */
export async function onGitInstallProgress(
  callback: (progress: GitOperationProgress) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<GitOperationProgress>('git-install-progress', (event) => {
    callback(event.payload);
  });
}
