import { act, renderHook } from '@testing-library/react';
import { useSkillActions } from './use-skill-actions';
import { useSkillStore } from '@/stores/skills';
import { useNativeSkills } from './use-native-skills';
import { useSkillSync, useSkillSyncAvailable } from './use-skill-sync';
import type { Skill } from '@/types/system/skill';
import type { SkillActionOutcome } from '@/lib/skills/skill-actions';

jest.mock('@/stores/skills', () => ({
  useSkillStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => ({ skills: {} })),
  }),
}));

jest.mock('./use-native-skills', () => ({
  useNativeSkills: jest.fn(),
}));

jest.mock('./use-skill-sync', () => ({
  useSkillSync: jest.fn(),
  useSkillSyncAvailable: jest.fn(),
}));

const mockUseSkillStore = jest.mocked(useSkillStore);
const mockUseNativeSkills = jest.mocked(useNativeSkills);
const mockUseSkillSync = jest.mocked(useSkillSync);
const mockUseSkillSyncAvailable = jest.mocked(useSkillSyncAvailable);

function createSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'skill-1',
    metadata: { name: 'skill-1', description: 'desc' },
    content: 'content',
    rawContent: '---\nname: skill-1\ndescription: desc\n---\ncontent',
    resources: [],
    status: 'enabled',
    source: 'custom',
    category: 'custom',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('useSkillActions', () => {
  const mockCreateSkill = jest.fn();
  const mockUpdateSkill = jest.fn();
  const mockDeleteSkill = jest.fn();
  const mockEnableSkill = jest.fn();
  const mockDisableSkill = jest.fn();
  const mockActivateSkill = jest.fn();
  const mockDeactivateSkill = jest.fn();
  const mockSetSyncMetadata = jest.fn();
  const mockEnableNative = jest.fn();
  const mockDisableNative = jest.fn();
  const mockWriteContent = jest.fn();
  const mockInstallFromRepo = jest.fn();
  const mockUninstallNativeSkill = jest.fn();
  const mockSyncFromNative = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSkillStore.mockReturnValue({
      createSkill: mockCreateSkill,
      updateSkill: mockUpdateSkill,
      deleteSkill: mockDeleteSkill,
      enableSkill: mockEnableSkill,
      disableSkill: mockDisableSkill,
      activateSkill: mockActivateSkill,
      deactivateSkill: mockDeactivateSkill,
      setSyncMetadata: mockSetSyncMetadata,
    } as unknown as ReturnType<typeof useSkillStore>);

    (useSkillStore.getState as unknown as jest.Mock).mockReturnValue({
      skills: {
        'skill-1': createSkill(),
      },
    });

    mockUseNativeSkills.mockReturnValue({
      enable: mockEnableNative,
      disable: mockDisableNative,
      writeContent: mockWriteContent,
    } as unknown as ReturnType<typeof useNativeSkills>);

    mockUseSkillSync.mockReturnValue({
      installFromRepo: mockInstallFromRepo,
      uninstallNativeSkill: mockUninstallNativeSkill,
      syncFromNative: mockSyncFromNative,
    } as unknown as ReturnType<typeof useSkillSync>);

    mockUseSkillSyncAvailable.mockReturnValue(false);
  });

  it('routes toggle enabled to frontend actions in web mode', async () => {
    const skill = createSkill({ status: 'disabled' });
    const { result } = renderHook(() => useSkillActions());

    await act(async () => {
      await result.current.toggleSkillEnabled(skill);
    });

    expect(mockEnableNative).not.toHaveBeenCalled();
    expect(mockEnableSkill).toHaveBeenCalledWith('skill-1');
  });

  it('routes toggle enabled to native actions for native-managed skill in desktop mode', async () => {
    mockUseSkillSyncAvailable.mockReturnValue(true);
    const skill = createSkill({
      source: 'imported',
      syncOrigin: 'native',
      nativeSkillId: 'native-1',
      status: 'disabled',
    });
    const { result } = renderHook(() => useSkillActions());

    await act(async () => {
      await result.current.toggleSkillEnabled(skill);
    });

    expect(mockEnableNative).toHaveBeenCalledWith('native-1');
    expect(mockEnableSkill).toHaveBeenCalledWith('skill-1');
  });

  it('returns failure outcome when discovery install does not create frontend skill', async () => {
    mockInstallFromRepo.mockResolvedValue(null);
    const { result } = renderHook(() => useSkillActions());

    let outcome: SkillActionOutcome<Skill> | undefined;
    await act(async () => {
      outcome = await result.current.installDiscoveredSkill({
        key: 'repo/skill',
        name: 'skill',
        description: 'desc',
        directory: 'skill',
        readmeUrl: null,
        repoOwner: 'repo',
        repoName: 'skills',
        repoBranch: 'main',
      });
    });

    expect(outcome?.outcome).toBe('failure');
    expect(outcome?.error).toBe('i18n:installFailed');
  });

  it('marks update content as partial when native write fails', async () => {
    mockUseSkillSyncAvailable.mockReturnValue(true);
    mockWriteContent.mockRejectedValue(new Error('write failed'));
    const skill = createSkill({
      source: 'imported',
      syncOrigin: 'native',
      nativeDirectory: 'skill-1',
      nativeSkillId: 'native-1',
    });
    const { result } = renderHook(() => useSkillActions());

    let outcome: SkillActionOutcome<Skill> | undefined;
    await act(async () => {
      outcome = await result.current.updateSkillContent(
        skill,
        'new content'
      );
    });

    expect(outcome?.outcome).toBe('partial');
    expect(outcome?.error).toBe('i18n:syncToNativeFailed');
  });
});
