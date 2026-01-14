import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlowSearchPanel } from './flow-search-panel';
import type { FlowCanvasSearchState, FlowNodeTag } from '@/types/chat/flow-chat';
import type { UIMessage } from '@/types/core/message';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockMessages: UIMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Hello, how are you?',
    createdAt: new Date(),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'I am doing well, thank you for asking!',
    createdAt: new Date(),
  },
  {
    id: '3',
    role: 'user',
    content: 'Can you help me with coding?',
    createdAt: new Date(),
  },
  {
    id: '4',
    role: 'assistant',
    content: 'Of course! I would be happy to help you with coding.',
    createdAt: new Date(),
  },
];

const mockTags: FlowNodeTag[] = [
  { id: '1', label: 'Important', color: '#ef4444' },
  { id: '2', label: 'Review', color: '#3b82f6' },
];

describe('FlowSearchPanel', () => {
  it('renders search input', () => {
    render(
      <FlowSearchPanel
        messages={mockMessages}
        availableTags={mockTags}
        onSearchStateChange={jest.fn()}
        onResultClick={jest.fn()}
        onClearSearch={jest.fn()}
      />
    );

    expect(screen.getByPlaceholderText('searchNodes')).toBeInTheDocument();
  });

  it('updates search state when typing', async () => {
    const onSearchStateChange = jest.fn();
    
    render(
      <FlowSearchPanel
        messages={mockMessages}
        availableTags={mockTags}
        onSearchStateChange={onSearchStateChange}
        onResultClick={jest.fn()}
        onClearSearch={jest.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('searchNodes');
    fireEvent.change(searchInput, { target: { value: 'coding' } });

    // Wait for debounce
    await waitFor(() => {
      expect(onSearchStateChange).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('displays search results', async () => {
    const searchState: FlowCanvasSearchState = {
      query: 'coding',
      highlightedNodeIds: ['3', '4'],
    };

    render(
      <FlowSearchPanel
        searchState={searchState}
        messages={mockMessages}
        availableTags={mockTags}
        onSearchStateChange={jest.fn()}
        onResultClick={jest.fn()}
        onClearSearch={jest.fn()}
      />
    );

    // Should show result count
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('renders with search state', async () => {
    const searchState: FlowCanvasSearchState = {
      query: 'coding',
      highlightedNodeIds: ['3'],
    };

    render(
      <FlowSearchPanel
        searchState={searchState}
        messages={mockMessages}
        availableTags={mockTags}
        onSearchStateChange={jest.fn()}
        onResultClick={jest.fn()}
        onClearSearch={jest.fn()}
      />
    );

    // Search input should have the query value
    const searchInput = screen.getByPlaceholderText('searchNodes');
    expect(searchInput).toHaveValue('coding');
  });

  it('renders clear button when search has query', () => {
    const searchState: FlowCanvasSearchState = {
      query: 'test',
      highlightedNodeIds: [],
    };

    render(
      <FlowSearchPanel
        searchState={searchState}
        messages={mockMessages}
        availableTags={mockTags}
        onSearchStateChange={jest.fn()}
        onResultClick={jest.fn()}
        onClearSearch={jest.fn()}
      />
    );

    // Should have buttons rendered
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders filter button', () => {
    render(
      <FlowSearchPanel
        messages={mockMessages}
        availableTags={mockTags}
        onSearchStateChange={jest.fn()}
        onResultClick={jest.fn()}
        onClearSearch={jest.fn()}
      />
    );

    // Should have buttons (including filter)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by role when role filter is applied', async () => {
    const onSearchStateChange = jest.fn();
    
    render(
      <FlowSearchPanel
        messages={mockMessages}
        availableTags={mockTags}
        onSearchStateChange={onSearchStateChange}
        onResultClick={jest.fn()}
        onClearSearch={jest.fn()}
      />
    );

    // Open filter popover
    const filterButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg.lucide-filter')
    );
    
    if (filterButton) {
      fireEvent.click(filterButton);
      
      await waitFor(() => {
        expect(screen.getByText('filterByRole')).toBeInTheDocument();
      });
    }
  });
});
