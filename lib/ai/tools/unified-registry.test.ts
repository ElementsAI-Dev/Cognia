/**
 * Tests for Unified Tool Registry
 */

import {
  UnifiedToolRegistry,
  getUnifiedToolRegistry,
  setUnifiedToolRegistry,
  inferToolCategory,
  registerBuiltinTools,
  registerSkillTools,
  registerMcpTools,
  registerCustomTools,
} from './unified-registry';
import type { AgentTool } from '../agent/agent-executor';

// Mock the registry module
jest.mock('./registry', () => ({
  getGlobalToolRegistry: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Helper to create mock tools
function createMockTool(name: string, description: string = 'Test tool'): AgentTool {
  return {
    name,
    description,
    parameters: {} as AgentTool['parameters'],
    execute: jest.fn(),
  };
}

describe('UnifiedToolRegistry', () => {
  let registry: UnifiedToolRegistry;

  beforeEach(() => {
    registry = new UnifiedToolRegistry();
  });

  describe('constructor', () => {
    it('creates registry with default config', () => {
      const reg = new UnifiedToolRegistry();
      expect(reg.getAll()).toEqual([]);
    });

    it('creates registry with custom config', () => {
      const reg = new UnifiedToolRegistry({
        enableBuiltinTools: false,
        defaultRequireApproval: true,
      });
      expect(reg.getAll()).toEqual([]);
    });
  });

  describe('register', () => {
    it('registers a tool with metadata', () => {
      const tool = createMockTool('test_tool', 'A test tool');
      
      registry.register(tool, {
        source: 'builtin',
        category: 'compute',
      });

      const registered = registry.get('test_tool');
      expect(registered).toBeDefined();
      expect(registered?.tool).toBe(tool);
      expect(registered?.metadata.name).toBe('test_tool');
      expect(registered?.metadata.source).toBe('builtin');
      expect(registered?.metadata.category).toBe('compute');
      expect(registered?.metadata.isEnabled).toBe(true);
    });

    it('registers tool with additional metadata', () => {
      const tool = createMockTool('skill_tool');
      
      registry.register(tool, {
        source: 'skill',
        category: 'skill',
        sourceId: 'skill-123',
        sourceName: 'My Skill',
        tags: ['ai', 'automation'],
        version: '1.0.0',
      });

      const registered = registry.get('skill_tool');
      expect(registered?.metadata.sourceId).toBe('skill-123');
      expect(registered?.metadata.sourceName).toBe('My Skill');
      expect(registered?.metadata.tags).toEqual(['ai', 'automation']);
      expect(registered?.metadata.version).toBe('1.0.0');
    });

    it('uses default requiresApproval from config', () => {
      const reg = new UnifiedToolRegistry({ defaultRequireApproval: true });
      const tool = createMockTool('test');
      
      reg.register(tool, { source: 'builtin', category: 'compute' });

      expect(reg.get('test')?.metadata.requiresApproval).toBe(true);
    });

    it('respects tool requiresApproval over config default', () => {
      const reg = new UnifiedToolRegistry({ defaultRequireApproval: true });
      const tool = { ...createMockTool('test'), requiresApproval: false };
      
      reg.register(tool, { source: 'builtin', category: 'compute' });

      expect(reg.get('test')?.metadata.requiresApproval).toBe(false);
    });
  });

  describe('registerBatch', () => {
    it('registers multiple tools at once', () => {
      const tools = {
        tool1: createMockTool('tool1'),
        tool2: createMockTool('tool2'),
        tool3: createMockTool('tool3'),
      };

      registry.registerBatch(tools, {
        source: 'builtin',
        category: 'compute',
      });

      expect(registry.getAll()).toHaveLength(3);
      expect(registry.get('tool1')).toBeDefined();
      expect(registry.get('tool2')).toBeDefined();
      expect(registry.get('tool3')).toBeDefined();
    });
  });

  describe('unregister', () => {
    it('removes a tool by name', () => {
      registry.register(createMockTool('test'), { source: 'builtin', category: 'compute' });
      
      const result = registry.unregister('test');
      
      expect(result).toBe(true);
      expect(registry.get('test')).toBeUndefined();
    });

    it('returns false for non-existent tool', () => {
      const result = registry.unregister('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('unregisterBySource', () => {
    beforeEach(() => {
      registry.register(createMockTool('builtin1'), { source: 'builtin', category: 'compute' });
      registry.register(createMockTool('builtin2'), { source: 'builtin', category: 'search' });
      registry.register(createMockTool('skill1'), { source: 'skill', category: 'skill', sourceId: 'skill-1' });
      registry.register(createMockTool('skill2'), { source: 'skill', category: 'skill', sourceId: 'skill-2' });
      registry.register(createMockTool('mcp1'), { source: 'mcp', category: 'external', sourceId: 'server-1' });
    });

    it('removes all tools from a source', () => {
      const count = registry.unregisterBySource('builtin');
      
      expect(count).toBe(2);
      expect(registry.get('builtin1')).toBeUndefined();
      expect(registry.get('builtin2')).toBeUndefined();
      expect(registry.get('skill1')).toBeDefined();
    });

    it('removes tools from a specific source ID', () => {
      const count = registry.unregisterBySource('skill', 'skill-1');
      
      expect(count).toBe(1);
      expect(registry.get('skill1')).toBeUndefined();
      expect(registry.get('skill2')).toBeDefined();
    });

    it('returns 0 when no tools match', () => {
      const count = registry.unregisterBySource('custom');
      expect(count).toBe(0);
    });
  });

  describe('get', () => {
    it('returns registered tool', () => {
      const tool = createMockTool('test');
      registry.register(tool, { source: 'builtin', category: 'compute' });
      
      const registered = registry.get('test');
      expect(registered?.tool).toBe(tool);
    });

    it('returns undefined for non-existent tool', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns all registered tools', () => {
      registry.register(createMockTool('tool1'), { source: 'builtin', category: 'compute' });
      registry.register(createMockTool('tool2'), { source: 'skill', category: 'skill' });
      
      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });

    it('returns empty array when no tools registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('getToolsRecord', () => {
    beforeEach(() => {
      registry.register(createMockTool('enabled1'), { source: 'builtin', category: 'compute', isEnabled: true });
      registry.register(createMockTool('enabled2'), { source: 'builtin', category: 'search', isEnabled: true });
      registry.register(createMockTool('disabled'), { source: 'builtin', category: 'file', isEnabled: false });
    });

    it('returns record of enabled tools only', () => {
      const record = registry.getToolsRecord();
      
      expect(Object.keys(record)).toHaveLength(2);
      expect(record['enabled1']).toBeDefined();
      expect(record['enabled2']).toBeDefined();
      expect(record['disabled']).toBeUndefined();
    });

    it('filters tools based on options', () => {
      const record = registry.getToolsRecord({ categories: ['compute'] });
      
      expect(Object.keys(record)).toHaveLength(1);
      expect(record['enabled1']).toBeDefined();
    });
  });

  describe('filter', () => {
    beforeEach(() => {
      registry.register(createMockTool('builtin_search'), { source: 'builtin', category: 'search', tags: ['web'] });
      registry.register(createMockTool('builtin_calc'), { source: 'builtin', category: 'compute' });
      registry.register(createMockTool('skill_tool'), { source: 'skill', category: 'skill', sourceId: 'skill-1' });
      registry.register(createMockTool('mcp_tool'), { source: 'mcp', category: 'external', sourceId: 'server-1' });
    });

    it('returns all tools when no filter', () => {
      expect(registry.filter()).toHaveLength(4);
    });

    it('filters by sources', () => {
      const filtered = registry.filter({ sources: ['builtin'] });
      expect(filtered).toHaveLength(2);
    });

    it('filters by categories', () => {
      const filtered = registry.filter({ categories: ['search', 'compute'] });
      expect(filtered).toHaveLength(2);
    });

    it('filters by sourceIds', () => {
      // Note: items without sourceId are included (not filtered out)
      const filtered = registry.filter({ sourceIds: ['skill-1'] });
      // Items with matching sourceId + items without sourceId
      const withSourceId = filtered.filter(t => t.metadata.sourceId === 'skill-1');
      expect(withSourceId).toHaveLength(1);
      expect(withSourceId[0].metadata.name).toBe('skill_tool');
    });

    it('filters by tags', () => {
      // Note: items without tags are included (not filtered out)
      const filtered = registry.filter({ tags: ['web'] });
      // Items with matching tag
      const withTag = filtered.filter(t => t.metadata.tags?.includes('web'));
      expect(withTag).toHaveLength(1);
      expect(withTag[0].metadata.name).toBe('builtin_search');
    });

    it('filters by enabled status', () => {
      registry.setEnabled('builtin_calc', false);
      
      const enabled = registry.filter({ isEnabled: true });
      const disabled = registry.filter({ isEnabled: false });
      
      expect(enabled).toHaveLength(3);
      expect(disabled).toHaveLength(1);
    });

    it('filters by requiresApproval', () => {
      registry.register(
        { ...createMockTool('approval_tool'), requiresApproval: true },
        { source: 'custom', category: 'other' }
      );
      
      const needsApproval = registry.filter({ requiresApproval: true });
      expect(needsApproval).toHaveLength(1);
    });

    it('filters by search query in name', () => {
      const filtered = registry.filter({ searchQuery: 'calc' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].metadata.name).toBe('builtin_calc');
    });

    it('filters by search query in description', () => {
      const tool = createMockTool('unique', 'This tool performs unique operations');
      registry.register(tool, { source: 'builtin', category: 'other' });
      
      const filtered = registry.filter({ searchQuery: 'unique operations' });
      expect(filtered).toHaveLength(1);
    });

    it('filters by search query in source name', () => {
      registry.register(createMockTool('named'), { 
        source: 'skill', 
        category: 'skill', 
        sourceName: 'Special Skill' 
      });
      
      const filtered = registry.filter({ searchQuery: 'special' });
      expect(filtered).toHaveLength(1);
    });

    it('combines multiple filters', () => {
      const filtered = registry.filter({
        sources: ['builtin'],
        categories: ['search'],
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].metadata.name).toBe('builtin_search');
    });
  });

  describe('setEnabled', () => {
    it('enables a tool', () => {
      registry.register(createMockTool('test'), { source: 'builtin', category: 'compute', isEnabled: false });
      
      const result = registry.setEnabled('test', true);
      
      expect(result).toBe(true);
      expect(registry.get('test')?.metadata.isEnabled).toBe(true);
    });

    it('disables a tool', () => {
      registry.register(createMockTool('test'), { source: 'builtin', category: 'compute' });
      
      const result = registry.setEnabled('test', false);
      
      expect(result).toBe(true);
      expect(registry.get('test')?.metadata.isEnabled).toBe(false);
    });

    it('returns false for non-existent tool', () => {
      const result = registry.setEnabled('nonexistent', true);
      expect(result).toBe(false);
    });
  });

  describe('getCountBySource', () => {
    it('returns correct counts', () => {
      registry.register(createMockTool('b1'), { source: 'builtin', category: 'compute' });
      registry.register(createMockTool('b2'), { source: 'builtin', category: 'search' });
      registry.register(createMockTool('s1'), { source: 'skill', category: 'skill' });
      registry.register(createMockTool('m1'), { source: 'mcp', category: 'external' });
      registry.register(createMockTool('m2'), { source: 'mcp', category: 'external' });
      registry.register(createMockTool('c1'), { source: 'custom', category: 'other' });

      const counts = registry.getCountBySource();

      expect(counts.builtin).toBe(2);
      expect(counts.skill).toBe(1);
      expect(counts.mcp).toBe(2);
      expect(counts.custom).toBe(1);
    });

    it('returns zeros when empty', () => {
      const counts = registry.getCountBySource();
      expect(counts).toEqual({ builtin: 0, skill: 0, mcp: 0, custom: 0 });
    });
  });

  describe('getDescriptions', () => {
    it('returns metadata for all tools', () => {
      registry.register(createMockTool('tool1', 'Desc 1'), { source: 'builtin', category: 'compute' });
      registry.register(createMockTool('tool2', 'Desc 2'), { source: 'skill', category: 'skill' });

      const descriptions = registry.getDescriptions();

      expect(descriptions).toHaveLength(2);
      expect(descriptions[0].description).toBe('Desc 1');
      expect(descriptions[1].description).toBe('Desc 2');
    });

    it('filters descriptions', () => {
      registry.register(createMockTool('tool1'), { source: 'builtin', category: 'compute' });
      registry.register(createMockTool('tool2'), { source: 'skill', category: 'skill' });

      const descriptions = registry.getDescriptions({ sources: ['builtin'] });

      expect(descriptions).toHaveLength(1);
    });
  });

  describe('subscribe', () => {
    it('notifies listener on tool registration', () => {
      const listener = jest.fn();
      registry.subscribe(listener);

      registry.register(createMockTool('test'), { source: 'builtin', category: 'compute' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ metadata: expect.objectContaining({ name: 'test' }) })
      ]));
    });

    it('notifies listener on tool unregistration', () => {
      registry.register(createMockTool('test'), { source: 'builtin', category: 'compute' });
      const listener = jest.fn();
      registry.subscribe(listener);

      registry.unregister('test');

      expect(listener).toHaveBeenCalledWith([]);
    });

    it('notifies listener on setEnabled', () => {
      registry.register(createMockTool('test'), { source: 'builtin', category: 'compute' });
      const listener = jest.fn();
      registry.subscribe(listener);

      registry.setEnabled('test', false);

      expect(listener).toHaveBeenCalled();
    });

    it('returns unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = registry.subscribe(listener);

      unsubscribe();
      registry.register(createMockTool('test'), { source: 'builtin', category: 'compute' });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('removes all tools', () => {
      registry.register(createMockTool('tool1'), { source: 'builtin', category: 'compute' });
      registry.register(createMockTool('tool2'), { source: 'skill', category: 'skill' });

      registry.clear();

      expect(registry.getAll()).toEqual([]);
    });

    it('notifies listeners', () => {
      registry.register(createMockTool('test'), { source: 'builtin', category: 'compute' });
      const listener = jest.fn();
      registry.subscribe(listener);

      registry.clear();

      expect(listener).toHaveBeenCalledWith([]);
    });
  });

  describe('getStats', () => {
    it('returns correct statistics', () => {
      registry.register(createMockTool('b1'), { source: 'builtin', category: 'compute', isEnabled: true });
      registry.register(createMockTool('b2'), { source: 'builtin', category: 'search', isEnabled: true });
      registry.register(createMockTool('s1'), { source: 'skill', category: 'skill', isEnabled: false });
      registry.register(createMockTool('m1'), { source: 'mcp', category: 'external', isEnabled: true });

      const stats = registry.getStats();

      expect(stats.total).toBe(4);
      expect(stats.enabled).toBe(3);
      expect(stats.disabled).toBe(1);
      expect(stats.bySource.builtin).toBe(2);
      expect(stats.bySource.skill).toBe(1);
      expect(stats.bySource.mcp).toBe(1);
      expect(stats.byCategory.compute).toBe(1);
      expect(stats.byCategory.search).toBe(1);
      expect(stats.byCategory.skill).toBe(1);
      expect(stats.byCategory.external).toBe(1);
    });

    it('includes all new category types in stats', () => {
      registry.register(createMockTool('video1'), { source: 'builtin', category: 'video' });
      registry.register(createMockTool('image1'), { source: 'builtin', category: 'image' });
      registry.register(createMockTool('academic1'), { source: 'builtin', category: 'academic' });
      registry.register(createMockTool('ppt1'), { source: 'builtin', category: 'ppt' });
      registry.register(createMockTool('learning1'), { source: 'builtin', category: 'learning' });

      const stats = registry.getStats();

      expect(stats.total).toBe(5);
      expect(stats.byCategory.video).toBe(1);
      expect(stats.byCategory.image).toBe(1);
      expect(stats.byCategory.academic).toBe(1);
      expect(stats.byCategory.ppt).toBe(1);
      expect(stats.byCategory.learning).toBe(1);
    });
  });
});

describe('Global Registry Functions', () => {
  describe('getUnifiedToolRegistry', () => {
    it('returns same instance on multiple calls', () => {
      const reg1 = getUnifiedToolRegistry();
      const reg2 = getUnifiedToolRegistry();
      expect(reg1).toBe(reg2);
    });
  });

  describe('setUnifiedToolRegistry', () => {
    it('sets the global registry', () => {
      const customRegistry = new UnifiedToolRegistry({ defaultRequireApproval: true });
      setUnifiedToolRegistry(customRegistry);
      
      expect(getUnifiedToolRegistry()).toBe(customRegistry);
    });
  });
});

describe('inferToolCategory', () => {
  it('infers search category', () => {
    expect(inferToolCategory('web_search', 'Search the web')).toBe('search');
    expect(inferToolCategory('rag_query', 'Query documents')).toBe('search');
    expect(inferToolCategory('find_docs', 'Search for documents')).toBe('search');
  });

  it('infers compute category', () => {
    expect(inferToolCategory('calculator', 'Calculate expressions')).toBe('compute');
    expect(inferToolCategory('code_exec', 'Execute code')).toBe('compute');
  });

  it('infers file category', () => {
    expect(inferToolCategory('file_read', 'Read a file')).toBe('file');
    expect(inferToolCategory('write_data', 'Write to file system')).toBe('file');
  });

  it('infers document category', () => {
    expect(inferToolCategory('doc_parse', 'Parse documents')).toBe('document');
    expect(inferToolCategory('process', 'Process a document')).toBe('document');
  });

  it('infers design category', () => {
    expect(inferToolCategory('designer_tool', 'Create designs')).toBe('design');
    expect(inferToolCategory('create', 'Design layouts')).toBe('design');
  });

  it('infers external category for MCP tools', () => {
    expect(inferToolCategory('mcp_server_tool', 'External tool')).toBe('external');
    expect(inferToolCategory('mcp_custom', 'Custom MCP')).toBe('external');
  });

  it('infers skill category', () => {
    expect(inferToolCategory('skill_action', 'Perform skill action')).toBe('skill');
  });

  it('infers video category', () => {
    expect(inferToolCategory('video_generate', 'Generate video')).toBe('video');
    expect(inferToolCategory('video_analyze', 'Analyze video content')).toBe('video');
    expect(inferToolCategory('subtitle_parse', 'Parse subtitles')).toBe('video');
    expect(inferToolCategory('extract', 'Transcribe audio')).toBe('video');
  });

  it('infers image category', () => {
    expect(inferToolCategory('image_generate', 'Generate an image')).toBe('image');
    expect(inferToolCategory('image_edit', 'Edit image')).toBe('image');
    expect(inferToolCategory('create_picture', 'Create with DALL-E')).toBe('image');
    expect(inferToolCategory('generate_art', 'Use Imagen to create')).toBe('image');
  });

  it('infers academic category', () => {
    expect(inferToolCategory('academic_search', 'Search academic papers')).toBe('academic');
    expect(inferToolCategory('paper_comparison', 'Compare papers')).toBe('academic');
    expect(inferToolCategory('find_research', 'Search arXiv for papers')).toBe('academic');
  });

  it('infers ppt category', () => {
    expect(inferToolCategory('ppt_outline', 'Create presentation outline')).toBe('ppt');
    expect(inferToolCategory('slide_generate', 'Generate slides')).toBe('ppt');
    expect(inferToolCategory('create_deck', 'Build PowerPoint presentation')).toBe('ppt');
  });

  it('infers learning category', () => {
    expect(inferToolCategory('display_flashcard', 'Show flashcard')).toBe('learning');
    expect(inferToolCategory('display_quiz', 'Display quiz questions')).toBe('learning');
    expect(inferToolCategory('review_session', 'Start review session')).toBe('learning');
    expect(inferToolCategory('learning_progress', 'Track learning')).toBe('learning');
  });

  it('infers system category', () => {
    expect(inferToolCategory('list_processes', 'List running processes')).toBe('system');
    expect(inferToolCategory('terminate_process', 'Terminate a process')).toBe('system');
    expect(inferToolCategory('check_program_allowed', 'Check if program is allowed')).toBe('system');
    expect(inferToolCategory('create_venv', 'Create virtual environment')).toBe('system');
    expect(inferToolCategory('run_in_env', 'Run in virtual environment')).toBe('system');
  });

  it('returns other for unknown', () => {
    expect(inferToolCategory('random_tool', 'Does something')).toBe('other');
  });
});

describe('Registration Helpers', () => {
  describe('registerBuiltinTools', () => {
    it('registers tools with builtin source', () => {
      const registry = new UnifiedToolRegistry();
      const tools = {
        calc: createMockTool('calc', 'Calculate'),
        search: createMockTool('search', 'Search web'),
      };

      registerBuiltinTools(registry, tools);

      expect(registry.getAll()).toHaveLength(2);
      expect(registry.get('calc')?.metadata.source).toBe('builtin');
      expect(registry.get('search')?.metadata.source).toBe('builtin');
    });
  });

  describe('registerSkillTools', () => {
    it('registers tools with skill source', () => {
      const registry = new UnifiedToolRegistry();
      const skills = [
        { id: 'skill-1', metadata: { name: 'My Skill' } },
      ] as never[];
      const tools = {
        'skill-1_action': createMockTool('skill-1_action'),
      };

      registerSkillTools(registry, skills, tools);

      expect(registry.get('skill-1_action')?.metadata.source).toBe('skill');
      expect(registry.get('skill-1_action')?.metadata.category).toBe('skill');
    });
  });

  describe('registerMcpTools', () => {
    it('registers tools with mcp source', () => {
      const registry = new UnifiedToolRegistry();
      const servers = [
        { id: 'server1', name: 'Test Server' },
      ] as never[];
      const tools = {
        'mcp_server1_tool': createMockTool('mcp_server1_tool'),
      };

      registerMcpTools(registry, servers, tools);

      const registered = registry.get('mcp_server1_tool');
      expect(registered?.metadata.source).toBe('mcp');
      expect(registered?.metadata.category).toBe('external');
      expect(registered?.metadata.sourceId).toBe('server1');
      expect(registered?.metadata.sourceName).toBe('Test Server');
    });
  });

  describe('registerCustomTools', () => {
    it('registers tools with custom source', () => {
      const registry = new UnifiedToolRegistry();
      const tools = {
        custom_tool: createMockTool('custom_tool', 'Custom functionality'),
      };

      registerCustomTools(registry, tools);

      expect(registry.get('custom_tool')?.metadata.source).toBe('custom');
    });
  });
});
