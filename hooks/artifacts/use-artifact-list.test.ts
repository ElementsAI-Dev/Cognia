/**
 * Tests for useArtifactList hook
 */

import { renderHook, act } from '@testing-library/react';
import { useArtifactList } from './use-artifact-list';

// Mock stores
const mockArtifacts: Record<string, unknown> = {};
const mockGetSessionArtifacts = jest.fn().mockReturnValue([]);
const mockSearchArtifacts = jest.fn().mockReturnValue([]);
const mockFilterArtifactsByType = jest.fn().mockReturnValue([]);
const mockSetActiveArtifact = jest.fn();
const mockDeleteArtifact = jest.fn();
const mockDeleteArtifacts = jest.fn();
const mockOpenPanel = jest.fn();
const mockGetActiveSession = jest.fn().mockReturnValue({ id: 'session-1' });

jest.mock('@/stores', () => ({
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activeArtifactId: null,
      artifacts: mockArtifacts,
      setActiveArtifact: mockSetActiveArtifact,
      deleteArtifact: mockDeleteArtifact,
      deleteArtifacts: mockDeleteArtifacts,
      openPanel: mockOpenPanel,
      getSessionArtifacts: mockGetSessionArtifacts,
      searchArtifacts: mockSearchArtifacts,
      filterArtifactsByType: mockFilterArtifactsByType,
    }),
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      getActiveSession: mockGetActiveSession,
    }),
}));

const makeArtifact = (id: string) => ({
  id,
  sessionId: 'session-1',
  messageId: 'msg-1',
  type: 'code' as const,
  title: `Artifact ${id}`,
  content: 'const x = 1;',
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('useArtifactList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSessionArtifacts.mockReturnValue([]);
    mockSearchArtifacts.mockReturnValue([]);
    mockFilterArtifactsByType.mockReturnValue([]);
    mockGetActiveSession.mockReturnValue({ id: 'session-1' });
  });

  it('should return empty artifacts initially', () => {
    const { result } = renderHook(() => useArtifactList({}));
    expect(result.current.sessionArtifacts).toEqual([]);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.typeFilter).toBe('all');
    expect(result.current.batchMode).toBe(false);
  });

  it('should call getSessionArtifacts with active session id', () => {
    renderHook(() => useArtifactList({}));
    expect(mockGetSessionArtifacts).toHaveBeenCalledWith('session-1');
  });

  it('should use provided sessionId over active session', () => {
    renderHook(() => useArtifactList({ sessionId: 'custom-session' }));
    expect(mockGetSessionArtifacts).toHaveBeenCalledWith('custom-session');
  });

  it('should update search query', () => {
    const { result } = renderHook(() => useArtifactList({}));
    act(() => { result.current.setSearchQuery('hello'); });
    expect(result.current.searchQuery).toBe('hello');
  });

  it('should update type filter', () => {
    const { result } = renderHook(() => useArtifactList({}));
    act(() => { result.current.setTypeFilter('code'); });
    expect(result.current.typeFilter).toBe('code');
  });

  it('should handle artifact click - set active and open panel', () => {
    const onArtifactClick = jest.fn();
    const { result } = renderHook(() => useArtifactList({ onArtifactClick }));
    const artifact = makeArtifact('a1');

    act(() => { result.current.handleArtifactClick(artifact); });
    expect(mockSetActiveArtifact).toHaveBeenCalledWith('a1');
    expect(mockOpenPanel).toHaveBeenCalledWith('artifact');
    expect(onArtifactClick).toHaveBeenCalledWith(artifact);
  });

  it('should toggle batch mode', () => {
    const { result } = renderHook(() => useArtifactList({}));
    expect(result.current.batchMode).toBe(false);

    act(() => { result.current.toggleBatchMode(); });
    expect(result.current.batchMode).toBe(true);

    act(() => { result.current.toggleBatchMode(); });
    expect(result.current.batchMode).toBe(false);
  });

  it('should select artifacts in batch mode', () => {
    const { result } = renderHook(() => useArtifactList({}));
    const artifact = makeArtifact('a1');

    // Enable batch mode
    act(() => { result.current.toggleBatchMode(); });

    // Click artifact in batch mode should toggle selection
    act(() => { result.current.handleArtifactClick(artifact); });
    expect(result.current.selectedIds.has('a1')).toBe(true);
    expect(mockSetActiveArtifact).not.toHaveBeenCalled();

    // Click again to deselect
    act(() => { result.current.handleArtifactClick(artifact); });
    expect(result.current.selectedIds.has('a1')).toBe(false);
  });

  it('should set pending delete on handleDelete', () => {
    const { result } = renderHook(() => useArtifactList({}));
    const mockEvent = { stopPropagation: jest.fn() } as unknown as React.MouseEvent;

    act(() => { result.current.handleDelete('a1', mockEvent); });
    expect(result.current.pendingDelete).toBe('a1');
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should confirm single delete', () => {
    const { result } = renderHook(() => useArtifactList({}));
    const mockEvent = { stopPropagation: jest.fn() } as unknown as React.MouseEvent;

    act(() => { result.current.handleDelete('a1', mockEvent); });
    act(() => { result.current.confirmDelete(); });
    expect(mockDeleteArtifact).toHaveBeenCalledWith('a1');
    expect(result.current.pendingDelete).toBeNull();
  });

  it('should handle batch delete', () => {
    const { result } = renderHook(() => useArtifactList({}));
    const a1 = makeArtifact('a1');
    const a2 = makeArtifact('a2');

    // Enter batch mode and select
    act(() => { result.current.toggleBatchMode(); });
    act(() => { result.current.handleArtifactClick(a1); });
    act(() => { result.current.handleArtifactClick(a2); });

    // Trigger batch delete
    act(() => { result.current.handleBatchDelete(); });
    expect(result.current.pendingDelete).toEqual(['a1', 'a2']);

    // Confirm batch delete
    act(() => { result.current.confirmDelete(); });
    expect(mockDeleteArtifacts).toHaveBeenCalledWith(['a1', 'a2']);
    expect(result.current.batchMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('should not batch delete when no items selected', () => {
    const { result } = renderHook(() => useArtifactList({}));
    act(() => { result.current.handleBatchDelete(); });
    expect(result.current.pendingDelete).toBeNull();
  });

  it('should cancel pending delete', () => {
    const { result } = renderHook(() => useArtifactList({}));
    const mockEvent = { stopPropagation: jest.fn() } as unknown as React.MouseEvent;

    act(() => { result.current.handleDelete('a1', mockEvent); });
    expect(result.current.pendingDelete).toBe('a1');

    act(() => { result.current.setPendingDelete(null); });
    expect(result.current.pendingDelete).toBeNull();
  });
});
