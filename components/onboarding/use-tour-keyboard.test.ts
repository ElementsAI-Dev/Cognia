/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useTourKeyboard } from './use-tour-keyboard';

describe('useTourKeyboard', () => {
  const defaultOptions = {
    isActive: true,
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    onSkip: jest.fn(),
    onClose: jest.fn(),
    isFirst: false,
    isLast: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const dispatchKeyEvent = (key: string, options: Partial<KeyboardEventInit> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ...options,
    });
    act(() => {
      document.dispatchEvent(event);
    });
  };

  it('calls onNext when ArrowRight is pressed', () => {
    renderHook(() => useTourKeyboard(defaultOptions));
    
    dispatchKeyEvent('ArrowRight');
    
    expect(defaultOptions.onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when Enter is pressed', () => {
    renderHook(() => useTourKeyboard(defaultOptions));
    
    dispatchKeyEvent('Enter');
    
    expect(defaultOptions.onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when Space is pressed', () => {
    renderHook(() => useTourKeyboard(defaultOptions));
    
    dispatchKeyEvent(' ');
    
    expect(defaultOptions.onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onPrevious when ArrowLeft is pressed', () => {
    renderHook(() => useTourKeyboard(defaultOptions));
    
    dispatchKeyEvent('ArrowLeft');
    
    expect(defaultOptions.onPrevious).toHaveBeenCalledTimes(1);
  });

  it('does not call onPrevious on first step', () => {
    renderHook(() => useTourKeyboard({ ...defaultOptions, isFirst: true }));
    
    dispatchKeyEvent('ArrowLeft');
    
    expect(defaultOptions.onPrevious).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    renderHook(() => useTourKeyboard(defaultOptions));
    
    dispatchKeyEvent('Escape');
    
    expect(defaultOptions.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when Tab is pressed (not shift)', () => {
    renderHook(() => useTourKeyboard(defaultOptions));
    
    dispatchKeyEvent('Tab', { shiftKey: false });
    
    expect(defaultOptions.onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onPrevious when Shift+Tab is pressed', () => {
    renderHook(() => useTourKeyboard(defaultOptions));
    
    dispatchKeyEvent('Tab', { shiftKey: true });
    
    expect(defaultOptions.onPrevious).toHaveBeenCalledTimes(1);
  });

  it('does not call onNext on last step with ArrowRight (except Enter)', () => {
    renderHook(() => useTourKeyboard({ ...defaultOptions, isLast: true }));
    
    dispatchKeyEvent('ArrowRight');
    
    expect(defaultOptions.onNext).not.toHaveBeenCalled();
  });

  it('calls onNext on last step with Enter (to complete)', () => {
    renderHook(() => useTourKeyboard({ ...defaultOptions, isLast: true }));
    
    dispatchKeyEvent('Enter');
    
    expect(defaultOptions.onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when Ctrl+S is pressed', () => {
    renderHook(() => useTourKeyboard(defaultOptions));
    
    dispatchKeyEvent('s', { ctrlKey: true });
    
    expect(defaultOptions.onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when Meta+S is pressed', () => {
    renderHook(() => useTourKeyboard(defaultOptions));
    
    dispatchKeyEvent('S', { metaKey: true });
    
    expect(defaultOptions.onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not respond to keyboard when not active', () => {
    renderHook(() => useTourKeyboard({ ...defaultOptions, isActive: false }));
    
    dispatchKeyEvent('ArrowRight');
    dispatchKeyEvent('ArrowLeft');
    dispatchKeyEvent('Escape');
    
    expect(defaultOptions.onNext).not.toHaveBeenCalled();
    expect(defaultOptions.onPrevious).not.toHaveBeenCalled();
    expect(defaultOptions.onClose).not.toHaveBeenCalled();
  });

  it('provides keyboard hints', () => {
    const { result } = renderHook(() => useTourKeyboard(defaultOptions));
    
    expect(result.current.keyboardHints).toBeDefined();
    expect(result.current.keyboardHints.next).toBe('→ or Enter');
    expect(result.current.keyboardHints.previous).toBe('←');
    expect(result.current.keyboardHints.skip).toBe('Esc');
    expect(result.current.keyboardHints.complete).toBe('Enter');
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    const { unmount } = renderHook(() => useTourKeyboard(defaultOptions));
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('updates handlers when options change', () => {
    const onNext1 = jest.fn();
    const onNext2 = jest.fn();
    
    const { rerender } = renderHook(
      ({ onNext }) => useTourKeyboard({ ...defaultOptions, onNext }),
      { initialProps: { onNext: onNext1 } }
    );
    
    dispatchKeyEvent('ArrowRight');
    expect(onNext1).toHaveBeenCalledTimes(1);
    
    rerender({ onNext: onNext2 });
    
    dispatchKeyEvent('ArrowRight');
    expect(onNext2).toHaveBeenCalledTimes(1);
  });
});
