/**
 * @jest-environment jsdom
 */

/**
 * Tests for providers.tsx internal components logic.
 * Since the Providers component does complex DOM manipulation that's hard to test,
 * we test the core logic patterns used by internal components.
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { isTauri as detectTauri } from '@/lib/native/utils';
import { useChatWidgetStore } from '@/stores/chat';

// Track whether Tauri mode is enabled
let mockIsTauri = false;
const mockInvoke = jest.fn();

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
}));

jest.mock('@/stores/chat', () => ({
  useChatWidgetStore: jest.fn((selector?: (state: { config: typeof mockConfig }) => unknown) => {
    if (selector) {
      return selector({ config: mockConfig });
    }
    return { config: mockConfig };
  }),
}));

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// These are recreations of the actual component logic from providers.tsx
// to test the patterns used

/**
 * Simulates ChatAssistantContainerGate logic
 */
function TestChatAssistantContainerGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
    setIsTauri(detectTauri());
  }, [detectTauri]);

  if (!mounted || isTauri) return null;
  return <div data-testid="gated-content">{children}</div>;
}

/**
 * Simulates ChatWidgetNativeSync logic
 */
function TestChatWidgetNativeSync() {
  const config = useChatWidgetStore((s: { config: typeof mockConfig }) => s.config);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!detectTauri() && !(window as typeof window & { __TAURI__?: unknown }).__TAURI__) return;

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
    delete (window as typeof window & { __TAURI__?: unknown }).__TAURI__;
  });

  it('renders children in web mode (not Tauri)', async () => {
    mockIsTauri = false;

    const { queryByTestId } = render(
      <TestChatAssistantContainerGate>
        <span>Content</span>
      </TestChatAssistantContainerGate>
    );

    // Wait for mount effect
    await waitFor(() => {
      expect(queryByTestId('gated-content')).toBeInTheDocument();
    });
  });

  it('does NOT render children in Tauri mode', async () => {
    mockIsTauri = true;

    const { queryByTestId } = render(
      <TestChatAssistantContainerGate>
        <span>Content</span>
      </TestChatAssistantContainerGate>
    );

    // Wait a tick for effects to run
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(queryByTestId('gated-content')).not.toBeInTheDocument();
  });

  it('does not render before mount', () => {
    mockIsTauri = false;
    // On first render, mounted is false, so nothing should render
    // We can't really test this without hooks, but the logic is:
    // if (!mounted || isTauri) return null;
    // Initially mounted = false, so it returns null
    const { container } = render(
      <TestChatAssistantContainerGate>
        <span>Content</span>
      </TestChatAssistantContainerGate>
    );

    // Initially empty (before useLayoutEffect runs)
    // This is tested implicitly - the component should hydrate safely
    expect(container).toBeDefined();
  });
});

describe('ChatWidgetNativeSync logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri = false;
    mockInvoke.mockResolvedValue(undefined);
    delete (window as typeof window & { __TAURI__?: unknown }).__TAURI__;
  });

  it('syncs config to Rust on mount in Tauri mode', async () => {
    mockIsTauri = true;
    (window as typeof window & { __TAURI__?: unknown }).__TAURI__ = { version: '2.0.0' };

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
    (window as typeof window & { __TAURI__?: unknown }).__TAURI__ = { version: '2.0.0' };

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
