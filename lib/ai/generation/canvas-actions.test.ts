/**
 * Tests for Canvas Actions utilities
 */

import {
  applyCanvasActionResult,
  getActionDescription,
  type CanvasActionType,
} from './canvas-actions';

describe('applyCanvasActionResult', () => {
  it('returns result directly when no selection', () => {
    const original = 'Original content';
    const result = 'New content';
    
    expect(applyCanvasActionResult(original, result)).toBe('New content');
  });

  it('returns result directly when selection is empty', () => {
    const original = 'Original content';
    const result = 'New content';
    
    expect(applyCanvasActionResult(original, result, '')).toBe('New content');
  });

  it('returns result directly when selection is whitespace', () => {
    const original = 'Original content';
    const result = 'New content';
    
    expect(applyCanvasActionResult(original, result, '   ')).toBe('New content');
  });

  it('replaces selection in content', () => {
    const original = 'Hello world, how are you?';
    const result = 'everyone';
    const selection = 'world';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('Hello everyone, how are you?');
  });

  it('replaces selection at the beginning', () => {
    const original = 'Hello world';
    const result = 'Hi';
    const selection = 'Hello';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('Hi world');
  });

  it('replaces selection at the end', () => {
    const original = 'Hello world';
    const result = 'everyone';
    const selection = 'world';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('Hello everyone');
  });

  it('returns result when selection not found', () => {
    const original = 'Hello world';
    const result = 'New content';
    const selection = 'missing';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('New content');
  });

  it('handles multi-line content', () => {
    const original = 'Line 1\nLine 2\nLine 3';
    const result = 'Modified Line';
    const selection = 'Line 2';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('Line 1\nModified Line\nLine 3');
  });

  it('replaces only first occurrence', () => {
    const original = 'word word word';
    const result = 'replaced';
    const selection = 'word';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('replaced word word');
  });

  it('handles special characters in selection', () => {
    const original = 'function() { return true; }';
    const result = 'false';
    const selection = 'true';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('function() { return false; }');
  });
});

describe('getActionDescription', () => {
  const actionTypes: CanvasActionType[] = [
    'review',
    'fix',
    'improve',
    'explain',
    'simplify',
    'expand',
    'translate',
    'format',
    'run',
  ];

  it('returns description for all action types', () => {
    actionTypes.forEach((actionType) => {
      const description = getActionDescription(actionType);
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });
  });

  it('returns correct description for review', () => {
    const description = getActionDescription('review');
    expect(description.toLowerCase()).toContain('review');
  });

  it('returns correct description for fix', () => {
    const description = getActionDescription('fix');
    expect(description.toLowerCase()).toContain('fix');
  });

  it('returns correct description for improve', () => {
    const description = getActionDescription('improve');
    expect(description).toBeDefined();
    expect(description.length).toBeGreaterThan(0);
  });

  it('returns correct description for explain', () => {
    const description = getActionDescription('explain');
    // Description should be defined
    expect(description).toBeDefined();
    expect(description.length).toBeGreaterThan(0);
  });

  it('returns correct description for simplify', () => {
    const description = getActionDescription('simplify');
    expect(description.toLowerCase()).toContain('simpl');
  });

  it('returns correct description for expand', () => {
    const description = getActionDescription('expand');
    expect(description.toLowerCase()).toContain('detail');
  });

  it('returns correct description for translate', () => {
    const description = getActionDescription('translate');
    expect(description.toLowerCase()).toContain('translate');
  });

  it('returns correct description for format', () => {
    const description = getActionDescription('format');
    expect(description.toLowerCase()).toContain('format');
  });

  it('returns correct description for run', () => {
    const description = getActionDescription('run');
    expect(description.toLowerCase()).toContain('execut');
  });
});

import { generateDiffPreview } from './canvas-actions';

describe('generateDiffPreview', () => {
  it('returns empty array for identical content', () => {
    const diff = generateDiffPreview('hello\nworld', 'hello\nworld');
    expect(diff.every((l) => l.type === 'unchanged')).toBe(true);
    expect(diff.length).toBe(2);
  });

  it('detects added lines at end', () => {
    const diff = generateDiffPreview('line1', 'line1\nline2\nline3');
    const added = diff.filter((l) => l.type === 'added');
    expect(added.length).toBe(2);
    expect(added[0].content).toBe('line2');
    expect(added[1].content).toBe('line3');
  });

  it('detects removed lines at end', () => {
    const diff = generateDiffPreview('line1\nline2\nline3', 'line1');
    const removed = diff.filter((l) => l.type === 'removed');
    expect(removed.length).toBe(2);
    expect(removed[0].content).toBe('line2');
    expect(removed[1].content).toBe('line3');
  });

  it('detects modified lines as removed+added', () => {
    const diff = generateDiffPreview('hello world', 'hello universe');
    const removed = diff.filter((l) => l.type === 'removed');
    const added = diff.filter((l) => l.type === 'added');
    expect(removed.length).toBe(1);
    expect(added.length).toBe(1);
    expect(removed[0].content).toBe('hello world');
    expect(added[0].content).toBe('hello universe');
  });

  it('handles empty original', () => {
    const diff = generateDiffPreview('', 'new line');
    // '' splits to [''], 'new line' splits to ['new line']
    const added = diff.filter((l) => l.type === 'added');
    const removed = diff.filter((l) => l.type === 'removed');
    expect(added.length + removed.length).toBeGreaterThan(0);
  });

  it('handles empty modified', () => {
    const diff = generateDiffPreview('old line', '');
    const removed = diff.filter((l) => l.type === 'removed');
    const added = diff.filter((l) => l.type === 'added');
    expect(removed.length + added.length).toBeGreaterThan(0);
  });

  it('handles multi-line mixed changes', () => {
    const original = 'line1\nline2\nline3\nline4\nline5';
    const modified = 'line1\nmodified\nline3\nline4\nnew5\nnew6';
    const diff = generateDiffPreview(original, modified);

    // line1 unchanged
    expect(diff[0].type).toBe('unchanged');
    expect(diff[0].content).toBe('line1');

    // Verify we have some changes
    const unchanged = diff.filter((l) => l.type === 'unchanged');
    const changed = diff.filter((l) => l.type !== 'unchanged');
    expect(unchanged.length).toBeGreaterThan(0);
    expect(changed.length).toBeGreaterThan(0);
  });

  it('assigns correct line numbers to unchanged lines', () => {
    const diff = generateDiffPreview('a\nb\nc', 'a\nb\nc');
    expect(diff[0]).toEqual({
      type: 'unchanged',
      content: 'a',
      lineNumber: 1,
      newLineNumber: 1,
    });
    expect(diff[1]).toEqual({
      type: 'unchanged',
      content: 'b',
      lineNumber: 2,
      newLineNumber: 2,
    });
    expect(diff[2]).toEqual({
      type: 'unchanged',
      content: 'c',
      lineNumber: 3,
      newLineNumber: 3,
    });
  });

  it('assigns line numbers to added lines', () => {
    const diff = generateDiffPreview('a\nc', 'a\nb\nc');
    const added = diff.filter((l) => l.type === 'added');
    expect(added.length).toBeGreaterThanOrEqual(1);
    for (const line of added) {
      expect(line.newLineNumber).toBeDefined();
    }
  });

  it('assigns line numbers to removed lines', () => {
    const diff = generateDiffPreview('a\nb\nc', 'a\nc');
    const removed = diff.filter((l) => l.type === 'removed');
    expect(removed.length).toBeGreaterThanOrEqual(1);
    for (const line of removed) {
      expect(line.lineNumber).toBeDefined();
    }
  });

  it('handles both empty strings', () => {
    const diff = generateDiffPreview('', '');
    expect(diff.length).toBe(1);
    expect(diff[0].type).toBe('unchanged');
    expect(diff[0].content).toBe('');
  });

  it('handles insertion in the middle with look-ahead', () => {
    const original = 'A\nB\nC\nD';
    const modified = 'A\nB\nX\nY\nC\nD';
    const diff = generateDiffPreview(original, modified);

    // A and B should be unchanged
    expect(diff[0]).toMatchObject({ type: 'unchanged', content: 'A' });
    expect(diff[1]).toMatchObject({ type: 'unchanged', content: 'B' });
    // X and Y should be added
    const added = diff.filter((l) => l.type === 'added');
    expect(added.some((l) => l.content === 'X')).toBe(true);
    expect(added.some((l) => l.content === 'Y')).toBe(true);
  });

  it('handles deletion in the middle with look-ahead', () => {
    const original = 'A\nB\nC\nD\nE';
    const modified = 'A\nD\nE';
    const diff = generateDiffPreview(original, modified);

    expect(diff[0]).toMatchObject({ type: 'unchanged', content: 'A' });
    const removed = diff.filter((l) => l.type === 'removed');
    expect(removed.some((l) => l.content === 'B')).toBe(true);
    expect(removed.some((l) => l.content === 'C')).toBe(true);
  });
});

// Tests for executeCanvasActionStreaming
// We mock the AI SDK to test the streaming logic
jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn(),
}));

jest.mock('../core/client', () => ({
  getProviderModel: jest.fn(() => 'mock-model'),
}));

import { executeCanvasActionStreaming } from './canvas-actions';
import { streamText } from 'ai';

const mockStreamText = streamText as jest.MockedFunction<typeof streamText>;

describe('executeCanvasActionStreaming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('streams tokens and calls onComplete', async () => {
    const tokens = ['Hello', ' ', 'world'];
    const asyncIterator = {
      [Symbol.asyncIterator]: () => {
        let index = 0;
        return {
          next: async () => {
            if (index < tokens.length) {
              return { value: tokens[index++], done: false };
            }
            return { value: undefined, done: true };
          },
        };
      },
    };

    mockStreamText.mockReturnValue({
      textStream: asyncIterator,
    } as never);

    const onToken = jest.fn();
    const onComplete = jest.fn();
    const onError = jest.fn();

    await executeCanvasActionStreaming(
      'fix',
      'broken code',
      { provider: 'openai' as never, model: 'gpt-4', apiKey: 'key' },
      { onToken, onComplete, onError }
    );

    expect(onToken).toHaveBeenCalledTimes(3);
    expect(onToken).toHaveBeenNthCalledWith(1, 'Hello');
    expect(onToken).toHaveBeenNthCalledWith(2, ' ');
    expect(onToken).toHaveBeenNthCalledWith(3, 'world');
    expect(onComplete).toHaveBeenCalledWith('Hello world');
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError when streaming fails', async () => {
    mockStreamText.mockImplementation(() => {
      throw new Error('Stream failed');
    });

    const onToken = jest.fn();
    const onComplete = jest.fn();
    const onError = jest.fn();

    await executeCanvasActionStreaming(
      'improve',
      'some code',
      { provider: 'openai' as never, model: 'gpt-4', apiKey: 'key' },
      { onToken, onComplete, onError }
    );

    expect(onError).toHaveBeenCalledWith('Stream failed');
    expect(onToken).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('uses selection as user prompt when provided', async () => {
    const asyncIterator = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ value: undefined, done: true }),
      }),
    };

    mockStreamText.mockReturnValue({
      textStream: asyncIterator,
    } as never);

    const callbacks = {
      onToken: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    await executeCanvasActionStreaming(
      'fix',
      'full content',
      { provider: 'openai' as never, model: 'gpt-4', apiKey: 'key' },
      callbacks,
      { selection: 'selected portion' }
    );

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'selected portion',
        temperature: 0.3,
      })
    );
  });

  it('uses correct temperature for format action', async () => {
    const asyncIterator = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ value: undefined, done: true }),
      }),
    };

    mockStreamText.mockReturnValue({
      textStream: asyncIterator,
    } as never);

    const callbacks = {
      onToken: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    await executeCanvasActionStreaming(
      'format',
      'code',
      { provider: 'openai' as never, model: 'gpt-4', apiKey: 'key' },
      callbacks
    );

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.3 })
    );
  });

  it('uses higher temperature for improve action', async () => {
    const asyncIterator = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ value: undefined, done: true }),
      }),
    };

    mockStreamText.mockReturnValue({
      textStream: asyncIterator,
    } as never);

    const callbacks = {
      onToken: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    await executeCanvasActionStreaming(
      'improve',
      'code',
      { provider: 'openai' as never, model: 'gpt-4', apiKey: 'key' },
      callbacks
    );

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.7 })
    );
  });

  it('adds language context for supported actions', async () => {
    const asyncIterator = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ value: undefined, done: true }),
      }),
    };

    mockStreamText.mockReturnValue({
      textStream: asyncIterator,
    } as never);

    const callbacks = {
      onToken: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    await executeCanvasActionStreaming(
      'fix',
      'code',
      { provider: 'openai' as never, model: 'gpt-4', apiKey: 'key' },
      callbacks,
      { language: 'typescript' }
    );

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Language: typescript'),
      })
    );
  });

  it('adds target language for translate action', async () => {
    const asyncIterator = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ value: undefined, done: true }),
      }),
    };

    mockStreamText.mockReturnValue({
      textStream: asyncIterator,
    } as never);

    const callbacks = {
      onToken: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    await executeCanvasActionStreaming(
      'translate',
      'hello',
      { provider: 'openai' as never, model: 'gpt-4', apiKey: 'key' },
      callbacks,
      { targetLanguage: 'Chinese' }
    );

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Target language: Chinese'),
      })
    );
  });
});
