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
const mockListen = jest.fn();
const mockEmit = jest.fn();
let mockWindowLabel: string | null = 'main';
const eventHandlers: Record<string, (event: { payload: unknown }) => void | Promise<void>> = {};
const mockStartRegionSelection = jest.fn();
const mockCaptureRegionWithHistory = jest.fn();
const mockExtractText = jest.fn();

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

jest.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mockListen(...args),
  emit: (...args: unknown[]) => mockEmit(...args),
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

jest.mock('@/lib/native/screenshot', () => ({
  startRegionSelection: (...args: unknown[]) => mockStartRegionSelection(...args),
  captureRegionWithHistory: (...args: unknown[]) => mockCaptureRegionWithHistory(...args),
  extractText: (...args: unknown[]) => mockExtractText(...args),
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

function TestScreenshotNativeSync({
  ingestExternalCapture,
}: {
  ingestExternalCapture: (payload: Record<string, unknown>) => Promise<void> | void;
}) {
  useEffect(() => {
    if (typeof window === 'undefined' || !detectTauri()) return;

    let unlisteners: Array<() => void> = [];

    const setupListeners = async () => {
      const [{ listen, emit }, screenshotApi] = await Promise.all([
        import('@tauri-apps/api/event'),
        import('@/lib/native/screenshot'),
      ]);

      unlisteners.push(
        await listen('screenshot-captured', async (event: { payload: unknown }) => {
          const payload = event.payload as Record<string, unknown>;
          await ingestExternalCapture(payload);
        })
      );

      unlisteners.push(
        await listen('screenshot-ocr-result', async (event: { payload: unknown }) => {
          const payload = event.payload as { text?: string };
          const text = payload.text?.trim();
          if (text) {
            await emit('selection-send-to-chat', { text });
          }
        })
      );

      unlisteners.push(
        await listen('start-ocr-screenshot', async () => {
          const region = await screenshotApi.startRegionSelection();
          const capture = await screenshotApi.captureRegionWithHistory(
            region.x,
            region.y,
            region.width,
            region.height
          );

          await ingestExternalCapture({
            image_base64: capture.image_base64,
            metadata: capture.metadata as unknown as Record<string, unknown>,
            source: 'legacy:start-ocr-screenshot',
          });

          const text = await screenshotApi.extractText(capture.image_base64);
          if (text?.trim()) {
            await emit('screenshot-ocr-result', {
              text,
              imageBase64: capture.image_base64,
            });
          }
        })
      );
    };

    void setupListeners();

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
      unlisteners = [];
    };
  }, [ingestExternalCapture]);

  return null;
}

describe('ChatAssistantContainerGate logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri = false;
    mockWindowLabel = 'main';
    Object.keys(eventHandlers).forEach((key) => {
      delete eventHandlers[key];
    });
    mockListen.mockImplementation((event: string, handler: (payload: { payload: unknown }) => void) => {
      eventHandlers[event] = handler;
      return Promise.resolve(() => {
        delete eventHandlers[event];
      });
    });
    mockEmit.mockResolvedValue(undefined);
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
    Object.keys(eventHandlers).forEach((key) => {
      delete eventHandlers[key];
    });
    mockListen.mockImplementation((event: string, handler: (payload: { payload: unknown }) => void) => {
      eventHandlers[event] = handler;
      return Promise.resolve(() => {
        delete eventHandlers[event];
      });
    });
    mockEmit.mockResolvedValue(undefined);
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

describe('ScreenshotNativeSync logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri = true;
    Object.keys(eventHandlers).forEach((key) => {
      delete eventHandlers[key];
    });
    mockListen.mockImplementation((event: string, handler: (payload: { payload: unknown }) => void) => {
      eventHandlers[event] = handler;
      return Promise.resolve(() => {
        delete eventHandlers[event];
      });
    });
    mockEmit.mockResolvedValue(undefined);
    mockStartRegionSelection.mockResolvedValue({ x: 10, y: 20, width: 100, height: 60 });
    mockCaptureRegionWithHistory.mockResolvedValue({
      image_base64: 'base64-image',
      metadata: { width: 100, height: 60, mode: 'region', timestamp: 1 },
    });
    mockExtractText.mockResolvedValue('ocr text');
  });

  it('ingests screenshot-captured payload', async () => {
    const ingest = jest.fn().mockResolvedValue(undefined);
    render(<TestScreenshotNativeSync ingestExternalCapture={ingest} />);

    await waitFor(() => {
      expect(eventHandlers['screenshot-captured']).toBeDefined();
    });

    await act(async () => {
      await eventHandlers['screenshot-captured']?.({
        payload: {
          image_base64: 'abc',
          metadata: { width: 1, height: 1, mode: 'fullscreen', timestamp: 1 },
          source: 'tray',
        },
      });
    });

    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        image_base64: 'abc',
        source: 'tray',
      })
    );
  });

  it('forwards screenshot OCR text to selection-send-to-chat', async () => {
    const ingest = jest.fn().mockResolvedValue(undefined);
    render(<TestScreenshotNativeSync ingestExternalCapture={ingest} />);

    await waitFor(() => {
      expect(eventHandlers['screenshot-ocr-result']).toBeDefined();
    });

    await act(async () => {
      await eventHandlers['screenshot-ocr-result']?.({
        payload: { text: '  extracted text  ' },
      });
    });

    expect(mockEmit).toHaveBeenCalledWith('selection-send-to-chat', { text: 'extracted text' });
  });

  it('runs legacy start-ocr-screenshot chain', async () => {
    const ingest = jest.fn().mockResolvedValue(undefined);
    render(<TestScreenshotNativeSync ingestExternalCapture={ingest} />);

    await waitFor(() => {
      expect(eventHandlers['start-ocr-screenshot']).toBeDefined();
    });

    await act(async () => {
      await eventHandlers['start-ocr-screenshot']?.({ payload: {} });
    });

    expect(mockStartRegionSelection).toHaveBeenCalled();
    expect(mockCaptureRegionWithHistory).toHaveBeenCalledWith(10, 20, 100, 60);
    expect(mockExtractText).toHaveBeenCalledWith('base64-image');
    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        image_base64: 'base64-image',
        source: 'legacy:start-ocr-screenshot',
      })
    );
    expect(mockEmit).toHaveBeenCalledWith(
      'screenshot-ocr-result',
      expect.objectContaining({
        text: 'ocr text',
        imageBase64: 'base64-image',
      })
    );
  });
});
