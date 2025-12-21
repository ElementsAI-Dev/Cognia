'use client';

/**
 * ProviderSettings - Configure AI provider API keys
 * Enhanced with batch testing, collapsible sections, multi-key rotation, and default model selection
 */

import { useState, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ExternalLink,
  Plus,
  Edit2,
  Loader2,
  Clock,
  Zap,
  RefreshCw,
  Star,
  ChevronDown,
  ChevronUp,
  Trash2,
  RotateCcw,
  Activity,
  Shield,
  Globe,
  Cpu,
  Server,
  Sparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { PROVIDERS, type ApiKeyRotationStrategy } from '@/types/provider';
import { CustomProviderDialog } from './custom-provider-dialog';
import { OAuthLoginButton } from './oauth-login-button';
import { ProviderImportExport } from './provider-import-export';
import { ProviderHealthStatus } from './provider-health-status';
import { testProviderConnection, type ApiTestResult } from '@/lib/ai/api-test';
import { maskApiKey } from '@/lib/ai/api-key-rotation';

// Helper to get dashboard URL for each provider
function getProviderDashboardUrl(providerId: string): string {
  const provider = PROVIDERS[providerId];
  if (provider?.dashboardUrl) return provider.dashboardUrl;
  
  const urls: Record<string, string> = {
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
    google: 'https://aistudio.google.com/app/apikey',
    deepseek: 'https://platform.deepseek.com/api_keys',
    groq: 'https://console.groq.com/keys',
    mistral: 'https://console.mistral.ai/api-keys/',
    xai: 'https://console.x.ai/team/api-keys',
    togetherai: 'https://api.together.xyz/settings/api-keys',
    openrouter: 'https://openrouter.ai/keys',
    cohere: 'https://dashboard.cohere.com/api-keys',
    fireworks: 'https://fireworks.ai/account/api-keys',
    cerebras: 'https://cloud.cerebras.ai/platform',
    sambanova: 'https://cloud.sambanova.ai/apis',
  };
  return urls[providerId] || '#';
}

// Get provider description
function getProviderDescription(providerId: string): string {
  const provider = PROVIDERS[providerId];
  if (provider?.description) return provider.description;
  
  const descriptions: Record<string, string> = {
    openai: 'GPT-4o, o1, and more flagship models',
    anthropic: 'Claude 4 Sonnet, Claude 4 Opus',
    google: 'Gemini 2.0 Flash, Gemini 1.5 Pro',
    deepseek: 'DeepSeek Chat, DeepSeek Reasoner',
    groq: 'Ultra-fast inference with Llama 3.3',
    mistral: 'Mistral Large, Mistral Small',
    xai: 'Grok 3, Grok 3 Mini',
    togetherai: 'Fast inference for open source models',
    openrouter: 'Access 200+ models with OAuth login',
    cohere: 'Command R+, enterprise RAG',
    fireworks: 'Ultra-fast compound AI',
    cerebras: 'Fastest inference with custom AI chips',
    sambanova: 'Enterprise AI with free tier',
    ollama: 'Run models locally on your machine',
  };
  return descriptions[providerId] || '';
}

// Get provider category icon
function getCategoryIcon(category?: string) {
  switch (category) {
    case 'flagship': return <Sparkles className="h-4 w-4" />;
    case 'aggregator': return <Globe className="h-4 w-4" />;
    case 'specialized': return <Zap className="h-4 w-4" />;
    case 'local': return <Server className="h-4 w-4" />;
    case 'enterprise': return <Shield className="h-4 w-4" />;
    default: return <Cpu className="h-4 w-4" />;
  }
}

// Provider categories for filtering
type ProviderCategory = 'all' | 'flagship' | 'aggregator' | 'specialized' | 'local' | 'enterprise';

const _CATEGORY_LABELS: Record<ProviderCategory, string> = {
  all: 'All Providers',
  flagship: 'Flagship',
  aggregator: 'Aggregators',
  specialized: 'Specialized',
  local: 'Local',
  enterprise: 'Enterprise',
};

export function ProviderSettings() {
  const t = useTranslations('providers');
  const tc = useTranslations('common');

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const updateProviderSettings = useSettingsStore((state) => state.updateProviderSettings);
  const customProviders = useSettingsStore((state) => state.customProviders);
  const updateCustomProvider = useSettingsStore((state) => state.updateCustomProvider);
  const addApiKey = useSettingsStore((state) => state.addApiKey);
  const removeApiKey = useSettingsStore((state) => state.removeApiKey);
  const setApiKeyRotation = useSettingsStore((state) => state.setApiKeyRotation);
  const resetApiKeyStats = useSettingsStore((state) => state.resetApiKeyStats);

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, ApiTestResult | null>>({});
  const [testingProviders, setTestingProviders] = useState<Record<string, boolean>>({});
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [batchTestProgress, setBatchTestProgress] = useState(0);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [newApiKeys, setNewApiKeys] = useState<Record<string, string>>({});

  const toggleExpanded = useCallback((providerId: string) => {
    setExpandedProviders((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  }, []);

  const handleSetDefaultModel = (providerId: string, modelId: string) => {
    updateProviderSettings(providerId, { defaultModel: modelId });
  };

  const handleAddApiKey = (providerId: string) => {
    const newKey = newApiKeys[providerId]?.trim();
    if (newKey && newKey.length >= 10) {
      addApiKey(providerId, newKey);
      setNewApiKeys((prev) => ({ ...prev, [providerId]: '' }));
    }
  };

  const handleRemoveApiKey = (providerId: string, index: number) => {
    removeApiKey(providerId, index);
  };

  const handleToggleRotation = (providerId: string, enabled: boolean) => {
    const settings = providerSettings[providerId];
    setApiKeyRotation(providerId, enabled, settings?.apiKeyRotationStrategy || 'round-robin');
  };

  const handleRotationStrategyChange = (providerId: string, strategy: ApiKeyRotationStrategy) => {
    setApiKeyRotation(providerId, true, strategy);
  };

  // Get count of configured providers
  const configuredCount = Object.entries(providerSettings).filter(
    ([id, settings]) => settings?.enabled && (settings?.apiKey || id === 'ollama')
  ).length;

  const toggleShowKey = (providerId: string) => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const handleKeyChange = (providerId: string, apiKey: string) => {
    updateProviderSettings(providerId, { apiKey });
  };

  const handleToggleProvider = (providerId: string, enabled: boolean) => {
    updateProviderSettings(providerId, { enabled });
  };

  const handleTestConnection = useCallback(async (providerId: string) => {
    const settings = providerSettings[providerId];
    if (!settings?.apiKey && providerId !== 'ollama') return;

    setTestingProviders((prev) => ({ ...prev, [providerId]: true }));
    setTestResults((prev) => ({ ...prev, [providerId]: null }));

    try {
      const result = await testProviderConnection(
        providerId,
        settings?.apiKey || '',
        settings?.baseURL
      );
      setTestResults((prev) => ({ ...prev, [providerId]: result }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          message: error instanceof Error ? error.message : 'Connection failed',
        },
      }));
    } finally {
      setTestingProviders((prev) => ({ ...prev, [providerId]: false }));
    }
  }, [providerSettings]);

  // Batch test all configured providers
  const handleBatchTest = useCallback(async () => {
    const enabledProviders = Object.entries(providerSettings)
      .filter(([id, settings]) => settings?.enabled && (settings?.apiKey || id === 'ollama'))
      .map(([id]) => id);

    if (enabledProviders.length === 0) return;

    setIsBatchTesting(true);
    setBatchTestProgress(0);
    setTestResults({});

    for (let i = 0; i < enabledProviders.length; i++) {
      const providerId = enabledProviders[i];
      await handleTestConnection(providerId);
      setBatchTestProgress(((i + 1) / enabledProviders.length) * 100);
    }

    setIsBatchTesting(false);
  }, [providerSettings, handleTestConnection]);

  // Count test results
  const testResultsSummary = {
    success: Object.values(testResults).filter((r) => r?.success).length,
    failed: Object.values(testResults).filter((r) => r && !r.success).length,
    total: Object.values(testResults).filter((r) => r !== null).length,
  };

  return (
    <div className="space-y-6">
      {/* Header with batch actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">
            {configuredCount} provider{configuredCount !== 1 ? 's' : ''} configured
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ProviderImportExport />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchTest}
            disabled={isBatchTesting || configuredCount === 0}
          >
            {isBatchTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Test All Providers
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Batch test progress */}
      {isBatchTesting && (
        <div className="space-y-2">
          <Progress value={batchTestProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Testing providers... {Math.round(batchTestProgress)}%
          </p>
        </div>
      )}

      {/* Test results summary */}
      {testResultsSummary.total > 0 && !isBatchTesting && (
        <div className="flex items-center gap-4 rounded-lg border p-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Test Results:</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              {testResultsSummary.success} passed
            </span>
            {testResultsSummary.failed > 0 && (
              <span className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {testResultsSummary.failed} failed
              </span>
            )}
          </div>
        </div>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('securityTitle')}</AlertTitle>
        <AlertDescription>
          {t('securityDescription')}
        </AlertDescription>
      </Alert>

      {/* Built-in Providers */}
      {Object.entries(PROVIDERS).map(([providerId, provider]) => {
        const settings = providerSettings[providerId] || {};
        const isEnabled = settings.enabled !== false;
        const apiKey = settings.apiKey || '';
        const showKey = showKeys[providerId] || false;
        const testResult = testResults[providerId];
        const isExpanded = expandedProviders[providerId] ?? false;
        const apiKeys = settings.apiKeys || [];
        const rotationEnabled = settings.apiKeyRotationEnabled || false;
        const rotationStrategy = settings.apiKeyRotationStrategy || 'round-robin';
        const usageStats = settings.apiKeyUsageStats || {};

        return (
          <Collapsible
            key={providerId}
            open={isExpanded}
            onOpenChange={() => toggleExpanded(providerId)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {provider.name}
                          {providerId === 'ollama' && (
                            <Badge variant="secondary" className="text-xs">{t('local')}</Badge>
                          )}
                          {isEnabled && apiKey && (
                            <Badge variant="default" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              {tc('configured') || 'Configured'}
                            </Badge>
                          )}
                          {apiKeys.length > 1 && (
                            <Badge variant="outline" className="text-xs">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              {apiKeys.length} keys
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {getCategoryIcon(provider.category)}
                          </span>
                          {getProviderDescription(providerId) || t('ollamaDescription')}
                          {provider.supportsOAuth && (
                            <Badge variant="outline" className="text-[10px] ml-1">
                              <Globe className="h-2.5 w-2.5 mr-0.5" />
                              OAuth
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggleProvider(providerId, checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {providerId === 'ollama' ? (
                    <div className="space-y-2">
                      <Label htmlFor={`${providerId}-url`}>{t('ollamaURL')}</Label>
                      <Input
                        id={`${providerId}-url`}
                        placeholder="http://localhost:11434"
                        value={settings.baseURL || 'http://localhost:11434'}
                        onChange={(e) =>
                          updateProviderSettings(providerId, { baseURL: e.target.value })
                        }
                        disabled={!isEnabled}
                      />
                      <p className="text-sm text-muted-foreground">
                        {t('ollamaHint')}{' '}
                        <a
                          href="https://ollama.ai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {tc('learnMore')} <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Primary API Key */}
                      <div className="space-y-2">
                        <Label htmlFor={`${providerId}-key`}>{t('apiKey')}</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id={`${providerId}-key`}
                              type={showKey ? 'text' : 'password'}
                              placeholder={t('apiKeyPlaceholder', { provider: provider.name })}
                              value={apiKey}
                              onChange={(e) => handleKeyChange(providerId, e.target.value)}
                              disabled={!isEnabled}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => toggleShowKey(providerId)}
                              disabled={!isEnabled}
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
                            size="sm"
                            onClick={() => handleTestConnection(providerId)}
                            disabled={!isEnabled || !apiKey || testingProviders[providerId]}
                          >
                            {testingProviders[providerId] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              t('test')
                            )}
                          </Button>
                        </div>
                        {testResult?.success && (
                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <Check className="h-4 w-4" />
                            <span>{testResult.message}</span>
                            {testResult.latency_ms && (
                              <span className="ml-2 flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {testResult.latency_ms}ms
                              </span>
                            )}
                          </div>
                        )}
                        {testResult && !testResult.success && (
                          <p className="flex items-center gap-1 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" /> {testResult.message}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {t('getApiKey')}{' '}
                            <a
                              href={getProviderDashboardUrl(providerId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {provider.name} Dashboard <ExternalLink className="h-3 w-3" />
                            </a>
                          </p>
                          {/* OAuth Quick Login */}
                          {provider.supportsOAuth && (
                            <OAuthLoginButton providerId={providerId} />
                          )}
                        </div>
                      </div>

                      {/* Multi-Key Rotation Section */}
                      <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm font-medium">API Key Rotation</Label>
                            <Badge variant="outline" className="text-xs">
                              {apiKeys.length} key{apiKeys.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <Switch
                            checked={rotationEnabled}
                            onCheckedChange={(checked) => handleToggleRotation(providerId, checked)}
                            disabled={!isEnabled || apiKeys.length < 2}
                          />
                        </div>

                        {/* Rotation Strategy */}
                        {rotationEnabled && apiKeys.length >= 2 && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Strategy:</Label>
                            <Select
                              value={rotationStrategy}
                              onValueChange={(value: ApiKeyRotationStrategy) =>
                                handleRotationStrategyChange(providerId, value)
                              }
                              disabled={!isEnabled}
                            >
                              <SelectTrigger className="h-7 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="round-robin">Round Robin</SelectItem>
                                <SelectItem value="random">Random</SelectItem>
                                <SelectItem value="least-used">Least Used</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* API Keys List */}
                        {apiKeys.length > 0 && (
                          <div className="space-y-2">
                            {apiKeys.map((key, index) => {
                              const stats = usageStats[key];
                              const isActive = settings.currentKeyIndex === index;
                              return (
                                <div
                                  key={index}
                                  className={cn(
                                    'flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs',
                                    isActive && rotationEnabled && 'border-primary bg-primary/5'
                                  )}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {isActive && rotationEnabled && (
                                      <Badge variant="default" className="text-[10px] px-1 py-0">
                                        Active
                                      </Badge>
                                    )}
                                    <code className="font-mono text-muted-foreground truncate">
                                      {maskApiKey(key)}
                                    </code>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {stats && (
                                      <span className="text-muted-foreground text-[10px]">
                                        {stats.usageCount} uses
                                        {stats.errorCount > 0 && (
                                          <span className="text-destructive ml-1">
                                            ({stats.errorCount} errors)
                                          </span>
                                        )}
                                      </span>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => resetApiKeyStats(providerId, key)}
                                      title="Reset stats"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                      onClick={() => handleRemoveApiKey(providerId, index)}
                                      disabled={apiKeys.length === 1 && key === apiKey}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add New Key */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add additional API key..."
                            value={newApiKeys[providerId] || ''}
                            onChange={(e) =>
                              setNewApiKeys((prev) => ({ ...prev, [providerId]: e.target.value }))
                            }
                            disabled={!isEnabled}
                            className="h-8 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddApiKey(providerId);
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => handleAddApiKey(providerId)}
                            disabled={!isEnabled || !newApiKeys[providerId]?.trim()}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <p className="text-[10px] text-muted-foreground">
                          Add multiple API keys to enable automatic rotation. Useful for rate limit distribution.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Available models with default selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{t('availableModels')}</Label>
                      <span className="text-xs text-muted-foreground">
                        Click to set default
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.models.map((model) => {
                        const isDefault = settings.defaultModel === model.id || 
                          (!settings.defaultModel && model.id === provider.defaultModel);
                        return (
                          <button
                            key={model.id}
                            onClick={() => handleSetDefaultModel(providerId, model.id)}
                            disabled={!isEnabled}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                              isDefault
                                ? 'bg-primary text-primary-foreground'
                                : isEnabled
                                  ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                  : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {isDefault && <Star className="h-3 w-3 fill-current" />}
                            {model.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Health Status */}
                  {isEnabled && apiKey && (
                    <ProviderHealthStatus providerId={providerId} />
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Custom Providers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {t('customProviders')}
                <Badge variant="outline">{t('openaiCompatible')}</Badge>
              </CardTitle>
              <CardDescription>
                {t('customProvidersDescription')}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingProviderId(null);
                setShowCustomDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addProvider')}
            </Button>
          </div>
        </CardHeader>
        {Object.keys(customProviders).length > 0 && (
          <CardContent className="space-y-4">
            {Object.entries(customProviders).map(([providerId, provider]) => (
              <div
                key={providerId}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.customName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {provider.customModels?.length || 0} {t('modelsCount')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {provider.baseURL}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingProviderId(providerId);
                      setShowCustomDialog(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Switch
                    checked={provider.enabled}
                    onCheckedChange={(checked) =>
                      updateCustomProvider(providerId, { enabled: checked })
                    }
                  />
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Custom Provider Dialog */}
      <CustomProviderDialog
        open={showCustomDialog}
        onOpenChange={setShowCustomDialog}
        editingProviderId={editingProviderId}
      />
    </div>
  );
}

export default ProviderSettings;
