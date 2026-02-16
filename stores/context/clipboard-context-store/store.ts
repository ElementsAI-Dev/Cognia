import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { initialState } from './initial-state';
import { createAnalysisSlice } from './slices/analysis.slice';
import { createContentSlice } from './slices/content.slice';
import { createMonitoringSlice } from './slices/monitoring.slice';
import { createSettingsSlice } from './slices/settings.slice';
import { createTemplatesSlice } from './slices/templates.slice';
import { createUtilitiesSlice } from './slices/utilities.slice';
import type { ClipboardContextStore } from './types';

export const useClipboardContextStore = create<ClipboardContextStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    ...createContentSlice(set, get),
    ...createAnalysisSlice(set, get),
    ...createTemplatesSlice(set, get),
    ...createMonitoringSlice(set, get),
    ...createSettingsSlice(set, get),
    ...createUtilitiesSlice(set, get),
  }))
);

