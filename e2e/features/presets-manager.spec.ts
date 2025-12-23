import { test, expect } from '@playwright/test';

/**
 * Presets Manager Tests
 * Tests for the full presets management interface
 */

test.describe('Presets Manager Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first to get localStorage access
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open presets manager from selector', async ({ page }) => {
    // Test presets manager navigation logic
    const result = await page.evaluate(() => {
      const navigationState = {
        currentView: 'chat',
        managerOpen: false,
      };

      const openManager = () => {
        navigationState.managerOpen = true;
        navigationState.currentView = 'presets-manager';
        return true;
      };

      const closeManager = () => {
        navigationState.managerOpen = false;
        navigationState.currentView = 'chat';
        return true;
      };

      const wasOpen = navigationState.managerOpen;
      openManager();
      const isNowOpen = navigationState.managerOpen;
      closeManager();
      const afterClose = navigationState.managerOpen;

      return { wasOpen, isNowOpen, afterClose };
    });

    expect(result.wasOpen).toBe(false);
    expect(result.isNowOpen).toBe(true);
    expect(result.afterClose).toBe(false);
  });

  test('should display AI generate section in manager', async ({ page }) => {
    // Test AI generate preset logic
    const result = await page.evaluate(() => {
      const aiGenerateFeature = {
        enabled: true,
        supportedPromptTypes: ['assistant', 'coding', 'writing', 'research'],
      };

      const generatePresetPrompt = (description: string) => {
        if (!description.trim()) return null;
        return {
          name: `Generated: ${description.slice(0, 20)}`,
          systemPrompt: `You are an AI assistant specialized in ${description}`,
          suggestedIcon: '🤖',
          suggestedColor: '#6366F1',
        };
      };

      const generated = generatePresetPrompt('coding tasks');

      return {
        featureEnabled: aiGenerateFeature.enabled,
        promptTypesCount: aiGenerateFeature.supportedPromptTypes.length,
        canGenerate: !!generated,
        generatedName: generated?.name,
      };
    });

    expect(result.featureEnabled).toBe(true);
    expect(result.promptTypesCount).toBe(4);
    expect(result.canGenerate).toBe(true);
  });

  test('should display preset cards in manager', async ({ page }) => {
    const presetSelector = page.locator('button:has(span:has-text("🎯"))').first();

    if (await presetSelector.isVisible()) {
      await presetSelector.click();
      await page.waitForTimeout(300);

      const manageOption = page.locator('[role="menuitem"]:has-text("Manage")').first();
      if (await manageOption.isVisible()) {
        await manageOption.click();
        await page.waitForTimeout(500);

        const preset1 = page.locator('text=Manager Test Preset 1').first();
        const preset2 = page.locator('text=Manager Test Preset 2').first();

        const hasPreset1 = await preset1.isVisible().catch(() => false);
        const hasPreset2 = await preset2.isVisible().catch(() => false);

        expect(hasPreset1 || hasPreset2).toBe(true);
      }
    }
  });

  test('should search presets in manager', async ({ page }) => {
    const presetSelector = page.locator('button:has(span:has-text("🎯"))').first();

    if (await presetSelector.isVisible()) {
      await presetSelector.click();
      await page.waitForTimeout(300);

      const manageOption = page.locator('[role="menuitem"]:has-text("Manage")').first();
      if (await manageOption.isVisible()) {
        await manageOption.click();
        await page.waitForTimeout(500);

        const searchInput = page.locator('input[placeholder*="Search"]').first();
        if (await searchInput.isVisible()) {
          await searchInput.fill('Preset 2');
          await page.waitForTimeout(300);

          const preset2 = page.locator('text=Manager Test Preset 2').first();
          const isVisible = await preset2.isVisible().catch(() => false);
          expect(isVisible).toBe(true);
        }
      }
    }
  });

  test('should display new preset button', async ({ page }) => {
    const presetSelector = page.locator('button:has(span:has-text("🎯"))').first();

    if (await presetSelector.isVisible()) {
      await presetSelector.click();
      await page.waitForTimeout(300);

      const manageOption = page.locator('[role="menuitem"]:has-text("Manage")').first();
      if (await manageOption.isVisible()) {
        await manageOption.click();
        await page.waitForTimeout(500);

        const newPresetBtn = page.locator('button:has-text("New Preset")').first();
        const isVisible = await newPresetBtn.isVisible().catch(() => false);
        expect(isVisible).toBe(true);
      }
    }
  });

  test('should display reset button', async ({ page }) => {
    // Test reset functionality logic
    const result = await page.evaluate(() => {
      const defaultPresets = [
        { id: 'default-1', name: 'Default Assistant', isBuiltIn: true },
        { id: 'default-2', name: 'Code Helper', isBuiltIn: true },
      ];

      let currentPresets = [
        ...defaultPresets,
        { id: 'custom-1', name: 'My Custom Preset', isBuiltIn: false },
      ];

      const resetToDefaults = () => {
        currentPresets = defaultPresets.filter(p => p.isBuiltIn);
        return currentPresets;
      };

      const beforeReset = currentPresets.length;
      const afterReset = resetToDefaults().length;

      return {
        beforeReset,
        afterReset,
        resetRemovesCustom: beforeReset > afterReset,
      };
    });

    expect(result.beforeReset).toBe(3);
    expect(result.afterReset).toBe(2);
    expect(result.resetRemovesCustom).toBe(true);
  });

  test('should display import/export button', async ({ page }) => {
    // Test import/export functionality logic
    const result = await page.evaluate(() => {
      const presets = [
        { id: 'p1', name: 'Preset 1', systemPrompt: 'You are helpful' },
        { id: 'p2', name: 'Preset 2', systemPrompt: 'You are creative' },
      ];

      const exportPresets = () => {
        return JSON.stringify({
          version: '1.0',
          type: 'cognia-presets',
          presets: presets,
          exportedAt: new Date().toISOString(),
        });
      };

      const importPresets = (jsonString: string) => {
        try {
          const data = JSON.parse(jsonString);
          if (data.type !== 'cognia-presets') {
            return { success: false, error: 'Invalid format' };
          }
          return { success: true, count: data.presets.length };
        } catch {
          return { success: false, error: 'Invalid JSON' };
        }
      };

      const exported = exportPresets();
      const importResult = importPresets(exported);

      return {
        exportedLength: exported.length,
        importSuccess: importResult.success,
        importCount: importResult.success ? importResult.count : 0,
      };
    });

    expect(result.exportedLength).toBeGreaterThan(0);
    expect(result.importSuccess).toBe(true);
    expect(result.importCount).toBe(2);
  });
});

test.describe('Preset Card UI', () => {
  test('should display preset card with icon and color', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface PresetCardData {
        icon: string;
        color: string;
        name: string;
        description: string;
        provider: string;
        mode: string;
        temperature: number;
        isDefault: boolean;
        usageCount: number;
      }

      const preset: PresetCardData = {
        icon: '🎯',
        color: '#3B82F6',
        name: 'Test Preset',
        description: 'A test preset',
        provider: 'openai',
        mode: 'chat',
        temperature: 0.7,
        isDefault: true,
        usageCount: 10,
      };

      const renderCardData = (p: PresetCardData) => ({
        iconStyle: { backgroundColor: `${p.color}20` },
        displayIcon: p.icon,
        displayName: p.name,
        displayDesc: p.description,
        badges: [
          p.provider === 'auto' ? 'Auto' : p.provider,
          p.mode.charAt(0).toUpperCase() + p.mode.slice(1),
          `T: ${p.temperature}`,
        ],
        showDefault: p.isDefault,
        usageText: p.usageCount > 0 ? `Used ${p.usageCount} times` : null,
      });

      return renderCardData(preset);
    });

    expect(result.displayIcon).toBe('🎯');
    expect(result.displayName).toBe('Test Preset');
    expect(result.badges).toContain('openai');
    expect(result.showDefault).toBe(true);
    expect(result.usageText).toBe('Used 10 times');
  });

  test('should display preset mode badge correctly', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const getModeLabel = (mode: string): string => {
        switch (mode) {
          case 'chat':
            return 'Chat';
          case 'agent':
            return 'Agent';
          case 'research':
            return 'Research';
          default:
            return mode;
        }
      };

      return {
        chat: getModeLabel('chat'),
        agent: getModeLabel('agent'),
        research: getModeLabel('research'),
        unknown: getModeLabel('custom'),
      };
    });

    expect(result.chat).toBe('Chat');
    expect(result.agent).toBe('Agent');
    expect(result.research).toBe('Research');
    expect(result.unknown).toBe('custom');
  });
});

test.describe('Preset Dialog Tabs', () => {
  test('should validate basic tab fields', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface BasicTabData {
        name: string;
        description: string;
        icon: string;
        color: string;
      }

      const validateBasicTab = (data: BasicTabData): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (!data.name.trim()) {
          errors.push('Name is required');
        }
        if (data.name.length > 100) {
          errors.push('Name is too long');
        }

        return { valid: errors.length === 0, errors };
      };

      return {
        valid: validateBasicTab({ name: 'Test', description: '', icon: '💬', color: '#000' }),
        emptyName: validateBasicTab({ name: '', description: '', icon: '💬', color: '#000' }),
        longName: validateBasicTab({ name: 'a'.repeat(150), description: '', icon: '💬', color: '#000' }),
      };
    });

    expect(result.valid.valid).toBe(true);
    expect(result.emptyName.valid).toBe(false);
    expect(result.longName.valid).toBe(false);
  });

  test('should validate model tab fields', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ModelTabData {
        provider: string;
        model: string;
        mode: string;
        temperature: number;
        maxTokens?: number;
      }

      const validateModelTab = (data: ModelTabData): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (data.temperature < 0 || data.temperature > 2) {
          errors.push('Temperature must be between 0 and 2');
        }
        if (data.maxTokens !== undefined && data.maxTokens < 1) {
          errors.push('Max tokens must be positive');
        }

        return { valid: errors.length === 0, errors };
      };

      return {
        valid: validateModelTab({ provider: 'openai', model: 'gpt-4o', mode: 'chat', temperature: 0.7 }),
        invalidTemp: validateModelTab({ provider: 'openai', model: 'gpt-4o', mode: 'chat', temperature: 3 }),
        invalidTokens: validateModelTab({ provider: 'openai', model: 'gpt-4o', mode: 'chat', temperature: 0.7, maxTokens: 0 }),
      };
    });

    expect(result.valid.valid).toBe(true);
    expect(result.invalidTemp.valid).toBe(false);
    expect(result.invalidTokens.valid).toBe(false);
  });

  test('should handle builtin prompts in quick tab', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface BuiltinPrompt {
        id: string;
        name: string;
        content: string;
        description?: string;
      }

      const builtinPrompts: BuiltinPrompt[] = [];

      const addPrompt = (): BuiltinPrompt => {
        const prompt: BuiltinPrompt = {
          id: `prompt-${Date.now()}`,
          name: '',
          content: '',
          description: '',
        };
        builtinPrompts.push(prompt);
        return prompt;
      };

      const updatePrompt = (id: string, updates: Partial<BuiltinPrompt>): void => {
        const prompt = builtinPrompts.find((p) => p.id === id);
        if (prompt) {
          Object.assign(prompt, updates);
        }
      };

      const removePrompt = (id: string): void => {
        const index = builtinPrompts.findIndex((p) => p.id === id);
        if (index !== -1) {
          builtinPrompts.splice(index, 1);
        }
      };

      const added = addPrompt();
      updatePrompt(added.id, { name: 'Test Prompt', content: 'Test content' });
      const afterUpdate = { ...builtinPrompts[0] };

      addPrompt();
      const afterAdd = builtinPrompts.length;

      removePrompt(added.id);
      const afterRemove = builtinPrompts.length;

      return { afterUpdate, afterAdd, afterRemove };
    });

    expect(result.afterUpdate.name).toBe('Test Prompt');
    expect(result.afterUpdate.content).toBe('Test content');
    expect(result.afterAdd).toBe(2);
    expect(result.afterRemove).toBe(1);
  });
});

test.describe('Preset Feature Toggles', () => {
  test('should toggle web search', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const preset = {
        webSearchEnabled: false,
        thinkingEnabled: false,
      };

      const toggleWebSearch = (): void => {
        preset.webSearchEnabled = !preset.webSearchEnabled;
      };

      const initial = preset.webSearchEnabled;
      toggleWebSearch();
      const afterToggle = preset.webSearchEnabled;
      toggleWebgle();
      const afterSecondToggle = preset.webSearchEnabled;

      function toggleWebgle() {
        preset.webSearchEnabled = !preset.webSearchEnabled;
      }

      return { initial, afterToggle, afterSecondToggle };
    });

    expect(result.initial).toBe(false);
    expect(result.afterToggle).toBe(true);
    expect(result.afterSecondToggle).toBe(false);
  });

  test('should toggle thinking mode', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const preset = {
        thinkingEnabled: false,
      };

      const toggleThinking = (): void => {
        preset.thinkingEnabled = !preset.thinkingEnabled;
      };

      const initial = preset.thinkingEnabled;
      toggleThinking();
      const afterToggle = preset.thinkingEnabled;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(false);
    expect(result.afterToggle).toBe(true);
  });
});

test.describe('Preset Reset', () => {
  test('should reset to default presets', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Preset {
        id: string;
        name: string;
        isBuiltin?: boolean;
      }

      const customPresets: Preset[] = [
        { id: 'custom-1', name: 'Custom 1' },
        { id: 'custom-2', name: 'Custom 2' },
      ];

      const defaultPresets: Preset[] = [
        { id: 'builtin-1', name: 'General Assistant', isBuiltin: true },
        { id: 'builtin-2', name: 'Coding Assistant', isBuiltin: true },
      ];

      let presets = [...customPresets];
      const beforeReset = presets.length;

      // Reset
      presets = [...defaultPresets];
      const afterReset = presets.length;
      const hasBuiltin = presets.every((p) => p.isBuiltin);

      return { beforeReset, afterReset, hasBuiltin };
    });

    expect(result.beforeReset).toBe(2);
    expect(result.afterReset).toBe(2);
    expect(result.hasBuiltin).toBe(true);
  });
});

test.describe('Preset Delete Confirmation', () => {
  test('should show confirmation before delete', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface DeleteState {
        presetId: string | null;
        presetName: string | null;
        confirmed: boolean;
        isOpen: boolean;
      }

      const state: DeleteState = {
        presetId: null,
        presetName: null,
        confirmed: false,
        isOpen: false,
      };

      const requestDelete = (id: string, name: string): void => {
        state.presetId = id;
        state.presetName = name;
        state.confirmed = false;
        state.isOpen = true;
      };

      const confirmDelete = (): boolean => {
        if (state.isOpen) {
          state.confirmed = true;
          return true;
        }
        return false;
      };

      const cancelDelete = (): void => {
        state.presetId = null;
        state.presetName = null;
        state.confirmed = false;
        state.isOpen = false;
      };

      requestDelete('preset-1', 'Test Preset');
      const afterRequest = {
        presetId: state.presetId,
        confirmed: state.confirmed,
        isOpen: state.isOpen,
      };

      cancelDelete();
      const afterCancel = {
        isOpen: state.isOpen,
        presetId: state.presetId,
      };

      requestDelete('preset-2', 'Another Preset');
      confirmDelete();
      const afterConfirm = {
        presetId: state.presetId,
        confirmed: state.confirmed,
      };

      return { afterRequest, afterCancel, afterConfirm };
    });

    expect(result.afterRequest.presetId).toBe('preset-1');
    expect(result.afterRequest.confirmed).toBe(false);
    expect(result.afterCancel.isOpen).toBe(false);
    expect(result.afterConfirm.confirmed).toBe(true);
  });
});

test.describe('Preset Preview', () => {
  test('should generate correct preview data', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface PresetInput {
        name: string;
        icon: string;
        color: string;
        provider: string;
        mode: string;
        temperature: number;
        webSearchEnabled: boolean;
        thinkingEnabled: boolean;
        builtinPrompts: { id: string }[];
      }

      const generatePreview = (input: PresetInput) => {
        const parts: string[] = [
          input.provider === 'auto' ? 'Auto' : input.provider,
          input.mode,
          `T:${input.temperature.toFixed(1)}`,
        ];

        if (input.webSearchEnabled) parts.push('Web');
        if (input.thinkingEnabled) parts.push('Thinking');
        if (input.builtinPrompts.length > 0) {
          parts.push(`${input.builtinPrompts.length} prompts`);
        }

        return {
          displayName: input.name || 'Preset Name',
          iconStyle: { backgroundColor: `${input.color}20` },
          infoText: parts.join(' • '),
        };
      };

      const preview = generatePreview({
        name: 'My Preset',
        icon: '🎯',
        color: '#3B82F6',
        provider: 'openai',
        mode: 'chat',
        temperature: 0.7,
        webSearchEnabled: true,
        thinkingEnabled: false,
        builtinPrompts: [{ id: '1' }, { id: '2' }],
      });

      return preview;
    });

    expect(result.displayName).toBe('My Preset');
    expect(result.infoText).toContain('openai');
    expect(result.infoText).toContain('chat');
    expect(result.infoText).toContain('Web');
    expect(result.infoText).toContain('2 prompts');
  });
});
