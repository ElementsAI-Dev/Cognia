/**
 * Prompt Template Store - manages reusable prompt templates across chat, workflows, MCP, and IDE rules
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { McpPrompt } from '@/types/mcp';
import {
  type PromptTemplate,
  type PromptTemplateVersion,
  type PromptFeedback,
  type PromptTemplateStats,
  type PromptABTest,
  type PromptOptimizationHistory,
  type OptimizationRecommendation,
  type CreatePromptTemplateInput,
  type UpdatePromptTemplateInput,
  DEFAULT_PROMPT_TEMPLATE_CATEGORIES,
  DEFAULT_PROMPT_TEMPLATES,
} from '@/types/content/prompt-template';
import {
  createOptimizationHistoryEntry,
  generateOptimizationRecommendations,
  getTopOptimizationCandidates,
} from '@/lib/ai/prompts/prompt-self-optimizer';
import { buildTemplateVariables } from '@/lib/prompts/template-utils';

interface PromptTemplateState {
  templates: PromptTemplate[];
  categories: string[];
  selectedTemplateId: string | null;
  isInitialized: boolean;

  // Feedback & A/B Testing state
  feedback: Record<string, PromptFeedback[]>;
  abTests: Record<string, PromptABTest>;
  optimizationHistory: Record<string, PromptOptimizationHistory[]>;

  initializeDefaults: () => void;
  createTemplate: (input: CreatePromptTemplateInput) => PromptTemplate;
  updateTemplate: (id: string, input: UpdatePromptTemplateInput) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => PromptTemplate | null;
  selectTemplate: (id: string | null) => void;
  recordUsage: (id: string) => void;

  getTemplate: (id: string) => PromptTemplate | undefined;
  searchTemplates: (query: string) => PromptTemplate[];
  getTemplatesByCategory: (category: string) => PromptTemplate[];
  getTemplatesByTags: (tags: string[]) => PromptTemplate[];

  importTemplates: (payload: string | PromptTemplate[]) => number;
  exportTemplates: (ids?: string[]) => string;

  syncFromMcpPrompts: (serverId: string, prompts: McpPrompt[]) => void;

  // Version History
  saveVersion: (id: string, changelog?: string) => PromptTemplateVersion | null;
  restoreVersion: (id: string, versionId: string) => boolean;
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

export const usePromptTemplateStore = create<PromptTemplateState>()(
  persist(
    (set, get) => ({
      templates: [],
      categories: DEFAULT_PROMPT_TEMPLATE_CATEGORIES,
      selectedTemplateId: null,
      isInitialized: false,
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
        const now = new Date();
        const template: PromptTemplate = {
          id: nanoid(),
          name: input.name,
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
        };

        set((state) => ({ templates: [...state.templates, template] }));
        return template;
      },

      updateTemplate: (id, input) => {
        set((state) => ({
          templates: state.templates.map((tpl) =>
            tpl.id === id
              ? {
                  ...tpl,
                  ...input,
                  tags: input.tags ?? tpl.tags,
                  variables: buildTemplateVariables(
                    input.content ?? tpl.content,
                    input.variables ?? tpl.variables
                  ),
                  updatedAt: new Date(),
                }
              : tpl
          ),
        }));
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((tpl) => tpl.id !== id),
          selectedTemplateId: state.selectedTemplateId === id ? null : state.selectedTemplateId,
        }));
      },

      duplicateTemplate: (id) => {
        const found = get().templates.find((tpl) => tpl.id === id);
        if (!found) return null;

        const duplicate = withTimestamps({
          ...found,
          id: nanoid(),
          name: `${found.name} (Copy)`,
          usageCount: 0,
          lastUsedAt: undefined,
          source: 'user',
        });

        set((state) => ({ templates: [...state.templates, duplicate] }));
        return duplicate;
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

      importTemplates: (payload) => {
        const data = typeof payload === 'string' ? safeParse(payload) : payload;
        if (!Array.isArray(data)) return 0;

        const normalized = data
          .map((tpl) => normalizeImportedTemplate(tpl))
          .filter(Boolean) as PromptTemplate[];

        if (normalized.length === 0) return 0;

        set((state) => ({ templates: [...state.templates, ...normalized] }));
        return normalized.length;
      },

      exportTemplates: (ids) => {
        const list =
          ids && ids.length > 0
            ? get().templates.filter((tpl) => ids.includes(tpl.id))
            : get().templates;

        return JSON.stringify(
          list.map((tpl) => ({
            ...tpl,
            createdAt: tpl.createdAt.toISOString(),
            updatedAt: tpl.updatedAt.toISOString(),
            lastUsedAt: tpl.lastUsedAt?.toISOString(),
          })),
          null,
          2
        );
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
                  versionHistory: [...(tpl.versionHistory || []), version],
                  currentVersion: version.version,
                  updatedAt: new Date(),
                }
              : tpl
          ),
        }));

        return version;
      },

      restoreVersion: (id, versionId) => {
        const template = get().templates.find((t) => t.id === id);
        if (!template || !template.versionHistory) return false;

        const version = template.versionHistory.find((v) => v.id === versionId);
        if (!version) return false;

        // Save current state as a new version before restoring
        get().saveVersion(id, `Auto-saved before restoring to v${version.version}`);

        set((state) => ({
          templates: state.templates.map((tpl) =>
            tpl.id === id
              ? {
                  ...tpl,
                  content: version.content,
                  variables: [...version.variables],
                  updatedAt: new Date(),
                }
              : tpl
          ),
        }));

        return true;
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

        // Store hypothesis in a way TypeScript accepts
        void hypothesis;

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
      storage: createJSONStorage(() => localStorage),
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
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.templates) {
          state.templates = state.templates.map(hydrateTemplate);
        }
      },
    }
  )
);

function safeParse(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch (error) {
    console.warn('Failed to parse prompt template payload', error);
    return null;
  }
}

function normalizeImportedTemplate(value: unknown): PromptTemplate | null {
  if (!value || typeof value !== 'object') return null;
  const tpl = value as Partial<PromptTemplate>;
  if (!tpl.name || !tpl.content) return null;

  const now = new Date();
  return {
    id: tpl.id ?? nanoid(),
    name: tpl.name,
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

function dedupeTemplates(templates: PromptTemplate[]): PromptTemplate[] {
  const seen = new Map<string, PromptTemplate>();
  templates.forEach((tpl) => {
    const key =
      tpl.meta?.mcp?.promptName && tpl.meta.mcp.serverId
        ? `${tpl.meta.mcp.serverId}:${tpl.meta.mcp.promptName}`
        : tpl.id;

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
