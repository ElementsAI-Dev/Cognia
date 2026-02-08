/**
 * Agent Trace Store — Real-time state management for agent trace events.
 *
 * Provides:
 * - Active session tracking with live event streaming
 * - Real-time token/cost counters
 * - Event subscription for live trace panels
 * - Recent events buffer
 */

import { create } from 'zustand';
import type { AgentTraceEventType, TraceCostEstimate } from '@/types/agent-trace';

/** Token usage snapshot */
export interface TokenUsageSnapshot {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** A lightweight trace event for real-time display */
export interface AgentTraceEvent {
  id: string;
  sessionId: string;
  eventType: AgentTraceEventType;
  timestamp: number;
  stepNumber?: number;
  toolName?: string;
  toolArgs?: string;
  success?: boolean;
  error?: string;
  duration?: number;
  tokenUsage?: TokenUsageSnapshot;
  costEstimate?: TraceCostEstimate;
  responsePreview?: string;
  modelId?: string;
}

/** Active session trace state */
export interface ActiveSessionTrace {
  sessionId: string;
  startedAt: number;
  currentStep: number;
  status: 'running' | 'paused' | 'completed' | 'error';
  events: AgentTraceEvent[];
  tokenUsage: TokenUsageSnapshot;
  totalCost: number;
  files: Set<string>;
  toolCalls: number;
  toolSuccesses: number;
  toolFailures: number;
}

/** Event callback type */
type EventCallback = (event: AgentTraceEvent) => void;

/** Max recent events to keep in buffer */
const MAX_RECENT_EVENTS = 200;

/** Max events per active session */
const MAX_SESSION_EVENTS = 500;

interface AgentTraceStoreState {
  /** Currently active session traces */
  activeSessions: Record<string, ActiveSessionTrace>;
  /** Global recent events buffer (across all sessions) */
  recentEvents: AgentTraceEvent[];
  /** Session event subscribers */
  _listeners: Record<string, Set<EventCallback>>;
}

interface AgentTraceStoreActions {
  /** Start tracking a new session */
  startSession: (sessionId: string, modelId?: string) => void;
  /** Add an event to a session */
  addEvent: (event: AgentTraceEvent) => void;
  /** End a session */
  endSession: (sessionId: string, status?: 'completed' | 'error') => void;
  /** Subscribe to events for a specific session */
  subscribeToSession: (sessionId: string, callback: EventCallback) => () => void;
  /** Get an active session */
  getActiveSession: (sessionId: string) => ActiveSessionTrace | undefined;
  /** Clear all active sessions */
  clearAll: () => void;
  /** Remove a completed session from active tracking */
  removeSession: (sessionId: string) => void;
}

export type AgentTraceStore = AgentTraceStoreState & AgentTraceStoreActions;

export const useAgentTraceStore = create<AgentTraceStore>((set, get) => ({
  activeSessions: {},
  recentEvents: [],
  _listeners: {},

  startSession: (sessionId: string, _modelId?: string) => {
    set((state) => ({
      activeSessions: {
        ...state.activeSessions,
        [sessionId]: {
          sessionId,
          startedAt: Date.now(),
          currentStep: 0,
          status: 'running',
          events: [],
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          totalCost: 0,
          files: new Set<string>(),
          toolCalls: 0,
          toolSuccesses: 0,
          toolFailures: 0,
        },
      },
    }));
  },

  addEvent: (event: AgentTraceEvent) => {
    const { _listeners } = get();

    set((state) => {
      const session = state.activeSessions[event.sessionId];
      if (!session) {
        // Session not tracked, just add to recent events
        return {
          recentEvents: [event, ...state.recentEvents].slice(0, MAX_RECENT_EVENTS),
        };
      }

      // Update session state
      const updatedSession = { ...session };
      updatedSession.events = [...session.events, event].slice(-MAX_SESSION_EVENTS);

      // Update step number
      if (event.stepNumber && event.stepNumber > updatedSession.currentStep) {
        updatedSession.currentStep = event.stepNumber;
      }

      // Accumulate token usage
      if (event.tokenUsage) {
        updatedSession.tokenUsage = {
          promptTokens: updatedSession.tokenUsage.promptTokens + event.tokenUsage.promptTokens,
          completionTokens: updatedSession.tokenUsage.completionTokens + event.tokenUsage.completionTokens,
          totalTokens: updatedSession.tokenUsage.totalTokens + event.tokenUsage.totalTokens,
        };
      }

      // Accumulate cost
      if (event.costEstimate) {
        updatedSession.totalCost += event.costEstimate.totalCost;
      }

      // Track tool calls
      if (event.eventType === 'tool_call_result') {
        updatedSession.toolCalls++;
        if (event.success === true) {
          updatedSession.toolSuccesses++;
        } else if (event.success === false) {
          updatedSession.toolFailures++;
        }
      }

      // Track error status
      if (event.eventType === 'error') {
        updatedSession.status = 'error';
      }

      return {
        activeSessions: {
          ...state.activeSessions,
          [event.sessionId]: updatedSession,
        },
        recentEvents: [event, ...state.recentEvents].slice(0, MAX_RECENT_EVENTS),
      };
    });

    // Notify session subscribers
    const sessionListeners = _listeners[event.sessionId];
    if (sessionListeners) {
      for (const callback of sessionListeners) {
        try {
          callback(event);
        } catch {
          // Subscriber error should not break the store
        }
      }
    }
  },

  endSession: (sessionId: string, status: 'completed' | 'error' = 'completed') => {
    set((state) => {
      const session = state.activeSessions[sessionId];
      if (!session) return state;

      return {
        activeSessions: {
          ...state.activeSessions,
          [sessionId]: { ...session, status },
        },
      };
    });
  },

  subscribeToSession: (sessionId: string, callback: EventCallback) => {
    set((state) => {
      const existing = state._listeners[sessionId] ?? new Set<EventCallback>();
      existing.add(callback);
      return {
        _listeners: { ...state._listeners, [sessionId]: existing },
      };
    });

    // Return unsubscribe function
    return () => {
      set((state) => {
        const existing = state._listeners[sessionId];
        if (existing) {
          existing.delete(callback);
          if (existing.size === 0) {
            const { [sessionId]: _, ...rest } = state._listeners;
            return { _listeners: rest };
          }
        }
        return state;
      });
    };
  },

  getActiveSession: (sessionId: string) => {
    return get().activeSessions[sessionId];
  },

  clearAll: () => {
    set({ activeSessions: {}, recentEvents: [], _listeners: {} });
  },

  removeSession: (sessionId: string) => {
    set((state) => {
      const { [sessionId]: _, ...rest } = state.activeSessions;
      const { [sessionId]: _l, ...restListeners } = state._listeners;
      return { activeSessions: rest, _listeners: restListeners };
    });
  },
}));

/** Selector: get all active session IDs */
export const selectActiveSessionIds = (state: AgentTraceStore) =>
  Object.keys(state.activeSessions);

/** Selector: get running sessions only */
export const selectRunningSessions = (state: AgentTraceStore) =>
  Object.values(state.activeSessions).filter((s) => s.status === 'running');

/** Selector: get a specific session's events */
export const selectSessionEvents = (sessionId: string) => (state: AgentTraceStore) =>
  state.activeSessions[sessionId]?.events ?? [];
