/**
 * useCollaborativeSession - Hook for real-time collaborative editing
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { 
  Participant, 
  CollaborativeSession,
  RemoteCursor,
  CursorPosition,
  CollaborationEvent 
} from '@/types/canvas/collaboration';
import { 
  CanvasCRDTStore, 
  crdtStore 
} from '@/lib/canvas/collaboration/crdt-store';
import { 
  CanvasWebSocketProvider,
  type ConnectionState 
} from '@/lib/canvas/collaboration/websocket-provider';

interface UseCollaborativeSessionReturn {
  session: CollaborativeSession | null;
  participants: Participant[];
  remoteCursors: RemoteCursor[];
  connectionState: ConnectionState;
  isConnected: boolean;
  connect: (documentId: string, content: string) => Promise<string>;
  disconnect: () => void;
  updateContent: (position: number, text: string, type: 'insert' | 'delete') => void;
  updateCursor: (cursor: CursorPosition) => void;
  getContent: () => string | null;
  shareSession: () => string | null;
  joinSession: (sessionId: string) => Promise<void>;
}

interface CollaborativeSessionConfig {
  websocketUrl?: string;
  participantName?: string;
  participantColor?: string;
}

const DEFAULT_CONFIG: CollaborativeSessionConfig = {
  websocketUrl: 'ws://localhost:8080/canvas',
  participantName: 'Anonymous',
  participantColor: '#3b82f6',
};

export function useCollaborativeSession(
  config: CollaborativeSessionConfig = {}
): UseCollaborativeSessionReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [session, setSession] = useState<CollaborativeSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  const storeRef = useRef<CanvasCRDTStore>(crdtStore);
  const providerRef = useRef<CanvasWebSocketProvider | null>(null);
  const participantIdRef = useRef<string | null>(null);
  
  // Generate participant ID only once on first access
  const getParticipantId = useCallback((): string => {
    if (!participantIdRef.current) {
      participantIdRef.current = `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return participantIdRef.current;
  }, []);
  const sessionIdRef = useRef<string | null>(null);

  const createLocalParticipant = useCallback((): Participant => ({
    id: getParticipantId(),
    name: mergedConfig.participantName || 'Anonymous',
    color: mergedConfig.participantColor || '#3b82f6',
    lastActive: new Date(),
    isOnline: true,
  }), [mergedConfig.participantName, mergedConfig.participantColor, getParticipantId]);

  const handleCollaborationEvent = useCallback((event: CollaborationEvent) => {
    switch (event.type) {
      case 'participant-joined':
        if (event.data) {
          setParticipants(prev => {
            const existing = prev.find(p => p.id === (event.data as Participant).id);
            if (existing) return prev;
            return [...prev, event.data as Participant];
          });
        }
        break;
      
      case 'participant-left':
        setParticipants(prev => prev.filter(p => p.id !== event.participantId));
        setRemoteCursors(prev => prev.filter(c => c.participantId !== event.participantId));
        break;
      
      case 'cursor-moved':
        if (event.participantId && event.data) {
          const cursorData = event.data as CursorPosition;
          setRemoteCursors(prev => {
            const existing = prev.find(c => c.participantId === event.participantId);
            const participant = participants.find(p => p.id === event.participantId);
            
            const cursor: RemoteCursor = {
              participantId: event.participantId!,
              position: cursorData,
              color: participant?.color || '#888',
              name: participant?.name || 'Unknown',
            };
            
            if (existing) {
              return prev.map(c => c.participantId === event.participantId ? cursor : c);
            }
            return [...prev, cursor];
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
        break;
    }
  }, [participants]);

  const connect = useCallback(async (documentId: string, content: string): Promise<string> => {
    const store = storeRef.current;
    
    const newSession = store.createSession(documentId, content);
    sessionIdRef.current = newSession.id;
    setSession(newSession);

    const localParticipant = createLocalParticipant();
    store.joinSession(newSession.id, localParticipant);
    store.setLocalParticipantId(getParticipantId());
    setParticipants([localParticipant]);

    if (mergedConfig.websocketUrl) {
      try {
        const provider = new CanvasWebSocketProvider(store, {
          url: mergedConfig.websocketUrl,
        });
        providerRef.current = provider;

        provider.on('connected', handleCollaborationEvent);
        provider.on('disconnected', handleCollaborationEvent);
        provider.on('participant-joined', handleCollaborationEvent);
        provider.on('participant-left', handleCollaborationEvent);
        provider.on('cursor-moved', handleCollaborationEvent);
        provider.on('content-updated', handleCollaborationEvent);
        provider.on('error', handleCollaborationEvent);

        setConnectionState('connecting');
        await provider.connect(newSession.id, localParticipant);
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setConnectionState('disconnected');
      }
    }

    return newSession.id;
  }, [mergedConfig.websocketUrl, createLocalParticipant, handleCollaborationEvent]);

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
    setConnectionState('disconnected');
  }, [getParticipantId]);

  const updateContent = useCallback((position: number, text: string, type: 'insert' | 'delete') => {
    if (!sessionIdRef.current) return;

    const operation = storeRef.current.applyLocalUpdate(sessionIdRef.current, {
      type,
      position,
      text: type === 'insert' ? text : undefined,
      length: type === 'delete' ? text.length : undefined,
      origin: getParticipantId(),
    });

    if (providerRef.current) {
      providerRef.current.broadcastOperation(operation);
    }
  }, [getParticipantId]);

  const updateCursor = useCallback((cursor: CursorPosition) => {
    if (!sessionIdRef.current) return;

    storeRef.current.updateCursor(sessionIdRef.current, getParticipantId(), cursor);

    if (providerRef.current) {
      providerRef.current.broadcastCursor(cursor);
    }
  }, [getParticipantId]);

  const getContent = useCallback((): string | null => {
    if (!sessionIdRef.current) return null;
    return storeRef.current.getDocumentContent(sessionIdRef.current);
  }, [getParticipantId]);

  const shareSession = useCallback((): string | null => {
    if (!sessionIdRef.current) return null;
    return storeRef.current.serializeState(sessionIdRef.current);
  }, [getParticipantId]);

  const joinSession = useCallback(async (sessionId: string): Promise<void> => {
    const store = storeRef.current;
    const existingSession = store.getSession(sessionId);
    
    if (existingSession) {
      sessionIdRef.current = sessionId;
      setSession(existingSession);
      
      const localParticipant = createLocalParticipant();
      store.joinSession(sessionId, localParticipant);
      setParticipants(existingSession.participants);

      if (mergedConfig.websocketUrl && providerRef.current === null) {
        try {
          const provider = new CanvasWebSocketProvider(store, {
            url: mergedConfig.websocketUrl,
          });
          providerRef.current = provider;

          provider.on('connected', handleCollaborationEvent);
          provider.on('disconnected', handleCollaborationEvent);
          provider.on('participant-joined', handleCollaborationEvent);
          provider.on('participant-left', handleCollaborationEvent);
          provider.on('cursor-moved', handleCollaborationEvent);
          provider.on('content-updated', handleCollaborationEvent);
          provider.on('error', handleCollaborationEvent);

          setConnectionState('connecting');
          await provider.connect(sessionId, localParticipant);
          provider.requestSync();
        } catch (error) {
          console.error('Failed to join session:', error);
          setConnectionState('error');
        }
      }
    }
  }, [mergedConfig.websocketUrl, createLocalParticipant, handleCollaborationEvent]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    session,
    participants,
    remoteCursors,
    connectionState,
    isConnected: connectionState === 'connected',
    connect,
    disconnect,
    updateContent,
    updateCursor,
    getContent,
    shareSession,
    joinSession,
  };
}

export default useCollaborativeSession;
