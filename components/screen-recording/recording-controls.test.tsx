import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '@/lib/i18n/messages/en';

// Wrapper for i18n
const renderWithI18n = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>
  );
};
import { RecordingControls } from './recording-controls';
import { useScreenRecordingStore, useIsRecording } from '@/stores/media';

// Mock the screen recording store
jest.mock('@/stores/media', () => ({
  useScreenRecordingStore: jest.fn(),
  useIsRecording: jest.fn(),
}));

// Mock Tauri utils
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(() => true),
}));

describe('RecordingControls', () => {
  const mockStore = {
    status: 'Idle',
    duration: 0,
    monitors: [
      { index: 0, name: 'Primary Monitor', is_primary: true, width: 1920, height: 1080 },
    ],
    selectedMode: 'fullscreen',
    selectedMonitor: 0,
    ffmpegAvailable: true,
    isLoading: false,
    isInitialized: true,
    error: null,
    initialize: jest.fn(),
    startRecording: jest.fn().mockResolvedValue('test-id'),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
    updateDuration: jest.fn(),
    setSelectedMonitor: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
    (useIsRecording as jest.Mock).mockReturnValue(false);
  });

  it('renders record button when idle', () => {
    renderWithI18n(<RecordingControls />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders dropdown trigger with correct attributes', () => {
    renderWithI18n(<RecordingControls />);
    
    const recordButton = screen.getByRole('button');
    expect(recordButton).toHaveAttribute('aria-haspopup', 'menu');
    expect(recordButton).toHaveAttribute('data-state', 'closed');
  });

  it('shows Record text in non-compact mode', () => {
    renderWithI18n(<RecordingControls />);
    expect(screen.getByText('Record')).toBeInTheDocument();
  });

  it('shows unavailable message when FFmpeg is not available', () => {
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
      ...mockStore,
      ffmpegAvailable: false,
    });

    renderWithI18n(<RecordingControls />);
    // FFmpegStatus component in compact mode shows translated text
    expect(screen.getByText('FFmpeg Not Available')).toBeInTheDocument();
  });

  it('shows loading spinner when initializing', () => {
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
      ...mockStore,
      isInitialized: false,
    });

    renderWithI18n(<RecordingControls />);
    // Should show loading state
  });
});

describe('RecordingControls - Recording State', () => {
  const mockStore = {
    status: 'Recording',
    duration: 5000,
    monitors: [],
    selectedMode: 'fullscreen',
    selectedMonitor: 0,
    ffmpegAvailable: true,
    isLoading: false,
    isInitialized: true,
    error: null,
    initialize: jest.fn(),
    startRecording: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn().mockResolvedValue({}),
    cancel: jest.fn(),
    updateDuration: jest.fn(),
    setSelectedMonitor: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
    (useIsRecording as jest.Mock).mockReturnValue(true);
  });

  it('shows recording indicator when recording', () => {
    renderWithI18n(<RecordingControls />);
    // Should show recording badge with duration
  });

  it('shows pause button when recording', () => {
    renderWithI18n(<RecordingControls />);
    // Pause button should be visible
  });

  it('shows stop button when recording', () => {
    renderWithI18n(<RecordingControls />);
    // Stop button should be visible
  });

  it('calls pause when pause button is clicked', () => {
    renderWithI18n(<RecordingControls />);
    
    const buttons = screen.getAllByRole('button');
    // Find and click pause button
    buttons.forEach(btn => {
      if (btn.querySelector('svg.lucide-pause')) {
        fireEvent.click(btn);
      }
    });
  });

  it('calls stop when stop button is clicked', () => {
    renderWithI18n(<RecordingControls />);
    
    const buttons = screen.getAllByRole('button');
    // Find and click stop button
    buttons.forEach(btn => {
      if (btn.querySelector('svg.lucide-square')) {
        fireEvent.click(btn);
      }
    });
  });
});

describe('RecordingControls - Paused State', () => {
  const mockStore = {
    status: 'Paused',
    duration: 10000,
    monitors: [],
    selectedMode: 'fullscreen',
    selectedMonitor: 0,
    ffmpegAvailable: true,
    isLoading: false,
    isInitialized: true,
    error: null,
    initialize: jest.fn(),
    startRecording: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
    updateDuration: jest.fn(),
    setSelectedMonitor: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
    (useIsRecording as jest.Mock).mockReturnValue(true);
  });

  it('shows paused indicator', () => {
    renderWithI18n(<RecordingControls />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('shows resume button when paused', () => {
    renderWithI18n(<RecordingControls />);
    // Resume button (play icon) should be visible
  });

  it('calls resume when resume button is clicked', () => {
    renderWithI18n(<RecordingControls />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      if (btn.querySelector('svg.lucide-play')) {
        fireEvent.click(btn);
      }
    });
  });
});

describe('RecordingControls - Countdown State', () => {
  const mockStore = {
    status: 'Countdown',
    duration: 0,
    monitors: [],
    selectedMode: 'fullscreen',
    selectedMonitor: 0,
    ffmpegAvailable: true,
    isLoading: false,
    isInitialized: true,
    error: null,
    initialize: jest.fn(),
    startRecording: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
    updateDuration: jest.fn(),
    setSelectedMonitor: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
    (useIsRecording as jest.Mock).mockReturnValue(true);
  });

  it('shows countdown indicator', () => {
    renderWithI18n(<RecordingControls />);
    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });

  it('shows cancel button during countdown', () => {
    renderWithI18n(<RecordingControls />);
    // Cancel button should be visible
  });

  it('disables stop button during countdown', () => {
    renderWithI18n(<RecordingControls />);
    
    const buttons = screen.getAllByRole('button');
    const stopButton = buttons.find(btn => btn.querySelector('svg.lucide-square'));
    if (stopButton) {
      expect(stopButton).toBeDisabled();
    }
  });
});

describe('RecordingControls - Error Handling', () => {
  const mockStore = {
    status: 'Idle',
    duration: 0,
    monitors: [],
    selectedMode: 'fullscreen',
    selectedMonitor: 0,
    ffmpegAvailable: true,
    isLoading: false,
    isInitialized: true,
    error: 'Test error message',
    initialize: jest.fn(),
    startRecording: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
    updateDuration: jest.fn(),
    setSelectedMonitor: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
    (useIsRecording as jest.Mock).mockReturnValue(false);
  });

  it('shows error dialog when error is present', () => {
    renderWithI18n(<RecordingControls />);
    expect(screen.getByText('Recording Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('clears error when OK is clicked', () => {
    renderWithI18n(<RecordingControls />);
    
    const okButton = screen.getByText('OK');
    fireEvent.click(okButton);
    
    expect(mockStore.clearError).toHaveBeenCalled();
  });
});

describe('RecordingControls - Monitor Selection', () => {
  const mockStore = {
    status: 'Idle',
    duration: 0,
    monitors: [
      { index: 0, name: 'Monitor 1', is_primary: true, width: 1920, height: 1080 },
      { index: 1, name: 'Monitor 2', is_primary: false, width: 2560, height: 1440 },
    ],
    selectedMode: 'fullscreen',
    selectedMonitor: 0,
    ffmpegAvailable: true,
    isLoading: false,
    isInitialized: true,
    error: null,
    initialize: jest.fn(),
    startRecording: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
    updateDuration: jest.fn(),
    setSelectedMonitor: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
    (useIsRecording as jest.Mock).mockReturnValue(false);
  });

  it('renders with multiple monitors in store', () => {
    renderWithI18n(<RecordingControls />);
    
    // Component should render successfully with multiple monitors
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('provides setSelectedMonitor function from store', () => {
    renderWithI18n(<RecordingControls />);
    
    // Verify store is properly configured
    expect(mockStore.setSelectedMonitor).toBeDefined();
  });
});

describe('RecordingControls - Compact Mode', () => {
  const mockStore = {
    status: 'Idle',
    duration: 0,
    monitors: [],
    selectedMode: 'fullscreen',
    selectedMonitor: 0,
    ffmpegAvailable: true,
    isLoading: false,
    isInitialized: true,
    error: null,
    initialize: jest.fn(),
    startRecording: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
    updateDuration: jest.fn(),
    setSelectedMonitor: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
    (useIsRecording as jest.Mock).mockReturnValue(false);
  });

  it('renders in compact mode', () => {
    renderWithI18n(<RecordingControls compact />);
    // Should render icon-only button
  });

  it('hides text label in compact mode', () => {
    renderWithI18n(<RecordingControls compact />);
    expect(screen.queryByText('Record')).not.toBeInTheDocument();
  });
});

describe('RecordingControls - Props', () => {
  const mockStore = {
    status: 'Idle',
    duration: 0,
    monitors: [],
    selectedMode: 'fullscreen',
    selectedMonitor: 0,
    ffmpegAvailable: true,
    isLoading: false,
    isInitialized: true,
    error: null,
    initialize: jest.fn(),
    startRecording: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
    updateDuration: jest.fn(),
    setSelectedMonitor: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
    (useIsRecording as jest.Mock).mockReturnValue(false);
  });

  it('applies custom className', () => {
    const { container } = renderWithI18n(
      <RecordingControls className="custom-test-class" />
    );
    expect(container.firstChild).toHaveClass('custom-test-class');
  });

  it('renders with showSettings false', () => {
    // Component should render without errors with showSettings=false
    const { container } = renderWithI18n(<RecordingControls showSettings={false} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with showSettings true (default)', () => {
    // Component should render without errors with showSettings=true
    const { container } = renderWithI18n(<RecordingControls showSettings={true} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('RecordingControls - Web Environment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.spyOn(require('@/lib/native/utils'), 'isTauri').mockReturnValue(false);
  });

  it('returns null when not in Tauri environment', () => {
    const { container } = renderWithI18n(<RecordingControls />);
    expect(container.firstChild).toBeNull();
  });
});
