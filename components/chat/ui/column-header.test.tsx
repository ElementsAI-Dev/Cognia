/**
 * Tests for ColumnHeader component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ColumnHeader } from './column-header';
import type { ArenaModelConfig, ColumnMessageState } from '@/types/chat/multi-model';

// Mock TooltipProvider
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip-content">{children}</span>
  ),
  TooltipTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <span data-testid="tooltip-trigger">{children}</span>
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

const createMockState = (overrides?: Partial<ColumnMessageState>): ColumnMessageState => ({
  modelId: 'model-1',
  status: 'completed',
  content: 'Test response',
  metrics: {
    latencyMs: 1500,
    tokenCount: { input: 10, output: 20, total: 30 },
  },
  ...overrides,
});

describe('ColumnHeader', () => {
  describe('rendering', () => {
    it('should render model display name', () => {
      const model = createMockModel();
      render(<ColumnHeader model={model} />);

      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    });

    it('should render column letter badge', () => {
      const model = createMockModel({ columnIndex: 0 });
      render(<ColumnHeader model={model} />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should render correct column letter for different indices', () => {
      const model = createMockModel({ columnIndex: 2 });
      render(<ColumnHeader model={model} />);

      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('should show Winner badge when isWinner is true', () => {
      const model = createMockModel();
      render(<ColumnHeader model={model} isWinner={true} />);

      expect(screen.getByText('Winner')).toBeInTheDocument();
    });

    it('should not show Winner badge when isWinner is false', () => {
      const model = createMockModel();
      render(<ColumnHeader model={model} isWinner={false} />);

      expect(screen.queryByText('Winner')).not.toBeInTheDocument();
    });
  });

  describe('status indicators', () => {
    it('should show streaming indicator when status is streaming', () => {
      const model = createMockModel();
      const state = createMockState({ status: 'streaming' });
      render(<ColumnHeader model={model} state={state} />);

      // Check for streaming tooltip content
      const tooltipContents = screen.getAllByTestId('tooltip-content');
      expect(tooltipContents.some((el) => el.textContent === 'Streaming...')).toBe(true);
    });

    it('should show completed indicator when status is completed', () => {
      const model = createMockModel();
      const state = createMockState({ status: 'completed' });
      render(<ColumnHeader model={model} state={state} />);

      const tooltipContents = screen.getAllByTestId('tooltip-content');
      expect(tooltipContents.some((el) => el.textContent === 'Completed')).toBe(true);
    });

    it('should show error indicator when status is error', () => {
      const model = createMockModel();
      const state = createMockState({ status: 'error', error: 'Test error message' });
      render(<ColumnHeader model={model} state={state} />);

      const tooltipContents = screen.getAllByTestId('tooltip-content');
      expect(tooltipContents.some((el) => el.textContent === 'Test error message')).toBe(true);
    });

    it('should not show status indicator when status is pending', () => {
      const model = createMockModel();
      const state = createMockState({ status: 'pending' });
      render(<ColumnHeader model={model} state={state} />);

      // Pending status should not show streaming/completed/error indicators
      const tooltipContents = screen.queryAllByTestId('tooltip-content');
      // Either no tooltips, or none with status-related content
      const hasStreamingTooltip = tooltipContents.some((el) => el.textContent === 'Streaming...');
      const hasCompletedTooltip = tooltipContents.some((el) => el.textContent === 'Completed');
      expect(hasStreamingTooltip).toBe(false);
      expect(hasCompletedTooltip).toBe(false);
    });
  });

  describe('metrics display', () => {
    it('should show latency when status is completed and showMetrics is true', () => {
      const model = createMockModel();
      const state = createMockState({
        status: 'completed',
        metrics: { latencyMs: 2500, tokenCount: { input: 10, output: 20, total: 30 } },
      });
      render(<ColumnHeader model={model} state={state} showMetrics={true} />);

      expect(screen.getByText('2.5s')).toBeInTheDocument();
    });

    it('should show token count when status is completed', () => {
      const model = createMockModel();
      const state = createMockState({
        status: 'completed',
        metrics: { latencyMs: 1000, tokenCount: { input: 10, output: 20, total: 30 } },
      });
      render(<ColumnHeader model={model} state={state} showMetrics={true} />);

      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('should not show metrics when showMetrics is false', () => {
      const model = createMockModel();
      const state = createMockState({
        status: 'completed',
        metrics: { latencyMs: 1500, tokenCount: { input: 10, output: 20, total: 30 } },
      });
      render(<ColumnHeader model={model} state={state} showMetrics={false} />);

      expect(screen.queryByText('1.5s')).not.toBeInTheDocument();
      expect(screen.queryByText('30')).not.toBeInTheDocument();
    });

    it('should not show metrics when status is not completed', () => {
      const model = createMockModel();
      const state = createMockState({
        status: 'streaming',
        metrics: { latencyMs: 1500, tokenCount: { input: 10, output: 20, total: 30 } },
      });
      render(<ColumnHeader model={model} state={state} showMetrics={true} />);

      expect(screen.queryByText('1.5s')).not.toBeInTheDocument();
    });

    it('should show estimated cost when available', () => {
      const model = createMockModel();
      const state = createMockState({
        status: 'completed',
        metrics: {
          latencyMs: 1000,
          tokenCount: { input: 10, output: 20, total: 30 },
          estimatedCost: 0.0025,
        },
      });
      render(<ColumnHeader model={model} state={state} showMetrics={true} />);

      expect(screen.getByText('$0.0025')).toBeInTheDocument();
    });
  });

  describe('remove button', () => {
    it('should show remove button when onRemove is provided', () => {
      const model = createMockModel();
      const onRemove = jest.fn();
      render(<ColumnHeader model={model} onRemove={onRemove} />);

      const tooltipContents = screen.getAllByTestId('tooltip-content');
      expect(tooltipContents.some((el) => el.textContent === 'Remove model')).toBe(true);
    });

    it('should call onRemove when remove button is clicked', () => {
      const model = createMockModel();
      const onRemove = jest.fn();
      render(<ColumnHeader model={model} onRemove={onRemove} />);

      const removeButton = screen.getByRole('button');
      fireEvent.click(removeButton);

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('should not show remove button when onRemove is not provided', () => {
      const model = createMockModel();
      render(<ColumnHeader model={model} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply compact styling when compact is true', () => {
      const model = createMockModel();
      render(<ColumnHeader model={model} compact={true} />);

      const modelName = screen.getByText('GPT-4o');
      expect(modelName).toHaveClass('text-xs');
    });

    it('should apply normal styling when compact is false', () => {
      const model = createMockModel();
      render(<ColumnHeader model={model} compact={false} />);

      const modelName = screen.getByText('GPT-4o');
      expect(modelName).toHaveClass('text-sm');
    });

    it('should apply winner styling when isWinner is true', () => {
      const model = createMockModel();
      const { container } = render(<ColumnHeader model={model} isWinner={true} />);

      expect(container.firstChild).toHaveClass('bg-primary/10');
    });
  });

  describe('provider colors', () => {
    it('should apply OpenAI color for openai provider', () => {
      const model = createMockModel({ provider: 'openai' });
      const { container } = render(<ColumnHeader model={model} />);

      expect(container.firstChild).toHaveClass('border-green-500/50');
    });

    it('should apply Anthropic color for anthropic provider', () => {
      const model = createMockModel({ provider: 'anthropic' });
      const { container } = render(<ColumnHeader model={model} />);

      expect(container.firstChild).toHaveClass('border-orange-500/50');
    });

    it('should apply Google color for google provider', () => {
      const model = createMockModel({ provider: 'google' });
      const { container } = render(<ColumnHeader model={model} />);

      expect(container.firstChild).toHaveClass('border-blue-500/50');
    });
  });
});
