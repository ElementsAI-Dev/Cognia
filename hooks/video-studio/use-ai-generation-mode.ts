/**
 * useAIGenerationMode - Hook for AI video generation mode state and handlers
 *
 * Delegates core generation/polling/download to useVideoGeneration
 * and adds UI-specific state on top:
 * - Provider/model selection UI
 * - Generation settings (resolution, aspect ratio, duration, style, fps)
 * - Favorites, filtering, preview state
 * - Image-to-video workflow
 * - Cost estimation
 * - Media store integration
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { loggers } from '@/lib/logger';
import { useMediaStore } from '@/stores';
import { useVideoGeneration } from '@/hooks/media/use-video-generation';
import {
  downloadVideoAsBlob,
  saveVideoToFile,
} from '@/lib/ai/media/video-generation';
import {
  estimateVideoCost,
  type VideoProvider,
  type VideoModel,
  type VideoResolution,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoStyle,
} from '@/types/media/video';
import { DURATION_OPTIONS } from '@/components/video-studio/constants';
import type { VideoJob } from '@/types/video-studio/types';

export interface UseAIGenerationModeReturn {
  // Tabs
  activeTab: 'text-to-video' | 'image-to-video';
  setActiveTab: React.Dispatch<React.SetStateAction<'text-to-video' | 'image-to-video'>>;

  // Prompt
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  negativePrompt: string;
  setNegativePrompt: React.Dispatch<React.SetStateAction<string>>;

  // Generation state
  isGenerating: boolean;
  error: string | null;
  videoJobs: VideoJob[];
  selectedVideo: VideoJob | null;
  setSelectedVideo: React.Dispatch<React.SetStateAction<VideoJob | null>>;
  previewVideo: VideoJob | null;
  setPreviewVideo: React.Dispatch<React.SetStateAction<VideoJob | null>>;
  displayedVideos: VideoJob[];

  // Settings visibility
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showMoreTemplates: boolean;
  setShowMoreTemplates: React.Dispatch<React.SetStateAction<boolean>>;
  filterFavorites: boolean;
  setFilterFavorites: React.Dispatch<React.SetStateAction<boolean>>;

  // Provider/model
  provider: VideoProvider;
  setProvider: React.Dispatch<React.SetStateAction<VideoProvider>>;
  model: VideoModel;
  setModel: React.Dispatch<React.SetStateAction<VideoModel>>;
  providerModels: Array<{ id: string; name: string; provider: string }>;

  // Generation settings
  resolution: VideoResolution;
  setResolution: React.Dispatch<React.SetStateAction<VideoResolution>>;
  aspectRatio: VideoAspectRatio;
  setAspectRatio: React.Dispatch<React.SetStateAction<VideoAspectRatio>>;
  duration: VideoDuration;
  setDuration: React.Dispatch<React.SetStateAction<VideoDuration>>;
  style: VideoStyle;
  setStyle: React.Dispatch<React.SetStateAction<VideoStyle>>;
  fps: number;
  setFps: React.Dispatch<React.SetStateAction<number>>;
  enhancePrompt: boolean;
  setEnhancePrompt: React.Dispatch<React.SetStateAction<boolean>>;
  includeAudio: boolean;
  setIncludeAudio: React.Dispatch<React.SetStateAction<boolean>>;
  audioPrompt: string;
  setAudioPrompt: React.Dispatch<React.SetStateAction<string>>;
  seed: number | undefined;
  setSeed: React.Dispatch<React.SetStateAction<number | undefined>>;
  estimatedCost: number;

  // Image-to-video
  referenceImage: string | null;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleClearReferenceImage: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  // Actions
  handleGenerate: () => Promise<void>;
  handleDownload: (job: VideoJob) => Promise<void>;
  handleDeleteJob: (jobId: string) => void;
  handleToggleFavorite: (jobId: string) => void;
  formatTime: (timestamp: number) => string;
}

export function useAIGenerationMode(): UseAIGenerationModeReturn {
  // Tabs
  const [activeTab, setActiveTab] = useState<'text-to-video' | 'image-to-video'>('text-to-video');

  // Prompt
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');

  // UI-specific job state (favorites, settings snapshot, media store sync)
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoJob | null>(null);
  const [previewVideo, setPreviewVideo] = useState<VideoJob | null>(null);

  // Settings visibility
  const [showSettings, setShowSettings] = useState(true);
  const [showMoreTemplates, setShowMoreTemplates] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);

  // Provider/model
  const [provider, setProvider] = useState<VideoProvider>('google-veo');
  const [model, setModel] = useState<VideoModel>('veo-3.1');
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [duration, setDuration] = useState<VideoDuration>('10s');
  const [style, setStyle] = useState<VideoStyle>('cinematic');
  const [fps, setFps] = useState(24);
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(false);
  const [audioPrompt, setAudioPrompt] = useState('');
  const [seed, setSeed] = useState<number | undefined>(undefined);

  // Image-to-video
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [, setReferenceImageFile] = useState<File | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core generation hook — handles generate, poll, download, API key
  const videoGen = useVideoGeneration({
    defaultProvider: provider,
    defaultModel: model,
    defaultResolution: resolution,
    defaultAspectRatio: aspectRatio,
    defaultDuration: duration,
    defaultStyle: style,
  });

  // Media store for persistence
  const mediaStore = useMediaStore();
  const savedJobIdsRef = useRef<Set<string>>(new Set());

  // Models for current provider
  const providerModels = useMemo(() => {
    return videoGen.availableModels.filter((m) => m.provider === provider);
  }, [videoGen.availableModels, provider]);

  // Derive effective model — auto-select first model when provider changes
  const effectiveModel = useMemo(() => {
    if (providerModels.some((m) => m.id === model)) return model;
    return (providerModels[0]?.id as VideoModel) || model;
  }, [providerModels, model]);

  // Keep model state in sync with effective model
  const prevEffectiveModelRef = useRef(effectiveModel);
  if (prevEffectiveModelRef.current !== effectiveModel) {
    prevEffectiveModelRef.current = effectiveModel;
    setModel(effectiveModel);
  }

  // Derive synced video jobs — merge core job statuses into UI jobs
  const syncedVideoJobs = useMemo(() => {
    if (videoGen.jobs.length === 0) return videoJobs;

    return videoJobs.map((uiJob) => {
      const coreJob = videoGen.jobs.find((j) => j.id === uiJob.jobId);
      if (!coreJob) return uiJob;

      return {
        ...uiJob,
        status: coreJob.status,
        progress: coreJob.progress,
        videoUrl: coreJob.video?.url || uiJob.videoUrl,
        videoBase64: coreJob.video?.base64 || uiJob.videoBase64,
        thumbnailUrl: coreJob.video?.thumbnailUrl || uiJob.thumbnailUrl,
        error: coreJob.error,
      };
    });
  }, [videoJobs, videoGen.jobs]);

  // Save completed videos to media store
  useEffect(() => {
    for (const video of videoGen.completedVideos) {
      if (savedJobIdsRef.current.has(video.id || '')) continue;
      const matchingJob = videoJobs.find((j) => j.jobId === video.id);
      if (matchingJob && video.url) {
        savedJobIdsRef.current.add(video.id || '');
        mediaStore.addVideo({
          jobId: video.id,
          url: video.url,
          base64: video.base64,
          thumbnailUrl: video.thumbnailUrl,
          prompt: matchingJob.prompt,
          model: matchingJob.model,
          provider: matchingJob.provider,
          resolution: matchingJob.settings.resolution,
          aspectRatio: matchingJob.settings.aspectRatio,
          duration: matchingJob.settings.duration,
          style: matchingJob.settings.style,
          fps: matchingJob.settings.fps,
          status: 'completed',
          progress: 100,
          width: video.width,
          height: video.height,
          durationSeconds: video.durationSeconds,
        });
      }
    }
  }, [videoGen.completedVideos, videoJobs, mediaStore]);

  // Generate video — delegates to useVideoGeneration
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    const newJob: VideoJob = {
      id: `job-${Date.now()}`,
      prompt: prompt.trim(),
      provider,
      model,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      settings: { resolution, aspectRatio, duration, style, fps },
    };

    setVideoJobs((prev) => [newJob, ...prev]);

    const result = await videoGen.generate(prompt.trim(), {
      provider,
      model,
      resolution,
      aspectRatio,
      duration,
      style,
      negativePrompt: negativePrompt || undefined,
      fps,
      enhancePrompt,
      includeAudio,
      audioPrompt: includeAudio ? audioPrompt : undefined,
      seed,
      referenceImageBase64: referenceImage || undefined,
    });

    if (result) {
      setVideoJobs((prev) =>
        prev.map((j) => {
          if (j.id !== newJob.id) return j;
          return {
            ...j,
            jobId: result.jobId,
            status: result.status,
            progress: result.progress || 0,
            videoUrl: result.video?.url,
            videoBase64: result.video?.base64,
            thumbnailUrl: result.video?.thumbnailUrl,
            error: result.error,
          };
        })
      );
    }
  }, [
    prompt,
    negativePrompt,
    provider,
    model,
    resolution,
    aspectRatio,
    duration,
    style,
    fps,
    enhancePrompt,
    includeAudio,
    audioPrompt,
    seed,
    referenceImage,
    videoGen,
  ]);

  // Download video — uses shared download utilities
  const handleDownload = useCallback(async (job: VideoJob) => {
    try {
      if (job.videoUrl) {
        const blob = await downloadVideoAsBlob(job.videoUrl);
        saveVideoToFile(blob, `video-${job.id}.mp4`);
      } else if (job.videoBase64) {
        const byteCharacters = atob(job.videoBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'video/mp4' });
        saveVideoToFile(blob, `video-${job.id}.mp4`);
      }
    } catch (err) {
      loggers.media.error('Download error', err);
    }
  }, []);

  // Delete job
  const handleDeleteJob = useCallback(
    (jobId: string) => {
      setVideoJobs((prev) => prev.filter((j) => j.id !== jobId));
      if (selectedVideo?.id === jobId) {
        setSelectedVideo(null);
      }
    },
    [selectedVideo]
  );

  // Toggle favorite
  const handleToggleFavorite = useCallback((jobId: string) => {
    setVideoJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isFavorite: !j.isFavorite } : j))
    );
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReferenceImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const base64Data = base64.split(',')[1];
      setReferenceImage(base64Data);
    };
    reader.readAsDataURL(file);
  }, []);

  // Clear reference image
  const handleClearReferenceImage = useCallback(() => {
    setReferenceImage(null);
    setReferenceImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Filtered videos
  const displayedVideos = useMemo(() => {
    if (filterFavorites) {
      return videoJobs.filter((j) => j.isFavorite);
    }
    return videoJobs;
  }, [videoJobs, filterFavorites]);

  // Format timestamp
  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Calculate estimated cost
  const estimatedCost = useMemo(() => {
    const durationSeconds = DURATION_OPTIONS.find((d) => d.value === duration)?.seconds || 10;
    return estimateVideoCost(provider, model, durationSeconds);
  }, [provider, model, duration]);

  return {
    // Tabs
    activeTab,
    setActiveTab,

    // Prompt
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,

    // Generation state
    isGenerating: videoGen.isGenerating,
    error: videoGen.error,
    videoJobs: syncedVideoJobs,
    selectedVideo,
    setSelectedVideo,
    previewVideo,
    setPreviewVideo,
    displayedVideos,

    // Settings visibility
    showSettings,
    setShowSettings,
    showMoreTemplates,
    setShowMoreTemplates,
    filterFavorites,
    setFilterFavorites,

    // Provider/model
    provider,
    setProvider,
    model,
    setModel,
    providerModels,

    // Generation settings
    resolution,
    setResolution,
    aspectRatio,
    setAspectRatio,
    duration,
    setDuration,
    style,
    setStyle,
    fps,
    setFps,
    enhancePrompt,
    setEnhancePrompt,
    includeAudio,
    setIncludeAudio,
    audioPrompt,
    setAudioPrompt,
    seed,
    setSeed,
    estimatedCost,

    // Image-to-video
    referenceImage,
    handleImageUpload,
    handleClearReferenceImage,
    fileInputRef,

    // Actions
    handleGenerate,
    handleDownload,
    handleDeleteJob,
    handleToggleFavorite,
    formatTime,
  };
}
