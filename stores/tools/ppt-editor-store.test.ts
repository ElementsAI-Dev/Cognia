/**
 * Tests for PPT Editor Store
 */

import { act } from '@testing-library/react';
import {
  usePPTEditorStore,
  selectCurrentSlide,
  selectSelectedElements,
  selectSlideCount,
  selectIsDirty,
} from './ppt-editor-store';
import type { PPTPresentation } from '@/types/workflow';

// Mock workflow types
jest.mock('@/types/workflow', () => ({
  createEmptySlide: jest.fn((layout: string, index: number) => ({
    id: `slide-${index}`,
    order: index,
    layout,
    title: '',
    elements: [],
    backgroundColor: '#ffffff',
  })),
  getDefaultPPTTheme: jest.fn((id: string) => ({
    id,
    name: 'Default',
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    fontFamily: 'Inter',
  })),
}));

const createMockPresentation = (): PPTPresentation => ({
  id: 'pres-1',
  title: 'Test Presentation',
  description: '',
  aspectRatio: '16:9',
  slides: [
    {
      id: 'slide-1',
      order: 0,
      layout: 'title-content',
      title: 'Slide 1',
      elements: [],
      backgroundColor: '#ffffff',
    },
    {
      id: 'slide-2',
      order: 1,
      layout: 'title-content',
      title: 'Slide 2',
      elements: [
        {
          id: 'elem-1',
          type: 'text',
          content: 'Hello',
          position: { x: 0, y: 0, width: 100, height: 50 },
        },
      ],
      backgroundColor: '#ffffff',
    },
  ],
  totalSlides: 2,
  theme: {
    id: 'default',
    name: 'Default',
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'Fira Code',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('usePPTEditorStore', () => {
  beforeEach(() => {
    act(() => {
      usePPTEditorStore.getState().clearPresentation();
    });
  });

  describe('presentation management', () => {
    it('should load a presentation', () => {
      const presentation = createMockPresentation();
      act(() => {
        usePPTEditorStore.getState().loadPresentation(presentation);
      });
      expect(usePPTEditorStore.getState().presentation).toBeDefined();
      expect(usePPTEditorStore.getState().presentation?.id).toBe('pres-1');
    });

    it('should save a presentation', () => {
      const presentation = createMockPresentation();
      act(() => {
        usePPTEditorStore.getState().loadPresentation(presentation);
      });
      const saved = usePPTEditorStore.getState().savePresentation();
      expect(saved).toBeDefined();
      expect(usePPTEditorStore.getState().isDirty).toBe(false);
    });

    it('should clear a presentation', () => {
      const presentation = createMockPresentation();
      act(() => {
        usePPTEditorStore.getState().loadPresentation(presentation);
        usePPTEditorStore.getState().clearPresentation();
      });
      expect(usePPTEditorStore.getState().presentation).toBeNull();
    });
  });

  describe('slide operations', () => {
    beforeEach(() => {
      act(() => {
        usePPTEditorStore.getState().loadPresentation(createMockPresentation());
      });
    });

    it('should add a slide', () => {
      act(() => {
        usePPTEditorStore.getState().addSlide();
      });
      expect(usePPTEditorStore.getState().presentation?.slides.length).toBe(3);
    });

    it('should duplicate a slide', () => {
      act(() => {
        usePPTEditorStore.getState().duplicateSlide('slide-1');
      });
      expect(usePPTEditorStore.getState().presentation?.slides.length).toBe(3);
    });

    it('should delete a slide', () => {
      act(() => {
        usePPTEditorStore.getState().deleteSlide('slide-1');
      });
      expect(usePPTEditorStore.getState().presentation?.slides.length).toBe(1);
    });

    it('should not delete the last slide', () => {
      act(() => {
        usePPTEditorStore.getState().deleteSlide('slide-1');
        usePPTEditorStore.getState().deleteSlide('slide-2');
      });
      expect(usePPTEditorStore.getState().presentation?.slides.length).toBe(1);
    });

    it('should move a slide', () => {
      act(() => {
        usePPTEditorStore.getState().moveSlide(0, 1);
      });
      expect(usePPTEditorStore.getState().presentation?.slides[0].id).toBe('slide-2');
    });

    it('should update a slide', () => {
      act(() => {
        usePPTEditorStore.getState().updateSlide('slide-1', { title: 'Updated Title' });
      });
      expect(usePPTEditorStore.getState().presentation?.slides[0].title).toBe('Updated Title');
    });
  });

  describe('element operations', () => {
    beforeEach(() => {
      act(() => {
        usePPTEditorStore.getState().loadPresentation(createMockPresentation());
      });
    });

    it('should add an element', () => {
      act(() => {
        usePPTEditorStore.getState().addElement('slide-1', {
          type: 'text',
          content: 'New element',
          position: { x: 10, y: 10, width: 100, height: 50 },
        });
      });
      expect(usePPTEditorStore.getState().presentation?.slides[0].elements.length).toBe(1);
    });

    it('should update an element', () => {
      act(() => {
        usePPTEditorStore.getState().updateElement('slide-2', 'elem-1', { content: 'Updated' });
      });
      expect(usePPTEditorStore.getState().presentation?.slides[1].elements[0].content).toBe(
        'Updated'
      );
    });

    it('should delete an element', () => {
      act(() => {
        usePPTEditorStore.getState().deleteElement('slide-2', 'elem-1');
      });
      expect(usePPTEditorStore.getState().presentation?.slides[1].elements.length).toBe(0);
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      act(() => {
        usePPTEditorStore.getState().loadPresentation(createMockPresentation());
      });
    });

    it('should set current slide', () => {
      act(() => {
        usePPTEditorStore.getState().setCurrentSlide(1);
      });
      expect(usePPTEditorStore.getState().currentSlideIndex).toBe(1);
    });

    it('should go to next slide', () => {
      act(() => {
        usePPTEditorStore.getState().nextSlide();
      });
      expect(usePPTEditorStore.getState().currentSlideIndex).toBe(1);
    });

    it('should go to previous slide', () => {
      act(() => {
        usePPTEditorStore.getState().setCurrentSlide(1);
        usePPTEditorStore.getState().prevSlide();
      });
      expect(usePPTEditorStore.getState().currentSlideIndex).toBe(0);
    });

    it('should go to slide by id', () => {
      act(() => {
        usePPTEditorStore.getState().goToSlide('slide-2');
      });
      expect(usePPTEditorStore.getState().currentSlideIndex).toBe(1);
    });
  });

  describe('selection', () => {
    beforeEach(() => {
      act(() => {
        usePPTEditorStore.getState().loadPresentation(createMockPresentation());
      });
    });

    it('should select a slide', () => {
      act(() => {
        usePPTEditorStore.getState().selectSlide('slide-2');
      });
      expect(usePPTEditorStore.getState().selection.slideId).toBe('slide-2');
    });

    it('should select an element', () => {
      act(() => {
        usePPTEditorStore.getState().selectElement('elem-1');
      });
      expect(usePPTEditorStore.getState().selection.elementIds).toContain('elem-1');
    });

    it('should select multiple elements', () => {
      act(() => {
        usePPTEditorStore.getState().selectElements(['elem-1', 'elem-2']);
      });
      expect(usePPTEditorStore.getState().selection.elementIds).toHaveLength(2);
    });

    it('should add to selection', () => {
      act(() => {
        usePPTEditorStore.getState().selectElement('elem-1');
        usePPTEditorStore.getState().addToSelection('elem-2');
      });
      expect(usePPTEditorStore.getState().selection.elementIds).toHaveLength(2);
    });

    it('should clear selection', () => {
      act(() => {
        usePPTEditorStore.getState().selectElement('elem-1');
        usePPTEditorStore.getState().clearSelection();
      });
      expect(usePPTEditorStore.getState().selection.elementIds).toHaveLength(0);
    });
  });

  describe('history (undo/redo)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      act(() => {
        usePPTEditorStore.getState().loadPresentation(createMockPresentation());
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should track canUndo', () => {
      expect(usePPTEditorStore.getState().canUndo()).toBe(false);
      act(() => {
        usePPTEditorStore.getState().updateSlide('slide-1', { title: 'Changed' });
      });
      // Flush debounced pushHistory
      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(usePPTEditorStore.getState().canUndo()).toBe(true);
    });

    it('should undo changes', () => {
      act(() => {
        usePPTEditorStore.getState().updateSlide('slide-1', { title: 'Changed' });
      });
      act(() => {
        jest.advanceTimersByTime(400);
      });
      act(() => {
        usePPTEditorStore.getState().undo();
      });
      expect(usePPTEditorStore.getState().presentation?.slides[0].title).toBe('Slide 1');
    });

    it('should redo changes', () => {
      act(() => {
        usePPTEditorStore.getState().updateSlide('slide-1', { title: 'Changed' });
      });
      act(() => {
        jest.advanceTimersByTime(400);
      });
      act(() => {
        usePPTEditorStore.getState().undo();
      });
      act(() => {
        usePPTEditorStore.getState().redo();
      });
      expect(usePPTEditorStore.getState().presentation?.slides[0].title).toBe('Changed');
    });
  });

  describe('pushHistory debounce and structuredClone (#2)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      act(() => {
        usePPTEditorStore.getState().loadPresentation(createMockPresentation());
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce rapid pushHistory calls', () => {
      const store = usePPTEditorStore.getState();
      const initialHistoryLen = store.history.length;

      // Rapid pushHistory calls
      act(() => {
        store.pushHistory('drag');
        store.pushHistory('drag');
        store.pushHistory('drag');
      });

      // Before debounce timer fires, history should not have changed
      expect(usePPTEditorStore.getState().history.length).toBe(initialHistoryLen);

      // After timer fires
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Only one entry should be added (debounced)
      expect(usePPTEditorStore.getState().history.length).toBe(initialHistoryLen + 1);
    });

    it('should merge entries with same description within 1 second', () => {
      const store = usePPTEditorStore.getState();
      const initialHistoryLen = store.history.length;

      // First push
      act(() => {
        store.pushHistory('resize element');
      });
      act(() => {
        jest.advanceTimersByTime(400);
      });

      const afterFirst = usePPTEditorStore.getState().history.length;
      expect(afterFirst).toBe(initialHistoryLen + 1);

      // Second push with same description within 1 second
      act(() => {
        usePPTEditorStore.getState().pushHistory('resize element');
      });
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Should merge (replace) the previous entry, not add new one
      expect(usePPTEditorStore.getState().history.length).toBe(afterFirst);
    });

    it('should create separate entries for different descriptions', () => {
      const store = usePPTEditorStore.getState();
      const initialHistoryLen = store.history.length;

      act(() => {
        store.pushHistory('move element');
      });
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Wait more than 1 second to avoid merge
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      act(() => {
        usePPTEditorStore.getState().pushHistory('resize element');
      });
      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(usePPTEditorStore.getState().history.length).toBe(initialHistoryLen + 2);
    });

    it('should use deep clone (structuredClone) for history entries', () => {
      const store = usePPTEditorStore.getState();

      // Make a change
      act(() => {
        store.updateSlide('slide-1', { title: 'Modified' });
      });
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Modify the current presentation further
      act(() => {
        usePPTEditorStore.getState().updateSlide('slide-1', { title: 'Further Modified' });
      });

      // The history entry should still have the old value (deep clone)
      const history = usePPTEditorStore.getState().history;
      const lastEntry = history[history.length - 1];
      expect(lastEntry.presentation.slides[0].title).toBe('Modified');
    });

    it('should flush pending debounce on undo', () => {
      act(() => {
        usePPTEditorStore.getState().updateSlide('slide-1', { title: 'Changed' });
      });

      // Undo should still work even with pending debounce
      act(() => {
        jest.advanceTimersByTime(400);
      });
      act(() => {
        usePPTEditorStore.getState().undo();
      });

      expect(usePPTEditorStore.getState().presentation?.slides[0].title).toBe('Slide 1');
    });
  });

  describe('editor mode', () => {
    it('should set mode', () => {
      act(() => {
        usePPTEditorStore.getState().setMode('preview');
      });
      expect(usePPTEditorStore.getState().mode).toBe('preview');
    });

    it('should start editing', () => {
      act(() => {
        usePPTEditorStore.getState().startEditing('elem-1');
      });
      expect(usePPTEditorStore.getState().isEditing).toBe(true);
      expect(usePPTEditorStore.getState().editingElementId).toBe('elem-1');
    });

    it('should stop editing', () => {
      act(() => {
        usePPTEditorStore.getState().startEditing('elem-1');
        usePPTEditorStore.getState().stopEditing();
      });
      expect(usePPTEditorStore.getState().isEditing).toBe(false);
    });
  });

  describe('UI state', () => {
    it('should set zoom', () => {
      act(() => {
        usePPTEditorStore.getState().setZoom(150);
      });
      expect(usePPTEditorStore.getState().zoom).toBe(150);
    });

    it('should clamp zoom values', () => {
      act(() => {
        usePPTEditorStore.getState().setZoom(300);
      });
      expect(usePPTEditorStore.getState().zoom).toBe(200);

      act(() => {
        usePPTEditorStore.getState().setZoom(10);
      });
      expect(usePPTEditorStore.getState().zoom).toBe(25);
    });

    it('should toggle grid', () => {
      const initial = usePPTEditorStore.getState().showGrid;
      act(() => {
        usePPTEditorStore.getState().toggleGrid();
      });
      expect(usePPTEditorStore.getState().showGrid).toBe(!initial);
    });

    it('should toggle guides', () => {
      const initial = usePPTEditorStore.getState().showGuides;
      act(() => {
        usePPTEditorStore.getState().toggleGuides();
      });
      expect(usePPTEditorStore.getState().showGuides).toBe(!initial);
    });

    it('should toggle notes', () => {
      const initial = usePPTEditorStore.getState().showNotes;
      act(() => {
        usePPTEditorStore.getState().toggleNotes();
      });
      expect(usePPTEditorStore.getState().showNotes).toBe(!initial);
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      act(() => {
        usePPTEditorStore.getState().loadPresentation(createMockPresentation());
      });
    });

    it('should select current slide', () => {
      const slide = selectCurrentSlide(usePPTEditorStore.getState());
      expect(slide?.id).toBe('slide-1');
    });

    it('should select slide count', () => {
      expect(selectSlideCount(usePPTEditorStore.getState())).toBe(2);
    });

    it('should select isDirty', () => {
      expect(selectIsDirty(usePPTEditorStore.getState())).toBe(false);
    });

    it('should select selected elements', () => {
      act(() => {
        usePPTEditorStore.getState().selectSlide('slide-2');
        usePPTEditorStore.getState().selectElement('elem-1');
      });
      const elements = selectSelectedElements(usePPTEditorStore.getState());
      expect(elements).toHaveLength(1);
    });
  });
});
