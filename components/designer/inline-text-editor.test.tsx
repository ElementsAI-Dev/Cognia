/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineTextEditor, useInlineTextEditor } from './inline-text-editor';
import { renderHook, act } from '@testing-library/react';

// Mock designer store
const mockUpdateElementText = jest.fn();
const mockSyncCodeFromElements = jest.fn();

jest.mock('@/stores/designer-store', () => ({
  useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      updateElementText: mockUpdateElementText,
      syncCodeFromElements: mockSyncCodeFromElements,
    };
    return selector(state);
  },
}));

describe('InlineTextEditor', () => {
  const defaultProps = {
    elementId: 'element-1',
    initialText: 'Hello World',
    position: { x: 100, y: 100, width: 200, height: 50 },
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render textarea with initial text', () => {
    render(<InlineTextEditor {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Hello World');
  });

  it('should focus textarea on mount', async () => {
    render(<InlineTextEditor {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    await waitFor(() => {
      expect(document.activeElement).toBe(textarea);
    });
  });

  it('should render save and cancel buttons', () => {
    render(<InlineTextEditor {...defaultProps} />);
    
    const saveButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-check')
    );
    const cancelButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-x')
    );
    
    expect(saveButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });

  it('should update text state when typing', async () => {
    render(<InlineTextEditor {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'New text');
    
    expect(textarea).toHaveValue('New text');
  });

  it('should save and close when Enter is pressed', async () => {
    const onClose = jest.fn();
    render(<InlineTextEditor {...defaultProps} onClose={onClose} />);
    
    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Updated text{enter}');
    
    expect(mockUpdateElementText).toHaveBeenCalledWith('element-1', 'Updated text');
    expect(mockSyncCodeFromElements).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should not save when Shift+Enter is pressed', async () => {
    const onClose = jest.fn();
    render(<InlineTextEditor {...defaultProps} onClose={onClose} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should close without saving when Escape is pressed', async () => {
    const onClose = jest.fn();
    render(<InlineTextEditor {...defaultProps} onClose={onClose} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Escape' });
    
    expect(mockUpdateElementText).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should save when save button is clicked', async () => {
    const onClose = jest.fn();
    render(<InlineTextEditor {...defaultProps} onClose={onClose} />);
    
    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Saved text');
    
    const saveButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-check')
    );
    
    if (saveButton) {
      await userEvent.click(saveButton);
      expect(mockUpdateElementText).toHaveBeenCalledWith('element-1', 'Saved text');
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should close without saving when cancel button is clicked', async () => {
    const onClose = jest.fn();
    render(<InlineTextEditor {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-x')
    );
    
    if (cancelButton) {
      await userEvent.click(cancelButton);
      expect(mockUpdateElementText).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should not save when text has not changed', async () => {
    const onClose = jest.fn();
    render(<InlineTextEditor {...defaultProps} onClose={onClose} />);
    
    const saveButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-check')
    );
    
    if (saveButton) {
      await userEvent.click(saveButton);
      expect(mockUpdateElementText).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should apply position styles', () => {
    const { container } = render(<InlineTextEditor {...defaultProps} />);
    
    const editor = container.firstChild as HTMLElement;
    expect(editor.style.left).toBe('100px');
    expect(editor.style.top).toBe('100px');
    expect(editor.style.minWidth).toBe('200px');
    expect(editor.style.minHeight).toBe('50px');
  });

  it('should apply minimum width of 100px', () => {
    const props = {
      ...defaultProps,
      position: { x: 0, y: 0, width: 50, height: 20 },
    };
    const { container } = render(<InlineTextEditor {...props} />);
    
    const editor = container.firstChild as HTMLElement;
    expect(editor.style.minWidth).toBe('100px');
  });

  it('should apply minimum height of 24px', () => {
    const props = {
      ...defaultProps,
      position: { x: 0, y: 0, width: 100, height: 10 },
    };
    const { container } = render(<InlineTextEditor {...props} />);
    
    const editor = container.firstChild as HTMLElement;
    expect(editor.style.minHeight).toBe('24px');
  });

  it('should apply custom className', () => {
    const { container } = render(<InlineTextEditor {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('useInlineTextEditor hook', () => {
  it('should initialize with isEditing false', () => {
    const { result } = renderHook(() => useInlineTextEditor());
    
    expect(result.current.isEditing).toBe(false);
    expect(result.current.editingElement).toBeNull();
  });

  it('should set isEditing and editingElement when startEditing is called', () => {
    const { result } = renderHook(() => useInlineTextEditor());
    
    const mockRect = {
      left: 100,
      top: 200,
      width: 150,
      height: 30,
    } as DOMRect;
    
    act(() => {
      result.current.startEditing('element-1', 'Test text', mockRect);
    });
    
    expect(result.current.isEditing).toBe(true);
    expect(result.current.editingElement).toEqual({
      id: 'element-1',
      text: 'Test text',
      position: {
        x: 100,
        y: 200,
        width: 150,
        height: 30,
      },
    });
  });

  it('should reset state when stopEditing is called', () => {
    const { result } = renderHook(() => useInlineTextEditor());
    
    const mockRect = {
      left: 100,
      top: 200,
      width: 150,
      height: 30,
    } as DOMRect;
    
    act(() => {
      result.current.startEditing('element-1', 'Test text', mockRect);
    });
    
    expect(result.current.isEditing).toBe(true);
    
    act(() => {
      result.current.stopEditing();
    });
    
    expect(result.current.isEditing).toBe(false);
    expect(result.current.editingElement).toBeNull();
  });
});
