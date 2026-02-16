/**
 * Academic Store - App Slice
 * Error handling and global reset actions
 */

import type {
  AcademicInitialState,
  AcademicSetState,
  AcademicGetState,
  AppActions,
} from '../types';

export const initialAppState: Pick<
  AcademicInitialState,
  'statistics' | 'isLoading' | 'error'
> = {
  statistics: null,
  isLoading: false,
  error: null,
};

export function createAppSlice(
  set: AcademicSetState,
  _get: AcademicGetState,
  initialState: AcademicInitialState
): AppActions {
  return {
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
    reset: () => set(initialState),
  };
}
