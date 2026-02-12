'use client';

/**
 * AcademicChatPanel - Integrated chat panel for academic research
 * Combines AI chat with academic search, analysis, and library features
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Send,
  Brain,
  Loader2,
  MessageSquare,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ChevronUp,
  FileText,
  Presentation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useAcademic } from '@/hooks/academic/use-academic';
import type { Paper, PaperAnalysisType } from '@/types/academic';
import { AcademicPaperCard } from '@/components/a2ui/academic/academic-paper-card';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  papers?: Paper[];
  analysisType?: PaperAnalysisType;
}

export interface AcademicChatPanelProps {
  onPaperSelect?: (paper: Paper) => void;
  onAddToLibrary?: (paper: Paper) => void;
  initialQuery?: string;
  className?: string;
}

const QUICK_ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  search: Search,
  summarize: FileText,
  compare: ArrowRight,
  explain: Sparkles,
  ppt: Presentation,
};

export function AcademicChatPanel({
  onPaperSelect,
  onAddToLibrary,
  initialQuery,
  className,
}: AcademicChatPanelProps) {
  const t = useTranslations('academic.chatPanel');
  const {
    searchPapers,
    analyzePaperWithAI,
    isAnalyzing,
    addToLibrary,
    generatePresentationFromPaper,
    isGeneratingPPT,
  } = useAcademic();

  const quickActions = useMemo(
    () => [
      {
        id: 'search',
        label: t('actions.search'),
        icon: QUICK_ACTION_ICONS.search,
        prompt: t('prompts.search'),
      },
      {
        id: 'summarize',
        label: t('actions.summarize'),
        icon: QUICK_ACTION_ICONS.summarize,
        prompt: t('prompts.summarize'),
      },
      {
        id: 'compare',
        label: t('actions.compare'),
        icon: QUICK_ACTION_ICONS.compare,
        prompt: t('prompts.compare'),
      },
      {
        id: 'explain',
        label: t('actions.explain'),
        icon: QUICK_ACTION_ICONS.explain,
        prompt: t('prompts.explain'),
      },
      {
        id: 'ppt',
        label: t('actions.generatePPT'),
        icon: QUICK_ACTION_ICONS.ppt,
        prompt: t('prompts.generatePPT'),
      },
    ],
    [t]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialQuery || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedPapers, setSelectedPapers] = useState<Paper[]>([]);
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = useCallback(
    (role: 'user' | 'assistant', content: string, extra?: Partial<ChatMessage>) => {
      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role,
        content,
        timestamp: new Date(),
        ...extra,
      };
      setMessages((prev) => [...prev, message]);
      return message;
    },
    []
  );

  const handleSearch = useCallback(
    async (query: string) => {
      setIsLoading(true);
      setShowSuggestions(false);

      addMessage('user', query);

      try {
        const result = await searchPapers(query, {
          maxResults: 10,
          providers: ['arxiv', 'semantic-scholar'],
        });

        if (result.success && result.papers.length > 0) {
          const responseContent = `Found ${result.papers.length} papers for "${query}". Here are the results:`;
          addMessage('assistant', responseContent, { papers: result.papers });
        } else {
          addMessage(
            'assistant',
            `No papers found for "${query}". Try different search terms or check the spelling.`
          );
        }
      } catch (error) {
        addMessage(
          'assistant',
          `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [searchPapers, addMessage]
  );

  const handleAnalyze = useCallback(
    async (paper: Paper, analysisType: PaperAnalysisType = 'summary') => {
      setIsLoading(true);

      addMessage('user', `Analyze "${paper.title}" - ${analysisType}`);

      try {
        const result = await analyzePaperWithAI(paper, analysisType);

        if (result.success) {
          addMessage('assistant', result.analysis, { analysisType });

          if (result.suggestedQuestions && result.suggestedQuestions.length > 0) {
            addMessage(
              'assistant',
              `**Suggested follow-up questions:**\n${result.suggestedQuestions.map((q: string) => `- ${q}`).join('\n')}`
            );
          }
        } else {
          addMessage('assistant', `Analysis failed: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        addMessage(
          'assistant',
          `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [analyzePaperWithAI, addMessage]
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const query = input.trim();
      if (!query || isLoading) return;

      setInput('');

      const lowerQuery = query.toLowerCase();
      if (
        lowerQuery.includes('search') ||
        lowerQuery.includes('find') ||
        lowerQuery.includes('papers about')
      ) {
        const searchTerms = query
          .replace(
            /^(search|find|look for|get)\s+(papers?|articles?|research)?\s*(about|on|for)?\s*/i,
            ''
          )
          .trim();
        await handleSearch(searchTerms || query);
      } else if (lowerQuery.includes('analyze') || lowerQuery.includes('summarize')) {
        if (selectedPapers.length > 0) {
          await handleAnalyze(selectedPapers[0], 'summary');
        } else {
          addMessage(
            'assistant',
            'Please select a paper first or provide a paper title to analyze.'
          );
        }
      } else {
        await handleSearch(query);
      }
    },
    [input, isLoading, handleSearch, handleAnalyze, selectedPapers, addMessage]
  );

  const handleGeneratePPT = useCallback(
    async (papers: Paper[]) => {
      if (papers.length === 0) {
        addMessage('assistant', 'Please select at least one paper to generate a presentation.');
        return;
      }

      setIsLoading(true);
      addMessage('user', `Generate presentation from: ${papers.map((p) => p.title).join(', ')}`);

      try {
        const result = await generatePresentationFromPaper(papers, {
          style: 'academic',
          slideCount: 15,
          generateImages: true,
          includeNotes: true,
        });

        if (result.success && result.presentation) {
          addMessage(
            'assistant',
            `✅ Successfully generated presentation: **${result.presentation.title}**\n\n` +
              `- ${result.presentation.totalSlides} slides created\n` +
              `- Style: Academic\n` +
              `- Includes speaker notes\n\n` +
              `You can now view and edit the presentation in the PPT editor.`
          );
        } else {
          addMessage(
            'assistant',
            `Failed to generate presentation: ${result.error || 'Unknown error'}`
          );
        }
      } catch (error) {
        addMessage(
          'assistant',
          `Error generating presentation: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [generatePresentationFromPaper, addMessage]
  );

  const handleQuickAction = useCallback(
    (action: {
      id: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      prompt: string;
    }) => {
      if (action.id === 'ppt') {
        handleGeneratePPT(selectedPapers);
        return;
      }
      setInput(action.prompt);
      inputRef.current?.focus();
    },
    [handleGeneratePPT, selectedPapers]
  );

  const handleSuggestedQuery = useCallback(
    (query: string) => {
      setInput(query);
      handleSubmit();
    },
    [handleSubmit]
  );

  const handlePaperClick = useCallback(
    (paper: Paper) => {
      setSelectedPapers((prev) => {
        const exists = prev.some((p) => p.id === paper.id);
        if (exists) {
          return prev.filter((p) => p.id !== paper.id);
        }
        return [...prev, paper];
      });
      onPaperSelect?.(paper);
    },
    [onPaperSelect]
  );

  const handleAddToLibrary = useCallback(
    async (paper: Paper) => {
      try {
        await addToLibrary(paper);
        onAddToLibrary?.(paper);
        addMessage('assistant', t('addedToLibrary', { title: paper.title }));
      } catch (error) {
        addMessage(
          'assistant',
          `Failed to add paper to library: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [addToLibrary, onAddToLibrary, addMessage, t]
  );

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <GraduationCap className="h-5 w-5 text-primary" />
        <span className="font-semibold">{t('title')}</span>
        {selectedPapers.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {selectedPapers.length} {t('selected')}
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {messages.length === 0 && showSuggestions && (
            <div className="space-y-4">
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    {t('quickActions')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.id}
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => handleQuickAction(action)}
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {action.label}
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    {t('tryAsking')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    'Find recent papers on transformer architectures',
                    'What are the key papers on reinforcement learning from human feedback?',
                    'Search for papers about multimodal learning',
                    'Find open access papers on large language models',
                  ].map((query, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2 text-left text-sm"
                      onClick={() => handleSuggestedQuery(query)}
                    >
                      <Search className="h-3 w-3 mr-2 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-1">{query}</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-4 py-3',
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                </div>

                {message.papers && message.papers.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {(expandedMessageIds.has(message.id)
                      ? message.papers
                      : message.papers.slice(0, 5)
                    ).map((paper, idx) => (
                      <AcademicPaperCard
                        key={paper.id || idx}
                        paper={paper}
                        compact
                        onViewDetails={handlePaperClick}
                        onAddToLibrary={handleAddToLibrary}
                        onAnalyze={(p) => handleAnalyze(p, 'summary')}
                        isInLibrary={false}
                      />
                    ))}
                    {message.papers.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setExpandedMessageIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(message.id)) {
                              next.delete(message.id);
                            } else {
                              next.add(message.id);
                            }
                            return next;
                          });
                        }}
                      >
                        {expandedMessageIds.has(message.id)
                          ? t('showLess')
                          : t('showMore', { count: message.papers.length - 5 })}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{isAnalyzing ? t('analyzing') : t('searching')}</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {selectedPapers.length > 0 && (
        <Collapsible className="border-t">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between px-4 py-2 h-auto"
            >
              <span className="text-sm font-medium">
                {t('selectedPapers')} ({selectedPapers.length})
              </span>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {selectedPapers.map((paper) => (
                <Badge
                  key={paper.id}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handlePaperClick(paper)}
                >
                  {paper.title.slice(0, 30)}...
                  <span className="ml-1 text-muted-foreground">×</span>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => selectedPapers[0] && handleAnalyze(selectedPapers[0], 'summary')}
                disabled={isLoading || isGeneratingPPT}
              >
                <Brain className="h-3 w-3 mr-1" />
                {t('analyze')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGeneratePPT(selectedPapers)}
                disabled={isLoading || isGeneratingPPT || selectedPapers.length === 0}
              >
                {isGeneratingPPT ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Presentation className="h-3 w-3 mr-1" />
                )}
                {t('generatePPT')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedPapers([])}>
                {t('clear')}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <Separator />

      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
            className="min-h-[44px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-[44px] w-[44px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AcademicChatPanel;
