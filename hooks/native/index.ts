/**
 * Window/Native/System related hooks
 */

export {
  useWindow,
  type UseWindowReturn,
} from './use-window';
export {
  useWindowControls,
  type UseWindowControlsReturn,
} from './use-window-controls';
export {
  useNative,
  type UseNativeOptions,
  type UseNativeReturn,
} from './use-native';
export { useAutostart } from './use-autostart';
export {
  useFileWatcher,
  useMultiFileWatcher,
  type UseFileWatcherOptions,
  type UseFileWatcherResult,
} from './use-file-watcher';
export {
  useScreenshot,
  useScreenshotHistory,
  type ScreenshotMetadata,
  type ScreenshotResult,
  type ScreenshotHistoryEntry,
  type MonitorInfo,
  type WinOcrResult,
} from './use-screenshot';
export {
  useNotification,
  type UseNotificationReturn,
} from './use-notification';
export {
  useStronghold,
  type StrongholdState,
  type UseStrongholdReturn,
} from './use-stronghold';
export {
  useGit,
  type UseGitOptions,
  type UseGitReturn,
} from './use-git';
export {
  useScreenRecording,
  type UseScreenRecordingOptions,
  type UseScreenRecordingReturn,
  type RecordingMode,
} from './use-screen-recording';
