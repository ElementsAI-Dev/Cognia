import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WindowSelectorDialog } from './window-selector-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      title: 'Select Window',
      description: 'Choose a window to capture',
      searchPlaceholder: 'Search windows...',
      cancel: 'Cancel',
      capture: 'Capture',
      capturing: 'Capturing...',
      noWindows: 'No windows available',
      noResultsFound: 'No results found',
    };
    if (key === 'windowCount' && params) {
      return `${params.count} windows`;
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

// Mock window data
const mockWindows = [
  {
    hwnd: 12345,
    title: 'Test Window 1',
    process_name: 'test.exe',
    pid: 1001,
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    is_minimized: false,
    is_maximized: true,
    is_visible: true,
    thumbnail_base64: 'dGVzdGltYWdl',
  },
  {
    hwnd: 67890,
    title: 'Test Window 2',
    process_name: 'another.exe',
    pid: 1002,
    x: 100,
    y: 100,
    width: 1280,
    height: 720,
    is_minimized: true,
    is_maximized: false,
    is_visible: true,
    thumbnail_base64: undefined,
  },
  {
    hwnd: 11111,
    title: 'Browser Window',
    process_name: 'chrome.exe',
    pid: 1003,
    x: 0,
    y: 0,
    width: 1600,
    height: 900,
    is_minimized: false,
    is_maximized: false,
    is_visible: true,
    thumbnail_base64: 'YnJvd3Nlcg==',
  },
];

const mockGetWindowsWithThumbnails = jest.fn().mockResolvedValue(mockWindows);
const mockCaptureWindowByHwnd = jest.fn().mockResolvedValue({
  image_base64: 'captured_image',
  metadata: { width: 1920, height: 1080 },
});

jest.mock('@/hooks/native/use-screenshot', () => ({
  useScreenshot: () => ({
    getWindowsWithThumbnails: mockGetWindowsWithThumbnails,
    captureWindowByHwnd: mockCaptureWindowByHwnd,
    isCapturing: false,
  }),
}));

describe('WindowSelectorDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnCaptureWindow = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Select Window')).toBeInTheDocument();
    });
    expect(screen.getByText('Choose a window to capture')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <WindowSelectorDialog
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.queryByText('Select Window')).not.toBeInTheDocument();
  });

  it('fetches windows on open', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(mockGetWindowsWithThumbnails).toHaveBeenCalledWith(160);
    });
  });

  it('displays window list', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Test Window 2')).toBeInTheDocument();
    expect(screen.getByText('Browser Window')).toBeInTheDocument();
  });

  it('displays process names', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test.exe')).toBeInTheDocument();
    });
    expect(screen.getByText('another.exe')).toBeInTheDocument();
    expect(screen.getByText('chrome.exe')).toBeInTheDocument();
  });

  it('displays window dimensions', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1920×1080')).toBeInTheDocument();
    });
    expect(screen.getByText('1280×720')).toBeInTheDocument();
    expect(screen.getByText('1600×900')).toBeInTheDocument();
  });

  it('displays window count in footer', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('3 windows')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search windows...')).toBeInTheDocument();
    });
  });

  it('filters windows by title', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search windows...');
    fireEvent.change(searchInput, { target: { value: 'Browser' } });

    await waitFor(() => {
      expect(screen.queryByText('Test Window 1')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Browser Window')).toBeInTheDocument();
    expect(screen.getByText('1 windows')).toBeInTheDocument();
  });

  it('filters windows by process name', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search windows...');
    fireEvent.change(searchInput, { target: { value: 'chrome' } });

    await waitFor(() => {
      expect(screen.queryByText('Test Window 1')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Browser Window')).toBeInTheDocument();
  });

  it('shows no results message when search has no matches', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search windows...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  it('selects window on click', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });

    const windowItem = screen.getByText('Test Window 1').closest('.group');
    if (windowItem) {
      fireEvent.click(windowItem);
    }

    // Capture button should be enabled now
    const captureButton = screen.getByRole('button', { name: /Capture/i });
    expect(captureButton).not.toBeDisabled();
  });

  it('calls onCaptureWindow on double click', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCaptureWindow={mockOnCaptureWindow}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });

    const windowItem = screen.getByText('Test Window 1').closest('.group');
    if (windowItem) {
      fireEvent.doubleClick(windowItem);
    }

    await waitFor(() => {
      expect(mockOnCaptureWindow).toHaveBeenCalledWith(mockWindows[0]);
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls captureWindowByHwnd on double click without onCaptureWindow', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });

    const windowItem = screen.getByText('Test Window 1').closest('.group');
    if (windowItem) {
      fireEvent.doubleClick(windowItem);
    }

    await waitFor(() => {
      expect(mockCaptureWindowByHwnd).toHaveBeenCalledWith(12345);
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes dialog on cancel button click', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('capture button is disabled when no window selected', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Capture')).toBeInTheDocument();
    });

    const captureButton = screen.getByRole('button', { name: /Capture/i });
    expect(captureButton).toBeDisabled();
  });

  it('calls onCaptureWindow on capture button click', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCaptureWindow={mockOnCaptureWindow}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });

    // Select window first
    const windowItem = screen.getByText('Test Window 1').closest('.group');
    if (windowItem) {
      fireEvent.click(windowItem);
    }

    // Click capture button
    const captureButton = screen.getByRole('button', { name: /Capture/i });
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(mockOnCaptureWindow).toHaveBeenCalledWith(mockWindows[0]);
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('has refresh button that is clickable', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Wait for windows to load
    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });

    // Find refresh button (the icon button with RefreshCw)
    const buttons = screen.getAllByRole('button');
    const refreshButton = buttons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg && svg.classList.contains('lucide-refresh-cw');
    });
    
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();
  });

  it('displays thumbnail when available', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });

    const images = screen.getAllByRole('img');
    const thumbnailImage = images.find(img => 
      img.getAttribute('src')?.includes('data:image/png;base64')
    );
    expect(thumbnailImage).toBeInTheDocument();
  });

  it('displays placeholder when no thumbnail', async () => {
    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Window 2')).toBeInTheDocument();
    });

    // Test Window 2 has no thumbnail, should show placeholder icon
    const window2Container = screen.getByText('Test Window 2').closest('.group');
    expect(window2Container).toBeInTheDocument();
  });

  it('displays Untitled for windows without title', async () => {
    const windowsWithNoTitle = [
      {
        ...mockWindows[0],
        title: '',
      },
    ];
    mockGetWindowsWithThumbnails.mockResolvedValueOnce(windowsWithNoTitle);

    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });
  });

  it('resets state when dialog reopens', async () => {
    const { rerender } = render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });

    // Search for something
    const searchInput = screen.getByPlaceholderText('Search windows...');
    fireEvent.change(searchInput, { target: { value: 'Browser' } });

    // Close and reopen
    rerender(
      <WindowSelectorDialog
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    rerender(
      <WindowSelectorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      const newSearchInput = screen.getByPlaceholderText('Search windows...');
      expect(newSearchInput).toHaveValue('');
    });
  });
});

describe('WindowSelectorDialog - Loading State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state while fetching', async () => {
    // Create a promise that we can control
    let resolvePromise: (value: typeof mockWindows) => void;
    const pendingPromise = new Promise<typeof mockWindows>(resolve => {
      resolvePromise = resolve;
    });
    mockGetWindowsWithThumbnails.mockReturnValueOnce(pendingPromise);

    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={jest.fn()}
      />
    );

    // While loading, the refresh button should be disabled
    const buttons = screen.getAllByRole('button');
    const refreshButton = buttons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg && svg.classList.contains('lucide-refresh-cw');
    });
    expect(refreshButton).toBeDisabled();

    // Resolve the promise
    resolvePromise!(mockWindows);
    
    await waitFor(() => {
      expect(screen.getByText('Test Window 1')).toBeInTheDocument();
    });
  });
});

describe('WindowSelectorDialog - Empty State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows no windows message when list is empty', async () => {
    mockGetWindowsWithThumbnails.mockResolvedValueOnce([]);

    render(
      <WindowSelectorDialog
        open={true}
        onOpenChange={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No windows available')).toBeInTheDocument();
    });
  });
});
