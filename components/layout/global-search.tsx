'use client';

/**
 * GlobalSearch - Search across all sessions and messages
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, X, MessageSquare, FolderKanban, Clock, FileText } from 'lucide-react';
import { messageRepository } from '@/lib/db';
import { Button as _Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { useSessionStore, useProjectStore, useUIStore } from '@/stores';
import { cn } from '@/lib/utils';

type SearchTab = 'all' | 'sessions' | 'projects' | 'messages';

interface SearchResult {
  type: 'session' | 'project' | 'message';
  id: string;
  title: string;
  description?: string;
  matchText?: string;
  updatedAt: Date;
  sessionId?: string; // For message results
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [messageResults, setMessageResults] = useState<SearchResult[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  const sessions = useSessionStore((state) => state.sessions);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);

  const projects = useProjectStore((state) => state.projects);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);

  const globalSearchOpen = useUIStore((state) => state.commandPaletteOpen);
  const setGlobalSearchOpen = useUIStore((state) => state.setCommandPaletteOpen);

  // Search messages in IndexedDB when query changes
  useEffect(() => {
    if (!query.trim() || (activeTab !== 'all' && activeTab !== 'messages')) {
      setMessageResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearchingMessages(true);
      try {
        const results = await messageRepository.searchMessages(query, { limit: 20 });
        const sessionMap = new Map(sessions.map((s) => [s.id, s]));

        setMessageResults(
          results.map((r) => ({
            type: 'message' as const,
            id: r.message.id,
            title: sessionMap.get(r.sessionId)?.title || 'Unknown Session',
            description: r.matchContext,
            matchText: r.matchContext,
            updatedAt: r.message.createdAt,
            sessionId: r.sessionId,
          }))
        );
      } catch (error) {
        console.error('Failed to search messages:', error);
        setMessageResults([]);
      } finally {
        setIsSearchingMessages(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(searchTimeout);
  }, [query, activeTab, sessions]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search sessions
    if (activeTab === 'all' || activeTab === 'sessions') {
      for (const session of sessions) {
        const titleMatch = session.title.toLowerCase().includes(lowerQuery);
        const previewMatch = session.lastMessagePreview?.toLowerCase().includes(lowerQuery);

        if (titleMatch || previewMatch) {
          results.push({
            type: 'session',
            id: session.id,
            title: session.title,
            description: session.lastMessagePreview,
            matchText: previewMatch ? session.lastMessagePreview : undefined,
            updatedAt: session.updatedAt,
          });
        }
      }
    }

    // Search projects
    if (activeTab === 'all' || activeTab === 'projects') {
      for (const project of projects) {
        const nameMatch = project.name.toLowerCase().includes(lowerQuery);
        const descMatch = project.description?.toLowerCase().includes(lowerQuery);

        if (nameMatch || descMatch) {
          results.push({
            type: 'project',
            id: project.id,
            title: project.name,
            description: project.description,
            matchText: descMatch ? project.description : undefined,
            updatedAt: project.updatedAt,
          });
        }
      }
    }

    // Include message results
    if (activeTab === 'all' || activeTab === 'messages') {
      results.push(...messageResults);
    }

    // Sort by updated date
    return results.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [query, activeTab, sessions, projects, messageResults]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      if (result.type === 'session') {
        setActiveSession(result.id);
      } else if (result.type === 'message' && result.sessionId) {
        setActiveSession(result.sessionId);
      } else {
        setActiveProject(result.id);
      }
      setGlobalSearchOpen(false);
      setQuery('');
    },
    [setActiveSession, setActiveProject, setGlobalSearchOpen]
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  };

  const sessionCount = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.lastMessagePreview?.toLowerCase().includes(query.toLowerCase())
      ).length,
    [sessions, query]
  );

  const projectCount = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.description?.toLowerCase().includes(query.toLowerCase())
      ).length,
    [projects, query]
  );

  const messageCount = messageResults.length;

  return (
    <Dialog open={globalSearchOpen} onOpenChange={setGlobalSearchOpen}>
      <DialogContent className="sm:max-w-[550px] p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <InputGroup className="border-0 shadow-none">
            <InputGroupAddon align="inline-start">
              <Search className="h-5 w-5" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sessions, projects..."
              className="text-lg h-10"
              autoFocus
            />
            {query && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </DialogHeader>

        {query.trim() && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as SearchTab)}
            className="w-full"
          >
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
              <TabsTrigger value="all" className="data-[state=active]:bg-transparent">
                All ({searchResults.length})
              </TabsTrigger>
              <TabsTrigger value="sessions" className="data-[state=active]:bg-transparent">
                Sessions ({sessionCount})
              </TabsTrigger>
              <TabsTrigger value="projects" className="data-[state=active]:bg-transparent">
                Projects ({projectCount})
              </TabsTrigger>
              <TabsTrigger value="messages" className="data-[state=active]:bg-transparent">
                Messages {isSearchingMessages ? '...' : `(${messageCount})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {searchResults.length > 0 ? (
                <ScrollArea className="max-h-[400px]">
                  <div className="p-2 space-y-1">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg transition-colors',
                          'hover:bg-accent focus:bg-accent focus:outline-none'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-lg shrink-0',
                              result.type === 'session'
                                ? 'bg-blue-500/10 text-blue-500'
                                : result.type === 'message'
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-purple-500/10 text-purple-500'
                            )}
                          >
                            {result.type === 'session' ? (
                              <MessageSquare className="h-4 w-4" />
                            ) : result.type === 'message' ? (
                              <FileText className="h-4 w-4" />
                            ) : (
                              <FolderKanban className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{result.title}</span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {result.type === 'session'
                                  ? 'Session'
                                  : result.type === 'message'
                                    ? 'Message'
                                    : 'Project'}
                              </Badge>
                            </div>
                            {result.description && (
                              <p className="text-sm text-muted-foreground truncate mt-0.5">
                                {result.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDate(result.updatedAt)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No results found for &quot;{query}&quot;</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!query.trim() && (
          <div className="p-4 space-y-4">
            {/* Recent Sessions */}
            {sessions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent Sessions</h3>
                <div className="space-y-1">
                  {sessions.slice(0, 5).map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setActiveSession(session.id);
                        setGlobalSearchOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-md hover:bg-accent flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{session.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(session.updatedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Projects */}
            {projects.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent Projects</h3>
                <div className="space-y-1">
                  {projects.slice(0, 3).map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setActiveProject(project.id);
                        setGlobalSearchOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-md hover:bg-accent flex items-center gap-2"
                    >
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑↓</kbd> to navigate
              <span className="mx-2">·</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Enter</kbd> to select
              <span className="mx-2">·</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Esc</kbd> to close
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default GlobalSearch;
