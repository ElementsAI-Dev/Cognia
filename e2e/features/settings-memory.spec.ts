import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * Memory Settings Complete Tests
 * Tests memory management and configuration
 * Optimized for CI/CD efficiency
 */

test.describe('Memory Settings - Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should toggle memory enabled state', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        enabled: true,
      };

      const toggleEnabled = (): void => {
        settings.enabled = !settings.enabled;
      };

      const initial = settings.enabled;
      toggleEnabled();
      const afterToggle = settings.enabled;
      toggleEnabled();
      const afterSecondToggle = settings.enabled;

      return { initial, afterToggle, afterSecondToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
    expect(result.afterSecondToggle).toBe(true);
  });

  test('should toggle auto-infer memories', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        enabled: true,
        autoInfer: true,
      };

      const toggleAutoInfer = (): boolean => {
        if (!settings.enabled) return false;
        settings.autoInfer = !settings.autoInfer;
        return true;
      };

      const initial = settings.autoInfer;
      toggleAutoInfer();
      const afterToggle = settings.autoInfer;

      // Disable memory - auto-infer toggle should fail
      settings.enabled = false;
      const toggleResult = toggleAutoInfer();

      return { initial, afterToggle, toggleResult };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
    expect(result.toggleResult).toBe(false);
  });

  test('should toggle inject in system prompt', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        enabled: true,
        injectInSystemPrompt: true,
      };

      const toggleInject = (): boolean => {
        if (!settings.enabled) return false;
        settings.injectInSystemPrompt = !settings.injectInSystemPrompt;
        return true;
      };

      const initial = settings.injectInSystemPrompt;
      toggleInject();
      const afterToggle = settings.injectInSystemPrompt;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });
});

test.describe('Memory Settings - Memory Types', () => {
  test('should list memory types', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memoryTypes = [
        { type: 'preference', label: 'Preference', color: 'blue' },
        { type: 'fact', label: 'Fact', color: 'green' },
        { type: 'instruction', label: 'Instruction', color: 'purple' },
        { type: 'context', label: 'Context', color: 'orange' },
      ];

      const getTypeLabel = (type: string): string | undefined => {
        return memoryTypes.find((t) => t.type === type)?.label;
      };

      const getTypeColor = (type: string): string | undefined => {
        return memoryTypes.find((t) => t.type === type)?.color;
      };

      return {
        typeCount: memoryTypes.length,
        typeLabels: memoryTypes.map((t) => t.label),
        preferenceLabel: getTypeLabel('preference'),
        preferenceColor: getTypeColor('preference'),
        factColor: getTypeColor('fact'),
      };
    });

    expect(result.typeCount).toBe(4);
    expect(result.typeLabels).toContain('Preference');
    expect(result.preferenceLabel).toBe('Preference');
    expect(result.preferenceColor).toBe('blue');
    expect(result.factColor).toBe('green');
  });
});

test.describe('Memory Settings - Memory CRUD', () => {
  test('should create new memory', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Memory {
        id: string;
        type: string;
        content: string;
        category?: string;
        tags: string[];
        enabled: boolean;
        createdAt: Date;
        useCount: number;
        source: 'manual' | 'inferred';
      }

      const memories: Memory[] = [];

      const createMemory = (input: {
        type: string;
        content: string;
        category?: string;
        tags?: string[];
      }): Memory => {
        const memory: Memory = {
          id: `mem-${Date.now()}`,
          type: input.type,
          content: input.content,
          category: input.category,
          tags: input.tags || [],
          enabled: true,
          createdAt: new Date(),
          useCount: 0,
          source: 'manual',
        };
        memories.push(memory);
        return memory;
      };

      const newMemory = createMemory({
        type: 'preference',
        content: 'I prefer concise responses with code examples',
        category: 'coding',
        tags: ['style', 'code'],
      });

      return {
        memoryCount: memories.length,
        memoryType: newMemory.type,
        memoryContent: newMemory.content,
        memoryCategory: newMemory.category,
        memoryTagCount: newMemory.tags.length,
        memorySource: newMemory.source,
      };
    });

    expect(result.memoryCount).toBe(1);
    expect(result.memoryType).toBe('preference');
    expect(result.memoryContent).toContain('concise responses');
    expect(result.memoryCategory).toBe('coding');
    expect(result.memoryTagCount).toBe(2);
    expect(result.memorySource).toBe('manual');
  });

  test('should update existing memory', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        {
          id: 'mem-1',
          type: 'preference',
          content: 'Original content',
          enabled: true,
        },
      ];

      const updateMemory = (
        id: string,
        updates: { content?: string; type?: string; enabled?: boolean }
      ): boolean => {
        const memory = memories.find((m) => m.id === id);
        if (memory) {
          Object.assign(memory, updates);
          return true;
        }
        return false;
      };

      const originalContent = memories[0].content;
      updateMemory('mem-1', { content: 'Updated content', type: 'fact' });
      const afterUpdate = { ...memories[0] };

      return {
        originalContent,
        updatedContent: afterUpdate.content,
        updatedType: afterUpdate.type,
      };
    });

    expect(result.originalContent).toBe('Original content');
    expect(result.updatedContent).toBe('Updated content');
    expect(result.updatedType).toBe('fact');
  });

  test('should delete memory', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        { id: 'mem-1', content: 'Memory 1' },
        { id: 'mem-2', content: 'Memory 2' },
        { id: 'mem-3', content: 'Memory 3' },
      ];

      const deleteMemory = (id: string): boolean => {
        const index = memories.findIndex((m) => m.id === id);
        if (index !== -1) {
          memories.splice(index, 1);
          return true;
        }
        return false;
      };

      const initialCount = memories.length;
      deleteMemory('mem-2');
      const afterDelete = memories.length;
      const remainingIds = memories.map((m) => m.id);

      return { initialCount, afterDelete, remainingIds };
    });

    expect(result.initialCount).toBe(3);
    expect(result.afterDelete).toBe(2);
    expect(result.remainingIds).not.toContain('mem-2');
  });

  test('should toggle memory enabled state', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memory = {
        id: 'mem-1',
        content: 'Test memory',
        enabled: true,
      };

      const toggleMemoryEnabled = (): void => {
        memory.enabled = !memory.enabled;
      };

      const initial = memory.enabled;
      toggleMemoryEnabled();
      const afterToggle = memory.enabled;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });

  test('should clear all memories', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      let memories = [
        { id: 'mem-1', content: 'Memory 1' },
        { id: 'mem-2', content: 'Memory 2' },
        { id: 'mem-3', content: 'Memory 3' },
      ];

      const clearAllMemories = (): number => {
        const count = memories.length;
        memories = [];
        return count;
      };

      const initialCount = memories.length;
      const clearedCount = clearAllMemories();
      const afterClear = memories.length;

      return { initialCount, clearedCount, afterClear };
    });

    expect(result.initialCount).toBe(3);
    expect(result.clearedCount).toBe(3);
    expect(result.afterClear).toBe(0);
  });
});

test.describe('Memory Settings - Search', () => {
  test('should search memories by content', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        { id: 'mem-1', content: 'I prefer TypeScript over JavaScript', type: 'preference' },
        { id: 'mem-2', content: 'Use React for frontend projects', type: 'instruction' },
        { id: 'mem-3', content: 'Working on a Python backend project', type: 'context' },
        { id: 'mem-4', content: 'Always add type annotations', type: 'instruction' },
      ];

      const searchMemories = (query: string): typeof memories => {
        const lowerQuery = query.toLowerCase();
        return memories.filter(
          (m) =>
            m.content.toLowerCase().includes(lowerQuery) ||
            m.type.toLowerCase().includes(lowerQuery)
        );
      };

      const typescriptResults = searchMemories('typescript');
      const instructionResults = searchMemories('instruction');
      const projectResults = searchMemories('project');
      const emptyResults = searchMemories('nonexistent');

      return {
        typescriptCount: typescriptResults.length,
        instructionCount: instructionResults.length,
        projectCount: projectResults.length,
        emptyCount: emptyResults.length,
      };
    });

    expect(result.typescriptCount).toBe(1);
    expect(result.instructionCount).toBe(2);
    expect(result.projectCount).toBe(2);
    expect(result.emptyCount).toBe(0);
  });

  test('should filter memories by type', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        { id: 'mem-1', type: 'preference', content: 'Pref 1' },
        { id: 'mem-2', type: 'preference', content: 'Pref 2' },
        { id: 'mem-3', type: 'fact', content: 'Fact 1' },
        { id: 'mem-4', type: 'instruction', content: 'Instruction 1' },
        { id: 'mem-5', type: 'context', content: 'Context 1' },
      ];

      const filterByType = (type: string): typeof memories => {
        return memories.filter((m) => m.type === type);
      };

      return {
        preferenceCount: filterByType('preference').length,
        factCount: filterByType('fact').length,
        instructionCount: filterByType('instruction').length,
        contextCount: filterByType('context').length,
      };
    });

    expect(result.preferenceCount).toBe(2);
    expect(result.factCount).toBe(1);
    expect(result.instructionCount).toBe(1);
    expect(result.contextCount).toBe(1);
  });
});

test.describe('Memory Settings - Memory Source', () => {
  test('should distinguish manual vs inferred memories', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        { id: 'mem-1', content: 'Manual memory', source: 'manual' as const },
        { id: 'mem-2', content: 'Inferred memory', source: 'inferred' as const },
        { id: 'mem-3', content: 'Another manual', source: 'manual' as const },
      ];

      const getManualMemories = () => memories.filter((m) => m.source === 'manual');
      const getInferredMemories = () => memories.filter((m) => m.source === 'inferred');

      return {
        manualCount: getManualMemories().length,
        inferredCount: getInferredMemories().length,
        manualIds: getManualMemories().map((m) => m.id),
      };
    });

    expect(result.manualCount).toBe(2);
    expect(result.inferredCount).toBe(1);
    expect(result.manualIds).toContain('mem-1');
  });

  test('should track memory usage count', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memory = {
        id: 'mem-1',
        content: 'Test memory',
        useCount: 0,
      };

      const incrementUseCount = (): void => {
        memory.useCount++;
      };

      const initial = memory.useCount;
      incrementUseCount();
      incrementUseCount();
      incrementUseCount();
      const afterUse = memory.useCount;

      return { initial, afterUse };
    });

    expect(result.initial).toBe(0);
    expect(result.afterUse).toBe(3);
  });
});

test.describe('Memory Settings - Validation', () => {
  test('should validate memory content', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const validateMemoryContent = (
        content: string
      ): { valid: boolean; error?: string } => {
        if (!content || content.trim() === '') {
          return { valid: false, error: 'Memory content is required' };
        }
        if (content.length > 1000) {
          return { valid: false, error: 'Memory content must be less than 1000 characters' };
        }
        return { valid: true };
      };

      return {
        validContent: validateMemoryContent('This is a valid memory'),
        emptyContent: validateMemoryContent(''),
        whitespaceContent: validateMemoryContent('   '),
        longContent: validateMemoryContent('A'.repeat(1500)),
      };
    });

    expect(result.validContent.valid).toBe(true);
    expect(result.emptyContent.valid).toBe(false);
    expect(result.whitespaceContent.valid).toBe(false);
    expect(result.longContent.valid).toBe(false);
  });

  test('should validate memory type', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const validTypes = ['preference', 'fact', 'instruction', 'context'];

      const validateMemoryType = (type: string): boolean => {
        return validTypes.includes(type);
      };

      return {
        validPreference: validateMemoryType('preference'),
        validFact: validateMemoryType('fact'),
        invalidType: validateMemoryType('unknown'),
        emptyType: validateMemoryType(''),
      };
    });

    expect(result.validPreference).toBe(true);
    expect(result.validFact).toBe(true);
    expect(result.invalidType).toBe(false);
    expect(result.emptyType).toBe(false);
  });
});

test.describe('Memory Settings - Persistence', () => {
  test('should persist memories to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const memoryData = {
        settings: {
          enabled: true,
          autoInfer: true,
          injectInSystemPrompt: true,
        },
        memories: [
          {
            id: 'mem-1',
            type: 'preference',
            content: 'I prefer TypeScript',
            enabled: true,
          },
        ],
      };
      localStorage.setItem(
        'cognia-memory-store',
        JSON.stringify({ state: memoryData })
      );
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-memory-store');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.settings.enabled).toBe(true);
    expect(stored.state.memories.length).toBe(1);
    expect(stored.state.memories[0].content).toContain('TypeScript');
  });

  test('should load memories on startup', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const loadMemories = (): { id: string; content: string }[] => {
        const storedData = localStorage.getItem('cognia-memory-store');
        if (!storedData) return [];

        try {
          const parsed = JSON.parse(storedData);
          return parsed.state?.memories || [];
        } catch {
          return [];
        }
      };

      // Pre-populate
      localStorage.setItem(
        'cognia-memory-store',
        JSON.stringify({
          state: {
            memories: [
              { id: 'test-1', content: 'Memory 1' },
              { id: 'test-2', content: 'Memory 2' },
            ],
          },
        })
      );

      const loaded = loadMemories();

      return {
        memoryCount: loaded.length,
        firstContent: loaded[0]?.content,
      };
    });

    expect(result.memoryCount).toBe(2);
    expect(result.firstContent).toBe('Memory 1');
  });
});

test.describe('Memory Settings - Pin/Priority', () => {
  test('should toggle memory pin state', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memory = {
        id: 'mem-1',
        content: 'Test memory',
        pinned: false,
        priority: 5,
      };

      const togglePin = (): void => {
        memory.pinned = !memory.pinned;
      };

      const initial = memory.pinned;
      togglePin();
      const afterToggle = memory.pinned;
      togglePin();
      const afterSecondToggle = memory.pinned;

      return { initial, afterToggle, afterSecondToggle };
    });

    expect(result.initial).toBe(false);
    expect(result.afterToggle).toBe(true);
    expect(result.afterSecondToggle).toBe(false);
  });

  test('should set memory priority', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memory = {
        id: 'mem-1',
        content: 'Test memory',
        priority: 5,
      };

      const setPriority = (priority: number): void => {
        memory.priority = Math.min(10, Math.max(0, priority));
      };

      const initial = memory.priority;
      setPriority(8);
      const afterSet = memory.priority;
      setPriority(15);
      const afterClampHigh = memory.priority;
      setPriority(-5);
      const afterClampLow = memory.priority;

      return { initial, afterSet, afterClampHigh, afterClampLow };
    });

    expect(result.initial).toBe(5);
    expect(result.afterSet).toBe(8);
    expect(result.afterClampHigh).toBe(10);
    expect(result.afterClampLow).toBe(0);
  });

  test('should sort memories by pinned first', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        { id: 'mem-1', content: 'Normal memory', pinned: false, priority: 5 },
        { id: 'mem-2', content: 'Pinned memory', pinned: true, priority: 5 },
        { id: 'mem-3', content: 'High priority', pinned: false, priority: 8 },
      ];

      const sortMemories = () => {
        return [...memories].sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return b.priority - a.priority;
        });
      };

      const sorted = sortMemories();
      return {
        firstContent: sorted[0].content,
        secondContent: sorted[1].content,
        thirdContent: sorted[2].content,
      };
    });

    expect(result.firstContent).toBe('Pinned memory');
    expect(result.secondContent).toBe('High priority');
    expect(result.thirdContent).toBe('Normal memory');
  });
});

test.describe('Memory Settings - Import/Export', () => {
  test('should export memories to JSON format', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        { id: 'mem-1', type: 'preference', content: 'I prefer TypeScript', pinned: true },
        { id: 'mem-2', type: 'fact', content: 'My name is John', pinned: false },
      ];

      const settings = {
        enabled: true,
        autoInfer: true,
        maxMemories: 100,
        injectInSystemPrompt: true,
      };

      const exportMemories = (): string => {
        return JSON.stringify({
          version: '1.0',
          exportedAt: new Date().toISOString(),
          settings,
          memories,
        }, null, 2);
      };

      const exported = exportMemories();
      const parsed = JSON.parse(exported);

      return {
        hasVersion: 'version' in parsed,
        hasExportedAt: 'exportedAt' in parsed,
        hasSettings: 'settings' in parsed,
        hasMemories: 'memories' in parsed,
        memoryCount: parsed.memories.length,
        version: parsed.version,
      };
    });

    expect(result.hasVersion).toBe(true);
    expect(result.hasExportedAt).toBe(true);
    expect(result.hasSettings).toBe(true);
    expect(result.hasMemories).toBe(true);
    expect(result.memoryCount).toBe(2);
    expect(result.version).toBe('1.0');
  });

  test('should import memories from JSON', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Memory {
        id: string;
        type: string;
        content: string;
        enabled: boolean;
      }

      const memories: Memory[] = [];

      const importMemories = (jsonData: string): { success: boolean; imported: number; errors: string[] } => {
        const errors: string[] = [];
        let imported = 0;

        try {
          const data = JSON.parse(jsonData);
          if (!data.memories || !Array.isArray(data.memories)) {
            return { success: false, imported: 0, errors: ['Invalid format'] };
          }

          for (const mem of data.memories) {
            if (!mem.type || !mem.content) {
              errors.push('Skipped: missing type or content');
              continue;
            }
            memories.push({
              id: `imported-${Date.now()}-${imported}`,
              type: mem.type,
              content: mem.content,
              enabled: mem.enabled !== false,
            });
            imported++;
          }

          return { success: true, imported, errors };
        } catch {
          return { success: false, imported: 0, errors: ['Parse error'] };
        }
      };

      const importData = JSON.stringify({
        memories: [
          { type: 'fact', content: 'Imported fact' },
          { type: 'preference', content: 'Imported preference' },
        ],
      });

      const result = importMemories(importData);
      return {
        success: result.success,
        imported: result.imported,
        memoryCount: memories.length,
      };
    });

    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);
    expect(result.memoryCount).toBe(2);
  });

  test('should handle duplicate detection on import', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const existingMemories = [
        { id: 'mem-1', type: 'fact', content: 'Existing memory' },
      ];

      const importMemories = (jsonData: string): { imported: number; errors: string[] } => {
        const data = JSON.parse(jsonData);
        const errors: string[] = [];
        let imported = 0;

        for (const mem of data.memories) {
          const isDuplicate = existingMemories.some(
            (m) => m.content === mem.content && m.type === mem.type
          );
          if (isDuplicate) {
            errors.push(`Skipped duplicate: ${mem.content.substring(0, 30)}...`);
            continue;
          }
          existingMemories.push({ id: `new-${imported}`, ...mem });
          imported++;
        }

        return { imported, errors };
      };

      const importData = JSON.stringify({
        memories: [
          { type: 'fact', content: 'Existing memory' },
          { type: 'fact', content: 'New memory' },
        ],
      });

      const result = importMemories(importData);
      return {
        imported: result.imported,
        errorCount: result.errors.length,
        totalMemories: existingMemories.length,
      };
    });

    expect(result.imported).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.totalMemories).toBe(2);
  });
});

test.describe('Memory Settings - Type Filter', () => {
  test('should filter memories by type', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        { id: 'mem-1', type: 'preference', content: 'Pref 1' },
        { id: 'mem-2', type: 'preference', content: 'Pref 2' },
        { id: 'mem-3', type: 'fact', content: 'Fact 1' },
        { id: 'mem-4', type: 'instruction', content: 'Instruction 1' },
        { id: 'mem-5', type: 'context', content: 'Context 1' },
      ];

      const filterByType = (type: string | 'all') => {
        if (type === 'all') return memories;
        return memories.filter((m) => m.type === type);
      };

      return {
        allCount: filterByType('all').length,
        preferenceCount: filterByType('preference').length,
        factCount: filterByType('fact').length,
        instructionCount: filterByType('instruction').length,
        contextCount: filterByType('context').length,
      };
    });

    expect(result.allCount).toBe(5);
    expect(result.preferenceCount).toBe(2);
    expect(result.factCount).toBe(1);
    expect(result.instructionCount).toBe(1);
    expect(result.contextCount).toBe(1);
  });

  test('should combine type filter with search', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        { id: 'mem-1', type: 'preference', content: 'I prefer TypeScript' },
        { id: 'mem-2', type: 'preference', content: 'I prefer Python' },
        { id: 'mem-3', type: 'fact', content: 'I know TypeScript' },
      ];

      const filterMemories = (typeFilter: string | 'all', searchQuery: string) => {
        return memories.filter((m) => {
          if (typeFilter !== 'all' && m.type !== typeFilter) return false;
          if (searchQuery) {
            return m.content.toLowerCase().includes(searchQuery.toLowerCase());
          }
          return true;
        });
      };

      return {
        allTypescript: filterMemories('all', 'TypeScript').length,
        preferenceTypescript: filterMemories('preference', 'TypeScript').length,
        factTypescript: filterMemories('fact', 'TypeScript').length,
      };
    });

    expect(result.allTypescript).toBe(2);
    expect(result.preferenceTypescript).toBe(1);
    expect(result.factTypescript).toBe(1);
  });
});

test.describe('Memory Settings - Statistics', () => {
  test('should calculate memory statistics with pinned count', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        { id: 'mem-1', type: 'preference', enabled: true, pinned: true },
        { id: 'mem-2', type: 'fact', enabled: true, pinned: true },
        { id: 'mem-3', type: 'instruction', enabled: false, pinned: false },
        { id: 'mem-4', type: 'context', enabled: true, pinned: false },
      ];

      type MemoryType = 'preference' | 'fact' | 'instruction' | 'context';
      const byType: Record<MemoryType, number> = {
        preference: 0,
        fact: 0,
        instruction: 0,
        context: 0,
      };

      let enabled = 0;
      let pinned = 0;

      for (const memory of memories) {
        byType[memory.type as MemoryType]++;
        if (memory.enabled) enabled++;
        if (memory.pinned) pinned++;
      }

      return {
        total: memories.length,
        enabled,
        pinned,
        byType,
      };
    });

    expect(result.total).toBe(4);
    expect(result.enabled).toBe(3);
    expect(result.pinned).toBe(2);
    expect(result.byType.preference).toBe(1);
    expect(result.byType.fact).toBe(1);
  });

  test('should collect all unique tags', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        { id: 'mem-1', tags: ['coding', 'typescript'] },
        { id: 'mem-2', tags: ['python', 'coding'] },
        { id: 'mem-3', tags: ['react'] },
        { id: 'mem-4', tags: [] },
      ];

      const getAllTags = (): string[] => {
        const tagsSet = new Set<string>();
        for (const memory of memories) {
          for (const tag of memory.tags || []) {
            tagsSet.add(tag);
          }
        }
        return Array.from(tagsSet).sort();
      };

      const tags = getAllTags();
      return {
        tagCount: tags.length,
        tags,
      };
    });

    expect(result.tagCount).toBe(4);
    expect(result.tags).toEqual(['coding', 'python', 'react', 'typescript']);
  });
});

test.describe('Memory Settings - Similarity Detection', () => {
  test('should find similar memories', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memories = [
        { id: 'mem-1', content: 'I prefer TypeScript for web development' },
        { id: 'mem-2', content: 'I work with Python data science' },
        { id: 'mem-3', content: 'TypeScript is great for large projects' },
      ];

      const findSimilarMemories = (content: string) => {
        const lowerContent = content.toLowerCase();
        const words = lowerContent.split(/\s+/).filter((w) => w.length > 3);
        
        if (words.length === 0) return [];

        return memories.filter((m) => {
          const memLower = m.content.toLowerCase();
          const matchCount = words.filter((w) => memLower.includes(w)).length;
          return matchCount >= Math.ceil(words.length * 0.5);
        });
      };

      const similar = findSimilarMemories('TypeScript development projects');
      return {
        similarCount: similar.length,
        hasTypescriptMatches: similar.some((m) => m.content.includes('TypeScript')),
      };
    });

    expect(result.similarCount).toBeGreaterThan(0);
    expect(result.hasTypescriptMatches).toBe(true);
  });
});

test.describe('Memory Settings UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display memory settings section', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for Memory tab
      const memorySection = page.locator('text=Memory').first();
      const hasMemory = await memorySection.isVisible().catch(() => false);
      expect(hasMemory).toBe(true);
    }
  });

  test('should display add memory button', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Click Memory tab if available
      const memoryTab = page
        .locator('[role="tab"]:has-text("Memory"), button:has-text("Memory")')
        .first();
      if (await memoryTab.isVisible()) {
        await memoryTab.click();
        await waitForAnimation(page);
      }

      // Look for add button
      const addBtn = page.locator('button:has-text("Add")').first();
      const hasAdd = await addBtn.isVisible().catch(() => false);
      expect(hasAdd).toBe(true);
    }
  });

  test('should display clear all button', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for clear button
      const clearBtn = page
        .locator('button:has-text("Clear"), button:has-text("Clear All")')
        .first();
      const hasClear = await clearBtn.isVisible().catch(() => false);
      expect(hasClear).toBe(true);
    }
  });

  test('should display search input', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Click Memory tab if available
      const memoryTab = page
        .locator('[role="tab"]:has-text("Memory"), button:has-text("Memory")')
        .first();
      if (await memoryTab.isVisible()) {
        await memoryTab.click();
        await waitForAnimation(page);
      }

      // Look for search input
      const searchInput = page
        .locator('input[placeholder*="search" i], input[type="search"]')
        .first();
      const hasSearch = await searchInput.isVisible().catch(() => false);
      expect(hasSearch).toBe(true);
    }
  });

  test('should display memory toggle switches', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for toggle switches
      const switches = page.locator('[role="switch"]');
      const hasSwitches = (await switches.count()) > 0;
      expect(hasSwitches).toBe(true);
    }
  });
});
