'use client';

/**
 * SandboxSettings - Configuration UI for sandbox code execution
 */

import { useEffect, useState } from 'react';
import { Settings, Server, Cpu, Clock, HardDrive, Wifi, RefreshCw, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSandbox } from '@/hooks/use-sandbox';
import { LANGUAGE_INFO } from '@/types/sandbox';
import type { RuntimeType, SandboxConfig } from '@/types/sandbox';

export function SandboxSettings() {
  const {
    isAvailable,
    isLoading,
    config,
    runtimes,
    languages,
    error,
    refreshStatus,
    updateConfig,
    setRuntime,
    toggleLanguage,
  } = useSandbox();

  const [localConfig, setLocalConfig] = useState<SandboxConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSave = async () => {
    if (!localConfig) return;
    setIsSaving(true);
    try {
      await updateConfig(localConfig);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRuntimeChange = async (runtime: RuntimeType) => {
    await setRuntime(runtime);
  };

  const handleLanguageToggle = async (langId: string, enabled: boolean) => {
    await toggleLanguage(langId, enabled);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sandbox Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sandbox Settings
          </CardTitle>
          <CardDescription>
            Configure backend code execution sandbox
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Server className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">Sandbox Not Available</p>
              <p className="text-sm text-muted-foreground">
                Backend sandbox requires the Tauri desktop app with Docker or Podman installed.
              </p>
            </div>
            <Button variant="outline" onClick={refreshStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sandbox Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <X className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={refreshStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Runtime Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Runtime
          </CardTitle>
          <CardDescription>
            Select the container runtime for code execution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="min-w-[120px]">Preferred Runtime</Label>
            <Select
              value={localConfig?.preferred_runtime || 'docker'}
              onValueChange={(v) => handleRuntimeChange(v as RuntimeType)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="docker" disabled={!runtimes.includes('docker')}>
                  Docker {runtimes.includes('docker') ? '✓' : '(not available)'}
                </SelectItem>
                <SelectItem value="podman" disabled={!runtimes.includes('podman')}>
                  Podman {runtimes.includes('podman') ? '✓' : '(not available)'}
                </SelectItem>
                <SelectItem value="native">
                  Native (less secure)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {runtimes.map((rt) => (
              <Badge key={rt} variant="outline" className="text-green-600 border-green-600/50">
                <Check className="h-3 w-3 mr-1" />
                {rt}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resource Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Resource Limits
          </CardTitle>
          <CardDescription>
            Configure execution resource constraints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timeout */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeout
              </Label>
              <span className="text-sm text-muted-foreground">
                {localConfig?.default_timeout_secs || 30}s
              </span>
            </div>
            <Slider
              value={[localConfig?.default_timeout_secs || 30]}
              min={5}
              max={120}
              step={5}
              onValueChange={([v]) =>
                setLocalConfig((prev) => prev ? { ...prev, default_timeout_secs: v } : null)
              }
            />
          </div>

          {/* Memory Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Memory Limit
              </Label>
              <span className="text-sm text-muted-foreground">
                {localConfig?.default_memory_limit_mb || 256} MB
              </span>
            </div>
            <Slider
              value={[localConfig?.default_memory_limit_mb || 256]}
              min={64}
              max={1024}
              step={64}
              onValueChange={([v]) =>
                setLocalConfig((prev) => prev ? { ...prev, default_memory_limit_mb: v } : null)
              }
            />
          </div>

          {/* CPU Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                CPU Limit
              </Label>
              <span className="text-sm text-muted-foreground">
                {localConfig?.default_cpu_limit_percent || 50}%
              </span>
            </div>
            <Slider
              value={[localConfig?.default_cpu_limit_percent || 50]}
              min={10}
              max={100}
              step={10}
              onValueChange={([v]) =>
                setLocalConfig((prev) => prev ? { ...prev, default_cpu_limit_percent: v } : null)
              }
            />
          </div>

          {/* Network Access */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Network Access
            </Label>
            <Switch
              checked={localConfig?.network_enabled || false}
              onCheckedChange={(checked) =>
                setLocalConfig((prev) => prev ? { ...prev, network_enabled: checked } : null)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Enabled Languages */}
      <Card>
        <CardHeader>
          <CardTitle>Enabled Languages</CardTitle>
          <CardDescription>
            Select which programming languages can be executed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {languages.map((lang) => {
                const info = LANGUAGE_INFO[lang.id] || { name: lang.name, icon: '📄', color: '#666' };
                const isEnabled = localConfig?.enabled_languages?.includes(lang.id) ?? true;

                return (
                  <div
                    key={lang.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{info.icon}</span>
                      <span className="text-sm font-medium">{info.name}</span>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleLanguageToggle(lang.id, checked)}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={refreshStatus}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

export default SandboxSettings;
