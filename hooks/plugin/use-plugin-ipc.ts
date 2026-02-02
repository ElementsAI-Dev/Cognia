/**
 * React hooks for Plugin IPC and Events
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { getPluginIPC, type IPCMessage, type PluginIPCAPI } from '@/lib/plugin';
import { getMessageBus, type BusEvent, type EventFilter } from '@/lib/plugin';

// =============================================================================
// usePluginIPC
// =============================================================================

export interface UsePluginIPCOptions {
  pluginId: string;
  autoConnect?: boolean;
}

export interface UsePluginIPCResult {
  send: (targetPluginId: string, channel: string, data: unknown) => Promise<void>;
  sendAndWait: <T>(
    targetPluginId: string,
    channel: string,
    data: unknown,
    timeout?: number
  ) => Promise<T>;
  broadcast: (channel: string, data: unknown) => void;
  subscribe: (channel: string, handler: (data: unknown, senderId: string) => void) => () => void;
  expose: (methods: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>) => void;
  call: <T>(targetPluginId: string, method: string, ...args: unknown[]) => Promise<T>;
  messageHistory: IPCMessage[];
}

export function usePluginIPC(options: UsePluginIPCOptions): UsePluginIPCResult {
  const { pluginId } = options;
  const ipc = useMemo(() => getPluginIPC(), []);
  const [messageHistory, setMessageHistory] = useState<IPCMessage[]>([]);

  useEffect(() => {
    // Subscribe to all messages for this plugin
    const unsubscribe = ipc.subscribe(pluginId, '*', (data, senderId) => {
      const message: IPCMessage = {
        id: `${Date.now()}`,
        type: 'request',
        channel: '*',
        senderId,
        payload: data,
        timestamp: Date.now(),
      };
      setMessageHistory((prev) => [...prev.slice(-49), message]);
    });

    return () => {
      unsubscribe();
    };
  }, [pluginId, ipc]);

  const send = useCallback(
    (targetPluginId: string, channel: string, data: unknown) => {
      return ipc.send(pluginId, targetPluginId, channel, data);
    },
    [pluginId, ipc]
  );

  const sendAndWait = useCallback(
    <T>(targetPluginId: string, channel: string, data: unknown, timeout?: number) => {
      return ipc.sendAndWait<T>(pluginId, targetPluginId, channel, data, timeout);
    },
    [pluginId, ipc]
  );

  const broadcast = useCallback(
    (channel: string, data: unknown) => {
      ipc.broadcast(pluginId, channel, data);
    },
    [pluginId, ipc]
  );

  const subscribe = useCallback(
    (channel: string, handler: (data: unknown, senderId: string) => void) => {
      return ipc.subscribe(pluginId, channel, handler);
    },
    [pluginId, ipc]
  );

  const expose = useCallback(
    (methods: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>) => {
      ipc.expose(pluginId, methods);
    },
    [pluginId, ipc]
  );

  const call = useCallback(
    <T>(targetPluginId: string, method: string, ...args: unknown[]) => {
      return ipc.call<T>(pluginId, targetPluginId, method, ...args);
    },
    [pluginId, ipc]
  );

  return {
    send,
    sendAndWait,
    broadcast,
    subscribe,
    expose,
    call,
    messageHistory,
  };
}

// =============================================================================
// usePluginEvents
// =============================================================================

export interface UsePluginEventsOptions {
  pluginId: string;
}

export interface UsePluginEventsResult {
  emit: <T>(eventType: string, payload: T, metadata?: Record<string, unknown>) => string;
  on: <T>(
    eventType: string | RegExp,
    handler: (event: BusEvent<T>) => void,
    filter?: EventFilter
  ) => () => void;
  once: <T>(
    eventType: string | RegExp,
    handler: (event: BusEvent<T>) => void,
    filter?: EventFilter
  ) => () => void;
  off: (subscriptionId: string) => void;
  offAll: () => void;
  recentEvents: BusEvent[];
}

export function usePluginEvents(options: UsePluginEventsOptions): UsePluginEventsResult {
  const { pluginId } = options;
  const bus = useMemo(() => getMessageBus(), []);
  const [recentEvents, setRecentEvents] = useState<BusEvent[]>([]);

  useEffect(() => {
    // Subscribe to all events from this plugin
    const unsubscribe = bus.on(
      /.*/,
      (event: BusEvent) => {
        if (event.source.id === pluginId) {
          setRecentEvents((prev) => [...prev.slice(-49), event]);
        }
      },
      { source: { type: 'plugin', id: pluginId }, filter: { sourceId: pluginId } }
    );

    return () => {
      unsubscribe();
    };
  }, [pluginId, bus]);

  const emit = useCallback(
    <T>(eventType: string, payload: T, metadata?: Record<string, unknown>) => {
      return bus.emit(eventType, payload, { type: 'plugin', id: pluginId }, metadata);
    },
    [pluginId, bus]
  );

  const on = useCallback(
    <T>(
      eventType: string | RegExp,
      handler: (event: BusEvent<T>) => void,
      filter?: EventFilter
    ) => {
      return bus.on(eventType, handler as (event: BusEvent) => void, {
        source: { type: 'plugin', id: pluginId },
        filter,
      });
    },
    [pluginId, bus]
  );

  const once = useCallback(
    <T>(
      eventType: string | RegExp,
      handler: (event: BusEvent<T>) => void,
      filter?: EventFilter
    ) => {
      return bus.once(eventType, handler as (event: BusEvent) => void, {
        source: { type: 'plugin', id: pluginId },
        filter,
      });
    },
    [pluginId, bus]
  );

  const off = useCallback(
    (subscriptionId: string) => {
      bus.off(subscriptionId);
    },
    [bus]
  );

  const offAll = useCallback(() => {
    bus.offAll(pluginId);
  }, [pluginId, bus]);

  return {
    emit,
    on,
    once,
    off,
    offAll,
    recentEvents,
  };
}

// =============================================================================
// useEventSubscription
// =============================================================================

export function useEventSubscription<T = unknown>(
  eventType: string | RegExp,
  handler: (event: BusEvent<T>) => void,
  options: {
    filter?: EventFilter;
    once?: boolean;
  } = {}
): void {
  const bus = useMemo(() => getMessageBus(), []);

  useEffect(() => {
    const method = options.once ? bus.once : bus.on;
    const unsubscribe = method.call(bus, eventType, handler as (event: BusEvent) => void, {
      filter: options.filter,
    });

    return () => {
      unsubscribe();
    };
  }, [bus, eventType, handler, options.filter, options.once]);
}

// =============================================================================
// Exports
// =============================================================================

export type { IPCMessage, PluginIPCAPI, BusEvent, EventFilter };
