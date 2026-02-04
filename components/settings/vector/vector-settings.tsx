'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Database, Cpu, Key, Settings2, HelpCircle } from 'lucide-react';
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
import { useVectorStore, useSettingsStore } from '@/stores';
import type { VectorDBProvider } from '@/stores/data';
import { useVectorDB } from '@/hooks/rag';
import { cn } from '@/lib/utils';
import { DEFAULT_EMBEDDING_MODELS, type EmbeddingProvider } from '@/lib/vector/embedding';
import { VectorManager } from './vector-manager';
import { SectionHeader } from './section-header';
import { ProviderTabs, type ProviderTabOption } from './provider-tabs';
import { VectorApiKeyModal } from './api-key-modal';
import { VectorSetupGuideModal } from './setup-guide-modal';

const PROVIDER_OPTIONS: ProviderTabOption[] = [
  { value: 'native', label: 'Native' },
  { value: 'chroma', label: 'Chroma' },
  { value: 'pinecone', label: 'Pinecone' },
  { value: 'weaviate', label: 'Weaviate' },
  { value: 'qdrant', label: 'Qdrant' },
  { value: 'milvus', label: 'Milvus' },
];

const EMBEDDING_PROVIDERS: EmbeddingProvider[] = ['openai', 'google', 'cohere', 'mistral'];

export function VectorSettings() {
  const t = useTranslations('vectorSettings');

  const settings = useVectorStore((state) => state.settings);
  const updateSettings = useVectorStore((state) => state.updateSettings);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const vector = useVectorDB({ collectionName: 'default', autoInitialize: false });

  // Check if embedding API key is configured
  const hasEmbeddingKey = Boolean(
    providerSettings[settings.embeddingProvider]?.apiKey
  );

  // Show setup guide for first-time users
  useEffect(() => {
    if (!settings.setupCompleted && !hasEmbeddingKey) {
      setShowSetupGuide(true);
    }
  }, [settings.setupCompleted, hasEmbeddingKey]);

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
      setTestResult(t('connectionSuccess', { count: collections.length }));
    } catch (err) {
      setTestError(err instanceof Error ? err.message : t('connectionFailed'));
    } finally {
      setTesting(false);
    }
  };

  const handleProviderChange = (provider: VectorDBProvider) => {
    updateSettings({ provider });
  };

  const handleSetupComplete = () => {
    updateSettings({ setupCompleted: true });
    setShowSetupGuide(false);
  };

  return (
    <div className="space-y-4">
      {/* Provider Selection Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('title')}</CardTitle>
              <CardDescription className="text-xs">{t('description')}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSetupGuide(true)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Tabs */}
          <div className="space-y-3">
            <SectionHeader icon={Database} title={t('providers.title')} />
            <ProviderTabs
              value={settings.provider}
              onValueChange={handleProviderChange}
              options={PROVIDER_OPTIONS}
            />
          </div>

          {/* Provider-specific Configuration */}
          <div className="space-y-4 rounded-lg border p-4">
            {/* Native provider */}
            {settings.provider === 'native' && (
              <Alert className={cn('border-primary/50 bg-primary/5 py-2')}>
                <AlertDescription className="text-xs">{t('nativeProviderHint')}</AlertDescription>
              </Alert>
            )}

            {/* Chroma provider */}
            {settings.provider === 'chroma' && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('mode')}</Label>
                    <Select
                      value={settings.mode}
                      onValueChange={(value) => updateSettings({ mode: value as typeof settings.mode })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t('selectMode')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="embedded">{t('embedded')}</SelectItem>
                        <SelectItem value="server">{t('server')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('chromaServerUrl')}</Label>
                    <Input
                      value={settings.serverUrl}
                      onChange={(e) => updateSettings({ serverUrl: e.target.value })}
                      placeholder="http://localhost:8000"
                      disabled={settings.mode === 'embedded'}
                      className="h-9"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Pinecone provider */}
            {settings.provider === 'pinecone' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('providers.pinecone.apiKey')}</Label>
                  <Input
                    type="password"
                    value={settings.pineconeApiKey || ''}
                    onChange={(e) => updateSettings({ pineconeApiKey: e.target.value })}
                    placeholder={t('providers.pinecone.apiKeyPlaceholder')}
                    className="h-9"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('providers.pinecone.indexName')}</Label>
                    <Input
                      value={settings.pineconeIndexName || ''}
                      onChange={(e) => updateSettings({ pineconeIndexName: e.target.value })}
                      placeholder={t('providers.pinecone.indexPlaceholder')}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('providers.pinecone.namespace')}</Label>
                    <Input
                      value={settings.pineconeNamespace || ''}
                      onChange={(e) => updateSettings({ pineconeNamespace: e.target.value })}
                      placeholder={t('providers.pinecone.namespacePlaceholder')}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Weaviate provider */}
            {settings.provider === 'weaviate' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('providers.weaviate.url')}</Label>
                  <Input
                    value={settings.weaviateUrl || ''}
                    onChange={(e) => updateSettings({ weaviateUrl: e.target.value })}
                    placeholder={t('providers.weaviate.urlPlaceholder')}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('providers.weaviate.apiKey')}</Label>
                  <Input
                    type="password"
                    value={settings.weaviateApiKey || ''}
                    onChange={(e) => updateSettings({ weaviateApiKey: e.target.value })}
                    placeholder={t('providers.weaviate.apiKeyPlaceholder')}
                    className="h-9"
                  />
                </div>
              </div>
            )}

            {/* Qdrant provider */}
            {settings.provider === 'qdrant' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('providers.qdrant.url')}</Label>
                  <Input
                    value={settings.qdrantUrl || ''}
                    onChange={(e) => updateSettings({ qdrantUrl: e.target.value })}
                    placeholder={t('providers.qdrant.urlPlaceholder')}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('providers.qdrant.apiKey')}</Label>
                  <Input
                    type="password"
                    value={settings.qdrantApiKey || ''}
                    onChange={(e) => updateSettings({ qdrantApiKey: e.target.value })}
                    placeholder={t('providers.qdrant.apiKeyPlaceholder')}
                    className="h-9"
                  />
                </div>
              </div>
            )}

            {/* Milvus provider */}
            {settings.provider === 'milvus' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('providers.milvus.address')}</Label>
                  <Input
                    value={settings.milvusAddress || ''}
                    onChange={(e) => updateSettings({ milvusAddress: e.target.value })}
                    placeholder={t('providers.milvus.addressPlaceholder')}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('providers.milvus.token')}</Label>
                  <Input
                    type="password"
                    value={settings.milvusToken || ''}
                    onChange={(e) => updateSettings({ milvusToken: e.target.value })}
                    placeholder={t('providers.milvus.tokenPlaceholder')}
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Embedding Configuration */}
          <div className="space-y-3">
            <SectionHeader icon={Cpu} title={t('embedding.title')} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm">{t('embedding.provider')}</Label>
                <Select
                  value={settings.embeddingProvider}
                  onValueChange={(value) =>
                    updateSettings({ embeddingProvider: value as EmbeddingProvider })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMBEDDING_PROVIDERS.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {t(`embedding.providers.${provider}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t('embedding.model')}</Label>
                <Select
                  value={settings.embeddingModel}
                  onValueChange={(value) => updateSettings({ embeddingModel: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMBEDDING_PROVIDERS.map((provider) => {
                      const config = DEFAULT_EMBEDDING_MODELS[provider];
                      return (
                        <SelectItem key={config.model} value={config.model}>
                          {config.model} ({config.dimensions}d)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApiKeyModal(true)}
                className="gap-1.5"
              >
                <Key className="h-3.5 w-3.5" />
                {t('embedding.configureKey')}
              </Button>
              {hasEmbeddingKey ? (
                <span className="text-xs text-green-600">{t('embedding.keyConfigured')}</span>
              ) : (
                <span className="text-xs text-amber-600">{t('embedding.keyMissing')}</span>
              )}
            </div>
          </div>

          {/* Chunking Settings */}
          <div className="space-y-3">
            <SectionHeader icon={Settings2} title={t('chunking.title')} />
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
          </div>

          {/* General Settings */}
          <div className="space-y-3">
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

            <div className="space-y-1.5">
              <Label className="text-sm">{t('defaultCollection')}</Label>
              <Input
                value={settings.defaultCollectionName || 'default'}
                onChange={(e) => updateSettings({ defaultCollectionName: e.target.value })}
                placeholder="default"
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">{t('defaultCollectionHint')}</p>
            </div>
          </div>

          {/* Test Connection */}
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
            <Button size="sm" onClick={handleTestConnection} disabled={testing}>
              {testing ? t('testing') : t('testConnection')}
            </Button>
            {testResult && <span className="text-xs text-green-600">{testResult}</span>}
            {testError && <span className="text-xs text-destructive">{testError}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Vector Manager */}
      <VectorManager />

      {/* Modals */}
      <VectorApiKeyModal
        open={showApiKeyModal}
        onOpenChange={setShowApiKeyModal}
        provider={settings.embeddingProvider}
      />

      <VectorSetupGuideModal
        open={showSetupGuide}
        onOpenChange={setShowSetupGuide}
        provider={settings.provider}
        embeddingProvider={settings.embeddingProvider}
        hasEmbeddingKey={hasEmbeddingKey}
        onComplete={handleSetupComplete}
      />
    </div>
  );
}

export default VectorSettings;
