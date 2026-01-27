'use client';

/**
 * Learning History Panel
 * 
 * Displays completed learning sessions, achievements, and overall progress.
 */

import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  History,
  Calendar,
  Clock,
  Target,
  Trophy,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Award,
  Flame,
  Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/stores/learning';
import type { LearningSession, LearningAchievement } from '@/types/learning';

interface LearningHistoryPanelProps {
  onSelectSession?: (sessionId: string) => void;
  className?: string;
}

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  Rocket: <Star className="h-4 w-4" />,
  Flame: <Flame className="h-4 w-4" />,
  Crown: <Trophy className="h-4 w-4" />,
  Zap: <TrendingUp className="h-4 w-4" />,
  Mountain: <Target className="h-4 w-4" />,
  GraduationCap: <BookOpen className="h-4 w-4" />,
};

export const LearningHistoryPanel = memo(function LearningHistoryPanel({
  onSelectSession,
  className,
}: LearningHistoryPanelProps) {
  const t = useTranslations('learningMode');
  const { getCompletedSessions, getAchievements, globalStats } = useLearningStore();

  const completedSessions = getCompletedSessions();
  const achievements = getAchievements();

  // Sort sessions by completion date (newest first)
  const sortedSessions = useMemo(() => {
    return [...completedSessions].sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [completedSessions]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalTime = completedSessions.reduce(
      (acc, s) => acc + (s.statistics?.totalTimeSpentMs || 0),
      0
    );
    const totalQuestions = completedSessions.reduce(
      (acc, s) => acc + (s.statistics?.questionsAnswered || 0),
      0
    );
    const totalCorrect = completedSessions.reduce(
      (acc, s) => acc + (s.statistics?.correctAnswers || 0),
      0
    );
    const totalConcepts = completedSessions.reduce(
      (acc, s) => acc + (s.concepts?.filter((c) => c.masteryStatus === 'mastered').length || 0),
      0
    );

    return {
      totalSessions: completedSessions.length,
      totalTimeHours: Math.round(totalTime / 3600000 * 10) / 10,
      totalQuestions,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      conceptsMastered: totalConcepts,
      currentStreak: globalStats.currentStreak,
      longestStreak: globalStats.longestStreak,
    };
  }, [completedSessions, globalStats]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('history.overallProgress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-2xl font-bold">{overallStats.totalSessions}</p>
              <p className="text-xs text-muted-foreground">{t('history.sessionsCompleted')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{overallStats.totalTimeHours}h</p>
              <p className="text-xs text-muted-foreground">{t('history.totalTime')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{overallStats.accuracy}%</p>
              <p className="text-xs text-muted-foreground">{t('history.overallAccuracy')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{overallStats.conceptsMastered}</p>
              <p className="text-xs text-muted-foreground">{t('history.conceptsMastered')}</p>
            </div>
          </div>

          {/* Streak */}
          <div className="mt-4 flex items-center gap-4 p-3 bg-muted/50 rounded-md">
            <Flame className="h-6 w-6 text-orange-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('history.currentStreak')}</span>
                <span className="text-lg font-bold">{overallStats.currentStreak} {t('history.days')}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('history.longestStreak')}: {overallStats.longestStreak} {t('history.days')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              {t('history.achievements')}
            </CardTitle>
            <CardDescription>
              {achievements.length} {t('history.achievementsEarned')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {achievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            {t('history.recentSessions')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedSessions.length === 0 ? (
            <div className="text-center py-6">
              <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('history.noSessions')}</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {sortedSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    formatDate={formatDate}
                    formatDuration={formatDuration}
                    onSelect={onSelectSession ? () => onSelectSession(session.id) : undefined}
                    t={t}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

interface AchievementCardProps {
  achievement: LearningAchievement;
}

const AchievementCard = memo(function AchievementCard({ achievement }: AchievementCardProps) {
  const icon = ACHIEVEMENT_ICONS[achievement.iconName] || <Award className="h-4 w-4" />;
  
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
      <div className="p-1.5 rounded-full bg-yellow-500/20 text-yellow-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{achievement.name}</p>
        <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>
      </div>
    </div>
  );
});

interface SessionCardProps {
  session: LearningSession;
  formatDate: (date: Date | undefined) => string;
  formatDuration: (ms: number) => string;
  onSelect?: () => void;
  t: ReturnType<typeof useTranslations>;
}

const SessionCard = memo(function SessionCard({
  session,
  formatDate,
  formatDuration,
  onSelect,
  t,
}: SessionCardProps) {
  const duration = session.statistics?.totalTimeSpentMs || 0;
  const accuracy = session.statistics?.questionsAnswered
    ? Math.round((session.statistics.correctAnswers / session.statistics.questionsAnswered) * 100)
    : 0;
  const conceptsMastered = session.concepts?.filter((c) => c.masteryStatus === 'mastered').length || 0;

  return (
    <div
      className={cn(
        'p-3 rounded-md border hover:bg-muted/50 transition-colors',
        onSelect && 'cursor-pointer'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{session.topic}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(session.completedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </span>
          </div>
        </div>
        {onSelect && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Badge variant="secondary" className="text-xs">
          <Target className="h-3 w-3 mr-1" />
          {accuracy}%
        </Badge>
        {conceptsMastered > 0 && (
          <Badge variant="secondary" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {conceptsMastered} {t('history.concepts')}
          </Badge>
        )}
        {session.progress === 100 && (
          <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
            {t('history.completed')}
          </Badge>
        )}
      </div>
    </div>
  );
});

export default LearningHistoryPanel;
