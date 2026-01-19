/**
 * Common Components
 * Shared utility components used across video studio
 */

export { PlaybackControls } from './playback-controls';
export type { PlaybackControlsProps } from './playback-controls';

export { ZoomControls } from './zoom-controls';
export type { ZoomControlsProps } from './zoom-controls';

export { HistoryPanel } from './history-panel';
export type { HistoryPanelProps, HistoryEntry, HistoryActionType } from './history-panel';

export { KeyboardShortcutsPanel, DEFAULT_SHORTCUTS } from './keyboard-shortcuts-panel';
export type { KeyboardShortcutsPanelProps, KeyboardShortcut, ShortcutCategory } from './keyboard-shortcuts-panel';

export { ProjectSettingsPanel, DEFAULT_PROJECT_SETTINGS } from './project-settings-panel';
export type { ProjectSettingsPanelProps, ProjectSettings, AspectRatio, FrameRate } from './project-settings-panel';
