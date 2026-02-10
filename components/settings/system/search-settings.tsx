'use client';

/**
 * SearchSettings - Configure multi-provider web search
 */

import { useState, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  ExternalLink,
  Search,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Globe,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSettingsStore } from '@/stores';
import {
  type SearchProviderType,
  SEARCH_PROVIDERS,
  validateApiKey,
} from '@/types/search';
import { testProviderConnection } from '@/lib/search/provider-test';
import { SEARCH_SOURCES } from '@/lib/search/search-constants';
import type { ProviderTestState } from '@/types/ui/keyboard';
import { cn } from '@/lib/utils';

export function SearchSettings() {
  const t = useTranslations('searchSettings');
  const _tc = useTranslations('common');

  const searchProviders = useSettingsStore((state) => state.searchProviders);
  const setSearchProviderApiKey = useSettingsStore((state) => state.setSearchProviderApiKey);
  const setSearchProviderEnabled = useSettingsStore((state) => state.setSearchProviderEnabled);
  const searchEnabled = useSettingsStore((state) => state.searchEnabled);
  const setSearchEnabled = useSettingsStore((state) => state.setSearchEnabled);
  const searchMaxResults = useSettingsStore((state) => state.searchMaxResults);
  const setSearchMaxResults = useSettingsStore((state) => state.setSearchMaxResults);
  const searchFallbackEnabled = useSettingsStore((state) => state.searchFallbackEnabled);
  const setSearchFallbackEnabled = useSettingsStore((state) => state.setSearchFallbackEnabled);
  const defaultSearchProvider = useSettingsStore((state) => state.defaultSearchProvider);
  const setDefaultSearchProvider = useSettingsStore((state) => state.setDefaultSearchProvider);
  const setSearchProviderPriority = useSettingsStore((state) => state.setSearchProviderPriority);
  const defaultSearchSources = useSettingsStore((state) => state.defaultSearchSources);
  const setDefaultSearchSources = useSettingsStore((state) => state.setDefaultSearchSources);

  const toggleSearchSource = (sourceId: string) => {
    if (defaultSearchSources.includes(sourceId)) {
      setDefaultSearchSources(defaultSearchSources.filter(s => s !== sourceId));
    } else {
      setDefaultSearchSources([...defaultSearchSources, sourceId]);
    }
  };

  const adjustPriority = (providerId: SearchProviderType, delta: number) => {
    const currentPriority = searchProviders[providerId]?.priority ?? 5;
    const newPriority = Math.max(1, Math.min(10, currentPriority + delta));
    setSearchProviderPriority(providerId, newPriority);
  };

  const [showKeys, setShowKeys] = useState<Record<SearchProviderType, boolean>>({
    tavily: false,
    perplexity: false,
    exa: false,
    searchapi: false,
    serpapi: false,
    bing: false,
    google: false,
    'google-ai': false,
    brave: false,
  });

  const [testStates, setTestStates] = useState<Record<SearchProviderType, ProviderTestState>>({
    tavily: { testing: false, result: null },
    perplexity: { testing: false, result: null },
    exa: { testing: false, result: null },
    searchapi: { testing: false, result: null },
    serpapi: { testing: false, result: null },
    bing: { testing: false, result: null },
    google: { testing: false, result: null },
    'google-ai': { testing: false, result: null },
    brave: { testing: false, result: null },
  });

  const [expandedProviders, setExpandedProviders] = useState<Record<SearchProviderType, boolean>>({
    tavily: true,
    perplexity: false,
    exa: false,
    searchapi: false,
    serpapi: false,
    bing: false,
    google: false,
    'google-ai': false,
    brave: false,
  });

  const toggleShowKey = useCallback((providerId: SearchProviderType) => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  }, []);

  const toggleExpanded = useCallback((providerId: SearchProviderType) => {
    setExpandedProviders((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  }, []);

  const handleTestConnection = useCallback(async (providerId: SearchProviderType) => {
    const apiKey = searchProviders[providerId]?.apiKey;
    if (!apiKey) return;

    setTestStates((prev) => ({
      ...prev,
      [providerId]: { testing: true, result: null },
    }));

    try {
      const isValid = await testProviderConnection(providerId, apiKey);
      setTestStates((prev) => ({
        ...prev,
        [providerId]: { testing: false, result: isValid ? 'success' : 'error' },
      }));
    } catch {
      setTestStates((prev) => ({
        ...prev,
        [providerId]: { testing: false, result: 'error' },
      }));
    }
  }, [searchProviders]);

  const enabledCount = Object.values(searchProviders).filter(
    (p) => p.enabled && p.apiKey
  ).length;

  const providerIds = Object.keys(SEARCH_PROVIDERS) as SearchProviderType[];

  // Get configured providers for default selection
  const configuredProviders = providerIds.filter(
    id => searchProviders[id]?.apiKey && searchProviders[id]?.enabled
  );

  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-4">
      {/* Global Search Settings + Research Sources */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{t('title')}</CardTitle>
              <CardDescription className="text-xs">{t('description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Search & Fallback — responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">{t('enableSearch')}</Label>
              <Switch
                checked={searchEnabled}
                onCheckedChange={setSearchEnabled}
                disabled={enabledCount === 0}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">{t('fallbackEnabled') || 'Fallback'}</Label>
              <Switch
                checked={searchFallbackEnabled}
                onCheckedChange={setSearchFallbackEnabled}
                disabled={!searchEnabled}
              />
            </div>
          </div>

          {/* Default Provider + Max Results — responsive side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Default Provider Selection */}
            <div className="space-y-2">
              <Label className="text-sm">{t('defaultProvider') || 'Default Provider'}</Label>
              <Select
                value={defaultSearchProvider}
                onValueChange={(value) => setDefaultSearchProvider(value as SearchProviderType)}
                disabled={!searchEnabled || configuredProviders.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectProvider') || 'Select provider'} />
                </SelectTrigger>
                <SelectContent>
                  {configuredProviders.length > 0 ? (
                    configuredProviders.map((id) => (
                      <SelectItem key={id} value={id}>
                        <span className="flex items-center gap-2">
                          {SEARCH_PROVIDERS[id].name}
                          {searchProviders[id]?.priority === 1 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">{t('primary')}</Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="tavily" disabled>
                      {t('noProviders') || 'No providers configured'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {configuredProviders.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('configureProviderHint') || 'Configure at least one search provider below'}
                </p>
              )}
            </div>

            {/* Max Results */}
            <div className="space-y-2">
              <Label className="text-sm">{t('maxResults')}: {searchMaxResults}</Label>
              <Slider
                value={[searchMaxResults]}
                onValueChange={([value]) => setSearchMaxResults(value)}
                min={1}
                max={10}
                step={1}
                disabled={!searchEnabled}
              />
            </div>
          </div>

          {/* Research Sources — collapsible section */}
          <Collapsible open={sourcesExpanded} onOpenChange={setSourcesExpanded}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{t('researchSources') || 'Research Sources'}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {defaultSearchSources.length} {t('selected') || 'selected'}
                  </Badge>
                </div>
                <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', sourcesExpanded && 'rotate-90')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="flex flex-wrap gap-2">
                {SEARCH_SOURCES.map((source) => {
                  const isSelected = defaultSearchSources.includes(source.id);
                  return (
                    <button
                      key={source.id}
                      onClick={() => toggleSearchSource(source.id)}
                      disabled={!searchEnabled}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80',
                        !searchEnabled && 'opacity-50 cursor-not-allowed',
                        searchEnabled && 'cursor-pointer'
                      )}
                    >
                      <span>{source.icon}</span>
                      <span>{source.name}</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {t('researchSourcesDesc') || 'Default sources for deep research mode'}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Search Providers */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              {t('providers') || 'Search Providers'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {enabledCount}/{providerIds.length} {t('enabled') || 'enabled'}
              </Badge>
              {configuredProviders.length > 0 && defaultSearchProvider && (
                <Badge variant="outline" className="text-[10px]">
                  {SEARCH_PROVIDERS[defaultSearchProvider]?.name}
                </Badge>
              )}
            </div>
          </div>
          <CardDescription className="text-xs">
            {t('providersDescription') || 'Configure API keys for search providers'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {providerIds.map((providerId) => {
            const config = SEARCH_PROVIDERS[providerId];
            const settings = searchProviders[providerId];
            const testState = testStates[providerId];
            const isExpanded = expandedProviders[providerId];
            const showKey = showKeys[providerId];
            const isValidKey = settings?.apiKey ? validateApiKey(providerId, settings.apiKey) : false;
            const isActive = settings?.enabled && settings?.apiKey;

            return (
              <Collapsible
                key={providerId}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(providerId)}
              >
                <div className={cn(
                  'border rounded-lg transition-colors',
                  isActive && 'border-primary/30 bg-primary/[0.02]',
                  !settings?.enabled && !isExpanded && 'opacity-70'
                )}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium">{config.name}</span>
                            {isActive && (
                              <Badge variant="default" className="text-[10px] px-1 py-0">
                                {t('active') || 'Active'}
                              </Badge>
                            )}
                            {config.features.aiAnswer && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                AI
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">
                            {config.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={settings?.enabled ?? false}
                          onCheckedChange={(enabled) => setSearchProviderEnabled(providerId, enabled)}
                          disabled={!settings?.apiKey}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-3 border-t pt-3">
                      {/* API Key */}
                      <div className="space-y-1.5">
                        <Label htmlFor={`${providerId}-key`} className="text-xs">{t('apiKey')}</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id={`${providerId}-key`}
                              type={showKey ? 'text' : 'password'}
                              placeholder={config.apiKeyPlaceholder}
                              value={settings?.apiKey ?? ''}
                              onChange={(e) => setSearchProviderApiKey(providerId, e.target.value)}
                              className="pr-10"
                              autoComplete="off"
                              data-form-type="other"
                              data-lpignore="true"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => toggleShowKey(providerId)}
                            >
                              {showKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleTestConnection(providerId)}
                            disabled={!settings?.apiKey || testState.testing}
                          >
                            {testState.testing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              t('testConnection')
                            )}
                          </Button>
                        </div>

                        {/* Test Result */}
                        {testState.result === 'success' && (
                          <p className="flex items-center gap-1 text-xs text-green-600">
                            <Check className="h-3.5 w-3.5" /> {t('connectionSuccess')}
                          </p>
                        )}
                        {testState.result === 'error' && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" /> {t('connectionFailed')}
                          </p>
                        )}
                        {settings?.apiKey && !isValidKey && (
                          <p className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertCircle className="h-3.5 w-3.5" /> {t('invalidKeyFormat') || 'Invalid key format'}
                          </p>
                        )}

                        {/* Docs Link */}
                        <p className="text-xs text-muted-foreground">
                          {t('getApiKey') || 'Get your API key at'}{' '}
                          <a
                            href={config.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {config.name} <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      </div>

                      {/* Priority Control */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          {t('priority') || 'Priority'}: P{settings?.priority ?? 5}
                        </Label>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => adjustPriority(providerId, -1)}
                                disabled={!settings?.enabled}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{t('higherPriority')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => adjustPriority(providerId, 1)}
                                disabled={!settings?.enabled}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{t('lowerPriority')}</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Features + Pricing — compact row */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex flex-wrap gap-1">
                          {config.features.aiAnswer && (
                            <Badge variant="secondary" className="text-[10px]">{t('features.aiAnswer')}</Badge>
                          )}
                          {config.features.newsSearch && (
                            <Badge variant="secondary" className="text-[10px]">{t('features.news')}</Badge>
                          )}
                          {config.features.imageSearch && (
                            <Badge variant="secondary" className="text-[10px]">{t('features.images')}</Badge>
                          )}
                          {config.features.academicSearch && (
                            <Badge variant="secondary" className="text-[10px]">{t('features.academic')}</Badge>
                          )}
                          {config.features.recencyFilter && (
                            <Badge variant="secondary" className="text-[10px]">{t('features.recencyFilter')}</Badge>
                          )}
                          {config.features.domainFilter && (
                            <Badge variant="secondary" className="text-[10px]">{t('features.domainFilter')}</Badge>
                          )}
                          {config.features.contentExtraction && (
                            <Badge variant="secondary" className="text-[10px]">{t('features.contentExtraction')}</Badge>
                          )}
                        </div>
                        {config.pricing && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {config.pricing.freeCredits && (
                              <>{config.pricing.freeCredits} free • </>
                            )}
                            {config.pricing.pricePerSearch && (
                              <>${config.pricing.pricePerSearch}/search</>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}

export default SearchSettings;
