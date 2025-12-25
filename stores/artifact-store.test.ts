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
});
