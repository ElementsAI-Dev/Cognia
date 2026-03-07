'use client';

/**
 * Skill Sync Initializer
 * Syncs skills between frontend store and native SSOT on app startup
 */

import { useEffect, useRef } from 'react';
import { useSkillBootstrap } from '@/hooks/skills';
import { createLogger } from '@/lib/logger';

const skillSyncLogger = createLogger('providers:skill-sync');

export function SkillSyncInitializer() {
  const hasInitialized = useRef(false);
  const { runBootstrap } = useSkillBootstrap();

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const runSync = async () => {
      try {
        await runBootstrap({
          loadBuiltinSkills: true,
        });
      } catch (error) {
        skillSyncLogger.error('Skill bootstrap failed', error, {
          action: 'runBootstrap',
        });
      }
    };

    runSync();
  }, [runBootstrap]);

  return null;
}

export default SkillSyncInitializer;
