import { act, renderHook } from '@testing-library/react';
import { useSkillBootstrap, resetSkillBootstrapForTests } from './use-skill-bootstrap';
import { useSkillStore } from '@/stores/skills/skill-store';
import { useSkillSync, useSkillSyncAvailable } from './use-skill-sync';
import { useNativeSkills } from './use-native-skills';
import { getAllBuiltinSkills } from '@/lib/skills/builtin';

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

describe('useSkillBootstrap', () => {
  const mockImportBuiltinSkills = jest.fn();
  const mockSetBootstrapState = jest.fn();
  const mockSetSyncMetadata = jest.fn();
  const mockSyncFromNative = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetSkillBootstrapForTests();

    mockUseSkillStore.mockReturnValue({
      bootstrapState: 'idle',
      lastBootstrapAt: null,
      lastBootstrapError: null,
      importBuiltinSkills: mockImportBuiltinSkills,
      setBootstrapState: mockSetBootstrapState,
      setSyncMetadata: mockSetSyncMetadata,
    } as unknown as ReturnType<typeof useSkillStore>);

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

  it('runs deterministic bootstrap phases in native mode', async () => {
    const { result } = renderHook(() => useSkillBootstrap());

    await act(async () => {
      await result.current.runBootstrap({ loadBuiltinSkills: true });
    });

    expect(mockImportBuiltinSkills).toHaveBeenCalledTimes(1);
    expect(mockSyncFromNative).toHaveBeenCalledTimes(1);
    expect(mockSetBootstrapState).toHaveBeenCalledWith('syncing', null);
    expect(mockSetBootstrapState).toHaveBeenCalledWith('ready', null);
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

  it('runs follow-up reconcile when native snapshot appears after bootstrap', async () => {
    mockUseNativeSkills.mockReturnValue({
      installed: [],
    } as unknown as ReturnType<typeof useNativeSkills>);

    const { result, rerender } = renderHook(() => useSkillBootstrap());

    await act(async () => {
      await result.current.runBootstrap({ loadBuiltinSkills: true });
    });

    mockUseNativeSkills.mockReturnValue({
      installed: [
        { id: 'native-1', directory: 'skill-1' },
      ],
    } as unknown as ReturnType<typeof useNativeSkills>);

    rerender();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSyncFromNative).toHaveBeenCalledTimes(2);
  });
});
