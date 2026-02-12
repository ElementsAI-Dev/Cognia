'use client';

/**
 * CitationGraph - Visualize citation network for a paper
 * Shows citations (papers that cite this paper) and references (papers this paper cites)
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Network,
  ArrowUp,
  ArrowDown,
  Loader2,
  ExternalLink,
  Users,
  Calendar,
  Quote,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Paper } from '@/types/academic';
import {
  buildCitationNetwork,
  type CitationNetwork,
  type CitationNode,
} from '@/lib/academic/citation-network';

interface CitationGraphProps {
  paper: Paper;
  onPaperClick?: (paperId: string, title: string) => void;
  className?: string;
}

export function CitationGraph({ paper, onPaperClick, className }: CitationGraphProps) {
  const t = useTranslations('academic.citationGraph');
  const [network, setNetwork] = useState<CitationNetwork | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'citations' | 'references'>('citations');
  const [showInfluentialOnly, setShowInfluentialOnly] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const loadCitationNetwork = useCallback(async () => {
    if (!paper) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await buildCitationNetwork(paper, {
        maxCitations: 100,
        maxReferences: 100,
      });
      setNetwork(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load citation network');
    } finally {
      setIsLoading(false);
    }
  }, [paper]);

  useEffect(() => {
    loadCitationNetwork();
  }, [loadCitationNetwork]);

  const filteredCitations =
    network?.citations.filter((c) => !showInfluentialOnly || c.isInfluential) || [];

  const filteredReferences =
    network?.references.filter((r) => !showInfluentialOnly || r.isInfluential) || [];

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderCitationNode = (node: CitationNode, _type: 'citation' | 'reference') => {
    const isExpanded = expandedNodes.has(node.paperId);

    return (
      <Card
        key={node.paperId}
        className={cn(
          'transition-all hover:shadow-md cursor-pointer',
          node.isInfluential && 'border-l-4 border-l-yellow-500'
        )}
      >
        <CardHeader className="py-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle
                className="text-sm font-medium line-clamp-2 hover:text-primary cursor-pointer"
                onClick={() => onPaperClick?.(node.paperId, node.title)}
              >
                {node.title}
              </CardTitle>
              <CardDescription className="text-xs mt-1 flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span className="truncate">
                  {node.authors.slice(0, 2).join(', ')}
                  {node.authors.length > 2 && ' et al.'}
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {node.isInfluential && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="secondary"
                        className="bg-yellow-500/10 text-yellow-600 text-xs"
                      >
                        ★
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{t('influentialCitation')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeExpansion(node.paperId);
                }}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 pb-3 px-4 space-y-2">
            {node.abstract && (
              <p className="text-xs text-muted-foreground line-clamp-3">{node.abstract}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {node.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {node.year}
                </span>
              )}
              {node.citationCount !== undefined && (
                <span className="flex items-center gap-1">
                  <Quote className="h-3 w-3" />
                  {node.citationCount.toLocaleString()} {t('citations')}
                </span>
              )}
              {node.venue && <span className="truncate max-w-[150px]">{node.venue}</span>}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onPaperClick?.(node.paperId, node.title)}
              >
                <Eye className="h-3 w-3 mr-1" />
                {t('viewDetails')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  window.open(`https://www.semanticscholar.org/paper/${node.paperId}`, '_blank')
                }
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {t('semanticScholar')}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t('loading')}</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Network className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={loadCitationNetwork}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (!network || (network.citations.length === 0 && network.references.length === 0)) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Network className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">{t('emptyState')}</p>
        <p className="text-sm text-muted-foreground mt-1">{t('emptyStateHint')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Stats */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="text-sm py-1 px-3">
          <ArrowUp className="h-3 w-3 mr-1" />
          {network.citationCount.toLocaleString()} cited by
        </Badge>
        <Badge variant="outline" className="text-sm py-1 px-3">
          <ArrowDown className="h-3 w-3 mr-1" />
          {network.referenceCount.toLocaleString()} references
        </Badge>
        {network.influentialCitationCount > 0 && (
          <Badge variant="secondary" className="text-sm py-1 px-3 bg-yellow-500/10 text-yellow-600">
            ★ {network.influentialCitationCount} influential
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="influential-only"
            checked={showInfluentialOnly}
            onCheckedChange={setShowInfluentialOnly}
          />
          <Label htmlFor="influential-only" className="text-sm cursor-pointer">
            {t('influentialOnly')}
          </Label>
        </div>
        <Button variant="ghost" size="sm" onClick={loadCitationNetwork}>
          <RefreshCw className="h-4 w-4 mr-1" />
          {t('refresh')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full">
          <TabsTrigger value="citations" className="flex-1">
            <ArrowUp className="h-4 w-4 mr-2" />
            {t('tabs.citations')} ({filteredCitations.length})
          </TabsTrigger>
          <TabsTrigger value="references" className="flex-1">
            <ArrowDown className="h-4 w-4 mr-2" />
            {t('tabs.references')} ({filteredReferences.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="citations" className="mt-4">
          <ScrollArea className="h-[400px]">
            {filteredCitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {showInfluentialOnly ? t('noInfluentialCitations') : t('noCitations')}
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {filteredCitations.map((node) => renderCitationNode(node, 'citation'))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="references" className="mt-4">
          <ScrollArea className="h-[400px]">
            {filteredReferences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {showInfluentialOnly ? t('noInfluentialReferences') : t('noReferences')}
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {filteredReferences.map((node) => renderCitationNode(node, 'reference'))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CitationGraph;
