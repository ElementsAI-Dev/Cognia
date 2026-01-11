'use client';

/**
 * AppSidebar - main sidebar using shadcn/ui sidebar component
 * Provides navigation, session list, search, and settings access
 */

import { Plus, Settings, Moon, Sun, Monitor, MessageSquare, MoreHorizontal, Pencil, Trash2, Copy, Search, X, FolderKanban, Keyboard, Pin, PinOff, Wand2, ChevronDown, ChevronRight, Sparkles, Workflow, Wrench, GitBranch } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { useSessionStore, useSettingsStore } from '@/stores';
import { ArtifactListCompact } from '@/components/artifacts';
import { messageRepository } from '@/lib/db';
import { KeyboardShortcutsDialog } from '@/components/layout/keyboard-shortcuts-dialog';
import { SidebarUsageStats } from './sidebar-usage-stats';
import { SidebarBackgroundTasks } from './sidebar-background-tasks';
import { SidebarQuickActions } from './sidebar-quick-actions';
import { SidebarRecentFiles } from './sidebar-recent-files';
import { SidebarWorkflows } from './sidebar-workflows';
import { PluginExtensionPoint } from '@/components/plugin';
import type { Session } from '@/types';

const COLLAPSED_GROUPS_KEY = 'cognia:sidebar:collapsed-groups';

// Search result type
interface SearchResult {
  session: Session;
  matchType: 'title' | 'content';
  snippet?: string;
}

export function AppSidebar() {
  const t = useTranslations('sidebar');
  const tPlaceholders = useTranslations('placeholders');
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

  // Memoized and sorted sessions to keep grouping predictable (pinned first, then most recent)
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [sessions]);

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
    for (const session of sortedSessions) {
      if (session.title.toLowerCase().includes(lowerQuery)) {
        results.push({ session, matchType: 'title' });
      }
    }

    // Search by message content
    try {
      for (const session of sortedSessions) {
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
    } finally {
      setSearchResults(results);
      setIsSearching(false);
    }
  }, [sortedSessions]);

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

    for (const session of sortedSessions) {
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
  }, [searchQuery, searchResults, sortedSessions]);

  // Collapsed state for each group
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = window.localStorage.getItem(COLLAPSED_GROUPS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const groupLabels: Record<string, string> = {
    pinned: t('pinned'),
    today: t('today'),
    yesterday: t('yesterday'),
    lastWeek: t('lastWeek'),
    older: t('older'),
    search: t('searchResults'),
  };

  // Delete all sessions handler
  const deleteAllSessions = useSessionStore((state) => state.deleteAllSessions);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const handleDeleteAll = () => {
    deleteAllSessions();
    setShowDeleteAllConfirm(false);
  };

  return (
    <Sidebar collapsible="icon" data-tour="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={handleNewChat}
              tooltip={t('newChat')}
              data-testid="new-chat-button"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Plus className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">{t('newChat')}</span>
                <span className="text-xs text-muted-foreground">{t('startConversation')}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Search box */}
        {!isCollapsed && (
          <div className="px-2 pt-2">
            <InputGroup className="h-9">
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                type="text"
                placeholder={tPlaceholders('searchConversations')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm"
                data-testid="sidebar-search"
              />
              {searchQuery && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={clearSearch}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            {isSearching && (
              <p className="mt-1 text-xs text-muted-foreground">{t('searching')}</p>
            )}
            {searchQuery && !isSearching && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('resultsCount', { count: searchResults.length })}
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
            <span className="text-xs font-medium text-muted-foreground">{t('conversations')}</span>
            <DropdownMenu open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
              <DropdownMenuTrigger asChild>
                <Button className="text-muted-foreground hover:text-destructive transition-colors" data-testid="delete-all-trigger">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2 text-sm">
                  <p className="font-medium">{t('deleteAllConfirm')}</p>
                  <p className="text-muted-foreground text-xs mt-1">{t('cannotUndo')}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteAll}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('confirmDeleteAll')}
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
                  <p className="text-sm font-medium text-muted-foreground">{t('noConversations')}</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">{t('startNewChat')}</p>
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
                <SidebarMenuBadge>{groupSessions.length}</SidebarMenuBadge>
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

        {/* Search loading skeleton */}
        {searchQuery && isSearching && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Search empty state */}
        {searchQuery && !isSearching && searchResults.length === 0 && (
          <div className="px-4 py-6 text-xs text-muted-foreground text-center" data-testid="search-empty">
            {t('noResults') || 'No results'}
          </div>
        )}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        {/* Usage Stats Widget */}
        {!isCollapsed && (
          <div className="px-2 pb-2">
            <SidebarUsageStats />
          </div>
        )}

        {/* Background Tasks Widget */}
        <div className={isCollapsed ? 'px-1 pb-1' : 'px-2 pb-2'}>
          <SidebarBackgroundTasks collapsed={isCollapsed} />
        </div>

        {/* Quick Actions Widget */}
        {!isCollapsed && (
          <div className="px-2 pb-2 border-t border-border/50 pt-2">
            <SidebarQuickActions defaultOpen={false} />
          </div>
        )}

        {/* Recent Files Widget */}
        {!isCollapsed && (
          <div className="px-2 pb-2">
            <SidebarRecentFiles defaultOpen={false} limit={5} />
          </div>
        )}

        {/* Workflows Widget */}
        {!isCollapsed && (
          <div className="px-2 pb-2">
            <SidebarWorkflows defaultOpen={false} limit={5} />
          </div>
        )}

        {/* Plugin Extension Point - sidebar bottom */}
        {!isCollapsed && (
          <PluginExtensionPoint 
            point="sidebar.left.bottom" 
            className="px-2 pb-2"
          />
        )}

        {/* Session Artifacts - quick access */}
        {!isCollapsed && activeSessionId && (
          <div className="px-2 pb-2 border-b border-border/50">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">{t('sessionArtifacts') || 'Session Artifacts'}</h3>
            <ArtifactListCompact sessionId={activeSessionId} limit={5} />
          </div>
        )}
        {/* Quick access buttons - highlighted */}
        {!isCollapsed && (
          <div className="px-2 pb-2 space-y-2">
            <div className="flex gap-2">
              <Link href="/projects" className="flex-1">
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:border-accent">
                  <FolderKanban className="h-4 w-4 text-blue-500" />
                  <span>{t('projects')}</span>
                </div>
              </Link>
              <Link href="/designer" className="flex-1">
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:border-accent">
                  <Wand2 className="h-4 w-4 text-purple-500" />
                  <span>{t('designer')}</span>
                </div>
              </Link>
            </div>
            <div className="flex gap-2">
              <Link href="/skills" className="flex-1">
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:border-accent">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>{t('skills')}</span>
                </div>
              </Link>
              <Link href="/workflows" className="flex-1">
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:border-accent">
                  <Workflow className="h-4 w-4 text-green-500" />
                  <span>{t('workflows')}</span>
                </div>
              </Link>
            </div>
            <div className="flex gap-2">
              <Link href="/native-tools" className="flex-1">
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:border-accent">
                  <Wrench className="h-4 w-4 text-orange-500" />
                  <span>{t('nativeTools') || 'Native Tools'}</span>
                </div>
              </Link>
              <Link href="/git" className="flex-1">
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:border-accent">
                  <GitBranch className="h-4 w-4 text-cyan-500" />
                  <span>Git</span>
                </div>
              </Link>
            </div>
          </div>
        )}

        <SidebarMenu>
          {/* Collapsed state: show Projects, Designer, and Skills as menu items */}
          {isCollapsed && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('projects')}>
                  <Link href="/projects">
                    <FolderKanban className="h-4 w-4 text-blue-500" />
                    <span>Projects</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('designer')}>
                  <Link href="/designer">
                    <Wand2 className="h-4 w-4 text-purple-500" />
                    <span>Designer</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('skills')}>
                  <Link href="/skills">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Skills</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('workflows')}>
                  <Link href="/workflows">
                    <Workflow className="h-4 w-4 text-green-500" />
                    <span>Workflows</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('nativeTools') || 'Native Tools'}>
                  <Link href="/native-tools">
                    <Wrench className="h-4 w-4 text-orange-500" />
                    <span>Native Tools</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Git">
                  <Link href="/git">
                    <GitBranch className="h-4 w-4 text-cyan-500" />
                    <span>Git</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
          <SidebarMenuItem>
            <KeyboardShortcutsDialog
              trigger={
                <SidebarMenuButton tooltip={t('keyboardShortcuts')}>
                  <Keyboard className="h-4 w-4" />
                  <span>{t('shortcuts')}</span>
                </SidebarMenuButton>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={cycleTheme} tooltip={t('theme')}>
              {getThemeIcon()}
              <span>{t('themeLabel', { theme })}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t('settings')}>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>{t('settings')}</span>
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
  const t = useTranslations('sidebar');
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
              <><PinOff className="mr-2 h-4 w-4" />{t('unpin')}</>
            ) : (
              <><Pin className="mr-2 h-4 w-4" />{t('pinToTop')}</>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('rename')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicateSession(session.id)}>
            <Copy className="mr-2 h-4 w-4" />
            {t('duplicate')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => deleteSession(session.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export default AppSidebar;
