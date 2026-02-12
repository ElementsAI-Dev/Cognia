/**
 * Tests for useImageExport hook
 */

import { renderHook, act } from '@testing-library/react';
import { useImageExport } from './use-image-export';
import type { Session, UIMessage } from '@/types';

jest.mock('@/lib/export/image/image-export', () => ({
  downloadAsImage: jest.fn().mockResolvedValue(undefined),
  generateThumbnail: jest.fn().mockResolvedValue('data:image/png;base64,mock'),
  copyImageToClipboard: jest.fn().mockResolvedValue(true),
  estimateImageSize: jest.fn().mockReturnValue('~2.5 MB'),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockSession = {
  id: 'session-1',
  title: 'Test Session',
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Session;

const mockMessages = [
  { id: 'msg-1', role: 'user', content: 'Hello' },
  { id: 'msg-2', role: 'assistant', content: 'Hi there' },
] as unknown as UIMessage[];

const mockT = jest.fn((key: string) => key);

describe('useImageExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useImageExport(mockSession, mockMessages, false, mockT));

    expect(result.current.isExporting).toBe(false);
    expect(result.current.isCopying).toBe(false);
    expect(result.current.copied).toBe(false);
    expect(result.current.format).toBe('png');
    expect(result.current.theme).toBe('light');
    expect(result.current.scale).toBe(2);
    expect(result.current.quality).toBe(92);
    expect(result.current.includeHeader).toBe(true);
    expect(result.current.includeFooter).toBe(true);
    expect(result.current.showTimestamps).toBe(true);
    expect(result.current.showModel).toBe(true);
  });

  it('should allow changing format', () => {
    const { result } = renderHook(() => useImageExport(mockSession, mockMessages, false, mockT));

    act(() => {
      result.current.setFormat('jpg');
    });

    expect(result.current.format).toBe('jpg');
  });

  it('should allow changing theme', () => {
    const { result } = renderHook(() => useImageExport(mockSession, mockMessages, false, mockT));

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });

  it('should allow changing scale', () => {
    const { result } = renderHook(() => useImageExport(mockSession, mockMessages, false, mockT));

    act(() => {
      result.current.setScale(3);
    });

    expect(result.current.scale).toBe(3);
  });

  it('should allow changing quality', () => {
    const { result } = renderHook(() => useImageExport(mockSession, mockMessages, false, mockT));

    act(() => {
      result.current.setQuality(80);
    });

    expect(result.current.quality).toBe(80);
  });

  it('should toggle boolean options', () => {
    const { result } = renderHook(() => useImageExport(mockSession, mockMessages, false, mockT));

    act(() => {
      result.current.setIncludeHeader(false);
      result.current.setIncludeFooter(false);
      result.current.setShowTimestamps(false);
      result.current.setShowModel(false);
    });

    expect(result.current.includeHeader).toBe(false);
    expect(result.current.includeFooter).toBe(false);
    expect(result.current.showTimestamps).toBe(false);
    expect(result.current.showModel).toBe(false);
  });

  it('should provide estimated size', () => {
    const { result } = renderHook(() => useImageExport(mockSession, mockMessages, false, mockT));
    expect(result.current.estimatedSize).toBe('~2.5 MB');
  });

  it('should handle export', async () => {
    const { downloadAsImage } = jest.requireMock('@/lib/export/image/image-export');
    const { result } = renderHook(() => useImageExport(mockSession, mockMessages, false, mockT));

    await act(async () => {
      await result.current.handleExport();
    });

    expect(downloadAsImage).toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });

  it('should handle copy', async () => {
    const { copyImageToClipboard } = jest.requireMock('@/lib/export/image/image-export');
    const { result } = renderHook(() => useImageExport(mockSession, mockMessages, false, mockT));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(copyImageToClipboard).toHaveBeenCalled();
    expect(result.current.isCopying).toBe(false);
  });

  it('should not export with no messages', async () => {
    const { downloadAsImage } = jest.requireMock('@/lib/export/image/image-export');
    const { result } = renderHook(() => useImageExport(mockSession, [] as unknown as UIMessage[], false, mockT));

    await act(async () => {
      await result.current.handleExport();
    });

    expect(downloadAsImage).not.toHaveBeenCalled();
  });
});
