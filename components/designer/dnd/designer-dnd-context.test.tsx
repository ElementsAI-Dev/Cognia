/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  DesignerDndProvider,
  useDesignerDnd,
  useDesignerDndStrict,
} from './designer-dnd-context';

// Mock dnd-kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: jest.fn(),
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-123',
}));

// Mock designer store
const mockInsertElement = jest.fn();
const mockMoveElement = jest.fn();

jest.mock('@/stores/designer', () => ({
  useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      insertElement: mockInsertElement,
      moveElement: mockMoveElement,
      elementTree: null,
      elementMap: {},
    };
    return selector(state);
  },
}));

describe('DesignerDndProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children', () => {
    render(
      <DesignerDndProvider>
        <div>Child content</div>
      </DesignerDndProvider>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should render DndContext wrapper', () => {
    render(
      <DesignerDndProvider>
        <div>Content</div>
      </DesignerDndProvider>
    );
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
  });

  it('should render DragOverlay', () => {
    render(
      <DesignerDndProvider>
        <div>Content</div>
      </DesignerDndProvider>
    );
    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });
});

describe('useDesignerDnd hook', () => {
  it('should return default values when not in provider', () => {
    const { result } = renderHook(() => useDesignerDnd());
    
    expect(result.current.activeItem).toBeNull();
    expect(result.current.overId).toBeNull();
    expect(result.current.isDragging).toBe(false);
  });

  it('should return context values when in provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DesignerDndProvider>{children}</DesignerDndProvider>
    );
    
    const { result } = renderHook(() => useDesignerDnd(), { wrapper });
    
    expect(result.current.activeItem).toBeNull();
    expect(result.current.overId).toBeNull();
    expect(result.current.isDragging).toBe(false);
  });
});

describe('useDesignerDndStrict hook', () => {
  it('should throw error when not in provider', () => {
    // Suppress console.error for this test
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      renderHook(() => useDesignerDndStrict());
    }).toThrow('useDesignerDndStrict must be used within DesignerDndProvider');
    
    console.error = originalConsoleError;
  });

  it('should return context values when in provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DesignerDndProvider>{children}</DesignerDndProvider>
    );
    
    const { result } = renderHook(() => useDesignerDndStrict(), { wrapper });
    
    expect(result.current.activeItem).toBeNull();
    expect(result.current.overId).toBeNull();
    expect(result.current.isDragging).toBe(false);
  });
});
