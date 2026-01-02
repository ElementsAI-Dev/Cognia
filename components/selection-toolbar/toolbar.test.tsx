/**
 * Tests for SelectionToolbar component
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { SelectionToolbar } from './toolbar';
import { useSelectionToolbar } from '@/hooks/ui';
import { useSelectionStore } from '@/stores/selection-store';

// Mock the hooks
jest.mock('@/hooks/use-selection-toolbar', () => ({
  useSelectionToolbar: jest.fn(),
}));

jest.mock('@/stores/selection-store', () => ({
  useSelectionStore: jest.fn(),
}));

// Mock the tooltip component
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the popover component
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => <div data-open={open}>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
}));

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
    readText: jest.fn().mockResolvedValue('clipboard text'),
  },
});

const mockUseSelectionToolbar = useSelectionToolbar as jest.MockedFunction<typeof useSelectionToolbar>;
const mockUseSelectionStore = useSelectionStore as jest.MockedFunction<typeof useSelectionStore>;

describe('SelectionToolbar', () => {
  const mockExecuteAction = jest.fn();
  const mockCopyResult = jest.fn();
  const mockClearResult = jest.fn();
  const mockHideToolbar = jest.fn();
  const mockToggleMultiSelectMode = jest.fn();
  const mockAddSelection = jest.fn();
  const mockRemoveSelection = jest.fn();
  const mockClearSelections = jest.fn();
  const mockAddReference = jest.fn();
  const mockRemoveReference = jest.fn();
  const mockClearReferences = jest.fn();
  const mockGetCombinedText = jest.fn().mockReturnValue('combined text');

  const defaultToolbarState = {
    isVisible: true,
    selectedText: 'Test selected text',
    position: { x: 100, y: 100 },
    isLoading: false,
    activeAction: null,
    result: null,
    error: null,
    streamingResult: null,
    isStreaming: false,
    showMoreMenu: false,
    selectionMode: 'auto' as const,
    textType: null,
    selections: [],
    isMultiSelectMode: false,
    references: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelectionToolbar.mockReturnValue({
      state: defaultToolbarState,
      executeAction: mockExecuteAction,
      copyResult: mockCopyResult,
      clearResult: mockClearResult,
      hideToolbar: mockHideToolbar,
      config: {
        enabled: true,
        triggerMode: 'auto',
        minTextLength: 1,
        maxTextLength: 5000,
        delayMs: 200,
        targetLanguage: 'zh-CN',
        excludedApps: [],
        theme: 'glass',
        position: 'cursor',
        showShortcuts: true,
        enableStreaming: true,
        autoHideDelay: 0,
        pinnedActions: ['explain', 'translate', 'summarize', 'copy', 'send-to-chat'],
        customShortcuts: {} as Record<string, string>,
      },
      retryAction: jest.fn(),
      showToolbar: jest.fn(),
      setSelectionMode: jest.fn(),
      provideFeedback: jest.fn(),
      sendResultToChat: jest.fn(),
      stop: jest.fn(),
    });

    mockUseSelectionStore.mockReturnValue({
      selections: [],
      isMultiSelectMode: false,
      references: [],
      toggleMultiSelectMode: mockToggleMultiSelectMode,
      addSelection: mockAddSelection,
      removeSelection: mockRemoveSelection,
      clearSelections: mockClearSelections,
      addReference: mockAddReference,
      removeReference: mockRemoveReference,
      clearReferences: mockClearReferences,
      getCombinedText: mockGetCombinedText,
    } as unknown as ReturnType<typeof useSelectionStore>);
  });

  describe('rendering', () => {
    it('renders the toolbar container', () => {
      render(<SelectionToolbar />);
      expect(screen.getByRole('button', { name: 'Explain' })).toBeInTheDocument();
    });

    it('renders primary action buttons', () => {
      render(<SelectionToolbar />);

      expect(screen.getByRole('button', { name: 'Explain' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Translate' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Summarize' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send to Chat' })).toBeInTheDocument();
    });

    it('renders selection mode button', () => {
      render(<SelectionToolbar />);
      expect(screen.getByRole('button', { name: 'Selection Mode' })).toBeInTheDocument();
    });

    it('renders multi-select button', () => {
      render(<SelectionToolbar />);
      expect(screen.getByRole('button', { name: 'Multi-Select' })).toBeInTheDocument();
    });

    it('renders add reference button', () => {
      render(<SelectionToolbar />);
      expect(screen.getByRole('button', { name: 'Add Reference' })).toBeInTheDocument();
    });

    it('renders more actions button', () => {
      render(<SelectionToolbar />);
      expect(screen.getByRole('button', { name: 'More Actions' })).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<SelectionToolbar />);
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('calls executeAction when Explain is clicked', async () => {
      render(<SelectionToolbar />);

      const explainButton = screen.getByRole('button', { name: 'Explain' });
      await act(async () => {
        fireEvent.click(explainButton);
      });

      expect(mockExecuteAction).toHaveBeenCalledWith('explain');
    });

    it('calls executeAction when Translate is clicked', async () => {
      render(<SelectionToolbar />);

      const translateButton = screen.getByRole('button', { name: 'Translate' });
      await act(async () => {
        fireEvent.click(translateButton);
      });

      expect(mockExecuteAction).toHaveBeenCalledWith('translate');
    });

    it('calls executeAction when Summarize is clicked', async () => {
      render(<SelectionToolbar />);

      const summarizeButton = screen.getByRole('button', { name: 'Summarize' });
      await act(async () => {
        fireEvent.click(summarizeButton);
      });

      expect(mockExecuteAction).toHaveBeenCalledWith('summarize');
    });

    it('copies text when Copy is clicked', async () => {
      render(<SelectionToolbar />);

      const copyButton = screen.getByRole('button', { name: 'Copy' });
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(mockWriteText).toHaveBeenCalledWith('Test selected text');
      expect(mockHideToolbar).toHaveBeenCalled();
    });

    it('hides toolbar when Close is clicked', async () => {
      render(<SelectionToolbar />);

      const closeButton = screen.getByRole('button', { name: 'Close' });
      await act(async () => {
        fireEvent.click(closeButton);
      });

      expect(mockHideToolbar).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('shows loading state for active action', () => {
      mockUseSelectionToolbar.mockReturnValue({
        ...mockUseSelectionToolbar(),
        state: {
          ...defaultToolbarState,
          isLoading: true,
          activeAction: 'explain',
        },
      });

      render(<SelectionToolbar />);

      const explainButton = screen.getByRole('button', { name: 'Explain' });
      expect(explainButton).toHaveClass('cursor-wait');
    });

    it('disables buttons when loading', () => {
      mockUseSelectionToolbar.mockReturnValue({
        ...mockUseSelectionToolbar(),
        state: {
          ...defaultToolbarState,
          isLoading: true,
          activeAction: 'explain',
        },
      });

      render(<SelectionToolbar />);

      const translateButton = screen.getByRole('button', { name: 'Translate' });
      expect(translateButton).toBeDisabled();
    });
  });

  describe('multi-select mode', () => {
    it('shows multi-select badge when selections exist', () => {
      mockUseSelectionStore.mockReturnValue({
        ...mockUseSelectionStore(),
        selections: [
          { id: '1', text: 'First selection', position: { x: 0, y: 0 }, timestamp: Date.now() },
          { id: '2', text: 'Second selection', position: { x: 0, y: 0 }, timestamp: Date.now() },
        ],
        isMultiSelectMode: true,
      } as unknown as ReturnType<typeof useSelectionStore>);

      render(<SelectionToolbar />);

      // Multiple elements may show "2", just verify at least one exists
      const badges = screen.getAllByText('2');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('toggles multi-select mode when button is clicked', async () => {
      render(<SelectionToolbar />);

      const multiSelectButton = screen.getByRole('button', { name: 'Multi-Select' });
      await act(async () => {
        fireEvent.click(multiSelectButton);
      });

      expect(mockToggleMultiSelectMode).toHaveBeenCalled();
    });

    it('shows selection panel when multi-select is active with selections', () => {
      mockUseSelectionStore.mockReturnValue({
        ...mockUseSelectionStore(),
        selections: [
          { id: '1', text: 'First selection', position: { x: 0, y: 0 }, timestamp: Date.now() },
        ],
        isMultiSelectMode: true,
      } as unknown as ReturnType<typeof useSelectionStore>);

      render(<SelectionToolbar />);

      expect(screen.getByText('Selections')).toBeInTheDocument();
      expect(screen.getByText('First selection')).toBeInTheDocument();
    });

    it('can clear selections', async () => {
      mockUseSelectionStore.mockReturnValue({
        ...mockUseSelectionStore(),
        selections: [
          { id: '1', text: 'First selection', position: { x: 0, y: 0 }, timestamp: Date.now() },
        ],
        isMultiSelectMode: true,
      } as unknown as ReturnType<typeof useSelectionStore>);

      render(<SelectionToolbar />);

      const clearButton = screen.getByText('Clear all');
      await act(async () => {
        fireEvent.click(clearButton);
      });

      expect(mockClearSelections).toHaveBeenCalled();
    });
  });

  describe('references panel', () => {
    it('opens references panel when Add Reference is clicked', async () => {
      render(<SelectionToolbar />);

      const addRefButton = screen.getByRole('button', { name: 'Add Reference' });
      await act(async () => {
        fireEvent.click(addRefButton);
      });

      expect(screen.getByText('References')).toBeInTheDocument();
      expect(screen.getByText('From Clipboard')).toBeInTheDocument();
      expect(screen.getByText('From URL')).toBeInTheDocument();
      expect(screen.getByText('Add Note')).toBeInTheDocument();
    });

    it('shows badge when references exist', () => {
      mockUseSelectionStore.mockReturnValue({
        ...mockUseSelectionStore(),
        references: [
          { id: '1', type: 'note', title: 'Test note', content: 'Note content', preview: 'Note' },
        ],
      } as unknown as ReturnType<typeof useSelectionStore>);

      render(<SelectionToolbar />);

      // The badge should show "1"
      const addRefButton = screen.getByRole('button', { name: 'Add Reference' });
      expect(addRefButton.querySelector('[class*="badge"]') || screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('more menu', () => {
    it('opens more menu when More Actions is clicked', async () => {
      render(<SelectionToolbar />);

      const moreButton = screen.getByRole('button', { name: 'More Actions' });
      await act(async () => {
        fireEvent.click(moreButton);
      });

      // Category tabs should appear - use getAllByText since some labels may appear multiple times
      expect(screen.getAllByText('All').length).toBeGreaterThan(0);
      expect(screen.getAllByText('AI').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Edit').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Code').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Utility').length).toBeGreaterThan(0);
    });

    it('shows actions when category is selected', async () => {
      render(<SelectionToolbar />);

      // Open more menu
      const moreButton = screen.getByRole('button', { name: 'More Actions' });
      await act(async () => {
        fireEvent.click(moreButton);
      });

      // Click on Edit category - get the first one (the tab)
      const editTabs = screen.getAllByText('Edit');
      await act(async () => {
        fireEvent.click(editTabs[0]);
      });

      // Edit actions should be visible
      expect(screen.getByText('Rewrite')).toBeInTheDocument();
    });
  });

  describe('keyboard shortcuts', () => {
    it('hides toolbar when Escape is pressed', async () => {
      render(<SelectionToolbar />);

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      expect(mockHideToolbar).toHaveBeenCalled();
    });

    it('triggers action when shortcut key is pressed', async () => {
      render(<SelectionToolbar />);

      await act(async () => {
        fireEvent.keyDown(document, { key: 'E' });
      });

      expect(mockExecuteAction).toHaveBeenCalledWith('explain');
    });

    it('triggers translate when T is pressed', async () => {
      render(<SelectionToolbar />);

      await act(async () => {
        fireEvent.keyDown(document, { key: 'T' });
      });

      expect(mockExecuteAction).toHaveBeenCalledWith('translate');
    });

    it('does not trigger shortcuts when loading', async () => {
      mockUseSelectionToolbar.mockReturnValue({
        ...mockUseSelectionToolbar(),
        state: {
          ...defaultToolbarState,
          isLoading: true,
        },
      });

      render(<SelectionToolbar />);

      await act(async () => {
        fireEvent.keyDown(document, { key: 'E' });
      });

      expect(mockExecuteAction).not.toHaveBeenCalled();
    });
  });

  describe('result panel', () => {
    it('renders ResultPanel with result', () => {
      mockUseSelectionToolbar.mockReturnValue({
        ...mockUseSelectionToolbar(),
        state: {
          ...defaultToolbarState,
          result: 'This is the explanation result',
          activeAction: 'explain',
        },
      });

      render(<SelectionToolbar />);

      expect(screen.getByText('This is the explanation result')).toBeInTheDocument();
    });

    it('renders ResultPanel with error', () => {
      mockUseSelectionToolbar.mockReturnValue({
        ...mockUseSelectionToolbar(),
        state: {
          ...defaultToolbarState,
          error: 'Something went wrong',
        },
      });

      render(<SelectionToolbar />);

      // Multiple elements may contain "Something went wrong"
      const errorElements = screen.getAllByText(/Something went wrong/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  describe('text preview', () => {
    it('shows text preview for long selections', () => {
      const longText = 'A'.repeat(150);
      mockUseSelectionToolbar.mockReturnValue({
        ...mockUseSelectionToolbar(),
        state: {
          ...defaultToolbarState,
          selectedText: longText,
        },
      });

      render(<SelectionToolbar />);

      expect(screen.getByText('150 characters selected')).toBeInTheDocument();
    });

    it('does not show preview for short selections', () => {
      render(<SelectionToolbar />);

      expect(screen.queryByText(/characters selected/)).not.toBeInTheDocument();
    });
  });

  describe('selection mode selector', () => {
    it('opens selection mode menu when clicked', async () => {
      render(<SelectionToolbar />);

      const modeButton = screen.getByRole('button', { name: 'Selection Mode' });
      await act(async () => {
        fireEvent.click(modeButton);
      });

      expect(screen.getByText('Word')).toBeInTheDocument();
      expect(screen.getByText('Sentence')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
      expect(screen.getByText('Smart')).toBeInTheDocument();
    });
  });
});
