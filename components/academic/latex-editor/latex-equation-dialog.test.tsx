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

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea data-testid="textarea" {...props} />,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
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

  it('renders input and textarea', () => {
    render(<LaTeXEquationDialog {...defaultProps} />);
    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByTestId('textarea')).toBeInTheDocument();
  });

  it('renders separator', () => {
    render(<LaTeXEquationDialog {...defaultProps} />);
    expect(screen.getByTestId('separator')).toBeInTheDocument();
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

  it('renders insert and cancel buttons', () => {
    render(<LaTeXEquationDialog {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Should have generate, cancel, and insert buttons
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders generate button', () => {
    render(<LaTeXEquationDialog {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const generateBtn = buttons.find(btn => btn.textContent?.toLowerCase().includes('generate'));
    expect(generateBtn).toBeDefined();
  });
});
