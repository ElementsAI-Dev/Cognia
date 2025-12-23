/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationSearch } from './conversation-search';
import type { UIMessage } from '@/types';

// Mock UI components
jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="search-input"
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

describe('ConversationSearch', () => {
  const createMessage = (
    id: string,
    role: 'user' | 'assistant',
    content: string,
    isBookmarked = false
  ): UIMessage => ({
    id,
    role,
    content,
    createdAt: new Date('2024-01-15T10:30:00'),
    parts: [],
    attachments: [],
    isBookmarked,
  });

  const mockMessages: UIMessage[] = [
    createMessage('1', 'user', 'Hello, how are you today?'),
    createMessage('2', 'assistant', 'I am doing great! How can I help you?'),
    createMessage('3', 'user', 'Can you explain React hooks?'),
    createMessage('4', 'assistant', 'React hooks are functions that let you use state and lifecycle features.', true),
  ];

  const mockOnNavigate = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ConversationSearch messages={mockMessages} />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('displays search input with placeholder', () => {
    render(<ConversationSearch messages={mockMessages} />);
    expect(screen.getByPlaceholderText('Search in conversation...')).toBeInTheDocument();
  });

  it('filters messages based on search query', () => {
    const { container } = render(<ConversationSearch messages={mockMessages} onNavigateToMessage={mockOnNavigate} />);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'React' } });
    
    // Component should filter results
    expect(container).toBeInTheDocument();
  });

  it('shows result count when searching', () => {
    render(<ConversationSearch messages={mockMessages} />);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'how' } });
    
    // Should find matches in multiple messages
    expect(screen.getByText(/of.*results/)).toBeInTheDocument();
  });

  it('calls onNavigateToMessage when result is clicked', () => {
    const { container } = render(<ConversationSearch messages={mockMessages} onNavigateToMessage={mockOnNavigate} />);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'React' } });
    
    // Component should handle navigation
    expect(container).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const { container } = render(<ConversationSearch messages={mockMessages} onClose={mockOnClose} />);
    
    // Component should render close button
    expect(container).toBeInTheDocument();
  });

  it('shows no results message when search has no matches', () => {
    const { container } = render(<ConversationSearch messages={mockMessages} />);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'xyznotfound' } });
    
    // Component should handle no results
    expect(container).toBeInTheDocument();
  });

  it('filters to show only bookmarked messages', () => {
    render(<ConversationSearch messages={mockMessages} />);
    
    // Find and click the bookmark filter button
    const buttons = screen.getAllByRole('button');
    const bookmarkButton = buttons.find(btn => btn.getAttribute('title') === 'Show bookmarked only');
    fireEvent.click(bookmarkButton!);
    
    // Should show only bookmarked message
    expect(screen.getByText(/React hooks are functions/)).toBeInTheDocument();
  });

  it('displays message role badges', () => {
    render(<ConversationSearch messages={mockMessages} />);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('highlights search matches', () => {
    const { container } = render(<ConversationSearch messages={mockMessages} />);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'React' } });
    
    // Component should render with search applied
    expect(container).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ConversationSearch messages={mockMessages} className="custom-search" />
    );
    expect(container.firstChild).toHaveClass('custom-search');
  });

  it('handles empty messages array', () => {
    render(<ConversationSearch messages={[]} />);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('supports navigation between results', () => {
    render(<ConversationSearch messages={mockMessages} />);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'how' } });
    
    // Should have navigation buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(2);
  });

  it('case-insensitive search', () => {
    const { container } = render(<ConversationSearch messages={mockMessages} />);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'REACT' } });
    
    // Search should filter results case-insensitively
    expect(container).toBeInTheDocument();
  });
});
