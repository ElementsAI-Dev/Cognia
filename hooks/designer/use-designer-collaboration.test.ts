/**
 * Tests for useDesignerCollaboration hook
 */

import { renderHook, act } from '@testing-library/react';
import { useDesignerCollaboration } from './use-designer-collaboration';
import type { Participant, CollaborativeSession } from '@/types/canvas/collaboration';

const mockCreateSession = jest.fn();
const mockJoinSession = jest.fn();
const mockLeaveSession = jest.fn();
const mockCloseSession = jest.fn();
const mockApplyLocalUpdate = jest.fn();
const mockUpdateCursor = jest.fn();
const mockGetDocumentContent = jest.fn();
const mockSerializeState = jest.fn();
const mockDeserializeState = jest.fn();
const mockGetSession = jest.fn();
const mockSetLocalParticipantId = jest.fn();

jest.mock('@/lib/canvas/collaboration/crdt-store', () => ({
  CanvasCRDTStore: jest.fn(),
  crdtStore: {
    createSession: (...args: unknown[]) => mockCreateSession(...args),
    joinSession: (...args: unknown[]) => mockJoinSession(...args),
    leaveSession: (...args: unknown[]) => mockLeaveSession(...args),
    closeSession: (...args: unknown[]) => mockCloseSession(...args),
    applyLocalUpdate: (...args: unknown[]) => mockApplyLocalUpdate(...args),
    updateCursor: (...args: unknown[]) => mockUpdateCursor(...args),
    getDocumentContent: (...args: unknown[]) => mockGetDocumentContent(...args),
    serializeState: (...args: unknown[]) => mockSerializeState(...args),
    deserializeState: (...args: unknown[]) => mockDeserializeState(...args),
    getSession: (...args: unknown[]) => mockGetSession(...args),
    setLocalParticipantId: (...args: unknown[]) => mockSetLocalParticipantId(...args),
  },
}));

const mockProviderConnect = jest.fn();
const mockProviderDisconnect = jest.fn();
const mockProviderOn = jest.fn();
const mockBroadcastOperation = jest.fn();
const mockBroadcastCursor = jest.fn();
const mockBroadcastSelection = jest.fn();
const mockRequestSync = jest.fn();

jest.mock('@/lib/canvas/collaboration/websocket-provider', () => ({
  CanvasWebSocketProvider: jest.fn().mockImplementation(() => ({
    connect: mockProviderConnect,
    disconnect: mockProviderDisconnect,
    on: mockProviderOn,
    broadcastOperation: mockBroadcastOperation,
    broadcastCursor: mockBroadcastCursor,
    broadcastSelection: mockBroadcastSelection,
    requestSync: mockRequestSync,
  })),
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    app: {
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

describe('useDesignerCollaboration', () => {
  const mockSession: CollaborativeSession = {
    id: 'session-123',
    documentId: 'doc-456',
    ownerId: 'owner-789',
    participants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    permissions: {
      canEdit: true,
      canComment: true,
      canShare: true,
      canExport: true,
    },
  };

  const mockParticipant: Participant = {
    id: 'participant-001',
    name: 'Test User',
    color: '#3b82f6',
    lastActive: new Date(),
    isOnline: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSession.mockReturnValue(mockSession);
    mockProviderConnect.mockResolvedValue(undefined);
    mockApplyLocalUpdate.mockReturnValue({ type: 'insert', position: 0, text: 'test' });
    mockDeserializeState.mockReturnValue(null);
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      expect(result.current.session).toBeNull();
      expect(result.current.participants).toEqual([]);
      expect(result.current.remoteCursors).toEqual([]);
      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.localParticipant).toBeNull();
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        websocketUrl: 'ws://custom:8080',
        participantName: 'Custom User',
        participantColor: '#ff0000',
      };

      const { result } = renderHook(() => useDesignerCollaboration(customConfig));

      expect(result.current.session).toBeNull();
    });
  });

  describe('connect', () => {
    it('should create session and set up participant', async () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      let sessionId: string = '';
      await act(async () => {
        sessionId = await result.current.connect('doc-456', 'initial code');
      });

      expect(sessionId).toBe('session-123');
      expect(mockCreateSession).toHaveBeenCalledWith('doc-456', 'initial code');
      expect(mockJoinSession).toHaveBeenCalled();
      expect(mockSetLocalParticipantId).toHaveBeenCalled();
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.participants.length).toBe(1);
      expect(result.current.localParticipant).not.toBeNull();
    });

    it('should connect to websocket when url is provided', async () => {
      const { result } = renderHook(() =>
        useDesignerCollaboration({ websocketUrl: 'ws://localhost:8080' })
      );

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      expect(mockProviderConnect).toHaveBeenCalled();
      expect(mockProviderOn).toHaveBeenCalledTimes(8);
    });

    it('should handle connection failure gracefully', async () => {
      mockProviderConnect.mockRejectedValue(new Error('Connection failed'));

      const { result } = renderHook(() =>
        useDesignerCollaboration({ websocketUrl: 'ws://localhost:8080' })
      );

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      expect(result.current.connectionState).toBe('disconnected');
    });
  });

  describe('disconnect', () => {
    it('should clean up session and provider', async () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.participants).toEqual([]);
      expect(result.current.remoteCursors).toEqual([]);
      expect(result.current.localParticipant).toBeNull();
      expect(result.current.connectionState).toBe('disconnected');
    });

    it('should leave session in store', async () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      act(() => {
        result.current.disconnect();
      });

      expect(mockLeaveSession).toHaveBeenCalled();
      expect(mockCloseSession).toHaveBeenCalled();
    });
  });

  describe('updateCode', () => {
    it('should apply local update for insert', async () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      act(() => {
        result.current.updateCode(0, 'new text', 'insert');
      });

      expect(mockApplyLocalUpdate).toHaveBeenCalledWith('session-123', {
        type: 'insert',
        position: 0,
        text: 'new text',
        length: undefined,
        origin: expect.any(String),
      });
      expect(mockBroadcastOperation).toHaveBeenCalled();
    });

    it('should apply local update for delete', async () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      act(() => {
        result.current.updateCode(0, 'del', 'delete', 2);
      });

      expect(mockApplyLocalUpdate).toHaveBeenCalledWith('session-123', {
        type: 'delete',
        position: 0,
        text: undefined,
        length: 2,
        origin: expect.any(String),
      });
    });

    it('should not update when no session', () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      act(() => {
        result.current.updateCode(0, 'text', 'insert');
      });

      expect(mockApplyLocalUpdate).not.toHaveBeenCalled();
    });
  });

  describe('updateCursor', () => {
    it('should update cursor position', async () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      act(() => {
        result.current.updateCursor({ line: 5, column: 10 });
      });

      expect(mockUpdateCursor).toHaveBeenCalledWith(
        'session-123',
        expect.any(String),
        { line: 5, column: 10 }
      );
      expect(mockBroadcastCursor).toHaveBeenCalledWith({ line: 5, column: 10 });
    });

    it('should not update cursor when no session', () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      act(() => {
        result.current.updateCursor({ line: 1, column: 1 });
      });

      expect(mockUpdateCursor).not.toHaveBeenCalled();
    });
  });

  describe('updateSelection', () => {
    it('should broadcast selection', async () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      const selection = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 10 };
      act(() => {
        result.current.updateSelection(selection);
      });

      expect(mockBroadcastSelection).toHaveBeenCalledWith(selection);
    });

    it('should broadcast null selection to clear', async () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      act(() => {
        result.current.updateSelection(null);
      });

      expect(mockBroadcastSelection).toHaveBeenCalledWith(null);
    });
  });

  describe('getCode', () => {
    it('should return document content', async () => {
      mockGetDocumentContent.mockReturnValue('current content');
      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      const content = result.current.getCode();

      expect(content).toBe('current content');
      expect(mockGetDocumentContent).toHaveBeenCalledWith('session-123');
    });

    it('should return null when no session', () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      const content = result.current.getCode();

      expect(content).toBeNull();
    });
  });

  describe('shareSession', () => {
    it('should serialize and return session state', async () => {
      mockSerializeState.mockReturnValue('serialized-session-data');
      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      const serialized = result.current.shareSession();

      expect(serialized).toBe('serialized-session-data');
    });

    it('should return null when no session', () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      const serialized = result.current.shareSession();

      expect(serialized).toBeNull();
    });
  });

  describe('joinSession', () => {
    it('should join existing session', async () => {
      const existingSession: CollaborativeSession = {
        ...mockSession,
        id: 'existing-session',
        participants: [mockParticipant],
      };
      mockGetSession.mockReturnValue(existingSession);

      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.joinSession('existing-session');
      });

      expect(result.current.session).toEqual(existingSession);
      expect(mockJoinSession).toHaveBeenCalled();
    });

    it('should do nothing if session does not exist', async () => {
      mockGetSession.mockReturnValue(null);

      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.joinSession('non-existent');
      });

      expect(result.current.session).toBeNull();
    });
  });

  describe('importSharedSession', () => {
    it('should import serialized session and set local state', async () => {
      const existingSession: CollaborativeSession = {
        ...mockSession,
        id: 'imported-session',
      };
      mockDeserializeState.mockReturnValue('imported-session');
      mockGetSession.mockReturnValue(existingSession);
      mockGetDocumentContent.mockReturnValue('shared code');

      const { result } = renderHook(() => useDesignerCollaboration());

      let importedId: string | null = null;
      await act(async () => {
        importedId = await result.current.importSharedSession('serialized');
      });

      expect(importedId).toBe('imported-session');
      expect(result.current.session).toEqual(existingSession);
    });

    it('should return null when import fails', async () => {
      mockDeserializeState.mockReturnValue(null);
      const { result } = renderHook(() => useDesignerCollaboration());

      let importedId: string | null = 'unexpected';
      await act(async () => {
        importedId = await result.current.importSharedSession('broken');
      });

      expect(importedId).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('setParticipantInfo', () => {
    it('should update participant name and color', async () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      act(() => {
        result.current.setParticipantInfo('New Name', '#ff0000');
      });

      expect(result.current.localParticipant?.name).toBe('New Name');
      expect(result.current.localParticipant?.color).toBe('#ff0000');
    });

    it('should keep color if not provided', async () => {
      const { result } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      const originalColor = result.current.localParticipant?.color;

      act(() => {
        result.current.setParticipantInfo('New Name');
      });

      expect(result.current.localParticipant?.name).toBe('New Name');
      expect(result.current.localParticipant?.color).toBe(originalColor);
    });
  });

  describe('cleanup', () => {
    it('should disconnect on unmount', async () => {
      const { result, unmount } = renderHook(() => useDesignerCollaboration());

      await act(async () => {
        await result.current.connect('doc-456', 'content');
      });

      unmount();

      expect(mockProviderDisconnect).toHaveBeenCalled();
    });
  });
});
