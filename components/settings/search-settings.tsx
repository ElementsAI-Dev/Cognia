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
  GripVertical,
  Loader2,
  ChevronDown,
  ChevronUp,
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

/**
 * Test provider connection via API route (to avoid importing server-only modules)
 */
async function testProviderConnection(provider: SearchProviderType, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('/api/search/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}

interface ProviderTestState {
  testing: boolean;
  result: 'success' | 'error' | null;
}

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

  const [showKeys, setShowKeys] = useState<Record<SearchProviderType, boolean>>({
    tavily: false,
    perplexity: false,
    exa: false,
    searchapi: false,
    serpapi: false,
    bing: false,
    google: false,
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

  return (
    <div className="space-y-4">
      {/* Global Search Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <CardTitle className="text-base">{t('title')}</CardTitle>
          </div>
          <CardDescription className="text-xs">{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Search & Fallback in grid */}
          <div className="grid grid-cols-2 gap-3">
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

          {/* Max Results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('maxResults')}: {searchMaxResults}</Label>
            </div>
            <Slider
              value={[searchMaxResults]}
              onValueChange={([value]) => setSearchMaxResults(value)}
              min={1}
              max={10}
              step={1}
              disabled={!searchEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Search Providers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {t('providers') || 'Search Providers'}
            <Badge variant="secondary" className="text-[10px]">{enabledCount} {t('enabled') || 'enabled'}</Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            {t('providersDescription') || 'Configure API keys for search providers'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {providerIds.map((providerId) => {
            const config = SEARCH_PROVIDERS[providerId];
            const settings = searchProviders[providerId];
            const testState = testStates[providerId];
            const isExpanded = expandedProviders[providerId];
            const showKey = showKeys[providerId];
            const isValidKey = settings?.apiKey ? validateApiKey(providerId, settings.apiKey) : false;

            return (
              <Collapsible
                key={providerId}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(providerId)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{config.name}</span>
                            {settings?.enabled && settings?.apiKey && (
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
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={settings?.enabled ?? false}
                          onCheckedChange={(enabled) => setSearchProviderEnabled(providerId, enabled)}
                          disabled={!settings?.apiKey}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-3 border-t pt-3">
                      {/* API Key */}
                      <div className="space-y-1.5">
                        <Label htmlFor={`${providerId}-key`} className="text-xs">API Key</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id={`${providerId}-key`}
                              type={showKey ? 'text' : 'password'}
                              placeholder={config.apiKeyPlaceholder}
                              value={settings?.apiKey ?? ''}
                              onChange={(e) => setSearchProviderApiKey(providerId, e.target.value)}
                              className="pr-10"
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
                          <p className="flex items-center gap-1 text-sm text-green-600">
                            <Check className="h-4 w-4" /> {t('connectionSuccess')}
                          </p>
                        )}
                        {testState.result === 'error' && (
                          <p className="flex items-center gap-1 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" /> {t('connectionFailed')}
                          </p>
                        )}
                        {settings?.apiKey && !isValidKey && (
                          <p className="flex items-center gap-1 text-sm text-amber-600">
                            <AlertCircle className="h-4 w-4" /> {t('invalidKeyFormat') || 'Invalid key format'}
                          </p>
                        )}

                        {/* Docs Link */}
                        <p className="text-sm text-muted-foreground">
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

                      {/* Features */}
                      <div className="flex flex-wrap gap-1">
                        {config.features.aiAnswer && (
                          <Badge variant="secondary">AI Answer</Badge>
                        )}
                        {config.features.newsSearch && (
                          <Badge variant="secondary">News</Badge>
                        )}
                        {config.features.imageSearch && (
                          <Badge variant="secondary">Images</Badge>
                        )}
                        {config.features.academicSearch && (
                          <Badge variant="secondary">Academic</Badge>
                        )}
                        {config.features.recencyFilter && (
                          <Badge variant="secondary">Recency Filter</Badge>
                        )}
                        {config.features.domainFilter && (
                          <Badge variant="secondary">Domain Filter</Badge>
                        )}
                        {config.features.contentExtraction && (
                          <Badge variant="secondary">Content Extraction</Badge>
                        )}
                      </div>

                      {/* Pricing Info */}
                      {config.pricing && (
                        <p className="text-xs text-muted-foreground">
                          {config.pricing.freeCredits && (
                            <span>{config.pricing.freeCredits} free credits/month • </span>
                          )}
                          {config.pricing.pricePerSearch && (
                            <span>${config.pricing.pricePerSearch}/search</span>
                          )}
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export default SearchSettings;
