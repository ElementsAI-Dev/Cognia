'use client';

/**
 * PaperRecommendations - Suggest related papers based on library
 */

import { useMemo, useState, useCallback } from 'react';
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

interface RecommendationReason {
  type: 'author' | 'topic' | 'citation' | 'trending' | 'field';
  description: string;
}

interface RecommendedPaper extends Paper {
  reasons: RecommendationReason[];
  relevanceScore: number;
}

interface PaperRecommendationsProps {
  className?: string;
}

export function PaperRecommendations({ className }: PaperRecommendationsProps) {
  const { libraryPapers, addToLibrary, searchResults } = useAcademic();
  const [activeTab, setActiveTab] = useState<'related' | 'trending' | 'authors'>('related');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate recommendations based on library
  const recommendations = useMemo(() => {
    if (libraryPapers.length === 0) {
      return {
        related: [],
        trending: [],
        byAuthors: [],
      };
    }

    // Extract topics and authors from library
    const libraryTopics = new Set<string>();
    const libraryAuthors = new Map<string, number>();
    const libraryIds = new Set(libraryPapers.map((p) => p.id));

    libraryPapers.forEach((paper) => {
      paper.fieldsOfStudy?.forEach((field) => libraryTopics.add(field));
      paper.keywords?.forEach((kw) => libraryTopics.add(kw));
      paper.authors.forEach((author) => {
        const count = libraryAuthors.get(author.name) || 0;
        libraryAuthors.set(author.name, count + 1);
      });
    });

    // Filter search results to find related papers not in library
    const relatedPapers: RecommendedPaper[] = searchResults
      .filter((paper) => !libraryIds.has(paper.id))
      .map((paper) => {
        const reasons: RecommendationReason[] = [];
        let relevanceScore = 0;

        // Check topic overlap
        const topicOverlap = paper.fieldsOfStudy?.filter((f) => libraryTopics.has(f)) || [];
        if (topicOverlap.length > 0) {
          reasons.push({
            type: 'topic',
            description: `Related to: ${topicOverlap.slice(0, 2).join(', ')}`,
          });
          relevanceScore += topicOverlap.length * 10;
        }

        // Check author overlap
        const authorOverlap = paper.authors.filter((a) => libraryAuthors.has(a.name));
        if (authorOverlap.length > 0) {
          reasons.push({
            type: 'author',
            description: `By ${authorOverlap[0].name}`,
          });
          relevanceScore += authorOverlap.length * 15;
        }

        // High citation count
        if (paper.citationCount && paper.citationCount > 100) {
          reasons.push({
            type: 'citation',
            description: `${paper.citationCount.toLocaleString()} citations`,
          });
          relevanceScore += Math.log10(paper.citationCount) * 5;
        }

        return {
          ...paper,
          reasons,
          relevanceScore,
        };
      })
      .filter((p) => p.reasons.length > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    // Trending papers (high recent citations)
    const trendingPapers: RecommendedPaper[] = searchResults
      .filter((paper) => !libraryIds.has(paper.id))
      .filter((paper) => {
        const year = paper.year || 0;
        const currentYear = new Date().getFullYear();
        return year >= currentYear - 2 && (paper.citationCount || 0) > 50;
      })
      .map((paper) => ({
        ...paper,
        reasons: [
          {
            type: 'trending' as const,
            description: `Trending in ${paper.year}`,
          },
        ],
        relevanceScore:
          (paper.citationCount || 0) / Math.max(1, new Date().getFullYear() - (paper.year || 2000)),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    // Papers by favorite authors
    const favoriteAuthors = Array.from(libraryAuthors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    const byAuthorPapers: RecommendedPaper[] = searchResults
      .filter((paper) => !libraryIds.has(paper.id))
      .filter((paper) => paper.authors.some((a) => favoriteAuthors.includes(a.name)))
      .map((paper) => {
        const matchingAuthor = paper.authors.find((a) => favoriteAuthors.includes(a.name));
        return {
          ...paper,
          reasons: [
            {
              type: 'author' as const,
              description: `More from ${matchingAuthor?.name}`,
            },
          ],
          relevanceScore: favoriteAuthors.indexOf(matchingAuthor?.name || '') * -1 + 10,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    return {
      related: relatedPapers,
      trending: trendingPapers,
      byAuthors: byAuthorPapers,
    };
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
    setIsRefreshing(true);
    // Trigger a search based on library topics
    // This would normally call the backend
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const renderPaperList = (papers: RecommendedPaper[]) => {
    if (papers.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No recommendations available</p>
          <p className="text-sm mt-1">Add more papers to your library or search for papers</p>
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
              Recommendations
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Discover papers based on your library
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
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
              Related ({recommendations.related.length})
            </TabsTrigger>
            <TabsTrigger value="trending" className="text-sm">
              Trending ({recommendations.trending.length})
            </TabsTrigger>
            <TabsTrigger value="authors" className="text-sm">
              By Authors ({recommendations.byAuthors.length})
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
