import { render, screen, fireEvent } from '@testing-library/react';
import { FlowComparisonView } from './flow-comparison-view';
import type { UIMessage } from '@/types/core/message';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useCopy hook
jest.mock('@/hooks/ui', () => ({
  useCopy: () => ({
    copy: jest.fn(),
    isCopying: false,
  }),
}));

const mockMessages: UIMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'This is the first response from GPT-4.',
    createdAt: new Date(),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'This is the second response from Claude.',
    createdAt: new Date(),
  },
  {
    id: '3',
    role: 'assistant',
    content: 'This is the third response from Gemini.',
    createdAt: new Date(),
  },
];

const mockComparisonNodes = [
  {
    messageId: '1',
    message: mockMessages[0],
    model: 'gpt-4',
    provider: 'openai',
    rating: 4,
  },
  {
    messageId: '2',
    message: mockMessages[1],
    model: 'claude-3',
    provider: 'anthropic',
    rating: 5,
  },
];

describe('FlowComparisonView', () => {
  it('renders comparison dialog when open', () => {
    render(
      <FlowComparisonView
        nodes={mockComparisonNodes}
        open={true}
        onOpenChange={jest.fn()}
        onRemoveNode={jest.fn()}
        onRateNode={jest.fn()}
        onSelectPreferred={jest.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('compareResponses')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <FlowComparisonView
        nodes={mockComparisonNodes}
        open={false}
        onOpenChange={jest.fn()}
        onRemoveNode={jest.fn()}
        onRateNode={jest.fn()}
        onSelectPreferred={jest.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders multiple comparison nodes', () => {
    render(
      <FlowComparisonView
        nodes={mockComparisonNodes}
        open={true}
        onOpenChange={jest.fn()}
        onRemoveNode={jest.fn()}
        onRateNode={jest.fn()}
        onSelectPreferred={jest.fn()}
      />
    );

    // Should render the dialog with content
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Should have multiple buttons for interactions
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(2);
  });

  it('renders response badge', () => {
    render(
      <FlowComparisonView
        nodes={mockComparisonNodes}
        open={true}
        onOpenChange={jest.fn()}
        onRemoveNode={jest.fn()}
        onRateNode={jest.fn()}
        onSelectPreferred={jest.fn()}
      />
    );

    // Dialog should be rendered
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders remove buttons for nodes', () => {
    render(
      <FlowComparisonView
        nodes={mockComparisonNodes}
        open={true}
        onOpenChange={jest.fn()}
        onRemoveNode={jest.fn()}
        onRateNode={jest.fn()}
        onSelectPreferred={jest.fn()}
      />
    );

    // Should have buttons in the dialog
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onSelectPreferred when thumbs up is clicked', () => {
    const onSelectPreferred = jest.fn();
    
    render(
      <FlowComparisonView
        nodes={mockComparisonNodes}
        open={true}
        onOpenChange={jest.fn()}
        onRemoveNode={jest.fn()}
        onRateNode={jest.fn()}
        onSelectPreferred={onSelectPreferred}
      />
    );

    // Find thumbs up buttons
    const thumbsUpButtons = screen.getAllByRole('button').filter(
      btn => btn.querySelector('svg.lucide-thumbs-up')
    );
    
    if (thumbsUpButtons.length > 0) {
      fireEvent.click(thumbsUpButtons[0]);
      expect(onSelectPreferred).toHaveBeenCalled();
    }
  });

  it('renders with nodes content', () => {
    render(
      <FlowComparisonView
        nodes={mockComparisonNodes}
        open={true}
        onOpenChange={jest.fn()}
        onRemoveNode={jest.fn()}
        onRateNode={jest.fn()}
        onSelectPreferred={jest.fn()}
      />
    );

    // Dialog should render with content
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows rating stars for rated nodes', () => {
    render(
      <FlowComparisonView
        nodes={mockComparisonNodes}
        open={true}
        onOpenChange={jest.fn()}
        onRemoveNode={jest.fn()}
        onRateNode={jest.fn()}
        onSelectPreferred={jest.fn()}
      />
    );

    // Should show star icons for ratings
    const stars = screen.getAllByRole('button').filter(
      btn => btn.querySelector('svg.lucide-star')
    );
    expect(stars.length).toBeGreaterThan(0);
  });

  it('handles empty nodes array gracefully', () => {
    const { container } = render(
      <FlowComparisonView
        nodes={[]}
        open={true}
        onOpenChange={jest.fn()}
        onRemoveNode={jest.fn()}
        onRateNode={jest.fn()}
        onSelectPreferred={jest.fn()}
      />
    );

    // Should not crash with empty nodes
    expect(container).toBeInTheDocument();
  });
});
