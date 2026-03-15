'use client';

/**
 * useVideoGeneration - Hook for AI-powered video generation
 * Provides easy access to video generation functionality
 * Supports Google Veo and OpenAI Sora providers
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { loggers } from '@/lib/logger';
import { useSettingsStore } from '@/stores';
import { createProviderSettingsSnapshot } from '@/lib/ai/provider-consumption';
import { resolveVideoGenerationAccess } from '@/lib/ai/provider-consumption/capability-provider';
import {
  generateVideo,
  checkVideoGenerationStatus,
  cancelVideoGeneration,
  getAvailableVideoModelsForUI,
  downloadVideoAsBlob,
  saveVideoToFile,
} from '@/lib/ai/media/video-generation';
import type {
  VideoProvider,
  VideoModel,
  VideoResolution,
  VideoAspectRatio,
  VideoDuration,
  VideoStyle,
  VideoGenerationOptions,
  VideoGenerationResult,
  GeneratedVideo,
  VideoStatus,
} from '@/types/media/video';

export interface UseVideoGenerationOptions {
  defaultProvider?: VideoProvider;
  defaultModel?: VideoModel;
  defaultResolution?: VideoResolution;
  defaultAspectRatio?: VideoAspectRatio;
  defaultDuration?: VideoDuration;
  defaultStyle?: VideoStyle;
  pollingInterval?: number;
  autoStartPolling?: boolean;
}

export interface VideoGenerationJob {
  id: string;
  prompt: string;
  provider: VideoProvider;
  model: VideoModel;
  status: VideoStatus;
  progress: number;
  video?: GeneratedVideo;
  error?: string;
  createdAt: Date;
}

export interface UseVideoGenerationReturn {
  // State
  isGenerating: boolean;
  error: string | null;
  jobs: VideoGenerationJob[];
  completedVideos: GeneratedVideo[];

  // Generation methods
  generate: (
    prompt: string,
    options?: Partial<Omit<VideoGenerationOptions, 'prompt'>>
  ) => Promise<VideoGenerationResult | null>;

  // Job management
  checkStatus: (jobId: string) => Promise<VideoGenerationResult | null>;
  cancelJob: (jobId: string) => Promise<boolean>;
  removeJob: (jobId: string) => void;

  // Video utilities
  downloadVideo: (video: GeneratedVideo, filename?: string) => Promise<void>;

  // Utilities
  clearCompletedVideos: () => void;
  clearJobs: () => void;
  reset: () => void;

  // Available models
  availableModels: ReturnType<typeof getAvailableVideoModelsForUI>;
}

export function useVideoGeneration(
  options: UseVideoGenerationOptions = {}
): UseVideoGenerationReturn {
  const {
    defaultProvider = 'google-veo',
    defaultModel = 'veo-3.1',
    defaultResolution = '1080p',
    defaultAspectRatio = '16:9',
    defaultDuration = '10s',
    defaultStyle = 'cinematic',
    pollingInterval = 5000,
    autoStartPolling = true,
  } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<VideoGenerationJob[]>([]);
  const [completedVideos, setCompletedVideos] = useState<GeneratedVideo[]>([]);

  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeJobsRef = useRef<Set<string>>(new Set());

  const providerSettings = useSettingsStore((state) => state.providerSettings);

  const availableModels = getAvailableVideoModelsForUI();

  const getProviderAccess = useCallback(
    (provider: VideoProvider) =>
      resolveVideoGenerationAccess(
        provider,
        createProviderSettingsSnapshot({
          defaultProvider: '',
          providerSettings,
        })
      ),
    [providerSettings]
  );

  // Update job status
  const updateJobStatus = useCallback((jobId: string, updates: Partial<VideoGenerationJob>) => {
    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job)));
  }, []);

  // Check status of a specific job
  const checkStatus = useCallback(
    async (jobId: string): Promise<VideoGenerationResult | null> => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) {
        setError(`Job ${jobId} not found`);
        return null;
      }

      const access = getProviderAccess(job.provider);
      if (access.kind !== 'resolved') {
        setError(access.reason);
        return null;
      }

      try {
        const result = await checkVideoGenerationStatus(access.apiKey, jobId, job.provider);

        updateJobStatus(jobId, {
          status: result.status,
          progress: result.progress || 0,
          video: result.video,
          error: result.error,
        });

        if (result.status === 'completed' && result.video) {
          setCompletedVideos((prev) => [result.video!, ...prev]);
          activeJobsRef.current.delete(jobId);
        } else if (result.status === 'failed') {
          activeJobsRef.current.delete(jobId);
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check status';
        setError(message);
        return null;
      }
    },
    [jobs, getProviderAccess, updateJobStatus]
  );

  // Poll active jobs
  const pollActiveJobs = useCallback(async () => {
    const activeJobs = jobs.filter(
      (job) =>
        (job.status === 'pending' || job.status === 'processing') &&
        activeJobsRef.current.has(job.id)
    );

    if (activeJobs.length === 0) {
      setIsGenerating(false);
      return;
    }

    await Promise.all(activeJobs.map((job) => checkStatus(job.id)));
  }, [jobs, checkStatus]);

  // Start polling
  useEffect(() => {
    if (!autoStartPolling) return;

    const hasActiveJobs = jobs.some(
      (job) =>
        (job.status === 'pending' || job.status === 'processing') &&
        activeJobsRef.current.has(job.id)
    );

    if (hasActiveJobs) {
      pollingTimeoutRef.current = setTimeout(pollActiveJobs, pollingInterval);
    }

    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [jobs, autoStartPolling, pollingInterval, pollActiveJobs]);

  // Generate video
  const generate = useCallback(
    async (
      prompt: string,
      opts?: Partial<Omit<VideoGenerationOptions, 'prompt'>>
    ): Promise<VideoGenerationResult | null> => {
      const provider = opts?.provider || defaultProvider;
      const access = getProviderAccess(provider);

      if (access.kind !== 'resolved') {
        setError(access.reason);
        return null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const result = await generateVideo(access.apiKey, {
          prompt,
          provider,
          model: opts?.model || defaultModel,
          resolution: opts?.resolution || defaultResolution,
          aspectRatio: opts?.aspectRatio || defaultAspectRatio,
          duration: opts?.duration || defaultDuration,
          style: opts?.style || defaultStyle,
          negativePrompt: opts?.negativePrompt,
          seed: opts?.seed,
          fps: opts?.fps,
          enhancePrompt: opts?.enhancePrompt,
          referenceImageUrl: opts?.referenceImageUrl,
          referenceImageBase64: opts?.referenceImageBase64,
          includeAudio: opts?.includeAudio,
          audioPrompt: opts?.audioPrompt,
        });

        const jobId = result.jobId || `video-${Date.now()}`;
        const newJob: VideoGenerationJob = {
          id: jobId,
          prompt,
          provider,
          model: result.model,
          status: result.status,
          progress: result.progress || 0,
          video: result.video,
          error: result.error,
          createdAt: new Date(),
        };

        setJobs((prev) => [newJob, ...prev]);

        if (result.status === 'completed' && result.video) {
          setCompletedVideos((prev) => [result.video!, ...prev]);
          setIsGenerating(false);
        } else if (result.status === 'failed') {
          setError(result.error || 'Video generation failed');
          setIsGenerating(false);
        } else {
          // Async job - add to active jobs for polling
          activeJobsRef.current.add(jobId);
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Video generation failed';
        setError(message);
        setIsGenerating(false);
        return null;
      }
    },
    [
      getProviderAccess,
      defaultProvider,
      defaultModel,
      defaultResolution,
      defaultAspectRatio,
      defaultDuration,
      defaultStyle,
    ]
  );

  // Cancel a job
  const cancelJob = useCallback(
    async (jobId: string): Promise<boolean> => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return false;

      const access = getProviderAccess(job.provider);
      if (access.kind !== 'resolved') {
        setError(access.reason);
        return false;
      }

      try {
        const success = await cancelVideoGeneration(access.apiKey, jobId, job.provider);
        if (success) {
          updateJobStatus(jobId, { status: 'cancelled' });
          activeJobsRef.current.delete(jobId);
        }
        return success;
      } catch {
        return false;
      }
    },
    [jobs, getProviderAccess, updateJobStatus]
  );

  // Remove a job from the list
  const removeJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
    activeJobsRef.current.delete(jobId);
  }, []);

  // Download video
  const downloadVideo = useCallback(async (video: GeneratedVideo, filename?: string) => {
    try {
      if (video.url) {
        const blob = await downloadVideoAsBlob(video.url);
        const name = filename || `video-${video.id || Date.now()}.mp4`;
        saveVideoToFile(blob, name);
      } else if (video.base64) {
        const byteCharacters = atob(video.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: video.mimeType || 'video/mp4' });
        const name = filename || `video-${video.id || Date.now()}.mp4`;
        saveVideoToFile(blob, name);
      }
    } catch (err) {
      loggers.media.error('Download error', err);
      setError('Failed to download video');
    }
  }, []);

  // Clear completed videos
  const clearCompletedVideos = useCallback(() => {
    setCompletedVideos([]);
  }, []);

  // Clear all jobs
  const clearJobs = useCallback(() => {
    setJobs([]);
    activeJobsRef.current.clear();
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setIsGenerating(false);
    setError(null);
    setJobs([]);
    setCompletedVideos([]);
    activeJobsRef.current.clear();
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isGenerating,
    error,
    jobs,
    completedVideos,
    generate,
    checkStatus,
    cancelJob,
    removeJob,
    downloadVideo,
    clearCompletedVideos,
    clearJobs,
    reset,
    availableModels,
  };
}

export type {
  VideoProvider,
  VideoModel,
  VideoResolution,
  VideoAspectRatio,
  VideoDuration,
  VideoStyle,
  VideoGenerationOptions,
  GeneratedVideo,
  VideoStatus,
};

export default useVideoGeneration;
