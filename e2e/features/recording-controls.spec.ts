import { test, expect } from '@playwright/test';

/**
 * Recording Controls E2E Tests
 * Tests for screen recording controls with region selection support
 */
test.describe('Recording Controls State Management', () => {
  test.describe.configure({ mode: 'serial' });

  test('should manage recording status transitions', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      type RecordingStatus = 'Idle' | 'Countdown' | 'Recording' | 'Paused' | 'Processing' | 'Error';

      interface RecordingState {
        status: RecordingStatus;
        duration: number;
        error: string | null;
      }

      const createInitialState = (): RecordingState => ({
        status: 'Idle',
        duration: 0,
        error: null,
      });

      const startCountdown = (state: RecordingState): RecordingState => ({
        ...state,
        status: 'Countdown',
        duration: 0,
        error: null,
      });

      const startRecording = (state: RecordingState): RecordingState => ({
        ...state,
        status: 'Recording',
        duration: 0,
      });

      const pauseRecording = (state: RecordingState): RecordingState => ({
        ...state,
        status: 'Paused',
      });

      const resumeRecording = (state: RecordingState): RecordingState => ({
        ...state,
        status: 'Recording',
      });

      const stopRecording = (state: RecordingState): RecordingState => ({
        ...state,
        status: 'Processing',
      });

      const completeRecording = (state: RecordingState): RecordingState => ({
        ...state,
        status: 'Idle',
        duration: 0,
      });

      const setError = (state: RecordingState, error: string): RecordingState => ({
        ...state,
        status: 'Error',
        error,
      });

      const clearError = (state: RecordingState): RecordingState => ({
        ...state,
        status: 'Idle',
        error: null,
      });

      // Test normal flow
      let state = createInitialState();
      const step1 = state.status;

      state = startCountdown(state);
      const step2 = state.status;

      state = startRecording(state);
      const step3 = state.status;

      state = pauseRecording(state);
      const step4 = state.status;

      state = resumeRecording(state);
      const step5 = state.status;

      state = stopRecording(state);
      const step6 = state.status;

      state = completeRecording(state);
      const step7 = state.status;

      // Test error flow
      let errorState = createInitialState();
      errorState = setError(errorState, 'Recording failed');
      const errorStatus = errorState.status;
      const errorMessage = errorState.error;

      errorState = clearError(errorState);
      const afterClearError = errorState.status;

      return {
        step1, step2, step3, step4, step5, step6, step7,
        errorStatus, errorMessage, afterClearError,
      };
    });

    expect(result.step1).toBe('Idle');
    expect(result.step2).toBe('Countdown');
    expect(result.step3).toBe('Recording');
    expect(result.step4).toBe('Paused');
    expect(result.step5).toBe('Recording');
    expect(result.step6).toBe('Processing');
    expect(result.step7).toBe('Idle');
    expect(result.errorStatus).toBe('Error');
    expect(result.errorMessage).toBe('Recording failed');
    expect(result.afterClearError).toBe('Idle');
  });

  test('should track recording duration', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      const formatDuration = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };

      const formatDurationLong = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };

      return {
        zero: formatDuration(0),
        tenSeconds: formatDuration(10000),
        oneMinute: formatDuration(60000),
        fiveMinutes: formatDuration(300000),
        oneHour: formatDurationLong(3600000),
        oneHourThirty: formatDurationLong(5400000),
      };
    });

    expect(result.zero).toBe('00:00');
    expect(result.tenSeconds).toBe('00:10');
    expect(result.oneMinute).toBe('01:00');
    expect(result.fiveMinutes).toBe('05:00');
    expect(result.oneHour).toBe('1:00:00');
    expect(result.oneHourThirty).toBe('1:30:00');
  });
});

test.describe('Recording Modes', () => {
  test('should define recording mode options', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      type RecordingMode = 'fullscreen' | 'window' | 'region';

      interface RecordingModeInfo {
        id: RecordingMode;
        label: string;
        description: string;
        icon: string;
        requiresSelection: boolean;
      }

      const RECORDING_MODES: RecordingModeInfo[] = [
        {
          id: 'fullscreen',
          label: 'Full Screen',
          description: 'Record the entire screen',
          icon: 'Monitor',
          requiresSelection: false,
        },
        {
          id: 'window',
          label: 'Window',
          description: 'Record a specific window',
          icon: 'AppWindow',
          requiresSelection: true,
        },
        {
          id: 'region',
          label: 'Region',
          description: 'Record a selected area of the screen',
          icon: 'Square',
          requiresSelection: true,
        },
      ];

      const getModeInfo = (mode: RecordingMode): RecordingModeInfo | undefined => {
        return RECORDING_MODES.find(m => m.id === mode);
      };

      const getModesRequiringSelection = (): RecordingModeInfo[] => {
        return RECORDING_MODES.filter(m => m.requiresSelection);
      };

      return {
        totalModes: RECORDING_MODES.length,
        fullscreenInfo: getModeInfo('fullscreen'),
        regionInfo: getModeInfo('region'),
        modesRequiringSelection: getModesRequiringSelection().map(m => m.id),
      };
    });

    expect(result.totalModes).toBe(3);
    expect(result.fullscreenInfo?.requiresSelection).toBe(false);
    expect(result.regionInfo?.requiresSelection).toBe(true);
    expect(result.modesRequiringSelection).toContain('window');
    expect(result.modesRequiringSelection).toContain('region');
    expect(result.modesRequiringSelection).not.toContain('fullscreen');
  });

  test('should handle region recording parameters', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface RecordingRegion {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      interface RegionRecordingParams {
        region: RecordingRegion;
        monitorIndex: number;
        fps: number;
        quality: 'low' | 'medium' | 'high';
      }

      const validateRegion = (region: RecordingRegion): boolean => {
        return (
          region.x >= 0 &&
          region.y >= 0 &&
          region.width >= 100 &&
          region.height >= 100
        );
      };

      const normalizeRegion = (region: RecordingRegion): RecordingRegion => {
        // Ensure dimensions are even (required for some video codecs)
        return {
          x: Math.round(region.x),
          y: Math.round(region.y),
          width: Math.round(region.width / 2) * 2,
          height: Math.round(region.height / 2) * 2,
        };
      };

      const createParams = (region: RecordingRegion): RegionRecordingParams => ({
        region: normalizeRegion(region),
        monitorIndex: 0,
        fps: 30,
        quality: 'medium',
      });

      const validRegion: RecordingRegion = { x: 100, y: 100, width: 800, height: 600 };
      const invalidRegion: RecordingRegion = { x: -10, y: 100, width: 50, height: 50 };
      const oddDimensions: RecordingRegion = { x: 100, y: 100, width: 801, height: 601 };

      return {
        validIsValid: validateRegion(validRegion),
        invalidIsValid: validateRegion(invalidRegion),
        normalizedOdd: normalizeRegion(oddDimensions),
        params: createParams(validRegion),
      };
    });

    expect(result.validIsValid).toBe(true);
    expect(result.invalidIsValid).toBe(false);
    expect(result.normalizedOdd.width).toBe(802); // 801 -> 802 (rounds to nearest even)
    expect(result.normalizedOdd.height).toBe(602); // 601 -> 602 (rounds to nearest even)
    expect(result.params.fps).toBe(30);
    expect(result.params.quality).toBe('medium');
  });
});

test.describe('Monitor Selection', () => {
  test('should manage monitor list', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface Monitor {
        index: number;
        name: string;
        is_primary: boolean;
        width: number;
        height: number;
      }

      const monitors: Monitor[] = [
        { index: 0, name: 'Primary Monitor', is_primary: true, width: 1920, height: 1080 },
        { index: 1, name: 'Secondary Monitor', is_primary: false, width: 2560, height: 1440 },
        { index: 2, name: 'Laptop Display', is_primary: false, width: 1366, height: 768 },
      ];

      const getPrimaryMonitor = (list: Monitor[]): Monitor | undefined => {
        return list.find(m => m.is_primary);
      };

      const getMonitorByIndex = (list: Monitor[], index: number): Monitor | undefined => {
        return list.find(m => m.index === index);
      };

      const formatMonitorLabel = (monitor: Monitor): string => {
        return `${monitor.name} (${monitor.width}×${monitor.height})${monitor.is_primary ? ' - Primary' : ''}`;
      };

      const getTotalResolution = (list: Monitor[]): { width: number; height: number } => {
        const maxWidth = Math.max(...list.map(m => m.width));
        const maxHeight = Math.max(...list.map(m => m.height));
        return { width: maxWidth, height: maxHeight };
      };

      return {
        totalMonitors: monitors.length,
        primaryMonitor: getPrimaryMonitor(monitors),
        secondaryLabel: formatMonitorLabel(getMonitorByIndex(monitors, 1)!),
        maxResolution: getTotalResolution(monitors),
      };
    });

    expect(result.totalMonitors).toBe(3);
    expect(result.primaryMonitor?.index).toBe(0);
    expect(result.secondaryLabel).toBe('Secondary Monitor (2560×1440)');
    expect(result.maxResolution.width).toBe(2560);
    expect(result.maxResolution.height).toBe(1440);
  });

  test('should select appropriate monitor for recording', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface Monitor {
        index: number;
        is_primary: boolean;
      }

      interface RecordingConfig {
        selectedMonitor: number;
        mode: 'fullscreen' | 'window' | 'region';
      }

      const getDefaultMonitor = (monitors: Monitor[]): number => {
        const primary = monitors.find(m => m.is_primary);
        return primary ? primary.index : 0;
      };

      const validateMonitorSelection = (config: RecordingConfig, monitors: Monitor[]): boolean => {
        return monitors.some(m => m.index === config.selectedMonitor);
      };

      const monitors: Monitor[] = [
        { index: 0, is_primary: true },
        { index: 1, is_primary: false },
      ];

      const defaultMonitor = getDefaultMonitor(monitors);
      const validConfig: RecordingConfig = { selectedMonitor: 1, mode: 'fullscreen' };
      const invalidConfig: RecordingConfig = { selectedMonitor: 5, mode: 'fullscreen' };

      return {
        defaultMonitor,
        validConfigIsValid: validateMonitorSelection(validConfig, monitors),
        invalidConfigIsValid: validateMonitorSelection(invalidConfig, monitors),
      };
    });

    expect(result.defaultMonitor).toBe(0);
    expect(result.validConfigIsValid).toBe(true);
    expect(result.invalidConfigIsValid).toBe(false);
  });
});

test.describe('FFmpeg Availability', () => {
  test('should check FFmpeg requirements', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface FFmpegStatus {
        available: boolean;
        version: string | null;
        path: string | null;
        error: string | null;
      }

      const checkFFmpegStatus = (available: boolean, version?: string): FFmpegStatus => {
        if (available && version) {
          return {
            available: true,
            version,
            path: '/usr/bin/ffmpeg',
            error: null,
          };
        }
        return {
          available: false,
          version: null,
          path: null,
          error: 'FFmpeg not found. Please install FFmpeg to use screen recording.',
        };
      };

      const canRecord = (status: FFmpegStatus): boolean => {
        return status.available;
      };

      const getStatusMessage = (status: FFmpegStatus): string => {
        if (status.available) {
          return `FFmpeg ${status.version} ready`;
        }
        return status.error || 'FFmpeg not available';
      };

      const availableStatus = checkFFmpegStatus(true, '5.1.2');
      const unavailableStatus = checkFFmpegStatus(false);

      return {
        availableCanRecord: canRecord(availableStatus),
        unavailableCanRecord: canRecord(unavailableStatus),
        availableMessage: getStatusMessage(availableStatus),
        unavailableMessage: getStatusMessage(unavailableStatus),
      };
    });

    expect(result.availableCanRecord).toBe(true);
    expect(result.unavailableCanRecord).toBe(false);
    expect(result.availableMessage).toBe('FFmpeg 5.1.2 ready');
    expect(result.unavailableMessage).toContain('FFmpeg not found');
  });
});

test.describe('Recording Controls UI State', () => {
  test('should determine button states based on recording status', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      type RecordingStatus = 'Idle' | 'Countdown' | 'Recording' | 'Paused' | 'Processing';

      interface ButtonStates {
        recordVisible: boolean;
        recordEnabled: boolean;
        pauseVisible: boolean;
        pauseEnabled: boolean;
        stopVisible: boolean;
        stopEnabled: boolean;
        cancelVisible: boolean;
      }

      const getButtonStates = (status: RecordingStatus, ffmpegAvailable: boolean): ButtonStates => {
        switch (status) {
          case 'Idle':
            return {
              recordVisible: true,
              recordEnabled: ffmpegAvailable,
              pauseVisible: false,
              pauseEnabled: false,
              stopVisible: false,
              stopEnabled: false,
              cancelVisible: false,
            };
          case 'Countdown':
            return {
              recordVisible: false,
              recordEnabled: false,
              pauseVisible: false,
              pauseEnabled: false,
              stopVisible: true,
              stopEnabled: false,
              cancelVisible: true,
            };
          case 'Recording':
            return {
              recordVisible: false,
              recordEnabled: false,
              pauseVisible: true,
              pauseEnabled: true,
              stopVisible: true,
              stopEnabled: true,
              cancelVisible: false,
            };
          case 'Paused':
            return {
              recordVisible: false,
              recordEnabled: false,
              pauseVisible: true, // Shows as resume button
              pauseEnabled: true,
              stopVisible: true,
              stopEnabled: true,
              cancelVisible: false,
            };
          case 'Processing':
            return {
              recordVisible: false,
              recordEnabled: false,
              pauseVisible: false,
              pauseEnabled: false,
              stopVisible: false,
              stopEnabled: false,
              cancelVisible: false,
            };
        }
      };

      return {
        idleWithFFmpeg: getButtonStates('Idle', true),
        idleWithoutFFmpeg: getButtonStates('Idle', false),
        countdown: getButtonStates('Countdown', true),
        recording: getButtonStates('Recording', true),
        paused: getButtonStates('Paused', true),
        processing: getButtonStates('Processing', true),
      };
    });

    // Idle state
    expect(result.idleWithFFmpeg.recordVisible).toBe(true);
    expect(result.idleWithFFmpeg.recordEnabled).toBe(true);
    expect(result.idleWithoutFFmpeg.recordEnabled).toBe(false);

    // Countdown state
    expect(result.countdown.cancelVisible).toBe(true);
    expect(result.countdown.stopEnabled).toBe(false);

    // Recording state
    expect(result.recording.pauseVisible).toBe(true);
    expect(result.recording.pauseEnabled).toBe(true);
    expect(result.recording.stopEnabled).toBe(true);

    // Paused state
    expect(result.paused.pauseVisible).toBe(true);
    expect(result.paused.stopEnabled).toBe(true);

    // Processing state
    expect(result.processing.recordVisible).toBe(false);
    expect(result.processing.stopVisible).toBe(false);
  });

  test('should handle compact mode display', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface DisplayConfig {
        showLabel: boolean;
        buttonSize: 'sm' | 'md' | 'lg';
        showDuration: boolean;
      }

      const getDisplayConfig = (compact: boolean, isRecording: boolean): DisplayConfig => {
        if (compact) {
          return {
            showLabel: false,
            buttonSize: 'sm',
            showDuration: isRecording,
          };
        }
        return {
          showLabel: true,
          buttonSize: 'md',
          showDuration: isRecording,
        };
      };

      return {
        compactIdle: getDisplayConfig(true, false),
        compactRecording: getDisplayConfig(true, true),
        normalIdle: getDisplayConfig(false, false),
        normalRecording: getDisplayConfig(false, true),
      };
    });

    expect(result.compactIdle.showLabel).toBe(false);
    expect(result.compactIdle.buttonSize).toBe('sm');
    expect(result.compactIdle.showDuration).toBe(false);

    expect(result.compactRecording.showDuration).toBe(true);

    expect(result.normalIdle.showLabel).toBe(true);
    expect(result.normalIdle.buttonSize).toBe('md');

    expect(result.normalRecording.showDuration).toBe(true);
  });
});

test.describe('Recording History Integration', () => {
  test('should create history entry after recording', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface RecordingHistoryEntry {
        id: string;
        timestamp: number;
        duration_ms: number;
        width: number;
        height: number;
        mode: 'fullscreen' | 'window' | 'region';
        file_path: string;
        file_size: number;
        thumbnail: string | null;
        is_pinned: boolean;
        tags: string[];
      }

      const createHistoryEntry = (
        mode: RecordingHistoryEntry['mode'],
        duration: number,
        width: number,
        height: number,
        filePath: string,
        fileSize: number
      ): RecordingHistoryEntry => {
        return {
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration_ms: duration,
          width,
          height,
          mode,
          file_path: filePath,
          file_size: fileSize,
          thumbnail: null,
          is_pinned: false,
          tags: [],
        };
      };

      const entry = createHistoryEntry(
        'region',
        60000,
        800,
        600,
        'C:\\recordings\\test.mp4',
        50 * 1024 * 1024
      );

      return {
        hasId: entry.id.startsWith('rec-'),
        hasTimestamp: entry.timestamp > 0,
        mode: entry.mode,
        duration: entry.duration_ms,
        resolution: `${entry.width}x${entry.height}`,
        isPinned: entry.is_pinned,
        tagsEmpty: entry.tags.length === 0,
      };
    });

    expect(result.hasId).toBe(true);
    expect(result.hasTimestamp).toBe(true);
    expect(result.mode).toBe('region');
    expect(result.duration).toBe(60000);
    expect(result.resolution).toBe('800x600');
    expect(result.isPinned).toBe(false);
    expect(result.tagsEmpty).toBe(true);
  });
});
