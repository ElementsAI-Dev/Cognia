/**
 * Tests for Window Store
 */

import { act } from '@testing-library/react';
import {
  useWindowStore,
  selectWindowState,
  selectWindowPreferences,
  selectWindowSize,
  selectWindowPosition,
  selectWindowConstraints,
  selectIsMaximized,
  selectIsFullscreen,
  selectIsAlwaysOnTop,
} from './window-store';

describe('useWindowStore', () => {
  beforeEach(() => {
    act(() => {
      useWindowStore.setState({
        isMaximized: false,
        isMinimized: false,
        isFullscreen: false,
        isAlwaysOnTop: false,
        isFocused: true,
        isVisible: true,
        isDecorated: false,
        isResizable: true,
        isClosable: true,
        isMaximizable: true,
        isMinimizable: true,
        title: 'Cognia',
        size: { width: 800, height: 600 },
        position: { x: 0, y: 0 },
        constraints: { minWidth: 400, minHeight: 300 },
        scaleFactor: 1,
        cursorIcon: 'default',
        cursorVisible: true,
        cursorGrab: false,
        ignoreCursorEvents: false,
        skipTaskbar: false,
        contentProtected: false,
        shadow: true,
        visibleOnAllWorkspaces: false,
        progressBar: null,
        preferences: {
          rememberPosition: true,
          rememberSize: true,
          startMaximized: false,
          startCentered: true,
          defaultAlwaysOnTop: false,
          titleBarHeight: 32,
          enableDoubleClickMaximize: true,
          enableDragToMove: true,
          titleBarCustomLayout: {
            left: [],
            center: [],
            right: [],
          },
        },
      });
    });
  });

  describe('window state flags', () => {
    it('should set isMaximized', () => {
      act(() => {
        useWindowStore.getState().setIsMaximized(true);
      });
      expect(useWindowStore.getState().isMaximized).toBe(true);
    });

    it('should set isMinimized', () => {
      act(() => {
        useWindowStore.getState().setIsMinimized(true);
      });
      expect(useWindowStore.getState().isMinimized).toBe(true);
    });

    it('should set isFullscreen', () => {
      act(() => {
        useWindowStore.getState().setIsFullscreen(true);
      });
      expect(useWindowStore.getState().isFullscreen).toBe(true);
    });

    it('should set isAlwaysOnTop', () => {
      act(() => {
        useWindowStore.getState().setIsAlwaysOnTop(true);
      });
      expect(useWindowStore.getState().isAlwaysOnTop).toBe(true);
    });

    it('should set isFocused', () => {
      act(() => {
        useWindowStore.getState().setIsFocused(false);
      });
      expect(useWindowStore.getState().isFocused).toBe(false);
    });

    it('should set isVisible', () => {
      act(() => {
        useWindowStore.getState().setIsVisible(false);
      });
      expect(useWindowStore.getState().isVisible).toBe(false);
    });

    it('should set isDecorated', () => {
      act(() => {
        useWindowStore.getState().setIsDecorated(true);
      });
      expect(useWindowStore.getState().isDecorated).toBe(true);
    });

    it('should set isResizable', () => {
      act(() => {
        useWindowStore.getState().setIsResizable(false);
      });
      expect(useWindowStore.getState().isResizable).toBe(false);
    });

    it('should set isClosable', () => {
      act(() => {
        useWindowStore.getState().setIsClosable(false);
      });
      expect(useWindowStore.getState().isClosable).toBe(false);
    });

    it('should set isMaximizable', () => {
      act(() => {
        useWindowStore.getState().setIsMaximizable(false);
      });
      expect(useWindowStore.getState().isMaximizable).toBe(false);
    });

    it('should set isMinimizable', () => {
      act(() => {
        useWindowStore.getState().setIsMinimizable(false);
      });
      expect(useWindowStore.getState().isMinimizable).toBe(false);
    });
  });

  describe('window properties', () => {
    it('should set title', () => {
      act(() => {
        useWindowStore.getState().setTitle('New Title');
      });
      expect(useWindowStore.getState().title).toBe('New Title');
    });

    it('should set size', () => {
      act(() => {
        useWindowStore.getState().setSize({ width: 1024, height: 768 });
      });
      expect(useWindowStore.getState().size).toEqual({ width: 1024, height: 768 });
    });

    it('should set position', () => {
      act(() => {
        useWindowStore.getState().setPosition({ x: 100, y: 200 });
      });
      expect(useWindowStore.getState().position).toEqual({ x: 100, y: 200 });
    });

    it('should set constraints', () => {
      act(() => {
        useWindowStore.getState().setConstraints({ maxWidth: 1920 });
      });
      expect(useWindowStore.getState().constraints.maxWidth).toBe(1920);
    });

    it('should set scale factor', () => {
      act(() => {
        useWindowStore.getState().setScaleFactor(2);
      });
      expect(useWindowStore.getState().scaleFactor).toBe(2);
    });
  });

  describe('cursor settings', () => {
    it('should set cursor icon', () => {
      act(() => {
        useWindowStore.getState().setCursorIcon('pointer');
      });
      expect(useWindowStore.getState().cursorIcon).toBe('pointer');
    });

    it('should set cursor visible', () => {
      act(() => {
        useWindowStore.getState().setCursorVisible(false);
      });
      expect(useWindowStore.getState().cursorVisible).toBe(false);
    });

    it('should set cursor grab', () => {
      act(() => {
        useWindowStore.getState().setCursorGrab(true);
      });
      expect(useWindowStore.getState().cursorGrab).toBe(true);
    });

    it('should set ignore cursor events', () => {
      act(() => {
        useWindowStore.getState().setIgnoreCursorEvents(true);
      });
      expect(useWindowStore.getState().ignoreCursorEvents).toBe(true);
    });
  });

  describe('other settings', () => {
    it('should set skip taskbar', () => {
      act(() => {
        useWindowStore.getState().setSkipTaskbar(true);
      });
      expect(useWindowStore.getState().skipTaskbar).toBe(true);
    });

    it('should set content protected', () => {
      act(() => {
        useWindowStore.getState().setContentProtected(true);
      });
      expect(useWindowStore.getState().contentProtected).toBe(true);
    });

    it('should set shadow', () => {
      act(() => {
        useWindowStore.getState().setShadow(false);
      });
      expect(useWindowStore.getState().shadow).toBe(false);
    });

    it('should set visible on all workspaces', () => {
      act(() => {
        useWindowStore.getState().setVisibleOnAllWorkspaces(true);
      });
      expect(useWindowStore.getState().visibleOnAllWorkspaces).toBe(true);
    });

    it('should set progress bar', () => {
      act(() => {
        useWindowStore.getState().setProgressBar(50);
      });
      expect(useWindowStore.getState().progressBar).toBe(50);
    });
  });

  describe('preferences', () => {
    it('should update preferences', () => {
      act(() => {
        useWindowStore.getState().setPreferences({ startMaximized: true });
      });
      expect(useWindowStore.getState().preferences.startMaximized).toBe(true);
    });

    it('should set individual preference settings', () => {
      act(() => {
        useWindowStore.getState().setRememberPosition(false);
      });
      expect(useWindowStore.getState().preferences.rememberPosition).toBe(false);

      act(() => {
        useWindowStore.getState().setRememberSize(false);
      });
      expect(useWindowStore.getState().preferences.rememberSize).toBe(false);

      act(() => {
        useWindowStore.getState().setStartCentered(false);
      });
      expect(useWindowStore.getState().preferences.startCentered).toBe(false);

      act(() => {
        useWindowStore.getState().setDefaultAlwaysOnTop(true);
      });
      expect(useWindowStore.getState().preferences.defaultAlwaysOnTop).toBe(true);

      act(() => {
        useWindowStore.getState().setTitleBarHeight(40);
      });
      expect(useWindowStore.getState().preferences.titleBarHeight).toBe(40);

      act(() => {
        useWindowStore.getState().setEnableDoubleClickMaximize(false);
      });
      expect(useWindowStore.getState().preferences.enableDoubleClickMaximize).toBe(false);

      act(() => {
        useWindowStore.getState().setEnableDragToMove(false);
      });
      expect(useWindowStore.getState().preferences.enableDragToMove).toBe(false);
    });

    it('should reset preferences', () => {
      act(() => {
        useWindowStore.getState().setPreferences({ startMaximized: true });
        useWindowStore.getState().resetPreferences();
      });
      expect(useWindowStore.getState().preferences.startMaximized).toBe(false);
    });
  });

  describe('bulk update', () => {
    it('should update window state', () => {
      act(() => {
        useWindowStore.getState().updateWindowState({
          isMaximized: true,
          title: 'Updated',
        });
      });
      expect(useWindowStore.getState().isMaximized).toBe(true);
      expect(useWindowStore.getState().title).toBe('Updated');
    });
  });

  describe('selectors', () => {
    it('should select window state', () => {
      act(() => {
        useWindowStore.getState().setIsMaximized(true);
      });
      const state = selectWindowState(useWindowStore.getState());
      expect(state.isMaximized).toBe(true);
    });

    it('should select preferences', () => {
      expect(selectWindowPreferences(useWindowStore.getState())).toBeDefined();
    });

    it('should select size', () => {
      expect(selectWindowSize(useWindowStore.getState())).toEqual({ width: 800, height: 600 });
    });

    it('should select position', () => {
      expect(selectWindowPosition(useWindowStore.getState())).toEqual({ x: 0, y: 0 });
    });

    it('should select constraints', () => {
      expect(selectWindowConstraints(useWindowStore.getState())).toBeDefined();
    });

    it('should select isMaximized', () => {
      act(() => {
        useWindowStore.getState().setIsMaximized(true);
      });
      expect(selectIsMaximized(useWindowStore.getState())).toBe(true);
    });

    it('should select isFullscreen', () => {
      act(() => {
        useWindowStore.getState().setIsFullscreen(true);
      });
      expect(selectIsFullscreen(useWindowStore.getState())).toBe(true);
    });

    it('should select isAlwaysOnTop', () => {
      act(() => {
        useWindowStore.getState().setIsAlwaysOnTop(true);
      });
      expect(selectIsAlwaysOnTop(useWindowStore.getState())).toBe(true);
    });
  });
});
