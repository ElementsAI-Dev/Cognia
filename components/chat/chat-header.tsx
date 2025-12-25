'use client';

/**
 * ChatHeader - displays session info and model selector
 * Uses shadcn/ui SidebarTrigger for sidebar control
 * Includes preset selector for quick configuration changes
 */

import { useState } from 'react';
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
import { toast } from '@/components/ui/toaster';
import { PROVIDERS, getModelConfig } from '@/types/provider';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ExportDialog } from './export-dialog';
import { ImageGenerationDialog } from './image-generation-dialog';
import { BranchSelector } from './branch-selector';
import { ModelPickerDialog } from './model-picker-dialog';
import { PresetSelector, CreatePresetDialog, PresetsManager } from '@/components/presets';
import { ActiveSkillsIndicator } from '@/components/skills';
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


export function ChatHeader({ sessionId }: ChatHeaderProps) {
  const t = useTranslations('chatHeader');
  const [createPresetOpen, setCreatePresetOpen] = useState(false);
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [batchCopyOpen, setBatchCopyOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

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

  const currentProvider = session?.provider || 'openai';
  const currentModel = session?.model || PROVIDERS[currentProvider]?.defaultModel || 'gpt-4o';
  const currentMode = session?.mode || 'chat';
  const isAutoMode = currentProvider === 'auto';

  const modelConfig = getModelConfig(currentProvider, currentModel);

  const handleModelChange = (providerId: string, modelId: string) => {
    if (session) {
      updateSession(session.id, { provider: providerId as typeof currentProvider, model: modelId });
    }
  };

  const handleModeChange = (mode: ChatMode) => {
    if (session) {
      updateSession(session.id, { mode });
    }
  };

  const handleAutoModeToggle = () => {
    if (session) {
      updateSession(session.id, { provider: 'auto', model: 'auto' });
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

          {/* Mode selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 hover:bg-accent/80 transition-colors">
                {modeIcons[currentMode]}
                <span className="hidden sm:inline">{t(`mode.${currentMode}`)}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>{t('chatMode')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(['chat', 'agent', 'research', 'learning'] as ChatMode[]).map((mode) => (
                <DropdownMenuItem
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={cn(currentMode === mode && 'bg-accent')}
                >
                  {modeIcons[mode]}
                  <span className="ml-2">{t(`mode.${mode}`)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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
        </div>

        {/* Model selector */}
        <div className="flex items-center gap-2">
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

          {/* Image Generation button */}
          <ImageGenerationDialog
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ImageIcon className="h-4 w-4" />
              </Button>
            }
          />

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
                <ExportDialog
                  session={session}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Download className="mr-2 h-4 w-4" />
                      {t('export')}
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Model Selector Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-border/50 hover:border-border transition-colors"
            onClick={() => setModelPickerOpen(true)}
          >
            {isAutoMode && <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />}
            <span className="max-w-[120px] truncate sm:max-w-[200px]">
              {isAutoMode ? t('auto') : (modelConfig?.name || currentModel)}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
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

    {/* Model Picker Dialog */}
    <ModelPickerDialog
      open={modelPickerOpen}
      onOpenChange={setModelPickerOpen}
      currentProvider={currentProvider}
      currentModel={currentModel}
      isAutoMode={isAutoMode}
      onModelSelect={handleModelChange}
      onAutoModeToggle={handleAutoModeToggle}
    />
    </>
  );
}

export default ChatHeader;
