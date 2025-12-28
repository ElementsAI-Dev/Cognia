/**
 * Memory Store - manages cross-session AI memories
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  Memory,
  MemoryType,
  MemorySource,
  CreateMemoryInput,
  UpdateMemoryInput,
  MemorySettings,
} from '@/types';
import { DEFAULT_MEMORY_SETTINGS } from '@/types/memory';

interface MemoryState {
  // State
  memories: Memory[];
  settings: MemorySettings;

  // Memory operations
  createMemory: (input: CreateMemoryInput) => Memory;
  updateMemory: (id: string, updates: UpdateMemoryInput) => void;
  deleteMemory: (id: string) => void;
  clearAllMemories: () => void;

  // Memory usage tracking
  useMemory: (id: string) => void;

  // Pin/Priority operations
  togglePin: (id: string) => void;
  setPriority: (id: string, priority: number) => void;

  // Settings operations
  updateSettings: (settings: Partial<MemorySettings>) => void;

  // Selectors
  getMemory: (id: string) => Memory | undefined;
  getMemoriesByType: (type: MemoryType) => Memory[];
  getEnabledMemories: () => Memory[];
  getPinnedMemories: () => Memory[];
  searchMemories: (query: string) => Memory[];
  getAllTags: () => string[];
  getMemoryStats: () => { total: number; enabled: number; pinned: number; byType: Record<MemoryType, number> };

  // AI integration
  getMemoriesForPrompt: () => string;
  detectMemoryFromText: (text: string) => CreateMemoryInput | null;
  findSimilarMemories: (content: string) => Memory[];

  // Import/Export
  exportMemories: () => string;
  importMemories: (jsonData: string) => { success: boolean; imported: number; errors: string[] };
}

// Patterns for detecting memory-worthy content
const MEMORY_PATTERNS = {
  preference: [
    /(?:i prefer|i like|i always|i usually|my favorite|i enjoy|i don't like|i hate|i avoid)\s+(.+)/i,
    /(?:please always|always use|never use|don't ever)\s+(.+)/i,
  ],
  fact: [
    /(?:my name is|i am|i'm a|i work at|i work as|i live in|i'm from)\s+(.+)/i,
    /(?:my email is|my phone is|my address is)\s+(.+)/i,
  ],
  instruction: [
    /(?:remember to|don't forget to|make sure to|when you|if i ask)\s+(.+)/i,
    /(?:call me|address me as|refer to me as)\s+(.+)/i,
  ],
};

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],
      settings: DEFAULT_MEMORY_SETTINGS,

      createMemory: (input) => {
        const memory: Memory = {
          id: nanoid(),
          type: input.type,
          content: input.content,
          source: input.source || 'explicit',
          category: input.category,
          tags: input.tags || [],
          createdAt: new Date(),
          lastUsedAt: new Date(),
          useCount: 0,
          enabled: true,
        };

        set((state) => ({
          memories: [memory, ...state.memories].slice(0, state.settings.maxMemories),
        }));

        return memory;
      },

      updateMemory: (id, updates) =>
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id
              ? { ...m, ...updates }
              : m
          ),
        })),

      deleteMemory: (id) =>
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
        })),

      clearAllMemories: () =>
        set({ memories: [] }),

      useMemory: (id) =>
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id
              ? {
                  ...m,
                  lastUsedAt: new Date(),
                  useCount: m.useCount + 1,
                }
              : m
          ),
        })),

      togglePin: (id) =>
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id ? { ...m, pinned: !m.pinned } : m
          ),
        })),

      setPriority: (id, priority) =>
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id ? { ...m, priority: Math.min(10, Math.max(0, priority)) } : m
          ),
        })),

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      getMemory: (id) => {
        const { memories } = get();
        return memories.find((m) => m.id === id);
      },

      getMemoriesByType: (type) => {
        const { memories } = get();
        return memories.filter((m) => m.type === type && m.enabled);
      },

      getEnabledMemories: () => {
        const { memories } = get();
        return memories.filter((m) => m.enabled);
      },

      getPinnedMemories: () => {
        const { memories } = get();
        return memories.filter((m) => m.pinned && m.enabled);
      },

      searchMemories: (query) => {
        const { memories } = get();
        const lowerQuery = query.toLowerCase();
        return memories.filter(
          (m) =>
            m.content.toLowerCase().includes(lowerQuery) ||
            m.category?.toLowerCase().includes(lowerQuery) ||
            m.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
        );
      },

      getAllTags: () => {
        const { memories } = get();
        const tagsSet = new Set<string>();
        for (const memory of memories) {
          for (const tag of memory.tags || []) {
            tagsSet.add(tag);
          }
        }
        return Array.from(tagsSet).sort();
      },

      getMemoryStats: () => {
        const { memories } = get();
        const byType: Record<MemoryType, number> = {
          preference: 0,
          fact: 0,
          instruction: 0,
          context: 0,
        };
        let enabled = 0;
        let pinned = 0;
        for (const memory of memories) {
          byType[memory.type]++;
          if (memory.enabled) enabled++;
          if (memory.pinned) pinned++;
        }
        return { total: memories.length, enabled, pinned, byType };
      },

      // Generate prompt section from memories and track their usage
      getMemoriesForPrompt: () => {
        const state = get();
        const { memories, settings } = state;

        if (!settings.enabled || !settings.injectInSystemPrompt) {
          return '';
        }

        const enabledMemories = memories.filter((m) => m.enabled);

        if (enabledMemories.length === 0) {
          return '';
        }

        // Sort by: pinned first, then by priority (high to low), then by useCount
        const sortedMemories = [...enabledMemories].sort((a, b) => {
          // Pinned memories first
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          // Then by priority (default 5)
          const priorityA = a.priority ?? 5;
          const priorityB = b.priority ?? 5;
          if (priorityA !== priorityB) return priorityB - priorityA;
          // Then by usage count
          return b.useCount - a.useCount;
        });

        // Track usage of each memory being injected (batch update)
        set((s) => ({
          memories: s.memories.map((m) =>
            sortedMemories.some((em) => em.id === m.id)
              ? { ...m, lastUsedAt: new Date(), useCount: m.useCount + 1 }
              : m
          ),
        }));

        // Group memories by type
        const byType: Record<string, Memory[]> = {};
        for (const memory of enabledMemories) {
          if (!byType[memory.type]) {
            byType[memory.type] = [];
          }
          byType[memory.type].push(memory);
        }

        // Build prompt section
        const sections: string[] = [];

        if (byType.preference?.length) {
          sections.push(
            `User preferences:\n${byType.preference.map((m) => `- ${m.content}`).join('\n')}`
          );
        }

        if (byType.fact?.length) {
          sections.push(
            `About the user:\n${byType.fact.map((m) => `- ${m.content}`).join('\n')}`
          );
        }

        if (byType.instruction?.length) {
          sections.push(
            `User instructions:\n${byType.instruction.map((m) => `- ${m.content}`).join('\n')}`
          );
        }

        if (byType.context?.length) {
          sections.push(
            `Context:\n${byType.context.map((m) => `- ${m.content}`).join('\n')}`
          );
        }

        if (sections.length === 0) {
          return '';
        }

        return `\n\n## Memory\nThe following information has been remembered from previous conversations:\n\n${sections.join('\n\n')}`;
      },

      // Detect if text contains something worth remembering
      detectMemoryFromText: (text) => {
        const lowerText = text.toLowerCase();

        // Check for explicit "remember" commands
        if (lowerText.includes('remember') || lowerText.includes('don\'t forget')) {
          return {
            type: 'instruction',
            content: text,
            source: 'explicit',
          };
        }

        // Check patterns for each memory type
        for (const [type, patterns] of Object.entries(MEMORY_PATTERNS)) {
          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
              return {
                type: type as MemoryType,
                content: match[0],
                source: 'inferred' as MemorySource,
              };
            }
          }
        }

        return null;
      },

      // Find similar memories (simple text similarity for conflict detection)
      findSimilarMemories: (content) => {
        const { memories } = get();
        const lowerContent = content.toLowerCase();
        const words = lowerContent.split(/\s+/).filter((w) => w.length > 3);
        
        if (words.length === 0) return [];

        return memories.filter((m) => {
          const memLower = m.content.toLowerCase();
          // Check if >50% of significant words match
          const matchCount = words.filter((w) => memLower.includes(w)).length;
          return matchCount >= Math.ceil(words.length * 0.5);
        });
      },

      // Export all memories as JSON
      exportMemories: () => {
        const { memories, settings } = get();
        const exportData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          settings,
          memories: memories.map((m) => ({
            ...m,
            createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
            lastUsedAt: m.lastUsedAt instanceof Date ? m.lastUsedAt.toISOString() : m.lastUsedAt,
          })),
        };
        return JSON.stringify(exportData, null, 2);
      },

      // Import memories from JSON
      importMemories: (jsonData) => {
        const errors: string[] = [];
        let imported = 0;

        try {
          const data = JSON.parse(jsonData);
          
          if (!data.memories || !Array.isArray(data.memories)) {
            return { success: false, imported: 0, errors: ['Invalid format: memories array not found'] };
          }

          const { memories: currentMemories, settings: currentSettings } = get();
          const newMemories: Memory[] = [];

          for (const mem of data.memories) {
            // Validate required fields
            if (!mem.type || !mem.content) {
              errors.push(`Skipped memory: missing type or content`);
              continue;
            }

            // Check for duplicates
            const isDuplicate = currentMemories.some(
              (m) => m.content === mem.content && m.type === mem.type
            );
            if (isDuplicate) {
              errors.push(`Skipped duplicate: "${mem.content.substring(0, 30)}..."`);
              continue;
            }

            const newMemory: Memory = {
              id: nanoid(),
              type: mem.type,
              content: mem.content,
              source: mem.source || 'explicit',
              category: mem.category,
              tags: mem.tags || [],
              createdAt: mem.createdAt ? new Date(mem.createdAt) : new Date(),
              lastUsedAt: mem.lastUsedAt ? new Date(mem.lastUsedAt) : new Date(),
              useCount: mem.useCount || 0,
              enabled: mem.enabled !== false,
            };

            newMemories.push(newMemory);
            imported++;
          }

          // Merge with existing memories, respecting maxMemories limit
          set((state) => ({
            memories: [...newMemories, ...state.memories].slice(0, currentSettings.maxMemories),
          }));

          return { success: true, imported, errors };
        } catch (e) {
          return { success: false, imported: 0, errors: [`Parse error: ${(e as Error).message}`] };
        }
      },
    }),
    {
      name: 'cognia-memories',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        memories: state.memories.map((m) => ({
          ...m,
          createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
          lastUsedAt: m.lastUsedAt instanceof Date ? m.lastUsedAt.toISOString() : m.lastUsedAt,
        })),
        settings: state.settings,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.memories) {
          state.memories = state.memories.map((m) => ({
            ...m,
            createdAt: new Date(m.createdAt),
            lastUsedAt: new Date(m.lastUsedAt),
          }));
        }
      },
    }
  )
);

export default useMemoryStore;
