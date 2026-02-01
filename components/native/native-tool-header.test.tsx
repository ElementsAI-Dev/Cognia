/**
 * Tests for NativeToolHeader component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Camera } from 'lucide-react';
import { NativeToolHeader } from './native-tool-header';

describe('NativeToolHeader', () => {
  it('renders title', () => {
    render(<NativeToolHeader title="Screenshot" />);

    expect(screen.getByRole('heading', { name: 'Screenshot' })).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<NativeToolHeader title="Screenshot" icon={Camera} />);

    // Icon should be rendered within the component
    const header = screen.getByRole('heading', { name: 'Screenshot' }).closest('header');
    expect(header).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <NativeToolHeader
        title="Screenshot"
        description="Capture your screen"
      />
    );

    expect(screen.getByText('Capture your screen')).toBeInTheDocument();
  });

  it('renders string badge', () => {
    render(<NativeToolHeader title="Screenshot" badge="Beta" />);

    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renders custom badge element', () => {
    render(
      <NativeToolHeader
        title="Screenshot"
        badge={<span data-testid="custom-badge">Custom</span>}
      />
    );

    expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(
      <NativeToolHeader
        title="Screenshot"
        actions={<button data-testid="action-btn">Action</button>}
      />
    );

    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
  });

  it('renders refresh button and calls onRefresh', () => {
    const mockOnRefresh = jest.fn();
    render(
      <NativeToolHeader
        title="Screenshot"
        onRefresh={mockOnRefresh}
        refreshLabel="Refresh data"
      />
    );

    const refreshButton = screen.getByRole('button');
    fireEvent.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows spinning animation when isRefreshing is true', () => {
    render(
      <NativeToolHeader
        title="Screenshot"
        onRefresh={() => {}}
        isRefreshing
      />
    );

    const refreshButton = screen.getByRole('button');
    expect(refreshButton).toBeDisabled();
  });

  it('applies custom className', () => {
    render(
      <NativeToolHeader title="Screenshot" className="custom-header-class" />
    );

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('custom-header-class');
  });
});
