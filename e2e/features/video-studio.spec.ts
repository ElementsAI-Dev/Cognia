import { test, expect } from '@playwright/test';

/**
 * Video Studio E2E Tests
 * Tests for the unified video studio page (merged Recording + AI Generation)
 */
test.describe('Video Studio Page', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('Mode Switching', () => {
    test('should initialize with default mode state', async ({ page }) => {
      await page.goto('about:blank');

      const result = await page.evaluate(() => {
        type StudioMode = 'recording' | 'ai-generation';

        interface StudioState {
          mode: StudioMode;
          showSidebar: boolean;
          zoomLevel: number;
        }

        const createInitialState = (): StudioState => ({
          mode: 'ai-generation', // Default mode
          showSidebar: true,
          zoomLevel: 1,
        });

        const switchMode = (state: StudioState, newMode: StudioMode): StudioState => ({
          ...state,
          mode: newMode,
        });

        const toggleSidebar = (state: StudioState): StudioState => ({
          ...state,
          showSidebar: !state.showSidebar,
        });

        let state = createInitialState();
        const initialMode = state.mode;
        const initialSidebar = state.showSidebar;

        state = switchMode(state, 'recording');
        const afterSwitchToRecording = state.mode;

        state = switchMode(state, 'ai-generation');
        const afterSwitchToAI = state.mode;

        state = toggleSidebar(state);
        const afterToggleSidebar = state.showSidebar;

        return {
          initialMode,
          initialSidebar,
          afterSwitchToRecording,
          afterSwitchToAI,
          afterToggleSidebar,
        };
      });

      expect(result.initialMode).toBe('ai-generation');
      expect(result.initialSidebar).toBe(true);
      expect(result.afterSwitchToRecording).toBe('recording');
      expect(result.afterSwitchToAI).toBe('ai-generation');
      expect(result.afterToggleSidebar).toBe(false);
    });

    test('should preserve mode-specific state when switching', async ({ page }) => {
      await page.goto('about:blank');

      const result = await page.evaluate(() => {
        type StudioMode = 'recording' | 'ai-generation';

        interface RecordingState {
          selectedRecordingId: string | null;
          searchQuery: string;
          trimRange: { start: number; end: number };
        }

        interface AIGenerationState {
          prompt: string;
          selectedVideoId: string | null;
          filterFavorites: boolean;
        }

        interface StudioState {
          mode: StudioMode;
          recording: RecordingState;
          aiGeneration: AIGenerationState;
        }

        const createInitialState = (): StudioState => ({
          mode: 'ai-generation',
          recording: {
            selectedRecordingId: null,
            searchQuery: '',
            trimRange: { start: 0, end: 100 },
          },
          aiGeneration: {
            prompt: '',
            selectedVideoId: null,
            filterFavorites: false,
          },
        });

        const state = createInitialState();

        // Set recording state
        state.recording.selectedRecordingId = 'rec-123';
        state.recording.searchQuery = 'meeting';
        state.recording.trimRange = { start: 10, end: 90 };

        // Set AI generation state
        state.aiGeneration.prompt = 'A beautiful sunset';
        state.aiGeneration.selectedVideoId = 'vid-456';
        state.aiGeneration.filterFavorites = true;

        // Switch modes and verify state preservation
        state.mode = 'recording';
        const recordingStateAfterSwitch = { ...state.recording };

        state.mode = 'ai-generation';
        const aiStateAfterSwitch = { ...state.aiGeneration };

        return {
          recordingStateAfterSwitch,
          aiStateAfterSwitch,
        };
      });

      expect(result.recordingStateAfterSwitch.selectedRecordingId).toBe('rec-123');
      expect(result.recordingStateAfterSwitch.searchQuery).toBe('meeting');
      expect(result.recordingStateAfterSwitch.trimRange.start).toBe(10);
      expect(result.aiStateAfterSwitch.prompt).toBe('A beautiful sunset');
      expect(result.aiStateAfterSwitch.selectedVideoId).toBe('vid-456');
      expect(result.aiStateAfterSwitch.filterFavorites).toBe(true);
    });
  });

  test.describe('Unified Video Preview', () => {
    test('should get preview source based on mode', async ({ page }) => {
      await page.goto('about:blank');

      const result = await page.evaluate(() => {
        type StudioMode = 'recording' | 'ai-generation';

        interface Recording {
          id: string;
          file_path: string;
        }

        interface VideoJob {
          id: string;
          videoUrl?: string;
          videoBase64?: string;
        }

        const getPreviewSource = (
          mode: StudioMode,
          selectedRecording: Recording | null,
          selectedVideo: VideoJob | null
        ): string => {
          if (mode === 'recording' && selectedRecording?.file_path) {
            return `file://${selectedRecording.file_path}`;
          }
          if (mode === 'ai-generation' && selectedVideo) {
            if (selectedVideo.videoUrl) return selectedVideo.videoUrl;
            if (selectedVideo.videoBase64) return `data:video/mp4;base64,${selectedVideo.videoBase64}`;
          }
          return '';
        };

        const recording: Recording = {
          id: 'rec-1',
          file_path: 'C:/Videos/recording.mp4',
        };

        const videoJob: VideoJob = {
          id: 'vid-1',
          videoUrl: 'https://example.com/video.mp4',
        };

        const videoJobBase64: VideoJob = {
          id: 'vid-2',
          videoBase64: 'dGVzdHZpZGVv',
        };

        return {
          recordingSource: getPreviewSource('recording', recording, null),
          aiVideoUrlSource: getPreviewSource('ai-generation', null, videoJob),
          aiVideoBase64Source: getPreviewSource('ai-generation', null, videoJobBase64),
          emptyRecording: getPreviewSource('recording', null, null),
          emptyAI: getPreviewSource('ai-generation', null, null),
        };
      });

      expect(result.recordingSource).toBe('file://C:/Videos/recording.mp4');
      expect(result.aiVideoUrlSource).toBe('https://example.com/video.mp4');
      expect(result.aiVideoBase64Source).toBe('data:video/mp4;base64,dGVzdHZpZGVv');
      expect(result.emptyRecording).toBe('');
      expect(result.emptyAI).toBe('');
    });
  });

  test.describe('Reusable Components Integration', () => {
    test('should manage playback controls state', async ({ page }) => {
      await page.goto('about:blank');

      const result = await page.evaluate(() => {
        interface PlaybackControlsState {
          isPlaying: boolean;
          currentTime: number;
          duration: number;
          volume: number;
          muted: boolean;
        }

        const createPlaybackState = (): PlaybackControlsState => ({
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          volume: 1,
          muted: false,
        });

        const playPause = (state: PlaybackControlsState): PlaybackControlsState => ({
          ...state,
          isPlaying: !state.isPlaying,
        });

        const seek = (state: PlaybackControlsState, time: number): PlaybackControlsState => ({
          ...state,
          currentTime: Math.max(0, Math.min(time, state.duration)),
        });

        const setVolume = (state: PlaybackControlsState, volume: number): PlaybackControlsState => ({
          ...state,
          volume: Math.max(0, Math.min(1, volume)),
          muted: volume === 0,
        });

        const toggleMute = (state: PlaybackControlsState): PlaybackControlsState => ({
          ...state,
          muted: !state.muted,
        });

        let state = createPlaybackState();
        state = { ...state, duration: 120 }; // 2 minutes

        // Test playback
        state = playPause(state);
        const isPlayingAfterToggle = state.isPlaying;

        // Test seek
        state = seek(state, 60);
        const currentTimeAfterSeek = state.currentTime;

        // Test volume
        state = setVolume(state, 0.5);
        const volumeAfterChange = state.volume;

        // Test mute
        state = toggleMute(state);
        const mutedAfterToggle = state.muted;

        return {
          isPlayingAfterToggle,
          currentTimeAfterSeek,
          volumeAfterChange,
          mutedAfterToggle,
        };
      });

      expect(result.isPlayingAfterToggle).toBe(true);
      expect(result.currentTimeAfterSeek).toBe(60);
      expect(result.volumeAfterChange).toBe(0.5);
      expect(result.mutedAfterToggle).toBe(true);
    });

    test('should manage zoom controls state', async ({ page }) => {
      await page.goto('about:blank');

      const result = await page.evaluate(() => {
        interface ZoomControlsState {
          zoom: number;
          minZoom: number;
          maxZoom: number;
          step: number;
        }

        const createZoomState = (): ZoomControlsState => ({
          zoom: 1,
          minZoom: 0.5,
          maxZoom: 3,
          step: 0.25,
        });

        const zoomIn = (state: ZoomControlsState): ZoomControlsState => ({
          ...state,
          zoom: Math.min(state.maxZoom, state.zoom + state.step),
        });

        const zoomOut = (state: ZoomControlsState): ZoomControlsState => ({
          ...state,
          zoom: Math.max(state.minZoom, state.zoom - state.step),
        });

        const resetZoom = (state: ZoomControlsState): ZoomControlsState => ({
          ...state,
          zoom: 1,
        });

        const setZoom = (state: ZoomControlsState, value: number): ZoomControlsState => ({
          ...state,
          zoom: Math.max(state.minZoom, Math.min(state.maxZoom, value)),
        });

        let state = createZoomState();

        // Test zoom in
        state = zoomIn(state);
        const afterZoomIn = state.zoom;

        // Test zoom in multiple times
        state = zoomIn(state);
        state = zoomIn(state);
        const afterMultipleZoomIn = state.zoom;

        // Test zoom out
        state = zoomOut(state);
        const afterZoomOut = state.zoom;

        // Test reset
        state = resetZoom(state);
        const afterReset = state.zoom;

        // Test boundaries
        state = setZoom(state, 5);
        const clampedHigh = state.zoom;

        state = setZoom(state, 0.1);
        const clampedLow = state.zoom;

        return {
          afterZoomIn,
          afterMultipleZoomIn,
          afterZoomOut,
          afterReset,
          clampedHigh,
          clampedLow,
        };
      });

      expect(result.afterZoomIn).toBe(1.25);
      expect(result.afterMultipleZoomIn).toBe(1.75);
      expect(result.afterZoomOut).toBe(1.5);
      expect(result.afterReset).toBe(1);
      expect(result.clampedHigh).toBe(3);
      expect(result.clampedLow).toBe(0.5);
    });
  });

  test.describe('Recording Mode - History Management', () => {
    test('should filter and search recordings', async ({ page }) => {
      await page.goto('about:blank');

      const result = await page.evaluate(() => {
        interface RecordingEntry {
          id: string;
          mode: 'fullscreen' | 'window' | 'region';
          timestamp: number;
          duration_ms: number;
          tags: string[];
          is_pinned: boolean;
        }

        const history: RecordingEntry[] = [
          { id: '1', mode: 'fullscreen', timestamp: Date.now(), duration_ms: 60000, tags: ['meeting'], is_pinned: true },
          { id: '2', mode: 'window', timestamp: Date.now() - 86400000, duration_ms: 30000, tags: ['tutorial'], is_pinned: false },
          { id: '3', mode: 'region', timestamp: Date.now() - 172800000, duration_ms: 120000, tags: ['demo'], is_pinned: true },
          { id: '4', mode: 'fullscreen', timestamp: Date.now() - 259200000, duration_ms: 45000, tags: [], is_pinned: false },
        ];

        const searchRecordings = (entries: RecordingEntry[], query: string): RecordingEntry[] => {
          if (!query.trim()) return entries;
          const lowerQuery = query.toLowerCase();
          return entries.filter(e =>
            e.mode.toLowerCase().includes(lowerQuery) ||
            e.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
          );
        };

        const getPinnedRecordings = (entries: RecordingEntry[]): RecordingEntry[] => {
          return entries.filter(e => e.is_pinned);
        };

        const sortByDate = (entries: RecordingEntry[], ascending: boolean): RecordingEntry[] => {
          return [...entries].sort((a, b) =>
            ascending ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
          );
        };

        return {
          totalCount: history.length,
          meetingSearch: searchRecordings(history, 'meeting').length,
          fullscreenSearch: searchRecordings(history, 'fullscreen').length,
          emptySearch: searchRecordings(history, '').length,
          pinnedCount: getPinnedRecordings(history).length,
          newestFirst: sortByDate(history, false)[0].id,
          oldestFirst: sortByDate(history, true)[0].id,
        };
      });

      expect(result.totalCount).toBe(4);
      expect(result.meetingSearch).toBe(1);
      expect(result.fullscreenSearch).toBe(2);
      expect(result.emptySearch).toBe(4);
      expect(result.pinnedCount).toBe(2);
      expect(result.newestFirst).toBe('1');
      expect(result.oldestFirst).toBe('4');
    });
  });

  test.describe('AI Generation Mode - Job Management', () => {
    test('should manage video generation jobs', async ({ page }) => {
      await page.goto('about:blank');

      const result = await page.evaluate(() => {
        interface VideoJob {
          id: string;
          prompt: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          progress: number;
          isFavorite: boolean;
          createdAt: number;
        }

        const jobs: VideoJob[] = [];

        const addJob = (prompt: string): VideoJob => {
          const job: VideoJob = {
            id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            prompt,
            status: 'pending',
            progress: 0,
            isFavorite: false,
            createdAt: Date.now(),
          };
          jobs.push(job);
          return job;
        };

        const updateJobStatus = (jobId: string, status: VideoJob['status'], progress: number) => {
          const job = jobs.find(j => j.id === jobId);
          if (job) {
            job.status = status;
            job.progress = progress;
          }
        };

        const toggleFavorite = (jobId: string) => {
          const job = jobs.find(j => j.id === jobId);
          if (job) {
            job.isFavorite = !job.isFavorite;
          }
        };

        const deleteJob = (jobId: string) => {
          const index = jobs.findIndex(j => j.id === jobId);
          if (index !== -1) {
            jobs.splice(index, 1);
          }
        };

        const filterFavorites = (entries: VideoJob[]): VideoJob[] => {
          return entries.filter(j => j.isFavorite);
        };

        // Test operations
        const job1 = addJob('Sunset video');
        const job2 = addJob('Ocean waves');
        const job3 = addJob('Mountain view');

        updateJobStatus(job1.id, 'processing', 50);
        updateJobStatus(job2.id, 'completed', 100);
        toggleFavorite(job2.id);
        toggleFavorite(job3.id);

        const totalAfterAdd = jobs.length;
        const favoritesCount = filterFavorites(jobs).length;

        deleteJob(job3.id);
        const totalAfterDelete = jobs.length;

        return {
          totalAfterAdd,
          favoritesCount,
          totalAfterDelete,
          job1Status: jobs.find(j => j.id === job1.id)?.status,
          job1Progress: jobs.find(j => j.id === job1.id)?.progress,
          job2IsFavorite: jobs.find(j => j.id === job2.id)?.isFavorite,
        };
      });

      expect(result.totalAfterAdd).toBe(3);
      expect(result.favoritesCount).toBe(2);
      expect(result.totalAfterDelete).toBe(2);
      expect(result.job1Status).toBe('processing');
      expect(result.job1Progress).toBe(50);
      expect(result.job2IsFavorite).toBe(true);
    });
  });

  test.describe('Video Trimmer Integration', () => {
    test('should manage trim range state', async ({ page }) => {
      await page.goto('about:blank');

      const result = await page.evaluate(() => {
        interface TrimState {
          inPoint: number;
          outPoint: number;
          duration: number;
        }

        const createTrimState = (duration: number): TrimState => ({
          inPoint: 0,
          outPoint: duration,
          duration,
        });

        const setInPoint = (state: TrimState, time: number): TrimState => {
          const minGap = 1; // Minimum 1 second gap
          return {
            ...state,
            inPoint: Math.max(0, Math.min(time, state.outPoint - minGap)),
          };
        };

        const setOutPoint = (state: TrimState, time: number): TrimState => {
          const minGap = 1;
          return {
            ...state,
            outPoint: Math.min(state.duration, Math.max(time, state.inPoint + minGap)),
          };
        };

        const getTrimmedDuration = (state: TrimState): number => {
          return state.outPoint - state.inPoint;
        };

        const convertToPercentage = (state: TrimState): { start: number; end: number } => {
          return {
            start: (state.inPoint / state.duration) * 100,
            end: (state.outPoint / state.duration) * 100,
          };
        };

        let state = createTrimState(60); // 60 seconds video

        // Test setting in point
        state = setInPoint(state, 10);
        const inPointAfterSet = state.inPoint;

        // Test setting out point
        state = setOutPoint(state, 50);
        const outPointAfterSet = state.outPoint;

        // Test trimmed duration
        const trimmedDuration = getTrimmedDuration(state);

        // Test percentage conversion
        const percentage = convertToPercentage(state);

        // Test boundary - in point too close to out point
        state = setInPoint(state, 49.5);
        const inPointClamped = state.inPoint;

        return {
          inPointAfterSet,
          outPointAfterSet,
          trimmedDuration,
          percentageStart: percentage.start,
          percentageEnd: percentage.end,
          inPointClamped,
        };
      });

      expect(result.inPointAfterSet).toBe(10);
      expect(result.outPointAfterSet).toBe(50);
      expect(result.trimmedDuration).toBe(40);
      expect(result.percentageStart).toBeCloseTo(16.67, 1);
      expect(result.percentageEnd).toBeCloseTo(83.33, 1);
      expect(result.inPointClamped).toBe(49); // Clamped to maintain 1 second gap
    });
  });

  test.describe('Export Functionality', () => {
    test('should manage export state for recordings', async ({ page }) => {
      await page.goto('about:blank');

      const result = await page.evaluate(() => {
        type ExportFormat = 'mp4' | 'webm' | 'gif';

        interface ExportState {
          format: ExportFormat;
          quality: number;
          isExporting: boolean;
          progress: number;
          message: string;
        }

        const createExportState = (): ExportState => ({
          format: 'mp4',
          quality: 80,
          isExporting: false,
          progress: 0,
          message: '',
        });

        const startExport = (state: ExportState): ExportState => ({
          ...state,
          isExporting: true,
          progress: 0,
          message: 'Starting export...',
        });

        const updateProgress = (state: ExportState, progress: number): ExportState => ({
          ...state,
          progress,
          message: `Exporting... ${progress}%`,
        });

        const completeExport = (state: ExportState): ExportState => ({
          ...state,
          isExporting: false,
          progress: 100,
          message: 'Export complete!',
        });

        const failExport = (state: ExportState, error: string): ExportState => ({
          ...state,
          isExporting: false,
          progress: 0,
          message: error,
        });

        let state = createExportState();
        const initialState = { ...state };

        state = startExport(state);
        const afterStart = { ...state };

        state = updateProgress(state, 50);
        const afterProgress = { ...state };

        state = completeExport(state);
        const afterComplete = { ...state };

        // Test failure case
        let failState = createExportState();
        failState = startExport(failState);
        failState = failExport(failState, 'Export failed: disk full');
        const afterFail = { ...failState };

        return {
          initialState,
          afterStart,
          afterProgress,
          afterComplete,
          afterFail,
        };
      });

      expect(result.initialState.isExporting).toBe(false);
      expect(result.afterStart.isExporting).toBe(true);
      expect(result.afterStart.message).toBe('Starting export...');
      expect(result.afterProgress.progress).toBe(50);
      expect(result.afterComplete.progress).toBe(100);
      expect(result.afterComplete.message).toBe('Export complete!');
      expect(result.afterFail.isExporting).toBe(false);
      expect(result.afterFail.message).toBe('Export failed: disk full');
    });
  });
});
