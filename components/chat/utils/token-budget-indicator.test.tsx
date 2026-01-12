/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  TokenBudgetIndicator,
  TokenBudgetBadge,
  TokenIndicatorInline,
} from './token-budget-indicator';
import type { UIMessage } from '@/types';

// Mock the tokenizer module
jest.mock('@/lib/ai/tokenizer', () => ({
  estimateTokensFast: jest.fn((content: string) => {
    if (!content || content.length === 0) return 0;
    return Math.ceil((content.length / 4) * 1.1);
  }),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('TokenBudgetIndicator', () => {
  const createMessage = (role: 'user' | 'assistant', content: string): UIMessage => ({
    id: `msg-${Math.random()}`,
    role,
    content,
    createdAt: new Date(),
    parts: [],
    attachments: [],
  });

  const mockMessages: UIMessage[] = [
    createMessage('user', 'Hello, how are you?'),
    createMessage('assistant', 'I am doing well, thank you!'),
  ];

  describe('TokenBudgetIndicator component', () => {
    it('renders without crashing', () => {
      render(<TokenBudgetIndicator messages={mockMessages} model="gpt-4o" />);
      expect(screen.getByText('tokenBudget')).toBeInTheDocument();
    });

    it('displays token counts', () => {
      render(<TokenBudgetIndicator messages={mockMessages} model="gpt-4o" />);
      // Should show some token counts
      expect(screen.getByText(/remaining/)).toBeInTheDocument();
    });

    it('shows breakdown sections', () => {
      render(<TokenBudgetIndicator messages={mockMessages} model="gpt-4o" />);
      expect(screen.getByText('system')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('assistant')).toBeInTheDocument();
    });

    it('renders in compact mode', () => {
      const { container } = render(
        <TokenBudgetIndicator messages={mockMessages} model="gpt-4o" compact />
      );
      // Compact mode should not show the full card
      expect(container.querySelector('.rounded-lg')).not.toBeInTheDocument();
    });

    it('shows cost when showCost is true', () => {
      render(
        <TokenBudgetIndicator messages={mockMessages} model="gpt-4o" showCost />
      );
      expect(screen.getByText('estimatedCost')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <TokenBudgetIndicator
          messages={mockMessages}
          model="gpt-4o"
          className="custom-class"
        />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('TokenBudgetBadge component', () => {
    it('renders without crashing', () => {
      render(<TokenBudgetBadge messages={mockMessages} model="gpt-4o" />);
    });

    it('displays token count in badge format', () => {
      render(<TokenBudgetBadge messages={mockMessages} model="gpt-4o" />);
      // Should show token counts with separator
      expect(screen.getByText(/\//)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <TokenBudgetBadge
          messages={mockMessages}
          model="gpt-4o"
          className="custom-badge"
        />
      );
      expect(container.querySelector('.custom-badge')).toBeInTheDocument();
    });
  });

  describe('TokenIndicatorInline component', () => {
    it('renders token counts', () => {
      render(<TokenIndicatorInline usedTokens={1000} maxTokens={10000} />);
      expect(screen.getByText('1.0K')).toBeInTheDocument();
      expect(screen.getByText('10.0K')).toBeInTheDocument();
    });

    it('shows healthy status color for low usage', () => {
      const { container } = render(
        <TokenIndicatorInline usedTokens={100} maxTokens={10000} />
      );
      expect(container.querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('shows warning status color at 75%+', () => {
      const { container } = render(
        <TokenIndicatorInline usedTokens={8000} maxTokens={10000} />
      );
      expect(container.querySelector('.text-yellow-500')).toBeInTheDocument();
    });

    it('shows danger status color at 90%+', () => {
      const { container } = render(
        <TokenIndicatorInline usedTokens={9500} maxTokens={10000} />
      );
      expect(container.querySelector('.text-orange-500')).toBeInTheDocument();
    });

    it('shows exceeded status color at 100%+', () => {
      const { container } = render(
        <TokenIndicatorInline usedTokens={11000} maxTokens={10000} />
      );
      expect(container.querySelector('.text-red-500')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <TokenIndicatorInline
          usedTokens={1000}
          maxTokens={10000}
          className="custom-inline"
        />
      );
      expect(container.querySelector('.custom-inline')).toBeInTheDocument();
    });
  });
});
