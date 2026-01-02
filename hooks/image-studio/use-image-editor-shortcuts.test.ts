import { renderHook } from '@testing-library/react';
import { useImageEditorShortcuts, getShortcutDisplay } from './use-image-editor-shortcuts';

describe('useImageEditorShortcuts', () => {
  const mockCallbacks = {
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    onSave: jest.fn(),
    onCancel: jest.fn(),
    onZoomIn: jest.fn(),
    onZoomOut: jest.fn(),
    onZoomReset: jest.fn(),
    onToggleFullscreen: jest.fn(),
    onDelete: jest.fn(),
    onCopy: jest.fn(),
    onPaste: jest.fn(),
    onSelectAll: jest.fn(),
    onDeselect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not throw when rendered', () => {
    expect(() => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
    }).not.toThrow();
  });

  it('should call onUndo when Ctrl+Z is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onUndo).toHaveBeenCalled();
  });

  it('should call onRedo when Ctrl+Y is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'y',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onRedo).toHaveBeenCalled();
  });

  it('should call onRedo when Ctrl+Shift+Z is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onRedo).toHaveBeenCalled();
  });

  it('should call onSave when Ctrl+S is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onSave).toHaveBeenCalled();
  });

  it('should call onCancel when Escape is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onCancel).toHaveBeenCalled();
  });

  it('should call onZoomIn when Ctrl++ is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: '+',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onZoomIn).toHaveBeenCalled();
  });

  it('should call onZoomIn when Ctrl+= is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: '=',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onZoomIn).toHaveBeenCalled();
  });

  it('should call onZoomOut when Ctrl+- is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: '-',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onZoomOut).toHaveBeenCalled();
  });

  it('should call onZoomReset when Ctrl+0 is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: '0',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onZoomReset).toHaveBeenCalled();
  });

  it('should call onToggleFullscreen when F11 is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'F11',
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onToggleFullscreen).toHaveBeenCalled();
  });

  it('should call onDelete when Delete is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onDelete).toHaveBeenCalled();
  });

  it('should call onCopy when Ctrl+C is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onCopy).toHaveBeenCalled();
  });

  it('should call onPaste when Ctrl+V is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'v',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onPaste).toHaveBeenCalled();
  });

  it('should call onSelectAll when Ctrl+A is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onSelectAll).toHaveBeenCalled();
  });

  it('should call onDeselect when Ctrl+D is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'd',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onDeselect).toHaveBeenCalled();
  });

  it('should not call callbacks when disabled', () => {
    renderHook(() => useImageEditorShortcuts({ ...mockCallbacks, enabled: false }));
    
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onUndo).not.toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});

describe('getShortcutDisplay', () => {
  it('returns correct shortcut for undo', () => {
    const result = getShortcutDisplay('undo');
    expect(result).toMatch(/Ctrl\+Z|⌘\+Z/);
  });

  it('returns correct shortcut for save', () => {
    const result = getShortcutDisplay('save');
    expect(result).toMatch(/Ctrl\+S|⌘\+S/);
  });

  it('returns correct shortcut for cancel', () => {
    const result = getShortcutDisplay('cancel');
    expect(result).toBe('Esc');
  });

  it('returns correct shortcut for fullscreen', () => {
    const result = getShortcutDisplay('fullscreen');
    expect(result).toBe('F11');
  });

  it('returns empty string for unknown action', () => {
    const result = getShortcutDisplay('unknownAction');
    expect(result).toBe('');
  });

  it('returns correct shortcut for delete', () => {
    const result = getShortcutDisplay('delete');
    expect(result).toBe('Del');
  });

  it('returns correct shortcut for zoomIn', () => {
    const result = getShortcutDisplay('zoomIn');
    expect(result).toMatch(/Ctrl\+\+|⌘\+\+/);
  });

  it('returns correct shortcut for zoomOut', () => {
    const result = getShortcutDisplay('zoomOut');
    expect(result).toMatch(/Ctrl\+-|⌘\+-/);
  });

  it('returns correct shortcut for copy', () => {
    const result = getShortcutDisplay('copy');
    expect(result).toMatch(/Ctrl\+C|⌘\+C/);
  });

  it('returns correct shortcut for paste', () => {
    const result = getShortcutDisplay('paste');
    expect(result).toMatch(/Ctrl\+V|⌘\+V/);
  });
});
