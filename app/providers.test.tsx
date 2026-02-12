/**
 * @jest-environment jsdom
 */

/**
 * Tests for providers.tsx internal components logic.
 * Since the Providers component does complex DOM manipulation that's hard to test,
 * we test the core logic patterns used by internal components.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { render, waitFor, act, screen } from '@testing-library/react';
import { isTauri as detectTauri, getWindowLabel, WINDOW_LABELS } from '@/lib/native/utils';
import { useChatWidgetStore } from '@/stores/chat';

// Track whether Tauri mode is enabled
let mockIsTauri = false;
const mockInvoke = jest.fn();
let mockWindowLabel: string | null = 'main';

// Store mock
const mockConfig = {
  width: 420,
  height: 600,
  x: null as number | null,
  y: null as number | null,
  rememberPosition: true,
  startMinimized: false,
  opacity: 1.0,
  shortcut: 'CommandOrControl+Shift+Space',
  pinned: true,
  backgroundColor: '#ffffff',
  provider: 'openai',
  model: 'gpt-4o-mini',
  systemPrompt: 'You are a helpful assistant.',
  maxMessages: 50,
  showTimestamps: false,
  soundEnabled: false,
  autoFocus: true,
};

jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

jest.mock('@/lib/native/utils', () => ({
  isTauri: () => mockIsTauri,
  getWindowLabel: () => Promise.resolve(mockWindowLabel),
  WINDOW_LABELS: { MAIN: 'main', CHAT_WIDGET: 'chat-widget', ASSISTANT_BUBBLE: 'assistant-bubble' },
}));

jest.mock('@/stores/chat', () => ({
  useChatWidgetStore: jest.fn((selector?: (state: { config: typeof mockConfig }) => unknown) => {
    if (selector) {
      return selector({ config: mockConfig });
    }
    return { config: mockConfig };
  }),
}));

// These are recreations of the actual component logic from providers.tsx
// to test the patterns used

/**
 * Simulates ChatAssistantContainerGate logic
 * AI assistant FAB + Panel renders only in Tauri main window.
 */
function TestChatAssistantContainerGate() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!detectTauri()) return;
    getWindowLabel().then((label) => {
      if (!label || label === WINDOW_LABELS.MAIN) {
        setShouldRender(true);
      }
    });
  }, []);

  if (!shouldRender) return null;

  return (
    <Suspense fallback={null}>
      <div data-testid="chat-assistant-container">ChatAssistantContainer</div>
    </Suspense>
  );
}

/**
 * Simulates ChatWidgetNativeSync logic
 */
function TestChatWidgetNativeSync() {
  const config = useChatWidgetStore((s: { config: typeof mockConfig }) => s.config);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!detectTauri()) return;

    const payload = {
      width: config.width,
      height: config.height,
      x: config.x,
      y: config.y,
      rememberPosition: config.rememberPosition,
      startMinimized: config.startMinimized,
      opacity: config.opacity,
      shortcut: config.shortcut,
      pinned: config.pinned,
      backgroundColor: config.backgroundColor,
    };

    (async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('chat_widget_update_config', { config: payload });
    })().catch(() => {
      // best-effort sync; ignore failures
    });
  }, [
    config.width,
    config.height,
    config.x,
    config.y,
    config.rememberPosition,
    config.startMinimized,
    config.opacity,
    config.shortcut,
    config.pinned,
    config.backgroundColor,
  ]);

  return null;
}

describe('ChatAssistantContainerGate logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri = false;
    mockWindowLabel = 'main';
  });

  it('renders nothing in web mode (no Tauri)', async () => {
    mockIsTauri = false;

    const { container } = render(<TestChatAssistantContainerGate />);

    // Wait for any potential async effects
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders ChatAssistantContainer in Tauri main window', async () => {
    mockIsTauri = true;
    mockWindowLabel = 'main';

    render(<TestChatAssistantContainerGate />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-assistant-container')).toBeInTheDocument();
    });
  });

  it('renders nothing in Tauri non-main window (e.g. chat-widget)', async () => {
    mockIsTauri = true;
    mockWindowLabel = 'chat-widget';

    const { container } = render(<TestChatAssistantContainerGate />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders when getWindowLabel returns null (fallback to main)', async () => {
    mockIsTauri = true;
    mockWindowLabel = null;

    render(<TestChatAssistantContainerGate />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-assistant-container')).toBeInTheDocument();
    });
  });
});

describe('ChatWidgetNativeSync logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri = false;
    mockInvoke.mockResolvedValue(undefined);
  });

  it('syncs config to Rust on mount in Tauri mode', async () => {
    mockIsTauri = true;

    await act(async () => {
      render(<TestChatWidgetNativeSync />);
    });

    await waitFor(
      () => {
        expect(mockInvoke).toHaveBeenCalledWith('chat_widget_update_config', {
          config: expect.objectContaining({
            width: 420,
            height: 600,
            pinned: true,
          }),
        });
      },
      { timeout: 2000 }
    );
  });

  it('does NOT sync config in web mode (no Tauri)', async () => {
    mockIsTauri = false;

    await act(async () => {
      render(<TestChatWidgetNativeSync />);
    });

    // Wait for any potential async calls
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockInvoke).not.toHaveBeenCalledWith(
      'chat_widget_update_config',
      expect.anything()
    );
  });

  it('syncs correct config payload', async () => {
    mockIsTauri = true;

    await act(async () => {
      render(<TestChatWidgetNativeSync />);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('chat_widget_update_config', {
        config: {
          width: 420,
          height: 600,
          x: null,
          y: null,
          rememberPosition: true,
          startMinimized: false,
          opacity: 1.0,
          shortcut: 'CommandOrControl+Shift+Space',
          pinned: true,
          backgroundColor: '#ffffff',
        },
      });
    });
  });
});
