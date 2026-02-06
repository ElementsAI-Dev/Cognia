'use client';

/**
 * PaperRecommendations - Suggest related papers based on library
 */

import { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Lightbulb,
  TrendingUp,
  Users,
  Calendar,
  Quote,
  Plus,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAcademic } from '@/hooks/academic';
import { cn } from '@/lib/utils';
import type { Paper } from '@/types/learning/academic';
import {
  scoreRecommendations,
  getTrendingInFields,
  getPapersByFavoriteAuthors,
  type RecommendedPaper,
} from '@/lib/academic/recommendation-engine';

interface PaperRecommendationsProps {
  className?: string;
}

export function PaperRecommendations({ className }: PaperRecommendationsProps) {
  const t = useTranslations('academic.paperRecommendations');
  const { libraryPapers, addToLibrary, searchResults, search } = useAcademic();
  const [activeTab, setActiveTab] = useState<'related' | 'trending' | 'authors'>('related');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate recommendations using the recommendation engine
  const recommendations = useMemo(() => {
    if (libraryPapers.length === 0 || searchResults.length === 0) {
      return {
        related: [] as RecommendedPaper[],
        trending: [] as RecommendedPaper[],
        byAuthors: [] as RecommendedPaper[],
      };
    }

    // Use the recommendation engine for scoring
    const related = scoreRecommendations(searchResults, libraryPapers, {
      maxResults: 15,
      minRelevanceScore: 10,
    });

    const trending = getTrendingInFields(searchResults, libraryPapers, 10);
    const byAuthors = getPapersByFavoriteAuthors(searchResults, libraryPapers, 10);

    return { related, trending, byAuthors };
  }, [libraryPapers, searchResults]);

  const handleAddToLibrary = useCallback(
    async (paper: Paper) => {
      try {
        await addToLibrary(paper);
      } catch (error) {
        console.error('Failed to add paper:', error);
      }
    },
    [addToLibrary]
  );

  const handleRefresh = useCallback(async () => {
    if (libraryPapers.length === 0) return;

    setIsRefreshing(true);
    try {
      // Get top topics from library to search for new recommendations
      const libraryTopics = new Set<string>();
      libraryPapers.forEach((paper) => {
        paper.fieldsOfStudy?.forEach((field) => libraryTopics.add(field));
        paper.keywords?.forEach((kw) => libraryTopics.add(kw));
      });

      const topTopics = Array.from(libraryTopics).slice(0, 3);
      if (topTopics.length > 0) {
        // Trigger search for each top topic to get fresh candidates
        await search(topTopics[0]);
      }
    } catch (error) {
      console.error('Failed to refresh recommendations:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [libraryPapers, search]);

  const renderPaperList = (papers: RecommendedPaper[]) => {
    if (papers.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('emptyState')}</p>
          <p className="text-sm mt-1">{t('emptyStateHint')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {papers.map((paper) => (
          <Card key={paper.id} className="hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium line-clamp-2">{paper.title}</CardTitle>
                  <CardDescription className="text-xs line-clamp-1">
                    {paper.authors
                      .slice(0, 3)
                      .map((a) => a.name)
                      .join(', ')}
                    {paper.authors.length > 3 && ' et al.'}
                  </CardDescription>
                </div>
                <div className="flex gap-1 shrink-0">
                  {paper.pdfUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(paper.pdfUrl!, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleAddToLibrary(paper)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 mb-2">
                {paper.reasons.map((reason, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className={cn(
                      'text-xs',
                      reason.type === 'trending' && 'bg-orange-500/10 text-orange-600',
                      reason.type === 'author' && 'bg-blue-500/10 text-blue-600',
                      reason.type === 'topic' && 'bg-green-500/10 text-green-600',
                      reason.type === 'citation' && 'bg-purple-500/10 text-purple-600'
                    )}
                  >
                    {reason.type === 'trending' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {reason.type === 'author' && <Users className="h-3 w-3 mr-1" />}
                    {reason.type === 'citation' && <Quote className="h-3 w-3 mr-1" />}
                    {reason.description}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {paper.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {paper.year}
                  </span>
                )}
                {paper.citationCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <Quote className="h-3 w-3" />
                    {paper.citationCount.toLocaleString()}
                  </span>
                )}
                <Badge variant="outline" className="text-xs">
                  {paper.providerId}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              {t('title')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            {t('refresh')}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="related" className="text-sm">
              {t('tabs.related')} ({recommendations.related.length})
            </TabsTrigger>
            <TabsTrigger value="trending" className="text-sm">
              {t('tabs.trending')} ({recommendations.trending.length})
            </TabsTrigger>
            <TabsTrigger value="authors" className="text-sm">
              {t('tabs.byAuthors')} ({recommendations.byAuthors.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="related" className="mt-0">
              {renderPaperList(recommendations.related)}
            </TabsContent>

            <TabsContent value="trending" className="mt-0">
              {renderPaperList(recommendations.trending)}
            </TabsContent>

            <TabsContent value="authors" className="mt-0">
              {renderPaperList(recommendations.byAuthors)}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export default PaperRecommendations;
