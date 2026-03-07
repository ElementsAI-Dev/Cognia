/**
 * Tests for SkillProvider
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { SkillProvider, useInitializeSkills, initializeSkillsSync } from './skill-provider';
import { useSkillStore } from '@/stores/skills';
import { useSkillBootstrap } from '@/hooks/skills/use-skill-bootstrap';
import * as builtinSkills from '@/lib/skills/builtin';

jest.mock('@/stores/skills', () => ({
  useSkillStore: Object.assign(
    jest.fn(() => ({
      createSkill: jest.fn(),
      importBuiltinSkills: jest.fn(),
      skills: {},
      reset: jest.fn(),
    })),
    {
      getState: jest.fn(() => ({
        skills: {},
        importBuiltinSkills: jest.fn(),
      })),
    }
  ),
}));

jest.mock('@/hooks/skills/use-skill-bootstrap', () => ({
  useSkillBootstrap: jest.fn(() => ({
    bootstrapState: 'idle',
    lastBootstrapAt: null,
    lastBootstrapError: null,
    runBootstrap: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/lib/skills/builtin', () => ({
  getAllBuiltinSkills: jest.fn(() => [
    { id: 'skill1', name: 'Skill 1', description: 'Test skill 1', content: 'content-1' },
    { id: 'skill2', name: 'Skill 2', description: 'Test skill 2', content: 'content-2' },
  ]),
}));

const mockUseSkillStore = useSkillStore as jest.MockedFunction<typeof useSkillStore>;
const mockUseSkillBootstrap = useSkillBootstrap as jest.MockedFunction<typeof useSkillBootstrap>;
const mockGetAllBuiltinSkills = builtinSkills.getAllBuiltinSkills as jest.Mock;

describe('SkillProvider', () => {
  const mockCreateSkill = jest.fn();
  const mockReset = jest.fn();
  const mockImportBuiltinSkills = jest.fn();
  const mockRunBootstrap = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSkillStore.mockReturnValue({
      createSkill: mockCreateSkill,
      importBuiltinSkills: mockImportBuiltinSkills,
      skills: {},
      reset: mockReset,
    } as unknown as ReturnType<typeof useSkillStore>);

    (useSkillStore.getState as jest.Mock).mockReturnValue({
      skills: {},
      importBuiltinSkills: mockImportBuiltinSkills,
    });

    mockUseSkillBootstrap.mockReturnValue({
      bootstrapState: 'idle',
      lastBootstrapAt: null,
      lastBootstrapError: null,
      runBootstrap: mockRunBootstrap,
    });
  });

  it('renders children', () => {
    render(
      <SkillProvider>
        <div>Child content</div>
      </SkillProvider>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('runs bootstrap with built-in loading by default', async () => {
    render(
      <SkillProvider>
        <div>Test</div>
      </SkillProvider>
    );

    await waitFor(() => {
      expect(mockRunBootstrap).toHaveBeenCalledWith({ loadBuiltinSkills: true });
    });
  });

  it('respects loadBuiltinSkills false', async () => {
    render(
      <SkillProvider loadBuiltinSkills={false}>
        <div>Test</div>
      </SkillProvider>
    );

    await waitFor(() => {
      expect(mockRunBootstrap).toHaveBeenCalledWith({ loadBuiltinSkills: false });
    });
  });

  it('loads custom skills when provided', async () => {
    const customSkills = [
      { name: 'Custom 1', description: 'Custom skill 1', content: 'test' },
    ];

    render(
      <SkillProvider customSkills={customSkills}>
        <div>Test</div>
      </SkillProvider>
    );

    await waitFor(() => {
      expect(mockCreateSkill).toHaveBeenCalledWith(customSkills[0]);
    });
  });

  it('calls onInitialized after initialization', async () => {
    const onInitialized = jest.fn();

    render(
      <SkillProvider onInitialized={onInitialized}>
        <div>Test</div>
      </SkillProvider>
    );

    await waitFor(() => {
      expect(onInitialized).toHaveBeenCalled();
    });
  });

  it('only initializes once', async () => {
    const { rerender } = render(
      <SkillProvider>
        <div>Test</div>
      </SkillProvider>
    );

    await waitFor(() => {
      expect(mockRunBootstrap).toHaveBeenCalledTimes(1);
    });

    rerender(
      <SkillProvider>
        <div>Test Updated</div>
      </SkillProvider>
    );

    expect(mockRunBootstrap).toHaveBeenCalledTimes(1);
  });
});

describe('useInitializeSkills hook', () => {
  const mockCreateSkill = jest.fn();
  const mockReset = jest.fn();
  const mockRunBootstrap = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSkillStore.mockReturnValue({
      createSkill: mockCreateSkill,
      skills: {},
      reset: mockReset,
    } as unknown as ReturnType<typeof useSkillStore>);

    mockUseSkillBootstrap.mockReturnValue({
      bootstrapState: 'idle',
      lastBootstrapAt: null,
      lastBootstrapError: null,
      runBootstrap: mockRunBootstrap,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );

  it('returns isInitialized state', async () => {
    const { result } = renderHook(() => useInitializeSkills(), { wrapper });

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });
  });

  it('returns skillCount', async () => {
    mockUseSkillStore.mockReturnValue({
      createSkill: mockCreateSkill,
      skills: { skill1: {}, skill2: {} },
      reset: mockReset,
    } as unknown as ReturnType<typeof useSkillStore>);

    const { result } = renderHook(() => useInitializeSkills(), { wrapper });

    await waitFor(() => {
      expect(result.current.skillCount).toBe(2);
    });
  });

  it('respects forceReload option', async () => {
    renderHook(
      () => useInitializeSkills({ forceReload: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
      expect(mockRunBootstrap).toHaveBeenCalledWith({
        loadBuiltinSkills: true,
        force: true,
      });
    });
  });

  it('loads custom skills', async () => {
    const customSkills = [
      { name: 'Custom', description: 'Test', content: 'test' },
    ];

    renderHook(
      () => useInitializeSkills({ customSkills }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockCreateSkill).toHaveBeenCalledWith(customSkills[0]);
    });
  });
});

describe('initializeSkillsSync function', () => {
  const mockImportBuiltinSkills = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useSkillStore.getState as jest.Mock).mockReturnValue({
      skills: {},
      importBuiltinSkills: mockImportBuiltinSkills,
    });
  });

  it('imports skills when no skills exist', () => {
    const count = initializeSkillsSync();

    expect(mockGetAllBuiltinSkills).toHaveBeenCalled();
    expect(mockImportBuiltinSkills).toHaveBeenCalled();
    expect(count).toBe(2);
  });

  it('returns existing count when skills exist', () => {
    (useSkillStore.getState as jest.Mock).mockReturnValue({
      skills: { skill1: {}, skill2: {}, skill3: {} },
      importBuiltinSkills: mockImportBuiltinSkills,
    });

    const count = initializeSkillsSync();

    expect(mockImportBuiltinSkills).not.toHaveBeenCalled();
    expect(count).toBe(3);
  });
});
