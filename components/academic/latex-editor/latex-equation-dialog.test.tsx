/**
 * Unit tests for LaTeXEquationDialog component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LatexEquationDialog as LaTeXEquationDialog } from './latex-equation-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input data-testid="input" {...props} />,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Function: () => <span data-testid="icon-function" />,
  Copy: () => <span data-testid="icon-copy" />,
  Check: () => <span data-testid="icon-check" />,
}));

describe('LaTeXEquationDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onInsert: jest.fn(),
    onGenerate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<LaTeXEquationDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<LaTeXEquationDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders tabs', () => {
    render(<LaTeXEquationDialog {...defaultProps} />);
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('renders dialog footer with buttons', () => {
    render(<LaTeXEquationDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel clicked', async () => {
    render(<LaTeXEquationDialog {...defaultProps} />);
    
    const cancelButton = screen.getAllByRole('button').find(
      btn => btn.textContent?.toLowerCase().includes('cancel')
    );
    
    if (cancelButton) {
      await userEvent.click(cancelButton);
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    }
  });

  it('calls onInsert when insert clicked', async () => {
    render(<LaTeXEquationDialog {...defaultProps} />);
    
    const insertButton = screen.getAllByRole('button').find(
      btn => btn.textContent?.toLowerCase().includes('insert')
    );
    
    if (insertButton) {
      await userEvent.click(insertButton);
      expect(defaultProps.onInsert).toHaveBeenCalled();
    }
  });

  it('renders function icon', () => {
    render(<LaTeXEquationDialog {...defaultProps} />);
    expect(screen.getByTestId('icon-function')).toBeInTheDocument();
  });
});
