/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageReactions, type Reaction } from './message-reactions';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="popover" data-open={open}>{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
}));

describe('MessageReactions', () => {
  const mockOnReact = jest.fn();

  const defaultReactions: Reaction[] = [
    { emoji: '👍', count: 3, reacted: true },
    { emoji: '❤️', count: 1, reacted: false },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<MessageReactions reactions={[]} onReact={mockOnReact} />);
    expect(screen.getByTestId('popover')).toBeInTheDocument();
  });

  it('displays existing reactions', () => {
    render(<MessageReactions reactions={defaultReactions} onReact={mockOnReact} />);
    // Emojis may appear in both reactions and popover
    expect(screen.getAllByText('👍').length).toBeGreaterThan(0);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('❤️').length).toBeGreaterThan(0);
  });

  it('calls onReact when clicking an existing reaction', () => {
    render(<MessageReactions reactions={defaultReactions} onReact={mockOnReact} />);
    
    // Find the reaction button with count
    const thumbsUp = screen.getByText('3').closest('button');
    fireEvent.click(thumbsUp!);
    
    expect(mockOnReact).toHaveBeenCalledWith('👍');
  });

  it('displays reaction count correctly', () => {
    const reactions: Reaction[] = [
      { emoji: '🎉', count: 10, reacted: false },
    ];
    render(<MessageReactions reactions={reactions} onReact={mockOnReact} />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('applies reacted styling to user reactions', () => {
    render(<MessageReactions reactions={defaultReactions} onReact={mockOnReact} />);
    
    // Find the reaction button by its count
    const thumbsUpButton = screen.getByText('3').closest('button');
    expect(thumbsUpButton).toHaveClass('bg-primary/20');
  });

  it('renders add reaction button', () => {
    render(<MessageReactions reactions={[]} onReact={mockOnReact} />);
    expect(screen.getByTestId('popover-trigger')).toBeInTheDocument();
  });

  it('displays quick reactions in popover', () => {
    render(<MessageReactions reactions={[]} onReact={mockOnReact} />);
    
    // Quick reactions should be in the popover content
    const popoverContent = screen.getByTestId('popover-content');
    expect(popoverContent).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MessageReactions
        reactions={[]}
        onReact={mockOnReact}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles empty reactions array', () => {
    render(<MessageReactions reactions={[]} onReact={mockOnReact} />);
    // Should not have any count numbers displayed (only emojis in popover)
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('handles multiple reactions from same user', () => {
    const reactions: Reaction[] = [
      { emoji: '👍', count: 1, reacted: true },
      { emoji: '❤️', count: 1, reacted: true },
      { emoji: '🎉', count: 1, reacted: true },
    ];
    render(<MessageReactions reactions={reactions} onReact={mockOnReact} />);
    
    // Count of 1 appears for each reaction
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(3);
  });
});
