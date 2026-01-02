/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutoSummaryPrompt } from './auto-summary-prompt';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      autoSummaryTitle: 'Long conversation detected',
      autoSummaryDescription: `This conversation has ${params?.messages || 0} messages (~${params?.tokens || 0}k tokens). Generate a summary to keep track of key points.`,
      generateSummary: 'Generate Summary',
      later: 'Later',
      dontShowAgain: "Don't show again",
      messages: 'messages',
    };
    return translations[key] || key;
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock stores
const mockUpdateAutoSummaryConfig = jest.fn();
jest.mock('@/stores/chat', () => ({
  useSummaryStore: {
    getState: () => ({
      updateAutoSummaryConfig: mockUpdateAutoSummaryConfig,
    }),
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    size,
    variant,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: string;
    variant?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-size={size}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock cn
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

describe('AutoSummaryPrompt', () => {
  const defaultProps = {
    show: true,
    messageCount: 50,
    tokenCount: 10000,
    onGenerateSummary: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('renders when show is true', () => {
      render(<AutoSummaryPrompt {...defaultProps} />);
      expect(screen.getByText('Long conversation detected')).toBeInTheDocument();
    });

    it('returns null when show is false', () => {
      const { container } = render(<AutoSummaryPrompt {...defaultProps} show={false} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Content display', () => {
    it('displays title', () => {
      render(<AutoSummaryPrompt {...defaultProps} />);
      expect(screen.getByText('Long conversation detected')).toBeInTheDocument();
    });

    it('displays description with message count', () => {
      const { container } = render(<AutoSummaryPrompt {...defaultProps} messageCount={100} tokenCount={20000} />);
      expect(container.textContent).toContain('100');
      expect(container.textContent).toContain('messages');
    });

    it('displays token count in thousands', () => {
      const { container } = render(<AutoSummaryPrompt {...defaultProps} tokenCount={15000} />);
      // Token count is divided by 1000 and rounded - text may be split across elements
      expect(container.textContent).toContain('15');
      expect(container.textContent).toContain('tokens');
    });

    it('displays generate summary button', () => {
      render(<AutoSummaryPrompt {...defaultProps} />);
      expect(screen.getByText('Generate Summary')).toBeInTheDocument();
    });

    it('displays later button', () => {
      render(<AutoSummaryPrompt {...defaultProps} />);
      expect(screen.getByText('Later')).toBeInTheDocument();
    });

    it('displays dont show again checkbox', () => {
      render(<AutoSummaryPrompt {...defaultProps} />);
      expect(screen.getByText("Don't show again")).toBeInTheDocument();
    });

    it('displays close button (X)', () => {
      render(<AutoSummaryPrompt {...defaultProps} />);
      const closeButton = screen.getAllByRole('button').find(
        (btn) => btn.getAttribute('data-size') === 'icon'
      );
      expect(closeButton).toBeInTheDocument();
    });

    it('displays statistics section', () => {
      const { container } = render(<AutoSummaryPrompt {...defaultProps} messageCount={75} tokenCount={12000} />);
      expect(container.textContent).toContain('75');
      expect(container.textContent).toContain('messages');
      expect(container.textContent).toContain('12');
      expect(container.textContent).toContain('tokens');
    });
  });

  describe('Interactions', () => {
    it('calls onGenerateSummary when generate button clicked', () => {
      const onGenerateSummary = jest.fn();
      render(<AutoSummaryPrompt {...defaultProps} onGenerateSummary={onGenerateSummary} />);

      fireEvent.click(screen.getByText('Generate Summary'));
      expect(onGenerateSummary).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when generate button clicked', () => {
      const onDismiss = jest.fn();
      render(<AutoSummaryPrompt {...defaultProps} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByText('Generate Summary'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when later button clicked', () => {
      const onDismiss = jest.fn();
      render(<AutoSummaryPrompt {...defaultProps} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByText('Later'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when close button clicked', () => {
      const onDismiss = jest.fn();
      render(<AutoSummaryPrompt {...defaultProps} onDismiss={onDismiss} />);

      const closeButton = screen.getAllByRole('button').find(
        (btn) => btn.getAttribute('data-size') === 'icon'
      );
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onDismiss).toHaveBeenCalledTimes(1);
      }
    });

    it('toggles checkbox state', () => {
      render(<AutoSummaryPrompt {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('updates auto summary config when dismissed with checkbox checked', () => {
      const onDismiss = jest.fn();
      render(<AutoSummaryPrompt {...defaultProps} onDismiss={onDismiss} />);

      // Check the "don't show again" checkbox
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Click later to dismiss
      fireEvent.click(screen.getByText('Later'));

      expect(mockUpdateAutoSummaryConfig).toHaveBeenCalledWith({ enabled: false });
      expect(onDismiss).toHaveBeenCalled();
    });

    it('does not update config when dismissed without checkbox checked', () => {
      const onDismiss = jest.fn();
      render(<AutoSummaryPrompt {...defaultProps} onDismiss={onDismiss} />);

      // Click later without checking the checkbox
      fireEvent.click(screen.getByText('Later'));

      expect(mockUpdateAutoSummaryConfig).not.toHaveBeenCalled();
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <AutoSummaryPrompt {...defaultProps} className="custom-prompt" />
      );
      expect(container.querySelector('.custom-prompt')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles zero message count', () => {
      const { container } = render(<AutoSummaryPrompt {...defaultProps} messageCount={0} />);
      expect(container.textContent).toContain('0');
      expect(container.textContent).toContain('messages');
    });

    it('handles very large token count', () => {
      const { container } = render(<AutoSummaryPrompt {...defaultProps} tokenCount={1000000} />);
      // Large token counts display correctly
      expect(container.textContent).toContain('1000');
      expect(container.textContent).toContain('tokens');
    });

    it('rounds token count correctly', () => {
      render(<AutoSummaryPrompt {...defaultProps} tokenCount={1500} />);
      // 1500 / 1000 = 1.5, rounded to 2
      const { container } = render(<AutoSummaryPrompt {...defaultProps} tokenCount={1500} />);
      expect(container.textContent).toContain('2');
    });

    it('handles small token count', () => {
      const { container } = render(<AutoSummaryPrompt {...defaultProps} tokenCount={500} />);
      // 500 / 1000 = 0.5, rounded to 1
      expect(container.textContent).toContain('1');
      expect(container.textContent).toContain('tokens');
    });
  });

  describe('Button variants', () => {
    it('generate summary button has primary styling', () => {
      render(<AutoSummaryPrompt {...defaultProps} />);
      const generateButton = screen.getByText('Generate Summary').closest('button');
      expect(generateButton).toHaveAttribute('data-size', 'sm');
    });

    it('later button has ghost variant', () => {
      render(<AutoSummaryPrompt {...defaultProps} />);
      const laterButton = screen.getByText('Later').closest('button');
      expect(laterButton).toHaveAttribute('data-variant', 'ghost');
    });

    it('close button has icon size', () => {
      render(<AutoSummaryPrompt {...defaultProps} />);
      const closeButton = screen.getAllByRole('button').find(
        (btn) => btn.getAttribute('data-size') === 'icon'
      );
      expect(closeButton).toHaveAttribute('data-variant', 'ghost');
    });
  });
});
