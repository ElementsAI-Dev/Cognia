'use client';

/**
 * QuickAddProviderDialog - Quick add mainstream OpenAI-compatible providers
 * Provides preset configurations for popular third-party API providers
 */

import { useState, useMemo } from 'react';
import { Check, ExternalLink, Eye, EyeOff, Zap, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ApiProtocol } from '@/types/provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSettingsStore } from '@/stores';
import { testCustomProviderConnectionByProtocol } from '@/lib/ai/infrastructure/api-test';
import { cn } from '@/lib/utils';

export interface QuickAddPreset {
  id: string;
  name: string;
  description: string;
  baseURL: string;
  apiProtocol: ApiProtocol;
  models: string[];
  defaultModel: string;
  docsUrl?: string;
  dashboardUrl?: string;
  category: 'china' | 'global' | 'proxy';
  popular?: boolean;
}

export const QUICK_ADD_PRESETS: QuickAddPreset[] = [
  // Chinese Providers
  {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    description: 'High-performance inference, competitive pricing',
    baseURL: 'https://api.siliconflow.cn/v1',
    apiProtocol: 'openai',
    models: ['Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V3', 'Pro/Qwen/Qwen2.5-Coder-32B-Instruct'],
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    docsUrl: 'https://docs.siliconflow.cn',
    dashboardUrl: 'https://cloud.siliconflow.cn/account/ak',
    category: 'china',
    popular: true,
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI (月之暗面)',
    description: 'Kimi models with long context',
    baseURL: 'https://api.moonshot.cn/v1',
    apiProtocol: 'openai',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    defaultModel: 'moonshot-v1-8k',
    docsUrl: 'https://platform.moonshot.cn/docs',
    dashboardUrl: 'https://platform.moonshot.cn/console/api-keys',
    category: 'china',
    popular: true,
  },
  {
    id: 'zhipu',
    name: 'Zhipu AI (智谱清言)',
    description: 'GLM models, strong Chinese',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    apiProtocol: 'openai',
    models: ['glm-4-plus', 'glm-4-flash', 'glm-4-air'],
    defaultModel: 'glm-4-flash',
    docsUrl: 'https://open.bigmodel.cn/dev/howuse/introduction',
    dashboardUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    category: 'china',
    popular: true,
  },
  {
    id: 'doubao',
    name: 'Doubao (豆包)',
    description: 'ByteDance Doubao models',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    apiProtocol: 'openai',
    models: ['doubao-pro-32k', 'doubao-lite-32k', 'doubao-pro-128k'],
    defaultModel: 'doubao-pro-32k',
    docsUrl: 'https://www.volcengine.com/docs/82379',
    dashboardUrl: 'https://console.volcengine.com/ark',
    category: 'china',
  },
  {
    id: 'baichuan',
    name: 'Baichuan AI (百川智能)',
    description: 'Baichuan models for Chinese',
    baseURL: 'https://api.baichuan-ai.com/v1',
    apiProtocol: 'openai',
    models: ['Baichuan4', 'Baichuan3-Turbo', 'Baichuan3-Turbo-128k'],
    defaultModel: 'Baichuan4',
    docsUrl: 'https://platform.baichuan-ai.com/docs/api',
    dashboardUrl: 'https://platform.baichuan-ai.com/console/apikey',
    category: 'china',
  },
  {
    id: 'lingyi',
    name: '01.AI (零一万物)',
    description: 'Yi models, excellent performance',
    baseURL: 'https://api.lingyiwanwu.com/v1',
    apiProtocol: 'openai',
    models: ['yi-large', 'yi-medium', 'yi-spark'],
    defaultModel: 'yi-large',
    docsUrl: 'https://platform.lingyiwanwu.com/docs',
    dashboardUrl: 'https://platform.lingyiwanwu.com/apikeys',
    category: 'china',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    description: 'abab models for conversation',
    baseURL: 'https://api.minimax.chat/v1',
    apiProtocol: 'openai',
    models: ['abab6.5s-chat', 'abab6.5g-chat', 'abab5.5-chat'],
    defaultModel: 'abab6.5s-chat',
    docsUrl: 'https://api.minimax.chat/document',
    dashboardUrl: 'https://api.minimax.chat/',
    category: 'china',
  },
  {
    id: 'stepfun',
    name: 'StepFun (阶跃星辰)',
    description: 'Step models with vision',
    baseURL: 'https://api.stepfun.com/v1',
    apiProtocol: 'openai',
    models: ['step-1-8k', 'step-1-32k', 'step-1v-8k'],
    defaultModel: 'step-1-8k',
    docsUrl: 'https://platform.stepfun.com/docs',
    dashboardUrl: 'https://platform.stepfun.com/interface-key',
    category: 'china',
  },
  // Global Providers
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    description: 'Search-augmented responses',
    baseURL: 'https://api.perplexity.ai',
    apiProtocol: 'openai',
    models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'],
    defaultModel: 'llama-3.1-sonar-large-128k-online',
    docsUrl: 'https://docs.perplexity.ai',
    dashboardUrl: 'https://www.perplexity.ai/settings/api',
    category: 'global',
    popular: true,
  },
  {
    id: 'deepinfra',
    name: 'DeepInfra',
    description: 'Fast serverless inference',
    baseURL: 'https://api.deepinfra.com/v1/openai',
    apiProtocol: 'openai',
    models: ['meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-72B-Instruct'],
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
    docsUrl: 'https://deepinfra.com/docs',
    dashboardUrl: 'https://deepinfra.com/dash/api_keys',
    category: 'global',
    popular: true,
  },
  {
    id: 'novita',
    name: 'Novita AI',
    description: 'Affordable GPU cloud',
    baseURL: 'https://api.novita.ai/v3/openai',
    apiProtocol: 'openai',
    models: ['meta-llama/llama-3.1-70b-instruct', 'meta-llama/llama-3.1-8b-instruct'],
    defaultModel: 'meta-llama/llama-3.1-70b-instruct',
    docsUrl: 'https://novita.ai/docs',
    dashboardUrl: 'https://novita.ai/settings',
    category: 'global',
  },
  {
    id: 'lepton',
    name: 'Lepton AI',
    description: 'Photon-powered inference',
    baseURL: 'https://llama3-70b.lepton.run/api/v1',
    apiProtocol: 'openai',
    models: ['llama3-70b', 'llama3-8b', 'mixtral-8x7b'],
    defaultModel: 'llama3-70b',
    docsUrl: 'https://www.lepton.ai/docs',
    dashboardUrl: 'https://dashboard.lepton.ai/workspace',
    category: 'global',
  },
  // Proxy Services
  {
    id: 'aiproxy',
    name: 'AI Proxy',
    description: 'API proxy for restricted regions',
    baseURL: 'https://api.aiproxy.io/v1',
    apiProtocol: 'openai',
    models: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022'],
    defaultModel: 'gpt-4o',
    docsUrl: 'https://aiproxy.io/docs',
    category: 'proxy',
  },
  {
    id: 'ohmygpt',
    name: 'OhMyGPT',
    description: 'OpenAI API relay service',
    baseURL: 'https://api.ohmygpt.com/v1',
    apiProtocol: 'openai',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o',
    docsUrl: 'https://www.ohmygpt.com',
    category: 'proxy',
  },
];

type CategoryFilter = 'all' | 'china' | 'global' | 'proxy';

interface QuickAddProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddProviderDialog({
  open,
  onOpenChange,
}: QuickAddProviderDialogProps) {
  const t = useTranslations('providers');
  const tc = useTranslations('common');

  const addCustomProvider = useSettingsStore((state) => state.addCustomProvider);

  const [selectedPreset, setSelectedPreset] = useState<QuickAddPreset | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPresets = useMemo(() => {
    return QUICK_ADD_PRESETS.filter((preset) => {
      if (categoryFilter !== 'all' && preset.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          preset.name.toLowerCase().includes(query) ||
          preset.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [categoryFilter, searchQuery]);

  const handleSelectPreset = (preset: QuickAddPreset) => {
    setSelectedPreset(preset);
    setApiKey('');
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!selectedPreset || !apiKey) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await testCustomProviderConnectionByProtocol(
        selectedPreset.baseURL,
        apiKey,
        selectedPreset.apiProtocol
      );
      setTestResult(result.success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!selectedPreset || !apiKey.trim()) return;

    addCustomProvider({
      providerId: '',
      customName: selectedPreset.name,
      baseURL: selectedPreset.baseURL,
      apiKey: apiKey.trim(),
      apiProtocol: selectedPreset.apiProtocol,
      customModels: selectedPreset.models,
      defaultModel: selectedPreset.defaultModel,
      enabled: true,
    });

    // Reset and close
    setSelectedPreset(null);
    setApiKey('');
    setTestResult(null);
    onOpenChange(false);
  };

  const handleBack = () => {
    setSelectedPreset(null);
    setApiKey('');
    setTestResult(null);
  };

  const canSave = selectedPreset && apiKey.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {selectedPreset ? selectedPreset.name : t('quickAddProvider')}
          </DialogTitle>
          <DialogDescription>
            {selectedPreset
              ? t('enterApiKeyForProvider')
              : t('quickAddDescription')}
          </DialogDescription>
        </DialogHeader>

        {!selectedPreset ? (
          // Provider Selection View
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('searchProviders')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Tabs
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
              >
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs px-3">
                    {tc('all')}
                  </TabsTrigger>
                  <TabsTrigger value="china" className="text-xs px-3">
                    {t('chinaProviders')}
                  </TabsTrigger>
                  <TabsTrigger value="global" className="text-xs px-3">
                    {t('globalProviders')}
                  </TabsTrigger>
                  <TabsTrigger value="proxy" className="text-xs px-3">
                    {t('proxyServices')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Provider List */}
            <ScrollArea className="h-[380px] pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={cn(
                      'flex flex-col items-start p-3 rounded-lg border text-left transition-colors',
                      'hover:bg-accent hover:border-primary/50',
                      'focus:outline-none focus:ring-2 focus:ring-primary'
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium text-sm truncate flex-1">
                        {preset.name}
                      </span>
                      {preset.popular && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {t('popular')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {preset.description}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Badge variant="outline" className="text-[10px]">
                        {preset.models.length} {t('modelsCount')}
                      </Badge>
                    </div>
                  </button>
                ))}
                {filteredPresets.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                    {t('noProvidersFound')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // API Key Input View
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{selectedPreset.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedPreset.description}
                  </p>
                </div>
                {selectedPreset.dashboardUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    asChild
                  >
                    <a
                      href={selectedPreset.dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('getApiKey')}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedPreset.models.map((model) => (
                  <Badge
                    key={model}
                    variant={model === selectedPreset.defaultModel ? 'default' : 'outline'}
                    className="text-[10px]"
                  >
                    {model}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-api-key">{t('apiKey')}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="quick-api-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder={t('apiKeyPlaceholder')}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowKey(!showKey)}
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
                  onClick={handleTestConnection}
                  disabled={!apiKey || testing}
                >
                  {testing ? tc('loading') : t('test')}
                </Button>
              </div>
              {testResult === 'success' && (
                <p className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="h-4 w-4" /> {t('connectionSuccess')}
                </p>
              )}
              {testResult === 'error' && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  {t('connectionFailed')}
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {t('baseURL')}: <code className="bg-muted px-1 rounded">{selectedPreset.baseURL}</code>
            </p>
          </div>
        )}

        <DialogFooter>
          {selectedPreset ? (
            <>
              <Button variant="outline" onClick={handleBack}>
                {tc('back')}
              </Button>
              <Button onClick={handleSave} disabled={!canSave}>
                {tc('save')}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QuickAddProviderDialog;
