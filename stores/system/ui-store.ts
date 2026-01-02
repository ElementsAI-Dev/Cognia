/**
 * UI Store - manages UI state (modals, dialogs, etc.)
 */

import { create } from 'zustand';

export type ModalType =
  | 'settings'
  | 'new-session'
  | 'delete-session'
  | 'export'
  | 'import'
  | 'model-selector'
  | 'mcp-servers'
  | null;

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Mobile navigation
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  // Modal state
  activeModal: ModalType;
  modalData: unknown;
  openModal: (modal: ModalType, data?: unknown) => void;
  closeModal: () => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Research panel
  researchPanelOpen: boolean;
  setResearchPanelOpen: (open: boolean) => void;

  // Message actions
  selectedMessageId: string | null;
  setSelectedMessageId: (id: string | null) => void;

  // Scroll state
  isAtBottom: boolean;
  setIsAtBottom: (atBottom: boolean) => void;

  // Input focus
  inputFocused: boolean;
  setInputFocused: (focused: boolean) => void;

  // Keyboard shortcuts dialog
  keyboardShortcutsOpen: boolean;
  setKeyboardShortcutsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Mobile navigation
  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),

  // Modal state
  activeModal: null,
  modalData: null,
  openModal: (activeModal, modalData = null) => set({ activeModal, modalData }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Command palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),

  // Research panel
  researchPanelOpen: false,
  setResearchPanelOpen: (researchPanelOpen) => set({ researchPanelOpen }),

  // Message actions
  selectedMessageId: null,
  setSelectedMessageId: (selectedMessageId) => set({ selectedMessageId }),

  // Scroll state
  isAtBottom: true,
  setIsAtBottom: (isAtBottom) => set({ isAtBottom }),

  // Input focus
  inputFocused: false,
  setInputFocused: (inputFocused) => set({ inputFocused }),

  // Keyboard shortcuts dialog
  keyboardShortcutsOpen: false,
  setKeyboardShortcutsOpen: (keyboardShortcutsOpen) => set({ keyboardShortcutsOpen }),
}));

// Selectors
export const selectSidebarOpen = (state: UIState) => state.sidebarOpen;
export const selectActiveModal = (state: UIState) => state.activeModal;
export const selectCommandPaletteOpen = (state: UIState) => state.commandPaletteOpen;
