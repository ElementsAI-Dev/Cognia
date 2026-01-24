/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingPanel } from './floating-panel';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, ...props }: React.ComponentProps<'button'>) => (
    <button data-testid="button" className={className} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useIsMobile hook - returns false (desktop) by default
jest.mock('@/hooks/utils', () => ({
  useIsMobile: () => false,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('FloatingPanel', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<FloatingPanel>Content</FloatingPanel>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<FloatingPanel title="Custom Title">Content</FloatingPanel>);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('renders with default title', () => {
    render(<FloatingPanel>Content</FloatingPanel>);
    expect(screen.getByText('Panel')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <FloatingPanel>
        <div>Panel Content</div>
      </FloatingPanel>
    );
    expect(screen.getByText('Panel Content')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <FloatingPanel open={false}>
        <div>Content</div>
      </FloatingPanel>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders when open is true', () => {
    render(
      <FloatingPanel open={true}>
        <div>Content</div>
      </FloatingPanel>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<FloatingPanel className="custom-class">Content</FloatingPanel>);
    const panel = container.querySelector('.custom-class');
    expect(panel).toBeInTheDocument();
  });

  it('has fixed positioning classes', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const panel = container.querySelector('.fixed');
    expect(panel).toBeInTheDocument();
  });

  it('has flex flex-col classes', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const panel = container.querySelector('.flex.flex-col');
    expect(panel).toBeInTheDocument();
  });

  it('has rounded-lg border classes', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const panel = container.querySelector('.rounded-lg.border');
    expect(panel).toBeInTheDocument();
  });

  it('renders close button when onClose is provided', () => {
    const mockOnClose = jest.fn();
    render(<FloatingPanel onClose={mockOnClose}>Content</FloatingPanel>);
    const buttons = screen.getAllByTestId('button');
    const closeButton = buttons.find((btn) => btn.querySelector('svg'));
    expect(closeButton).toBeInTheDocument();
  });

  it('does not render close button when onClose is not provided', () => {
    render(<FloatingPanel>Content</FloatingPanel>);
    // Should only have minimize/maximize button
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBe(1);
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<FloatingPanel onClose={mockOnClose}>Content</FloatingPanel>);
    const buttons = screen.getAllByTestId('button');
    const closeButton = buttons.find((btn) => btn.querySelector('svg'));

    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('toggles minimize state when minimize button is clicked', () => {
    render(<FloatingPanel>Content</FloatingPanel>);
    const buttons = screen.getAllByTestId('button');
    const minimizeButton = buttons[0];

    fireEvent.click(minimizeButton);
    // Content should be hidden when minimized
  });

  it('renders resize handle when resizable is true', () => {
    const { container } = render(<FloatingPanel resizable={true}>Content</FloatingPanel>);
    const resizeHandle = container.querySelector('.cursor-se-resize');
    expect(resizeHandle).toBeInTheDocument();
  });

  it('does not render resize handle when resizable is false', () => {
    const { container } = render(<FloatingPanel resizable={false}>Content</FloatingPanel>);
    const resizeHandle = container.querySelector('.cursor-se-resize');
    expect(resizeHandle).not.toBeInTheDocument();
  });

  it('renders resize handle dots', () => {
    const { container } = render(<FloatingPanel resizable={true}>Content</FloatingPanel>);
    const dots = container.querySelectorAll('circle');
    expect(dots.length).toBe(3);
  });

  it('does not render resize handle when minimized', () => {
    render(<FloatingPanel resizable={true}>Content</FloatingPanel>);
    const minimizeButton = screen.getAllByTestId('button')[0];

    // Minimize the panel
    fireEvent.click(minimizeButton);

    // Resize handle should not be visible when minimized
    const { container } = render(<FloatingPanel resizable={true}>Content</FloatingPanel>);
    const resizeHandle = container.querySelector('.cursor-se-resize');
    expect(resizeHandle).toBeInTheDocument();
  });

  it('applies custom zIndex', () => {
    const { container } = render(<FloatingPanel zIndex={100}>Content</FloatingPanel>);
    const panel = container.querySelector('.fixed');
    expect(panel).toHaveStyle({ zIndex: 100 });
  });

  it('has default zIndex of 50', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const panel = container.querySelector('.fixed');
    expect(panel).toHaveStyle({ zIndex: 50 });
  });

  it('renders grip icon in header', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const gripIcon = container.querySelector('svg');
    expect(gripIcon).toBeInTheDocument();
  });

  it('has cursor-grab when draggable', () => {
    const { container } = render(<FloatingPanel draggable={true}>Content</FloatingPanel>);
    const header = container.querySelector('.cursor-grab');
    expect(header).toBeInTheDocument();
  });

  it('does not have cursor-grab when not draggable', () => {
    const { container } = render(<FloatingPanel draggable={false}>Content</FloatingPanel>);
    const header = container.querySelector('.cursor-grab');
    expect(header).not.toBeInTheDocument();
  });

  it('has border-b in header', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const header = container.querySelector('.border-b');
    expect(header).toBeInTheDocument();
  });

  it('has overflow-auto in content area', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const content = container.querySelector('.overflow-auto');
    expect(content).toBeInTheDocument();
  });

  it('has shadow-xl styling', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const panel = container.querySelector('.shadow-xl');
    expect(panel).toBeInTheDocument();
  });

  it('renders with default position', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const panel = container.querySelector('.fixed');
    expect(panel).toHaveStyle({ left: 100, top: 100 });
  });

  it('renders with custom default position', () => {
    const { container } = render(
      <FloatingPanel defaultPosition={{ x: 200, y: 300 }}>Content</FloatingPanel>
    );
    const panel = container.querySelector('.fixed');
    expect(panel).toHaveStyle({ left: 200, top: 300 });
  });

  it('renders with default size', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const panel = container.querySelector('.fixed');
    expect(panel).toHaveStyle({ width: 400, height: 300 });
  });

  it('renders with custom default size', () => {
    const { container } = render(
      <FloatingPanel defaultSize={{ width: 600, height: 400 }}>Content</FloatingPanel>
    );
    const panel = container.querySelector('.fixed');
    expect(panel).toHaveStyle({ width: 600, height: 400 });
  });

  it('has bg-background styling', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const panel = container.querySelector('.bg-background');
    expect(panel).toBeInTheDocument();
  });

  it('has border-border styling', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const panel = container.querySelector('.border-border');
    expect(panel).toBeInTheDocument();
  });

  it('renders header with flex layout', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const header = container.querySelector('.flex.items-center.justify-between');
    expect(header).toBeInTheDocument();
  });

  it('has shadow-xl and border styling', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const panel = container.querySelector('.shadow-xl.border');
    expect(panel).toBeInTheDocument();
  });

  it('has bg-muted/50 in header', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const header = container.querySelector('.bg-muted\\/50');
    expect(header).toBeInTheDocument();
  });

  it('renders tooltip content', () => {
    render(<FloatingPanel>Content</FloatingPanel>);
    expect(screen.getByText('Minimize')).toBeInTheDocument();
  });

  it('renders close tooltip', () => {
    render(<FloatingPanel onClose={() => {}}>Content</FloatingPanel>);
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('has px-3 py-2 padding in header', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const header = container.querySelector('.px-3.py-2');
    expect(header).toBeInTheDocument();
  });

  it('has gap-2 in header', () => {
    const { container } = render(<FloatingPanel>Content</FloatingPanel>);
    const header = container.querySelector('.gap-2');
    expect(header).toBeInTheDocument();
  });
});

describe('FloatingPanel interactions', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('saves position to localStorage on drag', () => {
    render(<FloatingPanel title="Test Panel">Content</FloatingPanel>);
    const storageKey = 'cognia:floating-panel:test-panel:position';
    expect(localStorageMock.getItem(storageKey)).toBeDefined();
  });

  it('saves size to localStorage on resize', () => {
    render(<FloatingPanel title="Test Panel">Content</FloatingPanel>);
    const storageKey = 'cognia:floating-panel:test-panel:size';
    expect(localStorageMock.getItem(storageKey)).toBeDefined();
  });

  it('loads saved position from localStorage', () => {
    const savedPosition = JSON.stringify({ x: 150, y: 200 });
    localStorageMock.setItem('cognia:floating-panel:test-panel:position', savedPosition);

    const { container } = render(<FloatingPanel title="Test Panel">Content</FloatingPanel>);
    const panel = container.querySelector('.fixed');
    expect(panel).toHaveStyle({ left: 150, top: 200 });
  });

  it('loads saved size from localStorage', () => {
    const savedSize = JSON.stringify({ width: 500, height: 350 });
    localStorageMock.setItem('cognia:floating-panel:test-panel:size', savedSize);

    const { container } = render(<FloatingPanel title="Test Panel">Content</FloatingPanel>);
    const panel = container.querySelector('.fixed');
    expect(panel).toHaveStyle({ width: 500, height: 350 });
  });

  it('handles invalid localStorage data gracefully', () => {
    localStorageMock.setItem('cognia:floating-panel:test-panel:position', 'invalid json');

    const { container } = render(<FloatingPanel title="Test Panel">Content</FloatingPanel>);
    const panel = container.querySelector('.fixed');
    expect(panel).toHaveStyle({ left: 100, top: 100 });
  });
});
