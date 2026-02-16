/**
 * Media stores index
 */

export {
  useMediaStore,
  selectImages,
  selectVideos,
  selectRecentImages,
  selectRecentVideos,
  selectFavoriteImages,
  selectFavoriteVideos,
  selectPendingVideos,
  type GeneratedImageRecord,
  type GeneratedVideoRecord,
  type MediaStats,
  type MediaFilter,
} from './media-store';

export {
  useImageStudioStore,
  selectImages as selectStudioImages,
  selectSelectedImage,
  selectFavoriteImages as selectStudioFavoriteImages,
  selectFilteredImages,
  selectIsEditing,
  selectHasUnsavedChanges,
  type EditingTool,
  type MaskStroke,
  type EditorLayer, // @deprecated - use Layer from @/types
  type StudioImage,
  type EditOperation,
  type GenerationSettings,
  type BrushSettings,
  type ExportSettings,
  type ViewState,
} from './image-studio-store';

// Re-export types used by image studio from canonical source
export type {
  ImageAdjustments,
  CropRegion,
  ImageTransform,
  Layer,
  HistoryEntry,
} from '@/types/media/image-studio';

export {
  useScreenRecordingStore,
  useIsRecording,
  useRecordingStatus,
  type RecordingMode,
} from './screen-recording-store';

export {
  useRecordingToolbarStore,
  selectToolbarVisible,
  selectToolbarConfig,
  selectRecordingState,
  selectSnappedEdge,
  selectIsCompact,
} from './recording-toolbar-store';

export {
  useScreenshotStore,
  selectHistory,
  selectPinnedScreenshots,
  selectRecentScreenshots,
  selectScreenshotById,
  type ScreenshotConfig,
  type ScreenshotHistoryEntry,
  type ScreenshotMetadata,
  type ScreenshotResult,
  type MonitorInfo as ScreenshotMonitorInfo,
} from './screenshot-store';

export {
  useBatchEditStore,
  selectActiveJob,
  selectIsProcessing,
  selectPresets,
  selectJobs,
  type BatchImage,
  type BatchPreset,
  type BatchJob,
  type BatchEditState,
} from './batch-edit-store';

export {
  useVideoEditorStore,
  selectCurrentProject,
  selectRecentProjects,
  selectPreferences,
  selectCanUndo,
  selectCanRedo,
  type VideoProject,
  type RecentProject,
  type EditorPreferences,
  type HistorySnapshot,
} from './video-editor-store';
