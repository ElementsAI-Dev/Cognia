/**
 * Knowledge Map Store - Trace Slice
 */

import type {
  KnowledgeMapLocation,
  KnowledgeMapTrace,
} from '@/types/learning/knowledge-map';
import type {
  KnowledgeMapSliceCreator,
  KnowledgeMapTraceActions,
} from '../knowledge-map-store-types';

export const createKnowledgeMapTraceSlice: KnowledgeMapSliceCreator<KnowledgeMapTraceActions> = (
  set
) => ({
  addTrace: (knowledgeMapId, trace) => {
    set((state) => {
      const existing = state.knowledgeMaps[knowledgeMapId];
      if (!existing) return state;

      const newTrace: KnowledgeMapTrace = {
        ...trace,
        id: `trace_${Date.now()}`,
      };

      return {
        knowledgeMaps: {
          ...state.knowledgeMaps,
          [knowledgeMapId]: {
            ...existing,
            traces: [...existing.traces, newTrace],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  updateTrace: (knowledgeMapId, traceId, updates) => {
    set((state) => {
      const existing = state.knowledgeMaps[knowledgeMapId];
      if (!existing) return state;

      return {
        knowledgeMaps: {
          ...state.knowledgeMaps,
          [knowledgeMapId]: {
            ...existing,
            traces: existing.traces.map((t) => (t.id === traceId ? { ...t, ...updates } : t)),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  deleteTrace: (knowledgeMapId, traceId) => {
    set((state) => {
      const existing = state.knowledgeMaps[knowledgeMapId];
      if (!existing) return state;

      return {
        knowledgeMaps: {
          ...state.knowledgeMaps,
          [knowledgeMapId]: {
            ...existing,
            traces: existing.traces.filter((t) => t.id !== traceId),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  addLocation: (knowledgeMapId, traceId, location) => {
    set((state) => {
      const existing = state.knowledgeMaps[knowledgeMapId];
      if (!existing) return state;

      const newLocation: KnowledgeMapLocation = {
        ...location,
        id: `loc_${Date.now()}`,
      };

      return {
        knowledgeMaps: {
          ...state.knowledgeMaps,
          [knowledgeMapId]: {
            ...existing,
            traces: existing.traces.map((t) =>
              t.id === traceId ? { ...t, locations: [...t.locations, newLocation] } : t
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  updateLocation: (knowledgeMapId, traceId, locationId, updates) => {
    set((state) => {
      const existing = state.knowledgeMaps[knowledgeMapId];
      if (!existing) return state;

      return {
        knowledgeMaps: {
          ...state.knowledgeMaps,
          [knowledgeMapId]: {
            ...existing,
            traces: existing.traces.map((t) =>
              t.id === traceId
                ? {
                    ...t,
                    locations: t.locations.map((l) => (l.id === locationId ? { ...l, ...updates } : l)),
                  }
                : t
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  deleteLocation: (knowledgeMapId, traceId, locationId) => {
    set((state) => {
      const existing = state.knowledgeMaps[knowledgeMapId];
      if (!existing) return state;

      return {
        knowledgeMaps: {
          ...state.knowledgeMaps,
          [knowledgeMapId]: {
            ...existing,
            traces: existing.traces.map((t) =>
              t.id === traceId
                ? {
                    ...t,
                    locations: t.locations.filter((l) => l.id !== locationId),
                  }
                : t
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },
});
