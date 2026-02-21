'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Database, Cpu, Key, Settings2, HelpCircle, BrainCircuit, Search, Quote } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVectorStore, useSettingsStore } from '@/stores';
import type { VectorDBProvider } from '@/stores/data';
import { useVectorDB } from '@/hooks/rag';
import { cn } from '@/lib/utils';
import {
  DEFAULT_EMBEDDING_MODELS,
  type EmbeddingProvider,
  isEmbeddingProviderConfigured,
} from '@/lib/vector/embedding';
import { Slider } from '@/components/ui/slider';
import {
  SettingsCard,
  SettingsToggle,
  SettingsGrid,
  SettingsGroup,
  SettingsDivider,
  SettingsPageHeader,
} from '@/components/settings/common/settings-section';
import { VectorManager } from './vector-manager';
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

const EMBEDDING_PROVIDERS: EmbeddingProvider[] = ['openai', 'google', 'cohere', 'mistral', 'transformersjs'];

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
  const hasEmbeddingKey = isEmbeddingProviderConfigured(
    settings.embeddingProvider,
    providerSettings as Record<string, { apiKey?: string }>
  );
  const currentEmbeddingModel = DEFAULT_EMBEDDING_MODELS[settings.embeddingProvider];

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

  useEffect(() => {
    const expectedModel = DEFAULT_EMBEDDING_MODELS[settings.embeddingProvider]?.model;
    if (expectedModel && settings.embeddingModel !== expectedModel) {
      updateSettings({ embeddingModel: expectedModel });
    }
  }, [settings.embeddingModel, settings.embeddingProvider, updateSettings]);

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

  const handleEmbeddingProviderChange = (provider: EmbeddingProvider) => {
    const defaultModel = DEFAULT_EMBEDDING_MODELS[provider]?.model;
    updateSettings({
      embeddingProvider: provider,
      embeddingModel: defaultModel || settings.embeddingModel,
    });
  };

  const handleSetupComplete = () => {
    updateSettings({ setupCompleted: true });
    setShowSetupGuide(false);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <SettingsPageHeader
        title={t('title')}
        description={t('description')}
        icon={<Database className="h-5 w-5" />}
        actions={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSetupGuide(true)}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        }
      />

      {/* Card 1: Provider Selection */}
      <SettingsCard
        icon={<Database className="h-4 w-4" />}
        title={t('providers.title')}
      >
        <ProviderTabs
          value={settings.provider}
          onValueChange={handleProviderChange}
          options={PROVIDER_OPTIONS}
        />

        {/* Provider-specific Configuration */}
        <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
          {settings.provider === 'native' && (
            <Alert className={cn('border-primary/50 bg-primary/5 py-2')}>
              <AlertDescription className="text-xs">{t('nativeProviderHint')}</AlertDescription>
            </Alert>
          )}

          {settings.provider === 'chroma' && (
            <SettingsGrid columns={2}>
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
            </SettingsGrid>
          )}

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
              <SettingsGrid columns={2}>
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
              </SettingsGrid>
            </div>
          )}

          {settings.provider === 'weaviate' && (
            <SettingsGrid columns={2}>
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
            </SettingsGrid>
          )}

          {settings.provider === 'qdrant' && (
            <SettingsGrid columns={2}>
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
            </SettingsGrid>
          )}

          {settings.provider === 'milvus' && (
            <SettingsGrid columns={2}>
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
              <div className="space-y-1.5">
                <Label className="text-sm">{t('providers.milvus.username')}</Label>
                <Input
                  value={settings.milvusUsername || ''}
                  onChange={(e) => updateSettings({ milvusUsername: e.target.value })}
                  placeholder={t('providers.milvus.usernamePlaceholder')}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t('providers.milvus.password')}</Label>
                <Input
                  type="password"
                  value={settings.milvusPassword || ''}
                  onChange={(e) => updateSettings({ milvusPassword: e.target.value })}
                  placeholder={t('providers.milvus.passwordPlaceholder')}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t('providers.milvus.ssl')}</Label>
                <Select
                  value={settings.milvusSsl ? 'true' : 'false'}
                  onValueChange={(value) => updateSettings({ milvusSsl: value === 'true' })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">{t('providers.milvus.sslDisabled')}</SelectItem>
                    <SelectItem value="true">{t('providers.milvus.sslEnabled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SettingsGrid>
          )}
        </div>

        {/* Test Connection */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={handleTestConnection} disabled={testing}>
            {testing ? t('testing') : t('testConnection')}
          </Button>
          {testResult && <span className="text-xs text-green-600">{testResult}</span>}
          {testError && <span className="text-xs text-destructive">{testError}</span>}
        </div>
      </SettingsCard>

      {/* Card 2: Embedding Configuration */}
      <SettingsCard
        icon={<Cpu className="h-4 w-4" />}
        title={t('embedding.title')}
      >
        <SettingsGrid columns={2}>
          <div className="space-y-1.5">
            <Label className="text-sm">{t('embedding.provider')}</Label>
            <Select
              value={settings.embeddingProvider}
              onValueChange={(value) => handleEmbeddingProviderChange(value as EmbeddingProvider)}
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
                {currentEmbeddingModel && (
                  <SelectItem value={currentEmbeddingModel.model}>
                    {currentEmbeddingModel.model} ({currentEmbeddingModel.dimensions}d)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </SettingsGrid>
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
      </SettingsCard>

      {/* Card 3: Chunking & General */}
      <SettingsCard
        icon={<Settings2 className="h-4 w-4" />}
        title={t('chunking.title')}
      >
        <SettingsGrid columns={2}>
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
        </SettingsGrid>

        <SettingsToggle
          id="auto-embed"
          label={t('autoEmbed')}
          description={t('autoEmbedDesc')}
          checked={settings.autoEmbed}
          onCheckedChange={(checked) => updateSettings({ autoEmbed: checked })}
        />

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
      </SettingsCard>

      <SettingsDivider label={t('ragChat.title')} />

      {/* Card 4: RAG-in-Chat */}
      <SettingsCard
        icon={<BrainCircuit className="h-4 w-4" />}
        title={t('ragChat.title')}
      >
        <SettingsToggle
          id="rag-in-chat"
          label={t('ragChat.enable')}
          description={t('ragChat.enableDesc')}
          checked={settings.enableRAGInChat}
          onCheckedChange={(checked) => updateSettings({ enableRAGInChat: checked })}
        />

        {settings.enableRAGInChat && (
          <div className="space-y-4">
            <SettingsGrid columns={2}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('ragChat.topK')}</Label>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{settings.ragTopK}</span>
                </div>
                <Slider
                  value={[settings.ragTopK]}
                  onValueChange={([v]) => updateSettings({ ragTopK: v })}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('ragChat.threshold')}</Label>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{settings.ragSimilarityThreshold.toFixed(2)}</span>
                </div>
                <Slider
                  value={[settings.ragSimilarityThreshold * 100]}
                  onValueChange={([v]) => updateSettings({ ragSimilarityThreshold: v / 100 })}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            </SettingsGrid>
            <div className="space-y-1.5">
              <Label className="text-sm">{t('ragChat.maxContext')}</Label>
              <Input
                type="number"
                min={500}
                max={16000}
                step={500}
                value={settings.ragMaxContextLength}
                onChange={(e) => updateSettings({ ragMaxContextLength: Number(e.target.value) || 4000 })}
                className="h-9"
              />
            </div>
          </div>
        )}
      </SettingsCard>

      {/* Card 5: Advanced RAG (collapsible) */}
      <SettingsGroup
        title={t('advancedRag.title')}
        icon={<Search className="h-4 w-4" />}
        defaultOpen={false}
      >
        <SettingsToggle
          id="hybrid-search"
          label={t('advancedRag.hybridSearch')}
          description={t('advancedRag.hybridSearchDesc')}
          checked={settings.enableHybridSearch}
          onCheckedChange={(checked) => updateSettings({ enableHybridSearch: checked })}
        />

        {settings.enableHybridSearch && (
          <div className="space-y-3 rounded-lg border p-3 bg-muted/10">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t('advancedRag.vectorWeight')}</Label>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {settings.vectorWeight.toFixed(1)} / {settings.keywordWeight.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[settings.vectorWeight * 100]}
                onValueChange={([v]) => {
                  const vw = v / 100;
                  updateSettings({ vectorWeight: vw, keywordWeight: Math.round((1 - vw) * 10) / 10 });
                }}
                min={0}
                max={100}
                step={10}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t('advancedRag.keywordWeight')}</span>
                <span>{t('advancedRag.vectorWeight')}</span>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: '0.5 / 0.5', vw: 0.5 },
                { label: '0.7 / 0.3', vw: 0.7 },
                { label: '0.3 / 0.7', vw: 0.3 },
              ].map((preset) => (
                <Button
                  key={preset.label}
                  variant={settings.vectorWeight === preset.vw ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => updateSettings({ vectorWeight: preset.vw, keywordWeight: Math.round((1 - preset.vw) * 10) / 10 })}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <SettingsToggle
          id="reranking"
          label={t('advancedRag.reranking')}
          description={t('advancedRag.rerankingDesc')}
          checked={settings.enableReranking}
          onCheckedChange={(checked) => updateSettings({ enableReranking: checked })}
        />

        <SettingsToggle
          id="query-expansion"
          label={t('advancedRag.queryExpansion')}
          description={t('advancedRag.queryExpansionDesc')}
          checked={settings.enableQueryExpansion}
          onCheckedChange={(checked) => updateSettings({ enableQueryExpansion: checked })}
        />
      </SettingsGroup>

      {/* Card 6: Citations (collapsible) */}
      <SettingsGroup
        title={t('citations.title')}
        icon={<Quote className="h-4 w-4" />}
        defaultOpen={false}
      >
        <SettingsToggle
          id="citations"
          label={t('citations.enable')}
          description={t('citations.enableDesc')}
          checked={settings.enableCitations}
          onCheckedChange={(checked) => updateSettings({ enableCitations: checked })}
        />

        {settings.enableCitations && (
          <div className="space-y-1.5">
            <Label className="text-sm">{t('citations.style')}</Label>
            <Select
              value={settings.citationStyle}
              onValueChange={(value) =>
                updateSettings({ citationStyle: value as typeof settings.citationStyle })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="apa">APA</SelectItem>
                <SelectItem value="mla">MLA</SelectItem>
                <SelectItem value="chicago">Chicago</SelectItem>
                <SelectItem value="harvard">Harvard</SelectItem>
                <SelectItem value="ieee">IEEE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </SettingsGroup>

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
