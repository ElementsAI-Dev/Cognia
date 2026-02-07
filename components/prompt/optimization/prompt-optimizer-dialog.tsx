'use client';

/**
 * PromptOptimizerDialog - Dialog for optimizing prompts with AI
 * Supports two modes:
 *   - Local AI: Uses configured provider (OpenAI, etc.) directly
 *   - MCP (ace-tool): Uses the ace-tool MCP server's enhance_prompt tool
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader } from '@/components/ai-elements/loader';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useSettingsStore, useSessionStore } from '@/stores';
import { useMcpStore } from '@/stores/mcp/mcp-store';
import { ProviderIcon } from '@/components/providers/ai/provider-icon';
import { optimizePrompt } from '@/lib/ai/prompts/prompt-optimizer';
import {
  optimizePromptViaMcp,
  findAceToolServer,
  isAceToolReady,
  loadMcpPrivacyConsent,
  saveMcpPrivacyConsent,
  buildConversationHistory,
  saveToOptimizationHistory,
  loadOptimizationHistory,
  clearOptimizationHistory,
  getPromptStats,
  loadOptimizationModePreference,
  saveOptimizationModePreference,
} from '@/lib/ai/prompts/mcp-prompt-optimizer';
import { messageRepository } from '@/lib/db';
import { McpPrivacyDialog } from './mcp-privacy-dialog';
import type {
  PromptOptimizationStyle,
  PromptOptimizationMode,
  OptimizedPrompt,
  McpOptimizedPrompt,
} from '@/types/content/prompt';
import { PROVIDERS } from '@/types/provider';
import {
  Sparkles,
  Wand2,
  FileText,
  Lightbulb,
  Briefcase,
  GraduationCap,
  Code,
  Settings2,
  Check,
  Copy,
  ArrowRight,
  RefreshCw,
  Cpu,
  Globe,
  CircleDot,
  AlertTriangle,
  History,
  Trash2,
  Columns2,
  Zap,
  BarChart3,
  Pencil,
  Timer,
  ListOrdered,
  Table2,
} from 'lucide-react';

interface PromptOptimizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt: string;
  onApply: (optimizedPrompt: string) => void;
}

const STYLE_OPTIONS: {
  value: PromptOptimizationStyle;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'concise',
    labelKey: 'concise',
    descriptionKey: 'conciseDesc',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    value: 'detailed',
    labelKey: 'detailed',
    descriptionKey: 'detailedDesc',
    icon: <Lightbulb className="h-4 w-4" />,
  },
  {
    value: 'creative',
    labelKey: 'creative',
    descriptionKey: 'creativeDesc',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    value: 'professional',
    labelKey: 'professional',
    descriptionKey: 'professionalDesc',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    value: 'academic',
    labelKey: 'academic',
    descriptionKey: 'academicDesc',
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    value: 'technical',
    labelKey: 'technical',
    descriptionKey: 'technicalDesc',
    icon: <Code className="h-4 w-4" />,
  },
  {
    value: 'step-by-step',
    labelKey: 'stepByStep',
    descriptionKey: 'stepByStepDesc',
    icon: <ListOrdered className="h-4 w-4" />,
  },
  {
    value: 'structured',
    labelKey: 'structured',
    descriptionKey: 'structuredDesc',
    icon: <Table2 className="h-4 w-4" />,
  },
  {
    value: 'custom',
    labelKey: 'custom',
    descriptionKey: 'customDesc',
    icon: <Settings2 className="h-4 w-4" />,
  },
];

/** Unified result type for both local and MCP optimization */
type UnifiedOptimizedResult = (OptimizedPrompt | McpOptimizedPrompt) & {
  optimized: string;
  improvements: string[];
};

export function PromptOptimizerDialog({
  open,
  onOpenChange,
  initialPrompt,
  onApply,
}: PromptOptimizerDialogProps) {
  const t = useTranslations('promptOptimizer');
  const tCommon = useTranslations('common');
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);
  const session = getActiveSession();

  // MCP store
  const mcpServers = useMcpStore((state) => state.servers);
  const mcpCallTool = useMcpStore((state) => state.callTool);
  const mcpConnectServer = useMcpStore((state) => state.connectServer);

  // Local AI state
  const [style, setStyle] = useState<PromptOptimizationStyle>('detailed');
  const [customPrompt, setCustomPrompt] = useState('');
  const [preserveIntent, setPreserveIntent] = useState(true);
  const [enhanceClarity, setEnhanceClarity] = useState(true);
  const [addContext, setAddContext] = useState(false);
  const [useSessionModel, setUseSessionModel] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>(session?.provider || 'openai');
  const [selectedModel, setSelectedModel] = useState<string>(session?.model || 'gpt-4o-mini');

  // Shared state
  const [mode, setMode] = useState<PromptOptimizationMode>(loadOptimizationModePreference);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<UnifiedOptimizedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Privacy dialog state
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [pendingMcpSwitch, setPendingMcpSwitch] = useState(false);

  // Enhanced features state
  const [showComparison, setShowComparison] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(loadOptimizationHistory);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResult, setEditedResult] = useState('');
  const [optimizeDuration, setOptimizeDuration] = useState<number | null>(null);
  const optimizeStartRef = useRef<number>(0);

  // Check ace-tool server status
  const aceServer = useMemo(() => findAceToolServer(mcpServers), [mcpServers]);
  const aceToolReady = useMemo(() => aceServer ? isAceToolReady(aceServer) : false, [aceServer]);

  // Prompt statistics
  const originalStats = useMemo(() => getPromptStats(initialPrompt), [initialPrompt]);
  const optimizedStats = useMemo(
    () => (result ? getPromptStats(result.optimized) : null),
    [result]
  );

  // Reset result when mode changes
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [mode]);

  // Refresh history when dialog opens
  useEffect(() => {
    if (open) {
      setHistory(loadOptimizationHistory());
    }
  }, [open]);

  // Persist mode preference when it changes
  useEffect(() => {
    saveOptimizationModePreference(mode);
  }, [mode]);

  // Get available providers
  const availableProviders = Object.entries(providerSettings)
    .filter(([, settings]) => settings.enabled && settings.apiKey)
    .map(([id]) => id);

  // Get models for selected provider
  const getModelsForProvider = (providerId: string) => {
    const provider = PROVIDERS[providerId];
    return provider?.models || [];
  };

  // Handle mode switch with privacy check
  const handleModeSwitch = useCallback((newMode: PromptOptimizationMode) => {
    if (newMode === 'mcp') {
      const consent = loadMcpPrivacyConsent();
      if (consent.accepted && consent.dontAskAgain) {
        setMode('mcp');
      } else {
        setPendingMcpSwitch(true);
        setShowPrivacyDialog(true);
      }
    } else {
      setMode('local');
    }
  }, []);

  // Handle privacy consent
  const handlePrivacyAccept = useCallback((dontAskAgain: boolean) => {
    saveMcpPrivacyConsent({
      accepted: true,
      acceptedAt: Date.now(),
      dontAskAgain,
    });
    setShowPrivacyDialog(false);
    if (pendingMcpSwitch) {
      setMode('mcp');
      setPendingMcpSwitch(false);
    }
  }, [pendingMcpSwitch]);

  const handlePrivacyDecline = useCallback(() => {
    setShowPrivacyDialog(false);
    setPendingMcpSwitch(false);
  }, []);

  // Local AI optimization
  const handleLocalOptimize = useCallback(async () => {
    const provider = useSessionModel ? (session?.provider || 'openai') : selectedProvider;
    const model = useSessionModel ? (session?.model || 'gpt-4o-mini') : selectedModel;
    const settings = providerSettings[provider];

    if (!settings?.apiKey) {
      setError(`No API key configured for ${provider}`);
      return;
    }

    const optimizeResult = await optimizePrompt({
      prompt: initialPrompt,
      config: {
        style,
        targetProvider: provider,
        targetModel: model,
        customPrompt: style === 'custom' ? customPrompt : undefined,
        preserveIntent,
        enhanceClarity,
        addContext,
      },
      apiKey: settings.apiKey,
      baseURL: settings.baseURL,
    });

    if (optimizeResult.success && optimizeResult.optimizedPrompt) {
      setResult(optimizeResult.optimizedPrompt);
    } else {
      setError(optimizeResult.error || 'Failed to optimize prompt');
    }
  }, [
    initialPrompt,
    style,
    customPrompt,
    preserveIntent,
    enhanceClarity,
    addContext,
    useSessionModel,
    selectedProvider,
    selectedModel,
    session,
    providerSettings,
  ]);

  // MCP optimization with conversation history
  const handleMcpOptimize = useCallback(async () => {
    // Build conversation history from current session
    let conversationHistory = '';
    if (session?.id) {
      try {
        const messages = await messageRepository.getBySessionId(session.id);
        conversationHistory = buildConversationHistory(
          messages.map((m) => ({ role: m.role, content: m.content })),
          10
        );
      } catch {
        // Silently ignore - conversation history is optional
      }
    }

    const mcpResult = await optimizePromptViaMcp(
      {
        prompt: initialPrompt,
        conversationHistory,
      },
      mcpCallTool,
      mcpServers
    );

    if (mcpResult.success && mcpResult.optimizedPrompt) {
      setResult(mcpResult.optimizedPrompt);
    } else {
      setError(mcpResult.error || 'MCP optimization failed');
    }
  }, [initialPrompt, mcpCallTool, mcpServers, session?.id]);

  // Auto-connect ace-tool server
  const handleAutoConnect = useCallback(async () => {
    if (!aceServer || aceToolReady || isConnecting) return;
    setIsConnecting(true);
    setError(null);
    try {
      await mcpConnectServer(aceServer.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to ace-tool server');
    } finally {
      setIsConnecting(false);
    }
  }, [aceServer, aceToolReady, isConnecting, mcpConnectServer]);

  // Unified optimize handler with timing
  const handleOptimize = useCallback(async () => {
    setIsOptimizing(true);
    setError(null);
    setResult(null);
    setOptimizeDuration(null);
    setIsEditing(false);
    optimizeStartRef.current = Date.now();

    try {
      if (mode === 'mcp') {
        await handleMcpOptimize();
      } else {
        await handleLocalOptimize();
      }
      const duration = Date.now() - optimizeStartRef.current;
      setOptimizeDuration(duration);
      toast.success(t('toastOptimizeSuccess'), {
        description: `${(duration / 1000).toFixed(1)}s`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error(t('toastOptimizeFailed'));
    } finally {
      setIsOptimizing(false);
    }
  }, [mode, handleLocalOptimize, handleMcpOptimize, t]);

  // Save result to history when optimization succeeds
  useEffect(() => {
    if (result) {
      const entry = saveToOptimizationHistory({
        original: initialPrompt,
        optimized: result.optimized,
        mode,
        style: mode === 'local' && 'style' in result ? result.style : undefined,
        serverName: mode === 'mcp' && 'serverName' in result ? result.serverName : undefined,
        improvements: result.improvements,
      });
      setHistory((prev) => [entry, ...prev].slice(0, 20));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const handleApply = useCallback(() => {
    if (result) {
      const textToApply = isEditing ? editedResult : result.optimized;
      onApply(textToApply);
      onOpenChange(false);
      toast.success(t('toastApplySuccess'));
    }
  }, [result, isEditing, editedResult, onApply, onOpenChange, t]);

  const handleCopy = useCallback(async () => {
    if (result) {
      const textToCopy = isEditing ? editedResult : result.optimized;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success(t('toastCopySuccess'));
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result, isEditing, editedResult, t]);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
    setShowComparison(false);
    setIsEditing(false);
    setEditedResult('');
    setOptimizeDuration(null);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearOptimizationHistory();
    setHistory([]);
  }, []);

  const handleApplyFromHistory = useCallback((optimized: string) => {
    onApply(optimized);
    onOpenChange(false);
  }, [onApply, onOpenChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              {t('title')}
            </DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          {/* Mode Selector + History Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border p-2">
              <button
                onClick={() => handleModeSwitch('local')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
                  mode === 'local'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Cpu className="h-4 w-4" />
                {t('modeLocal')}
              </button>
              <button
                onClick={() => handleModeSwitch('mcp')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
                  mode === 'mcp'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Globe className="h-4 w-4" />
                {t('modeMcp')}
                {aceServer && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CircleDot
                        className={cn(
                          'h-3 w-3',
                          aceToolReady ? 'text-green-500' : 'text-amber-500'
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {aceToolReady ? t('mcpReady') : t('mcpNotReady')}
                    </TooltipContent>
                  </Tooltip>
                )}
              </button>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showHistory ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setShowHistory(!showHistory)}
                  className="shrink-0"
                >
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('historyTitle')}</TooltipContent>
            </Tooltip>
          </div>

          {/* Prompt Stats Bar */}
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
            <span>{t('statsChars')}: {originalStats.charCount}</span>
            <span>{t('statsWords')}: {originalStats.wordCount}</span>
            <span>{t('statsLines')}: {originalStats.lineCount}</span>
            {optimizedStats && (
              <>
                <span className="text-muted-foreground/50">→</span>
                <span className="text-primary">{t('statsChars')}: {optimizedStats.charCount}</span>
                <span className="text-primary">{t('statsWords')}: {optimizedStats.wordCount}</span>
                {optimizedStats.charCount !== originalStats.charCount && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {optimizedStats.charCount > originalStats.charCount ? '+' : ''}
                    {Math.round(((optimizedStats.charCount - originalStats.charCount) / Math.max(originalStats.charCount, 1)) * 100)}%
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* History Panel */}
          {showHistory && (
            <div className="space-y-2 rounded-lg border p-3 max-h-[200px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t('historyTitle')}</Label>
                {history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearHistory}
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t('historyClear')}
                  </Button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">{t('historyEmpty')}</p>
              ) : (
                <div className="space-y-1.5">
                  {history.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-card p-2 text-xs hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {entry.mode === 'mcp' ? 'MCP' : entry.style || 'local'}
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="truncate text-foreground">{entry.optimized.slice(0, 80)}...</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 shrink-0"
                        onClick={() => handleApplyFromHistory(entry.optimized)}
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MCP Mode Content */}
          {mode === 'mcp' ? (
            <div className="space-y-4">
              {/* Original Prompt */}
              <div className="space-y-2">
                <Label>{t('originalPrompt')}</Label>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm max-h-[120px] overflow-y-auto">
                  {initialPrompt || <span className="text-muted-foreground italic">{t('noPrompt')}</span>}
                </div>
              </div>

              {/* MCP Server Status */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('mcpServerStatus')}</Label>
                  <div className="flex items-center gap-2">
                    {aceServer && !aceToolReady && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={handleAutoConnect}
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <Loader size={12} />
                        ) : (
                          <Zap className="h-3 w-3 mr-1" />
                        )}
                        {t('mcpAutoConnect')}
                      </Button>
                    )}
                    {aceServer ? (
                      <Badge
                        variant={aceToolReady ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs',
                          aceToolReady && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        )}
                      >
                        {aceToolReady ? t('mcpConnected') : t('mcpDisconnected')}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        {t('mcpNotConfigured')}
                      </Badge>
                    )}
                  </div>
                </div>
                {aceServer && (
                  <p className="text-xs text-muted-foreground">
                    {t('mcpServerName')}: {aceServer.name || aceServer.id}
                  </p>
                )}
                {!aceServer && (
                  <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{t('mcpConfigHint')}</span>
                  </div>
                )}
              </div>

              {/* MCP Info */}
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('mcpDescription')}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            /* Local AI Mode Content */
            <Tabs defaultValue="style" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="style">{t('style')}</TabsTrigger>
                <TabsTrigger value="settings">{tCommon('settings')}</TabsTrigger>
              </TabsList>

              <TabsContent value="style" className="space-y-4 mt-4">
                {/* Original Prompt */}
                <div className="space-y-2">
                  <Label>{t('originalPrompt')}</Label>
                  <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                    {initialPrompt || <span className="text-muted-foreground italic">{t('noPrompt')}</span>}
                  </div>
                </div>

                {/* Style Selection */}
                <div className="space-y-2">
                  <Label>{t('optimizationStyle')}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STYLE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setStyle(option.value)}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all hover:bg-accent',
                          style === option.value && 'border-primary bg-primary/5'
                        )}
                      >
                        <div className={cn(
                          'text-muted-foreground',
                          style === option.value && 'text-primary'
                        )}>
                          {option.icon}
                        </div>
                        <span className="text-sm font-medium">{t(option.labelKey)}</span>
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {t(option.descriptionKey)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Prompt Input */}
                {style === 'custom' && (
                  <div className="space-y-2">
                    <Label>{t('customInstructions')}</Label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder={t('customPlaceholder')}
                      className="min-h-[100px]"
                    />
                  </div>
                )}

                {/* Quick Options */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="preserve-intent"
                      checked={preserveIntent}
                      onCheckedChange={setPreserveIntent}
                    />
                    <Label htmlFor="preserve-intent" className="text-sm">
                      {t('preserveIntent')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="enhance-clarity"
                      checked={enhanceClarity}
                      onCheckedChange={setEnhanceClarity}
                    />
                    <Label htmlFor="enhance-clarity" className="text-sm">
                      {t('enhanceClarity')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="add-context"
                      checked={addContext}
                      onCheckedChange={setAddContext}
                    />
                    <Label htmlFor="add-context" className="text-sm">
                      {t('addContext')}
                    </Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                {/* Model Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="use-session-model"
                      checked={useSessionModel}
                      onCheckedChange={setUseSessionModel}
                    />
                    <Label htmlFor="use-session-model">
                      {t('useSessionModel')} ({session?.model || 'default'})
                    </Label>
                  </div>

                  {!useSessionModel && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('provider')}</Label>
                        <Select
                          value={selectedProvider}
                          onValueChange={(value) => {
                            setSelectedProvider(value);
                            const models = getModelsForProvider(value);
                            if (models.length > 0) {
                              setSelectedModel(models[0].id);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProviders.map((providerId) => (
                              <SelectItem key={providerId} value={providerId} showIconInTrigger>
                                <ProviderIcon icon={`/icons/providers/${providerId}.svg`} size={16} />
                                {PROVIDERS[providerId]?.name || providerId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('model')}</Label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getModelsForProvider(selectedProvider).map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-primary">{t('optimizedPrompt')}</Label>
                  {'mode' in result && result.mode === 'mcp' && (
                    <Badge variant="outline" className="text-xs">
                      MCP
                    </Badge>
                  )}
                  {optimizeDuration !== null && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      {(optimizeDuration / 1000).toFixed(1)}s
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isEditing ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          if (!isEditing) {
                            setEditedResult(result.optimized);
                            setIsEditing(true);
                          } else {
                            setIsEditing(false);
                          }
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editToggle')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={showComparison ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setShowComparison(!showComparison)}
                      >
                        <Columns2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('compareToggle')}</TooltipContent>
                  </Tooltip>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Editable / Comparison / Normal View */}
              {isEditing ? (
                <Textarea
                  value={editedResult}
                  onChange={(e) => setEditedResult(e.target.value)}
                  className="min-h-[120px] max-h-[300px] text-sm"
                />
              ) : showComparison ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('originalPrompt')}</Label>
                    <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {initialPrompt}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-primary">{t('optimizedPrompt')}</Label>
                    <div className="rounded-lg bg-primary/5 border-primary/20 border p-3 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {result.optimized}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {result.optimized}
                </div>
              )}

              {result.improvements.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.improvements.map((improvement, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {improvement}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            {result ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t('regenerate')}
                </Button>
                <Button onClick={handleApply} className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  {t('apply')}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleOptimize}
                disabled={isOptimizing || !initialPrompt.trim() || (mode === 'mcp' && !aceToolReady)}
                className="gap-2"
              >
                {isOptimizing ? (
                  <>
                    <Loader size={16} />
                    {t('optimizing')}
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    {mode === 'mcp' ? t('optimizeMcp') : t('optimize')}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MCP Privacy Dialog */}
      <McpPrivacyDialog
        open={showPrivacyDialog}
        onOpenChange={setShowPrivacyDialog}
        onAccept={handlePrivacyAccept}
        onDecline={handlePrivacyDecline}
        serverName={aceServer?.name}
      />
    </>
  );
}

export default PromptOptimizerDialog;
