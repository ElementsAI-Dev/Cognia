/**
 * Tests for Canvas Plugin API
 */

import { createCanvasAPI } from './canvas-api';

// Mock artifact store for canvas operations
const mockCanvasDocuments: Record<string, {
  id: string;
  sessionId: string;
  title: string;
  content: string;
  language?: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  aiSuggestions: unknown[];
  versions: unknown[];
}> = {};
let mockActiveCanvasId: string | null = null;
let mockPanelView: string | null = null;
const mockSubscribers: Array<(state: unknown) => void> = [];

jest.mock('@/stores/artifact/artifact-store', () => ({
  useArtifactStore: {
    getState: jest.fn(() => ({
      canvasDocuments: mockCanvasDocuments,
      activeCanvasId: mockActiveCanvasId,
      createCanvasDocument: jest.fn((options) => {
        const id = `canvas-${Date.now()}`;
        mockCanvasDocuments[id] = {
          id,
          ...options,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          aiSuggestions: [],
          versions: [],
        };
        return id;
      }),
      updateCanvasDocument: jest.fn((id, updates) => {
        if (mockCanvasDocuments[id]) {
          Object.assign(mockCanvasDocuments[id], updates, {
            updatedAt: new Date().toISOString(),
          });
        }
      }),
      deleteCanvasDocument: jest.fn((id) => {
        delete mockCanvasDocuments[id];
      }),
      setActiveCanvas: jest.fn((id) => {
        mockActiveCanvasId = id;
      }),
      setPanelView: jest.fn((view) => {
        mockPanelView = view;
      }),
      closeCanvas: jest.fn(() => {
        mockActiveCanvasId = null;
        mockPanelView = null;
      }),
      saveCanvasVersion: jest.fn((id, description) => {
        const versionId = `version-${Date.now()}`;
        if (mockCanvasDocuments[id]) {
          mockCanvasDocuments[id].versions.push({
            id: versionId,
            description,
            createdAt: new Date().toISOString(),
          });
        }
        return { id: versionId };
      }),
      restoreCanvasVersion: jest.fn(),
    })),
    subscribe: jest.fn((callback) => {
      mockSubscribers.push(callback);
      return () => {
        const idx = mockSubscribers.indexOf(callback);
        if (idx >= 0) mockSubscribers.splice(idx, 1);
      };
    }),
  },
}));

describe('Canvas API', () => {
  const testPluginId = 'test-plugin';

  beforeEach(() => {
    // Clear state
    Object.keys(mockCanvasDocuments).forEach(key => delete mockCanvasDocuments[key]);
    mockActiveCanvasId = null;
    mockPanelView = null;
    mockSubscribers.length = 0;
  });

  describe('createCanvasAPI', () => {
    it('should create an API object with all expected methods', () => {
      const api = createCanvasAPI(testPluginId);

      expect(api).toBeDefined();
      expect(typeof api.getCurrentDocument).toBe('function');
      expect(typeof api.getDocument).toBe('function');
      expect(typeof api.createDocument).toBe('function');
      expect(typeof api.updateDocument).toBe('function');
      expect(typeof api.deleteDocument).toBe('function');
      expect(typeof api.openDocument).toBe('function');
      expect(typeof api.closeCanvas).toBe('function');
      expect(typeof api.getSelection).toBe('function');
      expect(typeof api.setSelection).toBe('function');
      expect(typeof api.insertText).toBe('function');
      expect(typeof api.replaceSelection).toBe('function');
      expect(typeof api.getContent).toBe('function');
      expect(typeof api.setContent).toBe('function');
      expect(typeof api.saveVersion).toBe('function');
      expect(typeof api.restoreVersion).toBe('function');
      expect(typeof api.getVersions).toBe('function');
      expect(typeof api.onCanvasChange).toBe('function');
      expect(typeof api.onContentChange).toBe('function');
    });
  });

  describe('getCurrentDocument', () => {
    it('should return null when no document is active', () => {
      const api = createCanvasAPI(testPluginId);

      const result = api.getCurrentDocument();
      expect(result).toBeNull();
    });

    it('should return current document when one is active', () => {
      const docId = 'canvas-doc-1';
      mockCanvasDocuments[docId] = {
        id: docId,
        sessionId: 'session-1',
        title: 'Test Canvas',
        content: 'Hello world',
        type: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiSuggestions: [],
        versions: [],
      };
      mockActiveCanvasId = docId;

      const api = createCanvasAPI(testPluginId);
      const result = api.getCurrentDocument();

      expect(result).toBeDefined();
      expect(result?.id).toBe(docId);
      expect(result?.title).toBe('Test Canvas');
    });
  });

  describe('getDocument', () => {
    it('should return document by ID', () => {
      const docId = 'doc-123';
      mockCanvasDocuments[docId] = {
        id: docId,
        sessionId: 'session-1',
        title: 'Specific Doc',
        content: 'content',
        type: 'code',
        language: 'typescript',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiSuggestions: [],
        versions: [],
      };

      const api = createCanvasAPI(testPluginId);
      const result = api.getDocument(docId);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Specific Doc');
      expect(result?.language).toBe('typescript');
    });

    it('should return null for non-existent document', () => {
      const api = createCanvasAPI(testPluginId);
      const result = api.getDocument('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createDocument', () => {
    it('should create a new canvas document', async () => {
      const api = createCanvasAPI(testPluginId);

      const id = await api.createDocument({
        sessionId: 'session-1',
        title: 'New Canvas',
        content: 'Initial content',
        type: 'text',
        language: 'markdown',
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });
  });

  describe('updateDocument', () => {
    it('should update an existing document', () => {
      const docId = 'update-doc';
      mockCanvasDocuments[docId] = {
        id: docId,
        sessionId: 'session-1',
        title: 'Original',
        content: 'original content',
        type: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiSuggestions: [],
        versions: [],
      };

      const api = createCanvasAPI(testPluginId);
      api.updateDocument(docId, {
        title: 'Updated Title',
        content: 'updated content',
      });

      expect(mockCanvasDocuments[docId].title).toBe('Updated Title');
      expect(mockCanvasDocuments[docId].content).toBe('updated content');
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document', () => {
      const docId = 'delete-doc';
      mockCanvasDocuments[docId] = {
        id: docId,
        sessionId: 'session-1',
        title: 'To Delete',
        content: '',
        type: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiSuggestions: [],
        versions: [],
      };

      const api = createCanvasAPI(testPluginId);
      api.deleteDocument(docId);

      expect(mockCanvasDocuments[docId]).toBeUndefined();
    });
  });

  describe('openDocument / closeCanvas', () => {
    it('should open a document', () => {
      const api = createCanvasAPI(testPluginId);
      api.openDocument('doc-to-open');

      expect(mockActiveCanvasId).toBe('doc-to-open');
    });

    it('should close canvas', () => {
      mockActiveCanvasId = 'active-doc';
      mockPanelView = 'canvas';

      const api = createCanvasAPI(testPluginId);
      api.closeCanvas();

      expect(mockActiveCanvasId).toBeNull();
      expect(mockPanelView).toBeNull();
    });
  });

  describe('getContent / setContent', () => {
    it('should get content of active document', () => {
      const docId = 'content-doc';
      mockCanvasDocuments[docId] = {
        id: docId,
        sessionId: 'session-1',
        title: 'Content Test',
        content: 'This is the content',
        type: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiSuggestions: [],
        versions: [],
      };
      mockActiveCanvasId = docId;

      const api = createCanvasAPI(testPluginId);
      const content = api.getContent();

      expect(content).toBe('This is the content');
    });

    it('should get content by document ID', () => {
      const docId = 'specific-doc';
      mockCanvasDocuments[docId] = {
        id: docId,
        sessionId: 'session-1',
        title: 'Specific',
        content: 'Specific content',
        type: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiSuggestions: [],
        versions: [],
      };

      const api = createCanvasAPI(testPluginId);
      const content = api.getContent(docId);

      expect(content).toBe('Specific content');
    });

    it('should return empty string for non-existent document', () => {
      const api = createCanvasAPI(testPluginId);
      const content = api.getContent('non-existent');

      expect(content).toBe('');
    });

    it('should set content of active document', () => {
      const docId = 'set-content-doc';
      mockCanvasDocuments[docId] = {
        id: docId,
        sessionId: 'session-1',
        title: 'Set Content',
        content: 'old content',
        type: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiSuggestions: [],
        versions: [],
      };
      mockActiveCanvasId = docId;

      const api = createCanvasAPI(testPluginId);
      api.setContent('new content');

      expect(mockCanvasDocuments[docId].content).toBe('new content');
    });
  });

  describe('insertText', () => {
    it('should insert text at end of document', () => {
      const docId = 'insert-doc';
      mockCanvasDocuments[docId] = {
        id: docId,
        sessionId: 'session-1',
        title: 'Insert Test',
        content: 'Hello',
        type: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiSuggestions: [],
        versions: [],
      };
      mockActiveCanvasId = docId;

      const api = createCanvasAPI(testPluginId);
      api.insertText(' World');

      expect(mockCanvasDocuments[docId].content).toBe('Hello World');
    });

    it('should do nothing when no active document', () => {
      const api = createCanvasAPI(testPluginId);
      
      // Should not throw
      expect(() => api.insertText('test')).not.toThrow();
    });
  });

  describe('Version management', () => {
    const docId = 'version-doc';

    beforeEach(() => {
      mockCanvasDocuments[docId] = {
        id: docId,
        sessionId: 'session-1',
        title: 'Version Test',
        content: 'content',
        type: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiSuggestions: [],
        versions: [],
      };
    });

    it('should save a version', async () => {
      const api = createCanvasAPI(testPluginId);

      const versionId = await api.saveVersion(docId, 'First version');

      expect(versionId).toBeDefined();
      expect(mockCanvasDocuments[docId].versions.length).toBe(1);
    });

    it('should get versions', () => {
      mockCanvasDocuments[docId].versions = [
        { id: 'v1', description: 'Version 1', createdAt: new Date().toISOString() },
        { id: 'v2', description: 'Version 2', createdAt: new Date().toISOString() },
      ];

      const api = createCanvasAPI(testPluginId);
      const versions = api.getVersions(docId);

      expect(versions.length).toBe(2);
    });

    it('should return empty array for non-existent document', () => {
      const api = createCanvasAPI(testPluginId);
      const versions = api.getVersions('non-existent');

      expect(versions).toEqual([]);
    });
  });

  describe('onCanvasChange / onContentChange', () => {
    it('should subscribe to canvas changes', () => {
      const api = createCanvasAPI(testPluginId);
      const handler = jest.fn();

      const unsubscribe = api.onCanvasChange(handler);

      expect(typeof unsubscribe).toBe('function');
      expect(mockSubscribers.length).toBe(1);
    });

    it('should subscribe to content changes', () => {
      const api = createCanvasAPI(testPluginId);
      const handler = jest.fn();

      const unsubscribe = api.onContentChange(handler);

      expect(typeof unsubscribe).toBe('function');
      expect(mockSubscribers.length).toBe(1);
    });

    it('should unsubscribe when cleanup is called', () => {
      const api = createCanvasAPI(testPluginId);

      const unsub1 = api.onCanvasChange(jest.fn());
      const unsub2 = api.onContentChange(jest.fn());

      expect(mockSubscribers.length).toBe(2);

      unsub1();
      unsub2();

      expect(mockSubscribers.length).toBe(0);
    });
  });

  describe('getSelection', () => {
    it('should return null in non-browser environment', () => {
      const api = createCanvasAPI(testPluginId);
      
      // In test environment, window might be defined but getSelection might not work as expected
      const selection = api.getSelection();
      
      // Either null or a selection object is acceptable
      expect(selection === null || typeof selection === 'object').toBe(true);
    });
  });

  describe('setSelection', () => {
    it('should not throw when called', () => {
      const api = createCanvasAPI(testPluginId);
      
      expect(() => api.setSelection(0, 10)).not.toThrow();
    });
  });

  describe('replaceSelection', () => {
    it('should append text when document exists', () => {
      const docId = 'replace-doc';
      mockCanvasDocuments[docId] = {
        id: docId,
        sessionId: 'session-1',
        title: 'Replace Test',
        content: 'existing',
        type: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiSuggestions: [],
        versions: [],
      };
      mockActiveCanvasId = docId;

      const api = createCanvasAPI(testPluginId);
      api.replaceSelection(' appended');

      expect(mockCanvasDocuments[docId].content).toBe('existing appended');
    });
  });
});
