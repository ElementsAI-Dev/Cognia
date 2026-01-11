/**
 * PPT Editor Store - manages PPT editing state with undo/redo support
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PPTPresentation,
  PPTSlide,
  PPTSlideElement,
  PPTTheme,
  PPTSlideLayout,
} from '@/types/workflow';
import { createEmptySlide, getDefaultPPTTheme } from '@/types/workflow';
import type { SlideshowSettings } from '@/components/ppt/types';

// History entry for undo/redo
interface HistoryEntry {
  presentation: PPTPresentation;
  timestamp: number;
  description: string;
}

// Editor mode
export type EditorMode = 'preview' | 'edit' | 'slideshow';

// Selection state
export interface SelectionState {
  slideId: string | null;
  elementIds: string[];
}

// Clipboard content
export interface ClipboardContent {
  type: 'slide' | 'element' | 'slides';
  data: PPTSlide | PPTSlideElement | PPTSlide[];
}

interface PPTEditorState {
  // Current presentation being edited
  presentation: PPTPresentation | null;
  
  // Editor state
  mode: EditorMode;
  currentSlideIndex: number;
  selection: SelectionState;
  clipboard: ClipboardContent | null;
  
  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;
  
  // UI state
  showGrid: boolean;
  showGuides: boolean;
  showNotes: boolean;
  zoom: number;
  panelWidth: number;
  
  // Editing state
  isDirty: boolean;
  isEditing: boolean;
  editingElementId: string | null;
  
  // AI generation state
  isGenerating: boolean;
  generatingSlideId: string | null;
  
  // Slideshow settings (persisted)
  slideshowSettings: SlideshowSettings;
}

interface PPTEditorActions {
  // Presentation management
  loadPresentation: (presentation: PPTPresentation) => void;
  savePresentation: () => PPTPresentation | null;
  clearPresentation: () => void;
  
  // Slide operations
  addSlide: (layout?: PPTSlideLayout, index?: number) => void;
  duplicateSlide: (slideId: string) => void;
  deleteSlide: (slideId: string) => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;
  updateSlide: (slideId: string, updates: Partial<PPTSlide>) => void;
  setSlideLayout: (slideId: string, layout: PPTSlideLayout) => void;
  setSlideBackground: (slideId: string, background: { color?: string; image?: string }) => void;
  
  // Element operations
  addElement: (slideId: string, element: Omit<PPTSlideElement, 'id'>) => void;
  updateElement: (slideId: string, elementId: string, updates: Partial<PPTSlideElement>) => void;
  deleteElement: (slideId: string, elementId: string) => void;
  duplicateElement: (slideId: string, elementId: string) => void;
  moveElement: (slideId: string, elementId: string, position: { x: number; y: number }) => void;
  resizeElement: (slideId: string, elementId: string, size: { width: number; height: number }) => void;
  bringToFront: (slideId: string, elementId: string) => void;
  sendToBack: (slideId: string, elementId: string) => void;
  
  // Theme operations
  setTheme: (theme: PPTTheme) => void;
  setThemeById: (themeId: string) => void;
  updateThemeColors: (colors: Partial<Pick<PPTTheme, 'primaryColor' | 'secondaryColor' | 'accentColor' | 'backgroundColor' | 'textColor'>>) => void;
  
  // Navigation
  setCurrentSlide: (index: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (slideId: string) => void;
  
  // Selection
  selectSlide: (slideId: string) => void;
  selectElement: (elementId: string) => void;
  selectElements: (elementIds: string[]) => void;
  addToSelection: (elementId: string) => void;
  clearSelection: () => void;
  
  // Clipboard
  copy: () => void;
  cut: () => void;
  paste: () => void;
  
  // History (undo/redo)
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: (description: string) => void;
  
  // Editor mode
  setMode: (mode: EditorMode) => void;
  startEditing: (elementId: string) => void;
  stopEditing: () => void;
  
  // UI state
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  toggleGuides: () => void;
  toggleNotes: () => void;
  setPanelWidth: (width: number) => void;
  
  // AI generation
  setGenerating: (isGenerating: boolean, slideId?: string | null) => void;
  regenerateSlide: (slideId: string) => Promise<void>;
  
  // Slideshow settings
  updateSlideshowSettings: (settings: Partial<SlideshowSettings>) => void;
  resetSlideshowSettings: () => void;
  
  // Utilities
  getCurrentSlide: () => PPTSlide | null;
  getSlideById: (slideId: string) => PPTSlide | null;
  getElementById: (slideId: string, elementId: string) => PPTSlideElement | null;
  reorderSlides: (slideIds: string[]) => void;
}

const DEFAULT_SLIDESHOW_SETTINGS: SlideshowSettings = {
  showThumbnails: false,
  showProgress: true,
  showTimer: true,
  showNotes: false,
  autoPlay: false,
  autoPlayInterval: 5,
  enableTransitions: true,
  transitionType: 'fade',
  transitionDuration: 300,
};

const initialState: PPTEditorState = {
  presentation: null,
  mode: 'edit',
  currentSlideIndex: 0,
  selection: { slideId: null, elementIds: [] },
  clipboard: null,
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  showGrid: false,
  showGuides: true,
  showNotes: true,
  zoom: 100,
  panelWidth: 280,
  isDirty: false,
  isEditing: false,
  editingElementId: null,
  isGenerating: false,
  generatingSlideId: null,
  slideshowSettings: DEFAULT_SLIDESHOW_SETTINGS,
};

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const usePPTEditorStore = create<PPTEditorState & PPTEditorActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Presentation management
      loadPresentation: (presentation) => {
        set({
          presentation,
          currentSlideIndex: 0,
          selection: { slideId: presentation.slides[0]?.id || null, elementIds: [] },
          history: [{
            presentation: JSON.parse(JSON.stringify(presentation)),
            timestamp: Date.now(),
            description: 'Load presentation',
          }],
          historyIndex: 0,
          isDirty: false,
        });
      },

      savePresentation: () => {
        const { presentation } = get();
        if (presentation) {
          set({ isDirty: false });
        }
        return presentation;
      },

      clearPresentation: () => {
        set({
          ...initialState,
        });
      },

      // Slide operations
      addSlide: (layout = 'title-content', index) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;

        const newSlide = createEmptySlide(layout, presentation.slides.length);
        newSlide.id = `slide-${generateId()}`;
        
        const insertIndex = index ?? presentation.slides.length;
        const newSlides = [...presentation.slides];
        newSlides.splice(insertIndex, 0, newSlide);
        
        // Update order for all slides
        newSlides.forEach((slide, i) => {
          slide.order = i;
        });

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            totalSlides: newSlides.length,
            updatedAt: new Date(),
          },
          currentSlideIndex: insertIndex,
          selection: { slideId: newSlide.id, elementIds: [] },
          isDirty: true,
        });
        
        pushHistory('Add slide');
      },

      duplicateSlide: (slideId) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;

        const slideIndex = presentation.slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;

        const originalSlide = presentation.slides[slideIndex];
        const duplicatedSlide: PPTSlide = {
          ...JSON.parse(JSON.stringify(originalSlide)),
          id: `slide-${generateId()}`,
          order: slideIndex + 1,
        };

        const newSlides = [...presentation.slides];
        newSlides.splice(slideIndex + 1, 0, duplicatedSlide);
        
        // Update order for all slides
        newSlides.forEach((slide, i) => {
          slide.order = i;
        });

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            totalSlides: newSlides.length,
            updatedAt: new Date(),
          },
          currentSlideIndex: slideIndex + 1,
          selection: { slideId: duplicatedSlide.id, elementIds: [] },
          isDirty: true,
        });
        
        pushHistory('Duplicate slide');
      },

      deleteSlide: (slideId) => {
        const { presentation, currentSlideIndex, pushHistory } = get();
        if (!presentation || presentation.slides.length <= 1) return;

        const slideIndex = presentation.slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;

        const newSlides = presentation.slides.filter(s => s.id !== slideId);
        
        // Update order for all slides
        newSlides.forEach((slide, i) => {
          slide.order = i;
        });

        const newCurrentIndex = Math.min(currentSlideIndex, newSlides.length - 1);

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            totalSlides: newSlides.length,
            updatedAt: new Date(),
          },
          currentSlideIndex: newCurrentIndex,
          selection: { slideId: newSlides[newCurrentIndex]?.id || null, elementIds: [] },
          isDirty: true,
        });
        
        pushHistory('Delete slide');
      },

      moveSlide: (fromIndex, toIndex) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= presentation.slides.length) return;
        if (toIndex < 0 || toIndex >= presentation.slides.length) return;

        const newSlides = [...presentation.slides];
        const [movedSlide] = newSlides.splice(fromIndex, 1);
        newSlides.splice(toIndex, 0, movedSlide);
        
        // Update order for all slides
        newSlides.forEach((slide, i) => {
          slide.order = i;
        });

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            updatedAt: new Date(),
          },
          currentSlideIndex: toIndex,
          isDirty: true,
        });
        
        pushHistory('Move slide');
      },

      updateSlide: (slideId, updates) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide =>
          slide.id === slideId ? { ...slide, ...updates } : slide
        );

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            updatedAt: new Date(),
          },
          isDirty: true,
        });
        
        pushHistory('Update slide');
      },

      setSlideLayout: (slideId, layout) => {
        const { updateSlide } = get();
        updateSlide(slideId, { layout });
      },

      setSlideBackground: (slideId, background) => {
        const { updateSlide } = get();
        updateSlide(slideId, {
          backgroundColor: background.color,
          backgroundImage: background.image,
        });
      },

      // Element operations
      addElement: (slideId, element) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;

        const newElement: PPTSlideElement = {
          ...element,
          id: `element-${generateId()}`,
        };

        const newSlides = presentation.slides.map(slide => {
          if (slide.id === slideId) {
            return {
              ...slide,
              elements: [...slide.elements, newElement],
            };
          }
          return slide;
        });

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            updatedAt: new Date(),
          },
          selection: { slideId, elementIds: [newElement.id] },
          isDirty: true,
        });
        
        pushHistory('Add element');
      },

      updateElement: (slideId, elementId, updates) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide => {
          if (slide.id === slideId) {
            return {
              ...slide,
              elements: slide.elements.map(el =>
                el.id === elementId ? { ...el, ...updates } : el
              ),
            };
          }
          return slide;
        });

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            updatedAt: new Date(),
          },
          isDirty: true,
        });
        
        pushHistory('Update element');
      },

      deleteElement: (slideId, elementId) => {
        const { presentation, selection, pushHistory } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide => {
          if (slide.id === slideId) {
            return {
              ...slide,
              elements: slide.elements.filter(el => el.id !== elementId),
            };
          }
          return slide;
        });

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            updatedAt: new Date(),
          },
          selection: {
            ...selection,
            elementIds: selection.elementIds.filter(id => id !== elementId),
          },
          isDirty: true,
        });
        
        pushHistory('Delete element');
      },

      duplicateElement: (slideId, elementId) => {
        const { presentation, getElementById, addElement } = get();
        if (!presentation) return;

        const element = getElementById(slideId, elementId);
        if (!element) return;

        const newElement = {
          ...element,
          position: element.position ? {
            ...element.position,
            x: element.position.x + 2,
            y: element.position.y + 2,
          } : undefined,
        };

        // Remove id so addElement generates a new one
        const { id: _id, ...elementWithoutId } = newElement;
        addElement(slideId, elementWithoutId);
      },

      moveElement: (slideId, elementId, position) => {
        const { updateElement } = get();
        const element = get().getElementById(slideId, elementId);
        if (!element) return;

        updateElement(slideId, elementId, {
          position: {
            ...element.position,
            x: position.x,
            y: position.y,
            width: element.position?.width ?? 20,
            height: element.position?.height ?? 20,
          },
        });
      },

      resizeElement: (slideId, elementId, size) => {
        const { updateElement } = get();
        const element = get().getElementById(slideId, elementId);
        if (!element) return;

        updateElement(slideId, elementId, {
          position: {
            ...element.position,
            x: element.position?.x ?? 0,
            y: element.position?.y ?? 0,
            width: size.width,
            height: size.height,
          },
        });
      },

      bringToFront: (slideId, elementId) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide => {
          if (slide.id === slideId) {
            const elementIndex = slide.elements.findIndex(el => el.id === elementId);
            if (elementIndex === -1) return slide;

            const newElements = [...slide.elements];
            const [element] = newElements.splice(elementIndex, 1);
            newElements.push(element);

            return { ...slide, elements: newElements };
          }
          return slide;
        });

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            updatedAt: new Date(),
          },
          isDirty: true,
        });
        
        pushHistory('Bring to front');
      },

      sendToBack: (slideId, elementId) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide => {
          if (slide.id === slideId) {
            const elementIndex = slide.elements.findIndex(el => el.id === elementId);
            if (elementIndex === -1) return slide;

            const newElements = [...slide.elements];
            const [element] = newElements.splice(elementIndex, 1);
            newElements.unshift(element);

            return { ...slide, elements: newElements };
          }
          return slide;
        });

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            updatedAt: new Date(),
          },
          isDirty: true,
        });
        
        pushHistory('Send to back');
      },

      // Theme operations
      setTheme: (theme) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;

        set({
          presentation: {
            ...presentation,
            theme,
            updatedAt: new Date(),
          },
          isDirty: true,
        });
        
        pushHistory('Change theme');
      },

      setThemeById: (themeId) => {
        const theme = getDefaultPPTTheme(themeId);
        get().setTheme(theme);
      },

      updateThemeColors: (colors) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;

        set({
          presentation: {
            ...presentation,
            theme: {
              ...presentation.theme,
              ...colors,
            },
            updatedAt: new Date(),
          },
          isDirty: true,
        });
        
        pushHistory('Update theme colors');
      },

      // Navigation
      setCurrentSlide: (index) => {
        const { presentation } = get();
        if (!presentation) return;
        if (index < 0 || index >= presentation.slides.length) return;

        set({
          currentSlideIndex: index,
          selection: {
            slideId: presentation.slides[index]?.id || null,
            elementIds: [],
          },
        });
      },

      nextSlide: () => {
        const { presentation, currentSlideIndex } = get();
        if (!presentation) return;
        if (currentSlideIndex < presentation.slides.length - 1) {
          get().setCurrentSlide(currentSlideIndex + 1);
        }
      },

      prevSlide: () => {
        const { currentSlideIndex } = get();
        if (currentSlideIndex > 0) {
          get().setCurrentSlide(currentSlideIndex - 1);
        }
      },

      goToSlide: (slideId) => {
        const { presentation } = get();
        if (!presentation) return;

        const index = presentation.slides.findIndex(s => s.id === slideId);
        if (index !== -1) {
          get().setCurrentSlide(index);
        }
      },

      // Selection
      selectSlide: (slideId) => {
        set({
          selection: { slideId, elementIds: [] },
        });
      },

      selectElement: (elementId) => {
        const { selection } = get();
        set({
          selection: {
            ...selection,
            elementIds: [elementId],
          },
        });
      },

      selectElements: (elementIds) => {
        const { selection } = get();
        set({
          selection: {
            ...selection,
            elementIds,
          },
        });
      },

      addToSelection: (elementId) => {
        const { selection } = get();
        if (!selection.elementIds.includes(elementId)) {
          set({
            selection: {
              ...selection,
              elementIds: [...selection.elementIds, elementId],
            },
          });
        }
      },

      clearSelection: () => {
        const { selection } = get();
        set({
          selection: {
            ...selection,
            elementIds: [],
          },
        });
      },

      // Clipboard
      copy: () => {
        const { presentation, selection, currentSlideIndex } = get();
        if (!presentation) return;

        if (selection.elementIds.length > 0 && selection.slideId) {
          // Copy selected elements
          const slide = presentation.slides.find(s => s.id === selection.slideId);
          if (!slide) return;

          const elements = slide.elements.filter(el =>
            selection.elementIds.includes(el.id)
          );
          
          if (elements.length === 1) {
            set({ clipboard: { type: 'element', data: elements[0] } });
          }
        } else {
          // Copy current slide
          const slide = presentation.slides[currentSlideIndex];
          if (slide) {
            set({ clipboard: { type: 'slide', data: slide } });
          }
        }
      },

      cut: () => {
        const { selection, currentSlideIndex, presentation, copy, deleteSlide, deleteElement } = get();
        if (!presentation) return;

        copy();

        if (selection.elementIds.length > 0 && selection.slideId) {
          // Delete selected elements
          selection.elementIds.forEach(elementId => {
            deleteElement(selection.slideId!, elementId);
          });
        } else if (presentation.slides.length > 1) {
          // Delete current slide
          const slide = presentation.slides[currentSlideIndex];
          if (slide) {
            deleteSlide(slide.id);
          }
        }
      },

      paste: () => {
        const { clipboard, currentSlideIndex, presentation, addSlide, addElement } = get();
        if (!clipboard || !presentation) return;

        if (clipboard.type === 'slide') {
          const slideData = clipboard.data as PPTSlide;
          addSlide(slideData.layout, currentSlideIndex + 1);
          
          // Update the newly added slide with the copied content
          const { presentation: updatedPresentation, updateSlide } = get();
          if (updatedPresentation) {
            const newSlide = updatedPresentation.slides[currentSlideIndex + 1];
            if (newSlide) {
              updateSlide(newSlide.id, {
                title: slideData.title,
                subtitle: slideData.subtitle,
                content: slideData.content,
                bullets: slideData.bullets,
                notes: slideData.notes,
                elements: slideData.elements.map(el => ({
                  ...el,
                  id: `element-${generateId()}`,
                })),
              });
            }
          }
        } else if (clipboard.type === 'element') {
          const elementData = clipboard.data as PPTSlideElement;
          const currentSlide = presentation.slides[currentSlideIndex];
          if (currentSlide) {
            const { id: _id, ...elementWithoutId } = elementData;
            const newElement = {
              ...elementWithoutId,
              position: elementData.position ? {
                ...elementData.position,
                x: elementData.position.x + 2,
                y: elementData.position.y + 2,
              } : undefined,
            };
            addElement(currentSlide.id, newElement);
          }
        }
      },

      // History (undo/redo)
      pushHistory: (description) => {
        const { presentation, history, historyIndex, maxHistorySize } = get();
        if (!presentation) return;

        // Remove any future history if we're not at the end
        const newHistory = history.slice(0, historyIndex + 1);
        
        // Add new entry
        newHistory.push({
          presentation: JSON.parse(JSON.stringify(presentation)),
          timestamp: Date.now(),
          description,
        });

        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;

        const newIndex = historyIndex - 1;
        const entry = history[newIndex];

        set({
          presentation: JSON.parse(JSON.stringify(entry.presentation)),
          historyIndex: newIndex,
          isDirty: true,
        });
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;

        const newIndex = historyIndex + 1;
        const entry = history[newIndex];

        set({
          presentation: JSON.parse(JSON.stringify(entry.presentation)),
          historyIndex: newIndex,
          isDirty: true,
        });
      },

      canUndo: () => {
        const { historyIndex } = get();
        return historyIndex > 0;
      },

      canRedo: () => {
        const { history, historyIndex } = get();
        return historyIndex < history.length - 1;
      },

      // Editor mode
      setMode: (mode) => {
        set({ mode });
      },

      startEditing: (elementId) => {
        set({
          isEditing: true,
          editingElementId: elementId,
        });
      },

      stopEditing: () => {
        set({
          isEditing: false,
          editingElementId: null,
        });
      },

      // UI state
      setZoom: (zoom) => {
        set({ zoom: Math.min(200, Math.max(25, zoom)) });
      },

      toggleGrid: () => {
        set(state => ({ showGrid: !state.showGrid }));
      },

      toggleGuides: () => {
        set(state => ({ showGuides: !state.showGuides }));
      },

      toggleNotes: () => {
        set(state => ({ showNotes: !state.showNotes }));
      },

      setPanelWidth: (width) => {
        set({ panelWidth: Math.min(400, Math.max(200, width)) });
      },

      // AI generation
      setGenerating: (isGenerating, slideId = null) => {
        set({
          isGenerating,
          generatingSlideId: slideId,
        });
      },

      regenerateSlide: async (_slideId) => {
        // This will be implemented with AI integration
        // For now, it's a placeholder
        set({ isGenerating: true, generatingSlideId: _slideId });
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        set({ isGenerating: false, generatingSlideId: null });
      },

      // Slideshow settings
      updateSlideshowSettings: (settings) => {
        const { slideshowSettings } = get();
        set({
          slideshowSettings: {
            ...slideshowSettings,
            ...settings,
          },
        });
      },

      resetSlideshowSettings: () => {
        set({ slideshowSettings: DEFAULT_SLIDESHOW_SETTINGS });
      },

      // Utilities
      getCurrentSlide: () => {
        const { presentation, currentSlideIndex } = get();
        return presentation?.slides[currentSlideIndex] || null;
      },

      getSlideById: (slideId) => {
        const { presentation } = get();
        return presentation?.slides.find(s => s.id === slideId) || null;
      },

      getElementById: (slideId, elementId) => {
        const slide = get().getSlideById(slideId);
        return slide?.elements.find(el => el.id === elementId) || null;
      },

      reorderSlides: (slideIds) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;

        const slideMap = new Map(presentation.slides.map(s => [s.id, s]));
        const newSlides = slideIds
          .map(id => slideMap.get(id))
          .filter((s): s is PPTSlide => s !== undefined);

        // Update order for all slides
        newSlides.forEach((slide, i) => {
          slide.order = i;
        });

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            updatedAt: new Date(),
          },
          isDirty: true,
        });
        
        pushHistory('Reorder slides');
      },
    }),
    {
      name: 'cognia-ppt-editor',
      partialize: (state) => ({
        showGrid: state.showGrid,
        showGuides: state.showGuides,
        showNotes: state.showNotes,
        zoom: state.zoom,
        panelWidth: state.panelWidth,
        slideshowSettings: state.slideshowSettings,
      }),
    }
  )
);

// Selectors
export const selectCurrentSlide = (state: PPTEditorState) =>
  state.presentation?.slides[state.currentSlideIndex] || null;

export const selectSelectedElements = (state: PPTEditorState) => {
  const slide = state.presentation?.slides.find(s => s.id === state.selection.slideId);
  if (!slide) return [];
  return slide.elements.filter(el => state.selection.elementIds.includes(el.id));
};

export const selectSlideCount = (state: PPTEditorState) =>
  state.presentation?.slides.length || 0;

export const selectIsDirty = (state: PPTEditorState) => state.isDirty;

export default usePPTEditorStore;
