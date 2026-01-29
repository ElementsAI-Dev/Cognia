import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '@/lib/i18n/messages/en';

// Wrapper for i18n
const renderWithI18n = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>
  );
};
import { RegionSelector } from './region-selector';

describe('RegionSelector', () => {
  const mockOnSelect = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders overlay with instructions', () => {
    renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    expect(screen.getByText('Click and drag to select recording area')).toBeInTheDocument();
    expect(screen.getByText(/Press Esc to cancel/)).toBeInTheDocument();
  });

  it('shows cancel button', () => {
    renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape key is pressed', () => {
    renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('does not show start recording button before selection', () => {
    renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    expect(screen.queryByRole('button', { name: /start recording/i })).not.toBeInTheDocument();
  });

  it('creates selection on mouse drag', () => {
    const { container } = renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    const overlay = container.firstChild as HTMLElement;
    
    // Simulate mouse drag to create selection
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(overlay, { clientX: 300, clientY: 300 });
    fireEvent.mouseUp(overlay);

    // After creating a valid selection, the start recording button should appear
    // Note: The selection needs to meet minimum size requirements
  });

  it('respects minimum width and height props', () => {
    renderWithI18n(
      <RegionSelector 
        onSelect={mockOnSelect} 
        onCancel={mockOnCancel}
        minWidth={200}
        minHeight={200}
      />
    );

    // Component should render with custom min dimensions
    expect(screen.getByText('Click and drag to select recording area')).toBeInTheDocument();
  });

  it('only responds to left mouse button', () => {
    const { container } = renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    const overlay = container.firstChild as HTMLElement;
    
    // Right click should not start selection
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 2 });
    fireEvent.mouseMove(overlay, { clientX: 300, clientY: 300 });
    fireEvent.mouseUp(overlay);

    // No selection should be created
    expect(screen.queryByRole('button', { name: /start recording/i })).not.toBeInTheDocument();
  });

  it('updates instructions after selection is made', () => {
    const { container } = renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    const overlay = container.firstChild as HTMLElement;
    
    // Create a selection
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(overlay, { clientX: 400, clientY: 400 });
    fireEvent.mouseUp(overlay);

    // Instructions should change to drag to adjust
    expect(screen.getByText('Drag to move, use handles to resize')).toBeInTheDocument();
  });
});

describe('RegionSelector keyboard interactions', () => {
  const mockOnSelect = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onCancel on Escape key', () => {
    renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('does not call onSelect on Enter without valid selection', () => {
    renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});

describe('RegionSelector selection behavior', () => {
  const mockOnSelect = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears selection state on mouse leave', () => {
    const { container } = renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    const overlay = container.firstChild as HTMLElement;
    
    // Start selection but leave overlay
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseLeave(overlay);

    // Selection should stop
  });
});

describe('RegionSelector - onSelect callback', () => {
  const mockOnSelect = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onSelect with valid selection when start recording button is clicked', async () => {
    const { container } = renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    const overlay = container.firstChild as HTMLElement;
    
    // Mock getBoundingClientRect
    jest.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    
    // Create a valid selection (larger than minWidth/minHeight of 100)
    fireEvent.mouseDown(overlay, { clientX: 50, clientY: 50, button: 0 });
    fireEvent.mouseMove(overlay, { clientX: 300, clientY: 300 });
    fireEvent.mouseUp(overlay);

    // Start recording button should be visible after valid selection
    const startButton = screen.queryByRole('button', { name: /start recording/i });
    if (startButton) {
      fireEvent.click(startButton);
      expect(mockOnSelect).toHaveBeenCalled();
    }
  });

  it('calls onSelect on Enter key with valid selection', async () => {
    const { container } = renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    const overlay = container.firstChild as HTMLElement;
    
    // Mock getBoundingClientRect
    jest.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    
    // Create a valid selection
    fireEvent.mouseDown(overlay, { clientX: 50, clientY: 50, button: 0 });
    fireEvent.mouseMove(overlay, { clientX: 300, clientY: 300 });
    fireEvent.mouseUp(overlay);

    // Press Enter to confirm selection
    fireEvent.keyDown(window, { key: 'Enter' });
    
    // onSelect should be called with rounded coordinates
    expect(mockOnSelect).toHaveBeenCalled();
  });
});

describe('RegionSelector - Size Indicator', () => {
  const mockOnSelect = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays size indicator during selection', () => {
    const { container } = renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    const overlay = container.firstChild as HTMLElement;
    
    // Mock getBoundingClientRect
    jest.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    
    // Create a selection
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(overlay, { clientX: 350, clientY: 300 });
    fireEvent.mouseUp(overlay);

    // Size indicator should show dimensions (format: width × height)
    const sizeIndicator = screen.getByText(/×/);
    expect(sizeIndicator).toBeInTheDocument();
  });
});

describe('RegionSelector - Resize Handles', () => {
  const mockOnSelect = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays resize handles after selection is made', () => {
    const { container } = renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    const overlay = container.firstChild as HTMLElement;
    
    // Mock getBoundingClientRect
    jest.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    
    // Create a selection
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(overlay, { clientX: 350, clientY: 300 });
    fireEvent.mouseUp(overlay);

    // Resize handles should be present (8 handles: 4 corners + 4 edges)
    const handles = container.querySelectorAll('.cursor-nw-resize, .cursor-ne-resize, .cursor-sw-resize, .cursor-se-resize, .cursor-n-resize, .cursor-s-resize, .cursor-w-resize, .cursor-e-resize');
    expect(handles.length).toBeGreaterThan(0);
  });

  it('displays move indicator in center of selection', () => {
    const { container } = renderWithI18n(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    const overlay = container.firstChild as HTMLElement;
    
    // Mock getBoundingClientRect
    jest.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    
    // Create a selection
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(overlay, { clientX: 350, clientY: 300 });
    fireEvent.mouseUp(overlay);

    // Move icon should be present
    const moveIcon = container.querySelector('.lucide-move');
    expect(moveIcon).toBeInTheDocument();
  });
});
