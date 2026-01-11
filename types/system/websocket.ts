/**
 * WebSocket Types
 * Types for WebSocket connection management and messaging
 */

// WebSocket connection state
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

// WebSocket message event
export interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: Date;
}

// WebSocket event types
export type WebSocketEventType = 'open' | 'close' | 'error' | 'message';

// WebSocket event handler
export type WebSocketEventHandler<T = unknown> = (data: T) => void;

// WebSocket configuration
export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number; // Milliseconds between reconnection attempts
  maxReconnectAttempts?: number;
  heartbeatInterval?: number; // Milliseconds between heartbeat messages
  heartbeatMessage?: string; // Message to send as heartbeat
  enableReconnect?: boolean;
  debug?: boolean;
}

// Default WebSocket configuration values
export const DEFAULT_WEBSOCKET_CONFIG: Required<Omit<WebSocketConfig, 'url' | 'protocols'>> = {
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  heartbeatMessage: 'ping',
  enableReconnect: true,
  debug: false,
};
