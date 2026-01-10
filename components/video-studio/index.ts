/**
 * Video Studio Components
 * Export all video editing components
 */

// Types and constants
export * from './types';
export * from './constants';

// Core timeline and editing components
export { VideoTimeline } from './video-timeline';
export type { VideoTimelineProps } from './video-timeline';

export { VideoTrimmer } from './video-trimmer';
export type { VideoTrimmerProps } from './video-trimmer';

export { VideoTransitions } from './video-transitions';
export type { VideoTransitionsProps } from './video-transitions';

export { VideoEffectsPanel } from './video-effects-panel';
export type { VideoEffectsPanelProps, AppliedEffect } from './video-effects-panel';

export { VideoPreview } from './video-preview';
export type { VideoPreviewProps } from './video-preview';

export { VideoEditorPanel } from './video-editor-panel';
export type { VideoEditorPanelProps } from './video-editor-panel';

export { VideoSubtitleTrack } from './video-subtitle-track';
export type { VideoSubtitleTrackProps } from './video-subtitle-track';

export { VideoWaveform } from './video-waveform';
export type { VideoWaveformProps, WaveformData } from './video-waveform';

export { PlaybackControls } from './playback-controls';
export type { PlaybackControlsProps } from './playback-controls';

export { ZoomControls } from './zoom-controls';
export type { ZoomControlsProps } from './zoom-controls';

// Video Studio page components
export { VideoStudioHeader } from './video-studio-header';
export type { VideoStudioHeaderProps } from './video-studio-header';

export { RecordingSidebar } from './recording-sidebar';
export type { RecordingSidebarProps } from './recording-sidebar';

export { AIGenerationSidebar } from './ai-generation-sidebar';
export type { AIGenerationSidebarProps } from './ai-generation-sidebar';

export { VideoJobCard, getStatusBadge } from './video-job-card';
export type { VideoJobCardProps } from './video-job-card';

export { VideoDetailsPanel } from './video-details-panel';
export type { VideoDetailsPanelProps } from './video-details-panel';

export { VideoPreviewDialog } from './video-preview-dialog';
export type { VideoPreviewDialogProps } from './video-preview-dialog';

export { DeleteConfirmDialog } from './delete-confirm-dialog';
export type { DeleteConfirmDialogProps } from './delete-confirm-dialog';
