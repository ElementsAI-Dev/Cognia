'use client';

/**
 * PromptOptimizerDialog - Dialog for optimizing prompts with AI
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader } from '@/components/ai-elements/loader';
import { cn } from '@/lib/utils';
import { useSettingsStore, useSessionStore } from '@/stores';
import { optimizePrompt } from '@/lib/ai/prompt-optimizer';
import type { PromptOptimizationStyle, OptimizedPrompt } from '@/types/prompt';
import { PROVIDERS } from '@/types/provider';
import {
  Sparkles,
  Wand2,
  FileText,
  Lightbulb,
  Briefcase,
  GraduationCap,
  Code,
  Settings2,
  Check,
  Copy,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface PromptOptimizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt: string;
  onApply: (optimizedPrompt: string) => void;
}

const STYLE_OPTIONS: {
  value: PromptOptimizationStyle;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'concise',
    label: 'Concise',
    description: 'Shorter and more direct',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'More context and specificity',
    icon: <Lightbulb className="h-4 w-4" />,
  },
  {
    value: 'creative',
    label: 'Creative',
    description: 'Imaginative and innovative',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Formal business language',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    value: 'academic',
    label: 'Academic',
    description: 'Scholarly and research-oriented',
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    value: 'technical',
    label: 'Technical',
    description: 'Precise technical language',
    icon: <Code className="h-4 w-4" />,
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Your own instructions',
    icon: <Settings2 className="h-4 w-4" />,
  },
];

export function PromptOptimizerDialog({
  open,
  onOpenChange,
  initialPrompt,
  onApply,
}: PromptOptimizerDialogProps) {
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);
  const session = getActiveSession();

  // State
  const [style, setStyle] = useState<PromptOptimizationStyle>('detailed');
  const [customPrompt, setCustomPrompt] = useState('');
  const [preserveIntent, setPreserveIntent] = useState(true);
  const [enhanceClarity, setEnhanceClarity] = useState(true);
  const [addContext, setAddContext] = useState(false);
  const [useSessionModel, setUseSessionModel] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>(session?.provider || 'openai');
  const [selectedModel, setSelectedModel] = useState<string>(session?.model || 'gpt-4o-mini');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizedPrompt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Get available providers
  const availableProviders = Object.entries(providerSettings)
    .filter(([, settings]) => settings.enabled && settings.apiKey)
    .map(([id]) => id);

  // Get models for selected provider
  const getModelsForProvider = (providerId: string) => {
    const provider = PROVIDERS[providerId];
    return provider?.models || [];
  };

  const handleOptimize = useCallback(async () => {
    setIsOptimizing(true);
    setError(null);
    setResult(null);

    const provider = useSessionModel ? (session?.provider || 'openai') : selectedProvider;
    const model = useSessionModel ? (session?.model || 'gpt-4o-mini') : selectedModel;
    const settings = providerSettings[provider];

    if (!settings?.apiKey) {
      setError(`No API key configured for ${provider}`);
      setIsOptimizing(false);
      return;
    }

    try {
      const optimizeResult = await optimizePrompt({
        prompt: initialPrompt,
        config: {
          style,
          targetProvider: provider,
          targetModel: model,
          customPrompt: style === 'custom' ? customPrompt : undefined,
          preserveIntent,
          enhanceClarity,
          addContext,
        },
        apiKey: settings.apiKey,
        baseURL: settings.baseURL,
      });

      if (optimizeResult.success && optimizeResult.optimizedPrompt) {
        setResult(optimizeResult.optimizedPrompt);
      } else {
        setError(optimizeResult.error || 'Failed to optimize prompt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsOptimizing(false);
    }
  }, [
    initialPrompt,
    style,
    customPrompt,
    preserveIntent,
    enhanceClarity,
    addContext,
    useSessionModel,
    selectedProvider,
    selectedModel,
    session,
    providerSettings,
  ]);

  const handleApply = useCallback(() => {
    if (result) {
      onApply(result.optimized);
      onOpenChange(false);
    }
  }, [result, onApply, onOpenChange]);

  const handleCopy = useCallback(async () => {
    if (result) {
      await navigator.clipboard.writeText(result.optimized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Prompt Optimizer
          </DialogTitle>
          <DialogDescription>
            Enhance your prompt using AI to get better responses
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="style" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="style" className="space-y-4 mt-4">
            {/* Original Prompt */}
            <div className="space-y-2">
              <Label>Original Prompt</Label>
              <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                {initialPrompt || <span className="text-muted-foreground italic">No prompt provided</span>}
              </div>
            </div>

            {/* Style Selection */}
            <div className="space-y-2">
              <Label>Optimization Style</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStyle(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all hover:bg-accent',
                      style === option.value && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className={cn(
                      'text-muted-foreground',
                      style === option.value && 'text-primary'
                    )}>
                      {option.icon}
                    </div>
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt Input */}
            {style === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Instructions</Label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Enter your custom optimization instructions..."
                  className="min-h-[100px]"
                />
              </div>
            )}

            {/* Quick Options */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="preserve-intent"
                  checked={preserveIntent}
                  onCheckedChange={setPreserveIntent}
                />
                <Label htmlFor="preserve-intent" className="text-sm">
                  Preserve intent
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="enhance-clarity"
                  checked={enhanceClarity}
                  onCheckedChange={setEnhanceClarity}
                />
                <Label htmlFor="enhance-clarity" className="text-sm">
                  Enhance clarity
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="add-context"
                  checked={addContext}
                  onCheckedChange={setAddContext}
                />
                <Label htmlFor="add-context" className="text-sm">
                  Add context
                </Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            {/* Model Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="use-session-model"
                  checked={useSessionModel}
                  onCheckedChange={setUseSessionModel}
                />
                <Label htmlFor="use-session-model">
                  Use current session model ({session?.model || 'default'})
                </Label>
              </div>

              {!useSessionModel && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={selectedProvider}
                      onValueChange={(value) => {
                        setSelectedProvider(value);
                        const models = getModelsForProvider(value);
                        if (models.length > 0) {
                          setSelectedModel(models[0].id);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviders.map((providerId) => (
                          <SelectItem key={providerId} value={providerId}>
                            {PROVIDERS[providerId]?.name || providerId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getModelsForProvider(selectedProvider).map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Result Display */}
        {result && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <Label className="text-primary">Optimized Prompt</Label>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {result.optimized}
            </div>
            {result.improvements.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.improvements.map((improvement, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {improvement}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {result ? (
            <Button onClick={handleApply} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Apply Optimized Prompt
            </Button>
          ) : (
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || !initialPrompt.trim()}
              className="gap-2"
            >
              {isOptimizing ? (
                <>
                  <Loader size={16} />
                  Optimizing...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Optimize
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PromptOptimizerDialog;
