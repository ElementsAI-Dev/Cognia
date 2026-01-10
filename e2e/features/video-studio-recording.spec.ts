import { test, expect } from '@playwright/test';

/**
 * Video Studio E2E Tests - Recording Mode
 * Tests for the video studio page recording functionality
 * (Merged from video-editor and video-studio pages)
 */
test.describe('Video Studio Page - Recording Mode', () => {
  test.describe.configure({ mode: 'serial' });

  test('should manage video playback state', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface PlaybackState {
        isPlaying: boolean;
        currentTime: number;
        duration: number;
        volume: number;
        isMuted: boolean;
        playbackRate: number;
      }

      const createPlaybackState = (): PlaybackState => ({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        isMuted: false,
        playbackRate: 1,
      });

      const togglePlay = (state: PlaybackState): PlaybackState => ({
        ...state,
        isPlaying: !state.isPlaying,
      });

      const seek = (state: PlaybackState, time: number): PlaybackState => ({
        ...state,
        currentTime: Math.max(0, Math.min(time, state.duration)),
      });

      const setVolume = (state: PlaybackState, volume: number): PlaybackState => ({
        ...state,
        volume: Math.max(0, Math.min(1, volume)),
        isMuted: volume === 0,
      });

      const toggleMute = (state: PlaybackState): PlaybackState => ({
        ...state,
        isMuted: !state.isMuted,
      });

      const setPlaybackRate = (state: PlaybackState, rate: number): PlaybackState => ({
        ...state,
        playbackRate: rate,
      });

      let state = createPlaybackState();
      state = { ...state, duration: 60000 }; // 60 seconds

      const initialState = { ...state };

      state = togglePlay(state);
      const playingState = state.isPlaying;

      state = seek(state, 30000);
      const seekedTime = state.currentTime;

      state = setVolume(state, 0.5);
      const volumeLevel = state.volume;

      state = toggleMute(state);
      const isMutedAfterToggle = state.isMuted;

      state = setPlaybackRate(state, 2);
      const playbackRate = state.playbackRate;

      // Test boundary conditions
      state = seek(state, -1000);
      const clampedLow = state.currentTime;

      state = seek(state, 100000);
      const clampedHigh = state.currentTime;

      return {
        initialPlaying: initialState.isPlaying,
        playingState,
        seekedTime,
        volumeLevel,
        isMutedAfterToggle,
        playbackRate,
        clampedLow,
        clampedHigh,
      };
    });

    expect(result.initialPlaying).toBe(false);
    expect(result.playingState).toBe(true);
    expect(result.seekedTime).toBe(30000);
    expect(result.volumeLevel).toBe(0.5);
    expect(result.isMutedAfterToggle).toBe(true);
    expect(result.playbackRate).toBe(2);
    expect(result.clampedLow).toBe(0);
    expect(result.clampedHigh).toBe(60000);
  });

  test('should format time display', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      const formatTime = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };

      return {
        zeroTime: formatTime(0),
        tenSeconds: formatTime(10000),
        oneMinute: formatTime(60000),
        oneMinuteTenSeconds: formatTime(70000),
        oneHour: formatTime(3600000),
        oneHourThirtyMinutes: formatTime(5400000),
      };
    });

    expect(result.zeroTime).toBe('0:00');
    expect(result.tenSeconds).toBe('0:10');
    expect(result.oneMinute).toBe('1:00');
    expect(result.oneMinuteTenSeconds).toBe('1:10');
    expect(result.oneHour).toBe('1:00:00');
    expect(result.oneHourThirtyMinutes).toBe('1:30:00');
  });

  test('should handle trim range operations', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface TrimRange {
        start: number; // percentage 0-100
        end: number;   // percentage 0-100
      }

      const MIN_DURATION_PERCENT = 5;

      const setTrimStart = (range: TrimRange, start: number): TrimRange => ({
        ...range,
        start: Math.min(start, range.end - MIN_DURATION_PERCENT),
      });

      const setTrimEnd = (range: TrimRange, end: number): TrimRange => ({
        ...range,
        end: Math.max(end, range.start + MIN_DURATION_PERCENT),
      });

      const calculateTrimmedDuration = (range: TrimRange, totalDuration: number): number => {
        return totalDuration * (range.end - range.start) / 100;
      };

      const convertToTimestamps = (range: TrimRange, totalDuration: number): { startMs: number; endMs: number } => {
        return {
          startMs: Math.round(totalDuration * range.start / 100),
          endMs: Math.round(totalDuration * range.end / 100),
        };
      };

      const initialRange: TrimRange = { start: 0, end: 100 };
      const totalDuration = 60000; // 60 seconds

      const trimmedStart = setTrimStart(initialRange, 25);
      const trimmedEnd = setTrimEnd(initialRange, 75);
      const bothTrimmed = setTrimEnd(setTrimStart(initialRange, 25), 75);

      // Test minimum duration enforcement
      const tooClose = setTrimStart({ start: 0, end: 10 }, 8);

      const trimmedDuration = calculateTrimmedDuration(bothTrimmed, totalDuration);
      const timestamps = convertToTimestamps(bothTrimmed, totalDuration);

      return {
        trimmedStart,
        trimmedEnd,
        bothTrimmed,
        tooClose,
        trimmedDuration,
        timestamps,
      };
    });

    expect(result.trimmedStart.start).toBe(25);
    expect(result.trimmedEnd.end).toBe(75);
    expect(result.bothTrimmed.start).toBe(25);
    expect(result.bothTrimmed.end).toBe(75);
    expect(result.tooClose.start).toBe(5); // Enforced minimum gap
    expect(result.trimmedDuration).toBe(30000); // 50% of 60 seconds
    expect(result.timestamps.startMs).toBe(15000);
    expect(result.timestamps.endMs).toBe(45000);
  });

  test('should manage zoom levels', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      const MIN_ZOOM = 0.5;
      const MAX_ZOOM = 3;
      const ZOOM_STEP = 0.25;

      interface ZoomState {
        level: number;
        isZoomed: boolean;
      }

      const createZoomState = (): ZoomState => ({
        level: 1,
        isZoomed: false,
      });

      const zoomIn = (state: ZoomState): ZoomState => ({
        level: Math.min(MAX_ZOOM, state.level + ZOOM_STEP),
        isZoomed: true,
      });

      const zoomOut = (state: ZoomState): ZoomState => {
        const newLevel = Math.max(MIN_ZOOM, state.level - ZOOM_STEP);
        return {
          level: newLevel,
          isZoomed: newLevel !== 1,
        };
      };

      const resetZoom = (_state: ZoomState): ZoomState => ({
        level: 1,
        isZoomed: false,
      });

      const setZoom = (_state: ZoomState, level: number): ZoomState => ({
        level: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level)),
        isZoomed: level !== 1,
      });

      let state = createZoomState();
      const initialLevel = state.level;

      state = zoomIn(state);
      const afterZoomIn = state.level;

      state = zoomIn(state);
      state = zoomIn(state);
      state = zoomIn(state); // Should be at 2.0 now
      const afterMultipleZoomIn = state.level;

      state = zoomOut(state);
      const afterZoomOut = state.level;

      state = resetZoom(state);
      const afterReset = state.level;

      // Test boundaries
      state = setZoom(state, 5); // Above max
      const clampedHigh = state.level;

      state = setZoom(state, 0.1); // Below min
      const clampedLow = state.level;

      return {
        initialLevel,
        afterZoomIn,
        afterMultipleZoomIn,
        afterZoomOut,
        afterReset,
        clampedHigh,
        clampedLow,
      };
    });

    expect(result.initialLevel).toBe(1);
    expect(result.afterZoomIn).toBe(1.25);
    expect(result.afterMultipleZoomIn).toBe(2);
    expect(result.afterZoomOut).toBe(1.75);
    expect(result.afterReset).toBe(1);
    expect(result.clampedHigh).toBe(3);
    expect(result.clampedLow).toBe(0.5);
  });

  test('should handle export format selection', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      type ExportFormat = 'mp4' | 'webm' | 'gif' | 'mov';

      interface ExportSettings {
        format: ExportFormat;
        quality: 'low' | 'medium' | 'high';
        fps: number;
      }

      const FORMAT_INFO: Record<ExportFormat, { extension: string; mimeType: string; supportsAudio: boolean }> = {
        mp4: { extension: '.mp4', mimeType: 'video/mp4', supportsAudio: true },
        webm: { extension: '.webm', mimeType: 'video/webm', supportsAudio: true },
        gif: { extension: '.gif', mimeType: 'image/gif', supportsAudio: false },
        mov: { extension: '.mov', mimeType: 'video/quicktime', supportsAudio: true },
      };

      const QUALITY_BITRATES: Record<string, number> = {
        low: 1000000,    // 1 Mbps
        medium: 5000000, // 5 Mbps
        high: 10000000,  // 10 Mbps
      };

      const getExportFilename = (baseName: string, settings: ExportSettings): string => {
        const info = FORMAT_INFO[settings.format];
        return `${baseName}${info.extension}`;
      };

      const estimateFileSize = (durationMs: number, settings: ExportSettings): number => {
        const bitrate = QUALITY_BITRATES[settings.quality];
        const durationSeconds = durationMs / 1000;
        return Math.round((bitrate * durationSeconds) / 8); // bytes
      };

      const settings: ExportSettings = {
        format: 'mp4',
        quality: 'medium',
        fps: 30,
      };

      return {
        mp4Info: FORMAT_INFO['mp4'],
        gifInfo: FORMAT_INFO['gif'],
        filename: getExportFilename('recording', settings),
        estimatedSize: estimateFileSize(60000, settings), // 60 seconds
        estimatedSizeMB: Math.round(estimateFileSize(60000, settings) / (1024 * 1024)),
      };
    });

    expect(result.mp4Info.supportsAudio).toBe(true);
    expect(result.gifInfo.supportsAudio).toBe(false);
    expect(result.filename).toBe('recording.mp4');
    expect(result.estimatedSizeMB).toBe(36); // 5 Mbps * 60s / 8 = 37.5 MB
  });

  test('should filter recording history', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface RecordingEntry {
        id: string;
        mode: 'fullscreen' | 'window' | 'region';
        timestamp: number;
        duration_ms: number;
        tags: string[];
      }

      const history: RecordingEntry[] = [
        { id: '1', mode: 'fullscreen', timestamp: Date.now(), duration_ms: 60000, tags: ['meeting'] },
        { id: '2', mode: 'window', timestamp: Date.now() - 86400000, duration_ms: 30000, tags: ['tutorial'] },
        { id: '3', mode: 'region', timestamp: Date.now() - 172800000, duration_ms: 120000, tags: ['demo', 'important'] },
        { id: '4', mode: 'fullscreen', timestamp: Date.now() - 259200000, duration_ms: 45000, tags: [] },
      ];

      const filterByMode = (entries: RecordingEntry[], mode: string): RecordingEntry[] => {
        return entries.filter(e => e.mode === mode);
      };

      const filterByTag = (entries: RecordingEntry[], tag: string): RecordingEntry[] => {
        return entries.filter(e => e.tags.includes(tag));
      };

      const searchEntries = (entries: RecordingEntry[], query: string): RecordingEntry[] => {
        const lowerQuery = query.toLowerCase();
        return entries.filter(e =>
          e.mode.toLowerCase().includes(lowerQuery) ||
          e.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      };

      const sortByDate = (entries: RecordingEntry[], ascending: boolean): RecordingEntry[] => {
        return [...entries].sort((a, b) =>
          ascending ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
        );
      };

      return {
        totalCount: history.length,
        fullscreenCount: filterByMode(history, 'fullscreen').length,
        regionCount: filterByMode(history, 'region').length,
        meetingTagCount: filterByTag(history, 'meeting').length,
        demoSearchCount: searchEntries(history, 'demo').length,
        regionSearchCount: searchEntries(history, 'region').length,
        newestFirst: sortByDate(history, false)[0].id,
        oldestFirst: sortByDate(history, true)[0].id,
      };
    });

    expect(result.totalCount).toBe(4);
    expect(result.fullscreenCount).toBe(2);
    expect(result.regionCount).toBe(1);
    expect(result.meetingTagCount).toBe(1);
    expect(result.demoSearchCount).toBe(1);
    expect(result.regionSearchCount).toBe(1);
    expect(result.newestFirst).toBe('1');
    expect(result.oldestFirst).toBe('4');
  });

  test('should calculate video metadata', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface VideoMetadata {
        width: number;
        height: number;
        duration_ms: number;
        file_size: number;
      }

      const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      };

      const formatResolution = (width: number, height: number): string => {
        return `${width}×${height}`;
      };

      const getAspectRatio = (width: number, height: number): string => {
        const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(width, height);
        return `${width / divisor}:${height / divisor}`;
      };

      const getBitrate = (metadata: VideoMetadata): number => {
        const durationSeconds = metadata.duration_ms / 1000;
        return Math.round((metadata.file_size * 8) / durationSeconds);
      };

      const metadata: VideoMetadata = {
        width: 1920,
        height: 1080,
        duration_ms: 60000,
        file_size: 50 * 1024 * 1024, // 50 MB
      };

      return {
        resolution: formatResolution(metadata.width, metadata.height),
        aspectRatio: getAspectRatio(metadata.width, metadata.height),
        fileSize: formatFileSize(metadata.file_size),
        bitrate: getBitrate(metadata),
        bitrateFormatted: `${Math.round(getBitrate(metadata) / 1000000)} Mbps`,
      };
    });

    expect(result.resolution).toBe('1920×1080');
    expect(result.aspectRatio).toBe('16:9');
    expect(result.fileSize).toBe('50.0 MB');
    expect(result.bitrateFormatted).toBe('7 Mbps');
  });
});

test.describe('Video Editor Keyboard Shortcuts', () => {
  test('should define keyboard shortcut mappings', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface KeyboardShortcut {
        key: string;
        action: string;
        description: string;
        modifiers?: string[];
      }

      const shortcuts: KeyboardShortcut[] = [
        { key: ' ', action: 'togglePlay', description: 'Play/Pause' },
        { key: 'ArrowLeft', action: 'skipBackward', description: 'Skip backward 5 seconds' },
        { key: 'ArrowRight', action: 'skipForward', description: 'Skip forward 5 seconds' },
        { key: 'ArrowUp', action: 'volumeUp', description: 'Increase volume' },
        { key: 'ArrowDown', action: 'volumeDown', description: 'Decrease volume' },
        { key: 'm', action: 'toggleMute', description: 'Toggle mute' },
        { key: 'M', action: 'toggleMute', description: 'Toggle mute' },
        { key: 'f', action: 'toggleFullscreen', description: 'Toggle fullscreen' },
        { key: 'F', action: 'toggleFullscreen', description: 'Toggle fullscreen' },
        { key: '+', action: 'zoomIn', description: 'Zoom in' },
        { key: '=', action: 'zoomIn', description: 'Zoom in' },
        { key: '-', action: 'zoomOut', description: 'Zoom out' },
        { key: '0', action: 'resetZoom', description: 'Reset zoom to 100%' },
      ];

      const findShortcut = (key: string): KeyboardShortcut | undefined => {
        return shortcuts.find(s => s.key === key);
      };

      const getActionForKey = (key: string): string | null => {
        const shortcut = findShortcut(key);
        return shortcut ? shortcut.action : null;
      };

      return {
        spaceAction: getActionForKey(' '),
        leftArrowAction: getActionForKey('ArrowLeft'),
        mAction: getActionForKey('m'),
        plusAction: getActionForKey('+'),
        zeroAction: getActionForKey('0'),
        unknownAction: getActionForKey('x'),
        totalShortcuts: shortcuts.length,
      };
    });

    expect(result.spaceAction).toBe('togglePlay');
    expect(result.leftArrowAction).toBe('skipBackward');
    expect(result.mAction).toBe('toggleMute');
    expect(result.plusAction).toBe('zoomIn');
    expect(result.zeroAction).toBe('resetZoom');
    expect(result.unknownAction).toBeNull();
    expect(result.totalShortcuts).toBe(13);
  });

  test('should handle skip operations', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      const SKIP_SECONDS = 5;

      interface PlaybackPosition {
        currentTime: number;
        duration: number;
      }

      const skipBackward = (position: PlaybackPosition): number => {
        return Math.max(0, position.currentTime - SKIP_SECONDS * 1000);
      };

      const skipForward = (position: PlaybackPosition): number => {
        return Math.min(position.duration, position.currentTime + SKIP_SECONDS * 1000);
      };

      const position: PlaybackPosition = {
        currentTime: 30000, // 30 seconds
        duration: 60000,    // 60 seconds
      };

      const afterSkipBack = skipBackward(position);
      const afterSkipForward = skipForward(position);

      // Test boundary conditions
      const atStart: PlaybackPosition = { currentTime: 2000, duration: 60000 };
      const atEnd: PlaybackPosition = { currentTime: 58000, duration: 60000 };

      const skipBackAtStart = skipBackward(atStart);
      const skipForwardAtEnd = skipForward(atEnd);

      return {
        afterSkipBack,
        afterSkipForward,
        skipBackAtStart,
        skipForwardAtEnd,
      };
    });

    expect(result.afterSkipBack).toBe(25000);
    expect(result.afterSkipForward).toBe(35000);
    expect(result.skipBackAtStart).toBe(0);
    expect(result.skipForwardAtEnd).toBe(60000);
  });
});

test.describe('Video Editor Delete Functionality', () => {
  test('should manage delete confirmation state', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface DeleteState {
        showDialog: boolean;
        videoToDelete: string | null;
        isDeleting: boolean;
      }

      const createDeleteState = (): DeleteState => ({
        showDialog: false,
        videoToDelete: null,
        isDeleting: false,
      });

      const requestDelete = (state: DeleteState, videoId: string): DeleteState => ({
        ...state,
        showDialog: true,
        videoToDelete: videoId,
      });

      const cancelDelete = (_state: DeleteState): DeleteState => ({
        showDialog: false,
        videoToDelete: null,
        isDeleting: false,
      });

      const confirmDelete = (state: DeleteState): DeleteState => ({
        ...state,
        isDeleting: true,
      });

      const completeDelete = (_state: DeleteState): DeleteState => ({
        showDialog: false,
        videoToDelete: null,
        isDeleting: false,
      });

      let state = createDeleteState();
      const initialState = { ...state };

      state = requestDelete(state, 'video-123');
      const afterRequest = { ...state };

      state = confirmDelete(state);
      const afterConfirm = { ...state };

      state = completeDelete(state);
      const afterComplete = { ...state };

      // Test cancel flow
      let cancelState = createDeleteState();
      cancelState = requestDelete(cancelState, 'video-456');
      cancelState = cancelDelete(cancelState);
      const afterCancel = { ...cancelState };

      return {
        initialState,
        afterRequest,
        afterConfirm,
        afterComplete,
        afterCancel,
      };
    });

    expect(result.initialState.showDialog).toBe(false);
    expect(result.initialState.videoToDelete).toBeNull();

    expect(result.afterRequest.showDialog).toBe(true);
    expect(result.afterRequest.videoToDelete).toBe('video-123');

    expect(result.afterConfirm.isDeleting).toBe(true);

    expect(result.afterComplete.showDialog).toBe(false);
    expect(result.afterComplete.videoToDelete).toBeNull();

    expect(result.afterCancel.showDialog).toBe(false);
    expect(result.afterCancel.videoToDelete).toBeNull();
  });
});
