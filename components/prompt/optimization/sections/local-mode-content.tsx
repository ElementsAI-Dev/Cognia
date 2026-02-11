'use client';

import { useTranslations } from 'next-intl';
import {
  FileText,
  Lightbulb,
  Sparkles,
  Briefcase,
  GraduationCap,
  Code,
  Settings2,
  ListOrdered,
  Table2,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ProviderIcon } from '@/components/providers/ai/provider-icon';
import { PROVIDERS } from '@/types/provider';
import type { PromptOptimizationStyle } from '@/types/content/prompt';

const STYLE_OPTIONS: {
  value: PromptOptimizationStyle;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
}[] = [
  { value: 'concise', labelKey: 'concise', descriptionKey: 'conciseDesc', icon: <FileText className="h-4 w-4" /> },
  { value: 'detailed', labelKey: 'detailed', descriptionKey: 'detailedDesc', icon: <Lightbulb className="h-4 w-4" /> },
  { value: 'creative', labelKey: 'creative', descriptionKey: 'creativeDesc', icon: <Sparkles className="h-4 w-4" /> },
  { value: 'professional', labelKey: 'professional', descriptionKey: 'professionalDesc', icon: <Briefcase className="h-4 w-4" /> },
  { value: 'academic', labelKey: 'academic', descriptionKey: 'academicDesc', icon: <GraduationCap className="h-4 w-4" /> },
  { value: 'technical', labelKey: 'technical', descriptionKey: 'technicalDesc', icon: <Code className="h-4 w-4" /> },
  { value: 'step-by-step', labelKey: 'stepByStep', descriptionKey: 'stepByStepDesc', icon: <ListOrdered className="h-4 w-4" /> },
  { value: 'structured', labelKey: 'structured', descriptionKey: 'structuredDesc', icon: <Table2 className="h-4 w-4" /> },
  { value: 'custom', labelKey: 'custom', descriptionKey: 'customDesc', icon: <Settings2 className="h-4 w-4" /> },
];

interface LocalModeContentProps {
  initialPrompt: string;
  style: PromptOptimizationStyle;
  customPrompt: string;
  preserveIntent: boolean;
  enhanceClarity: boolean;
  addContext: boolean;
  useSessionModel: boolean;
  selectedProvider: string;
  selectedModel: string;
  sessionModel: string | undefined;
  availableProviders: string[];
  onStyleChange: (style: PromptOptimizationStyle) => void;
  onCustomPromptChange: (value: string) => void;
  onPreserveIntentChange: (value: boolean) => void;
  onEnhanceClarityChange: (value: boolean) => void;
  onAddContextChange: (value: boolean) => void;
  onUseSessionModelChange: (value: boolean) => void;
  onProviderChange: (value: string) => void;
  onModelChange: (value: string) => void;
}

export function LocalModeContent({
  initialPrompt,
  style,
  customPrompt,
  preserveIntent,
  enhanceClarity,
  addContext,
  useSessionModel,
  selectedProvider,
  selectedModel,
  sessionModel,
  availableProviders,
  onStyleChange,
  onCustomPromptChange,
  onPreserveIntentChange,
  onEnhanceClarityChange,
  onAddContextChange,
  onUseSessionModelChange,
  onProviderChange,
  onModelChange,
}: LocalModeContentProps) {
  const t = useTranslations('promptOptimizer');
  const tCommon = useTranslations('common');

  const getModelsForProvider = (providerId: string) => {
    const provider = PROVIDERS[providerId];
    return provider?.models || [];
  };

  return (
    <Tabs defaultValue="style" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="style">{t('style')}</TabsTrigger>
        <TabsTrigger value="settings">{tCommon('settings')}</TabsTrigger>
      </TabsList>

      <TabsContent value="style" className="space-y-4 mt-4">
        {/* Original Prompt */}
        <div className="space-y-2">
          <Label>{t('originalPrompt')}</Label>
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            {initialPrompt || <span className="text-muted-foreground italic">{t('noPrompt')}</span>}
          </div>
        </div>

        {/* Style Selection */}
        <div className="space-y-2">
          <Label>{t('optimizationStyle')}</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onStyleChange(option.value)}
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
                <span className="text-sm font-medium">{t(option.labelKey)}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {t(option.descriptionKey)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt Input */}
        {style === 'custom' && (
          <div className="space-y-2">
            <Label>{t('customInstructions')}</Label>
            <Textarea
              value={customPrompt}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              placeholder={t('customPlaceholder')}
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
              onCheckedChange={onPreserveIntentChange}
            />
            <Label htmlFor="preserve-intent" className="text-sm">
              {t('preserveIntent')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="enhance-clarity"
              checked={enhanceClarity}
              onCheckedChange={onEnhanceClarityChange}
            />
            <Label htmlFor="enhance-clarity" className="text-sm">
              {t('enhanceClarity')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="add-context"
              checked={addContext}
              onCheckedChange={onAddContextChange}
            />
            <Label htmlFor="add-context" className="text-sm">
              {t('addContext')}
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
              onCheckedChange={onUseSessionModelChange}
            />
            <Label htmlFor="use-session-model">
              {t('useSessionModel')} ({sessionModel || 'default'})
            </Label>
          </div>

          {!useSessionModel && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('provider')}</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={(value) => {
                    onProviderChange(value);
                    const models = getModelsForProvider(value);
                    if (models.length > 0) {
                      onModelChange(models[0].id);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map((providerId) => (
                      <SelectItem key={providerId} value={providerId} showIconInTrigger>
                        <ProviderIcon icon={`/icons/providers/${providerId}.svg`} size={16} />
                        {PROVIDERS[providerId]?.name || providerId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('model')}</Label>
                <Select value={selectedModel} onValueChange={onModelChange}>
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
  );
}
