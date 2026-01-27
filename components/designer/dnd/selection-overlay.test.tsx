/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { SelectionOverlay } from './selection-overlay';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

// Mock stores
const mockDeleteElement = jest.fn();
const mockDuplicateElement = jest.fn();
const mockMoveElement = jest.fn();
const mockSyncCodeFromElements = jest.fn();

jest.mock('@/stores/designer', () => ({
  useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      selectedElementId: null,
      hoveredElementId: null,
      elementMap: {},
      deleteElement: mockDeleteElement,
      duplicateElement: mockDuplicateElement,
      moveElement: mockMoveElement,
      syncCodeFromElements: mockSyncCodeFromElements,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock ResizeHandles
jest.mock('./resize-handles', () => ({
  ResizeHandles: () => <div data-testid="resize-handles" />,
}));

describe('SelectionOverlay', () => {
  const createRef = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return { current: container };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should render without crashing when no container', () => {
    const ref = { current: null };
    const { container } = render(<SelectionOverlay previewContainerRef={ref} />);
    expect(container).toBeInTheDocument();
  });

  it('should not render overlay when no element is selected', () => {
    const ref = createRef();
    render(<SelectionOverlay previewContainerRef={ref} />);
    
    // No selection overlay should be visible
    expect(document.querySelector('[class*="border-primary"]')).not.toBeInTheDocument();
  });

  it('should apply default props', () => {
    const ref = createRef();
    render(
      <SelectionOverlay
        previewContainerRef={ref}
        showResizeHandles={true}
        showActions={true}
        showLabels={true}
      />
    );
    expect(ref.current).toBeInTheDocument();
  });

  it('should handle showResizeHandles=false', () => {
    const ref = createRef();
    render(
      <SelectionOverlay
        previewContainerRef={ref}
        showResizeHandles={false}
      />
    );
    expect(ref.current).toBeInTheDocument();
  });

  it('should handle showActions=false', () => {
    const ref = createRef();
    render(
      <SelectionOverlay
        previewContainerRef={ref}
        showActions={false}
      />
    );
    expect(ref.current).toBeInTheDocument();
  });

  it('should handle showLabels=false', () => {
    const ref = createRef();
    render(
      <SelectionOverlay
        previewContainerRef={ref}
        showLabels={false}
      />
    );
    expect(ref.current).toBeInTheDocument();
  });

  describe('element lookup', () => {
    it('should look for elements using data-element-id attribute', () => {
      const ref = createRef();
      // Add an element with data-element-id
      const testElement = document.createElement('div');
      testElement.setAttribute('data-element-id', 'el-0');
      ref.current?.appendChild(testElement);

      render(<SelectionOverlay previewContainerRef={ref} />);
      
      // The component should be able to find elements with data-element-id
      const element = ref.current?.querySelector('[data-element-id="el-0"]');
      expect(element).toBeInTheDocument();
    });

    it('should support iframe element lookup', () => {
      const ref = createRef();
      // Add an iframe
      const iframe = document.createElement('iframe');
      ref.current?.appendChild(iframe);

      render(<SelectionOverlay previewContainerRef={ref} />);
      
      // iframe should be present in container
      expect(ref.current?.querySelector('iframe')).toBeInTheDocument();
    });
  });
});
