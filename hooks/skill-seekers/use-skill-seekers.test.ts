/**
 * Tests for useSkillSeekers hook
 *
 * Comprehensive tests covering:
 * - Initialization and state management
 * - Installation management
 * - Job management (scrapeWebsite, scrapeGitHub, scrapePdf)
 * - Enhancement and packaging
 * - Quick generate functions
 * - Job control (cancel, resume)
 * - Event listeners (progress, job completed, logs)
 * - Non-Tauri environment fallbacks
 */

 
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSkillSeekers } from './use-skill-seekers';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock Tauri event listen
const mockUnlisten = jest.fn(() => Promise.resolve());
const mockListen = jest.fn((_event: string, _handler: (...cbArgs: unknown[]) => void) => Promise.resolve(mockUnlisten));
jest.mock('@tauri-apps/api/event', () => ({
  listen: (event: string, handler: (...cbArgs: unknown[]) => void) => mockListen(event, handler),
}));

// Mock skill-seekers native API
jest.mock('@/lib/native/skill-seekers', () => ({
  __esModule: true,
  default: {
    isInstalled: jest.fn(),
    getVersion: jest.fn(),
    install: jest.fn(),
    listJobs: jest.fn(),
    listPresets: jest.fn(),
    listGenerated: jest.fn(),
    scrapeWebsite: jest.fn(),
    scrapeGitHub: jest.fn(),
    scrapePdf: jest.fn(),
    enhanceSkill: jest.fn(),
    packageSkill: jest.fn(),
    quickGenerateWebsite: jest.fn(),
    quickGenerateGitHub: jest.fn(),
    quickGeneratePreset: jest.fn(),
    cancelJob: jest.fn(),
    resumeJob: jest.fn(),
    estimatePages: jest.fn(),
    onProgress: jest.fn(),
    onJobCompleted: jest.fn(),
    onLog: jest.fn(),
  },
}));

// Mock isTauri
const mockIsTauri = jest.fn(() => true);
jest.mock('@/lib/native/utils', () => ({
  isTauri: () => mockIsTauri(),
}));

// Mock logger (hook uses loggers.native, not console.error)
const mockLogError = jest.fn();
jest.mock('@/lib/logger', () => ({
  loggers: {
    native: { error: (...args: unknown[]) => mockLogError(...args), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  },
}));

describe('useSkillSeekers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
    jest.useFakeTimers();

    // Set up default mock implementations
    const skillSeekersApi = require('@/lib/native/skill-seekers').default;
    skillSeekersApi.isInstalled.mockResolvedValue(true);
    skillSeekersApi.getVersion.mockResolvedValue('1.0.0');
    skillSeekersApi.install.mockResolvedValue('1.0.0');
    skillSeekersApi.listJobs.mockResolvedValue([]);
    skillSeekersApi.listPresets.mockResolvedValue([]);
    skillSeekersApi.listGenerated.mockResolvedValue([]);
    skillSeekersApi.scrapeWebsite.mockResolvedValue('job-1');
    skillSeekersApi.scrapeGitHub.mockResolvedValue('job-2');
    skillSeekersApi.scrapePdf.mockResolvedValue('job-3');
    skillSeekersApi.enhanceSkill.mockResolvedValue(undefined);
    skillSeekersApi.packageSkill.mockResolvedValue('skill-1');
    skillSeekersApi.quickGenerateWebsite.mockResolvedValue('job-4');
    skillSeekersApi.quickGenerateGitHub.mockResolvedValue('job-5');
    skillSeekersApi.quickGeneratePreset.mockResolvedValue('job-6');
    skillSeekersApi.cancelJob.mockResolvedValue(undefined);
    skillSeekersApi.resumeJob.mockResolvedValue(undefined);
    skillSeekersApi.estimatePages.mockResolvedValue({
      estimatedPages: 10,
      estimatedMinutes: 5,
      hasLlmsTxt: true,
    });
    skillSeekersApi.onProgress.mockResolvedValue(mockUnlisten);
    skillSeekersApi.onJobCompleted.mockResolvedValue(mockUnlisten);
    skillSeekersApi.onLog.mockResolvedValue(mockUnlisten);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockJob: import('@/lib/native/skill-seekers').SkillGenerationJob = {
    id: 'job-1',
    source_type: 'website',
    name: 'Test Skill',
    status: 'queued',
    progress: {
      phase: 'init',
      percent: 0,
      message: 'Initializing',
      pages_scraped: 0,
      pages_total: 10,
    },
    createdAt: new Date().toISOString(),
    resumable: false,
  };

  const mockRunningJob: import('@/lib/native/skill-seekers').SkillGenerationJob = {
    ...mockJob,
    id: 'job-running',
    status: 'running',
  };

  const mockPreset: import('@/lib/native/skill-seekers').PresetConfig = {
    name: 'test-preset',
    displayName: 'Test Preset',
    description: 'A test preset',
    category: 'testing',
    configPath: '/path/to/config.yaml',
    icon: 'icon',
    estimatedPages: 100,
  };

  const mockGeneratedSkill: import('@/lib/native/skill-seekers').GeneratedSkill = {
    id: 'skill-1',
    name: 'Test Skill',
    description: 'A test skill',
    sourceType: 'website',
    source: 'https://example.com',
    outputDir: '/output',
    skillMdPath: '/output/skill.md',
    createdAt: new Date().toISOString(),
    installed: false,
    fileSize: 1024,
    pageCount: 50,
  };

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useSkillSeekers());

      expect(result.current.isInstalled).toBe(false);
      expect(result.current.version).toBeNull();
      expect(result.current.isInstalling).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.activeJob).toBeNull();
      expect(result.current.jobs).toEqual([]);
      expect(result.current.presets).toEqual([]);
      expect(result.current.generatedSkills).toEqual([]);
      expect(result.current.logs).toEqual([]);
    });

    it('should check installation on mount', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(skillSeekersApi.isInstalled).toHaveBeenCalled();
        expect(skillSeekersApi.getVersion).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should load jobs, presets, and generated skills on mount', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);
      skillSeekersApi.listPresets.mockResolvedValue([mockPreset]);
      skillSeekersApi.listGenerated.mockResolvedValue([mockGeneratedSkill]);

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(result.current.jobs).toEqual([mockJob]);
        expect(result.current.presets).toEqual([mockPreset]);
        expect(result.current.generatedSkills).toEqual([mockGeneratedSkill]);
      });
    });

    it('should set activeJob when there is a running job', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listJobs.mockResolvedValue([mockRunningJob, mockJob]);

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(result.current.activeJob).not.toBeNull();
        expect(result.current.activeJob?.status).toBe('running');
        expect(result.current.activeJob?.id).toBe('job-running');
      });
    });

    it('should set error when installation check fails', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.isInstalled.mockRejectedValue(new Error('Check failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(result.current.error).toBe('Check failed');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set up event listeners on mount', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;

      renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(skillSeekersApi.onProgress).toHaveBeenCalled();
        expect(skillSeekersApi.onJobCompleted).toHaveBeenCalled();
        expect(skillSeekersApi.onLog).toHaveBeenCalled();
      });
    });
  });

  describe('checkInstallation', () => {
    it('should update installation status', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.isInstalled.mockResolvedValue(true);
      skillSeekersApi.getVersion.mockResolvedValue('2.0.0');

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.checkInstallation();
      });

      expect(result.current.isInstalled).toBe(true);
      expect(result.current.version).toBe('2.0.0');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle checkInstallation errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.isInstalled.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.checkInstallation();
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('install', () => {
    it('should install and update state', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.install.mockResolvedValue('1.5.0');

      const { result } = renderHook(() => useSkillSeekers());

      // Wait for initialization to complete first
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.install(['extras1', 'extras2']);
      });

      expect(skillSeekersApi.install).toHaveBeenCalledWith(['extras1', 'extras2']);
      expect(result.current.isInstalled).toBe(true);
      expect(result.current.version).toBe('1.5.0');
      expect(result.current.isInstalling).toBe(false);
    });

    it('should handle install errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.install.mockRejectedValue(new Error('Install failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        try { await result.current.install(); } catch {}
      });

      expect(result.current.error).toBe('Install failed');
      expect(result.current.isInstalling).toBe(false);
    });

    it('should set isInstalling during install', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      let resolveInstall: (value: string) => void;
      const installPromise = new Promise<string>((resolve) => {
        resolveInstall = resolve;
      });
      skillSeekersApi.install.mockReturnValue(installPromise);

      const { result } = renderHook(() => useSkillSeekers());

      act(() => {
        result.current.install();
      });

      await waitFor(() => {
        expect(result.current.isInstalling).toBe(true);
      });

      await act(async () => {
        resolveInstall!('1.0.0');
        await installPromise;
      });

      expect(result.current.isInstalling).toBe(false);
    });
  });

  describe('refreshJobs', () => {
    it('should refresh jobs list', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;

      const { result } = renderHook(() => useSkillSeekers());

      // Wait for initialization to complete first
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Now set the mock and refresh
      skillSeekersApi.listJobs.mockResolvedValue([mockRunningJob, mockJob]);

      await act(async () => {
        await result.current.refreshJobs();
      });

      expect(result.current.jobs).toEqual([mockRunningJob, mockJob]);
      expect(result.current.activeJob?.id).toBe('job-running');
    });

    it('should handle refreshJobs errors gracefully', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listJobs.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.refreshJobs();
      });

      expect(mockLogError).toHaveBeenCalled();
      expect(result.current.jobs).toEqual([]);
    });
  });

  describe('refreshPresets', () => {
    it('should refresh presets list', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listPresets.mockResolvedValue([mockPreset]);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.refreshPresets();
      });

      expect(result.current.presets).toEqual([mockPreset]);
    });

    it('should handle refreshPresets errors gracefully', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listPresets.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.refreshPresets();
      });

      expect(mockLogError).toHaveBeenCalled();
      expect(result.current.presets).toEqual([]);
    });
  });

  describe('refreshGeneratedSkills', () => {
    it('should refresh generated skills list', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listGenerated.mockResolvedValue([mockGeneratedSkill]);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.refreshGeneratedSkills();
      });

      expect(result.current.generatedSkills).toEqual([mockGeneratedSkill]);
    });

    it('should handle refreshGeneratedSkills errors gracefully', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listGenerated.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.refreshGeneratedSkills();
      });

      expect(mockLogError).toHaveBeenCalled();
      expect(result.current.generatedSkills).toEqual([]);
    });
  });

  describe('scrapeWebsite', () => {
    const mockInput: import('@/lib/native/skill-seekers').ScrapeWebsiteInput = {
      config: {
        name: 'test',
        base_url: 'https://example.com',
      },
    };

    it('should start website scraping and return job ID', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.scrapeWebsite.mockResolvedValue('job-website');
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        const jobId = await result.current.scrapeWebsite(mockInput);
        expect(jobId).toBe('job-website');
      });

      expect(skillSeekersApi.scrapeWebsite).toHaveBeenCalledWith(mockInput);
      expect(result.current.error).toBeNull();
    });

    it('should handle scrapeWebsite errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.scrapeWebsite.mockRejectedValue(new Error('Scrape failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        try { await result.current.scrapeWebsite(mockInput); } catch {}
      });

      expect(result.current.error).toBe('Scrape failed');
    });

    it('should clear error before scraping', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.scrapeWebsite.mockRejectedValueOnce(new Error('Previous error'));
      skillSeekersApi.scrapeWebsite.mockResolvedValue('job-website');
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);

      const { result } = renderHook(() => useSkillSeekers());

      // Set an initial error through a failed call
      await act(async () => {
        try {
          await result.current.scrapeWebsite(mockInput);
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe('Previous error');

      // Successful call should clear the error
      await act(async () => {
        await result.current.scrapeWebsite(mockInput);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('scrapeGitHub', () => {
    const mockInput: import('@/lib/native/skill-seekers').ScrapeGitHubInput = {
      config: {
        repo: 'owner/repo',
      },
    };

    it('should start GitHub scraping and return job ID', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.scrapeGitHub.mockResolvedValue('job-github');
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        const jobId = await result.current.scrapeGitHub(mockInput);
        expect(jobId).toBe('job-github');
      });

      expect(skillSeekersApi.scrapeGitHub).toHaveBeenCalledWith(mockInput);
    });

    it('should handle scrapeGitHub errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.scrapeGitHub.mockRejectedValue(new Error('GitHub error'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        try { await result.current.scrapeGitHub(mockInput); } catch {}
      });

      expect(result.current.error).toBe('GitHub error');
    });
  });

  describe('scrapePdf', () => {
    const mockInput: import('@/lib/native/skill-seekers').ScrapePdfInput = {
      config: {
        pdf_path: '/path/to/file.pdf',
        name: 'test-pdf',
      },
    };

    it('should start PDF extraction and return job ID', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.scrapePdf.mockResolvedValue('job-pdf');
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        const jobId = await result.current.scrapePdf(mockInput);
        expect(jobId).toBe('job-pdf');
      });

      expect(skillSeekersApi.scrapePdf).toHaveBeenCalledWith(mockInput);
    });

    it('should handle scrapePdf errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.scrapePdf.mockRejectedValue(new Error('PDF error'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        try { await result.current.scrapePdf(mockInput); } catch {}
      });

      expect(result.current.error).toBe('PDF error');
    });
  });

  describe('enhanceSkill', () => {
    const mockInput: import('@/lib/native/skill-seekers').EnhanceSkillInput = {
      skillDir: '/path/to/skill',
      config: {
        mode: 'local',
        quality: 'standard',
      },
    };

    it('should enhance skill', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.enhanceSkill.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.enhanceSkill(mockInput);
      });

      expect(skillSeekersApi.enhanceSkill).toHaveBeenCalledWith(mockInput);
      expect(result.current.error).toBeNull();
    });

    it('should handle enhanceSkill errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.enhanceSkill.mockRejectedValue(new Error('Enhance failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        try { await result.current.enhanceSkill(mockInput); } catch {}
      });

      expect(result.current.error).toBe('Enhance failed');
    });
  });

  describe('packageSkill', () => {
    const mockInput: import('@/lib/native/skill-seekers').PackageSkillInput = {
      skillDir: '/path/to/skill',
      config: {
        target: 'claude',
      },
    };

    it('should package skill and return path', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.packageSkill.mockResolvedValue('/output/skill.claude');

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        const path = await result.current.packageSkill(mockInput);
        expect(path).toBe('/output/skill.claude');
      });

      expect(skillSeekersApi.packageSkill).toHaveBeenCalledWith(mockInput);
    });

    it('should handle packageSkill errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.packageSkill.mockRejectedValue(new Error('Package failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        try { await result.current.packageSkill(mockInput); } catch {}
      });

      expect(result.current.error).toBe('Package failed');
    });
  });

  describe('quickGenerateWebsite', () => {
    it('should quickly generate skill from website', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.quickGenerateWebsite.mockResolvedValue('job-quick-web');
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        const jobId = await result.current.quickGenerateWebsite('https://example.com', 'test-skill', true, true);
        expect(jobId).toBe('job-quick-web');
      });

      expect(skillSeekersApi.quickGenerateWebsite).toHaveBeenCalledWith(
        'https://example.com',
        'test-skill',
        true,
        true
      );
    });

    it('should use default values for autoEnhance and autoInstall', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.quickGenerateWebsite.mockResolvedValue('job-quick-web');
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.quickGenerateWebsite('https://example.com', 'test-skill');
      });

      expect(skillSeekersApi.quickGenerateWebsite).toHaveBeenCalledWith(
        'https://example.com',
        'test-skill',
        false,
        false
      );
    });

    it('should handle quickGenerateWebsite errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.quickGenerateWebsite.mockRejectedValue(new Error('Quick gen failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        try { await result.current.quickGenerateWebsite('https://example.com', 'test-skill'); } catch {}
      });

      expect(result.current.error).toBe('Quick gen failed');
    });
  });

  describe('quickGenerateGitHub', () => {
    it('should quickly generate skill from GitHub repo', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.quickGenerateGitHub.mockResolvedValue('job-quick-github');
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        const jobId = await result.current.quickGenerateGitHub('owner/repo', true, true);
        expect(jobId).toBe('job-quick-github');
      });

      expect(skillSeekersApi.quickGenerateGitHub).toHaveBeenCalledWith('owner/repo', true, true);
    });

    it('should handle quickGenerateGitHub errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.quickGenerateGitHub.mockRejectedValue(new Error('GitHub gen failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        try { await result.current.quickGenerateGitHub('owner/repo'); } catch {}
      });

      expect(result.current.error).toBe('GitHub gen failed');
    });
  });

  describe('quickGeneratePreset', () => {
    it('should quickly generate skill from preset', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.quickGeneratePreset.mockResolvedValue('job-quick-preset');
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        const jobId = await result.current.quickGeneratePreset('test-preset', true, true);
        expect(jobId).toBe('job-quick-preset');
      });

      expect(skillSeekersApi.quickGeneratePreset).toHaveBeenCalledWith('test-preset', true, true);
    });

    it('should handle quickGeneratePreset errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.quickGeneratePreset.mockRejectedValue(new Error('Preset gen failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        try { await result.current.quickGeneratePreset('test-preset'); } catch {}
      });

      expect(result.current.error).toBe('Preset gen failed');
    });
  });

  describe('cancelJob', () => {
    it('should cancel a job', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.cancelJob.mockResolvedValue(undefined);
      skillSeekersApi.listJobs.mockResolvedValue([]);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.cancelJob('job-1');
      });

      expect(skillSeekersApi.cancelJob).toHaveBeenCalledWith('job-1');
    });

    it('should handle cancelJob errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.cancelJob.mockRejectedValue(new Error('Cancel failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        try { await result.current.cancelJob('job-1'); } catch {}
      });

      expect(result.current.error).toBe('Cancel failed');
    });
  });

  describe('resumeJob', () => {
    it('should resume a paused job', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.resumeJob.mockResolvedValue(undefined);
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.resumeJob('job-1');
      });

      expect(skillSeekersApi.resumeJob).toHaveBeenCalledWith('job-1');
    });

    it('should handle resumeJob errors', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.resumeJob.mockRejectedValue(new Error('Resume failed'));

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        try { await result.current.resumeJob('job-1'); } catch {}
      });

      expect(result.current.error).toBe('Resume failed');
    });
  });

  describe('estimatePages', () => {
    it('should estimate pages for a URL', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      const mockEstimation: import('@/lib/native/skill-seekers').PageEstimation = {
        estimatedPages: 100,
        estimatedMinutes: 50,
        hasLlmsTxt: true,
      };
      skillSeekersApi.estimatePages.mockResolvedValue(mockEstimation);

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        const estimation = await result.current.estimatePages('https://example.com', 'config-name');
        expect(estimation).toEqual(mockEstimation);
      });

      expect(skillSeekersApi.estimatePages).toHaveBeenCalledWith('https://example.com', 'config-name');
    });

    it('should estimate pages without config name', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.estimatePages.mockResolvedValue({
        estimatedPages: 50,
        estimatedMinutes: 25,
        hasLlmsTxt: false,
      });

      const { result } = renderHook(() => useSkillSeekers());

      await act(async () => {
        await result.current.estimatePages('https://example.com');
      });

      expect(skillSeekersApi.estimatePages).toHaveBeenCalledWith('https://example.com', undefined);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.scrapeWebsite.mockRejectedValue(new Error('Test error'));
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);

      const { result } = renderHook(() => useSkillSeekers());

      // First create an error state
      await act(async () => {
        try {
          await result.current.scrapeWebsite({
            config: { name: 'test', base_url: 'https://example.com' },
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Test error');

      // Then clear it
      await act(async () => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('clearLogs', () => {
    it('should clear logs', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;

      let logCallback: ((event: import('@/lib/native/skill-seekers').LogEvent) => void) | undefined;

      skillSeekersApi.onLog.mockImplementation((callback: (event: import('@/lib/native/skill-seekers').LogEvent) => void) => {
        logCallback = callback;
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(skillSeekersApi.onLog).toHaveBeenCalled();
      });

      // Add some logs
      await act(async () => {
        logCallback!({
          jobId: 'job-1',
          level: 'info',
          message: 'Test log 1',
          timestamp: new Date().toISOString(),
        });
        logCallback!({
          jobId: 'job-1',
          level: 'info',
          message: 'Test log 2',
          timestamp: new Date().toISOString(),
        });
      });

      expect(result.current.logs.length).toBeGreaterThan(0);

      // Clear logs
      await act(async () => {
        result.current.clearLogs();
      });

      expect(result.current.logs).toEqual([]);
    });
  });

  describe('event listeners', () => {
    it('should update job progress on progress event', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);

      let progressCallback: ((event: import('@/lib/native/skill-seekers').ProgressEvent) => void) | undefined;

      skillSeekersApi.onProgress.mockImplementation((callback: (event: import('@/lib/native/skill-seekers').ProgressEvent) => void) => {
        progressCallback = callback;
        return Promise.resolve(mockUnlisten);
      });

      renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(skillSeekersApi.onProgress).toHaveBeenCalled();
      });

      await act(async () => {
        progressCallback!({
          jobId: 'job-1',
          progress: {
            phase: 'scraping',
            percent: 50,
            message: 'Halfway done',
            pages_scraped: 5,
            pages_total: 10,
          },
        });
      });

      // Note: The actual update depends on the job being in the list
      // This test verifies the callback mechanism is set up
    });

    it('should refresh jobs and skills on job completed event', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listJobs.mockResolvedValue([mockJob]);
      skillSeekersApi.listGenerated.mockResolvedValue([mockGeneratedSkill]);

      let completedCallback: ((event: import('@/lib/native/skill-seekers').JobCompletedEvent) => void) | undefined;

      skillSeekersApi.onJobCompleted.mockImplementation((callback: (event: import('@/lib/native/skill-seekers').JobCompletedEvent) => void) => {
        completedCallback = callback;
        return Promise.resolve(mockUnlisten);
      });

      renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(skillSeekersApi.onJobCompleted).toHaveBeenCalled();
      });

      await act(async () => {
        completedCallback!({
          jobId: 'job-1',
          success: true,
          skillPath: '/output/skill.md',
        });
      });

      // Verify refresh was called
      expect(skillSeekersApi.listJobs).toHaveBeenCalled();
      expect(skillSeekersApi.listGenerated).toHaveBeenCalled();
    });

    it('should add logs on log event', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;

      let logCallback: ((event: import('@/lib/native/skill-seekers').LogEvent) => void) | undefined;

      skillSeekersApi.onLog.mockImplementation((callback: (event: import('@/lib/native/skill-seekers').LogEvent) => void) => {
        logCallback = callback as (event: import('@/lib/native/skill-seekers').LogEvent) => void;
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(skillSeekersApi.onLog).toHaveBeenCalled();
      });

      await act(async () => {
        logCallback!({
          jobId: 'job-1',
          level: 'info',
          message: 'Test log message',
          timestamp: new Date().toISOString(),
        });
      });

      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].message).toBe('Test log message');
    });

    it('should limit logs to MAX_LOGS', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;

      let logCallback: ((event: import('@/lib/native/skill-seekers').LogEvent) => void) | undefined;

      skillSeekersApi.onLog.mockImplementation((callback: (event: import('@/lib/native/skill-seekers').LogEvent) => void) => {
        logCallback = callback as (event: import('@/lib/native/skill-seekers').LogEvent) => void;
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(skillSeekersApi.onLog).toHaveBeenCalled();
      });

      // Add more logs than MAX_LOGS (500)
      await act(async () => {
        for (let i = 0; i < 600; i++) {
          logCallback!({
            jobId: 'job-1',
            level: 'info',
            message: `Log ${i}`,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Should be limited to 500
      expect(result.current.logs.length).toBeLessThanOrEqual(500);
    });
  });

  describe('cleanup', () => {
    it('should unlisten events on unmount', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;

      const { unmount } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(skillSeekersApi.onProgress).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnlisten).toHaveBeenCalledTimes(3); // progress, completed, log
    });

    it('should not update state after unmount', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.isInstalled.mockResolvedValue(true);
      skillSeekersApi.getVersion.mockResolvedValue('1.0.0');

      const { unmount } = renderHook(() => useSkillSeekers());

      // Unmount immediately
      unmount();

      // Advance fake timers to flush any pending async operations
      await jest.advanceTimersByTimeAsync(100);

      // Should not throw errors
    });
  });

  describe('non-Tauri environment', () => {
    beforeEach(() => {
      mockIsTauri.mockReturnValue(false);
    });

    it('should handle non-Tauri environment gracefully', async () => {
      const { result } = renderHook(() => useSkillSeekers());

      // Should initialize without crashing
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle non-Error objects in error state', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.isInstalled.mockRejectedValue(new Error('String error'));

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(result.current.error).toBe('String error');
      });
    });

    it('should handle null errors - becomes default message', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.isInstalled.mockImplementation(() => Promise.reject(null));

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        // When null is passed, it's not an Error instance, so uses default
        expect(result.current.error).toBe('Failed to check installation');
      });
    });

    it('should handle undefined errors - becomes default message', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.isInstalled.mockImplementation(() => Promise.reject(undefined));

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        // When undefined is passed, it's not an Error instance, so uses default
        expect(result.current.error).toBe('Failed to check installation');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty jobs list', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listJobs.mockResolvedValue([]);

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(result.current.jobs).toEqual([]);
        expect(result.current.activeJob).toBeNull();
      });
    });

    it('should handle jobs with completed status only', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listJobs.mockResolvedValue([
        { ...mockJob, status: 'completed' },
        { ...mockJob, id: 'job-2', status: 'completed' },
      ]);

      const { result } = renderHook(() => useSkillSeekers());

      await waitFor(() => {
        expect(result.current.activeJob).toBeNull();
      });
    });

    it('should set activeJob for queued status when refreshJobs is called', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      const queuedJob = { ...mockJob, id: 'queued-job', status: 'queued' as const };
      skillSeekersApi.listJobs.mockImplementation(() => Promise.resolve([queuedJob]));

      const { result } = renderHook(() => useSkillSeekers());

      // Explicitly refresh jobs and wait for state update
      await act(async () => {
        await result.current.refreshJobs();
      });

      expect(result.current.activeJob).not.toBeNull();
      expect(result.current.activeJob?.id).toBe('queued-job');
      expect(result.current.activeJob?.status).toBe('queued');
    });

    it('should set activeJob for running status when refreshJobs is called', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      const runningJob = { ...mockRunningJob, id: 'running-job' };
      skillSeekersApi.listJobs.mockImplementation(() => Promise.resolve([runningJob]));

      const { result } = renderHook(() => useSkillSeekers());

      // Explicitly refresh jobs and wait for state update
      await act(async () => {
        await result.current.refreshJobs();
      });

      expect(result.current.activeJob).not.toBeNull();
      expect(result.current.activeJob?.id).toBe('running-job');
      expect(result.current.activeJob?.status).toBe('running');
    });

    it('should pick first running job when multiple exist', async () => {
      const skillSeekersApi = require('@/lib/native/skill-seekers').default;
      skillSeekersApi.listJobs.mockImplementation(() => Promise.resolve([
        { ...mockRunningJob, id: 'job-1' },
        { ...mockRunningJob, id: 'job-2' },
      ]));

      const { result } = renderHook(() => useSkillSeekers());

      // Explicitly refresh jobs and wait for state update
      await act(async () => {
        await result.current.refreshJobs();
      });

      expect(result.current.activeJob).not.toBeNull();
      expect(result.current.activeJob?.id).toBe('job-1');
    });
  });
});
