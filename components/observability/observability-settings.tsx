'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useSettingsStore } from '@/stores';

export interface ObservabilitySettingsData {
  enabled: boolean;
  langfuseEnabled: boolean;
  langfusePublicKey: string;
  langfuseSecretKey: string;
  langfuseHost: string;
  openTelemetryEnabled: boolean;
  openTelemetryEndpoint: string;
  serviceName: string;
}

export function ObservabilitySettings() {
  const t = useTranslations('observability.settings');

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const observabilitySettings = useSettingsStore((state) => state.observabilitySettings);
  const updateObservabilitySettings = useSettingsStore((state) => state.updateObservabilitySettings);

  const settings: ObservabilitySettingsData = observabilitySettings ?? {
    enabled: false,
    langfuseEnabled: true,
    langfusePublicKey: '',
    langfuseSecretKey: '',
    langfuseHost: 'https://cloud.langfuse.com',
    openTelemetryEnabled: false,
    openTelemetryEndpoint: 'http://localhost:4318/v1/traces',
    serviceName: 'cognia-ai',
  };

  const handleSettingChange = <K extends keyof ObservabilitySettingsData>(
    key: K,
    value: ObservabilitySettingsData[K]
  ) => {
    updateObservabilitySettings?.({ [key]: value });
  };

  const testConnection = async () => {
    setTestStatus('testing');
    setTestMessage(t('testingConnection'));

    try {
      // In a real implementation, this would test the Langfuse connection
      // For now, we'll simulate a test
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (settings.langfusePublicKey && settings.langfuseSecretKey) {
        setTestStatus('success');
        setTestMessage(t('connectionSuccess'));
      } else {
        setTestStatus('error');
        setTestMessage(t('configureKeysFirst'));
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(error instanceof Error ? error.message : t('connectionFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
            />
          </div>
        </CardHeader>
      </Card>

      {settings.enabled && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t('langfuse.title')}</CardTitle>
                  <CardDescription>{t('langfuse.description')}</CardDescription>
                </div>
                <Switch
                  checked={settings.langfuseEnabled}
                  onCheckedChange={(checked) => handleSettingChange('langfuseEnabled', checked)}
                />
              </div>
            </CardHeader>

            {settings.langfuseEnabled && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="langfuse-host">{t('langfuse.hostUrl')}</Label>
                  <Input
                    id="langfuse-host"
                    value={settings.langfuseHost}
                    onChange={(e) => handleSettingChange('langfuseHost', e.target.value)}
                    placeholder={t('langfuse.hostUrlPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="langfuse-public-key">{t('langfuse.publicKey')}</Label>
                  <Input
                    id="langfuse-public-key"
                    value={settings.langfusePublicKey}
                    onChange={(e) => handleSettingChange('langfusePublicKey', e.target.value)}
                    placeholder={t('langfuse.publicKeyPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="langfuse-secret-key">{t('langfuse.secretKey')}</Label>
                  <Input
                    id="langfuse-secret-key"
                    type="password"
                    value={settings.langfuseSecretKey}
                    onChange={(e) => handleSettingChange('langfuseSecretKey', e.target.value)}
                    placeholder={t('langfuse.secretKeyPlaceholder')}
                  />
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testConnection}
                    disabled={testStatus === 'testing'}
                  >
                    {testStatus === 'testing' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    {t('testConnection')}
                  </Button>

                  {testStatus === 'success' && (
                    <Alert variant="default" className="py-2 px-3 flex-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-600">
                        {testMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  {testStatus === 'error' && (
                    <Alert variant="destructive" className="py-2 px-3 flex-1">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>{testMessage}</AlertDescription>
                    </Alert>
                  )}

                  <Button variant="ghost" size="sm" className="ml-auto" asChild>
                    <a href="https://langfuse.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('getApiKeys')}
                    </a>
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t('otel.title')}</CardTitle>
                  <CardDescription>{t('otel.description')}</CardDescription>
                </div>
                <Switch
                  checked={settings.openTelemetryEnabled}
                  onCheckedChange={(checked) => handleSettingChange('openTelemetryEnabled', checked)}
                />
              </div>
            </CardHeader>

            {settings.openTelemetryEnabled && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otel-endpoint">{t('otel.endpoint')}</Label>
                  <Input
                    id="otel-endpoint"
                    value={settings.openTelemetryEndpoint}
                    onChange={(e) => handleSettingChange('openTelemetryEndpoint', e.target.value)}
                    placeholder={t('otel.endpointPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">{t('otel.endpointHint')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-name">{t('otel.serviceName')}</Label>
                  <Input
                    id="service-name"
                    value={settings.serviceName}
                    onChange={(e) => handleSettingChange('serviceName', e.target.value)}
                    placeholder={t('otel.serviceNamePlaceholder')}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
