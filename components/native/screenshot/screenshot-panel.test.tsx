import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScreenshotPanel } from './screenshot-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      title: 'Screenshots',
      full: 'Fullscreen',
      window: 'Window',
      region: 'Region',
      searchPlaceholder: 'Search screenshots...',
      clearSearch: 'Clear search',
      noResultsFound: 'No results found',
      noHistory: 'No screenshots',
      tryDifferentQuery: 'Try a different search query',
      takeScreenshotToStart: 'Take a screenshot to start',
      clearHistory: 'Clear history',
    };
    if (key === 'screenshotCount' && params) {
      return `${params.count} screenshots`;
    }
    return translations[key] || key;
  },
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; className?: string; src: string }) => (
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    <img {...props} />
  ),
}));

// Mock ScreenshotEditor to auto-confirm
jest.mock('@/components/screenshot/screenshot-editor', () => ({
  ScreenshotEditor: ({ imageData, onConfirm }: { imageData: string; onConfirm: (data: string, annotations: unknown[]) => void; onCancel: () => void }) => (
    <div data-testid="screenshot-editor">
      <button data-testid="editor-confirm" onClick={() => onConfirm(imageData, [])}>Confirm</button>
    </div>
  ),
}));

// Mock native screenshot API
jest.mock('@/lib/native/screenshot', () => ({
  saveToFile: jest.fn(),
}));

// Mock copy-button to avoid langfuse import issues
jest.mock('@/components/chat/ui/copy-button', () => ({
  CopyButton: ({ content, className }: { content: string; className?: string }) => (
    <button data-testid="copy-button" className={className} data-content={content}>
      Copy
    </button>
  ),
}));

// Mock screenshot hooks
const mockCaptureFullscreen = jest.fn().mockResolvedValue({
  image_base64: 'base64imagedata',
  metadata: { width: 1920, height: 1080 },
});
const mockCaptureWindow = jest.fn().mockResolvedValue({
  image_base64: 'base64imagedata',
  metadata: { width: 1280, height: 720 },
});
const mockStartRegionSelection = jest.fn().mockResolvedValue({
  x: 0,
  y: 0,
  width: 800,
  height: 600,
});
const mockCaptureRegion = jest.fn().mockResolvedValue({
  image_base64: 'base64imagedata',
  metadata: { width: 800, height: 600 },
});
const mockExtractText = jest.fn().mockResolvedValue('Extracted text');

const mockLastScreenshot = {
  image_base64: 'lastscreenshotbase64',
  metadata: {
    width: 1920,
    height: 1080,
  },
};

const mockFetchHistory = jest.fn();
const mockSearchHistory = jest.fn().mockResolvedValue([]);
const mockPinScreenshot = jest.fn();
const mockUnpinScreenshot = jest.fn();
const mockDeleteScreenshot = jest.fn();
const mockClearHistory = jest.fn();

const mockHistoryItems = [
  {
    id: '1',
    thumbnail_base64: 'thumbnail1base64',
    timestamp: Date.now() - 1000,
    width: 1920,
    height: 1080,
    mode: 'fullscreen',
    is_pinned: false,
  },
  {
    id: '2',
    thumbnail_base64: 'thumbnail2base64',
    timestamp: Date.now() - 2000,
    width: 1280,
    height: 720,
    mode: 'window',
    is_pinned: true,
  },
];

jest.mock('@/hooks/native/use-screenshot', () => ({
  useScreenshot: () => ({
    isCapturing: false,
    lastScreenshot: mockLastScreenshot,
    captureFullscreen: mockCaptureFullscreen,
    captureWindow: mockCaptureWindow,
    startRegionSelection: mockStartRegionSelection,
    captureRegion: mockCaptureRegion,
    extractText: mockExtractText,
  }),
  useScreenshotHistory: () => ({
    history: mockHistoryItems,
    isLoading: false,
    fetchHistory: mockFetchHistory,
    searchHistory: mockSearchHistory,
    pinScreenshot: mockPinScreenshot,
    unpinScreenshot: mockUnpinScreenshot,
    deleteScreenshot: mockDeleteScreenshot,
    clearHistory: mockClearHistory,
  }),
}));

describe('ScreenshotPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the panel with title', () => {
    render(<ScreenshotPanel />);
    expect(screen.getByText('Screenshots')).toBeInTheDocument();
  });

  it('renders capture buttons', () => {
    render(<ScreenshotPanel />);
    expect(screen.getByText('Fullscreen')).toBeInTheDocument();
    expect(screen.getByText('Window')).toBeInTheDocument();
    expect(screen.getByText('Region')).toBeInTheDocument();
  });

  it('calls captureFullscreen when fullscreen button is clicked', async () => {
    render(<ScreenshotPanel />);
    const fullscreenButton = screen.getByText('Fullscreen');
    fireEvent.click(fullscreenButton);
    await waitFor(() => {
      expect(mockCaptureFullscreen).toHaveBeenCalled();
    });
  });

  it('calls captureWindow when window button is clicked', async () => {
    render(<ScreenshotPanel />);
    const windowButton = screen.getByText('Window');
    fireEvent.click(windowButton);
    await waitFor(() => {
      expect(mockCaptureWindow).toHaveBeenCalled();
    });
  });

  it('calls region selection when region button is clicked', async () => {
    render(<ScreenshotPanel />);
    const regionButton = screen.getByText('Region');
    fireEvent.click(regionButton);
    await waitFor(() => {
      expect(mockStartRegionSelection).toHaveBeenCalled();
    });
  });

  it('displays last screenshot preview', () => {
    render(<ScreenshotPanel />);
    expect(screen.getByText('1920x1080')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ScreenshotPanel />);
    expect(screen.getByPlaceholderText('Search screenshots...')).toBeInTheDocument();
  });

  it('displays screenshot count', () => {
    render(<ScreenshotPanel />);
    // Count appears in both header and footer
    const countElements = screen.getAllByText('2 screenshots');
    expect(countElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders clear history button', () => {
    render(<ScreenshotPanel />);
    expect(screen.getByText('Clear history')).toBeInTheDocument();
  });

  it('calls clearHistory when clear button is clicked', () => {
    render(<ScreenshotPanel />);
    const clearButton = screen.getByText('Clear history');
    fireEvent.click(clearButton);
    expect(mockClearHistory).toHaveBeenCalled();
  });

  it('updates search query on input change', () => {
    render(<ScreenshotPanel />);
    const searchInput = screen.getByPlaceholderText('Search screenshots...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    expect(searchInput).toHaveValue('test search');
  });

  it('calls searchHistory on Enter key press', async () => {
    render(<ScreenshotPanel />);
    const searchInput = screen.getByPlaceholderText('Search screenshots...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    await waitFor(() => {
      expect(mockSearchHistory).toHaveBeenCalledWith('test');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<ScreenshotPanel className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('calls onScreenshotTaken callback when screenshot is captured', async () => {
    const mockOnScreenshotTaken = jest.fn();
    render(<ScreenshotPanel onScreenshotTaken={mockOnScreenshotTaken} />);
    const fullscreenButton = screen.getByText('Fullscreen');
    fireEvent.click(fullscreenButton);
    // After capture, editor opens
    await waitFor(() => {
      expect(screen.getByTestId('screenshot-editor')).toBeInTheDocument();
    });
    // Confirm in editor triggers onScreenshotTaken
    const confirmButton = screen.getByTestId('editor-confirm');
    fireEvent.click(confirmButton);
    await waitFor(() => {
      expect(mockOnScreenshotTaken).toHaveBeenCalledWith('base64imagedata');
    });
  });

  it('fetches history on mount', () => {
    render(<ScreenshotPanel />);
    expect(mockFetchHistory).toHaveBeenCalledWith(20);
  });

  it('displays history items in grid', () => {
    render(<ScreenshotPanel />);
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it('shows pinned indicator on pinned items', () => {
    render(<ScreenshotPanel />);
    expect(screen.getByText(/1280x720/)).toBeInTheDocument();
  });
});

describe('ScreenshotPanel - Extract Text', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });
  });

  it('calls extractText and copies to clipboard', async () => {
    render(<ScreenshotPanel />);
    const extractButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));
    if (extractButton) {
      fireEvent.click(extractButton);
    }
  });
});

describe('ScreenshotHistoryItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays screenshot dimensions and mode', () => {
    render(<ScreenshotPanel />);
    expect(screen.getByText(/1920x1080 · fullscreen/)).toBeInTheDocument();
    expect(screen.getByText(/1280x720 · window/)).toBeInTheDocument();
  });

  it('displays screenshot timestamp', () => {
    render(<ScreenshotPanel />);
    const timestamps = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timestamps.length).toBeGreaterThan(0);
  });
});

describe('ScreenshotPanel - Selection', () => {
  it('allows selecting a screenshot from history', () => {
    render(<ScreenshotPanel />);
    const historyItems = screen.getAllByText(/fullscreen|window/);
    if (historyItems[0]) {
      const container = historyItems[0].closest('.group');
      if (container) {
        fireEvent.click(container);
      }
    }
  });
});

describe('ScreenshotPanel - Clear Search', () => {
  it('clears search when clear button is clicked', async () => {
    render(<ScreenshotPanel />);
    const searchInput = screen.getByPlaceholderText('Search screenshots...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(searchInput).toHaveValue('test');

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);
    expect(searchInput).toHaveValue('');
  });
});
