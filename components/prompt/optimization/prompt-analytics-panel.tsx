'use client';

/**
 * PromptAnalyticsPanel - Panel displaying optimization history, stats, and insights
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { usePromptOptimizer } from '@/hooks/ai/use-prompt-optimizer';
import type { PromptTemplate, PromptFeedback } from '@/types/content/prompt-template';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  History,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';

interface PromptAnalyticsPanelProps {
  template: PromptTemplate;
}

export function PromptAnalyticsPanel({ template }: PromptAnalyticsPanelProps) {
  const t = useTranslations('promptAnalytics');
  
  const { feedback } = usePromptOptimizer({ templateId: template.id });
  
  // Calculate stats
  const stats = useMemo(() => {
    if (feedback.length === 0) {
      return {
        totalUses: 0,
        averageRating: 0,
        successRate: 0,
        excellentCount: 0,
        goodCount: 0,
        averageCount: 0,
        poorCount: 0,
        avgResponseTime: 0,
        recentTrend: 0,
      };
    }
    
    const totalUses = feedback.length;
    const averageRating = feedback.reduce((sum, f) => sum + f.rating, 0) / totalUses;
    
    const excellentCount = feedback.filter(f => f.effectiveness === 'excellent').length;
    const goodCount = feedback.filter(f => f.effectiveness === 'good').length;
    const averageCount = feedback.filter(f => f.effectiveness === 'average').length;
    const poorCount = feedback.filter(f => f.effectiveness === 'poor').length;
    
    const successRate = (excellentCount + goodCount) / totalUses;
    
    const responseTimes = feedback
      .filter(f => f.context?.responseTime)
      .map(f => f.context!.responseTime!);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    // Calculate trend from last 10 vs previous 10
    const recentFeedback = feedback.slice(-10);
    const previousFeedback = feedback.slice(-20, -10);
    const recentAvg = recentFeedback.length > 0 
      ? recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length 
      : 0;
    const previousAvg = previousFeedback.length > 0 
      ? previousFeedback.reduce((sum, f) => sum + f.rating, 0) / previousFeedback.length 
      : recentAvg;
    const recentTrend = recentAvg - previousAvg;
    
    return {
      totalUses,
      averageRating,
      successRate,
      excellentCount,
      goodCount,
      averageCount,
      poorCount,
      avgResponseTime,
      recentTrend,
    };
  }, [feedback]);
  
  // Recent feedback
  const recentFeedback = useMemo(() => 
    feedback.slice(-5).reverse(),
    [feedback]
  );
  
  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              'h-3 w-3',
              i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
            )}
          />
        ))}
      </div>
    );
  };
  
  // Render effectiveness badge
  const renderEffectiveness = (effectiveness: PromptFeedback['effectiveness']) => {
    const config = {
      excellent: { color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle2 },
      good: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: ThumbsUp },
      average: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: Activity },
      poor: { color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: XCircle },
    };
    const { color, icon: Icon } = config[effectiveness];
    
    return (
      <Badge variant="outline" className={cn('text-xs gap-1', color)}>
        <Icon className="h-3 w-3" />
        {t(`effectivenessOptions.${effectiveness}`)}
      </Badge>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total Uses */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Activity className="h-3.5 w-3.5" />
                  {t('totalUses')}
                </div>
                <div className="text-2xl font-bold">{stats.totalUses}</div>
              </div>
              
              {/* Average Rating */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Star className="h-3.5 w-3.5" />
                  {t('avgRating')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">/5</span>
                </div>
              </div>
              
              {/* Success Rate */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Zap className="h-3.5 w-3.5" />
                  {t('successRate')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{(stats.successRate * 100).toFixed(0)}%</span>
                  {stats.recentTrend !== 0 && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs gap-0.5',
                        stats.recentTrend > 0 
                          ? 'text-green-600 border-green-500/30' 
                          : 'text-red-600 border-red-500/30'
                      )}
                    >
                      {stats.recentTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {stats.recentTrend > 0 ? '+' : ''}{stats.recentTrend.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Avg Response Time */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  {t('avgResponseTime')}
                </div>
                <div className="text-2xl font-bold">
                  {stats.avgResponseTime > 0 
                    ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` 
                    : '-'
                  }
                </div>
              </div>
            </div>
            
            {/* Effectiveness Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t('effectivenessBreakdown')}
              </h4>
              
              <div className="space-y-2">
                {/* Excellent */}
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">{t('effectivenessOptions.excellent')}</span>
                  <Progress 
                    value={stats.totalUses > 0 ? (stats.excellentCount / stats.totalUses) * 100 : 0} 
                    className="h-2 flex-1" 
                  />
                  <span className="w-10 text-xs text-right">{stats.excellentCount}</span>
                </div>
                
                {/* Good */}
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">{t('effectivenessOptions.good')}</span>
                  <Progress 
                    value={stats.totalUses > 0 ? (stats.goodCount / stats.totalUses) * 100 : 0} 
                    className="h-2 flex-1" 
                  />
                  <span className="w-10 text-xs text-right">{stats.goodCount}</span>
                </div>
                
                {/* Average */}
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">{t('effectivenessOptions.average')}</span>
                  <Progress 
                    value={stats.totalUses > 0 ? (stats.averageCount / stats.totalUses) * 100 : 0} 
                    className="h-2 flex-1" 
                  />
                  <span className="w-10 text-xs text-right">{stats.averageCount}</span>
                </div>
                
                {/* Poor */}
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">{t('effectivenessOptions.poor')}</span>
                  <Progress 
                    value={stats.totalUses > 0 ? (stats.poorCount / stats.totalUses) * 100 : 0} 
                    className="h-2 flex-1" 
                  />
                  <span className="w-10 text-xs text-right">{stats.poorCount}</span>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Optimization History */}
            {template.versionHistory && template.versionHistory.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {t('versionHistory')}
                </h4>
                
                <div className="space-y-2">
                  {template.versionHistory.slice(-5).reverse().map((version) => (
                    <div 
                      key={version.id} 
                      className="flex items-center justify-between rounded-lg border p-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          v{version.version}
                        </Badge>
                        {version.changelog && (
                          <span className="text-muted-foreground text-xs truncate max-w-[200px]">
                            {version.changelog}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent Feedback */}
            {recentFeedback.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t('recentFeedback')}
                </h4>
                
                <div className="space-y-2">
                  {recentFeedback.map((fb) => (
                    <div 
                      key={fb.id} 
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {renderStars(fb.rating)}
                          {renderEffectiveness(fb.effectiveness)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(fb.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {fb.comment && (
                        <p className="text-sm text-muted-foreground">{fb.comment}</p>
                      )}
                      {fb.context?.model && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Model: {fb.context.model}</span>
                          {fb.context.responseTime && (
                            <span>• {(fb.context.responseTime / 1000).toFixed(2)}s</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Empty State */}
            {feedback.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('noData')}</p>
                <p className="text-sm">{t('startCollecting')}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default PromptAnalyticsPanel;
