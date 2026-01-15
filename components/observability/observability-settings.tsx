'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ExternalLink, TestTube, CheckCircle, XCircle } from 'lucide-react';
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
    setTestMessage('Testing connection...');

    try {
      // In a real implementation, this would test the Langfuse connection
      // For now, we'll simulate a test
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (settings.langfusePublicKey && settings.langfuseSecretKey) {
        setTestStatus('success');
        setTestMessage('Connection successful!');
      } else {
        setTestStatus('error');
        setTestMessage('Please configure API keys first');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Observability</CardTitle>
              <CardDescription>
                Track AI operations, view traces, and analyze costs with Langfuse and OpenTelemetry
              </CardDescription>
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
                  <CardTitle className="text-base">Langfuse Integration</CardTitle>
                  <CardDescription>
                    AI-specific observability for tracing, evaluation, and analytics
                  </CardDescription>
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
                  <Label htmlFor="langfuse-host">Host URL</Label>
                  <Input
                    id="langfuse-host"
                    value={settings.langfuseHost}
                    onChange={(e) => handleSettingChange('langfuseHost', e.target.value)}
                    placeholder="https://cloud.langfuse.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="langfuse-public-key">Public Key</Label>
                  <Input
                    id="langfuse-public-key"
                    value={settings.langfusePublicKey}
                    onChange={(e) => handleSettingChange('langfusePublicKey', e.target.value)}
                    placeholder="pk-lf-..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="langfuse-secret-key">Secret Key</Label>
                  <Input
                    id="langfuse-secret-key"
                    type="password"
                    value={settings.langfuseSecretKey}
                    onChange={(e) => handleSettingChange('langfuseSecretKey', e.target.value)}
                    placeholder="sk-lf-..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testConnection}
                    disabled={testStatus === 'testing'}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>

                  {testStatus === 'success' && (
                    <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      {testMessage}
                    </span>
                  )}

                  {testStatus === 'error' && (
                    <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      {testMessage}
                    </span>
                  )}

                  <Button variant="ghost" size="sm" className="ml-auto" asChild>
                    <a href="https://langfuse.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Get API Keys
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
                  <CardTitle className="text-base">OpenTelemetry</CardTitle>
                  <CardDescription>
                    Standard distributed tracing for infrastructure observability
                  </CardDescription>
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
                  <Label htmlFor="otel-endpoint">OTLP Endpoint</Label>
                  <Input
                    id="otel-endpoint"
                    value={settings.openTelemetryEndpoint}
                    onChange={(e) => handleSettingChange('openTelemetryEndpoint', e.target.value)}
                    placeholder="http://localhost:4318/v1/traces"
                  />
                  <p className="text-xs text-muted-foreground">
                    OTLP HTTP endpoint for sending traces (e.g., Jaeger, Zipkin, or OTEL Collector)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-name">Service Name</Label>
                  <Input
                    id="service-name"
                    value={settings.serviceName}
                    onChange={(e) => handleSettingChange('serviceName', e.target.value)}
                    placeholder="cognia-ai"
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
