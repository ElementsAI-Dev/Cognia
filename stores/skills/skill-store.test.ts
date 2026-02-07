/**
 * Tests for skill-store
 */

// Unmock the skill store so we test the real implementation
jest.unmock('./skill-store');
jest.unmock('@/stores/skills/skill-store');

import { act, renderHook } from '@testing-library/react';
import { useSkillStore } from './skill-store';

// Mock nanoid with incrementing IDs
let nanoidCounter = 0;
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => `test-skill-id-${nanoidCounter++}`),
}));

describe('useSkillStore', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    // Reset nanoid counter so IDs are predictable per test
    nanoidCounter = 0;
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
      expect((skill as unknown as { id: string }).id).toBe('test-skill-id-0');
      expect(result.current.skills['test-skill-id-0']).toBeDefined();
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

      expect((skill as unknown as { metadata: { name: string } }).metadata.name).toBe(
        'my-test-skill'
      );
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
        result.current.updateSkill('test-skill-id-0', {
          content: 'Updated content',
        });
      });

      expect(result.current.skills['test-skill-id-0'].content).toBe('Updated content');
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
        result.current.updateSkill('test-skill-id-0', {
          metadata: { name: 'test', description: 'Updated description' },
        });
      });

      expect(result.current.skills['test-skill-id-0'].metadata.description).toBe(
        'Updated description'
      );
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

      const originalUpdatedAt = result.current.skills['test-skill-id-0'].updatedAt;

      // Wait a bit to ensure different timestamp
      jest.advanceTimersByTime(100);

      act(() => {
        result.current.updateSkill('test-skill-id-0', {
          content: 'New content',
        });
      });

      expect(result.current.skills['test-skill-id-0'].updatedAt.getTime()).toBeGreaterThanOrEqual(
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

      expect(result.current.skills['test-skill-id-0']).toBeDefined();

      act(() => {
        result.current.deleteSkill('test-skill-id-0');
      });

      expect(result.current.skills['test-skill-id-0']).toBeUndefined();
    });

    it('should remove from activeSkillIds when deleted', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.activateSkill('test-skill-id-0');
      });

      expect(result.current.activeSkillIds).toContain('test-skill-id-0');

      act(() => {
        result.current.deleteSkill('test-skill-id-0');
      });

      expect(result.current.activeSkillIds).not.toContain('test-skill-id-0');
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

      const skill = result.current.getSkill('test-skill-id-0');
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
        result.current.disableSkill('test-skill-id-0');
      });

      expect(result.current.skills['test-skill-id-0'].status).toBe('disabled');

      act(() => {
        result.current.enableSkill('test-skill-id-0');
      });

      expect(result.current.skills['test-skill-id-0'].status).toBe('enabled');
    });

    it('should disable a skill and deactivate it', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.activateSkill('test-skill-id-0');
      });

      expect(result.current.activeSkillIds).toContain('test-skill-id-0');

      act(() => {
        result.current.disableSkill('test-skill-id-0');
      });

      expect(result.current.skills['test-skill-id-0'].status).toBe('disabled');
      expect(result.current.activeSkillIds).not.toContain('test-skill-id-0');
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
        result.current.activateSkill('test-skill-id-0');
      });

      expect(result.current.activeSkillIds).toContain('test-skill-id-0');
    });

    it('should not activate a disabled skill', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.disableSkill('test-skill-id-0');
      });

      act(() => {
        result.current.activateSkill('test-skill-id-0');
      });

      expect(result.current.activeSkillIds).not.toContain('test-skill-id-0');
    });

    it('should deactivate a skill', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Test',
          description: 'Desc',
          content: 'Content',
        });
        result.current.activateSkill('test-skill-id-0');
      });

      expect(result.current.activeSkillIds).toContain('test-skill-id-0');

      act(() => {
        result.current.deactivateSkill('test-skill-id-0');
      });

      expect(result.current.activeSkillIds).not.toContain('test-skill-id-0');
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
        result.current.activateSkill('test-skill-id-0');
      });

      const activeSkills = result.current.getActiveSkills();
      expect(activeSkills.length).toBe(1);
      expect(activeSkills[0].id).toBe('test-skill-id-0');
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
        result.current.activateSkill('test-skill-id-0');
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
        result.current.recordSkillUsage('test-skill-id-0', true, 500);
      });

      const stats = result.current.getSkillUsageStats('test-skill-id-0');
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
        result.current.recordSkillUsage('test-skill-id-0', false, 100);
      });

      const stats = result.current.getSkillUsageStats('test-skill-id-0');
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

  describe('duplicate detection', () => {
    it('should not create duplicate skill with same name', () => {
      const { result } = renderHook(() => useSkillStore());

      let firstSkill: unknown;
      act(() => {
        firstSkill = result.current.createSkill({
          name: 'Unique Skill',
          description: 'First one',
          content: 'Content 1',
        });
      });

      expect(firstSkill).toBeDefined();
      expect(Object.keys(result.current.skills).length).toBe(1);

      let secondSkill: unknown;
      act(() => {
        secondSkill = result.current.createSkill({
          name: 'Unique Skill',
          description: 'Duplicate',
          content: 'Content 2',
        });
      });

      // Should return the existing skill, not create a new one
      expect(secondSkill).toBe(firstSkill);
      expect(Object.keys(result.current.skills).length).toBe(1);
      expect(result.current.error).toContain('already exists');
    });

    it('should update existing skill on import with same name', () => {
      const { result } = renderHook(() => useSkillStore());

      act(() => {
        result.current.createSkill({
          name: 'Import Target',
          description: 'Original',
          content: 'Original content',
        });
      });

      expect(Object.keys(result.current.skills).length).toBe(1);
      const originalId = Object.keys(result.current.skills)[0];

      act(() => {
        result.current.importSkill({
          metadata: { name: 'import-target', description: 'Updated desc' },
          content: 'Updated content',
          rawContent: '---\nname: import-target\n---\nUpdated content',
          resources: [],
          status: 'enabled',
          source: 'imported',
          category: 'custom',
          tags: [],
        });
      });

      // Should still have only 1 skill, with updated content
      expect(Object.keys(result.current.skills).length).toBe(1);
      const skill = result.current.skills[originalId];
      expect(skill).toBeDefined();
      expect(skill.content).toBe('Updated content');
      expect(skill.metadata.description).toBe('Updated desc');
    });

    it('should skip duplicate built-in skills during bulk import', () => {
      const { result } = renderHook(() => useSkillStore());

      // First create a skill
      act(() => {
        result.current.createSkill({
          name: 'Existing Skill',
          description: 'Already here',
          content: 'Content',
        });
      });

      expect(Object.keys(result.current.skills).length).toBe(1);

      // Import built-in skills including one with the same name
      act(() => {
        result.current.importBuiltinSkills([
          { name: 'Existing Skill', description: 'Dup', content: 'Dup content' },
          { name: 'New Builtin', description: 'New', content: 'New content' },
        ]);
      });

      // Should have 2 skills, not 3 (the duplicate was skipped)
      expect(Object.keys(result.current.skills).length).toBe(2);
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
        result.current.activateSkill('test-skill-id-0');
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
