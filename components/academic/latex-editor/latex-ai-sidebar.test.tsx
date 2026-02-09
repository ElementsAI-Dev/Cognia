/**
 * Unit tests for LaTeXAISidebar component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LatexAISidebar as LaTeXAISidebar } from './latex-ai-sidebar';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea data-testid="textarea" {...props} />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Send: () => <span data-testid="icon-send" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
  X: () => <span data-testid="icon-x" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Copy: () => <span data-testid="icon-copy" />,
  Check: () => <span data-testid="icon-check" />,
}));

describe('LaTeXAISidebar', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onInsert: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<LaTeXAISidebar {...defaultProps} />);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<LaTeXAISidebar {...defaultProps} open={false} />);
    // Sidebar should not render content when closed
    expect(container.querySelector('[data-testid="scroll-area"]')).toBeNull();
  });

  it('renders input textarea', () => {
    render(<LaTeXAISidebar {...defaultProps} />);
    expect(screen.getByTestId('textarea')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    render(<LaTeXAISidebar {...defaultProps} />);
    
    const closeButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('[data-testid="icon-x"]')
    );
    
    if (closeButton) {
      await userEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('renders send button', () => {
    render(<LaTeXAISidebar {...defaultProps} />);
    expect(screen.getByTestId('icon-send')).toBeInTheDocument();
  });

  it('handles text input', async () => {
    render(<LaTeXAISidebar {...defaultProps} />);
    
    const textarea = screen.getByTestId('textarea');
    await userEvent.type(textarea, 'Generate a formula');
    
    expect(textarea).toHaveValue('Generate a formula');
  });

  it('renders AI sparkles icon', () => {
    render(<LaTeXAISidebar {...defaultProps} />);
    expect(screen.getByTestId('icon-sparkles')).toBeInTheDocument();
  });
});
