'use client';

/**
 * VideoGenerationDialog - Dialog for generating AI videos
 * 
 * Supports:
 * - Google Veo (veo-3, veo-3.1)
 * - OpenAI Sora (sora-1, sora-turbo)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Video as VideoIcon,
  Loader2,
  Download,
  Sparkles,
  Settings2,
  Image as ImageIcon,
  Upload,
  X,
  Clock,
  Film,
  Maximize2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettingsStore } from '@/stores';
import {
  generateVideo,
  checkVideoGenerationStatus,
  downloadVideoAsBlob,
  saveVideoToFile,
  getAvailableVideoModelsForUI,
} from '@/lib/ai/media/video-generation';
import { Video } from '@/components/learning/content/video';
import type {
  VideoProvider,
  VideoModel,
  VideoResolution,
  VideoAspectRatio,
  VideoDuration,
  VideoStyle,
  GeneratedVideo,
} from '@/types/media/video';
import { estimateVideoCost, parseDurationToSeconds } from '@/types/media/video';

interface VideoGenerationDialogProps {
  trigger?: React.ReactNode;
  onVideoGenerated?: (video: GeneratedVideo) => void;
}

interface GeneratedVideoWithMeta extends GeneratedVideo {
  prompt: string;
  model: VideoModel;
  provider: VideoProvider;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  jobId?: string;
  error?: string;
}

export function VideoGenerationDialog({
  trigger,
  onVideoGenerated,
}: VideoGenerationDialogProps) {
  const t = useTranslations('videoGeneration');
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideoWithMeta[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');

  // Model selection
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

  // Image-to-video
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Polling for async jobs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  
  // Get API key based on provider
  const getApiKey = useCallback(() => {
    if (provider === 'google-veo') {
      return providerSettings.google?.apiKey || '';
    } else if (provider === 'openai-sora') {
      return providerSettings.openai?.apiKey || '';
    }
    return '';
  }, [provider, providerSettings]);

  const availableModels = getAvailableVideoModelsForUI();
  const currentModelConfig = availableModels.find(m => m.id === model);

  // Update model when provider changes
  useEffect(() => {
    const providerModels = availableModels.filter(m => m.provider === provider);
    if (providerModels.length > 0 && !providerModels.find(m => m.id === model)) {
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setModel(providerModels[0].id);
      });
    }
  }, [provider, availableModels, model]);

  // Estimate cost
  const estimatedCost = estimateVideoCost(provider, model, parseDurationToSeconds(duration));

  // Handle file upload for image-to-video
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const clearReferenceImage = useCallback(() => {
    setReferenceImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Poll for job status
  const pollJobStatus = useCallback(async (jobId: string, videoIndex: number) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      const result = await checkVideoGenerationStatus(apiKey, jobId, provider);
      
      setGeneratedVideos(prev => prev.map((v, i) => {
        if (i !== videoIndex) return v;
        
        if (result.status === 'completed' && result.video) {
          return {
            ...v,
            ...result.video,
            status: 'completed',
            progress: 100,
          };
        } else if (result.status === 'failed') {
          return {
            ...v,
            status: 'failed',
            error: result.error,
          };
        } else {
          return {
            ...v,
            status: 'processing',
            progress: result.progress || v.progress + 5,
          };
        }
      }));

      // Stop polling if completed or failed
      if (result.status === 'completed' || result.status === 'failed') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsGenerating(false);
        
        if (result.status === 'completed' && result.video) {
          onVideoGenerated?.(result.video);
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, [getApiKey, provider, onVideoGenerated]);

  // Handle video generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    
    const apiKey = getApiKey();
    if (!apiKey) {
      setError(t('noApiKey'));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Prepare reference image if provided
      let referenceImageBase64: string | undefined;
      if (referenceImage && activeTab === 'image') {
        referenceImageBase64 = referenceImage.split(',')[1]; // Remove data URL prefix
      }

      const result = await generateVideo(apiKey, {
        prompt: prompt.trim(),
        provider,
        model,
        resolution,
        aspectRatio,
        duration,
        style,
        negativePrompt: negativePrompt.trim() || undefined,
        fps,
        enhancePrompt,
        referenceImageBase64,
        includeAudio: model === 'veo-3.1' ? includeAudio : undefined,
        audioPrompt: includeAudio ? audioPrompt.trim() || undefined : undefined,
      });

      // Create video entry
      const newVideo: GeneratedVideoWithMeta = {
        id: result.jobId || `video-${Date.now()}`,
        prompt: prompt.trim(),
        model,
        provider,
        status: result.status === 'completed' ? 'completed' : result.status === 'failed' ? 'failed' : 'processing',
        progress: result.progress || 0,
        jobId: result.jobId,
        error: result.error,
        durationSeconds: parseDurationToSeconds(duration),
        width: 0,
        height: 0,
        fps,
        mimeType: 'video/mp4',
        createdAt: new Date(),
        ...(result.video || {}),
      };

      setGeneratedVideos(prev => [newVideo, ...prev]);

      // If async, start polling
      if (result.status === 'processing' && result.jobId) {
        const videoIndex = 0;
        pollingIntervalRef.current = setInterval(() => {
          pollJobStatus(result.jobId!, videoIndex);
        }, 5000);
      } else if (result.status === 'completed' && result.video) {
        setIsGenerating(false);
        onVideoGenerated?.(result.video);
      } else if (result.status === 'failed') {
        setIsGenerating(false);
        setError(result.error || 'Video generation failed');
      }
    } catch (err) {
      console.error('Video generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate video');
      setIsGenerating(false);
    }
  }, [
    prompt, negativePrompt, provider, model, resolution, aspectRatio,
    duration, style, fps, enhancePrompt, includeAudio, audioPrompt,
    referenceImage, activeTab, getApiKey, t, pollJobStatus, onVideoGenerated,
  ]);

  // Handle download
  const handleDownload = useCallback(async (video: GeneratedVideoWithMeta) => {
    try {
      if (video.url) {
        const blob = await downloadVideoAsBlob(video.url);
        const filename = `video-${video.id}.mp4`;
        saveVideoToFile(blob, filename);
      } else if (video.base64) {
        const byteCharacters = atob(video.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'video/mp4' });
        const filename = `video-${video.id}.mp4`;
        saveVideoToFile(blob, filename);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <VideoIcon className="mr-2 h-4 w-4" />
            {t('title')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 pb-4">
            {/* Generation Mode Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'text' | 'image')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  {t('textToVideo')}
                </TabsTrigger>
                <TabsTrigger value="image" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {t('imageToVideo')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="mt-4">
                <div className="space-y-2">
                  <Label>{t('referenceImage')}</Label>
                  {referenceImage ? (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={referenceImage}
                        alt="Reference"
                        className="max-h-40 rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={clearReferenceImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t('uploadImage')}
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Prompt input */}
            <div className="space-y-2">
              <Label htmlFor="prompt">{t('prompt')}</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('promptPlaceholder')}
                rows={3}
                disabled={isGenerating}
              />
            </div>

            {/* Provider and Model Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('provider')}</Label>
                <Select
                  value={provider}
                  onValueChange={(v) => setProvider(v as VideoProvider)}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google-veo">Google Veo</SelectItem>
                    <SelectItem value="openai-sora">OpenAI Sora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('model')}</Label>
                <Select
                  value={model}
                  onValueChange={(v) => setModel(v as VideoModel)}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels
                      .filter(m => m.provider === provider)
                      .map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Basic Options */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Maximize2 className="h-3 w-3" />
                  {t('resolution')}
                </Label>
                <Select
                  value={resolution}
                  onValueChange={(v) => setResolution(v as VideoResolution)}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentModelConfig?.supportedResolutions.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('aspectRatio')}</Label>
                <Select
                  value={aspectRatio}
                  onValueChange={(v) => setAspectRatio(v as VideoAspectRatio)}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentModelConfig?.supportedAspectRatios.map(ar => (
                      <SelectItem key={ar} value={ar}>{ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t('duration')}
                </Label>
                <Select
                  value={duration}
                  onValueChange={(v) => setDuration(v as VideoDuration)}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['5s', '10s', '15s', '20s', '30s'] as VideoDuration[])
                      .filter(d => parseDurationToSeconds(d) <= (currentModelConfig?.maxDuration || 20))
                      .map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced options */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Settings2 className="mr-2 h-4 w-4" />
                  {showAdvanced ? t('hideAdvanced') : t('showAdvanced')}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('style')}</Label>
                    <Select
                      value={style}
                      onValueChange={(v) => setStyle(v as VideoStyle)}
                      disabled={isGenerating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cinematic">{t('styles.cinematic')}</SelectItem>
                        <SelectItem value="documentary">{t('styles.documentary')}</SelectItem>
                        <SelectItem value="animation">{t('styles.animation')}</SelectItem>
                        <SelectItem value="timelapse">{t('styles.timelapse')}</SelectItem>
                        <SelectItem value="slowmotion">{t('styles.slowmotion')}</SelectItem>
                        <SelectItem value="natural">{t('styles.natural')}</SelectItem>
                        <SelectItem value="artistic">{t('styles.artistic')}</SelectItem>
                        <SelectItem value="commercial">{t('styles.commercial')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('fps')}</Label>
                    <Select
                      value={fps.toString()}
                      onValueChange={(v) => setFps(parseInt(v))}
                      disabled={isGenerating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 fps</SelectItem>
                        <SelectItem value="30">30 fps</SelectItem>
                        <SelectItem value="60">60 fps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('negativePrompt')}</Label>
                  <Textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder={t('negativePromptPlaceholder')}
                    rows={2}
                    disabled={isGenerating}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="enhance-prompt" className="cursor-pointer">
                    {t('enhancePrompt')}
                  </Label>
                  <Switch
                    id="enhance-prompt"
                    checked={enhancePrompt}
                    onCheckedChange={setEnhancePrompt}
                    disabled={isGenerating}
                  />
                </div>

                {/* Audio options (Veo 3.1 only) */}
                {model === 'veo-3.1' && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="include-audio" className="cursor-pointer">
                        {t('includeAudio')}
                      </Label>
                      <Switch
                        id="include-audio"
                        checked={includeAudio}
                        onCheckedChange={setIncludeAudio}
                        disabled={isGenerating}
                      />
                    </div>

                    {includeAudio && (
                      <div className="space-y-2">
                        <Label>{t('audioPrompt')}</Label>
                        <Input
                          value={audioPrompt}
                          onChange={(e) => setAudioPrompt(e.target.value)}
                          placeholder={t('audioPromptPlaceholder')}
                          disabled={isGenerating}
                        />
                      </div>
                    )}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Cost estimate */}
            <div className="text-sm text-muted-foreground">
              {t('estimatedCost')}: ~${estimatedCost.toFixed(2)}
            </div>

            {/* Error message */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Generate button */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || (activeTab === 'image' && !referenceImage)}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('generate')}
                  </>
                )}
              </Button>
            </div>

            {/* Generated videos */}
            {generatedVideos.length > 0 && (
              <div className="space-y-3">
                <Label>{t('generatedVideos')}</Label>
                <div className="space-y-4">
                  {generatedVideos.map((video, index) => (
                    <div key={video.id || index} className="space-y-2">
                      <Video
                        video={video.status === 'completed' ? video : undefined}
                        status={video.status}
                        progress={video.progress}
                        jobId={video.jobId}
                        prompt={video.prompt}
                        error={video.error}
                        onRetry={() => handleGenerate()}
                      />
                      {video.status === 'completed' && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {video.prompt}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(video)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {t('download')}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default VideoGenerationDialog;
