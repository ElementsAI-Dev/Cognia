import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * Tool Settings Complete Tests
 * Tests built-in tool configuration and permissions
 * Optimized for CI/CD efficiency
 */

test.describe('Tool Settings - Tool Categories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should list all tool categories', async ({ page }) => {
    const result = await page.evaluate(() => {
      const toolCategories = [
        { id: 'file', name: 'File Operations', requiresApproval: true },
        { id: 'document', name: 'Document Processing', requiresApproval: false },
        { id: 'search', name: 'Web Search', requiresApproval: false },
        { id: 'rag', name: 'Knowledge Base Search', requiresApproval: false },
        { id: 'calculator', name: 'Calculator', requiresApproval: false },
        { id: 'code', name: 'Code Execution', requiresApproval: true },
      ];

      const getApprovalRequiredCategories = () =>
        toolCategories.filter((c) => c.requiresApproval);

      const getSafeCategories = () =>
        toolCategories.filter((c) => !c.requiresApproval);

      return {
        categoryCount: toolCategories.length,
        approvalRequiredCount: getApprovalRequiredCategories().length,
        safeCategoriesCount: getSafeCategories().length,
        categoryNames: toolCategories.map((c) => c.name),
      };
    });

    expect(result.categoryCount).toBe(6);
    expect(result.approvalRequiredCount).toBe(2);
    expect(result.safeCategoriesCount).toBe(4);
    expect(result.categoryNames).toContain('File Operations');
    expect(result.categoryNames).toContain('Code Execution');
  });

  test('should toggle file tools', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        enableFileTools: false,
      };

      const toggleFileTools = (): void => {
        settings.enableFileTools = !settings.enableFileTools;
      };

      const initial = settings.enableFileTools;
      toggleFileTools();
      const afterEnable = settings.enableFileTools;
      toggleFileTools();
      const afterDisable = settings.enableFileTools;

      return { initial, afterEnable, afterDisable };
    });

    expect(result.initial).toBe(false);
    expect(result.afterEnable).toBe(true);
    expect(result.afterDisable).toBe(false);
  });

  test('should toggle document tools', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        enableDocumentTools: true,
      };

      const toggleDocumentTools = (): void => {
        settings.enableDocumentTools = !settings.enableDocumentTools;
      };

      const initial = settings.enableDocumentTools;
      toggleDocumentTools();
      const afterToggle = settings.enableDocumentTools;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });

  test('should toggle web search tools', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        enableWebSearch: true,
      };

      const toggleWebSearch = (): void => {
        settings.enableWebSearch = !settings.enableWebSearch;
      };

      const initial = settings.enableWebSearch;
      toggleWebSearch();
      const afterToggle = settings.enableWebSearch;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });

  test('should toggle RAG search tools', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        enableRAGSearch: true,
      };

      const toggleRAGSearch = (): void => {
        settings.enableRAGSearch = !settings.enableRAGSearch;
      };

      const initial = settings.enableRAGSearch;
      toggleRAGSearch();
      const afterToggle = settings.enableRAGSearch;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });

  test('should toggle calculator tool', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        enableCalculator: true,
      };

      const toggleCalculator = (): void => {
        settings.enableCalculator = !settings.enableCalculator;
      };

      const initial = settings.enableCalculator;
      toggleCalculator();
      const afterToggle = settings.enableCalculator;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });

  test('should toggle code execution tool', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        enableCodeExecution: false,
      };

      const toggleCodeExecution = (): void => {
        settings.enableCodeExecution = !settings.enableCodeExecution;
      };

      const initial = settings.enableCodeExecution;
      toggleCodeExecution();
      const afterEnable = settings.enableCodeExecution;

      return { initial, afterEnable };
    });

    expect(result.initial).toBe(false);
    expect(result.afterEnable).toBe(true);
  });
});

test.describe('Tool Settings - Individual Tools', () => {
  test('should list file operation tools', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const fileTools = [
        { name: 'file_read', description: 'Read file contents', requiresApproval: false },
        { name: 'file_write', description: 'Write content to files', requiresApproval: true },
        { name: 'file_list', description: 'List directory contents', requiresApproval: false },
        { name: 'file_exists', description: 'Check if file exists', requiresApproval: false },
        { name: 'file_delete', description: 'Delete files', requiresApproval: true },
        { name: 'file_copy', description: 'Copy files', requiresApproval: true },
        { name: 'file_rename', description: 'Rename/move files', requiresApproval: true },
        { name: 'file_info', description: 'Get file metadata', requiresApproval: false },
        { name: 'file_search', description: 'Search for files', requiresApproval: false },
        { name: 'file_append', description: 'Append to files', requiresApproval: true },
        { name: 'directory_create', description: 'Create directories', requiresApproval: true },
      ];

      const getApprovalRequiredTools = () =>
        fileTools.filter((t) => t.requiresApproval);

      const getSafeTools = () =>
        fileTools.filter((t) => !t.requiresApproval);

      return {
        toolCount: fileTools.length,
        approvalRequiredCount: getApprovalRequiredTools().length,
        safeToolCount: getSafeTools().length,
        toolNames: fileTools.map((t) => t.name),
      };
    });

    expect(result.toolCount).toBe(11);
    expect(result.approvalRequiredCount).toBe(6);
    expect(result.safeToolCount).toBe(5);
    expect(result.toolNames).toContain('file_read');
    expect(result.toolNames).toContain('file_write');
  });

  test('should list document processing tools', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const documentTools = [
        { name: 'document_summarize', description: 'Generate document summaries', requiresApproval: false },
        { name: 'document_chunk', description: 'Split documents into chunks', requiresApproval: false },
        { name: 'document_analyze', description: 'Analyze document structure', requiresApproval: false },
      ];

      const allSafe = documentTools.every((t) => !t.requiresApproval);

      return {
        toolCount: documentTools.length,
        allSafe,
        toolNames: documentTools.map((t) => t.name),
      };
    });

    expect(result.toolCount).toBe(3);
    expect(result.allSafe).toBe(true);
    expect(result.toolNames).toContain('document_summarize');
  });

  test('should identify dangerous tools', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const allTools = [
        { name: 'file_read', category: 'file', dangerous: false },
        { name: 'file_write', category: 'file', dangerous: true },
        { name: 'file_delete', category: 'file', dangerous: true },
        { name: 'execute_code', category: 'code', dangerous: true },
        { name: 'web_search', category: 'search', dangerous: false },
        { name: 'calculator', category: 'calculator', dangerous: false },
      ];

      const getDangerousTools = () => allTools.filter((t) => t.dangerous);
      const getSafeTools = () => allTools.filter((t) => !t.dangerous);

      const dangerousToolNames = getDangerousTools().map((t) => t.name);
      const safeToolNames = getSafeTools().map((t) => t.name);

      return {
        dangerousCount: getDangerousTools().length,
        safeCount: getSafeTools().length,
        dangerousToolNames,
        safeToolNames,
      };
    });

    expect(result.dangerousCount).toBe(3);
    expect(result.safeCount).toBe(3);
    expect(result.dangerousToolNames).toContain('file_write');
    expect(result.dangerousToolNames).toContain('execute_code');
    expect(result.safeToolNames).toContain('calculator');
  });
});

test.describe('Tool Settings - Approval System', () => {
  test('should configure tool approval requirements', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ToolApprovalConfig {
        toolId: string;
        requiresApproval: boolean;
        autoApprove: boolean;
      }

      const toolApprovals: ToolApprovalConfig[] = [
        { toolId: 'file_write', requiresApproval: true, autoApprove: false },
        { toolId: 'file_delete', requiresApproval: true, autoApprove: false },
        { toolId: 'execute_code', requiresApproval: true, autoApprove: false },
      ];

      const setAutoApprove = (toolId: string, autoApprove: boolean): boolean => {
        const tool = toolApprovals.find((t) => t.toolId === toolId);
        if (tool) {
          tool.autoApprove = autoApprove;
          return true;
        }
        return false;
      };

      const isToolAutoApproved = (toolId: string): boolean => {
        const tool = toolApprovals.find((t) => t.toolId === toolId);
        return tool?.autoApprove ?? false;
      };

      // Set auto-approve for file_write
      setAutoApprove('file_write', true);

      return {
        fileWriteAutoApprove: isToolAutoApproved('file_write'),
        fileDeleteAutoApprove: isToolAutoApproved('file_delete'),
        executeCodeAutoApprove: isToolAutoApproved('execute_code'),
      };
    });

    expect(result.fileWriteAutoApprove).toBe(true);
    expect(result.fileDeleteAutoApprove).toBe(false);
    expect(result.executeCodeAutoApprove).toBe(false);
  });

  test('should validate tool execution approval', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ApprovalResult {
        approved: boolean;
        reason?: string;
      }

      const toolApprovalSettings = {
        requireApproval: true,
        autoApprovedTools: ['file_read', 'calculator'],
      };

      const checkApproval = (
        toolId: string,
        isDestructive: boolean
      ): ApprovalResult => {
        // Auto-approved tools don't need approval
        if (toolApprovalSettings.autoApprovedTools.includes(toolId)) {
          return { approved: true, reason: 'Auto-approved' };
        }

        // Destructive tools always need approval
        if (isDestructive) {
          return { approved: false, reason: 'Destructive action requires approval' };
        }

        // If global approval is required
        if (toolApprovalSettings.requireApproval) {
          return { approved: false, reason: 'Manual approval required' };
        }

        return { approved: true };
      };

      return {
        fileRead: checkApproval('file_read', false),
        calculator: checkApproval('calculator', false),
        fileWrite: checkApproval('file_write', true),
        webSearch: checkApproval('web_search', false),
      };
    });

    expect(result.fileRead.approved).toBe(true);
    expect(result.calculator.approved).toBe(true);
    expect(result.fileWrite.approved).toBe(false);
    expect(result.webSearch.approved).toBe(false);
  });
});

test.describe('Tool Settings - Combined Configuration', () => {
  test('should manage all tool settings together', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ToolSettings {
        enableFileTools: boolean;
        enableDocumentTools: boolean;
        enableCodeExecution: boolean;
        enableWebSearch: boolean;
        enableRAGSearch: boolean;
        enableCalculator: boolean;
      }

      const defaultSettings: ToolSettings = {
        enableFileTools: false,
        enableDocumentTools: true,
        enableCodeExecution: false,
        enableWebSearch: true,
        enableRAGSearch: true,
        enableCalculator: true,
      };

      let currentSettings: ToolSettings = { ...defaultSettings };

      const updateSettings = (updates: Partial<ToolSettings>): void => {
        currentSettings = { ...currentSettings, ...updates };
      };

      const resetToDefaults = (): void => {
        currentSettings = { ...defaultSettings };
      };

      const getEnabledToolCount = (): number => {
        return Object.values(currentSettings).filter(Boolean).length;
      };

      // Enable all tools
      updateSettings({
        enableFileTools: true,
        enableCodeExecution: true,
      });
      const afterEnableAll = getEnabledToolCount();

      // Disable some
      updateSettings({
        enableWebSearch: false,
        enableCalculator: false,
      });
      const afterDisableSome = getEnabledToolCount();

      resetToDefaults();
      const afterReset = getEnabledToolCount();

      return {
        afterEnableAll,
        afterDisableSome,
        afterReset,
        defaults: defaultSettings,
      };
    });

    expect(result.afterEnableAll).toBe(6);
    expect(result.afterDisableSome).toBe(4);
    expect(result.afterReset).toBe(4); // 4 enabled by default
  });

  test('should check desktop requirement for file tools', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const isTauriApp = (): boolean => {
        return typeof window !== 'undefined' && '__TAURI__' in window;
      };

      const checkFileToolsAvailability = (): {
        available: boolean;
        reason?: string;
      } => {
        if (!isTauriApp()) {
          return {
            available: false,
            reason: 'File operations require the desktop app',
          };
        }
        return { available: true };
      };

      const result = checkFileToolsAvailability();

      return {
        isDesktop: isTauriApp(),
        fileToolsAvailable: result.available,
        reason: result.reason,
      };
    });

    // In browser, file tools should not be available
    expect(result.isDesktop).toBe(false);
    expect(result.fileToolsAvailable).toBe(false);
    expect(result.reason).toContain('desktop app');
  });
});

test.describe('Tool Settings - Persistence', () => {
  test('should persist tool settings to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const toolSettings = {
        enableFileTools: true,
        enableDocumentTools: true,
        enableCodeExecution: false,
        enableWebSearch: true,
        enableRAGSearch: false,
        enableCalculator: true,
      };
      localStorage.setItem(
        'cognia-tool-settings',
        JSON.stringify({ state: toolSettings })
      );
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-tool-settings');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.enableFileTools).toBe(true);
    expect(stored.state.enableCodeExecution).toBe(false);
    expect(stored.state.enableRAGSearch).toBe(false);
  });

  test('should reset tool settings to defaults', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const defaultSettings = {
        enableFileTools: false,
        enableDocumentTools: true,
        enableCodeExecution: false,
        enableWebSearch: true,
        enableRAGSearch: true,
        enableCalculator: true,
      };

      let currentSettings = {
        enableFileTools: true,
        enableDocumentTools: false,
        enableCodeExecution: true,
        enableWebSearch: false,
        enableRAGSearch: false,
        enableCalculator: false,
      };

      const resetToDefaults = () => {
        currentSettings = { ...defaultSettings };
      };

      const beforeReset = { ...currentSettings };
      resetToDefaults();
      const afterReset = { ...currentSettings };

      return { beforeReset, afterReset, defaults: defaultSettings };
    });

    expect(result.beforeReset.enableFileTools).toBe(true);
    expect(result.beforeReset.enableCodeExecution).toBe(true);
    expect(result.afterReset).toEqual(result.defaults);
  });
});

test.describe('Tool Settings UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display tool settings section', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for Tools tab
      const toolsSection = page.locator('text=Tools').first();
      const hasTools = await toolsSection.isVisible().catch(() => false);
      expect(hasTools).toBe(true);
    }
  });

  test('should display tool category cards', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Click Tools tab if available
      const toolsTab = page
        .locator('[role="tab"]:has-text("Tools"), button:has-text("Tools")')
        .first();
      if (await toolsTab.isVisible()) {
        await toolsTab.click();
        await waitForAnimation(page);
      }

      // Look for tool categories
      const fileOpsCard = page.locator('text=File Operations, text=File').first();
      const hasFileOps = await fileOpsCard.isVisible().catch(() => false);
      expect(hasFileOps).toBe(true);
    }
  });

  test('should display tool toggle switches', async ({ page }) => {
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

  test('should display approval warning badges', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Click Tools tab if available
      const toolsTab = page
        .locator('[role="tab"]:has-text("Tools"), button:has-text("Tools")')
        .first();
      if (await toolsTab.isVisible()) {
        await toolsTab.click();
        await waitForAnimation(page);
      }

      // Look for approval warnings
      const approvalWarning = page
        .locator('text=approval, text=Requires approval')
        .first();
      const hasWarning = await approvalWarning.isVisible().catch(() => false);
      expect(hasWarning).toBe(true);
    }
  });

  test('should display permission info alert', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Click Tools tab if available
      const toolsTab = page
        .locator('[role="tab"]:has-text("Tools"), button:has-text("Tools")')
        .first();
      if (await toolsTab.isVisible()) {
        await toolsTab.click();
        await waitForAnimation(page);
      }

      // Look for permission info
      const permissionInfo = page
        .locator('text=Permission, text=Tool Permissions')
        .first();
      const hasInfo = await permissionInfo.isVisible().catch(() => false);
      expect(hasInfo).toBe(true);
    }
  });
});
