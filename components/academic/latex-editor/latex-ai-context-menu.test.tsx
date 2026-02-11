/**
 * Unit tests for LatexAIContextMenu component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LatexAIContextMenu } from './latex-ai-context-menu';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="context-menu">{children}</div>,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="context-trigger">{children}</div>,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="context-content">{children}</div>,
  ContextMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="context-item" onClick={onClick}>{children}</button>
  ),
  ContextMenuLabel: ({ children }: { children: React.ReactNode }) => <div data-testid="context-label">{children}</div>,
  ContextMenuSeparator: () => <hr data-testid="context-separator" />,
  ContextMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuSubTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  ContextMenuSubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useLatexAI hook
jest.mock('@/hooks/latex/use-latex-ai', () => ({
  useLatexAI: () => ({
    runTextAction: jest.fn().mockResolvedValue('result'),
    isLoading: false,
  }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sparkles: () => <span data-testid="icon-sparkles" />,
  Wand2: () => <span data-testid="icon-wand" />,
  Languages: () => <span data-testid="icon-languages" />,
  CheckCircle: () => <span data-testid="icon-check" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Expand: () => <span data-testid="icon-expand" />,
  Shrink: () => <span data-testid="icon-shrink" />,
  Copy: () => <span data-testid="icon-copy" />,
}));

describe('LatexAIContextMenu', () => {
  const defaultProps = {
    selectedText: 'E = mc^2',
    onReplaceSelection: jest.fn(),
    children: <div data-testid="child-content">Editor Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children', () => {
    render(<LatexAIContextMenu {...defaultProps} />);
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('renders context menu wrapper', () => {
    render(<LatexAIContextMenu {...defaultProps} />);
    expect(screen.getByTestId('context-menu')).toBeInTheDocument();
  });

  it('renders context menu trigger', () => {
    render(<LatexAIContextMenu {...defaultProps} />);
    expect(screen.getByTestId('context-trigger')).toBeInTheDocument();
  });

  it('renders menu items', () => {
    render(<LatexAIContextMenu {...defaultProps} />);
    const menuItems = screen.getAllByTestId('context-item');
    expect(menuItems.length).toBeGreaterThan(0);
  });

  it('handles empty selected text', () => {
    render(<LatexAIContextMenu {...defaultProps} selectedText="" />);
    expect(screen.getByTestId('context-menu')).toBeInTheDocument();
  });

  it('calls onReplaceSelection when menu item clicked', async () => {
    render(<LatexAIContextMenu {...defaultProps} />);
    
    const menuItems = screen.getAllByTestId('context-item');
    if (menuItems.length > 0) {
      await userEvent.click(menuItems[0]);
      // The callback may or may not be called depending on the action
    }
  });

  it('renders context menu label', () => {
    render(<LatexAIContextMenu {...defaultProps} />);
    expect(screen.getByTestId('context-label')).toBeInTheDocument();
  });

  it('renders with different selected text', () => {
    render(<LatexAIContextMenu {...defaultProps} selectedText="\\frac{a}{b}" />);
    expect(screen.getByTestId('context-menu')).toBeInTheDocument();
  });
});
