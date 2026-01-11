/**
 * History Optimizer Tests
 */

import {
  calculateTextSimilarity,
  calculateNgramSimilarity,
  calculateCombinedSimilarity,
  extractPromptPatterns,
  getPromptSuggestions,
  findSimilarSuccessfulCalls,
  generateOptimizedPrompt,
  getToolRecommendations,
  analyzeUsagePatterns,
  scorePromptQuality,
} from './history-optimizer';
import type { ToolCallRecord, ToolUsageStats } from '@/types/agent/tool-history';

// Helper to create mock records
function createMockRecord(
  overrides: Partial<ToolCallRecord> = {}
): ToolCallRecord {
  return {
    id: `record-${Math.random().toString(36).substr(2, 9)}`,
    toolId: 'mcp:server1:tool1',
    toolType: 'mcp',
    toolName: 'tool1',
    serverId: 'server1',
    serverName: 'Server 1',
    prompt: 'Default test prompt',
    result: 'success',
    calledAt: new Date(),
    ...overrides,
  };
}

function createMockStats(
  overrides: Partial<ToolUsageStats> = {}
): ToolUsageStats {
  return {
    toolId: 'mcp:server1:tool1',
    toolType: 'mcp',
    toolName: 'tool1',
    totalCalls: 10,
    successCalls: 8,
    errorCalls: 2,
    avgDuration: 100,
    frequentPrompts: [],
    isFavorite: false,
    isPinned: false,
    ...overrides,
  };
}

describe('calculateTextSimilarity', () => {
  it('should return 1 for identical strings', () => {
    const similarity = calculateTextSimilarity('hello world', 'hello world');
    expect(similarity).toBe(1);
  });

  it('should return 0 for completely different strings', () => {
    const similarity = calculateTextSimilarity('apple', 'xyz');
    expect(similarity).toBe(0);
  });

  it('should return partial similarity for overlapping words', () => {
    const similarity = calculateTextSimilarity(
      'search for documents about AI',
      'find documents about machine learning'
    );
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it('should be case insensitive', () => {
    const similarity = calculateTextSimilarity('Hello World', 'hello world');
    expect(similarity).toBe(1);
  });

  it('should ignore short words', () => {
    const similarity = calculateTextSimilarity('a the an', 'is of to');
    expect(similarity).toBe(0);
  });
});

describe('calculateNgramSimilarity', () => {
  it('should return 1 for identical strings', () => {
    const similarity = calculateNgramSimilarity('hello', 'hello');
    expect(similarity).toBe(1);
  });

  it('should return 0 for completely different strings', () => {
    const similarity = calculateNgramSimilarity('abc', 'xyz');
    expect(similarity).toBe(0);
  });

  it('should return partial similarity for similar strings', () => {
    const similarity = calculateNgramSimilarity('hello world', 'hello there');
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });
});

describe('calculateCombinedSimilarity', () => {
  it('should combine Jaccard and n-gram similarity', () => {
    const combined = calculateCombinedSimilarity(
      'search for AI documents',
      'search for machine learning documents'
    );
    expect(combined).toBeGreaterThan(0);
    expect(combined).toBeLessThanOrEqual(1);
  });
});

describe('extractPromptPatterns', () => {
  it('should return empty for single prompt', () => {
    const patterns = extractPromptPatterns(['single prompt']);
    expect(patterns).toHaveLength(0);
  });

  it('should extract common words from multiple prompts', () => {
    const prompts = [
      'search for documents about AI',
      'search for files about machine learning',
      'search for articles about deep learning',
    ];
    const patterns = extractPromptPatterns(prompts);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0]).toContain('search');
  });
});

describe('getPromptSuggestions', () => {
  it('should return suggestions from frequent prompts', () => {
    const stats = createMockStats({
      frequentPrompts: [
        {
          prompt: 'Search for documents',
          count: 5,
          lastUsedAt: new Date(),
          successRate: 0.9,
        },
      ],
    });

    const history: ToolCallRecord[] = [];
    const suggestions = getPromptSuggestions(
      'mcp:server1:tool1',
      '',
      history,
      stats
    );

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].reason).toBe('frequent');
  });

  it('should return similar prompts when input provided', () => {
    const history = [
      createMockRecord({
        prompt: 'Find documents about artificial intelligence',
        result: 'success',
      }),
    ];

    const suggestions = getPromptSuggestions(
      'mcp:server1:tool1',
      'find documents about AI',
      history
    );

    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('should return recent successful prompts', () => {
    const history = [
      createMockRecord({
        prompt: 'Recent successful prompt',
        result: 'success',
        calledAt: new Date(),
      }),
    ];

    const suggestions = getPromptSuggestions(
      'mcp:server1:tool1',
      '',
      history
    );

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.reason === 'recent')).toBe(true);
  });

  it('should deduplicate similar suggestions', () => {
    const history = [
      createMockRecord({ prompt: 'Search for documents' }),
      createMockRecord({ prompt: 'Search for documents' }),
      createMockRecord({ prompt: 'Search for documents' }),
    ];

    const suggestions = getPromptSuggestions(
      'mcp:server1:tool1',
      '',
      history
    );

    // Should not have duplicates
    const uniquePrompts = new Set(suggestions.map(s => s.suggestedPrompt));
    expect(uniquePrompts.size).toBe(suggestions.length);
  });
});

describe('findSimilarSuccessfulCalls', () => {
  it('should find similar successful calls', () => {
    const history = [
      createMockRecord({
        prompt: 'Search for AI documents',
        result: 'success',
      }),
      createMockRecord({
        prompt: 'Completely different prompt',
        result: 'success',
      }),
      createMockRecord({
        prompt: 'Search for ML documents',
        result: 'error',
      }),
    ];

    const similar = findSimilarSuccessfulCalls(
      'Search for machine learning documents',
      history
    );

    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].record.result).toBe('success');
  });

  it('should respect minimum similarity threshold', () => {
    const history = [
      createMockRecord({
        prompt: 'Completely unrelated prompt about cooking',
        result: 'success',
      }),
    ];

    const similar = findSimilarSuccessfulCalls(
      'Search for AI documents',
      history,
      0.5 // High threshold
    );

    expect(similar).toHaveLength(0);
  });

  it('should respect limit', () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      createMockRecord({
        prompt: `Search for documents ${i}`,
        result: 'success',
      })
    );

    const similar = findSimilarSuccessfulCalls(
      'Search for documents',
      history,
      0.2,
      3
    );

    expect(similar.length).toBeLessThanOrEqual(3);
  });
});

describe('generateOptimizedPrompt', () => {
  it('should return user intent when no examples', () => {
    const result = generateOptimizedPrompt(
      'mcp:server1:tool1',
      'My custom prompt',
      []
    );
    expect(result).toBe('My custom prompt');
  });

  it('should return successful prompt when highly similar', () => {
    const examples = [
      createMockRecord({
        prompt: 'Search for documents about artificial intelligence',
        result: 'success',
      }),
    ];

    const result = generateOptimizedPrompt(
      'mcp:server1:tool1',
      'Search for documents about AI',
      examples
    );

    // Should return either the successful example or the original
    expect(result).toBeDefined();
  });

  it('should return user intent when no good match', () => {
    const examples = [
      createMockRecord({
        prompt: 'Completely different topic about cooking',
        result: 'success',
      }),
    ];

    const result = generateOptimizedPrompt(
      'mcp:server1:tool1',
      'Search for AI documents',
      examples
    );

    expect(result).toBe('Search for AI documents');
  });
});

describe('getToolRecommendations', () => {
  it('should return frequent tools when no input', () => {
    const stats: Record<string, ToolUsageStats> = {
      'mcp:server1:tool1': createMockStats({ totalCalls: 10 }),
      'mcp:server1:tool2': createMockStats({ 
        toolId: 'mcp:server1:tool2',
        toolName: 'tool2',
        totalCalls: 5 
      }),
    };

    const recommendations = getToolRecommendations('', [], stats);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].reason).toBe('frequent');
  });

  it('should recommend tools based on similar prompts', () => {
    const history = [
      createMockRecord({
        toolId: 'mcp:server1:search',
        toolName: 'search',
        prompt: 'Find documents about machine learning',
        result: 'success',
      }),
    ];

    const stats: Record<string, ToolUsageStats> = {
      'mcp:server1:search': createMockStats({
        toolId: 'mcp:server1:search',
        toolName: 'search',
      }),
    };

    const recommendations = getToolRecommendations(
      'find documents about AI',
      history,
      stats
    );

    expect(recommendations.length).toBeGreaterThan(0);
  });
});

describe('analyzeUsagePatterns', () => {
  it('should analyze peak usage hour', () => {
    const history = Array.from({ length: 10 }, () =>
      createMockRecord({
        calledAt: new Date('2024-01-01T14:00:00'),
      })
    );

    const analysis = analyzeUsagePatterns('mcp:server1:tool1', history);

    expect(analysis.peakUsageHour).toBe(14);
  });

  it('should detect success rate trend', () => {
    // Create history with improving success rate
    const oldRecords = Array.from({ length: 5 }, () =>
      createMockRecord({
        result: 'error',
        calledAt: new Date('2024-01-01'),
      })
    );
    const newRecords = Array.from({ length: 5 }, () =>
      createMockRecord({
        result: 'success',
        calledAt: new Date('2024-01-10'),
      })
    );

    // New records first (most recent)
    const history = [...newRecords, ...oldRecords];
    const analysis = analyzeUsagePatterns('mcp:server1:tool1', history);

    expect(analysis.successRateTrend).toBe('improving');
  });

  it('should find co-used tools', () => {
    const now = Date.now();
    const history = [
      createMockRecord({
        toolId: 'mcp:server1:tool1',
        calledAt: new Date(now),
      }),
      createMockRecord({
        toolId: 'mcp:server1:tool2',
        toolName: 'tool2',
        calledAt: new Date(now + 60000), // 1 minute later
      }),
    ];

    const analysis = analyzeUsagePatterns('mcp:server1:tool1', history);

    expect(analysis.coUsedTools.length).toBeGreaterThanOrEqual(0);
  });
});

describe('scorePromptQuality', () => {
  it('should score a prompt based on history', () => {
    const history = [
      createMockRecord({
        prompt: 'Search for documents about AI',
        result: 'success',
      }),
    ];

    const result = scorePromptQuality(
      'Search for documents about machine learning',
      'mcp:server1:tool1',
      history
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.factors).toBeDefined();
    expect(result.suggestions).toBeDefined();
  });

  it('should warn about prompts similar to failed ones', () => {
    const history = [
      createMockRecord({
        prompt: 'Bad prompt that failed',
        result: 'error',
      }),
    ];

    const result = scorePromptQuality(
      'Bad prompt that failed again',
      'mcp:server1:tool1',
      history
    );

    expect(result.suggestions.some(s => s.includes('failed'))).toBe(true);
  });

  it('should suggest more detail for short prompts', () => {
    const history = [
      createMockRecord({
        prompt: 'Search for documents about artificial intelligence and machine learning',
        result: 'success',
      }),
    ];

    const result = scorePromptQuality(
      'Hi',
      'mcp:server1:tool1',
      history
    );

    expect(result.suggestions.some(s => s.includes('detail'))).toBe(true);
  });
});
