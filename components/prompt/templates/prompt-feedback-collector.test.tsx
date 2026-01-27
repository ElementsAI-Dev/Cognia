/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptFeedbackCollector } from './prompt-feedback-collector';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
const mockRecordFeedback = jest.fn();
jest.mock('@/stores', () => ({
  usePromptTemplateStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      recordFeedback: mockRecordFeedback,
    };
    return selector(state);
  },
}));

// Mock toast
jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PromptFeedbackCollector', () => {
  const defaultProps = {
    templateId: 'template-1',
    templateName: 'Test Template',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('popover variant (default)', () => {
    it('renders trigger button', () => {
      render(<PromptFeedbackCollector {...defaultProps} />);
      expect(screen.getByRole('button', { name: /ratePrompt/i })).toBeInTheDocument();
    });

    it('opens popover when trigger clicked', async () => {
      const user = userEvent.setup();
      render(<PromptFeedbackCollector {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /ratePrompt/i }));
      
      expect(screen.getByText('howWasPrompt')).toBeInTheDocument();
    });
  });

  describe('inline variant', () => {
    it('renders feedback form directly', () => {
      render(<PromptFeedbackCollector {...defaultProps} variant="inline" />);
      expect(screen.getByText('howWasPrompt')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('displays template name when provided', () => {
      render(<PromptFeedbackCollector {...defaultProps} variant="inline" />);
      expect(screen.getByText('Test Template')).toBeInTheDocument();
    });

    it('allows star rating selection', () => {
      render(<PromptFeedbackCollector {...defaultProps} variant="inline" />);
      
      const starButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-star') || btn.className.includes('hover:scale')
      );
      expect(starButtons.length).toBeGreaterThanOrEqual(5);
    });

    it('allows effectiveness selection', async () => {
      const user = userEvent.setup();
      render(<PromptFeedbackCollector {...defaultProps} variant="inline" />);
      
      const excellentBtn = screen.getByRole('button', { name: /excellent/i });
      expect(excellentBtn).toBeInTheDocument();
      
      await user.click(excellentBtn);
    });

    it('allows entering comments', async () => {
      const user = userEvent.setup();
      render(<PromptFeedbackCollector {...defaultProps} variant="inline" />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Great prompt!');
      
      expect(textarea).toHaveValue('Great prompt!');
    });

    it('disables submit button when no rating or effectiveness selected', () => {
      render(<PromptFeedbackCollector {...defaultProps} variant="inline" />);
      
      const submitButton = screen.getByRole('button', { name: /submitFeedback/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('compact variant', () => {
    it('renders thumbs up/down buttons', () => {
      render(<PromptFeedbackCollector {...defaultProps} variant="compact" />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('submits positive quick feedback on thumbs up', async () => {
      const user = userEvent.setup();
      render(<PromptFeedbackCollector {...defaultProps} variant="compact" />);
      
      const thumbsUpBtn = screen.getAllByRole('button')[0];
      await user.click(thumbsUpBtn);
      
      expect(mockRecordFeedback).toHaveBeenCalledWith(
        'template-1',
        expect.objectContaining({ rating: 5, effectiveness: 'good' })
      );
    });

    it('submits negative quick feedback on thumbs down', async () => {
      const user = userEvent.setup();
      render(<PromptFeedbackCollector {...defaultProps} variant="compact" />);
      
      const thumbsDownBtn = screen.getAllByRole('button')[1];
      await user.click(thumbsDownBtn);
      
      expect(mockRecordFeedback).toHaveBeenCalledWith(
        'template-1',
        expect.objectContaining({ rating: 2, effectiveness: 'poor' })
      );
    });
  });

  describe('context display', () => {
    it('displays context badges when provided', () => {
      render(
        <PromptFeedbackCollector
          {...defaultProps}
          variant="inline"
          context={{
            model: 'gpt-4',
            responseTime: 2500,
            outputTokens: 100,
          }}
        />
      );
      
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('2.5s')).toBeInTheDocument();
      expect(screen.getByText('100 tokens')).toBeInTheDocument();
    });
  });

  describe('callback', () => {
    it('calls onFeedbackSubmitted after quick feedback', async () => {
      const onFeedbackSubmitted = jest.fn();
      const user = userEvent.setup();
      
      render(
        <PromptFeedbackCollector
          {...defaultProps}
          variant="compact"
          onFeedbackSubmitted={onFeedbackSubmitted}
        />
      );
      
      await user.click(screen.getAllByRole('button')[0]);
      
      expect(onFeedbackSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'template-1',
          rating: 5,
          effectiveness: 'good',
        })
      );
    });
  });
});
