/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react';

// Mock Tauri APIs
const mockInvoke = jest.fn();
const mockStartDragging = jest.fn();
const mockSetPosition = jest.fn();
const mockOnMoved = jest.fn();
const mockOuterPosition = jest.fn();

jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

jest.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    startDragging: mockStartDragging,
    setPosition: mockSetPosition,
    onMoved: mockOnMoved,
    outerPosition: mockOuterPosition,
  }),
}));

jest.mock('@tauri-apps/api/dpi', () => ({
  PhysicalPosition: class PhysicalPosition {
    x: number;
    y: number;
    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
  },
}));

// Import after mocks
import AssistantBubblePage from './page';

describe('AssistantBubblePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup default mock implementations
    mockInvoke.mockResolvedValue(true);
    mockStartDragging.mockResolvedValue(undefined);
    mockSetPosition.mockResolvedValue(undefined);
    mockOnMoved.mockResolvedValue(() => {});
    mockOuterPosition.mockResolvedValue({ x: 0, y: 0 });

    // Pretend Tauri runtime exists
    (window as unknown as { __TAURI__?: unknown }).__TAURI__ = { version: '2.0.0' };

    // Clear localStorage
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the bubble button', () => {
    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('AI');
  });

  it('click toggles chat widget via invoke', async () => {
    mockInvoke
      .mockResolvedValueOnce(true) // chat_widget_toggle returns visible=true
      .mockResolvedValueOnce(undefined); // chat_widget_focus_input

    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    await act(async () => {
      fireEvent.pointerDown(btn);
      // Quick tap - advance less than drag threshold
      jest.advanceTimersByTime(50);
      fireEvent.pointerUp(btn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('chat_widget_toggle');
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('chat_widget_focus_input');
    });
  });

  it('long press starts dragging and does not toggle', async () => {
    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    await act(async () => {
      fireEvent.pointerDown(btn);
      // Advance past drag threshold (140ms)
      jest.advanceTimersByTime(200);
    });

    expect(mockStartDragging).toHaveBeenCalled();

    // Clear invoke mock to check if toggle is called on pointerUp
    mockInvoke.mockClear();

    await act(async () => {
      fireEvent.pointerUp(btn);
    });

    // Should NOT have called toggle because drag happened
    expect(mockInvoke).not.toHaveBeenCalledWith('chat_widget_toggle');
  });

  it('cancels drag timer on pointerLeave', async () => {
    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    await act(async () => {
      fireEvent.pointerDown(btn);
      // Leave before timer fires
      fireEvent.pointerLeave(btn);
      // Advance past drag threshold
      jest.advanceTimersByTime(200);
    });

    // startDragging should NOT have been called
    expect(mockStartDragging).not.toHaveBeenCalled();
  });

  it('restores bubble position from localStorage on mount', async () => {
    const storedPosition = { x: 100, y: 200 };
    window.localStorage.setItem('cognia-assistant-bubble', JSON.stringify(storedPosition));

    await act(async () => {
      render(<AssistantBubblePage />);
      // Flush promises for async setup
      await Promise.resolve();
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockSetPosition).toHaveBeenCalled();
    });
  });

  it('persists bubble position to localStorage on move', async () => {
    let moveCallback: ((event: { payload: { x: number; y: number } }) => void) | null = null;

    mockOnMoved.mockImplementation((callback) => {
      moveCallback = callback;
      return Promise.resolve(() => {});
    });

    await act(async () => {
      render(<AssistantBubblePage />);
      await Promise.resolve();
      jest.runAllTimers();
    });

    // Simulate window move event
    if (moveCallback) {
      act(() => {
        moveCallback!({ payload: { x: 300, y: 400 } });
      });
    }

    const stored = window.localStorage.getItem('cognia-assistant-bubble');
    expect(stored).toBeTruthy();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.x).toBe(300);
      expect(parsed.y).toBe(400);
    }
  });

  it('does not toggle when widget is not visible after toggle', async () => {
    mockInvoke.mockResolvedValueOnce(false); // toggle returns visible=false

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

    // Should NOT call focus_input when widget is hidden
    expect(mockInvoke).not.toHaveBeenCalledWith('chat_widget_focus_input');
  });
});
