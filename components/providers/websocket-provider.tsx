'use client';

/**
 * WebSocketProvider - Manages WebSocket connections for real-time features
 * Provides connection management, reconnection logic, and event handling
 */

import { createContext, useContext, useCallback, useEffect, ReactNode, useRef, useState } from 'react';
import type {
  ConnectionState,
  WebSocketEventType,
  WebSocketEventHandler,
  WebSocketConfig,
} from '@/types';
import { DEFAULT_WEBSOCKET_CONFIG } from '@/types';

// Re-export types for backward compatibility
export type {
  ConnectionState,
  WebSocketMessage,
  WebSocketEventType,
  WebSocketEventHandler,
  WebSocketConfig,
} from '@/types';

// WebSocket context value
interface WebSocketContextValue {
  // Connection management
  connect: (config: WebSocketConfig) => void;
  disconnect: () => void;
  reconnect: () => void;

  // State
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;

  // Messaging
  send: (type: string, data?: unknown) => void;
  sendJSON: (data: Record<string, unknown>) => void;

  // Event handling
  on: (event: WebSocketEventType, handler: WebSocketEventHandler) => void;
  off: (event: WebSocketEventType, handler: WebSocketEventHandler) => void;
  once: (event: WebSocketEventType, handler: WebSocketEventHandler) => void;

  // Typed event handlers
  onMessage: <T = unknown>(type: string, handler: (data: T) => void) => void;
  offMessage: <T = unknown>(type: string, handler: (data: T) => void) => void;

  // Utility
  getStats: () => {
    connectedAt: Date | null;
    reconnectAttempts: number;
    messagesSent: number;
    messagesReceived: number;
    lastMessageAt: Date | null;
  };
}

// Create context
const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

// Default configuration (use centralized constant)
const DEFAULT_CONFIG = DEFAULT_WEBSOCKET_CONFIG;

interface WebSocketProviderProps {
  children: ReactNode;
  /** Default connection configuration */
  defaultConfig?: WebSocketConfig;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
}

/**
 * WebSocket Provider Component - FIXED: No circular dependencies
 */
export function WebSocketProvider({
  children,
  defaultConfig,
  autoConnect = false,
}: WebSocketProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const configRef = useRef<WebSocketConfig | null>(defaultConfig || null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<((config: WebSocketConfig) => void) | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  const statsRef = useRef({
    connectedAt: null as Date | null,
    reconnectAttempts: 0,
    messagesSent: 0,
    messagesReceived: 0,
    lastMessageAt: null as Date | null,
  });

  const eventHandlersRef = useRef<Map<WebSocketEventType, Set<WebSocketEventHandler>>>(new Map());
  const messageHandlersRef = useRef<Map<string, Set<WebSocketEventHandler>>>(new Map());

  // STABLE: Log if debug enabled (no deps needed, uses ref)
  const debugLog = useCallback((...args: unknown[]) => {
    if (configRef.current?.debug) {
      console.log('[WebSocketProvider]', ...args);
    }
  }, []); // Empty deps - stable function

  // STABLE: Clear heartbeat (no deps needed, uses ref)
  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []); // Empty deps - stable function

  // STABLE: Start heartbeat (only depends on other stable functions)
  const startHeartbeat = useCallback(() => {
    clearHeartbeat();

    if (configRef.current?.heartbeatInterval && wsRef.current?.readyState === WebSocket.OPEN) {
      heartbeatTimeoutRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(configRef.current?.heartbeatMessage || 'ping');
          debugLog('Heartbeat sent');
        }
      }, configRef.current.heartbeatInterval);
    }
  }, [clearHeartbeat, debugLog]); // Only depends on stable functions

  // STABLE: Clear reconnection timeout (no deps needed, uses ref)
  const clearReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []); // Empty deps - stable function

  // STABLE: Trigger event handlers (no deps needed, uses ref)
  const triggerHandlers = useCallback((event: WebSocketEventType, data?: unknown) => {
    const handlers = eventHandlersRef.current.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }, []); // Empty deps - stable function

  // STABLE: Connect function (no self-dependency, uses refs)
  const connect = useCallback((config: WebSocketConfig) => {
    // Disconnect existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Store config in ref for later access
    configRef.current = { ...DEFAULT_CONFIG, ...config };
    setConnectionState('connecting');

    try {
      const ws = new WebSocket(config.url, config.protocols);
      wsRef.current = ws;

      ws.onopen = () => {
        debugLog('Connected', config.url);
        setConnectionState('connected');
        statsRef.current.connectedAt = new Date();
        statsRef.current.reconnectAttempts = 0;

        clearReconnect();
        startHeartbeat();
        triggerHandlers('open', { url: config.url });
      };

      ws.onclose = (event) => {
        debugLog('Disconnected', event.code, event.reason);
        setConnectionState('disconnected');
        clearHeartbeat();
        triggerHandlers('close', { code: event.code, reason: event.reason });

        // Auto-reconnect if enabled
        // Use ref values directly to avoid closure issues
        const currentConfig = configRef.current;
        if (currentConfig?.enableReconnect &&
            statsRef.current.reconnectAttempts < (currentConfig.maxReconnectAttempts || DEFAULT_CONFIG.maxReconnectAttempts)) {
          statsRef.current.reconnectAttempts++;
          setConnectionState('reconnecting');

          reconnectTimeoutRef.current = setTimeout(() => {
            debugLog('Reconnecting...', `Attempt ${statsRef.current.reconnectAttempts}`);
            // Use ref for recursive call to avoid accessing before declaration
            connectRef.current?.(currentConfig);
          }, currentConfig.reconnectInterval || DEFAULT_CONFIG.reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        debugLog('Error', error);
        setConnectionState('error');
        triggerHandlers('error', error);
      };

      ws.onmessage = (event) => {
        statsRef.current.messagesReceived++;
        statsRef.current.lastMessageAt = new Date();

        try {
          // Try to parse as JSON
          const message = JSON.parse(event.data);
          triggerHandlers('message', message);

          // Trigger typed message handlers
          if (message.type) {
            const handlers = messageHandlersRef.current.get(message.type);
            if (handlers) {
              handlers.forEach((handler) => {
                try {
                  handler(message.data);
                } catch (error) {
                  console.error(`Error in message handler for type ${message.type}:`, error);
                }
              });
            }
          }
        } catch {
          // Not JSON, treat as plain text
          triggerHandlers('message', event.data);
        }
      };
    } catch (error) {
      debugLog('Connection error:', error);
      setConnectionState('error');
      triggerHandlers('error', error);
    }
  }, [clearReconnect, clearHeartbeat, debugLog, startHeartbeat, triggerHandlers]); // Only depends on other stable functions

  // Store connect in ref for recursive calls
  connectRef.current = connect;

  // STABLE: Disconnect WebSocket (only depends on stable functions)
  const disconnect = useCallback(() => {
    clearReconnect();
    clearHeartbeat();

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setConnectionState('disconnected');
    statsRef.current.connectedAt = null;
  }, [clearReconnect, clearHeartbeat]);

  // STABLE: Reconnect WebSocket (depends on connect and disconnect)
  const reconnect = useCallback(() => {
    statsRef.current.reconnectAttempts = 0;

    if (configRef.current) {
      disconnect();
      connect(configRef.current);
    }
  }, [connect, disconnect]);

  // STABLE: Send message (only depends on debugLog which is stable)
  const send = useCallback((type: string, data?: unknown) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket is not connected');
      return;
    }

    const message = { type, data, timestamp: new Date().toISOString() };
    wsRef.current.send(JSON.stringify(message));
    statsRef.current.messagesSent++;
    debugLog('Sent:', message);
  }, [debugLog]);

  // STABLE: Send JSON message (only depends on debugLog which is stable)
  const sendJSON = useCallback((data: Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket is not connected');
      return;
    }

    wsRef.current.send(JSON.stringify(data));
    statsRef.current.messagesSent++;
    debugLog('Sent JSON:', data);
  }, [debugLog]);

  // Event handler management (uses refs, no deps needed)
  const on = useCallback((event: WebSocketEventType, handler: WebSocketEventHandler) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(handler);
  }, []);

  const off = useCallback((event: WebSocketEventType, handler: WebSocketEventHandler) => {
    const handlers = eventHandlersRef.current.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }, []);

  const once = useCallback((event: WebSocketEventType, handler: WebSocketEventHandler) => {
    const wrappedHandler = (data: unknown) => {
      handler(data);
      off(event, wrappedHandler);
    };
    on(event, wrappedHandler);
  }, [on, off]);

  // Typed message handlers (uses refs, no deps needed)
  const onMessage = useCallback(<T = unknown>(type: string, handler: (data: T) => void) => {
    if (!messageHandlersRef.current.has(type)) {
      messageHandlersRef.current.set(type, new Set());
    }
    messageHandlersRef.current.get(type)!.add(handler as WebSocketEventHandler);
  }, []);

  const offMessage = useCallback(<T = unknown>(type: string, handler: (data: T) => void) => {
    const handlers = messageHandlersRef.current.get(type);
    if (handlers) {
      handlers.delete(handler as WebSocketEventHandler);
    }
  }, []);

  // Get stats (uses ref, no deps needed)
  const getStats = useCallback(() => {
    return { ...statsRef.current };
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && defaultConfig) {
      connect(defaultConfig);
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]); // Only run on mount - intentionally omit connect/disconnect/defaultConfig

  const value: WebSocketContextValue = {
    connect,
    disconnect,
    reconnect,
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting' || connectionState === 'reconnecting',
    send,
    sendJSON,
    on,
    off,
    once,
    onMessage,
    offMessage,
    getStats,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

/**
 * Hook to access WebSocket functionality
 */
export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}

/**
 * Hook for typed WebSocket messages
 */
export function useWebSocketMessage<T = unknown>(type: string, handler: (data: T) => void) {
  const { onMessage, offMessage } = useWebSocket();

  useEffect(() => {
    onMessage<T>(type, handler);
    return () => {
      offMessage<T>(type, handler);
    };
  }, [type, handler, onMessage, offMessage]);
}

/**
 * Hook for WebSocket connection state
 */
export function useWebSocketState() {
  const { connectionState, isConnected, isConnecting, reconnect } = useWebSocket();

  return {
    connectionState,
    isConnected,
    isConnecting,
    reconnect,
  };
}

export default WebSocketProvider;
