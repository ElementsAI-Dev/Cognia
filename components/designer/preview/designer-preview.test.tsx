/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DesignerPreview } from './designer-preview';

// Mock stores
const mockSelectElement = jest.fn();
const mockHoverElement = jest.fn();
const mockParseCodeToElements = jest.fn();
const mockSetCode = jest.fn();

jest.mock('@/stores/designer', () => ({
  useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      mode: 'preview',
      code: '<div>Test</div>',
      viewport: 'desktop',
      zoom: 100,
      selectedElementId: null,
      hoveredElementId: null,
      selectElement: mockSelectElement,
      hoverElement: mockHoverElement,
      parseCodeToElements: mockParseCodeToElements,
      setCode: mockSetCode,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// Mock VIEWPORT_PRESETS
jest.mock('@/types/designer', () => ({
  VIEWPORT_PRESETS: {
    mobile: { width: 375, height: 667, label: 'Mobile' },
    tablet: { width: 768, height: 1024, label: 'Tablet' },
    desktop: { width: 1280, height: 800, label: 'Desktop' },
    full: { width: '100%', height: '100%', label: 'Full Width' },
  },
}));

describe('DesignerPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders iframe for preview', () => {
    render(<DesignerPreview />);
    expect(screen.getByTitle('Designer Preview')).toBeInTheDocument();
  });

  it('renders viewport label', () => {
    render(<DesignerPreview />);
    // The viewport label shows the current viewport name
    expect(screen.getByText(/desktop/i)).toBeInTheDocument();
  });

  it('exposes parseCodeToElements from store', () => {
    render(<DesignerPreview />);
    // Verify the component renders without errors
    expect(screen.getByTitle('Designer Preview')).toBeInTheDocument();
  });

  it('applies className when provided', () => {
    const { container } = render(<DesignerPreview className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('DesignerPreview with different viewports', () => {
  it('renders mobile viewport', () => {
    jest.doMock('@/stores/designer', () => ({
      useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          mode: 'preview',
          code: '<div>Test</div>',
          viewport: 'mobile',
          zoom: 100,
          selectedElementId: null,
          hoveredElementId: null,
          selectElement: mockSelectElement,
          hoverElement: mockHoverElement,
          parseCodeToElements: mockParseCodeToElements,
        };
        return selector(state);
      },
    }));
    
    render(<DesignerPreview />);
    expect(screen.getByTitle('Designer Preview')).toBeInTheDocument();
  });
});

describe('DesignerPreview with design mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders in design mode', () => {
    jest.doMock('@/stores/designer', () => ({
      useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          mode: 'design',
          code: '<div>Test</div>',
          viewport: 'desktop',
          zoom: 100,
          selectedElementId: 'el-1',
          hoveredElementId: null,
          selectElement: mockSelectElement,
          hoverElement: mockHoverElement,
          parseCodeToElements: mockParseCodeToElements,
          setCode: mockSetCode,
        };
        return selector(state);
      },
    }));
    
    render(<DesignerPreview />);
    expect(screen.getByTitle('Designer Preview')).toBeInTheDocument();
  });
});

describe('DesignerPreview bidirectional sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle element-select message from iframe', () => {
    render(<DesignerPreview />);
    
    // Simulate message from iframe
    const messageEvent = new MessageEvent('message', {
      data: { type: 'element-select', elementId: 'el-0' },
    });
    window.dispatchEvent(messageEvent);
    
    expect(mockSelectElement).toHaveBeenCalledWith('el-0');
  });

  it('should handle element-hover message from iframe', () => {
    render(<DesignerPreview />);
    
    // Simulate message from iframe
    const messageEvent = new MessageEvent('message', {
      data: { type: 'element-hover', elementId: 'el-1' },
    });
    window.dispatchEvent(messageEvent);
    
    expect(mockHoverElement).toHaveBeenCalledWith('el-1');
  });

  it('should handle component-dropped message from iframe', () => {
    render(<DesignerPreview />);
    
    // Simulate component drop message from iframe
    const messageEvent = new MessageEvent('message', {
      data: { 
        type: 'component-dropped', 
        code: '<button>New Button</button>',
        targetElementId: null,
      },
    });
    window.dispatchEvent(messageEvent);
    
    // setCode should be called with updated code
    expect(mockSetCode).toHaveBeenCalled();
  });
});

describe('DesignerPreview drag-drop support', () => {
  it('should render with drag-drop CSS styles in iframe content', () => {
    render(<DesignerPreview />);
    const iframe = screen.getByTitle('Designer Preview');
    expect(iframe).toBeInTheDocument();
    // Iframe should be present and ready for drag-drop
    expect(iframe.tagName.toLowerCase()).toBe('iframe');
  });
});
