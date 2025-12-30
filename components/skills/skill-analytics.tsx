'use client';

/**
 * Skill Analytics Component
 * 
 * Displays usage statistics, success rates, and performance metrics for skills
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  Calendar,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSkillStore } from '@/stores/skill-store';
import { estimateSkillTokens } from '@/lib/skills/executor';
import type { Skill, SkillUsageStats } from '@/types/skill';

interface SkillAnalyticsProps {
  skillId?: string; // If provided, show analytics for single skill
}

interface AggregatedStats {
  totalSkills: number;
  enabledSkills: number;
  activeSkills: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  totalTokens: number;
  mostUsedSkills: Array<{ skill: Skill; stats: SkillUsageStats }>;
  recentlyUsedSkills: Array<{ skill: Skill; stats: SkillUsageStats }>;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatDate(date: Date, t: ReturnType<typeof useTranslations>): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return t('justNow');
  if (diff < 3600000) return t('minutesAgo', { count: Math.floor(diff / 60000) });
  if (diff < 86400000) return t('hoursAgo', { count: Math.floor(diff / 3600000) });
  if (diff < 604800000) return t('daysAgo', { count: Math.floor(diff / 86400000) });
  return date.toLocaleDateString();
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  className,
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${
            trend === 'up' ? 'bg-green-100 dark:bg-green-900' :
            trend === 'down' ? 'bg-red-100 dark:bg-red-900' :
            'bg-muted'
          }`}>
            <Icon className={`h-4 w-4 ${
              trend === 'up' ? 'text-green-600 dark:text-green-400' :
              trend === 'down' ? 'text-red-600 dark:text-red-400' :
              'text-muted-foreground'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SingleSkillAnalytics({ skill }: { skill: Skill }) {
  const t = useTranslations('skills');
  const { getSkillUsageStats } = useSkillStore();
  const stats = getSkillUsageStats(skill.id);
  const tokenCount = useMemo(() => estimateSkillTokens(skill), [skill]);

  const successRate = stats && stats.totalExecutions > 0
    ? (stats.successfulExecutions / stats.totalExecutions) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t('totalExecutions')}
          value={stats?.totalExecutions || 0}
          icon={Activity}
        />
        <StatCard
          title={t('successRate')}
          value={`${successRate.toFixed(0)}%`}
          icon={CheckCircle2}
          trend={successRate >= 80 ? 'up' : successRate >= 50 ? 'neutral' : 'down'}
        />
        <StatCard
          title={t('avgDuration')}
          value={formatDuration(stats?.averageExecutionTime || 0)}
          icon={Clock}
        />
        <StatCard
          title={t('tokenCost')}
          value={`~${tokenCount}`}
          subtitle={t('perExecution')}
          icon={Zap}
        />
      </div>

      {stats && stats.totalExecutions > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('executionHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>{t('successful')}</span>
                <span className="font-medium text-green-600">
                  {stats.successfulExecutions}
                </span>
              </div>
              <Progress value={successRate} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span>{t('failed')}</span>
                <span className="font-medium text-red-600">
                  {stats.totalExecutions - stats.successfulExecutions}
                </span>
              </div>
              {stats.lastExecutionAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <Calendar className="h-3 w-3" />
                  {t('lastUsed')}: {formatDate(stats.lastExecutionAt, t)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(!stats || stats.totalExecutions === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('noUsageDataYet')}</p>
            <p className="text-sm">{t('startUsingSkill')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OverallAnalytics() {
  const t = useTranslations('skills');
  const { skills, activeSkillIds, getSkillUsageStats } = useSkillStore();

  const aggregatedStats = useMemo((): AggregatedStats => {
    const allSkills = Object.values(skills);
    const skillsWithStats: Array<{ skill: Skill; stats: SkillUsageStats }> = [];

    let totalExecutions = 0;
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let totalExecutionTime = 0;
    let executionCount = 0;
    let totalTokens = 0;

    for (const skill of allSkills) {
      const stats = getSkillUsageStats(skill.id);
      totalTokens += estimateSkillTokens(skill);

      if (stats && stats.totalExecutions > 0) {
        skillsWithStats.push({ skill, stats });
        totalExecutions += stats.totalExecutions;
        successfulExecutions += stats.successfulExecutions;
        failedExecutions += stats.totalExecutions - stats.successfulExecutions;
        totalExecutionTime += stats.averageExecutionTime * stats.totalExecutions;
        executionCount += stats.totalExecutions;
      }
    }

    // Sort by most used
    const mostUsedSkills = [...skillsWithStats]
      .sort((a, b) => b.stats.totalExecutions - a.stats.totalExecutions)
      .slice(0, 5);

    // Sort by recently used
    const recentlyUsedSkills = [...skillsWithStats]
      .filter(s => s.stats.lastExecutionAt)
      .sort((a, b) => {
        const aTime = a.stats.lastExecutionAt?.getTime() || 0;
        const bTime = b.stats.lastExecutionAt?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    return {
      totalSkills: allSkills.length,
      enabledSkills: allSkills.filter(s => s.status === 'enabled').length,
      activeSkills: activeSkillIds.length,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime: executionCount > 0 ? totalExecutionTime / executionCount : 0,
      totalTokens,
      mostUsedSkills,
      recentlyUsedSkills,
    };
  }, [skills, activeSkillIds, getSkillUsageStats]);

  const overallSuccessRate = aggregatedStats.totalExecutions > 0
    ? (aggregatedStats.successfulExecutions / aggregatedStats.totalExecutions) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t('totalSkills')}
          value={aggregatedStats.totalSkills}
          subtitle={t('enabledCount', { count: aggregatedStats.enabledSkills })}
          icon={BarChart3}
        />
        <StatCard
          title={t('activeSkills')}
          value={aggregatedStats.activeSkills}
          subtitle={t('inCurrentSession')}
          icon={Zap}
        />
        <StatCard
          title={t('totalExecutions')}
          value={aggregatedStats.totalExecutions}
          icon={Activity}
        />
        <StatCard
          title={t('successRate')}
          value={`${overallSuccessRate.toFixed(0)}%`}
          icon={TrendingUp}
          trend={overallSuccessRate >= 80 ? 'up' : overallSuccessRate >= 50 ? 'neutral' : 'down'}
        />
      </div>

      {/* Token Budget */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {t('tokenBudget')}
          </CardTitle>
          <CardDescription>
            {t('estimatedTokenUsage')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('activeSkillsTokenUsage')}</span>
              <Badge variant="outline">
                ~{aggregatedStats.activeSkills > 0 
                  ? Math.round(aggregatedStats.totalTokens / aggregatedStats.totalSkills * aggregatedStats.activeSkills)
                  : 0} {t('tokens')}
              </Badge>
            </div>
            <Progress 
              value={Math.min((aggregatedStats.activeSkills / Math.max(aggregatedStats.enabledSkills, 1)) * 100, 100)} 
              className="h-2" 
            />
            <p className="text-xs text-muted-foreground">
              {t('ofEnabledSkillsActive', { active: aggregatedStats.activeSkills, enabled: aggregatedStats.enabledSkills })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Most Used Skills */}
      {aggregatedStats.mostUsedSkills.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('mostUsedSkills')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aggregatedStats.mostUsedSkills.map(({ skill, stats }) => (
                <div key={skill.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{skill.metadata.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {stats.totalExecutions} {t('uses')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {stats.successfulExecutions === stats.totalExecutions ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (stats.totalExecutions - stats.successfulExecutions) > stats.successfulExecutions ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Activity className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {((stats.successfulExecutions / stats.totalExecutions) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recently Used */}
      {aggregatedStats.recentlyUsedSkills.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('recentlyUsed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aggregatedStats.recentlyUsedSkills.map(({ skill, stats }) => (
                <div key={skill.id} className="flex items-center justify-between">
                  <span className="font-medium text-sm">{skill.metadata.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {stats.lastExecutionAt && formatDate(stats.lastExecutionAt, t)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {aggregatedStats.totalExecutions === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">{t('noUsageDataYet')}</p>
            <p className="text-sm">{t('noUsageDataDescription')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function SkillAnalytics({ skillId }: SkillAnalyticsProps) {
  const t = useTranslations('skills');
  const { skills } = useSkillStore();

  if (skillId) {
    const skill = skills[skillId];
    if (!skill) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('skillNotFound')}
          </CardContent>
        </Card>
      );
    }
    return <SingleSkillAnalytics skill={skill} />;
  }

  return <OverallAnalytics />;
}

export default SkillAnalytics;
