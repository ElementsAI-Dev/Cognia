/**
 * Tests for Tool Registry
 */

import { z } from 'zod';
import {
  createToolRegistry,
  getGlobalToolRegistry,
  type ToolDefinition,
} from './registry';

describe('createToolRegistry', () => {
  it('creates empty registry', () => {
    const registry = createToolRegistry();

    expect(registry).toBeDefined();
    expect(registry.tools).toBeDefined();
    expect(registry.getAll()).toHaveLength(0);
  });

  it('has all required methods', () => {
    const registry = createToolRegistry();

    expect(typeof registry.register).toBe('function');
    expect(typeof registry.unregister).toBe('function');
    expect(typeof registry.get).toBe('function');
    expect(typeof registry.getAll).toBe('function');
    expect(typeof registry.getByCategory).toBe('function');
    expect(typeof registry.createTools).toBe('function');
  });
});

describe('ToolRegistry.register', () => {
  it('registers a tool', () => {
    const registry = createToolRegistry();
    const tool: ToolDefinition = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: z.object({}),
      create: () => jest.fn(),
    };

    registry.register(tool);

    expect(registry.get('test_tool')).toBe(tool);
    expect(registry.getAll()).toHaveLength(1);
  });

  it('overwrites existing tool with same name', () => {
    const registry = createToolRegistry();
    const tool1: ToolDefinition = {
      name: 'test_tool',
      description: 'First version',
      parameters: z.object({}),
      create: () => jest.fn(),
    };
    const tool2: ToolDefinition = {
      name: 'test_tool',
      description: 'Second version',
      parameters: z.object({}),
      create: () => jest.fn(),
    };

    registry.register(tool1);
    registry.register(tool2);

    expect(registry.get('test_tool')?.description).toBe('Second version');
    expect(registry.getAll()).toHaveLength(1);
  });

  it('registers multiple tools', () => {
    const registry = createToolRegistry();

    registry.register({
      name: 'tool1',
      description: 'Tool 1',
      parameters: z.object({}),
      create: () => jest.fn(),
    });
    registry.register({
      name: 'tool2',
      description: 'Tool 2',
      parameters: z.object({}),
      create: () => jest.fn(),
    });

    expect(registry.getAll()).toHaveLength(2);
  });
});

describe('ToolRegistry.unregister', () => {
  it('removes registered tool', () => {
    const registry = createToolRegistry();
    registry.register({
      name: 'test_tool',
      description: 'Test',
      parameters: z.object({}),
      create: () => jest.fn(),
    });

    registry.unregister('test_tool');

    expect(registry.get('test_tool')).toBeUndefined();
    expect(registry.getAll()).toHaveLength(0);
  });

  it('does nothing for non-existent tool', () => {
    const registry = createToolRegistry();

    expect(() => registry.unregister('nonexistent')).not.toThrow();
  });
});

describe('ToolRegistry.get', () => {
  it('returns tool by name', () => {
    const registry = createToolRegistry();
    const tool: ToolDefinition = {
      name: 'my_tool',
      description: 'My tool',
      parameters: z.object({ value: z.string() }),
      create: () => jest.fn(),
    };

    registry.register(tool);

    expect(registry.get('my_tool')).toBe(tool);
  });

  it('returns undefined for non-existent tool', () => {
    const registry = createToolRegistry();

    expect(registry.get('nonexistent')).toBeUndefined();
  });
});

describe('ToolRegistry.getAll', () => {
  it('returns all registered tools', () => {
    const registry = createToolRegistry();

    registry.register({
      name: 'tool1',
      description: 'Tool 1',
      parameters: z.object({}),
      create: () => jest.fn(),
    });
    registry.register({
      name: 'tool2',
      description: 'Tool 2',
      parameters: z.object({}),
      create: () => jest.fn(),
    });
    registry.register({
      name: 'tool3',
      description: 'Tool 3',
      parameters: z.object({}),
      create: () => jest.fn(),
    });

    const all = registry.getAll();

    expect(all).toHaveLength(3);
    expect(all.map((t) => t.name)).toEqual(['tool1', 'tool2', 'tool3']);
  });

  it('returns empty array for empty registry', () => {
    const registry = createToolRegistry();

    expect(registry.getAll()).toEqual([]);
  });
});

describe('ToolRegistry.getByCategory', () => {
  it('returns tools by category', () => {
    const registry = createToolRegistry();

    registry.register({
      name: 'search1',
      description: 'Search 1',
      parameters: z.object({}),
      category: 'search',
      create: () => jest.fn(),
    });
    registry.register({
      name: 'file1',
      description: 'File 1',
      parameters: z.object({}),
      category: 'file',
      create: () => jest.fn(),
    });
    registry.register({
      name: 'search2',
      description: 'Search 2',
      parameters: z.object({}),
      category: 'search',
      create: () => jest.fn(),
    });

    const searchTools = registry.getByCategory('search');

    expect(searchTools).toHaveLength(2);
    expect(searchTools.every((t) => t.category === 'search')).toBe(true);
  });

  it('returns empty array for non-existent category', () => {
    const registry = createToolRegistry();

    registry.register({
      name: 'tool1',
      description: 'Tool',
      parameters: z.object({}),
      category: 'file',
      create: () => jest.fn(),
    });

    expect(registry.getByCategory('search')).toEqual([]);
  });

  it('handles tools without category', () => {
    const registry = createToolRegistry();

    registry.register({
      name: 'tool1',
      description: 'Tool without category',
      parameters: z.object({}),
      create: () => jest.fn(),
    });

    expect(registry.getByCategory('file')).toEqual([]);
    expect(registry.getByCategory(undefined)).toHaveLength(1);
  });
});

describe('ToolRegistry.createTools', () => {
  it('creates tool functions from names', () => {
    const registry = createToolRegistry();
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();

    registry.register({
      name: 'tool1',
      description: 'Tool 1',
      parameters: z.object({}),
      create: () => mockFn1,
    });
    registry.register({
      name: 'tool2',
      description: 'Tool 2',
      parameters: z.object({}),
      create: () => mockFn2,
    });

    const tools = registry.createTools(['tool1', 'tool2'], {});

    expect(tools.tool1).toBe(mockFn1);
    expect(tools.tool2).toBe(mockFn2);
  });

  it('passes config to create function', () => {
    const registry = createToolRegistry();
    const createFn = jest.fn(() => jest.fn());

    registry.register({
      name: 'configurable_tool',
      description: 'Configurable',
      parameters: z.object({}),
      create: createFn,
    });

    const config = { apiKey: 'test-key', maxResults: 10 };
    registry.createTools(['configurable_tool'], config);

    expect(createFn).toHaveBeenCalledWith(config);
  });

  it('skips non-existent tools', () => {
    const registry = createToolRegistry();

    registry.register({
      name: 'existing',
      description: 'Existing tool',
      parameters: z.object({}),
      create: () => jest.fn(),
    });

    const tools = registry.createTools(['existing', 'nonexistent'], {});

    expect(Object.keys(tools)).toEqual(['existing']);
  });

  it('returns empty object for empty names array', () => {
    const registry = createToolRegistry();

    const tools = registry.createTools([], {});

    expect(tools).toEqual({});
  });
});

describe('getGlobalToolRegistry', () => {
  it('returns singleton instance', () => {
    const registry1 = getGlobalToolRegistry();
    const registry2 = getGlobalToolRegistry();

    expect(registry1).toBe(registry2);
  });

  it('returns a valid registry', () => {
    const registry = getGlobalToolRegistry();

    expect(registry.register).toBeDefined();
    expect(registry.get).toBeDefined();
    expect(registry.getAll).toBeDefined();
  });

  it('persists registered tools across calls', () => {
    const registry1 = getGlobalToolRegistry();

    registry1.register({
      name: 'global_tool',
      description: 'Global tool',
      parameters: z.object({}),
      create: () => jest.fn(),
    });

    const registry2 = getGlobalToolRegistry();

    expect(registry2.get('global_tool')).toBeDefined();
  });
});

describe('ToolDefinition interface', () => {
  it('accepts all valid categories', () => {
    const categories: Array<ToolDefinition['category']> = [
      'search',
      'code',
      'file',
      'system',
      'custom',
      undefined,
    ];

    for (const category of categories) {
      const tool: ToolDefinition = {
        name: 'test',
        description: 'Test',
        parameters: z.object({}),
        category,
        create: () => jest.fn(),
      };
      expect(tool.category).toBe(category);
    }
  });

  it('supports requiresApproval flag', () => {
    const tool: ToolDefinition = {
      name: 'dangerous_tool',
      description: 'A dangerous tool',
      parameters: z.object({}),
      requiresApproval: true,
      create: () => jest.fn(),
    };

    expect(tool.requiresApproval).toBe(true);
  });
});
