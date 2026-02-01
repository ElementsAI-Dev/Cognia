/**
 * Unit tests for LaTeXAIDropdown component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LatexAIDropdown } from './latex-ai-dropdown';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

// Mock separator component
jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sparkles: () => <span data-testid="icon-sparkles" />,
  ChevronDown: () => <span data-testid="icon-chevron" />,
  ChevronRight: () => <span data-testid="icon-chevron" />,
  Wand2: () => <span data-testid="icon-wand" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Expand: () => <span data-testid="icon-expand" />,
  Languages: () => <span data-testid="icon-languages" />,
  PenLine: () => <span data-testid="icon-penline" />,
  Sigma: () => <span data-testid="icon-sigma" />,
  SpellCheck: () => <span data-testid="icon-spellcheck" />,
  Settings: () => <span data-testid="icon-settings" />,
}));

describe('LatexAIDropdown', () => {
  const defaultProps = {
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dropdown', () => {
    render(<LatexAIDropdown {...defaultProps} />);
    expect(screen.getByTestId('dropdown')).toBeInTheDocument();
  });

  it('renders trigger button', () => {
    render(<LatexAIDropdown {...defaultProps} />);
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
  });

  it('renders dropdown content', () => {
    render(<LatexAIDropdown {...defaultProps} />);
    expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
  });

  it('renders AI sparkles icon', () => {
    render(<LatexAIDropdown {...defaultProps} />);
    const icons = screen.getAllByTestId('icon-sparkles');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('renders dropdown items', () => {
    render(<LatexAIDropdown {...defaultProps} />);
    const items = screen.getAllByTestId('dropdown-item');
    expect(items.length).toBeGreaterThan(0);
  });

  it('calls onSelect when item clicked', async () => {
    render(<LatexAIDropdown {...defaultProps} />);
    
    const items = screen.getAllByTestId('dropdown-item');
    if (items.length > 0) {
      await userEvent.click(items[0]);
      expect(defaultProps.onSelect).toHaveBeenCalled();
    }
  });

  it('renders chevron icon', () => {
    render(<LatexAIDropdown {...defaultProps} />);
    expect(screen.getByTestId('icon-chevron')).toBeInTheDocument();
  });
});
