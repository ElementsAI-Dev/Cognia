/**
 * Tests for Project Repository
 */

import 'fake-indexeddb/auto';
import { db } from '../schema';
import { projectRepository } from './project-repository';

describe('projectRepository', () => {
  beforeEach(async () => {
    await db.projects.clear();
    await db.knowledgeFiles.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('create', () => {
    it('creates a project with required fields', async () => {
      const project = await projectRepository.create({
        name: 'Test Project',
      });

      expect(project.id).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.sessionIds).toEqual([]);
      expect(project.knowledgeBase).toEqual([]);
      expect(project.sessionCount).toBe(0);
      expect(project.messageCount).toBe(0);
    });

    it('creates a project with optional fields', async () => {
      const project = await projectRepository.create({
        name: 'Test Project',
        description: 'A test project',
        icon: 'Folder',
        color: '#3B82F6',
        customInstructions: 'Be helpful',
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o',
        defaultMode: 'chat',
      });

      expect(project.description).toBe('A test project');
      expect(project.icon).toBe('Folder');
      expect(project.color).toBe('#3B82F6');
      expect(project.customInstructions).toBe('Be helpful');
      expect(project.defaultProvider).toBe('openai');
      expect(project.defaultModel).toBe('gpt-4o');
      expect(project.defaultMode).toBe('chat');
    });
  });

  describe('getById', () => {
    it('returns project when found', async () => {
      const created = await projectRepository.create({
        name: 'Test Project',
      });

      const found = await projectRepository.getById(created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test Project');
    });

    it('returns undefined when not found', async () => {
      const found = await projectRepository.getById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns all projects sorted by lastAccessedAt', async () => {
      await projectRepository.create({ name: 'Project A' });
      await projectRepository.create({ name: 'Project B' });

      const all = await projectRepository.getAll();
      expect(all).toHaveLength(2);
    });

    it('returns empty array when no projects', async () => {
      const all = await projectRepository.getAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('updates project fields', async () => {
      const created = await projectRepository.create({
        name: 'Original',
      });

      const updated = await projectRepository.update(created.id, {
        name: 'Updated',
        description: 'New description',
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.description).toBe('New description');
    });

    it('returns undefined for non-existent project', async () => {
      const result = await projectRepository.update('non-existent', {
        name: 'Test',
      });
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes a project and its knowledge files', async () => {
      const created = await projectRepository.create({
        name: 'Test Project',
      });

      await projectRepository.addKnowledgeFile(created.id, {
        name: 'test.md',
        type: 'markdown',
        content: '# Test',
        size: 6,
      });

      await projectRepository.delete(created.id);

      const found = await projectRepository.getById(created.id);
      expect(found).toBeUndefined();

      const files = await projectRepository.getKnowledgeFiles(created.id);
      expect(files).toHaveLength(0);
    });
  });

  describe('touch', () => {
    it('updates lastAccessedAt', async () => {
      const created = await projectRepository.create({
        name: 'Test Project',
      });

      const originalAccess = created.lastAccessedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));
      await projectRepository.touch(created.id);

      const updated = await projectRepository.getById(created.id);
      expect(updated?.lastAccessedAt.getTime()).toBeGreaterThan(originalAccess.getTime());
    });
  });

  describe('addSession', () => {
    it('adds a session to the project', async () => {
      const created = await projectRepository.create({
        name: 'Test Project',
      });

      await projectRepository.addSession(created.id, 'session-1');

      const updated = await projectRepository.getById(created.id);
      expect(updated?.sessionIds).toContain('session-1');
      expect(updated?.sessionCount).toBe(1);
    });

    it('does not add duplicate sessions', async () => {
      const created = await projectRepository.create({
        name: 'Test Project',
      });

      await projectRepository.addSession(created.id, 'session-1');
      await projectRepository.addSession(created.id, 'session-1');

      const updated = await projectRepository.getById(created.id);
      expect(updated?.sessionIds).toHaveLength(1);
    });
  });

  describe('removeSession', () => {
    it('removes a session from the project', async () => {
      const created = await projectRepository.create({
        name: 'Test Project',
      });

      await projectRepository.addSession(created.id, 'session-1');
      await projectRepository.addSession(created.id, 'session-2');
      await projectRepository.removeSession(created.id, 'session-1');

      const updated = await projectRepository.getById(created.id);
      expect(updated?.sessionIds).not.toContain('session-1');
      expect(updated?.sessionIds).toContain('session-2');
      expect(updated?.sessionCount).toBe(1);
    });
  });

  describe('searchByName', () => {
    it('finds projects by name', async () => {
      await projectRepository.create({ name: 'Test Project' });
      await projectRepository.create({ name: 'Production Project' });
      await projectRepository.create({ name: 'Dev Work' });

      const results = await projectRepository.searchByName('Project');
      expect(results).toHaveLength(2);
    });
  });

  describe('knowledge files', () => {
    describe('addKnowledgeFile', () => {
      it('adds a knowledge file to project', async () => {
        const project = await projectRepository.create({
          name: 'Test Project',
        });

        const file = await projectRepository.addKnowledgeFile(project.id, {
          name: 'test.md',
          type: 'markdown',
          content: '# Test',
          size: 6,
        });

        expect(file.id).toBeDefined();
        expect(file.name).toBe('test.md');
        expect(file.type).toBe('markdown');
      });
    });

    describe('getKnowledgeFiles', () => {
      it('returns all knowledge files for a project', async () => {
        const project = await projectRepository.create({
          name: 'Test Project',
        });

        await projectRepository.addKnowledgeFile(project.id, {
          name: 'a.md',
          type: 'markdown',
          content: 'A',
          size: 1,
        });
        await projectRepository.addKnowledgeFile(project.id, {
          name: 'b.md',
          type: 'markdown',
          content: 'B',
          size: 1,
        });

        const files = await projectRepository.getKnowledgeFiles(project.id);
        expect(files).toHaveLength(2);
      });
    });

    describe('updateKnowledgeFile', () => {
      it('updates a knowledge file', async () => {
        const project = await projectRepository.create({
          name: 'Test Project',
        });

        const file = await projectRepository.addKnowledgeFile(project.id, {
          name: 'test.md',
          type: 'markdown',
          content: 'Original',
          size: 8,
        });

        const updated = await projectRepository.updateKnowledgeFile(file.id, {
          content: 'Updated',
          size: 7,
        });

        expect(updated?.content).toBe('Updated');
        expect(updated?.size).toBe(7);
      });
    });

    describe('deleteKnowledgeFile', () => {
      it('deletes a knowledge file', async () => {
        const project = await projectRepository.create({
          name: 'Test Project',
        });

        const file = await projectRepository.addKnowledgeFile(project.id, {
          name: 'test.md',
          type: 'markdown',
          content: 'Test',
          size: 4,
        });

        await projectRepository.deleteKnowledgeFile(file.id);

        const found = await projectRepository.getKnowledgeFile(file.id);
        expect(found).toBeUndefined();
      });
    });

    describe('bulkAddKnowledgeFiles', () => {
      it('adds multiple knowledge files', async () => {
        const project = await projectRepository.create({
          name: 'Test Project',
        });

        const files = await projectRepository.bulkAddKnowledgeFiles(project.id, [
          { name: 'a.md', type: 'markdown', content: 'A', size: 1 },
          { name: 'b.md', type: 'markdown', content: 'B', size: 1 },
        ]);

        expect(files).toHaveLength(2);

        const allFiles = await projectRepository.getKnowledgeFiles(project.id);
        expect(allFiles).toHaveLength(2);
      });
    });

    describe('clearKnowledgeFiles', () => {
      it('removes all knowledge files for a project', async () => {
        const project = await projectRepository.create({
          name: 'Test Project',
        });

        await projectRepository.addKnowledgeFile(project.id, {
          name: 'a.md',
          type: 'markdown',
          content: 'A',
          size: 1,
        });
        await projectRepository.addKnowledgeFile(project.id, {
          name: 'b.md',
          type: 'markdown',
          content: 'B',
          size: 1,
        });

        await projectRepository.clearKnowledgeFiles(project.id);

        const files = await projectRepository.getKnowledgeFiles(project.id);
        expect(files).toHaveLength(0);
      });
    });

    describe('getKnowledgeFilesSize', () => {
      it('returns total size of knowledge files', async () => {
        const project = await projectRepository.create({
          name: 'Test Project',
        });

        await projectRepository.addKnowledgeFile(project.id, {
          name: 'a.md',
          type: 'markdown',
          content: 'AAA',
          size: 100,
        });
        await projectRepository.addKnowledgeFile(project.id, {
          name: 'b.md',
          type: 'markdown',
          content: 'BBB',
          size: 200,
        });

        const size = await projectRepository.getKnowledgeFilesSize(project.id);
        expect(size).toBe(300);
      });
    });
  });

  describe('getCount', () => {
    it('returns correct count', async () => {
      await projectRepository.create({ name: 'Project 1' });
      await projectRepository.create({ name: 'Project 2' });

      const count = await projectRepository.getCount();
      expect(count).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all projects and knowledge files', async () => {
      const project = await projectRepository.create({ name: 'Test Project' });
      await projectRepository.addKnowledgeFile(project.id, {
        name: 'test.md',
        type: 'markdown',
        content: 'Test',
        size: 4,
      });

      await projectRepository.clear();

      const count = await projectRepository.getCount();
      expect(count).toBe(0);
    });
  });
});
