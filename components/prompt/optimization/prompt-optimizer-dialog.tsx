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
import { Badge } from '@/components/ui/badge';
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
import { OptimizationResult, OptimizationHistory, McpModeContent, LocalModeContent } from './sections';
import type {
  PromptOptimizationStyle,
  PromptOptimizationMode,
  OptimizedPrompt,
  McpOptimizedPrompt,
} from '@/types/content/prompt';
import {
  Wand2,
  ArrowRight,
  RefreshCw,
  Cpu,
  Globe,
  CircleDot,
  History,
  BarChart3,
} from 'lucide-react';

interface PromptOptimizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt: string;
  onApply: (optimizedPrompt: string) => void;
}

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
            <OptimizationHistory
              history={history}
              onClearHistory={handleClearHistory}
              onApplyFromHistory={handleApplyFromHistory}
            />
          )}

          {/* MCP / Local AI Mode Content */}
          {mode === 'mcp' ? (
            <McpModeContent
              initialPrompt={initialPrompt}
              aceServer={aceServer ? { id: aceServer.id, name: aceServer.name } : null}
              aceToolReady={aceToolReady}
              isConnecting={isConnecting}
              onAutoConnect={handleAutoConnect}
            />
          ) : (
            <LocalModeContent
              initialPrompt={initialPrompt}
              style={style}
              customPrompt={customPrompt}
              preserveIntent={preserveIntent}
              enhanceClarity={enhanceClarity}
              addContext={addContext}
              useSessionModel={useSessionModel}
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              sessionModel={session?.model}
              availableProviders={availableProviders}
              onStyleChange={setStyle}
              onCustomPromptChange={setCustomPrompt}
              onPreserveIntentChange={setPreserveIntent}
              onEnhanceClarityChange={setEnhanceClarity}
              onAddContextChange={setAddContext}
              onUseSessionModelChange={setUseSessionModel}
              onProviderChange={setSelectedProvider}
              onModelChange={setSelectedModel}
            />
          )}

          {/* Result Display */}
          {result && (
            <OptimizationResult
              result={result}
              initialPrompt={initialPrompt}
              optimizeDuration={optimizeDuration}
              isEditing={isEditing}
              editedResult={editedResult}
              showComparison={showComparison}
              copied={copied}
              onEditToggle={() => {
                if (!isEditing) {
                  setEditedResult(result.optimized);
                  setIsEditing(true);
                } else {
                  setIsEditing(false);
                }
              }}
              onEditedResultChange={setEditedResult}
              onComparisonToggle={() => setShowComparison(!showComparison)}
              onCopy={handleCopy}
              onReset={handleReset}
            />
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
