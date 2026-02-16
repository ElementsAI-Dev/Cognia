/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './page';

// Mock stores
jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: [],
      activeSessionId: null,
      createSession: jest.fn(),
      setActiveSession: jest.fn(),
    };
    return selector(state);
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      providerSettings: {},
      sidebarOpen: true,
    };
    return selector(state);
  },
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      messages: [],
      isLoading: false,
    };
    return selector(state);
  },
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      projects: [],
      activeProjectId: null,
    };
    return selector(state);
  },
  usePresetStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      presets: [],
      activePreset: null,
    };
    return selector(state);
  },
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sidebarOpen: true,
    };
    return selector(state);
  },
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      panelOpen: false,
    };
    return selector(state);
  },
  useNativeStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      isDesktop: false,
      isWindows: false,
      isMac: false,
      isLinux: false,
    };
    return selector(state);
  },
  useAgentStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      isExecuting: false,
    };
    return selector(state);
  },
}));

jest.mock('@/components/chat', () => ({
  ChatContainer: () => <div data-testid="chat-container">Chat</div>,
}));

describe('Home Page', () => {
  it('renders the chat container', () => {
    render(<Home />);
    expect(screen.getByTestId('chat-container')).toBeInTheDocument();
  });

  it('delegates layout concerns to ChatLayout', () => {
    // Home page is a thin wrapper — sidebar, panels, and error boundary
    // are provided by (chat)/layout.tsx (ChatLayout)
    const { container } = render(<Home />);
    expect(container.querySelector('[data-testid="chat-container"]')).toBeInTheDocument();
  });
});
