/**
 * Utils Tests
 *
 * Tests for native utility functions.
 */

import {
  isTauri,
  WINDOW_LABELS,
} from './utils';

describe('Utils - isTauri', () => {
  const originalWindow = global.window;

  afterEach(() => {
    global.window = originalWindow;
  });

  it('should return false when window is undefined', () => {
    // @ts-expect-error - testing undefined window
    global.window = undefined;
    expect(isTauri()).toBe(false);
  });

  it('should return false when __TAURI_INTERNALS__ is not present', () => {
    global.window = {} as Window & typeof globalThis;
    expect(isTauri()).toBe(false);
  });

  // Note: Testing isTauri() returning true requires actual Tauri runtime
  // as the function checks window.__TAURI_INTERNALS__ directly
  it('should return false in test environment (no Tauri runtime)', () => {
    expect(isTauri()).toBe(false);
  });
});

describe('Utils - WINDOW_LABELS', () => {
  it('should have correct window labels', () => {
    expect(WINDOW_LABELS.MAIN).toBe('main');
    expect(WINDOW_LABELS.CHAT_WIDGET).toBe('chat-widget');
    expect(WINDOW_LABELS.SELECTION_TOOLBAR).toBe('selection-toolbar');
    expect(WINDOW_LABELS.SPLASHSCREEN).toBe('splashscreen');
  });
});

// Note: Window/platform functions require full Tauri runtime and are tested
// via integration tests. Here we focus on testing the pure functions and constants.
