'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVectorStore } from '@/stores';
import { useVectorDB } from '@/hooks/rag';
import { getSupportedVectorStoreProviders } from '@/lib/vector';
import { cn } from '@/lib/utils';
import { VectorManager } from './vector-manager';

export function VectorSettings() {
  const t = useTranslations('vectorSettings');

  const settings = useVectorStore((state) => state.settings);
  const updateSettings = useVectorStore((state) => state.updateSettings);

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
      {/* Provider and Connection Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('title')}</CardTitle>
          <CardDescription className="text-xs">{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider and Mode in grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm">{t('provider')}</Label>
              <Select
                value={settings.provider}
                onValueChange={(value) =>
                  updateSettings({ provider: value as typeof settings.provider })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t('chooseProvider')} />
                </SelectTrigger>
                <SelectContent>
                  {vectorProviders.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === 'chroma'
                        ? 'Chroma (embedded/server)'
                        : p === 'native'
                          ? 'Native (local Tauri)'
                          : p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{t('mode')}</Label>
              <Select
                value={settings.mode}
                onValueChange={(value) => updateSettings({ mode: value as typeof settings.mode })}
                disabled={settings.provider === 'native'}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t('selectMode')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="embedded">{t('embedded')}</SelectItem>
                  <SelectItem value="server">{t('server')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">{t('nativeModeHint')}</p>
            </div>
          </div>

          {settings.provider === 'chroma' && (
            <div className="space-y-1.5">
              <Label className="text-sm">{t('chromaServerUrl')}</Label>
              <Input
                value={settings.serverUrl}
                onChange={(e) => updateSettings({ serverUrl: e.target.value })}
                placeholder="http://localhost:8000"
                disabled={settings.mode === 'embedded'}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">{t('chromaServerHint')}</p>
            </div>
          )}

          {/* Chunk settings in grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm">{t('chunkSize')}</Label>
              <Input
                type="number"
                min={100}
                value={settings.chunkSize}
                onChange={(e) => updateSettings({ chunkSize: Number(e.target.value) || 0 })}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">{t('chunkSizeHint')}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t('chunkOverlap')}</Label>
              <Input
                type="number"
                min={0}
                value={settings.chunkOverlap}
                onChange={(e) => updateSettings({ chunkOverlap: Number(e.target.value) || 0 })}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">{t('chunkOverlapHint')}</p>
            </div>
          </div>

          {/* Auto embed toggle */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t('autoEmbed')}</p>
              <p className="text-[10px] text-muted-foreground">{t('autoEmbedDesc')}</p>
            </div>
            <Switch
              checked={settings.autoEmbed}
              onCheckedChange={(checked) => updateSettings({ autoEmbed: checked })}
            />
          </div>

          {/* Default collection for RAG */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t('defaultCollection') || 'Default Collection'}</Label>
            <Input
              value={settings.defaultCollectionName || 'default'}
              onChange={(e) => updateSettings({ defaultCollectionName: e.target.value })}
              placeholder="default"
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground">
              {t('defaultCollectionHint') ||
                'The default collection name used for RAG searches when not specified.'}
            </p>
          </div>

          {/* Test connection */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={handleTestConnection} disabled={testing}>
              {testing ? t('testing') : t('testConnection')}
            </Button>
            {testResult && <span className="text-xs text-green-600">{testResult}</span>}
            {testError && <span className="text-xs text-destructive">{testError}</span>}
          </div>

          {settings.provider === 'native' && (
            <Alert className={cn('border-primary/50 bg-primary/5 py-2')}>
              <AlertDescription className="text-xs">{t('nativeProviderHint')}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Vector Manager - Full width below */}
      <VectorManager />
    </div>
  );
}

export default VectorSettings;
