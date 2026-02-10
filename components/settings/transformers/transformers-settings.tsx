'use client';

/**
 * Transformers.js Settings Panel
 * Configure browser-based ML model inference settings.
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Brain, Cpu, HardDrive, Trash2, Download, Zap } from 'lucide-react';
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
import { isWebGPUAvailable, isWebWorkerAvailable, RECOMMENDED_MODELS, TASK_DISPLAY_NAMES } from '@/lib/ai/transformers';
import type { TransformersDtype, TransformersTask } from '@/types/transformers';

export function TransformersSettings({ className }: { className?: string }) {
  const t = useTranslations('settings.transformers');

  const {
    settings,
    updateSettings,
    models,
    isWebGPUAvailable: webGPUAvailable,
    setWebGPUAvailable,
    removeModel,
    clearAllModels,
  } = useTransformersStore();

  const webWorkerAvailable = isWebWorkerAvailable();

  useEffect(() => {
    setWebGPUAvailable(isWebGPUAvailable());
  }, [setWebGPUAvailable]);

  const loadedModels = models.filter((m) => m.status === 'ready');
  const downloadingModels = models.filter((m) => m.status === 'downloading' || m.status === 'loading');

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
                          {TASK_DISPLAY_NAMES[model.task] ?? model.task}
                          {model.loadedAt && (
                            <> · {t('loaded')} {new Date(model.loadedAt).toLocaleTimeString()}</>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeModel(model.modelId)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
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
                          {TASK_DISPLAY_NAMES[task] ?? task}
                        </h4>
                        <div className="space-y-1.5">
                          {taskModels.map((model) => (
                            <div
                              key={model.modelId}
                              className="flex items-center justify-between p-2 rounded-md border text-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{model.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {model.description}
                                </p>
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
                              </div>
                            </div>
                          ))}
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
