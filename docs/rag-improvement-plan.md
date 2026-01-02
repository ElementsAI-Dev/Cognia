# RAG 模块改进计划

基于 AI SDK 文档和现有代码分析，本文档详细说明所有改进方案。

---

## 📋 目录

1. [现有实现分析](#1-现有实现分析)
2. [改进方案总览](#2-改进方案总览)
3. [详细改进方案](#3-详细改进方案)
4. [文件变更清单](#4-文件变更清单)
5. [实施顺序](#5-实施顺序)

---

## 1. 现有实现分析

### 1.1 当前架构

```
lib/ai/
├── embedding.ts           # 嵌入生成 (使用 AI SDK embed/embedMany)
├── chunking.ts            # 文档分块 (5种策略)
├── rag.ts                 # 基础 RAG 服务
└── rag/
    ├── index.ts           # 模块导出
    ├── rag-pipeline.ts    # 高级 RAG 管道
    ├── hybrid-search.ts   # BM25 + Vector 混合搜索
    ├── reranker.ts        # 重排序 (LLM/Cohere/Heuristics/MMR)
    ├── query-expansion.ts # 查询扩展 (HyDE/Variants/Synonyms)
    └── contextual-retrieval.ts  # 上下文检索
```

### 1.2 现有问题

| 问题 | 位置 | 影响 |
|------|------|------|
| 多处重复实现 `cosineSimilarity` | embedding.ts, rag-pipeline.ts, reranker.ts | 代码冗余，不一致 |
| 缺少 `maxParallelCalls` 控制 | embedding.ts | 大量请求时可能触发限流 |
| Provider 支持有限 | embedding.ts | 缺少 Amazon Bedrock, Azure, Voyage |
| 缺少 embedding model 中间件 | embedding.ts | 无法设置默认配置 |
| RAG 未作为 Tool 集成 | 无 | 无法在 streamText 中自动调用 |
| 缓存仅内存存储 | embedding.ts | 重启后丢失 |
| 缺少高级查找 API | 无 | 使用不便 |

---

## 2. 改进方案总览

| 序号 | 改进项 | 优先级 | 复杂度 | 影响范围 |
|------|--------|--------|--------|----------|
| 1 | 使用 AI SDK 原生 `cosineSimilarity` | 高 | 低 | 3个文件 |
| 2 | 添加 `maxParallelCalls` 支持 | 高 | 低 | 1个文件 |
| 3 | 使用 `wrapEmbeddingModel` 中间件 | 中 | 中 | 1个文件 |
| 4 | 创建 RAG Tool 用于 streamText | 高 | 中 | 新建文件 |
| 5 | 添加更多 embedding provider | 中 | 中 | 1个文件 |
| 6 | 优化缓存策略（持久化） | 中 | 中 | 新建文件 |
| 7 | 添加 `findRelevantContent` API | 中 | 低 | 新建文件 |
| 8 | 增强错误处理和重试 | 高 | 低 | 1个文件 |
| 9 | 添加 `providerOptions` 支持 | 中 | 中 | 1个文件 |
| 10 | 更新测试用例 | 高 | 中 | 多个文件 |

---

## 3. 详细改进方案

### 3.1 使用 AI SDK 原生 `cosineSimilarity`

**背景**: AI SDK 提供了 `cosineSimilarity` 函数，当前代码有多处自定义实现。

**AI SDK API**:

```typescript
import { cosineSimilarity } from 'ai';

// 返回 -1 到 1 之间的数值，1 表示完全相似
const similarity = cosineSimilarity(embedding1, embedding2);
```

**需要修改的文件**:

#### `lib/ai/embedding.ts` (320-337行)

```typescript
// 删除自定义实现:
// export function cosineSimilarity(a: number[], b: number[]): number { ... }

// 改为从 AI SDK 重新导出:
import { cosineSimilarity as aiCosineSimilarity } from 'ai';
export const cosineSimilarity = aiCosineSimilarity;
```

#### `lib/ai/rag/rag-pipeline.ts` (471-481行)

```typescript
// 删除私有方法 cosineSimilarity
// 使用导入:
import { cosineSimilarity } from '@/lib/ai/embedding';
```

#### `lib/ai/rag/reranker.ts` (296-306行)

```typescript
// 删除局部函数 cosineSimilarity
// 使用导入:
import { cosineSimilarity } from '@/lib/ai/embedding';
```

---

### 3.2 添加 `maxParallelCalls` 支持

**背景**: AI SDK 的 `embedMany` 支持 `maxParallelCalls` 参数控制并发请求数。

**AI SDK API**:

```typescript
const { embeddings, usage } = await embedMany({
  model: openai.textEmbeddingModel('text-embedding-3-small'),
  values: ['text1', 'text2', 'text3'],
  maxParallelCalls: 2, // 限制并行请求数，默认 Infinity
});
```

**修改 `lib/ai/embedding.ts`**:

```typescript
export interface EmbeddingConfig {
  provider: ProviderName;
  model?: string;
  apiKey: string;
  baseURL?: string;
  dimensions?: number;
  cache?: EmbeddingCache;
  // 新增字段:
  maxParallelCalls?: number;  // 控制并行请求数
  maxRetries?: number;        // 最大重试次数
  abortSignal?: AbortSignal;  // 取消信号
}

export async function generateEmbeddings(
  texts: string[],
  config: EmbeddingConfig
): Promise<BatchEmbeddingResult> {
  // ... 缓存逻辑 ...
  
  const result = await embedMany({
    model,
    values: textsToEmbed.map((t) => t.text),
    maxParallelCalls: config.maxParallelCalls ?? 5,  // 新增
    maxRetries: config.maxRetries ?? 2,              // 新增
    abortSignal: config.abortSignal,                 // 新增
  });
  
  // ... 其余逻辑 ...
}
```

---

### 3.3 使用 `wrapEmbeddingModel` 中间件

**背景**: AI SDK 提供 `wrapEmbeddingModel` 和 `defaultEmbeddingSettingsMiddleware` 用于设置默认配置。

**AI SDK API**:

```typescript
import { wrapEmbeddingModel, defaultEmbeddingSettingsMiddleware } from 'ai';

const embeddingModelWithDefaults = wrapEmbeddingModel({
  model: openai.embedding('text-embedding-3-small'),
  middleware: defaultEmbeddingSettingsMiddleware({
    settings: {
      providerOptions: {
        openai: {
          dimensions: 256,
        },
      },
    },
  }),
});
```

**新增 `lib/ai/embedding-model-factory.ts`**:

```typescript
/**
 * Embedding Model Factory with Default Settings
 * 
 * Provides wrapped embedding models with default configurations
 */

import { 
  wrapEmbeddingModel, 
  defaultEmbeddingSettingsMiddleware,
  type EmbeddingModel,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createCohere } from '@ai-sdk/cohere';
import { createMistral } from '@ai-sdk/mistral';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createAzure } from '@ai-sdk/azure';

export interface EmbeddingModelFactoryConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
  // Provider-specific defaults
  defaults?: {
    dimensions?: number;
    // OpenAI specific
    user?: string;
    // Google specific
    taskType?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
    // Cohere specific
    inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
    truncate?: 'NONE' | 'START' | 'END';
  };
}

export function createEmbeddingModelWithDefaults(
  config: EmbeddingModelFactoryConfig
): EmbeddingModel<string> {
  const baseModel = getBaseEmbeddingModel(config);
  
  if (!config.defaults) {
    return baseModel;
  }

  const providerOptions = buildProviderOptions(config);
  
  return wrapEmbeddingModel({
    model: baseModel,
    middleware: defaultEmbeddingSettingsMiddleware({
      settings: {
        providerOptions,
      },
    }),
  });
}

function getBaseEmbeddingModel(config: EmbeddingModelFactoryConfig): EmbeddingModel<string> {
  const { provider, model, apiKey, baseURL } = config;
  
  switch (provider) {
    case 'openai': {
      const openai = createOpenAI({ apiKey, baseURL });
      return openai.embedding(model);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey });
      return google.textEmbeddingModel(model);
    }
    case 'cohere': {
      const cohere = createCohere({ apiKey });
      return cohere.embedding(model);
    }
    case 'mistral': {
      const mistral = createMistral({ apiKey });
      return mistral.embedding(model);
    }
    case 'amazon-bedrock': {
      const bedrock = createAmazonBedrock({});
      return bedrock.embedding(model);
    }
    case 'azure': {
      const azure = createAzure({ apiKey, baseURL });
      return azure.embedding(model);
    }
    default:
      throw new Error(`Unsupported embedding provider: ${provider}`);
  }
}

function buildProviderOptions(config: EmbeddingModelFactoryConfig): Record<string, unknown> {
  const { provider, defaults } = config;
  if (!defaults) return {};
  
  switch (provider) {
    case 'openai':
    case 'azure':
      return {
        openai: {
          dimensions: defaults.dimensions,
          user: defaults.user,
        },
      };
    case 'google':
      return {
        google: {
          outputDimensionality: defaults.dimensions,
          taskType: defaults.taskType,
        },
      };
    case 'cohere':
      return {
        cohere: {
          inputType: defaults.inputType,
          truncate: defaults.truncate,
        },
      };
    case 'amazon-bedrock':
      return {
        bedrock: {
          dimensions: defaults.dimensions,
          normalize: true,
        },
      };
    default:
      return {};
  }
}
```

---

### 3.4 创建 RAG Tool 用于 streamText

**背景**: AI SDK 支持通过 `tool()` 定义工具，可在 `streamText` 中自动调用。

**AI SDK API**:

```typescript
import { tool, streamText, UIMessage, stepCountIs } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: openai('gpt-4o'),
  messages,
  stopWhen: stepCountIs(5),
  tools: {
    getInformation: tool({
      description: 'Get information from knowledge base',
      parameters: z.object({
        question: z.string().describe('The question to search'),
      }),
      execute: async ({ question }) => findRelevantContent(question),
    }),
  },
});
```

**新建 `lib/ai/rag/rag-tools.ts`**:

```typescript
/**
 * RAG Tools for AI SDK Integration
 * 
 * Provides tool definitions for use with streamText
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { RAGPipeline } from './rag-pipeline';

export interface RAGToolsConfig {
  pipeline: RAGPipeline;
  collectionName: string;
  /** Maximum results to return */
  topK?: number;
  /** Minimum similarity threshold */
  similarityThreshold?: number;
}

/**
 * Create RAG tools for use with streamText
 */
export function createRAGTools(config: RAGToolsConfig) {
  const { pipeline, collectionName, topK = 5, similarityThreshold = 0.5 } = config;

  return {
    /**
     * Get information from knowledge base
     */
    getInformation: tool({
      description: `Search the knowledge base for relevant information to answer questions. 
      Always use this tool before answering questions that might require specific knowledge.`,
      parameters: z.object({
        question: z.string().describe('The question or topic to search for'),
      }),
      execute: async ({ question }) => {
        try {
          const context = await pipeline.retrieve(collectionName, question);
          
          if (context.documents.length === 0) {
            return 'No relevant information found in the knowledge base.';
          }
          
          // Filter by threshold and limit
          const relevantDocs = context.documents
            .filter(d => d.rerankScore >= similarityThreshold)
            .slice(0, topK);
          
          if (relevantDocs.length === 0) {
            return 'No sufficiently relevant information found.';
          }
          
          // Format results
          return relevantDocs.map((doc, i) => 
            `[Source ${i + 1}] (Score: ${doc.rerankScore.toFixed(2)})\n${doc.content}`
          ).join('\n\n---\n\n');
        } catch (error) {
          console.error('RAG retrieval error:', error);
          return 'Error retrieving information from knowledge base.';
        }
      },
    }),

    /**
     * Add resource to knowledge base
     */
    addResource: tool({
      description: `Add new information to the knowledge base. 
      Use this when the user provides information that should be remembered.`,
      parameters: z.object({
        content: z.string().describe('The content to add to the knowledge base'),
        title: z.string().optional().describe('Optional title for the content'),
      }),
      execute: async ({ content, title }) => {
        try {
          const result = await pipeline.indexDocument(content, {
            collectionName,
            documentId: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            documentTitle: title,
          });
          
          if (result.success) {
            return `Successfully added ${result.chunksCreated} chunks to the knowledge base.`;
          } else {
            return `Failed to add content: ${result.error}`;
          }
        } catch (error) {
          console.error('RAG indexing error:', error);
          return 'Error adding content to knowledge base.';
        }
      },
    }),

    /**
     * Search with specific filters
     */
    searchWithFilters: tool({
      description: 'Search the knowledge base with specific filters like date range or category',
      parameters: z.object({
        query: z.string().describe('The search query'),
        filters: z.object({
          category: z.string().optional().describe('Filter by category'),
          startDate: z.string().optional().describe('Filter by start date (ISO format)'),
          endDate: z.string().optional().describe('Filter by end date (ISO format)'),
        }).optional(),
      }),
      execute: async ({ query, filters }) => {
        try {
          const context = await pipeline.retrieve(collectionName, query);
          
          let results = context.documents;
          
          // Apply filters if provided
          if (filters) {
            if (filters.category) {
              results = results.filter(d => 
                d.metadata?.category === filters.category
              );
            }
            if (filters.startDate) {
              const start = new Date(filters.startDate).getTime();
              results = results.filter(d => {
                const docDate = d.metadata?.createdAt;
                return docDate && new Date(String(docDate)).getTime() >= start;
              });
            }
            if (filters.endDate) {
              const end = new Date(filters.endDate).getTime();
              results = results.filter(d => {
                const docDate = d.metadata?.createdAt;
                return docDate && new Date(String(docDate)).getTime() <= end;
              });
            }
          }
          
          if (results.length === 0) {
            return 'No results found matching the filters.';
          }
          
          return results.slice(0, topK).map((doc, i) => 
            `[Result ${i + 1}]\n${doc.content}`
          ).join('\n\n---\n\n');
        } catch (error) {
          console.error('Filtered search error:', error);
          return 'Error performing filtered search.';
        }
      },
    }),
  };
}

/**
 * Create a simple retrieval tool for basic RAG
 */
export function createSimpleRetrievalTool(
  findRelevantContent: (query: string) => Promise<Array<{ content: string; similarity: number }>>
) {
  return tool({
    description: 'Search the knowledge base for relevant information',
    parameters: z.object({
      question: z.string().describe('The question to search for'),
    }),
    execute: async ({ question }) => {
      const results = await findRelevantContent(question);
      if (results.length === 0) {
        return 'No relevant information found.';
      }
      return results.map((r, i) => 
        `[${i + 1}] (similarity: ${r.similarity.toFixed(2)}): ${r.content}`
      ).join('\n\n');
    },
  });
}
```

---

### 3.5 添加更多 Embedding Provider 支持

**背景**: 当前仅支持 OpenAI, Google, Cohere, Mistral, Ollama。需要添加 Amazon Bedrock, Azure, Voyage AI。

**修改 `lib/ai/embedding.ts`**:

```typescript
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createAzure } from '@ai-sdk/azure';
// Voyage AI 是社区 provider
// import { voyage } from 'voyage-ai-provider';

export type EmbeddingProvider = 
  | 'openai' 
  | 'google' 
  | 'cohere' 
  | 'mistral' 
  | 'ollama'
  | 'amazon-bedrock'  // 新增
  | 'azure'           // 新增
  | 'voyage';         // 新增

export const defaultEmbeddingModels: Partial<Record<EmbeddingProvider, string>> = {
  openai: 'text-embedding-3-small',
  google: 'text-embedding-004',
  cohere: 'embed-english-v3.0',
  mistral: 'mistral-embed',
  ollama: 'nomic-embed-text',
  // 新增:
  'amazon-bedrock': 'amazon.titan-embed-text-v2:0',
  'azure': 'text-embedding-3-small',
  'voyage': 'voyage-3',
};

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model?: string;
  apiKey: string;
  baseURL?: string;
  dimensions?: number;
  cache?: EmbeddingCache;
  maxParallelCalls?: number;
  maxRetries?: number;
  abortSignal?: AbortSignal;
  // Provider-specific options:
  providerOptions?: {
    // Azure specific
    resourceName?: string;
    apiVersion?: string;
    // Amazon Bedrock specific
    region?: string;
    // Cohere specific
    inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
    // Google specific
    taskType?: string;
  };
}

function getEmbeddingModel(config: EmbeddingConfig) {
  const { provider, model, apiKey, baseURL, providerOptions } = config;

  switch (provider) {
    // ... 现有 cases ...
    
    case 'amazon-bedrock': {
      const bedrock = createAmazonBedrock({
        region: providerOptions?.region || 'us-east-1',
      });
      const modelId = model || defaultEmbeddingModels['amazon-bedrock']!;
      return bedrock.embedding(modelId);
    }
    
    case 'azure': {
      const azure = createAzure({
        resourceName: providerOptions?.resourceName,
        apiKey,
        apiVersion: providerOptions?.apiVersion,
      });
      const modelId = model || defaultEmbeddingModels['azure']!;
      return azure.embedding(modelId);
    }
    
    case 'voyage': {
      // 注意: voyage-ai-provider 是社区包，需要单独安装
      throw new Error('Voyage AI provider requires voyage-ai-provider package');
    }
    
    default:
      throw new Error(`Embedding not supported for provider: ${provider}`);
  }
}
```

---

### 3.6 优化缓存策略（持久化）

**新建 `lib/ai/embedding-cache.ts`**:

```typescript
/**
 * Embedding Cache with Persistence Support
 * 
 * Provides LRU cache with optional IndexedDB persistence
 */

import { db } from '@/lib/db';

export interface EmbeddingCache {
  get(key: string): number[] | undefined;
  set(key: string, embedding: number[]): void;
  has(key: string): boolean;
  clear(): void;
  size(): number;
}

export interface PersistentEmbeddingCache extends EmbeddingCache {
  persist(): Promise<void>;
  load(): Promise<void>;
  getStats(): { hits: number; misses: number; size: number };
}

/**
 * Create an in-memory LRU cache (existing implementation)
 */
export function createEmbeddingCache(maxSize: number = 1000): EmbeddingCache {
  const cache = new Map<string, { embedding: number[]; accessTime: number }>();

  const evictOldest = () => {
    if (cache.size <= maxSize) return;
    
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of cache.entries()) {
      if (value.accessTime < oldestTime) {
        oldestTime = value.accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  };

  return {
    get(key: string): number[] | undefined {
      const entry = cache.get(key);
      if (entry) {
        entry.accessTime = Date.now();
        return entry.embedding;
      }
      return undefined;
    },
    set(key: string, embedding: number[]): void {
      cache.set(key, { embedding, accessTime: Date.now() });
      evictOldest();
    },
    has(key: string): boolean {
      return cache.has(key);
    },
    clear(): void {
      cache.clear();
    },
    size(): number {
      return cache.size;
    },
  };
}

/**
 * Create a persistent cache backed by IndexedDB
 */
export function createPersistentEmbeddingCache(
  maxSize: number = 10000
): PersistentEmbeddingCache {
  const memoryCache = new Map<string, { embedding: number[]; accessTime: number }>();
  let hits = 0;
  let misses = 0;

  const evictOldest = () => {
    if (memoryCache.size <= maxSize) return;
    
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of memoryCache.entries()) {
      if (value.accessTime < oldestTime) {
        oldestTime = value.accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      memoryCache.delete(oldestKey);
    }
  };

  return {
    get(key: string): number[] | undefined {
      const entry = memoryCache.get(key);
      if (entry) {
        entry.accessTime = Date.now();
        hits++;
        return entry.embedding;
      }
      misses++;
      return undefined;
    },
    
    set(key: string, embedding: number[]): void {
      memoryCache.set(key, { embedding, accessTime: Date.now() });
      evictOldest();
    },
    
    has(key: string): boolean {
      return memoryCache.has(key);
    },
    
    clear(): void {
      memoryCache.clear();
      hits = 0;
      misses = 0;
    },
    
    size(): number {
      return memoryCache.size;
    },
    
    async persist(): Promise<void> {
      try {
        const entries = Array.from(memoryCache.entries()).map(([key, value]) => ({
          key,
          embedding: value.embedding,
          accessTime: value.accessTime,
        }));
        
        // 使用 Dexie 批量写入
        await db.embeddingCache?.bulkPut(entries);
      } catch (error) {
        console.warn('Failed to persist embedding cache:', error);
      }
    },
    
    async load(): Promise<void> {
      try {
        const entries = await db.embeddingCache?.toArray();
        if (entries) {
          for (const { key, embedding, accessTime } of entries) {
            memoryCache.set(key, { embedding, accessTime });
          }
        }
      } catch (error) {
        console.warn('Failed to load embedding cache:', error);
      }
    },
    
    getStats() {
      return { hits, misses, size: memoryCache.size };
    },
  };
}
```

需要在 `lib/db/schema.ts` 添加表定义:

```typescript
// 在现有 schema 中添加
embeddingCache: '&key, embedding, accessTime',
```

---

### 3.7 添加 `findRelevantContent` API

**新建 `lib/ai/rag/find-relevant.ts`**:

```typescript
/**
 * Find Relevant Content Utility
 * 
 * High-level API for finding relevant content from embeddings
 */

import { embed, cosineSimilarity } from 'ai';
import type { EmbeddingModel } from 'ai';

export interface DocumentWithEmbedding {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface RelevantContent {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface FindRelevantOptions {
  /** Embedding model to use for query */
  embeddingModel: EmbeddingModel<string>;
  /** Minimum similarity threshold (0-1) */
  similarityThreshold?: number;
  /** Maximum number of results */
  topK?: number;
  /** Maximum retries for embedding generation */
  maxRetries?: number;
}

/**
 * Find relevant content from a collection of documents
 * 
 * @example
 * ```typescript
 * const results = await findRelevantContent(
 *   'What is machine learning?',
 *   documents,
 *   {
 *     embeddingModel: openai.embedding('text-embedding-3-small'),
 *     similarityThreshold: 0.5,
 *     topK: 5,
 *   }
 * );
 * ```
 */
export async function findRelevantContent(
  query: string,
  documents: DocumentWithEmbedding[],
  options: FindRelevantOptions
): Promise<RelevantContent[]> {
  const { 
    embeddingModel, 
    similarityThreshold = 0.5, 
    topK = 5,
    maxRetries = 2,
  } = options;

  if (documents.length === 0) {
    return [];
  }

  // Generate query embedding
  const { embedding: queryEmbedding } = await embed({
    model: embeddingModel,
    value: query,
    maxRetries,
  });

  // Calculate similarities
  const results: RelevantContent[] = documents
    .map(doc => ({
      id: doc.id,
      content: doc.content,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding),
      metadata: doc.metadata,
    }))
    .filter(r => r.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

/**
 * Find relevant content using pre-computed query embedding
 */
export function findRelevantContentWithEmbedding(
  queryEmbedding: number[],
  documents: DocumentWithEmbedding[],
  options: {
    similarityThreshold?: number;
    topK?: number;
  } = {}
): RelevantContent[] {
  const { similarityThreshold = 0.5, topK = 5 } = options;

  return documents
    .map(doc => ({
      id: doc.id,
      content: doc.content,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding),
      metadata: doc.metadata,
    }))
    .filter(r => r.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Batch find relevant content for multiple queries
 */
export async function batchFindRelevantContent(
  queries: string[],
  documents: DocumentWithEmbedding[],
  options: FindRelevantOptions
): Promise<Map<string, RelevantContent[]>> {
  const { embedMany } = await import('ai');
  const { 
    embeddingModel, 
    similarityThreshold = 0.5, 
    topK = 5,
    maxRetries = 2,
  } = options;

  // Generate all query embeddings at once
  const { embeddings: queryEmbeddings } = await embedMany({
    model: embeddingModel,
    values: queries,
    maxRetries,
  });

  // Find relevant content for each query
  const results = new Map<string, RelevantContent[]>();
  
  for (let i = 0; i < queries.length; i++) {
    const relevant = findRelevantContentWithEmbedding(
      queryEmbeddings[i],
      documents,
      { similarityThreshold, topK }
    );
    results.set(queries[i], relevant);
  }

  return results;
}
```

---

### 3.8 增强错误处理和重试

**修改 `lib/ai/embedding.ts`**:

```typescript
export interface EmbeddingConfig {
  // ... existing fields ...
  maxRetries?: number;        // AI SDK 内置支持，默认 2
  abortSignal?: AbortSignal;  // 支持取消请求
  onError?: (error: Error) => void;  // 错误回调
}

export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
  // Check cache first
  if (config.cache) {
    const cacheKey = getCacheKey(text, config);
    const cached = config.cache.get(cacheKey);
    if (cached) {
      return { embedding: cached, usage: undefined };
    }
  }

  try {
    const model = getEmbeddingModel(config);

    const result = await embed({
      model,
      value: text,
      maxRetries: config.maxRetries ?? 2,      // 使用 AI SDK 内置重试
      abortSignal: config.abortSignal,         // 支持取消
    });

    // Store in cache
    if (config.cache) {
      const cacheKey = getCacheKey(text, config);
      config.cache.set(cacheKey, result.embedding);
    }

    return {
      embedding: result.embedding,
      usage: result.usage ? { tokens: result.usage.tokens } : undefined,
    };
  } catch (error) {
    config.onError?.(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function generateEmbeddings(
  texts: string[],
  config: EmbeddingConfig
): Promise<BatchEmbeddingResult> {
  // ... cache check logic ...

  try {
    const model = getEmbeddingModel(config);
    const result = await embedMany({
      model,
      values: textsToEmbed.map((t) => t.text),
      maxRetries: config.maxRetries ?? 2,
      maxParallelCalls: config.maxParallelCalls ?? 5,
      abortSignal: config.abortSignal,
    });

    // ... merge results and cache ...
    
    return {
      embeddings: results as number[][],
      usage: result.usage ? { tokens: result.usage.tokens } : undefined,
    };
  } catch (error) {
    config.onError?.(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
```

---

### 3.9 添加 `providerOptions` 支持

**修改 `lib/ai/embedding.ts`**:

```typescript
export interface EmbeddingConfig {
  // ... existing fields ...
  providerOptions?: {
    openai?: {
      dimensions?: number;
      user?: string;
    };
    google?: {
      outputDimensionality?: number;
      taskType?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
    };
    cohere?: {
      inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
      truncate?: 'NONE' | 'START' | 'END';
    };
    bedrock?: {
      dimensions?: number;
      normalize?: boolean;
    };
  };
}

export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
  // ... cache check ...

  const model = getEmbeddingModel(config);

  const result = await embed({
    model,
    value: text,
    maxRetries: config.maxRetries ?? 2,
    abortSignal: config.abortSignal,
    providerOptions: config.providerOptions,  // 传递 provider 特定选项
  });

  // ... cache and return ...
}
```

---

## 4. 文件变更清单

### 新建文件

| 文件路径 | 说明 |
|----------|------|
| `lib/ai/embedding-model-factory.ts` | Embedding 模型工厂，支持默认配置 |
| `lib/ai/embedding-cache.ts` | 持久化缓存实现 |
| `lib/ai/rag/rag-tools.ts` | RAG Tools 定义 |
| `lib/ai/rag/find-relevant.ts` | 高级查找 API |
| `lib/ai/rag/rag-tools.test.ts` | 工具测试 |
| `lib/ai/rag/find-relevant.test.ts` | 查找 API 测试 |
| `lib/ai/embedding-cache.test.ts` | 缓存测试 |

### 修改文件

| 文件路径 | 改动说明 |
|----------|----------|
| `lib/ai/embedding.ts` | 使用 AI SDK cosineSimilarity、添加 provider、增强配置 |
| `lib/ai/rag/rag-pipeline.ts` | 删除重复 cosineSimilarity，使用导入 |
| `lib/ai/rag/reranker.ts` | 删除重复 cosineSimilarity，使用导入 |
| `lib/ai/rag/index.ts` | 导出新模块 |
| `lib/vector/embedding.ts` | 同步类型更新 |
| `hooks/use-rag.ts` | 添加新功能支持 |
| `lib/db/schema.ts` | 添加 embeddingCache 表 |

---

## 5. 实施顺序

建议按以下顺序实施：

### 阶段 1: 基础改进 (低风险)

1. ✅ 使用 AI SDK 原生 `cosineSimilarity`
2. ✅ 添加 `maxParallelCalls` 支持
3. ✅ 增强错误处理和重试机制

### 阶段 2: 新功能 (中等风险)

1. 新建 `findRelevantContent` API
2. 新建 RAG Tools
3. 添加更多 embedding provider

### 阶段 3: 高级功能 (需要更多测试)

1. 使用 `wrapEmbeddingModel` 中间件
2. 实现持久化缓存
3. 添加 `providerOptions` 支持

### 阶段 4: 测试和文档

1. 更新所有测试用例
2. 更新文档

---

## 6. 依赖变更

```bash
# 需要安装的新依赖
pnpm add @ai-sdk/amazon-bedrock @ai-sdk/azure

# 可选社区 provider
pnpm add voyage-ai-provider
```

---

## 7. 参考文档

- [AI SDK Embeddings](https://ai-sdk.dev/docs/ai-sdk-core/embeddings)
- [AI SDK RAG Chatbot Guide](https://ai-sdk.dev/cookbook/guides/rag-chatbot)
- [AI SDK Tools](https://ai-sdk.dev/docs/foundations/tools)
- [AI SDK Migration Guide 5.0](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0)
