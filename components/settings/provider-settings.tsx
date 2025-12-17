'use client';

/**
 * ProviderSettings - Configure AI provider API keys
 * Enhanced with batch testing, collapsible sections, and default model selection
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { PROVIDERS } from '@/types/provider';
import { CustomProviderDialog } from './custom-provider-dialog';
import { testProviderConnection, type ApiTestResult } from '@/lib/ai/api-test';

// Helper to get dashboard URL for each provider
function getProviderDashboardUrl(providerId: string): string {
  const urls: Record<string, string> = {
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
    google: 'https://aistudio.google.com/app/apikey',
    deepseek: 'https://platform.deepseek.com/api_keys',
    groq: 'https://console.groq.com/keys',
    mistral: 'https://console.mistral.ai/api-keys/',
  };
  return urls[providerId] || '#';
}

export function ProviderSettings() {
  const t = useTranslations('providers');
  const tc = useTranslations('common');

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const updateProviderSettings = useSettingsStore((state) => state.updateProviderSettings);
  const customProviders = useSettingsStore((state) => state.customProviders);
  const updateCustomProvider = useSettingsStore((state) => state.updateCustomProvider);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, ApiTestResult | null>>({});
  const [testingProviders, setTestingProviders] = useState<Record<string, boolean>>({});
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [batchTestProgress, setBatchTestProgress] = useState(0);

  const handleSetDefaultModel = (providerId: string, modelId: string) => {
    updateProviderSettings(providerId, { defaultModel: modelId });
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
        <div className="flex items-center gap-2">
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

        return (
          <Card key={providerId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {provider.name}
                    {providerId === 'ollama' && (
                      <Badge variant="secondary">{t('local')}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {providerId === 'openai' && 'GPT-4o, GPT-4 Turbo, and more'}
                    {providerId === 'anthropic' && 'Claude 4 Sonnet, Claude 4 Opus'}
                    {providerId === 'google' && 'Gemini 2.0 Flash, Gemini 1.5 Pro'}
                    {providerId === 'deepseek' && 'DeepSeek Chat, DeepSeek Reasoner'}
                    {providerId === 'groq' && 'Ultra-fast inference with Llama 3.3'}
                    {providerId === 'mistral' && 'Mistral Large, Mistral Small'}
                    {providerId === 'ollama' && t('ollamaDescription')}
                  </CardDescription>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleToggleProvider(providerId, checked)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      onClick={() => handleTestConnection(providerId)}
                      disabled={!isEnabled || !apiKey || testingProviders[providerId]}
                    >
                      {testingProviders[providerId] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('testing') || 'Testing...'}
                        </>
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
                  <p className="text-sm text-muted-foreground">
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
                </div>
              )}

              {/* Available models with default selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('availableModels')}</Label>
                  <span className="text-xs text-muted-foreground">
                    Click to set default
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {provider.models.map((model) => {
                    const isDefault = settings.defaultModel === model.id || 
                      (!settings.defaultModel && model.id === provider.defaultModel);
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleSetDefaultModel(providerId, model.id)}
                        disabled={!isEnabled}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
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
            </CardContent>
          </Card>
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
