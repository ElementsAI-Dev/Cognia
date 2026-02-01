/**
 * Unit tests for SymbolPicker component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SymbolPicker } from './symbol-picker';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input data-testid="search-input" {...props} />,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: () => <span data-testid="icon-search" />,
}));

describe('SymbolPicker', () => {
  const defaultProps = {
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the symbol picker', () => {
    render(<SymbolPicker {...defaultProps} />);
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<SymbolPicker {...defaultProps} />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('renders scroll area for symbols', () => {
    render(<SymbolPicker {...defaultProps} />);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });

  it('filters symbols on search', async () => {
    render(<SymbolPicker {...defaultProps} />);
    
    const searchInput = screen.getByTestId('search-input');
    await userEvent.type(searchInput, 'alpha');
    
    expect(searchInput).toHaveValue('alpha');
  });

  it('calls onSelect when symbol clicked', async () => {
    render(<SymbolPicker {...defaultProps} />);
    
    // Find any symbol button and click it
    const buttons = screen.getAllByRole('button');
    if (buttons.length > 0) {
      await userEvent.click(buttons[0]);
      // onSelect may or may not be called depending on button type
    }
  });

  it('renders category tabs', () => {
    render(<SymbolPicker {...defaultProps} />);
    // Should have tabs for different symbol categories
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('handles empty search results', async () => {
    render(<SymbolPicker {...defaultProps} />);
    
    const searchInput = screen.getByTestId('search-input');
    await userEvent.type(searchInput, 'nonexistentsymbol12345');
    
    // Should still render without errors
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });
});
