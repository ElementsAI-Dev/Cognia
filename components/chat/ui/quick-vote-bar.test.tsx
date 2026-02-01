/**
 * Tests for QuickVoteBar component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { QuickVoteBar } from './quick-vote-bar';
import type { ArenaModelConfig } from '@/types/chat/multi-model';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      selectWinner: 'Select Winner',
      tie: 'Tie',
    };
    return translations[key] || key;
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Trophy: () => <span data-testid="trophy-icon" />,
  Scale: () => <span data-testid="scale-icon" />,
}));

const createMockModels = (): ArenaModelConfig[] => [
  {
    id: 'model-1',
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    columnIndex: 0,
  },
  {
    id: 'model-2',
    provider: 'anthropic',
    model: 'claude-3',
    displayName: 'Claude 3',
    columnIndex: 1,
  },
];

describe('QuickVoteBar', () => {
  const mockOnVote = jest.fn();
  const mockOnTie = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const models = createMockModels();
      render(<QuickVoteBar models={models} onVote={mockOnVote} onTie={mockOnTie} />);

      // Component renders "Select Winner:" with colon
      expect(screen.getByText('Select Winner:')).toBeInTheDocument();
    });

    it('should render vote buttons for each model', () => {
      const models = createMockModels();
      render(<QuickVoteBar models={models} onVote={mockOnVote} onTie={mockOnTie} />);

      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
      expect(screen.getByText('Claude 3')).toBeInTheDocument();
    });

    it('should render tie button', () => {
      const models = createMockModels();
      render(<QuickVoteBar models={models} onVote={mockOnVote} onTie={mockOnTie} />);

      expect(screen.getByText('Tie')).toBeInTheDocument();
    });

    it('should display column letters for each model', () => {
      const models = createMockModels();
      render(<QuickVoteBar models={models} onVote={mockOnVote} onTie={mockOnTie} />);

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onVote with model id when clicking vote button', () => {
      const models = createMockModels();
      render(<QuickVoteBar models={models} onVote={mockOnVote} onTie={mockOnTie} />);

      const voteButton = screen.getByText('GPT-4o').closest('button')!;
      fireEvent.click(voteButton);

      expect(mockOnVote).toHaveBeenCalledWith('model-1');
    });

    it('should call onTie when clicking tie button', () => {
      const models = createMockModels();
      render(<QuickVoteBar models={models} onVote={mockOnVote} onTie={mockOnTie} />);

      const tieButton = screen.getByText('Tie').closest('button')!;
      fireEvent.click(tieButton);

      expect(mockOnTie).toHaveBeenCalledTimes(1);
    });

    it('should disable all buttons when disabled prop is true', () => {
      const models = createMockModels();
      render(
        <QuickVoteBar
          models={models}
          onVote={mockOnVote}
          onTie={mockOnTie}
          disabled={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      const models = createMockModels();
      const { container } = render(
        <QuickVoteBar
          models={models}
          onVote={mockOnVote}
          onTie={mockOnTie}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('edge cases', () => {
    it('should still render tie button', () => {
      render(<QuickVoteBar models={[]} onVote={mockOnVote} onTie={mockOnTie} />);

      // Should still render tie button
      expect(screen.getByText('Tie')).toBeInTheDocument();
    });

    it('should handle three models', () => {
      const models: ArenaModelConfig[] = [
        { id: '1', provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', columnIndex: 0 },
        { id: '2', provider: 'anthropic', model: 'claude', displayName: 'Claude', columnIndex: 1 },
        { id: '3', provider: 'google', model: 'gemini', displayName: 'Gemini', columnIndex: 2 },
      ];
      render(<QuickVoteBar models={models} onVote={mockOnVote} onTie={mockOnTie} />);

      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
      expect(screen.getByText('Claude')).toBeInTheDocument();
      expect(screen.getByText('Gemini')).toBeInTheDocument();
    });

    it('should handle four models', () => {
      const models: ArenaModelConfig[] = [
        { id: '1', provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', columnIndex: 0 },
        { id: '2', provider: 'anthropic', model: 'claude', displayName: 'Claude', columnIndex: 1 },
        { id: '3', provider: 'google', model: 'gemini', displayName: 'Gemini', columnIndex: 2 },
        { id: '4', provider: 'deepseek', model: 'deepseek', displayName: 'DeepSeek', columnIndex: 3 },
      ];
      render(<QuickVoteBar models={models} onVote={mockOnVote} onTie={mockOnTie} />);

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
    });
  });
});
