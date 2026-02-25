/**
 * Tests for useLiveSessions and useLiveSessionCount hooks
 */

import { renderHook } from '@testing-library/react';
import { useLiveSessions, useLiveSessionCount } from './use-live-sessions';

const mockDbSessions = [
  {
    id: 'session-1',
    title: 'Test Session 1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    messageCount: 5,
    isStarred: false,
  },
  {
    id: 'session-2',
    title: 'Test Session 2',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-04'),
    messageCount: 10,
    isStarred: true,
  },
];

jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn((_queryFn, _deps, defaultValue) => defaultValue),
}));

jest.mock('@/lib/db', () => ({
  db: {
    sessions: {
      orderBy: jest.fn().mockReturnValue({
        reverse: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
      }),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

jest.mock('@/lib/db/repositories/session-repository', () => ({
  dbSessionToSession: jest.fn((dbSession: Record<string, unknown>) => ({
    id: dbSession.id,
    title: dbSession.title || 'Untitled',
    createdAt: dbSession.createdAt,
    updatedAt: dbSession.updatedAt,
  })),
}));

describe('useLiveSessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array as default', () => {
    const { result } = renderHook(() => useLiveSessions());
    expect(result.current).toEqual([]);
  });

  it('calls useLiveQuery with correct parameters', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');
    renderHook(() => useLiveSessions());

    expect(useLiveQuery).toHaveBeenCalledWith(
      expect.any(Function),
      [],
      []
    );
  });

  it('maps DB sessions through dbSessionToSession', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');
    useLiveQuery.mockImplementation((_fn: unknown, _deps: unknown) => mockDbSessions);

    const { result } = renderHook(() => useLiveSessions());
    expect(result.current).toHaveLength(2);
  });
});

describe('useLiveSessionCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 as default', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');
    useLiveQuery.mockImplementation((_fn: unknown, _deps: unknown, defaultValue: unknown) => defaultValue);

    const { result } = renderHook(() => useLiveSessionCount());
    expect(result.current).toBe(0);
  });

  it('returns the live count value', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');
    useLiveQuery.mockImplementation(() => 42);

    const { result } = renderHook(() => useLiveSessionCount());
    expect(result.current).toBe(42);
  });
});
