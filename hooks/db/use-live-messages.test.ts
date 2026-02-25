/**
 * Tests for useLiveMessages and useLiveMessageCount hooks
 */

import { renderHook } from '@testing-library/react';
import { useLiveMessages, useLiveMessageCount } from './use-live-messages';

jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn((_queryFn, _deps, defaultValue) => defaultValue),
}));

jest.mock('@/lib/db', () => ({
  db: {
    messages: {
      where: jest.fn().mockReturnValue({
        equals: jest.fn().mockReturnValue({
          sortBy: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
        }),
      }),
    },
  },
}));

jest.mock('@/lib/db/repositories/message-repository', () => ({
  toUIMessage: jest.fn((msg: Record<string, unknown>) => ({
    id: msg.id,
    role: msg.role || 'user',
    content: msg.content || '',
  })),
}));

describe('useLiveMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when sessionId is null', () => {
    const { result } = renderHook(() => useLiveMessages(null));
    expect(result.current).toEqual([]);
  });

  it('returns empty array as default when sessionId is provided', () => {
    const { result } = renderHook(() => useLiveMessages('session-1'));
    expect(result.current).toEqual([]);
  });

  it('passes sessionId as dependency', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');
    renderHook(() => useLiveMessages('session-1'));

    expect(useLiveQuery).toHaveBeenCalledWith(
      expect.any(Function),
      ['session-1'],
      []
    );
  });

  it('re-renders when sessionId changes', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');

    const { rerender } = renderHook(
      ({ sessionId }) => useLiveMessages(sessionId),
      { initialProps: { sessionId: 'session-1' as string | null } }
    );

    rerender({ sessionId: 'session-2' });

    // Should have been called twice with different deps
    expect(useLiveQuery).toHaveBeenCalledTimes(2);
    expect(useLiveQuery).toHaveBeenLastCalledWith(
      expect.any(Function),
      ['session-2'],
      []
    );
  });

  it('maps DB messages through toUIMessage', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');
    const mockMessages = [
      { id: 'msg-1', sessionId: 'session-1', role: 'user', content: 'Hello', createdAt: new Date() },
      { id: 'msg-2', sessionId: 'session-1', role: 'assistant', content: 'Hi', createdAt: new Date() },
    ];
    useLiveQuery.mockImplementation(() => mockMessages);

    const { result } = renderHook(() => useLiveMessages('session-1'));
    expect(result.current).toHaveLength(2);
  });
});

describe('useLiveMessageCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 when sessionId is null', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');
    useLiveQuery.mockImplementation((_fn: unknown, _deps: unknown, defaultValue: unknown) => defaultValue);

    const { result } = renderHook(() => useLiveMessageCount(null));
    expect(result.current).toBe(0);
  });

  it('returns the live count value', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');
    useLiveQuery.mockImplementation(() => 15);

    const { result } = renderHook(() => useLiveMessageCount('session-1'));
    expect(result.current).toBe(15);
  });
});
