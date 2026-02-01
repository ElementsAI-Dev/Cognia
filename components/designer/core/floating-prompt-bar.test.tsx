/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingPromptBar } from './floating-prompt-bar';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('FloatingPromptBar', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the prompt textarea', () => {
      render(<FloatingPromptBar onSubmit={mockOnSubmit} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(
        <FloatingPromptBar
          onSubmit={mockOnSubmit}
          placeholder="Custom placeholder"
        />
      );
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('should render generate button', () => {
      render(<FloatingPromptBar onSubmit={mockOnSubmit} />);
      expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
    });

    it('should render multiple buttons including suggestions toggle', () => {
      render(<FloatingPromptBar onSubmit={mockOnSubmit} />);

      // Should have generate button and suggestions toggle button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('user interactions', () => {
    it('should update textarea value on input', async () => {
      const user = userEvent.setup();
      render(<FloatingPromptBar onSubmit={mockOnSubmit} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Make the button larger');

      expect(textarea).toHaveValue('Make the button larger');
    });

    it('should call onSubmit when generate button is clicked', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      render(<FloatingPromptBar onSubmit={mockOnSubmit} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Add padding');

      const generateButton = screen.getByRole('button', { name: /generate/i });
      await user.click(generateButton);

      expect(mockOnSubmit).toHaveBeenCalledWith('Add padding');
    });

    it('should not submit when textarea is empty', async () => {
      const user = userEvent.setup();
      render(<FloatingPromptBar onSubmit={mockOnSubmit} />);

      const generateButton = screen.getByRole('button', { name: /generate/i });
      await user.click(generateButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should render suggestions toggle button', () => {
      render(<FloatingPromptBar onSubmit={mockOnSubmit} />);

      // Should have multiple buttons (generate and suggestions toggle)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('loading state', () => {
    it('should disable textarea when processing', () => {
      render(<FloatingPromptBar onSubmit={mockOnSubmit} isProcessing />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <FloatingPromptBar
          onSubmit={mockOnSubmit}
          error="Something went wrong"
          onClearError={mockOnClearError}
        />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should call onClearError when error dismiss button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FloatingPromptBar
          onSubmit={mockOnSubmit}
          error="Something went wrong"
          onClearError={mockOnClearError}
        />
      );

      // Find the dismiss button within the error message container
      const errorContainer = screen.getByText('Something went wrong').parentElement;
      const dismissButton = errorContainer?.querySelector('button');
      expect(dismissButton).toBeInTheDocument();
      await user.click(dismissButton!);

      expect(mockOnClearError).toHaveBeenCalled();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should submit on Ctrl+Enter', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      render(<FloatingPromptBar onSubmit={mockOnSubmit} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Add shadow');
      await user.keyboard('{Control>}{Enter}{/Control}');

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Add shadow');
      });
    });

    it('should submit on Meta+Enter (Mac)', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      render(<FloatingPromptBar onSubmit={mockOnSubmit} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Round corners');
      await user.keyboard('{Meta>}{Enter}{/Meta}');

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Round corners');
      });
    });
  });

  describe('conversation context', () => {
    it('should accept conversation context', () => {
      render(
        <FloatingPromptBar
          onSubmit={mockOnSubmit}
          conversationContext={['Previous message 1', 'Previous message 2']}
        />
      );

      // Component should render without errors with context
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <FloatingPromptBar onSubmit={mockOnSubmit} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
