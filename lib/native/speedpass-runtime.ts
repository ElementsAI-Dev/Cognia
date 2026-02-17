/**
 * SpeedPass native runtime bridge.
 *
 * Wraps Tauri commands exposed by src-tauri speedpass runtime.
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/utils';
import { DEFAULT_SPEEDPASS_USER_ID } from '@/types/learning/speedpass';
import type {
  SpeedPassPersistedState,
  SpeedPassRuntimeSnapshot,
  LegacySpeedPassSnapshotV1,
  ExtractTextbookRequest,
  ExtractTextbookResult,
  TeacherKeyPointMatchRequest,
  TeacherKeyPointMatchResult,
} from '@/types/learning/speedpass';

export { DEFAULT_SPEEDPASS_USER_ID };

interface SaveSnapshotRequest {
  userId: string;
  revision?: number;
  snapshot: SpeedPassPersistedState;
}

interface ImportLegacySnapshotRequest {
  userId: string;
  legacy: LegacySpeedPassSnapshotV1;
}

interface MatchTeacherKeyPointsCommandRequest {
  userId: string;
  request: TeacherKeyPointMatchRequest;
}

function assertTauriRuntime(): void {
  if (!isTauri()) {
    throw new Error('SpeedPass runtime commands require Tauri environment');
  }
}

function normalizeSnapshot(
  raw: Record<string, unknown> | null | undefined
): SpeedPassRuntimeSnapshot | null {
  if (!raw) {
    return null;
  }

  return {
    userId: ((raw.userId as string) || (raw.user_id as string) || DEFAULT_SPEEDPASS_USER_ID).trim(),
    revision:
      typeof raw.revision === 'number'
        ? raw.revision
        : typeof raw.revision === 'string'
          ? Number.parseInt(raw.revision, 10) || 0
          : 0,
    snapshot: ((raw.snapshot as SpeedPassPersistedState) || {}) as SpeedPassPersistedState,
    updatedAt:
      (raw.updatedAt as string) ||
      (raw.updated_at as string) ||
      new Date().toISOString(),
  };
}

function toSerializableSnapshot(snapshot: SpeedPassPersistedState): SpeedPassPersistedState {
  return JSON.parse(JSON.stringify(snapshot)) as SpeedPassPersistedState;
}

export async function speedPassRuntimeLoadSnapshot(
  userId = DEFAULT_SPEEDPASS_USER_ID
): Promise<SpeedPassRuntimeSnapshot | null> {
  assertTauriRuntime();
  const raw = await invoke<Record<string, unknown> | null>('speedpass_runtime_load_snapshot', {
    userId,
  });
  return normalizeSnapshot(raw);
}

export async function speedPassRuntimeSaveSnapshot(
  snapshot: SpeedPassPersistedState,
  options?: { userId?: string; revision?: number }
): Promise<SpeedPassRuntimeSnapshot> {
  assertTauriRuntime();
  const request: SaveSnapshotRequest = {
    userId: options?.userId || DEFAULT_SPEEDPASS_USER_ID,
    revision: options?.revision,
    snapshot: toSerializableSnapshot(snapshot),
  };
  const raw = await invoke<Record<string, unknown>>('speedpass_runtime_save_snapshot', { request });
  const normalized = normalizeSnapshot(raw);
  if (!normalized) {
    throw new Error('SpeedPass runtime returned empty snapshot after save');
  }
  return normalized;
}

export async function speedPassRuntimeImportLegacySnapshot(
  legacy: LegacySpeedPassSnapshotV1,
  userId = DEFAULT_SPEEDPASS_USER_ID
): Promise<SpeedPassRuntimeSnapshot> {
  assertTauriRuntime();
  const request: ImportLegacySnapshotRequest = {
    userId,
    legacy: {
      ...legacy,
      snapshot: toSerializableSnapshot(legacy.snapshot),
    },
  };
  const raw = await invoke<Record<string, unknown>>('speedpass_runtime_import_legacy_snapshot', {
    request,
  });
  const normalized = normalizeSnapshot(raw);
  if (!normalized) {
    throw new Error('SpeedPass runtime returned empty snapshot after legacy import');
  }
  return normalized;
}

export async function speedPassRuntimeExtractTextbookContent(
  request: ExtractTextbookRequest
): Promise<ExtractTextbookResult> {
  assertTauriRuntime();
  return invoke<ExtractTextbookResult>('speedpass_runtime_extract_textbook_content', { request });
}

export async function speedPassRuntimeMatchTeacherKeyPoints(
  request: TeacherKeyPointMatchRequest,
  userId = DEFAULT_SPEEDPASS_USER_ID
): Promise<TeacherKeyPointMatchResult> {
  assertTauriRuntime();
  const payload: MatchTeacherKeyPointsCommandRequest = {
    userId,
    request,
  };
  return invoke<TeacherKeyPointMatchResult>('speedpass_runtime_match_teacher_keypoints', {
    request: payload,
  });
}

export const speedpassRuntime = {
  loadSnapshot: speedPassRuntimeLoadSnapshot,
  saveSnapshot: speedPassRuntimeSaveSnapshot,
  importLegacySnapshot: speedPassRuntimeImportLegacySnapshot,
  extractTextbookContent: speedPassRuntimeExtractTextbookContent,
  matchTeacherKeyPoints: speedPassRuntimeMatchTeacherKeyPoints,
};

export default speedpassRuntime;
