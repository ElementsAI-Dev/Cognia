/**
 * Tests for ArenaChatView component
 * Updated for chat-first layout (no tabs, inline battle, bottom input area)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaChatView } from './arena-chat-view';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Chat Arena',
      description: 'Compare responses from multiple AI models',
      blindMode: 'Blind Mode',
      advancedOptions: 'Advanced Options',
      promptPlaceholder: 'Enter a prompt to compare...',
      selectAtLeast2Models: 'Select at least 2 models',
      'leaderboard.title': 'Leaderboard',
    };
    return translations[key] || key;
  },
}));

// Mock arena store
const mockBattles = [
  {
    id: 'battle-1',
    prompt: 'Test prompt for battle 1',
    mode: 'blind',
    contestants: [
      { id: 'c1', provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', status: 'completed', response: 'Response A' },
      { id: 'c2', provider: 'anthropic', model: 'claude-3', displayName: 'Claude 3', status: 'completed', response: 'Response B' },
    ],
    winnerId: 'c1',
    isTie: false,
    isBothBad: false,
  },
];

jest.mock('@/stores/arena', () => ({
  useArenaStore: jest.fn((selector) => {
    const state = {
      battles: mockBattles,
      activeBattleId: null,
      setActiveBattle: jest.fn(),
      modelRatings: [],
      getRecommendedMatchup: () => null,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Mock useArena hook
jest.mock('@/hooks/arena', () => ({
  useArena: () => ({
    isExecuting: false,
    startBattle: jest.fn(),
    getAvailableModels: () => [
      { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
      { provider: 'anthropic', model: 'claude-3', displayName: 'Claude 3' },
    ],
  }),
}));

// Mock child components
jest.mock('./arena-inline-battle', () => ({
  ArenaInlineBattle: ({ battleId }: { battleId: string }) => (
    <div data-testid="arena-inline-battle">{battleId}</div>
  ),
}));

jest.mock('./arena-dialog', () => ({
  ArenaDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="arena-dialog">Dialog</div> : null,
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

describe('ArenaChatView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the component with header', () => {
      render(<ArenaChatView />);

      expect(screen.getByText('Chat Arena')).toBeInTheDocument();
    });

    it('does not render tabs (removed in chat-first layout)', () => {
      render(<ArenaChatView />);

      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('renders bottom input area with textarea', () => {
      render(<ArenaChatView />);

      expect(screen.getByPlaceholderText('Enter a prompt to compare...')).toBeInTheDocument();
    });

    it('renders advanced options button', () => {
      render(<ArenaChatView />);

      expect(screen.getByText('Advanced Options')).toBeInTheDocument();
    });

    it('renders analytics link to /arena', () => {
      render(<ArenaChatView />);

      const link = document.querySelector('a[href="/arena"]');
      expect(link).toBeInTheDocument();
    });

    it('shows recent completed battles inline', () => {
      render(<ArenaChatView />);

      expect(screen.getByTestId('arena-inline-battle')).toBeInTheDocument();
    });
  });

  describe('battle interactions', () => {
    it('opens arena dialog when advanced options button is clicked', () => {
      render(<ArenaChatView />);

      fireEvent.click(screen.getByText('Advanced Options'));

      expect(screen.getByTestId('arena-dialog')).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('accepts sessionId prop', () => {
      render(<ArenaChatView sessionId="test-session" />);

      expect(screen.getByText('Chat Arena')).toBeInTheDocument();
    });

    it('accepts systemPrompt prop', () => {
      render(<ArenaChatView systemPrompt="You are a helpful assistant" />);

      expect(screen.getByText('Chat Arena')).toBeInTheDocument();
    });

    it('accepts initialPrompt prop and shows it in textarea', () => {
      render(<ArenaChatView initialPrompt="Test prompt" />);

      const textarea = screen.getByPlaceholderText('Enter a prompt to compare...');
      expect(textarea).toHaveValue('Test prompt');
    });

    it('accepts className prop', () => {
      const { container } = render(<ArenaChatView className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('responsive design', () => {
    it('renders with responsive classes', () => {
      const { container } = render(<ArenaChatView />);

      const header = container.querySelector('.px-3');
      expect(header).toBeInTheDocument();
    });
  });
});
