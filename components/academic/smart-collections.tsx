'use client';

/**
 * SmartCollections - Auto-categorize papers into smart collections
 */

import { useMemo, useState, useCallback } from 'react';
import { Wand2, Loader2, Tag, Calendar, BookOpen, Star, Filter, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useAcademic } from '@/hooks/academic';
import { cn } from '@/lib/utils';

interface SmartCollectionRule {
  id: string;
  name: string;
  description: string;
  icon: typeof Wand2;
  color: string;
  enabled: boolean;
  matchCount: number;
  criteria: (paper: {
    year?: number;
    citationCount?: number;
    fieldsOfStudy?: string[];
    readingStatus?: string;
    userRating?: number;
    isOpenAccess?: boolean;
  }) => boolean;
}

interface SmartCollectionsProps {
  className?: string;
}

export function SmartCollections({ className }: SmartCollectionsProps) {
  const { libraryPapers, createCollection, addToCollection } = useAcademic();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [enabledRules, setEnabledRules] = useState<Record<string, boolean>>({
    recent: true,
    'highly-cited': true,
    'open-access': true,
    favorites: true,
    unread: true,
  });

  // Define smart collection rules
  const smartRules = useMemo((): SmartCollectionRule[] => {
    const currentYear = new Date().getFullYear();

    return [
      {
        id: 'recent',
        name: 'Recent Papers',
        description: 'Papers from the last 2 years',
        icon: Calendar,
        color: '#3b82f6',
        enabled: enabledRules['recent'] ?? true,
        matchCount: libraryPapers.filter((p) => (p.year || 0) >= currentYear - 2).length,
        criteria: (p) => (p.year || 0) >= currentYear - 2,
      },
      {
        id: 'highly-cited',
        name: 'Highly Cited',
        description: 'Papers with 100+ citations',
        icon: Star,
        color: '#f59e0b',
        enabled: enabledRules['highly-cited'] ?? true,
        matchCount: libraryPapers.filter((p) => (p.citationCount || 0) >= 100).length,
        criteria: (p) => (p.citationCount || 0) >= 100,
      },
      {
        id: 'open-access',
        name: 'Open Access',
        description: 'Freely accessible papers',
        icon: BookOpen,
        color: '#10b981',
        enabled: enabledRules['open-access'] ?? true,
        matchCount: libraryPapers.filter((p) => p.isOpenAccess).length,
        criteria: (p) => p.isOpenAccess === true,
      },
      {
        id: 'favorites',
        name: 'Favorites',
        description: 'Papers rated 4 stars or higher',
        icon: Star,
        color: '#ec4899',
        enabled: enabledRules['favorites'] ?? true,
        matchCount: libraryPapers.filter((p) => (p.userRating || 0) >= 4).length,
        criteria: (p) => (p.userRating || 0) >= 4,
      },
      {
        id: 'unread',
        name: 'Reading Queue',
        description: 'Papers marked as unread',
        icon: BookOpen,
        color: '#8b5cf6',
        enabled: enabledRules['unread'] ?? true,
        matchCount: libraryPapers.filter((p) => p.readingStatus === 'unread').length,
        criteria: (p) => p.readingStatus === 'unread',
      },
    ];
  }, [libraryPapers, enabledRules]);

  // Auto-detected topics from library
  const detectedTopics = useMemo(() => {
    const topicCounts: Record<string, number> = {};

    libraryPapers.forEach((paper) => {
      paper.fieldsOfStudy?.forEach((field) => {
        topicCounts[field] = (topicCounts[field] || 0) + 1;
      });
    });

    return Object.entries(topicCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic, count]) => ({ topic, count }));
  }, [libraryPapers]);

  const toggleRule = useCallback((ruleId: string) => {
    setEnabledRules((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }));
  }, []);

  const handleGenerateCollections = useCallback(async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const enabledSmartRules = smartRules.filter((r) => r.enabled && r.matchCount > 0);
      const totalSteps = enabledSmartRules.length + detectedTopics.length;
      let completed = 0;

      // Create smart rule collections
      for (const rule of enabledSmartRules) {
        try {
          const collection = await createCollection(
            `📁 ${rule.name}`,
            rule.description,
            rule.color
          );

          // Add matching papers
          for (const paper of libraryPapers) {
            if (rule.criteria(paper)) {
              await addToCollection(paper.id, collection.id);
            }
          }
        } catch {
          console.error(`Failed to create collection for ${rule.name}`);
        }

        completed++;
        setGenerationProgress((completed / totalSteps) * 100);
      }

      // Create topic collections
      for (const { topic } of detectedTopics) {
        try {
          const collection = await createCollection(
            `🏷️ ${topic}`,
            `Papers about ${topic}`,
            '#6b7280'
          );

          for (const paper of libraryPapers) {
            if (paper.fieldsOfStudy?.includes(topic)) {
              await addToCollection(paper.id, collection.id);
            }
          }
        } catch {
          console.error(`Failed to create collection for ${topic}`);
        }

        completed++;
        setGenerationProgress((completed / totalSteps) * 100);
      }
    } finally {
      setIsGenerating(false);
      setGenerationProgress(100);
    }
  }, [smartRules, detectedTopics, libraryPapers, createCollection, addToCollection]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-500" />
              Smart Collections
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-organize papers based on rules and topics
            </p>
          </div>
          <Button
            onClick={handleGenerateCollections}
            disabled={isGenerating || libraryPapers.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate Collections
              </>
            )}
          </Button>
        </div>

        {isGenerating && (
          <div className="mt-4 space-y-2">
            <Progress value={generationProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Creating collections... {Math.round(generationProgress)}%
            </p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Smart Rules */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Smart Rules
            </h4>
            <div className="grid gap-3">
              {smartRules.map((rule) => {
                const Icon = rule.icon;
                return (
                  <Card
                    key={rule.id}
                    className={cn('transition-opacity', !rule.enabled && 'opacity-50')}
                  >
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${rule.color}20` }}
                          >
                            <Icon className="h-4 w-4" style={{ color: rule.color }} />
                          </div>
                          <div>
                            <CardTitle className="text-sm">{rule.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {rule.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{rule.matchCount} papers</Badge>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => toggleRule(rule.id)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Detected Topics */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Detected Topics
            </h4>
            {detectedTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {detectedTopics.map(({ topic, count }) => (
                  <Badge key={topic} variant="secondary" className="text-sm py-1 px-3">
                    {topic}
                    <span className="ml-2 text-xs text-muted-foreground">({count})</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add more papers to detect common topics
              </p>
            )}
          </div>

          {/* Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Wand2 className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">How it works</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Enable the rules you want to use</li>
                    <li>Click &quot;Generate Collections&quot; to create collections</li>
                    <li>Papers will be automatically added based on criteria</li>
                    <li>Topic collections are created from common fields</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

export default SmartCollections;
