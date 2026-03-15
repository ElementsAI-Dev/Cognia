/**
 * Prompt Template Store - manages reusable prompt templates across chat, workflows, MCP, and IDE rules
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { McpPrompt } from '@/types/mcp';
import {
  type PromptTemplate,
  type PromptTemplateDraftSession,
  type PromptTemplateVersion,
  type PromptFeedback,
  type PromptTemplateStats,
  type PromptABTest,
  type PromptOptimizationHistory,
  type OptimizationRecommendation,
  type CreatePromptTemplateInput,
  type UpdatePromptTemplateInput,
  type PromptTemplateImportOptions,
  type PromptTemplateImportReport,
  type PromptTemplateImportStrategy,
  type PromptTemplateMutationDecision,
  type PromptTemplateOperationCode,
  type PromptTemplateOperationError,
  type PromptTemplateOperationResult,
  type PromptTemplateOperationState,
  DEFAULT_PROMPT_TEMPLATE_CATEGORIES,
  DEFAULT_PROMPT_TEMPLATES,
  NEW_PROMPT_TEMPLATE_DRAFT_SESSION_ID,
} from '@/types/content/prompt-template';
import {
  createOptimizationHistoryEntry,
  generateOptimizationRecommendations,
  getTopOptimizationCandidates,
} from '@/lib/ai/prompts/prompt-self-optimizer';
import { loggers } from '@/lib/logger';

const log = loggers.store;

import { buildTemplateVariables } from '@/lib/prompts/template-utils';
import { buildPromptTemplateIdentity } from '@/lib/prompts/prompt-template-identity';
import { validatePromptTemplateInput } from '@/lib/prompts/prompt-template-validation';
import {
  derivePromptWorkflowState,
} from '@/lib/prompts/marketplace-utils';

interface PromptTemplateState {
  templates: PromptTemplate[];
  categories: string[];
  selectedTemplateId: string | null;
  isInitialized: boolean;
  operationStates: Record<string, PromptTemplateOperationState>;
  draftSessions: Record<string, PromptTemplateDraftSession>;

  // Feedback & A/B Testing state
  feedback: Record<string, PromptFeedback[]>;
  abTests: Record<string, PromptABTest>;
  optimizationHistory: Record<string, PromptOptimizationHistory[]>;

  initializeDefaults: () => void;
  createTemplate: (
    input: CreatePromptTemplateInput
  ) => PromptTemplateOperationResult<PromptTemplate>;
  updateTemplate: (
    id: string,
    input: UpdatePromptTemplateInput
  ) => PromptTemplateOperationResult<{
    template: PromptTemplate;
    action: 'updated' | 'forked';
    sourceId?: string;
  }>;
  deleteTemplate: (id: string) => PromptTemplateOperationResult<{ deletedId: string }>;
  duplicateTemplate: (id: string) => PromptTemplateOperationResult<PromptTemplate>;
  selectTemplate: (id: string | null) => void;
  recordUsage: (id: string) => void;

  getTemplate: (id: string) => PromptTemplate | undefined;
  searchTemplates: (query: string) => PromptTemplate[];
  getTemplatesByCategory: (category: string) => PromptTemplate[];
  getTemplatesByTags: (tags: string[]) => PromptTemplate[];
  getOperationState: (operationKey: string) => PromptTemplateOperationState | undefined;
  clearOperationState: (operationKey: string) => void;
  saveDraftSession: (
    id: string,
    snapshot: CreatePromptTemplateInput,
    origin: PromptTemplateDraftSession['origin']
  ) => void;
  getDraftSession: (id: string) => PromptTemplateDraftSession | undefined;
  restoreDraftSession: (id: string) => PromptTemplateDraftSession | undefined;
  discardDraftSession: (id: string) => void;
  pruneDraftSessions: (now?: Date) => void;

  importTemplates: (
    payload: string | PromptTemplate[],
    options?: PromptTemplateImportOptions
  ) => PromptTemplateImportReport;
  exportTemplates: (ids?: string[]) => PromptTemplateOperationResult<{ json: string; count: number }>;

  syncFromMcpPrompts: (serverId: string, prompts: McpPrompt[]) => void;

  // Version History
  saveVersion: (id: string, changelog?: string) => PromptTemplateVersion | null;
  restoreVersion: (
    id: string,
    versionId: string
  ) => PromptTemplateOperationResult<{ template: PromptTemplate; restoredVersionId: string }>;
  getVersionHistory: (id: string) => PromptTemplateVersion[];

  // Feedback & Stats
  recordFeedback: (
    templateId: string,
    feedback: Omit<PromptFeedback, 'id' | 'templateId' | 'createdAt'>
  ) => void;
  getFeedback: (templateId: string) => PromptFeedback[];
  getStats: (templateId: string) => PromptTemplateStats;

  // A/B Testing
  startABTest: (
    templateId: string,
    variantContent: string,
    hypothesis: string
  ) => PromptABTest | null;
  recordABTestResult: (
    templateId: string,
    variant: 'A' | 'B',
    success: boolean,
    rating?: number
  ) => void;
  getActiveABTest: (templateId: string) => PromptABTest | null;
  completeABTest: (templateId: string) => PromptABTest | null;

  // Optimization
  markAsOptimized: (id: string, optimizedContent: string, suggestions?: string[]) => void;

  // Optimization History & Recommendations
  recordOptimization: (
    templateId: string,
    originalContent: string,
    optimizedContent: string,
    suggestions: string[],
    style?: string,
    appliedBy?: 'user' | 'auto'
  ) => void;
  getOptimizationHistory: (templateId: string) => PromptOptimizationHistory[];
  getRecommendations: () => OptimizationRecommendation[];
  getTopCandidates: (
    limit?: number
  ) => Array<{ template: PromptTemplate; score: number; reasons: string[] }>;
}

function withTimestamps(template: Omit<PromptTemplate, 'createdAt' | 'updatedAt'>): PromptTemplate {
  const now = new Date();
  return {
    ...template,
    createdAt: now,
    updatedAt: now,
  };
}

function hydrateTemplate(raw: PromptTemplate): PromptTemplate {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    lastUsedAt: raw.lastUsedAt ? new Date(raw.lastUsedAt) : undefined,
  };
}

function calculateStats(feedbackList: PromptFeedback[]): PromptTemplateStats {
  if (feedbackList.length === 0) {
    return {
      totalUses: 0,
      successfulUses: 0,
      averageRating: 0,
      ratingCount: 0,
      optimizationCount: 0,
    };
  }

  const totalUses = feedbackList.length;
  const successfulUses = feedbackList.filter(
    (f) => f.effectiveness === 'excellent' || f.effectiveness === 'good'
  ).length;

  const ratingSum = feedbackList.reduce((sum, f) => sum + f.rating, 0);
  const avgResponseTime = feedbackList
    .filter((f) => f.context?.responseTime)
    .reduce((sum, f, _, arr) => sum + (f.context?.responseTime || 0) / arr.length, 0);

  return {
    totalUses,
    successfulUses,
    averageRating: ratingSum / totalUses,
    ratingCount: totalUses,
    averageResponseTime: avgResponseTime > 0 ? avgResponseTime : undefined,
    optimizationCount: 0,
  };
}

const MAX_VERSION_HISTORY = 50;
const DEFAULT_IMPORT_STRATEGY: PromptTemplateImportStrategy = 'skip';
const MAX_DRAFT_SESSIONS = 10;
const STALE_DRAFT_MS = 30 * 24 * 60 * 60 * 1000;

function createOperationState(
  status: PromptTemplateOperationState['status'],
  code?: PromptTemplateOperationCode,
  message?: string
): PromptTemplateOperationState {
  return {
    status,
    code,
    message,
    updatedAt: new Date(),
  };
}

function okResult<TData>(
  data: TData,
  message?: string,
  code: PromptTemplateOperationCode = 'OK'
): PromptTemplateOperationResult<TData> {
  return {
    ok: true,
    code,
    message,
    data,
  };
}

function errorResult<TData = undefined>(
  code: PromptTemplateOperationCode,
  message: string,
  errors?: PromptTemplateOperationError[]
): PromptTemplateOperationResult<TData> {
  return {
    ok: false,
    code,
    message,
    errors,
  };
}

function deriveMutationDecision(template: PromptTemplate): PromptTemplateMutationDecision {
  if (template.meta?.marketplace?.marketplaceId) {
    return {
      policy: 'restricted-update',
      reason: 'marketplace-linked',
    };
  }

  if (template.source === 'builtin') {
    return {
      policy: 'fork-on-update',
      reason: 'builtin',
    };
  }

  if (template.source === 'mcp') {
    return {
      policy: 'fork-on-update',
      reason: 'mcp',
    };
  }

  if (template.source === 'imported') {
    return {
      policy: 'direct-update',
      reason: 'imported',
    };
  }

  return {
    policy: 'direct-update',
    reason: 'user-owned',
  };
}

function ensureForkName(baseName: string): string {
  return /\(custom\)$/i.test(baseName) ? baseName : `${baseName} (Custom)`;
}

function pruneVersionHistory(history: PromptTemplateVersion[]): PromptTemplateVersion[] {
  if (history.length <= MAX_VERSION_HISTORY) return history;
  return history.slice(history.length - MAX_VERSION_HISTORY);
}

function deriveDraftSessionReadiness(
  id: string,
  snapshot: CreatePromptTemplateInput,
  fallbackTemplate?: PromptTemplate
) {
  const template: PromptTemplate = {
    id,
    name: snapshot.name ?? fallbackTemplate?.name ?? '',
    description: snapshot.description ?? fallbackTemplate?.description,
    content: snapshot.content ?? fallbackTemplate?.content ?? '',
    category: snapshot.category ?? fallbackTemplate?.category,
    tags: snapshot.tags ?? fallbackTemplate?.tags ?? [],
    variables: snapshot.variables ?? fallbackTemplate?.variables ?? [],
    targets: snapshot.targets ?? fallbackTemplate?.targets ?? ['chat'],
    source: snapshot.source ?? fallbackTemplate?.source ?? 'user',
    meta: snapshot.meta ?? fallbackTemplate?.meta,
    usageCount: fallbackTemplate?.usageCount ?? 0,
    createdAt: fallbackTemplate?.createdAt ?? new Date(),
    updatedAt: new Date(),
  };

  const workflow = derivePromptWorkflowState({ template });
  return workflow.publishReadiness;
}

function withDerivedWorkflow(template: PromptTemplate): PromptTemplate {
  const workflow = derivePromptWorkflowState({ template });
  if (!template.meta?.marketplace) {
    return template;
  }

  return {
    ...template,
    meta: {
      ...template.meta,
      marketplace: {
        ...template.meta.marketplace,
        syncStatus: workflow.syncStatus,
      },
    },
  };
}

function hydrateDraftSession(raw: PromptTemplateDraftSession): PromptTemplateDraftSession {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    lastRecoveredAt: raw.lastRecoveredAt ? new Date(raw.lastRecoveredAt) : undefined,
  };
}

function pruneDraftSessionMap(
  draftSessions: Record<string, PromptTemplateDraftSession>,
  now: Date = new Date()
): Record<string, PromptTemplateDraftSession> {
  const validEntries = Object.entries(draftSessions)
    .filter(([, session]) => now.getTime() - new Date(session.updatedAt).getTime() <= STALE_DRAFT_MS)
    .sort(
      (a, b) =>
        new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime()
    )
    .slice(0, MAX_DRAFT_SESSIONS);

  return Object.fromEntries(validEntries);
}

export const usePromptTemplateStore = create<PromptTemplateState>()(
  persist(
    (set, get) => ({
      templates: [],
      categories: DEFAULT_PROMPT_TEMPLATE_CATEGORIES,
      selectedTemplateId: null,
      isInitialized: false,
      operationStates: {},
      draftSessions: {},
      feedback: {},
      abTests: {},
      optimizationHistory: {},

      initializeDefaults: () => {
        const { isInitialized, templates } = get();
        if (isInitialized || templates.length > 0) return;

        const defaults = DEFAULT_PROMPT_TEMPLATES.map((tpl) =>
          withTimestamps({
            ...tpl,
            id: nanoid(),
          })
        );

        set({
          templates: defaults,
          selectedTemplateId: defaults[0]?.id ?? null,
          isInitialized: true,
        });
      },

      createTemplate: (input) => {
        set((state) => ({
          operationStates: {
            ...state.operationStates,
            create: createOperationState('running'),
          },
        }));
        const validation = validatePromptTemplateInput(input);
        if (!validation.isValid) {
          set((state) => ({
            operationStates: {
              ...state.operationStates,
              create: createOperationState('error', 'VALIDATION_FAILED', validation.errors[0]?.message),
            },
          }));
          return errorResult('VALIDATION_FAILED', 'Template creation failed validation.', validation.errors);
        }

        const now = new Date();
        const template: PromptTemplate = withDerivedWorkflow({
          id: nanoid(),
          name: input.name.trim(),
          description: input.description,
          content: input.content,
          category: input.category,
          tags: input.tags ?? [],
          variables: buildTemplateVariables(input.content, input.variables),
          targets: input.targets ?? ['chat'],
          source: input.source ?? 'user',
          meta: input.meta,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        });

        set((state) => ({
          templates: [...state.templates, template],
          selectedTemplateId: template.id,
          draftSessions: Object.fromEntries(
            Object.entries(state.draftSessions).filter(
              ([key]) => key !== NEW_PROMPT_TEMPLATE_DRAFT_SESSION_ID
            )
          ),
          operationStates: {
            ...state.operationStates,
            create: createOperationState('success', 'OK'),
          },
        }));
        return okResult(template, 'Template created.');
      },

      updateTemplate: (id, input) => {
        set((state) => ({
          operationStates: {
            ...state.operationStates,
            update: createOperationState('running'),
          },
        }));
        const existing = get().templates.find((tpl) => tpl.id === id);
        if (!existing) {
          const result = errorResult<{ template: PromptTemplate; action: 'updated' | 'forked' }>(
            'TEMPLATE_NOT_FOUND',
            'Template not found.'
          );
          set((state) => ({
            operationStates: {
              ...state.operationStates,
              update: createOperationState('error', result.code, result.message),
            },
          }));
          return result;
        }

        const validation = validatePromptTemplateInput(input, { allowPartial: true });
        if (!validation.isValid) {
          const result = errorResult<{ template: PromptTemplate; action: 'updated' | 'forked' }>(
            'VALIDATION_FAILED',
            'Template update failed validation.',
            validation.errors
          );
          set((state) => ({
            operationStates: {
              ...state.operationStates,
              update: createOperationState('error', result.code, result.message),
            },
          }));
          return result;
        }

        const mutationDecision = deriveMutationDecision(existing);
        if (mutationDecision.policy === 'fork-on-update') {
          const now = new Date();
          const nextContent = input.content ?? existing.content;
          const forked: PromptTemplate = withDerivedWorkflow({
            ...existing,
            ...input,
            id: nanoid(),
            name: ensureForkName(input.name?.trim() || existing.name),
            content: nextContent,
            tags: input.tags ?? existing.tags,
            variables: buildTemplateVariables(nextContent, input.variables ?? existing.variables),
            source: 'user',
            usageCount: 0,
            lastUsedAt: undefined,
            createdAt: now,
            updatedAt: now,
          });

          set((state) => ({
            templates: [...state.templates, forked],
            selectedTemplateId: forked.id,
            draftSessions: Object.fromEntries(
              Object.entries(state.draftSessions).filter(([key]) => key !== id)
            ),
            operationStates: {
              ...state.operationStates,
              update: createOperationState('success', 'SOURCE_GUARDED', 'Source template forked.'),
            },
          }));

          return okResult(
            { template: forked, action: 'forked', sourceId: existing.id },
            'Source template forked into a user-owned template.',
            'SOURCE_GUARDED'
          );
        }

        let updatedTemplate: PromptTemplate | undefined;
        set((state) => ({
          templates: state.templates.map((tpl) => {
            if (tpl.id !== id) return tpl;
            const nextContent = input.content ?? tpl.content;
            updatedTemplate = {
              ...tpl,
              ...input,
              name: input.name?.trim() || tpl.name,
              tags: input.tags ?? tpl.tags,
              variables: buildTemplateVariables(nextContent, input.variables ?? tpl.variables),
              content: nextContent,
              source: mutationDecision.policy === 'restricted-update' ? tpl.source : (input.source ?? tpl.source),
              meta:
                mutationDecision.policy === 'restricted-update'
                  ? {
                      ...input.meta,
                      marketplace: tpl.meta?.marketplace,
                    }
                  : (input.meta ?? tpl.meta),
              updatedAt: new Date(),
            };
            updatedTemplate = withDerivedWorkflow(updatedTemplate);
            return updatedTemplate;
          }),
          draftSessions: Object.fromEntries(
            Object.entries(state.draftSessions).filter(([key]) => key !== id)
          ),
          operationStates: {
            ...state.operationStates,
            update: createOperationState('success', 'OK'),
          },
        }));

        if (!updatedTemplate) {
          const result = errorResult<{ template: PromptTemplate; action: 'updated' | 'forked' }>(
            'TEMPLATE_NOT_FOUND',
            'Template not found.'
          );
          set((state) => ({
            operationStates: {
              ...state.operationStates,
              update: createOperationState('error', result.code, result.message),
            },
          }));
          return result;
        }

        return okResult({ template: updatedTemplate, action: 'updated' }, 'Template updated.');
      },

      deleteTemplate: (id) => {
        set((state) => ({
          operationStates: {
            ...state.operationStates,
            delete: createOperationState('running'),
          },
        }));
        const template = get().templates.find((tpl) => tpl.id === id);
        if (!template) {
          const result = errorResult<{ deletedId: string }>('TEMPLATE_NOT_FOUND', 'Template not found.');
          set((state) => ({
            operationStates: {
              ...state.operationStates,
              delete: createOperationState('error', result.code, result.message),
            },
          }));
          return result;
        }

        set((state) => ({
          templates: state.templates.filter((tpl) => tpl.id !== id),
          selectedTemplateId: state.selectedTemplateId === id ? null : state.selectedTemplateId,
          draftSessions: Object.fromEntries(
            Object.entries(state.draftSessions).filter(([key]) => key !== id)
          ),
          operationStates: {
            ...state.operationStates,
            delete: createOperationState('success', 'OK'),
          },
        }));
        return okResult({ deletedId: id }, 'Template deleted.');
      },

      duplicateTemplate: (id) => {
        set((state) => ({
          operationStates: {
            ...state.operationStates,
            duplicate: createOperationState('running'),
          },
        }));
        const found = get().templates.find((tpl) => tpl.id === id);
        if (!found) {
          const result = errorResult<PromptTemplate>('TEMPLATE_NOT_FOUND', 'Template not found.');
          set((state) => ({
            operationStates: {
              ...state.operationStates,
              duplicate: createOperationState('error', result.code, result.message),
            },
          }));
          return result;
        }

        const duplicate = withTimestamps({
          ...found,
          id: nanoid(),
          name: `${found.name} (Copy)`,
          usageCount: 0,
          lastUsedAt: undefined,
          source: 'user',
        });

        set((state) => ({
          templates: [...state.templates, duplicate],
          selectedTemplateId: duplicate.id,
          operationStates: {
            ...state.operationStates,
            duplicate: createOperationState('success', 'OK'),
          },
        }));
        return okResult(duplicate, 'Template duplicated.');
      },

      selectTemplate: (id) => {
        set({ selectedTemplateId: id });
      },

      recordUsage: (id) => {
        set((state) => ({
          templates: state.templates.map((tpl) =>
            tpl.id === id
              ? {
                  ...tpl,
                  usageCount: tpl.usageCount + 1,
                  lastUsedAt: new Date(),
                }
              : tpl
          ),
        }));
      },

      getTemplate: (id) => get().templates.find((tpl) => tpl.id === id),

      searchTemplates: (query) => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return get().templates;

        return get().templates.filter((tpl) => {
          const haystack = [tpl.name, tpl.description ?? '', tpl.category ?? '', tpl.tags.join(' ')]
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalized);
        });
      },

      getTemplatesByCategory: (category) => {
        return get().templates.filter((tpl) => tpl.category === category);
      },

      getTemplatesByTags: (tags) => {
        if (tags.length === 0) return get().templates;
        const setTags = new Set(tags.map((t) => t.toLowerCase()));
        return get().templates.filter((tpl) =>
          tpl.tags.some((tag) => setTags.has(tag.toLowerCase()))
        );
      },

      getOperationState: (operationKey) => get().operationStates[operationKey],

      clearOperationState: (operationKey) => {
        set((state) => {
          const next = { ...state.operationStates };
          delete next[operationKey];
          return { operationStates: next };
        });
      },

      saveDraftSession: (id, snapshot, origin) => {
        const fallbackTemplate = get().getTemplate(id);
        const session: PromptTemplateDraftSession = {
          id,
          templateId: id,
          origin,
          snapshot,
          dirty: true,
          publishReadiness: deriveDraftSessionReadiness(id, snapshot, fallbackTemplate),
          createdAt: get().draftSessions[id]?.createdAt ?? new Date(),
          updatedAt: new Date(),
          lastRecoveredAt: get().draftSessions[id]?.lastRecoveredAt,
        };

        set((state) => ({
          draftSessions: pruneDraftSessionMap({
            ...state.draftSessions,
            [id]: session,
          }),
        }));
      },

      getDraftSession: (id) => get().draftSessions[id],

      restoreDraftSession: (id) => {
        const session = get().draftSessions[id];
        if (!session) return undefined;

        const restoredSession = {
          ...session,
          lastRecoveredAt: new Date(),
        };
        set((state) => ({
          draftSessions: {
            ...state.draftSessions,
            [id]: restoredSession,
          },
        }));
        return restoredSession;
      },

      discardDraftSession: (id) => {
        set((state) => ({
          draftSessions: Object.fromEntries(
            Object.entries(state.draftSessions).filter(([key]) => key !== id)
          ),
        }));
      },

      pruneDraftSessions: (now = new Date()) => {
        set((state) => ({
          draftSessions: pruneDraftSessionMap(state.draftSessions, now),
        }));
      },

      importTemplates: (payload, options) => {
        const strategy = options?.strategy ?? DEFAULT_IMPORT_STRATEGY;
        set((state) => ({
          operationStates: {
            ...state.operationStates,
            import: createOperationState('running'),
          },
        }));
        const data = typeof payload === 'string' ? safeParse(payload) : payload;
        const report: PromptTemplateImportReport = {
          success: true,
          strategy,
          imported: 0,
          overwritten: 0,
          duplicated: 0,
          skipped: 0,
          failed: 0,
          items: [],
        };

        if (!Array.isArray(data)) {
          report.success = false;
          report.failed = 1;
          report.items.push({
            status: 'failed',
            code: 'INVALID_PAYLOAD',
            message: 'Import payload is not a valid template array.',
          });
          set((state) => ({
            operationStates: {
              ...state.operationStates,
              import: createOperationState('error', 'INVALID_PAYLOAD', 'Import payload is invalid.'),
            },
          }));
          return report;
        }

        let nextTemplates = [...get().templates];
        for (const rawTemplate of data) {
          const normalized = normalizeImportedTemplate(rawTemplate);
          const inputName =
            rawTemplate && typeof rawTemplate === 'object' && 'name' in rawTemplate
              ? String((rawTemplate as { name?: string }).name ?? '')
              : undefined;

          if (!normalized) {
            report.failed += 1;
            report.success = false;
            report.items.push({
              inputName,
              status: 'failed',
              code: 'VALIDATION_FAILED',
              message: 'Template is missing required fields.',
            });
            continue;
          }

          const conflict = findTemplateConflict(nextTemplates, normalized);
          if (!conflict) {
            nextTemplates.push(withDerivedWorkflow(normalized));
            report.imported += 1;
            report.items.push({
              inputName: normalized.name,
              templateId: normalized.id,
              status: 'imported',
              code: 'OK',
              message: 'Template imported.',
            });
            continue;
          }

          if (strategy === 'skip') {
            report.skipped += 1;
            report.items.push({
              inputName: normalized.name,
              existingTemplateId: conflict.id,
              status: 'skipped',
              code: 'CONFLICT_SKIPPED',
              message: 'Conflict detected and skipped by strategy.',
            });
            continue;
          }

          if (strategy === 'duplicate') {
            const duplicate = withDerivedWorkflow(withTimestamps({
              ...normalized,
              id: nanoid(),
              name: `${normalized.name} (Imported)`,
            }));
            nextTemplates.push(duplicate);
            report.duplicated += 1;
            report.items.push({
              inputName: normalized.name,
              templateId: duplicate.id,
              existingTemplateId: conflict.id,
              status: 'duplicated',
              code: 'CONFLICT_DUPLICATED',
              message: 'Conflict detected; imported as duplicate.',
            });
            continue;
          }

          const snapshot: PromptTemplateVersion = {
            id: nanoid(),
            version: (conflict.currentVersion || 0) + 1,
            content: conflict.content,
            variables: [...conflict.variables],
            changelog: 'Snapshot before overwrite import',
            createdAt: new Date(),
          };

          nextTemplates = nextTemplates.map((tpl) => {
            if (tpl.id !== conflict.id) return tpl;
            return withDerivedWorkflow({
              ...tpl,
              ...normalized,
              id: tpl.id,
              name: normalized.name.trim(),
              source: tpl.source,
              meta: {
                ...normalized.meta,
                marketplace: tpl.meta?.marketplace ?? normalized.meta?.marketplace,
              },
              tags: normalized.tags,
              variables: buildTemplateVariables(normalized.content, normalized.variables),
              usageCount: tpl.usageCount,
              createdAt: tpl.createdAt,
              lastUsedAt: tpl.lastUsedAt,
              stats: tpl.stats,
              updatedAt: new Date(),
              versionHistory: pruneVersionHistory([...(tpl.versionHistory || []), snapshot]),
              currentVersion: snapshot.version,
            });
          });

          report.overwritten += 1;
          report.items.push({
            inputName: normalized.name,
            templateId: conflict.id,
            existingTemplateId: conflict.id,
            status: 'overwritten',
            code: 'CONFLICT_OVERWRITTEN',
            message: 'Conflict detected and overwritten by strategy.',
          });
        }

        set((state) => ({
          templates: nextTemplates,
          operationStates: {
            ...state.operationStates,
            import: createOperationState(
              report.failed > 0 ? 'error' : 'success',
              report.failed > 0 ? 'VALIDATION_FAILED' : 'OK',
              report.failed > 0 ? 'Import completed with failures.' : 'Import completed.'
            ),
          },
        }));
        return report;
      },

      exportTemplates: (ids) => {
        set((state) => ({
          operationStates: {
            ...state.operationStates,
            export: createOperationState('running'),
          },
        }));
        const list =
          ids && ids.length > 0
            ? get().templates.filter((tpl) => ids.includes(tpl.id))
            : get().templates;

        const json = JSON.stringify(
          list.map((tpl) => ({
            ...tpl,
            createdAt: tpl.createdAt.toISOString(),
            updatedAt: tpl.updatedAt.toISOString(),
            lastUsedAt: tpl.lastUsedAt?.toISOString(),
          })),
          null,
          2
        );
        set((state) => ({
          operationStates: {
            ...state.operationStates,
            export: createOperationState('success', 'OK'),
          },
        }));
        return okResult({ json, count: list.length }, 'Templates exported.');
      },

      syncFromMcpPrompts: (serverId, prompts) => {
        if (!prompts || prompts.length === 0) return;
        const now = new Date();
        const incoming = prompts.map<PromptTemplate>((prompt) => ({
          id: nanoid(),
          name: prompt.name,
          description: prompt.description,
          content: '',
          category: 'mcp',
          tags: ['mcp', serverId],
          variables: (prompt.arguments || []).map((arg) => ({
            name: arg.name,
            description: arg.description,
            required: arg.required,
            type: 'text',
          })),
          targets: ['mcp', 'chat'],
          source: 'mcp',
          meta: {
            mcp: {
              serverId,
              promptName: prompt.name,
            },
          },
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        }));

        set((state) => ({ templates: dedupeTemplates([...state.templates, ...incoming]) }));
      },

      // Version History
      saveVersion: (id, changelog) => {
        const template = get().templates.find((t) => t.id === id);
        if (!template) return null;

        const version: PromptTemplateVersion = {
          id: nanoid(),
          version: (template.currentVersion || 0) + 1,
          content: template.content,
          variables: [...template.variables],
          changelog,
          createdAt: new Date(),
        };

        set((state) => ({
          templates: state.templates.map((tpl) =>
            tpl.id === id
              ? {
                  ...tpl,
                  versionHistory: pruneVersionHistory([...(tpl.versionHistory || []), version]),
                  currentVersion: version.version,
                  updatedAt: new Date(),
                }
              : tpl
          ),
        }));

        return version;
      },

      restoreVersion: (id, versionId) => {
        set((state) => ({
          operationStates: {
            ...state.operationStates,
            restore: createOperationState('running'),
          },
        }));
        const template = get().templates.find((t) => t.id === id);
        if (!template || !template.versionHistory) {
          const result = errorResult<{ template: PromptTemplate; restoredVersionId: string }>(
            'TEMPLATE_NOT_FOUND',
            'Template not found.'
          );
          set((state) => ({
            operationStates: {
              ...state.operationStates,
              restore: createOperationState('error', result.code, result.message),
            },
          }));
          return result;
        }

        const version = template.versionHistory.find((v) => v.id === versionId);
        if (!version) {
          const result = errorResult<{ template: PromptTemplate; restoredVersionId: string }>(
            'VERSION_NOT_FOUND',
            'Version not found.'
          );
          set((state) => ({
            operationStates: {
              ...state.operationStates,
              restore: createOperationState('error', result.code, result.message),
            },
          }));
          return result;
        }

        // Save current state as a new version before restoring
        get().saveVersion(id, `Auto-saved before restoring to v${version.version}`);

        let restoredTemplate: PromptTemplate | undefined;
        set((state) => ({
          templates: state.templates.map((tpl) =>
            tpl.id === id
              ? ((restoredTemplate = withDerivedWorkflow({
                  ...tpl,
                  content: version.content,
                  variables: [...version.variables],
                  updatedAt: new Date(),
                })),
                restoredTemplate)
              : tpl
          ),
          draftSessions: Object.fromEntries(
            Object.entries(state.draftSessions).filter(([key]) => key !== id)
          ),
          operationStates: {
            ...state.operationStates,
            restore: createOperationState('success', 'OK'),
          },
        }));

        if (!restoredTemplate) {
          const result = errorResult<{ template: PromptTemplate; restoredVersionId: string }>(
            'TEMPLATE_NOT_FOUND',
            'Template not found.'
          );
          set((state) => ({
            operationStates: {
              ...state.operationStates,
              restore: createOperationState('error', result.code, result.message),
            },
          }));
          return result;
        }

        return okResult(
          { template: restoredTemplate, restoredVersionId: versionId },
          'Template restored.'
        );
      },

      getVersionHistory: (id) => {
        const template = get().templates.find((t) => t.id === id);
        return template?.versionHistory || [];
      },

      // Feedback & Stats
      recordFeedback: (templateId, feedbackInput) => {
        const feedback: PromptFeedback = {
          id: nanoid(),
          templateId,
          ...feedbackInput,
          createdAt: new Date(),
        };

        set((state) => ({
          feedback: {
            ...state.feedback,
            [templateId]: [...(state.feedback[templateId] || []), feedback],
          },
        }));

        // Update template stats
        const allFeedback = [...(get().feedback[templateId] || []), feedback];
        const stats = calculateStats(allFeedback);

        set((state) => ({
          templates: state.templates.map((tpl) =>
            tpl.id === templateId ? { ...tpl, stats } : tpl
          ),
        }));
      },

      getFeedback: (templateId) => {
        return get().feedback[templateId] || [];
      },

      getStats: (templateId) => {
        const feedbackList = get().feedback[templateId] || [];
        return calculateStats(feedbackList);
      },

      // A/B Testing
      startABTest: (templateId, variantContent, hypothesis) => {
        const template = get().templates.find((t) => t.id === templateId);
        if (!template) return null;

        const abTest: PromptABTest = {
          id: nanoid(),
          templateId,
          hypothesis,
          variantA: {
            content: template.content,
            uses: 0,
            successRate: 0,
            averageRating: 0,
          },
          variantB: {
            content: variantContent,
            uses: 0,
            successRate: 0,
            averageRating: 0,
          },
          status: 'running',
          startedAt: new Date(),
          minSampleSize: 50,
        };

        set((state) => ({
          abTests: {
            ...state.abTests,
            [templateId]: abTest,
          },
          templates: state.templates.map((tpl) =>
            tpl.id === templateId ? { ...tpl, activeABTest: abTest.id } : tpl
          ),
        }));

        return abTest;
      },

      recordABTestResult: (templateId, variant, success, rating) => {
        const test = get().abTests[templateId];
        if (!test || test.status !== 'running') return;

        const variantData = variant === 'A' ? test.variantA : test.variantB;
        const newUses = variantData.uses + 1;
        const successCount =
          Math.round(variantData.successRate * variantData.uses) + (success ? 1 : 0);
        const ratingSum = variantData.averageRating * variantData.uses + (rating || 0);

        const updatedVariant = {
          ...variantData,
          uses: newUses,
          successRate: successCount / newUses,
          averageRating: rating ? ratingSum / newUses : variantData.averageRating,
        };

        set((state) => ({
          abTests: {
            ...state.abTests,
            [templateId]: {
              ...test,
              [variant === 'A' ? 'variantA' : 'variantB']: updatedVariant,
            },
          },
        }));
      },

      getActiveABTest: (templateId) => {
        const test = get().abTests[templateId];
        return test && test.status === 'running' ? test : null;
      },

      completeABTest: (templateId) => {
        const test = get().abTests[templateId];
        if (!test) return null;

        const { variantA, variantB, minSampleSize } = test;

        if (variantA.uses < minSampleSize || variantB.uses < minSampleSize) {
          return test;
        }

        const scoreA = variantA.successRate * 0.6 + (variantA.averageRating / 5) * 0.4;
        const scoreB = variantB.successRate * 0.6 + (variantB.averageRating / 5) * 0.4;
        const difference = Math.abs(scoreA - scoreB);
        const significanceThreshold = 0.05;

        let winner: 'A' | 'B' | 'none' = 'none';
        if (difference > significanceThreshold) {
          winner = scoreA > scoreB ? 'A' : 'B';
        }

        const completedTest: PromptABTest = {
          ...test,
          status: 'completed',
          winner,
          completedAt: new Date(),
        };

        set((state) => ({
          abTests: {
            ...state.abTests,
            [templateId]: completedTest,
          },
          templates: state.templates.map((tpl) =>
            tpl.id === templateId ? { ...tpl, activeABTest: undefined } : tpl
          ),
        }));

        return completedTest;
      },

      // Optimization
      markAsOptimized: (id, optimizedContent, suggestions) => {
        set((state) => ({
          operationStates: {
            ...state.operationStates,
            optimize: createOperationState('running'),
          },
        }));
        const existing = get().templates.find((tpl) => tpl.id === id);
        if (!existing) {
          set((state) => ({
            operationStates: {
              ...state.operationStates,
              optimize: createOperationState('error', 'TEMPLATE_NOT_FOUND', 'Template not found.'),
            },
          }));
          return;
        }

        // Save current version before applying optimization
        get().saveVersion(id, 'Before optimization');

        set((state) => ({
          templates: state.templates.map((tpl) =>
            tpl.id === id
              ? {
                  ...tpl,
                  content: optimizedContent,
                  isOptimized: true,
                  lastOptimizedContent: tpl.content,
                  optimizationSuggestions: suggestions,
                  updatedAt: new Date(),
                }
              : tpl
          ),
          operationStates: {
            ...state.operationStates,
            optimize: createOperationState('success', 'OK'),
          },
        }));
      },

      // Optimization History & Recommendations
      recordOptimization: (
        templateId,
        originalContent,
        optimizedContent,
        suggestions,
        style,
        appliedBy = 'user'
      ) => {
        const entry = createOptimizationHistoryEntry(
          templateId,
          originalContent,
          optimizedContent,
          suggestions,
          style,
          appliedBy
        );

        set((state) => ({
          optimizationHistory: {
            ...state.optimizationHistory,
            [templateId]: [...(state.optimizationHistory[templateId] || []), entry].slice(-20), // Keep last 20
          },
          templates: state.templates.map((tpl) => {
            if (tpl.id !== templateId) return tpl;
            const currentStats = tpl.stats || {
              totalUses: 0,
              successfulUses: 0,
              averageRating: 0,
              ratingCount: 0,
              optimizationCount: 0,
            };
            return {
              ...tpl,
              stats: {
                ...currentStats,
                lastOptimizedAt: new Date(),
                optimizationCount: currentStats.optimizationCount + 1,
              },
            };
          }),
        }));
      },

      getOptimizationHistory: (templateId) => {
        return get().optimizationHistory[templateId] || [];
      },

      getRecommendations: () => {
        const { templates, feedback } = get();
        return generateOptimizationRecommendations(templates, feedback);
      },

      getTopCandidates: (limit = 5) => {
        const { templates } = get();
        return getTopOptimizationCandidates(templates, limit);
      },
    }),
    {
      name: 'cognia-prompt-templates',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version <= 1) {
          // Ensure persisted state has object defaults for maps.
          if (!state.feedback || typeof state.feedback !== 'object') {
            state.feedback = {};
          }
          if (!state.abTests || typeof state.abTests !== 'object' || Array.isArray(state.abTests)) {
            state.abTests = {};
          }
          if (
            !state.optimizationHistory ||
            typeof state.optimizationHistory !== 'object' ||
            Array.isArray(state.optimizationHistory)
          ) {
            state.optimizationHistory = {};
          }
          if (!Array.isArray(state.categories)) {
            state.categories = DEFAULT_PROMPT_TEMPLATE_CATEGORIES;
          }
          if (typeof state.isInitialized !== 'boolean') {
            state.isInitialized = false;
          }
        }
        if (!state.draftSessions || typeof state.draftSessions !== 'object' || Array.isArray(state.draftSessions)) {
          state.draftSessions = {};
        }
        return state;
      },
      partialize: (state) => ({
        templates: state.templates.map((tpl) => ({
          ...tpl,
          createdAt: tpl.createdAt.toISOString(),
          updatedAt: tpl.updatedAt.toISOString(),
          lastUsedAt: tpl.lastUsedAt ? tpl.lastUsedAt.toISOString() : undefined,
        })),
        categories: state.categories,
        selectedTemplateId: state.selectedTemplateId,
        isInitialized: state.isInitialized,
        draftSessions: Object.fromEntries(
          Object.entries(state.draftSessions).map(([key, session]) => [
            key,
            {
              ...session,
              createdAt: session.createdAt.toISOString(),
              updatedAt: session.updatedAt.toISOString(),
              lastRecoveredAt: session.lastRecoveredAt?.toISOString(),
            },
          ])
        ),
        feedback: state.feedback,
        abTests: state.abTests,
        optimizationHistory: state.optimizationHistory,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.templates) {
          state.templates = state.templates.map(hydrateTemplate);
        }
        if (state?.draftSessions) {
          state.draftSessions = Object.fromEntries(
            Object.entries(state.draftSessions).map(([key, session]) => [
              key,
              hydrateDraftSession(session as PromptTemplateDraftSession),
            ])
          );
        }
        // Rehydrate date fields in feedback
        if (state?.feedback) {
          for (const key of Object.keys(state.feedback)) {
            state.feedback[key] = state.feedback[key].map((fb) => ({
              ...fb,
              createdAt: new Date(fb.createdAt),
            }));
          }
        }
        // Rehydrate date fields in abTests
        if (state?.abTests) {
          for (const key of Object.keys(state.abTests)) {
            const test = state.abTests[key];
            test.startedAt = new Date(test.startedAt);
            if (test.completedAt) test.completedAt = new Date(test.completedAt);
          }
        }
      },
    }
  )
);

function safeParse(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch (error) {
    log.warn('Failed to parse prompt template payload', { error });
    return null;
  }
}

function normalizeImportedTemplate(value: unknown): PromptTemplate | null {
  if (!value || typeof value !== 'object') return null;
  const tpl = value as Partial<PromptTemplate>;
  if (!tpl.name || !tpl.content) return null;
  const validation = validatePromptTemplateInput({
    name: tpl.name,
    content: tpl.content,
    variables: tpl.variables,
  });
  if (!validation.isValid) return null;

  const now = new Date();
  return {
    id: tpl.id ?? nanoid(),
    name: tpl.name.trim(),
    description: tpl.description,
    content: tpl.content,
    category: tpl.category ?? 'custom',
    tags: tpl.tags ?? [],
    variables: tpl.variables ?? buildTemplateVariables(tpl.content),
    targets: tpl.targets ?? ['chat'],
    source: tpl.source ?? 'imported',
    meta: tpl.meta,
    usageCount: tpl.usageCount ?? 0,
    createdAt: tpl.createdAt ? new Date(tpl.createdAt) : now,
    updatedAt: tpl.updatedAt ? new Date(tpl.updatedAt) : now,
    lastUsedAt: tpl.lastUsedAt ? new Date(tpl.lastUsedAt) : undefined,
  };
}

function findTemplateConflict(
  templates: PromptTemplate[],
  candidate: PromptTemplate
): PromptTemplate | undefined {
  const candidateIdentity = buildPromptTemplateIdentity(candidate);
  if (!candidateIdentity) return undefined;
  return templates.find((template) => {
    const identity = buildPromptTemplateIdentity(template);
    return identity?.key === candidateIdentity.key;
  });
}

function dedupeTemplates(templates: PromptTemplate[]): PromptTemplate[] {
  const seen = new Map<string, PromptTemplate>();
  templates.forEach((tpl) => {
    const key = buildPromptTemplateIdentity(tpl)?.key ?? `id:${tpl.id}`;

    if (!seen.has(key)) {
      seen.set(key, tpl);
    }
  });
  return Array.from(seen.values());
}

export const selectPromptTemplates = (state: PromptTemplateState) => state.templates;
export const selectPromptTemplateCategories = (state: PromptTemplateState) => state.categories;
export const selectPromptTemplateId = (state: PromptTemplateState) => state.selectedTemplateId;

export default usePromptTemplateStore;
