/**
 * useMemory - Unified hook for memory system operations
 *
 * Features:
 * - Unified API for memory CRUD operations
 * - Semantic search using vector embeddings
 * - Memory decay and expiration management
 * - Conflict detection and resolution
 * - Session-scoped memories support
 * - Batch operations
 * - Relevance scoring
 */

import { useCallback, useMemo } from 'react';
import { useMemoryStore } from '@/stores';
import { useSettingsStore } from '@/stores';
import type {
  Memory,
  MemoryType,
  MemorySource,
  CreateMemoryInput,
  UpdateMemoryInput,
} from '@/types';
import { generateEmbedding, cosineSimilarity } from '@/lib/ai/embedding/embedding';
import type { EmbeddingConfig } from '@/lib/ai/embedding/embedding';

export interface MemorySearchOptions {
  query: string;
  type?: MemoryType;
  tags?: string[];
  limit?: number;
  threshold?: number;
  semantic?: boolean;
  sessionId?: string;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
  matchType: 'exact' | 'partial' | 'semantic';
}

export interface MemoryConflict {
  existing: Memory;
  incoming: CreateMemoryInput;
  similarity: number;
  suggestedAction: 'merge' | 'replace' | 'keep_both' | 'skip';
}

export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface MemoryRelevanceContext {
  currentMessage?: string;
  recentMessages?: string[];
  sessionId?: string;
  tags?: string[];
}

export interface RelevantMemory {
  memory: Memory;
  relevanceScore: number;
  matchReasons: string[];
}

export interface UseMemoryOptions {
  sessionId?: string;
  enableSemanticSearch?: boolean;
  autoDecay?: boolean;
  decayDays?: number;
}

export function useMemory(options: UseMemoryOptions = {}) {
  const {
    sessionId,
    enableSemanticSearch = false,
    autoDecay = false,
    decayDays = 30,
  } = options;

  // Store access
  const {
    memories,
    settings,
    createMemory: storeCreateMemory,
    updateMemory: storeUpdateMemory,
    deleteMemory: storeDeleteMemory,
    clearAllMemories,
    useMemory: trackMemoryUsage,
    togglePin,
    setPriority,
    updateSettings,
    getMemory,
    getMemoriesByType,
    getEnabledMemories,
    getPinnedMemories,
    searchMemories: storeSearchMemories,
    getAllTags,
    getMemoryStats,
    getMemoriesForPrompt,
    detectMemoryFromText,
    findSimilarMemories: storeFindSimilar,
    exportMemories,
    importMemories,
  } = useMemoryStore();

  // Get embedding config from settings
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Get embedding configuration for semantic search
  const getEmbeddingConfig = useCallback((): EmbeddingConfig | null => {
    // Try OpenAI first, then other providers
    const providers: Array<'openai' | 'google' | 'cohere' | 'mistral' | 'ollama'> = [
      'openai',
      'google',
      'cohere',
      'mistral',
      'ollama',
    ];

    for (const provider of providers) {
      const settings = providerSettings[provider];
      if (settings?.enabled && (settings.apiKey || provider === 'ollama')) {
        return {
          provider,
          apiKey: settings.apiKey || '',
          baseURL: settings.baseURL,
        };
      }
    }
    return null;
  }, [providerSettings]);

  // Filter memories by session if specified
  const sessionMemories = useMemo(() => {
    if (!sessionId) return memories;
    return memories.filter(
      (m) => !m.sessionId || m.sessionId === sessionId || m.sessionId === 'global'
    );
  }, [memories, sessionId]);

  // Calculate decay factor for a memory
  const calculateDecayFactor = useCallback(
    (memory: Memory): number => {
      if (!autoDecay) return 1;
      if (memory.pinned) return 1; // Pinned memories don't decay

      const daysSinceUsed = Math.floor(
        (Date.now() - new Date(memory.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUsed <= 0) return 1;
      if (daysSinceUsed >= decayDays) return 0.1; // Minimum decay factor

      // Exponential decay
      return Math.exp(-daysSinceUsed / decayDays);
    },
    [autoDecay, decayDays]
  );

  // Enhanced create memory with conflict detection
  const createMemory = useCallback(
    async (
      input: CreateMemoryInput,
      options?: { checkConflicts?: boolean; sessionScoped?: boolean }
    ): Promise<{ memory: Memory; conflict?: MemoryConflict }> => {
      const { checkConflicts = true, sessionScoped = false } = options || {};

      // Check for conflicts
      let conflict: MemoryConflict | undefined;
      if (checkConflicts) {
        const similar = storeFindSimilar(input.content);
        if (similar.length > 0) {
          const mostSimilar = similar[0];
          // Calculate word overlap as similarity
          const inputWords = new Set(input.content.toLowerCase().split(/\s+/));
          const existingWords = new Set(mostSimilar.content.toLowerCase().split(/\s+/));
          const intersection = [...inputWords].filter((w) => existingWords.has(w));
          const similarity = intersection.length / Math.max(inputWords.size, existingWords.size);

          if (similarity > 0.5) {
            conflict = {
              existing: mostSimilar,
              incoming: input,
              similarity,
              suggestedAction:
                similarity > 0.9
                  ? 'skip'
                  : similarity > 0.7
                    ? 'merge'
                    : 'keep_both',
            };
          }
        }
      }

      // Create the memory with session scope if specified
      const memoryInput: CreateMemoryInput & { sessionId?: string } = {
        ...input,
        ...(sessionScoped && sessionId ? { sessionId } : {}),
      };

      const memory = storeCreateMemory(memoryInput);
      return { memory, conflict };
    },
    [storeCreateMemory, storeFindSimilar, sessionId]
  );

  // Semantic search using embeddings
  const semanticSearch = useCallback(
    async (query: string, limit: number = 10): Promise<MemorySearchResult[]> => {
      const embeddingConfig = getEmbeddingConfig();
      if (!embeddingConfig) {
        console.warn('No embedding provider available for semantic search');
        return [];
      }

      try {
        // Generate embedding for query
        const queryResult = await generateEmbedding(query, embeddingConfig);
        const queryEmbedding = queryResult.embedding;

        // Generate embeddings for memories that don't have them cached
        const memoriesWithEmbeddings: Array<{ memory: Memory; embedding: number[] }> = [];

        for (const memory of sessionMemories) {
          if (!memory.enabled) continue;

          // Generate embedding for memory content
          const memResult = await generateEmbedding(memory.content, embeddingConfig);
          memoriesWithEmbeddings.push({
            memory,
            embedding: memResult.embedding,
          });
        }

        // Calculate similarity scores
        const results: MemorySearchResult[] = memoriesWithEmbeddings
          .map(({ memory, embedding }) => ({
            memory,
            score: cosineSimilarity(queryEmbedding, embedding),
            matchType: 'semantic' as const,
          }))
          .filter((r) => r.score > 0.3) // Minimum threshold
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

        return results;
      } catch (error) {
        console.error('Semantic search failed:', error);
        return [];
      }
    },
    [sessionMemories, getEmbeddingConfig]
  );

  // Enhanced search with multiple strategies
  const searchMemories = useCallback(
    async (options: MemorySearchOptions): Promise<MemorySearchResult[]> => {
      const {
        query,
        type,
        tags,
        limit = 20,
        threshold = 0,
        semantic = enableSemanticSearch,
      } = options;

      // Text-based search
      const textResults = storeSearchMemories(query)
        .filter((m) => {
          if (type && m.type !== type) return false;
          if (tags && tags.length > 0) {
            const memTags = m.tags || [];
            if (!tags.some((t) => memTags.includes(t))) return false;
          }
          if (sessionId && m.sessionId && m.sessionId !== sessionId && m.sessionId !== 'global') {
            return false;
          }
          return true;
        })
        .map((memory) => {
          // Calculate match score
          const queryLower = query.toLowerCase();
          const contentLower = memory.content.toLowerCase();
          const isExact = contentLower.includes(queryLower);
          const score = isExact ? 1 : 0.5;

          return {
            memory,
            score: score * calculateDecayFactor(memory),
            matchType: (isExact ? 'exact' : 'partial') as 'exact' | 'partial',
          };
        });

      // Semantic search if enabled
      let semanticResults: MemorySearchResult[] = [];
      if (semantic && query.length > 3) {
        semanticResults = await semanticSearch(query, limit);
      }

      // Merge and deduplicate results
      const resultMap = new Map<string, MemorySearchResult>();

      for (const result of textResults) {
        resultMap.set(result.memory.id, result);
      }

      for (const result of semanticResults) {
        const existing = resultMap.get(result.memory.id);
        if (!existing || result.score > existing.score) {
          resultMap.set(result.memory.id, result);
        }
      }

      // Sort and filter
      return Array.from(resultMap.values())
        .filter((r) => r.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
    [
      storeSearchMemories,
      semanticSearch,
      sessionId,
      enableSemanticSearch,
      calculateDecayFactor,
    ]
  );

  // Get memories relevant to current context
  const getRelevantMemories = useCallback(
    async (context: MemoryRelevanceContext): Promise<RelevantMemory[]> => {
      const { currentMessage, recentMessages: _recentMessages = [], tags } = context;

      const relevantMemories: RelevantMemory[] = [];
      const enabledMemories = getEnabledMemories();

      for (const memory of enabledMemories) {
        // Check session scope
        if (sessionId && memory.sessionId && memory.sessionId !== sessionId && memory.sessionId !== 'global') {
          continue;
        }

        const matchReasons: string[] = [];
        let relevanceScore = 0;

        // Pinned memories are always relevant
        if (memory.pinned) {
          matchReasons.push('pinned');
          relevanceScore += 0.5;
        }

        // Priority boost
        const priority = memory.priority ?? 5;
        relevanceScore += (priority / 10) * 0.2;

        // Tag matching
        if (tags && tags.length > 0 && memory.tags) {
          const matchingTags = tags.filter((t) => memory.tags?.includes(t));
          if (matchingTags.length > 0) {
            matchReasons.push(`tags: ${matchingTags.join(', ')}`);
            relevanceScore += (matchingTags.length / tags.length) * 0.3;
          }
        }

        // Content matching with current message
        if (currentMessage) {
          const messageWords = new Set(
            currentMessage.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
          );
          const memoryWords = new Set(
            memory.content.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
          );
          const overlap = [...messageWords].filter((w) => memoryWords.has(w));

          if (overlap.length > 0) {
            const overlapScore = overlap.length / Math.max(messageWords.size, memoryWords.size);
            matchReasons.push(`content overlap: ${overlap.slice(0, 3).join(', ')}`);
            relevanceScore += overlapScore * 0.4;
          }
        }

        // Recent usage boost
        const daysSinceUsed = Math.floor(
          (Date.now() - new Date(memory.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceUsed < 7) {
          matchReasons.push('recently used');
          relevanceScore += 0.1 * (1 - daysSinceUsed / 7);
        }

        // Apply decay
        relevanceScore *= calculateDecayFactor(memory);

        if (relevanceScore > 0.1 || memory.pinned) {
          relevantMemories.push({
            memory,
            relevanceScore,
            matchReasons,
          });
        }
      }

      return relevantMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);
    },
    [getEnabledMemories, sessionId, calculateDecayFactor]
  );

  // Batch create memories
  const batchCreateMemories = useCallback(
    async (inputs: CreateMemoryInput[]): Promise<BatchOperationResult> => {
      const result: BatchOperationResult = { success: 0, failed: 0, errors: [] };

      for (const input of inputs) {
        try {
          await createMemory(input, { checkConflicts: false });
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to create "${input.content.slice(0, 30)}...": ${error}`);
        }
      }

      return result;
    },
    [createMemory]
  );

  // Batch update memories
  const batchUpdateMemories = useCallback(
    (updates: Array<{ id: string; updates: UpdateMemoryInput }>): BatchOperationResult => {
      const result: BatchOperationResult = { success: 0, failed: 0, errors: [] };

      for (const { id, updates: memUpdates } of updates) {
        try {
          const existing = getMemory(id);
          if (!existing) {
            result.failed++;
            result.errors.push(`Memory ${id} not found`);
            continue;
          }
          storeUpdateMemory(id, memUpdates);
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to update ${id}: ${error}`);
        }
      }

      return result;
    },
    [getMemory, storeUpdateMemory]
  );

  // Batch delete memories
  const batchDeleteMemories = useCallback(
    (ids: string[]): BatchOperationResult => {
      const result: BatchOperationResult = { success: 0, failed: 0, errors: [] };

      for (const id of ids) {
        try {
          const existing = getMemory(id);
          if (!existing) {
            result.failed++;
            result.errors.push(`Memory ${id} not found`);
            continue;
          }
          storeDeleteMemory(id);
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to delete ${id}: ${error}`);
        }
      }

      return result;
    },
    [getMemory, storeDeleteMemory]
  );

  // Merge two memories
  const mergeMemories = useCallback(
    (primaryId: string, secondaryId: string, mergedContent?: string): Memory | null => {
      const primary = getMemory(primaryId);
      const secondary = getMemory(secondaryId);

      if (!primary || !secondary) return null;

      // Update primary with merged content
      const newContent = mergedContent || `${primary.content}\n\n${secondary.content}`;
      const mergedTags = [...new Set([...(primary.tags || []), ...(secondary.tags || [])])];

      storeUpdateMemory(primaryId, {
        content: newContent,
        tags: mergedTags,
      });

      // Delete secondary
      storeDeleteMemory(secondaryId);

      return getMemory(primaryId) || null;
    },
    [getMemory, storeUpdateMemory, storeDeleteMemory]
  );

  // Get expired memories (candidates for cleanup)
  const getExpiredMemories = useCallback(
    (maxDays: number = decayDays): Memory[] => {
      const threshold = Date.now() - maxDays * 24 * 60 * 60 * 1000;

      return memories.filter((m) => {
        if (m.pinned) return false; // Never expire pinned
        if (!m.enabled) return true; // Disabled memories are candidates
        return new Date(m.lastUsedAt).getTime() < threshold;
      });
    },
    [memories, decayDays]
  );

  // Cleanup expired memories
  const cleanupExpiredMemories = useCallback(
    (maxDays?: number): number => {
      const expired = getExpiredMemories(maxDays);
      for (const memory of expired) {
        storeDeleteMemory(memory.id);
      }
      return expired.length;
    },
    [getExpiredMemories, storeDeleteMemory]
  );

  // Find and suggest duplicate memories
  const findDuplicates = useCallback(
    (threshold: number = 0.7): Array<{ memories: Memory[]; similarity: number }> => {
      const duplicateGroups: Array<{ memories: Memory[]; similarity: number }> = [];
      const processed = new Set<string>();

      for (const memory of memories) {
        if (processed.has(memory.id)) continue;

        const similar = storeFindSimilar(memory.content).filter(
          (m) => m.id !== memory.id && !processed.has(m.id)
        );

        if (similar.length > 0) {
          // Calculate average similarity
          const group = [memory, ...similar];
          group.forEach((m) => processed.add(m.id));

          duplicateGroups.push({
            memories: group,
            similarity: threshold, // Simplified - would need actual calculation
          });
        }
      }

      return duplicateGroups;
    },
    [memories, storeFindSimilar]
  );

  // Enhanced pattern detection for auto-inference
  const detectMemoryPatterns = useCallback(
    (text: string): CreateMemoryInput[] => {
      const detected: CreateMemoryInput[] = [];

      // Extended patterns
      const patterns = {
        preference: [
          /(?:i prefer|i like|i always|i usually|my favorite|i enjoy)\s+(.+)/gi,
          /(?:i don't like|i hate|i avoid|i never)\s+(.+)/gi,
          /(?:please always|always use|never use|don't ever)\s+(.+)/gi,
        ],
        fact: [
          /(?:my name is|i am|i'm a|i work at|i work as|i live in|i'm from)\s+(.+)/gi,
          /(?:my email is|my phone is|my address is)\s+(.+)/gi,
          /(?:i have|i own|i use)\s+(a |an )?(.+)/gi,
          /(?:i speak|i know)\s+(.+)/gi,
        ],
        instruction: [
          /(?:remember to|don't forget to|make sure to|when you|if i ask)\s+(.+)/gi,
          /(?:call me|address me as|refer to me as)\s+(.+)/gi,
          /(?:always|never)\s+(?:respond|reply|answer)\s+(.+)/gi,
        ],
        context: [
          /(?:we are working on|the project is|currently|right now)\s+(.+)/gi,
          /(?:the goal is|we need to|our objective is)\s+(.+)/gi,
        ],
      };

      for (const [type, typePatterns] of Object.entries(patterns)) {
        for (const pattern of typePatterns) {
          const matches = text.matchAll(pattern);
          for (const match of matches) {
            detected.push({
              type: type as MemoryType,
              content: match[0].trim(),
              source: 'inferred' as MemorySource,
            });
          }
        }
      }

      // Check for explicit remember commands
      if (
        text.toLowerCase().includes('remember') ||
        text.toLowerCase().includes("don't forget")
      ) {
        const existing = detected.find((d) => d.type === 'instruction');
        if (!existing) {
          detected.push({
            type: 'instruction',
            content: text,
            source: 'explicit',
          });
        }
      }

      return detected;
    },
    []
  );

  return {
    // State
    memories: sessionMemories,
    settings,
    stats: getMemoryStats(),
    tags: getAllTags(),

    // Basic operations
    createMemory,
    updateMemory: storeUpdateMemory,
    deleteMemory: storeDeleteMemory,
    clearAllMemories,
    trackMemoryUsage,

    // Pin and priority
    togglePin,
    setPriority,

    // Search
    searchMemories,
    semanticSearch,
    findSimilarMemories: storeFindSimilar,

    // Relevance
    getRelevantMemories,
    calculateDecayFactor,

    // Batch operations
    batchCreateMemories,
    batchUpdateMemories,
    batchDeleteMemories,

    // Conflict and merge
    mergeMemories,
    findDuplicates,

    // Cleanup
    getExpiredMemories,
    cleanupExpiredMemories,

    // Selectors
    getMemory,
    getMemoriesByType,
    getEnabledMemories,
    getPinnedMemories,

    // Prompt generation
    getMemoriesForPrompt,

    // Detection
    detectMemoryFromText,
    detectMemoryPatterns,

    // Settings
    updateSettings,

    // Import/Export
    exportMemories,
    importMemories,
  };
}

export default useMemory;
