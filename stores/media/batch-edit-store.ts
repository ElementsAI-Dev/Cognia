/**
 * Batch Edit Store
 * Zustand store for batch image processing operations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { ImageAdjustments } from '@/types/media/image-studio';

export interface BatchImage {
  id: string;
  filename: string;
  path: string;
  thumbnail?: string;
  width: number;
  height: number;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  outputPath?: string;
  attempts?: number;
  lastError?: string;
}

export interface BatchPreset {
  id: string;
  name: string;
  description?: string;
  adjustments: Partial<ImageAdjustments>;
  filters?: string[];
  transform?: {
    resize?: { width: number; height: number; mode: 'fit' | 'fill' | 'stretch' };
    rotate?: number;
    flipH?: boolean;
    flipV?: boolean;
  };
  export?: {
    format: 'jpeg' | 'png' | 'webp' | 'avif';
    quality: number;
    suffix?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface BatchJob {
  id: string;
  name: string;
  images: BatchImage[];
  preset?: BatchPreset;
  outputDirectory: string;
  overwrite: boolean;
  preserveMetadata: boolean;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled';
  progress: number;
  startedAt?: number;
  completedAt?: number;
  processedCount: number;
  errorCount: number;
}

export interface BatchEditState {
  jobs: BatchJob[];
  presets: BatchPreset[];
  activeJobId: string | null;
  isProcessing: boolean;
  concurrency: number;

  // Job actions
  createJob: (name: string, outputDirectory: string) => string;
  updateJob: (jobId: string, updates: Partial<BatchJob>) => void;
  deleteJob: (jobId: string) => void;
  setActiveJob: (jobId: string | null) => void;

  // Image actions
  addImages: (jobId: string, images: Omit<BatchImage, 'status' | 'progress'>[]) => void;
  removeImage: (jobId: string, imageId: string) => void;
  clearImages: (jobId: string) => void;
  updateImageStatus: (
    jobId: string,
    imageId: string,
    status: BatchImage['status'],
    progress?: number,
    error?: string,
    metadata?: {
      outputPath?: string;
      attempts?: number;
      lastError?: string;
    }
  ) => void;

  // Preset actions
  createPreset: (preset: Omit<BatchPreset, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePreset: (presetId: string, updates: Partial<BatchPreset>) => void;
  deletePreset: (presetId: string) => void;
  applyPreset: (jobId: string, presetId: string) => void;

  // Processing actions
  startProcessing: (jobId: string) => void;
  pauseProcessing: (jobId: string) => void;
  resumeProcessing: (jobId: string) => void;
  cancelProcessing: (jobId: string) => void;
  setConcurrency: (concurrency: number) => void;

  // Utilities
  getJob: (jobId: string) => BatchJob | undefined;
  getPreset: (presetId: string) => BatchPreset | undefined;
  getActiveJob: () => BatchJob | undefined;
  reset: () => void;
}

const initialState = {
  jobs: [],
  presets: [],
  activeJobId: null,
  isProcessing: false,
  concurrency: 2,
};

export const useBatchEditStore = create<BatchEditState>()(
  persist(
    (set, get) => ({
      ...initialState,

      createJob: (name, outputDirectory) => {
        const id = nanoid();
        const job: BatchJob = {
          id,
          name,
          images: [],
          outputDirectory,
          overwrite: false,
          preserveMetadata: true,
          status: 'idle',
          progress: 0,
          processedCount: 0,
          errorCount: 0,
        };

        set((state) => ({
          jobs: [...state.jobs, job],
          activeJobId: id,
        }));

        return id;
      },

      updateJob: (jobId, updates) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, ...updates } : job
          ),
        }));
      },

      deleteJob: (jobId) => {
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== jobId),
          activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
        }));
      },

      setActiveJob: (jobId) => {
        set({ activeJobId: jobId });
      },

      addImages: (jobId, images) => {
        const newImages: BatchImage[] = images.map((img) => ({
          ...img,
          status: 'pending' as const,
          progress: 0,
        }));

        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, images: [...job.images, ...newImages] }
              : job
          ),
        }));
      },

      removeImage: (jobId, imageId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, images: job.images.filter((img) => img.id !== imageId) }
              : job
          ),
        }));
      },

      clearImages: (jobId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, images: [] } : job
          ),
        }));
      },

      updateImageStatus: (jobId, imageId, status, progress = 0, error, metadata) => {
        set((state) => ({
          jobs: state.jobs.map((job) => {
            if (job.id !== jobId) return job;

            const updatedImages = job.images.map((img) =>
              img.id === imageId
                ? {
                    ...img,
                    status,
                    progress,
                    error,
                    outputPath: metadata?.outputPath ?? img.outputPath,
                    attempts: metadata?.attempts ?? img.attempts,
                    lastError: metadata?.lastError ?? (status === 'error' ? error : img.lastError),
                  }
                : img
            );

            const processedCount = updatedImages.filter(
              (img) => img.status === 'completed'
            ).length;
            const errorCount = updatedImages.filter(
              (img) => img.status === 'error'
            ).length;
            const totalProgress =
              updatedImages.reduce((sum, img) => sum + img.progress, 0) /
              updatedImages.length;

            return {
              ...job,
              images: updatedImages,
              processedCount,
              errorCount,
              progress: totalProgress,
            };
          }),
        }));
      },

      createPreset: (preset) => {
        const id = nanoid();
        const now = Date.now();
        const newPreset: BatchPreset = {
          ...preset,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          presets: [...state.presets, newPreset],
        }));

        return id;
      },

      updatePreset: (presetId, updates) => {
        set((state) => ({
          presets: state.presets.map((preset) =>
            preset.id === presetId
              ? { ...preset, ...updates, updatedAt: Date.now() }
              : preset
          ),
        }));
      },

      deletePreset: (presetId) => {
        set((state) => ({
          presets: state.presets.filter((preset) => preset.id !== presetId),
        }));
      },

      applyPreset: (jobId, presetId) => {
        const preset = get().presets.find((p) => p.id === presetId);
        if (!preset) return;

        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, preset } : job
          ),
        }));
      },

      startProcessing: (jobId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, status: 'running', startedAt: Date.now() }
              : job
          ),
          isProcessing: true,
        }));
      },

      pauseProcessing: (jobId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, status: 'paused' } : job
          ),
          isProcessing: false,
        }));
      },

      resumeProcessing: (jobId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, status: 'running' } : job
          ),
          isProcessing: true,
        }));
      },

      cancelProcessing: (jobId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, status: 'cancelled', completedAt: Date.now() }
              : job
          ),
          isProcessing: false,
        }));
      },

      setConcurrency: (concurrency) => {
        set({ concurrency: Math.max(1, Math.min(8, concurrency)) });
      },

      getJob: (jobId) => {
        return get().jobs.find((job) => job.id === jobId);
      },

      getPreset: (presetId) => {
        return get().presets.find((preset) => preset.id === presetId);
      },

      getActiveJob: () => {
        const { jobs, activeJobId } = get();
        return jobs.find((job) => job.id === activeJobId);
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'cognia-batch-edit',
      partialize: (state) => ({
        presets: state.presets,
        concurrency: state.concurrency,
      }),
    }
  )
);

// Selectors
export const selectActiveJob = (state: BatchEditState) => state.getActiveJob();
export const selectIsProcessing = (state: BatchEditState) => state.isProcessing;
export const selectPresets = (state: BatchEditState) => state.presets;
export const selectJobs = (state: BatchEditState) => state.jobs;

export default useBatchEditStore;
