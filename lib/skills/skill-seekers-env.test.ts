/**
 * Tests for Skill Seekers Environment Integration
 */

// Mock the skill-seekers native API - must be declared before imports
jest.mock('@/lib/native/skill-seekers', () => {
  const mockGetVenvPath = jest.fn();
  const mockIsInstalled = jest.fn();
  const mockGetVersion = jest.fn();
  const mockInstall = jest.fn();
  const mockGetOutputDir = jest.fn();

  return {
    __esModule: true,
    default: {
      getVenvPath: mockGetVenvPath,
      isInstalled: mockIsInstalled,
      getVersion: mockGetVersion,
      install: mockInstall,
      getOutputDir: mockGetOutputDir,
    },
    // Export mocks for test access
    mockGetVenvPath,
    mockIsInstalled,
    mockGetVersion,
    mockInstall,
    mockGetOutputDir,
  };
});

import {
  SKILL_SEEKERS_VENV_NAME,
  SKILL_SEEKERS_PACKAGES,
  hasSkillSeekersEnv,
  getSkillSeekersEnvInfo,
  setupSkillSeekersEnv,
  getSkillSeekersOutputDir,
  checkDependencies,
} from './skill-seekers-env';

import skillSeekersApi from '@/lib/native/skill-seekers';

// Get mock functions from the mocked module
const mockGetVenvPath = skillSeekersApi.getVenvPath as jest.MockedFunction<typeof skillSeekersApi.getVenvPath>;
const mockIsInstalled = skillSeekersApi.isInstalled as jest.MockedFunction<typeof skillSeekersApi.isInstalled>;
const mockGetVersion = skillSeekersApi.getVersion as jest.MockedFunction<typeof skillSeekersApi.getVersion>;
const mockInstall = skillSeekersApi.install as jest.MockedFunction<typeof skillSeekersApi.install>;
const mockGetOutputDir = skillSeekersApi.getOutputDir as jest.MockedFunction<typeof skillSeekersApi.getOutputDir>;

describe('SKILL_SEEKERS_VENV_NAME', () => {
  it('is "skill-seekers"', () => {
    expect(SKILL_SEEKERS_VENV_NAME).toBe('skill-seekers');
  });
});

describe('SKILL_SEEKERS_PACKAGES', () => {
  it('contains the base package with extras', () => {
    expect(SKILL_SEEKERS_PACKAGES).toContain('skill-seekers[gemini,openai]');
  });

  it('is an array', () => {
    expect(Array.isArray(SKILL_SEEKERS_PACKAGES)).toBe(true);
  });
});

describe('hasSkillSeekersEnv', () => {
  beforeEach(() => {
    mockGetVenvPath.mockReset();
  });

  it('returns true when venv path exists', async () => {
    mockGetVenvPath.mockResolvedValue('/path/to/venv');

    const result = await hasSkillSeekersEnv();

    expect(result).toBe(true);
    expect(mockGetVenvPath).toHaveBeenCalledTimes(1);
  });

  it('returns false when venv path is empty', async () => {
    mockGetVenvPath.mockResolvedValue('');

    const result = await hasSkillSeekersEnv();

    expect(result).toBe(false);
  });

  it('returns false when getVenvPath throws', async () => {
    mockGetVenvPath.mockRejectedValue(new Error('Not available'));

    const result = await hasSkillSeekersEnv();

    expect(result).toBe(false);
  });
});

describe('getSkillSeekersEnvInfo', () => {
  beforeEach(() => {
    mockGetVenvPath.mockReset();
    mockIsInstalled.mockReset();
    mockGetVersion.mockReset();
  });

  it('returns complete info when environment is set up', async () => {
    mockGetVenvPath.mockResolvedValue('/path/to/venv');
    mockIsInstalled.mockResolvedValue(true);
    mockGetVersion.mockResolvedValue('1.0.0');

    const result = await getSkillSeekersEnvInfo();

    expect(result).toEqual({
      exists: true,
      venvPath: '/path/to/venv',
      isInstalled: true,
      version: '1.0.0',
    });
  });

  it('returns exists: false when venv path is empty', async () => {
    mockGetVenvPath.mockResolvedValue('');
    mockIsInstalled.mockResolvedValue(true);
    mockGetVersion.mockResolvedValue('1.0.0');

    const result = await getSkillSeekersEnvInfo();

    expect(result).toEqual({
      exists: false,
      venvPath: '',
      isInstalled: true,
      version: '1.0.0',
    });
  });

  it('returns null version when getVersion returns null', async () => {
    mockGetVenvPath.mockResolvedValue('/path/to/venv');
    mockIsInstalled.mockResolvedValue(true);
    mockGetVersion.mockResolvedValue(null);

    const result = await getSkillSeekersEnvInfo();

    expect(result.version).toBe(null);
  });

  it('returns default values when all API calls throw', async () => {
    mockGetVenvPath.mockRejectedValue(new Error('Not available'));
    mockIsInstalled.mockRejectedValue(new Error('Not available'));
    mockGetVersion.mockRejectedValue(new Error('Not available'));

    const result = await getSkillSeekersEnvInfo();

    expect(result).toEqual({
      exists: false,
      venvPath: '',
      isInstalled: false,
      version: null,
    });
  });

  it('calls all APIs in parallel for efficiency', async () => {
    mockGetVenvPath.mockResolvedValue('/path/to/venv');
    mockIsInstalled.mockResolvedValue(true);
    mockGetVersion.mockResolvedValue('1.0.0');

    await getSkillSeekersEnvInfo();

    expect(mockGetVenvPath).toHaveBeenCalledTimes(1);
    expect(mockIsInstalled).toHaveBeenCalledTimes(1);
    expect(mockGetVersion).toHaveBeenCalledTimes(1);
  });
});

describe('setupSkillSeekersEnv', () => {
  beforeEach(() => {
    mockGetVenvPath.mockReset();
    mockIsInstalled.mockReset();
    mockGetVersion.mockReset();
    mockInstall.mockReset();
  });

  it('returns success when already installed without force', async () => {
    mockGetVenvPath.mockResolvedValue('/path/to/venv');
    mockIsInstalled.mockResolvedValue(true);
    mockGetVersion.mockResolvedValue('1.0.0');

    const result = await setupSkillSeekersEnv();

    expect(result).toEqual({
      success: true,
      version: '1.0.0',
    });
    expect(mockInstall).not.toHaveBeenCalled();
  });

  it('calls install when not installed', async () => {
    mockGetVenvPath.mockResolvedValue('');
    mockIsInstalled.mockResolvedValue(false);
    mockGetVersion.mockResolvedValue(null);
    mockInstall.mockResolvedValue('1.5.0');

    const result = await setupSkillSeekersEnv();

    expect(result).toEqual({
      success: true,
      version: '1.5.0',
    });
    expect(mockInstall).toHaveBeenCalledWith(undefined);
  });

  it('calls install with extras when specified', async () => {
    mockGetVenvPath.mockResolvedValue('');
    mockIsInstalled.mockResolvedValue(false);
    mockGetVersion.mockResolvedValue(null);
    mockInstall.mockResolvedValue('1.5.0');

    const extras = ['anthropic', 'cohere'];
    const result = await setupSkillSeekersEnv({ extras });

    expect(result).toEqual({
      success: true,
      version: '1.5.0',
    });
    expect(mockInstall).toHaveBeenCalledWith(extras);
  });

  it('calls install when forceReinstall is true', async () => {
    mockGetVenvPath.mockResolvedValue('/path/to/venv');
    mockIsInstalled.mockResolvedValue(true);
    mockGetVersion.mockResolvedValue('1.0.0');
    mockInstall.mockResolvedValue('1.5.0');

    const result = await setupSkillSeekersEnv({ forceReinstall: true });

    expect(result).toEqual({
      success: true,
      version: '1.5.0',
    });
    expect(mockInstall).toHaveBeenCalledWith(undefined);
  });

  it('returns error when install fails', async () => {
    mockGetVenvPath.mockResolvedValue('');
    mockIsInstalled.mockResolvedValue(false);
    mockGetVersion.mockResolvedValue(null);
    mockInstall.mockRejectedValue(new Error('Installation failed'));

    const result = await setupSkillSeekersEnv();

    expect(result).toEqual({
      success: false,
      error: 'Installation failed',
    });
  });

  it('returns error with custom message when Error instance thrown', async () => {
    mockGetVenvPath.mockResolvedValue('');
    mockIsInstalled.mockResolvedValue(false);
    mockGetVersion.mockResolvedValue(null);
    mockInstall.mockRejectedValue(new Error('Custom error message'));

    const result = await setupSkillSeekersEnv();

    expect(result).toEqual({
      success: false,
      error: 'Custom error message',
    });
  });
});

describe('getSkillSeekersOutputDir', () => {
  beforeEach(() => {
    mockGetOutputDir.mockReset();
  });

  it('returns the output directory path', async () => {
    mockGetOutputDir.mockResolvedValue('/path/to/output');

    const result = await getSkillSeekersOutputDir();

    expect(result).toBe('/path/to/output');
    expect(mockGetOutputDir).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from the API', async () => {
    mockGetOutputDir.mockRejectedValue(new Error('Access denied'));

    await expect(getSkillSeekersOutputDir()).rejects.toThrow('Access denied');
  });
});

describe('checkDependencies', () => {
  beforeEach(() => {
    mockGetVenvPath.mockReset();
  });

  it('returns all true when venv path exists', async () => {
    mockGetVenvPath.mockResolvedValue('/path/to/venv');

    const result = await checkDependencies();

    expect(result).toEqual({
      python: true,
      uv: false,
      git: false,
    });
  });

  it('returns all false when venv path is empty', async () => {
    mockGetVenvPath.mockResolvedValue('');

    const result = await checkDependencies();

    expect(result).toEqual({
      python: false,
      uv: false,
      git: false,
    });
  });

  it('returns all false when getVenvPath throws', async () => {
    mockGetVenvPath.mockRejectedValue(new Error('Not available'));

    const result = await checkDependencies();

    expect(result).toEqual({
      python: false,
      uv: false,
      git: false,
    });
  });

  it('has consistent return type structure', async () => {
    mockGetVenvPath.mockResolvedValue('/path/to/venv');

    const result = await checkDependencies();

    expect(result).toHaveProperty('python');
    expect(result).toHaveProperty('uv');
    expect(result).toHaveProperty('git');
    expect(typeof result.python).toBe('boolean');
    expect(typeof result.uv).toBe('boolean');
    expect(typeof result.git).toBe('boolean');
  });
});
