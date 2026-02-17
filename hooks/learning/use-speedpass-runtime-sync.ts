'use client';

import { useEffect, useRef } from 'react';
import { loggers } from '@/lib/logger';
import { isTauri } from '@/lib/utils';
import {
  DEFAULT_SPEEDPASS_USER_ID,
  speedpassRuntime,
} from '@/lib/native/speedpass-runtime';
import {
  useSpeedPassStore,
  extractSpeedPassPersistedState,
  isSpeedPassPersistedSnapshotEmpty,
} from '@/stores/learning/speedpass-store';
import type {
  LegacySpeedPassSnapshotV1,
  SpeedPassPersistedState,
} from '@/types/learning/speedpass';

const log = loggers.store;
const LEGACY_STORAGE_KEY = 'cognia-speedpass';
const LEGACY_BACKUP_KEY = 'cognia-speedpass-migration-backup-v1';
const LEGACY_REQUIRED_KEYS: Array<keyof SpeedPassPersistedState> = [
  'academicProfile',
  'textbooks',
  'textbookChapters',
  'textbookKnowledgePoints',
  'textbookQuestions',
  'userTextbooks',
  'courseTextbookMappings',
  'tutorials',
  'studySessions',
  'quizzes',
  'wrongQuestions',
  'studyReports',
  'globalStats',
  'userProfile',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSpeedPassPersistedState(value: unknown): value is SpeedPassPersistedState {
  if (!isRecord(value)) {
    return false;
  }
  return LEGACY_REQUIRED_KEYS.every((key) => key in value);
}

function normalizeLegacySnapshot(raw: string | null): LegacySpeedPassSnapshotV1 | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const embeddedState =
      isRecord(parsed) && isRecord(parsed.state) ? parsed.state : parsed;
    if (!isSpeedPassPersistedState(embeddedState)) {
      log.warn('Legacy SpeedPass snapshot shape is invalid, skipping runtime import');
      return null;
    }

    return {
      version: 1,
      migratedAt: new Date().toISOString(),
      snapshot: embeddedState,
    };
  } catch (error) {
    log.warn('Failed to parse legacy SpeedPass localStorage snapshot', { error });
    return null;
  }
}

export function useSpeedPassRuntimeSync() {
  const initializedRef = useRef(false);
  const isHydratingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revisionRef = useRef<number>(0);
  const lastSerializedRef = useRef<string>('');

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    if (!isTauri() || typeof window === 'undefined') {
      return;
    }

    let disposed = false;

    const bootstrap = async () => {
      isHydratingRef.current = true;
      try {
        const runtimeSnapshot = await speedpassRuntime.loadSnapshot(DEFAULT_SPEEDPASS_USER_ID);
        if (disposed) {
          return;
        }

        const hasRuntimeData =
          runtimeSnapshot && !isSpeedPassPersistedSnapshotEmpty(runtimeSnapshot.snapshot);

        if (hasRuntimeData && runtimeSnapshot) {
          useSpeedPassStore.getState().hydrateFromSnapshot(runtimeSnapshot.snapshot);
          revisionRef.current = runtimeSnapshot.revision;
          lastSerializedRef.current = JSON.stringify(runtimeSnapshot.snapshot);
          return;
        }

        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        const legacySnapshot = normalizeLegacySnapshot(legacyRaw);
        if (!legacySnapshot || isSpeedPassPersistedSnapshotEmpty(legacySnapshot.snapshot)) {
          return;
        }

        localStorage.setItem(LEGACY_BACKUP_KEY, legacyRaw || '');

        const imported = await speedpassRuntime.importLegacySnapshot(
          legacySnapshot,
          DEFAULT_SPEEDPASS_USER_ID
        );

        if (disposed) {
          return;
        }

        useSpeedPassStore.getState().hydrateFromSnapshot(imported.snapshot);
        revisionRef.current = imported.revision;
        lastSerializedRef.current = JSON.stringify(imported.snapshot);
      } catch (error) {
        log.warn('SpeedPass runtime bootstrap failed, fallback to localStorage persist', { error });
      } finally {
        isHydratingRef.current = false;
      }
    };

    void bootstrap();

    const unsubscribe = useSpeedPassStore.subscribe((state) => {
      if (disposed || isHydratingRef.current) {
        return;
      }

      const snapshot = extractSpeedPassPersistedState(state);
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSerializedRef.current) {
        return;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        const currentSnapshot = snapshot;
        void speedpassRuntime
          .saveSnapshot(currentSnapshot, {
            userId: DEFAULT_SPEEDPASS_USER_ID,
            revision: revisionRef.current,
          })
          .then((saved) => {
            revisionRef.current = saved.revision;
            lastSerializedRef.current = serialized;
          })
          .catch((error) => {
            log.warn('SpeedPass runtime save failed', { error });
          });
      }, 800);
    });

    return () => {
      disposed = true;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      unsubscribe();
    };
  }, []);
}

export default useSpeedPassRuntimeSync;
