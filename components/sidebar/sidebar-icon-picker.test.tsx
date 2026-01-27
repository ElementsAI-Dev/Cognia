/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarIconPicker } from './sidebar-icon-picker';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      selectIcon: 'Select Icon',
      searchIcons: 'Search icons...',
      noIconsFound: 'No icons found',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    title,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { title?: string }) => (
    <button onClick={onClick} title={title} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="search-input" {...props} />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  MessageSquare: () => <svg data-testid="icon-MessageSquare" />,
  Bot: () => <svg data-testid="icon-Bot" />,
  Zap: () => <svg data-testid="icon-Zap" />,
  Code: () => <svg data-testid="icon-Code" />,
  Terminal: () => <svg data-testid="icon-Terminal" />,
  Search: () => <svg data-testid="icon-Search" />,
  Star: () => <svg data-testid="icon-Star" />,
}));

describe('SidebarIconPicker', () => {
  const mockOnSelect = jest.fn();
  const mockOnOpenChange = jest.fn();

  const defaultProps = {
    onSelect: mockOnSelect,
    open: true,
    onOpenChange: mockOnOpenChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<SidebarIconPicker {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<SidebarIconPicker {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog title', () => {
    render(<SidebarIconPicker {...defaultProps} />);
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Select Icon');
  });

  it('renders search input', () => {
    render(<SidebarIconPicker {...defaultProps} />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('renders search input with correct placeholder', () => {
    render(<SidebarIconPicker {...defaultProps} />);
    expect(screen.getByTestId('search-input')).toHaveAttribute(
      'placeholder',
      'Search icons...'
    );
  });

  it('renders icon buttons', () => {
    render(<SidebarIconPicker {...defaultProps} />);
    // Should have multiple icon buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onSelect with icon name when icon is clicked', () => {
    render(<SidebarIconPicker {...defaultProps} />);
    const botButton = screen.getByTitle('Bot');
    fireEvent.click(botButton);
    expect(mockOnSelect).toHaveBeenCalledWith('lucide:Bot');
  });

  it('calls onOpenChange with false when icon is selected', () => {
    render(<SidebarIconPicker {...defaultProps} />);
    const botButton = screen.getByTitle('Bot');
    fireEvent.click(botButton);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('filters icons based on search input', () => {
    render(<SidebarIconPicker {...defaultProps} />);
    const searchInput = screen.getByTestId('search-input');

    // Type in search
    fireEvent.change(searchInput, { target: { value: 'Bot' } });

    // Bot should still be visible
    expect(screen.getByTitle('Bot')).toBeInTheDocument();
  });

  it('shows no icons found message when search has no results', () => {
    render(<SidebarIconPicker {...defaultProps} />);
    const searchInput = screen.getByTestId('search-input');

    // Type in search that won't match anything
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    expect(screen.getByText('No icons found')).toBeInTheDocument();
  });

  it('renders trigger when provided', () => {
    render(
      <SidebarIconPicker
        {...defaultProps}
        trigger={<button>Open Picker</button>}
      />
    );
    expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument();
  });

  it('renders scroll area for icons', () => {
    render(<SidebarIconPicker {...defaultProps} />);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });
});
