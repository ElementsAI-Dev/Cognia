/**
 * Tests for Agent Tools
 */

import { z } from 'zod';
import {
  createCalculatorTool,
  createWebSearchTool,
  createRAGSearchTool,
  createListRAGCollectionsTool,
  createDesignerTool,
  createCodeExecutionTool,
  getToolsFromRegistry,
  initializeAgentTools,
  getToolDescriptions,
  getSkillsSystemPrompt,
  initializeAgentToolsWithSkills,
  buildEnvironmentToolsSystemPrompt,
  buildAgentSystemPrompt,
} from './agent-tools';
import type { Skill } from '@/types/system/skill';

// Mock dependencies
jest.mock('../tools', () => ({
  getGlobalToolRegistry: jest.fn(() => ({
    get: jest.fn((name: string) => {
      if (name === 'file_read') {
        return {
          name: 'file_read',
          description: 'Read a file',
          parameters: z.object({ path: z.string() }),
          create: () => async () => ({ success: true }),
        };
      }
      return undefined;
    }),
  })),
  executeWebSearch: jest.fn().mockResolvedValue({ success: true, results: [] }),
  webSearchInputSchema: z.object({ query: z.string() }),
  executeCalculator: jest.fn().mockReturnValue({ success: true, result: 42 }),
  calculatorInputSchema: z.object({ expression: z.string() }),
  executeRAGSearch: jest.fn().mockResolvedValue({ success: true, results: [] }),
  ragSearchInputSchema: z.object({ query: z.string() }),
}));

jest.mock('@/lib/skills', () => ({
  createSkillTools: jest.fn(() => ({
    skill_tool: {
      name: 'skill_tool',
      description: 'A skill tool',
      parameters: z.object({}),
      execute: jest.fn(),
    },
  })),
  buildSkillSystemPrompt: jest.fn((skill) => `Skill: ${skill.metadata.name}`),
  buildMultiSkillSystemPrompt: jest.fn((skills) => `Skills: ${skills.map((s: Skill) => s.metadata.name).join(', ')}`),
}));

jest.mock('./mcp-tools', () => ({
  createMcpToolsFromStore: jest.fn(() => ({
    mcp_tool: {
      name: 'mcp_tool',
      description: 'An MCP tool',
      parameters: z.object({}),
      execute: jest.fn(),
    },
  })),
}));

jest.mock('./environment-tools', () => ({
  initializeEnvironmentTools: jest.fn(() => ({
    create_venv: {
      name: 'create_venv',
      description: 'Create virtual environment',
      parameters: z.object({}),
      execute: jest.fn(),
    },
  })),
  getEnvironmentToolsSystemPrompt: jest.fn(() => 'Detailed environment tools prompt'),
  getEnvironmentToolsPromptSnippet: jest.fn(() => 'Brief environment tools prompt'),
}));

jest.mock('./jupyter-tools', () => ({
  getJupyterTools: jest.fn(() => ({
    execute_python: {
      name: 'execute_python',
      description: 'Execute Python code',
      parameters: z.object({}),
      execute: jest.fn(),
    },
  })),
  getJupyterToolsSystemPrompt: jest.fn(() => 'Jupyter tools prompt'),
}));

describe('createCalculatorTool', () => {
  it('creates a calculator tool with correct properties', () => {
    const tool = createCalculatorTool();

    expect(tool.name).toBe('calculator');
    expect(tool.description).toContain('mathematical calculations');
    expect(tool.requiresApproval).toBe(false);
    expect(tool.execute).toBeDefined();
  });

  it('executes calculator expression', async () => {
    const tool = createCalculatorTool();
    const result = await tool.execute({ expression: '2 + 2' });

    expect(result).toEqual({ success: true, result: 42 });
  });
});

describe('createWebSearchTool', () => {
  it('creates a web search tool with API key', () => {
    const tool = createWebSearchTool('test-api-key');

    expect(tool.name).toBe('web_search');
    expect(tool.description).toContain('Search the web');
    expect(tool.requiresApproval).toBe(false);
  });

  it('executes web search', async () => {
    const tool = createWebSearchTool('test-api-key');
    const result = await tool.execute({ query: 'test query' });

    expect(result).toEqual({ success: true, results: [] });
  });
});

describe('createRAGSearchTool', () => {
  it('creates a RAG search tool', () => {
    const tool = createRAGSearchTool();

    expect(tool.name).toBe('rag_search');
    expect(tool.description).toContain('Search through uploaded documents');
    expect(tool.requiresApproval).toBe(false);
  });

  it('returns error when no config provided', async () => {
    const tool = createRAGSearchTool();
    const result = await tool.execute({ query: 'test' });

    expect(result).toEqual({
      success: false,
      error: 'RAG search requires configuration. Please set up vector database first.',
      query: 'test',
    });
  });

  it('executes search when config provided', async () => {
    const ragConfig = {
      chromaConfig: {
        mode: 'embedded' as const,
        serverUrl: '',
        embeddingConfig: { provider: 'openai' as const, model: 'text-embedding-3-small' },
        apiKey: 'test-key',
      },
      topK: 5,
      similarityThreshold: 0.5,
      maxContextLength: 4000,
    };
    const tool = createRAGSearchTool(ragConfig);
    const result = await tool.execute({ query: 'test', collectionName: 'default' });

    expect(result).toEqual({ success: true, results: [] });
  });

  it('includes available collections in description when provided', () => {
    const ragConfig = {
      chromaConfig: {
        mode: 'embedded' as const,
        serverUrl: '',
        embeddingConfig: { provider: 'openai' as const, model: 'text-embedding-3-small' },
        apiKey: 'test-key',
      },
      topK: 5,
      similarityThreshold: 0.5,
      maxContextLength: 4000,
    };
    const tool = createRAGSearchTool(ragConfig, {
      availableCollections: ['docs', 'knowledge', 'faq'],
      defaultCollectionName: 'docs',
    });

    expect(tool.description).toContain('Available collections');
    expect(tool.description).toContain('"docs"');
    expect(tool.description).toContain('"knowledge"');
    expect(tool.description).toContain('"faq"');
    expect(tool.description).toContain('Default collection: "docs"');
  });

  it('uses default collection name when not specified in input', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { executeRAGSearch } = require('../tools');
    const ragConfig = {
      chromaConfig: {
        mode: 'embedded' as const,
        serverUrl: '',
        embeddingConfig: { provider: 'openai' as const, model: 'text-embedding-3-small' },
        apiKey: 'test-key',
      },
      topK: 5,
      similarityThreshold: 0.5,
      maxContextLength: 4000,
    };
    const tool = createRAGSearchTool(ragConfig, {
      defaultCollectionName: 'my-default',
    });
    
    await tool.execute({ query: 'test' });
    
    expect(executeRAGSearch).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: 'my-default' }),
      ragConfig
    );
  });
});

describe('createListRAGCollectionsTool', () => {
  it('creates a list RAG collections tool', () => {
    const getCollections = () => [{ name: 'docs', documentCount: 10 }];
    const tool = createListRAGCollectionsTool(getCollections);

    expect(tool.name).toBe('list_rag_collections');
    expect(tool.description).toContain('List all available knowledge base collections');
    expect(tool.requiresApproval).toBe(false);
  });

  it('returns empty list when no collections exist', async () => {
    const getCollections = () => [];
    const tool = createListRAGCollectionsTool(getCollections);
    const result = await tool.execute({});

    expect(result).toEqual({
      success: true,
      collections: [],
      message: 'No knowledge base collections found. Documents need to be uploaded first.',
    });
  });

  it('returns list of collections with metadata', async () => {
    const getCollections = () => [
      { name: 'docs', description: 'Documentation', documentCount: 100 },
      { name: 'faq', description: 'FAQ entries', documentCount: 50 },
    ];
    const tool = createListRAGCollectionsTool(getCollections);
    const result = await tool.execute({}) as {
      success: boolean;
      collections: Array<{ name: string; description: string; documentCount: number }>;
      message: string;
    };

    expect(result.success).toBe(true);
    expect(result.collections).toHaveLength(2);
    expect(result.collections[0]).toEqual({
      name: 'docs',
      description: 'Documentation',
      documentCount: 100,
    });
    expect(result.message).toContain('2 collection(s)');
  });
});

describe('createDesignerTool', () => {
  it('creates a designer tool', () => {
    const tool = createDesignerTool();

    expect(tool.name).toBe('open_designer');
    expect(tool.description).toContain('web designer');
    expect(tool.requiresApproval).toBe(false);
  });

  it('executes designer tool with code', async () => {
    const tool = createDesignerTool();
    const result = await tool.execute({
      code: '<div>Test</div>',
      description: 'Test component',
    }) as { success: boolean; action: string; code: string; description: string; designerKey: string };

    expect(result).toMatchObject({
      success: true,
      action: 'open_designer',
      code: '<div>Test</div>',
      description: 'Test component',
    });
    expect(result.designerKey).toBeDefined();
  });
});

describe('createCodeExecutionTool', () => {
  it('creates a code execution tool that requires approval', () => {
    const tool = createCodeExecutionTool();

    expect(tool.name).toBe('execute_code');
    expect(tool.description).toContain('Execute JavaScript code');
    expect(tool.requiresApproval).toBe(true);
  });

  it('executes valid JavaScript code', async () => {
    const tool = createCodeExecutionTool();
    const result = await tool.execute({ code: '2 + 2' }) as { success: boolean; result: string };

    expect(result).toEqual({
      success: true,
      result: '4',
    });
  });

  it('handles code execution errors', async () => {
    const tool = createCodeExecutionTool();
    const result = await tool.execute({ code: 'throw new Error("test error")' }) as { success: boolean; error?: string };

    expect(result).toMatchObject({
      success: false,
    });
    expect(result.error).toBeDefined();
  });
});

describe('getToolsFromRegistry', () => {
  it('retrieves tools from registry by name', () => {
    const tools = getToolsFromRegistry(['file_read', 'nonexistent'], {});

    expect(tools.file_read).toBeDefined();
    expect(tools.file_read.name).toBe('file_read');
    expect(tools.nonexistent).toBeUndefined();
  });
});

describe('initializeAgentTools', () => {
  it('initializes default tools', () => {
    const tools = initializeAgentTools({});

    expect(tools.calculator).toBeDefined();
    expect(tools.rag_search).toBeDefined();
    expect(tools.execute_code).toBeDefined();
    expect(tools.open_designer).toBeDefined();
  });

  it('excludes web search when no API key provided', () => {
    const tools = initializeAgentTools({});

    expect(tools.web_search).toBeUndefined();
  });

  it('includes web search when API key provided', () => {
    const tools = initializeAgentTools({ tavilyApiKey: 'test-key' });

    expect(tools.web_search).toBeDefined();
  });

  it('disables calculator when explicitly set to false', () => {
    const tools = initializeAgentTools({ enableCalculator: false });

    expect(tools.calculator).toBeUndefined();
  });

  it('includes skill tools when active skills provided', () => {
    const mockSkill: Skill = {
      id: 'skill-1',
      metadata: { name: 'test-skill', description: 'A test skill' },
      content: 'Test instructions',
      rawContent: '---\nname: test-skill\n---\nTest instructions',
      resources: [],
      status: 'enabled',
      source: 'custom',
      category: 'development',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tools = initializeAgentTools({
      enableSkills: true,
      activeSkills: [mockSkill],
    });

    expect(tools.skill_tool).toBeDefined();
  });

  it('includes MCP tools when configured', () => {
    const tools = initializeAgentTools({
      enableMcpTools: true,
      mcpServers: [],
      mcpCallTool: jest.fn(),
    });

    expect(tools.mcp_tool).toBeDefined();
  });

  it('includes environment tools when enabled', () => {
    const tools = initializeAgentTools({
      enableEnvironmentTools: true,
    });

    expect(tools.create_venv).toBeDefined();
  });

  it('includes Jupyter tools when enabled', () => {
    const tools = initializeAgentTools({
      enableJupyterTools: true,
    });

    expect(tools.execute_python).toBeDefined();
  });

  it('includes custom tools', () => {
    const customTool = {
      name: 'custom_tool',
      description: 'A custom tool',
      parameters: z.object({}),
      execute: jest.fn(),
      requiresApproval: false,
    };

    const tools = initializeAgentTools({
      customTools: { custom_tool: customTool },
    });

    expect(tools.custom_tool).toBeDefined();
    expect(tools.custom_tool.name).toBe('custom_tool');
  });
});

describe('getToolDescriptions', () => {
  it('returns descriptions for all tools', () => {
    const tools = {
      tool1: {
        name: 'tool1',
        description: 'First tool',
        parameters: z.object({}),
        execute: jest.fn(),
        requiresApproval: true,
      },
      tool2: {
        name: 'tool2',
        description: 'Second tool',
        parameters: z.object({}),
        execute: jest.fn(),
        requiresApproval: false,
      },
    };

    const descriptions = getToolDescriptions(tools);

    expect(descriptions).toHaveLength(2);
    expect(descriptions[0]).toEqual({
      name: 'tool1',
      description: 'First tool',
      requiresApproval: true,
    });
    expect(descriptions[1]).toEqual({
      name: 'tool2',
      description: 'Second tool',
      requiresApproval: false,
    });
  });
});

describe('getSkillsSystemPrompt', () => {
  it('returns empty string when no skills provided', () => {
    const prompt = getSkillsSystemPrompt([]);

    expect(prompt).toBe('');
  });

  it('builds prompt for single skill', () => {
    const skill: Skill = {
      id: 'skill-1',
      metadata: { name: 'test-skill', description: 'A test skill' },
      content: 'Test instructions',
      rawContent: '---\nname: test-skill\n---\nTest instructions',
      resources: [],
      status: 'enabled',
      source: 'custom',
      category: 'development',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prompt = getSkillsSystemPrompt([skill]);

    expect(prompt).toBe('Skill: test-skill');
  });

  it('builds prompt for multiple skills', () => {
    const skills: Skill[] = [
      {
        id: 'skill-1',
        metadata: { name: 'skill-a', description: 'First skill' },
        content: 'Instructions A',
        rawContent: '---\nname: skill-a\n---\nInstructions A',
        resources: [],
        status: 'enabled',
        source: 'custom',
        category: 'development',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'skill-2',
        metadata: { name: 'skill-b', description: 'Second skill' },
        content: 'Instructions B',
        rawContent: '---\nname: skill-b\n---\nInstructions B',
        resources: [],
        status: 'enabled',
        source: 'custom',
        category: 'development',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const prompt = getSkillsSystemPrompt(skills);

    expect(prompt).toBe('Skills: skill-a, skill-b');
  });
});

describe('initializeAgentToolsWithSkills', () => {
  it('returns tools and skills system prompt', () => {
    const skill: Skill = {
      id: 'skill-1',
      metadata: { name: 'test-skill', description: 'A test skill' },
      content: 'Test instructions',
      rawContent: '---\nname: test-skill\n---\nTest instructions',
      resources: [],
      status: 'enabled',
      source: 'custom',
      category: 'development',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = initializeAgentToolsWithSkills({}, [skill]);

    expect(result.tools).toBeDefined();
    expect(result.skillsSystemPrompt).toBe('Skill: test-skill');
  });
});

describe('buildEnvironmentToolsSystemPrompt', () => {
  it('returns brief prompt by default', () => {
    const prompt = buildEnvironmentToolsSystemPrompt();

    expect(prompt).toBe('Brief environment tools prompt');
  });

  it('returns detailed prompt when requested', () => {
    const prompt = buildEnvironmentToolsSystemPrompt(true);

    expect(prompt).toBe('Detailed environment tools prompt');
  });
});

describe('buildAgentSystemPrompt', () => {
  it('returns empty string when no config provided', () => {
    const prompt = buildAgentSystemPrompt({});

    expect(prompt).toBe('');
  });

  it('includes base prompt', () => {
    const prompt = buildAgentSystemPrompt({
      basePrompt: 'You are a helpful assistant.',
    });

    expect(prompt).toBe('You are a helpful assistant.');
  });

  it('includes skills prompt', () => {
    const skill: Skill = {
      id: 'skill-1',
      metadata: { name: 'test-skill', description: 'A test skill' },
      content: 'Test instructions',
      rawContent: '---\nname: test-skill\n---\nTest instructions',
      resources: [],
      status: 'enabled',
      source: 'custom',
      category: 'development',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prompt = buildAgentSystemPrompt({
      activeSkills: [skill],
    });

    expect(prompt).toContain('Skill: test-skill');
  });

  it('includes environment tools prompt', () => {
    const prompt = buildAgentSystemPrompt({
      enableEnvironmentTools: true,
    });

    expect(prompt).toContain('environment tools prompt');
  });

  it('includes Jupyter tools prompt', () => {
    const prompt = buildAgentSystemPrompt({
      enableJupyterTools: true,
    });

    expect(prompt).toContain('Jupyter tools prompt');
  });

  it('combines all prompts', () => {
    const skill: Skill = {
      id: 'skill-1',
      metadata: { name: 'test-skill', description: 'A test skill' },
      content: 'Test instructions',
      rawContent: '---\nname: test-skill\n---\nTest instructions',
      resources: [],
      status: 'enabled',
      source: 'custom',
      category: 'development',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prompt = buildAgentSystemPrompt({
      basePrompt: 'Base prompt',
      activeSkills: [skill],
      enableEnvironmentTools: true,
      enableJupyterTools: true,
    });

    expect(prompt).toContain('Base prompt');
    expect(prompt).toContain('Skill: test-skill');
    expect(prompt).toContain('environment tools prompt');
    expect(prompt).toContain('Jupyter tools prompt');
  });
});
