/**
 * Tests for useMessages hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMessages } from './use-messages';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-123'),
}));

// Mock message repository
const mockGetBySessionIdAndBranch = jest.fn();
const mockCreateWithBranch = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockDeleteBySessionId = jest.fn();
const mockCopyMessagesForBranch = jest.fn();

jest.mock('@/lib/db', () => ({
  messageRepository: {
    getBySessionIdAndBranch: (...args: unknown[]) => mockGetBySessionIdAndBranch(...args),
    createWithBranch: (...args: unknown[]) => mockCreateWithBranch(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    deleteBySessionId: (...args: unknown[]) => mockDeleteBySessionId(...args),
    copyMessagesForBranch: (...args: unknown[]) => mockCopyMessagesForBranch(...args),
  },
}));

describe('useMessages', () => {
  const mockMessages = [
    {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Hello',
      createdAt: new Date('2024-01-15T10:00:00'),
    },
    {
      id: 'msg-2',
      role: 'assistant' as const,
      content: 'Hi there!',
      createdAt: new Date('2024-01-15T10:00:01'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBySessionIdAndBranch.mockResolvedValue([]);
  });

  describe('initialization', () => {
    it('should initialize with empty messages when no sessionId', async () => {
      const { result } = renderHook(() => useMessages({ sessionId: null }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should load messages when sessionId is provided', async () => {
      mockGetBySessionIdAndBranch.mockResolvedValueOnce(mockMessages);

      const { result } = renderHook(() => useMessages({ sessionId: 'session-1' }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockGetBySessionIdAndBranch).toHaveBeenCalledWith('session-1', undefined);
      expect(result.current.messages).toEqual(mockMessages);
    });

    it('should load messages with branchId', async () => {
      mockGetBySessionIdAndBranch.mockResolvedValueOnce(mockMessages);

      const { result } = renderHook(() => useMessages({ 
        sessionId: 'session-1',
        branchId: 'branch-1',
      }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockGetBySessionIdAndBranch).toHaveBeenCalledWith('session-1', 'branch-1');
    });

    it('should handle load errors', async () => {
      const onError = jest.fn();
      mockGetBySessionIdAndBranch.mockRejectedValueOnce(new Error('Load failed'));

      const { result } = renderHook(() => useMessages({ 
        sessionId: 'session-1',
        onError,
      }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('addMessage', () => {
    it('should add a new message', async () => {
      mockCreateWithBranch.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMessages({ sessionId: 'session-1' }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let newMessage;
      await act(async () => {
        newMessage = await result.current.addMessage({
          role: 'user',
          content: 'New message',
        });
      });

      expect(newMessage).toMatchObject({
        id: 'test-id-123',
        role: 'user',
        content: 'New message',
      });
      expect(result.current.messages).toHaveLength(1);
      expect(mockCreateWithBranch).toHaveBeenCalled();
    });

    it('should throw error when no sessionId', async () => {
      const { result } = renderHook(() => useMessages({ sessionId: null }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await expect(
        act(async () => {
          await result.current.addMessage({
            role: 'user',
            content: 'New message',
          });
        })
      ).rejects.toThrow('No session ID provided');
    });

    it('should revert on save error', async () => {
      mockCreateWithBranch.mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(() => useMessages({ sessionId: 'session-1' }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await expect(
        act(async () => {
          await result.current.addMessage({
            role: 'user',
            content: 'New message',
          });
        })
      ).rejects.toThrow('Save failed');

      expect(result.current.messages).toHaveLength(0);
    });
  });

  describe('updateMessage', () => {
    it('should update an existing message', async () => {
      mockGetBySessionIdAndBranch.mockResolvedValueOnce(mockMessages);
      mockUpdate.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMessages({ sessionId: 'session-1' }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.updateMessage('msg-1', { content: 'Updated content' });
      });

      expect(mockUpdate).toHaveBeenCalledWith('msg-1', { content: 'Updated content' });
      expect(result.current.messages[0].content).toBe('Updated content');
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      mockGetBySessionIdAndBranch.mockResolvedValueOnce(mockMessages);
      mockDelete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMessages({ sessionId: 'session-1' }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.deleteMessage('msg-1');
      });

      expect(mockDelete).toHaveBeenCalledWith('msg-1');
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].id).toBe('msg-2');
    });
  });

  describe('deleteMessagesAfter', () => {
    it('should delete messages after a specific message', async () => {
      const threeMessages = [
        ...mockMessages,
        { id: 'msg-3', role: 'user' as const, content: 'Third', createdAt: new Date() },
      ];
      mockGetBySessionIdAndBranch.mockResolvedValueOnce(threeMessages);
      mockDelete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMessages({ sessionId: 'session-1' }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.deleteMessagesAfter('msg-1');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].id).toBe('msg-1');
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages', async () => {
      mockGetBySessionIdAndBranch.mockResolvedValueOnce(mockMessages);
      mockDeleteBySessionId.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMessages({ sessionId: 'session-1' }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.clearMessages();
      });

      expect(mockDeleteBySessionId).toHaveBeenCalledWith('session-1');
      expect(result.current.messages).toEqual([]);
    });
  });

  describe('createStreamingMessage', () => {
    it('should create a streaming message', async () => {
      const { result } = renderHook(() => useMessages({ sessionId: 'session-1' }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let streamingMessage;
      act(() => {
        streamingMessage = result.current.createStreamingMessage('assistant');
      });

      expect(streamingMessage).toMatchObject({
        id: 'test-id-123',
        role: 'assistant',
        content: '',
      });
      expect(result.current.messages).toHaveLength(1);
    });
  });

  describe('appendToMessage', () => {
    it('should append content to a message', async () => {
      mockGetBySessionIdAndBranch.mockResolvedValueOnce([
        { id: 'msg-1', role: 'assistant', content: 'Hello', createdAt: new Date() },
      ]);

      const { result } = renderHook(() => useMessages({ sessionId: 'session-1' }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.appendToMessage('msg-1', ' World');
      });

      expect(result.current.messages[0].content).toBe('Hello World');
    });
  });

  describe('reloadMessages', () => {
    it('should reload messages from database', async () => {
      mockGetBySessionIdAndBranch
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockMessages);

      const { result } = renderHook(() => useMessages({ sessionId: 'session-1' }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.messages).toEqual([]);

      await act(async () => {
        await result.current.reloadMessages();
      });

      expect(result.current.messages).toEqual(mockMessages);
    });
  });

  describe('copyMessagesForBranch', () => {
    it('should copy messages for a new branch', async () => {
      const copiedMessages = [{ ...mockMessages[0], branchId: 'new-branch' }];
      mockCopyMessagesForBranch.mockResolvedValueOnce(copiedMessages);

      const { result } = renderHook(() => useMessages({ sessionId: 'session-1' }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let copied;
      await act(async () => {
        copied = await result.current.copyMessagesForBranch('msg-1', 'new-branch');
      });

      expect(copied).toEqual(copiedMessages);
      expect(mockCopyMessagesForBranch).toHaveBeenCalledWith(
        'session-1',
        'msg-1',
        'new-branch',
        undefined
      );
    });

    it('should throw error when no sessionId', async () => {
      const { result } = renderHook(() => useMessages({ sessionId: null }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await expect(
        act(async () => {
          await result.current.copyMessagesForBranch('msg-1', 'new-branch');
        })
      ).rejects.toThrow('No session ID provided');
    });
  });
});
