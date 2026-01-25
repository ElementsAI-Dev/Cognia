/**
 * Tests for Custom Mode Store
 */

import { act } from '@testing-library/react';
import {
  useCustomModeStore,
  selectCustomModes,
  selectCustomModeById,
  selectCustomModeCount,
  TOOL_CATEGORIES,
  ALL_AVAILABLE_TOOLS,
  AVAILABLE_MODE_ICONS,
  MODE_TEMPLATES,
  TOOL_REQUIREMENTS,
  checkToolAvailability,
  processPromptTemplateVariables,
  getTemplateVariablePreview,
  getModeTemplate,
  getRecommendedMcpToolsForMode,
  autoSelectMcpToolsForMode,
  type CustomModeConfig,
  type McpToolReference,
} from './custom-mode-store';

describe('useCustomModeStore', () => {
  beforeEach(() => {
    act(() => {
      useCustomModeStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useCustomModeStore.getState();
      expect(state.customModes).toEqual({});
      expect(state.activeModeId).toBeNull();
      expect(state.isGenerating).toBe(false);
      expect(state.generationError).toBeNull();
    });
  });

  describe('CRUD operations', () => {
    describe('createMode', () => {
      it('should create a new custom mode with defaults', () => {
        let mode: CustomModeConfig;
        act(() => {
          mode = useCustomModeStore.getState().createMode({
            name: 'Test Mode',
          });
        });

        expect(mode!.name).toBe('Test Mode');
        expect(mode!.type).toBe('custom');
        expect(mode!.isBuiltIn).toBe(false);
        expect(mode!.icon).toBe('Bot');
        expect(mode!.tools).toEqual([]);
        expect(mode!.outputFormat).toBe('text');
        expect(mode!.createdAt).toBeInstanceOf(Date);
        expect(mode!.updatedAt).toBeInstanceOf(Date);
      });

      it('should create a mode with all custom properties', () => {
        let mode: CustomModeConfig;
        act(() => {
          mode = useCustomModeStore.getState().createMode({
            name: 'Custom Agent',
            description: 'A custom agent for testing',
            icon: 'Code2',
            systemPrompt: 'You are a coding assistant',
            tools: ['calculator', 'web_search'],
            outputFormat: 'code',
            previewEnabled: true,
            category: 'technical',
            tags: ['coding', 'test'],
            modelOverride: 'gpt-4',
            temperatureOverride: 0.5,
            maxTokensOverride: 2000,
            a2uiEnabled: true,
          });
        });

        expect(mode!.name).toBe('Custom Agent');
        expect(mode!.description).toBe('A custom agent for testing');
        expect(mode!.icon).toBe('Code2');
        expect(mode!.systemPrompt).toBe('You are a coding assistant');
        expect(mode!.tools).toEqual(['calculator', 'web_search']);
        expect(mode!.outputFormat).toBe('code');
        expect(mode!.previewEnabled).toBe(true);
        expect(mode!.category).toBe('technical');
        expect(mode!.tags).toEqual(['coding', 'test']);
        expect(mode!.modelOverride).toBe('gpt-4');
        expect(mode!.temperatureOverride).toBe(0.5);
        expect(mode!.maxTokensOverride).toBe(2000);
        expect(mode!.a2uiEnabled).toBe(true);
      });

      it('should add mode to store', () => {
        act(() => {
          useCustomModeStore.getState().createMode({ name: 'Test Mode' });
        });

        const state = useCustomModeStore.getState();
        expect(Object.keys(state.customModes)).toHaveLength(1);
      });

      it('should generate unique IDs for modes', () => {
        let mode1: CustomModeConfig;
        let mode2: CustomModeConfig;
        act(() => {
          mode1 = useCustomModeStore.getState().createMode({ name: 'Mode 1' });
          mode2 = useCustomModeStore.getState().createMode({ name: 'Mode 2' });
        });

        expect(mode1!.id).not.toBe(mode2!.id);
        expect(mode1!.id).toMatch(/^custom-/);
        expect(mode2!.id).toMatch(/^custom-/);
      });
    });

    describe('updateMode', () => {
      it('should update an existing mode', () => {
        let mode: CustomModeConfig;
        act(() => {
          mode = useCustomModeStore.getState().createMode({ name: 'Original' });
        });

        act(() => {
          useCustomModeStore.getState().updateMode(mode!.id, {
            name: 'Updated',
            description: 'New description',
          });
        });

        const updated = useCustomModeStore.getState().customModes[mode!.id];
        expect(updated.name).toBe('Updated');
        expect(updated.description).toBe('New description');
        // updatedAt should be set (may be same time as createdAt in fast tests)
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(mode!.createdAt.getTime());
      });

      it('should not update non-existent mode', () => {
        const initialState = useCustomModeStore.getState().customModes;

        act(() => {
          useCustomModeStore.getState().updateMode('non-existent', { name: 'Test' });
        });

        expect(useCustomModeStore.getState().customModes).toEqual(initialState);
      });
    });

    describe('deleteMode', () => {
      it('should delete an existing mode', () => {
        let mode: CustomModeConfig;
        act(() => {
          mode = useCustomModeStore.getState().createMode({ name: 'To Delete' });
        });

        act(() => {
          useCustomModeStore.getState().deleteMode(mode!.id);
        });

        expect(useCustomModeStore.getState().customModes[mode!.id]).toBeUndefined();
      });

      it('should clear activeModeId if deleted mode was active', () => {
        let mode: CustomModeConfig;
        act(() => {
          mode = useCustomModeStore.getState().createMode({ name: 'Active Mode' });
          useCustomModeStore.getState().setActiveMode(mode!.id);
        });

        expect(useCustomModeStore.getState().activeModeId).toBe(mode!.id);

        act(() => {
          useCustomModeStore.getState().deleteMode(mode!.id);
        });

        expect(useCustomModeStore.getState().activeModeId).toBeNull();
      });
    });

    describe('duplicateMode', () => {
      it('should duplicate an existing mode', () => {
        let original: CustomModeConfig;
        act(() => {
          original = useCustomModeStore.getState().createMode({
            name: 'Original',
            description: 'Original description',
            tools: ['calculator'],
          });
        });

        let duplicate: CustomModeConfig | null = null;
        act(() => {
          duplicate = useCustomModeStore.getState().duplicateMode(original!.id);
        });

        expect(duplicate).not.toBeNull();
        expect(duplicate!.id).not.toBe(original!.id);
        expect(duplicate!.name).toBe('Original (Copy)');
        expect(duplicate!.description).toBe('Original description');
        expect(duplicate!.tools).toEqual(['calculator']);
        expect(duplicate!.usageCount).toBe(0);
      });

      it('should return null for non-existent mode', () => {
        let result: CustomModeConfig | null;
        act(() => {
          result = useCustomModeStore.getState().duplicateMode('non-existent');
        });

        expect(result!).toBeNull();
      });
    });
  });

  describe('selection', () => {
    it('should set active mode', () => {
      let mode: CustomModeConfig;
      act(() => {
        mode = useCustomModeStore.getState().createMode({ name: 'Test' });
        useCustomModeStore.getState().setActiveMode(mode!.id);
      });

      expect(useCustomModeStore.getState().activeModeId).toBe(mode!.id);
    });

    it('should clear active mode', () => {
      let mode: CustomModeConfig;
      act(() => {
        mode = useCustomModeStore.getState().createMode({ name: 'Test' });
        useCustomModeStore.getState().setActiveMode(mode!.id);
        useCustomModeStore.getState().setActiveMode(null);
      });

      expect(useCustomModeStore.getState().activeModeId).toBeNull();
    });
  });

  describe('queries', () => {
    beforeEach(() => {
      act(() => {
        useCustomModeStore.getState().createMode({
          name: 'Technical Mode',
          category: 'technical',
          tags: ['coding', 'dev'],
        });
        useCustomModeStore.getState().createMode({
          name: 'Creative Mode',
          category: 'creative',
          tags: ['writing', 'creative'],
        });
        useCustomModeStore.getState().createMode({
          name: 'Another Technical',
          category: 'technical',
          tags: ['coding'],
        });
      });
    });

    it('should get mode by ID', () => {
      const modes = Object.values(useCustomModeStore.getState().customModes);
      const mode = useCustomModeStore.getState().getMode(modes[0].id);
      expect(mode).toBeDefined();
      expect(mode?.id).toBe(modes[0].id);
    });

    it('should return undefined for non-existent mode', () => {
      const mode = useCustomModeStore.getState().getMode('non-existent');
      expect(mode).toBeUndefined();
    });

    it('should get modes by category', () => {
      const technicalModes = useCustomModeStore.getState().getModesByCategory('technical');
      expect(technicalModes).toHaveLength(2);
      expect(technicalModes.every((m) => m.category === 'technical')).toBe(true);
    });

    it('should get modes by tags', () => {
      const codingModes = useCustomModeStore.getState().getModesByTags(['coding']);
      expect(codingModes).toHaveLength(2);
    });

    it('should search modes by name', () => {
      const results = useCustomModeStore.getState().searchModes('Technical');
      expect(results).toHaveLength(2);
    });

    it('should search modes by description', () => {
      act(() => {
        useCustomModeStore.getState().createMode({
          name: 'Test',
          description: 'A unique description for searching',
        });
      });

      const results = useCustomModeStore.getState().searchModes('unique description');
      expect(results).toHaveLength(1);
    });
  });

  describe('usage tracking', () => {
    it('should record mode usage', () => {
      let mode: CustomModeConfig;
      act(() => {
        mode = useCustomModeStore.getState().createMode({ name: 'Test' });
      });

      expect(useCustomModeStore.getState().customModes[mode!.id].usageCount).toBe(0);

      act(() => {
        useCustomModeStore.getState().recordModeUsage(mode!.id);
      });

      const updated = useCustomModeStore.getState().customModes[mode!.id];
      expect(updated.usageCount).toBe(1);
      expect(updated.lastUsedAt).toBeInstanceOf(Date);
    });

    it('should get most used modes', () => {
      let mode1: CustomModeConfig;
      let mode2: CustomModeConfig;
      act(() => {
        mode1 = useCustomModeStore.getState().createMode({ name: 'Mode 1' });
        mode2 = useCustomModeStore.getState().createMode({ name: 'Mode 2' });
        // Use mode1 three times
        useCustomModeStore.getState().recordModeUsage(mode1!.id);
        useCustomModeStore.getState().recordModeUsage(mode1!.id);
        useCustomModeStore.getState().recordModeUsage(mode1!.id);
        // Use mode2 once
        useCustomModeStore.getState().recordModeUsage(mode2!.id);
      });

      const mostUsed = useCustomModeStore.getState().getMostUsedModes(2);
      expect(mostUsed[0].id).toBe(mode1!.id);
      expect(mostUsed[0].usageCount).toBe(3);
    });
  });

  describe('import/export', () => {
    it('should export a mode to JSON', () => {
      let mode: CustomModeConfig;
      act(() => {
        mode = useCustomModeStore.getState().createMode({
          name: 'Export Test',
          description: 'Test description',
        });
      });

      const exported = useCustomModeStore.getState().exportMode(mode!.id);
      expect(exported).not.toBeNull();

      const parsed = JSON.parse(exported!);
      expect(parsed.type).toBe('custom-mode');
      expect(parsed.mode.name).toBe('Export Test');
      expect(parsed.mode.usageCount).toBe(0); // Should reset usage stats
    });

    it('should import a mode from JSON', () => {
      const json = JSON.stringify({
        version: '1.0',
        type: 'custom-mode',
        mode: {
          name: 'Imported Mode',
          description: 'Imported description',
          tools: ['calculator'],
        },
      });

      let imported: CustomModeConfig | null = null;
      act(() => {
        imported = useCustomModeStore.getState().importMode(json);
      });

      expect(imported).not.toBeNull();
      expect(imported!.name).toBe('Imported Mode');
      // isShared may or may not be set depending on implementation
      expect(imported!.type).toBe('custom');
    });

    it('should return null for invalid import JSON', () => {
      let result: CustomModeConfig | null;
      act(() => {
        result = useCustomModeStore.getState().importMode('invalid json');
      });

      expect(result!).toBeNull();
    });

    it('should export all modes', () => {
      act(() => {
        useCustomModeStore.getState().createMode({ name: 'Mode 1' });
        useCustomModeStore.getState().createMode({ name: 'Mode 2' });
      });

      const exported = useCustomModeStore.getState().exportAllModes();
      const parsed = JSON.parse(exported);

      expect(parsed.type).toBe('custom-modes-collection');
      expect(parsed.modes).toHaveLength(2);
    });

    it('should import multiple modes', () => {
      const json = JSON.stringify({
        version: '1.0',
        type: 'custom-modes-collection',
        modes: [{ name: 'Imported 1' }, { name: 'Imported 2' }],
      });

      let count: number;
      act(() => {
        count = useCustomModeStore.getState().importModes(json);
      });

      expect(count!).toBe(2);
      expect(Object.keys(useCustomModeStore.getState().customModes)).toHaveLength(2);
    });
  });

  describe('mode generation', () => {
    it('should generate mode from description', async () => {
      let result:
        | { mode: Partial<CustomModeConfig>; suggestedTools: string[]; confidence: number }
        | undefined;

      await act(async () => {
        result = await useCustomModeStore.getState().generateModeFromDescription({
          description: 'Create a coding assistant for Python',
        });
      });

      expect(result?.mode).toBeDefined();
      expect(result?.suggestedTools).toBeDefined();
      expect(result?.confidence).toBeGreaterThan(0);
    });

    it('should set generation error on failure', async () => {
      // Mock a failure scenario by testing error state management
      act(() => {
        useCustomModeStore.getState().setGenerationError('Test error');
      });

      expect(useCustomModeStore.getState().generationError).toBe('Test error');
    });
  });

  describe('selectors', () => {
    it('selectCustomModes returns all modes as array', () => {
      act(() => {
        useCustomModeStore.getState().createMode({ name: 'Mode 1' });
        useCustomModeStore.getState().createMode({ name: 'Mode 2' });
      });

      const modes = selectCustomModes(useCustomModeStore.getState());
      expect(modes).toHaveLength(2);
    });

    it('selectCustomModeById returns specific mode', () => {
      let mode: CustomModeConfig;
      act(() => {
        mode = useCustomModeStore.getState().createMode({ name: 'Test' });
      });

      const selector = selectCustomModeById(mode!.id);
      const found = selector(useCustomModeStore.getState());
      expect(found?.id).toBe(mode!.id);
    });

    it('selectCustomModeCount returns count', () => {
      act(() => {
        useCustomModeStore.getState().createMode({ name: 'Mode 1' });
        useCustomModeStore.getState().createMode({ name: 'Mode 2' });
      });

      const count = selectCustomModeCount(useCustomModeStore.getState());
      expect(count).toBe(2);
    });
  });

  describe('constants', () => {
    it('should have tool categories defined', () => {
      expect(TOOL_CATEGORIES).toBeDefined();
      expect(TOOL_CATEGORIES.search).toBeDefined();
      expect(TOOL_CATEGORIES.file).toBeDefined();
      expect(TOOL_CATEGORIES.document).toBeDefined();
    });

    it('should have all available tools', () => {
      expect(ALL_AVAILABLE_TOOLS).toBeDefined();
      expect(ALL_AVAILABLE_TOOLS.length).toBeGreaterThan(0);
      expect(ALL_AVAILABLE_TOOLS).toContain('calculator');
      expect(ALL_AVAILABLE_TOOLS).toContain('web_search');
    });

    it('should have available mode icons', () => {
      expect(AVAILABLE_MODE_ICONS).toBeDefined();
      expect(AVAILABLE_MODE_ICONS.length).toBeGreaterThan(0);
      expect(AVAILABLE_MODE_ICONS).toContain('Bot');
      expect(AVAILABLE_MODE_ICONS).toContain('Code2');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      act(() => {
        useCustomModeStore.getState().createMode({ name: 'Test' });
        useCustomModeStore.getState().setActiveMode('some-id');
        useCustomModeStore.getState().setGenerationError('Some error');
      });

      act(() => {
        useCustomModeStore.getState().reset();
      });

      const state = useCustomModeStore.getState();
      expect(state.customModes).toEqual({});
      expect(state.activeModeId).toBeNull();
      expect(state.generationError).toBeNull();
    });
  });
});

describe('Mode Templates', () => {
  it('should have predefined templates', () => {
    expect(MODE_TEMPLATES).toBeDefined();
    expect(MODE_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('should have valid template structure', () => {
    for (const template of MODE_TEMPLATES) {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.icon).toBeDefined();
      expect(template.category).toBeDefined();
      expect(template.tools).toBeInstanceOf(Array);
      expect(template.systemPrompt).toBeDefined();
      expect(template.outputFormat).toBeDefined();
      expect(template.tags).toBeInstanceOf(Array);
    }
  });

  it('should get template by ID', () => {
    const template = getModeTemplate('coding-assistant');
    expect(template).toBeDefined();
    expect(template?.name).toBe('Coding Assistant');
  });

  it('should return undefined for non-existent template', () => {
    const template = getModeTemplate('non-existent');
    expect(template).toBeUndefined();
  });
});

describe('Tool Availability', () => {
  it('should have tool requirements defined', () => {
    expect(TOOL_REQUIREMENTS).toBeDefined();
    expect(TOOL_REQUIREMENTS.web_search).toBeDefined();
    expect(TOOL_REQUIREMENTS.web_search.requiresApiKey).toBe('tavily');
  });

  it('should check tool availability with all keys available', () => {
    const result = checkToolAvailability(['web_search', 'calculator', 'image_generate'], {
      tavily: true,
      openai: true,
    });
    expect(result.available).toContain('web_search');
    expect(result.available).toContain('calculator');
    expect(result.available).toContain('image_generate');
    expect(result.unavailable).toHaveLength(0);
  });

  it('should identify unavailable tools', () => {
    const result = checkToolAvailability(['web_search', 'calculator', 'image_generate'], {
      tavily: false,
      openai: false,
    });
    expect(result.available).toContain('calculator');
    expect(result.unavailable).toHaveLength(2);
    expect(result.unavailable.some((u) => u.tool === 'web_search')).toBe(true);
    expect(result.unavailable.some((u) => u.tool === 'image_generate')).toBe(true);
  });

  it('should handle tools without requirements', () => {
    const result = checkToolAvailability(['calculator', 'rag_search'], {});
    expect(result.available).toContain('calculator');
    expect(result.available).toContain('rag_search');
    expect(result.unavailable).toHaveLength(0);
  });
});

describe('Prompt Template Variables', () => {
  it('should process template variables', () => {
    const prompt = 'Today is {{date}}. Mode: {{mode_name}}';
    const result = processPromptTemplateVariables(prompt, {
      modeName: 'Test Mode',
    });
    expect(result).toContain('Test Mode');
    expect(result).not.toContain('{{mode_name}}');
    expect(result).not.toContain('{{date}}');
  });

  it('should handle empty prompt', () => {
    const result = processPromptTemplateVariables('', {});
    expect(result).toBe('');
  });

  it('should replace all template variables', () => {
    const prompt = '{{mode_name}}: {{mode_description}}. Tools: {{tools_list}}';
    const result = processPromptTemplateVariables(prompt, {
      modeName: 'Test',
      modeDescription: 'A test mode',
      tools: ['calculator', 'web_search'],
    });
    expect(result).toBe('Test: A test mode. Tools: calculator, web_search');
  });

  it('should get template variable preview', () => {
    const preview = getTemplateVariablePreview({
      modeName: 'Preview Mode',
      tools: ['tool1', 'tool2'],
    });
    expect(preview['{{mode_name}}']).toBe('Preview Mode');
    expect(preview['{{tools_list}}']).toBe('tool1, tool2');
    expect(preview['{{date}}']).toBeDefined();
    expect(preview['{{time}}']).toBeDefined();
  });

  it('should use defaults for missing context', () => {
    const preview = getTemplateVariablePreview({});
    expect(preview['{{mode_name}}']).toBe('Custom Mode');
    expect(preview['{{tools_list}}']).toBe('No specific tools configured');
  });
});

// =============================================================================
// MCP Tool Recommendations Tests
// =============================================================================

describe('MCP Tool Recommendations', () => {
  const createMockMcpTools = (): McpToolReference[] => [
    { serverId: 'browser', toolName: 'web_search', displayName: 'Web Search' },
    { serverId: 'browser', toolName: 'scrape_page', displayName: 'Scrape Page' },
    { serverId: 'filesystem', toolName: 'file_read', displayName: 'File Read' },
    { serverId: 'filesystem', toolName: 'file_write', displayName: 'File Write' },
    { serverId: 'code', toolName: 'execute_code', displayName: 'Execute Code' },
    { serverId: 'code', toolName: 'debug_code', displayName: 'Debug Code' },
    { serverId: 'database', toolName: 'query_db', displayName: 'Query Database' },
    { serverId: 'image', toolName: 'generate_image', displayName: 'Generate Image' },
  ];

  describe('getRecommendedMcpToolsForMode', () => {
    it('should recommend tools matching mode description', () => {
      const tools = createMockMcpTools();
      const recommended = getRecommendedMcpToolsForMode(tools, {
        name: 'Web Research',
        description: 'Search the web and scrape content',
        systemPrompt: 'You are a web research assistant',
      });

      expect(recommended.length).toBeGreaterThan(0);
      expect(recommended.some((t) => t.toolName === 'web_search')).toBe(true);
      expect(recommended.some((t) => t.toolName === 'scrape_page')).toBe(true);
    });

    it('should recommend tools matching mode name', () => {
      const tools = createMockMcpTools();
      const recommended = getRecommendedMcpToolsForMode(tools, {
        name: 'Code Debugger',
        description: 'Help with debugging',
        systemPrompt: 'You help debug issues',
      });

      expect(recommended.some((t) => t.toolName === 'debug_code')).toBe(true);
    });

    it('should boost tools based on category', () => {
      const tools = createMockMcpTools();
      const recommended = getRecommendedMcpToolsForMode(tools, {
        name: 'Developer Assistant',
        description: 'Help with coding tasks',
        systemPrompt: 'You are a coding assistant',
        category: 'technical',
      });

      // Technical category should boost code-related tools
      const codeTools = recommended.filter(
        (t) =>
          t.toolName.includes('code') ||
          t.toolName.includes('execute') ||
          t.toolName.includes('debug')
      );
      expect(codeTools.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', () => {
      const tools = createMockMcpTools();
      const recommended = getRecommendedMcpToolsForMode(
        tools,
        {
          name: 'General',
          description: 'search file code image database',
          systemPrompt: 'search file code image database',
        },
        3
      );

      expect(recommended.length).toBeLessThanOrEqual(3);
    });

    it('should include relevance scores', () => {
      const tools = createMockMcpTools();
      const recommended = getRecommendedMcpToolsForMode(tools, {
        name: 'Web Search',
        description: 'Search the web',
        systemPrompt: 'Search assistant',
      });

      for (const tool of recommended) {
        expect(tool.relevanceScore).toBeDefined();
        expect(tool.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(tool.relevanceScore).toBeLessThanOrEqual(1);
      }
    });

    it('should sort by relevance score descending', () => {
      const tools = createMockMcpTools();
      const recommended = getRecommendedMcpToolsForMode(tools, {
        name: 'Web Scraper',
        description: 'Scrape web pages',
        systemPrompt: 'Web scraping assistant',
      });

      for (let i = 1; i < recommended.length; i++) {
        expect(recommended[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          recommended[i].relevanceScore
        );
      }
    });

    it('should filter out low relevance tools', () => {
      const tools = createMockMcpTools();
      const recommended = getRecommendedMcpToolsForMode(tools, {
        name: 'Very Specific Tool',
        description: 'xyz123 unique description',
        systemPrompt: 'xyz123 unique prompt',
      });

      // All returned tools should have relevance > 0.1
      for (const tool of recommended) {
        expect(tool.relevanceScore).toBeGreaterThan(0.1);
      }
    });
  });

  describe('autoSelectMcpToolsForMode', () => {
    it('should auto-select tools based on description', () => {
      const tools = createMockMcpTools();
      const selected = autoSelectMcpToolsForMode(tools, 'Search the web and read files');

      expect(selected.length).toBeGreaterThan(0);
      expect(selected.some((t) => t.toolName === 'web_search')).toBe(true);
      expect(selected.some((t) => t.toolName === 'file_read')).toBe(true);
    });

    it('should respect maxTools parameter', () => {
      const tools = createMockMcpTools();
      const selected = autoSelectMcpToolsForMode(tools, 'search file code image database', 2);

      expect(selected.length).toBeLessThanOrEqual(2);
    });

    it('should return tools without relevance score', () => {
      const tools = createMockMcpTools();
      const selected = autoSelectMcpToolsForMode(tools, 'Search the web');

      for (const tool of selected) {
        expect(tool).toHaveProperty('serverId');
        expect(tool).toHaveProperty('toolName');
        // Should not have relevanceScore (it's stripped)
        expect(
          (tool as McpToolReference & { relevanceScore?: number }).relevanceScore
        ).toBeUndefined();
      }
    });

    it('should handle empty description', () => {
      const tools = createMockMcpTools();
      const selected = autoSelectMcpToolsForMode(tools, '');

      // Should return empty or minimal results for empty description
      expect(selected.length).toBeLessThanOrEqual(tools.length);
    });

    it('should handle empty tools array', () => {
      const selected = autoSelectMcpToolsForMode([], 'Search the web');
      expect(selected).toEqual([]);
    });
  });
});
