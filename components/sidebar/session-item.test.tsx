/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionItem } from './session-item';
import type { Session } from '@/types';

// Mock stores
const mockSetActiveSession = jest.fn();
const mockUpdateSession = jest.fn();
const mockDeleteSession = jest.fn();
const mockDuplicateSession = jest.fn();

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      setActiveSession: mockSetActiveSession,
      updateSession: mockUpdateSession,
      deleteSession: mockDeleteSession,
      duplicateSession: mockDuplicateSession,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input data-testid="rename-input" {...props} />,
}));

describe('SessionItem', () => {
  const mockSession: Session = {
    id: 'session-1',
    title: 'Test Session',
    mode: 'chat',
    provider: 'openai',
    model: 'gpt-4',
    messageCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const defaultProps = {
    session: mockSession,
    isActive: false,
    collapsed: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SessionItem {...defaultProps} />);
    expect(screen.getByText('Test Session')).toBeInTheDocument();
  });

  it('displays session title', () => {
    render(<SessionItem {...defaultProps} />);
    expect(screen.getByText('Test Session')).toBeInTheDocument();
  });

  it('calls setActiveSession when clicked', () => {
    render(<SessionItem {...defaultProps} />);
    fireEvent.click(screen.getByText('Test Session'));
    expect(mockSetActiveSession).toHaveBeenCalledWith('session-1');
  });

  it('renders dropdown menu with actions', () => {
    render(<SessionItem {...defaultProps} />);
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows rename input when Rename is clicked', () => {
    render(<SessionItem {...defaultProps} />);
    fireEvent.click(screen.getByText('Rename'));
    expect(screen.getByTestId('rename-input')).toBeInTheDocument();
  });

  it('calls duplicateSession when Duplicate is clicked', () => {
    render(<SessionItem {...defaultProps} />);
    fireEvent.click(screen.getByText('Duplicate'));
    expect(mockDuplicateSession).toHaveBeenCalledWith('session-1');
  });

  it('calls deleteSession when Delete is clicked', () => {
    render(<SessionItem {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(mockDeleteSession).toHaveBeenCalledWith('session-1');
  });

  it('applies active styles when isActive is true', () => {
    const { container } = render(<SessionItem {...defaultProps} isActive />);
    const sessionDiv = container.querySelector('.bg-accent');
    expect(sessionDiv).toBeInTheDocument();
  });

  it('renders collapsed view with tooltip', () => {
    render(<SessionItem {...defaultProps} collapsed />);
    expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-content')).toHaveTextContent('Test Session');
  });

  it('updates session title on rename', () => {
    render(<SessionItem {...defaultProps} />);
    fireEvent.click(screen.getByText('Rename'));
    
    const input = screen.getByTestId('rename-input');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.blur(input);
    
    expect(mockUpdateSession).toHaveBeenCalledWith('session-1', { title: 'New Title' });
  });

  it('cancels rename on Escape key', () => {
    render(<SessionItem {...defaultProps} />);
    fireEvent.click(screen.getByText('Rename'));
    
    const input = screen.getByTestId('rename-input');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    
    expect(mockUpdateSession).not.toHaveBeenCalled();
    expect(screen.getByText('Test Session')).toBeInTheDocument();
  });

  it('confirms rename on Enter key', () => {
    render(<SessionItem {...defaultProps} />);
    fireEvent.click(screen.getByText('Rename'));
    
    const input = screen.getByTestId('rename-input');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockUpdateSession).toHaveBeenCalledWith('session-1', { title: 'New Title' });
  });

  it('does not update if title is unchanged', () => {
    render(<SessionItem {...defaultProps} />);
    fireEvent.click(screen.getByText('Rename'));
    
    const input = screen.getByTestId('rename-input');
    fireEvent.blur(input);
    
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });

  it('does not update if title is empty', () => {
    render(<SessionItem {...defaultProps} />);
    fireEvent.click(screen.getByText('Rename'));
    
    const input = screen.getByTestId('rename-input');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);
    
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });
});
