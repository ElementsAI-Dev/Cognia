/**
 * Tests for useDbStats hook
 */

import { renderHook } from '@testing-library/react';
import { useDbStats, type DbStats } from './use-db-stats';

jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn((_queryFn, _deps, defaultValue) => defaultValue),
}));

jest.mock('@/lib/db', () => ({
  db: {
    sessions: { count: jest.fn().mockResolvedValue(0) },
    messages: { count: jest.fn().mockResolvedValue(0) },
    projects: { count: jest.fn().mockResolvedValue(0) },
    documents: { count: jest.fn().mockResolvedValue(0) },
    workflows: { count: jest.fn().mockResolvedValue(0) },
    agentTraces: { count: jest.fn().mockResolvedValue(0) },
  },
}));

const DEFAULT_STATS: DbStats = {
  sessions: 0,
  messages: 0,
  projects: 0,
  documents: 0,
  workflows: 0,
  agentTraces: 0,
};

describe('useDbStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns default stats initially', () => {
    const { result } = renderHook(() => useDbStats());
    expect(result.current).toEqual(DEFAULT_STATS);
  });

  it('calls useLiveQuery with correct parameters', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');
    renderHook(() => useDbStats());

    expect(useLiveQuery).toHaveBeenCalledWith(
      expect.any(Function),
      [],
      DEFAULT_STATS
    );
  });

  it('returns live stats when available', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');
    const liveStats: DbStats = {
      sessions: 5,
      messages: 100,
      projects: 3,
      documents: 20,
      workflows: 2,
      agentTraces: 50,
    };
    useLiveQuery.mockImplementation(() => liveStats);

    const { result } = renderHook(() => useDbStats());
    expect(result.current).toEqual(liveStats);
  });

  it('returns default stats when useLiveQuery returns null', () => {
    const { useLiveQuery } = jest.requireMock('dexie-react-hooks');
    useLiveQuery.mockImplementation(() => null);

    const { result } = renderHook(() => useDbStats());
    expect(result.current).toEqual(DEFAULT_STATS);
  });
});
