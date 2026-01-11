/**
 * Tests for SkillProvider
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { SkillProvider, useInitializeSkills, initializeSkillsSync } from './skill-provider';
import { useSkillStore } from '@/stores/skills';
import * as builtinSkills from '@/lib/skills/builtin';

// Mock the skill store
jest.mock('@/stores/skills', () => ({
  useSkillStore: Object.assign(
    jest.fn(() => ({
      importBuiltinSkills: jest.fn(),
      createSkill: jest.fn(),
      skills: {},
      reset: jest.fn(),
    })),
    {
      getState: jest.fn(() => ({
        skills: {},
        importBuiltinSkills: jest.fn(),
        createSkill: jest.fn(),
        reset: jest.fn(),
      })),
    }
  ),
}));

// Mock builtin skills
jest.mock('@/lib/skills/builtin', () => ({
  getAllBuiltinSkills: jest.fn(() => [
    { id: 'skill1', name: 'Skill 1', description: 'Test skill 1' },
    { id: 'skill2', name: 'Skill 2', description: 'Test skill 2' },
  ]),
}));

const mockUseSkillStore = useSkillStore as jest.MockedFunction<typeof useSkillStore>;
const mockGetAllBuiltinSkills = builtinSkills.getAllBuiltinSkills as jest.Mock;

describe('SkillProvider', () => {
  const mockImportBuiltinSkills = jest.fn();
  const mockCreateSkill = jest.fn();
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSkillStore.mockReturnValue({
      importBuiltinSkills: mockImportBuiltinSkills,
      createSkill: mockCreateSkill,
      skills: {},
      reset: mockReset,
    } as unknown as ReturnType<typeof useSkillStore>);

    (useSkillStore.getState as jest.Mock).mockReturnValue({
      skills: {},
      importBuiltinSkills: mockImportBuiltinSkills,
      createSkill: mockCreateSkill,
      reset: mockReset,
    });

    // Suppress console.log
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders children', () => {
      render(
        <SkillProvider>
          <div>Child content</div>
        </SkillProvider>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });
  });

  describe('loading built-in skills', () => {
    it('loads built-in skills by default when no skills exist', async () => {
      render(
        <SkillProvider>
          <div>Test</div>
        </SkillProvider>
      );

      await waitFor(() => {
        expect(mockGetAllBuiltinSkills).toHaveBeenCalled();
        expect(mockImportBuiltinSkills).toHaveBeenCalled();
      });
    });

    it('does not load built-in skills when loadBuiltinSkills is false', async () => {
      render(
        <SkillProvider loadBuiltinSkills={false}>
          <div>Test</div>
        </SkillProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      expect(mockGetAllBuiltinSkills).not.toHaveBeenCalled();
    });

    it('does not reload skills when skills already exist', async () => {
      (useSkillStore.getState as jest.Mock).mockReturnValue({
        skills: { skill1: { id: 'skill1' } },
        importBuiltinSkills: mockImportBuiltinSkills,
        createSkill: mockCreateSkill,
        reset: mockReset,
      });

      render(
        <SkillProvider>
          <div>Test</div>
        </SkillProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      expect(mockImportBuiltinSkills).not.toHaveBeenCalled();
    });
  });

  describe('loading custom skills', () => {
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

    it('loads multiple custom skills', async () => {
      const customSkills = [
        { name: 'Custom 1', description: 'Custom skill 1', content: 'test1' },
        { name: 'Custom 2', description: 'Custom skill 2', content: 'test2' },
      ];

      render(
        <SkillProvider customSkills={customSkills}>
          <div>Test</div>
        </SkillProvider>
      );

      await waitFor(() => {
        expect(mockCreateSkill).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('onInitialized callback', () => {
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
  });

  describe('initialization guard', () => {
    it('only initializes once', async () => {
      const { rerender } = render(
        <SkillProvider>
          <div>Test</div>
        </SkillProvider>
      );

      await waitFor(() => {
        expect(mockImportBuiltinSkills).toHaveBeenCalledTimes(1);
      });

      rerender(
        <SkillProvider>
          <div>Test Updated</div>
        </SkillProvider>
      );

      // Should still be 1
      expect(mockImportBuiltinSkills).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useInitializeSkills hook', () => {
  const mockImportBuiltinSkills = jest.fn();
  const mockCreateSkill = jest.fn();
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSkillStore.mockReturnValue({
      importBuiltinSkills: mockImportBuiltinSkills,
      createSkill: mockCreateSkill,
      skills: {},
      reset: mockReset,
    } as unknown as ReturnType<typeof useSkillStore>);

    (useSkillStore.getState as jest.Mock).mockReturnValue({
      skills: {},
      importBuiltinSkills: mockImportBuiltinSkills,
      createSkill: mockCreateSkill,
      reset: mockReset,
    });

    jest.spyOn(console, 'log').mockImplementation(() => {});
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
      importBuiltinSkills: mockImportBuiltinSkills,
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

    expect(mockImportBuiltinSkills).toHaveBeenCalled();
    expect(count).toBe(2); // From mock
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
