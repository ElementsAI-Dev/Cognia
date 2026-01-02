/**
 * Tests for Project Store
 */

import { act } from '@testing-library/react';
import { useProjectStore, selectProjects, selectActiveProjectId } from './project-store';

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      activeProjectId: null,
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useProjectStore.getState();
      expect(state.projects).toEqual([]);
      expect(state.activeProjectId).toBeNull();
    });
  });

  describe('createProject', () => {
    it('should create project with required fields', () => {
      let project;
      act(() => {
        project = useProjectStore.getState().createProject({ name: 'Test Project' });
      });

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.activeProjectId).toBe(project!.id);
      expect(project!.name).toBe('Test Project');
      expect(project!.isArchived).toBe(false);
      expect(project!.knowledgeBase).toEqual([]);
      expect(project!.sessionIds).toEqual([]);
    });

    it('should create project with custom values', () => {
      let project;
      act(() => {
        project = useProjectStore.getState().createProject({
          name: 'Custom Project',
          description: 'A test project',
          icon: 'Star',
          color: '#FF0000',
          tags: ['test', 'demo'],
          customInstructions: 'Be helpful',
        });
      });

      expect(project!.description).toBe('A test project');
      expect(project!.icon).toBe('Star');
      expect(project!.color).toBe('#FF0000');
      expect(project!.tags).toEqual(['test', 'demo']);
      expect(project!.customInstructions).toBe('Be helpful');
    });
  });

  describe('deleteProject', () => {
    it('should delete project', () => {
      let project;
      act(() => {
        project = useProjectStore.getState().createProject({ name: 'To Delete' });
      });

      act(() => {
        useProjectStore.getState().deleteProject(project!.id);
      });

      expect(useProjectStore.getState().projects).toHaveLength(0);
      expect(useProjectStore.getState().activeProjectId).toBeNull();
    });
  });

  describe('updateProject', () => {
    it('should update project properties', () => {
      let project;
      act(() => {
        project = useProjectStore.getState().createProject({ name: 'Original' });
      });

      act(() => {
        useProjectStore.getState().updateProject(project!.id, { name: 'Updated' });
      });

      expect(useProjectStore.getState().projects[0].name).toBe('Updated');
    });
  });

  describe('duplicateProject', () => {
    it('should duplicate project', () => {
      let original;
      act(() => {
        original = useProjectStore.getState().createProject({
          name: 'Original',
          description: 'Test',
          tags: ['tag1'],
        });
      });

      let duplicate;
      act(() => {
        duplicate = useProjectStore.getState().duplicateProject(original!.id);
      });

      expect(duplicate).not.toBeNull();
      expect(duplicate!.name).toBe('Original (copy)');
      expect(duplicate!.description).toBe('Test');
      expect(duplicate!.tags).toEqual(['tag1']);
      expect(duplicate!.sessionIds).toEqual([]);
    });

    it('should return null for non-existent project', () => {
      const duplicate = useProjectStore.getState().duplicateProject('non-existent');
      expect(duplicate).toBeNull();
    });
  });

  describe('session management', () => {
    let projectId: string;

    beforeEach(() => {
      act(() => {
        const project = useProjectStore.getState().createProject({ name: 'Test' });
        projectId = project.id;
      });
    });

    it('should add session to project', () => {
      act(() => {
        useProjectStore.getState().addSessionToProject(projectId, 'session-1');
      });

      const project = useProjectStore.getState().projects[0];
      expect(project.sessionIds).toContain('session-1');
      expect(project.sessionCount).toBe(1);
    });

    it('should not add duplicate session', () => {
      act(() => {
        useProjectStore.getState().addSessionToProject(projectId, 'session-1');
        useProjectStore.getState().addSessionToProject(projectId, 'session-1');
      });

      expect(useProjectStore.getState().projects[0].sessionIds).toHaveLength(1);
    });

    it('should remove session from project', () => {
      act(() => {
        useProjectStore.getState().addSessionToProject(projectId, 'session-1');
        useProjectStore.getState().removeSessionFromProject(projectId, 'session-1');
      });

      expect(useProjectStore.getState().projects[0].sessionIds).toHaveLength(0);
    });

    it('should get project for session', () => {
      act(() => {
        useProjectStore.getState().addSessionToProject(projectId, 'session-1');
      });

      const project = useProjectStore.getState().getProjectForSession('session-1');
      expect(project?.id).toBe(projectId);
    });
  });

  describe('knowledge base management', () => {
    let projectId: string;

    beforeEach(() => {
      act(() => {
        const project = useProjectStore.getState().createProject({ name: 'Test' });
        projectId = project.id;
      });
    });

    it('should add knowledge file', () => {
      act(() => {
        useProjectStore.getState().addKnowledgeFile(projectId, {
          name: 'test.txt',
          type: 'text',
          content: 'Test content',
          size: 12,
          mimeType: 'text/plain',
        });
      });

      const project = useProjectStore.getState().projects[0];
      expect(project.knowledgeBase).toHaveLength(1);
      expect(project.knowledgeBase[0].name).toBe('test.txt');
    });

    it('should remove knowledge file', () => {
      act(() => {
        useProjectStore.getState().addKnowledgeFile(projectId, {
          name: 'test.txt',
          type: 'text',
          content: 'Test content',
          size: 12,
          mimeType: 'text/plain',
        });
      });

      const fileId = useProjectStore.getState().projects[0].knowledgeBase[0].id;

      act(() => {
        useProjectStore.getState().removeKnowledgeFile(projectId, fileId);
      });

      expect(useProjectStore.getState().projects[0].knowledgeBase).toHaveLength(0);
    });

    it('should update knowledge file', () => {
      act(() => {
        useProjectStore.getState().addKnowledgeFile(projectId, {
          name: 'test.txt',
          type: 'text',
          content: 'Original',
          size: 8,
          mimeType: 'text/plain',
        });
      });

      const fileId = useProjectStore.getState().projects[0].knowledgeBase[0].id;

      act(() => {
        useProjectStore.getState().updateKnowledgeFile(projectId, fileId, 'Updated content');
      });

      const file = useProjectStore.getState().projects[0].knowledgeBase[0];
      expect(file.content).toBe('Updated content');
      expect(file.size).toBe(15);
    });
  });

  describe('tag management', () => {
    let projectId: string;

    beforeEach(() => {
      act(() => {
        const project = useProjectStore.getState().createProject({ name: 'Test' });
        projectId = project.id;
      });
    });

    it('should add tag', () => {
      act(() => {
        useProjectStore.getState().addTag(projectId, 'new-tag');
      });

      expect(useProjectStore.getState().projects[0].tags).toContain('new-tag');
    });

    it('should not add duplicate tag', () => {
      act(() => {
        useProjectStore.getState().addTag(projectId, 'tag1');
        useProjectStore.getState().addTag(projectId, 'tag1');
      });

      expect(useProjectStore.getState().projects[0].tags?.filter(t => t === 'tag1')).toHaveLength(1);
    });

    it('should remove tag', () => {
      act(() => {
        useProjectStore.getState().addTag(projectId, 'tag1');
        useProjectStore.getState().removeTag(projectId, 'tag1');
      });

      expect(useProjectStore.getState().projects[0].tags).not.toContain('tag1');
    });

    it('should set all tags', () => {
      act(() => {
        useProjectStore.getState().setTags(projectId, ['a', 'b', 'c']);
      });

      expect(useProjectStore.getState().projects[0].tags).toEqual(['a', 'b', 'c']);
    });
  });

  describe('archive management', () => {
    let projectId: string;

    beforeEach(() => {
      act(() => {
        const project = useProjectStore.getState().createProject({ name: 'Test' });
        projectId = project.id;
      });
    });

    it('should archive project', () => {
      act(() => {
        useProjectStore.getState().archiveProject(projectId);
      });

      expect(useProjectStore.getState().projects[0].isArchived).toBe(true);
      expect(useProjectStore.getState().projects[0].archivedAt).toBeInstanceOf(Date);
    });

    it('should unarchive project', () => {
      act(() => {
        useProjectStore.getState().archiveProject(projectId);
        useProjectStore.getState().unarchiveProject(projectId);
      });

      expect(useProjectStore.getState().projects[0].isArchived).toBe(false);
      expect(useProjectStore.getState().projects[0].archivedAt).toBeUndefined();
    });

    it('should get archived projects', () => {
      act(() => {
        useProjectStore.getState().createProject({ name: 'Active' });
        useProjectStore.getState().archiveProject(projectId);
      });

      expect(useProjectStore.getState().getArchivedProjects()).toHaveLength(1);
      expect(useProjectStore.getState().getActiveProjects()).toHaveLength(1);
    });
  });

  describe('selectors', () => {
    it('should get all tags', () => {
      act(() => {
        useProjectStore.getState().createProject({ name: 'P1', tags: ['a', 'b'] });
        useProjectStore.getState().createProject({ name: 'P2', tags: ['b', 'c'] });
      });

      expect(useProjectStore.getState().getAllTags()).toEqual(['a', 'b', 'c']);
    });

    it('should get projects by tag', () => {
      act(() => {
        useProjectStore.getState().createProject({ name: 'P1', tags: ['shared'] });
        useProjectStore.getState().createProject({ name: 'P2', tags: ['shared'] });
        useProjectStore.getState().createProject({ name: 'P3', tags: ['other'] });
      });

      expect(useProjectStore.getState().getProjectsByTag('shared')).toHaveLength(2);
    });

    it('should select projects', () => {
      act(() => {
        useProjectStore.getState().createProject({ name: 'Test' });
      });

      expect(selectProjects(useProjectStore.getState())).toHaveLength(1);
    });

    it('should select active project id', () => {
      let project;
      act(() => {
        project = useProjectStore.getState().createProject({ name: 'Test' });
      });

      expect(selectActiveProjectId(useProjectStore.getState())).toBe(project!.id);
    });
  });
});
