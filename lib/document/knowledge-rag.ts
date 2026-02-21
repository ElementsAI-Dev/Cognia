/**
 * Knowledge Base - RAG Integration
 * Utilities to convert knowledge files to RAG-compatible format and build context
 * Enhanced with local vector storage support
 */

import type { KnowledgeFile, Project } from '@/types';
import type { RAGDocument } from '@/types/document/rag';
import type { EmbeddingProvider } from '@/lib/vector/embedding';
import { chunkDocument, type ChunkingOptions, type DocumentChunk } from '@/lib/ai/embedding/chunking';
import { projectRepository } from '@/lib/db/repositories/project-repository';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

/**
 * Convert a KnowledgeFile to RAGDocument format
 */
export function knowledgeFileToRAGDocument(file: KnowledgeFile): RAGDocument {
  return {
    id: file.id,
    content: file.content,
    title: file.name,
    source: `knowledge-base/${file.name}`,
    metadata: {
      type: file.type,
      size: file.size,
      createdAt: file.createdAt instanceof Date 
        ? file.createdAt.toISOString() 
        : String(file.createdAt),
      mimeType: file.mimeType || '',
    },
  };
}

/**
 * Convert multiple knowledge files to RAG documents
 */
export function knowledgeFilesToRAGDocuments(files: KnowledgeFile[]): RAGDocument[] {
  return files.map(knowledgeFileToRAGDocument);
}

/**
 * Build context string from knowledge files for direct injection
 * Used when RAG vector search is not available
 */
export function buildKnowledgeContext(
  files: KnowledgeFile[],
  options: {
    maxLength?: number;
    includeMetadata?: boolean;
    relevantTypes?: KnowledgeFile['type'][];
  } = {}
): string {
  const {
    maxLength = 8000,
    includeMetadata = true,
    relevantTypes,
  } = options;

  // Filter by types if specified
  const filteredFiles = relevantTypes
    ? files.filter((f) => relevantTypes.includes(f.type))
    : files;

  if (filteredFiles.length === 0) {
    return '';
  }

  const parts: string[] = [];
  let currentLength = 0;

  for (const file of filteredFiles) {
    const header = `### ${file.name}`;
    const metadata = includeMetadata
      ? `\n*Type: ${file.type} | Size: ${formatSize(file.size)}*\n`
      : '\n';
    const content = file.content;
    const section = `${header}${metadata}\n${content}\n\n`;

    if (currentLength + section.length > maxLength) {
      // Truncate content if needed
      const remaining = maxLength - currentLength - header.length - metadata.length - 50;
      if (remaining > 200) {
        const truncatedContent = content.slice(0, remaining) + '\n\n[Content truncated...]';
        parts.push(`${header}${metadata}\n${truncatedContent}\n`);
      }
      break;
    }

    parts.push(section);
    currentLength += section.length;
  }

  return parts.join('');
}

/**
 * Chunk all knowledge files for indexing
 */
export function chunkKnowledgeFiles(
  files: KnowledgeFile[],
  options?: Partial<ChunkingOptions>
): { fileId: string; fileName: string; chunks: DocumentChunk[] }[] {
  return files.map((file) => {
    const result = chunkDocument(file.content, options, file.id);
    return {
      fileId: file.id,
      fileName: file.name,
      chunks: result.chunks.map((chunk) => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          fileName: file.name,
          fileType: file.type,
        },
      })),
    };
  });
}

/**
 * Search knowledge files by keyword (simple text search)
 * Used as fallback when vector search is not available
 */
export function searchKnowledgeFiles(
  files: KnowledgeFile[],
  query: string,
  options: {
    caseSensitive?: boolean;
    maxResults?: number;
    contextWindow?: number;
  } = {}
): {
  file: KnowledgeFile;
  matches: { text: string; position: number }[];
  score: number;
}[] {
  const {
    caseSensitive = false,
    maxResults = 10,
    contextWindow = 100,
  } = options;

  const searchQuery = caseSensitive ? query : query.toLowerCase();
  const results: {
    file: KnowledgeFile;
    matches: { text: string; position: number }[];
    score: number;
  }[] = [];

  for (const file of files) {
    const content = caseSensitive ? file.content : file.content.toLowerCase();
    const matches: { text: string; position: number }[] = [];
    let position = 0;

    while ((position = content.indexOf(searchQuery, position)) !== -1) {
      // Extract context around match
      const start = Math.max(0, position - contextWindow);
      const end = Math.min(file.content.length, position + searchQuery.length + contextWindow);
      const text = file.content.slice(start, end);

      matches.push({ text, position });
      position += searchQuery.length;
    }

    if (matches.length > 0) {
      // Score based on number of matches and file relevance
      const score = matches.length * (1 + (file.type === 'markdown' ? 0.2 : 0));
      results.push({ file, matches, score });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, maxResults);
}

/**
 * Get relevant knowledge files for a query using simple heuristics
 * Used when semantic search is not available
 */
export function getRelevantKnowledge(
  files: KnowledgeFile[],
  query: string,
  maxFiles: number = 5
): KnowledgeFile[] {
  if (files.length === 0) return [];

  // Extract keywords from query
  const keywords = extractKeywords(query);

  // Score each file
  const scored = files.map((file) => {
    let score = 0;
    const contentLower = file.content.toLowerCase();
    const nameLower = file.name.toLowerCase();

    for (const keyword of keywords) {
      // Name matches are worth more
      if (nameLower.includes(keyword)) {
        score += 5;
      }
      // Count content matches
      const regex = new RegExp(escapeRegExp(keyword), 'gi');
      const contentMatches = (contentLower.match(regex) || []).length;
      score += Math.min(contentMatches, 10); // Cap to avoid bias toward large files
    }

    // Bonus for certain file types
    if (file.type === 'markdown') score *= 1.2;
    if (file.type === 'code') score *= 1.1;

    return { file, score };
  });

  // Sort by score and return top files
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles)
    .map((s) => s.file);
}

/**
 * Build system prompt enhancement with knowledge context
 */
export function buildKnowledgeSystemPrompt(
  basePrompt: string | undefined,
  knowledgeContext: string
): string {
  const base = basePrompt || 'You are a helpful AI assistant.';

  if (!knowledgeContext) {
    return base;
  }

  return `${base}

## Project Knowledge Base

The following is reference information from the project's knowledge base. Use this context to provide accurate and relevant responses:

${knowledgeContext}

---
When answering questions, prioritize information from the knowledge base when relevant. If the knowledge base doesn't contain the answer, you may use your general knowledge but clearly indicate this.`;
}

/**
 * Build context for a project session
 */
export function buildProjectContext(
  project: Project,
  query?: string,
  options: {
    maxContextLength?: number;
    useRelevanceFiltering?: boolean;
  } = {}
): {
  systemPrompt: string;
  knowledgeContext: string;
  filesUsed: string[];
} {
  const { maxContextLength = 6000, useRelevanceFiltering = true } = options;

  let relevantFiles: KnowledgeFile[];

  if (useRelevanceFiltering && query && project.knowledgeBase.length > 5) {
    // Use relevance filtering for larger knowledge bases
    relevantFiles = getRelevantKnowledge(project.knowledgeBase, query);
  } else {
    // Use all files for smaller knowledge bases
    relevantFiles = project.knowledgeBase;
  }

  const knowledgeContext = buildKnowledgeContext(relevantFiles, {
    maxLength: maxContextLength,
    includeMetadata: true,
  });

  const systemPrompt = buildKnowledgeSystemPrompt(
    project.customInstructions,
    knowledgeContext
  );

  return {
    systemPrompt,
    knowledgeContext,
    filesUsed: relevantFiles.map((f) => f.name),
  };
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract keywords from a query
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'about',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am',
    'it', 'its', 'my', 'your', 'his', 'her', 'our', 'their', 'me', 'him',
    'her', 'us', 'them', 'i', 'you', 'he', 'she', 'we', 'they',
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get knowledge base statistics
 */
export function getKnowledgeBaseStats(files: KnowledgeFile[]): {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
  averageSize: number;
  estimatedTokens: number;
} {
  const byType: Record<string, number> = {};
  let totalSize = 0;

  for (const file of files) {
    totalSize += file.size;
    byType[file.type] = (byType[file.type] || 0) + 1;
  }

  return {
    totalFiles: files.length,
    totalSize,
    byType,
    averageSize: files.length > 0 ? Math.round(totalSize / files.length) : 0,
    estimatedTokens: Math.ceil(totalSize / 4), // Rough estimate: 4 chars per token
  };
}

// ============================================================================
// Local Storage Integration
// ============================================================================

/**
 * Load knowledge files from database for a project
 */
export async function loadProjectKnowledge(projectId: string): Promise<KnowledgeFile[]> {
  return projectRepository.getKnowledgeFiles(projectId);
}

/**
 * Save a knowledge file to a project in the database
 */
export async function saveKnowledgeFile(
  projectId: string,
  file: Omit<KnowledgeFile, 'id' | 'createdAt' | 'updatedAt'>
): Promise<KnowledgeFile> {
  return projectRepository.addKnowledgeFile(projectId, {
    name: file.name,
    type: file.type,
    content: file.content,
    size: file.size,
    mimeType: file.mimeType,
    originalSize: file.originalSize,
    pageCount: file.pageCount,
  });
}

/**
 * Delete a knowledge file from the database
 */
export async function deleteKnowledgeFile(fileId: string): Promise<void> {
  return projectRepository.deleteKnowledgeFile(fileId);
}

/**
 * Build context for a project with database-backed knowledge
 */
export async function buildProjectContextFromDB(
  projectId: string,
  query?: string,
  options: {
    maxContextLength?: number;
    useRelevanceFiltering?: boolean;
  } = {}
): Promise<{
  systemPrompt: string;
  knowledgeContext: string;
  filesUsed: string[];
}> {
  const project = await projectRepository.getById(projectId);
  if (!project) {
    return {
      systemPrompt: 'You are a helpful AI assistant.',
      knowledgeContext: '',
      filesUsed: [],
    };
  }

  return buildProjectContext(project, query, options);
}

/**
 * Sync knowledge files between in-memory project and database
 */
export async function syncKnowledgeBase(
  projectId: string,
  files: KnowledgeFile[]
): Promise<void> {
  // Get existing files from DB
  const existingFiles = await projectRepository.getKnowledgeFiles(projectId);
  const existingIds = new Set(existingFiles.map((f) => f.id));
  const newIds = new Set(files.map((f) => f.id));

  // Delete files that are no longer in the list
  for (const existing of existingFiles) {
    if (!newIds.has(existing.id)) {
      await projectRepository.deleteKnowledgeFile(existing.id);
    }
  }

  // Add new files
  for (const file of files) {
    if (!existingIds.has(file.id)) {
      await projectRepository.addKnowledgeFile(projectId, {
        name: file.name,
        type: file.type,
        content: file.content,
        size: file.size,
        mimeType: file.mimeType,
        originalSize: file.originalSize,
        pageCount: file.pageCount,
      });
    }
  }
}

/**
 * Get knowledge base statistics from database
 */
export async function getProjectKnowledgeStats(projectId: string): Promise<{
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
}> {
  const files = await projectRepository.getKnowledgeFiles(projectId);
  const stats = getKnowledgeBaseStats(files);
  
  return {
    totalFiles: stats.totalFiles,
    totalSize: stats.totalSize,
    byType: stats.byType,
  };
}

// ============================================================================
// Advanced RAG Pipeline Integration
// ============================================================================

/**
 * Search knowledge base using the advanced RAG pipeline
 * with hybrid search, reranking, query expansion, and contextual retrieval.
 * Falls back to keyword search if pipeline setup fails.
 */
const knowledgeIndexState = new Map<string, Map<string, string>>();

function computeKnowledgeFingerprint(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

export async function searchKnowledgeBaseAdvanced(
  files: KnowledgeFile[],
  query: string,
  config: {
    embeddingProvider: EmbeddingProvider;
    embeddingModel: string;
    embeddingApiKey: string;
    enableHybridSearch?: boolean;
    enableReranking?: boolean;
    enableQueryExpansion?: boolean;
    topK?: number;
    similarityThreshold?: number;
    collectionName?: string;
  },
  scope: {
    projectId: string;
    collectionName?: string;
  }
): Promise<{
  context: string;
  filesUsed: KnowledgeFile[];
  method: 'pipeline' | 'keyword';
  searchMetadata?: {
    hybridSearchUsed: boolean;
    queryExpansionUsed: boolean;
    rerankingUsed: boolean;
    totalResults: number;
  };
}> {
  const { topK = 5, similarityThreshold = 0.3 } = config;
  const collectionName =
    scope.collectionName || config.collectionName || `knowledge-project:${scope.projectId}`;

  try {
    const { getSharedRAGRuntime } = await import('@/lib/ai/rag');
    const runtime = getSharedRAGRuntime(`knowledge:${scope.projectId}`, {
      vectorStore: {
        provider: 'chroma',
        embeddingConfig: {
          provider: config.embeddingProvider,
          model: config.embeddingModel,
        },
        embeddingApiKey: config.embeddingApiKey,
        chromaMode: 'embedded',
        native: {},
      },
      defaultCollectionName: collectionName,
      topK,
      similarityThreshold,
      hybridSearch: {
        enabled: config.enableHybridSearch ?? true,
      },
      reranking: {
        enabled: config.enableReranking ?? true,
      },
      queryExpansion: {
        enabled: config.enableQueryExpansion ?? false,
      },
    });

    // Incremental indexing: upsert changed documents, remove stale documents.
    const stateKey = `${scope.projectId}:${collectionName}`;
    const previousState = knowledgeIndexState.get(stateKey) || new Map<string, string>();
    const nextState = new Map<string, string>();
    const currentFileIds = new Set(files.map((file) => file.id));

    for (const file of files) {
      const fingerprint = computeKnowledgeFingerprint(file.content || '');
      nextState.set(file.id, fingerprint);
      const previousFingerprint = previousState.get(file.id);
      if (previousFingerprint === fingerprint) {
        continue;
      }

      // Replace all chunks for this source file, then re-index latest content.
      await runtime.deleteByDocumentId(collectionName, file.id);
      if (file.content) {
        await runtime.indexDocument(file.content, {
          collectionName,
          documentId: file.id,
          documentTitle: file.name,
          metadata: {
            type: file.type,
            name: file.name,
            size: file.size,
            projectId: scope.projectId,
            contentFingerprint: fingerprint,
          },
        });
      }
    }

    for (const previousFileId of previousState.keys()) {
      if (!currentFileIds.has(previousFileId)) {
        await runtime.deleteByDocumentId(collectionName, previousFileId);
      }
    }
    knowledgeIndexState.set(stateKey, nextState);

    // Retrieve relevant context after sync
    const result = await runtime.retrieve(collectionName, query);

    if (result.documents.length === 0) {
      // Fallback to keyword search
      const keywordFiles = getRelevantKnowledge(files, query, topK);
      return {
        context: buildKnowledgeContext(keywordFiles, { maxLength: 6000, includeMetadata: true }),
        filesUsed: keywordFiles,
        method: 'keyword',
      };
    }

    // Map result documents back to KnowledgeFile references
    const usedFileIds = new Set<string>();
    for (const doc of result.documents) {
      const docId = doc.metadata?.documentId as string;
      if (docId) usedFileIds.add(docId);
    }
    const filesUsed = files.filter((f) => usedFileIds.has(f.id));

    return {
      context: result.formattedContext,
      filesUsed,
      method: 'pipeline',
      searchMetadata: {
        hybridSearchUsed: result.searchMetadata.hybridSearchUsed,
        queryExpansionUsed: result.searchMetadata.queryExpansionUsed,
        rerankingUsed: result.searchMetadata.rerankingUsed,
        totalResults: result.documents.length,
      },
    };
  } catch (error) {
    log.warn('Advanced RAG pipeline search failed, falling back to keyword search', { error });
    const keywordFiles = getRelevantKnowledge(files, query, topK);
    return {
      context: buildKnowledgeContext(keywordFiles, { maxLength: 6000, includeMetadata: true }),
      filesUsed: keywordFiles,
      method: 'keyword',
    };
  }
}

// ============================================================================
// Vector Search Integration
// ============================================================================

export interface VectorSearchConfig {
  provider: 'openai' | 'google';
  model: string;
  apiKey: string;
}

/**
 * Search knowledge base using vector similarity
 * Falls back to keyword search if embedding fails
 */
export async function searchKnowledgeBaseVector(
  files: KnowledgeFile[],
  query: string,
  config: VectorSearchConfig,
  options: {
    topK?: number;
    threshold?: number;
  } = {}
): Promise<KnowledgeFile[]> {
  const { topK = 5, threshold = 0.5 } = options;

  try {
    // Generate query embedding
    const { generateEmbedding, findMostSimilar } = await import('@/lib/vector/embedding');
    
    const queryResult = await generateEmbedding(
      query,
      { provider: config.provider, model: config.model },
      config.apiKey
    );

    // Generate embeddings for all files (or use cached if available)
    const fileEmbeddings: { id: string; embedding: number[] }[] = [];
    
    for (const file of files) {
      const embeddingResult = await generateEmbedding(
        file.content.slice(0, 8000), // Limit content length
        { provider: config.provider, model: config.model },
        config.apiKey
      );
      fileEmbeddings.push({ id: file.id, embedding: embeddingResult.embedding });
    }

    // Find most similar
    const similar = findMostSimilar(queryResult.embedding, fileEmbeddings, topK, threshold);
    
    // Return matching files in order
    const resultFiles: KnowledgeFile[] = [];
    for (const match of similar) {
      const file = files.find((f) => f.id === match.id);
      if (file) {
        resultFiles.push(file);
      }
    }

    return resultFiles;
  } catch (error) {
    // Fall back to keyword search
    log.warn('Vector search failed, falling back to keyword search', { error });
    return getRelevantKnowledge(files, query, topK);
  }
}

/**
 * Build RAG context with vector search
 */
export async function buildRAGContextWithVectors(
  files: KnowledgeFile[],
  query: string,
  config: VectorSearchConfig,
  options: {
    maxContextLength?: number;
    topK?: number;
  } = {}
): Promise<{
  context: string;
  filesUsed: KnowledgeFile[];
  method: 'vector' | 'keyword';
}> {
  const { maxContextLength = 6000, topK = 5 } = options;

  let relevantFiles: KnowledgeFile[];
  let method: 'vector' | 'keyword' = 'vector';

  try {
    relevantFiles = await searchKnowledgeBaseVector(files, query, config, { topK });
  } catch {
    relevantFiles = getRelevantKnowledge(files, query, topK);
    method = 'keyword';
  }

  const context = buildKnowledgeContext(relevantFiles, {
    maxLength: maxContextLength,
    includeMetadata: true,
  });

  return {
    context,
    filesUsed: relevantFiles,
    method,
  };
}
