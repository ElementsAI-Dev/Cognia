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
  type ImageAdjustments,
  type CropRegion,
  type ImageTransform,
  type MaskStroke,
  type EditorLayer,
  type StudioImage,
  type EditOperation,
  type GenerationSettings,
  type BrushSettings,
  type ExportSettings,
  type ViewState,
} from './image-studio-store';

export {
  useScreenRecordingStore,
  useIsRecording,
  useRecordingStatus,
  type RecordingMode,
} from './screen-recording-store';
