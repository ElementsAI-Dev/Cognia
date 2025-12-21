/**
 * Unified Vector Store Interface
 * Provides a consistent API across different vector database backends
 */

import type { EmbeddingModelConfig } from './embedding';

export type VectorStoreProvider = 'chroma' | 'pinecone' | 'qdrant';

export interface VectorDocument {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

export interface VectorSearchResult {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  score: number;
}

export interface VectorStoreConfig {
  provider: VectorStoreProvider;
  embeddingConfig: EmbeddingModelConfig;
  embeddingApiKey: string;
  // Chroma-specific
  chromaMode?: 'embedded' | 'server';
  chromaServerUrl?: string;
  // Pinecone-specific
  pineconeApiKey?: string;
  pineconeIndexName?: string;
  pineconeNamespace?: string;
  // Qdrant-specific
  qdrantUrl?: string;
  qdrantApiKey?: string;
  qdrantCollectionName?: string;
}

export interface VectorCollectionInfo {
  name: string;
  documentCount: number;
  dimension?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  topK?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
}

/**
 * Abstract Vector Store interface
 */
export interface IVectorStore {
  readonly provider: VectorStoreProvider;
  
  addDocuments(collectionName: string, documents: VectorDocument[]): Promise<void>;
  
  updateDocuments(collectionName: string, documents: VectorDocument[]): Promise<void>;
  
  deleteDocuments(collectionName: string, ids: string[]): Promise<void>;
  
  searchDocuments(
    collectionName: string,
    query: string,
    options?: SearchOptions
  ): Promise<VectorSearchResult[]>;
  
  getDocuments(collectionName: string, ids: string[]): Promise<VectorDocument[]>;
  
  createCollection(
    name: string,
    options?: { dimension?: number; metadata?: Record<string, unknown> }
  ): Promise<void>;
  
  deleteCollection(name: string): Promise<void>;
  
  listCollections(): Promise<VectorCollectionInfo[]>;
  
  getCollectionInfo(name: string): Promise<VectorCollectionInfo>;
}

/**
 * Chroma Vector Store implementation
 */
export class ChromaVectorStore implements IVectorStore {
  readonly provider: VectorStoreProvider = 'chroma';
  private config: VectorStoreConfig;
  private chromaClient: import('chromadb').ChromaClient | null = null;

  constructor(config: VectorStoreConfig) {
    this.config = config;
  }

  private async getClient(): Promise<import('chromadb').ChromaClient> {
    if (!this.chromaClient) {
      const { ChromaClient } = await import('chromadb');
      if (this.config.chromaMode === 'server' && this.config.chromaServerUrl) {
        this.chromaClient = new ChromaClient({ path: this.config.chromaServerUrl });
      } else {
        this.chromaClient = new ChromaClient();
      }
    }
    return this.chromaClient;
  }

  async addDocuments(collectionName: string, documents: VectorDocument[]): Promise<void> {
    const client = await this.getClient();
    const collection = await client.getOrCreateCollection({ name: collectionName });
    
    const { generateEmbeddings } = await import('./embedding');
    
    const ids = documents.map((doc) => doc.id);
    const contents = documents.map((doc) => doc.content);
    const metadatas = documents.map((doc) => doc.metadata || {});

    const needsEmbedding = documents.some((doc) => !doc.embedding);
    let embeddings: number[][] | undefined;

    if (needsEmbedding) {
      const textsToEmbed = documents.filter((doc) => !doc.embedding).map((doc) => doc.content);
      if (textsToEmbed.length > 0) {
        const result = await generateEmbeddings(textsToEmbed, this.config.embeddingConfig, this.config.embeddingApiKey);
        let embeddingIndex = 0;
        embeddings = documents.map((doc) => {
          if (doc.embedding) return doc.embedding;
          return result.embeddings[embeddingIndex++];
        });
      }
    } else {
      embeddings = documents.map((doc) => doc.embedding!);
    }

    await collection.add({
      ids,
      documents: contents,
      metadatas: metadatas as import('chromadb').Metadata[],
      embeddings,
    });
  }

  async updateDocuments(collectionName: string, documents: VectorDocument[]): Promise<void> {
    const client = await this.getClient();
    const collection = await client.getCollection({ name: collectionName });
    
    const { generateEmbeddings } = await import('./embedding');
    
    const ids = documents.map((doc) => doc.id);
    const contents = documents.map((doc) => doc.content);
    const metadatas = documents.map((doc) => doc.metadata || {});

    const result = await generateEmbeddings(contents, this.config.embeddingConfig, this.config.embeddingApiKey);

    await collection.update({
      ids,
      documents: contents,
      metadatas: metadatas as import('chromadb').Metadata[],
      embeddings: result.embeddings,
    });
  }

  async deleteDocuments(collectionName: string, ids: string[]): Promise<void> {
    const client = await this.getClient();
    const collection = await client.getCollection({ name: collectionName });
    await collection.delete({ ids });
  }

  async searchDocuments(
    collectionName: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const client = await this.getClient();
    const collection = await client.getCollection({ name: collectionName });
    
    const { generateEmbedding } = await import('./embedding');
    const { topK = 5 } = options;

    const queryResult = await generateEmbedding(query, this.config.embeddingConfig, this.config.embeddingApiKey);

    const results = await collection.query({
      queryEmbeddings: [queryResult.embedding],
      nResults: topK,
      include: ['documents', 'metadatas', 'distances'],
    });

    const searchResults: VectorSearchResult[] = [];
    const resultIds = results.ids[0] || [];
    const resultDocs = results.documents?.[0] || [];
    const resultMeta = results.metadatas?.[0] || [];
    const resultDist = results.distances?.[0] || [];

    for (let i = 0; i < resultIds.length; i++) {
      const distance = resultDist[i] || 0;
      if (options.threshold !== undefined && (1 - distance) < options.threshold) continue;
      searchResults.push({
        id: resultIds[i],
        content: resultDocs[i] || '',
        metadata: resultMeta[i] as Record<string, unknown> | undefined,
        score: 1 - distance,
      });
    }

    return searchResults;
  }

  async getDocuments(collectionName: string, ids: string[]): Promise<VectorDocument[]> {
    const client = await this.getClient();
    const collection = await client.getCollection({ name: collectionName });
    const results = await collection.get({ ids, include: ['documents', 'metadatas', 'embeddings'] });

    return results.ids.map((id, i) => ({
      id,
      content: results.documents?.[i] || '',
      metadata: results.metadatas?.[i] as Record<string, unknown> | undefined,
      embedding: results.embeddings?.[i] as number[] | undefined,
    }));
  }

  async createCollection(
    name: string,
    options?: { dimension?: number; metadata?: Record<string, unknown> }
  ): Promise<void> {
    const client = await this.getClient();
    await client.getOrCreateCollection({
      name,
      metadata: options?.metadata as import('chromadb').CollectionMetadata,
    });
  }

  async deleteCollection(name: string): Promise<void> {
    const client = await this.getClient();
    await client.deleteCollection({ name });
  }

  async listCollections(): Promise<VectorCollectionInfo[]> {
    const client = await this.getClient();
    const collections = await client.listCollections();
    const infos: VectorCollectionInfo[] = [];

    for (const collectionName of collections as unknown as string[]) {
      try {
        const collection = await client.getCollection({ name: collectionName });
        const count = await collection.count();
        infos.push({ name: collectionName, documentCount: count });
      } catch {
        infos.push({ name: collectionName, documentCount: 0 });
      }
    }

    return infos;
  }

  async getCollectionInfo(name: string): Promise<VectorCollectionInfo> {
    const client = await this.getClient();
    const collection = await client.getCollection({ name });
    const count = await collection.count();
    return { name, documentCount: count };
  }
}

/**
 * Pinecone Vector Store implementation
 */
export class PineconeVectorStore implements IVectorStore {
  readonly provider: VectorStoreProvider = 'pinecone';
  private config: VectorStoreConfig;
  private pineconeClient: import('@pinecone-database/pinecone').Pinecone | null = null;

  constructor(config: VectorStoreConfig) {
    this.config = config;
  }

  private async getClient(): Promise<import('@pinecone-database/pinecone').Pinecone> {
    if (!this.pineconeClient) {
      const { Pinecone } = await import('@pinecone-database/pinecone');
      this.pineconeClient = new Pinecone({ apiKey: this.config.pineconeApiKey! });
    }
    return this.pineconeClient;
  }

  async addDocuments(collectionName: string, documents: VectorDocument[]): Promise<void> {
    const client = await this.getClient();
    const index = client.index(collectionName);
    
    const { generateEmbeddings } = await import('./embedding');

    const needsEmbedding = documents.some((doc) => !doc.embedding);
    let embeddings: number[][] | undefined;

    if (needsEmbedding) {
      const textsToEmbed = documents.filter((doc) => !doc.embedding).map((doc) => doc.content);
      if (textsToEmbed.length > 0) {
        const result = await generateEmbeddings(textsToEmbed, this.config.embeddingConfig, this.config.embeddingApiKey);
        let embeddingIndex = 0;
        embeddings = documents.map((doc) => {
          if (doc.embedding) return doc.embedding;
          return result.embeddings[embeddingIndex++];
        });
      }
    } else {
      embeddings = documents.map((doc) => doc.embedding!);
    }

    const vectors = documents.map((doc, i) => ({
      id: doc.id,
      values: embeddings![i],
      metadata: { content: doc.content, ...doc.metadata },
    }));

    const ns = this.config.pineconeNamespace ? index.namespace(this.config.pineconeNamespace) : index;
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      await ns.upsert(vectors.slice(i, i + batchSize));
    }
  }

  async updateDocuments(collectionName: string, documents: VectorDocument[]): Promise<void> {
    await this.addDocuments(collectionName, documents);
  }

  async deleteDocuments(collectionName: string, ids: string[]): Promise<void> {
    const client = await this.getClient();
    const index = client.index(collectionName);
    const ns = this.config.pineconeNamespace ? index.namespace(this.config.pineconeNamespace) : index;
    await ns.deleteMany(ids);
  }

  async searchDocuments(
    collectionName: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const client = await this.getClient();
    const index = client.index(collectionName);
    
    const { generateEmbedding } = await import('./embedding');
    const { topK = 5, filter } = options;

    const queryResult = await generateEmbedding(query, this.config.embeddingConfig, this.config.embeddingApiKey);

    const ns = this.config.pineconeNamespace ? index.namespace(this.config.pineconeNamespace) : index;
    const results = await ns.query({
      vector: queryResult.embedding,
      topK,
      filter,
      includeMetadata: true,
    });

    return (results.matches || [])
      .filter((match) => !options.threshold || (match.score || 0) >= options.threshold)
      .map((match) => ({
        id: match.id,
        content: (match.metadata?.content as string) || '',
        metadata: match.metadata as Record<string, unknown> | undefined,
        score: match.score || 0,
      }));
  }

  async getDocuments(collectionName: string, ids: string[]): Promise<VectorDocument[]> {
    const client = await this.getClient();
    const index = client.index(collectionName);
    const ns = this.config.pineconeNamespace ? index.namespace(this.config.pineconeNamespace) : index;
    const results = await ns.fetch(ids);

    return Object.entries(results.records || {}).map(([id, record]) => ({
      id,
      content: (record.metadata?.content as string) || '',
      metadata: record.metadata as Record<string, unknown> | undefined,
      embedding: record.values,
    }));
  }

  async createCollection(
    name: string,
    options?: { dimension?: number; metadata?: Record<string, unknown> }
  ): Promise<void> {
    const client = await this.getClient();
    await client.createIndex({
      name,
      dimension: options?.dimension || this.config.embeddingConfig.dimensions || 1536,
      metric: 'cosine',
      spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
    });
  }

  async deleteCollection(name: string): Promise<void> {
    const client = await this.getClient();
    await client.deleteIndex(name);
  }

  async listCollections(): Promise<VectorCollectionInfo[]> {
    const client = await this.getClient();
    const response = await client.listIndexes();
    return (response.indexes || []).map((idx) => ({
      name: idx.name,
      documentCount: 0,
      dimension: idx.dimension,
    }));
  }

  async getCollectionInfo(name: string): Promise<VectorCollectionInfo> {
    const client = await this.getClient();
    const index = client.index(name);
    const stats = await index.describeIndexStats();
    return {
      name,
      documentCount: stats.totalRecordCount || 0,
      dimension: stats.dimension,
    };
  }
}

/**
 * Qdrant Vector Store implementation
 */
export class QdrantVectorStore implements IVectorStore {
  readonly provider: VectorStoreProvider = 'qdrant';
  private config: VectorStoreConfig;
  private qdrantClient: import('@qdrant/js-client-rest').QdrantClient | null = null;

  constructor(config: VectorStoreConfig) {
    this.config = config;
  }

  private async getClient(): Promise<import('@qdrant/js-client-rest').QdrantClient> {
    if (!this.qdrantClient) {
      const { QdrantClient } = await import('@qdrant/js-client-rest');
      this.qdrantClient = new QdrantClient({
        url: this.config.qdrantUrl!,
        apiKey: this.config.qdrantApiKey,
      });
    }
    return this.qdrantClient;
  }

  async addDocuments(collectionName: string, documents: VectorDocument[]): Promise<void> {
    const client = await this.getClient();
    
    const { generateEmbeddings } = await import('./embedding');

    const needsEmbedding = documents.some((doc) => !doc.embedding);
    let embeddings: number[][] | undefined;

    if (needsEmbedding) {
      const textsToEmbed = documents.filter((doc) => !doc.embedding).map((doc) => doc.content);
      if (textsToEmbed.length > 0) {
        const result = await generateEmbeddings(textsToEmbed, this.config.embeddingConfig, this.config.embeddingApiKey);
        let embeddingIndex = 0;
        embeddings = documents.map((doc) => {
          if (doc.embedding) return doc.embedding;
          return result.embeddings[embeddingIndex++];
        });
      }
    } else {
      embeddings = documents.map((doc) => doc.embedding!);
    }

    const points = documents.map((doc, i) => ({
      id: doc.id,
      vector: embeddings![i],
      payload: { content: doc.content, ...doc.metadata },
    }));

    const batchSize = 100;
    for (let i = 0; i < points.length; i += batchSize) {
      await client.upsert(collectionName, { wait: true, points: points.slice(i, i + batchSize) });
    }
  }

  async updateDocuments(collectionName: string, documents: VectorDocument[]): Promise<void> {
    await this.addDocuments(collectionName, documents);
  }

  async deleteDocuments(collectionName: string, ids: string[]): Promise<void> {
    const client = await this.getClient();
    await client.delete(collectionName, { wait: true, points: ids });
  }

  async searchDocuments(
    collectionName: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const client = await this.getClient();
    
    const { generateEmbedding } = await import('./embedding');
    const { topK = 5, filter, threshold } = options;

    const queryResult = await generateEmbedding(query, this.config.embeddingConfig, this.config.embeddingApiKey);

    const results = await client.search(collectionName, {
      vector: queryResult.embedding,
      limit: topK,
      filter: filter as Record<string, unknown> | undefined,
      score_threshold: threshold,
      with_payload: true,
    });

    return results.map((result) => ({
      id: String(result.id),
      content: (result.payload?.content as string) || '',
      metadata: result.payload as Record<string, unknown> | undefined,
      score: result.score,
    }));
  }

  async getDocuments(collectionName: string, ids: string[]): Promise<VectorDocument[]> {
    const client = await this.getClient();
    const results = await client.retrieve(collectionName, { ids, with_payload: true, with_vector: true });

    return results.map((point) => ({
      id: String(point.id),
      content: (point.payload?.content as string) || '',
      metadata: point.payload as Record<string, unknown> | undefined,
      embedding: point.vector as number[] | undefined,
    }));
  }

  async createCollection(
    name: string,
    options?: { dimension?: number; metadata?: Record<string, unknown> }
  ): Promise<void> {
    const client = await this.getClient();
    await client.createCollection(name, {
      vectors: {
        size: options?.dimension || this.config.embeddingConfig.dimensions || 1536,
        distance: 'Cosine',
      },
    });
  }

  async deleteCollection(name: string): Promise<void> {
    const client = await this.getClient();
    await client.deleteCollection(name);
  }

  async listCollections(): Promise<VectorCollectionInfo[]> {
    const client = await this.getClient();
    const response = await client.getCollections();
    const infos: VectorCollectionInfo[] = [];

    for (const collection of response.collections) {
      try {
        const info = await client.getCollection(collection.name);
        const vectors = info.config.params.vectors;
        infos.push({
          name: collection.name,
          documentCount: info.points_count ?? 0,
          dimension: typeof vectors === 'object' && vectors !== null && 'size' in vectors
            ? (vectors as { size: number }).size
            : undefined,
        });
      } catch {
        infos.push({ name: collection.name, documentCount: 0 });
      }
    }

    return infos;
  }

  async getCollectionInfo(name: string): Promise<VectorCollectionInfo> {
    const client = await this.getClient();
    const info = await client.getCollection(name);
    const vectors = info.config.params.vectors;
    return {
      name,
      documentCount: info.points_count ?? 0,
      dimension: typeof vectors === 'object' && vectors !== null && 'size' in vectors
        ? (vectors as { size: number }).size
        : undefined,
    };
  }
}

/**
 * Create a vector store instance based on provider
 */
export function createVectorStore(config: VectorStoreConfig): IVectorStore {
  switch (config.provider) {
    case 'chroma':
      return new ChromaVectorStore(config);
    case 'pinecone':
      if (!config.pineconeApiKey) {
        throw new Error('Pinecone API key is required');
      }
      return new PineconeVectorStore(config);
    case 'qdrant':
      if (!config.qdrantUrl) {
        throw new Error('Qdrant URL is required');
      }
      return new QdrantVectorStore(config);
    default:
      throw new Error(`Unsupported vector store provider: ${config.provider}`);
  }
}

/**
 * Get supported vector store providers
 */
export function getSupportedVectorStoreProviders(): VectorStoreProvider[] {
  return ['chroma', 'pinecone', 'qdrant'];
}
