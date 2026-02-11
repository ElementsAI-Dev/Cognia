/**
 * Tests for Artifact Store
 */

import { act } from '@testing-library/react';
import { useArtifactStore } from './artifact-store';

describe('useArtifactStore', () => {
  beforeEach(() => {
    useArtifactStore.setState({
      artifacts: {},
      activeArtifactId: null,
      canvasDocuments: {},
      activeCanvasId: null,
      canvasOpen: false,
      analysisResults: {},
      panelOpen: false,
      panelView: 'artifact',
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useArtifactStore.getState();
      expect(state.artifacts).toEqual({});
      expect(state.activeArtifactId).toBeNull();
      expect(state.canvasDocuments).toEqual({});
      expect(state.panelOpen).toBe(false);
    });
  });

  describe('artifact management', () => {
    it('should create artifact', () => {
      let artifact;
      act(() => {
        artifact = useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'Test Code',
          content: 'console.log("hello")',
          language: 'javascript',
        });
      });

      const state = useArtifactStore.getState();
      expect(Object.keys(state.artifacts)).toHaveLength(1);
      expect(state.activeArtifactId).toBe(artifact!.id);
      expect(state.panelOpen).toBe(true);
      expect(artifact!.version).toBe(1);
    });

    it('should update artifact', () => {
      let artifact;
      act(() => {
        artifact = useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'Original',
          content: 'test',
        });
      });

      act(() => {
        useArtifactStore.getState().updateArtifact(artifact!.id, { title: 'Updated' });
      });

      const updated = useArtifactStore.getState().artifacts[artifact!.id];
      expect(updated.title).toBe('Updated');
      expect(updated.version).toBe(2);
    });

    it('should delete artifact', () => {
      let artifact;
      act(() => {
        artifact = useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'To Delete',
          content: 'test',
        });
      });

      act(() => {
        useArtifactStore.getState().deleteArtifact(artifact!.id);
      });

      expect(useArtifactStore.getState().artifacts[artifact!.id]).toBeUndefined();
      expect(useArtifactStore.getState().activeArtifactId).toBeNull();
    });

    it('should get artifact by id', () => {
      let artifact;
      act(() => {
        artifact = useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'Test',
          content: 'test',
        });
      });

      expect(useArtifactStore.getState().getArtifact(artifact!.id)).toBeDefined();
      expect(useArtifactStore.getState().getArtifact('non-existent')).toBeUndefined();
    });

    it('should get session artifacts sorted by date', () => {
      act(() => {
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'First',
          content: 'first',
        });
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-2',
          type: 'code',
          title: 'Second',
          content: 'second',
        });
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-2',
          messageId: 'msg-3',
          type: 'code',
          title: 'Other',
          content: 'other',
        });
      });

      const session1Artifacts = useArtifactStore.getState().getSessionArtifacts('session-1');
      expect(session1Artifacts).toHaveLength(2);
    });

    it('should set active artifact and open panel', () => {
      let artifact;
      act(() => {
        artifact = useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'Test',
          content: 'test',
        });
        useArtifactStore.getState().closePanel();
      });

      act(() => {
        useArtifactStore.getState().setActiveArtifact(artifact!.id);
      });

      expect(useArtifactStore.getState().panelOpen).toBe(true);
      expect(useArtifactStore.getState().panelView).toBe('artifact');
    });
  });

  describe('canvas management', () => {
    it('should create canvas document', () => {
      let docId;
      act(() => {
        docId = useArtifactStore.getState().createCanvasDocument({
          title: 'Test Canvas',
          content: 'Hello World',
          language: 'typescript',
          type: 'code',
        });
      });

      const state = useArtifactStore.getState();
      expect(state.canvasDocuments[docId!]).toBeDefined();
      expect(state.activeCanvasId).toBe(docId);
      expect(state.canvasOpen).toBe(true);
    });

    it('should update canvas document', () => {
      let docId;
      act(() => {
        docId = useArtifactStore.getState().createCanvasDocument({
          title: 'Original',
          content: 'content',
          language: 'javascript',
          type: 'code',
        });
      });

      act(() => {
        useArtifactStore.getState().updateCanvasDocument(docId!, { title: 'Updated' });
      });

      expect(useArtifactStore.getState().canvasDocuments[docId!].title).toBe('Updated');
    });

    it('should delete canvas document', () => {
      let docId;
      act(() => {
        docId = useArtifactStore.getState().createCanvasDocument({
          title: 'To Delete',
          content: 'content',
          language: 'javascript',
          type: 'code',
        });
      });

      act(() => {
        useArtifactStore.getState().deleteCanvasDocument(docId!);
      });

      expect(useArtifactStore.getState().canvasDocuments[docId!]).toBeUndefined();
      expect(useArtifactStore.getState().activeCanvasId).toBeNull();
    });

    it('should open and close canvas', () => {
      act(() => {
        useArtifactStore.getState().openCanvas();
      });
      expect(useArtifactStore.getState().canvasOpen).toBe(true);

      act(() => {
        useArtifactStore.getState().closeCanvas();
      });
      expect(useArtifactStore.getState().canvasOpen).toBe(false);
    });
  });

  describe('canvas version history', () => {
    let docId: string;

    beforeEach(() => {
      act(() => {
        docId = useArtifactStore.getState().createCanvasDocument({
          title: 'Test',
          content: 'Initial content',
          language: 'javascript',
          type: 'code',
        });
      });
    });

    it('should save canvas version', () => {
      let version;
      act(() => {
        version = useArtifactStore.getState().saveCanvasVersion(docId, 'First save');
      });

      expect(version).not.toBeNull();
      expect(version!.description).toBe('First save');

      const versions = useArtifactStore.getState().getCanvasVersions(docId);
      expect(versions).toHaveLength(1);
    });

    it('should restore canvas version', () => {
      act(() => {
        useArtifactStore.getState().saveCanvasVersion(docId, 'V1');
        useArtifactStore.getState().updateCanvasDocument(docId, { content: 'Modified content' });
      });

      const versions = useArtifactStore.getState().getCanvasVersions(docId);
      const v1Id = versions[0].id;

      act(() => {
        useArtifactStore.getState().restoreCanvasVersion(docId, v1Id);
      });

      expect(useArtifactStore.getState().canvasDocuments[docId].content).toBe('Initial content');
    });

    it('should delete canvas version', () => {
      act(() => {
        useArtifactStore.getState().saveCanvasVersion(docId, 'V1');
        useArtifactStore.getState().saveCanvasVersion(docId, 'V2');
      });

      const versions = useArtifactStore.getState().getCanvasVersions(docId);
      const v1Id = versions[1].id; // V1 is now at index 1 (sorted desc)

      act(() => {
        useArtifactStore.getState().deleteCanvasVersion(docId, v1Id);
      });

      expect(useArtifactStore.getState().getCanvasVersions(docId)).toHaveLength(1);
    });
  });

  describe('analysis results', () => {
    it('should add analysis result', () => {
      let result;
      act(() => {
        result = useArtifactStore.getState().addAnalysisResult({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'math',
          content: '2 + 2 = 4',
        });
      });

      expect(result!.id).toBeDefined();
      expect(result!.createdAt).toBeInstanceOf(Date);
    });

    it('should get message analysis', () => {
      act(() => {
        useArtifactStore.getState().addAnalysisResult({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'math',
          content: 'x = 5',
        });
        useArtifactStore.getState().addAnalysisResult({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'chart',
          content: 'Sales data',
        });
      });

      const analysis = useArtifactStore.getState().getMessageAnalysis('msg-1');
      expect(analysis).toHaveLength(2);
    });
  });

  describe('panel actions', () => {
    it('should open panel with view', () => {
      act(() => {
        useArtifactStore.getState().openPanel('canvas');
      });

      expect(useArtifactStore.getState().panelOpen).toBe(true);
      expect(useArtifactStore.getState().panelView).toBe('canvas');
    });

    it('should close panel', () => {
      act(() => {
        useArtifactStore.getState().openPanel();
        useArtifactStore.getState().closePanel();
      });

      expect(useArtifactStore.getState().panelOpen).toBe(false);
    });

    it('should set panel view', () => {
      act(() => {
        useArtifactStore.getState().setPanelView('analysis');
      });

      expect(useArtifactStore.getState().panelView).toBe('analysis');
    });
  });

  describe('clearSessionData', () => {
    it('should clear all data for a session', () => {
      act(() => {
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'S1 Artifact',
          content: 'test',
        });
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-2',
          messageId: 'msg-2',
          type: 'code',
          title: 'S2 Artifact',
          content: 'test',
        });
        useArtifactStore.getState().createCanvasDocument({
          sessionId: 'session-1',
          title: 'S1 Canvas',
          content: 'test',
          language: 'javascript',
          type: 'code',
        });
      });

      act(() => {
        useArtifactStore.getState().clearSessionData('session-1');
      });

      const state = useArtifactStore.getState();
      expect(Object.values(state.artifacts)).toHaveLength(1);
      expect(Object.values(state.canvasDocuments)).toHaveLength(0);
    });
  });

  describe('batch operations', () => {
    it('should delete multiple artifacts', () => {
      let artifact1: { id: string } | undefined;
      let artifact2: { id: string } | undefined;
      let artifact3: { id: string } | undefined;

      act(() => {
        artifact1 = useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'Artifact 1',
          content: 'test 1',
        });
        artifact2 = useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-2',
          type: 'html',
          title: 'Artifact 2',
          content: 'test 2',
        });
        artifact3 = useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-3',
          type: 'react',
          title: 'Artifact 3',
          content: 'test 3',
        });
      });

      expect(Object.keys(useArtifactStore.getState().artifacts)).toHaveLength(3);

      act(() => {
        useArtifactStore.getState().deleteArtifacts([artifact1!.id, artifact2!.id]);
      });

      const state = useArtifactStore.getState();
      expect(Object.keys(state.artifacts)).toHaveLength(1);
      expect(state.artifacts[artifact3!.id]).toBeDefined();
      expect(state.artifacts[artifact1!.id]).toBeUndefined();
      expect(state.artifacts[artifact2!.id]).toBeUndefined();
    });

    it('should duplicate artifact', () => {
      let original: { id: string; title: string } | undefined;

      act(() => {
        original = useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'Original',
          content: 'original content',
          language: 'javascript',
        });
      });

      let duplicate: { id: string; title: string } | null = null;
      act(() => {
        duplicate = useArtifactStore.getState().duplicateArtifact(original!.id);
      });

      expect(duplicate).not.toBeNull();
      expect(duplicate!.id).not.toBe(original!.id);
      expect(duplicate!.title).toBe('Original (Copy)');
      expect(Object.keys(useArtifactStore.getState().artifacts)).toHaveLength(2);
    });

    it('should return null when duplicating non-existent artifact', () => {
      let result: { id: string } | null = null;
      act(() => {
        result = useArtifactStore.getState().duplicateArtifact('non-existent');
      });
      expect(result).toBeNull();
    });
  });

  describe('search and filter', () => {
    beforeEach(() => {
      act(() => {
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'JavaScript Function',
          content: 'function hello() { return "world"; }',
          language: 'javascript',
        });
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-2',
          type: 'html',
          title: 'HTML Page',
          content: '<html><body>Hello World</body></html>',
        });
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-2',
          messageId: 'msg-3',
          type: 'code',
          title: 'Python Script',
          content: 'print("Hello World")',
          language: 'python',
        });
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-4',
          type: 'react',
          title: 'React Component',
          content: 'function App() { return <div>Hello</div>; }',
        });
      });
    });

    it('should search artifacts by title', () => {
      const results = useArtifactStore.getState().searchArtifacts('JavaScript');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('JavaScript Function');
    });

    it('should search artifacts by type', () => {
      const results = useArtifactStore.getState().searchArtifacts('html');
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('html');
    });

    it('should search case-insensitively', () => {
      const results = useArtifactStore.getState().searchArtifacts('javascript');
      expect(results).toHaveLength(1);
    });

    it('should filter search by sessionId', () => {
      const results = useArtifactStore.getState().searchArtifacts('Hello', 'session-1');
      const session2Results = results.filter((a) => a.sessionId === 'session-2');
      expect(session2Results).toHaveLength(0);
    });

    it('should filter artifacts by type', () => {
      const codeArtifacts = useArtifactStore.getState().filterArtifactsByType('code');
      expect(codeArtifacts).toHaveLength(2);
      expect(codeArtifacts.every((a) => a.type === 'code')).toBe(true);
    });

    it('should filter artifacts by type and sessionId', () => {
      const codeArtifacts = useArtifactStore.getState().filterArtifactsByType('code', 'session-1');
      expect(codeArtifacts).toHaveLength(1);
      expect(codeArtifacts[0].language).toBe('javascript');
    });

    it('should get recent artifacts', () => {
      const recent = useArtifactStore.getState().getRecentArtifacts(2);
      expect(recent).toHaveLength(2);
      // Most recent should be first
      expect(recent[0].createdAt.getTime()).toBeGreaterThanOrEqual(recent[1].createdAt.getTime());
    });

    it('should get all recent artifacts with default limit', () => {
      const recent = useArtifactStore.getState().getRecentArtifacts();
      expect(recent.length).toBeLessThanOrEqual(10);
    });
  });

  describe('search excludes content', () => {
    it('should not match on content field', () => {
      act(() => {
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'My Function',
          content: 'function uniqueContentString() { return 42; }',
          language: 'javascript',
        });
      });

      const results = useArtifactStore.getState().searchArtifacts('uniqueContentString');
      expect(results).toHaveLength(0);
    });

    it('should match on title, type, and language', () => {
      act(() => {
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'react',
          title: 'Dashboard Widget',
          content: 'function App() {}',
          language: 'tsx',
        });
      });

      expect(useArtifactStore.getState().searchArtifacts('Dashboard')).toHaveLength(1);
      expect(useArtifactStore.getState().searchArtifacts('react')).toHaveLength(1);
      expect(useArtifactStore.getState().searchArtifacts('tsx')).toHaveLength(1);
    });
  });

  describe('date rehydration', () => {
    it('should return Date objects from getArtifact', () => {
      let artifact: { id: string } | undefined;
      act(() => {
        artifact = useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'Test',
          content: 'test',
        });
      });

      const retrieved = useArtifactStore.getState().getArtifact(artifact!.id);
      expect(retrieved?.createdAt).toBeInstanceOf(Date);
      expect(retrieved?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return Date objects from getSessionArtifacts', () => {
      act(() => {
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'Test',
          content: 'test',
        });
      });

      const artifacts = useArtifactStore.getState().getSessionArtifacts('session-1');
      expect(artifacts[0].createdAt).toBeInstanceOf(Date);
      expect(artifacts[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should return Date objects from searchArtifacts', () => {
      act(() => {
        useArtifactStore.getState().createArtifact({
          sessionId: 'session-1',
          messageId: 'msg-1',
          type: 'code',
          title: 'Searchable Test',
          content: 'test',
        });
      });

      const results = useArtifactStore.getState().searchArtifacts('Searchable');
      expect(results[0].createdAt).toBeInstanceOf(Date);
      expect(results[0].updatedAt).toBeInstanceOf(Date);
    });
  });
});
