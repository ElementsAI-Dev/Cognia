/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WelcomeA2UIDemo } from './welcome-a2ui-demo';

// Mock A2UI hooks
jest.mock('@/hooks/a2ui', () => ({
  useA2UI: () => ({
    registerSurface: jest.fn(),
    unregisterSurface: jest.fn(),
    updateComponents: jest.fn(),
    handleAction: jest.fn(),
  }),
}));

// Mock A2UI components
jest.mock('@/components/a2ui', () => ({
  A2UIInlineSurface: ({ surfaceId, onAction }: { surfaceId: string; onAction?: (action: unknown) => void }) => (
    <div data-testid="a2ui-surface" data-surface-id={surfaceId}>
      <button onClick={() => onAction?.({ type: 'click', componentId: 'test' })}>
        Test Action
      </button>
    </div>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

describe('WelcomeA2UIDemo', () => {
  const defaultProps = {
    onAction: jest.fn(),
    onSuggestionClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<WelcomeA2UIDemo {...defaultProps} />);
    
    expect(screen.getByTestId('a2ui-surface')).toBeInTheDocument();
  });

  it('renders with correct surface ID', () => {
    render(<WelcomeA2UIDemo {...defaultProps} />);
    
    const surface = screen.getByTestId('a2ui-surface');
    expect(surface).toHaveAttribute('data-surface-id', 'welcome-demo-surface');
  });

  it('applies custom className', () => {
    const { container } = render(
      <WelcomeA2UIDemo {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('calls onAction when action is triggered', async () => {
    render(<WelcomeA2UIDemo {...defaultProps} />);
    
    const actionButton = screen.getByText('Test Action');
    fireEvent.click(actionButton);
    
    await waitFor(() => {
      expect(defaultProps.onAction).toHaveBeenCalled();
    });
  });

  it('renders without onAction callback', () => {
    render(<WelcomeA2UIDemo onSuggestionClick={jest.fn()} />);
    
    expect(screen.getByTestId('a2ui-surface')).toBeInTheDocument();
  });

  it('renders without onSuggestionClick callback', () => {
    render(<WelcomeA2UIDemo onAction={jest.fn()} />);
    
    expect(screen.getByTestId('a2ui-surface')).toBeInTheDocument();
  });

  it('renders with showSettings prop', () => {
    render(<WelcomeA2UIDemo {...defaultProps} showSettings />);
    
    expect(screen.getByTestId('a2ui-surface')).toBeInTheDocument();
  });

  it('renders with showSettings false', () => {
    render(<WelcomeA2UIDemo {...defaultProps} showSettings={false} />);
    
    expect(screen.getByTestId('a2ui-surface')).toBeInTheDocument();
  });

  it('has refresh button', () => {
    render(<WelcomeA2UIDemo {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    // Should have at least one button for refresh
    expect(buttons.length).toBeGreaterThan(0);
  });
});
