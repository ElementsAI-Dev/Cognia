'use client';

/**
 * Skill Provider - Initializes built-in skills on app startup
 * 
 * This provider should be placed near the root of the app to ensure
 * skills are loaded before any components that need them.
 */

import { useEffect, useRef, useState } from 'react';
import { useSkillStore } from '@/stores/skill-store';
import { getAllBuiltinSkills } from '@/lib/skills/builtin';
import type { CreateSkillInput } from '@/types/skill';

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
 * Provider component that initializes skills on app startup
 */
export function SkillProvider({
  children,
  loadBuiltinSkills = true,
  customSkills,
  onInitialized,
}: SkillProviderProps) {
  const initialized = useRef(false);
  const { importBuiltinSkills, createSkill } = useSkillStore();

  useEffect(() => {
    // Only initialize once
    if (initialized.current) return;
    initialized.current = true;

    const initializeSkills = async () => {
      // Get current skills count from store directly to avoid dependency issues
      const currentSkills = useSkillStore.getState().skills;
      const existingSkillCount = Object.keys(currentSkills).length;
      
      // Load built-in skills if enabled and none exist
      if (loadBuiltinSkills && existingSkillCount === 0) {
        const builtinSkills = getAllBuiltinSkills();
        importBuiltinSkills(builtinSkills);
        console.log(`[SkillProvider] Loaded ${builtinSkills.length} built-in skills`);
      }

      // Load custom skills if provided
      if (customSkills && customSkills.length > 0) {
        for (const skill of customSkills) {
          createSkill(skill);
        }
        console.log(`[SkillProvider] Loaded ${customSkills.length} custom skills`);
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
  const { importBuiltinSkills, createSkill, skills, reset } = useSkillStore();

  useEffect(() => {
    if (initialized.current && !forceReload) return;
    initialized.current = true;

    const initialize = () => {
      // Reset if force reload
      if (forceReload) {
        reset();
      }

      // Get current skills from store directly to avoid dependency issues
      const currentSkills = useSkillStore.getState().skills;
      const existingSkillCount = Object.keys(currentSkills).length;
      
      if (loadBuiltinSkills && (existingSkillCount === 0 || forceReload)) {
        const builtinSkills = getAllBuiltinSkills();
        importBuiltinSkills(builtinSkills);
      }

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
