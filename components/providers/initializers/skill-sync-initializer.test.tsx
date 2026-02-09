'use client';

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { SkillSyncInitializer } from './skill-sync-initializer';

jest.mock('@/hooks/skills', () => ({
  useSkillSync: jest.fn(() => ({
    syncFromNative: jest.fn(),
    syncToNative: jest.fn(),
  })),
  useSkillSyncAvailable: jest.fn(),
}));

import { useSkillSync, useSkillSyncAvailable } from '@/hooks/skills';

const mockUseSkillSync = useSkillSync as jest.MockedFunction<typeof useSkillSync>;
const mockUseSkillSyncAvailable = useSkillSyncAvailable as jest.MockedFunction<typeof useSkillSyncAvailable>;

describe('SkillSyncInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null', () => {
    mockUseSkillSyncAvailable.mockReturnValue(false);
    const { container } = render(<SkillSyncInitializer />);
    expect(container.firstChild).toBeNull();
  });

  it('does not sync when native unavailable', () => {
    const syncFromNative = jest.fn();
    const syncToNative = jest.fn();
    mockUseSkillSyncAvailable.mockReturnValue(false);
    mockUseSkillSync.mockReturnValue({ syncFromNative, syncToNative } as unknown as ReturnType<typeof useSkillSync>);

    render(<SkillSyncInitializer />);

    expect(syncFromNative).not.toHaveBeenCalled();
    expect(syncToNative).not.toHaveBeenCalled();
  });

  it('syncs from native then to native on mount', () => {
    const syncFromNative = jest.fn().mockResolvedValue(undefined);
    const syncToNative = jest.fn().mockResolvedValue(undefined);
    mockUseSkillSyncAvailable.mockReturnValue(true);
    mockUseSkillSync.mockReturnValue({ syncFromNative, syncToNative } as unknown as ReturnType<typeof useSkillSync>);

    render(<SkillSyncInitializer />);

    return waitFor(() => {
      expect(syncFromNative).toHaveBeenCalledTimes(1);
      expect(syncToNative).toHaveBeenCalledTimes(1);
    });
  });
});
