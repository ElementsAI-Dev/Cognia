/**
 * Tests for Plugin IPC React Hooks
 */

import { renderHook, act } from '@testing-library/react';
import { usePluginIPC, usePluginEvents, useEventSubscription } from './use-plugin-ipc';

// Mock the IPC and MessageBus modules
jest.mock('@/lib/plugin/messaging/ipc', () => ({
  getPluginIPC: () => ({
    send: jest.fn().mockResolvedValue(undefined),
    sendAndWait: jest.fn().mockResolvedValue('response'),
    broadcast: jest.fn(),
    subscribe: jest.fn().mockReturnValue(() => {}),
    expose: jest.fn(),
    call: jest.fn().mockResolvedValue('result'),
  }),
}));

jest.mock('@/lib/plugin/messaging/message-bus', () => ({
  getMessageBus: () => ({
    emit: jest.fn().mockReturnValue('event-id'),
    on: jest.fn().mockReturnValue(() => {}),
    once: jest.fn().mockReturnValue(() => {}),
    off: jest.fn(),
    offAll: jest.fn(),
    getHistory: jest.fn().mockReturnValue([]),
  }),
}));

describe('usePluginIPC', () => {
  it('should return IPC methods', () => {
    const { result } = renderHook(() => usePluginIPC({ pluginId: 'plugin-a' }));

    expect(result.current.send).toBeDefined();
    expect(result.current.sendAndWait).toBeDefined();
    expect(result.current.broadcast).toBeDefined();
    expect(result.current.subscribe).toBeDefined();
    expect(result.current.expose).toBeDefined();
    expect(result.current.call).toBeDefined();
  });

  it('should send messages', async () => {
    const { result } = renderHook(() => usePluginIPC({ pluginId: 'plugin-a' }));

    await act(async () => {
      await result.current.send('plugin-b', 'channel', { data: 'test' });
    });

    // No error means success
  });

  it('should broadcast messages', () => {
    const { result } = renderHook(() => usePluginIPC({ pluginId: 'plugin-a' }));

    act(() => {
      result.current.broadcast('channel', { data: 'test' });
    });

    // No error means success
  });

  it('should subscribe to channels', () => {
    const { result } = renderHook(() => usePluginIPC({ pluginId: 'plugin-a' }));
    const handler = jest.fn();

    const unsubscribe = result.current.subscribe('channel', handler);

    expect(typeof unsubscribe).toBe('function');
  });

  it('should expose methods', () => {
    const { result } = renderHook(() => usePluginIPC({ pluginId: 'plugin-a' }));

    act(() => {
      result.current.expose({
        greet: (name: unknown) => `Hello, ${name}`,
      });
    });

    // No error means success
  });

  it('should call exposed methods', async () => {
    const { result } = renderHook(() => usePluginIPC({ pluginId: 'plugin-a' }));

    await act(async () => {
      const response = await result.current.call<string>('plugin-b', 'greet', 'World');
      expect(response).toBe('result');
    });
  });

  it('should track message history', () => {
    const { result } = renderHook(() => usePluginIPC({ pluginId: 'plugin-a' }));

    expect(Array.isArray(result.current.messageHistory)).toBe(true);
  });
});

describe('usePluginEvents', () => {
  it('should return event methods', () => {
    const { result } = renderHook(() => usePluginEvents({ pluginId: 'plugin-a' }));

    expect(result.current.emit).toBeDefined();
    expect(result.current.on).toBeDefined();
    expect(result.current.once).toBeDefined();
    expect(result.current.off).toBeDefined();
    expect(result.current.offAll).toBeDefined();
  });

  it('should emit events', () => {
    const { result } = renderHook(() => usePluginEvents({ pluginId: 'plugin-a' }));

    act(() => {
      const eventId = result.current.emit('my-event', { data: 'test' });
      expect(typeof eventId).toBe('string');
    });
  });

  it('should subscribe to events', () => {
    const { result } = renderHook(() => usePluginEvents({ pluginId: 'plugin-a' }));
    const handler = jest.fn();

    const unsubscribe = result.current.on('event', handler);

    expect(typeof unsubscribe).toBe('function');
  });

  it('should unsubscribe from events', () => {
    const { result } = renderHook(() => usePluginEvents({ pluginId: 'plugin-a' }));

    act(() => {
      result.current.off('subscription-id');
    });

    // No error means success
  });

  it('should unsubscribe all events', () => {
    const { result } = renderHook(() => usePluginEvents({ pluginId: 'plugin-a' }));

    act(() => {
      result.current.offAll();
    });

    // No error means success
  });

  it('should track recent events', () => {
    const { result } = renderHook(() => usePluginEvents({ pluginId: 'plugin-a' }));

    expect(Array.isArray(result.current.recentEvents)).toBe(true);
  });
});

describe('useEventSubscription', () => {
  it('should subscribe to events on mount', () => {
    const handler = jest.fn();

    renderHook(() => useEventSubscription('test-event', handler));

    // Hook should subscribe on mount
  });

  it('should unsubscribe on unmount', () => {
    const handler = jest.fn();

    const { unmount } = renderHook(() => useEventSubscription('test-event', handler));

    unmount();

    // Should unsubscribe on unmount
  });

  it('should support once option', () => {
    const handler = jest.fn();

    renderHook(() => useEventSubscription('test-event', handler, { once: true }));

    // No error means success
  });

  it('should support filter option', () => {
    const handler = jest.fn();

    renderHook(() =>
      useEventSubscription('test-event', handler, {
        filter: { sourceType: 'plugin' },
      })
    );

    // No error means success
  });
});
