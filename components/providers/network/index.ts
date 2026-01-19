/**
 * Network Providers - Real-time communication
 *
 * Manages WebSocket connections with reconnection logic and event handling
 */

export {
  WebSocketProvider,
  useWebSocket,
  useWebSocketMessage,
  useWebSocketState,
  type ConnectionState,
  type WebSocketConfig,
  type WebSocketMessage,
  type WebSocketEventHandler,
  type WebSocketEventType,
} from './websocket-provider';

// Default export for convenience
export { default } from './websocket-provider';
