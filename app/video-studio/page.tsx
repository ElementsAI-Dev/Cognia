'use client';

/**
 * Video Studio Page - Dedicated video generation interface
 * Features:
 * - Text to video generation (Google Veo, OpenAI Sora)
 * - Image to video generation
 * - Video gallery with history
 * - Advanced settings (resolution, duration, style, etc.)
 * - Download and export
 * - Job progress tracking
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Video as VideoIcon,
  Settings2,
  Download,
  Check,
  Trash2,
  RefreshCw,
  Upload,
  Loader2,
  Image as ImageIcon,
  Play,
  Clock,
  Star,
  StarOff,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Film,
  Wand2,
  Clapperboard,
  Timer,
  Ratio,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSettingsStore, useMediaStore } from '@/stores';
import {
  generateVideo,
  checkVideoGenerationStatus,
  downloadVideoAsBlob,
  saveVideoToFile,
  getAvailableVideoModelsForUI,
} from '@/lib/ai/video-generation';
import {
  estimateVideoCost,
  type VideoProvider,
  type VideoModel,
  type VideoResolution,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoStyle,
  type VideoStatus,
} from '@/types/video';

// Prompt templates for video generation
const VIDEO_PROMPT_TEMPLATES = [
  { label: 'Nature Timelapse', prompt: 'A beautiful time-lapse of clouds moving over a mountain landscape at sunset', category: 'nature' },
  { label: 'Ocean Waves', prompt: 'Cinematic slow-motion waves crashing on a tropical beach with golden hour lighting', category: 'nature' },
  { label: 'City Life', prompt: 'Bustling city street at night with neon signs and people walking, cinematic', category: 'urban' },
  { label: 'Space Journey', prompt: 'Spacecraft traveling through a colorful nebula with stars in the background', category: 'scifi' },
  { label: 'Wildlife', prompt: 'A majestic lion walking through the African savanna at golden hour', category: 'nature' },
  { label: 'Abstract Flow', prompt: 'Abstract colorful liquid flowing and merging in slow motion', category: 'abstract' },
  { label: 'Product Reveal', prompt: 'Elegant product reveal with dramatic lighting and smooth camera movement', category: 'commercial' },
  { label: 'Anime Scene', prompt: 'Anime character walking through cherry blossom trees, studio ghibli style', category: 'animation' },
];

// Style presets for video
const VIDEO_STYLE_PRESETS: Array<{ label: string; value: VideoStyle; icon: string; description: string }> = [
  { label: 'Cinematic', value: 'cinematic', icon: '🎬', description: 'Film-like quality with dramatic lighting' },
  { label: 'Documentary', value: 'documentary', icon: '📹', description: 'Natural and realistic footage' },
  { label: 'Animation', value: 'animation', icon: '🎨', description: 'Animated or cartoon style' },
  { label: 'Timelapse', value: 'timelapse', icon: '⏱️', description: 'Accelerated time effect' },
  { label: 'Slow Motion', value: 'slowmotion', icon: '🐌', description: 'Slowed down footage' },
  { label: 'Natural', value: 'natural', icon: '🌿', description: 'Organic, unprocessed look' },
  { label: 'Artistic', value: 'artistic', icon: '🖼️', description: 'Creative and stylized' },
  { label: 'Commercial', value: 'commercial', icon: '📺', description: 'Professional advertising quality' },
];

// Resolution options
const RESOLUTION_OPTIONS: Array<{ value: VideoResolution; label: string; description: string }> = [
  { value: '480p', label: '480p', description: 'SD - Fastest' },
  { value: '720p', label: '720p', description: 'HD' },
  { value: '1080p', label: '1080p', description: 'Full HD' },
  { value: '4k', label: '4K', description: 'Ultra HD - Slowest' },
];

// Aspect ratio options
const ASPECT_RATIO_OPTIONS: Array<{ value: VideoAspectRatio; label: string; icon: string }> = [
  { value: '16:9', label: '16:9', icon: '🖥️' },
  { value: '9:16', label: '9:16', icon: '📱' },
  { value: '1:1', label: '1:1', icon: '⬜' },
  { value: '4:3', label: '4:3', icon: '📺' },
  { value: '21:9', label: '21:9', icon: '🎬' },
];

// Duration options
const DURATION_OPTIONS: Array<{ value: VideoDuration; label: string; seconds: number }> = [
  { value: '5s', label: '5 seconds', seconds: 5 },
  { value: '10s', label: '10 seconds', seconds: 10 },
  { value: '15s', label: '15 seconds', seconds: 15 },
  { value: '20s', label: '20 seconds', seconds: 20 },
  { value: '30s', label: '30 seconds', seconds: 30 },
  { value: '60s', label: '60 seconds', seconds: 60 },
];

interface VideoJob {
  id: string;
  jobId?: string;
  prompt: string;
  provider: VideoProvider;
  model: VideoModel;
  status: VideoStatus;
  progress: number;
  videoUrl?: string;
  videoBase64?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: number;
  settings: {
    resolution: VideoResolution;
    aspectRatio: VideoAspectRatio;
    duration: VideoDuration;
    style: VideoStyle;
    fps?: number;
  };
  isFavorite?: boolean;
}

export default function VideoStudioPage() {
  const _t = useTranslations('videoGeneration');
  
  // State
  const [activeTab, setActiveTab] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoJob | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoJob | null>(null);
  const [showMoreTemplates, setShowMoreTemplates] = useState(false);

  // Settings
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

  // Image-to-video state
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [_referenceImageFile, setReferenceImageFile] = useState<File | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const mediaStore = useMediaStore();

  // Get API key based on provider
  const getApiKey = useCallback(() => {
    if (provider === 'google-veo') {
      return providerSettings.google?.apiKey || '';
    } else if (provider === 'openai-sora') {
      return providerSettings.openai?.apiKey || '';
    }
    return '';
  }, [provider, providerSettings]);

  // Available models
  const availableModels = useMemo(() => getAvailableVideoModelsForUI(), []);

  // Get models for current provider
  const providerModels = useMemo(() => {
    return availableModels.filter(m => m.provider === provider);
  }, [availableModels, provider]);

  // Update model when provider changes
  useEffect(() => {
    const firstModel = providerModels[0];
    if (firstModel && !providerModels.some(m => m.id === model)) {
      setModel(firstModel.id as VideoModel);
    }
  }, [provider, providerModels, model]);

  // Poll for job status
  const pollJobStatus = useCallback(async (job: VideoJob) => {
    const apiKey = getApiKey();
    if (!apiKey || !job.jobId) return;

    try {
      const result = await checkVideoGenerationStatus(apiKey, job.jobId, job.provider);
      
      setVideoJobs(prev => prev.map(j => {
        if (j.id !== job.id) return j;
        return {
          ...j,
          status: result.status,
          progress: result.progress || j.progress,
          videoUrl: result.video?.url || j.videoUrl,
          videoBase64: result.video?.base64 || j.videoBase64,
          thumbnailUrl: result.video?.thumbnailUrl || j.thumbnailUrl,
          error: result.error,
        };
      }));

      // Save to media store if completed
      if (result.status === 'completed' && result.video) {
        mediaStore.addVideo({
          jobId: job.jobId,
          url: result.video.url,
          base64: result.video.base64,
          thumbnailUrl: result.video.thumbnailUrl,
          prompt: job.prompt,
          model: job.model,
          provider: job.provider,
          resolution: job.settings.resolution,
          aspectRatio: job.settings.aspectRatio,
          duration: job.settings.duration,
          style: job.settings.style,
          fps: job.settings.fps,
          status: 'completed',
          progress: 100,
          width: result.video.width,
          height: result.video.height,
          durationSeconds: result.video.durationSeconds,
        });
      }

      return result.status;
    } catch (err) {
      console.error('Poll error:', err);
      return 'failed';
    }
  }, [getApiKey, mediaStore]);

  // Start polling for active jobs
  useEffect(() => {
    const activeJobs = videoJobs.filter(j => j.status === 'pending' || j.status === 'processing');
    
    if (activeJobs.length === 0) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      for (const job of activeJobs) {
        const status = await pollJobStatus(job);
        if (status === 'completed' || status === 'failed') {
          // Job finished, will be removed from active list on next render
        }
      }
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [videoJobs, pollJobStatus]);

  // Generate video
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    
    const apiKey = getApiKey();
    if (!apiKey) {
      setError(provider === 'google-veo' ? 'Google API key is required' : 'OpenAI API key is required');
      return;
    }

    setIsGenerating(true);
    setError(null);

    const jobId = `job-${Date.now()}`;
    const newJob: VideoJob = {
      id: jobId,
      prompt: prompt.trim(),
      provider,
      model,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      settings: { resolution, aspectRatio, duration, style, fps },
    };

    setVideoJobs(prev => [newJob, ...prev]);

    try {
      const result = await generateVideo(apiKey, {
        prompt: prompt.trim(),
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

      setVideoJobs(prev => prev.map(j => {
        if (j.id !== jobId) return j;
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
      }));

      if (result.status === 'completed' && result.video) {
        mediaStore.addVideo({
          jobId: result.jobId,
          url: result.video.url,
          base64: result.video.base64,
          thumbnailUrl: result.video.thumbnailUrl,
          prompt: prompt.trim(),
          model,
          provider,
          resolution,
          aspectRatio,
          duration,
          style,
          fps,
          status: 'completed',
          progress: 100,
          width: result.video.width,
          height: result.video.height,
          durationSeconds: result.video.durationSeconds,
        });
      }

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Video generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate video';
      setError(errorMessage);
      setVideoJobs(prev => prev.map(j => {
        if (j.id !== jobId) return j;
        return { ...j, status: 'failed', error: errorMessage };
      }));
    } finally {
      setIsGenerating(false);
    }
  }, [
    prompt, negativePrompt, provider, model, resolution, aspectRatio, duration,
    style, fps, enhancePrompt, includeAudio, audioPrompt, seed, referenceImage,
    getApiKey, mediaStore
  ]);

  // Download video
  const handleDownload = useCallback(async (job: VideoJob) => {
    try {
      if (job.videoUrl) {
        const blob = await downloadVideoAsBlob(job.videoUrl);
        const filename = `video-${job.id}.mp4`;
        saveVideoToFile(blob, filename);
      } else if (job.videoBase64) {
        const byteCharacters = atob(job.videoBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'video/mp4' });
        const filename = `video-${job.id}.mp4`;
        saveVideoToFile(blob, filename);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  }, []);

  // Delete job
  const handleDeleteJob = useCallback((jobId: string) => {
    setVideoJobs(prev => prev.filter(j => j.id !== jobId));
    if (selectedVideo?.id === jobId) {
      setSelectedVideo(null);
    }
  }, [selectedVideo]);

  // Toggle favorite
  const handleToggleFavorite = useCallback((jobId: string) => {
    setVideoJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, isFavorite: !j.isFavorite } : j
    ));
  }, []);

  // Handle image upload for image-to-video
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReferenceImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      // Remove data URL prefix
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

  // Apply template
  const handleApplyTemplate = useCallback((templatePrompt: string) => {
    setPrompt(templatePrompt);
  }, []);

  // Filtered videos
  const displayedVideos = useMemo(() => {
    if (filterFavorites) {
      return videoJobs.filter(j => j.isFavorite);
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
    const durationSeconds = DURATION_OPTIONS.find(d => d.value === duration)?.seconds || 10;
    return estimateVideoCost(provider, model, durationSeconds);
  }, [provider, model, duration]);

  // Get status badge
  const getStatusBadge = (status: VideoStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><Check className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Film className="h-4 w-4 text-white" />
            </div>
            <h1 className="font-semibold">Video Studio</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showSidebar ? 'Hide sidebar' : 'Show sidebar'}</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-80 border-r flex flex-col shrink-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4">
                <TabsTrigger value="text-to-video" className="flex-1">
                  <Wand2 className="h-4 w-4 mr-2" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="image-to-video" className="flex-1">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Image
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-4">
                <TabsContent value="text-to-video" className="mt-0 space-y-4">
                  {/* Prompt */}
                  <div className="space-y-2">
                    <Label>Prompt</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the video you want to create..."
                      className="min-h-[100px] resize-none"
                    />
                  </div>

                  {/* Quick Templates */}
                  <Collapsible open={showMoreTemplates} onOpenChange={setShowMoreTemplates}>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Quick Templates</Label>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {showMoreTemplates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {VIDEO_PROMPT_TEMPLATES.slice(0, 4).map((template) => (
                        <Button
                          key={template.label}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleApplyTemplate(template.prompt)}
                        >
                          {template.label}
                        </Button>
                      ))}
                    </div>
                    <CollapsibleContent>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {VIDEO_PROMPT_TEMPLATES.slice(4).map((template) => (
                          <Button
                            key={template.label}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleApplyTemplate(template.prompt)}
                          >
                            {template.label}
                          </Button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Negative Prompt */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Negative Prompt (optional)</Label>
                    <Textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="Things to avoid..."
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="image-to-video" className="mt-0 space-y-4">
                  {/* Reference Image Upload */}
                  <div className="space-y-2">
                    <Label>Reference Image</Label>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors",
                        referenceImage && "border-primary"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {referenceImage ? (
                        <div className="relative">
                          <img
                            src={`data:image/png;base64,${referenceImage}`}
                            alt="Reference"
                            className="max-h-40 mx-auto rounded"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearReferenceImage();
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="py-4">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload an image</p>
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 4MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>

                  {/* Prompt for image-to-video */}
                  <div className="space-y-2">
                    <Label>Motion Description (optional)</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe how the image should animate..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                </TabsContent>

                {/* Settings */}
                <Collapsible open={showSettings} onOpenChange={setShowSettings} className="mt-6">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Settings
                      </span>
                      {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 mt-4">
                    {/* Provider */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clapperboard className="h-4 w-4" />
                        Provider
                      </Label>
                      <Select value={provider} onValueChange={(v) => setProvider(v as VideoProvider)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google-veo">Google Veo</SelectItem>
                          <SelectItem value="openai-sora">OpenAI Sora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Model */}
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select value={model} onValueChange={(v) => setModel(v as VideoModel)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {providerModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Resolution */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        Resolution
                      </Label>
                      <Select value={resolution} onValueChange={(v) => setResolution(v as VideoResolution)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESOLUTION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label} - {opt.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Ratio className="h-4 w-4" />
                        Aspect Ratio
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {ASPECT_RATIO_OPTIONS.map((opt) => (
                          <Button
                            key={opt.value}
                            variant={aspectRatio === opt.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAspectRatio(opt.value)}
                          >
                            {opt.icon} {opt.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        Duration
                      </Label>
                      <Select value={duration} onValueChange={(v) => setDuration(v as VideoDuration)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Style */}
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <div className="flex flex-wrap gap-2">
                        {VIDEO_STYLE_PRESETS.slice(0, 4).map((preset) => (
                          <Tooltip key={preset.value}>
                            <TooltipTrigger asChild>
                              <Button
                                variant={style === preset.value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStyle(preset.value)}
                              >
                                {preset.icon} {preset.label}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{preset.description}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    {/* FPS */}
                    <div className="space-y-2">
                      <Label>FPS: {fps}</Label>
                      <Slider
                        value={[fps]}
                        onValueChange={([v]) => setFps(v)}
                        min={12}
                        max={60}
                        step={1}
                      />
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Enhance Prompt</Label>
                        <Switch checked={enhancePrompt} onCheckedChange={setEnhancePrompt} />
                      </div>
                      
                      {model === 'veo-3.1' && (
                        <>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Include Audio</Label>
                            <Switch checked={includeAudio} onCheckedChange={setIncludeAudio} />
                          </div>
                          {includeAudio && (
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Audio Description</Label>
                              <Input
                                value={audioPrompt}
                                onChange={(e) => setAudioPrompt(e.target.value)}
                                placeholder="Ambient sounds, music..."
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Seed */}
                    <div className="space-y-2">
                      <Label className="text-sm">Seed (optional)</Label>
                      <Input
                        type="number"
                        value={seed || ''}
                        onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Random"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Cost Estimate */}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Cost</span>
                    <span className="font-medium">${estimatedCost.toFixed(2)}</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Generate Button */}
                <Button
                  className="w-full mt-4"
                  onClick={handleGenerate}
                  disabled={isGenerating || (!prompt.trim() && !referenceImage)}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Video
                    </>
                  )}
                </Button>
              </ScrollArea>
            </Tabs>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant={filterFavorites ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterFavorites(!filterFavorites)}
              >
                <Star className={cn("h-4 w-4", filterFavorites && "fill-current")} />
              </Button>
              <span className="text-sm text-muted-foreground">
                {displayedVideos.length} video{displayedVideos.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Video Grid */}
          <ScrollArea className="flex-1 p-4">
            {displayedVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <VideoIcon className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No videos yet</p>
                <p className="text-sm">Generate your first video to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedVideos.map((job) => (
                  <Card
                    key={job.id}
                    className={cn(
                      "group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary",
                      selectedVideo?.id === job.id && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedVideo(job)}
                  >
                    <div className="relative aspect-video bg-muted">
                      {job.status === 'completed' && (job.videoUrl || job.videoBase64) ? (
                        <video
                          src={job.videoUrl || `data:video/mp4;base64,${job.videoBase64}`}
                          poster={job.thumbnailUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {job.status === 'pending' || job.status === 'processing' ? (
                            <div className="text-center">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                              <Progress value={job.progress} className="mt-2 w-20" />
                              <p className="text-xs text-muted-foreground mt-1">{job.progress}%</p>
                            </div>
                          ) : job.status === 'failed' ? (
                            <AlertCircle className="h-8 w-8 text-destructive" />
                          ) : (
                            <VideoIcon className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      
                      {/* Overlay actions */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {job.status === 'completed' && (
                          <>
                            <Button
                              size="icon"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewVideo(job);
                              }}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(job);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(job.id);
                          }}
                        >
                          <Star className={cn("h-4 w-4", job.isFavorite && "fill-yellow-500 text-yellow-500")} />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="text-sm truncate">{job.prompt}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{formatTime(job.createdAt)}</span>
                        {getStatusBadge(job.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </main>

        {/* Selected Video Details */}
        {selectedVideo && (
          <aside className="w-80 border-l p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Video Details</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {selectedVideo.status === 'completed' && (
                      <DropdownMenuItem onClick={() => handleDownload(selectedVideo)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleToggleFavorite(selectedVideo.id)}>
                      {selectedVideo.isFavorite ? (
                        <>
                          <StarOff className="h-4 w-4 mr-2" />
                          Remove from favorites
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-2" />
                          Add to favorites
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteJob(selectedVideo.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Preview */}
              {selectedVideo.status === 'completed' && (selectedVideo.videoUrl || selectedVideo.videoBase64) && (
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={selectedVideo.videoUrl || `data:video/mp4;base64,${selectedVideo.videoBase64}`}
                    poster={selectedVideo.thumbnailUrl}
                    className="w-full h-full object-contain"
                    controls
                  />
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedVideo.status)}
                {(selectedVideo.status === 'pending' || selectedVideo.status === 'processing') && (
                  <Progress value={selectedVideo.progress} className="flex-1" />
                )}
              </div>

              {selectedVideo.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{selectedVideo.error}</AlertDescription>
                </Alert>
              )}

              {/* Prompt */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Prompt</Label>
                <p className="text-sm">{selectedVideo.prompt}</p>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Provider:</span>
                  <p className="font-medium">{selectedVideo.provider === 'google-veo' ? 'Google Veo' : 'OpenAI Sora'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Model:</span>
                  <p className="font-medium">{selectedVideo.model}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Resolution:</span>
                  <p className="font-medium">{selectedVideo.settings.resolution}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Aspect:</span>
                  <p className="font-medium">{selectedVideo.settings.aspectRatio}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-medium">{selectedVideo.settings.duration}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Style:</span>
                  <p className="font-medium capitalize">{selectedVideo.settings.style}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setPrompt(selectedVideo.prompt);
                    setProvider(selectedVideo.provider);
                    setModel(selectedVideo.model);
                    setResolution(selectedVideo.settings.resolution);
                    setAspectRatio(selectedVideo.settings.aspectRatio);
                    setDuration(selectedVideo.settings.duration);
                    setStyle(selectedVideo.settings.style);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Video Preview</DialogTitle>
          </DialogHeader>
          {previewVideo && (previewVideo.videoUrl || previewVideo.videoBase64) && (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={previewVideo.videoUrl || `data:video/mp4;base64,${previewVideo.videoBase64}`}
                poster={previewVideo.thumbnailUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
