'use client';

/**
 * CommandPalette - Global command palette (Cmd+K / Ctrl+K)
 * Provides quick access to all app features, navigation, and actions
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  MessageSquare,
  Plus,
  Settings,
  FolderKanban,
  Wand2,
  Moon,
  Sun,
  Monitor,
  Search,
  Bot,
  Sparkles,
  FileText,
  Code,
  Keyboard,
  Download,
  Upload,
  Trash2,
  Copy,
  PanelRight,
  LayoutGrid,
  Zap,
} from 'lucide-react';
import { useSessionStore, useSettingsStore, useUIStore, useArtifactStore, useChatStore } from '@/stores';
import { toast } from '@/components/ui/toaster';
import type { ChatMode } from '@/types';

interface CommandPaletteProps {
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const sessions = useSessionStore((state) => state.sessions);
  const createSession = useSessionStore((state) => state.createSession);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const updateSession = useSessionStore((state) => state.updateSession);

  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  const openModal = useUIStore((state) => state.openModal);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  
  const openPanel = useArtifactStore((state) => state.openPanel);
  const closePanel = useArtifactStore((state) => state.closePanel);
  const panelOpen = useArtifactStore((state) => state.panelOpen);

  const messages = useChatStore((state) => state.messages);
  const clearMessages = useChatStore((state) => state.clearMessages);

  // Handle open state change
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  }, [onOpenChange]);

  // Keyboard shortcut to open command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, handleOpenChange]);

  // Navigation actions
  const handleNavigate = useCallback((path: string) => {
    router.push(path);
    handleOpenChange(false);
  }, [router, handleOpenChange]);

  // Session actions
  const handleNewChat = useCallback(() => {
    createSession();
    handleOpenChange(false);
  }, [createSession, handleOpenChange]);

  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSession(sessionId);
    handleOpenChange(false);
  }, [setActiveSession, handleOpenChange]);

  // Mode change
  const handleModeChange = useCallback((mode: ChatMode) => {
    const session = sessions.find(s => s.id === activeSessionId);
    if (session) {
      updateSession(session.id, { mode });
    } else {
      createSession({ mode });
    }
    handleOpenChange(false);
  }, [sessions, activeSessionId, updateSession, createSession, handleOpenChange]);

  // Theme actions
  const handleThemeChange = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    handleOpenChange(false);
  }, [setTheme, handleOpenChange]);

  // Panel actions
  const handleToggleCanvas = useCallback(() => {
    if (panelOpen) {
      closePanel();
    } else {
      openPanel('canvas');
    }
    handleOpenChange(false);
  }, [panelOpen, openPanel, closePanel, handleOpenChange]);

  const handleToggleArtifact = useCallback(() => {
    if (panelOpen) {
      closePanel();
    } else {
      openPanel('artifact');
    }
    handleOpenChange(false);
  }, [panelOpen, openPanel, closePanel, handleOpenChange]);

  // Sidebar toggle
  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
    handleOpenChange(false);
  }, [toggleSidebar, handleOpenChange]);

  // Clear current chat
  const handleClearChat = useCallback(() => {
    if (activeSessionId && messages.length > 0) {
      clearMessages();
      toast.success('Chat cleared');
    }
    handleOpenChange(false);
  }, [activeSessionId, messages.length, clearMessages, handleOpenChange]);

  // Copy chat to clipboard
  const handleCopyChat = useCallback(async () => {
    if (messages.length > 0) {
      const text = messages
        .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
        .join('\n\n');
      await navigator.clipboard.writeText(text);
      toast.success('Chat copied to clipboard');
    }
    handleOpenChange(false);
  }, [messages, handleOpenChange]);

  // Recent sessions (last 5)
  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [sessions]);

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={handleNewChat}>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Chat</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/designer')}>
            <Wand2 className="mr-2 h-4 w-4 text-purple-500" />
            <span>Open Designer</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/projects')}>
            <FolderKanban className="mr-2 h-4 w-4 text-blue-500" />
            <span>View Projects</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={handleToggleSidebar}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span>Toggle Sidebar</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Chat Modes */}
        <CommandGroup heading="Switch Mode">
          <CommandItem onSelect={() => handleModeChange('chat')}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Chat Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => handleModeChange('agent')}>
            <Bot className="mr-2 h-4 w-4" />
            <span>Agent Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => handleModeChange('research')}>
            <Search className="mr-2 h-4 w-4" />
            <span>Research Mode</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Panels */}
        <CommandGroup heading="Panels">
          <CommandItem onSelect={handleToggleCanvas}>
            <PanelRight className="mr-2 h-4 w-4" />
            <span>Toggle Canvas</span>
            <CommandShortcut>⌘.</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={handleToggleArtifact}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Toggle Artifacts</span>
            <CommandShortcut>⌘;</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <>
            <CommandGroup heading="Recent Conversations">
              {recentSessions.map((session) => (
                <CommandItem
                  key={session.id}
                  onSelect={() => handleSelectSession(session.id)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span className="truncate">{session.title}</span>
                  {session.id === activeSessionId && (
                    <span className="ml-auto text-xs text-muted-foreground">Active</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Theme */}
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => handleThemeChange('light')}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light Theme</span>
            {theme === 'light' && <span className="ml-auto text-xs">✓</span>}
          </CommandItem>
          <CommandItem onSelect={() => handleThemeChange('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark Theme</span>
            {theme === 'dark' && <span className="ml-auto text-xs">✓</span>}
          </CommandItem>
          <CommandItem onSelect={() => handleThemeChange('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            <span>System Theme</span>
            {theme === 'system' && <span className="ml-auto text-xs">✓</span>}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Tools */}
        <CommandGroup heading="Tools">
          <CommandItem onSelect={() => { openModal('export'); handleOpenChange(false); }}>
            <Download className="mr-2 h-4 w-4" />
            <span>Export Conversation</span>
          </CommandItem>
          <CommandItem onSelect={() => { openModal('import'); handleOpenChange(false); }}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Import Data</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/settings?tab=providers')}>
            <Code className="mr-2 h-4 w-4" />
            <span>API Keys</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/settings?tab=mcp')}>
            <FileText className="mr-2 h-4 w-4" />
            <span>MCP Servers</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Current Chat Actions */}
        {activeSessionId && (
          <>
            <CommandGroup heading="Current Chat">
              <CommandItem onSelect={handleCopyChat}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Copy Chat</span>
              </CommandItem>
              <CommandItem onSelect={handleClearChat}>
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                <span>Clear Chat</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandSeparator />

        {/* Help */}
        <CommandGroup heading="Help">
          <CommandItem onSelect={() => { openModal('mcp-servers'); handleOpenChange(false); }}>
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Keyboard Shortcuts</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
