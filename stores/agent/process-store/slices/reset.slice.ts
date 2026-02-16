import type { StoreApi } from 'zustand';
import { initialState } from '../initial-state';
import type { ProcessStoreState } from '../types';

type ProcessStoreSet = StoreApi<ProcessStoreState>['setState'];

type ResetSlice = Pick<ProcessStoreState, 'reset'>;

export const createResetSlice = (set: ProcessStoreSet): ResetSlice => ({
  reset: () => set(initialState),
});
