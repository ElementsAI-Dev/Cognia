'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Trash2, RotateCcw } from 'lucide-react';
import { useInputCompletion } from '@/hooks/input-completion';
import type {
  CompletionConfig,
  CompletionProvider,
  CompletionStats,
} from '@/types/input-completion';
import { DEFAULT_COMPLETION_CONFIG } from '@/types/input-completion';

export interface CompletionSettingsProps {
  onSave?: (config: CompletionConfig) => void;
  className?: string;
}

export function CompletionSettings({ onSave, className }: CompletionSettingsProps) {
  const {
    config,
    updateConfig,
    isRunning,
    start,
    stop,
    getStats,
    resetStats,
    clearCache,
    testConnection,
    isLoading,
  } = useInputCompletion();
  const [localConfig, setLocalConfig] = useState<CompletionConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const updateLocalConfig = useCallback((updates: Partial<CompletionConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    await updateConfig(localConfig);
    setHasChanges(false);
    onSave?.(localConfig);
  }, [localConfig, updateConfig, onSave]);

  const handleReset = useCallback(() => {
    setLocalConfig(DEFAULT_COMPLETION_CONFIG);
    setHasChanges(true);
  }, []);

  const handleRefreshStats = useCallback(async () => {
    const newStats = await getStats();
    setStats(newStats);
  }, [getStats]);

  const handleResetStats = useCallback(async () => {
    await resetStats();
    setStats(null);
  }, [resetStats]);

  const handleClearCache = useCallback(async () => {
    await clearCache();
  }, [clearCache]);

  const handleTestConnection = useCallback(async () => {
    setTestResult(null);
    setTestLatency(null);
    const result = await testConnection();
    if (result && result.suggestions.length > 0) {
      setTestResult('success');
      setTestLatency(result.latency_ms);
    } else {
      setTestResult('error');
    }
  }, [testConnection]);

  useEffect(() => {
    handleRefreshStats();
  }, [handleRefreshStats]);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Input Completion</CardTitle>
          <CardDescription>AI-powered real-time text completion (Tab to accept)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable and Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Completion</Label>
              <p className="text-sm text-muted-foreground">{isRunning ? 'Running' : 'Stopped'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={localConfig.enabled}
                onCheckedChange={(enabled) => updateLocalConfig({ enabled })}
              />
              <Button variant="outline" size="sm" onClick={() => (isRunning ? stop() : start())}>
                {isRunning ? 'Stop' : 'Start'}
              </Button>
            </div>
          </div>

          {/* Model Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Model</h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={localConfig.model.provider}
                  onValueChange={(provider: CompletionProvider) =>
                    updateLocalConfig({
                      model: { ...localConfig.model, provider },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Ollama (Local)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Model ID</Label>
                <Input
                  value={localConfig.model.model_id}
                  onChange={(e) =>
                    updateLocalConfig({
                      model: { ...localConfig.model, model_id: e.target.value },
                    })
                  }
                  placeholder="qwen2.5-coder:0.5b"
                />
              </div>

              {(localConfig.model.provider === 'custom' ||
                localConfig.model.provider === 'openai' ||
                localConfig.model.provider === 'groq') && (
                <>
                  <div className="space-y-2">
                    <Label>Endpoint</Label>
                    <Input
                      value={localConfig.model.endpoint || ''}
                      onChange={(e) =>
                        updateLocalConfig({
                          model: { ...localConfig.model, endpoint: e.target.value },
                        })
                      }
                      placeholder="https://api.example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={localConfig.model.api_key || ''}
                      onChange={(e) =>
                        updateLocalConfig({
                          model: { ...localConfig.model, api_key: e.target.value },
                        })
                      }
                      placeholder="sk-..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Temperature: {localConfig.model.temperature}</Label>
              <Slider
                value={[localConfig.model.temperature]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([temperature]) =>
                  updateLocalConfig({
                    model: { ...localConfig.model, temperature },
                  })
                }
              />
            </div>
          </div>

          {/* Trigger Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Trigger</h4>

            <div className="space-y-2">
              <Label>Debounce: {localConfig.trigger.debounce_ms}ms</Label>
              <Slider
                value={[localConfig.trigger.debounce_ms]}
                min={100}
                max={1000}
                step={50}
                onValueChange={([debounce_ms]) =>
                  updateLocalConfig({
                    trigger: { ...localConfig.trigger, debounce_ms },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Min Context Length: {localConfig.trigger.min_context_length} chars</Label>
              <Slider
                value={[localConfig.trigger.min_context_length]}
                min={1}
                max={20}
                step={1}
                onValueChange={([min_context_length]) =>
                  updateLocalConfig({
                    trigger: { ...localConfig.trigger, min_context_length },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Skip with modifier keys</Label>
              <Switch
                checked={localConfig.trigger.skip_with_modifiers}
                onCheckedChange={(skip_with_modifiers) =>
                  updateLocalConfig({
                    trigger: { ...localConfig.trigger, skip_with_modifiers },
                  })
                }
              />
            </div>
          </div>

          {/* UI Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Display</h4>

            <div className="flex items-center justify-between">
              <Label>Show inline preview</Label>
              <Switch
                checked={localConfig.ui.show_inline_preview}
                onCheckedChange={(show_inline_preview) =>
                  updateLocalConfig({
                    ui: { ...localConfig.ui, show_inline_preview },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show accept hint</Label>
              <Switch
                checked={localConfig.ui.show_accept_hint}
                onCheckedChange={(show_accept_hint) =>
                  updateLocalConfig({
                    ui: { ...localConfig.ui, show_accept_hint },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Ghost text opacity: {localConfig.ui.ghost_text_opacity}</Label>
              <Slider
                value={[localConfig.ui.ghost_text_opacity]}
                min={0.1}
                max={1}
                step={0.1}
                onValueChange={([ghost_text_opacity]) =>
                  updateLocalConfig({
                    ui: { ...localConfig.ui, ghost_text_opacity },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                Auto-dismiss:{' '}
                {localConfig.ui.auto_dismiss_ms === 0
                  ? 'Never'
                  : `${localConfig.ui.auto_dismiss_ms}ms`}
              </Label>
              <Slider
                value={[localConfig.ui.auto_dismiss_ms]}
                min={0}
                max={10000}
                step={500}
                onValueChange={([auto_dismiss_ms]) =>
                  updateLocalConfig({
                    ui: { ...localConfig.ui, auto_dismiss_ms },
                  })
                }
              />
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-4">
            <h4 className="font-medium">Statistics</h4>

            {stats ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Requests:</span>
                  <span className="ml-2 font-medium">{stats.total_requests}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Successful:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {stats.successful_completions}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="ml-2 font-medium text-red-600">{stats.failed_completions}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Latency:</span>
                  <span className="ml-2 font-medium">{stats.avg_latency_ms.toFixed(0)}ms</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cache Hit Rate:</span>
                  <span className="ml-2 font-medium">
                    {(stats.cache_hit_rate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No statistics available</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleResetStats}>
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset Stats
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearCache}>
                <Trash2 className="mr-1 h-3 w-3" />
                Clear Cache
              </Button>
            </div>
          </div>

          {/* Connection Test */}
          <div className="space-y-4">
            <h4 className="font-medium">Connection Test</h4>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                Test Connection
              </Button>

              {testResult === 'success' && (
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Success {testLatency !== null && `(${testLatency}ms)`}
                </div>
              )}

              {testResult === 'error' && (
                <div className="flex items-center text-sm text-red-600">
                  <XCircle className="mr-1 h-4 w-4" />
                  Connection failed
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CompletionSettings;
