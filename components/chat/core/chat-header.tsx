'use client';

/**
 * ChatHeader - displays session info and model selector
 * Uses shadcn/ui SidebarTrigger for sidebar control
 * Includes preset selector for quick configuration changes
 */

import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  Sparkles,
  Search as SearchIcon,
  Bot,
  Download,
  Image as ImageIcon,
  Wand2,
  Copy,
  CopyCheck,
  Trash2,
  PanelRight,
  MoreHorizontal,
  Pin,
  PinOff,
  GraduationCap,
  ExternalLink,
  FileText,
  Film,
  List,
  GitBranch,
  Target,
  Scale,
} from 'lucide-react';
import { ConversationSearch, SessionStats } from '../utils';
import { useMessages } from '@/hooks';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BatchCopyDialog,
  ExportDialog,
  ChatSummaryDialog,
  ModeSwitchConfirmDialog,
} from '../dialogs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
// TooltipProvider is at app level in providers.tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  useSessionStore,
  usePresetStore,
  useArtifactStore,
  useChatStore,
  useProjectStore,
} from '@/stores';
import { MODE_CONFIGS } from '@/stores/chat';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { BeautifulExportDialog } from '@/components/export';
import {
  OpenIn,
  OpenInTrigger,
  OpenInContent,
  OpenInLabel,
  OpenInSeparator,
  OpenInChatGPT,
  OpenInClaude,
  OpenInScira,
  OpenInv0,
  OpenInCursor,
} from '@/components/ai-elements/open-in-chat';
import { BranchSelector, SessionEnvSelector, ProjectSelector } from '../selectors';
import { PresetSelector, CreatePresetDialog, PresetsManager } from '@/components/presets';
import { ActiveSkillsIndicator } from '@/components/skills';
import { BackgroundAgentIndicator, AgentModeSelector, ExternalAgentSelector } from '@/components/agent';
import type { AgentModeConfig } from '@/types/agent/agent-mode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ChatMode, Preset, ChatViewMode, CreateGoalInput } from '@/types';
import { ChatGoalDialog } from '../goal';
import { useSummary } from '@/hooks/chat';
import { useSettingsStore } from '@/stores';
import { SimplifiedModeQuickToggle } from '../ui/simplified-mode-toggle';

interface ChatHeaderProps {
  sessionId?: string;
  viewMode?: ChatViewMode;
  onViewModeChange?: (mode: ChatViewMode) => void;
}

const modeIcons: Record<ChatMode, React.ReactNode> = {
  chat: <Sparkles className="h-4 w-4" />,
  agent: <Bot className="h-4 w-4" />,
  research: <SearchIcon className="h-4 w-4" />,
  learning: <GraduationCap className="h-4 w-4" />,
};

const modeColors: Record<ChatMode, string> = {
  chat: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  agent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  research: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  learning: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
};

export function ChatHeader({ sessionId, viewMode = 'list', onViewModeChange }: ChatHeaderProps) {
  const t = useTranslations('chatHeader');
  const tFlow = useTranslations('flowChat');
  const [createPresetOpen, setCreatePresetOpen] = useState(false);
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [batchCopyOpen, setBatchCopyOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [modeSwitchDialogOpen, setModeSwitchDialogOpen] = useState(false);
  const [pendingTargetMode, setPendingTargetMode] = useState<ChatMode | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  // Artifact panel state
  const openPanel = useArtifactStore((state) => state.openPanel);
  const panelOpen = useArtifactStore((state) => state.panelOpen);
  const closePanel = useArtifactStore((state) => state.closePanel);

  // Chat messages
  const chatMessages = useChatStore((state) => state.messages);
  const clearMessages = useChatStore((state) => state.clearMessages);

  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const session = sessionId
    ? sessions.find((s) => s.id === sessionId)
    : sessions.find((s) => s.id === activeSessionId);
  const updateSession = useSessionStore((state) => state.updateSession);
  const createSession = useSessionStore((state) => state.createSession);
  const setGoal = useSessionStore((state) => state.setGoal);
  const updateGoal = useSessionStore((state) => state.updateGoal);
  const selectPreset = usePresetStore((state) => state.selectPreset);

  // Project context - ProjectSelector component handles the display now
  const _getProject = useProjectStore((state) => state.getProject);

  // Get messages for search
  const { messages } = useMessages({ sessionId: session?.id || null });

  const currentMode = session?.mode || 'chat';
  const [modeTransitioning, setModeTransitioning] = useState(false);

  // Agent sub-mode (for agent mode only)
  const agentModeId = session?.agentModeId || 'general';

  // Get mode config from SessionStore
  const switchMode = useSessionStore((state) => state.switchMode);
  const switchModeWithNewSession = useSessionStore((state) => state.switchModeWithNewSession);
  const getModeConfig = useSessionStore((state) => state.getModeConfig);
  const getRecentModes = useSessionStore((state) => state.getRecentModes);

  // Settings for AI summary
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const openaiSettings = providerSettings?.openai;
  
  // Simplified mode settings
  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const isSimplifiedMode = simplifiedModeSettings.enabled;
  const simplifiedPreset = simplifiedModeSettings.preset;
  const isFocusedOrZen = isSimplifiedMode && (simplifiedPreset === 'focused' || simplifiedPreset === 'zen');
  const { generateChatSummary } = useSummary({
    useAI: !!openaiSettings?.apiKey,
    aiConfig: openaiSettings?.apiKey
      ? {
          provider: 'openai',
          model: openaiSettings.defaultModel || 'gpt-4o-mini',
          apiKey: openaiSettings.apiKey,
        }
      : undefined,
  });

  // Get current mode configuration
  const _currentModeConfig = useMemo(
    () => getModeConfig(currentMode),
    [getModeConfig, currentMode]
  );
  const recentModes = useMemo(() => getRecentModes(3), [getRecentModes]);

  const handleModeChange = useCallback(
    (mode: ChatMode) => {
      if (mode === currentMode) return;
      
      if (session) {
        // Check if there are messages - if so, show confirmation dialog
        if (messages.length > 0) {
          setPendingTargetMode(mode);
          setModeSwitchDialogOpen(true);
        } else {
          // No messages, just switch mode directly
          setModeTransitioning(true);
          switchMode(session.id, mode);
          updateSession(session.id, { mode });
          setTimeout(() => setModeTransitioning(false), 300);
        }
      } else {
        // No session exists, create a new one with the selected mode
        setModeTransitioning(true);
        createSession({ mode });
        setTimeout(() => setModeTransitioning(false), 300);
      }
    },
    [session, currentMode, messages.length, switchMode, updateSession, createSession]
  );

  // Handle mode switch confirmation
  const handleModeSwitchConfirm = useCallback(
    (options: { carryContext: boolean; summary?: string }) => {
      if (!session || !pendingTargetMode) return;

      setModeTransitioning(true);

      // Create new session with the target mode
      switchModeWithNewSession(session.id, pendingTargetMode, {
        carryContext: options.carryContext,
        summary: options.summary,
      });

      // Reset state
      setPendingTargetMode(null);
      setModeSwitchDialogOpen(false);
      setTimeout(() => setModeTransitioning(false), 300);
    },
    [session, pendingTargetMode, switchModeWithNewSession]
  );

  // Handle mode switch cancel
  const handleModeSwitchCancel = useCallback(() => {
    setPendingTargetMode(null);
    setModeSwitchDialogOpen(false);
  }, []);

  // Generate summary for mode switch
  const handleGenerateSummaryForModeSwitch = useCallback(async (): Promise<string | null> => {
    if (messages.length === 0) return null;
    try {
      const result = await generateChatSummary(messages, { format: 'brief' }, session?.title);
      return result.summary;
    } catch (error) {
      console.error('Failed to generate summary:', error);
      return null;
    }
  }, [session, messages, generateChatSummary]);

  // Handle agent sub-mode change (within agent mode)
  // Supports both built-in and custom modes with full configuration
  const handleAgentModeChange = (agentMode: AgentModeConfig) => {
    if (session) {
      // Build update object with mode-specific settings
      const sessionUpdate: Parameters<typeof updateSession>[1] = {
        agentModeId: agentMode.id,
        systemPrompt: agentMode.systemPrompt,
      };

      // Apply custom mode settings if available
      if ('modelOverride' in agentMode && agentMode.modelOverride) {
        sessionUpdate.model = agentMode.modelOverride as string;
      }
      if ('temperatureOverride' in agentMode && agentMode.temperatureOverride !== undefined) {
        sessionUpdate.temperature = agentMode.temperatureOverride as number;
      }
      if ('maxTokensOverride' in agentMode && agentMode.maxTokensOverride !== undefined) {
        sessionUpdate.maxTokens = agentMode.maxTokensOverride as number;
      }

      updateSession(session.id, sessionUpdate);
    }
  };

  // Handle external agent change
  const handleExternalAgentChange = (agentId: string | null) => {
    if (session) {
      updateSession(session.id, {
        externalAgentId: agentId,
      } as Parameters<typeof updateSession>[1]);
    }
  };

  const handlePresetSelect = (preset: Preset) => {
    if (session) {
      updateSession(session.id, {
        provider: preset.provider,
        model: preset.model,
        mode: preset.mode,
        systemPrompt: preset.systemPrompt,
        builtinPrompts: preset.builtinPrompts,
        temperature: preset.temperature,
        maxTokens: preset.maxTokens,
        webSearchEnabled: preset.webSearchEnabled,
        thinkingEnabled: preset.thinkingEnabled,
        presetId: preset.id,
      });
    }
    selectPreset(preset.id);
  };

  const tToasts = useTranslations('toasts');

  const handleCopyChat = async () => {
    if (chatMessages.length > 0) {
      const text = chatMessages
        .map(
          (m) =>
            `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`
        )
        .join('\n\n');
      await navigator.clipboard.writeText(text);
      toast.success(tToasts('chatCopied'));
    }
  };

  const handleClearChat = () => {
    if (chatMessages.length > 0) {
      clearMessages();
      toast.success(tToasts('chatCleared'));
    }
  };

  const handleTogglePin = () => {
    if (session) {
      updateSession(session.id, { pinned: !session.pinned } as Parameters<typeof updateSession>[1]);
      toast.success(session.pinned ? tToasts('unpinned') : tToasts('pinned'));
    }
  };

  const handleSaveGoal = useCallback(
    (input: CreateGoalInput) => {
      if (!session) return;
      if (session.goal) {
        updateGoal(session.id, { content: input.content, progress: input.progress });
        toast.success(t('goalUpdated'));
      } else {
        setGoal(session.id, input);
        toast.success(t('goalSet'));
      }
    },
    [session, setGoal, updateGoal, t]
  );

  return (
    <>
      <header className="flex h-12 sm:h-14 shrink-0 items-center justify-between border-b border-border/50 px-2 sm:px-4 bg-background/90 supports-[backdrop-filter]:bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
          {/* Sidebar trigger - works on both mobile and desktop */}
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 shrink-0" />

          {/* Enhanced Mode selector with animations - hidden when hideModeSelector is true */}
          {!(isSimplifiedMode && simplifiedModeSettings.hideModeSelector) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-tour="mode-selector"
                className={cn(
                  'gap-2 transition-all duration-300 border',
                  modeColors[currentMode],
                  modeTransitioning && 'scale-95 opacity-70'
                )}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentMode}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center"
                  >
                    {modeIcons[currentMode]}
                  </motion.div>
                </AnimatePresence>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentMode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="hidden sm:inline font-medium"
                  >
                    {t(`mode.${currentMode}`)}
                  </motion.span>
                </AnimatePresence>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>{t('chatMode')}</span>
                {recentModes.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {t('recent')}
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(['chat', 'agent', 'research', 'learning'] as ChatMode[]).map((mode) => {
                const config = MODE_CONFIGS[mode];
                const isRecent = recentModes.includes(mode);
                return (
                  <DropdownMenuItem
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={cn(
                      'flex items-start gap-3 py-2',
                      currentMode === mode && 'bg-accent'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        modeColors[mode]
                      )}
                    >
                      {modeIcons[mode]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t(`mode.${mode}`)}</span>
                        {isRecent && currentMode !== mode && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            {t('recent')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{config.description}</p>
                    </div>
                    {currentMode === mode && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-2 w-2 rounded-full bg-primary shrink-0 mt-3"
                      />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          )}

          {/* Agent sub-mode selector - only shown in agent mode, hidden in focused/zen modes */}
          {currentMode === 'agent' && !isFocusedOrZen && (
            <div className="hidden sm:flex items-center gap-2">
              <Separator orientation="vertical" className="h-4" />
              <AgentModeSelector
                selectedModeId={agentModeId}
                onModeChange={handleAgentModeChange}
                className="h-8"
              />
              {/* External agent selector */}
              <ExternalAgentSelector
                selectedAgentId={session?.externalAgentId || null}
                onAgentChange={handleExternalAgentChange}
                onOpenSettings={() => window.location.href = '/settings#external-agents'}
              />
            </div>
          )}

          {/* Preset selector - hidden in focused/zen modes or when hidePresetSelector is true */}
          {!isFocusedOrZen && !(isSimplifiedMode && simplifiedModeSettings.hidePresetSelector) && (
            <div className="hidden min-[400px]:flex items-center gap-2">
              <Separator orientation="vertical" className="h-4" />
              <PresetSelector
                compact
                onSelect={handlePresetSelect}
                onCreateNew={() => setCreatePresetOpen(true)}
                onManage={() => setManagePresetsOpen(true)}
              />
            </div>
          )}

          {/* Branch selector - hidden in focused/zen modes */}
          {session && !isFocusedOrZen && (
            <div className="hidden sm:block">
              <BranchSelector sessionId={session.id} compact />
            </div>
          )}

          {/* Project selector - hidden in focused/zen modes */}
          {!isFocusedOrZen && (
            <div className="hidden md:flex items-center gap-2">
              <Separator orientation="vertical" className="h-4" />
              <ProjectSelector sessionId={session?.id} />
            </div>
          )}

          {/* Virtual environment selector - hidden in focused/zen modes */}
          {!isFocusedOrZen && (
            <div className="hidden md:flex items-center gap-2">
              <Separator orientation="vertical" className="h-4" />
              <SessionEnvSelector sessionId={session?.id} compact />
            </div>
          )}

          {/* Active skills indicator - hidden in focused/zen modes */}
          {!isFocusedOrZen && (
            <div className="hidden md:flex items-center gap-2">
              <Separator orientation="vertical" className="h-4" />
              <Link href="/skills">
                <ActiveSkillsIndicator />
              </Link>
            </div>
          )}

          {/* Session stats - hidden in focused/zen modes */}
          {session && messages.length > 0 && !isFocusedOrZen && (
            <div className="hidden lg:flex items-center gap-2">
              <Separator orientation="vertical" className="h-4" />
              <SessionStats messages={messages} sessionCreatedAt={session.createdAt} compact />
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* View mode toggle - List/Flow/Arena - hidden in focused/zen modes */}
          {session && !isFocusedOrZen && (
            <div className="flex items-center border rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-none rounded-l-md"
                    onClick={() => onViewModeChange?.('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tFlow('viewList')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'flow' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-none border-x"
                    onClick={() => onViewModeChange?.('flow')}
                  >
                    <GitBranch className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tFlow('viewFlow')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'arena' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-none rounded-r-md"
                    onClick={() => onViewModeChange?.('arena')}
                  >
                    <Scale className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tFlow('viewArena')}</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Multi-Model Toggle - hidden in focused/zen modes */}
          {session && !isFocusedOrZen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={session.multiModelConfig?.enabled ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 gap-1.5 px-2',
                    session.multiModelConfig?.enabled && 'bg-primary/10 text-primary border-primary/20'
                  )}
                  onClick={() => {
                    const currentConfig = session.multiModelConfig;
                    updateSession(session.id, {
                      multiModelConfig: {
                        enabled: !currentConfig?.enabled,
                        models: currentConfig?.models || [],
                        layout: currentConfig?.layout || 'columns',
                        syncScroll: currentConfig?.syncScroll ?? true,
                        showMetrics: currentConfig?.showMetrics ?? true,
                      },
                    });
                  }}
                >
                  <Scale className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">
                    {session.multiModelConfig?.enabled ? t('multiModelOn') : t('multiModel')}
                  </span>
                  {session.multiModelConfig?.enabled && session.multiModelConfig.models.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {session.multiModelConfig.models.length}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {session.multiModelConfig?.enabled
                  ? t('disableMultiModel')
                  : t('enableMultiModel')}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Background Agent Indicator - hidden in focused/zen modes */}
          {!isFocusedOrZen && <BackgroundAgentIndicator />}

          {/* Designer button - hidden on small screens and in simplified mode */}
          {!isSimplifiedMode && (
            <div className="hidden sm:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href="/designer">
                      <Wand2 className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('designer')}</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Image Studio button - hidden on small screens and in simplified mode */}
          {!isSimplifiedMode && (
            <div className="hidden sm:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href="/image-studio">
                      <ImageIcon className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('imageStudio')}</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Video Editor button - hidden on small screens and in simplified mode */}
          {!isSimplifiedMode && (
            <div className="hidden sm:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href="/video-studio?mode=recording">
                      <Film className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('videoEditor')}</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Simplified Mode Quick Toggle */}
          <SimplifiedModeQuickToggle />

          {/* Search button */}
          {session && messages.length > 0 && (
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <SearchIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <ConversationSearch
                  messages={messages}
                  onClose={() => setSearchOpen(false)}
                  onNavigateToMessage={(messageId) => {
                    // Scroll to message - could be enhanced with ref forwarding
                    const element = document.getElementById(`message-${messageId}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setSearchOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Panel toggle with dropdown for Canvas/Artifact selection - hidden in focused/zen modes */}
          {!isFocusedOrZen && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={panelOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 sm:w-auto sm:gap-1.5 sm:px-2"
                >
                  <PanelRight className="h-4 w-4" />
                  <ChevronDown className="hidden sm:block h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t('sidePanel')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openPanel('canvas')}>
                  <PanelRight className="mr-2 h-4 w-4" />
                  <div className="flex-1">
                    <span>{t('canvas')}</span>
                    <p className="text-xs text-muted-foreground">{t('canvasDesc')}</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openPanel('artifact')}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  <div className="flex-1">
                    <span>{t('artifacts')}</span>
                    <p className="text-xs text-muted-foreground">{t('artifactsDesc')}</p>
                  </div>
                </DropdownMenuItem>
                {panelOpen && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={closePanel} className="text-muted-foreground">
                      {t('closePanel')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Goal indicator button - hidden in focused/zen modes */}
          {session && !isFocusedOrZen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={session.goal ? 'secondary' : 'ghost'}
                  size="icon"
                  className={cn(
                    'h-8 w-8',
                    session.goal?.status === 'active' && 'text-blue-600 dark:text-blue-400',
                    session.goal?.status === 'completed' && 'text-green-600 dark:text-green-400',
                    session.goal?.status === 'paused' && 'text-yellow-600 dark:text-yellow-400'
                  )}
                  onClick={() => setGoalDialogOpen(true)}
                >
                  <Target className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {session.goal ? (
                  <div className="max-w-50">
                    <p className="font-medium text-xs mb-1">{t('goal')}</p>
                    <p className="text-xs text-muted-foreground truncate">{session.goal.content}</p>
                  </div>
                ) : (
                  t('setGoal')
                )}
              </TooltipContent>
            </Tooltip>
          )}

          {/* More actions dropdown - hidden when hideSessionActions is true */}
          {session && !(isSimplifiedMode && simplifiedModeSettings.hideSessionActions) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleTogglePin}>
                  {session.pinned ? (
                    <>
                      <PinOff className="mr-2 h-4 w-4" /> {t('unpin')}
                    </>
                  ) : (
                    <>
                      <Pin className="mr-2 h-4 w-4" /> {t('pin')}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyChat} disabled={chatMessages.length === 0}>
                  <Copy className="mr-2 h-4 w-4" />
                  {t('copyChat')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setBatchCopyOpen(true)}
                  disabled={messages.length === 0}
                >
                  <CopyCheck className="mr-2 h-4 w-4" />
                  {t('selectCopy')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSummaryDialogOpen(true)}
                  disabled={messages.length === 0}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {t('summarize')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <BeautifulExportDialog
                  session={session}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Download className="mr-2 h-4 w-4" />
                      {t('export')}
                    </DropdownMenuItem>
                  }
                />
                <ExportDialog
                  session={session}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Download className="mr-2 h-4 w-4" />
                      {t('exportBasic')}
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleClearChat}
                  disabled={chatMessages.length === 0}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('clearChat')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Open in external AI chat services */}
                {messages.length > 0 && (
                  <OpenIn query={messages.map((m) => `${m.role}: ${m.content}`).join('\n\n')}>
                    <OpenInTrigger>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('openInOtherAI')}
                      </DropdownMenuItem>
                    </OpenInTrigger>
                    <OpenInContent>
                      <OpenInLabel>{t('openInLabel')}</OpenInLabel>
                      <OpenInSeparator />
                      <OpenInChatGPT />
                      <OpenInClaude />
                      <OpenInScira />
                      <OpenInv0 />
                      <OpenInCursor />
                    </OpenInContent>
                  </OpenIn>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Create Preset Dialog */}
      <CreatePresetDialog
        open={createPresetOpen}
        onOpenChange={setCreatePresetOpen}
        onSuccess={handlePresetSelect}
      />

      {/* Manage Presets Dialog */}
      <Dialog open={managePresetsOpen} onOpenChange={setManagePresetsOpen}>
        <DialogContent className="sm:max-w-200 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('managePresets')}</DialogTitle>
          </DialogHeader>
          <PresetsManager
            onSelectPreset={(preset) => {
              handlePresetSelect(preset);
              setManagePresetsOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Batch Copy Dialog */}
      <BatchCopyDialog open={batchCopyOpen} onOpenChange={setBatchCopyOpen} messages={messages} />

      {/* Chat Summary Dialog */}
      <ChatSummaryDialog
        open={summaryDialogOpen}
        onOpenChange={setSummaryDialogOpen}
        messages={messages}
        sessionTitle={session?.title}
      />

      {/* Mode Switch Confirmation Dialog */}
      {pendingTargetMode && (
        <ModeSwitchConfirmDialog
          open={modeSwitchDialogOpen}
          onOpenChange={setModeSwitchDialogOpen}
          currentMode={currentMode}
          targetMode={pendingTargetMode}
          messageCount={messages.length}
          sessionTitle={session?.title}
          onConfirm={handleModeSwitchConfirm}
          onCancel={handleModeSwitchCancel}
          onGenerateSummary={handleGenerateSummaryForModeSwitch}
        />
      )}

      {/* Chat Goal Dialog */}
      <ChatGoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        onSave={handleSaveGoal}
        existingGoal={session?.goal}
        sessionTitle={session?.title}
      />
    </>
  );
}

export default ChatHeader;
