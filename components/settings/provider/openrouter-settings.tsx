'use client';

/**
 * OpenRouter Settings Component
 * Provides UI for BYOK, API key management, credits display, and provider ordering
 * https://openrouter.ai/docs
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { nanoid } from 'nanoid';
import {
  Key,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  DollarSign,
  Settings2,
  Shield,
  List,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/stores';
import type { BYOKKeyEntry, BYOKProvider, OpenRouterExtendedSettings } from '@/types/provider';
import type { OpenRouterModel } from '@/types/provider/openrouter';
import {
  getCredits,
  formatCredits,
  maskApiKey,
  OpenRouterError,
  listModels,
} from '@/lib/ai/providers/openrouter';
import {
  BYOK_PROVIDERS,
  getConfigPlaceholder,
  getConfigHelp,
} from '@/lib/ai/providers/openrouter-config';

interface OpenRouterSettingsProps {
  className?: string;
}

export function OpenRouterSettings({ className }: OpenRouterSettingsProps) {
  const t = useTranslations('providers');
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const updateProviderSettings = useSettingsStore((state) => state.updateProviderSettings);
  
  const settings = providerSettings.openrouter;
  const openRouterSettings = useMemo(() => settings?.openRouterSettings || {}, [settings?.openRouterSettings]);
  
  const [isCreditsLoading, setIsCreditsLoading] = useState(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [isByokOpen, setIsByokOpen] = useState(false);
  const [isProviderOrderOpen, setIsProviderOrderOpen] = useState(false);
  const [isModelsOpen, setIsModelsOpen] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [newByokProvider, setNewByokProvider] = useState<BYOKProvider | ''>('');
  const [newByokConfig, setNewByokConfig] = useState('');
  const [newByokName, setNewByokName] = useState('');

  const updateOpenRouterSettings = useCallback((updates: Partial<OpenRouterExtendedSettings>) => {
    updateProviderSettings('openrouter', {
      openRouterSettings: {
        ...openRouterSettings,
        ...updates,
      },
    });
  }, [openRouterSettings, updateProviderSettings]);

  const fetchCredits = useCallback(async () => {
    if (!settings?.apiKey) return;
    
    setIsCreditsLoading(true);
    setCreditsError(null);
    
    try {
      const creditsData = await getCredits(settings.apiKey);
      updateOpenRouterSettings({
        credits: creditsData.credits,
        creditsUsed: creditsData.credits_used,
        creditsRemaining: creditsData.credits_remaining,
        creditsLastFetched: Date.now(),
      });
    } catch (error) {
      if (error instanceof OpenRouterError) {
        setCreditsError(error.message);
      } else {
        setCreditsError('Failed to fetch credits');
      }
    } finally {
      setIsCreditsLoading(false);
    }
  }, [settings?.apiKey, updateOpenRouterSettings]);

  // Fetch credits on mount if API key exists
  useEffect(() => {
    if (settings?.apiKey && !openRouterSettings.creditsLastFetched) {
      fetchCredits();
    }
  }, [settings?.apiKey, openRouterSettings.creditsLastFetched, fetchCredits]);

  const fetchAvailableModels = useCallback(async () => {
    setIsModelsLoading(true);
    setModelsError(null);

    try {
      const models = await listModels(settings?.apiKey);
      setAvailableModels(models);
      updateOpenRouterSettings({
        modelsLastFetched: Date.now(),
      });
    } catch (error) {
      if (error instanceof OpenRouterError) {
        setModelsError(error.message);
      } else {
        setModelsError('Failed to fetch models');
      }
    } finally {
      setIsModelsLoading(false);
    }
  }, [settings?.apiKey, updateOpenRouterSettings]);

  const addByokKey = useCallback(() => {
    if (!newByokProvider || !newByokConfig) return;
    
    const newKey: BYOKKeyEntry = {
      id: nanoid(),
      provider: newByokProvider,
      config: newByokConfig,
      alwaysUse: false,
      enabled: true,
      name: newByokName || undefined,
    };
    
    const existingKeys = openRouterSettings.byokKeys || [];
    updateOpenRouterSettings({
      byokKeys: [...existingKeys, newKey],
    });
    
    setNewByokProvider('');
    setNewByokConfig('');
    setNewByokName('');
  }, [newByokProvider, newByokConfig, newByokName, openRouterSettings.byokKeys, updateOpenRouterSettings]);

  const removeByokKey = useCallback((id: string) => {
    const existingKeys = openRouterSettings.byokKeys || [];
    updateOpenRouterSettings({
      byokKeys: existingKeys.filter(k => k.id !== id),
    });
  }, [openRouterSettings.byokKeys, updateOpenRouterSettings]);

  const updateByokKey = useCallback((id: string, updates: Partial<BYOKKeyEntry>) => {
    const existingKeys = openRouterSettings.byokKeys || [];
    updateOpenRouterSettings({
      byokKeys: existingKeys.map(k => k.id === id ? { ...k, ...updates } : k),
    });
  }, [openRouterSettings.byokKeys, updateOpenRouterSettings]);

  const selectedProviderConfig = BYOK_PROVIDERS.find(p => p.id === newByokProvider);

  if (!settings?.enabled) {
    return null;
  }

  return (
    <div className={className}>
      {/* Credits Display */}
      {settings.apiKey && (
        <Card className="mb-4">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <CardTitle className="text-sm">{t('openRouterCredits')}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchCredits}
                disabled={isCreditsLoading}
              >
                {isCreditsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-2">
            {creditsError ? (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {creditsError}
              </div>
            ) : openRouterSettings.credits !== undefined ? (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('total')}</p>
                  <p className="font-medium">{formatCredits(openRouterSettings.credits || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('used')}</p>
                  <p className="font-medium">{formatCredits(openRouterSettings.creditsUsed || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('remaining')}</p>
                  <p className="font-medium text-green-600">{formatCredits(openRouterSettings.creditsRemaining || 0)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('clickRefreshToLoad')}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Models Section */}
      <Collapsible open={isModelsOpen} onOpenChange={setIsModelsOpen}>
        <Card className="mb-4">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <CardTitle className="text-sm">{t('availableModels') || 'Available Models'}</CardTitle>
                  {availableModels.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {availableModels.length}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchAvailableModels();
                    }}
                    disabled={isModelsLoading}
                  >
                    {isModelsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  {isModelsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
              <CardDescription className="text-xs">
                {t('openRouterModelsDesc') || 'Browse available models on OpenRouter'}
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {modelsError ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {modelsError}
                </div>
              ) : availableModels.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableModels.slice(0, 50).map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 text-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Zap className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="font-mono text-xs block truncate">{model.name || model.id}</span>
                          {model.context_length && (
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(model.context_length / 1000)}K context
                            </span>
                          )}
                        </div>
                      </div>
                      {model.pricing && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          ${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}/1M
                        </Badge>
                      )}
                    </div>
                  ))}
                  {availableModels.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      +{availableModels.length - 50} more models
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('clickRefreshToLoad') || 'Click refresh to load models'}
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* BYOK Section */}
      <Collapsible open={isByokOpen} onOpenChange={setIsByokOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <CardTitle className="text-sm">{t('byok.title')}</CardTitle>
                  {(openRouterSettings.byokKeys?.length || 0) > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {openRouterSettings.byokKeys?.length}
                    </Badge>
                  )}
                </div>
                {isByokOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
              <CardDescription className="text-xs">
                {t('byok.description')}
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Existing BYOK Keys */}
                {openRouterSettings.byokKeys?.map((key) => {
                  const providerInfo = BYOK_PROVIDERS.find(p => p.id === key.provider);
                  return (
                    <div
                      key={key.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {key.name || providerInfo?.name || key.provider}
                          </span>
                          {key.enabled && (
                            <Badge variant="outline" className="text-xs">{t('active')}</Badge>
                          )}
                          {key.alwaysUse && (
                            <Badge variant="secondary" className="text-xs">{t('byok.alwaysUse')}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {key.config.length > 20 ? maskApiKey(key.config) : key.config}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Switch
                                checked={key.alwaysUse}
                                onCheckedChange={(checked) => updateByokKey(key.id, { alwaysUse: checked })}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('byok.alwaysUseHint')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Switch
                          checked={key.enabled}
                          onCheckedChange={(checked) => updateByokKey(key.id, { enabled: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeByokKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <Separator />

                {/* Add New BYOK Key */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t('byok.addProviderKey')}</Label>
                  <Select
                    value={newByokProvider}
                    onValueChange={(value) => setNewByokProvider(value as BYOKProvider)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {BYOK_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div className="flex flex-col">
                            <span>{provider.name}</span>
                            <span className="text-xs text-muted-foreground">{provider.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {newByokProvider && (
                    <>
                      <Input
                        placeholder="Key name (optional)"
                        value={newByokName}
                        onChange={(e) => setNewByokName(e.target.value)}
                      />
                      
                      {selectedProviderConfig?.configType === 'simple' ? (
                        <Input
                          type="password"
                          placeholder="API Key"
                          value={newByokConfig}
                          onChange={(e) => setNewByokConfig(e.target.value)}
                        />
                      ) : (
                        <div className="space-y-2">
                          <Textarea
                            placeholder={getConfigPlaceholder(selectedProviderConfig?.configType)}
                            value={newByokConfig}
                            onChange={(e) => setNewByokConfig(e.target.value)}
                            rows={6}
                            className="font-mono text-xs"
                          />
                          <p className="text-xs text-muted-foreground">
                            {getConfigHelp(selectedProviderConfig?.configType)}
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={addByokKey}
                        disabled={!newByokConfig}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('byok.addKey')}
                      </Button>
                    </>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  <a
                    href="https://openrouter.ai/docs/guides/overview/auth/byok"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {t('byok.learnMore')} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Provider Ordering Section */}
      <Collapsible open={isProviderOrderOpen} onOpenChange={setIsProviderOrderOpen} className="mt-4">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  <CardTitle className="text-sm">{t('providerOrdering.title')}</CardTitle>
                </div>
                {isProviderOrderOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
              <CardDescription className="text-xs">
                {t('providerOrdering.description')}
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="provider-ordering-enabled" className="text-sm">
                    {t('providerOrdering.enable')}
                  </Label>
                  <Switch
                    id="provider-ordering-enabled"
                    checked={openRouterSettings.providerOrdering?.enabled || false}
                    onCheckedChange={(checked) => 
                      updateOpenRouterSettings({
                        providerOrdering: {
                          ...openRouterSettings.providerOrdering,
                          enabled: checked,
                          allowFallbacks: openRouterSettings.providerOrdering?.allowFallbacks ?? true,
                          order: openRouterSettings.providerOrdering?.order || [],
                        },
                      })
                    }
                  />
                </div>

                {openRouterSettings.providerOrdering?.enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="allow-fallbacks" className="text-sm">
                          {t('providerOrdering.allowFallbacks')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('providerOrdering.fallbackHint')}
                        </p>
                      </div>
                      <Switch
                        id="allow-fallbacks"
                        checked={openRouterSettings.providerOrdering?.allowFallbacks ?? true}
                        onCheckedChange={(checked) =>
                          updateOpenRouterSettings({
                            providerOrdering: {
                              ...openRouterSettings.providerOrdering!,
                              allowFallbacks: checked,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">{t('providerOrdering.order')}</Label>
                      <Textarea
                        placeholder="e.g., Amazon Bedrock, Google Vertex AI, Anthropic"
                        value={openRouterSettings.providerOrdering?.order?.join(', ') || ''}
                        onChange={(e) => {
                          const order = e.target.value
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean);
                          updateOpenRouterSettings({
                            providerOrdering: {
                              ...openRouterSettings.providerOrdering!,
                              order,
                            },
                          });
                        }}
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('providerOrdering.orderHint')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Site Attribution */}
      <Card className="mt-4">
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <CardTitle className="text-sm">{t('appAttribution')}</CardTitle>
          </div>
          <CardDescription className="text-xs">
            {t('appAttributionDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <Label htmlFor="site-url" className="text-xs">{t('siteUrl')}</Label>
              <Input
                id="site-url"
                placeholder="https://your-app.com"
                value={openRouterSettings.siteUrl || ''}
                onChange={(e) => updateOpenRouterSettings({ siteUrl: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="site-name" className="text-xs">{t('siteName')}</Label>
              <Input
                id="site-name"
                placeholder="Your App Name"
                value={openRouterSettings.siteName || ''}
                onChange={(e) => updateOpenRouterSettings({ siteName: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
