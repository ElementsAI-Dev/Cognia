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
export * as context from './context';
export * as awareness from './awareness';
export * as sandbox from './sandbox';
export * as sandboxDb from './sandbox-db';
export * as environment from './environment';
export * as proxy from './proxy';
export * as opener from './opener';
export * as deepLink from './deep-link';
