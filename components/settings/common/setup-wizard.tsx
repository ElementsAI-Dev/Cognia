'use client';

/**
 * Setup Wizard - First-time configuration guide
 * 
 * Guides new users through essential setup:
 * 1. Welcome introduction
 * 2. Select default AI provider
 * 3. Configure API key
 * 4. Appearance preferences (optional)
 * 5. Completion
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Cpu,
  Palette,
  Rocket,
  Sun,
  Moon,
  Monitor,
  Globe,
  Zap,
  Bot,
  Search,
  Puzzle,
  SkipForward,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { Confetti } from '@/components/onboarding';
import { useMcpStore } from '@/stores/mcp';
import { PROVIDERS } from '@/types/provider';
import { testProviderConnection } from '@/lib/ai/infrastructure/api-test';
import { MCP_SERVER_TEMPLATES, createDefaultServerConfig } from '@/types/mcp';
import type { Theme, Language } from '@/stores/settings';

interface SetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type WizardStep = 'welcome' | 'provider' | 'apikey' | 'search' | 'mcp' | 'appearance' | 'complete';

const WIZARD_STEPS: WizardStep[] = ['welcome', 'provider', 'apikey', 'search', 'mcp', 'appearance', 'complete'];

// Popular MCP servers for quick setup
const QUICK_MCP_SERVERS = MCP_SERVER_TEMPLATES.slice(0, 4);

// Featured providers for quick selection
const FEATURED_PROVIDERS = ['openai', 'anthropic', 'google', 'deepseek', 'groq', 'ollama'];

// Provider dashboard URLs
const PROVIDER_DASHBOARD_URLS: Record<string, string> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  google: 'https://aistudio.google.com/app/apikey',
  deepseek: 'https://platform.deepseek.com/api_keys',
  groq: 'https://console.groq.com/keys',
  mistral: 'https://console.mistral.ai/api-keys/',
  xai: 'https://console.x.ai/team/api-keys',
};

// Provider descriptions
const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  openai: 'GPT-4o, o1, and more flagship models',
  anthropic: 'Claude 4 Sonnet, Claude 4 Opus',
  google: 'Gemini 2.0 Flash, Gemini 1.5 Pro',
  deepseek: 'DeepSeek Chat, powerful and affordable',
  groq: 'Ultra-fast inference with Llama 3.3',
  ollama: 'Run models locally on your machine',
};

function StepIndicator({ currentStep, steps }: { currentStep: WizardStep; steps: WizardStep[] }) {
  const currentIndex = steps.indexOf(currentStep);
  
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((step, index) => (
        <div
          key={step}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            index === currentIndex
              ? 'w-8 bg-primary'
              : index < currentIndex
              ? 'w-2 bg-primary/60'
              : 'w-2 bg-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

export function SetupWizard({ open, onOpenChange, onComplete }: SetupWizardProps) {
  const t = useTranslations('onboarding');
  const tc = useTranslations('common');

  // Settings store
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const updateProviderSettings = useSettingsStore((state) => state.updateProviderSettings);
  const setDefaultProvider = useSettingsStore((state) => state.setDefaultProvider);
  const setOnboardingCompleted = useSettingsStore((state) => state.setOnboardingCompleted);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const setSearchProviderApiKey = useSettingsStore((state) => state.setSearchProviderApiKey);
  const setSearchProviderEnabled = useSettingsStore((state) => state.setSearchProviderEnabled);
  const searchProviders = useSettingsStore((state) => state.searchProviders);

  // MCP store
  const { addServer, connectServer, isInitialized: mcpInitialized, initialize: initializeMcp } = useMcpStore();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('welcome');
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  
  // Search configuration state
  const [tavilyApiKey, setTavilyApiKey] = useState(searchProviders?.tavily?.apiKey || '');
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [enableSearch, setEnableSearch] = useState(true);
  
  // MCP configuration state
  const [selectedMcpServers, setSelectedMcpServers] = useState<Set<string>>(new Set());
  const [isInstallingMcp, setIsInstallingMcp] = useState(false);
  const [mcpInstallError, setMcpInstallError] = useState<string | null>(null);
  const [mcpInstallResults, setMcpInstallResults] = useState<Record<string, boolean>>({});

  const currentStepIndex = WIZARD_STEPS.indexOf(step);

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      setStep(WIZARD_STEPS[nextIndex]);
      setTestResult(null);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(WIZARD_STEPS[prevIndex]);
      setTestResult(null);
    }
  }, [currentStepIndex]);

  const handleSelectProvider = useCallback((providerId: string) => {
    setSelectedProvider(providerId);
    setApiKey('');
    setTestResult(null);
    // Pre-fill existing API key if available
    const existing = providerSettings[providerId]?.apiKey;
    if (existing) {
      setApiKey(existing);
    }
  }, [providerSettings]);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testProviderConnection(
        selectedProvider,
        selectedProvider === 'ollama' ? '' : apiKey,
        selectedProvider === 'ollama' ? ollamaUrl : undefined
      );
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      });
    } finally {
      setIsTesting(false);
    }
  }, [selectedProvider, apiKey, ollamaUrl]);

  const handleSaveAndContinue = useCallback(() => {
    // Save the provider settings
    if (selectedProvider === 'ollama') {
      updateProviderSettings(selectedProvider, {
        enabled: true,
        baseURL: ollamaUrl,
      });
    } else {
      updateProviderSettings(selectedProvider, {
        apiKey,
        enabled: true,
      });
    }
    setDefaultProvider(selectedProvider);
    handleNext();
  }, [selectedProvider, apiKey, ollamaUrl, updateProviderSettings, setDefaultProvider, handleNext]);

  const handleSaveSearch = useCallback(() => {
    // Save search settings if configured
    if (tavilyApiKey.trim()) {
      setSearchProviderApiKey('tavily', tavilyApiKey.trim());
      setSearchProviderEnabled('tavily', enableSearch);
    }
    handleNext();
  }, [tavilyApiKey, enableSearch, setSearchProviderApiKey, setSearchProviderEnabled, handleNext]);

  const handleInstallMcpServers = useCallback(async () => {
    if (selectedMcpServers.size === 0) {
      handleNext();
      return;
    }

    setIsInstallingMcp(true);
    setMcpInstallError(null);
    const results: Record<string, boolean> = {};

    try {
      // Initialize MCP if not already done
      if (!mcpInitialized) {
        await initializeMcp();
      }

      // Install each selected server
      for (const serverId of selectedMcpServers) {
        const template = MCP_SERVER_TEMPLATES.find((t) => t.id === serverId);
        if (!template) continue;

        try {
          // Build the config using existing logic from mcp-install-wizard
          const config = createDefaultServerConfig();
          config.name = template.name;
          config.command = template.command;
          config.args = [...template.args];

          // Add the server
          await addServer(template.id, config);

          // Try to connect (non-fatal if fails)
          try {
            await connectServer(template.id);
          } catch {
            console.warn(`Initial connection to ${template.name} failed, server added but not connected`);
          }

          results[serverId] = true;
        } catch (err) {
          console.error(`Failed to install ${template.name}:`, err);
          results[serverId] = false;
        }
      }

      setMcpInstallResults(results);
    } catch (err) {
      setMcpInstallError(String(err));
    } finally {
      setIsInstallingMcp(false);
      handleNext();
    }
  }, [selectedMcpServers, mcpInitialized, initializeMcp, addServer, connectServer, handleNext]);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  // Show celebration on complete step
  useEffect(() => {
    if (step === 'complete') {
      const timer = setTimeout(() => setShowCelebration(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowCelebration(false);
    }
  }, [step]);

  const handleComplete = useCallback(() => {
    setOnboardingCompleted(true);
    onComplete();
    onOpenChange(false);
  }, [setOnboardingCompleted, onComplete, onOpenChange]);

  const handleSkip = useCallback(() => {
    setOnboardingCompleted(true);
    onOpenChange(false);
  }, [setOnboardingCompleted, onOpenChange]);

  const canProceedFromApiKey = selectedProvider === 'ollama' 
    ? ollamaUrl.trim().length > 0
    : apiKey.trim().length >= 10;

  const provider = PROVIDERS[selectedProvider];

  // Animation variants for step transitions
  const stepVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Confetti celebration */}
      <Confetti isActive={showCelebration} particleCount={60} />
      
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Step Indicator */}
        <StepIndicator currentStep={step} steps={WIZARD_STEPS} />

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="px-6 pb-6"
            >
            {/* Step: Welcome */}
            {step === 'welcome' && (
              <div className="space-y-6 text-center py-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl">{t('welcome')}</DialogTitle>
                  <DialogDescription className="text-base">
                    {t('welcomeDescription')}
                  </DialogDescription>
                </DialogHeader>

                {/* Feature highlights */}
                <div className="grid gap-3 pt-4">
                  <div className="flex items-center gap-3 rounded-lg border p-3 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                      <Bot className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t('featureChat')}</p>
                      <p className="text-xs text-muted-foreground">{t('featureChatDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                      <Zap className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t('featureAgent')}</p>
                      <p className="text-xs text-muted-foreground">{t('featureAgentDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                      <Search className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t('featureResearch')}</p>
                      <p className="text-xs text-muted-foreground">{t('featureResearchDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Select Provider */}
            {step === 'provider' && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    {t('selectProvider')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('selectProviderDescription')}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2 pt-2">
                  {FEATURED_PROVIDERS.map((providerId) => {
                    const prov = PROVIDERS[providerId];
                    if (!prov) return null;
                    const isSelected = selectedProvider === providerId;
                    const isLocal = providerId === 'ollama';

                    return (
                      <Card
                        key={providerId}
                        className={cn(
                          'cursor-pointer transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-accent'
                        )}
                        onClick={() => handleSelectProvider(providerId)}
                      >
                        <CardHeader className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-lg',
                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                              )}>
                                <Globe className="h-5 w-5" />
                              </div>
                              <div>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  {prov.name}
                                  {isLocal && (
                                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted">
                                      {t('localProvider')}
                                    </span>
                                  )}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {PROVIDER_DESCRIPTIONS[providerId]}
                                </CardDescription>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step: Configure API Key */}
            {step === 'apikey' && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedProvider === 'ollama' ? (
                      <Globe className="h-5 w-5" />
                    ) : (
                      <Cpu className="h-5 w-5" />
                    )}
                    {t('configureApiKey', { provider: provider?.name })}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedProvider === 'ollama'
                      ? t('configureOllamaDescription')
                      : t('configureApiKeyDescription')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {selectedProvider === 'ollama' ? (
                    // Ollama URL configuration
                    <div className="space-y-2">
                      <Label htmlFor="ollama-url">{t('ollamaUrl')}</Label>
                      <Input
                        id="ollama-url"
                        placeholder="http://localhost:11434"
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('ollamaHint')}{' '}
                        <a
                          href="https://ollama.ai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          ollama.ai <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  ) : (
                    // API Key configuration
                    <div className="space-y-2">
                      <Label htmlFor="api-key">{t('apiKey')}</Label>
                      <div className="relative">
                        <Input
                          id="api-key"
                          type={showApiKey ? 'text' : 'password'}
                          placeholder={t('apiKeyPlaceholder')}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('getApiKeyFrom')}{' '}
                        <a
                          href={PROVIDER_DASHBOARD_URLS[selectedProvider] || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {provider?.name} Dashboard <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  )}

                  {/* Test Connection Button */}
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting || !canProceedFromApiKey}
                    className="w-full"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('testing')}
                      </>
                    ) : (
                      t('testConnection')
                    )}
                  </Button>

                  {/* Test Result */}
                  {testResult && (
                    <Alert variant={testResult.success ? 'default' : 'destructive'}>
                      {testResult.success ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>{testResult.message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}

            {/* Step: Search Configuration */}
            {step === 'search' && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    {t('searchConfig')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('searchConfigDescription')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {/* Enable Search Toggle */}
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">{t('enableWebSearch')}</Label>
                      <p className="text-xs text-muted-foreground">{t('enableWebSearchDesc')}</p>
                    </div>
                    <Switch
                      checked={enableSearch}
                      onCheckedChange={setEnableSearch}
                    />
                  </div>

                  {/* Tavily API Key */}
                  {enableSearch && (
                    <div className="space-y-2">
                      <Label htmlFor="tavily-key">{t('tavilyApiKey')}</Label>
                      <div className="relative">
                        <Input
                          id="tavily-key"
                          type={showTavilyKey ? 'text' : 'password'}
                          placeholder={t('tavilyApiKeyPlaceholder')}
                          value={tavilyApiKey}
                          onChange={(e) => setTavilyApiKey(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowTavilyKey(!showTavilyKey)}
                        >
                          {showTavilyKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('getTavilyKey')}{' '}
                        <a
                          href="https://tavily.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          tavily.com <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  )}

                  {/* Skip hint */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <SkipForward className="h-3 w-3" />
                    <span>{t('searchOptionalHint')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step: MCP Configuration */}
            {step === 'mcp' && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Puzzle className="h-5 w-5" />
                    {t('mcpConfig')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('mcpConfigDescription')}
                  </DialogDescription>
                </DialogHeader>

                {mcpInstallError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{mcpInstallError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3 pt-2">
                  {QUICK_MCP_SERVERS.map((server) => {
                    const isSelected = selectedMcpServers.has(server.id);
                    const installResult = mcpInstallResults[server.id];
                    return (
                      <Card
                        key={server.id}
                        className={cn(
                          'cursor-pointer transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-accent',
                          isInstallingMcp && 'pointer-events-none opacity-60'
                        )}
                        onClick={() => {
                          if (isInstallingMcp) return;
                          const newSet = new Set(selectedMcpServers);
                          if (isSelected) {
                            newSet.delete(server.id);
                          } else {
                            newSet.add(server.id);
                          }
                          setSelectedMcpServers(newSet);
                        }}
                      >
                        <CardHeader className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-sm">{server.name}</CardTitle>
                              <CardDescription className="text-xs">
                                {server.description}
                              </CardDescription>
                            </div>
                            {installResult === true && (
                              <Check className="h-5 w-5 text-green-500" />
                            )}
                            {installResult === false && (
                              <AlertCircle className="h-5 w-5 text-destructive" />
                            )}
                            {installResult === undefined && isSelected && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}

                  {/* Skip hint */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                    <SkipForward className="h-3 w-3" />
                    <span>{t('mcpOptionalHint')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Appearance */}
            {step === 'appearance' && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    {t('appearance')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('appearanceDescription')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {/* Theme Selection */}
                  <div className="space-y-2">
                    <Label>{t('themeLabel')}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'light' as Theme, icon: Sun, label: t('themeLight') },
                        { value: 'dark' as Theme, icon: Moon, label: t('themeDark') },
                        { value: 'system' as Theme, icon: Monitor, label: t('themeSystem') },
                      ].map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          onClick={() => setTheme(value)}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                            theme === value
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'hover:bg-accent'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div className="space-y-2">
                    <Label>{t('languageLabel')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'en' as Language, label: 'English', flag: '🇺🇸' },
                        { value: 'zh-CN' as Language, label: '简体中文', flag: '🇨🇳' },
                      ].map(({ value, label, flag }) => (
                        <button
                          key={value}
                          onClick={() => setLanguage(value)}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border p-3 transition-all',
                            language === value
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'hover:bg-accent'
                          )}
                        >
                          <span className="text-xl">{flag}</span>
                          <span className="text-sm font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Complete */}
            {step === 'complete' && (
              <div className="space-y-6 text-center py-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                  <Rocket className="h-10 w-10 text-green-500" />
                </div>
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl">{t('complete')}</DialogTitle>
                  <DialogDescription className="text-base">
                    {t('completeDescription')}
                  </DialogDescription>
                </DialogHeader>

                {/* Configuration Summary */}
                <div className="rounded-lg border bg-muted/30 p-4 text-left space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('summaryProvider')}</span>
                    <span className="font-medium">{provider?.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('summarySearch')}</span>
                    <span className="font-medium">
                      {tavilyApiKey.trim() ? t('summaryConfigured') : t('summarySkipped')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('summaryMcp')}</span>
                    <span className="font-medium">
                      {selectedMcpServers.size > 0 
                        ? t('summaryMcpCount', { count: String(selectedMcpServers.size) })
                        : t('summarySkipped')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('summaryTheme')}</span>
                    <span className="font-medium capitalize">{theme}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('summaryLanguage')}</span>
                    <span className="font-medium">{language === 'zh-CN' ? '简体中文' : 'English'}</span>
                  </div>
                </div>
              </div>
            )}
            </motion.div>
          </AnimatePresence>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t px-6 py-4 bg-muted/30">
          <div>
            {step === 'welcome' && (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                {t('skip')}
              </Button>
            )}
            {step !== 'welcome' && step !== 'complete' && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {tc('back')}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step === 'welcome' && (
              <Button onClick={handleNext}>
                {t('getStarted')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {step === 'provider' && (
              <Button onClick={handleNext}>
                {t('next')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {step === 'apikey' && (
              <Button
                onClick={handleSaveAndContinue}
                disabled={!canProceedFromApiKey}
              >
                {t('saveAndContinue')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {step === 'search' && (
              <Button onClick={handleSaveSearch}>
                {tavilyApiKey.trim() ? t('saveAndContinue') : t('skipStep')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {step === 'mcp' && (
              <Button onClick={handleInstallMcpServers} disabled={isInstallingMcp}>
                {isInstallingMcp ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    {t('installing')}
                  </>
                ) : (
                  <>
                    {selectedMcpServers.size > 0 ? t('installAndContinue') : t('skipStep')}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
            {step === 'appearance' && (
              <Button onClick={handleNext}>
                {t('next')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {step === 'complete' && (
              <Button onClick={handleComplete}>
                {t('finish')}
                <Rocket className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SetupWizard;
