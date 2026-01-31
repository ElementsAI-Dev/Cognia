/**
 * Tests for Video Editor Store
 */

import { act, renderHook } from '@testing-library/react';
import { useVideoEditorStore } from './video-editor-store';

// Reset store state before each test
beforeEach(() => {
  const { result } = renderHook(() => useVideoEditorStore());
  act(() => {
    result.current.reset();
    result.current.clearRecentProjects();
    result.current.resetPreferences();
  });
});

describe('useVideoEditorStore', () => {
  describe('project management', () => {
    it('should create a new project', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      let projectId: string;
      act(() => {
        projectId = result.current.createProject('Test Project');
      });

      expect(projectId!).toBeDefined();
      expect(result.current.currentProject).not.toBeNull();
      expect(result.current.currentProject?.name).toBe('Test Project');
      expect(result.current.currentProject?.resolution).toEqual({ width: 1920, height: 1080 });
    });

    it('should create project with custom resolution and frame rate', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.createProject('4K Project', { width: 3840, height: 2160 }, 60);
      });

      expect(result.current.currentProject?.resolution).toEqual({ width: 3840, height: 2160 });
      expect(result.current.currentProject?.frameRate).toBe(60);
    });

    it('should update project name', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.createProject('Original Name');
      });

      act(() => {
        result.current.updateProjectName('Updated Name');
      });

      expect(result.current.currentProject?.name).toBe('Updated Name');
    });

    it('should update project settings', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.createProject('Test');
      });

      act(() => {
        result.current.updateProjectSettings({
          resolution: { width: 1280, height: 720 },
          frameRate: 24,
        });
      });

      expect(result.current.currentProject?.resolution).toEqual({ width: 1280, height: 720 });
      expect(result.current.currentProject?.frameRate).toBe(24);
    });

    it('should delete project', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      let projectId: string;
      act(() => {
        projectId = result.current.createProject('To Delete');
      });

      act(() => {
        result.current.deleteProject(projectId!);
      });

      expect(result.current.currentProject).toBeNull();
    });

    it('should save project and update timestamp', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.createProject('Test');
      });

      const originalUpdatedAt = result.current.currentProject?.updatedAt;

      // Wait a bit to ensure timestamp changes
      jest.advanceTimersByTime(100);

      act(() => {
        result.current.saveProject();
      });

      expect(result.current.currentProject?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt!);
    });
  });

  describe('recent projects', () => {
    it('should add project to recent list on create', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.createProject('Recent Test');
      });

      expect(result.current.recentProjects).toHaveLength(1);
      expect(result.current.recentProjects[0].name).toBe('Recent Test');
    });

    it('should limit recent projects to max size', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.createProject(`Project ${i}`);
        }
      });

      expect(result.current.recentProjects.length).toBeLessThanOrEqual(10);
    });

    it('should remove project from recent list', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      let projectId: string;
      act(() => {
        projectId = result.current.createProject('To Remove');
      });

      act(() => {
        result.current.removeRecentProject(projectId!);
      });

      expect(result.current.recentProjects).toHaveLength(0);
    });

    it('should clear all recent projects', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.createProject('Project 1');
        result.current.createProject('Project 2');
      });

      act(() => {
        result.current.clearRecentProjects();
      });

      expect(result.current.recentProjects).toHaveLength(0);
    });
  });

  describe('preferences', () => {
    it('should have default preferences', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      expect(result.current.preferences.snapEnabled).toBe(true);
      expect(result.current.preferences.defaultZoom).toBe(1);
      expect(result.current.preferences.autoSave).toBe(true);
    });

    it('should update preferences', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.updatePreferences({
          snapEnabled: false,
          defaultZoom: 2,
        });
      });

      expect(result.current.preferences.snapEnabled).toBe(false);
      expect(result.current.preferences.defaultZoom).toBe(2);
    });

    it('should reset preferences to defaults', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.updatePreferences({ snapEnabled: false });
      });

      act(() => {
        result.current.resetPreferences();
      });

      expect(result.current.preferences.snapEnabled).toBe(true);
    });
  });

  describe('history (undo/redo)', () => {
    const mockTracks = [
      {
        id: 'track-1',
        name: 'Video Track',
        type: 'video' as const,
        clips: [],
        muted: false,
        locked: false,
        visible: true,
        volume: 1,
        height: 60,
      },
    ];

    it('should push history snapshots', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.pushHistory('add-track', mockTracks, 10);
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].action).toBe('add-track');
      expect(result.current.historyIndex).toBe(0);
    });

    it('should deep clone tracks when pushing history', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      const tracks = [...mockTracks];
      act(() => {
        result.current.pushHistory('edit', tracks, 10);
      });

      // Modify original tracks
      tracks[0].name = 'Modified';

      // History should have original value
      expect(result.current.history[0].tracks[0].name).toBe('Video Track');
    });

    it('should undo to previous state', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.pushHistory('action-1', mockTracks, 10);
        result.current.pushHistory('action-2', [...mockTracks, { ...mockTracks[0], id: 'track-2' }], 20);
      });

      expect(result.current.historyIndex).toBe(1);

      let snapshot: ReturnType<typeof result.current.undo> = null;
      act(() => {
        snapshot = result.current.undo();
      });

      expect(snapshot).not.toBeNull();
      expect(snapshot?.action).toBe('action-1');
      expect(result.current.historyIndex).toBe(0);
    });

    it('should redo to next state', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.pushHistory('action-1', mockTracks, 10);
        result.current.pushHistory('action-2', mockTracks, 20);
      });

      act(() => {
        result.current.undo();
      });

      let snapshot: ReturnType<typeof result.current.redo> = null;
      act(() => {
        snapshot = result.current.redo();
      });

      expect(snapshot).not.toBeNull();
      expect(snapshot?.action).toBe('action-2');
      expect(result.current.historyIndex).toBe(1);
    });

    it('should return null when cannot undo', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      let snapshot: ReturnType<typeof result.current.undo> = null;
      act(() => {
        snapshot = result.current.undo();
      });

      expect(snapshot).toBeNull();
    });

    it('should return null when cannot redo', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.pushHistory('action', mockTracks, 10);
      });

      let snapshot: ReturnType<typeof result.current.redo> = null;
      act(() => {
        snapshot = result.current.redo();
      });

      expect(snapshot).toBeNull();
    });

    it('should report canUndo correctly', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      expect(result.current.canUndo()).toBe(false);

      act(() => {
        result.current.pushHistory('action-1', mockTracks, 10);
      });

      expect(result.current.canUndo()).toBe(false); // First item, can't undo

      act(() => {
        result.current.pushHistory('action-2', mockTracks, 10);
      });

      expect(result.current.canUndo()).toBe(true);
    });

    it('should report canRedo correctly', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      expect(result.current.canRedo()).toBe(false);

      act(() => {
        result.current.pushHistory('action-1', mockTracks, 10);
        result.current.pushHistory('action-2', mockTracks, 10);
      });

      expect(result.current.canRedo()).toBe(false);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo()).toBe(true);
    });

    it('should clear redo history when pushing new action after undo', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.pushHistory('action-1', mockTracks, 10);
        result.current.pushHistory('action-2', mockTracks, 20);
        result.current.pushHistory('action-3', mockTracks, 30);
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.pushHistory('action-new', mockTracks, 25);
      });

      expect(result.current.history).toHaveLength(3);
      expect(result.current.history[2].action).toBe('action-new');
      expect(result.current.canRedo()).toBe(false);
    });

    it('should limit history size', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.pushHistory(`action-${i}`, mockTracks, i);
        }
      });

      expect(result.current.history.length).toBeLessThanOrEqual(50);
    });

    it('should clear history', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.pushHistory('action', mockTracks, 10);
      });

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.history).toHaveLength(0);
      expect(result.current.historyIndex).toBe(-1);
    });
  });

  describe('state management', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');
    });

    it('should reset state', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.createProject('Test');
        result.current.setError('Error');
        result.current.setLoading(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.currentProject).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.history).toHaveLength(0);
    });
  });

  describe('track management', () => {
    it('should set tracks on current project', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      const mockTracks = [
        {
          id: 'track-1',
          name: 'Video',
          type: 'video' as const,
          clips: [],
          muted: false,
          locked: false,
          visible: true,
          volume: 1,
          height: 60,
        },
      ];

      act(() => {
        result.current.createProject('Test');
      });

      act(() => {
        result.current.setTracks(mockTracks);
      });

      expect(result.current.currentProject?.tracks).toEqual(mockTracks);
    });

    it('should not set tracks when no project', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.setTracks([]);
      });

      expect(result.current.currentProject).toBeNull();
    });

    it('should update duration', () => {
      const { result } = renderHook(() => useVideoEditorStore());

      act(() => {
        result.current.createProject('Test');
      });

      act(() => {
        result.current.updateDuration(120);
      });

      expect(result.current.currentProject?.duration).toBe(120);
    });
  });
});
