/**
 * App Builder Tool Tests
 */

import {
  appGenerateInputSchema,
  appCreateFromTemplateInputSchema,
  appListInputSchema,
  appDeleteInputSchema,
  executeAppList,
  executeAppGenerate,
  executeAppCreateFromTemplate,
  executeAppDelete,
  appBuilderTools,
  registerAppBuilderTools,
  getAppBuilderToolsPrompt,
} from './app-builder-tool';

// Mock A2UI store
const mockProcessMessage = jest.fn();
const mockDeleteSurface = jest.fn();
jest.mock('@/stores/a2ui', () => ({
  useA2UIStore: {
    getState: () => ({
      processMessage: mockProcessMessage,
      deleteSurface: mockDeleteSurface,
      surfaces: {
        'existing-app': { title: 'Test App', components: {} },
      },
    }),
  },
}));

// Mock app-generator
jest.mock('@/lib/a2ui/app-generator', () => ({
  generateAppFromDescription: jest.fn(() => ({
    id: 'generated-app-1',
    name: 'Test Calculator',
    description: 'A simple calculator',
    messages: [{ type: 'createSurface', surfaceId: 'generated-app-1' }],
  })),
  detectAppType: jest.fn(() => 'calculator'),
}));

// Mock templates
jest.mock('@/lib/a2ui/templates', () => ({
  appTemplates: [
    { id: 'todo', name: 'Todo List', description: 'Task manager', category: 'productivity', tags: ['tasks'] },
    { id: 'calc', name: 'Calculator', description: 'Math tool', category: 'utility', tags: ['math'] },
    { id: 'notes', name: 'Notes', description: 'Note taking', category: 'productivity', tags: ['notes'] },
  ],
  getTemplateById: jest.fn((id: string) => {
    const templates: Record<string, unknown> = {
      todo: { id: 'todo', name: 'Todo List', description: 'Task manager', category: 'productivity' },
      calc: { id: 'calc', name: 'Calculator', description: 'Math tool', category: 'utility' },
    };
    return templates[id] || null;
  }),
  getTemplatesByCategory: jest.fn((category: string) => {
    const all = [
      { id: 'todo', name: 'Todo List', description: 'Task manager', category: 'productivity' },
      { id: 'calc', name: 'Calculator', description: 'Math tool', category: 'utility' },
      { id: 'notes', name: 'Notes', description: 'Note taking', category: 'productivity' },
    ];
    return all.filter((t) => t.category === category);
  }),
  searchTemplates: jest.fn((query: string) => {
    const all = [
      { id: 'todo', name: 'Todo List', description: 'Task manager', category: 'productivity' },
      { id: 'calc', name: 'Calculator', description: 'Math tool', category: 'utility' },
    ];
    return all.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
  }),
  createAppFromTemplate: jest.fn(() => ({
    surfaceId: 'template-app-1',
    messages: [{ type: 'createSurface', surfaceId: 'template-app-1' }],
  })),
}));

describe('App Builder Tool Schemas', () => {
  describe('appGenerateInputSchema', () => {
    it('should validate valid input', () => {
      const result = appGenerateInputSchema.safeParse({
        description: 'A tip calculator',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional language and style', () => {
      const result = appGenerateInputSchema.safeParse({
        description: 'A calculator',
        language: 'zh',
        style: 'minimal',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid language', () => {
      const result = appGenerateInputSchema.safeParse({
        description: 'A calculator',
        language: 'fr',
      });
      expect(result.success).toBe(false);
    });

    it('should require description', () => {
      const result = appGenerateInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('appListInputSchema', () => {
    it('should validate with category filter', () => {
      const result = appListInputSchema.safeParse({
        category: 'productivity',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid category', () => {
      const result = appListInputSchema.safeParse({
        category: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept empty input', () => {
      const result = appListInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('appCreateFromTemplateInputSchema', () => {
    it('should validate with templateId', () => {
      const result = appCreateFromTemplateInputSchema.safeParse({
        templateId: 'todo',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('appDeleteInputSchema', () => {
    it('should validate with appId', () => {
      const result = appDeleteInputSchema.safeParse({
        appId: 'app-123',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('executeAppGenerate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate an app from description', async () => {
    const result = await executeAppGenerate({ description: 'A tip calculator', style: 'colorful' });

    expect(result.success).toBe(true);
    expect(result.appId).toBe('generated-app-1');
    expect(result.app?.name).toBe('Test Calculator');
    expect(result.message).toContain('Test Calculator');
    expect(mockProcessMessage).toHaveBeenCalled();
  });

  it('should handle generation errors', async () => {
    const { generateAppFromDescription } = jest.requireMock('@/lib/a2ui/app-generator');
    generateAppFromDescription.mockImplementationOnce(() => {
      throw new Error('Generation failed');
    });

    const result = await executeAppGenerate({ description: 'invalid', style: 'minimal' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Generation failed');
  });
});

describe('executeAppCreateFromTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create app from valid template', async () => {
    const result = await executeAppCreateFromTemplate({ templateId: 'todo' });

    expect(result.success).toBe(true);
    expect(result.appId).toBe('template-app-1');
    expect(result.message).toContain('Todo List');
    expect(mockProcessMessage).toHaveBeenCalled();
  });

  it('should return error for invalid template', async () => {
    const result = await executeAppCreateFromTemplate({ templateId: 'nonexistent' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('should use custom name when provided', async () => {
    const result = await executeAppCreateFromTemplate({
      templateId: 'todo',
      name: 'My Tasks',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('My Tasks');
  });
});

describe('executeAppList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list all templates without filters', async () => {
    const result = await executeAppList({});

    expect(result.success).toBe(true);
    expect(result.apps?.length).toBe(3);
  });

  it('should filter by category', async () => {
    const result = await executeAppList({ category: 'productivity' });

    expect(result.success).toBe(true);
    expect(result.apps?.every((a) => a.category === 'productivity')).toBe(true);
  });

  it('should filter by search query', async () => {
    const result = await executeAppList({ query: 'todo' });

    expect(result.success).toBe(true);
    expect(result.apps?.some((a) => a.name === 'Todo List')).toBe(true);
  });
});

describe('executeAppDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete existing app', async () => {
    const result = await executeAppDelete({ appId: 'existing-app', confirm: true });

    expect(result.success).toBe(true);
    expect(mockDeleteSurface).toHaveBeenCalledWith('existing-app');
  });

  it('should reject without confirmation', async () => {
    const result = await executeAppDelete({ appId: 'existing-app', confirm: false });

    expect(result.success).toBe(false);
    expect(result.message).toContain('confirmation required');
  });

  it('should return error for non-existent app', async () => {
    const result = await executeAppDelete({ appId: 'missing', confirm: true });

    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });
});

describe('Tool definitions', () => {
  it('should export 4 tool definitions', () => {
    expect(appBuilderTools).toHaveLength(4);
    expect(appBuilderTools.map((t) => t.name)).toEqual([
      'app_generate',
      'app_create_from_template',
      'app_list_templates',
      'app_delete',
    ]);
  });

  it('should register all tools', () => {
    const mockRegister = jest.fn();
    registerAppBuilderTools({ register: mockRegister });

    expect(mockRegister).toHaveBeenCalledTimes(4);
  });

  it('should return a prompt string', () => {
    const prompt = getAppBuilderToolsPrompt();

    expect(prompt).toContain('app_generate');
    expect(prompt).toContain('app_create_from_template');
    expect(prompt).toContain('app_list_templates');
    expect(prompt).toContain('app_delete');
  });
});
