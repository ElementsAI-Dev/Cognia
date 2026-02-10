'use client';

/**
 * AppSidebar - main sidebar using shadcn/ui sidebar component
 * Provides navigation, session list, search, and settings access
 */

import {
  Plus,
  Settings,
  Moon,
  Sun,
  Monitor,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Search,
  X,
  FolderKanban,
  Keyboard,
  Pin,
  PinOff,
  Wand2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Workflow,
  Wrench,
  GitBranch,
  Activity,
  Library,
  LayoutGrid,
  Image as ImageIcon,
  Folder,
  FolderPlus,
  FolderOpen,
  FileCode,
  Calendar,
  Archive,
  GraduationCap,
  BookOpen,
  Terminal,
} from 'lucide-react';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSessionStore, useSettingsStore, useProjectStore } from '@/stores';
import { ArtifactListCompact } from '@/components/artifacts';
import { messageRepository } from '@/lib/db';
import { KeyboardShortcutsDialog } from '@/components/layout/overlays/keyboard-shortcuts-dialog';
import { SidebarUsageStats } from './widgets/sidebar-usage-stats';
import { SidebarBackgroundTasks } from './widgets/sidebar-background-tasks';
import { SidebarAgentTeams } from './widgets/sidebar-agent-teams';
import { SidebarQuickActions } from './widgets/sidebar-quick-actions';
import { SidebarRecentFiles } from './widgets/sidebar-recent-files';
import { SidebarWorkflows } from './widgets/sidebar-workflows';
import { SidebarProjectSelector } from './widgets/sidebar-project-selector';
import { PluginExtensionPoint } from '@/components/plugin';
import type { Session } from '@/types';
import { SidebarIconPicker } from './sidebar-icon-picker';
import * as LucideIcons from 'lucide-react';

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
  const observabilitySettings = useSettingsStore((state) => state.observabilitySettings);
  const backgroundSettings = useSettingsStore((state) => state.backgroundSettings);
  const isBackgroundActive = backgroundSettings.enabled && backgroundSettings.source !== 'none';

  const sessions = useSessionStore((state) => state.sessions);
  const folders = useSessionStore((state) => state.folders) || [];
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const createFolder = useSessionStore((state) => state.createFolder);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Archive filter state
  const [showArchived, setShowArchived] = useState(false);

  // Project filter state
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);

  // Project store for auto-linking new chats
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const getProject = useProjectStore((state) => state.getProject);
  const addSessionToProject = useProjectStore((state) => state.addSessionToProject);

  const handleNewChat = () => {
    // Get active project to apply defaults
    const activeProject = activeProjectId ? getProject(activeProjectId) : null;

    // Create session with project defaults if active project exists
    const session = createSession(
      activeProject
        ? {
            projectId: activeProject.id,
            provider: activeProject.defaultProvider as
              | 'openai'
              | 'anthropic'
              | 'google'
              | 'deepseek'
              | 'groq'
              | 'mistral'
              | 'ollama'
              | undefined,
            model: activeProject.defaultModel,
            mode: activeProject.defaultMode,
            systemPrompt: activeProject.customInstructions,
          }
        : undefined
    );

    // Link session to project
    if (activeProject) {
      addSessionToProject(activeProject.id, session.id);
    }
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
  // Also filters by project if filterProjectId is set
  const sortedSessions = useMemo(() => {
    let filtered = [...sessions];

    // Filter archived sessions unless explicitly showing them
    if (!showArchived) {
      filtered = filtered.filter((s) => !s.isArchived);
    } else {
      filtered = filtered.filter((s) => s.isArchived);
    }

    // Filter by project if a project filter is set
    if (filterProjectId) {
      filtered = filtered.filter((s) => s.projectId === filterProjectId);
    }

    // Filter out sessions that are in a folder (unless searching)
    if (!searchQuery) {
      filtered = filtered.filter((s) => !s.folderId);
    }

    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [sessions, filterProjectId, searchQuery, showArchived]);

  // Search function
  const handleSearch = useCallback(
    async (query: string) => {
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
          if (results.some((r) => r.session.id === session.id)) continue;

          const messages = await messageRepository.getBySessionId(session.id);
          const matchingMessage = messages.find((m) =>
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
    },
    [sortedSessions]
  );

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
    if (typeof window === 'undefined') return { system: true };
    try {
      const stored = window.localStorage.getItem(COLLAPSED_GROUPS_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      // Default system to true if not present
      if (parsed.system === undefined) {
        parsed.system = true;
      }
      return parsed;
    } catch {
      return { system: true };
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const groupLabels: Record<string, string> = {
    pinned: t('pinned'),
    today: t('today'),
    yesterday: t('yesterday'),
    lastWeek: t('lastWeek'),
    older: t('older'),
    search: t('searchResults'),
    apps: t('apps') || 'Apps',
    artifacts: t('sessionArtifacts') || 'Session Artifacts',
  };

  // Delete all sessions handler
  const deleteAllSessions = useSessionStore((state) => state.deleteAllSessions);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const handleDeleteAll = () => {
    deleteAllSessions();
    setShowDeleteAllConfirm(false);
  };

  return (
    <Sidebar
      collapsible="icon"
      data-tour="sidebar"
      className={cn(
        'transition-colors duration-300',
        isBackgroundActive ? 'bg-sidebar-70 backdrop-blur-md border-r-white/10' : 'bg-sidebar'
      )}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={handleNewChat}
              tooltip={t('newChat')}
              data-testid="new-chat-button"
              className="transition-colors"
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
                  <InputGroupButton size="icon-xs" onClick={clearSearch} aria-label="Clear search">
                    <X className="h-4 w-4" />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            {isSearching && <p className="mt-1 text-xs text-muted-foreground">{t('searching')}</p>}
            {searchQuery && !isSearching && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('resultsCount', { count: searchResults.length })}
              </p>
            )}
          </div>
        )}

        {/* Project Selector */}
        <SidebarProjectSelector
          onFilterChange={setFilterProjectId}
          filterProjectId={filterProjectId}
          collapsed={isCollapsed}
        />
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Collapsible Conversations Section */}
        {!isCollapsed && !searchQuery && sessions.length > 0 ? (
          <Collapsible
            open={!collapsedGroups['conversations']}
            onOpenChange={() => toggleGroup('conversations')}
          >
            <div className="flex items-center justify-between px-4 py-2 group/header">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="p-0 h-auto hover:bg-transparent flex items-center gap-2"
                >
                  <span className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    {t('conversations')}
                  </span>
                  {!collapsedGroups['conversations'] ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-6 w-6 text-muted-foreground hover:text-primary',
                    showArchived && 'text-primary bg-sidebar-accent'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowArchived(!showArchived);
                  }}
                  title={showArchived ? (t('showActive') || 'Show Active') : (t('showArchived') || 'Show Archived')}
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    createFolder('New Folder');
                  }}
                  title="Create Folder"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
                <DropdownMenu open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="text-muted-foreground hover:text-destructive transition-colors h-6 w-6 p-0"
                      variant="ghost"
                      data-testid="delete-all-trigger"
                    >
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
            </div>

            <CollapsibleContent>
              {/* Empty state - enhanced (inside collapsible) */}
              {sessions.length === 0 && (
                <div className="px-4 py-8 text-center animate-in fade-in-0 duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-full bg-muted/50">
                      <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {t('noConversations')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">{t('startNewChat')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Folders */}
              {folders.map((folder) => (
                <SidebarFolder
                  key={folder.id}
                  folder={folder}
                  sessions={sessions.filter((s) => s.folderId === folder.id)}
                />
              ))}

              {/* Grouped sessions */}
              {Object.entries(groupedSessions).map(([groupKey, groupSessions]) => {
                if (groupSessions.length === 0) return null;
                const isCollapsedGroup = collapsedGroups[groupKey];

                return (
                  <SidebarGroup key={groupKey}>
                    <SidebarGroupLabel
                      className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors"
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
            </CollapsibleContent>
          </Collapsible>
        ) : (
          /* Fallback for when collapsed or searching */
          <>
            {/* Header with delete all button (Only visible if searching? Or if sidebar collapsed but user wants to see header? No, usually hidden) */}
            {/* Keeping original logic: !isCollapsed && !searchQuery ... so logic matches above */}

            {/* Empty state (Outside collapsible if search/0 sessions) */}
            {sessions.length === 0 && !searchQuery && (
              <div className="px-4 py-8 text-center animate-in fade-in-0 duration-300">
                {!isCollapsed && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-full bg-muted/50">
                      <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {t('noConversations')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">{t('startNewChat')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Grouped sessions (Outside collapsible for search results) */}
            {/* If searching, Object.entries returns 'search' group. If not searching but state falls through, returns updated groups */}
            {Object.entries(groupedSessions).map(([groupKey, groupSessions]) => {
              if (groupSessions.length === 0) return null;
              // Don't show regular groups if we are in the "Collapsible Mode" but fell through (shouldn't happen due to if/else)
              // But if searching, show search results
              if (!searchQuery && !isCollapsed && sessions.length > 0) return null; // Already rendered in Collapsible

              const isCollapsedGroup = collapsedGroups[groupKey];

              return (
                <SidebarGroup key={groupKey}>
                  <SidebarGroupLabel
                    className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors"
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
          </>
        )}

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
          <div
            className="px-4 py-6 text-xs text-muted-foreground text-center"
            data-testid="search-empty"
          >
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

        {/* Agent Teams Widget */}
        <div className={isCollapsed ? 'px-1 pb-1' : 'px-2 pb-2'}>
          <SidebarAgentTeams collapsed={isCollapsed} />
        </div>

        {/* Quick Actions Widget */}
        {!isCollapsed && (
          <div className="px-2 pb-2">
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
        {!isCollapsed && <PluginExtensionPoint point="sidebar.left.bottom" className="px-2 pb-2" />}

        {/* Session Artifacts - quick access */}
        {!isCollapsed && activeSessionId && (
          <Collapsible
            open={!collapsedGroups['artifacts']}
            onOpenChange={() => toggleGroup('artifacts')}
            className="px-2 pb-2 border-b border-border/50"
          >
            <CollapsibleTrigger
              className={cn(
                'flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors',
                'group'
              )}
            >
              <span className="flex items-center gap-2">
                <Library className="h-4 w-4 text-blue-500" />
                <span>{t('sessionArtifacts') || 'Session Artifacts'}</span>
              </span>
              {!collapsedGroups['artifacts'] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ArtifactListCompact sessionId={activeSessionId} limit={5} />
            </CollapsibleContent>
          </Collapsible>
        )}
        {/* Quick access buttons - highlighted */}
        {/* Quick access buttons - highlighted */}
        {!isCollapsed && (
          <Collapsible
            open={!collapsedGroups['apps']}
            onOpenChange={() => toggleGroup('apps')}
            className="px-2 pb-2"
          >
            <CollapsibleTrigger
              className={cn(
                'flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors mb-2',
                'group'
              )}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-purple-500" />
                <span>{t('apps') || 'Apps'}</span>
              </span>
              {!collapsedGroups['apps'] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-2 gap-1.5">
                <Link href="/projects">
                  <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 min-w-0">
                    <FolderKanban className="h-4 w-4 shrink-0 text-blue-500" />
                    <span className="truncate">{t('projects')}</span>
                  </div>
                </Link>
                <Link href="/designer">
                  <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 min-w-0">
                    <Wand2 className="h-4 w-4 shrink-0 text-purple-500" />
                    <span className="truncate">{t('designer')}</span>
                  </div>
                </Link>
                <Link href="/skills">
                  <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 min-w-0">
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="truncate">{t('skills')}</span>
                  </div>
                </Link>
                <Link href="/workflows">
                  <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 min-w-0">
                    <Workflow className="h-4 w-4 shrink-0 text-green-500" />
                    <span className="truncate">{t('workflows')}</span>
                  </div>
                </Link>
                <Link href="/native-tools">
                  <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 min-w-0">
                    <Wrench className="h-4 w-4 shrink-0 text-orange-500" />
                    <span className="truncate">{t('nativeTools') || 'Native Tools'}</span>
                  </div>
                </Link>
                <Link href="/git">
                  <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 min-w-0">
                    <GitBranch className="h-4 w-4 shrink-0 text-cyan-500" />
                    <span className="truncate">Git</span>
                  </div>
                </Link>
                <Link href="/latex">
                  <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 min-w-0">
                    <FileCode className="h-4 w-4 shrink-0 text-teal-500" />
                    <span className="truncate">{t('latex') || 'LaTeX'}</span>
                  </div>
                </Link>
                <Link href="/scheduler">
                  <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 min-w-0">
                    <Calendar className="h-4 w-4 shrink-0 text-rose-500" />
                    <span className="truncate">{t('scheduler') || 'Scheduler'}</span>
                  </div>
                </Link>
                <Link href="/speedpass">
                  <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 min-w-0">
                    <GraduationCap className="h-4 w-4 shrink-0 text-indigo-500" />
                    <span className="truncate">{t('speedPass') || 'SpeedPass'}</span>
                  </div>
                </Link>
                <Link href="/academic">
                  <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 min-w-0">
                    <BookOpen className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="truncate">{t('academic') || 'Academic'}</span>
                  </div>
                </Link>
                <Link href="/sandbox">
                  <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 min-w-0">
                    <Terminal className="h-4 w-4 shrink-0 text-lime-500" />
                    <span className="truncate">{t('sandbox') || 'Sandbox'}</span>
                  </div>
                </Link>
              </div>
            </CollapsibleContent>
          </Collapsible>
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('latex') || 'LaTeX'}>
                  <Link href="/latex">
                    <FileCode className="h-4 w-4 text-teal-500" />
                    <span>LaTeX</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('scheduler') || 'Scheduler'}>
                  <Link href="/scheduler">
                    <Calendar className="h-4 w-4 text-rose-500" />
                    <span>Scheduler</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('speedPass') || 'SpeedPass'}>
                  <Link href="/speedpass">
                    <GraduationCap className="h-4 w-4 text-indigo-500" />
                    <span>SpeedPass</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('academic') || 'Academic'}>
                  <Link href="/academic">
                    <BookOpen className="h-4 w-4 text-emerald-500" />
                    <span>Academic</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('sandbox') || 'Sandbox'}>
                  <Link href="/sandbox">
                    <Terminal className="h-4 w-4 text-lime-500" />
                    <span>Sandbox</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
          <Collapsible open={!collapsedGroups['system']} onOpenChange={() => toggleGroup('system')}>
            <CollapsibleContent>
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
              {observabilitySettings?.enabled && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t('observability') || 'Observability'}>
                    <Link href="/observability">
                      <Activity className="h-4 w-4 text-emerald-500" />
                      <span>{t('observability') || 'Observability'}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </CollapsibleContent>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={t('settings')}>
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  <span>{t('settings')}</span>
                </Link>
              </SidebarMenuButton>
              <CollapsibleTrigger asChild>
                <SidebarMenuAction
                  data-testid="system-menu-toggle"
                  showOnHover
                  className="transition-transform duration-200"
                >
                  {collapsedGroups['system'] ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="sr-only">Toggle system menu</span>
                </SidebarMenuAction>
              </CollapsibleTrigger>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarFolder({
  folder,
  sessions,
}: {
  folder: import('@/types').ChatFolder;
  sessions: Session[];
}) {
  const t = useTranslations('sidebar');
  const updateFolder = useSessionStore((state) => state.updateFolder);
  const deleteFolder = useSessionStore((state) => state.deleteFolder);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  const handleRename = () => {
    if (editName.trim() && editName !== folder.name) {
      updateFolder(folder.id, { name: editName.trim() });
    } else {
      setEditName(folder.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditName(folder.name);
      setIsEditing(false);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel
        className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors group/folder"
        onClick={() => updateFolder(folder.id, { isExpanded: !folder.isExpanded })}
      >
        <span className="flex items-center gap-1">
          {folder.isExpanded ? (
            <FolderOpen className="h-3 w-3 text-blue-500" />
          ) : (
            <Folder className="h-3 w-3 text-blue-500" />
          )}
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="h-5 px-1 py-0 text-xs w-24"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span>{folder.name}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <SidebarMenuBadge>{sessions.length}</SidebarMenuBadge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 opacity-0 group-hover/folder:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                <Pencil className="h-3 w-3 mr-2" />
                {t('rename') || 'Rename'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFolder(folder.id);
                }}
              >
                <Trash2 className="h-3 w-3 mr-2" />
                {t('delete') || 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarGroupLabel>
      {folder.isExpanded && (
        <SidebarGroupContent>
          <SidebarMenu>
            {sessions.map((session) => (
              <SessionMenuItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
              />
            ))}
            {sessions.length === 0 && (
              <div className="px-8 py-2 text-xs text-muted-foreground italic">
                {t('emptyFolder') || 'Empty folder'}
              </div>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const updateSession = useSessionStore((state) => state.updateSession);
  const deleteSession = useSessionStore((state) => state.deleteSession);
  const duplicateSession = useSessionStore((state) => state.duplicateSession);
  const togglePinSession = useSessionStore((state) => state.togglePinSession);
  const setSessionCustomIcon = useSessionStore((state) => state.setSessionCustomIcon);
  const folders = useSessionStore((state) => state.folders) || [];
  const moveSessionToFolder = useSessionStore((state) => state.moveSessionToFolder);

  const [showIconPicker, setShowIconPicker] = useState(false);

  // Get project info for session
  const getProject = useProjectStore((state) => state.getProject);
  const getActiveProjects = useProjectStore((state) => state.getActiveProjects);
  const addSessionToProject = useProjectStore((state) => state.addSessionToProject);
  const removeSessionFromProject = useProjectStore((state) => state.removeSessionFromProject);
  const linkedProject = session.projectId ? getProject(session.projectId) : null;
  const activeProjects = useMemo(() => getActiveProjects(), [getActiveProjects]);

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

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit to 1MB
      if (file.size > 1024 * 1024) {
        alert('Image size must be less than 1MB'); // Use a proper toast in production
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSessionCustomIcon(session.id, base64String);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActive}
          onClick={handleClick}
          tooltip={session.title}
          className={snippet ? 'h-auto py-2' : undefined}
        >
          <div className="relative shrink-0">
            {session.customIcon ? (
              session.customIcon.startsWith('lucide:') ? (
                (() => {
                  const iconName = session.customIcon.split(':')[1];
                  //@ts-expect-error - LucideIcons is a record of components, indexing by string name is safe here
                  const Icon = LucideIcons[iconName];
                  return Icon ? (
                    <Icon className="h-4 w-4" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  );
                })()
              ) : (
                <Image
                  src={session.customIcon}
                  alt="icon"
                  width={16}
                  height={16}
                  className="rounded-sm object-cover"
                />
              )
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {session.pinned && (
              <Pin className="h-2.5 w-2.5 absolute -top-1 -right-1 text-primary" />
            )}
            {linkedProject && !session.pinned && (
              <div
                className="h-2 w-2 rounded-full absolute -bottom-0.5 -right-0.5 ring-1 ring-background"
                style={{ backgroundColor: linkedProject.color || '#3B82F6' }}
                title={linkedProject.name}
              />
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
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  {t('unpin')}
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  {t('pinToTop')}
                </>
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

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ImageIcon className="mr-2 h-4 w-4" />
                {t('changeIcon') || 'Change Icon'}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {t('uploadImage') || 'Upload Image'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowIconPicker(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('selectIcon') || 'Select Icon'}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {session.customIcon && (
              <DropdownMenuItem onClick={() => setSessionCustomIcon(session.id, undefined)}>
                <X className="mr-2 h-4 w-4" />
                {t('removeIcon') || 'Remove Icon'}
              </DropdownMenuItem>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleIconChange}
            />

            {/* Move to Folder */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Folder className="mr-2 h-4 w-4" />
                {t('moveToFolder') || 'Move to Folder'}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {session.folderId && (
                  <>
                    <DropdownMenuItem
                      onClick={() => moveSessionToFolder(session.id, null)}
                      className="text-muted-foreground"
                    >
                      <FolderOpen className="mr-2 h-4 w-4" />
                      {t('removeFromFolder') || 'Remove from Folder'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {folders.length > 0 ? (
                  folders
                    .filter((f) => f.id !== session.folderId)
                    .map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => moveSessionToFolder(session.id, folder.id)}
                      >
                        <Folder className="mr-2 h-4 w-4" />
                        <span className="truncate">{folder.name}</span>
                      </DropdownMenuItem>
                    ))
                ) : (
                  <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                    {t('noFolders') || 'No folders'}
                  </div>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            {/* Project submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderKanban className="mr-2 h-4 w-4" />
                {linkedProject ? linkedProject.name : t('moveToProject') || 'Move to Project'}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {linkedProject && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        removeSessionFromProject(session.projectId!, session.id);
                        updateSession(session.id, { projectId: undefined });
                      }}
                      className="text-muted-foreground"
                    >
                      {t('removeFromProject') || 'Remove from project'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {activeProjects.length > 0 ? (
                  activeProjects
                    .filter((p) => p.id !== session.projectId)
                    .map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => {
                          if (session.projectId) {
                            removeSessionFromProject(session.projectId, session.id);
                          }
                          addSessionToProject(project.id, session.id);
                          updateSession(session.id, { projectId: project.id });
                        }}
                      >
                        <span
                          className="mr-2 h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: project.color || '#3B82F6' }}
                        />
                        <span className="truncate">{project.name}</span>
                      </DropdownMenuItem>
                    ))
                ) : (
                  <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                    {t('noProjects') || 'No projects'}
                  </div>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

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
      <SidebarIconPicker
        open={showIconPicker}
        onOpenChange={setShowIconPicker}
        onSelect={(icon) => setSessionCustomIcon(session.id, icon)}
      />
    </>
  );
}

export default AppSidebar;
