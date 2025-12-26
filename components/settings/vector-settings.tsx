'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVectorStore } from '@/stores';
import { useVectorDB } from '@/hooks/use-vector-db';
import { getSupportedVectorStoreProviders } from '@/lib/vector';
import { cn } from '@/lib/utils';
import { VectorManager } from './vector-manager';

export function VectorSettings() {
  const {
    settings,
    updateSettings,
  } = useVectorStore((state) => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
  }));

  const vectorProviders = useMemo(() => getSupportedVectorStoreProviders(), []);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const vector = useVectorDB({ collectionName: 'default', autoInitialize: false });

  useEffect(() => {
    setTestResult(null);
    setTestError(null);
  }, [settings.provider, settings.mode, settings.serverUrl]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const collections = await vector.listAllCollections();
      setTestResult(`Success: ${collections.length} collections reachable`);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Vector Database</CardTitle>
          <CardDescription>Configure provider, mode, and embedding defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={settings.provider}
                onValueChange={(value) => updateSettings({ provider: value as typeof settings.provider })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose provider" />
                </SelectTrigger>
                <SelectContent>
                  {vectorProviders.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === 'chroma' ? 'Chroma (embedded/server)' : p === 'native' ? 'Native (local Tauri)' : p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mode</Label>
              <Select
                value={settings.mode}
                onValueChange={(value) => updateSettings({ mode: value as typeof settings.mode })}
                disabled={settings.provider === 'native'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="embedded">Embedded</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Native provider ignores mode (always local).
              </p>
            </div>
          </div>

          {settings.provider === 'chroma' && (
            <div className="space-y-2">
              <Label>Chroma Server URL</Label>
              <Input
                value={settings.serverUrl}
                onChange={(e) => updateSettings({ serverUrl: e.target.value })}
                placeholder="http://localhost:8000"
                disabled={settings.mode === 'embedded'}
              />
              <p className="text-xs text-muted-foreground">
                For server mode, ensure Chroma server is reachable.
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Chunk size</Label>
              <Input
                type="number"
                min={100}
                value={settings.chunkSize}
                onChange={(e) => updateSettings({ chunkSize: Number(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Characters per chunk (recommended: 500-2000)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Chunk overlap</Label>
              <Input
                type="number"
                min={0}
                value={settings.chunkOverlap}
                onChange={(e) => updateSettings({ chunkOverlap: Number(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Overlap between chunks (recommended: 10-20% of chunk size)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Auto embed on import</p>
              <p className="text-xs text-muted-foreground">Automatically generate embeddings when adding documents.</p>
            </div>
            <Switch
              checked={settings.autoEmbed}
              onCheckedChange={(checked) => updateSettings({ autoEmbed: checked })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleTestConnection} disabled={testing}>
              {testing ? 'Testing...' : 'Test connection'}
            </Button>
            {testResult && <span className="text-sm text-green-600">{testResult}</span>}
            {testError && <span className="text-sm text-destructive">{testError}</span>}
          </div>

          {settings.provider === 'native' && (
            <Alert className={cn('border-primary/50 bg-primary/5')}>
              <AlertDescription>
                Native provider stores vectors locally via Tauri commands (JSON-backed). Ensure desktop runtime is used.
              </AlertDescription>
            </Alert>
          )}
          <VectorManager />
        </CardContent>
      </Card>
    </div>
  );
}

export default VectorSettings;
