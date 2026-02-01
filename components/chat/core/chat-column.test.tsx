/**
 * Tests for ChatColumn component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ChatColumn } from './chat-column';
import type {
  ArenaModelConfig,
  ColumnMessageState,
  MultiModelMessage,
} from '@/types/chat/multi-model';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      waitingForMessage: 'Waiting for message...',
      selectModel: `Select ${params?.name || ''}`,
    };
    return translations[key] || key;
  },
}));

// Mock ColumnHeader component
jest.mock('../ui/column-header', () => ({
  ColumnHeader: ({ model, isWinner }: { model: ArenaModelConfig; isWinner?: boolean }) => (
    <div data-testid="column-header">
      <span>{model.displayName}</span>
      {isWinner && <span data-testid="winner-badge">Winner</span>}
    </div>
  ),
}));

// Mock MarkdownRenderer component
jest.mock('../utils', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}));

// Mock ScrollArea
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

const createMockModel = (overrides?: Partial<ArenaModelConfig>): ArenaModelConfig => ({
  id: 'model-1',
  provider: 'openai',
  model: 'gpt-4o',
  displayName: 'GPT-4o',
  columnIndex: 0,
  ...overrides,
});

const createMockMessage = (overrides?: Partial<MultiModelMessage>): MultiModelMessage => ({
  id: 'msg-1',
  userContent: 'Test user message',
  columns: [
    {
      modelId: 'model-1',
      status: 'completed',
      content: 'Test response from model 1',
    },
    {
      modelId: 'model-2',
      status: 'completed',
      content: 'Test response from model 2',
    },
  ],
  createdAt: new Date(),
  ...overrides,
});

const createMockState = (overrides?: Partial<ColumnMessageState>): ColumnMessageState => ({
  modelId: 'model-1',
  status: 'completed',
  content: 'Current streaming content',
  ...overrides,
});

describe('ChatColumn', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const model = createMockModel();
      render(<ChatColumn model={model} messages={[]} />);

      expect(screen.getByTestId('column-header')).toBeInTheDocument();
    });

    it('should render ColumnHeader with model info', () => {
      const model = createMockModel({ displayName: 'Test Model' });
      render(<ChatColumn model={model} messages={[]} />);

      expect(screen.getByText('Test Model')).toBeInTheDocument();
    });

    it('should show empty state when no messages', () => {
      const model = createMockModel();
      render(<ChatColumn model={model} messages={[]} />);

      expect(screen.getByText('Waiting for message...')).toBeInTheDocument();
    });

    it('should render user message content', () => {
      const model = createMockModel();
      const message = createMockMessage({ userContent: 'Hello, AI!' });
      render(<ChatColumn model={model} messages={[message]} />);

      expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
    });

    it('should render model response content', () => {
      const model = createMockModel();
      const message = createMockMessage();
      render(<ChatColumn model={model} messages={[message]} />);

      expect(screen.getByText('Test response from model 1')).toBeInTheDocument();
    });

    it('should not show empty state when messages exist', () => {
      const model = createMockModel();
      const message = createMockMessage();
      render(<ChatColumn model={model} messages={[message]} />);

      expect(screen.queryByText('Waiting for message...')).not.toBeInTheDocument();
    });
  });

  describe('winner state', () => {
    it('should show winner badge when isWinner is true', () => {
      const model = createMockModel();
      render(<ChatColumn model={model} messages={[]} isWinner={true} />);

      expect(screen.getByTestId('winner-badge')).toBeInTheDocument();
    });

    it('should not show winner badge when isWinner is false', () => {
      const model = createMockModel();
      render(<ChatColumn model={model} messages={[]} isWinner={false} />);

      expect(screen.queryByTestId('winner-badge')).not.toBeInTheDocument();
    });

    it('should apply winner ring styling', () => {
      const model = createMockModel();
      const { container } = render(
        <ChatColumn model={model} messages={[]} isWinner={true} />
      );

      expect(container.firstChild).toHaveClass('ring-2');
      expect(container.firstChild).toHaveClass('ring-primary');
    });
  });

  describe('error handling', () => {
    it('should display error message when column status is error', () => {
      const model = createMockModel();
      const message = createMockMessage({
        columns: [
          {
            modelId: 'model-1',
            status: 'error',
            content: '',
            error: 'API error occurred',
          },
        ],
      });
      render(<ChatColumn model={model} messages={[message]} />);

      expect(screen.getByText('API error occurred')).toBeInTheDocument();
    });
  });

  describe('voting indicators', () => {
    it('should highlight voted response', () => {
      const model = createMockModel();
      const message = createMockMessage({ votedModelId: 'model-1' });
      const { container } = render(<ChatColumn model={model} messages={[message]} />);

      // Check for voted styling class
      const responseDiv = container.querySelector('.bg-primary\\/5');
      expect(responseDiv).toBeInTheDocument();
    });

    it('should show tie styling when isTie is true', () => {
      const model = createMockModel();
      const message = createMockMessage({ isTie: true });
      const { container } = render(<ChatColumn model={model} messages={[message]} />);

      const responseDiv = container.querySelector('.bg-muted\\/30');
      expect(responseDiv).toBeInTheDocument();
    });
  });

  describe('selection button', () => {
    it('should show selection button when onSelect is provided', () => {
      const model = createMockModel({ displayName: 'Test Model' });
      const onSelect = jest.fn();
      render(<ChatColumn model={model} messages={[]} onSelect={onSelect} />);

      expect(screen.getByText('Select Test Model')).toBeInTheDocument();
    });

    it('should not show selection button when onSelect is not provided', () => {
      const model = createMockModel({ displayName: 'Test Model' });
      render(<ChatColumn model={model} messages={[]} />);

      expect(screen.queryByText(/Select/)).not.toBeInTheDocument();
    });

    it('should call onSelect when selection button is clicked', () => {
      const model = createMockModel({ displayName: 'Test Model' });
      const onSelect = jest.fn();
      render(<ChatColumn model={model} messages={[]} onSelect={onSelect} />);

      const selectButton = screen.getByText('Select Test Model');
      fireEvent.click(selectButton);

      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('streaming state', () => {
    it('should show streaming content', () => {
      const model = createMockModel();
      const currentState = createMockState({
        status: 'streaming',
        content: 'Streaming text...',
      });
      render(
        <ChatColumn model={model} messages={[]} currentState={currentState} />
      );

      expect(screen.getByText('Streaming text...')).toBeInTheDocument();
    });

    it('should not show empty state when streaming', () => {
      const model = createMockModel();
      const currentState = createMockState({
        status: 'streaming',
        content: 'Streaming...',
      });
      render(
        <ChatColumn model={model} messages={[]} currentState={currentState} />
      );

      expect(screen.queryByText('Waiting for message...')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      const model = createMockModel();
      const { container } = render(
        <ChatColumn model={model} messages={[]} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('multiple messages', () => {
    it('should render multiple messages', () => {
      const model = createMockModel();
      const messages = [
        createMockMessage({ id: 'msg-1', userContent: 'First question' }),
        createMockMessage({ id: 'msg-2', userContent: 'Second question' }),
      ];
      render(<ChatColumn model={model} messages={messages} />);

      expect(screen.getByText('First question')).toBeInTheDocument();
      expect(screen.getByText('Second question')).toBeInTheDocument();
    });
  });
});
