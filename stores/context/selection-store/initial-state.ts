import { DEFAULT_SELECTION_CONFIG } from '@/types';
import type { SelectionState } from './types';

export const initialState: SelectionState = {
  config: DEFAULT_SELECTION_CONFIG,
  isEnabled: false,
  isToolbarVisible: false,
  selectedText: '',
  position: { x: 0, y: 0 },
  isProcessing: false,
  isStreaming: false,
  streamingResult: null,
  currentAction: null,
  result: null,
  error: null,
  history: [],
  selectionMode: 'auto',
  textType: null,
  sourceApp: null,
  showMoreMenu: false,
  feedbackGiven: {},
  selections: [],
  isMultiSelectMode: false,
  references: [],
  translationMemory: [],
};

