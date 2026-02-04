'use client';

/**
 * Skill Sync Initializer
 * Syncs skills between frontend store and native SSOT on app startup
 */

import { useEffect, useRef } from 'react';
import { useSkillSync, useSkillSyncAvailable } from '@/hooks/skills';

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
        console.error('[SkillSyncInitializer] Sync failed:', error);
      }
    };

    runSync();
  }, [isAvailable, syncFromNative, syncToNative]);

  return null;
}

export default SkillSyncInitializer;
