'use client';

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { SkillSyncInitializer } from './skill-sync-initializer';

jest.mock('@/hooks/skills', () => ({
  useSkillBootstrap: jest.fn(() => ({
    runBootstrap: jest.fn(),
    bootstrapState: 'idle',
    lastBootstrapAt: null,
    lastBootstrapError: null,
  })),
}));

import { useSkillBootstrap } from '@/hooks/skills';

const mockUseSkillBootstrap = useSkillBootstrap as jest.MockedFunction<typeof useSkillBootstrap>;

describe('SkillSyncInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null', () => {
    const { container } = render(<SkillSyncInitializer />);
    expect(container.firstChild).toBeNull();
  });

  it('runs unified bootstrap on mount', async () => {
    const runBootstrap = jest.fn().mockResolvedValue(undefined);
    mockUseSkillBootstrap.mockReturnValue({
      runBootstrap,
      bootstrapState: 'idle',
      lastBootstrapAt: null,
      lastBootstrapError: null,
    });

    render(<SkillSyncInitializer />);

    await waitFor(() => {
      expect(runBootstrap).toHaveBeenCalledTimes(1);
      expect(runBootstrap).toHaveBeenCalledWith({
        loadBuiltinSkills: true,
      });
    });
  });

  it('initializes only once across rerenders', async () => {
    const runBootstrap = jest.fn().mockResolvedValue(undefined);
    mockUseSkillBootstrap.mockReturnValue({
      runBootstrap,
      bootstrapState: 'idle',
      lastBootstrapAt: null,
      lastBootstrapError: null,
    });

    const { rerender } = render(<SkillSyncInitializer />);
    rerender(<SkillSyncInitializer />);

    await waitFor(() => {
      expect(runBootstrap).toHaveBeenCalledTimes(1);
    });
  });
});
