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
  SkillSyncOutcome,
  SkillSyncState,
  SkillBootstrapPhase,
  SkillBootstrapPhaseStatus,
  SkillBootstrapPhaseTelemetry,
  SkillBootstrapFailureSeverity,
  SkillActivationJournal,
} from '@/types/system/skill';
import {
  buildCanonicalSkillId,
  createBuiltinSkillFingerprint,
  getDefaultSyncOrigin,
  normalizeSkillName,
} from '@/lib/skills/reconciliation';

export type SkillSyncDirection = 'bootstrap' | 'from-native' | 'to-native' | 'bidirectional' | null;

export interface SkillSyncDiagnostics {
  added: number;
  updated: number;
  skipped: number;
  conflicted: number;
}

interface SkillState {
  // State
  skills: Record<string, Skill>;
  activeSkillIds: string[];
  isLoading: boolean;
  error: string | null;
  usageStats: Record<string, SkillUsageStats>;
  bootstrapState: SkillSyncState;
  lastBootstrapAt: Date | null;
  lastBootstrapError: string | null;
  bootstrapPhase: SkillBootstrapPhase;
  bootstrapPhaseStatus: SkillBootstrapPhaseStatus;
  bootstrapPhaseStartedAt: Date | null;
  bootstrapPhaseEndedAt: Date | null;
  bootstrapTelemetry: SkillBootstrapPhaseTelemetry[];
  bootstrapFailureSeverity: SkillBootstrapFailureSeverity | null;
  bootstrapFailureCode: string | null;
  bootstrapFailureAffectedSkillIds: string[];
  lastActivationJournal: SkillActivationJournal | null;
  syncState: SkillSyncState;
  lastSyncAt: Date | null;
  lastSyncDirection: SkillSyncDirection;
  lastSyncOutcome: SkillSyncOutcome;
  lastSyncError: string | null;
  syncDiagnostics: SkillSyncDiagnostics;

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
  searchSkills: (
    query: string,
    filters?: {
      category?: SkillCategory;
      source?: SkillSource;
      status?: SkillStatus;
      tags?: string[];
    }
  ) => SkillSearchResult;
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
  exportSkill: (
    id: string
  ) => Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> | undefined;

  // Bulk operations
  importBuiltinSkills: (skills: CreateSkillInput[]) => void;
  deleteAllCustomSkills: () => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Loading state
  setLoading: (loading: boolean) => void;

  // Bootstrap/sync metadata
  setBootstrapState: (state: SkillSyncState, error?: string | null) => void;
  setBootstrapPhase: (
    phase: SkillBootstrapPhase,
    status: SkillBootstrapPhaseStatus,
    updates?: Partial<{
      startedAt: Date;
      endedAt: Date | null;
      errorCode: string | null;
      errorMessage: string | null;
      errorSeverity: SkillBootstrapFailureSeverity | null;
      affectedSkillIds: string[];
    }>
  ) => void;
  appendBootstrapTelemetry: (event: SkillBootstrapPhaseTelemetry) => void;
  setLastActivationJournal: (journal: SkillActivationJournal | null) => void;
  setSyncMetadata: (
    updates: Partial<{
      syncState: SkillSyncState;
      lastSyncAt: Date | null;
      lastSyncDirection: SkillSyncDirection;
      lastSyncOutcome: SkillSyncOutcome;
      lastSyncError: string | null;
      syncDiagnostics: SkillSyncDiagnostics;
    }>
  ) => void;

  // Reset
  reset: () => void;
}

/**
 * Convert name to hyphen-case
 */
function toHyphenCase(name: string): string {
  return normalizeSkillName(name);
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
  bootstrapState: 'idle' as SkillSyncState,
  lastBootstrapAt: null as Date | null,
  lastBootstrapError: null as string | null,
  bootstrapPhase: 'idle' as SkillBootstrapPhase,
  bootstrapPhaseStatus: 'idle' as SkillBootstrapPhaseStatus,
  bootstrapPhaseStartedAt: null as Date | null,
  bootstrapPhaseEndedAt: null as Date | null,
  bootstrapTelemetry: [] as SkillBootstrapPhaseTelemetry[],
  bootstrapFailureSeverity: null as SkillBootstrapFailureSeverity | null,
  bootstrapFailureCode: null as string | null,
  bootstrapFailureAffectedSkillIds: [] as string[],
  lastActivationJournal: null as SkillActivationJournal | null,
  syncState: 'idle' as SkillSyncState,
  lastSyncAt: null as Date | null,
  lastSyncDirection: null as SkillSyncDirection,
  lastSyncOutcome: 'idle' as SkillSyncOutcome,
  lastSyncError: null as string | null,
  syncDiagnostics: {
    added: 0,
    updated: 0,
    skipped: 0,
    conflicted: 0,
  } as SkillSyncDiagnostics,
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

        // Duplicate detection: check if skill with same name exists
        const existingSkills = Object.values(get().skills);
        const duplicate = existingSkills.find(
          (s) => s.metadata.name === name
        );
        if (duplicate) {
          set({ error: `Skill "${name}" already exists (id: ${duplicate.id})` });
          return duplicate;
        }

        const metadata: SkillMetadata = {
          name,
          description: input.description,
        };

        const skill: Skill = {
          id,
          metadata,
          content: input.content,
          rawContent: generateRawContent(metadata, input.content),
          resources: (input.resources || []).map((r) => ({
            ...r,
            size: r.content?.length || 0,
            mimeType: 'text/plain',
          })),
          status: input.status ?? 'enabled',
          source: input.source ?? 'custom',
          category: input.category || 'custom',
          tags: input.tags || [],
          version: input.version || '1.0.0',
          author: input.author,
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
          canonicalId: input.canonicalId ?? buildCanonicalSkillId({
            source: input.source ?? 'custom',
            metadata: { name },
            marketplaceSkillId: input.marketplaceSkillId,
            nativeSkillId: input.nativeSkillId,
            nativeDirectory: input.nativeDirectory,
          }),
          marketplaceSkillId: input.marketplaceSkillId,
          nativeSkillId: input.nativeSkillId,
          nativeDirectory: input.nativeDirectory,
          syncOrigin: input.syncOrigin ?? getDefaultSyncOrigin(input.source ?? 'custom'),
          syncFingerprint: input.syncFingerprint,
          lastSyncedAt: input.lastSyncedAt,
          lastSyncError: input.lastSyncError ?? null,
          // MCP Tool Association (Claude Best Practice)
          associatedMcpServers: input.associatedMcpServers,
          recommendedTools: input.recommendedTools,
          toolMatchKeywords: input.toolMatchKeywords,
        };

        // Validate the skill
        const errors = get().validateSkill(skill);
        if (errors.some((e) => e.severity === 'error')) {
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

          const hasOwn = <K extends keyof UpdateSkillInput>(key: K): boolean =>
            Object.prototype.hasOwnProperty.call(updates, key);

          const updatedMetadata = updates.metadata
            ? { ...skill.metadata, ...updates.metadata }
            : skill.metadata;

          const updatedContent = updates.content ?? skill.content;

          const resolvedNativeSkillId = hasOwn('nativeSkillId')
            ? updates.nativeSkillId ?? undefined
            : skill.nativeSkillId;
          const resolvedMarketplaceSkillId = hasOwn('marketplaceSkillId')
            ? updates.marketplaceSkillId ?? undefined
            : skill.marketplaceSkillId;
          const resolvedNativeDirectory = hasOwn('nativeDirectory')
            ? updates.nativeDirectory ?? undefined
            : skill.nativeDirectory;
          const resolvedCanonicalId = hasOwn('canonicalId')
            ? updates.canonicalId ?? undefined
            : skill.canonicalId;
          const resolvedSyncFingerprint = hasOwn('syncFingerprint')
            ? updates.syncFingerprint ?? undefined
            : skill.syncFingerprint;
          const resolvedLastSyncedAt = hasOwn('lastSyncedAt')
            ? updates.lastSyncedAt ?? undefined
            : skill.lastSyncedAt;
          const resolvedLastSyncError = hasOwn('lastSyncError')
            ? updates.lastSyncError ?? null
            : skill.lastSyncError ?? null;
          const resolvedSource = updates.source ?? skill.source;
          const resolvedSyncOrigin = updates.syncOrigin
            ?? skill.syncOrigin
            ?? getDefaultSyncOrigin(resolvedSource);

          const updatedSkill: Skill = {
            ...skill,
            metadata: updatedMetadata,
            content: updatedContent,
            rawContent: generateRawContent(updatedMetadata, updatedContent),
            source: resolvedSource,
            category: updates.category ?? skill.category,
            tags: updates.tags ?? skill.tags,
            resources: updates.resources ?? skill.resources,
            status: updates.status ?? skill.status,
            version: updates.version ?? skill.version,
            author: updates.author ?? skill.author,
            canonicalId: resolvedCanonicalId ?? buildCanonicalSkillId({
              source: resolvedSource,
              metadata: updatedMetadata,
              marketplaceSkillId: resolvedMarketplaceSkillId,
              nativeSkillId: resolvedNativeSkillId,
              nativeDirectory: resolvedNativeDirectory,
            }),
            marketplaceSkillId: resolvedMarketplaceSkillId,
            nativeSkillId: resolvedNativeSkillId,
            nativeDirectory: resolvedNativeDirectory,
            syncOrigin: resolvedSyncOrigin,
            syncFingerprint: resolvedSyncFingerprint,
            lastSyncedAt: resolvedLastSyncedAt,
            lastSyncError: resolvedLastSyncError,
            updatedAt: new Date(),
            // MCP Tool Association updates
            associatedMcpServers: updates.associatedMcpServers ?? skill.associatedMcpServers,
            recommendedTools: updates.recommendedTools ?? skill.recommendedTools,
            toolMatchKeywords: updates.toolMatchKeywords ?? skill.toolMatchKeywords,
          };

          // Re-validate after update
          const errors = get().validateSkill(updatedSkill);
          if (errors.some((e) => e.severity === 'error')) {
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
            activeSkillIds: state.activeSkillIds.filter((sid) => sid !== id),
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
            activeSkillIds: state.activeSkillIds.filter((sid) => sid !== id),
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
          .map((id) => state.skills[id])
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
                resources: skill.resources.map((r) =>
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
                resources: skill.resources.filter((r) => r.path !== path),
                updatedAt: new Date(),
              },
            },
          };
        });
      },

      loadResourceContent: async (skillId: string, path: string): Promise<string | undefined> => {
        const skill = get().skills[skillId];
        if (!skill) return undefined;

        const resource = skill.resources.find((r) => r.path === path);
        return resource?.content;
      },

      // Search and filter
      searchSkills: (query: string, filters) => {
        const allSkills = Object.values(get().skills);
        const lowerQuery = query.toLowerCase();

        const filtered = allSkills.filter((skill) => {
          // Text search
          const matchesQuery =
            !query ||
            skill.metadata.name.toLowerCase().includes(lowerQuery) ||
            skill.metadata.description.toLowerCase().includes(lowerQuery) ||
            skill.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));

          if (!matchesQuery) return false;

          // Apply filters
          if (filters?.category && skill.category !== filters.category) return false;
          if (filters?.source && skill.source !== filters.source) return false;
          if (filters?.status && skill.status !== filters.status) return false;
          if (filters?.tags && filters.tags.length > 0) {
            const hasAllTags = filters.tags.every((tag) => skill.tags.includes(tag));
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
        return Object.values(get().skills).filter((s) => s.category === category);
      },

      getSkillsBySource: (source: SkillSource) => {
        return Object.values(get().skills).filter((s) => s.source === source);
      },

      getSkillsByTags: (tags: string[]) => {
        return Object.values(get().skills).filter((s) => tags.some((tag) => s.tags.includes(tag)));
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

          const updatedSkill = skill
            ? {
                ...skill,
                usageCount: (skill.usageCount || 0) + 1,
                lastUsedAt: now,
              }
            : undefined;

          return {
            usageStats: { ...state.usageStats, [skillId]: newStats },
            skills: updatedSkill ? { ...state.skills, [skillId]: updatedSkill } : state.skills,
          };
        });
      },

      getSkillUsageStats: (skillId: string) => {
        return get().usageStats[skillId];
      },

      // Import/Export
      importSkill: (skillData) => {
        const now = new Date();

        // Duplicate detection: check if skill with same name exists
        const existingSkills = Object.values(get().skills);
        const duplicate = existingSkills.find(
          (s) => s.metadata.name === skillData.metadata.name
        );

        if (duplicate) {
          // Update existing skill instead of creating duplicate
          const updatedSkill: Skill = {
            ...duplicate,
            ...skillData,
            id: duplicate.id,
            createdAt: duplicate.createdAt,
            updatedAt: now,
            source: skillData.source ?? duplicate.source,
            status: skillData.status ?? duplicate.status,
            canonicalId: skillData.canonicalId ?? duplicate.canonicalId ?? buildCanonicalSkillId({
              source: skillData.source ?? duplicate.source,
              metadata: skillData.metadata ?? duplicate.metadata,
              marketplaceSkillId: skillData.marketplaceSkillId ?? duplicate.marketplaceSkillId,
              nativeSkillId: skillData.nativeSkillId ?? duplicate.nativeSkillId,
              nativeDirectory: skillData.nativeDirectory ?? duplicate.nativeDirectory,
            }),
            marketplaceSkillId: skillData.marketplaceSkillId ?? duplicate.marketplaceSkillId,
            nativeSkillId: skillData.nativeSkillId ?? duplicate.nativeSkillId,
            nativeDirectory: skillData.nativeDirectory ?? duplicate.nativeDirectory,
            syncOrigin: skillData.syncOrigin ?? duplicate.syncOrigin ?? getDefaultSyncOrigin(skillData.source ?? duplicate.source),
            syncFingerprint: skillData.syncFingerprint ?? duplicate.syncFingerprint,
            lastSyncedAt: skillData.lastSyncedAt ?? duplicate.lastSyncedAt,
            lastSyncError: skillData.lastSyncError ?? duplicate.lastSyncError ?? null,
          };

          const errors = get().validateSkill(updatedSkill);
          if (errors.some((e) => e.severity === 'error')) {
            updatedSkill.status = 'error';
            updatedSkill.validationErrors = errors;
          }

          set((state) => ({
            skills: { ...state.skills, [duplicate.id]: updatedSkill },
          }));

          return updatedSkill;
        }

        const id = nanoid();

        const skill: Skill = {
          ...skillData,
          id,
          createdAt: now,
          updatedAt: now,
          status: skillData.status ?? 'enabled',
          isActive: false,
          source: skillData.source ?? 'imported',
          canonicalId: skillData.canonicalId ?? buildCanonicalSkillId({
            source: skillData.source ?? 'imported',
            metadata: skillData.metadata,
            marketplaceSkillId: skillData.marketplaceSkillId,
            nativeSkillId: skillData.nativeSkillId,
            nativeDirectory: skillData.nativeDirectory,
          }),
          marketplaceSkillId: skillData.marketplaceSkillId,
          nativeSkillId: skillData.nativeSkillId,
          nativeDirectory: skillData.nativeDirectory,
          syncOrigin: skillData.syncOrigin ?? getDefaultSyncOrigin(skillData.source ?? 'imported'),
          syncFingerprint: skillData.syncFingerprint,
          lastSyncedAt: skillData.lastSyncedAt,
          lastSyncError: skillData.lastSyncError ?? null,
        };

        // Validate imported skill
        const errors = get().validateSkill(skill);
        if (errors.some((e) => e.severity === 'error')) {
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
        const diagnostics: SkillSyncDiagnostics = {
          added: 0,
          updated: 0,
          skipped: 0,
          conflicted: 0,
        };

        for (const input of skills) {
          const name = toHyphenCase(input.name);
          const existingEntry = Object.entries(newSkills).find(([, value]) => value.metadata.name === name);
          const builtinFingerprint = createBuiltinSkillFingerprint({
            ...input,
            name,
          });

          if (existingEntry && existingEntry[1].source !== 'builtin') {
            diagnostics.conflicted += 1;
            continue;
          }

          if (existingEntry) {
            const [existingId, existingSkill] = existingEntry;
            if (existingSkill.syncFingerprint === builtinFingerprint) {
              diagnostics.skipped += 1;
              continue;
            }

            const metadata: SkillMetadata = {
              name,
              description: input.description,
            };

            newSkills[existingId] = {
              ...existingSkill,
              metadata,
              content: input.content,
              rawContent: generateRawContent(metadata, input.content),
              resources: (input.resources || []).map((resource) => ({
                ...resource,
                size: resource.content?.length || 0,
                mimeType: 'text/plain',
              })),
              category: input.category || existingSkill.category,
              tags: input.tags || [],
              version: input.version || existingSkill.version,
              author: input.author ?? existingSkill.author,
              updatedAt: now,
              canonicalId: `builtin:${name}`,
              syncOrigin: 'builtin',
              syncFingerprint: builtinFingerprint,
              lastSyncedAt: now,
              lastSyncError: null,
            };
            diagnostics.updated += 1;
            continue;
          }

          const id = nanoid();
          const metadata: SkillMetadata = {
            name,
            description: input.description,
          };

          const skill: Skill = {
            id,
            metadata,
            content: input.content,
            rawContent: generateRawContent(metadata, input.content),
            resources: (input.resources || []).map((r) => ({
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
            canonicalId: `builtin:${name}`,
            syncOrigin: 'builtin',
            syncFingerprint: builtinFingerprint,
            lastSyncedAt: now,
            lastSyncError: null,
          };

          newSkills[id] = skill;
          diagnostics.added += 1;
        }

        set({
          skills: newSkills,
          syncDiagnostics: diagnostics,
        });
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
            activeSkillIds: state.activeSkillIds.filter((id) => filteredSkills[id]),
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

      // Bootstrap/sync metadata
      setBootstrapState: (state, error = null) => {
        set((currentState) => ({
          bootstrapState: state,
          lastBootstrapAt: state === 'ready' ? new Date() : currentState.lastBootstrapAt,
          lastBootstrapError: error,
        }));
      },

      setBootstrapPhase: (phase, status, updates) => {
        set((currentState) => ({
          bootstrapPhase: phase,
          bootstrapPhaseStatus: status,
          bootstrapPhaseStartedAt: updates?.startedAt ?? currentState.bootstrapPhaseStartedAt,
          bootstrapPhaseEndedAt: updates?.endedAt ?? currentState.bootstrapPhaseEndedAt,
          bootstrapFailureCode: updates?.errorCode ?? currentState.bootstrapFailureCode,
          bootstrapFailureSeverity: updates?.errorSeverity ?? currentState.bootstrapFailureSeverity,
          bootstrapFailureAffectedSkillIds:
            updates?.affectedSkillIds ?? currentState.bootstrapFailureAffectedSkillIds,
          lastBootstrapError: updates?.errorMessage ?? currentState.lastBootstrapError,
        }));
      },

      appendBootstrapTelemetry: (event) => {
        set((currentState) => ({
          bootstrapTelemetry: [...currentState.bootstrapTelemetry, event],
        }));
      },

      setLastActivationJournal: (journal) => {
        set({ lastActivationJournal: journal });
      },

      setSyncMetadata: (updates) => {
        set((currentState) => ({
          ...updates,
          syncDiagnostics: updates.syncDiagnostics ?? currentState.syncDiagnostics,
        }));
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'cognia-skills-storage',
      version: 4,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState ?? {}) as Record<string, unknown>;

        if (!state.usageStats || typeof state.usageStats !== 'object') {
          state.usageStats = {};
        }
        if (!state.skills || typeof state.skills !== 'object') {
          state.skills = {};
        }

        if (!state.activeSkillIds || !Array.isArray(state.activeSkillIds)) {
          state.activeSkillIds = [];
        }

        if (version <= 1) {
          const migratedSkills: Record<string, Skill> = {};
          const rawSkills = state.skills as Record<string, Skill>;

          for (const [id, skill] of Object.entries(rawSkills)) {
            const normalizedName = toHyphenCase(skill.metadata?.name ?? '');
            const source = skill.source ?? 'custom';
            const syncOrigin = skill.syncOrigin ?? getDefaultSyncOrigin(source);
            const canonicalId = skill.canonicalId ?? buildCanonicalSkillId({
              source,
              metadata: { name: normalizedName },
              marketplaceSkillId: skill.marketplaceSkillId,
              nativeSkillId: skill.nativeSkillId,
              nativeDirectory: skill.nativeDirectory,
            });

            migratedSkills[id] = {
              ...skill,
              metadata: {
                ...skill.metadata,
                name: normalizedName,
              },
              canonicalId,
              marketplaceSkillId:
                skill.marketplaceSkillId
                ?? (typeof canonicalId === 'string' && canonicalId.startsWith('marketplace:')
                  ? canonicalId.slice('marketplace:'.length)
                  : undefined),
              syncOrigin,
              nativeDirectory: skill.nativeDirectory ?? (source === 'imported' ? normalizedName : undefined),
              syncFingerprint: skill.syncFingerprint
                ?? (source === 'builtin'
                  ? createBuiltinSkillFingerprint({
                    name: normalizedName,
                    description: skill.metadata?.description ?? '',
                    content: skill.content ?? '',
                    version: skill.version,
                  })
                  : undefined),
              lastSyncError: skill.lastSyncError ?? null,
            };
          }

          state.skills = migratedSkills;
          state.bootstrapState = 'idle';
          state.lastBootstrapAt = null;
          state.lastBootstrapError = null;
          state.syncState = 'idle';
          state.lastSyncAt = null;
          state.lastSyncDirection = null;
          state.lastSyncOutcome = 'idle';
          state.lastSyncError = null;
          state.syncDiagnostics = {
            added: 0,
            updated: 0,
            skipped: 0,
            conflicted: 0,
          };
        }

        if (version <= 2) {
          state.bootstrapPhase = 'idle';
          state.bootstrapPhaseStatus = 'idle';
          state.bootstrapPhaseStartedAt = null;
          state.bootstrapPhaseEndedAt = null;
          state.bootstrapTelemetry = [];
          state.bootstrapFailureSeverity = null;
          state.bootstrapFailureCode = null;
          state.bootstrapFailureAffectedSkillIds = [];
          state.lastActivationJournal = null;
        }

        if (version <= 3) {
          const rawSkills = state.skills as Record<string, Skill>;
          const upgradedSkills: Record<string, Skill> = {};

          for (const [id, skill] of Object.entries(rawSkills)) {
            const canonicalId = skill.canonicalId;
            upgradedSkills[id] = {
              ...skill,
              marketplaceSkillId:
                skill.marketplaceSkillId
                ?? (typeof canonicalId === 'string' && canonicalId.startsWith('marketplace:')
                  ? canonicalId.slice('marketplace:'.length)
                  : undefined),
            };
          }

          state.skills = upgradedSkills;
        }
        return state;
      },
      partialize: (state) => ({
        skills: state.skills,
        usageStats: state.usageStats,
        activeSkillIds: state.activeSkillIds,
        bootstrapState: state.bootstrapState,
        lastBootstrapAt: state.lastBootstrapAt,
        lastBootstrapError: state.lastBootstrapError,
        bootstrapPhase: state.bootstrapPhase,
        bootstrapPhaseStatus: state.bootstrapPhaseStatus,
        bootstrapPhaseStartedAt: state.bootstrapPhaseStartedAt,
        bootstrapPhaseEndedAt: state.bootstrapPhaseEndedAt,
        bootstrapTelemetry: state.bootstrapTelemetry,
        bootstrapFailureSeverity: state.bootstrapFailureSeverity,
        bootstrapFailureCode: state.bootstrapFailureCode,
        bootstrapFailureAffectedSkillIds: state.bootstrapFailureAffectedSkillIds,
        lastActivationJournal: state.lastActivationJournal,
        syncState: state.syncState,
        lastSyncAt: state.lastSyncAt,
        lastSyncDirection: state.lastSyncDirection,
        lastSyncOutcome: state.lastSyncOutcome,
        lastSyncError: state.lastSyncError,
        syncDiagnostics: state.syncDiagnostics,
      }),
    }
  )
);

// Selectors
export const selectAllSkills = (state: SkillState) => Object.values(state.skills);
export const selectActiveSkills = (state: SkillState) =>
  state.activeSkillIds.map((id) => state.skills[id]).filter((s): s is Skill => s !== undefined);
export const selectEnabledSkills = (state: SkillState) =>
  Object.values(state.skills).filter((s) => s.status === 'enabled');
export const selectSkillById = (id: string) => (state: SkillState) => state.skills[id];
export const selectSkillsByCategory = (category: SkillCategory) => (state: SkillState) =>
  Object.values(state.skills).filter((s) => s.category === category);
export const selectIsLoading = (state: SkillState) => state.isLoading;
export const selectError = (state: SkillState) => state.error;
export const selectBootstrapState = (state: SkillState) => state.bootstrapState;
export const selectLastBootstrapError = (state: SkillState) => state.lastBootstrapError;
export const selectBootstrapPhase = (state: SkillState) => state.bootstrapPhase;
export const selectBootstrapPhaseStatus = (state: SkillState) => state.bootstrapPhaseStatus;
export const selectBootstrapTelemetry = (state: SkillState) => state.bootstrapTelemetry;
export const selectBootstrapFailureSeverity = (state: SkillState) => state.bootstrapFailureSeverity;
export const selectBootstrapFailureCode = (state: SkillState) => state.bootstrapFailureCode;
export const selectLastActivationJournal = (state: SkillState) => state.lastActivationJournal;
export const selectSyncState = (state: SkillState) => state.syncState;
export const selectLastSyncOutcome = (state: SkillState) => state.lastSyncOutcome;
export const selectLastSyncError = (state: SkillState) => state.lastSyncError;
export const selectSyncDiagnostics = (state: SkillState) => state.syncDiagnostics;
