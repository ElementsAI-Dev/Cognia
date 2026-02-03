'use client';

/**
 * FlowParallelGeneration - Component for parallel AI generation
 * Similar to Flowith's parallel generation feature
 * Allows generating responses from multiple models simultaneously
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { generateText } from 'ai';
import {
  Sparkles,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings';
import { createAIRegistry } from '@/lib/ai/core/ai-registry';
import type { ProviderName } from '@/types/provider';
import { Progress } from '@/components/ui/progress';

interface ModelSelection {
  provider: ProviderName;
  model: string;
  displayName: string;
}

interface ParallelGenerationResult {
  provider: ProviderName;
  model: string;
  content: string;
  error?: string;
  duration?: number;
  status: 'pending' | 'generating' | 'completed' | 'error';
}

interface FlowParallelGenerationProps {
  /** Prompt to generate with multiple models */
  prompt: string;
  /** Callback when generation starts */
  onGenerationStart?: (models: ModelSelection[]) => void;
  /** Callback for each model result */
  onModelResult?: (result: ParallelGenerationResult) => void;
  /** Callback when all generations complete */
  onGenerationComplete?: (results: ParallelGenerationResult[]) => void;
  /** Whether dialog is open */
  open: boolean;
  /** Dialog open state change */
  onOpenChange: (open: boolean) => void;
  className?: string;
}

// Popular model presets for quick selection
const MODEL_PRESETS = [
  { provider: 'openai' as ProviderName, model: 'gpt-4o', displayName: 'GPT-4o' },
  { provider: 'openai' as ProviderName, model: 'gpt-4o-mini', displayName: 'GPT-4o Mini' },
  { provider: 'anthropic' as ProviderName, model: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4' },
  { provider: 'anthropic' as ProviderName, model: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku' },
  { provider: 'google' as ProviderName, model: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
  { provider: 'deepseek' as ProviderName, model: 'deepseek-chat', displayName: 'DeepSeek Chat' },
  { provider: 'xai' as ProviderName, model: 'grok-3-mini', displayName: 'Grok 3 Mini' },
];

export function FlowParallelGeneration({
  prompt,
  onGenerationStart,
  onModelResult,
  onGenerationComplete,
  open,
  onOpenChange,
  className,
}: FlowParallelGenerationProps) {
  const t = useTranslations('flowChat');
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  const [selectedModels, setSelectedModels] = useState<ModelSelection[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ParallelGenerationResult[]>([]);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get available models from configured providers
  const getAvailableModels = useCallback((): ModelSelection[] => {
    const available: ModelSelection[] = [];
    
    for (const preset of MODEL_PRESETS) {
      const providerConfig = providerSettings?.[preset.provider];
      if (providerConfig?.apiKey) {
        available.push(preset);
      }
    }
    
    return available;
  }, [providerSettings]);

  // Toggle model selection
  const toggleModel = useCallback((model: ModelSelection) => {
    setSelectedModels(prev => {
      const exists = prev.some(m => m.provider === model.provider && m.model === model.model);
      if (exists) {
        return prev.filter(m => !(m.provider === model.provider && m.model === model.model));
      }
      return [...prev, model];
    });
  }, []);

  // Check if model is selected
  const isSelected = useCallback((model: ModelSelection) => {
    return selectedModels.some(m => m.provider === model.provider && m.model === model.model);
  }, [selectedModels]);

  // Start parallel generation with real AI calls
  const startGeneration = useCallback(async () => {
    if (selectedModels.length === 0 || !prompt) return;

    setIsGenerating(true);
    setProgress(0);
    
    // Initialize results with pending status
    const initialResults: ParallelGenerationResult[] = selectedModels.map((model) => ({
      provider: model.provider,
      model: model.model,
      content: '',
      status: 'pending' as const,
    }));
    setResults(initialResults);
    onGenerationStart?.(selectedModels);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // Build AI registry from provider settings
    const providers: Record<string, { apiKey: string; baseURL?: string }> = {};
    for (const model of selectedModels) {
      const config = providerSettings?.[model.provider];
      if (config?.apiKey) {
        providers[model.provider] = { 
          apiKey: config.apiKey,
          baseURL: config.baseURL,
        };
      }
    }
    const registry = createAIRegistry({ providers });

    let completedCount = 0;
    const totalCount = selectedModels.length;

    // Generate with each model in parallel
    const promises = selectedModels.map(async (model, index) => {
      const startTime = Date.now();
      
      // Update status to generating
      setResults(prev => prev.map((r, i) => 
        i === index ? { ...r, status: 'generating' as const } : r
      ));

      try {
        const languageModel = registry.languageModel(model.provider, model.model);
        
        if (!languageModel) {
          throw new Error(`Model ${model.provider}:${model.model} not available`);
        }

        const { text } = await generateText({
          model: languageModel,
          prompt,
          abortSignal: signal,
        });

        const result: ParallelGenerationResult = {
          provider: model.provider,
          model: model.model,
          content: text,
          duration: Date.now() - startTime,
          status: 'completed',
        };

        // Update this specific result
        setResults(prev => prev.map((r, i) => i === index ? result : r));
        completedCount++;
        setProgress(Math.round((completedCount / totalCount) * 100));
        onModelResult?.(result);
        return result;
      } catch (error) {
        const result: ParallelGenerationResult = {
          provider: model.provider,
          model: model.model,
          content: '',
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
          status: 'error',
        };

        setResults(prev => prev.map((r, i) => i === index ? result : r));
        completedCount++;
        setProgress(Math.round((completedCount / totalCount) * 100));
        onModelResult?.(result);
        return result;
      }
    });

    const finalResults = await Promise.all(promises);
    
    setIsGenerating(false);
    abortControllerRef.current = null;
    onGenerationComplete?.(finalResults);
  }, [selectedModels, prompt, providerSettings, onGenerationStart, onModelResult, onGenerationComplete]);

  // Cancel generation
  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  // Get provider color
  const getProviderColor = (provider: ProviderName) => {
    const colors: Record<string, string> = {
      openai: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      anthropic: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      google: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      deepseek: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      xai: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return colors[provider] || 'bg-gray-100 text-gray-700';
  };

  const availableModels = getAvailableModels();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-[500px]', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('parallelGenerate')}
          </DialogTitle>
          <DialogDescription>
            {t('parallelModels')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt preview */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <Label className="text-xs text-muted-foreground mb-1 block">Prompt</Label>
            <p className="text-sm line-clamp-3">{prompt || 'No prompt provided'}</p>
          </div>

          {/* Model selection */}
          <div className="space-y-2">
            <Label>Select Models</Label>
            {availableModels.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No configured providers available</p>
                <p className="text-xs">Configure API keys in settings</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] rounded border p-2">
                <div className="space-y-2">
                  {availableModels.map((model) => (
                    <div
                      key={`${model.provider}-${model.model}`}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        isSelected(model) 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => toggleModel(model)}
                    >
                      <Checkbox 
                        checked={isSelected(model)}
                        onCheckedChange={() => toggleModel(model)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{model.displayName}</span>
                          <Badge 
                            variant="outline" 
                            className={cn('text-[10px]', getProviderColor(model.provider))}
                          >
                            {model.provider}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{model.model}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected count */}
          {selectedModels.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedModels.length} model(s) selected
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedModels([])}
              >
                Clear All
              </Button>
            </div>
          )}

          {/* Progress bar */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('generating')}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Results preview */}
          {results.length > 0 && (
            <div className="space-y-2">
              <Label>{t('results')}</Label>
              <ScrollArea className="h-[180px] rounded border p-2">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={cn(
                      'p-2 rounded mb-2 border',
                      result.status === 'error' && 'bg-destructive/10 border-destructive/30',
                      result.status === 'completed' && 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
                      result.status === 'generating' && 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
                      result.status === 'pending' && 'bg-muted/50 border-muted'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {/* Status icon */}
                      {result.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                      {result.status === 'error' && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                      {result.status === 'generating' && <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />}
                      {result.status === 'pending' && <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                      
                      <Badge variant="outline" className="text-[10px]">
                        {result.model}
                      </Badge>
                      {result.duration && (
                        <span className="text-[10px] text-muted-foreground">
                          {(result.duration / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    <p className="text-xs line-clamp-2">
                      {result.status === 'pending' && t('waiting')}
                      {result.status === 'generating' && t('generatingResponse')}
                      {result.status === 'error' && result.error}
                      {result.status === 'completed' && (result.content.slice(0, 150) + (result.content.length > 150 ? '...' : ''))}
                    </p>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          {isGenerating ? (
            <Button variant="destructive" onClick={cancelGeneration}>
              <XCircle className="h-4 w-4 mr-2" />
              {t('stopGeneration')}
            </Button>
          ) : (
            <Button 
              onClick={startGeneration} 
              disabled={selectedModels.length === 0 || !prompt}
            >
              <Play className="h-4 w-4 mr-2" />
              {t('generate')} ({selectedModels.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FlowParallelGeneration;
