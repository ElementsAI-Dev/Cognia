import { act, renderHook } from '@testing-library/react';
import { useSkillBootstrap, resetSkillBootstrapForTests } from './use-skill-bootstrap';
import { useSkillStore } from '@/stores/skills/skill-store';
import { useSkillSync, useSkillSyncAvailable } from './use-skill-sync';
import { useNativeSkills } from './use-native-skills';
import { getAllBuiltinSkills } from '@/lib/skills/builtin';
import type { Skill } from '@/types/system/skill';

jest.mock('@/stores/skills/skill-store', () => ({
  useSkillStore: jest.fn(),
}));

jest.mock('./use-skill-sync', () => ({
  useSkillSync: jest.fn(),
  useSkillSyncAvailable: jest.fn(),
}));

jest.mock('./use-native-skills', () => ({
  useNativeSkills: jest.fn(),
}));

jest.mock('@/lib/skills/builtin', () => ({
  getAllBuiltinSkills: jest.fn(),
}));

const mockUseSkillStore = jest.mocked(useSkillStore);
const mockUseSkillSync = jest.mocked(useSkillSync);
const mockUseSkillSyncAvailable = jest.mocked(useSkillSyncAvailable);
const mockUseNativeSkills = jest.mocked(useNativeSkills);
const mockGetAllBuiltinSkills = jest.mocked(getAllBuiltinSkills);

function createSkill(id: string, name: string, overrides: Partial<Skill> = {}): Skill {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id,
    metadata: {
      name,
      description: `${name} description`,
    },
    content: `# ${name}`,
    rawContent: `---\nname: ${name}\n---\n# ${name}`,
    resources: [],
    status: 'enabled',
    source: 'custom',
    category: 'development',
    tags: [],
    createdAt: now,
    updatedAt: now,
    version: '1.0.0',
    ...overrides,
  };
}

describe('useSkillBootstrap', () => {
  const mockImportBuiltinSkills = jest.fn();
  const mockValidateSkill = jest.fn();
  const mockActivateSkill = jest.fn();
  const mockDeactivateSkill = jest.fn();
  const mockSetBootstrapState = jest.fn();
  const mockSetBootstrapPhase = jest.fn();
  const mockAppendBootstrapTelemetry = jest.fn();
  const mockSetLastActivationJournal = jest.fn();
  const mockSetSyncMetadata = jest.fn();
  const mockSyncFromNative = jest.fn();

  const storeSnapshot: { skills: Record<string, Skill> } = {
    skills: {
      a: createSkill('a', 'alpha', { tags: ['auto-activate'] }),
      b: createSkill('b', 'beta', {
        rawContent: '---\nname: beta\ndependencies:\n  - alpha\n---\n# beta',
        tags: ['auto-activate'],
      }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetSkillBootstrapForTests();

    storeSnapshot.skills = {
      a: createSkill('a', 'alpha', { tags: ['auto-activate'] }),
      b: createSkill('b', 'beta', {
        rawContent: '---\nname: beta\ndependencies:\n  - alpha\n---\n# beta',
        tags: ['auto-activate'],
      }),
    };

    mockImportBuiltinSkills.mockImplementation((builtinSkills: Array<{ name: string }>) => {
      for (const builtin of builtinSkills) {
        const id = `builtin-${builtin.name}`;
        storeSnapshot.skills[id] = createSkill(id, builtin.name, {
          source: 'builtin',
          tags: ['auto-activate'],
        });
      }
    });
    mockValidateSkill.mockReturnValue([]);

    mockUseSkillStore.mockImplementation(() => ({
      bootstrapState: 'idle',
      bootstrapPhase: 'idle',
      bootstrapPhaseStatus: 'idle',
      bootstrapTelemetry: [],
      bootstrapFailureSeverity: null,
      lastActivationJournal: null,
      lastBootstrapAt: null,
      lastBootstrapError: null,
      importBuiltinSkills: mockImportBuiltinSkills,
      validateSkill: mockValidateSkill,
      activateSkill: mockActivateSkill,
      deactivateSkill: mockDeactivateSkill,
      setBootstrapState: mockSetBootstrapState,
      setBootstrapPhase: mockSetBootstrapPhase,
      appendBootstrapTelemetry: mockAppendBootstrapTelemetry,
      setLastActivationJournal: mockSetLastActivationJournal,
      setSyncMetadata: mockSetSyncMetadata,
      skills: storeSnapshot.skills,
    } as unknown as ReturnType<typeof useSkillStore>));

    (mockUseSkillStore as unknown as { getState: () => unknown }).getState = () => storeSnapshot;

    mockUseSkillSync.mockReturnValue({
      syncFromNative: mockSyncFromNative,
    } as unknown as ReturnType<typeof useSkillSync>);

    mockUseSkillSyncAvailable.mockReturnValue(true);
    mockUseNativeSkills.mockReturnValue({
      installed: [],
    } as unknown as ReturnType<typeof useNativeSkills>);
    mockGetAllBuiltinSkills.mockReturnValue([
      { name: 'builtin-1', description: 'desc', content: 'content' },
    ] as unknown as ReturnType<typeof getAllBuiltinSkills>);
  });

  it('runs full lifecycle and only publishes ready after verify', async () => {
    const { result } = renderHook(() => useSkillBootstrap());

    await act(async () => {
      await result.current.runBootstrap({ loadBuiltinSkills: true });
    });

    expect(mockSetBootstrapPhase).toHaveBeenCalledWith('verify', 'success', expect.any(Object));
    expect(mockSetBootstrapPhase).toHaveBeenCalledWith('ready', 'success', expect.any(Object));
    expect(mockSetBootstrapState).toHaveBeenLastCalledWith('ready', null);
    expect(mockSetLastActivationJournal).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'committed' })
    );
  });

  it('skips native reconciliation in non-native mode', async () => {
    mockUseSkillSyncAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useSkillBootstrap());

    await act(async () => {
      await result.current.runBootstrap({ loadBuiltinSkills: true });
    });

    expect(mockImportBuiltinSkills).toHaveBeenCalledTimes(1);
    expect(mockSyncFromNative).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent bootstrap calls', async () => {
    const { result } = renderHook(() => useSkillBootstrap());

    await act(async () => {
      await Promise.all([
        result.current.runBootstrap({ loadBuiltinSkills: true }),
        result.current.runBootstrap({ loadBuiltinSkills: true }),
      ]);
    });

    expect(mockImportBuiltinSkills).toHaveBeenCalledTimes(1);
  });

  it('transitions to failed state when validation fails', async () => {
    mockValidateSkill.mockImplementation((skill: Skill) => {
      if (skill.id === 'b') {
        return [{ field: 'content', message: 'invalid', severity: 'error' }];
      }
      return [];
    });

    const { result } = renderHook(() => useSkillBootstrap());

    await act(async () => {
      await expect(result.current.runBootstrap({ loadBuiltinSkills: false })).rejects.toThrow(
        'Skill validation failed'
      );
    });

    expect(mockSetBootstrapState).toHaveBeenCalledWith('error', 'i18n:syncBootstrapFailed');
    expect(mockSetBootstrapPhase).toHaveBeenCalledWith(
      'failed',
      'error',
      expect.objectContaining({
        errorSeverity: 'hard',
      })
    );
  });

  it('runs follow-up reconcile when native snapshot appears after bootstrap', async () => {
    mockUseNativeSkills.mockReturnValue({
      installed: [],
    } as unknown as ReturnType<typeof useNativeSkills>);

    const { result, rerender } = renderHook(() => useSkillBootstrap());

    await act(async () => {
      await result.current.runBootstrap({ loadBuiltinSkills: true });
    });

    mockUseNativeSkills.mockReturnValue({
      installed: [{ id: 'native-1', directory: 'skill-1' }],
    } as unknown as ReturnType<typeof useNativeSkills>);

    rerender();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSyncFromNative).toHaveBeenCalledTimes(2);
  });
});
