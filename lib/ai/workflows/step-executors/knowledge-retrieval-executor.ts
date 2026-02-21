/**
 * Knowledge Retrieval Step Executor
 * Executes workflow knowledgeRetrieval nodes using unified RAG runtime.
 */

import type { WorkflowExecution, WorkflowStepDefinition } from './types';
import { createRAGRuntimeConfigFromVectorSettings, getSharedRAGRuntime } from '@/lib/ai/rag';
import { useSettingsStore, useVectorStore } from '@/stores';
import { loggers } from '@/lib/logger';
import {
  isEmbeddingProviderConfigured,
  resolveEmbeddingApiKey,
  type EmbeddingProvider,
} from '@/lib/vector/embedding';

const log = loggers.ai;

type KnowledgeRetrievalOutput = {
  query: string;
  results: Array<{
    id: string;
    content: string;
    score: number;
    collectionName: string;
    metadata?: Record<string, unknown>;
  }>;
  context: string;
  collectionsUsed: string[];
  searchMetadata: {
    hybridSearchUsed: boolean;
    queryExpansionUsed: boolean;
    rerankingUsed: boolean;
    totalCollectionsQueried: number;
    totalResults: number;
  };
};

function createEmptyOutput(query: string, collections: string[]): KnowledgeRetrievalOutput {
  return {
    query,
    results: [],
    context: '',
    collectionsUsed: collections,
    searchMetadata: {
      hybridSearchUsed: false,
      queryExpansionUsed: false,
      rerankingUsed: false,
      totalCollectionsQueried: collections.length,
      totalResults: 0,
    },
  };
}

function resolveVariablePath(value: unknown, variablePath?: string[]): unknown {
  if (!variablePath || variablePath.length === 0) return value;
  let current: unknown = value;
  for (const key of variablePath) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function resolveQueryFromStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  execution: WorkflowExecution
): string {
  if (step.queryVariable) {
    const sourceStep = execution.steps.find((item) => item.stepId === step.queryVariable?.nodeId);
    if (sourceStep?.output) {
      const direct = sourceStep.output[step.queryVariable.variableName];
      const withPath = resolveVariablePath(direct, step.queryVariable.variablePath);
      if (typeof withPath === 'string' && withPath.trim()) {
        return withPath.trim();
      }

      const nestedResult = sourceStep.output.result;
      if (nestedResult && typeof nestedResult === 'object') {
        const fallback = (nestedResult as Record<string, unknown>)[step.queryVariable.variableName];
        const fallbackWithPath = resolveVariablePath(fallback, step.queryVariable.variablePath);
        if (typeof fallbackWithPath === 'string' && fallbackWithPath.trim()) {
          return fallbackWithPath.trim();
        }
      }
    }
  }

  const commonKeys = ['query', 'question', 'text', 'input'];
  for (const key of commonKeys) {
    const candidate = input[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const value of Object.values(input)) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function resolveCollections(step: WorkflowStepDefinition, input: Record<string, unknown>): string[] {
  if (step.knowledgeBaseIds && step.knowledgeBaseIds.length > 0) {
    return step.retrievalMode === 'single'
      ? [step.knowledgeBaseIds[0]]
      : step.knowledgeBaseIds;
  }

  const fromInput = input.knowledgeBaseIds;
  if (Array.isArray(fromInput)) {
    const ids = fromInput.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    if (ids.length > 0) return step.retrievalMode === 'single' ? [ids[0]] : ids;
  }

  if (typeof input.collectionName === 'string' && input.collectionName.trim()) {
    return [input.collectionName.trim()];
  }

  return [];
}

export async function executeKnowledgeRetrievalStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  execution: WorkflowExecution
): Promise<KnowledgeRetrievalOutput> {
  const query = resolveQueryFromStep(step, input, execution);
  const collections = resolveCollections(step, input);

  if (!query || collections.length === 0) {
    return createEmptyOutput(query, collections);
  }

  try {
    const vectorSettings = useVectorStore.getState().settings;
    const providerSettings =
      useSettingsStore.getState().providerSettings as Record<string, { apiKey?: string }>;
    const embeddingProvider = vectorSettings.embeddingProvider as EmbeddingProvider;
    const embeddingApiKey = resolveEmbeddingApiKey(embeddingProvider, providerSettings);

    if (!isEmbeddingProviderConfigured(embeddingProvider, providerSettings)) {
      log.warn('Knowledge retrieval skipped: embedding API key not configured', {
        embeddingProvider,
        stepId: step.id,
      });
      return createEmptyOutput(query, collections);
    }

    const topK = step.topK ?? vectorSettings.ragTopK;
    const scoreThreshold = step.scoreThreshold ?? vectorSettings.ragSimilarityThreshold;
    const runtimeConfig = createRAGRuntimeConfigFromVectorSettings(
      {
        ...vectorSettings,
        ragTopK: topK,
        ragSimilarityThreshold: scoreThreshold,
        enableReranking: step.rerankingEnabled ?? vectorSettings.enableReranking,
      },
      embeddingApiKey
    );
    const runtime = getSharedRAGRuntime('workflow:knowledge-retrieval', runtimeConfig);

    const merged = new Map<
      string,
      {
        id: string;
        content: string;
        score: number;
        collectionName: string;
        metadata?: Record<string, unknown>;
      }
    >();
    let hybridSearchUsed = false;
    let queryExpansionUsed = false;
    let rerankingUsed = false;

    for (const collectionName of collections) {
      try {
        const context = await runtime.retrieve(collectionName, query);
        hybridSearchUsed = hybridSearchUsed || context.searchMetadata.hybridSearchUsed;
        queryExpansionUsed = queryExpansionUsed || context.searchMetadata.queryExpansionUsed;
        rerankingUsed = rerankingUsed || context.searchMetadata.rerankingUsed;

        for (const doc of context.documents) {
          if (doc.rerankScore < scoreThreshold) continue;
          const existing = merged.get(doc.id);
          if (!existing || existing.score < doc.rerankScore) {
            merged.set(doc.id, {
              id: doc.id,
              content: doc.content,
              score: doc.rerankScore,
              collectionName,
              metadata: doc.metadata,
            });
          }
        }
      } catch (error) {
        log.warn('Knowledge retrieval collection query failed', {
          collectionName,
          stepId: step.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const results = Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const context = results
      .map((item, index) => `[Source ${index + 1}] (${item.collectionName})\n${item.content}`)
      .join('\n\n');

    return {
      query,
      results,
      context,
      collectionsUsed: collections,
      searchMetadata: {
        hybridSearchUsed,
        queryExpansionUsed,
        rerankingUsed,
        totalCollectionsQueried: collections.length,
        totalResults: results.length,
      },
    };
  } catch (error) {
    log.warn('Knowledge retrieval setup failed', {
      stepId: step.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return createEmptyOutput(query, collections);
  }
}
