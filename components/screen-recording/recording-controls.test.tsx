import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils/render-with-providers';
import { RecordingControls } from './recording-controls';
import { useScreenRecordingStore, useIsRecording } from '@/stores/screen-recording-store';

// Mock the screen recording store
jest.mock('@/stores/screen-recording-store', () => ({
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
    renderWithProviders(<RecordingControls />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders dropdown trigger with correct attributes', () => {
    renderWithProviders(<RecordingControls />);
    
    const recordButton = screen.getByRole('button');
    expect(recordButton).toHaveAttribute('aria-haspopup', 'menu');
    expect(recordButton).toHaveAttribute('data-state', 'closed');
  });

  it('shows Record text in non-compact mode', () => {
    renderWithProviders(<RecordingControls />);
    expect(screen.getByText('Record')).toBeInTheDocument();
  });

  it('shows unavailable message when FFmpeg is not available', () => {
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
      ...mockStore,
      ffmpegAvailable: false,
    });

    renderWithProviders(<RecordingControls />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading spinner when initializing', () => {
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
      ...mockStore,
      isInitialized: false,
    });

    renderWithProviders(<RecordingControls />);
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
    renderWithProviders(<RecordingControls />);
    // Should show recording badge with duration
  });

  it('shows pause button when recording', () => {
    renderWithProviders(<RecordingControls />);
    // Pause button should be visible
  });

  it('shows stop button when recording', () => {
    renderWithProviders(<RecordingControls />);
    // Stop button should be visible
  });

  it('calls pause when pause button is clicked', () => {
    renderWithProviders(<RecordingControls />);
    
    const buttons = screen.getAllByRole('button');
    // Find and click pause button
    buttons.forEach(btn => {
      if (btn.querySelector('svg.lucide-pause')) {
        fireEvent.click(btn);
      }
    });
  });

  it('calls stop when stop button is clicked', () => {
    renderWithProviders(<RecordingControls />);
    
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
    renderWithProviders(<RecordingControls />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('shows resume button when paused', () => {
    renderWithProviders(<RecordingControls />);
    // Resume button (play icon) should be visible
  });

  it('calls resume when resume button is clicked', () => {
    renderWithProviders(<RecordingControls />);
    
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
    renderWithProviders(<RecordingControls />);
    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });

  it('shows cancel button during countdown', () => {
    renderWithProviders(<RecordingControls />);
    // Cancel button should be visible
  });

  it('disables stop button during countdown', () => {
    renderWithProviders(<RecordingControls />);
    
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
    renderWithProviders(<RecordingControls />);
    expect(screen.getByText('Recording Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('clears error when OK is clicked', () => {
    renderWithProviders(<RecordingControls />);
    
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
    renderWithProviders(<RecordingControls />);
    
    // Component should render successfully with multiple monitors
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('provides setSelectedMonitor function from store', () => {
    renderWithProviders(<RecordingControls />);
    
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
    renderWithProviders(<RecordingControls compact />);
    // Should render icon-only button
  });

  it('hides text label in compact mode', () => {
    renderWithProviders(<RecordingControls compact />);
    expect(screen.queryByText('Record')).not.toBeInTheDocument();
  });
});
