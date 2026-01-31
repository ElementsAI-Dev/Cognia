/**
 * Recording Toolbar Store
 *
 * Zustand store for managing recording toolbar state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type {
  RecordingToolbarConfig,
  RecordingToolbarState,
  SnapEdge,
} from '@/lib/native/recording-toolbar';
import {
  showRecordingToolbar,
  hideRecordingToolbar,
  isRecordingToolbarVisible,
  setRecordingToolbarPosition,
  getRecordingToolbarPosition,
  snapRecordingToolbarToEdge,
  toggleRecordingToolbarCompact,
  getRecordingToolbarConfig,
  updateRecordingToolbarConfig,
  getRecordingToolbarState,
  updateRecordingToolbarState,
  setRecordingToolbarHovered,
  destroyRecordingToolbar,
  DEFAULT_RECORDING_TOOLBAR_CONFIG,
} from '@/lib/native/recording-toolbar';
import { isTauri } from '@/lib/native/utils';

interface RecordingToolbarStoreState {
  // Visibility
  isVisible: boolean;
  isHovered: boolean;

  // Position
  position: { x: number; y: number };
  snappedEdge: SnapEdge | null;

  // Configuration
  config: RecordingToolbarConfig;

  // Recording state
  recordingState: RecordingToolbarState;

  // UI state
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Event listeners
  _eventListeners: UnlistenFn[];
}

interface RecordingToolbarStoreActions {
  // Initialization
  initialize: () => Promise<void>;
  cleanup: () => void;
  setupEventListeners: () => Promise<void>;

  // Visibility
  show: () => Promise<void>;
  hide: () => Promise<void>;
  toggle: () => Promise<void>;

  // Position
  setPosition: (x: number, y: number) => Promise<void>;
  snapToEdge: (edge: SnapEdge) => Promise<void>;

  // Compact mode
  toggleCompact: () => Promise<void>;

  // Configuration
  updateConfig: (config: Partial<RecordingToolbarConfig>) => Promise<void>;

  // Recording state
  updateState: (isRecording: boolean, isPaused: boolean, durationMs: number) => Promise<void>;

  // Hover
  setHovered: (hovered: boolean) => Promise<void>;

  // Destroy
  destroy: () => Promise<void>;

  // Reset
  reset: () => void;
}

type RecordingToolbarStore = RecordingToolbarStoreState & RecordingToolbarStoreActions;

const initialState: RecordingToolbarStoreState = {
  isVisible: false,
  isHovered: false,
  position: { x: 0, y: 0 },
  snappedEdge: null,
  config: DEFAULT_RECORDING_TOOLBAR_CONFIG,
  recordingState: {
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    formattedDuration: '00:00',
  },
  isLoading: false,
  isInitialized: false,
  error: null,
  _eventListeners: [],
};

export const useRecordingToolbarStore = create<RecordingToolbarStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      initialize: async () => {
        if (!isTauri() || get().isInitialized) return;

        set({ isLoading: true, error: null });

        try {
          const [visible, position, config, state] = await Promise.all([
            isRecordingToolbarVisible(),
            getRecordingToolbarPosition(),
            getRecordingToolbarConfig(),
            getRecordingToolbarState(),
          ]);

          set({
            isVisible: visible,
            position: { x: position[0], y: position[1] },
            config,
            recordingState: state,
            isInitialized: true,
            isLoading: false,
          });

          await get().setupEventListeners();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to initialize toolbar',
            isLoading: false,
          });
        }
      },

      cleanup: () => {
        const listeners = get()._eventListeners;
        listeners.forEach((unlisten) => unlisten());
        set({ _eventListeners: [], isInitialized: false });
      },

      setupEventListeners: async () => {
        if (!isTauri()) return;

        const listeners: UnlistenFn[] = [];

        // Listen for visibility changes
        const unlistenShow = await listen('recording-toolbar://show', () => {
          set({ isVisible: true });
        });
        listeners.push(unlistenShow);

        const unlistenHide = await listen('recording-toolbar://hide', () => {
          set({ isVisible: false });
        });
        listeners.push(unlistenHide);

        // Listen for position changes
        const unlistenPosition = await listen<{ x: number; y: number }>(
          'recording-toolbar://position-changed',
          (event) => {
            set({ position: event.payload });
          }
        );
        listeners.push(unlistenPosition);

        // Listen for snap events
        const unlistenSnapped = await listen<{ edge: SnapEdge }>(
          'recording-toolbar://snapped',
          (event) => {
            set({ snappedEdge: event.payload.edge });
          }
        );
        listeners.push(unlistenSnapped);

        // Listen for compact mode toggle
        const unlistenCompact = await listen<boolean>(
          'recording-toolbar://compact-toggled',
          (event) => {
            set((state) => ({
              config: { ...state.config, compactMode: event.payload },
            }));
          }
        );
        listeners.push(unlistenCompact);

        // Listen for state updates
        const unlistenState = await listen<RecordingToolbarState>(
          'recording-toolbar://state-updated',
          (event) => {
            set({ recordingState: event.payload });
          }
        );
        listeners.push(unlistenState);

        set({ _eventListeners: listeners });
      },

      show: async () => {
        if (!isTauri()) return;
        try {
          await showRecordingToolbar();
          set({ isVisible: true });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to show toolbar' });
        }
      },

      hide: async () => {
        if (!isTauri()) return;
        try {
          await hideRecordingToolbar();
          set({ isVisible: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to hide toolbar' });
        }
      },

      toggle: async () => {
        const { isVisible } = get();
        if (isVisible) {
          await get().hide();
        } else {
          await get().show();
        }
      },

      setPosition: async (x: number, y: number) => {
        if (!isTauri()) return;
        try {
          await setRecordingToolbarPosition(x, y);
          set({ position: { x, y }, snappedEdge: null });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to set position' });
        }
      },

      snapToEdge: async (edge: SnapEdge) => {
        if (!isTauri()) return;
        try {
          await snapRecordingToolbarToEdge(edge);
          set({ snappedEdge: edge });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to snap to edge' });
        }
      },

      toggleCompact: async () => {
        if (!isTauri()) return;
        try {
          const isCompact = await toggleRecordingToolbarCompact();
          set((state) => ({
            config: { ...state.config, compactMode: isCompact },
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to toggle compact' });
        }
      },

      updateConfig: async (partialConfig: Partial<RecordingToolbarConfig>) => {
        if (!isTauri()) return;
        try {
          const currentConfig = get().config;
          const newConfig = { ...currentConfig, ...partialConfig };
          await updateRecordingToolbarConfig(newConfig);
          set({ config: newConfig });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update config' });
        }
      },

      updateState: async (isRecording: boolean, isPaused: boolean, durationMs: number) => {
        if (!isTauri()) return;
        try {
          await updateRecordingToolbarState(isRecording, isPaused, durationMs);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update state' });
        }
      },

      setHovered: async (hovered: boolean) => {
        if (!isTauri()) return;
        try {
          await setRecordingToolbarHovered(hovered);
          set({ isHovered: hovered });
        } catch {
          // Silently ignore hover errors
        }
      },

      destroy: async () => {
        if (!isTauri()) return;
        try {
          get().cleanup();
          await destroyRecordingToolbar();
          set(initialState);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to destroy toolbar' });
        }
      },

      reset: () => {
        get().cleanup();
        set(initialState);
      },
    }),
    {
      name: 'cognia-recording-toolbar',
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);

// Selectors
export const selectToolbarVisible = (state: RecordingToolbarStore) => state.isVisible;
export const selectToolbarConfig = (state: RecordingToolbarStore) => state.config;
export const selectRecordingState = (state: RecordingToolbarStore) => state.recordingState;
export const selectSnappedEdge = (state: RecordingToolbarStore) => state.snappedEdge;
export const selectIsCompact = (state: RecordingToolbarStore) => state.config.compactMode;
