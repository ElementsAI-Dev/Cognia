'use client';

/**
 * AppSidebar - main sidebar using shadcn/ui sidebar component
 * Provides navigation, session list, search, and settings access
 */

import { Plus, Settings, Moon, Sun, Monitor, MessageSquare, MoreHorizontal, Pencil, Trash2, Copy, Search, X, FolderKanban, Keyboard, Pin, PinOff, Wand2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useSessionStore, useSettingsStore } from '@/stores';
import { messageRepository } from '@/lib/db';
import { KeyboardShortcutsDialog } from '@/components/layout/keyboard-shortcuts-dialog';
import type { Session } from '@/types';

// Search result type
interface SearchResult {
  session: Session;
  matchType: 'title' | 'content';
  snippet?: string;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const createSession = useSessionStore((state) => state.createSession);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleNewChat = () => {
    createSession();
  };

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  // Search function
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search by title first
    for (const session of sessions) {
      if (session.title.toLowerCase().includes(lowerQuery)) {
        results.push({ session, matchType: 'title' });
      }
    }

    // Search by message content
    try {
      for (const session of sessions) {
        // Skip if already found by title
        if (results.some(r => r.session.id === session.id)) continue;

        const messages = await messageRepository.getBySessionId(session.id);
        const matchingMessage = messages.find(m =>
          m.content.toLowerCase().includes(lowerQuery)
        );

        if (matchingMessage) {
          // Create snippet around the match
          const index = matchingMessage.content.toLowerCase().indexOf(lowerQuery);
          const start = Math.max(0, index - 30);
          const end = Math.min(matchingMessage.content.length, index + query.length + 30);
          let snippet = matchingMessage.content.slice(start, end);
          if (start > 0) snippet = '...' + snippet;
          if (end < matchingMessage.content.length) snippet = snippet + '...';

          results.push({ session, matchType: 'content', snippet });
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    }

    setSearchResults(results);
    setIsSearching(false);
  }, [sessions]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Group sessions by time period
  const groupedSessions = useMemo(() => {
    if (searchQuery.trim()) {
      return { search: searchResults };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups: Record<string, SearchResult[]> = {
      pinned: [],
      today: [],
      yesterday: [],
      lastWeek: [],
      older: [],
    };

    for (const session of sessions) {
      const result = { session, matchType: 'title' as const, snippet: undefined };
      const updatedAt = new Date(session.updatedAt);

      if (session.pinned) {
        groups.pinned.push(result);
      } else if (updatedAt >= today) {
        groups.today.push(result);
      } else if (updatedAt >= yesterday) {
        groups.yesterday.push(result);
      } else if (updatedAt >= lastWeek) {
        groups.lastWeek.push(result);
      } else {
        groups.older.push(result);
      }
    }

    return groups;
  }, [searchQuery, searchResults, sessions]);

  // Collapsed state for each group
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const groupLabels: Record<string, string> = {
    pinned: 'Pinned',
    today: 'Today',
    yesterday: 'Yesterday',
    lastWeek: 'Last 7 Days',
    older: 'Older',
    search: 'Search Results',
  };

  // Delete all sessions handler
  const deleteAllSessions = useSessionStore((state) => state.deleteAllSessions);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const handleDeleteAll = () => {
    deleteAllSessions();
    setShowDeleteAllConfirm(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={handleNewChat}
              tooltip="New Chat"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Plus className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">New Chat</span>
                <span className="text-xs text-muted-foreground">Start conversation</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Search box */}
        {!isCollapsed && (
          <div className="px-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-8 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {isSearching && (
              <p className="mt-1 text-xs text-muted-foreground">Searching...</p>
            )}
            {searchQuery && !isSearching && (
              <p className="mt-1 text-xs text-muted-foreground">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Header with delete all button */}
        {!isCollapsed && !searchQuery && sessions.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">Conversations</span>
            <DropdownMenu open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
              <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2 text-sm">
                  <p className="font-medium">Delete all conversations?</p>
                  <p className="text-muted-foreground text-xs mt-1">This action cannot be undone.</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteAll}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Confirm Delete All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Empty state - enhanced */}
        {sessions.length === 0 && !searchQuery && (
          <div className="px-4 py-8 text-center animate-in fade-in-0 duration-300">
            {!isCollapsed && (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-muted/50">
                  <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">Start a new chat to begin</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grouped sessions */}
        {Object.entries(groupedSessions).map(([groupKey, groupSessions]) => {
          if (groupSessions.length === 0) return null;
          const isCollapsedGroup = collapsedGroups[groupKey];

          return (
            <SidebarGroup key={groupKey}>
              <SidebarGroupLabel 
                className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md transition-colors"
                onClick={() => toggleGroup(groupKey)}
              >
                <span className="flex items-center gap-1">
                  {isCollapsedGroup ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {groupLabels[groupKey]}
                </span>
                <span className="text-xs text-muted-foreground">{groupSessions.length}</span>
              </SidebarGroupLabel>
              {!isCollapsedGroup && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {groupSessions.map((result) => (
                      <SessionMenuItem
                        key={result.session.id}
                        session={result.session}
                        isActive={result.session.id === activeSessionId}
                        snippet={result.snippet}
                        matchType={result.matchType}
                        searchQuery={searchQuery}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        {/* Quick access buttons - highlighted */}
        {!isCollapsed && (
          <div className="px-2 pb-2">
            <div className="flex gap-2">
              <Link href="/projects" className="flex-1">
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:border-accent">
                  <FolderKanban className="h-4 w-4 text-blue-500" />
                  <span>Projects</span>
                </div>
              </Link>
              <Link href="/designer" className="flex-1">
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:border-accent">
                  <Wand2 className="h-4 w-4 text-purple-500" />
                  <span>Designer</span>
                </div>
              </Link>
            </div>
          </div>
        )}

        <SidebarMenu>
          {/* Collapsed state: show Projects and Designer as menu items */}
          {isCollapsed && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Projects">
                  <Link href="/projects">
                    <FolderKanban className="h-4 w-4 text-blue-500" />
                    <span>Projects</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Designer">
                  <Link href="/designer">
                    <Wand2 className="h-4 w-4 text-purple-500" />
                    <span>Designer</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
          <SidebarMenuItem>
            <KeyboardShortcutsDialog
              trigger={
                <SidebarMenuButton tooltip="Keyboard Shortcuts">
                  <Keyboard className="h-4 w-4" />
                  <span>Shortcuts</span>
                </SidebarMenuButton>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={cycleTheme} tooltip={`Theme: ${theme}`}>
              {getThemeIcon()}
              <span>Theme: {theme}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Session menu item component with search highlighting
interface SessionMenuItemProps {
  session: Session;
  isActive: boolean;
  snippet?: string;
  matchType?: 'title' | 'content';
  searchQuery?: string;
}

function SessionMenuItem({
  session,
  isActive,
  snippet,
  matchType,
  searchQuery,
}: SessionMenuItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);

  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const updateSession = useSessionStore((state) => state.updateSession);
  const deleteSession = useSessionStore((state) => state.deleteSession);
  const duplicateSession = useSessionStore((state) => state.duplicateSession);
  const togglePinSession = useSessionStore((state) => state.togglePinSession);

  const handleClick = () => {
    if (!isEditing) {
      setActiveSession(session.id);
    }
  };

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== session.title) {
      updateSession(session.id, { title: editTitle.trim() });
    } else {
      setEditTitle(session.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditTitle(session.title);
      setIsEditing(false);
    }
  };

  // Highlight search term in text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <span className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {text.slice(index, index + query.length)}
        </span>
        {text.slice(index + query.length)}
      </>
    );
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={handleClick}
        tooltip={session.title}
        className={snippet ? 'h-auto py-2' : undefined}
      >
        <div className="relative shrink-0">
          <MessageSquare className="h-4 w-4" />
          {session.pinned && (
            <Pin className="h-2.5 w-2.5 absolute -top-1 -right-1 text-primary" />
          )}
        </div>
        <div className="flex flex-col overflow-hidden">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="h-6 px-1 py-0 text-sm"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span className="truncate">
                {searchQuery && matchType === 'title'
                  ? highlightText(session.title, searchQuery)
                  : session.title}
              </span>
              {snippet && (
                <span className="text-xs text-muted-foreground truncate mt-0.5">
                  {searchQuery ? highlightText(snippet, searchQuery) : snippet}
                </span>
              )}
            </>
          )}
        </div>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-48">
          <DropdownMenuItem onClick={() => togglePinSession(session.id)}>
            {session.pinned ? (
              <><PinOff className="mr-2 h-4 w-4" />Unpin</>
            ) : (
              <><Pin className="mr-2 h-4 w-4" />Pin to top</>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicateSession(session.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => deleteSession(session.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export default AppSidebar;
