/**
 * Screenshot Editor Store
 *
 * Zustand store for managing screenshot editor state.
 */

import { create } from 'zustand';
import type {
  Annotation,
  AnnotationTool,
  AnnotationStyle,
  SelectionRegion,
} from '@/types/screenshot';

// ============== Types ==============

interface EditorState {
  // Mode
  mode: 'idle' | 'selecting' | 'resizing' | 'moving' | 'editing' | 'annotating';

  // Selection
  selection: SelectionRegion | null;
  isSelecting: boolean;
  startPoint: { x: number; y: number } | null;

  // Screenshot data
  screenshotData: string | null;
  screenshotDimensions: { width: number; height: number } | null;

  // Annotation
  currentTool: AnnotationTool;
  style: AnnotationStyle;
  annotations: Annotation[];
  selectedAnnotationId: string | null;

  // History
  undoStack: Annotation[][];
  redoStack: Annotation[][];

  // Marker counter
  markerCounter: number;
}

interface EditorActions {
  // Mode
  setMode: (mode: EditorState['mode']) => void;

  // Selection
  setSelection: (selection: SelectionRegion | null) => void;
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: () => void;
  moveSelection: (dx: number, dy: number) => void;
  resizeSelection: (
    handle: string,
    x: number,
    y: number,
    startX: number,
    startY: number,
    originalSelection: SelectionRegion
  ) => void;

  // Screenshot
  setScreenshotData: (data: string, width: number, height: number) => void;
  clearScreenshotData: () => void;

  // Tools
  setCurrentTool: (tool: AnnotationTool) => void;
  setStyle: (style: Partial<AnnotationStyle>) => void;

  // Annotations
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  clearAnnotations: () => void;

  // History
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  // Marker
  getNextMarkerNumber: () => number;

  // Reset
  reset: () => void;
}

type EditorStore = EditorState & EditorActions;

// ============== Initial State ==============

const defaultStyle: AnnotationStyle = {
  color: '#FF0000',
  strokeWidth: 2,
  filled: false,
  opacity: 1,
  fontSize: 16,
};

const initialState: EditorState = {
  mode: 'idle',
  selection: null,
  isSelecting: false,
  startPoint: null,
  screenshotData: null,
  screenshotDimensions: null,
  currentTool: 'select',
  style: defaultStyle,
  annotations: [],
  selectedAnnotationId: null,
  undoStack: [],
  redoStack: [],
  markerCounter: 1,
};

// ============== Persisted Style Store ==============

// Separate store for persisting style preferences
interface StylePreferences {
  style: AnnotationStyle;
  currentTool: AnnotationTool;
}

const styleStorageKey = 'cognia-screenshot-style';

// Load persisted style on init
const loadPersistedStyle = (): Partial<StylePreferences> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(styleStorageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        style: parsed.style || defaultStyle,
        currentTool: parsed.currentTool || 'select',
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {};
};

// Save style preferences
const saveStylePreferences = (style: AnnotationStyle, currentTool: AnnotationTool) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(styleStorageKey, JSON.stringify({ style, currentTool }));
  } catch {
    // Ignore storage errors
  }
};

// ============== Store ==============

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,
  ...loadPersistedStyle(),

  setMode: (mode) => set({ mode }),

  setSelection: (selection) => set({ selection }),

  startSelection: (x, y) =>
    set({
      isSelecting: true,
      startPoint: { x, y },
      selection: { x, y, width: 0, height: 0 },
      mode: 'selecting',
    }),

  updateSelection: (x, y) => {
    const { startPoint } = get();
    if (!startPoint) return;

    const newSelection: SelectionRegion = {
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
    };

    set({ selection: newSelection });
  },

  endSelection: () => {
    const { selection } = get();
    const isValid = selection && selection.width > 10 && selection.height > 10;

    set({
      isSelecting: false,
      startPoint: null,
      mode: isValid ? 'editing' : 'idle',
      selection: isValid ? selection : null,
    });
  },

  moveSelection: (dx, dy) => {
    const { selection } = get();
    if (!selection) return;

    set({
      selection: {
        ...selection,
        x: selection.x + dx,
        y: selection.y + dy,
      },
    });
  },

  resizeSelection: (handle, x, y, startX, startY, originalSelection) => {
    const dx = x - startX;
    const dy = y - startY;
    const newSelection = { ...originalSelection };

    switch (handle) {
      case 'nw':
        newSelection.x = originalSelection.x + dx;
        newSelection.y = originalSelection.y + dy;
        newSelection.width = originalSelection.width - dx;
        newSelection.height = originalSelection.height - dy;
        break;
      case 'n':
        newSelection.y = originalSelection.y + dy;
        newSelection.height = originalSelection.height - dy;
        break;
      case 'ne':
        newSelection.y = originalSelection.y + dy;
        newSelection.width = originalSelection.width + dx;
        newSelection.height = originalSelection.height - dy;
        break;
      case 'e':
        newSelection.width = originalSelection.width + dx;
        break;
      case 'se':
        newSelection.width = originalSelection.width + dx;
        newSelection.height = originalSelection.height + dy;
        break;
      case 's':
        newSelection.height = originalSelection.height + dy;
        break;
      case 'sw':
        newSelection.x = originalSelection.x + dx;
        newSelection.width = originalSelection.width - dx;
        newSelection.height = originalSelection.height + dy;
        break;
      case 'w':
        newSelection.x = originalSelection.x + dx;
        newSelection.width = originalSelection.width - dx;
        break;
    }

    // Ensure minimum size
    if (newSelection.width < 10) {
      newSelection.width = 10;
      if (handle.includes('w')) {
        newSelection.x = originalSelection.x + originalSelection.width - 10;
      }
    }
    if (newSelection.height < 10) {
      newSelection.height = 10;
      if (handle.includes('n')) {
        newSelection.y = originalSelection.y + originalSelection.height - 10;
      }
    }

    set({ selection: newSelection });
  },

  setScreenshotData: (data, width, height) =>
    set({
      screenshotData: data,
      screenshotDimensions: { width, height },
      mode: 'editing',
    }),

  clearScreenshotData: () =>
    set({
      screenshotData: null,
      screenshotDimensions: null,
    }),

  setCurrentTool: (tool) => {
    set({ currentTool: tool });
    const { style } = get();
    saveStylePreferences(style, tool);
  },

  setStyle: (styleUpdate) => {
    set((state) => ({
      style: { ...state.style, ...styleUpdate },
    }));
    const { style, currentTool } = get();
    saveStylePreferences(style, currentTool);
  },

  addAnnotation: (annotation) => {
    const state = get();
    state.saveToHistory();
    set({ annotations: [...state.annotations, annotation] });
  },

  updateAnnotation: (id, updates) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? ({ ...a, ...updates } as Annotation) : a
      ),
    })),

  deleteAnnotation: (id) => {
    const state = get();
    state.saveToHistory();
    set({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    });
  },

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  clearAnnotations: () => {
    const state = get();
    if (state.annotations.length > 0) {
      state.saveToHistory();
    }
    set({ annotations: [], selectedAnnotationId: null });
  },

  undo: () => {
    const { undoStack, annotations } = get();
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    set({
      annotations: previousState,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, annotations],
      selectedAnnotationId: null,
    });
  },

  redo: () => {
    const { redoStack, annotations } = get();
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    set({
      annotations: nextState,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, annotations],
      selectedAnnotationId: null,
    });
  },

  saveToHistory: () => {
    const { annotations, undoStack } = get();
    set({
      undoStack: [...undoStack.slice(-49), annotations],
      redoStack: [],
    });
  },

  getNextMarkerNumber: () => {
    const current = get().markerCounter;
    set({ markerCounter: current + 1 });
    return current;
  },

  reset: () => set(initialState),
}));

// ============== Selectors ==============

export const selectCanUndo = (state: EditorStore) => state.undoStack.length > 0;
export const selectCanRedo = (state: EditorStore) => state.redoStack.length > 0;
export const selectIsEditing = (state: EditorStore) =>
  state.mode === 'editing' || state.mode === 'annotating';
export const selectHasSelection = (state: EditorStore) => state.selection !== null;
