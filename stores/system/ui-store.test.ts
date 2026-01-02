/**
 * Tests for UI Store
 */

import { act } from '@testing-library/react';
import { useUIStore, selectSidebarOpen, selectActiveModal, selectCommandPaletteOpen } from './ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store state
    useUIStore.setState({
      sidebarOpen: true,
      mobileNavOpen: false,
      activeModal: null,
      modalData: null,
      commandPaletteOpen: false,
      researchPanelOpen: false,
      selectedMessageId: null,
      isAtBottom: true,
      inputFocused: false,
      keyboardShortcutsOpen: false,
    });
  });

  describe('sidebar', () => {
    it('should set sidebar open state', () => {
      act(() => {
        useUIStore.getState().setSidebarOpen(false);
      });
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      act(() => {
        useUIStore.getState().setSidebarOpen(true);
      });
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('should toggle sidebar', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      act(() => {
        useUIStore.getState().toggleSidebar();
      });
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      act(() => {
        useUIStore.getState().toggleSidebar();
      });
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('mobile navigation', () => {
    it('should set mobile nav open state', () => {
      act(() => {
        useUIStore.getState().setMobileNavOpen(true);
      });
      expect(useUIStore.getState().mobileNavOpen).toBe(true);

      act(() => {
        useUIStore.getState().setMobileNavOpen(false);
      });
      expect(useUIStore.getState().mobileNavOpen).toBe(false);
    });
  });

  describe('modal state', () => {
    it('should open modal without data', () => {
      act(() => {
        useUIStore.getState().openModal('settings');
      });

      expect(useUIStore.getState().activeModal).toBe('settings');
      expect(useUIStore.getState().modalData).toBeNull();
    });

    it('should open modal with data', () => {
      const testData = { sessionId: 'test-123' };

      act(() => {
        useUIStore.getState().openModal('delete-session', testData);
      });

      expect(useUIStore.getState().activeModal).toBe('delete-session');
      expect(useUIStore.getState().modalData).toEqual(testData);
    });

    it('should close modal and clear data', () => {
      act(() => {
        useUIStore.getState().openModal('settings', { some: 'data' });
      });

      act(() => {
        useUIStore.getState().closeModal();
      });

      expect(useUIStore.getState().activeModal).toBeNull();
      expect(useUIStore.getState().modalData).toBeNull();
    });
  });

  describe('command palette', () => {
    it('should set command palette open state', () => {
      act(() => {
        useUIStore.getState().setCommandPaletteOpen(true);
      });
      expect(useUIStore.getState().commandPaletteOpen).toBe(true);

      act(() => {
        useUIStore.getState().setCommandPaletteOpen(false);
      });
      expect(useUIStore.getState().commandPaletteOpen).toBe(false);
    });
  });

  describe('research panel', () => {
    it('should set research panel open state', () => {
      act(() => {
        useUIStore.getState().setResearchPanelOpen(true);
      });
      expect(useUIStore.getState().researchPanelOpen).toBe(true);

      act(() => {
        useUIStore.getState().setResearchPanelOpen(false);
      });
      expect(useUIStore.getState().researchPanelOpen).toBe(false);
    });
  });

  describe('message actions', () => {
    it('should set selected message id', () => {
      act(() => {
        useUIStore.getState().setSelectedMessageId('msg-123');
      });
      expect(useUIStore.getState().selectedMessageId).toBe('msg-123');

      act(() => {
        useUIStore.getState().setSelectedMessageId(null);
      });
      expect(useUIStore.getState().selectedMessageId).toBeNull();
    });
  });

  describe('scroll state', () => {
    it('should set is at bottom state', () => {
      act(() => {
        useUIStore.getState().setIsAtBottom(false);
      });
      expect(useUIStore.getState().isAtBottom).toBe(false);

      act(() => {
        useUIStore.getState().setIsAtBottom(true);
      });
      expect(useUIStore.getState().isAtBottom).toBe(true);
    });
  });

  describe('input focus', () => {
    it('should set input focused state', () => {
      act(() => {
        useUIStore.getState().setInputFocused(true);
      });
      expect(useUIStore.getState().inputFocused).toBe(true);

      act(() => {
        useUIStore.getState().setInputFocused(false);
      });
      expect(useUIStore.getState().inputFocused).toBe(false);
    });
  });

  describe('keyboard shortcuts', () => {
    it('should set keyboard shortcuts dialog open state', () => {
      act(() => {
        useUIStore.getState().setKeyboardShortcutsOpen(true);
      });
      expect(useUIStore.getState().keyboardShortcutsOpen).toBe(true);

      act(() => {
        useUIStore.getState().setKeyboardShortcutsOpen(false);
      });
      expect(useUIStore.getState().keyboardShortcutsOpen).toBe(false);
    });
  });

  describe('selectors', () => {
    it('should select sidebar open state', () => {
      expect(selectSidebarOpen(useUIStore.getState())).toBe(true);
    });

    it('should select active modal', () => {
      act(() => {
        useUIStore.getState().openModal('settings');
      });
      
      expect(selectActiveModal(useUIStore.getState())).toBe('settings');
    });

    it('should select command palette open', () => {
      act(() => {
        useUIStore.getState().setCommandPaletteOpen(true);
      });
      
      expect(selectCommandPaletteOpen(useUIStore.getState())).toBe(true);
    });
  });
});
