'use client';

/**
 * useMediaShortcuts - Register global hotkeys for screenshot and recording
 *
 * Wires up the media shortcut definitions from lib/native/shortcuts.ts
 * to the screenshot and recording stores.
 */

import { useEffect, useRef } from 'react';
import { isTauri } from '@/lib/native/utils';
import {
  registerMediaShortcuts,
  unregisterMediaShortcuts,
  defaultMediaShortcuts,
  type MediaShortcutConfig,
} from '@/lib/native/shortcuts';
import { useScreenshotStore } from '@/stores/media';
import { useScreenRecordingStore } from '@/stores/media';
import { loggers } from '@/lib/logger';

const log = loggers.native;

interface UseMediaShortcutsOptions {
  config?: Partial<MediaShortcutConfig>;
  enabled?: boolean;
}

export function useMediaShortcuts(options: UseMediaShortcutsOptions = {}) {
  const { enabled = true } = options;
  const configRef = useRef<MediaShortcutConfig>({
    ...defaultMediaShortcuts,
    ...options.config,
    enabled,
  });

  const screenshotStore = useScreenshotStore();
  const recordingStore = useScreenRecordingStore();

  useEffect(() => {
    if (!isTauri() || !enabled) return;

    const config = configRef.current;

    const register = async () => {
      const success = await registerMediaShortcuts(config, {
        onScreenshotFullscreen: () => {
          log.info('Global shortcut: Screenshot fullscreen');
          screenshotStore.captureFullscreen();
        },
        onScreenshotRegion: () => {
          log.info('Global shortcut: Screenshot region');
          // Region capture requires UI interaction, emit event
          window.dispatchEvent(new CustomEvent('media-shortcut:screenshot-region'));
        },
        onScreenshotWindow: () => {
          log.info('Global shortcut: Screenshot window');
          screenshotStore.captureWindow();
        },
        onRecordingStartStop: () => {
          log.info('Global shortcut: Recording start/stop');
          const status = recordingStore.status;
          if (status === 'Idle') {
            recordingStore.startRecording(recordingStore.selectedMode);
          } else if (status === 'Recording' || status === 'Paused') {
            recordingStore.stop();
          }
        },
        onRecordingPauseResume: () => {
          log.info('Global shortcut: Recording pause/resume');
          const status = recordingStore.status;
          if (status === 'Recording') {
            recordingStore.pause();
          } else if (status === 'Paused') {
            recordingStore.resume();
          }
        },
      });

      if (success) {
        log.info('Media shortcuts registered successfully');
      } else {
        log.warn('Some media shortcuts failed to register');
      }
    };

    register();

    return () => {
      unregisterMediaShortcuts(config).catch((e) => {
        log.error('Failed to unregister media shortcuts', e as Error);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
