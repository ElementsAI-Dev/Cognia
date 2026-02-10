/**
 * Embedding Service - Generate embeddings using AI SDK
 * Supports providers: OpenAI, Google
 */

import {
  generateEmbedding as generateAiEmbedding,
  generateEmbeddings as generateAiEmbeddings,
  cosineSimilarity as cosineSimilarityAi,
} from '@/lib/ai/embedding/embedding';
import type { ProviderName } from '@/types/provider';

export type EmbeddingProvider = 'openai' | 'google' | 'cohere' | 'mistral' | 'transformersjs';

export interface EmbeddingModelConfig {
  provider: EmbeddingProvider;
  model: string;
  dimensions?: number;
}

export const DEFAULT_EMBEDDING_MODELS: Record<EmbeddingProvider, EmbeddingModelConfig> = {
  openai: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
  google: {
    provider: 'google',
    model: 'text-embedding-004',
    dimensions: 768,
  },
  cohere: {
    provider: 'cohere',
    model: 'embed-english-v3.0',
    dimensions: 1024,
  },
  mistral: {
    provider: 'mistral',
    model: 'mistral-embed',
    dimensions: 1024,
  },
  transformersjs: {
    provider: 'transformersjs',
    model: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
  },
};

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  provider: EmbeddingProvider;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  provider: EmbeddingProvider;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingModelConfig,
  apiKey: string
): Promise<EmbeddingResult> {
  // Browser-local inference via Transformers.js (no API key needed)
  if (config.provider === 'transformersjs') {
    const { getTransformersManager } = await import('@/lib/ai/transformers/transformers-manager');
    const manager = getTransformersManager();
    const result = await manager.generateEmbedding(text, config.model);
    return {
      embedding: result.embedding,
      model: config.model,
      provider: config.provider,
    };
  }

  const result = await generateAiEmbedding(text, {
    provider: config.provider,
    model: config.model,
    apiKey,
    dimensions: config.dimensions,
  });

  return {
    embedding: result.embedding,
    model: config.model,
    provider: config.provider,
  };
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(
  texts: string[],
  config: EmbeddingModelConfig,
  apiKey: string
): Promise<BatchEmbeddingResult> {
  // Browser-local inference via Transformers.js (no API key needed)
  if (config.provider === 'transformersjs') {
    const { getTransformersManager } = await import('@/lib/ai/transformers/transformers-manager');
    const manager = getTransformersManager();
    const result = await manager.generateEmbeddings(texts, config.model);
    return {
      embeddings: result.embeddings,
      model: config.model,
      provider: config.provider,
    };
  }

  const result = await generateAiEmbeddings(texts, {
    provider: config.provider,
    model: config.model,
    apiKey,
    dimensions: config.dimensions,
  });

  return {
    embeddings: result.embeddings,
    model: config.model,
    provider: config.provider,
  };
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function calculateSimilarity(a: number[], b: number[]): number {
  return cosineSimilarityAi(a, b);
}

/**
 * Find most similar embeddings from a collection
 */
export function findMostSimilar(
  queryEmbedding: number[],
  embeddings: { id: string; embedding: number[] }[],
  topK: number = 5,
  threshold: number = 0.5
): { id: string; similarity: number }[] {
  const similarities = embeddings.map((item) => ({
    id: item.id,
    similarity: calculateSimilarity(queryEmbedding, item.embedding),
  }));

  return similarities
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Get API key for embedding provider from settings
 */
export function getEmbeddingApiKey(
  provider: EmbeddingProvider,
  providerSettings: Record<string, { apiKey?: string }>
): string | null {
  // transformersjs doesn't need an API key
  if (provider === 'transformersjs') return '';

  const providerMap: Record<Exclude<EmbeddingProvider, 'transformersjs'>, ProviderName> = {
    openai: 'openai',
    google: 'google',
    cohere: 'cohere',
    mistral: 'mistral',
  };

  const mappedProvider = providerMap[provider];
  return providerSettings[mappedProvider]?.apiKey || null;
}

/**
 * Normalize text for embedding (clean whitespace, etc.)
 */
export function normalizeTextForEmbedding(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}
