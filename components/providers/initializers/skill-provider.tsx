'use client';

/**
 * Skill Provider - Initializes skill bootstrap lifecycle on app startup
 */

import { useEffect, useRef, useState } from 'react';
import { useSkillStore } from '@/stores/skills';
import { getAllBuiltinSkills } from '@/lib/skills/builtin';
import { useSkillBootstrap } from '@/hooks/skills/use-skill-bootstrap';
import type { CreateSkillInput } from '@/types/system/skill';
import { createLogger } from '@/lib/logger';

const skillProviderLogger = createLogger('providers:skill');

interface SkillProviderProps {
  children: React.ReactNode;
  /** Whether to load built-in skills on mount (default: true) */
  loadBuiltinSkills?: boolean;
  /** Custom skills to load in addition to built-in ones */
  customSkills?: CreateSkillInput[];
  /** Called when skills are initialized */
  onInitialized?: () => void;
}

/**
 * Provider component that initializes skills on app startup.
 * The actual loading/reconciliation order is delegated to useSkillBootstrap.
 */
export function SkillProvider({
  children,
  loadBuiltinSkills = true,
  customSkills,
  onInitialized,
}: SkillProviderProps) {
  const initialized = useRef(false);
  const { createSkill } = useSkillStore();
  const { runBootstrap } = useSkillBootstrap();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeSkills = async () => {
      await runBootstrap({
        loadBuiltinSkills,
      });

      if (customSkills && customSkills.length > 0) {
        for (const skill of customSkills) {
          createSkill(skill);
        }
        skillProviderLogger.info('Loaded custom skills', {
          action: 'loadCustomSkills',
          count: customSkills.length,
        });
      }

      onInitialized?.();
    };

    initializeSkills();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadBuiltinSkills]);

  return <>{children}</>;
}

/**
 * Hook to initialize skills programmatically
 * Can be used instead of SkillProvider for more control
 */
export function useInitializeSkills(options: {
  loadBuiltinSkills?: boolean;
  customSkills?: CreateSkillInput[];
  forceReload?: boolean;
} = {}) {
  const {
    loadBuiltinSkills = true,
    customSkills,
    forceReload = false,
  } = options;

  const initialized = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { createSkill, skills, reset } = useSkillStore();
  const { runBootstrap } = useSkillBootstrap();

  useEffect(() => {
    if (initialized.current && !forceReload) return;
    initialized.current = true;

    const initialize = async () => {
      if (forceReload) {
        reset();
      }

      await runBootstrap({
        loadBuiltinSkills,
        force: forceReload,
      });

      if (customSkills) {
        for (const skill of customSkills) {
          createSkill(skill);
        }
      }

      setIsInitialized(true);
    };

    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadBuiltinSkills, forceReload]);

  return {
    isInitialized,
    skillCount: Object.keys(skills).length,
  };
}

/**
 * Standalone function to initialize skills
 * Can be called from anywhere without hooks
 */
export function initializeSkillsSync(): number {
  const store = useSkillStore.getState();
  const existingSkillCount = Object.keys(store.skills).length;

  if (existingSkillCount === 0) {
    const builtinSkills = getAllBuiltinSkills();
    store.importBuiltinSkills(builtinSkills);
    return builtinSkills.length;
  }

  return existingSkillCount;
}

export default SkillProvider;
