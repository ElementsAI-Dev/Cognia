/**
 * Skill Store - Zustand state management for Claude Skills
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  Skill,
  SkillMetadata,
  SkillResource,
  SkillStatus,
  SkillSource,
  SkillCategory,
  SkillValidationError,
  CreateSkillInput,
  UpdateSkillInput,
  SkillUsageStats,
  SkillSearchResult,
} from '@/types/system/skill';

interface SkillState {
  // State
  skills: Record<string, Skill>;
  activeSkillIds: string[];
  isLoading: boolean;
  error: string | null;
  usageStats: Record<string, SkillUsageStats>;

  // CRUD Actions
  createSkill: (input: CreateSkillInput) => Skill;
  updateSkill: (id: string, updates: UpdateSkillInput) => void;
  deleteSkill: (id: string) => void;
  getSkill: (id: string) => Skill | undefined;
  getAllSkills: () => Skill[];

  // Status management
  enableSkill: (id: string) => void;
  disableSkill: (id: string) => void;
  setSkillStatus: (id: string, status: SkillStatus) => void;

  // Active skills (loaded into agent context)
  activateSkill: (id: string) => void;
  deactivateSkill: (id: string) => void;
  getActiveSkills: () => Skill[];
  clearActiveSkills: () => void;

  // Resource management
  addResource: (skillId: string, resource: Omit<SkillResource, 'size' | 'mimeType'>) => void;
  updateResource: (skillId: string, path: string, content: string) => void;
  removeResource: (skillId: string, path: string) => void;
  loadResourceContent: (skillId: string, path: string) => Promise<string | undefined>;

  // Search and filter
  searchSkills: (query: string, filters?: {
    category?: SkillCategory;
    source?: SkillSource;
    status?: SkillStatus;
    tags?: string[];
  }) => SkillSearchResult;
  getSkillsByCategory: (category: SkillCategory) => Skill[];
  getSkillsBySource: (source: SkillSource) => Skill[];
  getSkillsByTags: (tags: string[]) => Skill[];

  // Validation
  validateSkill: (skill: Partial<Skill>) => SkillValidationError[];
  validateSkillName: (name: string) => SkillValidationError[];
  validateSkillDescription: (description: string) => SkillValidationError[];

  // Usage tracking
  recordSkillUsage: (skillId: string, success: boolean, duration: number, tokens?: number) => void;
  getSkillUsageStats: (skillId: string) => SkillUsageStats | undefined;

  // Import/Export
  importSkill: (skillData: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => Skill;
  exportSkill: (id: string) => Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> | undefined;

  // Bulk operations
  importBuiltinSkills: (skills: CreateSkillInput[]) => void;
  deleteAllCustomSkills: () => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Loading state
  setLoading: (loading: boolean) => void;

  // Reset
  reset: () => void;
}

/**
 * Convert name to hyphen-case
 */
function toHyphenCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * Generate raw SKILL.md content from metadata and content
 */
function generateRawContent(metadata: SkillMetadata, content: string): string {
  return `---
name: ${metadata.name}
description: ${metadata.description}
---

${content}`;
}

const initialState = {
  skills: {} as Record<string, Skill>,
  activeSkillIds: [] as string[],
  isLoading: false,
  error: null as string | null,
  usageStats: {} as Record<string, SkillUsageStats>,
};

export const useSkillStore = create<SkillState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // CRUD Actions
      createSkill: (input: CreateSkillInput) => {
        const now = new Date();
        const id = nanoid();
        const name = toHyphenCase(input.name);
        
        const metadata: SkillMetadata = {
          name,
          description: input.description,
        };

        const skill: Skill = {
          id,
          metadata,
          content: input.content,
          rawContent: generateRawContent(metadata, input.content),
          resources: (input.resources || []).map(r => ({
            ...r,
            size: r.content?.length || 0,
            mimeType: 'text/plain',
          })),
          status: 'enabled',
          source: 'custom',
          category: input.category || 'custom',
          tags: input.tags || [],
          version: input.version || '1.0.0',
          author: input.author,
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        };

        // Validate the skill
        const errors = get().validateSkill(skill);
        if (errors.some(e => e.severity === 'error')) {
          skill.status = 'error';
          skill.validationErrors = errors;
        }

        set((state) => ({
          skills: { ...state.skills, [id]: skill },
        }));

        return skill;
      },

      updateSkill: (id: string, updates: UpdateSkillInput) => {
        set((state) => {
          const skill = state.skills[id];
          if (!skill) return state;

          const updatedMetadata = updates.metadata
            ? { ...skill.metadata, ...updates.metadata }
            : skill.metadata;

          const updatedContent = updates.content ?? skill.content;
          
          const updatedSkill: Skill = {
            ...skill,
            metadata: updatedMetadata,
            content: updatedContent,
            rawContent: generateRawContent(updatedMetadata, updatedContent),
            category: updates.category ?? skill.category,
            tags: updates.tags ?? skill.tags,
            resources: updates.resources ?? skill.resources,
            status: updates.status ?? skill.status,
            updatedAt: new Date(),
          };

          // Re-validate after update
          const errors = get().validateSkill(updatedSkill);
          if (errors.some(e => e.severity === 'error')) {
            updatedSkill.validationErrors = errors;
          } else {
            updatedSkill.validationErrors = undefined;
          }

          return {
            skills: { ...state.skills, [id]: updatedSkill },
          };
        });
      },

      deleteSkill: (id: string) => {
        set((state) => {
          const { [id]: _deleted, ...rest } = state.skills;
          return {
            skills: rest,
            activeSkillIds: state.activeSkillIds.filter(sid => sid !== id),
          };
        });
      },

      getSkill: (id: string) => {
        return get().skills[id];
      },

      getAllSkills: () => {
        return Object.values(get().skills);
      },

      // Status management
      enableSkill: (id: string) => {
        get().setSkillStatus(id, 'enabled');
      },

      disableSkill: (id: string) => {
        get().setSkillStatus(id, 'disabled');
        // Also deactivate if active
        get().deactivateSkill(id);
      },

      setSkillStatus: (id: string, status: SkillStatus) => {
        set((state) => {
          const skill = state.skills[id];
          if (!skill) return state;

          return {
            skills: {
              ...state.skills,
              [id]: { ...skill, status, updatedAt: new Date() },
            },
          };
        });
      },

      // Active skills management
      activateSkill: (id: string) => {
        set((state) => {
          const skill = state.skills[id];
          if (!skill || skill.status !== 'enabled') return state;

          if (state.activeSkillIds.includes(id)) return state;

          return {
            activeSkillIds: [...state.activeSkillIds, id],
            skills: {
              ...state.skills,
              [id]: { ...skill, isActive: true },
            },
          };
        });
      },

      deactivateSkill: (id: string) => {
        set((state) => {
          const skill = state.skills[id];
          if (!skill) return state;

          return {
            activeSkillIds: state.activeSkillIds.filter(sid => sid !== id),
            skills: {
              ...state.skills,
              [id]: { ...skill, isActive: false },
            },
          };
        });
      },

      getActiveSkills: () => {
        const state = get();
        return state.activeSkillIds
          .map(id => state.skills[id])
          .filter((s): s is Skill => s !== undefined);
      },

      clearActiveSkills: () => {
        set((state) => {
          const updatedSkills = { ...state.skills };
          for (const id of state.activeSkillIds) {
            if (updatedSkills[id]) {
              updatedSkills[id] = { ...updatedSkills[id], isActive: false };
            }
          }
          return {
            activeSkillIds: [],
            skills: updatedSkills,
          };
        });
      },

      // Resource management
      addResource: (skillId: string, resource: Omit<SkillResource, 'size' | 'mimeType'>) => {
        set((state) => {
          const skill = state.skills[skillId];
          if (!skill) return state;

          const fullResource: SkillResource = {
            ...resource,
            size: resource.content?.length || 0,
            mimeType: 'text/plain',
          };

          return {
            skills: {
              ...state.skills,
              [skillId]: {
                ...skill,
                resources: [...skill.resources, fullResource],
                updatedAt: new Date(),
              },
            },
          };
        });
      },

      updateResource: (skillId: string, path: string, content: string) => {
        set((state) => {
          const skill = state.skills[skillId];
          if (!skill) return state;

          return {
            skills: {
              ...state.skills,
              [skillId]: {
                ...skill,
                resources: skill.resources.map(r =>
                  r.path === path ? { ...r, content, size: content.length } : r
                ),
                updatedAt: new Date(),
              },
            },
          };
        });
      },

      removeResource: (skillId: string, path: string) => {
        set((state) => {
          const skill = state.skills[skillId];
          if (!skill) return state;

          return {
            skills: {
              ...state.skills,
              [skillId]: {
                ...skill,
                resources: skill.resources.filter(r => r.path !== path),
                updatedAt: new Date(),
              },
            },
          };
        });
      },

      loadResourceContent: async (skillId: string, path: string): Promise<string | undefined> => {
        const skill = get().skills[skillId];
        if (!skill) return undefined;

        const resource = skill.resources.find(r => r.path === path);
        return resource?.content;
      },

      // Search and filter
      searchSkills: (query: string, filters) => {
        const allSkills = Object.values(get().skills);
        const lowerQuery = query.toLowerCase();

        const filtered = allSkills.filter(skill => {
          // Text search
          const matchesQuery = !query || 
            skill.metadata.name.toLowerCase().includes(lowerQuery) ||
            skill.metadata.description.toLowerCase().includes(lowerQuery) ||
            skill.tags.some(tag => tag.toLowerCase().includes(lowerQuery));

          if (!matchesQuery) return false;

          // Apply filters
          if (filters?.category && skill.category !== filters.category) return false;
          if (filters?.source && skill.source !== filters.source) return false;
          if (filters?.status && skill.status !== filters.status) return false;
          if (filters?.tags && filters.tags.length > 0) {
            const hasAllTags = filters.tags.every(tag => 
              skill.tags.includes(tag)
            );
            if (!hasAllTags) return false;
          }

          return true;
        });

        return {
          skills: filtered,
          total: filtered.length,
          query,
          filters,
        };
      },

      getSkillsByCategory: (category: SkillCategory) => {
        return Object.values(get().skills).filter(s => s.category === category);
      },

      getSkillsBySource: (source: SkillSource) => {
        return Object.values(get().skills).filter(s => s.source === source);
      },

      getSkillsByTags: (tags: string[]) => {
        return Object.values(get().skills).filter(s =>
          tags.some(tag => s.tags.includes(tag))
        );
      },

      // Validation
      validateSkill: (skill: Partial<Skill>): SkillValidationError[] => {
        const errors: SkillValidationError[] = [];

        if (skill.metadata) {
          errors.push(...get().validateSkillName(skill.metadata.name));
          errors.push(...get().validateSkillDescription(skill.metadata.description));
        }

        if (!skill.content || skill.content.trim().length === 0) {
          errors.push({
            field: 'content',
            message: 'Skill content is required',
            severity: 'error',
          });
        }

        return errors;
      },

      validateSkillName: (name: string): SkillValidationError[] => {
        const errors: SkillValidationError[] = [];
        const rules = {
          maxLength: 64,
          pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/,
        };

        if (!name || name.trim().length === 0) {
          errors.push({
            field: 'name',
            message: 'Skill name is required',
            severity: 'error',
          });
          return errors;
        }

        if (name.length > rules.maxLength) {
          errors.push({
            field: 'name',
            message: `Name must be ${rules.maxLength} characters or less`,
            severity: 'error',
          });
        }

        if (!rules.pattern.test(name)) {
          errors.push({
            field: 'name',
            message: 'Name must be hyphen-case (lowercase letters, digits, and hyphens only)',
            severity: 'error',
          });
        }

        if (name.startsWith('-') || name.endsWith('-')) {
          errors.push({
            field: 'name',
            message: 'Name cannot start or end with a hyphen',
            severity: 'error',
          });
        }

        if (name.includes('--')) {
          errors.push({
            field: 'name',
            message: 'Name cannot contain consecutive hyphens',
            severity: 'error',
          });
        }

        return errors;
      },

      validateSkillDescription: (description: string): SkillValidationError[] => {
        const errors: SkillValidationError[] = [];
        const rules = {
          maxLength: 1024,
          forbiddenChars: ['<', '>'],
        };

        if (!description || description.trim().length === 0) {
          errors.push({
            field: 'description',
            message: 'Skill description is required',
            severity: 'error',
          });
          return errors;
        }

        if (description.length > rules.maxLength) {
          errors.push({
            field: 'description',
            message: `Description must be ${rules.maxLength} characters or less`,
            severity: 'error',
          });
        }

        for (const char of rules.forbiddenChars) {
          if (description.includes(char)) {
            errors.push({
              field: 'description',
              message: `Description cannot contain "${char}" character`,
              severity: 'error',
            });
          }
        }

        return errors;
      },

      // Usage tracking
      recordSkillUsage: (skillId: string, success: boolean, duration: number, tokens?: number) => {
        set((state) => {
          const skill = state.skills[skillId];
          const existingStats = state.usageStats[skillId];
          const now = new Date();

          const newStats: SkillUsageStats = {
            skillId,
            totalExecutions: (existingStats?.totalExecutions || 0) + 1,
            successfulExecutions: (existingStats?.successfulExecutions || 0) + (success ? 1 : 0),
            averageExecutionTime: existingStats
              ? (existingStats.averageExecutionTime * existingStats.totalExecutions + duration) / 
                (existingStats.totalExecutions + 1)
              : duration,
            lastExecutionAt: now,
            tokensConsumed: (existingStats?.tokensConsumed || 0) + (tokens || 0),
          };

          const updatedSkill = skill ? {
            ...skill,
            usageCount: (skill.usageCount || 0) + 1,
            lastUsedAt: now,
          } : undefined;

          return {
            usageStats: { ...state.usageStats, [skillId]: newStats },
            skills: updatedSkill 
              ? { ...state.skills, [skillId]: updatedSkill }
              : state.skills,
          };
        });
      },

      getSkillUsageStats: (skillId: string) => {
        return get().usageStats[skillId];
      },

      // Import/Export
      importSkill: (skillData) => {
        const now = new Date();
        const id = nanoid();

        const skill: Skill = {
          ...skillData,
          id,
          createdAt: now,
          updatedAt: now,
          status: 'enabled',
          isActive: false,
          source: 'imported',
        };

        // Validate imported skill
        const errors = get().validateSkill(skill);
        if (errors.some(e => e.severity === 'error')) {
          skill.status = 'error';
          skill.validationErrors = errors;
        }

        set((state) => ({
          skills: { ...state.skills, [id]: skill },
        }));

        return skill;
      },

      exportSkill: (id: string) => {
        const skill = get().skills[id];
        if (!skill) return undefined;

        const { id: _id, createdAt: _c, updatedAt: _u, isActive: _a, ...exportData } = skill;
        return exportData;
      },

      // Bulk operations
      importBuiltinSkills: (skills: CreateSkillInput[]) => {
        const state = get();
        const newSkills: Record<string, Skill> = { ...state.skills };
        const now = new Date();

        for (const input of skills) {
          const id = nanoid();
          const name = toHyphenCase(input.name);
          const metadata: SkillMetadata = {
            name,
            description: input.description,
          };

          const skill: Skill = {
            id,
            metadata,
            content: input.content,
            rawContent: generateRawContent(metadata, input.content),
            resources: (input.resources || []).map(r => ({
              ...r,
              size: r.content?.length || 0,
              mimeType: 'text/plain',
            })),
            status: 'enabled',
            source: 'builtin',
            category: input.category || 'custom',
            tags: input.tags || [],
            version: input.version || '1.0.0',
            author: input.author,
            createdAt: now,
            updatedAt: now,
            usageCount: 0,
          };

          newSkills[id] = skill;
        }

        set({ skills: newSkills });
      },

      deleteAllCustomSkills: () => {
        set((state) => {
          const filteredSkills: Record<string, Skill> = {};
          for (const [id, skill] of Object.entries(state.skills)) {
            if (skill.source !== 'custom') {
              filteredSkills[id] = skill;
            }
          }
          return {
            skills: filteredSkills,
            activeSkillIds: state.activeSkillIds.filter(id => filteredSkills[id]),
          };
        });
      },

      // Error handling
      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'cognia-skills-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        skills: state.skills,
        usageStats: state.usageStats,
      }),
    }
  )
);

// Selectors
export const selectAllSkills = (state: SkillState) => Object.values(state.skills);
export const selectActiveSkills = (state: SkillState) => 
  state.activeSkillIds.map(id => state.skills[id]).filter((s): s is Skill => s !== undefined);
export const selectEnabledSkills = (state: SkillState) => 
  Object.values(state.skills).filter(s => s.status === 'enabled');
export const selectSkillById = (id: string) => (state: SkillState) => state.skills[id];
export const selectSkillsByCategory = (category: SkillCategory) => (state: SkillState) => 
  Object.values(state.skills).filter(s => s.category === category);
export const selectIsLoading = (state: SkillState) => state.isLoading;
export const selectError = (state: SkillState) => state.error;
