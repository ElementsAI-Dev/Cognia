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

export {
  useUsageStore,
  type ModelUsage,
  type PerformanceMetrics,
  type QuotaLimits,
} from './usage-store';

export { useRecentFilesStore, selectRecentFiles, type RecentFile } from './recent-files-store';

export {
  useNativeStore,
  type ShortcutConfig,
  type NativeToolsConfig,
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
  useProxyHealth,
  useProxyHealthMonitoring,
  getActiveProxyUrl,
  type ProxyState,
  type ProxyActions,
  type ProxyHealthCheckResult,
  type ProxyHealthState,
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

export { useBackupStore } from './backup-store';

export {
  useTrayStore,
  selectTrayConfig,
  selectTrayDisplayMode,
  selectTrayState,
  selectTrayIconState,
  selectTrayMenuItems,
  selectTrayIsSynced,
  selectCompactModeItems,
  useTrayConfig,
  useTrayDisplayMode,
  useTrayStateHook,
  useTrayIconState,
  useTrayMenuItems,
  type TrayStoreState,
  type TrayStoreActions,
} from './tray-store';

