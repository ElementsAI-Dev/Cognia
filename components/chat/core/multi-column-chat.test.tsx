/**
 * Tests for MultiColumnChat component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MultiColumnChat } from './multi-column-chat';
import type { ArenaModelConfig } from '@/types/chat/multi-model';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      selectAtLeast2Models: 'Select at least 2 models',
      selectModelsToStart: 'Select models to start',
      typeMessagePlaceholder: 'Type a message...',
    };
    return translations[key] || key;
  },
}));

// Mock stores
jest.mock('@/stores/arena', () => ({
  useArenaStore: jest.fn((selector) => {
    const state = {
      createBattle: jest.fn(() => ({
        id: 'battle-1',
        contestants: [
          { id: 'c1', provider: 'openai', model: 'gpt-4o' },
          { id: 'c2', provider: 'anthropic', model: 'claude-3' },
        ],
      })),
      selectWinner: jest.fn(),
      declareTie: jest.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Mock useMultiModelChat hook
jest.mock('@/hooks/chat/use-multi-model-chat', () => ({
  useMultiModelChat: jest.fn(() => ({
    isExecuting: false,
    columnStates: {},
    sendToAllModels: jest.fn(),
    cancelAll: jest.fn(),
  })),
}));

// Mock child components
jest.mock('./chat-column', () => ({
  ChatColumn: ({ model }: { model: ArenaModelConfig }) => (
    <div data-testid={`chat-column-${model.id}`}>{model.displayName}</div>
  ),
}));

jest.mock('../ui/quick-vote-bar', () => ({
  QuickVoteBar: ({
    onVote,
    onTie,
  }: {
    onVote: (id: string) => void;
    onTie: () => void;
  }) => (
    <div data-testid="quick-vote-bar">
      <button onClick={() => onVote('model-1')}>Vote Model 1</button>
      <button onClick={() => onTie()}>Tie</button>
    </div>
  ),
}));

jest.mock('../selectors/multi-model-selector', () => ({
  MultiModelSelector: ({
    models,
    onModelsChange,
  }: {
    models: ArenaModelConfig[];
    onModelsChange: (models: ArenaModelConfig[]) => void;
  }) => (
    <div data-testid="multi-model-selector">
      <span>{models.length} models selected</span>
      <button onClick={() => onModelsChange([])}>Clear</button>
    </div>
  ),
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

describe('MultiColumnChat', () => {
  const mockOnModelsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const models = createMockModels();
      render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
        />
      );

      expect(screen.getByTestId('multi-model-selector')).toBeInTheDocument();
    });

    it('should render model selector', () => {
      const models = createMockModels();
      render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
        />
      );

      expect(screen.getByText('2 models selected')).toBeInTheDocument();
    });

    it('should render chat columns for each model', () => {
      const models = createMockModels();
      render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
        />
      );

      expect(screen.getByTestId('chat-column-model-1')).toBeInTheDocument();
      expect(screen.getByTestId('chat-column-model-2')).toBeInTheDocument();
    });

    it('should render input area', () => {
      const models = createMockModels();
      render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
        />
      );

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('should show warning when less than 2 models selected', () => {
      const models: ArenaModelConfig[] = [
        {
          id: 'model-1',
          provider: 'openai',
          model: 'gpt-4o',
          displayName: 'GPT-4o',
          columnIndex: 0,
        },
      ];
      render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
        />
      );

      expect(screen.getByText('Select at least 2 models')).toBeInTheDocument();
    });

    it('should show empty state when no models selected', () => {
      render(
        <MultiColumnChat
          sessionId="session-1"
          models={[]}
          onModelsChange={mockOnModelsChange}
        />
      );

      expect(screen.getByText('Select models to start')).toBeInTheDocument();
    });
  });

  describe('input interactions', () => {
    it('should update input value when typing', () => {
      const models = createMockModels();
      render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
        />
      );

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(textarea, { target: { value: 'Hello AI!' } });

      expect(textarea).toHaveValue('Hello AI!');
    });

    it('should have send button', () => {
      const models = createMockModels();
      const { container } = render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
        />
      );

      // Look for button with send icon (icon button without accessible name)
      const buttons = container.querySelectorAll('button');
      // Should have at least 2 buttons (Clear and Send)
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should disable send button when input is empty', () => {
      const models = createMockModels();
      const { container } = render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
        />
      );

      // Find the send button (last button in the input area)
      const buttons = container.querySelectorAll('button');
      const sendButton = buttons[buttons.length - 1];
      expect(sendButton).toBeDisabled();
    });
  });

  describe('model selection', () => {
    it('should call onModelsChange when clearing models', () => {
      const models = createMockModels();
      render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
        />
      );

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(mockOnModelsChange).toHaveBeenCalledWith([]);
    });
  });

  describe('grid layout', () => {
    it('should render columns in a grid', () => {
      const models = createMockModels();
      const { container } = render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
        />
      );

      // Check for grid container
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      const models = createMockModels();
      const { container } = render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('system prompt', () => {
    it('should accept systemPrompt prop', () => {
      const models = createMockModels();

      // Should render without error when systemPrompt is provided
      const { container } = render(
        <MultiColumnChat
          sessionId="session-1"
          models={models}
          onModelsChange={mockOnModelsChange}
          systemPrompt="You are a helpful assistant."
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
