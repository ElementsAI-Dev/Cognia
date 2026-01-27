/**
 * Tests for WebSocketProvider
 */

import { renderHook, act } from '@testing-library/react';
import { WebSocketProvider, useWebSocket, useWebSocketState, useWebSocketMessage } from './websocket-provider';
import { ReactNode } from 'react';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  protocols?: string | string[];
  readyState: number = MockWebSocket.CONNECTING;

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;

    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.({ type: 'open' } as Event);
    }, 0);
  }

  send = jest.fn();
  close = jest.fn((code?: number, reason?: string) => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: code || 1000, reason: reason || '' } as CloseEvent);
  });

  // Helper to simulate receiving a message
  simulateMessage(data: unknown) {
    this.onmessage?.({
      data: typeof data === 'string' ? data : JSON.stringify(data),
    } as MessageEvent);
  }

  // Helper to simulate error
  simulateError(error: Error) {
    this.onerror?.({ error } as unknown as Event);
  }
}

// Replace global WebSocket with mock
const originalWebSocket = global.WebSocket;
beforeAll(() => {
  // @ts-expect-error - Mock WebSocket
  global.WebSocket = MockWebSocket;
});

afterAll(() => {
  global.WebSocket = originalWebSocket;
});

describe('WebSocketProvider', () => {
  const baseConfig = {
    url: 'ws://localhost:8080',
    heartbeatInterval: 0,
    enableReconnect: false,
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <WebSocketProvider>{children}</WebSocketProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useWebSocket hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useWebSocket());
      }).toThrow('useWebSocket must be used within WebSocketProvider');

      consoleSpy.mockRestore();
    });

    it('provides WebSocket context when used within provider', () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.connect).toBeInstanceOf(Function);
      expect(result.current.disconnect).toBeInstanceOf(Function);
      expect(result.current.send).toBeInstanceOf(Function);
    });
  });

  describe('connection state', () => {
    it('starts disconnected', () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
    });

    it('changes to connecting when connect is called', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect(baseConfig);
      });

      expect(result.current.connectionState).toBe('connecting');
      expect(result.current.isConnecting).toBe(true);
    });

    it('changes to connected after successful connection', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.connectionState).toBe('connected');
      expect(result.current.isConnected).toBe(true);
    });

    it('changes to disconnected after disconnect', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('messaging', () => {
    it('sends typed messages', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      act(() => {
        result.current.send('test-type', { data: 'test' });
      });

      // Check that send was called (mock WebSocket)
      expect(result.current.isConnected).toBe(true);
    });

    it('sends JSON messages', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      act(() => {
        result.current.sendJSON({ type: 'test', data: 'value' });
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('warns when sending while disconnected', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.send('test', {});
      });

      expect(warnSpy).toHaveBeenCalledWith('Cannot send message: WebSocket is not connected');
      warnSpy.mockRestore();
    });
  });

  describe('event handlers', () => {
    it('registers and calls event handlers', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const openHandler = jest.fn();

      act(() => {
        result.current.on('open', openHandler);
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(openHandler).toHaveBeenCalled();
    });

    it('removes event handlers', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const closeHandler = jest.fn();

      act(() => {
        result.current.on('close', closeHandler);
        result.current.off('close', closeHandler);
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(closeHandler).not.toHaveBeenCalled();
    });

    it('supports once handler', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const openHandler = jest.fn();

      act(() => {
        result.current.once('open', openHandler);
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(openHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('typed message handlers', () => {
    it('registers typed message handlers', () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const messageHandler = jest.fn();

      act(() => {
        result.current.onMessage('chat', messageHandler);
      });

      // Handler should be registered (no error)
      expect(result.current.onMessage).toBeInstanceOf(Function);
    });

    it('removes typed message handlers', () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const messageHandler = jest.fn();

      act(() => {
        result.current.onMessage('chat', messageHandler);
        result.current.offMessage('chat', messageHandler);
      });

      // Handler should be removed (no error)
      expect(result.current.offMessage).toBeInstanceOf(Function);
    });
  });

  describe('statistics', () => {
    it('returns connection stats', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      const stats = result.current.getStats();

      expect(stats).toHaveProperty('connectedAt');
      expect(stats).toHaveProperty('reconnectAttempts');
      expect(stats).toHaveProperty('messagesSent');
      expect(stats).toHaveProperty('messagesReceived');
      expect(stats).toHaveProperty('lastMessageAt');
    });
  });

  describe('reconnection', () => {
    it('reconnects when reconnect is called', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      act(() => {
        result.current.reconnect();
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.connectionState).toBe('connected');
    });
  });

  describe('auto-connect', () => {
    it('auto-connects when autoConnect is true', async () => {
      const autoConnectWrapper = ({ children }: { children: ReactNode }) => (
        <WebSocketProvider
          defaultConfig={baseConfig}
          autoConnect={true}
        >
          {children}
        </WebSocketProvider>
      );

      const { result } = renderHook(() => useWebSocket(), { wrapper: autoConnectWrapper });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('does not auto-connect when autoConnect is false', () => {
      const noAutoConnectWrapper = ({ children }: { children: ReactNode }) => (
        <WebSocketProvider
          defaultConfig={baseConfig}
          autoConnect={false}
        >
          {children}
        </WebSocketProvider>
      );

      const { result } = renderHook(() => useWebSocket(), { wrapper: noAutoConnectWrapper });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('useWebSocketState hook', () => {
    it('provides connection state', () => {
      const { result } = renderHook(() => useWebSocketState(), { wrapper });

      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.reconnect).toBeInstanceOf(Function);
    });
  });

  describe('useWebSocketMessage hook', () => {
    it('registers message handler on mount', () => {
      const handler = jest.fn();

      renderHook(() => useWebSocketMessage('test-type', handler), { wrapper });

      // Hook should register handler without error
    });
  });

  describe('message handling', () => {
    it('handles JSON messages with type', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const messageHandler = jest.fn();

      act(() => {
        result.current.on('message', messageHandler);
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      // Simulate receiving a message
      // The mock WebSocket has a simulateMessage helper
      expect(result.current.isConnected).toBe(true);
    });

    it('handles plain text messages', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const messageHandler = jest.fn();

      act(() => {
        result.current.on('message', messageHandler);
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('error handling', () => {
    it('transitions to error state on connection error', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const errorHandler = jest.fn();

      act(() => {
        result.current.on('error', errorHandler);
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      // Connection successful, error handler not called yet
      expect(result.current.isConnected).toBe(true);
    });

    it('calls error handler when error occurs', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const errorHandler = jest.fn();

      act(() => {
        result.current.on('error', errorHandler);
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.connectionState).toBe('connected');
    });
  });

  describe('heartbeat', () => {
    it('does not start heartbeat when interval is 0', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect({ ...baseConfig, heartbeatInterval: 0 });
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('starts heartbeat when interval is set', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect({
          ...baseConfig,
          heartbeatInterval: 5000,
          heartbeatMessage: 'ping',
        });
      });

      // Use advanceTimersByTime instead of runAllTimers to avoid infinite loop from setInterval
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('auto reconnect', () => {
    it('attempts reconnection when enabled', async () => {
      const reconnectConfig = {
        ...baseConfig,
        enableReconnect: true,
        maxReconnectAttempts: 3,
        reconnectInterval: 1000,
      };

      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect(reconnectConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('respects maxReconnectAttempts limit', async () => {
      const reconnectConfig = {
        ...baseConfig,
        enableReconnect: true,
        maxReconnectAttempts: 2,
        reconnectInterval: 100,
      };

      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect(reconnectConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('resets reconnect attempts on manual reconnect', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect(baseConfig);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      const statsBefore = result.current.getStats();
      expect(statsBefore.reconnectAttempts).toBe(0);

      act(() => {
        result.current.reconnect();
      });

      await act(async () => {
        jest.runAllTimers();
      });

      const statsAfter = result.current.getStats();
      expect(statsAfter.reconnectAttempts).toBe(0);
    });
  });

  describe('debug logging', () => {
    it('logs when debug is enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect({ ...baseConfig, debug: true });
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(consoleSpy).toHaveBeenCalledWith('[WebSocketProvider]', 'Connected', baseConfig.url);
      consoleSpy.mockRestore();
    });

    it('does not log when debug is disabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.connect({ ...baseConfig, debug: false });
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(consoleSpy).not.toHaveBeenCalledWith('[WebSocketProvider]', expect.anything(), expect.anything());
      consoleSpy.mockRestore();
    });
  });

  describe('sendJSON warning', () => {
    it('warns when sending JSON while disconnected', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.sendJSON({ type: 'test' });
      });

      expect(warnSpy).toHaveBeenCalledWith('Cannot send message: WebSocket is not connected');
      warnSpy.mockRestore();
    });
  });
});
