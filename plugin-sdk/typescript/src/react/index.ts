/**
 * React Hooks for Plugin Development
 *
 * @description React hooks for integrating with plugin APIs.
 * Provides easy-to-use hooks for common plugin patterns.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PluginContext } from '../context/base';
import type { PluginContextAPI } from '../context/extended';
import type { ThemeState, ThemeMode } from '../context/extended';

/**
 * Plugin context for React hooks
 */
let pluginContext: (PluginContext & Partial<PluginContextAPI>) | null = null;

/**
 * Initialize the plugin context for React hooks
 *
 * @param context - Plugin context from activate function
 *
 * @example
 * ```typescript
 * export default definePlugin({
 *   activate(context) {
 *     initPluginContext(context);
 *     // ...
 *   }
 * });
 * ```
 */
export function initPluginContext(context: PluginContext & Partial<PluginContextAPI>): void {
  pluginContext = context;
}

/**
 * Get the current plugin context
 *
 * @throws Error if context is not initialized
 */
export function getPluginContext(): PluginContext & Partial<PluginContextAPI> {
  if (!pluginContext) {
    throw new Error('Plugin context not initialized. Call initPluginContext first.');
  }
  return pluginContext;
}

/**
 * Hook to access the plugin context
 *
 * @returns Plugin context
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const context = usePluginContext();
 *   context.logger.info('Hello from component');
 * }
 * ```
 */
export function usePluginContext(): PluginContext & Partial<PluginContextAPI> {
  return getPluginContext();
}

/**
 * Hook for plugin storage with React state synchronization
 *
 * @param key - Storage key
 * @param initialValue - Initial value if key doesn't exist
 * @returns Tuple of [value, setValue, isLoading]
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const [apiKey, setApiKey, loading] = usePluginStorage('apiKey', '');
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   return (
 *     <input
 *       value={apiKey}
 *       onChange={(e) => setApiKey(e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export function usePluginStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const context = getPluginContext();
  const [value, setValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadValue = async () => {
      try {
        const stored = await context.storage.get<T>(key);
        if (mounted) {
          setValue(stored !== undefined ? stored : initialValue);
          setLoading(false);
        }
      } catch (error) {
        context.logger.error(`Failed to load storage key "${key}":`, error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadValue();

    return () => {
      mounted = false;
    };
  }, [key, initialValue, context]);

  const setStoredValue = useCallback(
    async (newValue: T) => {
      setValue(newValue);
      try {
        await context.storage.set(key, newValue);
      } catch (error) {
        context.logger.error(`Failed to save storage key "${key}":`, error);
        throw error;
      }
    },
    [key, context]
  );

  return [value, setStoredValue, loading];
}

/**
 * Hook for subscribing to plugin events
 *
 * @param event - Event name to subscribe to
 * @param handler - Event handler
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   usePluginEvents('data-updated', (data) => {
 *     console.log('Data updated:', data);
 *   });
 * }
 * ```
 */
export function usePluginEvents(
  event: string,
  handler: (...args: unknown[]) => void
): void {
  const context = getPluginContext();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler = (...args: unknown[]) => {
      handlerRef.current(...args);
    };

    return context.events.on(event, wrappedHandler);
  }, [event, context]);
}

/**
 * Hook for accessing plugin settings
 *
 * @param key - Settings key
 * @returns Setting value or undefined
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const theme = usePluginSettings<string>('theme');
 *   return <div className={theme}>...</div>;
 * }
 * ```
 */
export function usePluginSettings<T>(key: string): T | undefined {
  const context = getPluginContext();
  const [value, setValue] = useState<T | undefined>(() => context.settings.get<T>(key));

  useEffect(() => {
    return context.settings.onChange(key, (newValue) => {
      setValue(newValue as T);
    });
  }, [key, context]);

  return value;
}

/**
 * Hook for accessing the current session
 *
 * @returns Current session and messages
 *
 * @example
 * ```typescript
 * function ChatPanel() {
 *   const { session, messages, sendMessage } = useSession();
 *
 *   return (
 *     <div>
 *       <h1>{session?.title}</h1>
 *       {messages.map(m => <Message key={m.id} {...m} />)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSession(): {
  session: unknown | null;
  sessionId: string | null;
  messages: unknown[];
  loading: boolean;
  sendMessage: (content: string) => Promise<void>;
  refresh: () => Promise<void>;
} {
  const context = getPluginContext();
  const [session, setSession] = useState<unknown | null>(null);
  const [messages, setMessages] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const sessionApi = context.session;

  useEffect(() => {
    if (!sessionApi) {
      setLoading(false);
      return;
    }

    const currentSession = sessionApi.getCurrentSession();
    setSession(currentSession);
    setLoading(false);

    return sessionApi.onSessionChange((newSession) => {
      setSession(newSession);
    });
  }, [sessionApi]);

  const sessionId = useMemo(() => {
    return sessionApi?.getCurrentSessionId() ?? null;
  }, [sessionApi, session]);

  useEffect(() => {
    if (!sessionApi || !sessionId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      const msgs = await sessionApi.getMessages(sessionId);
      setMessages(msgs);
    };

    loadMessages();

    return sessionApi.onMessagesChange(sessionId, (newMessages) => {
      setMessages(newMessages);
    });
  }, [sessionApi, sessionId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionApi || !sessionId) {
        throw new Error('No active session');
      }
      await sessionApi.addMessage(sessionId, content);
    },
    [sessionApi, sessionId]
  );

  const refresh = useCallback(async () => {
    if (!sessionApi || !sessionId) return;
    const msgs = await sessionApi.getMessages(sessionId);
    setMessages(msgs);
  }, [sessionApi, sessionId]);

  return { session, sessionId, messages, loading, sendMessage, refresh };
}

/**
 * Hook for accessing theme state
 *
 * @returns Theme state and setters
 *
 * @example
 * ```typescript
 * function ThemeToggle() {
 *   const { mode, resolvedMode, setMode, colors } = useTheme();
 *
 *   return (
 *     <button
 *       onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
 *       style={{ backgroundColor: colors.primary }}
 *     >
 *       {resolvedMode === 'dark' ? '🌙' : '☀️'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme(): {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  colors: ThemeState['colors'];
  setMode: (mode: ThemeMode) => void;
} {
  const context = getPluginContext();
  const themeApi = context.theme;

  const [theme, setTheme] = useState<ThemeState | null>(() => {
    return themeApi?.getTheme() ?? null;
  });

  useEffect(() => {
    if (!themeApi) return;

    return themeApi.onThemeChange((newTheme) => {
      setTheme(newTheme);
    });
  }, [themeApi]);

  const setMode = useCallback(
    (mode: ThemeMode) => {
      themeApi?.setMode(mode);
    },
    [themeApi]
  );

  return {
    mode: theme?.mode ?? 'system',
    resolvedMode: theme?.resolvedMode ?? 'light',
    colors: theme?.colors ?? {} as ThemeState['colors'],
    setMode,
  };
}

/**
 * Hook for IPC communication
 *
 * @returns IPC API methods
 *
 * @example
 * ```typescript
 * function RemoteData() {
 *   const { invoke, send, onMessage } = useIPC();
 *   const [data, setData] = useState(null);
 *
 *   useEffect(() => {
 *     return onMessage('data-update', (data) => setData(data));
 *   }, []);
 *
 *   const fetchData = async () => {
 *     const result = await invoke('data-plugin', 'getData', { id: '123' });
 *     setData(result);
 *   };
 * }
 * ```
 */
export function useIPC() {
  const context = getPluginContext();
  // IPC API would be on context.ipc if available
  const ipcApi = (context as unknown as { ipc?: unknown }).ipc;

  return useMemo(() => ({
    send: (targetPluginId: string, channel: string, data: unknown) => {
      if (ipcApi && typeof (ipcApi as { send?: unknown }).send === 'function') {
        (ipcApi as { send: (t: string, c: string, d: unknown) => void }).send(targetPluginId, channel, data);
      }
    },
    invoke: async <T = unknown>(
      targetPluginId: string,
      method: string,
      args?: unknown
    ): Promise<T> => {
      if (ipcApi && typeof (ipcApi as { invoke?: unknown }).invoke === 'function') {
        return (ipcApi as { invoke: (t: string, m: string, a?: unknown) => Promise<T> }).invoke(targetPluginId, method, args);
      }
      throw new Error('IPC not available');
    },
    onMessage: (channel: string, handler: (data: unknown, senderId: string) => void): (() => void) => {
      if (ipcApi && typeof (ipcApi as { on?: unknown }).on === 'function') {
        return (ipcApi as { on: (c: string, h: (d: unknown, s: string) => void) => () => void }).on(channel, handler);
      }
      return () => {};
    },
  }), [ipcApi]);
}

/**
 * Hook for message bus pub/sub
 *
 * @returns Message bus API methods
 *
 * @example
 * ```typescript
 * function DataSubscriber() {
 *   const { subscribe, publish } = useMessageBus();
 *
 *   useEffect(() => {
 *     return subscribe('user:login', (data) => {
 *       console.log('User logged in:', data);
 *     });
 *   }, []);
 *
 *   const notifyLogout = () => {
 *     publish('user:logout', { timestamp: Date.now() });
 *   };
 * }
 * ```
 */
export function useMessageBus() {
  const context = getPluginContext();
  // Message bus API would be on context.bus if available
  const busApi = (context as unknown as { bus?: unknown }).bus;

  return useMemo(() => ({
    publish: (topic: string, data: unknown) => {
      if (busApi && typeof (busApi as { publish?: unknown }).publish === 'function') {
        (busApi as { publish: (t: string, d: unknown) => void }).publish(topic, data);
      }
    },
    subscribe: <T = unknown>(
      topic: string,
      handler: (data: T) => void
    ): (() => void) => {
      if (busApi && typeof (busApi as { subscribe?: unknown }).subscribe === 'function') {
        return (busApi as { subscribe: (t: string, h: (d: T) => void) => () => void }).subscribe(topic, handler);
      }
      return () => {};
    },
    request: async <TReq = unknown, TRes = unknown>(
      topic: string,
      data: TReq
    ): Promise<TRes> => {
      if (busApi && typeof (busApi as { request?: unknown }).request === 'function') {
        return (busApi as { request: (t: string, d: TReq) => Promise<TRes> }).request(topic, data);
      }
      throw new Error('Message bus not available');
    },
  }), [busApi]);
}

/**
 * Hook for debug utilities
 *
 * @returns Debug API methods
 *
 * @example
 * ```typescript
 * function DebugPanel() {
 *   const { startTrace, measure, getMetrics } = useDebug();
 *
 *   const handleClick = async () => {
 *     const result = await measure('fetchData', async () => {
 *       return await fetchData();
 *     });
 *   };
 *
 *   const metrics = getMetrics();
 * }
 * ```
 */
export function useDebug() {
  const context = getPluginContext();
  // Debug API would be on context.debug if available
  const debugApi = (context as unknown as { debug?: unknown }).debug;

  return useMemo(() => ({
    startTrace: (name: string): (() => void) => {
      if (debugApi && typeof (debugApi as { startTrace?: unknown }).startTrace === 'function') {
        return (debugApi as { startTrace: (n: string) => () => void }).startTrace(name);
      }
      return () => {};
    },
    measure: async <T>(name: string, fn: () => T | Promise<T>): Promise<T> => {
      if (debugApi && typeof (debugApi as { measure?: unknown }).measure === 'function') {
        return (debugApi as { measure: (n: string, f: () => T | Promise<T>) => Promise<T> }).measure(name, fn);
      }
      return fn();
    },
    log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => {
      if (debugApi && typeof (debugApi as { log?: unknown }).log === 'function') {
        (debugApi as { log: (l: string, m: string, d?: unknown) => void }).log(level, message, data);
      } else {
        console[level](message, data);
      }
    },
    getMetrics: () => {
      if (debugApi && typeof (debugApi as { getMetrics?: unknown }).getMetrics === 'function') {
        return (debugApi as { getMetrics: () => unknown }).getMetrics();
      }
      return null;
    },
  }), [debugApi]);
}

/**
 * Hook for async data fetching with loading/error states
 *
 * @param fetcher - Async function to fetch data
 * @param deps - Dependencies array
 * @returns Data, loading state, error, and refetch function
 *
 * @example
 * ```typescript
 * function UserProfile({ userId }) {
 *   const { data, loading, error, refetch } = useAsyncData(
 *     async () => context.network.get(`/users/${userId}`),
 *     [userId]
 *   );
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <Profile user={data} />;
 * }
 * ```
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, deps);

  return { data, loading, error, refetch };
}
