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
} from 'lucide-react';
import { ConversationSearch } from './conversation-search';
import { useMessages } from '@/hooks';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { BatchCopyDialog } from './batch-copy-dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useSessionStore, usePresetStore, useArtifactStore, useChatStore, useProjectStore } from '@/stores';
import { MODE_CONFIGS } from '@/stores/session-store';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ExportDialog } from './export-dialog';
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
import { BranchSelector } from './branch-selector';
import { SessionStats } from './session-stats';
import { PresetSelector, CreatePresetDialog, PresetsManager } from '@/components/presets';
import { ActiveSkillsIndicator } from '@/components/skills';
import { BackgroundAgentIndicator, AgentModeSelector } from '@/components/agent';
import type { AgentModeConfig } from '@/types/agent-mode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ChatMode, Preset } from '@/types';

interface ChatHeaderProps {
  sessionId?: string;
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


export function ChatHeader({ sessionId }: ChatHeaderProps) {
  const t = useTranslations('chatHeader');
  const [createPresetOpen, setCreatePresetOpen] = useState(false);
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [batchCopyOpen, setBatchCopyOpen] = useState(false);

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
    ? sessions.find(s => s.id === sessionId) 
    : sessions.find(s => s.id === activeSessionId);
  const updateSession = useSessionStore((state) => state.updateSession);
  const selectPreset = usePresetStore((state) => state.selectPreset);
  
  // Project context
  const getProject = useProjectStore((state) => state.getProject);
  const linkedProject = session?.projectId ? getProject(session.projectId) : null;

  // Get messages for search
  const { messages } = useMessages({ sessionId: session?.id || null });

  const currentMode = session?.mode || 'chat';
  const [modeTransitioning, setModeTransitioning] = useState(false);

  // Agent sub-mode (for agent mode only)
  const agentModeId = session?.agentModeId || 'general';

  // Get mode config from SessionStore
  const switchMode = useSessionStore((state) => state.switchMode);
  const getModeConfig = useSessionStore((state) => state.getModeConfig);
  const getRecentModes = useSessionStore((state) => state.getRecentModes);

  // Get current mode configuration
  const _currentModeConfig = useMemo(() => getModeConfig(currentMode), [getModeConfig, currentMode]);
  const recentModes = useMemo(() => getRecentModes(3), [getRecentModes]);

  const handleModeChange = useCallback((mode: ChatMode) => {
    if (session && mode !== currentMode) {
      setModeTransitioning(true);
      // Use the enhanced switchMode from SessionStore
      switchMode(session.id, mode);
      // Also update session for backward compatibility
      updateSession(session.id, { mode });
      // Reset transition state after animation
      setTimeout(() => setModeTransitioning(false), 300);
    }
  }, [session, currentMode, switchMode, updateSession]);

  // Handle agent sub-mode change (within agent mode)
  const handleAgentModeChange = (agentMode: AgentModeConfig) => {
    if (session) {
      updateSession(session.id, {
        agentModeId: agentMode.id,
        systemPrompt: agentMode.systemPrompt,
        // Store agent-specific tools configuration
      });
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
        .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
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


  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-4 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {/* Sidebar trigger - works on both mobile and desktop */}
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          {/* Enhanced Mode selector with animations */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
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
                  <span className="text-[10px] text-muted-foreground font-normal">Recent</span>
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
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      modeColors[mode]
                    )}>
                      {modeIcons[mode]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t(`mode.${mode}`)}</span>
                        {isRecent && currentMode !== mode && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            Recent
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {config.description}
                      </p>
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

          {/* Agent sub-mode selector - only shown in agent mode */}
          {currentMode === 'agent' && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <AgentModeSelector
                selectedModeId={agentModeId}
                onModeChange={handleAgentModeChange}
                className="h-8"
              />
            </>
          )}

          {/* Preset selector */}
          <Separator orientation="vertical" className="h-4" />
          <PresetSelector
            compact
            onSelect={handlePresetSelect}
            onCreateNew={() => setCreatePresetOpen(true)}
            onManage={() => setManagePresetsOpen(true)}
          />

          {/* Branch selector (only shown when branches exist) */}
          {session && (
            <BranchSelector
              sessionId={session.id}
              compact
            />
          )}

          {/* Project context indicator */}
          {linkedProject && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <Link href="/projects" className="group">
                <Badge 
                  variant="outline" 
                  className="gap-1.5 px-2 py-1 bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                >
                  <span 
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: linkedProject.color || '#3b82f6' }}
                  />
                  <span className="max-w-[80px] truncate text-xs font-medium">
                    {linkedProject.name}
                  </span>
                </Badge>
              </Link>
            </>
          )}

          {/* Active skills indicator */}
          <Separator orientation="vertical" className="h-4" />
          <Link href="/skills">
            <ActiveSkillsIndicator />
          </Link>

          {/* Session stats - compact view */}
          {session && messages.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <SessionStats
                messages={messages}
                sessionCreatedAt={session.createdAt}
                compact
              />
            </>
          )}
        </div>

        {/* Model selector */}
        <div className="flex items-center gap-2">
          {/* Background Agent Indicator */}
          <BackgroundAgentIndicator />

          {/* Designer button */}
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

          {/* Image Studio button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href="/image-studio">
                  <ImageIcon className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('imageStudio') || 'Image Studio'}</TooltipContent>
          </Tooltip>

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

          {/* Panel toggle with dropdown for Canvas/Artifact selection */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={panelOpen ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-8 gap-1.5 px-2"
              >
                <PanelRight className="h-4 w-4" />
                <ChevronDown className="h-3 w-3 opacity-50" />
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

          {/* More actions dropdown */}
          {session && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleTogglePin}>
                  {session.pinned ? (
                    <><PinOff className="mr-2 h-4 w-4" /> {t('unpin')}</>  
                  ) : (
                    <><Pin className="mr-2 h-4 w-4" /> {t('pin')}</>  
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
                      {t('exportBasic') || 'Basic Export'}
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
                  <OpenIn query={messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}>
                    <OpenInTrigger>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('openInOtherAI') || 'Open in Other AI'}
                      </DropdownMenuItem>
                    </OpenInTrigger>
                    <OpenInContent>
                      <OpenInLabel>Open conversation in...</OpenInLabel>
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
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('managePresets')}</DialogTitle>
        </DialogHeader>
        <PresetsManager onSelectPreset={(preset) => {
          handlePresetSelect(preset);
          setManagePresetsOpen(false);
        }} />
      </DialogContent>
    </Dialog>

    {/* Batch Copy Dialog */}
    <BatchCopyDialog
      open={batchCopyOpen}
      onOpenChange={setBatchCopyOpen}
      messages={messages}
    />

    </>
  );
}

export default ChatHeader;
