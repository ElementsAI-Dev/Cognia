/**
 * useWorkflowKeyboardShortcuts Hook Tests
 */

import { renderHook } from '@testing-library/react';
import { useWorkflowKeyboardShortcuts } from './use-workflow-keyboard-shortcuts';

// Mock dependencies
const mockUndo = jest.fn();
const mockRedo = jest.fn();
const mockCopySelection = jest.fn();
const mockPasteSelection = jest.fn();
const mockCutSelection = jest.fn();
const mockSelectAll = jest.fn();
const mockClearSelection = jest.fn();
const mockDeleteNodes = jest.fn();
const mockDuplicateNode = jest.fn();

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: Object.assign(
    jest.fn(() => ({
      selectedNodes: ['node-1'],
      undo: mockUndo,
      redo: mockRedo,
      copySelection: mockCopySelection,
      pasteSelection: mockPasteSelection,
      cutSelection: mockCutSelection,
      selectAll: mockSelectAll,
      clearSelection: mockClearSelection,
      deleteNodes: mockDeleteNodes,
    })),
    {
      getState: jest.fn(() => ({
        duplicateNode: mockDuplicateNode,
      })),
    }
  ),
}));

describe('useWorkflowKeyboardShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return shortcuts array', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    expect(result.current.shortcuts).toBeDefined();
    expect(Array.isArray(result.current.shortcuts)).toBe(true);
    expect(result.current.shortcuts.length).toBeGreaterThan(0);
  });

  it('should include undo shortcut', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    const undoShortcut = result.current.shortcuts.find((s) => s.action === 'Undo');
    expect(undoShortcut).toBeDefined();
    expect(undoShortcut?.key).toContain('Z');
  });

  it('should include redo shortcut', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    const redoShortcut = result.current.shortcuts.find((s) => s.action === 'Redo');
    expect(redoShortcut).toBeDefined();
  });

  it('should include copy shortcut', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    const copyShortcut = result.current.shortcuts.find((s) => s.action === 'Copy');
    expect(copyShortcut).toBeDefined();
    expect(copyShortcut?.key).toContain('C');
  });

  it('should include paste shortcut', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    const pasteShortcut = result.current.shortcuts.find((s) => s.action === 'Paste');
    expect(pasteShortcut).toBeDefined();
    expect(pasteShortcut?.key).toContain('V');
  });

  it('should include cut shortcut', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    const cutShortcut = result.current.shortcuts.find((s) => s.action === 'Cut');
    expect(cutShortcut).toBeDefined();
    expect(cutShortcut?.key).toContain('X');
  });

  it('should include select all shortcut', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    const selectAllShortcut = result.current.shortcuts.find((s) => s.action === 'Select All');
    expect(selectAllShortcut).toBeDefined();
    expect(selectAllShortcut?.key).toContain('A');
  });

  it('should include save shortcut', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    const saveShortcut = result.current.shortcuts.find((s) => s.action === 'Save');
    expect(saveShortcut).toBeDefined();
    expect(saveShortcut?.key).toContain('S');
  });

  it('should include duplicate shortcut', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    const dupShortcut = result.current.shortcuts.find((s) => s.action === 'Duplicate');
    expect(dupShortcut).toBeDefined();
    expect(dupShortcut?.key).toContain('D');
  });

  it('should include delete shortcut', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    const deleteShortcut = result.current.shortcuts.find((s) => s.action === 'Delete');
    expect(deleteShortcut).toBeDefined();
  });

  it('should include clear selection shortcut', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    const clearShortcut = result.current.shortcuts.find((s) => s.action === 'Clear Selection');
    expect(clearShortcut).toBeDefined();
    expect(clearShortcut?.key).toContain('Escape');
  });

  it('should accept enabled option', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts({ enabled: false }));

    expect(result.current.shortcuts).toBeDefined();
  });

  it('should accept onSave callback', () => {
    const onSave = jest.fn();
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts({ onSave }));

    expect(result.current.shortcuts).toBeDefined();
  });

  it('should have 10 shortcuts defined', () => {
    const { result } = renderHook(() => useWorkflowKeyboardShortcuts());

    expect(result.current.shortcuts).toHaveLength(10);
  });
});
