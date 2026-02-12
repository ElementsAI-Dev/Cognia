/**
 * Recording Settings Panel Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordingSettingsPanel } from './recording-settings-panel';
import { useScreenRecordingStore } from '@/stores/media';

// Mock the stores
jest.mock('@/stores/media', () => ({
  useScreenRecordingStore: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Recording Settings',
      description: 'Configure recording format, quality, audio, and more.',
      videoSection: 'Video',
      format: 'Format',
      codec: 'Codec',
      frameRate: 'Frame Rate',
      quality: 'Quality',
      audio: 'Audio',
      captureSystemAudio: 'System Audio',
      captureMicrophone: 'Microphone',
      cursor: 'Cursor',
      showCursor: 'Show Cursor',
      highlightClicks: 'Highlight Clicks',
      countdown: 'Countdown',
      countdownSeconds: 'Countdown Seconds',
      showIndicator: 'Show Indicator',
      maxDuration: 'Max Duration',
      maxDurationUnlimited: 'Unlimited',
      systemInfo: 'System Info',
      hwAcceleration: 'GPU Acceleration',
      noHwAcceleration: 'No GPU acceleration detected',
      storage: 'Storage',
      storageUsed: 'Used',
      recordings: 'Recordings',
      screenshots: 'Screenshots',
      storageExceeded: 'Storage limit exceeded',
      cleanup: 'Cleanup Old Files',
      saveDirectory: 'Save Directory',
      defaultDirectory: 'Default',
      path: 'Path',
      encoders: 'Encoders',
      reset: 'Reset',
      cancel: 'Cancel',
      save: 'Save',
      // Preset translations
      meeting: 'Meeting',
      tutorial: 'Tutorial',
      gaming: 'Gaming',
      presentation: 'Presentation',
    };
    return translations[key] || key;
  },
}));

// Mock Tauri utils
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(() => true),
}));

// Mock FFmpegStatus
jest.mock('./ffmpeg-status', () => ({
  FFmpegStatus: ({ compact, showWhenAvailable }: { compact?: boolean; showWhenAvailable?: boolean }) => (
    <div data-testid="ffmpeg-status" data-compact={compact} data-show-when-available={showWhenAvailable}>
      FFmpeg Status
    </div>
  ),
}));

const defaultConfig = {
  format: 'mp4',
  codec: 'h264',
  frame_rate: 30,
  quality: 80,
  bitrate: 0,
  capture_system_audio: true,
  capture_microphone: false,
  show_cursor: true,
  highlight_clicks: false,
  countdown_seconds: 3,
  show_indicator: true,
  max_duration: 0,
  pause_on_minimize: false,
  save_directory: '',
};

describe('RecordingSettingsPanel', () => {
  const mockStore = {
    config: { ...defaultConfig },
    ffmpegAvailable: true,
    ffmpegInfo: null,
    ffmpegVersionOk: true,
    hardwareAcceleration: null,
    storageStats: null,
    storageUsagePercent: 0,
    isStorageExceeded: false,
    updateConfig: jest.fn().mockResolvedValue(undefined),
    refreshStorageStats: jest.fn().mockResolvedValue(undefined),
    runStorageCleanup: jest.fn().mockResolvedValue({ filesDeleted: 0, bytesFreed: 0 }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('renders trigger button when open', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);
    // When open=true, localConfig is set from config, trigger + sheet content render
    await waitFor(() => {
      // The title appears both in trigger and sheet header
      expect(screen.getAllByText('Recording Settings').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders custom trigger when open', async () => {
    render(
      <RecordingSettingsPanel
        open={true}
        onOpenChange={() => {}}
        trigger={<button data-testid="custom-trigger">Open</button>}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
    });
  });

  it('applies custom className to trigger button', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} className="custom-class" />);
    await waitFor(() => {
      const buttons = screen.getAllByText('Recording Settings');
      const triggerButton = buttons.map(el => el.closest('button')).find(btn => btn?.classList.contains('custom-class'));
      expect(triggerButton).toBeInTheDocument();
    });
  });

  it('displays sheet content when open', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Configure recording format, quality, audio, and more.')).toBeInTheDocument();
    });
  });

  it('supports controlled open/onOpenChange', async () => {
    const onOpenChange = jest.fn();
    render(<RecordingSettingsPanel open={true} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByText('Configure recording format, quality, audio, and more.')).toBeInTheDocument();
    });
  });
});

describe('RecordingSettingsPanel - Presets', () => {
  const mockStore = {
    config: { ...defaultConfig },
    ffmpegAvailable: true,
    ffmpegInfo: null,
    ffmpegVersionOk: true,
    hardwareAcceleration: null,
    storageStats: null,
    storageUsagePercent: 0,
    isStorageExceeded: false,
    updateConfig: jest.fn().mockResolvedValue(undefined),
    refreshStorageStats: jest.fn().mockResolvedValue(undefined),
    runStorageCleanup: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('renders all preset buttons', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Meeting')).toBeInTheDocument();
      expect(screen.getByText('Tutorial')).toBeInTheDocument();
      expect(screen.getByText('Gaming')).toBeInTheDocument();
      expect(screen.getByText('Presentation')).toBeInTheDocument();
    });
  });

  it('applies preset config when preset button is clicked', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Gaming')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Gaming'));

    // Gaming preset sets frame_rate to 60 — the span shows "60 fps"
    await waitFor(() => {
      expect(screen.getAllByText(/60 fps/).length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('RecordingSettingsPanel - Video Settings', () => {
  const mockStore = {
    config: { ...defaultConfig },
    ffmpegAvailable: true,
    ffmpegInfo: null,
    ffmpegVersionOk: true,
    hardwareAcceleration: null,
    storageStats: null,
    storageUsagePercent: 0,
    isStorageExceeded: false,
    updateConfig: jest.fn().mockResolvedValue(undefined),
    refreshStorageStats: jest.fn().mockResolvedValue(undefined),
    runStorageCleanup: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('displays video section header', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Video')).toBeInTheDocument();
    });
  });

  it('displays format and codec selects', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Format')).toBeInTheDocument();
      expect(screen.getByText('Codec')).toBeInTheDocument();
    });
  });

  it('displays frame rate', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Frame Rate')).toBeInTheDocument();
      // Frame rate shown in span as "30 fps" and also in SelectValue
      expect(screen.getAllByText(/30 fps/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays quality slider with percentage', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Quality')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });
});

describe('RecordingSettingsPanel - Audio Settings', () => {
  const mockStore = {
    config: { ...defaultConfig },
    ffmpegAvailable: true,
    ffmpegInfo: null,
    ffmpegVersionOk: true,
    hardwareAcceleration: null,
    storageStats: null,
    storageUsagePercent: 0,
    isStorageExceeded: false,
    updateConfig: jest.fn().mockResolvedValue(undefined),
    refreshStorageStats: jest.fn().mockResolvedValue(undefined),
    runStorageCleanup: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('displays audio section with toggles', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Audio')).toBeInTheDocument();
      expect(screen.getByText('System Audio')).toBeInTheDocument();
      expect(screen.getByText('Microphone')).toBeInTheDocument();
    });
  });
});

describe('RecordingSettingsPanel - Cursor Settings', () => {
  const mockStore = {
    config: { ...defaultConfig },
    ffmpegAvailable: true,
    ffmpegInfo: null,
    ffmpegVersionOk: true,
    hardwareAcceleration: null,
    storageStats: null,
    storageUsagePercent: 0,
    isStorageExceeded: false,
    updateConfig: jest.fn().mockResolvedValue(undefined),
    refreshStorageStats: jest.fn().mockResolvedValue(undefined),
    runStorageCleanup: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('displays cursor section with toggles', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Cursor')).toBeInTheDocument();
      expect(screen.getByText('Show Cursor')).toBeInTheDocument();
      expect(screen.getByText('Highlight Clicks')).toBeInTheDocument();
    });
  });
});

describe('RecordingSettingsPanel - Recording Options', () => {
  const mockStore = {
    config: { ...defaultConfig },
    ffmpegAvailable: true,
    ffmpegInfo: null,
    ffmpegVersionOk: true,
    hardwareAcceleration: null,
    storageStats: null,
    storageUsagePercent: 0,
    isStorageExceeded: false,
    updateConfig: jest.fn().mockResolvedValue(undefined),
    refreshStorageStats: jest.fn().mockResolvedValue(undefined),
    runStorageCleanup: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('displays countdown section', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Countdown')).toBeInTheDocument();
      expect(screen.getByText('Countdown Seconds')).toBeInTheDocument();
      expect(screen.getByText('3s')).toBeInTheDocument();
    });
  });

  it('displays max duration as unlimited when 0', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Max Duration')).toBeInTheDocument();
      expect(screen.getByText('Unlimited')).toBeInTheDocument();
    });
  });

  it('displays show indicator toggle', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Show Indicator')).toBeInTheDocument();
    });
  });
});

describe('RecordingSettingsPanel - System Info', () => {
  const mockStore = {
    config: { ...defaultConfig },
    ffmpegAvailable: true,
    ffmpegInfo: { version: '6.1', path: '/usr/bin/ffmpeg', encoders: ['h264', 'h265'] },
    ffmpegVersionOk: true,
    hardwareAcceleration: { nvidia: true, intel_qsv: false, amd_amf: false, vaapi: false },
    storageStats: null,
    storageUsagePercent: 0,
    isStorageExceeded: false,
    updateConfig: jest.fn().mockResolvedValue(undefined),
    refreshStorageStats: jest.fn().mockResolvedValue(undefined),
    runStorageCleanup: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('displays system info section', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('System Info')).toBeInTheDocument();
    });
  });

  it('renders FFmpegStatus component', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId('ffmpeg-status')).toBeInTheDocument();
    });
  });

  it('displays hardware acceleration badges', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('NVIDIA NVENC')).toBeInTheDocument();
    });
  });

  it('shows no GPU acceleration message when none detected', async () => {
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
      ...mockStore,
      hardwareAcceleration: { nvidia: false, intel_qsv: false, amd_amf: false, vaapi: false },
    });

    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('No GPU acceleration detected')).toBeInTheDocument();
    });
  });

  it('displays FFmpeg version info', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('v6.1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // encoder count
    });
  });
});

describe('RecordingSettingsPanel - Storage', () => {
  const mockStore = {
    config: { ...defaultConfig },
    ffmpegAvailable: true,
    ffmpegInfo: null,
    ffmpegVersionOk: true,
    hardwareAcceleration: null,
    storageStats: {
      recordingsSize: 1024 * 1024 * 100,
      screenshotsSize: 1024 * 1024 * 50,
      totalSize: 1024 * 1024 * 150,
    },
    storageUsagePercent: 75,
    isStorageExceeded: false,
    updateConfig: jest.fn().mockResolvedValue(undefined),
    refreshStorageStats: jest.fn().mockResolvedValue(undefined),
    runStorageCleanup: jest.fn().mockResolvedValue({ filesDeleted: 3, bytesFreed: 1024 * 1024 * 30 }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('displays storage usage percentage', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  it('displays recordings and screenshots sizes', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('100.0 MB')).toBeInTheDocument();
      expect(screen.getByText('50.0 MB')).toBeInTheDocument();
    });
  });

  it('shows storage exceeded warning', async () => {
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
      ...mockStore,
      isStorageExceeded: true,
      storageUsagePercent: 110,
    });

    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Storage limit exceeded')).toBeInTheDocument();
    });
  });

  it('calls runStorageCleanup when cleanup button is clicked', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Cleanup Old Files')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cleanup Old Files'));

    await waitFor(() => {
      expect(mockStore.runStorageCleanup).toHaveBeenCalled();
    });
  });

  it('calls refreshStorageStats after cleanup', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Cleanup Old Files')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cleanup Old Files'));

    await waitFor(() => {
      expect(mockStore.refreshStorageStats).toHaveBeenCalled();
    });
  });
});

describe('RecordingSettingsPanel - Actions', () => {
  const mockUpdateConfig = jest.fn().mockResolvedValue(undefined);
  const mockStore = {
    config: { ...defaultConfig },
    ffmpegAvailable: true,
    ffmpegInfo: null,
    ffmpegVersionOk: true,
    hardwareAcceleration: null,
    storageStats: null,
    storageUsagePercent: 0,
    isStorageExceeded: false,
    updateConfig: mockUpdateConfig,
    refreshStorageStats: jest.fn().mockResolvedValue(undefined),
    runStorageCleanup: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('displays save, reset, and cancel buttons', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('calls updateConfig when save is clicked', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({
        format: 'mp4',
        codec: 'h264',
      }));
    });
  });

  it('calls onOpenChange(false) when cancel is clicked', async () => {
    const onOpenChange = jest.fn();
    render(<RecordingSettingsPanel open={true} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('resets local config when reset is clicked', async () => {
    render(<RecordingSettingsPanel open={true} onOpenChange={() => {}} />);

    // First apply a preset to change config
    await waitFor(() => {
      expect(screen.getByText('Gaming')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Gaming'));

    // Verify gaming preset applied (60 fps)
    await waitFor(() => {
      expect(screen.getAllByText(/60 fps/).length).toBeGreaterThanOrEqual(1);
    });

    // Click reset
    fireEvent.click(screen.getByText('Reset'));

    // Should revert to original config (30 fps)
    await waitFor(() => {
      expect(screen.getAllByText(/30 fps/).length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('RecordingSettingsPanel - No Config', () => {
  it('returns null when config is null', () => {
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
      config: null,
      ffmpegAvailable: true,
      ffmpegInfo: null,
      ffmpegVersionOk: true,
      hardwareAcceleration: null,
      storageStats: null,
      storageUsagePercent: 0,
      isStorageExceeded: false,
      updateConfig: jest.fn(),
      refreshStorageStats: jest.fn(),
      runStorageCleanup: jest.fn(),
    });

    const { container } = render(
      <RecordingSettingsPanel open={true} onOpenChange={() => {}} />
    );

    // When localConfig is null, component returns null
    // The Sheet wrapper still renders but inner content is null
    expect(container.querySelector('[data-testid="ffmpeg-status"]')).not.toBeInTheDocument();
  });
});
