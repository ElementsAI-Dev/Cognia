'use client';

/**
 * Learning Statistics Panel
 * 
 * Displays learning statistics, achievements, and progress visualization.
 */

import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  Clock,
  Target,
  Zap,
  Flame,
  Trophy,
  TrendingUp,
  Brain,
  Award,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LearningSession, LearningAchievement, DifficultyLevel } from '@/types/learning';

interface LearningStatisticsPanelProps {
  session: LearningSession;
  achievements?: LearningAchievement[];
  className?: string;
}

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  beginner: 'bg-green-500',
  intermediate: 'bg-blue-500',
  advanced: 'bg-orange-500',
  expert: 'bg-red-500',
};

// DIFFICULTY_LABELS moved to use i18n in component

export const LearningStatisticsPanel = memo(function LearningStatisticsPanel({
  session,
  achievements = [],
  className,
}: LearningStatisticsPanelProps) {
  const t = useTranslations('learningMode');

  const stats = session.statistics;

  // Calculate derived statistics
  const accuracy = useMemo(() => {
    if (stats.questionsAnswered === 0) return 0;
    return Math.round((stats.correctAnswers / stats.questionsAnswered) * 100);
  }, [stats.questionsAnswered, stats.correctAnswers]);

  const avgResponseTimeSec = useMemo(() => {
    return Math.round(stats.averageResponseTimeMs / 1000);
  }, [stats.averageResponseTimeMs]);

  const totalTimeMin = useMemo(() => {
    return Math.round(stats.totalTimeSpentMs / 60000);
  }, [stats.totalTimeSpentMs]);

  const masteredConcepts = useMemo(() => {
    return session.concepts.filter((c) => c.masteryStatus === 'mastered').length;
  }, [session.concepts]);

  const _learningConcepts = useMemo(() => {
    return session.concepts.filter((c) => c.masteryStatus === 'learning' || c.masteryStatus === 'practicing').length;
  }, [session.concepts]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Clock className="h-4 w-4 text-blue-500" />}
          label={t('stats.timeSpent')}
          value={`${totalTimeMin}m`}
        />
        <StatCard
          icon={<Target className="h-4 w-4 text-green-500" />}
          label={t('stats.accuracy')}
          value={`${accuracy}%`}
          trend={accuracy >= 70 ? 'up' : accuracy < 50 ? 'down' : 'neutral'}
        />
        <StatCard
          icon={<Zap className="h-4 w-4 text-yellow-500" />}
          label={t('stats.avgResponse')}
          value={`${avgResponseTimeSec}s`}
        />
        <StatCard
          icon={<Brain className="h-4 w-4 text-purple-500" />}
          label={t('stats.conceptsLearned')}
          value={`${masteredConcepts}/${session.concepts.length}`}
        />
      </div>

      {/* Difficulty Level */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('stats.currentDifficulty')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', DIFFICULTY_COLORS[session.currentDifficulty])} />
            <span className="font-medium">{t(`stats.difficulty.${session.currentDifficulty}`)}</span>
            {session.adaptiveAdjustments > 0 && (
              <Badge variant="secondary" className="text-xs">
                {session.adaptiveAdjustments} {t('stats.adjustments')}
              </Badge>
            )}
          </div>
          <div className="flex gap-1 mt-2">
            {(['beginner', 'intermediate', 'advanced', 'expert'] as DifficultyLevel[]).map((level) => (
              <div
                key={level}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-colors',
                  level === session.currentDifficulty
                    ? DIFFICULTY_COLORS[level]
                    : 'bg-muted'
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engagement Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flame className="h-4 w-4" />
            {t('stats.engagement')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Progress value={session.engagementScore} className="flex-1 h-2" />
            <span className="text-sm font-medium w-10 text-right">
              {session.engagementScore}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {session.engagementScore >= 70
              ? t('stats.engagementHigh')
              : session.engagementScore >= 40
              ? t('stats.engagementMedium')
              : t('stats.engagementLow')}
          </p>
        </CardContent>
      </Card>

      {/* Concept Mastery */}
      {session.concepts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              {t('stats.conceptMastery')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {session.concepts.slice(0, 5).map((concept) => (
              <div key={concept.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs truncate">{concept.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {concept.masteryScore}%
                    </span>
                  </div>
                  <Progress value={concept.masteryScore} className="h-1" />
                </div>
                {concept.masteryStatus === 'mastered' && (
                  <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                )}
              </div>
            ))}
            {session.concepts.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                {t('stats.moreConcepts', { count: session.concepts.length - 5 })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Answer Streak */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('stats.currentStreak')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-lg font-bold">{session.consecutiveCorrect}</span>
              <span className="text-xs text-muted-foreground">{t('stats.correct')}</span>
            </div>
            {session.consecutiveIncorrect > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-lg font-bold">{session.consecutiveIncorrect}</span>
                <span className="text-xs text-muted-foreground">{t('stats.incorrect')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              {t('stats.achievements')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {achievements.map((achievement) => (
                <Badge
                  key={achievement.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <Award className="h-3 w-3" />
                  {achievement.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard = memo(function StatCard({ icon, label, value, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          {icon}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <div className="flex items-center gap-1">
              <p className="text-lg font-bold">{value}</p>
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
              {trend === 'down' && <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default LearningStatisticsPanel;
