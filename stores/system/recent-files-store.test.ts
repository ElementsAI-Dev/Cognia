/**
 * Tests for Recent Files Store
 */

import { act } from '@testing-library/react';
import { useRecentFilesStore, selectRecentFiles } from './recent-files-store';

describe('useRecentFilesStore', () => {
  beforeEach(() => {
    useRecentFilesStore.setState({
      recentFiles: [],
      maxFiles: 50,
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useRecentFilesStore.getState();
      expect(state.recentFiles).toEqual([]);
      expect(state.maxFiles).toBe(50);
    });
  });

  describe('addFile', () => {
    it('should add new file', () => {
      let file;
      act(() => {
        file = useRecentFilesStore.getState().addFile({
          name: 'test.png',
          path: '/path/to/test.png',
          type: 'image',
          mimeType: 'image/png',
          size: 1024,
        });
      });

      const state = useRecentFilesStore.getState();
      expect(state.recentFiles).toHaveLength(1);
      expect(file!.name).toBe('test.png');
      expect(file!.usageCount).toBe(1);
      expect(file!.usedAt).toBeInstanceOf(Date);
    });

    it('should update existing file by path', () => {
      act(() => {
        useRecentFilesStore.getState().addFile({
          name: 'test.png',
          path: '/path/to/test.png',
          type: 'image',
          mimeType: 'image/png',
          size: 1024,
        });
      });

      act(() => {
        useRecentFilesStore.getState().addFile({
          name: 'test.png',
          path: '/path/to/test.png',
          type: 'image',
          mimeType: 'image/png',
          size: 1024,
          url: 'http://example.com/test.png',
        });
      });

      const state = useRecentFilesStore.getState();
      expect(state.recentFiles).toHaveLength(1);
      expect(state.recentFiles[0].usageCount).toBe(2);
      expect(state.recentFiles[0].url).toBe('http://example.com/test.png');
    });

    it('should add new files at the beginning', () => {
      act(() => {
        useRecentFilesStore.getState().addFile({
          name: 'first.png',
          path: '/first.png',
          type: 'image',
          mimeType: 'image/png',
          size: 100,
        });
        useRecentFilesStore.getState().addFile({
          name: 'second.png',
          path: '/second.png',
          type: 'image',
          mimeType: 'image/png',
          size: 200,
        });
      });

      expect(useRecentFilesStore.getState().recentFiles[0].name).toBe('second.png');
    });

    it('should limit files to maxFiles', () => {
      useRecentFilesStore.setState({
        ...useRecentFilesStore.getState(),
        maxFiles: 3,
      });

      act(() => {
        for (let i = 0; i < 5; i++) {
          useRecentFilesStore.getState().addFile({
            name: `file${i}.txt`,
            path: `/file${i}.txt`,
            type: 'file',
            mimeType: 'text/plain',
            size: 100,
          });
        }
      });

      expect(useRecentFilesStore.getState().recentFiles).toHaveLength(3);
    });
  });

  describe('removeFile', () => {
    it('should remove file by id', () => {
      let file;
      act(() => {
        file = useRecentFilesStore.getState().addFile({
          name: 'test.png',
          path: '/test.png',
          type: 'image',
          mimeType: 'image/png',
          size: 100,
        });
      });

      act(() => {
        useRecentFilesStore.getState().removeFile(file!.id);
      });

      expect(useRecentFilesStore.getState().recentFiles).toHaveLength(0);
    });
  });

  describe('clearFiles', () => {
    it('should clear all files', () => {
      act(() => {
        useRecentFilesStore.getState().addFile({
          name: 'a.png',
          path: '/a.png',
          type: 'image',
          mimeType: 'image/png',
          size: 100,
        });
        useRecentFilesStore.getState().addFile({
          name: 'b.png',
          path: '/b.png',
          type: 'image',
          mimeType: 'image/png',
          size: 100,
        });
      });

      act(() => {
        useRecentFilesStore.getState().clearFiles();
      });

      expect(useRecentFilesStore.getState().recentFiles).toHaveLength(0);
    });
  });

  describe('updateFileUsage', () => {
    it('should update file usage', () => {
      let file;
      act(() => {
        file = useRecentFilesStore.getState().addFile({
          name: 'test.png',
          path: '/test.png',
          type: 'image',
          mimeType: 'image/png',
          size: 100,
        });
      });

      act(() => {
        useRecentFilesStore.getState().updateFileUsage(file!.id);
      });

      expect(useRecentFilesStore.getState().recentFiles[0].usageCount).toBe(2);
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      act(() => {
        const f1 = useRecentFilesStore.getState().addFile({
          name: 'first.png',
          path: '/first.png',
          type: 'image',
          mimeType: 'image/png',
          size: 100,
        });
        useRecentFilesStore.getState().addFile({
          name: 'second.png',
          path: '/second.png',
          type: 'image',
          mimeType: 'image/png',
          size: 200,
        });
        // Use first file more
        useRecentFilesStore.getState().updateFileUsage(f1.id);
        useRecentFilesStore.getState().updateFileUsage(f1.id);
      });
    });

    it('should get recent files', () => {
      const recent = useRecentFilesStore.getState().getRecentFiles(5);
      expect(recent).toHaveLength(2);
      expect(recent[0].name).toBe('second.png'); // Most recently added (ties keep insertion order)
    });

    it('should get most used files', () => {
      const mostUsed = useRecentFilesStore.getState().getMostUsedFiles(5);
      expect(mostUsed[0].name).toBe('first.png'); // Used 3 times
    });

    it('should search files', () => {
      const results = useRecentFilesStore.getState().searchFiles('first');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('first.png');
    });

    it('should get file by path', () => {
      const file = useRecentFilesStore.getState().getFileByPath('/first.png');
      expect(file?.name).toBe('first.png');

      const notFound = useRecentFilesStore.getState().getFileByPath('/nonexistent.png');
      expect(notFound).toBeUndefined();
    });

    it('should use selectRecentFiles selector', () => {
      expect(selectRecentFiles(useRecentFilesStore.getState())).toHaveLength(2);
    });
  });
});
