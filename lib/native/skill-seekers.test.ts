/**
 * Skill Seekers Native API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { invoke } from '@tauri-apps/api/core';
import skillSeekersApi, {
  isInstalled,
  getVersion,
  install,
  getConfig,
  listPresets,
  scrapeWebsite,
  scrapeGitHub,
  listJobs,
  getJob,
  cancelJob,
  quickGenerateWebsite,
  quickGenerateGitHub,
} from './skill-seekers';

const mockInvoke = vi.mocked(invoke);

describe('Skill Seekers Native API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, '__TAURI__', { value: true, writable: true });
  });

  describe('Installation API', () => {
    it('should check if skill-seekers is installed', async () => {
      mockInvoke.mockResolvedValueOnce(true);
      const result = await isInstalled();
      expect(result).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_is_installed');
    });

    it('should get installed version', async () => {
      mockInvoke.mockResolvedValueOnce('1.2.3');
      const result = await getVersion();
      expect(result).toBe('1.2.3');
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_get_version');
    });

    it('should install skill-seekers with extras', async () => {
      mockInvoke.mockResolvedValueOnce('1.2.3');
      const result = await install(['gemini', 'openai']);
      expect(result).toBe('1.2.3');
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_install', { extras: ['gemini', 'openai'] });
    });
  });

  describe('Configuration API', () => {
    it('should get service configuration', async () => {
      const mockConfig = {
        outputDir: '/path/to/output',
        venvPath: '/path/to/venv',
        defaultProvider: 'anthropic',
        autoEnhance: false,
        autoInstall: true,
        checkpointInterval: 60,
      };
      mockInvoke.mockResolvedValueOnce(mockConfig);
      const result = await getConfig();
      expect(result).toEqual(mockConfig);
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_get_config');
    });

    it('should list available presets', async () => {
      const mockPresets = [
        { name: 'react', displayName: 'React', description: 'React docs', category: 'frontend' },
        { name: 'vue', displayName: 'Vue', description: 'Vue docs', category: 'frontend' },
      ];
      mockInvoke.mockResolvedValueOnce(mockPresets);
      const result = await listPresets();
      expect(result).toEqual(mockPresets);
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_list_presets');
    });
  });

  describe('Scraping API', () => {
    it('should scrape a website', async () => {
      mockInvoke.mockResolvedValueOnce('job-123');
      const input = {
        config: {
          name: 'Test Docs',
          base_url: 'https://docs.example.com',
        },
      };
      const result = await scrapeWebsite(input);
      expect(result).toBe('job-123');
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_scrape_website', { input });
    });

    it('should scrape a GitHub repository', async () => {
      mockInvoke.mockResolvedValueOnce('job-456');
      const input = {
        config: {
          repo: 'facebook/react',
        },
      };
      const result = await scrapeGitHub(input);
      expect(result).toBe('job-456');
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_scrape_github', { input });
    });
  });

  describe('Job Management API', () => {
    it('should list all jobs', async () => {
      const mockJobs = [
        { id: 'job-1', name: 'Job 1', status: 'completed' },
        { id: 'job-2', name: 'Job 2', status: 'running' },
      ];
      mockInvoke.mockResolvedValueOnce(mockJobs);
      const result = await listJobs();
      expect(result).toEqual(mockJobs);
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_list_jobs');
    });

    it('should get job by ID', async () => {
      const mockJob = { id: 'job-1', name: 'Job 1', status: 'completed' };
      mockInvoke.mockResolvedValueOnce(mockJob);
      const result = await getJob('job-1');
      expect(result).toEqual(mockJob);
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_get_job', { jobId: 'job-1' });
    });

    it('should cancel a running job', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await cancelJob('job-1');
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_cancel_job', { jobId: 'job-1' });
    });
  });

  describe('Quick Generate API', () => {
    it('should quick generate from website', async () => {
      mockInvoke.mockResolvedValueOnce('job-789');
      const result = await quickGenerateWebsite('https://docs.example.com', 'Example Docs', true, true);
      expect(result).toBe('job-789');
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_quick_generate_website', {
        url: 'https://docs.example.com',
        name: 'Example Docs',
        autoEnhance: true,
        autoInstall: true,
      });
    });

    it('should quick generate from GitHub', async () => {
      mockInvoke.mockResolvedValueOnce('job-012');
      const result = await quickGenerateGitHub('facebook/react', false, true);
      expect(result).toBe('job-012');
      expect(mockInvoke).toHaveBeenCalledWith('skill_seekers_quick_generate_github', {
        repo: 'facebook/react',
        autoEnhance: false,
        autoInstall: true,
      });
    });
  });

  describe('Default Export', () => {
    it('should export all API functions', () => {
      expect(skillSeekersApi.isInstalled).toBeDefined();
      expect(skillSeekersApi.getVersion).toBeDefined();
      expect(skillSeekersApi.install).toBeDefined();
      expect(skillSeekersApi.getConfig).toBeDefined();
      expect(skillSeekersApi.listPresets).toBeDefined();
      expect(skillSeekersApi.scrapeWebsite).toBeDefined();
      expect(skillSeekersApi.scrapeGitHub).toBeDefined();
      expect(skillSeekersApi.scrapePdf).toBeDefined();
      expect(skillSeekersApi.enhanceSkill).toBeDefined();
      expect(skillSeekersApi.packageSkill).toBeDefined();
      expect(skillSeekersApi.listJobs).toBeDefined();
      expect(skillSeekersApi.getJob).toBeDefined();
      expect(skillSeekersApi.cancelJob).toBeDefined();
      expect(skillSeekersApi.resumeJob).toBeDefined();
      expect(skillSeekersApi.quickGenerateWebsite).toBeDefined();
      expect(skillSeekersApi.quickGenerateGitHub).toBeDefined();
      expect(skillSeekersApi.quickGeneratePreset).toBeDefined();
      expect(skillSeekersApi.onProgress).toBeDefined();
      expect(skillSeekersApi.onJobCompleted).toBeDefined();
      expect(skillSeekersApi.onLog).toBeDefined();
    });
  });
});
