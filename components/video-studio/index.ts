/**
 * Video Studio Components
 * 
 * Organized by functionality:
 * - timeline/    - Timeline editing components
 * - preview/     - Video preview and playback
 * - effects/     - Effects and transitions
 * - audio/       - Audio mixing and waveform
 * - generation/  - AI video generation
 * - recording/   - Screen recording
 * - export/      - Video export and rendering
 * - composition/ - Layers and overlays
 * - management/  - Media library and details
 * - common/      - Shared utility components
 * - editor/      - Main editor panel
 */

// Types and constants
export * from '@/types/video-studio/types';
export * from './constants';

// Timeline components
export { VideoTimeline } from './timeline/video-timeline';
export type { VideoTimelineProps } from './timeline/video-timeline';

export { VideoTrimmer } from './timeline/video-trimmer';
export type { VideoTrimmerProps } from './timeline/video-trimmer';

export { VideoSubtitleTrack } from './timeline/video-subtitle-track';
export type { VideoSubtitleTrackProps } from './timeline/video-subtitle-track';

export { SpeedControls, DEFAULT_SPEED_SETTINGS } from './timeline/speed-controls';
export type { SpeedControlsProps, SpeedSettings, FrameBlendingMode } from './timeline/speed-controls';

export { MarkersPanel } from './timeline/markers-panel';
export type { MarkersPanelProps, Marker, MarkerType, MarkerColor } from './timeline/markers-panel';

// Preview components
export { VideoPreview } from './preview/video-preview';
export type { VideoPreviewProps } from './preview/video-preview';

export { VideoPreviewDialog } from './preview/video-preview-dialog';
export type { VideoPreviewDialogProps } from './preview/video-preview-dialog';

// Effects components
export { VideoEffectsPanel } from './effects/video-effects-panel';
export type { VideoEffectsPanelProps, AppliedEffect } from './effects/video-effects-panel';

export { VideoTransitions } from './effects/video-transitions';
export type { VideoTransitionsProps } from './effects/video-transitions';

export { ColorCorrectionPanel, DEFAULT_COLOR_CORRECTION_SETTINGS } from './effects/color-correction-panel';
export type { ColorCorrectionPanelProps, ColorCorrectionSettings } from './effects/color-correction-panel';

// Audio components
export { VideoWaveform } from './audio/video-waveform';
export type { VideoWaveformProps, WaveformData } from './audio/video-waveform';

export { AudioMixerPanel } from './audio/audio-mixer-panel';
export type { AudioMixerPanelProps, AudioTrack } from './audio/audio-mixer-panel';

export { AudioTrackControls, DEFAULT_AUDIO_TRACK_SETTINGS } from './audio/audio-track-controls';
export type { AudioTrackControlsProps, AudioTrackSettings } from './audio/audio-track-controls';

// Generation components
export { AIGenerationSidebar } from './generation/ai-generation-sidebar';
export type { AIGenerationSidebarProps } from './generation/ai-generation-sidebar';

export { VideoJobCard, getStatusBadge } from './generation/video-job-card';
export type { VideoJobCardProps } from './generation/video-job-card';

// Recording components
export { VideoStudioHeader } from './recording/video-studio-header';
export type { VideoStudioHeaderProps } from './recording/video-studio-header';

export { RecordingSidebar } from './recording/recording-sidebar';
export type { RecordingSidebarProps } from './recording/recording-sidebar';

// Export components
export { ExportDialog } from './export/export-dialog';
export type { ExportDialogProps, ExportSettings } from './export/export-dialog';

export { ExportProgress } from './export/export-progress';
export type { ExportProgressProps, ExportStage } from './export/export-progress';

export { RenderQueue } from './export/render-queue';
export type { RenderQueueProps, RenderJob, RenderJobStatus } from './export/render-queue';

// Composition components
export { LayerPanel } from './composition/layer-panel';
export type { LayerPanelProps, VideoLayer, LayerType, BlendMode } from './composition/layer-panel';

export { TextOverlayEditor } from './composition/text-overlay-editor';
export type { TextOverlayEditorProps, TextOverlay, TextAlignment, TextAnimation } from './composition/text-overlay-editor';

// Management components
export { MediaLibraryPanel } from './management/media-library-panel';
export type { MediaLibraryPanelProps, MediaAsset, MediaType } from './management/media-library-panel';

export { VideoDetailsPanel } from './management/video-details-panel';
export type { VideoDetailsPanelProps } from './management/video-details-panel';

export { DeleteConfirmDialog } from './management/delete-confirm-dialog';
export type { DeleteConfirmDialogProps } from './management/delete-confirm-dialog';

// Common components
export { PlaybackControls } from './common/playback-controls';
export type { PlaybackControlsProps } from './common/playback-controls';

export { ZoomControls } from './common/zoom-controls';
export type { ZoomControlsProps } from './common/zoom-controls';

export { HistoryPanel } from './common/history-panel';
export type { HistoryPanelProps, HistoryEntry, HistoryActionType } from './common/history-panel';

export { KeyboardShortcutsPanel, DEFAULT_SHORTCUTS } from './common/keyboard-shortcuts-panel';
export type { KeyboardShortcutsPanelProps, KeyboardShortcut, ShortcutCategory } from './common/keyboard-shortcuts-panel';

export { ProjectSettingsPanel, DEFAULT_PROJECT_SETTINGS } from './common/project-settings-panel';
export type { ProjectSettingsPanelProps, ProjectSettings, AspectRatio, FrameRate } from './common/project-settings-panel';

// Editor components
export { VideoEditorPanel } from './editor/video-editor-panel';
export type { VideoEditorPanelProps } from './editor/video-editor-panel';
