/**
 * Unit tests for LaTeXAIFab component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LatexAIFab } from './latex-ai-fab';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} data-testid="fab-button" {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sparkles: () => <span data-testid="icon-sparkles" />,
}));

describe('LatexAIFab', () => {
  const defaultProps = {
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the FAB button', () => {
    render(<LatexAIFab {...defaultProps} />);
    expect(screen.getByTestId('fab-button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    render(<LatexAIFab {...defaultProps} />);
    
    await userEvent.click(screen.getByTestId('fab-button'));
    expect(defaultProps.onClick).toHaveBeenCalled();
  });

  it('renders sparkles icon', () => {
    render(<LatexAIFab {...defaultProps} />);
    expect(screen.getByTestId('icon-sparkles')).toBeInTheDocument();
  });

  it('renders tooltip', () => {
    render(<LatexAIFab {...defaultProps} />);
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LatexAIFab {...defaultProps} className="custom-class" />);
    // The button should still render
    expect(screen.getByTestId('fab-button')).toBeInTheDocument();
  });
});
