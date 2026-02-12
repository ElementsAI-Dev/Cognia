/**
 * Unit tests for Academic Store Slices
 * Tests PDF, Annotation, and Provider slices through the composed store
 * (Search, Library, Collection, Batch, and History slices are covered by academic-store.test.ts)
 */

import { act, renderHook } from '@testing-library/react';
import { useAcademicStore } from '../academic-store';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('Academic Store Slices', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAcademicStore());
    act(() => {
      result.current.reset();
    });
    mockInvoke.mockClear();
  });

  describe('PDF Slice', () => {
    it('should download PDF successfully', async () => {
      const pdfPath = '/path/to/paper.pdf';
      mockInvoke.mockResolvedValueOnce(pdfPath); // downloadPdf
      mockInvoke.mockResolvedValueOnce([]); // refreshLibrary

      const { result } = renderHook(() => useAcademicStore());

      let returnedPath: string | undefined;
      await act(async () => {
        returnedPath = await result.current.downloadPdf('paper-1', 'https://example.com/paper.pdf');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_download_pdf', {
        paperId: 'paper-1',
        pdfUrl: 'https://example.com/paper.pdf',
      });
      expect(returnedPath).toBe(pdfPath);
    });

    it('should handle PDF download error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Download failed'));

      const { result } = renderHook(() => useAcademicStore());

      await expect(
        act(async () => {
          await result.current.downloadPdf('paper-1', 'https://example.com/paper.pdf');
        })
      ).rejects.toThrow('Download failed');
    });

    it('should get PDF path', async () => {
      mockInvoke.mockResolvedValueOnce('/cached/paper.pdf');

      const { result } = renderHook(() => useAcademicStore());

      let path: string | null = null;
      await act(async () => {
        path = await result.current.getPdfPath('paper-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_get_pdf_path', { paperId: 'paper-1' });
      expect(path).toBe('/cached/paper.pdf');
    });

    it('should return null for non-existent PDF path', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useAcademicStore());

      let path: string | null = 'initial';
      await act(async () => {
        path = await result.current.getPdfPath('non-existent');
      });

      expect(path).toBeNull();
    });

    it('should delete PDF', async () => {
      mockInvoke.mockResolvedValueOnce(undefined); // deletePdf
      mockInvoke.mockResolvedValueOnce([]); // refreshLibrary

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.deletePdf('paper-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_delete_pdf', { paperId: 'paper-1' });
    });

    it('should handle PDF delete error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useAcademicStore());

      await expect(
        act(async () => {
          await result.current.deletePdf('paper-1');
        })
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('Annotation Slice', () => {
    it('should add annotation', async () => {
      const mockAnnotation = {
        id: 'ann-1',
        paperId: 'paper-1',
        type: 'highlight' as const,
        content: 'Important finding',
        pageNumber: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockInvoke.mockResolvedValueOnce(mockAnnotation);

      const { result } = renderHook(() => useAcademicStore());

      let annotation;
      await act(async () => {
        annotation = await result.current.addAnnotation('paper-1', {
          type: 'highlight',
          content: 'Important finding',
          pageNumber: 5,
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_add_annotation', {
        paperId: 'paper-1',
        annotation: {
          type: 'highlight',
          content: 'Important finding',
          page_number: 5,
          position: undefined,
          color: undefined,
        },
      });
      expect(annotation).toEqual(mockAnnotation);
    });

    it('should handle annotation error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Annotation failed'));

      const { result } = renderHook(() => useAcademicStore());

      await expect(
        act(async () => {
          await result.current.addAnnotation('paper-1', {
            type: 'note',
            content: 'Test',
          });
        })
      ).rejects.toThrow('Annotation failed');
    });

    it('should update annotation', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.updateAnnotation('ann-1', { content: 'Updated content' });
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_update_annotation', {
        annotationId: 'ann-1',
        updates: {
          content: 'Updated content',
          color: undefined,
        },
      });
    });

    it('should delete annotation', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.deleteAnnotation('ann-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_delete_annotation', {
        annotationId: 'ann-1',
      });
    });

    it('should get annotations', async () => {
      const mockAnnotations = [
        { id: 'ann-1', paperId: 'paper-1', type: 'highlight', content: 'Note 1' },
        { id: 'ann-2', paperId: 'paper-1', type: 'note', content: 'Note 2' },
      ];
      mockInvoke.mockResolvedValueOnce(mockAnnotations);

      const { result } = renderHook(() => useAcademicStore());

      let annotations;
      await act(async () => {
        annotations = await result.current.getAnnotations('paper-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_get_annotations', {
        paperId: 'paper-1',
      });
      expect(annotations).toEqual(mockAnnotations);
    });

    it('should return empty array on getAnnotations error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useAcademicStore());

      let annotations;
      await act(async () => {
        annotations = await result.current.getAnnotations('paper-1');
      });

      expect(annotations).toEqual([]);
    });

    it('should get citations', async () => {
      const mockCitations = [
        { id: 'c-1', title: 'Citing Paper 1' },
        { id: 'c-2', title: 'Citing Paper 2' },
      ];
      mockInvoke.mockResolvedValueOnce(mockCitations);

      const { result } = renderHook(() => useAcademicStore());

      let citations;
      await act(async () => {
        citations = await result.current.getCitations('paper-1', 'semantic-scholar');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_get_citations', {
        providerId: 'semantic-scholar',
        paperId: 'paper-1',
        limit: 50,
        offset: 0,
      });
      expect(citations).toEqual(mockCitations);
    });

    it('should return empty array on getCitations error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useAcademicStore());

      let citations;
      await act(async () => {
        citations = await result.current.getCitations('paper-1', 'arxiv');
      });

      expect(citations).toEqual([]);
    });

    it('should get references', async () => {
      const mockRefs = [{ id: 'r-1', title: 'Referenced Paper' }];
      mockInvoke.mockResolvedValueOnce(mockRefs);

      const { result } = renderHook(() => useAcademicStore());

      let refs;
      await act(async () => {
        refs = await result.current.getReferences('paper-1', 'semantic-scholar');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_get_references', {
        providerId: 'semantic-scholar',
        paperId: 'paper-1',
        limit: 50,
        offset: 0,
      });
      expect(refs).toEqual(mockRefs);
    });

    it('should return empty array on getReferences error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useAcademicStore());

      let refs;
      await act(async () => {
        refs = await result.current.getReferences('paper-1', 'arxiv');
      });

      expect(refs).toEqual([]);
    });
  });

  describe('Provider Slice', () => {
    it('should get providers', async () => {
      const mockProviders = [
        { id: 'arxiv', name: 'arXiv', enabled: true },
        { id: 'semantic-scholar', name: 'Semantic Scholar', enabled: true },
      ];
      mockInvoke.mockResolvedValueOnce(mockProviders);

      const { result } = renderHook(() => useAcademicStore());

      let providers;
      await act(async () => {
        providers = await result.current.getProviders();
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_get_providers');
      expect(providers).toEqual(mockProviders);
    });

    it('should return empty array on getProviders error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useAcademicStore());

      let providers;
      await act(async () => {
        providers = await result.current.getProviders();
      });

      expect(providers).toEqual([]);
    });

    it('should set provider API key', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.setProviderApiKey('semantic-scholar', 'test-key-123');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_set_provider_api_key', {
        providerId: 'semantic-scholar',
        apiKey: 'test-key-123',
      });
    });

    it('should handle setProviderApiKey error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Invalid key'));

      const { result } = renderHook(() => useAcademicStore());

      await expect(
        act(async () => {
          await result.current.setProviderApiKey('semantic-scholar', 'bad-key');
        })
      ).rejects.toThrow('Invalid key');
    });

    it('should set provider enabled', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.setProviderEnabled('core', false);
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_set_provider_enabled', {
        providerId: 'core',
        enabled: false,
      });
    });

    it('should test provider', async () => {
      mockInvoke.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useAcademicStore());

      let testResult;
      await act(async () => {
        testResult = await result.current.testProvider('arxiv');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_test_provider', { providerId: 'arxiv' });
      expect(testResult).toBe(true);
    });

    it('should return false on testProvider error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Connection failed'));

      const { result } = renderHook(() => useAcademicStore());

      let testResult;
      await act(async () => {
        testResult = await result.current.testProvider('arxiv');
      });

      expect(testResult).toBe(false);
    });

    it('should import papers', async () => {
      const mockResult = { imported: 5, skipped: 2, errors: [] };
      mockInvoke.mockResolvedValueOnce(mockResult); // importPapers
      mockInvoke.mockResolvedValueOnce([]); // refreshLibrary

      const { result } = renderHook(() => useAcademicStore());

      let importResult;
      await act(async () => {
        importResult = await result.current.importPapers('@article{test}', 'bibtex');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_import_papers', {
        data: '@article{test}',
        format: 'bibtex',
        options: {
          merge_strategy: 'skip',
          import_annotations: true,
          import_notes: true,
          target_collection: undefined,
        },
      });
      expect(importResult).toEqual(mockResult);
    });

    it('should import papers with options', async () => {
      const mockResult = { imported: 3, skipped: 0, errors: [] };
      mockInvoke.mockResolvedValueOnce(mockResult);
      mockInvoke.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.importPapers('@article{test}', 'bibtex', {
          mergeStrategy: 'replace',
          targetCollection: 'col-1',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_import_papers', {
        data: '@article{test}',
        format: 'bibtex',
        options: {
          merge_strategy: 'replace',
          import_annotations: true,
          import_notes: true,
          target_collection: 'col-1',
        },
      });
    });

    it('should handle import error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Parse error'));

      const { result } = renderHook(() => useAcademicStore());

      await expect(
        act(async () => {
          await result.current.importPapers('invalid data', 'bibtex');
        })
      ).rejects.toThrow('Parse error');
    });

    it('should export papers', async () => {
      const mockResult = { data: '@article{...}', count: 5 };
      mockInvoke.mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useAcademicStore());

      let exportResult;
      await act(async () => {
        exportResult = await result.current.exportPapers(['paper-1', 'paper-2'], undefined, 'bibtex');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_export_papers', {
        paperIds: ['paper-1', 'paper-2'],
        collectionId: undefined,
        format: 'bibtex',
        options: {
          include_annotations: true,
          include_notes: true,
          include_ai_analysis: true,
        },
      });
      expect(exportResult).toEqual(mockResult);
    });

    it('should refresh statistics', async () => {
      const mockStats = {
        totalPapers: 100,
        totalCollections: 5,
        totalAnnotations: 50,
      };
      mockInvoke.mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.refreshStatistics();
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_get_statistics');
      expect(result.current.statistics).toEqual(mockStats);
    });

    it('should handle refreshStatistics error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Stats failed'));

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.refreshStatistics();
      });

      expect(result.current.error).toBe('Stats failed');
    });

    it('should update settings', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.updateSettings({
          defaultSearchLimit: 50,
          autoDownloadPdf: true,
        });
      });

      expect(result.current.settings.defaultSearchLimit).toBe(50);
      expect(result.current.settings.autoDownloadPdf).toBe(true);
    });

    it('should merge settings without overwriting other fields', () => {
      const { result } = renderHook(() => useAcademicStore());

      const originalProviders = result.current.settings.defaultProviders;

      act(() => {
        result.current.updateSettings({ defaultSearchLimit: 30 });
      });

      expect(result.current.settings.defaultSearchLimit).toBe(30);
      expect(result.current.settings.defaultProviders).toEqual(originalProviders);
    });
  });
});
