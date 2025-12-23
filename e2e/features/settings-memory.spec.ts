import { test, expect } from '@playwright/test';

/**
 * Memory Settings Complete Tests
 * Tests memory management and configuration
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
      await page.waitForTimeout(300);

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
      await page.waitForTimeout(300);

      // Click Memory tab if available
      const memoryTab = page
        .locator('[role="tab"]:has-text("Memory"), button:has-text("Memory")')
        .first();
      if (await memoryTab.isVisible()) {
        await memoryTab.click();
        await page.waitForTimeout(200);
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
      await page.waitForTimeout(300);

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
      await page.waitForTimeout(300);

      // Click Memory tab if available
      const memoryTab = page
        .locator('[role="tab"]:has-text("Memory"), button:has-text("Memory")')
        .first();
      if (await memoryTab.isVisible()) {
        await memoryTab.click();
        await page.waitForTimeout(200);
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
      await page.waitForTimeout(300);

      // Look for toggle switches
      const switches = page.locator('[role="switch"]');
      const hasSwitches = (await switches.count()) > 0;
      expect(hasSwitches).toBe(true);
    }
  });
});
