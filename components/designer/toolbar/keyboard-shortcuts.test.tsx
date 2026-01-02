/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { KeyboardShortcuts, useDesignerShortcuts } from './keyboard-shortcuts';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
const mockUndo = jest.fn();
const mockRedo = jest.fn();
const mockSetMode = jest.fn();
const mockSetZoom = jest.fn();
const mockToggleElementTree = jest.fn();
const mockToggleStylePanel = jest.fn();
const mockDeleteElement = jest.fn();
const mockDuplicateElement = jest.fn();
const mockSyncCodeFromElements = jest.fn();

jest.mock('@/stores/designer', () => ({
  useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      undo: mockUndo,
      redo: mockRedo,
      setMode: mockSetMode,
      setZoom: mockSetZoom,
      zoom: 100,
      toggleElementTree: mockToggleElementTree,
      toggleStylePanel: mockToggleStylePanel,
      selectedElementId: 'el-1',
      deleteElement: mockDeleteElement,
      duplicateElement: mockDuplicateElement,
      syncCodeFromElements: mockSyncCodeFromElements,
      history: ['state1', 'state2'],
      historyIndex: 1,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="dialog" data-open={open}>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: { className?: string }) => <hr className={className} />,
}));

describe('KeyboardShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render keyboard button', () => {
    render(<KeyboardShortcuts />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<KeyboardShortcuts className="custom-class" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should render dialog container', () => {
    render(<KeyboardShortcuts />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('should display keyboard shortcuts title in dialog', () => {
    render(<KeyboardShortcuts />);
    expect(screen.getByText('keyboardShortcuts')).toBeInTheDocument();
  });

  it('should display shortcut categories', () => {
    render(<KeyboardShortcuts />);
    expect(screen.getByText('editingShortcuts')).toBeInTheDocument();
    expect(screen.getByText('viewShortcuts')).toBeInTheDocument();
    expect(screen.getByText('navigationShortcuts')).toBeInTheDocument();
    expect(screen.getByText('aiShortcuts')).toBeInTheDocument();
  });

  it('should display undo shortcut', () => {
    render(<KeyboardShortcuts />);
    expect(screen.getByText('undo')).toBeInTheDocument();
  });

  it('should display redo shortcut', () => {
    render(<KeyboardShortcuts />);
    expect(screen.getByText('redo')).toBeInTheDocument();
  });

  it('should accept onAIEdit callback', () => {
    const onAIEdit = jest.fn();
    render(<KeyboardShortcuts onAIEdit={onAIEdit} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should accept onSave callback', () => {
    const onSave = jest.fn();
    render(<KeyboardShortcuts onSave={onSave} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('useDesignerShortcuts hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not register shortcuts when disabled', () => {
    renderHook(() => useDesignerShortcuts({ enabled: false }));
    
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(mockUndo).not.toHaveBeenCalled();
  });

  it('should call undo on Ctrl+Z', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(mockUndo).toHaveBeenCalled();
  });

  it('should handle redo shortcut Ctrl+Shift+Z', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    // Redo is only called when historyIndex < history.length - 1
    // With historyIndex: 1 and history length 2, redo won't be called
    expect(mockRedo).not.toHaveBeenCalled();
  });

  it('should handle redo shortcut Ctrl+Y', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    // Redo is only called when historyIndex < history.length - 1
    expect(mockRedo).not.toHaveBeenCalled();
  });

  it('should call onSave on Ctrl+S', () => {
    const onSave = jest.fn();
    renderHook(() => useDesignerShortcuts({ enabled: true, onSave }));
    
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(onSave).toHaveBeenCalled();
  });

  it('should call duplicateElement on Ctrl+D', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
    expect(mockDuplicateElement).toHaveBeenCalledWith('el-1');
    expect(mockSyncCodeFromElements).toHaveBeenCalled();
  });

  it('should switch to preview mode on key 1', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    
    fireEvent.keyDown(window, { key: '1' });
    expect(mockSetMode).toHaveBeenCalledWith('preview');
  });

  it('should switch to design mode on key 2', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    
    fireEvent.keyDown(window, { key: '2' });
    expect(mockSetMode).toHaveBeenCalledWith('design');
  });

  it('should switch to code mode on key 3', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    
    fireEvent.keyDown(window, { key: '3' });
    expect(mockSetMode).toHaveBeenCalledWith('code');
  });

  it('should zoom in on Ctrl++', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    
    fireEvent.keyDown(window, { key: '+', ctrlKey: true });
    expect(mockSetZoom).toHaveBeenCalledWith(110);
  });

  it('should zoom out on Ctrl+-', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    
    fireEvent.keyDown(window, { key: '-', ctrlKey: true });
    expect(mockSetZoom).toHaveBeenCalledWith(90);
  });

  it('should reset zoom on Ctrl+0', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    
    fireEvent.keyDown(window, { key: '0', ctrlKey: true });
    expect(mockSetZoom).toHaveBeenCalledWith(100);
  });

  it('should toggle element tree on Ctrl+L', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    
    fireEvent.keyDown(window, { key: 'l', ctrlKey: true });
    expect(mockToggleElementTree).toHaveBeenCalled();
  });

  it('should toggle style panel on Ctrl+P', () => {
    renderHook(() => useDesignerShortcuts({ enabled: true }));
    
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true });
    expect(mockToggleStylePanel).toHaveBeenCalled();
  });

  it('should call onAIEdit on Ctrl+K', () => {
    const onAIEdit = jest.fn();
    renderHook(() => useDesignerShortcuts({ enabled: true, onAIEdit }));
    
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(onAIEdit).toHaveBeenCalled();
  });
});
