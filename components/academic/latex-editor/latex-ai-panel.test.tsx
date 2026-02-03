/**
 * Unit tests for LatexAIPanel component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LatexAIPanel } from './latex-ai-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn((selector) =>
    selector({
      defaultProvider: 'openai',
      providerSettings: {
        openai: { enabled: true, apiKey: 'test-key', defaultModel: 'gpt-4o-mini' },
      },
    })
  ),
}));

// Mock useAIChat hook
const mockSendMessage = jest.fn().mockResolvedValue('AI response');
const mockStop = jest.fn();
jest.mock('@/lib/ai/generation/use-ai-chat', () => ({
  useAIChat: () => ({
    sendMessage: mockSendMessage,
    stop: mockStop,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea data-testid="textarea" {...props} />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange: _onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list" role="tablist">{children}</div>
  ),
  TabsTrigger: ({ children, value, ...props }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`} role="tab" {...props}>
      {children}
    </button>
  ),
}));

// Mock LatexEquationAnalysis component
jest.mock('./latex-equation-analysis', () => ({
  LatexEquationAnalysis: () => <div data-testid="equation-analysis">Equation Analysis</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sparkles: () => <span data-testid="icon-sparkles" />,
  PanelRightClose: () => <span data-testid="icon-panel-close" />,
  PanelRight: () => <span data-testid="icon-panel-right" />,
  MessageSquare: () => <span data-testid="icon-message" />,
  Lightbulb: () => <span data-testid="icon-lightbulb" />,
  History: () => <span data-testid="icon-history" />,
  Send: () => <span data-testid="icon-send" />,
  Calculator: () => <span data-testid="icon-calculator" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Copy: () => <span data-testid="icon-copy" />,
  Check: () => <span data-testid="icon-check" />,
  Trash2: () => <span data-testid="icon-trash" />,
}));

describe('LatexAIPanel', () => {
  const defaultProps = {
    open: true,
    onToggle: jest.fn(),
    selectedText: '',
    onInsertText: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders panel when open', () => {
      render(<LatexAIPanel {...defaultProps} />);
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getAllByTestId('icon-sparkles').length).toBeGreaterThan(0);
    });

    it('renders collapsed state when closed', () => {
      render(<LatexAIPanel {...defaultProps} open={false} />);
      expect(screen.getByTestId('icon-panel-right')).toBeInTheDocument();
      expect(screen.queryByTestId('tabs')).not.toBeInTheDocument();
    });

    it('renders all tab triggers', () => {
      render(<LatexAIPanel {...defaultProps} />);
      expect(screen.getByTestId('tab-chat')).toBeInTheDocument();
      expect(screen.getByTestId('tab-analysis')).toBeInTheDocument();
      expect(screen.getByTestId('tab-suggestions')).toBeInTheDocument();
      expect(screen.getByTestId('tab-history')).toBeInTheDocument();
    });

    it('renders input textarea', () => {
      render(<LatexAIPanel {...defaultProps} />);
      expect(screen.getByTestId('textarea')).toBeInTheDocument();
    });

    it('renders send button', () => {
      render(<LatexAIPanel {...defaultProps} />);
      expect(screen.getByTestId('icon-send')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onToggle when close button clicked', async () => {
      render(<LatexAIPanel {...defaultProps} />);

      const closeButton = screen.getAllByRole('button').find((btn) =>
        btn.querySelector('[data-testid="icon-panel-close"]')
      );

      if (closeButton) {
        await userEvent.click(closeButton);
        expect(mockStop).toHaveBeenCalled();
        expect(defaultProps.onToggle).toHaveBeenCalled();
      }
    });

    it('calls onToggle when expand button clicked in collapsed state', async () => {
      render(<LatexAIPanel {...defaultProps} open={false} />);

      const expandButton = screen.getAllByRole('button').find((btn) =>
        btn.querySelector('[data-testid="icon-panel-right"]')
      );

      if (expandButton) {
        await userEvent.click(expandButton);
        expect(defaultProps.onToggle).toHaveBeenCalled();
      }
    });

    it('handles text input', async () => {
      render(<LatexAIPanel {...defaultProps} />);

      const textarea = screen.getByTestId('textarea');
      await userEvent.type(textarea, 'Test input');

      expect(textarea).toHaveValue('Test input');
    });

    it('sends message on button click', async () => {
      render(<LatexAIPanel {...defaultProps} />);

      const textarea = screen.getByTestId('textarea');
      await userEvent.type(textarea, 'Test message');

      const sendButton = screen.getAllByRole('button').find((btn) =>
        btn.querySelector('[data-testid="icon-send"]')
      );

      if (sendButton) {
        await userEvent.click(sendButton);
        await waitFor(() => {
          expect(mockSendMessage).toHaveBeenCalled();
        });
      }
    });

    it('sends message on Enter key', async () => {
      render(<LatexAIPanel {...defaultProps} />);

      const textarea = screen.getByTestId('textarea');
      await userEvent.type(textarea, 'Test message{enter}');

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled();
      });
    });
  });

  describe('selected text context', () => {
    it('shows selected text indicator when text is selected', () => {
      render(<LatexAIPanel {...defaultProps} selectedText="selected latex code" />);
      expect(screen.getByText('ai.chat.selectedText')).toBeInTheDocument();
    });
  });

  describe('tab triggers', () => {
    it('renders suggestions tab trigger', () => {
      render(<LatexAIPanel {...defaultProps} />);
      expect(screen.getByTestId('tab-suggestions')).toBeInTheDocument();
    });

    it('renders history tab trigger', () => {
      render(<LatexAIPanel {...defaultProps} />);
      expect(screen.getByTestId('tab-history')).toBeInTheDocument();
    });
  });
});
