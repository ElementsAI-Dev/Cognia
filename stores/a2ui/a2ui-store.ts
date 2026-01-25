/**
 * A2UI Zustand Store
 * Manages A2UI surfaces, components, and data models
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  A2UISurfaceState,
  A2UISurfaceType,
  A2UIComponent,
  A2UIServerMessage,
  A2UIUserAction,
  A2UIDataModelChange,
} from '@/types/artifact/a2ui';
import {
  isCreateSurfaceMessage,
  isUpdateComponentsMessage,
  isUpdateDataModelMessage,
  isDeleteSurfaceMessage,
  isSurfaceReadyMessage,
} from '@/lib/a2ui/parser';
import { setValueByPath, deepMerge, deepClone } from '@/lib/a2ui/data-model';
import { globalEventEmitter, createUserAction, createDataModelChange } from '@/lib/a2ui/events';

/**
 * A2UI Store State
 */
interface A2UIState {
  // Surface management
  surfaces: Record<string, A2UISurfaceState>;
  activeSurfaceId: string | null;

  // Event history (for debugging and AI context)
  eventHistory: (A2UIUserAction | A2UIDataModelChange)[];
  maxEventHistory: number;

  // Loading states
  loadingSurfaces: Set<string>;

  // Error tracking
  errors: Record<string, string>;
}

/**
 * A2UI Store Actions
 */
interface A2UIActions {
  // Surface lifecycle
  createSurface: (
    surfaceId: string,
    type: A2UISurfaceType,
    options?: { catalogId?: string; title?: string }
  ) => void;
  deleteSurface: (surfaceId: string) => void;
  setActiveSurface: (surfaceId: string | null) => void;

  // Component management
  updateComponents: (surfaceId: string, components: A2UIComponent[]) => void;
  getComponent: (surfaceId: string, componentId: string) => A2UIComponent | undefined;

  // Data model management
  updateDataModel: (surfaceId: string, data: Record<string, unknown>, merge?: boolean) => void;
  setDataValue: (surfaceId: string, path: string, value: unknown) => void;
  getDataValue: <T = unknown>(surfaceId: string, path: string) => T | undefined;

  // Message processing
  processMessage: (message: A2UIServerMessage) => void;
  processMessages: (messages: A2UIServerMessage[]) => void;

  // Event handling
  emitAction: (
    surfaceId: string,
    action: string,
    componentId: string,
    data?: Record<string, unknown>
  ) => void;
  emitDataChange: (surfaceId: string, path: string, value: unknown) => void;

  // Surface state
  setSurfaceReady: (surfaceId: string) => void;
  setSurfaceLoading: (surfaceId: string, loading: boolean) => void;
  setError: (surfaceId: string, error: string | null) => void;

  // Utilities
  getSurface: (surfaceId: string) => A2UISurfaceState | undefined;
  clearEventHistory: () => void;
  reset: () => void;
}

/**
 * Initial state
 */
const initialState: A2UIState = {
  surfaces: {},
  activeSurfaceId: null,
  eventHistory: [],
  maxEventHistory: 100,
  loadingSurfaces: new Set(),
  errors: {},
};

/**
 * A2UI Store
 */
export const useA2UIStore = create<A2UIState & A2UIActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Surface lifecycle
    createSurface: (surfaceId, type, options) => {
      set((state) => ({
        surfaces: {
          ...state.surfaces,
          [surfaceId]: {
            id: surfaceId,
            type,
            catalogId: options?.catalogId,
            title: options?.title,
            components: {},
            dataModel: {},
            rootId: 'root',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ready: false,
          },
        },
        activeSurfaceId: state.activeSurfaceId ?? surfaceId,
      }));
    },

    deleteSurface: (surfaceId) => {
      set((state) => {
        const { [surfaceId]: _, ...remainingSurfaces } = state.surfaces;
        const { [surfaceId]: __, ...remainingErrors } = state.errors;
        const newLoadingSurfaces = new Set(state.loadingSurfaces);
        newLoadingSurfaces.delete(surfaceId);

        return {
          surfaces: remainingSurfaces,
          errors: remainingErrors,
          loadingSurfaces: newLoadingSurfaces,
          activeSurfaceId:
            state.activeSurfaceId === surfaceId
              ? (Object.keys(remainingSurfaces)[0] ?? null)
              : state.activeSurfaceId,
        };
      });
    },

    setActiveSurface: (surfaceId) => {
      set({ activeSurfaceId: surfaceId });
    },

    // Component management
    updateComponents: (surfaceId, components) => {
      set((state) => {
        const surface = state.surfaces[surfaceId];
        if (!surface) return state;

        const updatedComponents = { ...surface.components };
        for (const component of components) {
          updatedComponents[component.id] = component;
        }

        return {
          surfaces: {
            ...state.surfaces,
            [surfaceId]: {
              ...surface,
              components: updatedComponents,
              updatedAt: Date.now(),
            },
          },
        };
      });
    },

    getComponent: (surfaceId, componentId) => {
      const surface = get().surfaces[surfaceId];
      return surface?.components[componentId];
    },

    // Data model management
    updateDataModel: (surfaceId, data, merge = true) => {
      set((state) => {
        const surface = state.surfaces[surfaceId];
        if (!surface) return state;

        const newDataModel = merge ? deepMerge(surface.dataModel, data) : deepClone(data);

        return {
          surfaces: {
            ...state.surfaces,
            [surfaceId]: {
              ...surface,
              dataModel: newDataModel,
              updatedAt: Date.now(),
            },
          },
        };
      });
    },

    setDataValue: (surfaceId, path, value) => {
      set((state) => {
        const surface = state.surfaces[surfaceId];
        if (!surface) return state;

        const newDataModel = setValueByPath(surface.dataModel, path, value);

        return {
          surfaces: {
            ...state.surfaces,
            [surfaceId]: {
              ...surface,
              dataModel: newDataModel,
              updatedAt: Date.now(),
            },
          },
        };
      });

      // Emit data change event
      get().emitDataChange(surfaceId, path, value);
    },

    getDataValue: <T = unknown>(surfaceId: string, path: string): T | undefined => {
      const surface = get().surfaces[surfaceId];
      if (!surface) return undefined;

      // Inline implementation to avoid circular dependency
      const segments = path.split('/').filter(Boolean);
      let current: unknown = surface.dataModel;

      for (const segment of segments) {
        if (current === null || current === undefined) return undefined;
        if (typeof current === 'object') {
          current = (current as Record<string, unknown>)[segment];
        } else {
          return undefined;
        }
      }

      return current as T;
    },

    // Message processing
    processMessage: (message) => {
      const { createSurface, updateComponents, updateDataModel, deleteSurface, setSurfaceReady } =
        get();

      if (isCreateSurfaceMessage(message)) {
        createSurface(message.surfaceId, message.surfaceType, {
          catalogId: message.catalogId,
          title: message.title,
        });
      } else if (isUpdateComponentsMessage(message)) {
        updateComponents(message.surfaceId, message.components);
      } else if (isUpdateDataModelMessage(message)) {
        updateDataModel(message.surfaceId, message.data, message.merge);
      } else if (isDeleteSurfaceMessage(message)) {
        deleteSurface(message.surfaceId);
      } else if (isSurfaceReadyMessage(message)) {
        setSurfaceReady(message.surfaceId);
      }
    },

    processMessages: (messages) => {
      const { processMessage } = get();
      for (const message of messages) {
        processMessage(message);
      }
    },

    // Event handling
    emitAction: (surfaceId, action, componentId, data) => {
      const actionEvent = createUserAction(surfaceId, action, componentId, data);

      // Add to history
      set((state) => {
        const newHistory = [actionEvent, ...state.eventHistory].slice(0, state.maxEventHistory);
        return { eventHistory: newHistory };
      });

      // Emit to global event emitter
      globalEventEmitter.emitAction(actionEvent);
    },

    emitDataChange: (surfaceId, path, value) => {
      const changeEvent = createDataModelChange(surfaceId, path, value);

      // Add to history
      set((state) => {
        const newHistory = [changeEvent, ...state.eventHistory].slice(0, state.maxEventHistory);
        return { eventHistory: newHistory };
      });

      // Emit to global event emitter
      globalEventEmitter.emitDataChange(changeEvent);
    },

    // Surface state
    setSurfaceReady: (surfaceId) => {
      set((state) => {
        const surface = state.surfaces[surfaceId];
        if (!surface) return state;

        const newLoadingSurfaces = new Set(state.loadingSurfaces);
        newLoadingSurfaces.delete(surfaceId);

        return {
          surfaces: {
            ...state.surfaces,
            [surfaceId]: {
              ...surface,
              ready: true,
              updatedAt: Date.now(),
            },
          },
          loadingSurfaces: newLoadingSurfaces,
        };
      });
    },

    setSurfaceLoading: (surfaceId, loading) => {
      set((state) => {
        const newLoadingSurfaces = new Set(state.loadingSurfaces);
        if (loading) {
          newLoadingSurfaces.add(surfaceId);
        } else {
          newLoadingSurfaces.delete(surfaceId);
        }
        return { loadingSurfaces: newLoadingSurfaces };
      });
    },

    setError: (surfaceId, error) => {
      set((state) => {
        if (error === null) {
          const { [surfaceId]: _, ...remainingErrors } = state.errors;
          return { errors: remainingErrors };
        }
        return {
          errors: {
            ...state.errors,
            [surfaceId]: error,
          },
        };
      });
    },

    // Utilities
    getSurface: (surfaceId) => {
      return get().surfaces[surfaceId];
    },

    clearEventHistory: () => {
      set({ eventHistory: [] });
    },

    reset: () => {
      set(initialState);
    },
  }))
);

/**
 * Selectors
 */
export const selectSurface = (surfaceId: string) => (state: A2UIState) => state.surfaces[surfaceId];

export const selectActiveSurface = (state: A2UIState & A2UIActions) =>
  state.activeSurfaceId ? state.surfaces[state.activeSurfaceId] : undefined;

export const selectSurfaceComponents = (surfaceId: string) => (state: A2UIState) =>
  state.surfaces[surfaceId]?.components ?? {};

export const selectSurfaceDataModel = (surfaceId: string) => (state: A2UIState) =>
  state.surfaces[surfaceId]?.dataModel ?? {};

export const selectIsSurfaceLoading = (surfaceId: string) => (state: A2UIState) =>
  state.loadingSurfaces.has(surfaceId);

export const selectSurfaceError = (surfaceId: string) => (state: A2UIState) =>
  state.errors[surfaceId];

export const selectEventHistory = (state: A2UIState) => state.eventHistory;

export const selectRecentEvents = (count: number) => (state: A2UIState) =>
  state.eventHistory.slice(0, count);
