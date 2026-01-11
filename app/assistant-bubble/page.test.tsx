/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react';

// Mock Tauri APIs
const mockInvoke = jest.fn();
const mockEmit = jest.fn();
const mockListen = jest.fn();
const mockStartDragging = jest.fn();
const mockSetPosition = jest.fn();
const mockOnMoved = jest.fn();
const mockOuterPosition = jest.fn();
const mockHide = jest.fn();

jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

jest.mock('@tauri-apps/api/event', () => ({
  emit: (...args: unknown[]) => mockEmit(...args),
  listen: (...args: unknown[]) => mockListen(...args),
}));

const mockOnDragDropEvent = jest.fn();

jest.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    startDragging: mockStartDragging,
    setPosition: mockSetPosition,
    onMoved: mockOnMoved,
    outerPosition: mockOuterPosition,
    hide: mockHide,
    onDragDropEvent: mockOnDragDropEvent,
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
    mockOnDragDropEvent.mockResolvedValue(() => {});

    // Pretend Tauri runtime exists
    (window as unknown as { __TAURI__?: unknown }).__TAURI__ = { version: '2.0.0' };

    // Clear localStorage
    window.localStorage.clear();
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

    render(<AssistantBubblePage />);
    
    // Flush promises for async setup
    await act(async () => {
      await Promise.resolve();
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockSetPosition).toHaveBeenCalled();
    });
  });

  it('persists bubble position to localStorage on move', async () => {
    // Mock screen size for edge snapping
    Object.defineProperty(window.screen, 'availWidth', { value: 1920, writable: true });
    Object.defineProperty(window.screen, 'availHeight', { value: 1080, writable: true });

    let moveCallback: ((event: { payload: { x: number; y: number } }) => Promise<void>) | null = null;

    mockOnMoved.mockImplementation((callback) => {
      moveCallback = callback;
      return Promise.resolve(() => {});
    });

    render(<AssistantBubblePage />);
    
    // Flush promises for async setup
    await act(async () => {
      await Promise.resolve();
      jest.runAllTimers();
    });

    // Simulate window move event (in center of screen, not near edge)
    if (moveCallback) {
      await act(async () => {
        await moveCallback!({ payload: { x: 300, y: 400 } });
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

    // Context menu should appear
    expect(screen.getByText('打开对话')).toBeInTheDocument();
    expect(screen.getByText('新对话')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
    expect(screen.getByText('隐藏气泡')).toBeInTheDocument();
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
    const newSessionBtn = screen.getByText('新对话');
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
    const hideBtn = screen.getByText('隐藏气泡');
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
    expect(screen.queryByText(/点击：/)).not.toBeInTheDocument();

    // Advance past tooltip delay (800ms)
    await act(async () => {
      jest.advanceTimersByTime(900);
    });

    // Tooltip should now be visible
    expect(screen.getByText(/点击：/)).toBeInTheDocument();
    expect(screen.getByText(/双击新建/)).toBeInTheDocument();
  });

  it('hides tooltip on pointer leave', async () => {
    render(<AssistantBubblePage />);
    const btn = screen.getByRole('button', { name: /open cognia assistant/i });

    // Hover and wait for tooltip
    await act(async () => {
      fireEvent.pointerEnter(btn);
      jest.advanceTimersByTime(900);
    });

    expect(screen.getByText(/点击：/)).toBeInTheDocument();

    // Leave
    await act(async () => {
      fireEvent.pointerLeave(btn);
    });

    expect(screen.queryByText(/点击：/)).not.toBeInTheDocument();
  });

  it('edge snapping adjusts position near screen edge', async () => {
    // Mock screen size
    Object.defineProperty(window.screen, 'availWidth', { value: 1920, writable: true });
    Object.defineProperty(window.screen, 'availHeight', { value: 1080, writable: true });

    let moveCallback: ((event: { payload: { x: number; y: number } }) => Promise<void>) | null = null;

    mockOnMoved.mockImplementation((callback) => {
      moveCallback = callback;
      return Promise.resolve(() => {});
    });

    await act(async () => {
      render(<AssistantBubblePage />);
      await Promise.resolve();
      jest.runAllTimers();
    });

    // Simulate window move to near left edge (within snap threshold)
    if (moveCallback) {
      await act(async () => {
        await moveCallback!({ payload: { x: 10, y: 500 } });
      });
    }

    // Should have called setPosition with snapped coordinates
    await waitFor(() => {
      expect(mockSetPosition).toHaveBeenCalled();
    });
  });
});
