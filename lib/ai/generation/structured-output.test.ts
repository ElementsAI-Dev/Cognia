/**
 * Tests for Structured Output utilities
 */

import { z } from 'zod';
import {
  generateStructuredObject,
  generateStructuredArray,
  streamStructuredObject,
  streamStructuredArray,
  extractEntities,
  analyzeSentiment,
  classifyText,
  extractTasks,
  analyzeCode,
  generateMeetingNotes,
  EntityExtractionSchema,
  SentimentAnalysisSchema,
  TextClassificationSchema,
  QuestionAnswerSchema,
  TaskExtractionSchema,
  CodeAnalysisSchema,
  MeetingNotesSchema,
  type StructuredOutputConfig,
} from './structured-output';

// Mock AI SDK
jest.mock('ai', () => ({
  generateObject: jest.fn(),
  streamObject: jest.fn(),
}));

// Mock client
jest.mock('../core/client', () => ({
  getProviderModel: jest.fn(() => 'mock-model'),
}));

import { generateObject as aiGenerateObject, streamObject as aiStreamObject } from 'ai';

const mockGenerateObject = aiGenerateObject as jest.Mock;
const mockStreamObject = aiStreamObject as jest.Mock;

const defaultConfig: StructuredOutputConfig = {
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: 'test-key',
};

describe('generateStructuredObject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates object from schema', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    mockGenerateObject.mockResolvedValue({
      object: { name: 'John', age: 30 },
    });

    const result = await generateStructuredObject({
      schema,
      prompt: 'Generate a person',
      config: defaultConfig,
    });

    expect(result.object).toEqual({ name: 'John', age: 30 });
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        schema,
        prompt: 'Generate a person',
      })
    );
  });

  it('uses system prompt when provided', async () => {
    const schema = z.object({ value: z.string() });

    mockGenerateObject.mockResolvedValue({
      object: { value: 'test' },
    });

    await generateStructuredObject({
      schema,
      prompt: 'Test',
      systemPrompt: 'You are a helpful assistant',
      config: defaultConfig,
    });

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'You are a helpful assistant',
      })
    );
  });

  it('uses custom temperature', async () => {
    const schema = z.object({ value: z.string() });

    mockGenerateObject.mockResolvedValue({
      object: { value: 'test' },
    });

    await generateStructuredObject({
      schema,
      prompt: 'Test',
      config: { ...defaultConfig, temperature: 0.3 },
    });

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.3,
      })
    );
  });

  it('uses default temperature of 0.7', async () => {
    const schema = z.object({ value: z.string() });

    mockGenerateObject.mockResolvedValue({
      object: { value: 'test' },
    });

    await generateStructuredObject({
      schema,
      prompt: 'Test',
      config: defaultConfig,
    });

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.7,
      })
    );
  });
});

describe('generateStructuredArray', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates array of objects', async () => {
    const elementSchema = z.object({
      item: z.string(),
    });

    mockGenerateObject.mockResolvedValue({
      object: [{ item: 'first' }, { item: 'second' }],
    });

    const result = await generateStructuredArray({
      elementSchema,
      prompt: 'Generate items',
      config: defaultConfig,
    });

    expect(result.object).toHaveLength(2);
    expect(result.object[0].item).toBe('first');
  });

  it('wraps element schema in array', async () => {
    const elementSchema = z.object({ value: z.number() });

    mockGenerateObject.mockResolvedValue({
      object: [{ value: 1 }],
    });

    await generateStructuredArray({
      elementSchema,
      prompt: 'Generate numbers',
      config: defaultConfig,
    });

    expect(mockGenerateObject).toHaveBeenCalled();
  });
});

describe('streamStructuredObject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('streams object with partial updates', async () => {
    const schema = z.object({
      title: z.string(),
      content: z.string(),
    });

    const partials: unknown[] = [];
    const mockPartialStream = (async function* () {
      yield { title: 'Test' };
      yield { title: 'Test', content: 'Content' };
    })();

    mockStreamObject.mockReturnValue({
      partialObjectStream: mockPartialStream,
      object: Promise.resolve({ title: 'Test', content: 'Content' }),
    });

    const result = await streamStructuredObject({
      schema,
      prompt: 'Generate article',
      config: defaultConfig,
      onPartial: (partial) => partials.push(partial),
    });

    expect(result).toEqual({ title: 'Test', content: 'Content' });
    expect(partials.length).toBeGreaterThan(0);
  });

  it('works without onPartial callback', async () => {
    const schema = z.object({ value: z.string() });

    mockStreamObject.mockReturnValue({
      partialObjectStream: (async function* () {})(),
      object: Promise.resolve({ value: 'final' }),
    });

    const result = await streamStructuredObject({
      schema,
      prompt: 'Test',
      config: defaultConfig,
    });

    expect(result).toEqual({ value: 'final' });
  });
});

describe('streamStructuredArray', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('streams array with partial updates', async () => {
    const elementSchema = z.object({ name: z.string() });

    const partials: unknown[] = [];
    const mockPartialStream = (async function* () {
      yield [{ name: 'First' }];
      yield [{ name: 'First' }, { name: 'Second' }];
    })();

    mockStreamObject.mockReturnValue({
      partialObjectStream: mockPartialStream,
      object: Promise.resolve([{ name: 'First' }, { name: 'Second' }]),
    });

    const result = await streamStructuredArray({
      elementSchema,
      prompt: 'Generate names',
      config: defaultConfig,
      onPartial: (partial) => partials.push(partial),
    });

    expect(result).toHaveLength(2);
    expect(partials.length).toBeGreaterThan(0);
  });
});

describe('Pre-defined schemas', () => {
  it('EntityExtractionSchema has correct structure', () => {
    const validData = {
      entities: [
        { name: 'John', type: 'person', mentions: 2 },
      ],
      summary: 'A test summary',
    };

    const parsed = EntityExtractionSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('SentimentAnalysisSchema has correct structure', () => {
    const validData = {
      sentiment: 'positive',
      confidence: 0.9,
      aspects: [{ aspect: 'quality', sentiment: 'positive', reason: 'Good quality' }],
    };

    const parsed = SentimentAnalysisSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('TextClassificationSchema has correct structure', () => {
    const validData = {
      category: 'technology',
      confidence: 0.85,
      tags: ['ai', 'ml'],
      reasoning: 'Contains AI keywords',
    };

    const parsed = TextClassificationSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('QuestionAnswerSchema has correct structure', () => {
    const validData = {
      answer: 'The answer is 42',
      confidence: 0.95,
      sources: ['source1'],
      followUpQuestions: ['What else?'],
    };

    const parsed = QuestionAnswerSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('TaskExtractionSchema has correct structure', () => {
    const validData = {
      tasks: [
        { title: 'Task 1', priority: 'high' },
        { title: 'Task 2', priority: 'low', dueDate: '2024-01-01' },
      ],
    };

    const parsed = TaskExtractionSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('CodeAnalysisSchema has correct structure', () => {
    const validData = {
      language: 'typescript',
      purpose: 'Calculate sum',
      complexity: 'simple',
      issues: [
        { type: 'style', description: 'Use const', severity: 'low' },
      ],
      suggestions: ['Add types'],
    };

    const parsed = CodeAnalysisSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('MeetingNotesSchema has correct structure', () => {
    const validData = {
      title: 'Team Meeting',
      attendees: ['Alice', 'Bob'],
      summary: 'Discussed project',
      keyPoints: ['Point 1'],
      actionItems: [{ task: 'Review PR', assignee: 'Alice' }],
      decisions: ['Use TypeScript'],
      nextSteps: ['Schedule follow-up'],
    };

    const parsed = MeetingNotesSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });
});

describe('Helper functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractEntities', () => {
    it('extracts entities from text', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          entities: [{ name: 'Apple', type: 'organization', mentions: 3 }],
          summary: 'About Apple Inc.',
        },
      });

      const result = await extractEntities('Apple released new products', defaultConfig);

      expect(result.object.entities).toHaveLength(1);
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Apple released new products'),
        })
      );
    });
  });

  describe('analyzeSentiment', () => {
    it('analyzes sentiment of text', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          sentiment: 'positive',
          confidence: 0.9,
          aspects: [],
        },
      });

      const result = await analyzeSentiment('I love this product!', defaultConfig);

      expect(result.object.sentiment).toBe('positive');
    });
  });

  describe('classifyText', () => {
    it('classifies text into categories', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          category: 'technology',
          confidence: 0.85,
          tags: ['ai'],
          reasoning: 'Contains tech keywords',
        },
      });

      const result = await classifyText(
        'AI is transforming industries',
        ['technology', 'business', 'health'],
        defaultConfig
      );

      expect(result.object.category).toBe('technology');
    });
  });

  describe('extractTasks', () => {
    it('extracts tasks from text', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          tasks: [
            { title: 'Review code', priority: 'high' },
            { title: 'Write tests', priority: 'medium' },
          ],
        },
      });

      const result = await extractTasks(
        'Please review the code and write tests',
        defaultConfig
      );

      expect(result.object.tasks).toHaveLength(2);
    });
  });

  describe('analyzeCode', () => {
    it('analyzes code snippet', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          language: 'typescript',
          purpose: 'Add numbers',
          complexity: 'simple',
          issues: [],
          suggestions: ['Add return type'],
        },
      });

      const result = await analyzeCode(
        'function add(a, b) { return a + b; }',
        'typescript',
        defaultConfig
      );

      expect(result.object.language).toBe('typescript');
      expect(result.object.complexity).toBe('simple');
    });
  });

  describe('generateMeetingNotes', () => {
    it('generates meeting notes from transcript', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          title: 'Sprint Planning',
          attendees: ['Alice', 'Bob'],
          summary: 'Planned next sprint',
          keyPoints: ['Prioritized backlog'],
          actionItems: [{ task: 'Create tickets' }],
          decisions: ['Use Scrum'],
          nextSteps: ['Daily standup'],
        },
      });

      const result = await generateMeetingNotes(
        'Alice: Let\'s discuss the sprint...',
        defaultConfig
      );

      expect(result.object.title).toBe('Sprint Planning');
      expect(result.object.attendees).toContain('Alice');
    });
  });
});

describe('StructuredOutputConfig', () => {
  it('accepts all configuration options', () => {
    const config: StructuredOutputConfig = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: 'test-key',
      baseURL: 'https://custom.api.com',
      temperature: 0.5,
      maxTokens: 1000,
    };

    expect(config.provider).toBe('anthropic');
    expect(config.baseURL).toBe('https://custom.api.com');
  });
});
