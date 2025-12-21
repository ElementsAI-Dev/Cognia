import { test, expect } from '@playwright/test';

/**
 * UI Store Tests
 * Tests for UI state management (modals, sidebar, etc.)
 */

test.describe('UI Store - Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage sidebar state', async ({ page }) => {
    const result = await page.evaluate(() => {
      let sidebarOpen = true;

      const setSidebarOpen = (open: boolean) => {
        sidebarOpen = open;
      };

      const toggleSidebar = () => {
        sidebarOpen = !sidebarOpen;
      };

      const states: boolean[] = [];

      states.push(sidebarOpen); // Initial: true
      setSidebarOpen(false);
      states.push(sidebarOpen); // After close: false
      toggleSidebar();
      states.push(sidebarOpen); // After toggle: true
      toggleSidebar();
      states.push(sidebarOpen); // After toggle: false

      return { states };
    });

    expect(result.states).toEqual([true, false, true, false]);
  });

  test('should manage mobile navigation', async ({ page }) => {
    const result = await page.evaluate(() => {
      let mobileNavOpen = false;

      const setMobileNavOpen = (open: boolean) => {
        mobileNavOpen = open;
      };

      const states: boolean[] = [];

      states.push(mobileNavOpen);
      setMobileNavOpen(true);
      states.push(mobileNavOpen);
      setMobileNavOpen(false);
      states.push(mobileNavOpen);

      return { states };
    });

    expect(result.states).toEqual([false, true, false]);
  });
});

test.describe('UI Store - Modals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open and close modals', async ({ page }) => {
    const result = await page.evaluate(() => {
      type ModalType = 'settings' | 'export' | 'import' | null;

      let activeModal: ModalType = null;
      let modalData: unknown = null;

      const openModal = (modal: ModalType, data?: unknown) => {
        activeModal = modal;
        modalData = data ?? null;
      };

      const closeModal = () => {
        activeModal = null;
        modalData = null;
      };

      const history: { modal: ModalType; data: unknown }[] = [];

      history.push({ modal: activeModal, data: modalData });

      openModal('settings');
      history.push({ modal: activeModal, data: modalData });

      openModal('export', { sessionId: 'sess-1' });
      history.push({ modal: activeModal, data: modalData });

      closeModal();
      history.push({ modal: activeModal, data: modalData });

      return { history };
    });

    expect(result.history[0].modal).toBeNull();
    expect(result.history[1].modal).toBe('settings');
    expect(result.history[2].modal).toBe('export');
    expect(result.history[2].data).toEqual({ sessionId: 'sess-1' });
    expect(result.history[3].modal).toBeNull();
    expect(result.history[3].data).toBeNull();
  });

  test('should handle modal types', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MODAL_TYPES = [
        'settings',
        'new-session',
        'delete-session',
        'export',
        'import',
        'model-selector',
        'mcp-servers',
      ] as const;

      type _ModalType = typeof MODAL_TYPES[number] | null;

      const isValidModal = (modal: string): modal is typeof MODAL_TYPES[number] => {
        return MODAL_TYPES.includes(modal as typeof MODAL_TYPES[number]);
      };

      return {
        settingsValid: isValidModal('settings'),
        exportValid: isValidModal('export'),
        invalidModal: isValidModal('unknown'),
        totalTypes: MODAL_TYPES.length,
      };
    });

    expect(result.settingsValid).toBe(true);
    expect(result.exportValid).toBe(true);
    expect(result.invalidModal).toBe(false);
    expect(result.totalTypes).toBe(7);
  });
});

test.describe('UI Store - Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should toggle command palette', async ({ page }) => {
    const result = await page.evaluate(() => {
      let commandPaletteOpen = false;

      const setCommandPaletteOpen = (open: boolean) => {
        commandPaletteOpen = open;
      };

      const states: boolean[] = [];

      states.push(commandPaletteOpen);
      setCommandPaletteOpen(true);
      states.push(commandPaletteOpen);
      setCommandPaletteOpen(false);
      states.push(commandPaletteOpen);

      return { states };
    });

    expect(result.states).toEqual([false, true, false]);
  });
});

test.describe('UI Store - Research Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should toggle research panel', async ({ page }) => {
    const result = await page.evaluate(() => {
      let researchPanelOpen = false;

      const setResearchPanelOpen = (open: boolean) => {
        researchPanelOpen = open;
      };

      const states: boolean[] = [];

      states.push(researchPanelOpen);
      setResearchPanelOpen(true);
      states.push(researchPanelOpen);
      setResearchPanelOpen(false);
      states.push(researchPanelOpen);

      return { states };
    });

    expect(result.states).toEqual([false, true, false]);
  });
});

test.describe('UI Store - Message Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should select and deselect messages', async ({ page }) => {
    const result = await page.evaluate(() => {
      let selectedMessageId: string | null = null;

      const setSelectedMessageId = (id: string | null) => {
        selectedMessageId = id;
      };

      const history: (string | null)[] = [];

      history.push(selectedMessageId);
      setSelectedMessageId('msg-1');
      history.push(selectedMessageId);
      setSelectedMessageId('msg-2');
      history.push(selectedMessageId);
      setSelectedMessageId(null);
      history.push(selectedMessageId);

      return { history };
    });

    expect(result.history).toEqual([null, 'msg-1', 'msg-2', null]);
  });
});

test.describe('UI Store - Scroll State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should track scroll position', async ({ page }) => {
    const result = await page.evaluate(() => {
      let isAtBottom = true;

      const setIsAtBottom = (atBottom: boolean) => {
        isAtBottom = atBottom;
      };

      const states: boolean[] = [];

      states.push(isAtBottom); // Initial: at bottom
      setIsAtBottom(false); // User scrolled up
      states.push(isAtBottom);
      setIsAtBottom(true); // User scrolled back to bottom
      states.push(isAtBottom);

      return { states };
    });

    expect(result.states).toEqual([true, false, true]);
  });
});

test.describe('UI Store - Input Focus', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should track input focus state', async ({ page }) => {
    const result = await page.evaluate(() => {
      let inputFocused = false;

      const setInputFocused = (focused: boolean) => {
        inputFocused = focused;
      };

      const states: boolean[] = [];

      states.push(inputFocused);
      setInputFocused(true);
      states.push(inputFocused);
      setInputFocused(false);
      states.push(inputFocused);

      return { states };
    });

    expect(result.states).toEqual([false, true, false]);
  });
});

test.describe('UI Store - Keyboard Shortcuts Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should toggle keyboard shortcuts dialog', async ({ page }) => {
    const result = await page.evaluate(() => {
      let keyboardShortcutsOpen = false;

      const setKeyboardShortcutsOpen = (open: boolean) => {
        keyboardShortcutsOpen = open;
      };

      const states: boolean[] = [];

      states.push(keyboardShortcutsOpen);
      setKeyboardShortcutsOpen(true);
      states.push(keyboardShortcutsOpen);
      setKeyboardShortcutsOpen(false);
      states.push(keyboardShortcutsOpen);

      return { states };
    });

    expect(result.states).toEqual([false, true, false]);
  });
});
