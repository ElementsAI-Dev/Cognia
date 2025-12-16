'use client';

/**
 * ProviderSettings - Configure AI provider API keys
 */

import { useState, useCallback } from 'react';
import { Eye, EyeOff, Check, AlertCircle, ExternalLink, Plus, Edit2, Loader2, Clock } from 'lucide-react';
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

  return (
    <div className="space-y-6">
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

              {/* Available models */}
              <div className="space-y-2">
                <Label>{t('availableModels')}</Label>
                <div className="flex flex-wrap gap-2">
                  {provider.models.map((model) => (
                    <Badge
                      key={model.id}
                      variant={isEnabled ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {model.name}
                    </Badge>
                  ))}
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
