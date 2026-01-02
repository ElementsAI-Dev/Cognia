/**
 * System stores index
 */

export {
  useUIStore,
  selectSidebarOpen,
  selectActiveModal,
  selectCommandPaletteOpen,
  type ModalType,
} from './ui-store';

export { useUsageStore } from './usage-store';

export {
  useRecentFilesStore,
  selectRecentFiles,
  type RecentFile,
} from './recent-files-store';

export {
  useNativeStore,
  type ShortcutConfig,
  type NativeState,
  type NativeActions,
} from './native-store';

export {
  useEnvironmentStore,
  useEnvironmentPlatform,
  useToolStatus,
  useInstallProgress,
  useIsToolInstalled,
  useEnvironmentRefreshing,
  useEnvironmentInstalling,
  type EnvironmentState,
  type EnvironmentActions,
} from './environment-store';

export {
  useProxyStore,
  useProxyConfig,
  useProxyStatus,
  useProxyMode,
  useProxyEnabled,
  useDetectedProxies,
  useProxyDetecting,
  useProxyTesting,
  getActiveProxyUrl,
  type ProxyState,
  type ProxyActions,
} from './proxy-store';

export {
  useWindowStore,
  selectWindowState,
  selectWindowPreferences,
  selectWindowSize,
  selectWindowPosition,
  selectWindowConstraints,
  selectIsMaximized,
  selectIsFullscreen,
  selectIsAlwaysOnTop,
  type CursorIcon,
  type UserAttentionType,
  type WindowSize,
  type WindowPosition,
  type WindowConstraints,
  type WindowState,
  type WindowPreferences,
} from './window-store';

export {
  useVirtualEnvStore,
  selectActiveEnv,
  selectEnvById,
  selectEnvsByProject,
  selectProjectConfigByPath,
  selectFilteredEnvironments,
  selectEnvsByType,
  selectEnvsByStatus,
  selectSelectedEnvs,
  selectEnvCount,
  selectActiveEnvCount,
  selectTotalPackages,
  selectEnvsByPythonVersion,
  selectRecentEnvs,
  selectHasSelection,
  selectSelectionCount,
  selectIsEnvSelected,
  useFilteredEnvironments,
  useSelectedEnvs,
  useEnvStats,
  useRecentEnvs,
  type VirtualEnvState,
  type VirtualEnvActions,
} from './virtual-env-store';
