import type { SessionStoreState } from './types';
import { bulkSliceInitialState } from './slices/bulk.slice';
import { coreSliceInitialState } from './slices/core.slice';
import { modeSliceInitialState } from './slices/mode.slice';

export const initialState: SessionStoreState = {
  ...coreSliceInitialState,
  ...modeSliceInitialState,
  ...bulkSliceInitialState,
};
