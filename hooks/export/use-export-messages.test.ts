/**
 * Tests for useExportMessages hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useExportMessages } from './use-export-messages';
import { messageRepository } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  messageRepository: {
    getBySessionId: jest.fn(),
  },
}));

const mockMessages = [
  { id: 'msg-1', role: 'user', content: 'Hello', sessionId: 'session-1' },
  { id: 'msg-2', role: 'assistant', content: 'Hi there', sessionId: 'session-1' },
];

describe('useExportMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (messageRepository.getBySessionId as jest.Mock).mockResolvedValue(mockMessages);
  });

  it('should not load messages when dialog is closed', () => {
    const { result } = renderHook(() => useExportMessages('session-1', false));

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(messageRepository.getBySessionId).not.toHaveBeenCalled();
  });

  it('should load messages when dialog opens', async () => {
    const { result } = renderHook(() => useExportMessages('session-1', true));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toEqual(mockMessages);
    expect(messageRepository.getBySessionId).toHaveBeenCalledWith('session-1');
  });

  it('should not reload when already loaded', async () => {
    const { result, rerender } = renderHook(
      ({ open }) => useExportMessages('session-1', open),
      { initialProps: { open: true } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(messageRepository.getBySessionId).toHaveBeenCalledTimes(1);

    // Re-render with same props
    rerender({ open: true });

    expect(messageRepository.getBySessionId).toHaveBeenCalledTimes(1);
  });

  it('should reset loaded state when dialog closes and reload on reopen', async () => {
    const { result, rerender } = renderHook(
      ({ open }) => useExportMessages('session-1', open),
      { initialProps: { open: true } }
    );

    await waitFor(() => {
      expect(result.current.messages).toEqual(mockMessages);
    });

    // Close dialog
    rerender({ open: false });

    // Reopen dialog
    rerender({ open: true });

    await waitFor(() => {
      expect(messageRepository.getBySessionId).toHaveBeenCalledTimes(2);
    });
  });

  it('should provide reload function', async () => {
    const { result } = renderHook(() => useExportMessages('session-1', true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updatedMessages = [...mockMessages, { id: 'msg-3', role: 'user', content: 'New', sessionId: 'session-1' }];
    (messageRepository.getBySessionId as jest.Mock).mockResolvedValue(updatedMessages);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual(updatedMessages);
    });
  });
});
