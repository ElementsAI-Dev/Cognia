/**
 * Tests for useRAGProgress hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useRAGProgress,
  formatElapsedTime,
  formatRemainingTime,
  getStageInfo,
} from './use-rag-progress';

describe('useRAGProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should start with idle state', () => {
      const { result } = renderHook(() => useRAGProgress());

      expect(result.current.progress.stage).toBe('idle');
      expect(result.current.isActive).toBe(false);
      expect(result.current.isCancelled).toBe(false);
    });
  });

  describe('start', () => {
    it('should start operation with total count', () => {
      const { result } = renderHook(() => useRAGProgress());

      act(() => {
        result.current.start(100, 'Starting indexing');
      });

      expect(result.current.progress.stage).toBe('initializing');
      expect(result.current.progress.total).toBe(100);
      expect(result.current.progress.message).toBe('Starting indexing');
      expect(result.current.isActive).toBe(true);
    });
  });

  describe('update', () => {
    it('should update progress', () => {
      const { result } = renderHook(() => useRAGProgress());

      act(() => {
        result.current.start(100);
      });

      act(() => {
        result.current.update(50, 'embedding', 'Generating embeddings...');
      });

      expect(result.current.progress.current).toBe(50);
      expect(result.current.progress.percentage).toBe(50);
      expect(result.current.progress.stage).toBe('embedding');
    });

    it('should not update when cancelled', () => {
      const { result } = renderHook(() => useRAGProgress());

      act(() => {
        result.current.start(100);
        result.current.cancel();
      });

      act(() => {
        result.current.update(50);
      });

      expect(result.current.progress.current).toBe(0);
    });
  });

  describe('setStage', () => {
    it('should change stage', () => {
      const { result } = renderHook(() => useRAGProgress());

      act(() => {
        result.current.start(100);
        result.current.setStage('chunking');
      });

      expect(result.current.progress.stage).toBe('chunking');
    });
  });

  describe('complete', () => {
    it('should complete operation', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() => useRAGProgress({ onComplete }));

      act(() => {
        result.current.start(100);
      });

      act(() => {
        result.current.complete({ totalDocuments: 10, successCount: 10 });
      });

      expect(result.current.progress.stage).toBe('complete');
      expect(result.current.isActive).toBe(false);
      expect(result.current.stats.totalDocuments).toBe(10);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should handle error', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useRAGProgress({ onError }));

      act(() => {
        result.current.start(100);
        result.current.error(new Error('Test error'));
      });

      expect(result.current.progress.stage).toBe('error');
      expect(result.current.progress.message).toBe('Test error');
      expect(result.current.isActive).toBe(false);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel operation', () => {
      const onCancel = vi.fn();
      const { result } = renderHook(() => useRAGProgress({ onCancel }));

      act(() => {
        result.current.start(100);
        result.current.cancel();
      });

      expect(result.current.progress.stage).toBe('cancelled');
      expect(result.current.isCancelled).toBe(true);
      expect(result.current.isActive).toBe(false);
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useRAGProgress());

      act(() => {
        result.current.start(100);
        result.current.update(50);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.progress.stage).toBe('idle');
      expect(result.current.progress.current).toBe(0);
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('createProgressCallback', () => {
    it('should create callback for RAG functions', () => {
      const { result } = renderHook(() => useRAGProgress());

      act(() => {
        result.current.start(100);
      });

      const callback = result.current.createProgressCallback();

      act(() => {
        callback({ current: 25, total: 100, stage: 'embedding' });
      });

      expect(result.current.progress.current).toBe(25);
    });
  });

  describe('callbacks', () => {
    it('should call onStageChange', () => {
      const onStageChange = vi.fn();
      const { result } = renderHook(() => useRAGProgress({ onStageChange }));

      act(() => {
        result.current.start(100);
      });

      expect(onStageChange).toHaveBeenCalledWith('initializing');
    });

    it('should call onProgress', () => {
      const onProgress = vi.fn();
      const { result } = renderHook(() => useRAGProgress({ onProgress }));

      act(() => {
        result.current.start(100);
      });

      expect(onProgress).toHaveBeenCalled();
    });
  });
});

describe('formatElapsedTime', () => {
  it('should format milliseconds', () => {
    expect(formatElapsedTime(500)).toBe('500ms');
  });

  it('should format seconds', () => {
    expect(formatElapsedTime(5000)).toBe('5.0s');
  });

  it('should format minutes and seconds', () => {
    expect(formatElapsedTime(125000)).toBe('2m 5s');
  });
});

describe('formatRemainingTime', () => {
  it('should handle undefined', () => {
    expect(formatRemainingTime(undefined)).toBe('Calculating...');
  });

  it('should handle very short time', () => {
    expect(formatRemainingTime(500)).toBe('Almost done');
  });

  it('should format seconds', () => {
    expect(formatRemainingTime(5000)).toBe('~5s remaining');
  });

  it('should format minutes', () => {
    expect(formatRemainingTime(120000)).toBe('~2m remaining');
  });
});

describe('getStageInfo', () => {
  it('should return info for all stages', () => {
    const stages = [
      'idle', 'initializing', 'chunking', 'embedding',
      'indexing', 'searching', 'reranking', 'formatting',
      'complete', 'error', 'cancelled',
    ] as const;

    for (const stage of stages) {
      const info = getStageInfo(stage);
      expect(info.label).toBeTruthy();
      expect(info.icon).toBeTruthy();
      expect(info.color).toBeTruthy();
    }
  });

  it('should return correct colors', () => {
    expect(getStageInfo('complete').color).toBe('green');
    expect(getStageInfo('error').color).toBe('red');
    expect(getStageInfo('cancelled').color).toBe('orange');
  });
});
