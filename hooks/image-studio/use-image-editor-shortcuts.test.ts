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

  it('should call onDelete when Backspace is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'Backspace',
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onDelete).toHaveBeenCalled();
  });

  it('should call onToggleFullscreen when Ctrl+Shift+F is pressed', () => {
    renderHook(() => useImageEditorShortcuts(mockCallbacks));
    
    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    expect(mockCallbacks.onToggleFullscreen).toHaveBeenCalled();
  });

  describe('should not trigger shortcuts when target is input element', () => {
    it('should not trigger when target is INPUT', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const input = document.createElement('input');
      document.body.appendChild(input);
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      });
      Object.defineProperty(event, 'target', { value: input });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onUndo).not.toHaveBeenCalled();
      document.body.removeChild(input);
    });

    it('should not trigger when target is TEXTAREA', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      });
      Object.defineProperty(event, 'target', { value: textarea });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onUndo).not.toHaveBeenCalled();
      document.body.removeChild(textarea);
    });

    it('should not trigger when target is contentEditable', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const div = document.createElement('div');
      div.contentEditable = 'true';
      document.body.appendChild(div);
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      });
      // Mock isContentEditable since JSDOM doesn't fully support it
      Object.defineProperty(div, 'isContentEditable', { value: true, configurable: true });
      Object.defineProperty(event, 'target', { value: div });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onUndo).not.toHaveBeenCalled();
      document.body.removeChild(div);
    });
  });

  describe('Mac platform support with metaKey', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');

    beforeEach(() => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });
    });

    afterEach(() => {
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform);
      }
    });

    it('should call onUndo when Cmd+Z is pressed on Mac', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onUndo).toHaveBeenCalled();
    });

    it('should call onRedo when Cmd+Shift+Z is pressed on Mac', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onRedo).toHaveBeenCalled();
    });

    it('should call onSave when Cmd+S is pressed on Mac', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onSave).toHaveBeenCalled();
    });

    it('should call onZoomIn when Cmd++ is pressed on Mac', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: '+',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onZoomIn).toHaveBeenCalled();
    });

    it('should call onZoomOut when Cmd+- is pressed on Mac', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: '-',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onZoomOut).toHaveBeenCalled();
    });

    it('should call onCopy when Cmd+C is pressed on Mac', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onCopy).toHaveBeenCalled();
    });

    it('should call onPaste when Cmd+V is pressed on Mac', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: 'v',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onPaste).toHaveBeenCalled();
    });

    it('should call onSelectAll when Cmd+A is pressed on Mac', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onSelectAll).toHaveBeenCalled();
    });

    it('should call onDeselect when Cmd+D is pressed on Mac', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: 'd',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onDeselect).toHaveBeenCalled();
    });

    it('should call onZoomReset when Cmd+0 is pressed on Mac', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: '0',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onZoomReset).toHaveBeenCalled();
    });

    it('should call onToggleFullscreen when Cmd+Shift+F is pressed on Mac', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: 'f',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onToggleFullscreen).toHaveBeenCalled();
    });
  });

  describe('optional callbacks', () => {
    it('should not crash when onUndo is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onRedo is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: 'y',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onSave is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onCancel is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onZoomIn is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: '+',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onZoomOut is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: '-',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onZoomReset is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: '0',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onToggleFullscreen is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: 'F11',
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onDelete is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: 'Delete',
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onCopy is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onPaste is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: 'v',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onSelectAll is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: 'a',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not crash when onDeselect is not provided', () => {
      expect(() => {
        renderHook(() => useImageEditorShortcuts({}));
        
        const event = new KeyboardEvent('keydown', {
          key: 'd',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }).not.toThrow();
    });
  });

  describe('enabled state transitions', () => {
    it('should start listening when enabled changes from false to true', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const { rerender } = renderHook(
        ({ enabled }) => useImageEditorShortcuts({ ...mockCallbacks, enabled }),
        { initialProps: { enabled: false } }
      );
      
      addEventListenerSpy.mockClear();
      rerender({ enabled: true });
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('should stop listening when enabled changes from true to false', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { rerender } = renderHook(
        ({ enabled }) => useImageEditorShortcuts({ ...mockCallbacks, enabled }),
        { initialProps: { enabled: true } }
      );
      
      removeEventListenerSpy.mockClear();
      rerender({ enabled: false });
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('unhandled keys', () => {
    it('should not call any callback for unhandled keys', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: 'x',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      Object.values(mockCallbacks).forEach(callback => {
        expect(callback).not.toHaveBeenCalled();
      });
    });

    it('should not call any callback for plain letter keys without modifiers', () => {
      renderHook(() => useImageEditorShortcuts(mockCallbacks));
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        bubbles: true,
      });
      window.dispatchEvent(event);
      
      expect(mockCallbacks.onUndo).not.toHaveBeenCalled();
    });
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

  it('returns correct shortcut for redo', () => {
    const result = getShortcutDisplay('redo');
    expect(result).toMatch(/Ctrl\+Y|⌘\+Shift\+Z/);
  });

  it('returns correct shortcut for zoomReset', () => {
    const result = getShortcutDisplay('zoomReset');
    expect(result).toMatch(/Ctrl\+0|⌘\+0/);
  });

  it('returns correct shortcut for selectAll', () => {
    const result = getShortcutDisplay('selectAll');
    expect(result).toMatch(/Ctrl\+A|⌘\+A/);
  });

  it('returns correct shortcut for deselect', () => {
    const result = getShortcutDisplay('deselect');
    expect(result).toMatch(/Ctrl\+D|⌘\+D/);
  });

  describe('Mac platform display', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');

    beforeEach(() => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });
    });

    afterEach(() => {
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform);
      }
    });

    it('returns Mac symbol for undo on Mac', () => {
      const result = getShortcutDisplay('undo');
      expect(result).toBe('⌘+Z');
    });

    it('returns Mac symbol for redo on Mac', () => {
      const result = getShortcutDisplay('redo');
      expect(result).toBe('⌘+Shift+Z');
    });

    it('returns Mac symbol for save on Mac', () => {
      const result = getShortcutDisplay('save');
      expect(result).toBe('⌘+S');
    });

    it('returns Mac symbol for copy on Mac', () => {
      const result = getShortcutDisplay('copy');
      expect(result).toBe('⌘+C');
    });

    it('returns Mac symbol for paste on Mac', () => {
      const result = getShortcutDisplay('paste');
      expect(result).toBe('⌘+V');
    });

    it('returns Mac symbol for selectAll on Mac', () => {
      const result = getShortcutDisplay('selectAll');
      expect(result).toBe('⌘+A');
    });

    it('returns Mac symbol for deselect on Mac', () => {
      const result = getShortcutDisplay('deselect');
      expect(result).toBe('⌘+D');
    });

    it('returns Mac symbol for zoomIn on Mac', () => {
      const result = getShortcutDisplay('zoomIn');
      expect(result).toBe('⌘++');
    });

    it('returns Mac symbol for zoomOut on Mac', () => {
      const result = getShortcutDisplay('zoomOut');
      expect(result).toBe('⌘+-');
    });

    it('returns Mac symbol for zoomReset on Mac', () => {
      const result = getShortcutDisplay('zoomReset');
      expect(result).toBe('⌘+0');
    });
  });

  describe('Windows/Linux platform display', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');

    beforeEach(() => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });
    });

    afterEach(() => {
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform);
      }
    });

    it('returns Ctrl for undo on Windows', () => {
      const result = getShortcutDisplay('undo');
      expect(result).toBe('Ctrl+Z');
    });

    it('returns Ctrl+Y for redo on Windows', () => {
      const result = getShortcutDisplay('redo');
      expect(result).toBe('Ctrl+Y');
    });

    it('returns Ctrl for save on Windows', () => {
      const result = getShortcutDisplay('save');
      expect(result).toBe('Ctrl+S');
    });

    it('returns Ctrl for copy on Windows', () => {
      const result = getShortcutDisplay('copy');
      expect(result).toBe('Ctrl+C');
    });

    it('returns Ctrl for paste on Windows', () => {
      const result = getShortcutDisplay('paste');
      expect(result).toBe('Ctrl+V');
    });

    it('returns Ctrl for selectAll on Windows', () => {
      const result = getShortcutDisplay('selectAll');
      expect(result).toBe('Ctrl+A');
    });

    it('returns Ctrl for deselect on Windows', () => {
      const result = getShortcutDisplay('deselect');
      expect(result).toBe('Ctrl+D');
    });

    it('returns Ctrl for zoomIn on Windows', () => {
      const result = getShortcutDisplay('zoomIn');
      expect(result).toBe('Ctrl++');
    });

    it('returns Ctrl for zoomOut on Windows', () => {
      const result = getShortcutDisplay('zoomOut');
      expect(result).toBe('Ctrl+-');
    });

    it('returns Ctrl for zoomReset on Windows', () => {
      const result = getShortcutDisplay('zoomReset');
      expect(result).toBe('Ctrl+0');
    });
  });
});
