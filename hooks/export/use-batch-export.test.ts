/**
 * Tests for useBatchExport hook
 */

import { renderHook, act } from '@testing-library/react';
import { useBatchExport } from './use-batch-export';
import type { Session } from '@/types';

const mockSessions: Session[] = [
  { id: 's1', title: 'Session 1', createdAt: new Date(), updatedAt: new Date(), model: 'gpt-4', provider: 'openai' },
  { id: 's2', title: 'Session 2', createdAt: new Date(), updatedAt: new Date(), model: 'gpt-4', provider: 'openai' },
  { id: 's3', title: 'Session 3', createdAt: new Date(), updatedAt: new Date(), model: 'gpt-4', provider: 'openai' },
] as unknown as Session[];

jest.mock('@/stores', () => ({
  useSessionStore: jest.fn((selector: (state: { sessions: Session[] }) => unknown) =>
    selector({ sessions: mockSessions })
  ),
}));

jest.mock('@/lib/db', () => ({
  messageRepository: {
    getBySessionId: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/lib/export', () => ({
  exportSessionsToZip: jest.fn().mockResolvedValue({ success: true, blob: new Blob(), filename: 'export.zip' }),
  downloadZip: jest.fn(),
  estimateExportSize: jest.fn().mockReturnValue(1024),
  BatchExportFormat: {},
  SessionWithMessages: {},
}));

const mockT = jest.fn((key: string) => key);

describe('useBatchExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useBatchExport(mockT));

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.format).toBe('mixed');
    expect(result.current.isExporting).toBe(false);
  });

  it('should expose sessions from store', () => {
    const { result } = renderHook(() => useBatchExport(mockT));
    expect(result.current.sessions).toEqual(mockSessions);
  });

  it('should toggle session selection', () => {
    const { result } = renderHook(() => useBatchExport(mockT));

    act(() => {
      result.current.toggleSession('s1');
    });

    expect(result.current.selectedIds.has('s1')).toBe(true);

    act(() => {
      result.current.toggleSession('s1');
    });

    expect(result.current.selectedIds.has('s1')).toBe(false);
  });

  it('should select all sessions', () => {
    const { result } = renderHook(() => useBatchExport(mockT));

    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedIds.size).toBe(3);
    expect(result.current.selectedIds.has('s1')).toBe(true);
    expect(result.current.selectedIds.has('s2')).toBe(true);
    expect(result.current.selectedIds.has('s3')).toBe(true);
  });

  it('should deselect all sessions', () => {
    const { result } = renderHook(() => useBatchExport(mockT));

    act(() => {
      result.current.selectAll();
    });

    act(() => {
      result.current.selectNone();
    });

    expect(result.current.selectedIds.size).toBe(0);
  });

  it('should allow changing format', () => {
    const { result } = renderHook(() => useBatchExport(mockT));

    act(() => {
      result.current.setFormat('markdown' as never);
    });

    expect(result.current.format).toBe('markdown');
  });

  it('should not export with empty selection', async () => {
    const { result } = renderHook(() => useBatchExport(mockT));

    await act(async () => {
      await result.current.handleExport();
    });

    expect(result.current.isExporting).toBe(false);
  });
});
