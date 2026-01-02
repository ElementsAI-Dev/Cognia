'use client';

/**
 * useSkills - Hook for working with Claude Skills
 * 
 * Provides easy access to skill functionality for React components
 */

import { useCallback, useMemo } from 'react';
import { useSkillStore } from '@/stores/agent';
import {
  buildSkillSystemPrompt,
  buildMultiSkillSystemPrompt,
  findMatchingSkills,
  checkSkillTokenBudget,
} from '@/lib/skills';
import type {
  Skill,
  SkillCategory,
  CreateSkillInput,
} from '@/types/skill';

export interface UseSkillsOptions {
  maxTokenBudget?: number;
  autoMatchSkills?: boolean;
}

export interface UseSkillsReturn {
  // State
  skills: Skill[];
  activeSkills: Skill[];
  enabledSkills: Skill[];
  isLoading: boolean;
  error: string | null;

  // Skill Management
  createSkill: (input: CreateSkillInput) => Skill;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  enableSkill: (id: string) => void;
  disableSkill: (id: string) => void;

  // Active Skills
  activateSkill: (id: string) => void;
  deactivateSkill: (id: string) => void;
  clearActiveSkills: () => void;

  // Search
  searchSkills: (query: string) => Skill[];
  getSkillsByCategory: (category: SkillCategory) => Skill[];

  // Execution
  getSystemPrompt: () => string;
  matchSkillsToQuery: (query: string, maxResults?: number) => Skill[];
  getTokenEstimate: () => { totalTokens: number; fits: boolean; excess: number };

  // Utilities
  getSkillById: (id: string) => Skill | undefined;
  recordUsage: (skillId: string, success: boolean, duration: number) => void;
}

export function useSkills(options: UseSkillsOptions = {}): UseSkillsReturn {
  const {
    maxTokenBudget = 8000,
  } = options;

  const store = useSkillStore();

  // Derived state
  const skills = useMemo(() => Object.values(store.skills), [store.skills]);
  
  const activeSkills = useMemo(() => 
    store.activeSkillIds
      .map(id => store.skills[id])
      .filter((s): s is Skill => s !== undefined),
    [store.activeSkillIds, store.skills]
  );

  const enabledSkills = useMemo(() => 
    skills.filter(s => s.status === 'enabled'),
    [skills]
  );

  // Skill management
  const createSkill = useCallback((input: CreateSkillInput) => {
    return store.createSkill(input);
  }, [store]);

  const updateSkill = useCallback((id: string, updates: Partial<Skill>) => {
    store.updateSkill(id, updates);
  }, [store]);

  const deleteSkill = useCallback((id: string) => {
    store.deleteSkill(id);
  }, [store]);

  const enableSkill = useCallback((id: string) => {
    store.enableSkill(id);
  }, [store]);

  const disableSkill = useCallback((id: string) => {
    store.disableSkill(id);
  }, [store]);

  // Active skills management
  const activateSkill = useCallback((id: string) => {
    store.activateSkill(id);
  }, [store]);

  const deactivateSkill = useCallback((id: string) => {
    store.deactivateSkill(id);
  }, [store]);

  const clearActiveSkills = useCallback(() => {
    store.clearActiveSkills();
  }, [store]);

  // Search
  const searchSkills = useCallback((query: string) => {
    const result = store.searchSkills(query);
    return result.skills;
  }, [store]);

  const getSkillsByCategory = useCallback((category: SkillCategory) => {
    return store.getSkillsByCategory(category);
  }, [store]);

  // Execution
  const getSystemPrompt = useCallback(() => {
    if (activeSkills.length === 0) {
      return '';
    }
    if (activeSkills.length === 1) {
      return buildSkillSystemPrompt(activeSkills[0]);
    }
    return buildMultiSkillSystemPrompt(activeSkills);
  }, [activeSkills]);

  const matchSkillsToQuery = useCallback((query: string, maxResults: number = 3) => {
    return findMatchingSkills(enabledSkills, query, maxResults);
  }, [enabledSkills]);

  const getTokenEstimate = useCallback(() => {
    return checkSkillTokenBudget(activeSkills, maxTokenBudget);
  }, [activeSkills, maxTokenBudget]);

  // Utilities
  const getSkillById = useCallback((id: string) => {
    return store.getSkill(id);
  }, [store]);

  const recordUsage = useCallback((skillId: string, success: boolean, duration: number) => {
    store.recordSkillUsage(skillId, success, duration);
  }, [store]);

  return {
    // State
    skills,
    activeSkills,
    enabledSkills,
    isLoading: store.isLoading,
    error: store.error,

    // Skill Management
    createSkill,
    updateSkill,
    deleteSkill,
    enableSkill,
    disableSkill,

    // Active Skills
    activateSkill,
    deactivateSkill,
    clearActiveSkills,

    // Search
    searchSkills,
    getSkillsByCategory,

    // Execution
    getSystemPrompt,
    matchSkillsToQuery,
    getTokenEstimate,

    // Utilities
    getSkillById,
    recordUsage,
  };
}

/**
 * Hook to get the system prompt with active skills
 */
export function useSkillSystemPrompt(): string {
  const { activeSkills } = useSkills();
  
  return useMemo(() => {
    if (activeSkills.length === 0) return '';
    if (activeSkills.length === 1) {
      return buildSkillSystemPrompt(activeSkills[0]);
    }
    return buildMultiSkillSystemPrompt(activeSkills);
  }, [activeSkills]);
}

/**
 * Hook to automatically match skills to a query
 */
export function useAutoMatchSkills(query: string, maxResults: number = 3): Skill[] {
  const { enabledSkills } = useSkills();
  
  return useMemo(() => {
    if (!query || query.length < 5) return [];
    return findMatchingSkills(enabledSkills, query, maxResults);
  }, [enabledSkills, query, maxResults]);
}

/**
 * Hook to check if skills fit within token budget
 */
export function useSkillTokenBudget(budget: number = 8000) {
  const { activeSkills } = useSkills();
  
  return useMemo(() => {
    return checkSkillTokenBudget(activeSkills, budget);
  }, [activeSkills, budget]);
}

export default useSkills;
