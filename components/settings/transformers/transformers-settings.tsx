'use client';

/**
 * Transformers.js Settings Panel
 * Configure browser-based ML model inference settings.
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Brain, Cpu, HardDrive, Trash2, Download, Zap, Loader2, Play, Square, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useTransformersStore } from '@/stores/ai/transformers-store';
import { isWebGPUAvailable, isWebWorkerAvailable, RECOMMENDED_MODELS } from '@/lib/ai/transformers';
import type { TransformersDtype, TransformersTask } from '@/types/transformers';

/**
 * Map task ID to i18n key
 */
const TASK_I18N_KEYS: Record<string, string> = {
  'feature-extraction': 'tasks.featureExtraction',
  'text-classification': 'tasks.textClassification',
  'translation': 'tasks.translation',
  'summarization': 'tasks.summarization',
  'text-generation': 'tasks.textGeneration',
  'question-answering': 'tasks.questionAnswering',
  'zero-shot-classification': 'tasks.zeroShotClassification',
  'automatic-speech-recognition': 'tasks.automaticSpeechRecognition',
  'image-classification': 'tasks.imageClassification',
  'object-detection': 'tasks.objectDetection',
  'fill-mask': 'tasks.fillMask',
  'token-classification': 'tasks.tokenClassification',
  'sentence-similarity': 'tasks.sentenceSimilarity',
};

export function TransformersSettings({ className }: { className?: string }) {
  const t = useTranslations('settings.transformers');

  const {
    settings,
    updateSettings,
    models,
    isWebGPUAvailable: webGPUAvailable,
    setWebGPUAvailable,
    setModelStatus,
    removeModel,
    clearAllModels,
  } = useTransformersStore();

  const webWorkerAvailable = isWebWorkerAvailable();
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);

  useEffect(() => {
    setWebGPUAvailable(isWebGPUAvailable());
  }, [setWebGPUAvailable]);

  const loadedModels = models.filter((m) => m.status === 'ready');
  const downloadingModels = models.filter((m) => m.status === 'downloading' || m.status === 'loading');

  const getTaskLabel = useCallback((task: string): string => {
    const key = TASK_I18N_KEYS[task];
    return key ? t(key) : task;
  }, [t]);

  const getModelStatus = useCallback((modelId: string) => {
    return models.find((m) => m.modelId === modelId);
  }, [models]);

  const handleLoadModel = useCallback(async (task: TransformersTask, modelId: string) => {
    if (loadingModelId) return;
    setLoadingModelId(modelId);
    setModelStatus(modelId, task, 'downloading', 0);

    try {
      const { getTransformersManager } = await import('@/lib/ai/transformers/transformers-manager');
      const manager = getTransformersManager();
      const resolvedDevice = settings.preferWebGPU && isWebGPUAvailable() ? 'webgpu' : 'wasm';

      await manager.loadModel(task, modelId, {
        device: resolvedDevice,
        dtype: settings.defaultDtype,
        onProgress: (p) => {
          setModelStatus(modelId, task, p.status === 'ready' ? 'ready' : 'downloading', p.progress);
        },
      });
      setModelStatus(modelId, task, 'ready', 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setModelStatus(modelId, task, 'error', 0, message);
    } finally {
      setLoadingModelId(null);
    }
  }, [loadingModelId, settings.preferWebGPU, settings.defaultDtype, setModelStatus]);

  const handleUnloadModel = useCallback(async (task: TransformersTask, modelId: string) => {
    try {
      const { getTransformersManager } = await import('@/lib/ai/transformers/transformers-manager');
      const manager = getTransformersManager();
      await manager.dispose(task, modelId);
      removeModel(modelId);
    } catch (err) {
      console.error('Failed to unload model:', err);
    }
  }, [removeModel]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('title')}</CardTitle>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
              disabled={!webWorkerAvailable}
            />
          </div>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>

        {!webWorkerAvailable && (
          <CardContent>
            <p className="text-sm text-destructive">
              {t('webWorkerUnavailable')}
            </p>
          </CardContent>
        )}
      </Card>

      {settings.enabled && (
        <>
          {/* Device & Performance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                <CardTitle className="text-base">{t('performance')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* WebGPU */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    {t('webgpuAcceleration')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {webGPUAvailable
                      ? t('webgpuAvailable')
                      : t('webgpuUnavailable')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={webGPUAvailable ? 'default' : 'secondary'} className="text-xs">
                    {webGPUAvailable ? t('available') : t('unavailable')}
                  </Badge>
                  <Switch
                    checked={settings.preferWebGPU}
                    onCheckedChange={(preferWebGPU) => updateSettings({ preferWebGPU })}
                    disabled={!webGPUAvailable}
                  />
                </div>
              </div>

              {/* Default Dtype */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{t('modelPrecision')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('modelPrecisionDesc')}
                  </p>
                </div>
                <Select
                  value={settings.defaultDtype}
                  onValueChange={(value) => updateSettings({ defaultDtype: value as TransformersDtype })}
                >
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fp32">FP32</SelectItem>
                    <SelectItem value="fp16">FP16</SelectItem>
                    <SelectItem value="q8">INT8</SelectItem>
                    <SelectItem value="q4">INT4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cache */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{t('cacheModels')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('cacheModelsDesc')}
                  </p>
                </div>
                <Switch
                  checked={settings.cacheModels}
                  onCheckedChange={(cacheModels) => updateSettings({ cacheModels })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Downloading Models */}
          {downloadingModels.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 animate-pulse" />
                  <CardTitle className="text-base">{t('downloading')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {downloadingModels.map((model) => (
                  <div key={model.modelId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs truncate max-w-[200px]">{model.modelId}</span>
                      <span className="text-muted-foreground text-xs">{Math.round(model.progress)}%</span>
                    </div>
                    <Progress value={model.progress} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Loaded Models */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <CardTitle className="text-base">{t('loadedModels')}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {loadedModels.length}
                  </Badge>
                </div>
                {loadedModels.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllModels}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {t('clearAll')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadedModels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('noModelsLoaded')}
                </p>
              ) : (
                <div className="space-y-2">
                  {loadedModels.map((model) => (
                    <div
                      key={model.modelId}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate">{model.modelId}</p>
                        <p className="text-xs text-muted-foreground">
                          {getTaskLabel(model.task)}
                          {model.loadedAt && (
                            <> · {t('loaded')} {new Date(model.loadedAt).toLocaleTimeString()}</>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleUnloadModel(model.task, model.modelId)}
                      >
                        <Square className="h-3 w-3 mr-1" />
                        {t('unloadModel')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Models */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('availableModels')}</CardTitle>
              <CardDescription>
                {t('availableModelsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(Object.entries(RECOMMENDED_MODELS) as [TransformersTask, typeof RECOMMENDED_MODELS[TransformersTask]][]).map(
                  ([task, taskModels]) => {
                    if (!taskModels || taskModels.length === 0) return null;
                    return (
                      <div key={task}>
                        <h4 className="text-sm font-medium mb-2">
                          {getTaskLabel(task)}
                        </h4>
                        <div className="space-y-1.5">
                          {taskModels.map((model) => {
                            const status = getModelStatus(model.modelId);
                            const isReady = status?.status === 'ready';
                            const isDownloading = status?.status === 'downloading' || status?.status === 'loading';
                            const isError = status?.status === 'error';
                            const isCurrentlyLoading = loadingModelId === model.modelId;

                            return (
                              <div
                                key={model.modelId}
                                className="flex items-center justify-between p-2 rounded-md border text-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-medium">{model.name}</p>
                                    {isReady && (
                                      <Badge variant="default" className="text-[10px] h-4 px-1">
                                        {t('modelReady')}
                                      </Badge>
                                    )}
                                    {isError && (
                                      <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                        <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                                        {t('modelError')}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {model.description}
                                  </p>
                                  {isError && status?.error && (
                                    <p className="text-xs text-destructive mt-0.5 truncate">
                                      {status.error}
                                    </p>
                                  )}
                                  {isDownloading && (
                                    <Progress value={status?.progress ?? 0} className="h-1 mt-1" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <Badge variant="outline" className="text-xs">
                                    {model.sizeInMB}MB
                                  </Badge>
                                  {model.dimensions && (
                                    <Badge variant="outline" className="text-xs">
                                      {model.dimensions}d
                                    </Badge>
                                  )}
                                  {isReady ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => handleUnloadModel(task, model.modelId)}
                                    >
                                      <Square className="h-3 w-3 mr-1" />
                                      {t('unloadModel')}
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      disabled={isCurrentlyLoading || isDownloading}
                                      onClick={() => handleLoadModel(task, model.modelId)}
                                    >
                                      {isCurrentlyLoading || isDownloading ? (
                                        <>
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          {t('modelLoading')}
                                        </>
                                      ) : (
                                        <>
                                          <Play className="h-3 w-3 mr-1" />
                                          {t('loadModel')}
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default TransformersSettings;
