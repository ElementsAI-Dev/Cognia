'use client';

/**
 * OpenRouter Settings Component
 * Provides UI for BYOK, API key management, credits display, and provider ordering
 * https://openrouter.ai/docs
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { nanoid } from 'nanoid';
import {
  Key,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  DollarSign,
  Settings2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/stores';
import type { BYOKKeyEntry, BYOKProvider, OpenRouterExtendedSettings } from '@/types/provider';
import {
  getCredits,
  formatCredits,
  maskApiKey,
  OpenRouterError,
} from '@/lib/ai/providers/openrouter';

const BYOK_PROVIDERS: { id: BYOKProvider; name: string; description: string; configType: 'simple' | 'azure' | 'bedrock' | 'vertex' }[] = [
  { id: 'openai', name: 'OpenAI', description: 'GPT-4, GPT-4o, o1 models', configType: 'simple' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude models', configType: 'simple' },
  { id: 'google', name: 'Google AI', description: 'Gemini models', configType: 'simple' },
  { id: 'mistral', name: 'Mistral AI', description: 'Mistral models', configType: 'simple' },
  { id: 'cohere', name: 'Cohere', description: 'Command models', configType: 'simple' },
  { id: 'groq', name: 'Groq', description: 'Fast inference', configType: 'simple' },
  { id: 'azure', name: 'Azure AI Services', description: 'Azure-hosted models', configType: 'azure' },
  { id: 'bedrock', name: 'Amazon Bedrock', description: 'AWS-hosted models', configType: 'bedrock' },
  { id: 'vertex', name: 'Google Vertex AI', description: 'Enterprise Google AI', configType: 'vertex' },
];

interface OpenRouterSettingsProps {
  className?: string;
}

export function OpenRouterSettings({ className }: OpenRouterSettingsProps) {
  const _t = useTranslations('providers');
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const updateProviderSettings = useSettingsStore((state) => state.updateProviderSettings);
  
  const settings = providerSettings.openrouter;
  const openRouterSettings = useMemo(() => settings?.openRouterSettings || {}, [settings?.openRouterSettings]);
  
  const [isCreditsLoading, setIsCreditsLoading] = useState(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [isByokOpen, setIsByokOpen] = useState(false);
  const [isProviderOrderOpen, setIsProviderOrderOpen] = useState(false);
  const [newByokProvider, setNewByokProvider] = useState<BYOKProvider | ''>('');
  const [newByokConfig, setNewByokConfig] = useState('');
  const [newByokName, setNewByokName] = useState('');

  const updateOpenRouterSettings = useCallback((updates: Partial<OpenRouterExtendedSettings>) => {
    updateProviderSettings('openrouter', {
      openRouterSettings: {
        ...openRouterSettings,
        ...updates,
      },
    });
  }, [openRouterSettings, updateProviderSettings]);

  const fetchCredits = useCallback(async () => {
    if (!settings?.apiKey) return;
    
    setIsCreditsLoading(true);
    setCreditsError(null);
    
    try {
      const creditsData = await getCredits(settings.apiKey);
      updateOpenRouterSettings({
        credits: creditsData.credits,
        creditsUsed: creditsData.credits_used,
        creditsRemaining: creditsData.credits_remaining,
        creditsLastFetched: Date.now(),
      });
    } catch (error) {
      if (error instanceof OpenRouterError) {
        setCreditsError(error.message);
      } else {
        setCreditsError('Failed to fetch credits');
      }
    } finally {
      setIsCreditsLoading(false);
    }
  }, [settings?.apiKey, updateOpenRouterSettings]);

  // Fetch credits on mount if API key exists
  useEffect(() => {
    if (settings?.apiKey && !openRouterSettings.creditsLastFetched) {
      fetchCredits();
    }
  }, [settings?.apiKey, openRouterSettings.creditsLastFetched, fetchCredits]);

  const addByokKey = useCallback(() => {
    if (!newByokProvider || !newByokConfig) return;
    
    const newKey: BYOKKeyEntry = {
      id: nanoid(),
      provider: newByokProvider,
      config: newByokConfig,
      alwaysUse: false,
      enabled: true,
      name: newByokName || undefined,
    };
    
    const existingKeys = openRouterSettings.byokKeys || [];
    updateOpenRouterSettings({
      byokKeys: [...existingKeys, newKey],
    });
    
    setNewByokProvider('');
    setNewByokConfig('');
    setNewByokName('');
  }, [newByokProvider, newByokConfig, newByokName, openRouterSettings.byokKeys, updateOpenRouterSettings]);

  const removeByokKey = useCallback((id: string) => {
    const existingKeys = openRouterSettings.byokKeys || [];
    updateOpenRouterSettings({
      byokKeys: existingKeys.filter(k => k.id !== id),
    });
  }, [openRouterSettings.byokKeys, updateOpenRouterSettings]);

  const updateByokKey = useCallback((id: string, updates: Partial<BYOKKeyEntry>) => {
    const existingKeys = openRouterSettings.byokKeys || [];
    updateOpenRouterSettings({
      byokKeys: existingKeys.map(k => k.id === id ? { ...k, ...updates } : k),
    });
  }, [openRouterSettings.byokKeys, updateOpenRouterSettings]);

  const selectedProviderConfig = BYOK_PROVIDERS.find(p => p.id === newByokProvider);

  if (!settings?.enabled) {
    return null;
  }

  return (
    <div className={className}>
      {/* Credits Display */}
      {settings.apiKey && (
        <Card className="mb-4">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <CardTitle className="text-sm">OpenRouter Credits</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchCredits}
                disabled={isCreditsLoading}
              >
                {isCreditsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-2">
            {creditsError ? (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {creditsError}
              </div>
            ) : openRouterSettings.credits !== undefined ? (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCredits(openRouterSettings.credits || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Used</p>
                  <p className="font-medium">{formatCredits(openRouterSettings.creditsUsed || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-medium text-green-600">{formatCredits(openRouterSettings.creditsRemaining || 0)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click refresh to load credits</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* BYOK Section */}
      <Collapsible open={isByokOpen} onOpenChange={setIsByokOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <CardTitle className="text-sm">Bring Your Own Keys (BYOK)</CardTitle>
                  {(openRouterSettings.byokKeys?.length || 0) > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {openRouterSettings.byokKeys?.length}
                    </Badge>
                  )}
                </div>
                {isByokOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
              <CardDescription className="text-xs">
                Use your own provider API keys for 5% cost (free for first 1M requests/month)
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Existing BYOK Keys */}
                {openRouterSettings.byokKeys?.map((key) => {
                  const providerInfo = BYOK_PROVIDERS.find(p => p.id === key.provider);
                  return (
                    <div
                      key={key.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {key.name || providerInfo?.name || key.provider}
                          </span>
                          {key.enabled && (
                            <Badge variant="outline" className="text-xs">Active</Badge>
                          )}
                          {key.alwaysUse && (
                            <Badge variant="secondary" className="text-xs">Always Use</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {key.config.length > 20 ? maskApiKey(key.config) : key.config}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Switch
                                checked={key.alwaysUse}
                                onCheckedChange={(checked) => updateByokKey(key.id, { alwaysUse: checked })}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Always use this key (no fallback to OpenRouter credits)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Switch
                          checked={key.enabled}
                          onCheckedChange={(checked) => updateByokKey(key.id, { enabled: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeByokKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <Separator />

                {/* Add New BYOK Key */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Add Provider Key</Label>
                  <Select
                    value={newByokProvider}
                    onValueChange={(value) => setNewByokProvider(value as BYOKProvider)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {BYOK_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div className="flex flex-col">
                            <span>{provider.name}</span>
                            <span className="text-xs text-muted-foreground">{provider.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {newByokProvider && (
                    <>
                      <Input
                        placeholder="Key name (optional)"
                        value={newByokName}
                        onChange={(e) => setNewByokName(e.target.value)}
                      />
                      
                      {selectedProviderConfig?.configType === 'simple' ? (
                        <Input
                          type="password"
                          placeholder="API Key"
                          value={newByokConfig}
                          onChange={(e) => setNewByokConfig(e.target.value)}
                        />
                      ) : (
                        <div className="space-y-2">
                          <Textarea
                            placeholder={getConfigPlaceholder(selectedProviderConfig?.configType)}
                            value={newByokConfig}
                            onChange={(e) => setNewByokConfig(e.target.value)}
                            rows={6}
                            className="font-mono text-xs"
                          />
                          <p className="text-xs text-muted-foreground">
                            {getConfigHelp(selectedProviderConfig?.configType)}
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={addByokKey}
                        disabled={!newByokConfig}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Key
                      </Button>
                    </>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  <a
                    href="https://openrouter.ai/docs/guides/overview/auth/byok"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    Learn more about BYOK <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Provider Ordering Section */}
      <Collapsible open={isProviderOrderOpen} onOpenChange={setIsProviderOrderOpen} className="mt-4">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  <CardTitle className="text-sm">Provider Ordering</CardTitle>
                </div>
                {isProviderOrderOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
              <CardDescription className="text-xs">
                Control the order in which providers are tried for each request
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="provider-ordering-enabled" className="text-sm">
                    Enable Provider Ordering
                  </Label>
                  <Switch
                    id="provider-ordering-enabled"
                    checked={openRouterSettings.providerOrdering?.enabled || false}
                    onCheckedChange={(checked) => 
                      updateOpenRouterSettings({
                        providerOrdering: {
                          ...openRouterSettings.providerOrdering,
                          enabled: checked,
                          allowFallbacks: openRouterSettings.providerOrdering?.allowFallbacks ?? true,
                          order: openRouterSettings.providerOrdering?.order || [],
                        },
                      })
                    }
                  />
                </div>

                {openRouterSettings.providerOrdering?.enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="allow-fallbacks" className="text-sm">
                          Allow Fallbacks
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          If disabled, only your BYOK keys will be used
                        </p>
                      </div>
                      <Switch
                        id="allow-fallbacks"
                        checked={openRouterSettings.providerOrdering?.allowFallbacks ?? true}
                        onCheckedChange={(checked) =>
                          updateOpenRouterSettings({
                            providerOrdering: {
                              ...openRouterSettings.providerOrdering!,
                              allowFallbacks: checked,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Provider Order</Label>
                      <Textarea
                        placeholder="e.g., Amazon Bedrock, Google Vertex AI, Anthropic"
                        value={openRouterSettings.providerOrdering?.order?.join(', ') || ''}
                        onChange={(e) => {
                          const order = e.target.value
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean);
                          updateOpenRouterSettings({
                            providerOrdering: {
                              ...openRouterSettings.providerOrdering!,
                              order,
                            },
                          });
                        }}
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        Comma-separated list of provider names in order of preference
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Site Attribution */}
      <Card className="mt-4">
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <CardTitle className="text-sm">App Attribution</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Optional headers for leaderboard ranking and attribution
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <Label htmlFor="site-url" className="text-xs">Site URL</Label>
              <Input
                id="site-url"
                placeholder="https://your-app.com"
                value={openRouterSettings.siteUrl || ''}
                onChange={(e) => updateOpenRouterSettings({ siteUrl: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="site-name" className="text-xs">Site Name</Label>
              <Input
                id="site-name"
                placeholder="Your App Name"
                value={openRouterSettings.siteName || ''}
                onChange={(e) => updateOpenRouterSettings({ siteName: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getConfigPlaceholder(configType?: string): string {
  switch (configType) {
    case 'azure':
      return `{
  "model_slug": "openai/gpt-4o",
  "endpoint_url": "https://your-resource.openai.azure.com/...",
  "api_key": "your-azure-api-key",
  "model_id": "gpt-4o"
}`;
    case 'bedrock':
      return `Option 1 (API Key): your-bedrock-api-key

Option 2 (Credentials):
{
  "accessKeyId": "your-access-key-id",
  "secretAccessKey": "your-secret-access-key",
  "region": "us-east-1"
}`;
    case 'vertex':
      return `{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----...",
  "client_email": "...",
  "region": "global"
}`;
    default:
      return '';
  }
}

function getConfigHelp(configType?: string): string {
  switch (configType) {
    case 'azure':
      return 'Enter Azure AI Services configuration as JSON. Multiple deployments supported.';
    case 'bedrock':
      return 'Enter Bedrock API key or AWS credentials JSON.';
    case 'vertex':
      return 'Enter Google Cloud service account key JSON.';
    default:
      return '';
  }
}
