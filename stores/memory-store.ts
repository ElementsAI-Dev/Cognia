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

  // Settings operations
  updateSettings: (settings: Partial<MemorySettings>) => void;

  // Selectors
  getMemory: (id: string) => Memory | undefined;
  getMemoriesByType: (type: MemoryType) => Memory[];
  getEnabledMemories: () => Memory[];
  searchMemories: (query: string) => Memory[];

  // AI integration
  getMemoriesForPrompt: () => string;
  detectMemoryFromText: (text: string) => CreateMemoryInput | null;
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

      // Generate prompt section from memories
      getMemoriesForPrompt: () => {
        const { memories, settings } = get();

        if (!settings.enabled || !settings.injectInSystemPrompt) {
          return '';
        }

        const enabledMemories = memories.filter((m) => m.enabled);

        if (enabledMemories.length === 0) {
          return '';
        }

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
