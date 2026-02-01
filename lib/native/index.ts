/**
 * Native Module - Unified exports for Tauri native integrations
 * Provides cross-platform native functionality for the desktop app
 */

export * from './notification';
export * from './window';
export * from './shortcuts';
export * from './updater';
export * from './system';
export * from './utils';

// Namespaced exports to avoid conflicts
export * as selection from './selection';
export * as screenshot from './screenshot';
export * as screenRecording from './screen-recording';
export * as recordingToolbar from './recording-toolbar';
export * as recordingErrors from './recording-errors';
export * as context from './context';
export * as awareness from './awareness';
export * as sandbox from './sandbox';
export * as sandboxDb from './sandbox-db';
export * as environment from './environment';
export * as process from './process';
export * as proxy from './proxy';
export * as opener from './opener';
export * as deepLink from './deep-link';
export * as stronghold from './stronghold';
export * as strongholdIntegration from './stronghold-integration';
export * as git from './git';
export * as vcs from './vcs';
export * as skill from './skill';
export * as modelDownloadHelpers from './model-download-helpers';
export * as tray from './tray';

// Logging integration
export * from './tauri-log-bridge';
export * from './invoke-with-trace';
