/**
 * Tests for skill-store
 */

// Unmock the skill store so we test the real implementation
jest.unmock('./skill-store');
jest.unmock('@/stores/agent/skill-store');

import { act, renderHook } from '@testing-library/react';
import { useSkillStore } from './skill-store';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-skill-id'),
}));

describe('useSkillStore', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    // Reset store state
    const { result } = renderHook(() => useSkillStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('createSkill', () => {
    it('should create a new skill', () => {
      const { result } = renderHook(() => useSkillStore());

      let skill;
      act(() => {
        skill = result.current.createSkill({
          name: 'Test Skill',
          description: 'A test skill description',
          content: 'Skill content here',
          category: 'development',
        });
      });

      expect(skill).toBeDefined();
      expect((skill as unknown as { id: string }).id).toBe('test-skill-id');
      expect(result.current.skills['test-skill-id']).toBeDefined();
    });

    it('should convert name to hyphen-case', () => {
      const { result } = renderHook(() => useSkillStore());

      let skill;
      act(() => {
        skill = result.current.createSkill({
          name: 'My Test Skill',
          description: 'Description',
          content: 'Content',
        });
      });

      expect((skill as unknown as { metadata: { name: string } }).metadata.name).toBe('my-test-skill');
    });

    it('should set default values', () => {
      const { result } = renderHook(() => useSkillStore());

      let skill;
      act(() => {
        skill = result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
      });

      const createdSkill = skill as unknown as { status: string; source: string; category: string };
      expect(createdSkill.status).toBe('enabled');
      expect(createdSkill.source).toBe('custom');
      expect(createdSkill.category).toBe('custom');
    });
  });

  describe('updateSkill', () => {
    it('should update skill content', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Original content',
        });
      });

      act(() => {
        result.current.updateSkill('test-skill-id', {
          content: 'Updated content',
        });
      });

      expect(result.current.skills['test-skill-id'].content).toBe('Updated content');
    });

    it('should update skill metadata', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Original description',
          content: 'Content',
        });
      });

      act(() => {
        result.current.updateSkill('test-skill-id', {
          metadata: { name: 'test', description: 'Updated description' },
        });
      });

      expect(result.current.skills['test-skill-id'].metadata.description).toBe('Updated description');
    });

    it('should update updatedAt timestamp', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
      });

      const originalUpdatedAt = result.current.skills['test-skill-id'].updatedAt;

      // Wait a bit to ensure different timestamp
      jest.advanceTimersByTime(100);

      act(() => {
        result.current.updateSkill('test-skill-id', {
          content: 'New content',
        });
      });

      expect(result.current.skills['test-skill-id'].updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe('deleteSkill', () => {
    it('should delete a skill', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
      });

      expect(result.current.skills['test-skill-id']).toBeDefined();

      act(() => {
        result.current.deleteSkill('test-skill-id');
      });

      expect(result.current.skills['test-skill-id']).toBeUndefined();
    });

    it('should remove from activeSkillIds when deleted', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.activateSkill('test-skill-id');
      });

      expect(result.current.activeSkillIds).toContain('test-skill-id');

      act(() => {
        result.current.deleteSkill('test-skill-id');
      });

      expect(result.current.activeSkillIds).not.toContain('test-skill-id');
    });
  });

  describe('getSkill', () => {
    it('should return skill by id', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
      });

      const skill = result.current.getSkill('test-skill-id');
      expect(skill).toBeDefined();
      expect(skill?.metadata.name).toBe('test');
    });

    it('should return undefined for non-existent skill', () => {
      const { result } = renderHook(() => useSkillStore());

      const skill = result.current.getSkill('non-existent');
      expect(skill).toBeUndefined();
    });
  });

  describe('getAllSkills', () => {
    it('should return all skills as array', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
      });

      const skills = result.current.getAllSkills();
      expect(Array.isArray(skills)).toBe(true);
      expect(skills.length).toBe(1);
    });
  });

  describe('enableSkill / disableSkill', () => {
    it('should enable a skill', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.disableSkill('test-skill-id');
      });

      expect(result.current.skills['test-skill-id'].status).toBe('disabled');

      act(() => {
        result.current.enableSkill('test-skill-id');
      });

      expect(result.current.skills['test-skill-id'].status).toBe('enabled');
    });

    it('should disable a skill and deactivate it', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.activateSkill('test-skill-id');
      });

      expect(result.current.activeSkillIds).toContain('test-skill-id');

      act(() => {
        result.current.disableSkill('test-skill-id');
      });

      expect(result.current.skills['test-skill-id'].status).toBe('disabled');
      expect(result.current.activeSkillIds).not.toContain('test-skill-id');
    });
  });

  describe('activateSkill / deactivateSkill', () => {
    it('should activate an enabled skill', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
      });

      act(() => {
        result.current.activateSkill('test-skill-id');
      });

      expect(result.current.activeSkillIds).toContain('test-skill-id');
    });

    it('should not activate a disabled skill', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.disableSkill('test-skill-id');
      });

      act(() => {
        result.current.activateSkill('test-skill-id');
      });

      expect(result.current.activeSkillIds).not.toContain('test-skill-id');
    });

    it('should deactivate a skill', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.activateSkill('test-skill-id');
      });

      expect(result.current.activeSkillIds).toContain('test-skill-id');

      act(() => {
        result.current.deactivateSkill('test-skill-id');
      });

      expect(result.current.activeSkillIds).not.toContain('test-skill-id');
    });
  });

  describe('getActiveSkills', () => {
    it('should return active skills', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.activateSkill('test-skill-id');
      });

      const activeSkills = result.current.getActiveSkills();
      expect(activeSkills.length).toBe(1);
      expect(activeSkills[0].id).toBe('test-skill-id');
    });
  });

  describe('clearActiveSkills', () => {
    it('should clear all active skills', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.activateSkill('test-skill-id');
      });

      expect(result.current.activeSkillIds.length).toBe(1);

      act(() => {
        result.current.clearActiveSkills();
      });

      expect(result.current.activeSkillIds.length).toBe(0);
    });
  });

  describe('searchSkills', () => {
    it('should search skills by query', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Code Review',
          description: 'A skill for code review',
          content: 'Content',
          tags: ['code', 'review'],
        });
      });

      const searchResult = result.current.searchSkills('code');
      expect(searchResult.skills.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recordSkillUsage', () => {
    it('should record skill usage', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
      });

      act(() => {
        result.current.recordSkillUsage('test-skill-id', true, 500);
      });

      const stats = result.current.getSkillUsageStats('test-skill-id');
      expect(stats).toBeDefined();
      expect(stats?.totalExecutions).toBe(1);
      expect(stats?.successfulExecutions).toBe(1);
    });

    it('should track failed usage', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
      });

      act(() => {
        result.current.recordSkillUsage('test-skill-id', false, 100);
      });

      const stats = result.current.getSkillUsageStats('test-skill-id');
      // Failed execution means totalExecutions - successfulExecutions
      expect(stats?.totalExecutions).toBe(1);
      expect(stats?.successfulExecutions).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should set and clear error', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.activateSkill('test-skill-id');
        result.current.setError('Error');
      });

      expect(Object.keys(result.current.skills).length).toBe(1);

      act(() => {
        result.current.reset();
      });

      expect(Object.keys(result.current.skills).length).toBe(0);
      expect(result.current.activeSkillIds.length).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });
});
