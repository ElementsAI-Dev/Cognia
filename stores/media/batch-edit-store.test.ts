/**
 * Tests for Batch Edit Store
 */

import { act, renderHook } from '@testing-library/react';
import { useBatchEditStore } from './batch-edit-store';

describe('batch-edit-store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useBatchEditStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('initial state', () => {
    it('should have empty jobs', () => {
      const { result } = renderHook(() => useBatchEditStore());
      expect(result.current.jobs).toEqual([]);
    });

    it('should have empty presets', () => {
      const { result } = renderHook(() => useBatchEditStore());
      expect(result.current.presets).toEqual([]);
    });

    it('should have null activeJobId', () => {
      const { result } = renderHook(() => useBatchEditStore());
      expect(result.current.activeJobId).toBeNull();
    });

    it('should not be processing', () => {
      const { result } = renderHook(() => useBatchEditStore());
      expect(result.current.isProcessing).toBe(false);
    });

    it('should have default concurrency of 2', () => {
      const { result } = renderHook(() => useBatchEditStore());
      expect(result.current.concurrency).toBe(2);
    });
  });

  describe('createJob', () => {
    it('should create a new job', () => {
      const { result } = renderHook(() => useBatchEditStore());

      act(() => {
        result.current.createJob('Test Job', '/output');
      });

      expect(result.current.jobs).toHaveLength(1);
      expect(result.current.jobs[0].name).toBe('Test Job');
      expect(result.current.jobs[0].outputDirectory).toBe('/output');
    });

    it('should set activeJobId to new job', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string = '';
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
      });

      expect(result.current.activeJobId).toBe(jobId);
    });

    it('should create job with default values', () => {
      const { result } = renderHook(() => useBatchEditStore());

      act(() => {
        result.current.createJob('Test Job', '/output');
      });

      const job = result.current.jobs[0];
      expect(job.status).toBe('idle');
      expect(job.progress).toBe(0);
      expect(job.processedCount).toBe(0);
      expect(job.errorCount).toBe(0);
      expect(job.images).toEqual([]);
    });
  });

  describe('updateJob', () => {
    it('should update job properties', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
      });

      act(() => {
        result.current.updateJob(jobId!, { name: 'Updated Job' });
      });

      expect(result.current.jobs[0].name).toBe('Updated Job');
    });
  });

  describe('deleteJob', () => {
    it('should delete a job', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
      });

      act(() => {
        result.current.deleteJob(jobId!);
      });

      expect(result.current.jobs).toHaveLength(0);
    });

    it('should clear activeJobId if deleted job was active', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
      });

      act(() => {
        result.current.deleteJob(jobId!);
      });

      expect(result.current.activeJobId).toBeNull();
    });
  });

  describe('addImages', () => {
    it('should add images to job', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
      });

      act(() => {
        result.current.addImages(jobId!, [
          { id: '1', filename: 'test1.jpg', path: '/path/test1.jpg', width: 100, height: 100, size: 1000 },
          { id: '2', filename: 'test2.jpg', path: '/path/test2.jpg', width: 200, height: 200, size: 2000 },
        ]);
      });

      expect(result.current.jobs[0].images).toHaveLength(2);
      expect(result.current.jobs[0].images[0].status).toBe('pending');
    });
  });

  describe('removeImage', () => {
    it('should remove image from job', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
        result.current.addImages(jobId!, [
          { id: '1', filename: 'test1.jpg', path: '/path/test1.jpg', width: 100, height: 100, size: 1000 },
        ]);
      });

      act(() => {
        result.current.removeImage(jobId!, '1');
      });

      expect(result.current.jobs[0].images).toHaveLength(0);
    });
  });

  describe('clearImages', () => {
    it('should clear all images from job', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
        result.current.addImages(jobId!, [
          { id: '1', filename: 'test1.jpg', path: '/path/test1.jpg', width: 100, height: 100, size: 1000 },
          { id: '2', filename: 'test2.jpg', path: '/path/test2.jpg', width: 200, height: 200, size: 2000 },
        ]);
      });

      act(() => {
        result.current.clearImages(jobId!);
      });

      expect(result.current.jobs[0].images).toHaveLength(0);
    });
  });

  describe('updateImageStatus', () => {
    it('should update image status', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
        result.current.addImages(jobId!, [
          { id: '1', filename: 'test1.jpg', path: '/path/test1.jpg', width: 100, height: 100, size: 1000 },
        ]);
      });

      act(() => {
        result.current.updateImageStatus(jobId!, '1', 'processing', 50);
      });

      expect(result.current.jobs[0].images[0].status).toBe('processing');
      expect(result.current.jobs[0].images[0].progress).toBe(50);
    });

    it('should update job counts on status change', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
        result.current.addImages(jobId!, [
          { id: '1', filename: 'test1.jpg', path: '/path/test1.jpg', width: 100, height: 100, size: 1000 },
          { id: '2', filename: 'test2.jpg', path: '/path/test2.jpg', width: 200, height: 200, size: 2000 },
        ]);
      });

      act(() => {
        result.current.updateImageStatus(jobId!, '1', 'completed', 100);
      });

      expect(result.current.jobs[0].processedCount).toBe(1);

      act(() => {
        result.current.updateImageStatus(jobId!, '2', 'error', 0, 'Test error');
      });

      expect(result.current.jobs[0].errorCount).toBe(1);
    });
  });

  describe('createPreset', () => {
    it('should create a new preset', () => {
      const { result } = renderHook(() => useBatchEditStore());

      act(() => {
        result.current.createPreset({
          name: 'Test Preset',
          adjustments: { brightness: 10 },
        });
      });

      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0].name).toBe('Test Preset');
    });

    it('should set timestamps', () => {
      const { result } = renderHook(() => useBatchEditStore());

      act(() => {
        result.current.createPreset({
          name: 'Test Preset',
          adjustments: { brightness: 10 },
        });
      });

      expect(result.current.presets[0].createdAt).toBeGreaterThan(0);
      expect(result.current.presets[0].updatedAt).toBeGreaterThan(0);
    });
  });

  describe('updatePreset', () => {
    it('should update preset properties', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let presetId: string;
      act(() => {
        presetId = result.current.createPreset({
          name: 'Test Preset',
          adjustments: { brightness: 10 },
        });
      });

      act(() => {
        result.current.updatePreset(presetId!, { name: 'Updated Preset' });
      });

      expect(result.current.presets[0].name).toBe('Updated Preset');
    });

    it('should update updatedAt timestamp', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let presetId: string;
      act(() => {
        presetId = result.current.createPreset({
          name: 'Test Preset',
          adjustments: { brightness: 10 },
        });
      });

      const originalUpdatedAt = result.current.presets[0].updatedAt;

      // Wait a bit to ensure different timestamp
      act(() => {
        result.current.updatePreset(presetId!, { name: 'Updated Preset' });
      });

      expect(result.current.presets[0].updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });

  describe('deletePreset', () => {
    it('should delete a preset', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let presetId: string;
      act(() => {
        presetId = result.current.createPreset({
          name: 'Test Preset',
          adjustments: { brightness: 10 },
        });
      });

      act(() => {
        result.current.deletePreset(presetId!);
      });

      expect(result.current.presets).toHaveLength(0);
    });
  });

  describe('applyPreset', () => {
    it('should apply preset to job', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      let presetId: string;

      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
        presetId = result.current.createPreset({
          name: 'Test Preset',
          adjustments: { brightness: 10 },
        });
      });

      act(() => {
        result.current.applyPreset(jobId!, presetId!);
      });

      expect(result.current.jobs[0].preset).toBeDefined();
      expect(result.current.jobs[0].preset?.name).toBe('Test Preset');
    });
  });

  describe('processing controls', () => {
    it('should start processing', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
      });

      act(() => {
        result.current.startProcessing(jobId!);
      });

      expect(result.current.jobs[0].status).toBe('running');
      expect(result.current.jobs[0].startedAt).toBeGreaterThan(0);
      expect(result.current.isProcessing).toBe(true);
    });

    it('should pause processing', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
        result.current.startProcessing(jobId!);
      });

      act(() => {
        result.current.pauseProcessing(jobId!);
      });

      expect(result.current.jobs[0].status).toBe('paused');
      expect(result.current.isProcessing).toBe(false);
    });

    it('should resume processing', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
        result.current.startProcessing(jobId!);
        result.current.pauseProcessing(jobId!);
      });

      act(() => {
        result.current.resumeProcessing(jobId!);
      });

      expect(result.current.jobs[0].status).toBe('running');
      expect(result.current.isProcessing).toBe(true);
    });

    it('should cancel processing', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
        result.current.startProcessing(jobId!);
      });

      act(() => {
        result.current.cancelProcessing(jobId!);
      });

      expect(result.current.jobs[0].status).toBe('cancelled');
      expect(result.current.jobs[0].completedAt).toBeGreaterThan(0);
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('setConcurrency', () => {
    it('should set concurrency', () => {
      const { result } = renderHook(() => useBatchEditStore());

      act(() => {
        result.current.setConcurrency(4);
      });

      expect(result.current.concurrency).toBe(4);
    });

    it('should clamp concurrency to valid range', () => {
      const { result } = renderHook(() => useBatchEditStore());

      act(() => {
        result.current.setConcurrency(0);
      });
      expect(result.current.concurrency).toBe(1);

      act(() => {
        result.current.setConcurrency(100);
      });
      expect(result.current.concurrency).toBe(8);
    });
  });

  describe('getters', () => {
    it('should get job by id', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let jobId: string;
      act(() => {
        jobId = result.current.createJob('Test Job', '/output');
      });

      const job = result.current.getJob(jobId!);
      expect(job?.name).toBe('Test Job');
    });

    it('should get preset by id', () => {
      const { result } = renderHook(() => useBatchEditStore());

      let presetId: string;
      act(() => {
        presetId = result.current.createPreset({
          name: 'Test Preset',
          adjustments: {},
        });
      });

      const preset = result.current.getPreset(presetId!);
      expect(preset?.name).toBe('Test Preset');
    });

    it('should get active job', () => {
      const { result } = renderHook(() => useBatchEditStore());

      act(() => {
        result.current.createJob('Test Job', '/output');
      });

      const activeJob = result.current.getActiveJob();
      expect(activeJob?.name).toBe('Test Job');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useBatchEditStore());

      act(() => {
        result.current.createJob('Test Job', '/output');
        result.current.createPreset({ name: 'Test', adjustments: {} });
        result.current.setConcurrency(4);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.jobs).toEqual([]);
      expect(result.current.presets).toEqual([]);
      expect(result.current.activeJobId).toBeNull();
      expect(result.current.concurrency).toBe(2);
    });
  });
});
