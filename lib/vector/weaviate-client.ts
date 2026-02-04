/**
 * Weaviate Vector Database Client
 * REST-based integration for Weaviate instances.
 */

import type { EmbeddingModelConfig } from './embedding';
import { generateEmbeddings, generateEmbedding } from './embedding';

export interface WeaviateConfig {
  url: string;
  apiKey?: string;
  className?: string;
  embeddingConfig: EmbeddingModelConfig;
  embeddingApiKey: string;
}

export interface WeaviateDocument {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

export interface WeaviateSearchResult {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  score: number;
}

export interface WeaviateClassInfo {
  name: string;
  description?: string;
  documentCount?: number;
}

interface WeaviateGraphQLItem {
  _additional?: {
    id: string;
    certainty?: number;
  };
  content?: string;
  metadata?: string;
}

interface WeaviateGraphQLResponse {
  data?: {
    Get?: Record<string, WeaviateGraphQLItem[]>;
  };
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function buildHeaders(apiKey?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

async function weaviateFetch<T>(
  config: Pick<WeaviateConfig, 'url' | 'apiKey'>,
  path: string,
  init?: RequestInit
): Promise<T> {
  const baseUrl = normalizeBaseUrl(config.url);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(config.apiKey),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Weaviate request failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function listWeaviateClasses(
  config: Pick<WeaviateConfig, 'url' | 'apiKey'>
): Promise<WeaviateClassInfo[]> {
  const schema = await weaviateFetch<{ classes?: Array<{ class: string; description?: string }> }>(
    config,
    '/v1/schema'
  );

  return (schema.classes || []).map((cls) => ({
    name: cls.class,
    description: cls.description,
  }));
}

export async function getWeaviateClassInfo(
  config: WeaviateConfig
): Promise<WeaviateClassInfo> {
  const schema = await weaviateFetch<{ class: string; description?: string }>(
    config,
    `/v1/schema/${config.className}`
  );

  return {
    name: schema.class,
    description: schema.description,
    documentCount: 0,
  };
}

export async function createWeaviateClass(
  config: WeaviateConfig,
  options?: { description?: string; metadata?: Record<string, unknown>; dimension?: number }
): Promise<void> {
  await weaviateFetch(config, '/v1/schema', {
    method: 'POST',
    body: JSON.stringify({
      class: config.className,
      description: options?.description,
      vectorizer: 'none',
      properties: [
        { name: 'content', dataType: ['text'] },
        { name: 'metadata', dataType: ['text'] },
      ],
      moduleConfig: options?.metadata,
    }),
  });
}

export async function deleteWeaviateClass(config: WeaviateConfig): Promise<void> {
  await weaviateFetch(config, `/v1/schema/${config.className}`, { method: 'DELETE' });
}

export async function upsertWeaviateDocuments(
  config: WeaviateConfig,
  documents: WeaviateDocument[]
): Promise<void> {
  const needsEmbedding = documents.some((doc) => !doc.embedding);
  let embeddings: number[][] | undefined;

  if (needsEmbedding) {
    const textsToEmbed = documents.filter((doc) => !doc.embedding).map((doc) => doc.content);
    if (textsToEmbed.length > 0) {
      const result = await generateEmbeddings(
        textsToEmbed,
        config.embeddingConfig,
        config.embeddingApiKey
      );
      let embeddingIndex = 0;
      embeddings = documents.map((doc) => {
        if (doc.embedding) return doc.embedding;
        return result.embeddings[embeddingIndex++];
      });
    }
  } else {
    embeddings = documents.map((doc) => doc.embedding!);
  }

  const objects = documents.map((doc, i) => ({
    id: doc.id,
    class: config.className,
    properties: {
      content: doc.content,
      metadata: JSON.stringify(doc.metadata ?? {}),
    },
    vector: embeddings![i],
  }));

  await weaviateFetch(config, '/v1/batch/objects', {
    method: 'POST',
    body: JSON.stringify({ objects }),
  });
}

export async function deleteWeaviateDocuments(
  config: WeaviateConfig,
  ids: string[]
): Promise<void> {
  await Promise.all(
    ids.map((id) =>
      weaviateFetch(config, `/v1/objects/${config.className}/${id}`, { method: 'DELETE' })
    )
  );
}

export async function getWeaviateDocuments(
  config: WeaviateConfig,
  ids: string[]
): Promise<WeaviateDocument[]> {
  const results = await Promise.all(
    ids.map((id) =>
      weaviateFetch<{ id: string; properties?: { content?: string; metadata?: string }; vector?: number[] }>(
        config,
        `/v1/objects/${config.className}/${id}`
      )
    )
  );

  return results.map((item) => ({
    id: item.id,
    content: item.properties?.content ?? '',
    metadata: item.properties?.metadata ? JSON.parse(item.properties.metadata) : undefined,
    embedding: item.vector,
  }));
}

export async function queryWeaviate(
  config: WeaviateConfig,
  query: string,
  options: { topK?: number; threshold?: number } = {}
): Promise<WeaviateSearchResult[]> {
  const { topK = 5 } = options;
  const queryResult = await generateEmbedding(
    query,
    config.embeddingConfig,
    config.embeddingApiKey
  );

  const graphqlQuery = {
    query: `{
      Get {
        ${config.className}(
          nearVector: { vector: [${queryResult.embedding.join(',')}] }
          limit: ${topK}
        ) {
          _additional { id certainty }
          content
          metadata
        }
      }
    }`,
  };

  const response = await weaviateFetch<WeaviateGraphQLResponse>(
    config,
    '/v1/graphql',
    {
      method: 'POST',
      body: JSON.stringify(graphqlQuery),
    }
  );

  const results = response.data?.Get?.[config.className ?? ''] ?? [];

  return results
    .map((item) => ({
      id: item._additional?.id ?? '',
      content: item.content ?? '',
      metadata: item.metadata ? JSON.parse(item.metadata) : undefined,
      score: item._additional?.certainty ?? 0,
    }))
    .filter((item) => item.id);
}
