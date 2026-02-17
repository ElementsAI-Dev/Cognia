'use client';

/**
 * Skill Sync Initializer
 * Syncs skills between frontend store and native SSOT on app startup
 */

import { useEffect, useRef } from 'react';
import { useSkillSync, useSkillSyncAvailable } from '@/hooks/skills';
import { createLogger } from '@/lib/logger';

const skillSyncLogger = createLogger('providers:skill-sync');

export function SkillSyncInitializer() {
  const hasInitialized = useRef(false);
  const isAvailable = useSkillSyncAvailable();
  const { syncFromNative, syncToNative } = useSkillSync();

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (!isAvailable) return;

    const runSync = async () => {
      try {
        await syncFromNative();
        await syncToNative();
      } catch (error) {
        skillSyncLogger.error('Skill sync failed', error, {
          action: 'syncFromNativeAndToNative',
        });
      }
    };

    runSync();
  }, [isAvailable, syncFromNative, syncToNative]);

  return null;
}

export default SkillSyncInitializer;
