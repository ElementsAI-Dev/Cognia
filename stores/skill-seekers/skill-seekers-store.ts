/**
 * Skill Seekers Store
 *
 * Zustand store for managing Skill Seekers state including:
 * - Installation status
 * - Job management
 * - Generated skills
 * - Configuration persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import skillSeekersApi, {
  type SkillGenerationJob,
  type PresetConfig,
  type GeneratedSkill,
  type LogEvent,
  type ScrapeWebsiteInput,
  type ScrapeGitHubInput,
  type ScrapePdfInput,
  type EnhanceSkillInput,
  type PackageSkillInput,
  type EnhanceProvider,
  type PageEstimation,
} from '@/lib/native/skill-seekers';

// ========== Types ==========

export interface SkillSeekersState {
  isInstalled: boolean;
  version: string | null;
  isInstalling: boolean;
  isLoading: boolean;
  error: string | null;

  activeJobId: string | null;
  jobs: Record<string, SkillGenerationJob>;
  presets: PresetConfig[];
  generatedSkills: Record<string, GeneratedSkill>;
  logs: LogEvent[];

  config: {
    outputDir: string;
    venvPath: string;
    defaultProvider: EnhanceProvider;
    githubToken: string | null;
    autoEnhance: boolean;
    autoInstall: boolean;
  };

  ui: {
    selectedPreset: string | null;
    showAdvancedOptions: boolean;
    activeTab: 'generate' | 'jobs' | 'library' | 'settings';
    generatorStep: 'source' | 'config' | 'progress' | 'complete';
  };
}

export interface SkillSeekersActions {
  setInstalled: (installed: boolean, version: string | null) => void;
  setInstalling: (installing: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  setActiveJob: (jobId: string | null) => void;
  updateJob: (job: SkillGenerationJob) => void;
  removeJob: (jobId: string) => void;
  setJobs: (jobs: SkillGenerationJob[]) => void;

  setPresets: (presets: PresetConfig[]) => void;
  setGeneratedSkills: (skills: GeneratedSkill[]) => void;
  addGeneratedSkill: (skill: GeneratedSkill) => void;
  removeGeneratedSkill: (skillId: string) => void;

  addLog: (log: LogEvent) => void;
  clearLogs: () => void;

  updateConfig: (config: Partial<SkillSeekersState['config']>) => void;
  setUiState: (ui: Partial<SkillSeekersState['ui']>) => void;

  checkInstallation: () => Promise<void>;
  install: (extras?: string[]) => Promise<void>;
  refreshJobs: () => Promise<void>;
  refreshPresets: () => Promise<void>;
  refreshGeneratedSkills: () => Promise<void>;
  refreshConfig: () => Promise<void>;

  scrapeWebsite: (input: ScrapeWebsiteInput) => Promise<string>;
  scrapeGitHub: (input: ScrapeGitHubInput) => Promise<string>;
  scrapePdf: (input: ScrapePdfInput) => Promise<string>;
  enhanceSkill: (input: EnhanceSkillInput) => Promise<void>;
  packageSkill: (input: PackageSkillInput) => Promise<string>;

  quickGenerateWebsite: (
    url: string,
    name: string,
    autoEnhance?: boolean,
    autoInstall?: boolean
  ) => Promise<string>;
  quickGenerateGitHub: (
    repo: string,
    autoEnhance?: boolean,
    autoInstall?: boolean
  ) => Promise<string>;
  quickGeneratePreset: (
    presetName: string,
    autoEnhance?: boolean,
    autoInstall?: boolean
  ) => Promise<string>;

  cancelJob: (jobId: string) => Promise<void>;
  resumeJob: (jobId: string) => Promise<void>;
  cleanupJobs: (maxAgeDays?: number) => Promise<number>;

  estimatePages: (url: string, configName?: string) => Promise<PageEstimation>;

  reset: () => void;
}

export type SkillSeekersStore = SkillSeekersState & SkillSeekersActions;

// ========== Initial State ==========

const initialState: SkillSeekersState = {
  isInstalled: false,
  version: null,
  isInstalling: false,
  isLoading: true,
  error: null,

  activeJobId: null,
  jobs: {},
  presets: [],
  generatedSkills: {},
  logs: [],

  config: {
    outputDir: '',
    venvPath: '',
    defaultProvider: 'anthropic',
    githubToken: null,
    autoEnhance: false,
    autoInstall: false,
  },

  ui: {
    selectedPreset: null,
    showAdvancedOptions: false,
    activeTab: 'generate',
    generatorStep: 'source',
  },
};

const MAX_LOGS = 500;

// ========== Store ==========

export const useSkillSeekersStore = create<SkillSeekersStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setInstalled: (installed, version) => set({ isInstalled: installed, version }),
      setInstalling: (installing) => set({ isInstalling: installing }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      setActiveJob: (jobId) => set({ activeJobId: jobId }),
      updateJob: (job) =>
        set((state) => ({
          jobs: { ...state.jobs, [job.id]: job },
          activeJobId:
            job.status === 'running' || job.status === 'queued' ? job.id : state.activeJobId,
        })),
      removeJob: (jobId) =>
        set((state) => {
          const { [jobId]: _, ...rest } = state.jobs;
          return {
            jobs: rest,
            activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
          };
        }),
      setJobs: (jobs) =>
        set({
          jobs: jobs.reduce((acc, job) => ({ ...acc, [job.id]: job }), {}),
          activeJobId:
            jobs.find((j) => j.status === 'running' || j.status === 'queued')?.id || null,
        }),

      setPresets: (presets) => set({ presets }),
      setGeneratedSkills: (skills) =>
        set({
          generatedSkills: skills.reduce((acc, skill) => ({ ...acc, [skill.id]: skill }), {}),
        }),
      addGeneratedSkill: (skill) =>
        set((state) => ({
          generatedSkills: { ...state.generatedSkills, [skill.id]: skill },
        })),
      removeGeneratedSkill: (skillId) =>
        set((state) => {
          const { [skillId]: _, ...rest } = state.generatedSkills;
          return { generatedSkills: rest };
        }),

      addLog: (log) =>
        set((state) => ({
          logs: [...state.logs.slice(-MAX_LOGS + 1), log],
        })),
      clearLogs: () => set({ logs: [] }),

      updateConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),
      setUiState: (ui) =>
        set((state) => ({
          ui: { ...state.ui, ...ui },
        })),

      checkInstallation: async () => {
        try {
          const [installed, version] = await Promise.all([
            skillSeekersApi.isInstalled(),
            skillSeekersApi.getVersion(),
          ]);
          set({ isInstalled: installed, version, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to check installation',
            isLoading: false,
          });
        }
      },

      install: async (extras) => {
        set({ isInstalling: true, error: null });
        try {
          const version = await skillSeekersApi.install(extras);
          set({ isInstalled: true, version, isInstalling: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Installation failed',
            isInstalling: false,
          });
          throw err;
        }
      },

      refreshJobs: async () => {
        try {
          const jobs = await skillSeekersApi.listJobs();
          get().setJobs(jobs);
        } catch (err) {
          console.error('Failed to refresh jobs:', err);
        }
      },

      refreshPresets: async () => {
        try {
          const presets = await skillSeekersApi.listPresets();
          set({ presets });
        } catch (err) {
          console.error('Failed to refresh presets:', err);
        }
      },

      refreshGeneratedSkills: async () => {
        try {
          const skills = await skillSeekersApi.listGenerated();
          get().setGeneratedSkills(skills);
        } catch (err) {
          console.error('Failed to refresh generated skills:', err);
        }
      },

      refreshConfig: async () => {
        try {
          const config = await skillSeekersApi.getConfig();
          set({
            config: {
              outputDir: config.outputDir,
              venvPath: config.venvPath,
              defaultProvider: config.defaultProvider,
              githubToken: config.githubToken || null,
              autoEnhance: config.autoEnhance,
              autoInstall: config.autoInstall,
            },
          });
        } catch (err) {
          console.error('Failed to refresh config:', err);
        }
      },

      scrapeWebsite: async (input) => {
        set({ error: null });
        try {
          const jobId = await skillSeekersApi.scrapeWebsite(input);
          await get().refreshJobs();
          set((state) => ({
            ui: { ...state.ui, generatorStep: 'progress' },
          }));
          return jobId;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to start website scraping';
          set({ error: message });
          throw err;
        }
      },

      scrapeGitHub: async (input) => {
        set({ error: null });
        try {
          const jobId = await skillSeekersApi.scrapeGitHub(input);
          await get().refreshJobs();
          set((state) => ({
            ui: { ...state.ui, generatorStep: 'progress' },
          }));
          return jobId;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to start GitHub scraping';
          set({ error: message });
          throw err;
        }
      },

      scrapePdf: async (input) => {
        set({ error: null });
        try {
          const jobId = await skillSeekersApi.scrapePdf(input);
          await get().refreshJobs();
          set((state) => ({
            ui: { ...state.ui, generatorStep: 'progress' },
          }));
          return jobId;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to start PDF extraction';
          set({ error: message });
          throw err;
        }
      },

      enhanceSkill: async (input) => {
        set({ error: null });
        try {
          await skillSeekersApi.enhanceSkill(input);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to enhance skill';
          set({ error: message });
          throw err;
        }
      },

      packageSkill: async (input) => {
        set({ error: null });
        try {
          return await skillSeekersApi.packageSkill(input);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to package skill';
          set({ error: message });
          throw err;
        }
      },

      quickGenerateWebsite: async (url, name, autoEnhance = false, autoInstall = false) => {
        set({ error: null });
        try {
          const jobId = await skillSeekersApi.quickGenerateWebsite(
            url,
            name,
            autoEnhance,
            autoInstall
          );
          await get().refreshJobs();
          set((state) => ({
            ui: { ...state.ui, generatorStep: 'progress' },
          }));
          return jobId;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to generate skill from website';
          set({ error: message });
          throw err;
        }
      },

      quickGenerateGitHub: async (repo, autoEnhance = false, autoInstall = false) => {
        set({ error: null });
        try {
          const jobId = await skillSeekersApi.quickGenerateGitHub(repo, autoEnhance, autoInstall);
          await get().refreshJobs();
          set((state) => ({
            ui: { ...state.ui, generatorStep: 'progress' },
          }));
          return jobId;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to generate skill from GitHub';
          set({ error: message });
          throw err;
        }
      },

      quickGeneratePreset: async (presetName, autoEnhance = false, autoInstall = false) => {
        set({ error: null });
        try {
          const jobId = await skillSeekersApi.quickGeneratePreset(
            presetName,
            autoEnhance,
            autoInstall
          );
          await get().refreshJobs();
          set((state) => ({
            ui: { ...state.ui, generatorStep: 'progress' },
          }));
          return jobId;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to generate skill from preset';
          set({ error: message });
          throw err;
        }
      },

      cancelJob: async (jobId) => {
        try {
          await skillSeekersApi.cancelJob(jobId);
          await get().refreshJobs();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to cancel job';
          set({ error: message });
          throw err;
        }
      },

      resumeJob: async (jobId) => {
        try {
          await skillSeekersApi.resumeJob(jobId);
          await get().refreshJobs();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to resume job';
          set({ error: message });
          throw err;
        }
      },

      cleanupJobs: async (maxAgeDays) => {
        try {
          const removed = await skillSeekersApi.cleanupJobs(maxAgeDays);
          await get().refreshJobs();
          return removed;
        } catch (err) {
          console.error('Failed to cleanup jobs:', err);
          return 0;
        }
      },

      estimatePages: async (url, configName) => {
        return skillSeekersApi.estimatePages(url, configName);
      },

      reset: () => set(initialState),
    }),
    {
      name: 'cognia-skill-seekers',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        ui: {
          selectedPreset: state.ui.selectedPreset,
          showAdvancedOptions: state.ui.showAdvancedOptions,
          activeTab: state.ui.activeTab,
        },
      }),
    }
  )
);

// ========== Selectors ==========

export const selectIsInstalled = (state: SkillSeekersStore) => state.isInstalled;
export const selectVersion = (state: SkillSeekersStore) => state.version;
export const selectIsInstalling = (state: SkillSeekersStore) => state.isInstalling;
export const selectIsLoading = (state: SkillSeekersStore) => state.isLoading;
export const selectError = (state: SkillSeekersStore) => state.error;
export const selectActiveJob = (state: SkillSeekersStore) =>
  state.activeJobId ? state.jobs[state.activeJobId] : null;
export const selectJobs = (state: SkillSeekersStore) => Object.values(state.jobs);
export const selectJobById = (jobId: string) => (state: SkillSeekersStore) => state.jobs[jobId];
export const selectPresets = (state: SkillSeekersStore) => state.presets;
export const selectPresetsByCategory = (state: SkillSeekersStore) => {
  const categories: Record<string, PresetConfig[]> = {};
  state.presets.forEach((preset) => {
    if (!categories[preset.category]) {
      categories[preset.category] = [];
    }
    categories[preset.category].push(preset);
  });
  return categories;
};
export const selectGeneratedSkills = (state: SkillSeekersStore) =>
  Object.values(state.generatedSkills);
export const selectGeneratedSkillById = (skillId: string) => (state: SkillSeekersStore) =>
  state.generatedSkills[skillId];
export const selectLogs = (state: SkillSeekersStore) => state.logs;
export const selectConfig = (state: SkillSeekersStore) => state.config;
export const selectUiState = (state: SkillSeekersStore) => state.ui;

export const selectRunningJobs = (state: SkillSeekersStore) =>
  Object.values(state.jobs).filter((j) => j.status === 'running');
export const selectCompletedJobs = (state: SkillSeekersStore) =>
  Object.values(state.jobs).filter((j) => j.status === 'completed');
export const selectFailedJobs = (state: SkillSeekersStore) =>
  Object.values(state.jobs).filter((j) => j.status === 'failed');
export const selectPausedJobs = (state: SkillSeekersStore) =>
  Object.values(state.jobs).filter((j) => j.status === 'paused');

export default useSkillSeekersStore;
