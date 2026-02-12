/**
 * Unit tests for Zotero Slice
 * Tests Zotero config, sync, import, and BibTeX export through the composed store
 */

import { act, renderHook } from '@testing-library/react';
import { useAcademicStore } from '../academic-store';
import type { ZoteroConfig } from '@/lib/academic/zotero-integration';
import type { LibraryPaper } from '@/types/academic';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    app: {
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

// Mock proxyFetch used by ZoteroClient
const mockFetch = jest.fn();
jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: (...args: unknown[]) => mockFetch(...args),
}));

const mockConfig: ZoteroConfig = {
  apiKey: 'test-api-key',
  userId: 'user123',
  libraryType: 'user',
  libraryId: 'lib123',
  syncEnabled: true,
  autoSync: false,
  syncInterval: 5,
};

const createMockLibraryPaper = (
  id: string,
  overrides: Partial<LibraryPaper> = {}
): LibraryPaper => ({
  id,
  providerId: 'arxiv',
  externalId: `arxiv-${id}`,
  title: `Test Paper ${id}`,
  abstract: 'Test abstract',
  authors: [{ name: 'Test Author' }],
  year: 2023,
  urls: [],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
  libraryId: `lib-${id}`,
  addedAt: new Date(),
  readingStatus: 'unread',
  priority: 'medium',
  ...overrides,
});

describe('Zotero Slice', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAcademicStore());
    act(() => {
      result.current.reset();
    });
    mockInvoke.mockClear();
    mockFetch.mockClear();
  });

  describe('setZoteroConfig', () => {
    it('should set Zotero configuration', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setZoteroConfig(mockConfig);
      });

      expect(result.current.settings.zoteroConfig).toEqual(mockConfig);
    });

    it('should clear Zotero configuration with null', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setZoteroConfig(mockConfig);
      });

      act(() => {
        result.current.setZoteroConfig(null);
      });

      expect(result.current.settings.zoteroConfig).toBeNull();
    });

    it('should not overwrite other settings', () => {
      const { result } = renderHook(() => useAcademicStore());

      const originalLimit = result.current.settings.defaultSearchLimit;

      act(() => {
        result.current.setZoteroConfig(mockConfig);
      });

      expect(result.current.settings.defaultSearchLimit).toBe(originalLimit);
    });
  });

  describe('importFromZotero', () => {
    it('should return 0 and set error when Zotero is not configured', async () => {
      const { result } = renderHook(() => useAcademicStore());

      let imported = -1;
      await act(async () => {
        imported = await result.current.importFromZotero();
      });

      expect(imported).toBe(0);
      expect(result.current.error).toBe('Zotero is not configured');
    });

    it('should import items from Zotero', async () => {
      // ZoteroClient.request() calls proxyFetch, then response.json()
      // getItems() returns the parsed data directly as ZoteroItem[]
      const mockZoteroResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Last-Modified-Version': '1' }),
        json: () =>
          Promise.resolve([
            {
              key: 'z1',
              version: 1,
              itemType: 'journalArticle',
              title: 'Zotero Paper 1',
              creators: [{ creatorType: 'author', firstName: 'John', lastName: 'Doe' }],
              tags: [],
              collections: [],
              relations: {},
              dateAdded: '2024-01-01T00:00:00Z',
              dateModified: '2024-01-01T00:00:00Z',
            },
          ]),
      };
      mockFetch.mockResolvedValueOnce(mockZoteroResponse);

      // Mock addToLibrary invoke
      mockInvoke.mockResolvedValue(createMockLibraryPaper('zotero-z1'));

      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setZoteroConfig(mockConfig);
      });

      let imported = 0;
      await act(async () => {
        imported = await result.current.importFromZotero();
      });

      expect(imported).toBe(1);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle Zotero import error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setZoteroConfig(mockConfig);
      });

      let imported = -1;
      await act(async () => {
        imported = await result.current.importFromZotero();
      });

      expect(imported).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Zotero import failed');
    });

    it('should import with search query', async () => {
      const mockZoteroResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'Last-Modified-Version': '1' }),
        json: () => Promise.resolve([]),
      };
      mockFetch.mockResolvedValueOnce(mockZoteroResponse);

      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setZoteroConfig(mockConfig);
      });

      await act(async () => {
        await result.current.importFromZotero('machine learning');
      });

      // Verify fetch was called with query params
      expect(mockFetch).toHaveBeenCalled();
      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('q=machine+learning');
    });
  });

  describe('syncWithZotero', () => {
    it('should return null and set error when Zotero is not configured', async () => {
      const { result } = renderHook(() => useAcademicStore());

      let syncResult;
      await act(async () => {
        syncResult = await result.current.syncWithZotero();
      });

      expect(syncResult).toBeNull();
      expect(result.current.error).toBe('Zotero is not configured');
    });

    it('should handle sync error gracefully', async () => {
      // fullSync() catches errors internally and returns { success: false }
      // so the slice receives a result with success=false
      mockFetch.mockRejectedValueOnce(new Error('Sync failed'));

      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setZoteroConfig(mockConfig);
      });

      let syncResult;
      await act(async () => {
        syncResult = await result.current.syncWithZotero();
      });

      // fullSync catches internally → returns result object with success: false
      expect(syncResult).not.toBeNull();
      expect(syncResult).toMatchObject({ success: false });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('exportToZoteroBibTeX', () => {
    it('should return empty array for non-existent papers', () => {
      const { result } = renderHook(() => useAcademicStore());

      const bibtex = result.current.exportToZoteroBibTeX(['non-existent']);

      expect(bibtex).toEqual([]);
    });

    it('should export library papers to BibTeX format', async () => {
      const libraryPaper = createMockLibraryPaper('1', {
        title: 'Deep Learning Paper',
        authors: [{ name: 'Jane Smith' }],
        year: 2024,
      });
      mockInvoke.mockResolvedValueOnce(libraryPaper);

      const { result } = renderHook(() => useAcademicStore());

      // Add paper to library
      await act(async () => {
        await result.current.addToLibrary({
          id: '1',
          providerId: 'arxiv',
          externalId: 'arxiv-1',
          title: 'Deep Learning Paper',
          abstract: 'Test',
          authors: [{ name: 'Jane Smith' }],
          year: 2024,
          urls: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          fetchedAt: new Date(),
        });
      });

      const bibtex = result.current.exportToZoteroBibTeX(['1']);

      expect(bibtex.length).toBe(1);
      expect(bibtex[0]).toContain('Deep Learning Paper');
    });

    it('should skip papers without title', async () => {
      const libraryPaper = createMockLibraryPaper('1', { title: '' });
      mockInvoke.mockResolvedValueOnce(libraryPaper);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.addToLibrary({
          id: '1',
          providerId: 'arxiv',
          externalId: 'arxiv-1',
          title: '',
          abstract: '',
          authors: [],
          year: 2024,
          urls: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          fetchedAt: new Date(),
        });
      });

      const bibtex = result.current.exportToZoteroBibTeX(['1']);

      // paperToZoteroItem maps title from Paper.title, which is empty
      // so the zoteroItem.title is '' which is falsy → skipped
      expect(bibtex).toEqual([]);
    });

    it('should handle multiple papers', async () => {
      const paper1 = createMockLibraryPaper('1', { title: 'Paper One' });
      const paper2 = createMockLibraryPaper('2', { title: 'Paper Two' });
      mockInvoke.mockResolvedValueOnce([paper1, paper2]);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.refreshLibrary();
      });

      const bibtex = result.current.exportToZoteroBibTeX(['1', '2']);

      expect(bibtex.length).toBe(2);
      expect(bibtex[0]).toContain('Paper One');
      expect(bibtex[1]).toContain('Paper Two');
    });
  });
});
