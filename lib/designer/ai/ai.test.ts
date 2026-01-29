/**
 * Tests for Designer AI utilities
 */

import {
  cleanAICodeResponse,
  getDesignerAIConfig,
  getAIStyleSuggestions,
  getAIAccessibilitySuggestions,
  editElementWithAI,
  continueDesignConversation,
  generateComponentVariations,
  QUICK_AI_ACTIONS,
  type DesignerAIConfig,
  type AISuggestion,
  type AIConversationMessage,
} from './ai';

import { generateText, generateObject } from 'ai';

// Mock the AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
  generateObject: jest.fn(),
}));

jest.mock('@/lib/ai/core/client', () => ({
  getProviderModel: jest.fn(() => ({})),
}));

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;
const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;

// Global beforeEach to ensure clean state for each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('cleanAICodeResponse', () => {
  it('should remove markdown code blocks', () => {
    const input = '```jsx\nexport default function App() { return <div>Hello</div>; }\n```';
    const result = cleanAICodeResponse(input);
    expect(result).toBe('export default function App() { return <div>Hello</div>; }');
  });

  it('should handle code without markdown', () => {
    const input = 'export default function App() { return <div>Hello</div>; }';
    const result = cleanAICodeResponse(input);
    expect(result).toBe('export default function App() { return <div>Hello</div>; }');
  });

  it('should trim whitespace', () => {
    const input = '  \n  export default function App() { return <div>Hello</div>; }  \n  ';
    const result = cleanAICodeResponse(input);
    expect(result).toBe('export default function App() { return <div>Hello</div>; }');
  });

  it('should handle typescript code blocks', () => {
    const input = '```tsx\nexport default function App() { return <div>Hello</div>; }\n```';
    const result = cleanAICodeResponse(input);
    expect(result).toBe('export default function App() { return <div>Hello</div>; }');
  });

  it('should preserve imports at the top', () => {
    const input = "```jsx\nimport { useState } from 'react';\n\nexport default function App() { return <div>Hello</div>; }\n```";
    const result = cleanAICodeResponse(input);
    expect(result).toContain("import { useState } from 'react'");
    expect(result).toContain('export default function App()');
  });
});

describe('getDesignerAIConfig', () => {
  it('should return config with default provider', () => {
    const result = getDesignerAIConfig(null, {});
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o-mini');
  });

  it('should use specified provider', () => {
    const result = getDesignerAIConfig('anthropic', {
      anthropic: { apiKey: 'test-key', defaultModel: 'claude-3-sonnet' },
    });
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-3-sonnet');
    expect(result.apiKey).toBe('test-key');
  });

  it('should include baseURL when provided', () => {
    const result = getDesignerAIConfig('openai', {
      openai: { apiKey: 'test-key', baseURL: 'https://custom.api.com' },
    });
    expect(result.baseURL).toBe('https://custom.api.com');
  });
});

describe('QUICK_AI_ACTIONS', () => {
  it('should have required properties for each action', () => {
    for (const action of QUICK_AI_ACTIONS) {
      expect(action).toHaveProperty('id');
      expect(action).toHaveProperty('label');
      expect(action).toHaveProperty('prompt');
      expect(typeof action.id).toBe('string');
      expect(typeof action.label).toBe('string');
      expect(typeof action.prompt).toBe('string');
    }
  });

  it('should have unique ids', () => {
    const ids = QUICK_AI_ACTIONS.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should contain expected actions', () => {
    const ids = QUICK_AI_ACTIONS.map((a) => a.id);
    expect(ids).toContain('improve-spacing');
    expect(ids).toContain('add-animation');
    expect(ids).toContain('make-responsive');
    expect(ids).toContain('add-dark-mode');
  });
});

describe('AISuggestion type', () => {
  it('should accept valid suggestion objects', () => {
    const suggestion: AISuggestion = {
      id: 'test-1',
      type: 'style',
      title: 'Improve colors',
      description: 'Use more vibrant colors',
      priority: 'medium',
    };
    expect(suggestion.id).toBe('test-1');
    expect(suggestion.type).toBe('style');
  });

  it('should accept suggestion with code', () => {
    const suggestion: AISuggestion = {
      id: 'test-2',
      type: 'layout',
      title: 'Use flexbox',
      description: 'Change to flex layout',
      code: 'flex items-center',
      priority: 'high',
    };
    expect(suggestion.code).toBe('flex items-center');
  });
});

describe('DesignerAIConfig type', () => {
  it('should accept valid config objects', () => {
    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    };
    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-4o');
  });

  it('should work without optional fields', () => {
    const config: DesignerAIConfig = {
      provider: 'ollama',
      model: 'llama2',
    };
    expect(config.apiKey).toBeUndefined();
    expect(config.baseURL).toBeUndefined();
  });
});

describe('AIConversationMessage type', () => {
  it('should accept valid message objects', () => {
    const message: AIConversationMessage = {
      id: 'test-msg-1',
      role: 'user',
      content: 'Make the button blue',
      timestamp: new Date(),
    };
    expect(message.role).toBe('user');
    expect(message.content).toBe('Make the button blue');
  });

  it('should accept assistant message with code snapshot', () => {
    const message: AIConversationMessage = {
      id: 'test-msg-2',
      role: 'assistant',
      content: 'Done! I updated the button color.',
      timestamp: new Date(),
      codeSnapshot: 'export default function App() { return <button className="bg-blue-500">Click</button>; }',
    };
    expect(message.codeSnapshot).toContain('bg-blue-500');
  });
});

describe('getAIStyleSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when no API key for non-ollama providers', async () => {
    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
    };
    const result = await getAIStyleSuggestions('const x = 1;', config);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No API key');
  });

  it('should call generateObject with correct parameters', async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: {
        suggestions: [
          { type: 'style', title: 'Test', description: 'Test desc', priority: 'medium' }
        ]
      },
    } as never);

    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    };
    const result = await getAIStyleSuggestions('export default function App() {}', config);
    
    expect(mockGenerateObject).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions?.length).toBeGreaterThan(0);
  });

  it('should handle API errors gracefully', async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error('API Error'));

    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    };
    const result = await getAIStyleSuggestions('export default function App() {}', config);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('API Error');
  });
});

describe('getAIAccessibilitySuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when no API key', async () => {
    const config: DesignerAIConfig = {
      provider: 'anthropic',
      model: 'claude-3',
    };
    const result = await getAIAccessibilitySuggestions('const x = 1;', config);
    expect(result.success).toBe(false);
  });

  it('should return accessibility suggestions', async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: {
        suggestions: [
          { type: 'accessibility', title: 'Add alt text', description: 'Images need alt attributes', priority: 'high' }
        ]
      },
    } as never);

    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    };
    const result = await getAIAccessibilitySuggestions('<img src="test.jpg" />', config);
    
    expect(result.success).toBe(true);
    expect(result.suggestions?.[0].type).toBe('accessibility');
  });
});

describe('editElementWithAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when no API key', async () => {
    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
    };
    const result = await editElementWithAI('code', 'div.container', 'make it blue', config);
    expect(result.success).toBe(false);
  });

  it('should return modified code', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'export default function App() { return <div className="bg-blue-500">Hello</div>; }',
    } as never);

    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    };
    const result = await editElementWithAI(
      'export default function App() { return <div>Hello</div>; }',
      'div',
      'make background blue',
      config
    );
    
    expect(result.success).toBe(true);
    expect(result.code).toContain('bg-blue-500');
  });
});

describe('continueDesignConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when no API key', async () => {
    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
    };
    const result = await continueDesignConversation('code', [], 'help', config);
    expect(result.success).toBe(false);
  });

  it('should return response with extracted code', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'I updated the component. Here is the code:\n```jsx\nexport default function App() { return <div>Updated</div>; }\n```',
    } as never);

    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    };
    const result = await continueDesignConversation(
      'export default function App() { return <div>Hello</div>; }',
      [],
      'update the text',
      config
    );
    
    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
    expect(result.code).toContain('Updated');
  });

  it('should include conversation history in prompt', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'Sure, I can help with that.',
    } as never);

    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    };
    const history: AIConversationMessage[] = [
      { id: 'hist-1', role: 'user', content: 'Make it blue', timestamp: new Date() },
      { id: 'hist-2', role: 'assistant', content: 'Done!', timestamp: new Date() },
    ];
    
    await continueDesignConversation('code', history, 'now make it red', config);
    
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Make it blue'),
      })
    );
  });
});

describe('generateComponentVariations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when no API key', async () => {
    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
    };
    const result = await generateComponentVariations('code', 'style', 2, config);
    expect(result.success).toBe(false);
  });

  it('should return multiple variations', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: `--- Variation 1 ---
\`\`\`jsx
export default function App() { return <div className="bg-blue-500">V1</div>; }
\`\`\`
--- Variation 2 ---
\`\`\`jsx
export default function App() { return <div className="bg-red-500">V2</div>; }
\`\`\``,
    } as never);

    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    };
    const result = await generateComponentVariations(
      'export default function App() { return <div>Hello</div>; }',
      'color',
      2,
      config
    );
    
    expect(result.success).toBe(true);
    expect(result.variations).toBeDefined();
    expect(result.variations?.length).toBe(2);
  });

  it('should support different variation types', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '```jsx\nexport default function App() { return <div>V1</div>; }\n```',
    } as never);

    const config: DesignerAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    };

    await generateComponentVariations('code', 'layout', 1, config);
    
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('layout'),
      })
    );
  });
});
