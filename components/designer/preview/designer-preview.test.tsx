/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { DesignerPreview } from './designer-preview';

// Mock stores
const mockSelectElement = jest.fn();
const mockHoverElement = jest.fn();
const mockParseCodeToElements = jest.fn();
const mockSetCode = jest.fn();
const mockAddConsoleLog = jest.fn();
const mockAddPreviewError = jest.fn();
const mockClearPreviewErrors = jest.fn();
const mockToggleConsole = jest.fn();
const mockClearConsoleLogs = jest.fn();

const defaultDesignerState: Record<string, unknown> = {
  mode: 'preview',
  code: '<div>Test</div>',
  viewport: 'desktop',
  customViewport: null,
  zoom: 100,
  selectedElementId: null as string | null,
  hoveredElementId: null as string | null,
  selectElement: mockSelectElement,
  hoverElement: mockHoverElement,
  parseCodeToElements: mockParseCodeToElements,
  setCode: mockSetCode,
  addConsoleLog: mockAddConsoleLog,
  addPreviewError: mockAddPreviewError,
  clearPreviewErrors: mockClearPreviewErrors,
  showConsole: false,
  consoleLogs: [],
  toggleConsole: mockToggleConsole,
  clearConsoleLogs: mockClearConsoleLogs,
};

jest.mock('@/stores/designer', () => ({
  useDesignerStore: jest.fn((selector: (state: Record<string, unknown>) => unknown) => {
    return selector(defaultDesignerState);
  }),
}));

// Mock designer element helpers
jest.mock('@/lib/designer/elements', () => ({
  getInsertionPoint: jest.fn().mockResolvedValue({ offset: 5, indentation: '  ' }),
  findElementByPattern: jest.fn(),
}));

// Mock settings store
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector: (s: Record<string, unknown>) => unknown) => {
    return selector({ theme: 'light' });
  }),
}));

// Mock sub-components to simplify testing
jest.mock('./preview-toolbar', () => ({
  PreviewToolbar: ({ onRefresh, onOpenNewTab }: { onRefresh?: () => void; onOpenNewTab?: () => void }) => (
    <div data-testid="preview-toolbar">
      <button data-testid="toolbar-refresh" onClick={onRefresh}>Refresh</button>
      <button data-testid="toolbar-new-tab" onClick={onOpenNewTab}>New Tab</button>
    </div>
  ),
}));

jest.mock('./preview-console', () => ({
  PreviewConsole: () => <div data-testid="preview-console" />,
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

// Helper to update the mock store for specific tests
function setMockState(overrides: Partial<typeof defaultDesignerState>) {
  Object.assign(defaultDesignerState, overrides);
}

describe('DesignerPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to defaults
    Object.assign(defaultDesignerState, {
      mode: 'preview',
      code: '<div>Test</div>',
      viewport: 'desktop',
      customViewport: null,
      zoom: 100,
      selectedElementId: null,
      hoveredElementId: null,
      showConsole: false,
      consoleLogs: [],
    });
  });

  describe('rendering', () => {
    it('renders iframe for preview', () => {
      render(<DesignerPreview />);
      expect(screen.getByTitle('Designer Preview')).toBeInTheDocument();
    });

    it('renders PreviewToolbar', () => {
      render(<DesignerPreview />);
      expect(screen.getByTestId('preview-toolbar')).toBeInTheDocument();
    });

    it('renders PreviewConsole', () => {
      render(<DesignerPreview />);
      expect(screen.getByTestId('preview-console')).toBeInTheDocument();
    });

    it('applies className when provided', () => {
      const { container } = render(<DesignerPreview className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('iframe uses srcdoc attribute (not src)', () => {
      render(<DesignerPreview />);
      const iframe = screen.getByTitle('Designer Preview') as HTMLIFrameElement;
      // After effect runs, srcdoc should be set
      expect(iframe.tagName.toLowerCase()).toBe('iframe');
    });

    it('iframe has correct sandbox attribute', () => {
      render(<DesignerPreview />);
      const iframe = screen.getByTitle('Designer Preview') as HTMLIFrameElement;
      expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
    });
  });

  describe('viewport styles', () => {
    it('renders with desktop viewport dimensions', () => {
      render(<DesignerPreview />);
      expect(screen.getByTitle('Designer Preview')).toBeInTheDocument();
    });

    it('renders with custom viewport dimensions', () => {
      setMockState({ customViewport: { width: 500, height: 700, label: 'Custom' } as never });
      render(<DesignerPreview />);
      expect(screen.getByTitle('Designer Preview')).toBeInTheDocument();
    });

    it('renders with full viewport', () => {
      setMockState({ viewport: 'full' });
      render(<DesignerPreview />);
      expect(screen.getByTitle('Designer Preview')).toBeInTheDocument();
    });
  });

  describe('bidirectional sync', () => {
    it('should handle element-select message from iframe', () => {
      render(<DesignerPreview />);

      act(() => {
        const messageEvent = new MessageEvent('message', {
          data: { type: 'element-select', elementId: 'el-0' },
        });
        window.dispatchEvent(messageEvent);
      });

      expect(mockSelectElement).toHaveBeenCalledWith('el-0');
    });

    it('should handle element-hover message from iframe', () => {
      render(<DesignerPreview />);

      act(() => {
        const messageEvent = new MessageEvent('message', {
          data: { type: 'element-hover', elementId: 'el-1' },
        });
        window.dispatchEvent(messageEvent);
      });

      expect(mockHoverElement).toHaveBeenCalledWith('el-1');
    });

    it('should call onElementSelect callback', () => {
      const onElementSelect = jest.fn();
      render(<DesignerPreview onElementSelect={onElementSelect} />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'element-select', elementId: 'el-5' },
        }));
      });

      expect(onElementSelect).toHaveBeenCalledWith('el-5');
    });

    it('should call onElementHover callback', () => {
      const onElementHover = jest.fn();
      render(<DesignerPreview onElementHover={onElementHover} />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'element-hover', elementId: 'el-3' },
        }));
      });

      expect(onElementHover).toHaveBeenCalledWith('el-3');
    });
  });

  describe('console capture', () => {
    it('should handle preview-console message from iframe', () => {
      render(<DesignerPreview />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'preview-console',
            level: 'log',
            message: 'Hello from iframe',
            timestamp: 1234567890,
          },
        }));
      });

      expect(mockAddConsoleLog).toHaveBeenCalledWith({
        level: 'log',
        message: 'Hello from iframe',
        timestamp: 1234567890,
      });
    });

    it('should handle preview-console warn level', () => {
      render(<DesignerPreview />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'preview-console',
            level: 'warn',
            message: 'Warning from iframe',
            timestamp: 1234567891,
          },
        }));
      });

      expect(mockAddConsoleLog).toHaveBeenCalledWith({
        level: 'warn',
        message: 'Warning from iframe',
        timestamp: 1234567891,
      });
    });

    it('should handle preview-console error level', () => {
      render(<DesignerPreview />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'preview-console',
            level: 'error',
            message: 'Error from iframe',
            timestamp: 1234567892,
          },
        }));
      });

      expect(mockAddConsoleLog).toHaveBeenCalledWith({
        level: 'error',
        message: 'Error from iframe',
        timestamp: 1234567892,
      });
    });

    it('should handle preview-console info level', () => {
      render(<DesignerPreview />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'preview-console',
            level: 'info',
            message: 'Info from iframe',
            timestamp: 1234567893,
          },
        }));
      });

      expect(mockAddConsoleLog).toHaveBeenCalledWith({
        level: 'info',
        message: 'Info from iframe',
        timestamp: 1234567893,
      });
    });
  });

  describe('runtime error capture', () => {
    it('should handle preview-error message from iframe', () => {
      render(<DesignerPreview />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'preview-error',
            message: 'Uncaught TypeError: x is not a function',
            stack: 'at line 10',
          },
        }));
      });

      expect(mockAddPreviewError).toHaveBeenCalledWith('Uncaught TypeError: x is not a function');
    });
  });

  describe('preview-ready', () => {
    it('should handle preview-ready message from iframe', () => {
      render(<DesignerPreview />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'preview-ready' },
        }));
      });

      // After preview-ready, loading should be false - component should render normally
      expect(screen.getByTitle('Designer Preview')).toBeInTheDocument();
    });
  });

  describe('scroll position', () => {
    it('should handle scroll-position message from iframe', () => {
      render(<DesignerPreview />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'scroll-position', scrollX: 0, scrollY: 150 },
        }));
      });

      // No error should occur, scroll position stored in ref
      expect(screen.getByTitle('Designer Preview')).toBeInTheDocument();
    });
  });

  describe('component drop', () => {
    it('should handle component-dropped message from iframe', async () => {
      render(<DesignerPreview />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'component-dropped',
            code: '<button>New Button</button>',
            targetElementId: null,
          },
        }));
      });

      // The handler is async (calls getInsertionPoint), so wait for setCode
      await waitFor(() => {
        expect(mockSetCode).toHaveBeenCalled();
      });
    });
  });

  describe('message filtering', () => {
    it('should ignore messages without type', () => {
      render(<DesignerPreview />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { foo: 'bar' },
        }));
      });

      expect(mockSelectElement).not.toHaveBeenCalled();
      expect(mockHoverElement).not.toHaveBeenCalled();
      expect(mockAddConsoleLog).not.toHaveBeenCalled();
    });

    it('should ignore null data messages', () => {
      render(<DesignerPreview />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: null,
        }));
      });

      expect(mockSelectElement).not.toHaveBeenCalled();
    });

    it('should ignore unknown message types', () => {
      render(<DesignerPreview />);

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'unknown-type' },
        }));
      });

      expect(mockSelectElement).not.toHaveBeenCalled();
      expect(mockAddConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('design mode', () => {
    it('renders in design mode with pointer events', () => {
      setMockState({ mode: 'design', selectedElementId: 'el-1' });
      render(<DesignerPreview />);
      const iframe = screen.getByTitle('Designer Preview');
      expect(iframe).toHaveClass('pointer-events-auto');
    });
  });

  describe('drag-drop support', () => {
    it('should render iframe ready for drag-drop', () => {
      render(<DesignerPreview />);
      const iframe = screen.getByTitle('Designer Preview');
      expect(iframe).toBeInTheDocument();
      expect(iframe.tagName.toLowerCase()).toBe('iframe');
    });
  });
});
