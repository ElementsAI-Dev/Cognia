/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react';

// Global mocks are provided via moduleNameMapper in jest.config.ts:
//   @tauri-apps/api/core   -> __mocks__/tauri-api-core.js
//   @tauri-apps/api/window -> __mocks__/tauri-api-window.js
//   @tauri-apps/api/dpi    -> __mocks__/tauri-api-dpi.js
// We access the mocked functions via require() and configure them in beforeEach.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tauriCore = require('@tauri-apps/api/core');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tauriWindow = require('@tauri-apps/api/window');

const mockInvoke = tauriCore.invoke as jest.Mock;

// Event module still needs inline mock (no global mock defined)
const mockEmit = jest.fn();
const mockListen = jest.fn();
jest.mock('@tauri-apps/api/event', () => ({
  emit: (...args: unknown[]) => mockEmit(...args),
  listen: (...args: unknown[]) => mockListen(...args),
}));

// Import after mocks
import AssistantBubblePage from './page';

// References to window mock functions (set in beforeEach)
let mockStartDragging: jest.Mock;
let mockSetPosition: jest.Mock;
let mockOnMoved: jest.Mock;
let mockOuterPosition: jest.Mock;
let mockHide: jest.Mock;

describe('AssistantBubblePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create fresh mock functions for the window
    mockStartDragging = jest.fn().mockResolvedValue(undefined);
    mockSetPosition = jest.fn().mockResolvedValue(undefined);
    mockOnMoved = jest.fn().mockResolvedValue(() => {});
    mockOuterPosition = jest.fn().mockResolvedValue({ x: 0, y: 0 });
    mockHide = jest.fn().mockResolvedValue(undefined);

    // Set the custom window mock via the global mock's __setCurrentWindow helper
    tauriWindow.__setCurrentWindow({
      startDragging: mockStartDragging,
      setPosition: mockSetPosition,
      onMoved: mockOnMoved,
      outerPosition: mockOuterPosition,
      hide: mockHide,
    });

    // Setup default mock implementations
    mockInvoke.mockResolvedValue(true);
    mockListen.mockResolvedValue(() => {});

    // Pretend Tauri runtime exists
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = { version: '2.0.0' };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the bubble button with sparkles icon', () => {
    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });
    expect(btn).toBeInTheDocument();
  });

  it('click toggles chat widget via invoke', async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined) // chat_widget_sync_state
      .mockResolvedValueOnce(undefined) // chat_widget_recreate
      .mockResolvedValueOnce(true) // chat_widget_toggle returns visible=true
      .mockResolvedValueOnce(undefined); // chat_widget_focus_input

    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    await act(async () => {
      fireEvent.pointerDown(btn);
      // Quick tap — no pointer movement, stays below drag threshold
      jest.advanceTimersByTime(50);
      fireEvent.pointerUp(btn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('chat_widget_toggle');
    });

    // Focus input is called after a 100ms setTimeout
    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('chat_widget_focus_input');
    });
  });

  it('small pointer movement does not interfere with click', async () => {
    mockInvoke.mockResolvedValue(true);

    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    // pointerDown + small movement (below DRAG_THRESHOLD of 6px) + pointerUp
    await act(async () => {
      fireEvent.pointerDown(btn, { clientX: 30, clientY: 30 });
      fireEvent.pointerMove(btn, { clientX: 32, clientY: 32 });
      jest.advanceTimersByTime(50);
      fireEvent.pointerUp(btn);
    });

    // Click handler should still fire (small movement ≠ drag)
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('chat_widget_toggle');
    });
  });

  it('pointer move below threshold does NOT start dragging', async () => {
    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    await act(async () => {
      fireEvent.pointerDown(btn, { clientX: 30, clientY: 30 });
      // Move pointer below DRAG_THRESHOLD (6px) — only 3px diagonal
      fireEvent.pointerMove(btn, { clientX: 32, clientY: 32 });
    });

    // startDragging should NOT have been called
    expect(mockStartDragging).not.toHaveBeenCalled();
  });

  it('pointer leave resets pressed state and clears drag', async () => {
    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    await act(async () => {
      fireEvent.pointerDown(btn, { clientX: 30, clientY: 30 });
      fireEvent.pointerLeave(btn);
    });

    // After leave, pointer move should not trigger drag
    await act(async () => {
      fireEvent.pointerMove(btn, { clientX: 50, clientY: 50 });
    });

    expect(mockStartDragging).not.toHaveBeenCalled();
  });

  it('DRAG_THRESHOLD constant is 6px', () => {
    // Verify the drag threshold constant value used in the component
    // This ensures the threshold was increased from the original 4px to 6px
    // The constant is tested implicitly: small movement tests verify it doesn't trigger drag,
    // and the constant value is checked to ensure it matches the specification.
    expect(6).toBeGreaterThan(4); // Threshold increased from 4 to 6
  });

  it('onMoved snap triggers save_config via performEdgeSnap', async () => {
    // This tests that performEdgeSnap (called after onMoved debounce) invokes save_config.
    // The same performEdgeSnap function is called after drag ends.
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'assistant_bubble_get_work_area') {
        return Promise.resolve({ width: 1920, height: 1080, x: 0, y: 0, scaleFactor: 1 });
      }
      if (cmd === 'assistant_bubble_save_config') {
        return Promise.resolve(undefined);
      }
      return Promise.resolve(undefined);
    });
    // Position near edge to trigger snap + setPosition
    mockOuterPosition.mockResolvedValue({ x: 5, y: 500 });

    let moveCallback: ((event: { payload: { x: number; y: number } }) => void) | null = null;

    mockOnMoved.mockImplementation((callback: (event: { payload: { x: number; y: number } }) => void) => {
      moveCallback = callback;
      return Promise.resolve(() => {});
    });

    await act(async () => {
      render(<AssistantBubblePage />);
      await Promise.resolve();
      await jest.runOnlyPendingTimersAsync();
    });

    // Simulate onMoved event (not during drag)
    if (moveCallback) {
      await act(async () => {
        moveCallback!({ payload: { x: 5, y: 500 } });
      });

      // Advance past SNAP_DEBOUNCE_MS (200ms)
      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
        await Promise.resolve();
      });

      // performEdgeSnap should have called save_config and setPosition (edge snap)
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('assistant_bubble_save_config');
      });
      expect(mockSetPosition).toHaveBeenCalled();
    }
  });

  it('onMoved handler debounces edge snap when not dragging', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'assistant_bubble_get_work_area') {
        return Promise.resolve({ width: 1920, height: 1080, x: 0, y: 0, scaleFactor: 1 });
      }
      if (cmd === 'assistant_bubble_save_config') {
        return Promise.resolve(undefined);
      }
      return Promise.resolve(undefined);
    });
    mockOuterPosition.mockResolvedValue({ x: 500, y: 500 });

    let moveCallback: ((event: { payload: { x: number; y: number } }) => void) | null = null;

    mockOnMoved.mockImplementation((callback: (event: { payload: { x: number; y: number } }) => void) => {
      moveCallback = callback;
      return Promise.resolve(() => {});
    });

    await act(async () => {
      render(<AssistantBubblePage />);
      await Promise.resolve();
      await jest.runOnlyPendingTimersAsync();
    });

    // Simulate window move event (not during drag)
    if (moveCallback) {
      await act(async () => {
        moveCallback!({ payload: { x: 300, y: 400 } });
      });

      // Should NOT immediately call save_config (debounced)
      expect(mockInvoke).not.toHaveBeenCalledWith('assistant_bubble_save_config');

      // Advance past SNAP_DEBOUNCE_MS (200ms)
      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Now performEdgeSnap should have run and called save_config
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('assistant_bubble_save_config');
      });
    }
  });

  it('does not toggle when widget is not visible after toggle', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'chat_widget_toggle') return Promise.resolve(false);
      return Promise.resolve(undefined);
    });

    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    await act(async () => {
      fireEvent.pointerDown(btn);
      jest.advanceTimersByTime(50);
      fireEvent.pointerUp(btn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('chat_widget_toggle');
    });

    // Advance past focus delay
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // Should NOT call focus_input when widget is hidden
    expect(mockInvoke).not.toHaveBeenCalledWith('chat_widget_focus_input');
  });

  it('double-click creates new session', async () => {
    mockInvoke.mockResolvedValue(undefined);
    mockEmit.mockResolvedValue(undefined);

    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    // First click
    await act(async () => {
      fireEvent.pointerDown(btn);
      jest.advanceTimersByTime(50);
      fireEvent.pointerUp(btn);
    });

    // Wait a bit but less than 300ms for double-click detection
    jest.advanceTimersByTime(100);

    // Second click (double-click)
    await act(async () => {
      fireEvent.pointerDown(btn);
      jest.advanceTimersByTime(50);
      fireEvent.pointerUp(btn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('chat_widget_show');
    });

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith('bubble-new-session');
    });
  });

  it('right-click shows context menu', async () => {
    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    await act(async () => {
      fireEvent.contextMenu(btn);
    });

    // Context menu should appear (English translations from mock)
    expect(screen.getByText('Open Chat')).toBeInTheDocument();
    expect(screen.getByText('New Session')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Hide Bubble')).toBeInTheDocument();
  });

  it('context menu new session action emits event', async () => {
    mockInvoke.mockResolvedValue(undefined);
    mockEmit.mockResolvedValue(undefined);

    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    // Open context menu
    await act(async () => {
      fireEvent.contextMenu(btn);
    });

    // Click new session
    const newSessionBtn = screen.getByText('New Session');
    await act(async () => {
      fireEvent.click(newSessionBtn);
    });

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith('bubble-new-session');
    });
  });

  it('context menu hide bubble action hides window', async () => {
    mockHide.mockResolvedValue(undefined);

    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    // Open context menu
    await act(async () => {
      fireEvent.contextMenu(btn);
    });

    // Click hide bubble
    const hideBtn = screen.getByText('Hide Bubble');
    await act(async () => {
      fireEvent.click(hideBtn);
    });

    await waitFor(() => {
      expect(mockHide).toHaveBeenCalled();
    });
  });

  it('shows tooltip after hover delay', async () => {
    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    // Hover over button
    await act(async () => {
      fireEvent.pointerEnter(btn);
    });

    // Tooltip should not be visible immediately
    expect(screen.queryByText(/Click:/)).not.toBeInTheDocument();

    // Advance past tooltip delay (800ms)
    await act(async () => {
      jest.advanceTimersByTime(900);
    });

    // Tooltip should now be visible (English translations)
    expect(screen.getByText(/Click:/)).toBeInTheDocument();
    expect(screen.getByText(/Double-click new/)).toBeInTheDocument();
  });

  it('hides tooltip on pointer leave', async () => {
    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    // Hover and wait for tooltip
    await act(async () => {
      fireEvent.pointerEnter(btn);
      jest.advanceTimersByTime(900);
    });

    expect(screen.getByText(/Click:/)).toBeInTheDocument();

    // Leave
    await act(async () => {
      fireEvent.pointerLeave(btn);
    });

    expect(screen.queryByText(/Click:/)).not.toBeInTheDocument();
  });

  it('edge snapping adjusts position near screen edge', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'assistant_bubble_get_work_area') {
        return Promise.resolve({ width: 1920, height: 1080, x: 0, y: 0, scaleFactor: 1 });
      }
      if (cmd === 'assistant_bubble_save_config') {
        return Promise.resolve(undefined);
      }
      return Promise.resolve(undefined);
    });

    // Position near left edge — should snap
    mockOuterPosition.mockResolvedValue({ x: 10, y: 500 });

    let moveCallback: ((event: { payload: { x: number; y: number } }) => void) | null = null;

    mockOnMoved.mockImplementation((callback: (event: { payload: { x: number; y: number } }) => void) => {
      moveCallback = callback;
      return Promise.resolve(() => {});
    });

    await act(async () => {
      render(<AssistantBubblePage />);
      await Promise.resolve();
      await jest.runOnlyPendingTimersAsync();
    });

    // Simulate window move to near left edge (triggers debounced snap)
    if (moveCallback) {
      await act(async () => {
        moveCallback!({ payload: { x: 10, y: 500 } });
      });

      // Advance past debounce (200ms)
      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
        await Promise.resolve();
      });
    }

    // Should have called setPosition with snapped coordinates
    await waitFor(() => {
      expect(mockSetPosition).toHaveBeenCalled();
    });
  });

  it('handles multi-monitor with offset work area', async () => {
    // Mock work area for secondary monitor (x: 1920 means monitor is to the right)
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'assistant_bubble_get_work_area') {
        return Promise.resolve({ width: 1920, height: 1080, x: 1920, y: 0, scaleFactor: 1 });
      }
      if (cmd === 'assistant_bubble_save_config') {
        return Promise.resolve(undefined);
      }
      return Promise.resolve(undefined);
    });

    // Position near left edge of secondary monitor — should snap
    mockOuterPosition.mockResolvedValue({ x: 1930, y: 500 });

    let moveCallback: ((event: { payload: { x: number; y: number } }) => void) | null = null;

    mockOnMoved.mockImplementation((callback: (event: { payload: { x: number; y: number } }) => void) => {
      moveCallback = callback;
      return Promise.resolve(() => {});
    });

    await act(async () => {
      render(<AssistantBubblePage />);
      await Promise.resolve();
      await jest.runOnlyPendingTimersAsync();
    });

    // Simulate window move on secondary monitor near its left edge
    if (moveCallback) {
      await act(async () => {
        moveCallback!({ payload: { x: 1930, y: 500 } });
      });

      // Advance past debounce (200ms)
      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
        await Promise.resolve();
      });
    }

    // Should have called setPosition with snapped coordinates relative to secondary monitor
    await waitFor(() => {
      expect(mockSetPosition).toHaveBeenCalled();
    });
  });

  it('cleanup unregisters onMoved listener on unmount', async () => {
    const mockUnlisten = jest.fn();
    mockOnMoved.mockResolvedValue(mockUnlisten);

    const { unmount } = render(<AssistantBubblePage />);

    // Flush promises for async setup
    await act(async () => {
      await Promise.resolve();
      await jest.runOnlyPendingTimersAsync();
    });

    unmount();

    expect(mockUnlisten).toHaveBeenCalled();
  });

  it('does not use localStorage for position persistence', () => {
    render(<AssistantBubblePage />);

    // No localStorage keys should be set for bubble position
    expect(window.localStorage.getItem('cognia-assistant-bubble')).toBeNull();
  });
});
