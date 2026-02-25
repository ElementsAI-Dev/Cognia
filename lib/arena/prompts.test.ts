/**
 * Tests for arena prompt templates
 */

import {
  ARENA_PROMPTS,
  getRandomPrompt,
  getPromptsByCategory,
  getRecentBattlePrompts,
  getRandomPrompts,
} from './prompts';
import type { ArenaBattle } from '@/types/arena';

describe('ARENA_PROMPTS', () => {
  it('should contain at least 24 prompts', () => {
    expect(ARENA_PROMPTS.length).toBeGreaterThanOrEqual(24);
  });

  it('should have 4 prompts per category', () => {
    const categories = ['coding', 'math', 'analysis', 'creative', 'research', 'translation'];
    for (const cat of categories) {
      const count = ARENA_PROMPTS.filter((p) => p.category === cat).length;
      expect(count).toBe(4);
    }
  });

  it('should have unique IDs', () => {
    const ids = ARENA_PROMPTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have valid difficulty levels', () => {
    for (const p of ARENA_PROMPTS) {
      expect(['easy', 'medium', 'hard']).toContain(p.difficulty);
    }
  });

  it('should have non-empty title and prompt', () => {
    for (const p of ARENA_PROMPTS) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.prompt.length).toBeGreaterThan(10);
    }
  });

  it('should have titleKey matching id pattern', () => {
    for (const p of ARENA_PROMPTS) {
      expect(p.titleKey).toMatch(/^prompts\.\w+\.\d+$/);
    }
  });
});

describe('getRandomPrompt', () => {
  it('should return a prompt from the pool', () => {
    const prompt = getRandomPrompt();
    expect(ARENA_PROMPTS).toContainEqual(prompt);
  });

  it('should return a prompt from the specified category', () => {
    const prompt = getRandomPrompt('coding');
    expect(prompt.category).toBe('coding');
  });

  it('should return different prompts on multiple calls (probabilistic)', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(getRandomPrompt().id);
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('getPromptsByCategory', () => {
  it('should return all prompts for a category', () => {
    const coding = getPromptsByCategory('coding');
    expect(coding.length).toBe(4);
    expect(coding.every((p) => p.category === 'coding')).toBe(true);
  });

  it('should return empty array for unknown category', () => {
    const result = getPromptsByCategory('nonexistent' as never);
    expect(result).toHaveLength(0);
  });
});

describe('getRecentBattlePrompts', () => {
  const makeBattle = (prompt: string): ArenaBattle => ({
    id: Math.random().toString(),
    prompt,
    mode: 'blind',
    contestants: [],
    createdAt: new Date(),
  });

  it('should return unique prompts from battles', () => {
    const battles = [
      makeBattle('Hello'),
      makeBattle('Hello'),
      makeBattle('World'),
    ];
    const result = getRecentBattlePrompts(battles);
    expect(result).toEqual(['Hello', 'World']);
  });

  it('should respect limit parameter', () => {
    const battles = [
      makeBattle('A'),
      makeBattle('B'),
      makeBattle('C'),
      makeBattle('D'),
    ];
    const result = getRecentBattlePrompts(battles, 2);
    expect(result).toEqual(['A', 'B']);
  });

  it('should skip empty prompts', () => {
    const battles = [
      makeBattle(''),
      makeBattle('  '),
      makeBattle('Valid'),
    ];
    const result = getRecentBattlePrompts(battles);
    expect(result).toEqual(['Valid']);
  });

  it('should return empty array for no battles', () => {
    const result = getRecentBattlePrompts([]);
    expect(result).toEqual([]);
  });

  it('should default to limit of 5', () => {
    const battles = Array.from({ length: 10 }, (_, i) => makeBattle(`Prompt ${i}`));
    const result = getRecentBattlePrompts(battles);
    expect(result).toHaveLength(5);
  });
});

describe('getRandomPrompts', () => {
  it('should return requested number of prompts', () => {
    const result = getRandomPrompts(4);
    expect(result).toHaveLength(4);
  });

  it('should return unique prompts', () => {
    const result = getRandomPrompts(6);
    const ids = result.map((p) => p.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('should filter by category', () => {
    const result = getRandomPrompts(3, 'math');
    expect(result).toHaveLength(3);
    expect(result.every((p) => p.category === 'math')).toBe(true);
  });

  it('should return all available if count exceeds pool', () => {
    const result = getRandomPrompts(100, 'coding');
    expect(result).toHaveLength(4);
  });

  it('should return empty array for count 0', () => {
    const result = getRandomPrompts(0);
    expect(result).toHaveLength(0);
  });
});
