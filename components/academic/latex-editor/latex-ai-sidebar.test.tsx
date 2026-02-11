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

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="input" {...props} />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

// Mock stores and hooks
jest.mock('@/stores/settings', () => ({
  useSettingsStore: (selector: (s: Record<string, unknown>) => unknown) => selector({
    defaultProvider: 'openai',
    providerSettings: { openai: { enabled: true, apiKey: 'test', defaultModel: 'gpt-4o-mini' } },
  }),
}));

jest.mock('@/lib/ai/generation/use-ai-chat', () => ({
  useAIChat: () => ({
    sendMessage: jest.fn().mockResolvedValue('AI response'),
    stop: jest.fn(),
  }),
}));

jest.mock('./latex-equation-analysis', () => ({
  LatexEquationAnalysis: () => <div data-testid="equation-analysis" />,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Send: () => <span data-testid="icon-send" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
  PanelRightClose: () => <span data-testid="icon-close" />,
  MessageSquare: () => <span data-testid="icon-message" />,
  Lightbulb: () => <span data-testid="icon-lightbulb" />,
  History: () => <span data-testid="icon-history" />,
  Calculator: () => <span data-testid="icon-calculator" />,
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

  it('renders input field', () => {
    render(<LaTeXAISidebar {...defaultProps} />);
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    render(<LaTeXAISidebar {...defaultProps} />);
    
    const closeButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('[data-testid="icon-close"]')
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
    
    const input = screen.getByTestId('input');
    await userEvent.type(input, 'Generate a formula');
    
    expect(input).toHaveValue('Generate a formula');
  });

  it('renders AI sparkles icon', () => {
    render(<LaTeXAISidebar {...defaultProps} />);
    expect(screen.getByTestId('icon-sparkles')).toBeInTheDocument();
  });
});
