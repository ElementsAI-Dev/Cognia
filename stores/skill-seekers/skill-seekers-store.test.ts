/**
 * Skill Seekers Store Unit Tests
 *
 * Comprehensive test coverage for the Skill Seekers Zustand store.
 * Tests all state management, actions, API calls, and selectors.
 */

import { act } from '@testing-library/react';
import {
  SkillSeekersState,
  useSkillSeekersStore,
  type SkillSeekersStore,
} from './skill-seekers-store';
import type {
  SkillGenerationJob,
  PresetConfig,
  GeneratedSkill,
  LogEvent,
  ScrapeWebsiteInput,
  ScrapeGitHubInput,
  ScrapePdfInput,
  EnhanceSkillInput,
  PackageSkillInput,
  PageEstimation,
  EnhanceProvider,
} from '@/lib/native/skill-seekers';

// ========== Mock Setup ==========

// Mock the skill-seekers API module
jest.mock('@/lib/native/skill-seekers', () => {
  const mock = {
    isInstalled: jest.fn(),
    getVersion: jest.fn(),
    install: jest.fn(),
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    listPresets: jest.fn(),
    scrapeWebsite: jest.fn(),
    scrapeGitHub: jest.fn(),
    scrapePdf: jest.fn(),
    enhanceSkill: jest.fn(),
    packageSkill: jest.fn(),
    listJobs: jest.fn(),
    getJob: jest.fn(),
    cancelJob: jest.fn(),
    resumeJob: jest.fn(),
    cleanupJobs: jest.fn(),
    listGenerated: jest.fn(),
    getGenerated: jest.fn(),
    getOutputDir: jest.fn(),
    getVenvPath: jest.fn(),
    quickGenerateWebsite: jest.fn(),
    quickGenerateGitHub: jest.fn(),
    quickGeneratePreset: jest.fn(),
    estimatePages: jest.fn(),
  };
  return {
    default: mock,
    isInstalled: mock.isInstalled,
    getVersion: mock.getVersion,
    install: mock.install,
    getConfig: mock.getConfig,
    updateConfig: mock.updateConfig,
    listPresets: mock.listPresets,
    scrapeWebsite: mock.scrapeWebsite,
    scrapeGitHub: mock.scrapeGitHub,
    scrapePdf: mock.scrapePdf,
    enhanceSkill: mock.enhanceSkill,
    packageSkill: mock.packageSkill,
    listJobs: mock.listJobs,
    getJob: mock.getJob,
    cancelJob: mock.cancelJob,
    resumeJob: mock.resumeJob,
    cleanupJobs: mock.cleanupJobs,
    listGenerated: mock.listGenerated,
    getGenerated: mock.getGenerated,
    getOutputDir: mock.getOutputDir,
    getVenvPath: mock.getVenvPath,
    quickGenerateWebsite: mock.quickGenerateWebsite,
    quickGenerateGitHub: mock.quickGenerateGitHub,
    quickGeneratePreset: mock.quickGeneratePreset,
    estimatePages: mock.estimatePages,
  };
});

// Import after mock - type as jest mock
import skillSeekersApiModule from '@/lib/native/skill-seekers';

type MockedSkillSeekersApi = {
  [K in keyof typeof skillSeekersApiModule]: jest.Mock;
};

const skillSeekersApi = skillSeekersApiModule as unknown as MockedSkillSeekersApi;

// ========== Test Data ==========

const mockJob: SkillGenerationJob = {
  id: 'job-1',
  source_type: 'website',
  name: 'Test Job',
  status: 'running',
  progress: {
    phase: 'scraping',
    percent: 50,
    message: 'Scraping pages',
    pages_scraped: 10,
    pages_total: 20,
  },
  createdAt: '2025-01-23T10:00:00Z',
  startedAt: '2025-01-23T10:01:00Z',
  resumable: true,
};

const mockPreset: PresetConfig = {
  name: 'test-preset',
  displayName: 'Test Preset',
  description: 'A test preset',
  category: 'testing',
  configPath: '/path/to/config.yaml',
  icon: 'test-icon',
  estimatedPages: 100,
};

const mockSkill: GeneratedSkill = {
  id: 'skill-1',
  name: 'Test Skill',
  description: 'A test skill',
  sourceType: 'website',
  source: 'https://example.com',
  outputDir: '/output',
  skillMdPath: '/output/skill.md',
  packagePath: '/output/skill.md',
  createdAt: '2025-01-23T10:00:00Z',
  enhancedAt: '2025-01-23T11:00:00Z',
  installed: true,
  installedSkillId: 'installed-skill-1',
  fileSize: 1024,
  pageCount: 50,
};

const mockLog: LogEvent = {
  jobId: 'job-1',
  level: 'info',
  message: 'Test log message',
  timestamp: '2025-01-23T10:00:00Z',
};

const mockPageEstimation: PageEstimation = {
  estimatedPages: 100,
  estimatedMinutes: 5,
  hasLlmsTxt: true,
};

// Mock localStorage
const mockLocalStorageStore: Record<string, string> = {};
const mockLocalStorage = {
  store: mockLocalStorageStore,
  getItem: jest.fn((key: string) => mockLocalStorageStore[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorageStore[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockLocalStorageStore[key];
  }),
  clear: jest.fn(() => {
    Object.keys(mockLocalStorageStore).forEach((key) => {
      delete mockLocalStorageStore[key];
    });
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// ========== Helper Functions ==========

function resetStore() {
  act(() => {
    useSkillSeekersStore.getState().reset();
  });
}

beforeEach(() => {
  mockLocalStorage.clear();
  skillSeekersApi.isInstalled.mockReset();
  skillSeekersApi.getVersion.mockReset();
  skillSeekersApi.install.mockReset();
  skillSeekersApi.getConfig.mockReset();
  skillSeekersApi.updateConfig.mockReset();
  skillSeekersApi.listPresets.mockReset();
  skillSeekersApi.scrapeWebsite.mockReset();
  skillSeekersApi.scrapeGitHub.mockReset();
  skillSeekersApi.scrapePdf.mockReset();
  skillSeekersApi.enhanceSkill.mockReset();
  skillSeekersApi.packageSkill.mockReset();
  skillSeekersApi.listJobs.mockReset();
  skillSeekersApi.getJob.mockReset();
  skillSeekersApi.cancelJob.mockReset();
  skillSeekersApi.resumeJob.mockReset();
  skillSeekersApi.cleanupJobs.mockReset();
  skillSeekersApi.listGenerated.mockReset();
  skillSeekersApi.getGenerated.mockReset();
  skillSeekersApi.getOutputDir.mockReset();
  skillSeekersApi.getVenvPath.mockReset();
  skillSeekersApi.quickGenerateWebsite.mockReset();
  skillSeekersApi.quickGenerateGitHub.mockReset();
  skillSeekersApi.quickGeneratePreset.mockReset();
  skillSeekersApi.estimatePages.mockReset();
});

// ========== Test Suites ==========

describe('SkillSeekersStore - Initial State', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should have correct initial state', () => {
    const state = useSkillSeekersStore.getState();

    expect(state.isInstalled).toBe(false);
    expect(state.version).toBe(null);
    expect(state.isInstalling).toBe(false);
    expect(state.isLoading).toBe(true);
    expect(state.error).toBe(null);

    expect(state.activeJobId).toBe(null);
    expect(state.jobs).toEqual({});
    expect(state.presets).toEqual([]);
    expect(state.generatedSkills).toEqual({});
    expect(state.logs).toEqual([]);

    expect(state.config).toEqual({
      outputDir: '',
      venvPath: '',
      defaultProvider: 'anthropic',
      githubToken: null,
      autoEnhance: false,
      autoInstall: false,
    });

    expect(state.ui).toEqual({
      selectedPreset: null,
      showAdvancedOptions: false,
      activeTab: 'generate',
      generatorStep: 'source',
    });
  });
});

describe('SkillSeekersStore - Installation State', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should set installed state and version', () => {
    const store = useSkillSeekersStore.getState();

    store.setInstalled(true, '1.0.0');

    const state = useSkillSeekersStore.getState();
    expect(state.isInstalled).toBe(true);
    expect(state.version).toBe('1.0.0');
  });

  it('should set installing state', () => {
    const store = useSkillSeekersStore.getState();

    store.setInstalling(true);

    expect(useSkillSeekersStore.getState().isInstalling).toBe(true);

    store.setInstalling(false);

    expect(useSkillSeekersStore.getState().isInstalling).toBe(false);
  });

  it('should set loading state', () => {
    const store = useSkillSeekersStore.getState();

    store.setLoading(false);

    expect(useSkillSeekersStore.getState().isLoading).toBe(false);
  });

  it('should set and clear error', () => {
    const store = useSkillSeekersStore.getState();

    store.setError('Test error');

    expect(useSkillSeekersStore.getState().error).toBe('Test error');

    store.clearError();

    expect(useSkillSeekersStore.getState().error).toBe(null);
  });

  it('should call checkInstallation and update state', async () => {
    skillSeekersApi.isInstalled.mockResolvedValue(true);
    skillSeekersApi.getVersion.mockResolvedValue('2.0.0');

    const store = useSkillSeekersStore.getState();

    await store.checkInstallation();

    const state = useSkillSeekersStore.getState();
    expect(state.isInstalled).toBe(true);
    expect(state.version).toBe('2.0.0');
    expect(state.isLoading).toBe(false);
  });

  it('should handle checkInstallation error', async () => {
    skillSeekersApi.isInstalled.mockRejectedValue(new Error('Check failed'));

    const store = useSkillSeekersStore.getState();

    await store.checkInstallation();

    const state = useSkillSeekersStore.getState();
    expect(state.error).toBe('Check failed');
    expect(state.isLoading).toBe(false);
  });

  it('should call install and update state', async () => {
    skillSeekersApi.install.mockResolvedValue('1.5.0');

    const store = useSkillSeekersStore.getState();

    await store.install(['extras']);

    const state = useSkillSeekersStore.getState();
    expect(state.isInstalled).toBe(true);
    expect(state.version).toBe('1.5.0');
    expect(state.isInstalling).toBe(false);
  });

  it('should handle install error', async () => {
    skillSeekersApi.install.mockRejectedValue(new Error('Install failed'));

    const store = useSkillSeekersStore.getState();

    await expect(store.install()).rejects.toThrow('Install failed');

    const state = useSkillSeekersStore.getState();
    expect(state.error).toBe('Install failed');
    expect(state.isInstalling).toBe(false);
  });
});

describe('SkillSeekersStore - Job Management', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should set active job', () => {
    const store = useSkillSeekersStore.getState();

    store.setActiveJob('job-1');

    expect(useSkillSeekersStore.getState().activeJobId).toBe('job-1');
  });

  it('should update job and set active job for running status', () => {
    const store = useSkillSeekersStore.getState();

    store.updateJob(mockJob);

    const state = useSkillSeekersStore.getState();
    expect(state.jobs['job-1']).toEqual(mockJob);
    expect(state.activeJobId).toBe('job-1');
  });

  it('should update job and not change active job for completed status', () => {
    const store = useSkillSeekersStore.getState();

    store.setActiveJob('job-1');

    const completedJob = { ...mockJob, status: 'completed' as const };
    store.updateJob(completedJob);

    const state = useSkillSeekersStore.getState();
    expect(state.activeJobId).toBe('job-1'); // Should keep existing active job
  });

  it('should remove job and clear active job if removed', () => {
    const store = useSkillSeekersStore.getState();

    store.updateJob(mockJob);
    store.setActiveJob('job-1');

    store.removeJob('job-1');

    const state = useSkillSeekersStore.getState();
    expect(state.jobs['job-1']).toBeUndefined();
    expect(state.activeJobId).toBe(null);
  });

  it('should remove job and keep active job if different', () => {
    const store = useSkillSeekersStore.getState();

    store.updateJob(mockJob);
    store.setActiveJob('job-2');

    store.removeJob('job-1');

    const state = useSkillSeekersStore.getState();
    expect(state.jobs['job-1']).toBeUndefined();
    expect(state.activeJobId).toBe('job-2');
  });

  it('should set jobs and auto-select running job', () => {
    const store = useSkillSeekersStore.getState();

    const jobs: SkillGenerationJob[] = [
      mockJob,
      { ...mockJob, id: 'job-2', status: 'completed' as const },
    ];

    store.setJobs(jobs);

    const state = useSkillSeekersStore.getState();
    expect(state.jobs['job-1']).toEqual(mockJob);
    expect(state.jobs['job-2']).toEqual(jobs[1]);
    expect(state.activeJobId).toBe('job-1'); // Running job
  });

  it('should refresh jobs from API', async () => {
    const jobs: SkillGenerationJob[] = [mockJob];
    skillSeekersApi.listJobs.mockResolvedValue(jobs);

    const store = useSkillSeekersStore.getState();

    await store.refreshJobs();

    expect(skillSeekersApi.listJobs).toHaveBeenCalled();
    expect(useSkillSeekersStore.getState().jobs['job-1']).toEqual(mockJob);
  });

  it('should handle refreshJobs error gracefully', async () => {
    skillSeekersApi.listJobs.mockRejectedValue(new Error('API error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const store = useSkillSeekersStore.getState();

    await store.refreshJobs();

    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should cancel job and refresh', async () => {
    skillSeekersApi.cancelJob.mockResolvedValue(undefined);
    skillSeekersApi.listJobs.mockResolvedValue([]);

    const store = useSkillSeekersStore.getState();

    await store.cancelJob('job-1');

    expect(skillSeekersApi.cancelJob).toHaveBeenCalledWith('job-1');
    expect(skillSeekersApi.listJobs).toHaveBeenCalled();
  });

  it('should handle cancelJob error', async () => {
    skillSeekersApi.cancelJob.mockRejectedValue(new Error('Cancel failed'));

    const store = useSkillSeekersStore.getState();

    await expect(store.cancelJob('job-1')).rejects.toThrow('Cancel failed');

    expect(useSkillSeekersStore.getState().error).toBe('Cancel failed');
  });

  it('should resume job and refresh', async () => {
    skillSeekersApi.resumeJob.mockResolvedValue(undefined);
    skillSeekersApi.listJobs.mockResolvedValue([]);

    const store = useSkillSeekersStore.getState();

    await store.resumeJob('job-1');

    expect(skillSeekersApi.resumeJob).toHaveBeenCalledWith('job-1');
    expect(skillSeekersApi.listJobs).toHaveBeenCalled();
  });

  it('should handle resumeJob error', async () => {
    skillSeekersApi.resumeJob.mockRejectedValue(new Error('Resume failed'));

    const store = useSkillSeekersStore.getState();

    await expect(store.resumeJob('job-1')).rejects.toThrow('Resume failed');

    expect(useSkillSeekersStore.getState().error).toBe('Resume failed');
  });

  it('should cleanup jobs and return count', async () => {
    skillSeekersApi.cleanupJobs.mockResolvedValue(5);
    skillSeekersApi.listJobs.mockResolvedValue([]);

    const store = useSkillSeekersStore.getState();

    const count = await store.cleanupJobs(7);

    expect(count).toBe(5);
    expect(skillSeekersApi.cleanupJobs).toHaveBeenCalledWith(7);
  });

  it('should handle cleanupJobs error gracefully', async () => {
    skillSeekersApi.cleanupJobs.mockRejectedValue(new Error('Cleanup failed'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const store = useSkillSeekersStore.getState();

    const count = await store.cleanupJobs();

    expect(count).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe('SkillSeekersStore - Preset Management', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should set presets', () => {
    const store = useSkillSeekersStore.getState();

    store.setPresets([mockPreset]);

    expect(useSkillSeekersStore.getState().presets).toEqual([mockPreset]);
  });

  it('should refresh presets from API', async () => {
    const presets = [mockPreset];
    skillSeekersApi.listPresets.mockResolvedValue(presets);

    const store = useSkillSeekersStore.getState();

    await store.refreshPresets();

    expect(skillSeekersApi.listPresets).toHaveBeenCalled();
    expect(useSkillSeekersStore.getState().presets).toEqual(presets);
  });

  it('should handle refreshPresets error gracefully', async () => {
    skillSeekersApi.listPresets.mockRejectedValue(new Error('API error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const store = useSkillSeekersStore.getState();

    await store.refreshPresets();

    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe('SkillSeekersStore - Generated Skills Management', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should set generated skills', () => {
    const store = useSkillSeekersStore.getState();

    store.setGeneratedSkills([mockSkill]);

    expect(useSkillSeekersStore.getState().generatedSkills['skill-1']).toEqual(mockSkill);
  });

  it('should add generated skill', () => {
    const store = useSkillSeekersStore.getState();

    store.addGeneratedSkill(mockSkill);

    expect(useSkillSeekersStore.getState().generatedSkills['skill-1']).toEqual(mockSkill);
  });

  it('should remove generated skill', () => {
    const store = useSkillSeekersStore.getState();

    store.addGeneratedSkill(mockSkill);
    store.removeGeneratedSkill('skill-1');

    expect(useSkillSeekersStore.getState().generatedSkills['skill-1']).toBeUndefined();
  });

  it('should refresh generated skills from API', async () => {
    const skills = [mockSkill];
    skillSeekersApi.listGenerated.mockResolvedValue(skills);

    const store = useSkillSeekersStore.getState();

    await store.refreshGeneratedSkills();

    expect(skillSeekersApi.listGenerated).toHaveBeenCalled();
    expect(useSkillSeekersStore.getState().generatedSkills['skill-1']).toEqual(mockSkill);
  });

  it('should handle refreshGeneratedSkills error gracefully', async () => {
    skillSeekersApi.listGenerated.mockRejectedValue(new Error('API error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const store = useSkillSeekersStore.getState();

    await store.refreshGeneratedSkills();

    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe('SkillSeekersStore - Logs Management', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should add log', () => {
    const store = useSkillSeekersStore.getState();

    store.addLog(mockLog);

    expect(useSkillSeekersStore.getState().logs).toEqual([mockLog]);
  });

  it('should limit logs to MAX_LOGS', () => {
    const store = useSkillSeekersStore.getState();

    // Add more than MAX_LOGS (500) logs
    for (let i = 0; i < 600; i++) {
      store.addLog({ ...mockLog, timestamp: `${i}` });
    }

    const logs = useSkillSeekersStore.getState().logs;
    expect(logs.length).toBe(500);
    expect(logs[0].timestamp).toBe('100'); // First log should be the 100th added
  });

  it('should clear logs', () => {
    const store = useSkillSeekersStore.getState();

    store.addLog(mockLog);
    store.clearLogs();

    expect(useSkillSeekersStore.getState().logs).toEqual([]);
  });
});

describe('SkillSeekersStore - Config and UI State', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should update config partially', () => {
    const store = useSkillSeekersStore.getState();

    store.updateConfig({ outputDir: '/new/path' });

    const state = useSkillSeekersStore.getState();
    expect(state.config.outputDir).toBe('/new/path');
    expect(state.config.defaultProvider).toBe('anthropic'); // Unchanged
  });

  it('should update config with all fields', () => {
    const store = useSkillSeekersStore.getState();

    store.updateConfig({
      outputDir: '/output',
      venvPath: '/venv',
      defaultProvider: 'openai' as EnhanceProvider,
      githubToken: 'token',
      autoEnhance: true,
      autoInstall: true,
    });

    const state = useSkillSeekersStore.getState();
    expect(state.config).toEqual({
      outputDir: '/output',
      venvPath: '/venv',
      defaultProvider: 'openai',
      githubToken: 'token',
      autoEnhance: true,
      autoInstall: true,
    });
  });

  it('should set UI state partially', () => {
    const store = useSkillSeekersStore.getState();

    store.setUiState({ activeTab: 'jobs' });

    const state = useSkillSeekersStore.getState();
    expect(state.ui.activeTab).toBe('jobs');
    expect(state.ui.generatorStep).toBe('source'); // Unchanged
  });

  it('should refresh config from API', async () => {
    const config = {
      outputDir: '/output',
      venvPath: '/venv',
      defaultProvider: 'google' as EnhanceProvider,
      githubToken: 'token',
      autoEnhance: true,
      autoInstall: false,
      checkpointInterval: 60,
    };

    skillSeekersApi.getConfig.mockResolvedValue(config);

    const store = useSkillSeekersStore.getState();

    await store.refreshConfig();

    expect(skillSeekersApi.getConfig).toHaveBeenCalled();
    expect(useSkillSeekersStore.getState().config).toEqual({
      outputDir: '/output',
      venvPath: '/venv',
      defaultProvider: 'google',
      githubToken: 'token',
      autoEnhance: true,
      autoInstall: false,
    });
  });

  it('should handle refreshConfig error gracefully', async () => {
    skillSeekersApi.getConfig.mockRejectedValue(new Error('API error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const store = useSkillSeekersStore.getState();

    await store.refreshConfig();

    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe('SkillSeekersStore - Scraping Functions', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should scrape website and update UI', async () => {
    const input: ScrapeWebsiteInput = {
      config: {
        name: 'Test',
        base_url: 'https://example.com',
      },
    };

    skillSeekersApi.scrapeWebsite.mockResolvedValue('job-1');
    skillSeekersApi.listJobs.mockResolvedValue([]);

    const store = useSkillSeekersStore.getState();

    const jobId = await store.scrapeWebsite(input);

    expect(jobId).toBe('job-1');
    expect(skillSeekersApi.scrapeWebsite).toHaveBeenCalledWith(input);
    expect(useSkillSeekersStore.getState().ui.generatorStep).toBe('progress');
  });

  it('should handle scrapeWebsite error', async () => {
    const input: ScrapeWebsiteInput = {
      config: {
        name: 'Test',
        base_url: 'https://example.com',
      },
    };

    skillSeekersApi.scrapeWebsite.mockRejectedValue(new Error('Scrape failed'));

    const store = useSkillSeekersStore.getState();

    await expect(store.scrapeWebsite(input)).rejects.toThrow('Scrape failed');

    expect(useSkillSeekersStore.getState().error).toBe('Scrape failed');
  });

  it('should scrape GitHub and update UI', async () => {
    const input: ScrapeGitHubInput = {
      config: {
        repo: 'owner/repo',
      },
    };

    skillSeekersApi.scrapeGitHub.mockResolvedValue('job-2');
    skillSeekersApi.listJobs.mockResolvedValue([]);

    const store = useSkillSeekersStore.getState();

    const jobId = await store.scrapeGitHub(input);

    expect(jobId).toBe('job-2');
    expect(skillSeekersApi.scrapeGitHub).toHaveBeenCalledWith(input);
    expect(useSkillSeekersStore.getState().ui.generatorStep).toBe('progress');
  });

  it('should handle scrapeGitHub error', async () => {
    const input: ScrapeGitHubInput = {
      config: {
        repo: 'owner/repo',
      },
    };

    skillSeekersApi.scrapeGitHub.mockRejectedValue(new Error('Scrape failed'));

    const store = useSkillSeekersStore.getState();

    await expect(store.scrapeGitHub(input)).rejects.toThrow('Scrape failed');

    expect(useSkillSeekersStore.getState().error).toBe('Scrape failed');
  });

  it('should scrape PDF and update UI', async () => {
    const input: ScrapePdfInput = {
      config: {
        pdf_path: '/path/to.pdf',
        name: 'Test PDF',
      },
    };

    skillSeekersApi.scrapePdf.mockResolvedValue('job-3');
    skillSeekersApi.listJobs.mockResolvedValue([]);

    const store = useSkillSeekersStore.getState();

    const jobId = await store.scrapePdf(input);

    expect(jobId).toBe('job-3');
    expect(skillSeekersApi.scrapePdf).toHaveBeenCalledWith(input);
    expect(useSkillSeekersStore.getState().ui.generatorStep).toBe('progress');
  });

  it('should handle scrapePdf error', async () => {
    const input: ScrapePdfInput = {
      config: {
        pdf_path: '/path/to.pdf',
        name: 'Test PDF',
      },
    };

    skillSeekersApi.scrapePdf.mockRejectedValue(new Error('Scrape failed'));

    const store = useSkillSeekersStore.getState();

    await expect(store.scrapePdf(input)).rejects.toThrow('Scrape failed');

    expect(useSkillSeekersStore.getState().error).toBe('Scrape failed');
  });
});

describe('SkillSeekersStore - Enhancement and Packaging', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should enhance skill', async () => {
    const input: EnhanceSkillInput = {
      skillDir: '/skill/dir',
      config: {
        provider: 'anthropic',
      },
    };

    skillSeekersApi.enhanceSkill.mockResolvedValue(undefined);

    const store = useSkillSeekersStore.getState();

    await store.enhanceSkill(input);

    expect(skillSeekersApi.enhanceSkill).toHaveBeenCalledWith(input);
  });

  it('should handle enhanceSkill error', async () => {
    const input: EnhanceSkillInput = {
      skillDir: '/skill/dir',
      config: {
        provider: 'anthropic',
      },
    };

    skillSeekersApi.enhanceSkill.mockRejectedValue(new Error('Enhance failed'));

    const store = useSkillSeekersStore.getState();

    await expect(store.enhanceSkill(input)).rejects.toThrow('Enhance failed');

    expect(useSkillSeekersStore.getState().error).toBe('Enhance failed');
  });

  it('should package skill and return path', async () => {
    const input: PackageSkillInput = {
      skillDir: '/skill/dir',
      config: {
        target: 'claude',
      },
    };

    skillSeekersApi.packageSkill.mockResolvedValue('/output/skill.md');

    const store = useSkillSeekersStore.getState();

    const path = await store.packageSkill(input);

    expect(path).toBe('/output/skill.md');
    expect(skillSeekersApi.packageSkill).toHaveBeenCalledWith(input);
  });

  it('should handle packageSkill error', async () => {
    const input: PackageSkillInput = {
      skillDir: '/skill/dir',
      config: {},
    };

    skillSeekersApi.packageSkill.mockRejectedValue(new Error('Package failed'));

    const store = useSkillSeekersStore.getState();

    await expect(store.packageSkill(input)).rejects.toThrow('Package failed');

    expect(useSkillSeekersStore.getState().error).toBe('Package failed');
  });
});

describe('SkillSeekersStore - Quick Generate Functions', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should quick generate from website', async () => {
    skillSeekersApi.quickGenerateWebsite.mockResolvedValue('job-1');
    skillSeekersApi.listJobs.mockResolvedValue([]);

    const store = useSkillSeekersStore.getState();

    const jobId = await store.quickGenerateWebsite('https://example.com', 'Test', true, false);

    expect(jobId).toBe('job-1');
    expect(skillSeekersApi.quickGenerateWebsite).toHaveBeenCalledWith(
      'https://example.com',
      'Test',
      true,
      false
    );
    expect(useSkillSeekersStore.getState().ui.generatorStep).toBe('progress');
  });

  it('should handle quickGenerateWebsite error', async () => {
    skillSeekersApi.quickGenerateWebsite.mockRejectedValue(new Error('Generate failed'));

    const store = useSkillSeekersStore.getState();

    await expect(store.quickGenerateWebsite('https://example.com', 'Test')).rejects.toThrow(
      'Generate failed'
    );

    expect(useSkillSeekersStore.getState().error).toBe('Generate failed');
  });

  it('should quick generate from GitHub', async () => {
    skillSeekersApi.quickGenerateGitHub.mockResolvedValue('job-2');
    skillSeekersApi.listJobs.mockResolvedValue([]);

    const store = useSkillSeekersStore.getState();

    const jobId = await store.quickGenerateGitHub('owner/repo', false, true);

    expect(jobId).toBe('job-2');
    expect(skillSeekersApi.quickGenerateGitHub).toHaveBeenCalledWith('owner/repo', false, true);
    expect(useSkillSeekersStore.getState().ui.generatorStep).toBe('progress');
  });

  it('should handle quickGenerateGitHub error', async () => {
    skillSeekersApi.quickGenerateGitHub.mockRejectedValue(new Error('Generate failed'));

    const store = useSkillSeekersStore.getState();

    await expect(store.quickGenerateGitHub('owner/repo')).rejects.toThrow('Generate failed');

    expect(useSkillSeekersStore.getState().error).toBe('Generate failed');
  });

  it('should quick generate from preset', async () => {
    skillSeekersApi.quickGeneratePreset.mockResolvedValue('job-3');
    skillSeekersApi.listJobs.mockResolvedValue([]);

    const store = useSkillSeekersStore.getState();

    const jobId = await store.quickGeneratePreset('test-preset', true, true);

    expect(jobId).toBe('job-3');
    expect(skillSeekersApi.quickGeneratePreset).toHaveBeenCalledWith('test-preset', true, true);
    expect(useSkillSeekersStore.getState().ui.generatorStep).toBe('progress');
  });

  it('should handle quickGeneratePreset error', async () => {
    skillSeekersApi.quickGeneratePreset.mockRejectedValue(new Error('Generate failed'));

    const store = useSkillSeekersStore.getState();

    await expect(store.quickGeneratePreset('test-preset')).rejects.toThrow('Generate failed');

    expect(useSkillSeekersStore.getState().error).toBe('Generate failed');
  });
});

describe('SkillSeekersStore - Utility Functions', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should estimate pages', async () => {
    skillSeekersApi.estimatePages.mockResolvedValue(mockPageEstimation);

    const store = useSkillSeekersStore.getState();

    const estimation = await store.estimatePages('https://example.com', 'config');

    expect(estimation).toEqual(mockPageEstimation);
    expect(skillSeekersApi.estimatePages).toHaveBeenCalledWith('https://example.com', 'config');
  });

  it('should reset to initial state', () => {
    const store = useSkillSeekersStore.getState();

    // Modify state
    store.setInstalled(true, '1.0.0');
    store.setError('Some error');
    store.updateJob(mockJob);
    store.addLog(mockLog);

    // Reset
    store.reset();

    const state = useSkillSeekersStore.getState();

    expect(state.isInstalled).toBe(false);
    expect(state.version).toBe(null);
    expect(state.error).toBe(null);
    expect(state.jobs).toEqual({});
    expect(state.logs).toEqual([]);
  });
});

describe('SkillSeekersStore - Selectors', () => {
  // Import selectors at the top level with proper types
  type SelectorFn<T> = (state: SkillSeekersStore) => T;

  let selectIsInstalled: SelectorFn<boolean>;
  let selectVersion: SelectorFn<string | null>;
  let selectActiveJob: SelectorFn<SkillGenerationJob | null>;
  let selectJobs: SelectorFn<SkillGenerationJob[]>;
  let selectJobById: (jobId: string) => SelectorFn<SkillGenerationJob | undefined>;
  let selectPresets: SelectorFn<PresetConfig[]>;
  let selectPresetsByCategory: SelectorFn<Record<string, PresetConfig[]>>;
  let selectGeneratedSkills: SelectorFn<GeneratedSkill[]>;
  let selectGeneratedSkillById: (skillId: string) => SelectorFn<GeneratedSkill | undefined>;
  let selectLogs: SelectorFn<LogEvent[]>;
  let selectConfig: SelectorFn<SkillSeekersState['config']>;
  let selectUiState: SelectorFn<SkillSeekersState['ui']>;
  let selectRunningJobs: SelectorFn<SkillGenerationJob[]>;
  let selectCompletedJobs: SelectorFn<SkillGenerationJob[]>;
  let selectFailedJobs: SelectorFn<SkillGenerationJob[]>;
  let selectPausedJobs: SelectorFn<SkillGenerationJob[]>;

  beforeAll(async () => {
    const selectors = await import('./skill-seekers-store');
    selectIsInstalled = selectors.selectIsInstalled;
    selectVersion = selectors.selectVersion;
    selectActiveJob = selectors.selectActiveJob;
    selectJobs = selectors.selectJobs;
    selectJobById = selectors.selectJobById;
    selectPresets = selectors.selectPresets;
    selectPresetsByCategory = selectors.selectPresetsByCategory;
    selectGeneratedSkills = selectors.selectGeneratedSkills;
    selectGeneratedSkillById = selectors.selectGeneratedSkillById;
    selectLogs = selectors.selectLogs;
    selectConfig = selectors.selectConfig;
    selectUiState = selectors.selectUiState;
    selectRunningJobs = selectors.selectRunningJobs;
    selectCompletedJobs = selectors.selectCompletedJobs;
    selectFailedJobs = selectors.selectFailedJobs;
    selectPausedJobs = selectors.selectPausedJobs;
  });

  beforeEach(() => {
    resetStore();
  });

  it('selectIsInstalled should return isInstalled state', () => {
    expect(selectIsInstalled(useSkillSeekersStore.getState())).toBe(false);
  });

  it('selectVersion should return version state', () => {
    expect(selectVersion(useSkillSeekersStore.getState())).toBe(null);
  });

  it('selectActiveJob should return active job or null', () => {
    expect(selectActiveJob(useSkillSeekersStore.getState())).toBe(null);

    useSkillSeekersStore.getState().updateJob(mockJob);

    expect(selectActiveJob(useSkillSeekersStore.getState())).toEqual(mockJob);
  });

  it('selectJobs should return all jobs as array', () => {
    let store = useSkillSeekersStore.getState();

    expect(selectJobs(store)).toEqual([]);

    act(() => {
      useSkillSeekersStore.getState().updateJob(mockJob);
      useSkillSeekersStore.getState().updateJob({ ...mockJob, id: 'job-2' });
    });

    store = useSkillSeekersStore.getState();
    expect(selectJobs(store)).toHaveLength(2);
  });

  it('selectJobById should return specific job', () => {
    useSkillSeekersStore.getState().updateJob(mockJob);

    const selector = selectJobById('job-1');
    expect(selector(useSkillSeekersStore.getState())).toEqual(mockJob);
  });

  it('selectPresets should return presets array', () => {
    useSkillSeekersStore.getState().setPresets([mockPreset]);

    expect(selectPresets(useSkillSeekersStore.getState())).toEqual([mockPreset]);
  });

  it('selectPresetsByCategory should group presets by category', () => {
    const presets: PresetConfig[] = [
      mockPreset,
      { ...mockPreset, name: 'preset-2', category: 'dev' },
      { ...mockPreset, name: 'preset-3', category: 'testing' },
    ];

    useSkillSeekersStore.getState().setPresets(presets);

    const grouped = selectPresetsByCategory(useSkillSeekersStore.getState());

    expect(grouped['testing']).toHaveLength(2);
    expect(grouped['dev']).toHaveLength(1);
  });

  it('selectGeneratedSkills should return all skills as array', () => {
    let store = useSkillSeekersStore.getState();

    expect(selectGeneratedSkills(store)).toEqual([]);

    act(() => {
      useSkillSeekersStore.getState().addGeneratedSkill(mockSkill);
    });

    store = useSkillSeekersStore.getState();
    expect(selectGeneratedSkills(store)).toEqual([mockSkill]);
  });

  it('selectGeneratedSkillById should return specific skill', () => {
    useSkillSeekersStore.getState().addGeneratedSkill(mockSkill);

    const selector = selectGeneratedSkillById('skill-1');
    expect(selector(useSkillSeekersStore.getState())).toEqual(mockSkill);
  });

  it('selectLogs should return logs array', () => {
    useSkillSeekersStore.getState().addLog(mockLog);

    expect(selectLogs(useSkillSeekersStore.getState())).toEqual([mockLog]);
  });

  it('selectConfig should return config', () => {
    const config = selectConfig(useSkillSeekersStore.getState());

    expect(config).toEqual(useSkillSeekersStore.getState().config);
  });

  it('selectUiState should return ui state', () => {
    const ui = selectUiState(useSkillSeekersStore.getState());

    expect(ui).toEqual(useSkillSeekersStore.getState().ui);
  });

  it('selectRunningJobs should return only running jobs', () => {
    useSkillSeekersStore
      .getState()
      .setJobs([
        mockJob,
        { ...mockJob, id: 'job-2', status: 'completed' as const },
        { ...mockJob, id: 'job-3', status: 'running' as const },
      ]);

    const running = selectRunningJobs(useSkillSeekersStore.getState());

    expect(running).toHaveLength(2);
    expect(running.every((j) => j.status === 'running')).toBe(true);
  });

  it('selectCompletedJobs should return only completed jobs', () => {
    useSkillSeekersStore
      .getState()
      .setJobs([
        mockJob,
        { ...mockJob, id: 'job-2', status: 'completed' as const },
        { ...mockJob, id: 'job-3', status: 'failed' as const },
      ]);

    const completed = selectCompletedJobs(useSkillSeekersStore.getState());

    expect(completed).toHaveLength(1);
    expect(completed[0].status).toBe('completed');
  });

  it('selectFailedJobs should return only failed jobs', () => {
    useSkillSeekersStore
      .getState()
      .setJobs([
        mockJob,
        { ...mockJob, id: 'job-2', status: 'completed' as const },
        { ...mockJob, id: 'job-3', status: 'failed' as const },
      ]);

    const failed = selectFailedJobs(useSkillSeekersStore.getState());

    expect(failed).toHaveLength(1);
    expect(failed[0].status).toBe('failed');
  });

  it('selectPausedJobs should return only paused jobs', () => {
    useSkillSeekersStore
      .getState()
      .setJobs([
        mockJob,
        { ...mockJob, id: 'job-2', status: 'paused' as const },
        { ...mockJob, id: 'job-3', status: 'running' as const },
      ]);

    const paused = selectPausedJobs(useSkillSeekersStore.getState());

    expect(paused).toHaveLength(1);
    expect(paused[0].status).toBe('paused');
  });
});

describe('SkillSeekersStore - Persistence', () => {
  afterEach(() => {
    mockLocalStorage.clear();
    resetStore();
  });

  it('should update config state correctly', () => {
    const store = useSkillSeekersStore.getState();

    act(() => {
      store.updateConfig({
        outputDir: '/test/output',
        defaultProvider: 'openai' as EnhanceProvider,
      });
    });

    const state = useSkillSeekersStore.getState();
    expect(state.config.outputDir).toBe('/test/output');
    expect(state.config.defaultProvider).toBe('openai');
  });

  it('should update UI state correctly', () => {
    const store = useSkillSeekersStore.getState();

    act(() => {
      store.setUiState({
        selectedPreset: 'test-preset',
        showAdvancedOptions: true,
        activeTab: 'settings',
      });
    });

    const state = useSkillSeekersStore.getState();
    expect(state.ui.selectedPreset).toBe('test-preset');
    expect(state.ui.showAdvancedOptions).toBe(true);
    expect(state.ui.activeTab).toBe('settings');
  });

  it('should maintain transient state (jobs) in memory only', () => {
    const store = useSkillSeekersStore.getState();

    act(() => {
      store.updateJob(mockJob);
    });

    // Jobs should be in current state
    const state = useSkillSeekersStore.getState();
    expect(state.jobs['job-1']).toEqual(mockJob);
  });
});
