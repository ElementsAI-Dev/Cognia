/**
 * Knowledge Base - RAG Integration
 * Utilities to convert knowledge files to RAG-compatible format and build context
 */

import type { KnowledgeFile, Project } from '@/types';
import type { RAGDocument } from '@/lib/ai/rag';
import { chunkDocument, type ChunkingOptions, type DocumentChunk } from '@/lib/ai/chunking';

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
