'use client';

/**
 * ChatHeader - displays session info and model selector
 * Uses shadcn/ui SidebarTrigger for sidebar control
 * Includes preset selector for quick configuration changes
 */

import { useState } from 'react';
import { ChevronDown, Sparkles, Search, Bot, Zap, Brain, Scale, Download, Image as ImageIcon, Wand2 } from 'lucide-react';
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
import { useSessionStore, useSettingsStore, usePresetStore } from '@/stores';
import { PROVIDERS, getModelConfig } from '@/types/provider';
import { cn } from '@/lib/utils';
import { ExportDialog } from './export-dialog';
import { ImageGenerationDialog } from './image-generation-dialog';
import { BranchSelector } from './branch-selector';
import { PresetSelector, CreatePresetDialog, PresetsManager } from '@/components/presets';
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
  research: <Search className="h-4 w-4" />,
};

const modeLabels: Record<ChatMode, string> = {
  chat: 'Chat',
  agent: 'Agent',
  research: 'Research',
};

export function ChatHeader({ sessionId }: ChatHeaderProps) {
  const [createPresetOpen, setCreatePresetOpen] = useState(false);
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);

  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const session = sessionId 
    ? sessions.find(s => s.id === sessionId) 
    : sessions.find(s => s.id === activeSessionId);
  const updateSession = useSessionStore((state) => state.updateSession);
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const selectPreset = usePresetStore((state) => state.selectPreset);

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
        temperature: preset.temperature,
        maxTokens: preset.maxTokens,
      });
    }
    selectPreset(preset.id);
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          {/* Sidebar trigger - works on both mobile and desktop */}
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          {/* Mode selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                {modeIcons[currentMode]}
                <span className="hidden sm:inline">{modeLabels[currentMode]}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Chat Mode</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(modeLabels) as ChatMode[]).map((mode) => (
                <DropdownMenuItem
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={cn(currentMode === mode && 'bg-accent')}
                >
                  {modeIcons[mode]}
                  <span className="ml-2">{modeLabels[mode]}</span>
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
        </div>

        {/* Model selector */}
        <div className="flex items-center gap-2">
          {/* Image Generation button */}
          <ImageGenerationDialog
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ImageIcon className="h-4 w-4" />
              </Button>
            }
          />

          {/* Export button */}
          {session && (
            <ExportDialog
              session={session}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              }
            />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {isAutoMode && <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />}
                <span className="max-w-[120px] truncate sm:max-w-[200px]">
                  {isAutoMode ? 'Auto' : (modelConfig?.name || currentModel)}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {/* Auto Mode Option */}
              <div className={cn(
                'rounded-md p-2 mb-2',
                isAutoMode ? 'bg-primary/10 border border-primary/20' : 'hover:bg-accent'
              )}>
                <button
                  onClick={handleAutoModeToggle}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Auto Mode</span>
                        {isAutoMode && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Intelligent model selection based on task complexity
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 rounded bg-green-500/10 px-2 py-1 text-xs text-green-600">
                          <Zap className="h-3 w-3" />
                          Fast
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Quick queries, translations</p>
                        <p className="text-xs text-muted-foreground">GPT-4o Mini, Gemini Flash, Haiku</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600">
                          <Scale className="h-3 w-3" />
                          Balanced
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>General tasks</p>
                        <p className="text-xs text-muted-foreground">GPT-4o, Claude Sonnet, Gemini Pro</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 rounded bg-purple-500/10 px-2 py-1 text-xs text-purple-600">
                          <Brain className="h-3 w-3" />
                          Powerful
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Complex reasoning, coding</p>
                        <p className="text-xs text-muted-foreground">Claude Opus, o1, DeepSeek Reasoner</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </button>
              </div>
              <DropdownMenuSeparator />
            {Object.entries(PROVIDERS).map(([providerId, provider]) => {
              const settings = providerSettings[providerId];
              const isEnabled = settings?.enabled !== false;

              return (
                <div key={providerId}>
                  <DropdownMenuLabel className="flex items-center justify-between">
                    {provider.name}
                    {!isEnabled && (
                      <Badge variant="secondary" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                  </DropdownMenuLabel>
                  {provider.models.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => handleModelChange(providerId, model.id)}
                      disabled={!isEnabled}
                      className={cn(
                        currentProvider === providerId &&
                          currentModel === model.id &&
                          'bg-accent'
                      )}
                    >
                      <div className="flex flex-1 flex-col">
                        <span>{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.contextLength.toLocaleString()} tokens
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {model.supportsTools && (
                          <Badge variant="outline" className="text-xs">
                            Tools
                          </Badge>
                        )}
                        {model.supportsVision && (
                          <Badge variant="outline" className="text-xs">
                            Vision
                          </Badge>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
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
          <DialogTitle>Manage Presets</DialogTitle>
        </DialogHeader>
        <PresetsManager onSelectPreset={(preset) => {
          handlePresetSelect(preset);
          setManagePresetsOpen(false);
        }} />
      </DialogContent>
    </Dialog>
    </>
  );
}

export default ChatHeader;
