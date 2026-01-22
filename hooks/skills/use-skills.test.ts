/**
 * Tests for useSkills hook
 */

import { renderHook, act } from '@testing-library/react';
import {
  useSkills,
  useSkillSystemPrompt,
  useAutoMatchSkills,
  useSkillTokenBudget,
} from './use-skills';
import type { Skill } from '@/types/system/skill';

// Mock skill store
const mockSkill: Skill = {
  id: 'skill-1',
  metadata: {
    name: 'test-skill',
    description: 'A test skill',
  },
  content: 'Skill content here',
  rawContent: '---\nname: test-skill\n---\nSkill content here',
  category: 'development',
  source: 'custom',
  status: 'enabled',
  tags: ['test'],
  version: '1.0.0',
  resources: [],
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
};

const mockCreateSkill = jest.fn(() => mockSkill);
const mockUpdateSkill = jest.fn();
const mockDeleteSkill = jest.fn();
const mockEnableSkill = jest.fn();
const mockDisableSkill = jest.fn();
const mockActivateSkill = jest.fn();
const mockDeactivateSkill = jest.fn();
const mockClearActiveSkills = jest.fn();
const mockSearchSkills = jest.fn(() => ({ skills: [mockSkill], totalCount: 1 }));
const mockGetSkillsByCategory = jest.fn(() => [mockSkill]);
const mockGetSkill = jest.fn(() => mockSkill);
const mockRecordSkillUsage = jest.fn();

jest.mock('@/stores/skills', () => ({
  useSkillStore: () => ({
    skills: { 'skill-1': mockSkill },
    activeSkillIds: ['skill-1'],
    isLoading: false,
    error: null,
    createSkill: mockCreateSkill,
    updateSkill: mockUpdateSkill,
    deleteSkill: mockDeleteSkill,
    enableSkill: mockEnableSkill,
    disableSkill: mockDisableSkill,
    activateSkill: mockActivateSkill,
    deactivateSkill: mockDeactivateSkill,
    clearActiveSkills: mockClearActiveSkills,
    searchSkills: mockSearchSkills,
    getSkillsByCategory: mockGetSkillsByCategory,
    getSkill: mockGetSkill,
    recordSkillUsage: mockRecordSkillUsage,
  }),
}));

// Mock skills library
jest.mock('@/lib/skills', () => ({
  buildSkillSystemPrompt: jest.fn((skill: Skill) => `System prompt for ${skill.metadata.name}`),
  buildMultiSkillSystemPrompt: jest.fn(
    (skills: Skill[]) => `Multi-skill prompt for ${skills.length} skills`
  ),
  findMatchingSkills: jest.fn((skills: Skill[], _query: string, maxResults: number) =>
    skills.slice(0, maxResults)
  ),
  checkSkillTokenBudget: jest.fn(() => ({ totalTokens: 100, fits: true, excess: 0 })),
}));

describe('useSkills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('state', () => {
    it('should return skills list', () => {
      const { result } = renderHook(() => useSkills());

      expect(result.current.skills).toHaveLength(1);
      expect(result.current.skills[0]).toEqual(mockSkill);
    });

    it('should return active skills', () => {
      const { result } = renderHook(() => useSkills());

      expect(result.current.activeSkills).toHaveLength(1);
      expect(result.current.activeSkills[0].id).toBe('skill-1');
    });

    it('should return enabled skills', () => {
      const { result } = renderHook(() => useSkills());

      expect(result.current.enabledSkills).toHaveLength(1);
    });

    it('should return loading and error state', () => {
      const { result } = renderHook(() => useSkills());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('skill management', () => {
    it('should create a skill', () => {
      const { result } = renderHook(() => useSkills());

      act(() => {
        result.current.createSkill({
          name: 'New Skill',
          description: 'Description',
          content: 'Content',
          category: 'development',
        });
      });

      expect(mockCreateSkill).toHaveBeenCalled();
    });

    it('should update a skill', () => {
      const { result } = renderHook(() => useSkills());

      act(() => {
        result.current.updateSkill('skill-1', { content: 'Updated Content' });
      });

      expect(mockUpdateSkill).toHaveBeenCalledWith('skill-1', { content: 'Updated Content' });
    });

    it('should delete a skill', () => {
      const { result } = renderHook(() => useSkills());

      act(() => {
        result.current.deleteSkill('skill-1');
      });

      expect(mockDeleteSkill).toHaveBeenCalledWith('skill-1');
    });

    it('should enable a skill', () => {
      const { result } = renderHook(() => useSkills());

      act(() => {
        result.current.enableSkill('skill-1');
      });

      expect(mockEnableSkill).toHaveBeenCalledWith('skill-1');
    });

    it('should disable a skill', () => {
      const { result } = renderHook(() => useSkills());

      act(() => {
        result.current.disableSkill('skill-1');
      });

      expect(mockDisableSkill).toHaveBeenCalledWith('skill-1');
    });
  });

  describe('active skills', () => {
    it('should activate a skill', () => {
      const { result } = renderHook(() => useSkills());

      act(() => {
        result.current.activateSkill('skill-1');
      });

      expect(mockActivateSkill).toHaveBeenCalledWith('skill-1');
    });

    it('should deactivate a skill', () => {
      const { result } = renderHook(() => useSkills());

      act(() => {
        result.current.deactivateSkill('skill-1');
      });

      expect(mockDeactivateSkill).toHaveBeenCalledWith('skill-1');
    });

    it('should clear active skills', () => {
      const { result } = renderHook(() => useSkills());

      act(() => {
        result.current.clearActiveSkills();
      });

      expect(mockClearActiveSkills).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search skills', () => {
      const { result } = renderHook(() => useSkills());

      const results = result.current.searchSkills('test');

      expect(mockSearchSkills).toHaveBeenCalledWith('test');
      expect(results).toHaveLength(1);
    });

    it('should get skills by category', () => {
      const { result } = renderHook(() => useSkills());

      const results = result.current.getSkillsByCategory('development');

      expect(mockGetSkillsByCategory).toHaveBeenCalledWith('development');
      expect(results).toHaveLength(1);
    });
  });

  describe('execution', () => {
    it('should get system prompt for single active skill', () => {
      const { result } = renderHook(() => useSkills());

      const prompt = result.current.getSystemPrompt();

      expect(prompt).toBe('System prompt for test-skill');
    });

    it('should match skills to query', () => {
      const { result } = renderHook(() => useSkills());

      const matched = result.current.matchSkillsToQuery('test query', 3);

      expect(matched).toHaveLength(1);
    });

    it('should get token estimate', () => {
      const { result } = renderHook(() => useSkills());

      const estimate = result.current.getTokenEstimate();

      expect(estimate).toEqual({ totalTokens: 100, fits: true, excess: 0 });
    });
  });

  describe('utilities', () => {
    it('should get skill by id', () => {
      const { result } = renderHook(() => useSkills());

      const skill = result.current.getSkillById('skill-1');

      expect(mockGetSkill).toHaveBeenCalledWith('skill-1');
      expect(skill).toEqual(mockSkill);
    });

    it('should record usage', () => {
      const { result } = renderHook(() => useSkills());

      act(() => {
        result.current.recordUsage('skill-1', true, 500);
      });

      expect(mockRecordSkillUsage).toHaveBeenCalledWith('skill-1', true, 500);
    });
  });
});

describe('useSkillSystemPrompt', () => {
  it('should return system prompt for active skills', () => {
    const { result } = renderHook(() => useSkillSystemPrompt());

    expect(result.current).toBe('System prompt for test-skill');
  });
});

describe('useAutoMatchSkills', () => {
  it('should return empty array for short queries', () => {
    const { result } = renderHook(() => useAutoMatchSkills('hi'));

    expect(result.current).toEqual([]);
  });

  it('should match skills for valid queries', () => {
    const { result } = renderHook(() => useAutoMatchSkills('test query here'));

    expect(result.current).toHaveLength(1);
  });
});

describe('useSkillTokenBudget', () => {
  it('should return token budget info', () => {
    const { result } = renderHook(() => useSkillTokenBudget(8000));

    expect(result.current).toEqual({ totalTokens: 100, fits: true, excess: 0 });
  });
});
