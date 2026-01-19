'use client';

/**
 * ProviderSettings - Configure AI provider API keys
 * Enhanced with batch testing, collapsible sections, multi-key rotation, and default model selection
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ExternalLink,
  Plus,
  Edit2,
  Loader2,
  Clock,
  Zap,
  RefreshCw,
  Star,
  ChevronDown,
  ChevronUp,
  Trash2,
  RotateCcw,
  Activity,
  Globe,
  Cpu,
  Server,
  Sparkles,
  LayoutGrid,
  TableIcon,
  Wrench,
  ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { PROVIDERS, type ApiKeyRotationStrategy } from '@/types/provider';
import { CustomProviderDialog } from './custom-provider-dialog';
import { OAuthLoginButton } from './oauth-login-button';
import { ProviderImportExport } from './provider-import-export';
import { ProviderHealthStatus } from './provider-health-status';
import { OllamaModelManager } from './ollama-model-manager';
import { LocalProviderSettings } from './local-provider-settings';
import { OpenRouterSettings } from './openrouter-settings';
import { OpenRouterKeyManagement } from './openrouter-key-management';
import { CLIProxyAPISettings } from './cliproxyapi-settings';
import { testProviderConnection, type ApiTestResult } from '@/lib/ai/infrastructure/api-test';
import { maskApiKey } from '@/lib/ai/infrastructure/api-key-rotation';
import { ProviderIcon } from '@/components/providers/ai/provider-icon';

// Helper to get dashboard URL for each provider
function getProviderDashboardUrl(providerId: string): string {
  const provider = PROVIDERS[providerId];
  if (provider?.dashboardUrl) return provider.dashboardUrl;
  
  const urls: Record<string, string> = {
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
    google: 'https://aistudio.google.com/app/apikey',
    deepseek: 'https://platform.deepseek.com/api_keys',
    groq: 'https://console.groq.com/keys',
    mistral: 'https://console.mistral.ai/api-keys/',
    xai: 'https://console.x.ai/team/api-keys',
    togetherai: 'https://api.together.xyz/settings/api-keys',
    openrouter: 'https://openrouter.ai/keys',
    cohere: 'https://dashboard.cohere.com/api-keys',
    fireworks: 'https://fireworks.ai/account/api-keys',
    cerebras: 'https://cloud.cerebras.ai/platform',
    sambanova: 'https://cloud.sambanova.ai/apis',
    // Local providers - link to documentation/websites
    ollama: 'https://ollama.ai',
    lmstudio: 'https://lmstudio.ai',
    llamacpp: 'https://github.com/ggerganov/llama.cpp',
    llamafile: 'https://github.com/Mozilla-Ocho/llamafile',
    vllm: 'https://docs.vllm.ai',
    localai: 'https://localai.io',
    jan: 'https://jan.ai',
    textgenwebui: 'https://github.com/oobabooga/text-generation-webui',
    koboldcpp: 'https://github.com/LostRuins/koboldcpp',
    tabbyapi: 'https://github.com/theroyallab/tabbyAPI',
    // Proxy/Aggregator providers
    cliproxyapi: 'http://localhost:8317/management.html',
  };
  return urls[providerId] || '#';
}

// Get provider description
function getProviderDescription(providerId: string): string {
  const provider = PROVIDERS[providerId];
  if (provider?.description) return provider.description;
  
  const descriptions: Record<string, string> = {
    openai: 'GPT-4o, o1, and more flagship models',
    anthropic: 'Claude 4 Sonnet, Claude 4 Opus',
    google: 'Gemini 2.0 Flash, Gemini 1.5 Pro',
    deepseek: 'DeepSeek Chat, DeepSeek Reasoner',
    groq: 'Ultra-fast inference with Llama 3.3',
    mistral: 'Mistral Large, Mistral Small',
    xai: 'Grok 3, Grok 3 Mini',
    togetherai: 'Fast inference for open source models',
    openrouter: 'Access 200+ models with OAuth login',
    cohere: 'Command R+, enterprise RAG',
    fireworks: 'Ultra-fast compound AI',
    cerebras: 'Fastest inference with custom AI chips',
    sambanova: 'Enterprise AI with free tier',
    cliproxyapi: 'Self-hosted AI proxy aggregating multiple providers',
    ollama: 'Run models locally on your machine',
    // New local providers
    lmstudio: 'Desktop app for running local LLMs',
    llamacpp: 'High-performance C++ inference server',
    llamafile: 'Single-file executable LLM server',
    vllm: 'High-throughput GPU inference engine',
    localai: 'Self-hosted OpenAI alternative',
    jan: 'Open-source ChatGPT alternative',
    textgenwebui: 'Gradio web UI with OpenAI API',
    koboldcpp: 'Easy-to-use llama.cpp fork',
    tabbyapi: 'Exllamav2 API server',
  };
  return descriptions[providerId] || '';
}

// Get provider icon
function getProviderIcon(providerId: string) {
  return <ProviderIcon icon={`/icons/providers/${providerId}.svg`} size={16} className="shrink-0" />;
}

// Get category icon
function getCategoryIcon(category?: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    flagship: <Sparkles className="h-4 w-4" />,
    aggregator: <Globe className="h-4 w-4" />,
    specialized: <Zap className="h-4 w-4" />,
    local: <Server className="h-4 w-4" />,
    enterprise: <Cpu className="h-4 w-4" />,
  };
  return category ? icons[category] || <Cpu className="h-4 w-4" /> : <Cpu className="h-4 w-4" />;
}

// Provider categories for filtering
type ProviderCategory = 'all' | 'flagship' | 'aggregator' | 'specialized' | 'local';

const CATEGORY_CONFIG: Record<ProviderCategory, { label: string; icon: React.ReactNode; description: string }> = {
  all: { label: 'All', icon: null, description: 'All providers' },
  flagship: { label: 'Flagship', icon: <Sparkles className="h-3 w-3" />, description: 'OpenAI, Anthropic, Google, xAI' },
  aggregator: { label: 'Aggregator', icon: <Globe className="h-3 w-3" />, description: 'OpenRouter, CLIProxyAPI, Together AI' },
  specialized: { label: 'Fast', icon: <Zap className="h-3 w-3" />, description: 'Groq, Cerebras, DeepSeek' },
  local: { label: 'Local', icon: <Server className="h-3 w-3" />, description: 'Ollama, LM Studio, vLLM, llama.cpp' },
};

// Map provider IDs to categories
const PROVIDER_CATEGORIES: Record<string, ProviderCategory> = {
  openai: 'flagship',
  anthropic: 'flagship',
  google: 'flagship',
  xai: 'flagship',
  openrouter: 'aggregator',
  cliproxyapi: 'aggregator',
  togetherai: 'aggregator',
  groq: 'specialized',
  cerebras: 'specialized',
  deepseek: 'specialized',
  fireworks: 'specialized',
  mistral: 'specialized',
  cohere: 'specialized',
  sambanova: 'specialized',
  // Local inference providers
  ollama: 'local',
  lmstudio: 'local',
  llamacpp: 'local',
  llamafile: 'local',
  vllm: 'local',
  localai: 'local',
  jan: 'local',
  textgenwebui: 'local',
  koboldcpp: 'local',
  tabbyapi: 'local',
};

export function ProviderSettings() {
  const t = useTranslations('providers');
  const tc = useTranslations('common');
  const tPlaceholders = useTranslations('placeholders');

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const updateProviderSettings = useSettingsStore((state) => state.updateProviderSettings);
  const customProviders = useSettingsStore((state) => state.customProviders);
  const updateCustomProvider = useSettingsStore((state) => state.updateCustomProvider);
  const addApiKey = useSettingsStore((state) => state.addApiKey);
  const removeApiKey = useSettingsStore((state) => state.removeApiKey);
  const setApiKeyRotation = useSettingsStore((state) => state.setApiKeyRotation);
  const resetApiKeyStats = useSettingsStore((state) => state.resetApiKeyStats);

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, ApiTestResult | null>>({});
  const [testingProviders, setTestingProviders] = useState<Record<string, boolean>>({});
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [batchTestProgress, setBatchTestProgress] = useState(0);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [newApiKeys, setNewApiKeys] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<ProviderCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'name' | 'models' | 'context' | 'price' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedTableRows, setExpandedTableRows] = useState<Record<string, boolean>>({});

  const toggleExpanded = useCallback((providerId: string) => {
    setExpandedProviders((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  }, []);

  const handleSetDefaultModel = (providerId: string, modelId: string) => {
    updateProviderSettings(providerId, { defaultModel: modelId });
  };

  const handleAddApiKey = (providerId: string) => {
    const newKey = newApiKeys[providerId]?.trim();
    if (newKey && newKey.length >= 10) {
      addApiKey(providerId, newKey);
      setNewApiKeys((prev) => ({ ...prev, [providerId]: '' }));
    }
  };

  const handleRemoveApiKey = (providerId: string, index: number) => {
    removeApiKey(providerId, index);
  };

  const handleToggleRotation = (providerId: string, enabled: boolean) => {
    const settings = providerSettings[providerId];
    setApiKeyRotation(providerId, enabled, settings?.apiKeyRotationStrategy || 'round-robin');
  };

  const handleRotationStrategyChange = (providerId: string, strategy: ApiKeyRotationStrategy) => {
    setApiKeyRotation(providerId, true, strategy);
  };

  // Get count of configured providers
  const configuredCount = Object.entries(providerSettings).filter(
    ([id, settings]) => settings?.enabled && (settings?.apiKey || id === 'ollama')
  ).length;

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

  // Batch test all configured providers
  const handleBatchTest = useCallback(async () => {
    const enabledProviders = Object.entries(providerSettings)
      .filter(([id, settings]) => settings?.enabled && (settings?.apiKey || id === 'ollama'))
      .map(([id]) => id);

    if (enabledProviders.length === 0) return;

    setIsBatchTesting(true);
    setBatchTestProgress(0);
    setTestResults({});

    for (let i = 0; i < enabledProviders.length; i++) {
      const providerId = enabledProviders[i];
      await handleTestConnection(providerId);
      setBatchTestProgress(((i + 1) / enabledProviders.length) * 100);
    }

    setIsBatchTesting(false);
  }, [providerSettings, handleTestConnection]);

  // Count test results
  const testResultsSummary = {
    success: Object.values(testResults).filter((r) => r?.success).length,
    failed: Object.values(testResults).filter((r) => r && !r.success).length,
    total: Object.values(testResults).filter((r) => r !== null).length,
  };

  // Filter and sort providers
  const filteredProviders = useMemo(() => {
    const filtered = Object.entries(PROVIDERS).filter(([providerId, provider]) => {
      // Category filter
      if (categoryFilter !== 'all') {
        const providerCategory = PROVIDER_CATEGORIES[providerId];
        if (providerCategory !== categoryFilter) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = provider.name.toLowerCase().includes(query);
        const matchesModel = provider.models.some(m => 
          m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesModel) return false;
      }
      return true;
    });

    // Sort providers (only in table view)
    if (viewMode === 'table') {
      filtered.sort(([idA, a], [idB, b]) => {
        let comparison = 0;
        const settingsA = providerSettings[idA] || {};
        const settingsB = providerSettings[idB] || {};
        
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'models':
            comparison = a.models.length - b.models.length;
            break;
          case 'context': {
            const ctxA = a.models[0]?.contextLength || 0;
            const ctxB = b.models[0]?.contextLength || 0;
            comparison = ctxA - ctxB;
            break;
          }
          case 'price': {
            const priceA = a.models[0]?.pricing?.promptPer1M || 0;
            const priceB = b.models[0]?.pricing?.promptPer1M || 0;
            comparison = priceA - priceB;
            break;
          }
          case 'status': {
            const statusA = settingsA.enabled && (settingsA.apiKey || idA === 'ollama') ? 1 : 0;
            const statusB = settingsB.enabled && (settingsB.apiKey || idB === 'ollama') ? 1 : 0;
            comparison = statusA - statusB;
            break;
          }
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [categoryFilter, searchQuery, viewMode, sortBy, sortOrder, providerSettings]);

  // Toggle sort column
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Toggle table row expansion
  const toggleTableRow = (providerId: string) => {
    setExpandedTableRows(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  return (
    <div className="space-y-6">
      {/* Header with batch actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">
            {configuredCount} provider{configuredCount !== 1 ? 's' : ''} configured
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ProviderImportExport />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchTest}
            disabled={isBatchTesting || configuredCount === 0}
          >
            {isBatchTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Test All Providers
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Batch test progress */}
      {isBatchTesting && (
        <div className="space-y-2">
          <Progress value={batchTestProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Testing providers... {Math.round(batchTestProgress)}%
          </p>
        </div>
      )}

      {/* Test results summary */}
      {testResultsSummary.total > 0 && !isBatchTesting && (
        <div className="flex items-center gap-4 rounded-lg border p-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Test Results:</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              {testResultsSummary.success} passed
            </span>
            {testResultsSummary.failed > 0 && (
              <span className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {testResultsSummary.failed} failed
              </span>
            )}
          </div>
        </div>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('securityTitle')}</AlertTitle>
        <AlertDescription>
          {t('securityDescription')}
        </AlertDescription>
      </Alert>

      {/* Category Filter Tabs and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ProviderCategory)} className="w-full sm:w-auto">
          <TabsList className="h-8 p-0.5 bg-muted/50">
            {(Object.keys(CATEGORY_CONFIG) as ProviderCategory[]).map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              const count = cat === 'all'
                ? Object.keys(PROVIDERS).length
                : Object.keys(PROVIDERS).filter(id => PROVIDER_CATEGORIES[id] === cat).length;
              return (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="h-7 px-2.5 text-xs gap-1 data-[state=active]:bg-background"
                >
                  {config.icon}
                  <span className="hidden sm:inline">{config.label}</span>
                  <span className="sm:hidden">{config.label.slice(0, 3)}</span>
                  <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-48">
            <Input
              placeholder={tPlaceholders('searchProviders')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm pl-8 max-sm:h-10 max-sm:text-base"
              autoComplete="off"
              data-form-type="other"
              data-lpignore="true"
            />
            <Cpu className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2 rounded-r-none"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2 rounded-l-none"
              onClick={() => setViewMode('table')}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Local Providers Section - Show when local category is selected */}
      {categoryFilter === 'local' && (
        <LocalProviderSettings />
      )}

      {/* Built-in Providers - Grid or Table Layout */}
      <TooltipProvider delayDuration={300}>
        {filteredProviders.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No providers found matching your filters.
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">
                    <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('name')}>
                      Provider
                      {sortBy === 'name' ? (sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('models')}>
                      Models
                      {sortBy === 'models' ? (sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('context')}>
                      Context
                      {sortBy === 'context' ? (sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Features</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('price')}>
                      Pricing
                      {sortBy === 'price' ? (sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="h-7 px-2 font-medium" onClick={() => handleSort('status')}>
                      Status
                      {sortBy === 'status' ? (sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.map(([providerId, provider]) => {
                  const settings = providerSettings[providerId] || {};
                  const isEnabled = settings.enabled !== false;
                  const apiKey = settings.apiKey || '';
                  const testResult = testResults[providerId];
                  const defaultModel = provider.models.find(m => 
                    m.id === (settings.defaultModel || provider.defaultModel)
                  ) || provider.models[0];
                  const minPrice = Math.min(...provider.models.filter(m => m.pricing).map(m => m.pricing?.promptPer1M || 0));
                  const maxPrice = Math.max(...provider.models.filter(m => m.pricing).map(m => m.pricing?.completionPer1M || 0));
                  
                  return (
                    <React.Fragment key={providerId}>
                    <TableRow className={cn(!isEnabled && 'opacity-50')}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-muted-foreground">
                            {getCategoryIcon(provider.category)}
                          </div>
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {getProviderDescription(providerId).split(',')[0]}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {provider.models.slice(0, 2).map((model) => (
                            <Badge 
                              key={model.id} 
                              variant={model.id === defaultModel?.id ? 'default' : 'outline'} 
                              className="text-[10px] px-1.5 py-0"
                            >
                              {model.name}
                            </Badge>
                          ))}
                          {provider.models.length > 2 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{provider.models.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {defaultModel?.contextLength >= 1000000 
                            ? `${(defaultModel.contextLength / 1000000).toFixed(1)}M` 
                            : `${Math.round(defaultModel?.contextLength / 1000)}K`}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-1">
                          {defaultModel?.supportsVision && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span><ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /></span>
                              </TooltipTrigger>
                              <TooltipContent>Vision</TooltipContent>
                            </Tooltip>
                          )}
                          {defaultModel?.supportsTools && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Tool Use</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {provider.models.some(m => m.pricing) ? (
                          <span className="text-xs text-muted-foreground font-mono">
                            ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            {providerId === 'ollama' ? 'Free' : 'Varies'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEnabled && apiKey ? (
                          testResult?.success ? (
                            <Badge variant="default" className="text-[10px] bg-green-600">
                              <Check className="h-3 w-3 mr-0.5" />
                              OK
                            </Badge>
                          ) : testResult && !testResult.success ? (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertCircle className="h-3 w-3 mr-0.5" />
                              Error
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px]">
                              <Check className="h-3 w-3 mr-0.5" />
                              Ready
                            </Badge>
                          )
                        ) : providerId === 'ollama' && isEnabled ? (
                          <Badge variant="secondary" className="text-[10px]">Local</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Not Set</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleTestConnection(providerId)}
                                disabled={(!apiKey && providerId !== 'ollama') || testingProviders[providerId]}
                              >
                                {testingProviders[providerId] ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Test Connection</TooltipContent>
                          </Tooltip>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleToggleProvider(providerId, checked)}
                            className="scale-75"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleTableRow(providerId)}
                          >
                            {expandedTableRows[providerId] ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Expanded Row Details */}
                    {expandedTableRows[providerId] && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={7} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* All Models */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">All Models ({provider.models.length})</h4>
                              <div className="flex flex-wrap gap-1">
                                {provider.models.map((model) => (
                                  <Badge 
                                    key={model.id}
                                    variant={model.id === defaultModel?.id ? 'default' : 'outline'}
                                    className="text-xs cursor-pointer hover:bg-primary/80"
                                    onClick={() => handleSetDefaultModel(providerId, model.id)}
                                  >
                                    {model.name}
                                    {model.supportsVision && <ImageIcon className="ml-1 h-3 w-3" />}
                                    {model.supportsTools && <Wrench className="ml-1 h-3 w-3" />}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {/* Pricing Details */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Pricing (per 1M tokens)</h4>
                              <div className="text-xs space-y-1">
                                {provider.models.filter(m => m.pricing).slice(0, 4).map((model) => (
                                  <div key={model.id} className="flex justify-between text-muted-foreground">
                                    <span>{model.name}</span>
                                    <span className="font-mono">
                                      ${model.pricing?.promptPer1M.toFixed(2)} / ${model.pricing?.completionPer1M.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                                {!provider.models.some(m => m.pricing) && (
                                  <span className="text-muted-foreground">
                                    {providerId === 'ollama' ? 'Free (Local)' : 'Pricing varies'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Quick Actions */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Quick Actions</h4>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => toggleExpanded(providerId)}
                                >
                                  Configure API Key
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleTestConnection(providerId)}
                                  disabled={(!apiKey && providerId !== 'ollama') || testingProviders[providerId]}
                                >
                                  {testingProviders[providerId] ? 'Testing...' : 'Test Connection'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ) : (
          /* Cards View */
          <div className="grid grid-cols-1 gap-3">
            {filteredProviders.map(([providerId, provider]) => {
        const settings = providerSettings[providerId] || {};
        const isEnabled = settings.enabled !== false;
        const apiKey = settings.apiKey || '';
        const showKey = showKeys[providerId] || false;
        const testResult = testResults[providerId];
        const isExpanded = expandedProviders[providerId] ?? false;
        const apiKeys = settings.apiKeys || [];
        const rotationEnabled = settings.apiKeyRotationEnabled || false;
        const rotationStrategy = settings.apiKeyRotationStrategy || 'round-robin';
        const usageStats = settings.apiKeyUsageStats || {};

        return (
          <Collapsible
            key={providerId}
            open={isExpanded}
            onOpenChange={() => toggleExpanded(providerId)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors active:bg-muted/50 py-3 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex flex-col gap-1 min-w-0">
                        <CardTitle className="flex items-center gap-2 text-base max-sm:text-sm max-sm:flex-wrap">
                          <span className="truncate">{provider.name}</span>
                          {providerId === 'ollama' && (
                            <Badge variant="secondary" className="text-xs shrink-0">{t('local')}</Badge>
                          )}
                          {isEnabled && apiKey && (
                            <Badge variant="default" className="text-xs shrink-0 max-sm:hidden">
                              <Check className="h-3 w-3 mr-1" />
                              {tc('configured') || 'Configured'}
                            </Badge>
                          )}
                          {apiKeys.length > 1 && (
                            <Badge variant="outline" className="text-xs shrink-0 max-sm:hidden">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              {apiKeys.length} keys
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs flex items-center gap-2 max-sm:hidden">
                          <span className="text-muted-foreground">
                            {getProviderIcon(providerId)}
                          </span>
                          {getProviderDescription(providerId) || t('ollamaDescription')}
                          {provider.supportsOAuth && (
                            <Badge variant="outline" className="text-[10px] ml-1">
                              <Globe className="h-2.5 w-2.5 mr-0.5" />
                              OAuth
                            </Badge>
                          )}
                        </CardDescription>
                        {/* Mobile: Show configured status as icon */}
                        {isEnabled && apiKey && (
                          <div className="hidden max-sm:flex items-center gap-1 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            <span>Configured</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggleProvider(providerId, checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="max-sm:scale-110"
                      />
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0 px-4 pb-4">
                  {providerId === 'ollama' ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${providerId}-url`}>{t('ollamaURL')}</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`${providerId}-url`}
                            placeholder="http://localhost:11434"
                            value={settings.baseURL || 'http://localhost:11434'}
                            onChange={(e) =>
                              updateProviderSettings(providerId, { baseURL: e.target.value })
                            }
                            disabled={!isEnabled}
                            autoComplete="off"
                            data-form-type="other"
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTestConnection(providerId)}
                                disabled={!isEnabled || testingProviders[providerId]}
                              >
                                {testingProviders[providerId] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  t('test')
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Test connection to Ollama server</p>
                            </TooltipContent>
                          </Tooltip>
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

                      {/* Ollama Model Manager */}
                      {isEnabled && (
                        <OllamaModelManager
                          baseUrl={settings.baseURL || 'http://localhost:11434'}
                          selectedModel={settings.defaultModel}
                          onModelSelect={(modelName: string) => handleSetDefaultModel(providerId, modelName)}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Two-column layout for API Key and Base URL */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Primary API Key */}
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
                                autoComplete="off"
                                data-form-type="other"
                                data-lpignore="true"
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTestConnection(providerId)}
                                  disabled={!isEnabled || !apiKey || testingProviders[providerId]}
                                >
                                  {testingProviders[providerId] ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    t('test')
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Verify API key with {provider.name}</p>
                              </TooltipContent>
                            </Tooltip>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-muted-foreground">
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
                            {/* OAuth Quick Login */}
                            {provider.supportsOAuth && (
                              <OAuthLoginButton providerId={providerId} />
                            )}
                          </div>
                        </div>

                        {/* Custom Base URL (for proxy/self-hosted) */}
                        <div className="space-y-2">
                          <Label className="text-sm flex items-center gap-1.5">
                            <Server className="h-3.5 w-3.5" />
                            {t('customBaseURL') || 'Custom Base URL'}
                            <Badge variant="outline" className="text-[10px] ml-1">Optional</Badge>
                          </Label>
                          <Input
                            placeholder={t('baseURLPlaceholder') || `https://api.${providerId}.com/v1`}
                            value={settings.baseURL || ''}
                            onChange={(e) =>
                              updateProviderSettings(providerId, { baseURL: e.target.value || undefined })
                            }
                            disabled={!isEnabled}
                            className="font-mono"
                            autoComplete="off"
                            data-form-type="other"
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('baseURLHint') || 'Use a proxy URL or self-hosted endpoint. Leave empty for default.'}
                          </p>
                        </div>
                      </div>

                      {/* Two-column: Multi-Key Rotation & Available Models */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Multi-Key Rotation Section */}
                        <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-muted-foreground" />
                              <Label className="text-sm font-medium">API Key Rotation</Label>
                              <Badge variant="outline" className="text-xs">
                                {apiKeys.length} key{apiKeys.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <Switch
                              checked={rotationEnabled}
                              onCheckedChange={(checked) => handleToggleRotation(providerId, checked)}
                              disabled={!isEnabled || apiKeys.length < 2}
                            />
                          </div>

                          {/* Rotation Strategy */}
                          {rotationEnabled && apiKeys.length >= 2 && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Strategy:</Label>
                              <Select
                                value={rotationStrategy}
                                onValueChange={(value: ApiKeyRotationStrategy) =>
                                  handleRotationStrategyChange(providerId, value)
                                }
                                disabled={!isEnabled}
                              >
                                <SelectTrigger className="h-7 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="round-robin">Round Robin</SelectItem>
                                  <SelectItem value="random">Random</SelectItem>
                                  <SelectItem value="least-used">Least Used</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* API Keys List */}
                          {apiKeys.length > 0 && (
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                              {apiKeys.map((key, index) => {
                                const stats = usageStats[key];
                                const isActive = settings.currentKeyIndex === index;
                                return (
                                  <div
                                    key={index}
                                    className={cn(
                                      'flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs',
                                      isActive && rotationEnabled && 'border-primary bg-primary/5'
                                    )}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {isActive && rotationEnabled && (
                                        <Badge variant="default" className="text-[10px] px-1 py-0 shrink-0">
                                          Active
                                        </Badge>
                                      )}
                                      <code className="font-mono text-muted-foreground truncate text-[11px]">
                                        {maskApiKey(key)}
                                      </code>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {stats && (
                                        <span className="text-muted-foreground text-[10px] hidden sm:inline">
                                          {stats.usageCount}x
                                          {stats.errorCount > 0 && (
                                            <span className="text-destructive ml-0.5">
                                              ({stats.errorCount}err)
                                            </span>
                                          )}
                                        </span>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        onClick={() => resetApiKeyStats(providerId, key)}
                                        title="Reset stats"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-destructive hover:text-destructive"
                                        onClick={() => handleRemoveApiKey(providerId, index)}
                                        disabled={apiKeys.length === 1 && key === apiKey}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Add New Key */}
                          <div className="flex gap-2">
                            <Input
                              placeholder={tPlaceholders('addApiKey')}
                              value={newApiKeys[providerId] || ''}
                              onChange={(e) =>
                                setNewApiKeys((prev) => ({ ...prev, [providerId]: e.target.value }))
                              }
                              disabled={!isEnabled}
                              className="h-7 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddApiKey(providerId);
                                }
                              }}
                              autoComplete="off"
                              data-form-type="other"
                              data-lpignore="true"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleAddApiKey(providerId)}
                              disabled={!isEnabled || !newApiKeys[providerId]?.trim()}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <p className="text-[10px] text-muted-foreground">
                            Add multiple keys to enable rotation for rate limit distribution.
                          </p>
                        </div>
                        {/* Available models with default selection */}
                        <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <Star className="h-4 w-4 text-muted-foreground" />
                              {t('availableModels')}
                            </Label>
                            <span className="text-[10px] text-muted-foreground">
                              Click to set default
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {provider.models.map((model) => {
                              const isDefault = settings.defaultModel === model.id || 
                                (!settings.defaultModel && model.id === provider.defaultModel);
                              return (
                                <button
                                  key={model.id}
                                  onClick={() => handleSetDefaultModel(providerId, model.id)}
                                  disabled={!isEnabled}
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                                    isDefault
                                      ? 'bg-primary text-primary-foreground'
                                      : isEnabled
                                        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                        : 'bg-muted text-muted-foreground'
                                  )}
                                >
                                  {isDefault && <Star className="h-3 w-3 fill-current" />}
                                  {model.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Health Status */}
                  {isEnabled && apiKey && (
                    <ProviderHealthStatus providerId={providerId} />
                  )}

                  {/* OpenRouter-specific settings */}
                  {providerId === 'openrouter' && isEnabled && (
                    <div className="space-y-4 pt-2 border-t">
                      <OpenRouterSettings />
                      <OpenRouterKeyManagement />
                    </div>
                  )}

                  {/* CLIProxyAPI-specific settings */}
                  {providerId === 'cliproxyapi' && isEnabled && (
                    <div className="space-y-4 pt-2 border-t">
                      <CLIProxyAPISettings />
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
              </Collapsible>
            );
          })}
          </div>
        )}
      </TooltipProvider>

      {/* Custom Providers Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                {t('customProviders')}
                <Badge variant="outline" className="text-[10px]">{t('openaiCompatible')}</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {t('customProvidersDescription')}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setEditingProviderId(null);
                setShowCustomDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
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
