/**
 * Embedding Service - Generate embeddings using AI SDK
 * Supports multiple providers: OpenAI, Google, Cohere
 */

import { embed, embedMany, cosineSimilarity } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { ProviderName } from '@/types/provider';

export type EmbeddingProvider = 'openai' | 'google' | 'cohere';

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
 * Get embedding model instance based on provider
 */
function getEmbeddingModel(
  provider: EmbeddingProvider,
  model: string,
  apiKey: string
) {
  switch (provider) {
    case 'openai':
      return createOpenAI({ apiKey }).embedding(model);
    case 'google':
      return createGoogleGenerativeAI({ apiKey }).textEmbeddingModel(model);
    default:
      throw new Error(`Unsupported embedding provider: ${provider}`);
  }
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingModelConfig,
  apiKey: string
): Promise<EmbeddingResult> {
  const model = getEmbeddingModel(config.provider, config.model, apiKey);
  
  const result = await embed({
    model,
    value: text,
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
  const model = getEmbeddingModel(config.provider, config.model, apiKey);
  
  const result = await embedMany({
    model,
    values: texts,
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
  return cosineSimilarity(a, b);
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
  const providerMap: Record<EmbeddingProvider, ProviderName> = {
    openai: 'openai',
    google: 'google',
    cohere: 'openai', // Cohere uses its own key, fallback to openai for now
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
