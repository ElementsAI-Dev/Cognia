/**
 * Tests for Video Project Repository
 */

import 'fake-indexeddb/auto';
import { db } from '../schema';
import { videoProjectRepository, type VideoProjectData } from './video-project-repository';

const makeProject = (overrides?: Partial<VideoProjectData>): VideoProjectData => ({
  id: 'proj-1',
  name: 'Test Project',
  resolution: { width: 1920, height: 1080 },
  frameRate: 30,
  aspectRatio: '16:9',
  tracks: [],
  duration: 60,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

beforeEach(async () => {
  await db.videoProjects.clear();
});

afterAll(async () => {
  await db.close();
});

describe('videoProjectRepository', () => {
  describe('create', () => {
    it('should create a video project', async () => {
      const project = makeProject();
      const result = await videoProjectRepository.create(project);

      expect(result.id).toBe('proj-1');
      expect(result.name).toBe('Test Project');

      const stored = await db.videoProjects.get('proj-1');
      expect(stored).toBeDefined();
      expect(stored?.name).toBe('Test Project');
      expect(stored?.frameRate).toBe(30);
    });

    it('should serialize resolution and tracks as JSON', async () => {
      const project = makeProject({
        resolution: { width: 3840, height: 2160 },
        tracks: [{ id: 't1', name: 'Video', type: 'video', clips: [], muted: false, locked: false, visible: true, volume: 1, height: 60 }] as never[],
      });
      await videoProjectRepository.create(project);

      const stored = await db.videoProjects.get('proj-1');
      expect(typeof stored?.resolution).toBe('string');
      expect(JSON.parse(stored!.resolution)).toEqual({ width: 3840, height: 2160 });
      expect(typeof stored?.tracks).toBe('string');
      expect(JSON.parse(stored!.tracks)).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('should return a project by ID', async () => {
      await videoProjectRepository.create(makeProject());
      const result = await videoProjectRepository.getById('proj-1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Project');
      expect(result?.resolution).toEqual({ width: 1920, height: 1080 });
      expect(result?.tracks).toEqual([]);
    });

    it('should return undefined for non-existent ID', async () => {
      const result = await videoProjectRepository.getById('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all projects sorted by updatedAt desc', async () => {
      await videoProjectRepository.create(makeProject({ id: 'p1', name: 'First', updatedAt: new Date('2025-01-01') }));
      await videoProjectRepository.create(makeProject({ id: 'p2', name: 'Second', updatedAt: new Date('2025-06-01') }));
      await videoProjectRepository.create(makeProject({ id: 'p3', name: 'Third', updatedAt: new Date('2025-03-01') }));

      const results = await videoProjectRepository.getAll();
      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('Second');
      expect(results[1].name).toBe('Third');
      expect(results[2].name).toBe('First');
    });

    it('should return empty array when no projects exist', async () => {
      const results = await videoProjectRepository.getAll();
      expect(results).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update project fields', async () => {
      await videoProjectRepository.create(makeProject());

      const result = await videoProjectRepository.update('proj-1', {
        name: 'Updated Name',
        frameRate: 60,
        duration: 120,
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Name');
      expect(result?.frameRate).toBe(60);
      expect(result?.duration).toBe(120);
    });

    it('should update resolution as JSON', async () => {
      await videoProjectRepository.create(makeProject());

      const result = await videoProjectRepository.update('proj-1', {
        resolution: { width: 1280, height: 720 },
      });

      expect(result?.resolution).toEqual({ width: 1280, height: 720 });
    });

    it('should return undefined for non-existent project', async () => {
      const result = await videoProjectRepository.update('nonexistent', { name: 'Nope' });
      expect(result).toBeUndefined();
    });

    it('should update the updatedAt timestamp', async () => {
      await videoProjectRepository.create(makeProject({ updatedAt: new Date('2025-01-01') }));

      await new Promise((r) => setTimeout(r, 10));
      await videoProjectRepository.update('proj-1', { name: 'Touched' });
      const after = await videoProjectRepository.getById('proj-1');

      // The updatedAt should be newer than the original
      const afterTime = new Date(after!.updatedAt).getTime();
      expect(afterTime).toBeGreaterThan(new Date('2025-01-01').getTime());
    });
  });

  describe('delete', () => {
    it('should delete a project', async () => {
      await videoProjectRepository.create(makeProject());
      await videoProjectRepository.delete('proj-1');

      const result = await videoProjectRepository.getById('proj-1');
      expect(result).toBeUndefined();
    });

    it('should not throw when deleting non-existent project', async () => {
      await expect(videoProjectRepository.delete('nonexistent')).resolves.not.toThrow();
    });
  });
});
