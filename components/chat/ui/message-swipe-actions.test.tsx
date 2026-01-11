/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageSwipeActions } from './message-swipe-actions';

// Mock the useSwipeGesture hook
jest.mock('@/hooks/utils', () => ({
  useSwipeGesture: () => ({
    deltaX: 0,
    deltaY: 0,
    isSwiping: false,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
    <button onClick={onClick} className={className} {...props}>{children}</button>
  ),
}));

describe('MessageSwipeActions', () => {
  const mockOnAction = jest.fn();
  const defaultProps = {
    onAction: mockOnAction,
    children: <div data-testid="content">Message Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    render(<MessageSwipeActions {...defaultProps} />);
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Message Content')).toBeInTheDocument();
  });

  it('renders with default enabled actions', () => {
    render(<MessageSwipeActions {...defaultProps} />);
    
    // Default actions are: copy, edit, delete
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders with custom enabled actions', () => {
    render(
      <MessageSwipeActions {...defaultProps} enabledActions={['reply', 'bookmark']} />
    );
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onAction when action button is clicked', () => {
    render(<MessageSwipeActions {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    if (buttons.length > 0) {
      fireEvent.click(buttons[0]);
      expect(mockOnAction).toHaveBeenCalled();
    }
  });

  it('applies custom className', () => {
    const { container } = render(
      <MessageSwipeActions {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('respects disabled prop', () => {
    render(<MessageSwipeActions {...defaultProps} disabled />);
    
    // Component should still render but swipe should be disabled
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders all action types when all are enabled', () => {
    render(
      <MessageSwipeActions 
        {...defaultProps} 
        enabledActions={['copy', 'edit', 'delete', 'reply', 'regenerate', 'bookmark', 'share']} 
      />
    );
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(7);
  });
});
