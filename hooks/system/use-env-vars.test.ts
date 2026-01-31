import { renderHook, act } from '@testing-library/react';
import { useEnvVars } from './use-env-vars';

// Mock lib/native/environment
jest.mock('@/lib/native/environment', () => ({
  listEnvVars: jest.fn().mockResolvedValue([]),
  upsertEnvVar: jest.fn().mockResolvedValue({
    key: 'TEST_KEY',
    value: 'test_value',
    category: 'other',
    isSecret: false,
    updatedAt: '2025-01-01T00:00:00Z',
  }),
  deleteEnvVar: jest.fn().mockResolvedValue(true),
  importEnvFile: jest.fn().mockResolvedValue([]),
  exportEnvFile: jest.fn().mockResolvedValue('TEST_KEY=test_value'),
}));

// Mock lib/utils
jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn().mockReturnValue(true),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('useEnvVars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useEnvVars());

    expect(result.current.envVars).toEqual([]);
    expect(result.current.filteredEnvVars).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.categoryFilter).toBe('all');
  });

  it('sets search query', () => {
    const { result } = renderHook(() => useEnvVars());

    act(() => {
      result.current.setSearchQuery('test');
    });

    expect(result.current.searchQuery).toBe('test');
  });

  it('sets category filter', () => {
    const { result } = renderHook(() => useEnvVars());

    act(() => {
      result.current.setCategoryFilter('api_keys');
    });

    expect(result.current.categoryFilter).toBe('api_keys');
  });

  it('clears filters', () => {
    const { result } = renderHook(() => useEnvVars());

    act(() => {
      result.current.setSearchQuery('test');
      result.current.setCategoryFilter('api_keys');
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.categoryFilter).toBe('all');
  });

  it('clears error', () => {
    const { result } = renderHook(() => useEnvVars());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });
});
