/**
 * Tests for LaTeX Store
 */

import { act } from '@testing-library/react';
import { useLatexStore, type LaTeXDocument } from './latex-store';
import type { Paper } from '@/types/learning/academic';

// Mock LaTeXVersionControlService
jest.mock('@/lib/latex/version-control', () => ({
  LaTeXVersionControlService: jest.fn().mockImplementation(() => ({
    initDocument: jest.fn(),
    createVersion: jest.fn().mockReturnValue({ id: 'version-1', version: 1 }),
    restoreVersion: jest.fn().mockReturnValue({ content: 'restored content' }),
    getHistory: jest.fn().mockReturnValue({
      versions: [
        { id: 'version-1', version: 1, timestamp: Date.now(), message: 'Initial' },
      ],
    }),
  })),
}));

// Mock citation library functions
jest.mock('@/lib/latex/citation-inserter', () => ({
  createCitationLibrary: jest.fn().mockReturnValue({
    entries: new Map(),
    collections: new Map(),
    recentlyUsed: [],
    favorites: [],
  }),
  addToCitationLibrary: jest.fn().mockImplementation((lib, paper) => ({
    key: `cite-${paper.title}`,
    paper,
    addedAt: Date.now(),
    timesUsed: 0,
  })),
  removeFromCitationLibrary: jest.fn().mockReturnValue(true),
  markCitationUsed: jest.fn(),
  exportLibraryToBibTeX: jest.fn().mockReturnValue('@article{...}'),
}));

describe('useLatexStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { documents } = useLatexStore.getState();
    Object.keys(documents).forEach((id) => {
      useLatexStore.getState().deleteDocument(id);
    });
    act(() => {
      useLatexStore.setState({
        currentDocumentId: null,
        documentHistory: [],
        isLoading: false,
        error: null,
      });
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useLatexStore.getState();
      expect(state.currentDocumentId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.settings).toBeDefined();
      expect(state.settings.theme).toBe('system');
    });
  });

  describe('document management', () => {
    it('should create a new document', () => {
      let doc: LaTeXDocument | undefined;

      act(() => {
        doc = useLatexStore.getState().createDocument('Test Doc', '\\documentclass{article}');
      });

      const state = useLatexStore.getState();
      expect(doc!.name).toBe('Test Doc');
      expect(doc!.content).toBe('\\documentclass{article}');
      expect(state.documents[doc!.id]).toBeDefined();
      expect(state.currentDocumentId).toBe(doc!.id);
    });

    it('should create document with auto-generated name', () => {
      let doc: LaTeXDocument | undefined;

      act(() => {
        doc = useLatexStore.getState().createDocument();
      });

      expect(doc!.name).toMatch(/^Document \d+$/);
    });

    it('should save document content', () => {
      let docId: string;

      act(() => {
        const doc = useLatexStore.getState().createDocument('Test', 'initial');
        docId = doc.id;
        useLatexStore.getState().saveDocument('updated content');
      });

      expect(useLatexStore.getState().documents[docId!].content).toBe('updated content');
    });

    it('should create new document when saving with no current document', () => {
      act(() => {
        useLatexStore.setState({ currentDocumentId: null });
        useLatexStore.getState().saveDocument('new content', 'New Doc');
      });

      const state = useLatexStore.getState();
      expect(state.currentDocumentId).not.toBeNull();
      expect(Object.values(state.documents).some((d) => d.content === 'new content')).toBe(true);
    });

    it('should load an existing document', () => {
      let docId: string;

      act(() => {
        const doc = useLatexStore.getState().createDocument('Test', 'content');
        docId = doc.id;
        useLatexStore.setState({ currentDocumentId: null });
      });

      let loaded: ReturnType<ReturnType<typeof useLatexStore.getState>['loadDocument']> = null;

      act(() => {
        loaded = useLatexStore.getState().loadDocument(docId!);
      });

      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(docId!);
      expect(useLatexStore.getState().currentDocumentId).toBe(docId!);
    });

    it('should return null for non-existent document', () => {
      let result: ReturnType<ReturnType<typeof useLatexStore.getState>['loadDocument']> = null;

      act(() => {
        result = useLatexStore.getState().loadDocument('non-existent');
      });

      expect(result).toBeNull();
    });

    it('should delete a document', () => {
      let docId: string;

      act(() => {
        const doc = useLatexStore.getState().createDocument('Test', 'content');
        docId = doc.id;
        useLatexStore.getState().deleteDocument(docId);
      });

      const state = useLatexStore.getState();
      expect(state.documents[docId!]).toBeUndefined();
      expect(state.currentDocumentId).toBeNull();
    });

    it('should not clear currentDocumentId when deleting different document', () => {
      let currentId: string;

      act(() => {
        const doc1 = useLatexStore.getState().createDocument('Doc1', 'content1');
        const doc2 = useLatexStore.getState().createDocument('Doc2', 'content2');
        currentId = doc2.id;
        useLatexStore.getState().deleteDocument(doc1.id);
      });

      expect(useLatexStore.getState().currentDocumentId).toBe(currentId!);
    });

    it('should rename a document', () => {
      let docId: string;

      act(() => {
        const doc = useLatexStore.getState().createDocument('Original', 'content');
        docId = doc.id;
        useLatexStore.getState().renameDocument(docId, 'Renamed');
      });

      expect(useLatexStore.getState().documents[docId!].name).toBe('Renamed');
    });

    it('should duplicate a document', () => {
      let originalId: string;
      let duplicated: ReturnType<ReturnType<typeof useLatexStore.getState>['duplicateDocument']> = null;

      act(() => {
        const original = useLatexStore.getState().createDocument('Original', 'content');
        originalId = original.id;
        duplicated = useLatexStore.getState().duplicateDocument(originalId);
      });

      expect(duplicated).not.toBeNull();
      expect(duplicated!.name).toBe('Original (Copy)');
      expect(duplicated!.content).toBe('content');
      expect(duplicated!.id).not.toBe(originalId!);
    });

    it('should return null when duplicating non-existent document', () => {
      let result: LaTeXDocument | null | undefined;

      act(() => {
        result = useLatexStore.getState().duplicateDocument('non-existent');
      });

      expect(result).toBeNull();
    });
  });

  describe('document history', () => {
    it('should add document to history on create', () => {
      act(() => {
        useLatexStore.getState().createDocument('Test', 'content');
      });

      expect(useLatexStore.getState().documentHistory.length).toBe(1);
    });

    it('should update history on save', () => {
      act(() => {
        useLatexStore.getState().createDocument('Test', 'initial');
        useLatexStore.getState().saveDocument('updated');
      });

      const history = useLatexStore.getState().documentHistory;
      expect(history[0].content).toBe('updated');
    });

    it('should limit history to 50 entries', () => {
      act(() => {
        for (let i = 0; i < 60; i++) {
          useLatexStore.getState().createDocument(`Doc ${i}`, `content ${i}`);
        }
      });

      expect(useLatexStore.getState().documentHistory.length).toBe(50);
    });
  });

  describe('version control', () => {
    it('should initialize version control', () => {
      let docId: string;

      act(() => {
        const doc = useLatexStore.getState().createDocument('Test', 'content');
        docId = doc.id;
        useLatexStore.getState().initVersionControl(docId);
      });

      expect(useLatexStore.getState().versionControlService).not.toBeNull();
    });

    it('should create a version', () => {
      let versionId: string | null;

      act(() => {
        const doc = useLatexStore.getState().createDocument('Test', 'content');
        useLatexStore.getState().initVersionControl(doc.id);
        versionId = useLatexStore.getState().createVersion('First version');
      });

      expect(versionId!).toBe('version-1');
    });

    it('should return null when creating version without service', () => {
      let versionId: string | null = null;

      act(() => {
        useLatexStore.setState({ versionControlService: null });
        versionId = useLatexStore.getState().createVersion('test');
      });

      expect(versionId).toBeNull();
    });

    it('should get version history', () => {
      let history: Array<{ id: string; timestamp: number; message?: string }>;

      act(() => {
        const doc = useLatexStore.getState().createDocument('Test', 'content');
        useLatexStore.getState().initVersionControl(doc.id);
        history = useLatexStore.getState().getVersionHistory();
      });

      expect(history!.length).toBe(1);
      expect(history![0].id).toBe('version-1');
    });

    it('should return empty array for version history without service', () => {
      let history: Array<{ id: string; timestamp: number; message?: string }>;

      act(() => {
        useLatexStore.setState({ versionControlService: null, currentDocumentId: null });
        history = useLatexStore.getState().getVersionHistory();
      });

      expect(history!).toEqual([]);
    });
  });

  describe('citation management', () => {
    const mockPaper: Paper = {
      id: 'paper-1',
      title: 'Test Paper',
      authors: [{ name: 'Author One' }],
      year: 2024,
      abstract: 'Abstract',
      providerId: 'semantic-scholar',
      externalId: 'ext-1',
      urls: [],
      metadata: {},
      citationCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      fetchedAt: new Date(),
    };

    it('should add a citation', () => {
      let entry: ReturnType<ReturnType<typeof useLatexStore.getState>['addCitation']>;

      act(() => {
        entry = useLatexStore.getState().addCitation(mockPaper);
      });

      expect(entry!.key).toBe('cite-Test Paper');
    });

    it('should remove a citation', () => {
      let result: boolean;

      act(() => {
        useLatexStore.getState().addCitation(mockPaper);
        result = useLatexStore.getState().removeCitation('cite-Test Paper');
      });

      expect(result!).toBe(true);
    });

    it('should mark citation as used', () => {
      act(() => {
        useLatexStore.getState().addCitation(mockPaper);
        useLatexStore.getState().useCitation('cite-Test Paper');
      });

      // markCitationUsed was called
      const { markCitationUsed } = jest.requireMock('@/lib/latex/citation-inserter');
      expect(markCitationUsed).toHaveBeenCalled();
    });

    it('should export citations to BibTeX', () => {
      let bibtex: string;

      act(() => {
        bibtex = useLatexStore.getState().exportCitations();
      });

      expect(bibtex!).toBe('@article{...}');
    });
  });

  describe('editor settings', () => {
    it('should update settings', () => {
      act(() => {
        useLatexStore.getState().updateSettings({
          fontSize: 16,
          theme: 'dark',
        });
      });

      const settings = useLatexStore.getState().settings;
      expect(settings.fontSize).toBe(16);
      expect(settings.theme).toBe('dark');
    });

    it('should preserve other settings when updating', () => {
      const originalLineNumbers = useLatexStore.getState().settings.lineNumbers;

      act(() => {
        useLatexStore.getState().updateSettings({ fontSize: 20 });
      });

      expect(useLatexStore.getState().settings.lineNumbers).toBe(originalLineNumbers);
    });

    it('should reset settings to defaults', () => {
      act(() => {
        useLatexStore.getState().updateSettings({
          fontSize: 24,
          theme: 'dark',
          wordWrap: false,
        });
        useLatexStore.getState().resetSettings();
      });

      const settings = useLatexStore.getState().settings;
      expect(settings.fontSize).toBe(14);
      expect(settings.theme).toBe('system');
      expect(settings.wordWrap).toBe(true);
    });
  });

  describe('utility actions', () => {
    it('should set loading state', () => {
      act(() => {
        useLatexStore.getState().setLoading(true);
      });

      expect(useLatexStore.getState().isLoading).toBe(true);

      act(() => {
        useLatexStore.getState().setLoading(false);
      });

      expect(useLatexStore.getState().isLoading).toBe(false);
    });

    it('should clear error', () => {
      act(() => {
        useLatexStore.setState({ error: 'Some error' });
        useLatexStore.getState().clearError();
      });

      expect(useLatexStore.getState().error).toBeNull();
    });
  });
});
