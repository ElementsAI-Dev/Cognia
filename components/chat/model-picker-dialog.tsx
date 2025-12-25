'use client';

/**
 * ModelPickerDialog - Searchable model selection dialog
 * Features: search, category filtering, recent models, provider grouping
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Sparkles,
  Globe,
  Zap,
  Server,
  Shield,
  Check,
  Eye,
  Wrench,
  Clock,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { PROVIDERS, type ProviderConfig } from '@/types/provider';

// Category definitions
type ProviderCategory = 'all' | 'flagship' | 'aggregator' | 'specialized' | 'local';

const CATEGORY_CONFIG: Record<ProviderCategory, { label: string; icon: React.ReactNode; description: string }> = {
  all: { label: 'All', icon: null, description: 'All available models' },
  flagship: { label: 'Flagship', icon: <Sparkles className="h-3 w-3" />, description: 'OpenAI, Anthropic, Google, xAI' },
  aggregator: { label: 'Aggregator', icon: <Globe className="h-3 w-3" />, description: 'OpenRouter, Together AI' },
  specialized: { label: 'Fast', icon: <Zap className="h-3 w-3" />, description: 'Groq, Cerebras, DeepSeek' },
  local: { label: 'Local', icon: <Server className="h-3 w-3" />, description: 'Ollama' },
};

// Map provider IDs to categories
const PROVIDER_CATEGORIES: Record<string, ProviderCategory> = {
  openai: 'flagship',
  anthropic: 'flagship',
  google: 'flagship',
  xai: 'flagship',
  openrouter: 'aggregator',
  togetherai: 'aggregator',
  groq: 'specialized',
  cerebras: 'specialized',
  deepseek: 'specialized',
  fireworks: 'specialized',
  mistral: 'specialized',
  cohere: 'specialized',
  sambanova: 'specialized',
  ollama: 'local',
};

// Recent model entry
interface RecentModel {
  provider: string;
  model: string;
  usedAt: number;
}

// Local storage key for recent models
const RECENT_MODELS_KEY = 'cognia-recent-models';
const MAX_RECENT_MODELS = 5;

// Get recent models from localStorage
function getRecentModels(): RecentModel[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_MODELS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save recent models to localStorage
function saveRecentModels(models: RecentModel[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECENT_MODELS_KEY, JSON.stringify(models.slice(0, MAX_RECENT_MODELS)));
  } catch {
    // Ignore storage errors
  }
}

// Add a model to recent list
function addToRecentModels(provider: string, model: string): void {
  const recent = getRecentModels().filter(
    (r) => !(r.provider === provider && r.model === model)
  );
  recent.unshift({ provider, model, usedAt: Date.now() });
  saveRecentModels(recent);
}

interface ModelPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProvider: string;
  currentModel: string;
  isAutoMode?: boolean;
  onModelSelect: (providerId: string, modelId: string) => void;
  onAutoModeToggle?: () => void;
}

export function ModelPickerDialog({
  open,
  onOpenChange,
  currentProvider,
  currentModel,
  isAutoMode = false,
  onModelSelect,
  onAutoModeToggle,
}: ModelPickerDialogProps) {
  const t = useTranslations('modelPicker');
  const tChat = useTranslations('chat');
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProviderCategory>('all');
  
  // Load recent models - computed fresh each render when dialog is open
  const recentModels = open ? getRecentModels() : [];

  // Get enabled providers only
  const enabledProviders = useMemo(() => {
    return Object.entries(PROVIDERS).filter(([providerId]) => {
      const settings = providerSettings[providerId];
      // For Ollama, check if enabled; for others, check if enabled and has API key
      if (providerId === 'ollama') {
        return settings?.enabled !== false;
      }
      return settings?.enabled !== false && settings?.apiKey;
    });
  }, [providerSettings]);

  // Filter providers by category
  const filteredProviders = useMemo(() => {
    return enabledProviders.filter(([providerId]) => {
      if (category === 'all') return true;
      return PROVIDER_CATEGORIES[providerId] === category;
    });
  }, [enabledProviders, category]);

  // Search filter
  const searchResults = useMemo(() => {
    if (!search.trim()) return filteredProviders;

    const query = search.toLowerCase();
    return filteredProviders
      .map(([providerId, provider]) => {
        const matchedModels = provider.models.filter(
          (model) =>
            model.name.toLowerCase().includes(query) ||
            model.id.toLowerCase().includes(query) ||
            provider.name.toLowerCase().includes(query)
        );
        if (matchedModels.length > 0 || provider.name.toLowerCase().includes(query)) {
          return [providerId, { ...provider, models: matchedModels.length > 0 ? matchedModels : provider.models }] as [string, ProviderConfig];
        }
        return null;
      })
      .filter((item): item is [string, ProviderConfig] => item !== null);
  }, [filteredProviders, search]);

  // Handle model selection
  const handleSelect = useCallback((providerId: string, modelId: string) => {
    addToRecentModels(providerId, modelId);
    onModelSelect(providerId, modelId);
    onOpenChange(false);
    setSearch('');
  }, [onModelSelect, onOpenChange]);

  // Handle auto mode toggle
  const handleAutoToggle = useCallback(() => {
    onAutoModeToggle?.();
    onOpenChange(false);
  }, [onAutoModeToggle, onOpenChange]);

  // Get recent models that are still available
  const availableRecentModels = useMemo(() => {
    return recentModels.filter((recent) => {
      const provider = PROVIDERS[recent.provider];
      const settings = providerSettings[recent.provider];
      if (!provider || !settings) return false;
      if (recent.provider === 'ollama') {
        return settings.enabled !== false;
      }
      return settings.enabled !== false && settings.apiKey && provider.models.some((m) => m.id === recent.model);
    });
  }, [recentModels, providerSettings]);

  // Get category icon
  const getCategoryIcon = (providerId: string) => {
    const cat = PROVIDER_CATEGORIES[providerId];
    switch (cat) {
      case 'flagship': return <Sparkles className="h-3.5 w-3.5 text-amber-500" />;
      case 'aggregator': return <Globe className="h-3.5 w-3.5 text-blue-500" />;
      case 'specialized': return <Zap className="h-3.5 w-3.5 text-green-500" />;
      case 'local': return <Server className="h-3.5 w-3.5 text-purple-500" />;
      default: return <Shield className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden sm:max-w-lg max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-full max-sm:rounded-none max-sm:border-0">
        <DialogTitle className="sr-only">{t('title')}</DialogTitle>
        
        <Command className="rounded-lg border-0" shouldFilter={false}>
          {/* Search Input */}
          <div className="flex items-center border-b px-3 max-sm:px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground max-sm:h-5 max-sm:w-5" />
            <CommandInput
              placeholder={t('searchPlaceholder')}
              value={search}
              onValueChange={setSearch}
              className="h-11 border-0 focus:ring-0 max-sm:h-14 max-sm:text-base"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-muted-foreground hover:text-foreground p-2 -mr-2"
              >
                <X className="h-4 w-4 max-sm:h-5 max-sm:w-5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 border-b px-2 py-1.5 overflow-x-auto max-sm:gap-2 max-sm:px-3 max-sm:py-2">
            {(Object.keys(CATEGORY_CONFIG) as ProviderCategory[]).map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                    'max-sm:px-4 max-sm:py-2.5 max-sm:text-sm max-sm:gap-1.5',
                    category === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted'
                  )}
                >
                  {config.icon}
                  {config.label}
                </button>
              );
            })}
          </div>

          <CommandList className="max-h-[400px] overflow-y-auto max-sm:max-h-[calc(100dvh-130px)]">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {t('noModels')}. {t('configureProviders')}
            </CommandEmpty>

            {/* Auto Mode Toggle */}
            {onAutoModeToggle && !search && (
              <>
                <div className="p-2 max-sm:p-3">
                  <div
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors',
                      'max-sm:p-4',
                      isAutoMode ? 'border-primary bg-primary/5' : 'hover:bg-muted/50 active:bg-muted/50'
                    )}
                    onClick={handleAutoToggle}
                  >
                    <div className="flex items-center gap-3 max-sm:gap-4">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full max-sm:h-10 max-sm:w-10',
                        isAutoMode ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        <Sparkles className="h-4 w-4 max-sm:h-5 max-sm:w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm max-sm:text-base">{tChat('autoMode')}</span>
                          {isAutoMode && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              {t('recentModels')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground max-sm:text-sm">
                          {tChat('autoModeDescription')}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isAutoMode}
                      onCheckedChange={handleAutoToggle}
                      onClick={(e) => e.stopPropagation()}
                      className="max-sm:scale-110"
                    />
                  </div>
                </div>
                <CommandSeparator />
              </>
            )}

            {/* Recent Models */}
            {availableRecentModels.length > 0 && !search && (
              <>
                <CommandGroup heading={t('recentModels')}>
                  {availableRecentModels.slice(0, 3).map((recent) => {
                    const provider = PROVIDERS[recent.provider];
                    const model = provider?.models.find((m) => m.id === recent.model);
                    if (!provider || !model) return null;

                    const isSelected = currentProvider === recent.provider && currentModel === recent.model && !isAutoMode;

                    return (
                      <CommandItem
                        key={`recent-${recent.provider}-${recent.model}`}
                        value={`recent-${recent.provider}-${recent.model}`}
                        onSelect={() => handleSelect(recent.provider, recent.model)}
                        className={cn('flex items-center gap-2 cursor-pointer max-sm:py-3 max-sm:px-3', isSelected && 'bg-accent')}
                      >
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 max-sm:h-4 max-sm:w-4" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate">{model.name}</span>
                            <span className="text-xs text-muted-foreground">• {provider.name}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Provider Groups */}
            {searchResults.map(([providerId, provider]) => (
              <CommandGroup key={providerId} heading={
                <div className="flex items-center gap-1.5">
                  {getCategoryIcon(providerId)}
                  <span>{provider.name}</span>
                  <span className="text-muted-foreground font-normal">
                    ({provider.models.length})
                  </span>
                </div>
              }>
                {provider.models.map((model) => {
                  const isSelected = currentProvider === providerId && currentModel === model.id && !isAutoMode;
                  
                  return (
                    <CommandItem
                      key={`${providerId}-${model.id}`}
                      value={`${providerId}-${model.id}-${model.name}`}
                      onSelect={() => handleSelect(providerId, model.id)}
                      className={cn('flex items-center gap-2 cursor-pointer max-sm:py-3 max-sm:px-3', isSelected && 'bg-accent')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm max-sm:text-base">{model.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground max-sm:text-sm">
                          <span>{(model.contextLength / 1000).toFixed(0)}K context</span>
                          {model.pricing && model.pricing.promptPer1M > 0 && (
                            <span>• ${model.pricing.promptPer1M}/1M</span>
                          )}
                          {model.pricing && model.pricing.promptPer1M === 0 && (
                            <span className="text-green-600">• Free</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {model.supportsTools && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="rounded bg-muted p-1">
                                <Wrench className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{t('tools')}</TooltipContent>
                          </Tooltip>
                        )}
                        {model.supportsVision && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="rounded bg-muted p-1">
                                <Eye className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{t('vision')}</TooltipContent>
                          </Tooltip>
                        )}
                        {isSelected && <Check className="h-4 w-4 text-primary ml-1" />}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
