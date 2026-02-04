/**
 * useDesignerCollaboration - Hook for real-time collaborative editing in Designer
 * Reuses Canvas CRDT and WebSocket infrastructure for Designer-specific collaboration
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Participant,
  CollaborativeSession,
  RemoteCursor,
  CursorPosition,
  CollaborationEvent,
  LineRange,
} from '@/types/canvas/collaboration';
import { CanvasCRDTStore, crdtStore } from '@/lib/canvas/collaboration/crdt-store';
import {
  CanvasWebSocketProvider,
  type ConnectionState,
} from '@/lib/canvas/collaboration/websocket-provider';
import { CollabAwareness } from '@/lib/designer/collaboration/collab-awareness';
import { loggers } from '@/lib/logger';

const log = loggers.app;

export interface DesignerCollaborationConfig {
  websocketUrl?: string;
  participantName?: string;
  participantColor?: string;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
}

export interface UseDesignerCollaborationReturn {
  session: CollaborativeSession | null;
  participants: Participant[];
  remoteCursors: RemoteCursor[];
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  localParticipant: Participant | null;
  connect: (documentId: string, initialCode: string) => Promise<string>;
  disconnect: () => void;
  updateCode: (position: number, text: string, type: 'insert' | 'delete', length?: number) => void;
  updateCursor: (cursor: CursorPosition) => void;
  updateSelection: (selection: LineRange | null) => void;
  getCode: () => string | null;
  shareSession: () => string | null;
  joinSession: (sessionId: string) => Promise<void>;
  setParticipantInfo: (name: string, color?: string) => void;
}

const DEFAULT_CONFIG: DesignerCollaborationConfig = {
  websocketUrl: 'ws://localhost:8080/designer',
  participantName: 'Anonymous',
  participantColor: '#3b82f6',
  autoReconnect: true,
  reconnectAttempts: 5,
};

const PARTICIPANT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

function getRandomColor(): string {
  return PARTICIPANT_COLORS[Math.floor(Math.random() * PARTICIPANT_COLORS.length)];
}

export function useDesignerCollaboration(
  config: DesignerCollaborationConfig = {}
): UseDesignerCollaborationReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const [session, setSession] = useState<CollaborativeSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [localParticipant, setLocalParticipant] = useState<Participant | null>(null);

  const storeRef = useRef<CanvasCRDTStore>(crdtStore);
  const providerRef = useRef<CanvasWebSocketProvider | null>(null);
  const awarenessRef = useRef<CollabAwareness>(new CollabAwareness());
  const participantIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const participantInfoRef = useRef({
    name: mergedConfig.participantName || 'Anonymous',
    color: mergedConfig.participantColor || getRandomColor(),
  });

  const getParticipantId = useCallback((): string => {
    if (!participantIdRef.current) {
      participantIdRef.current = `designer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return participantIdRef.current;
  }, []);

  const createLocalParticipant = useCallback((): Participant => {
    const participant: Participant = {
      id: getParticipantId(),
      name: participantInfoRef.current.name,
      color: participantInfoRef.current.color,
      lastActive: new Date(),
      isOnline: true,
    };
    setLocalParticipant(participant);
    // Register local user in awareness
    awarenessRef.current.setLocalUser({
      id: participant.id,
      name: participant.name,
      color: participant.color,
    });
    return participant;
  }, [getParticipantId]);

  const handleCollaborationEvent = useCallback(
    (event: CollaborationEvent) => {
      switch (event.type) {
        case 'participant-joined':
          if (event.data) {
            const newParticipant = event.data as Participant;
            setParticipants((prev) => {
              const existing = prev.find((p) => p.id === newParticipant.id);
              if (existing) return prev;
              return [...prev, newParticipant];
            });
          }
          break;

        case 'participant-left':
          setParticipants((prev) => prev.filter((p) => p.id !== event.participantId));
          setRemoteCursors((prev) => prev.filter((c) => c.participantId !== event.participantId));
          break;

        case 'cursor-moved':
          if (event.participantId && event.data) {
            const cursorData = event.data as CursorPosition;
            setRemoteCursors((prev) => {
              const participant = participants.find((p) => p.id === event.participantId);

              const cursor: RemoteCursor = {
                participantId: event.participantId!,
                position: cursorData,
                color: participant?.color || '#888',
                name: participant?.name || 'Unknown',
              };

              const existingIndex = prev.findIndex((c) => c.participantId === event.participantId);
              if (existingIndex >= 0) {
                const newCursors = [...prev];
                newCursors[existingIndex] = cursor;
                return newCursors;
              }
              return [...prev, cursor];
            });
          }
          break;

        case 'selection-changed':
          if (event.participantId && event.data) {
            const selectionData = event.data as LineRange | null;
            setRemoteCursors((prev) => {
              return prev.map((c) => {
                if (c.participantId === event.participantId) {
                  return { ...c, selection: selectionData || undefined };
                }
                return c;
              });
            });
          }
          break;

        case 'connected':
          setConnectionState('connected');
          break;

        case 'disconnected':
          setConnectionState('disconnected');
          break;

        case 'error':
          setConnectionState('error');
          log.error('Collaboration error', event.data as Error);
          break;
      }
    },
    [participants]
  );

  const connect = useCallback(
    async (documentId: string, initialCode: string): Promise<string> => {
      const store = storeRef.current;

      const newSession = store.createSession(documentId, initialCode);
      sessionIdRef.current = newSession.id;
      setSession(newSession);

      const participant = createLocalParticipant();
      store.joinSession(newSession.id, participant);
      store.setLocalParticipantId(getParticipantId());
      setParticipants([participant]);

      if (mergedConfig.websocketUrl) {
        try {
          const provider = new CanvasWebSocketProvider(store, {
            url: mergedConfig.websocketUrl,
            reconnectAttempts: mergedConfig.reconnectAttempts,
          });
          providerRef.current = provider;

          provider.on('connected', handleCollaborationEvent);
          provider.on('disconnected', handleCollaborationEvent);
          provider.on('participant-joined', handleCollaborationEvent);
          provider.on('participant-left', handleCollaborationEvent);
          provider.on('cursor-moved', handleCollaborationEvent);
          provider.on('selection-changed', handleCollaborationEvent);
          provider.on('content-updated', handleCollaborationEvent);
          provider.on('error', handleCollaborationEvent);

          setConnectionState('connecting');
          await provider.connect(newSession.id, participant);
        } catch (error) {
          log.error('Failed to connect WebSocket', error as Error);
          setConnectionState('disconnected');
        }
      }

      return newSession.id;
    },
    [
      mergedConfig.websocketUrl,
      mergedConfig.reconnectAttempts,
      createLocalParticipant,
      handleCollaborationEvent,
      getParticipantId,
    ]
  );

  const disconnect = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current = null;
    }

    if (sessionIdRef.current) {
      storeRef.current.leaveSession(sessionIdRef.current, getParticipantId());
      storeRef.current.closeSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }

    setSession(null);
    setParticipants([]);
    setRemoteCursors([]);
    setLocalParticipant(null);
    setConnectionState('disconnected');
  }, [getParticipantId]);

  const updateCode = useCallback(
    (position: number, text: string, type: 'insert' | 'delete', length?: number) => {
      if (!sessionIdRef.current) return;

      const operation = storeRef.current.applyLocalUpdate(sessionIdRef.current, {
        type,
        position,
        text: type === 'insert' ? text : undefined,
        length: type === 'delete' ? (length ?? text.length) : undefined,
        origin: getParticipantId(),
      });

      if (providerRef.current) {
        providerRef.current.broadcastOperation(operation);
      }
    },
    [getParticipantId]
  );

  const updateCursor = useCallback(
    (cursor: CursorPosition) => {
      if (!sessionIdRef.current) return;

      storeRef.current.updateCursor(sessionIdRef.current, getParticipantId(), cursor);
      // Update local cursor in awareness
      awarenessRef.current.updateLocalCursor(cursor);

      if (providerRef.current) {
        providerRef.current.broadcastCursor(cursor);
      }
    },
    [getParticipantId]
  );

  const updateSelection = useCallback(
    (selection: LineRange | null) => {
      if (!sessionIdRef.current) return;

      if (providerRef.current) {
        providerRef.current.broadcastSelection(selection);
      }
    },
    []
  );

  const getCode = useCallback((): string | null => {
    if (!sessionIdRef.current) return null;
    return storeRef.current.getDocumentContent(sessionIdRef.current);
  }, []);

  const shareSession = useCallback((): string | null => {
    if (!sessionIdRef.current) return null;
    return storeRef.current.serializeState(sessionIdRef.current);
  }, []);

  const joinSession = useCallback(
    async (sessionId: string): Promise<void> => {
      const store = storeRef.current;
      const existingSession = store.getSession(sessionId);

      if (existingSession) {
        sessionIdRef.current = sessionId;
        setSession(existingSession);

        const participant = createLocalParticipant();
        store.joinSession(sessionId, participant);
        setParticipants(existingSession.participants);

        if (mergedConfig.websocketUrl && providerRef.current === null) {
          try {
            const provider = new CanvasWebSocketProvider(store, {
              url: mergedConfig.websocketUrl,
              reconnectAttempts: mergedConfig.reconnectAttempts,
            });
            providerRef.current = provider;

            provider.on('connected', handleCollaborationEvent);
            provider.on('disconnected', handleCollaborationEvent);
            provider.on('participant-joined', handleCollaborationEvent);
            provider.on('participant-left', handleCollaborationEvent);
            provider.on('cursor-moved', handleCollaborationEvent);
            provider.on('selection-changed', handleCollaborationEvent);
            provider.on('content-updated', handleCollaborationEvent);
            provider.on('error', handleCollaborationEvent);

            setConnectionState('connecting');
            await provider.connect(sessionId, participant);
            provider.requestSync();
          } catch (error) {
            log.error('Failed to join session', error as Error);
            setConnectionState('error');
          }
        }
      }
    },
    [
      mergedConfig.websocketUrl,
      mergedConfig.reconnectAttempts,
      createLocalParticipant,
      handleCollaborationEvent,
    ]
  );

  const setParticipantInfo = useCallback((name: string, color?: string) => {
    participantInfoRef.current = {
      name,
      color: color || participantInfoRef.current.color,
    };

    setLocalParticipant((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        name,
        color: color || prev.color,
      };
    });
  }, []);

  useEffect(() => {
    const awareness = awarenessRef.current;
    return () => {
      disconnect();
      // Cleanup awareness on unmount
      awareness.destroy();
    };
  }, [disconnect]);

  return {
    session,
    participants,
    remoteCursors,
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    localParticipant,
    connect,
    disconnect,
    updateCode,
    updateCursor,
    updateSelection,
    getCode,
    shareSession,
    joinSession,
    setParticipantInfo,
  };
}

export default useDesignerCollaboration;
