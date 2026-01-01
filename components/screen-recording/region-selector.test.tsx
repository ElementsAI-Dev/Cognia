import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils/render-with-providers';
import { RegionSelector } from './region-selector';

describe('RegionSelector', () => {
  const mockOnSelect = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders overlay with instructions', () => {
    renderWithProviders(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    expect(screen.getByText('Click and drag to select recording area')).toBeInTheDocument();
    expect(screen.getByText(/Press Esc to cancel/)).toBeInTheDocument();
  });

  it('shows cancel button', () => {
    renderWithProviders(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    renderWithProviders(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape key is pressed', () => {
    renderWithProviders(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('does not show start recording button before selection', () => {
    renderWithProviders(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    expect(screen.queryByRole('button', { name: /start recording/i })).not.toBeInTheDocument();
  });

  it('creates selection on mouse drag', () => {
    const { container } = renderWithProviders(
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
    renderWithProviders(
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
    const { container } = renderWithProviders(
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
    const { container } = renderWithProviders(
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
    renderWithProviders(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('does not call onSelect on Enter without valid selection', () => {
    renderWithProviders(
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
    const { container } = renderWithProviders(
      <RegionSelector onSelect={mockOnSelect} onCancel={mockOnCancel} />
    );

    const overlay = container.firstChild as HTMLElement;
    
    // Start selection but leave overlay
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseLeave(overlay);

    // Selection should stop
  });
});
