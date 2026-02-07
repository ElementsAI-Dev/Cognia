/**
 * Tests for Auto Router - Task classification utilities
 */

import { classifyTask } from './auto-router';

describe('classifyTask', () => {
  describe('simple tasks', () => {
    it('classifies greeting as simple', () => {
      const result = classifyTask('hi');
      expect(result.complexity).toBe('simple');
    });

    it('classifies "what is" questions as simple', () => {
      const result = classifyTask('What is TypeScript?');
      expect(result.complexity).toBe('simple');
    });

    it('classifies definition requests as simple', () => {
      const result = classifyTask('Define machine learning');
      expect(result.complexity).toBe('simple');
    });

    it('classifies translation requests as simple', () => {
      const result = classifyTask('Translate hello to Spanish');
      expect(result.complexity).toBe('simple');
    });

    it('classifies summarize requests as simple', () => {
      const result = classifyTask('Summarize this article');
      expect(result.complexity).toBe('simple');
    });

    it('classifies yes/no questions as simple', () => {
      const result = classifyTask('Is JavaScript a programming language? yes or no');
      expect(result.complexity).toBe('simple');
    });

    it('classifies list requests as simple', () => {
      const result = classifyTask('List the planets');
      expect(result.complexity).toBe('simple');
    });
  });

  describe('complex tasks', () => {
    it('classifies code writing as complex', () => {
      const result = classifyTask('Write code for a REST API');
      expect(result.complexity).toBe('complex');
    });

    it('classifies implementation requests as complex', () => {
      const result = classifyTask('Implement a binary search algorithm');
      expect(result.complexity).toBe('complex');
    });

    it('classifies debugging requests as complex', () => {
      const result = classifyTask('Debug this function that throws an error');
      expect(result.complexity).toBe('complex');
    });

    it('classifies analysis requests as complex', () => {
      const result = classifyTask('Analyze the data and provide insights');
      expect(result.complexity).toBe('complex');
    });

    it('classifies architecture tasks as complex', () => {
      const result = classifyTask('Design a system architecture for a chat app');
      expect(result.complexity).toBe('complex');
    });

    it('classifies refactoring requests as complex', () => {
      const result = classifyTask('Refactor this code to use better patterns');
      expect(result.complexity).toBe('complex');
    });

    it('classifies detailed explanation requests as complex', () => {
      const result = classifyTask('Explain in detail how neural networks work');
      expect(result.complexity).toBe('complex');
    });

    it('classifies multi-step tasks as complex', () => {
      const result = classifyTask('Create a step by step guide');
      expect(result.complexity).toBe('complex');
    });
  });

  describe('reasoning detection', () => {
    it('detects reasoning for "why" questions', () => {
      const result = classifyTask('Why does this code fail?');
      expect(result.requiresReasoning).toBe(true);
    });

    it('detects reasoning for "how does" questions', () => {
      const result = classifyTask('How does garbage collection work?');
      expect(result.requiresReasoning).toBe(true);
    });

    it('detects reasoning for proof requests', () => {
      const result = classifyTask('Prove that this algorithm is O(n log n)');
      expect(result.requiresReasoning).toBe(true);
    });

    it('detects reasoning for calculation requests', () => {
      const result = classifyTask('Calculate the complexity of this function');
      expect(result.requiresReasoning).toBe(true);
    });

    it('detects reasoning for logical problems', () => {
      const result = classifyTask('Solve this logic puzzle');
      expect(result.requiresReasoning).toBe(true);
    });

    it('does not flag simple requests as requiring reasoning', () => {
      const result = classifyTask('What is React?');
      expect(result.requiresReasoning).toBe(false);
    });
  });

  describe('tool detection', () => {
    it('detects tool requirements for search', () => {
      const result = classifyTask('Search for the latest news');
      expect(result.requiresTools).toBe(true);
    });

    it('detects tool requirements for browsing', () => {
      const result = classifyTask('Browse this website');
      expect(result.requiresTools).toBe(true);
    });

    it('detects tool requirements for execution', () => {
      const result = classifyTask('Execute this code');
      expect(result.requiresTools).toBe(true);
    });

    it('does not flag general questions as requiring tools', () => {
      const result = classifyTask('Explain TypeScript generics');
      expect(result.requiresTools).toBe(false);
    });
  });

  describe('vision detection', () => {
    it('detects vision for image requests', () => {
      const result = classifyTask('Analyze this image');
      expect(result.requiresVision).toBe(true);
    });

    it('detects vision for picture requests', () => {
      const result = classifyTask('What is in this picture?');
      expect(result.requiresVision).toBe(true);
    });

    it('detects vision for screenshot requests', () => {
      const result = classifyTask('Look at this screenshot');
      expect(result.requiresVision).toBe(true);
    });

    it('detects vision for diagram requests', () => {
      const result = classifyTask('Explain this diagram');
      expect(result.requiresVision).toBe(true);
    });

    it('does not flag text-only requests as requiring vision', () => {
      const result = classifyTask('Write a function');
      expect(result.requiresVision).toBe(false);
    });
  });

  describe('token estimation', () => {
    it('estimates tokens based on word count', () => {
      const result = classifyTask('one two three four five');
      expect(result.estimatedInputTokens).toBeGreaterThan(0);
      expect(result.estimatedInputTokens).toBeLessThan(20);
    });

    it('handles empty input', () => {
      const result = classifyTask('');
      expect(result.estimatedInputTokens).toBeGreaterThanOrEqual(0);
    });

    it('handles long inputs', () => {
      const longInput = 'word '.repeat(100);
      const result = classifyTask(longInput);
      expect(result.estimatedInputTokens).toBeGreaterThan(100);
    });

    it('estimates output tokens as double input tokens', () => {
      const result = classifyTask('one two three four five');
      expect(result.estimatedOutputTokens).toBe(result.estimatedInputTokens * 2);
    });
  });

  describe('confidence scoring', () => {
    it('has higher confidence for clear patterns', () => {
      const result = classifyTask('Write code for a REST API');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('has base confidence for ambiguous inputs', () => {
      const result = classifyTask('hello');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('long context detection', () => {
    it('detects long context for long inputs', () => {
      const longInput = 'word '.repeat(600);
      const result = classifyTask(longInput);
      expect(result.requiresLongContext).toBe(true);
    });

    it('detects long context for "entire" keyword', () => {
      const result = classifyTask('Read the entire document');
      expect(result.requiresLongContext).toBe(true);
    });

    it('does not flag short inputs as requiring long context', () => {
      const result = classifyTask('Hello world');
      expect(result.requiresLongContext).toBe(false);
    });
  });

  describe('moderate tasks', () => {
    it('classifies medium-length general questions', () => {
      const result = classifyTask('How can I improve my coding skills over time?');
      expect(['simple', 'moderate', 'complex']).toContain(result.complexity);
    });
  });
});

describe('applySkillCategoryHints', () => {
  // Import after classifyTask to ensure module is loaded
  let applySkillCategoryHints: typeof import('./auto-router').applySkillCategoryHints;

  beforeAll(async () => {
    const mod = await import('./auto-router');
    applySkillCategoryHints = mod.applySkillCategoryHints;
  });

  const baseClassification = {
    complexity: 'simple' as const,
    category: 'general' as const,
    requiresReasoning: false,
    requiresTools: false,
    requiresVision: false,
    requiresCreativity: false,
    requiresCoding: false,
    requiresLongContext: false,
    estimatedInputTokens: 10,
    estimatedOutputTokens: 20,
    confidence: 0.8,
  };

  it('sets requiresCoding and category for development skills', () => {
    const result = applySkillCategoryHints(baseClassification, ['development']);
    expect(result.requiresCoding).toBe(true);
    expect(result.category).toBe('coding');
  });

  it('sets requiresReasoning and category for data-analysis skills', () => {
    const result = applySkillCategoryHints(baseClassification, ['data-analysis']);
    expect(result.requiresReasoning).toBe(true);
    expect(result.category).toBe('analysis');
  });

  it('sets requiresCreativity and category for creative-design skills', () => {
    const result = applySkillCategoryHints(baseClassification, ['creative-design']);
    expect(result.requiresCreativity).toBe(true);
    expect(result.category).toBe('creative');
  });

  it('upgrades complexity for enterprise skills when simple', () => {
    const result = applySkillCategoryHints(baseClassification, ['enterprise']);
    expect(result.complexity).toBe('moderate');
  });

  it('upgrades complexity for productivity skills when simple', () => {
    const result = applySkillCategoryHints(baseClassification, ['productivity']);
    expect(result.complexity).toBe('moderate');
  });

  it('does not downgrade complexity for enterprise skills when already complex', () => {
    const complexBase = { ...baseClassification, complexity: 'complex' as const };
    const result = applySkillCategoryHints(complexBase, ['enterprise']);
    expect(result.complexity).toBe('complex');
  });

  it('sets requiresReasoning for meta skills', () => {
    const result = applySkillCategoryHints(baseClassification, ['meta']);
    expect(result.requiresReasoning).toBe(true);
  });

  it('handles multiple skill categories', () => {
    const result = applySkillCategoryHints(baseClassification, ['development', 'data-analysis']);
    expect(result.requiresCoding).toBe(true);
    expect(result.requiresReasoning).toBe(true);
    // First matching category wins
    expect(result.category).toBe('coding');
  });

  it('preserves unmodified fields', () => {
    const result = applySkillCategoryHints(baseClassification, ['development']);
    expect(result.requiresVision).toBe(false);
    expect(result.requiresTools).toBe(false);
    expect(result.estimatedInputTokens).toBe(10);
    expect(result.confidence).toBe(0.8);
  });

  it('handles empty skill categories array', () => {
    const result = applySkillCategoryHints(baseClassification, []);
    expect(result).toEqual(baseClassification);
  });

  it('handles unknown skill categories gracefully', () => {
    const result = applySkillCategoryHints(baseClassification, ['unknown-category']);
    expect(result.complexity).toBe('simple');
    expect(result.category).toBe('general');
  });
});
