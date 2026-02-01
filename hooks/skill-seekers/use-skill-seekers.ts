'use client';

/**
 * useSkillSeekers Hook
 *
 * Main hook for Skill Seekers integration providing:
 * - Installation status and management
 * - Skill generation from websites, GitHub, and PDFs
 * - Progress tracking and job management
 * - Configuration management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { UnlistenFn } from '@tauri-apps/api/event';
import skillSeekersApi, {
  type SkillGenerationJob,
  type ProgressEvent,
  type JobCompletedEvent,
  type LogEvent,
  type ScrapeWebsiteInput,
  type ScrapeGitHubInput,
  type ScrapePdfInput,
  type EnhanceSkillInput,
  type PackageSkillInput,
  type PresetConfig,
  type GeneratedSkill,
  type PageEstimation,
} from '@/lib/native/skill-seekers';
import { loggers } from '@/lib/logger';

const log = loggers.native;

export interface UseSkillSeekersState {
  isInstalled: boolean;
  version: string | null;
  isInstalling: boolean;
  isLoading: boolean;
  error: string | null;
  activeJob: SkillGenerationJob | null;
  jobs: SkillGenerationJob[];
  presets: PresetConfig[];
  generatedSkills: GeneratedSkill[];
  logs: LogEvent[];
}

export interface UseSkillSeekersActions {
  checkInstallation: () => Promise<void>;
  install: (extras?: string[]) => Promise<void>;
  scrapeWebsite: (input: ScrapeWebsiteInput) => Promise<string>;
  scrapeGitHub: (input: ScrapeGitHubInput) => Promise<string>;
  scrapePdf: (input: ScrapePdfInput) => Promise<string>;
  enhanceSkill: (input: EnhanceSkillInput) => Promise<void>;
  packageSkill: (input: PackageSkillInput) => Promise<string>;
  quickGenerateWebsite: (url: string, name: string, autoEnhance?: boolean, autoInstall?: boolean) => Promise<string>;
  quickGenerateGitHub: (repo: string, autoEnhance?: boolean, autoInstall?: boolean) => Promise<string>;
  quickGeneratePreset: (presetName: string, autoEnhance?: boolean, autoInstall?: boolean) => Promise<string>;
  cancelJob: (jobId: string) => Promise<void>;
  resumeJob: (jobId: string) => Promise<void>;
  refreshJobs: () => Promise<void>;
  refreshPresets: () => Promise<void>;
  refreshGeneratedSkills: () => Promise<void>;
  estimatePages: (url: string, configName?: string) => Promise<PageEstimation>;
  clearError: () => void;
  clearLogs: () => void;
}

export type UseSkillSeekersReturn = UseSkillSeekersState & UseSkillSeekersActions;

const MAX_LOGS = 500;

export function useSkillSeekers(): UseSkillSeekersReturn {
  const [state, setState] = useState<UseSkillSeekersState>({
    isInstalled: false,
    version: null,
    isInstalling: false,
    isLoading: true,
    error: null,
    activeJob: null,
    jobs: [],
    presets: [],
    generatedSkills: [],
    logs: [],
  });

  const unlistenersRef = useRef<UnlistenFn[]>([]);
  const mountedRef = useRef(true);

  const safeSetState = useCallback((updater: Partial<UseSkillSeekersState> | ((prev: UseSkillSeekersState) => UseSkillSeekersState)) => {
    if (mountedRef.current) {
      if (typeof updater === 'function') {
        setState(updater);
      } else {
        setState(prev => ({ ...prev, ...updater }));
      }
    }
  }, []);

  const checkInstallation = useCallback(async () => {
    try {
      const [installed, version] = await Promise.all([
        skillSeekersApi.isInstalled(),
        skillSeekersApi.getVersion(),
      ]);
      safeSetState({ isInstalled: installed, version, isLoading: false });
    } catch (err) {
      safeSetState({
        error: err instanceof Error ? err.message : 'Failed to check installation',
        isLoading: false,
      });
    }
  }, [safeSetState]);

  const install = useCallback(async (extras?: string[]) => {
    safeSetState({ isInstalling: true, error: null });
    try {
      const version = await skillSeekersApi.install(extras);
      safeSetState({ isInstalled: true, version, isInstalling: false });
    } catch (err) {
      safeSetState({
        error: err instanceof Error ? err.message : 'Installation failed',
        isInstalling: false,
      });
      throw err;
    }
  }, [safeSetState]);

  const refreshJobs = useCallback(async () => {
    try {
      const jobs = await skillSeekersApi.listJobs();
      const activeJob = jobs.find(j => j.status === 'running' || j.status === 'queued') || null;
      safeSetState({ jobs, activeJob });
    } catch (err) {
      log.error('Failed to refresh jobs', err as Error);
    }
  }, [safeSetState]);

  const refreshPresets = useCallback(async () => {
    try {
      const presets = await skillSeekersApi.listPresets();
      safeSetState({ presets });
    } catch (err) {
      log.error('Failed to refresh presets', err as Error);
    }
  }, [safeSetState]);

  const refreshGeneratedSkills = useCallback(async () => {
    try {
      const generatedSkills = await skillSeekersApi.listGenerated();
      safeSetState({ generatedSkills });
    } catch (err) {
      log.error('Failed to refresh generated skills', err as Error);
    }
  }, [safeSetState]);

  const scrapeWebsite = useCallback(async (input: ScrapeWebsiteInput): Promise<string> => {
    safeSetState({ error: null });
    try {
      const jobId = await skillSeekersApi.scrapeWebsite(input);
      await refreshJobs();
      return jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start website scraping';
      safeSetState({ error: message });
      throw err;
    }
  }, [safeSetState, refreshJobs]);

  const scrapeGitHub = useCallback(async (input: ScrapeGitHubInput): Promise<string> => {
    safeSetState({ error: null });
    try {
      const jobId = await skillSeekersApi.scrapeGitHub(input);
      await refreshJobs();
      return jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start GitHub scraping';
      safeSetState({ error: message });
      throw err;
    }
  }, [safeSetState, refreshJobs]);

  const scrapePdf = useCallback(async (input: ScrapePdfInput): Promise<string> => {
    safeSetState({ error: null });
    try {
      const jobId = await skillSeekersApi.scrapePdf(input);
      await refreshJobs();
      return jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start PDF extraction';
      safeSetState({ error: message });
      throw err;
    }
  }, [safeSetState, refreshJobs]);

  const enhanceSkill = useCallback(async (input: EnhanceSkillInput): Promise<void> => {
    safeSetState({ error: null });
    try {
      await skillSeekersApi.enhanceSkill(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enhance skill';
      safeSetState({ error: message });
      throw err;
    }
  }, [safeSetState]);

  const packageSkill = useCallback(async (input: PackageSkillInput): Promise<string> => {
    safeSetState({ error: null });
    try {
      return await skillSeekersApi.packageSkill(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to package skill';
      safeSetState({ error: message });
      throw err;
    }
  }, [safeSetState]);

  const quickGenerateWebsite = useCallback(async (
    url: string,
    name: string,
    autoEnhance = false,
    autoInstall = false
  ): Promise<string> => {
    safeSetState({ error: null });
    try {
      const jobId = await skillSeekersApi.quickGenerateWebsite(url, name, autoEnhance, autoInstall);
      await refreshJobs();
      return jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate skill from website';
      safeSetState({ error: message });
      throw err;
    }
  }, [safeSetState, refreshJobs]);

  const quickGenerateGitHub = useCallback(async (
    repo: string,
    autoEnhance = false,
    autoInstall = false
  ): Promise<string> => {
    safeSetState({ error: null });
    try {
      const jobId = await skillSeekersApi.quickGenerateGitHub(repo, autoEnhance, autoInstall);
      await refreshJobs();
      return jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate skill from GitHub';
      safeSetState({ error: message });
      throw err;
    }
  }, [safeSetState, refreshJobs]);

  const quickGeneratePreset = useCallback(async (
    presetName: string,
    autoEnhance = false,
    autoInstall = false
  ): Promise<string> => {
    safeSetState({ error: null });
    try {
      const jobId = await skillSeekersApi.quickGeneratePreset(presetName, autoEnhance, autoInstall);
      await refreshJobs();
      return jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate skill from preset';
      safeSetState({ error: message });
      throw err;
    }
  }, [safeSetState, refreshJobs]);

  const cancelJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      await skillSeekersApi.cancelJob(jobId);
      await refreshJobs();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel job';
      safeSetState({ error: message });
      throw err;
    }
  }, [safeSetState, refreshJobs]);

  const resumeJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      await skillSeekersApi.resumeJob(jobId);
      await refreshJobs();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume job';
      safeSetState({ error: message });
      throw err;
    }
  }, [safeSetState, refreshJobs]);

  const estimatePages = useCallback(async (url: string, configName?: string): Promise<PageEstimation> => {
    return skillSeekersApi.estimatePages(url, configName);
  }, []);

  const clearError = useCallback(() => {
    safeSetState({ error: null });
  }, [safeSetState]);

  const clearLogs = useCallback(() => {
    safeSetState({ logs: [] });
  }, [safeSetState]);

  useEffect(() => {
    mountedRef.current = true;

    const setupListeners = async () => {
      try {
        const unlistenProgress = await skillSeekersApi.onProgress((event: ProgressEvent) => {
          safeSetState(prev => {
            const jobs = prev.jobs.map(job =>
              job.id === event.jobId
                ? { ...job, progress: event.progress }
                : job
            );
            const activeJob = jobs.find(j => j.id === event.jobId) || prev.activeJob;
            return { ...prev, jobs, activeJob };
          });
        });

        const unlistenCompleted = await skillSeekersApi.onJobCompleted((event: JobCompletedEvent) => {
          refreshJobs();
          if (event.success) {
            refreshGeneratedSkills();
          }
        });

        const unlistenLog = await skillSeekersApi.onLog((event: LogEvent) => {
          safeSetState(prev => ({
            ...prev,
            logs: [...prev.logs.slice(-MAX_LOGS + 1), event],
          }));
        });

        unlistenersRef.current = [unlistenProgress, unlistenCompleted, unlistenLog];
      } catch (err) {
        log.error('Failed to setup event listeners', err as Error);
      }
    };

    const initialize = async () => {
      await checkInstallation();
      await Promise.all([
        refreshJobs(),
        refreshPresets(),
        refreshGeneratedSkills(),
      ]);
      await setupListeners();
    };

    initialize();

    return () => {
      mountedRef.current = false;
      unlistenersRef.current.forEach(unlisten => unlisten());
      unlistenersRef.current = [];
    };
  }, [checkInstallation, refreshJobs, refreshPresets, refreshGeneratedSkills, safeSetState]);

  return {
    ...state,
    checkInstallation,
    install,
    scrapeWebsite,
    scrapeGitHub,
    scrapePdf,
    enhanceSkill,
    packageSkill,
    quickGenerateWebsite,
    quickGenerateGitHub,
    quickGeneratePreset,
    cancelJob,
    resumeJob,
    refreshJobs,
    refreshPresets,
    refreshGeneratedSkills,
    estimatePages,
    clearError,
    clearLogs,
  };
}

export default useSkillSeekers;
