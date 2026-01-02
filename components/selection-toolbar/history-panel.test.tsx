/**
 * Tests for SelectionHistoryPanel component
 */

import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { SelectionHistoryPanel } from './history-panel';
import { useSelectionStore, SelectionHistoryItem } from '@/stores/context';

// Mock the selection store
jest.mock('@/stores/context', () => ({
  useSelectionStore: jest.fn(),
}));

// Mock the clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock URL and document methods for export
const mockCreateObjectURL = jest.fn(() => 'blob:test-url');
const mockRevokeObjectURL = jest.fn();
Object.assign(URL, {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

const mockUseSelectionStore = useSelectionStore as jest.MockedFunction<typeof useSelectionStore>;

// Sample history items
const mockHistoryItems: SelectionHistoryItem[] = [
  {
    id: '1',
    text: 'First selected text',
    action: 'explain',
    result: 'Explanation of the first text',
    timestamp: Date.now() - 60000, // 1 minute ago
    isFavorite: false,
  },
  {
    id: '2',
    text: 'Second selected text for translation',
    action: 'translate',
    result: 'Translated content here',
    timestamp: Date.now() - 3600000, // 1 hour ago
    isFavorite: true,
  },
  {
    id: '3',
    text: 'Code snippet for explanation',
    action: 'code-explain',
    result: 'This code does X, Y, Z',
    timestamp: Date.now() - 86400000, // 1 day ago
    isFavorite: false,
  },
];

describe('SelectionHistoryPanel', () => {
  const mockClearHistory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectionStore.mockReturnValue({
      history: mockHistoryItems,
      clearHistory: mockClearHistory,
    } as ReturnType<typeof useSelectionStore>);
  });

  describe('closed state', () => {
    it('renders History button when closed', () => {
      render(<SelectionHistoryPanel />);

      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('shows history count badge', () => {
      render(<SelectionHistoryPanel />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('opens panel when History button is clicked', () => {
      render(<SelectionHistoryPanel />);

      const historyButton = screen.getByText('History');
      fireEvent.click(historyButton);

      expect(screen.getByText('Selection History')).toBeInTheDocument();
    });
  });

  describe('open state', () => {
    beforeEach(() => {
      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));
    });

    it('renders panel header', () => {
      expect(screen.getByText('Selection History')).toBeInTheDocument();
      expect(screen.getByText('3 of 3 items')).toBeInTheDocument();
    });

    it('renders search input', () => {
      expect(screen.getByPlaceholderText('Search history...')).toBeInTheDocument();
    });

    it('renders filter button', () => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });

    it('renders all history items', () => {
      expect(screen.getByText('First selected text')).toBeInTheDocument();
      expect(screen.getByText('Second selected text for translation')).toBeInTheDocument();
      expect(screen.getByText('Code snippet for explanation')).toBeInTheDocument();
    });

    it('renders action labels for items', () => {
      expect(screen.getByText('Explained')).toBeInTheDocument();
      expect(screen.getByText('Translated')).toBeInTheDocument();
      expect(screen.getByText('Code Explained')).toBeInTheDocument();
    });

    it('closes panel when close button is clicked', () => {
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.querySelector('svg.lucide-x'));
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton!);

      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.queryByText('Selection History')).not.toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));
    });

    it('filters history by search query', () => {
      const searchInput = screen.getByPlaceholderText('Search history...');
      fireEvent.change(searchInput, { target: { value: 'translation' } });

      expect(screen.getByText('Second selected text for translation')).toBeInTheDocument();
      expect(screen.queryByText('First selected text')).not.toBeInTheDocument();
      expect(screen.queryByText('Code snippet for explanation')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', () => {
      const searchInput = screen.getByPlaceholderText('Search history...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent query' } });

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });
  });

  describe('filter functionality', () => {
    beforeEach(() => {
      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));
    });

    it('shows filter options when filter button is clicked', () => {
      const filterButton = screen.getByText('Filter');
      fireEvent.click(filterButton);

      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('filters by action type', () => {
      const filterButton = screen.getByText('Filter');
      fireEvent.click(filterButton);

      // Click on Translated filter badge (in the filter options, not the item label)
      const translatedBadges = screen.getAllByText('Translated');
      // The filter badge is in the filter options section
      const filterBadge = translatedBadges.find(el => el.closest('[data-slot="badge"]'));
      fireEvent.click(filterBadge!);

      // Should only show translated items
      expect(screen.getByText('Second selected text for translation')).toBeInTheDocument();
      expect(screen.queryByText('First selected text')).not.toBeInTheDocument();
    });
  });

  describe('selection functionality', () => {
    beforeEach(() => {
      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));
    });

    it('shows Select all button', () => {
      expect(screen.getByText('Select all')).toBeInTheDocument();
    });

    it('toggles select all', () => {
      const selectAllButton = screen.getByText('Select all');
      fireEvent.click(selectAllButton);

      expect(screen.getByText('Deselect all')).toBeInTheDocument();
      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });

    it('clears selection when Clear is clicked', () => {
      // Select all first
      fireEvent.click(screen.getByText('Select all'));
      expect(screen.getByText('3 selected')).toBeInTheDocument();

      // Clear selection
      fireEvent.click(screen.getByText('Clear'));
      expect(screen.queryByText('3 selected')).not.toBeInTheDocument();
    });
  });

  describe('history item interactions', () => {
    beforeEach(() => {
      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));
    });

    it('expands item when clicked', () => {
      const firstItem = screen.getByText('First selected text');
      fireEvent.click(firstItem);

      expect(screen.getByText('Explanation of the first text')).toBeInTheDocument();
      expect(screen.getByText('Copy Result')).toBeInTheDocument();
      expect(screen.getByText('Reuse Text')).toBeInTheDocument();
    });

    it('copies result when Copy Result button is clicked', async () => {
      // Expand item
      const firstItem = screen.getByText('First selected text');
      fireEvent.click(firstItem);

      // Copy result
      const copyButton = screen.getByText('Copy Result');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(mockWriteText).toHaveBeenCalledWith('Explanation of the first text');
    });

    it('shows Copied! feedback after copying', async () => {
      // Expand item
      fireEvent.click(screen.getByText('First selected text'));

      // Copy result
      await act(async () => {
        fireEvent.click(screen.getByText('Copy Result'));
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  describe('time formatting', () => {
    it('shows "Just now" for recent items', () => {
      mockUseSelectionStore.mockReturnValue({
        history: [{
          id: '1',
          text: 'Very recent text',
          action: 'explain',
          result: 'Result',
          timestamp: Date.now() - 30000, // 30 seconds ago
        }],
        clearHistory: mockClearHistory,
      } as ReturnType<typeof useSelectionStore>);

      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('shows minutes ago for items within an hour', () => {
      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));

      expect(screen.getByText('1m ago')).toBeInTheDocument();
    });

    it('shows hours ago for items within a day', () => {
      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));

      expect(screen.getByText('1h ago')).toBeInTheDocument();
    });

    it('shows days ago for items within a week', () => {
      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));

      expect(screen.getByText('1d ago')).toBeInTheDocument();
    });
  });

  describe('clear history', () => {
    beforeEach(() => {
      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));
    });

    it('calls clearHistory when clear button is clicked', () => {
      const clearButtons = screen.getAllByRole('button');
      const trashButton = clearButtons.find(btn => btn.querySelector('svg.lucide-trash-2'));
      expect(trashButton).toBeInTheDocument();
      fireEvent.click(trashButton!);

      expect(mockClearHistory).toHaveBeenCalled();
    });
  });

  describe('export functionality', () => {
    beforeEach(() => {
      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));
    });

    it('exports history when download button is clicked', () => {
      const downloadButtons = screen.getAllByRole('button');
      const exportButton = downloadButtons.find(btn => btn.querySelector('svg.lucide-download'));
      expect(exportButton).toBeInTheDocument();

      // Mock createElement and click
      const mockAnchor = document.createElement('a');
      const mockClick = jest.fn();
      mockAnchor.click = mockClick;
      jest.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor);

      fireEvent.click(exportButton!);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no history', () => {
      mockUseSelectionStore.mockReturnValue({
        history: [],
        clearHistory: mockClearHistory,
      } as ReturnType<typeof useSelectionStore>);

      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));

      expect(screen.getByText('No history yet')).toBeInTheDocument();
      expect(screen.getByText('Your selection actions will appear here')).toBeInTheDocument();
    });

    it('does not show badge when history is empty', () => {
      mockUseSelectionStore.mockReturnValue({
        history: [],
        clearHistory: mockClearHistory,
      } as ReturnType<typeof useSelectionStore>);

      render(<SelectionHistoryPanel />);

      // Badge should not be present
      const historyButton = screen.getByText('History').closest('button');
      expect(historyButton).toBeInTheDocument();
      expect(within(historyButton!).queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('item checkbox selection', () => {
    beforeEach(() => {
      render(<SelectionHistoryPanel />);
      fireEvent.click(screen.getByText('History'));
    });

    it('shows checkboxes on hover (tested via checkbox existence)', () => {
      // Checkboxes should be rendered for each item
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(3);
    });
  });
});
