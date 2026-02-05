'use client';

/**
 * Analytics Dashboard
 *
 * Learning analytics visualization for SpeedPass including:
 * - Study time charts
 * - Accuracy trends
 * - Knowledge point mastery heatmap
 * - Progress overview
 */

import { useMemo } from 'react';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface DailyStats {
  date: string;
  studyTimeMs: number;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number;
}


// ============================================================================
// Component
// ============================================================================

export function AnalyticsDashboard() {
  const store = useSpeedPassStore();
  const globalStats = store.globalStats;
  const sessions = Object.values(store.studySessions);
  const quizzes = Object.values(store.quizzes);
  const wrongQuestions = Object.values(store.wrongQuestions);

  // Calculate daily stats for the last 7 days
  const dailyStats = useMemo(() => {
    const stats: DailyStats[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const daySessions = sessions.filter((s) => {
        const sessionDate = new Date(s.startedAt).toISOString().split('T')[0];
        return sessionDate === dateStr;
      });

      const dayQuizzes = quizzes.filter((q) => {
        if (!q.completedAt) return false;
        const quizDate = new Date(q.completedAt).toISOString().split('T')[0];
        return quizDate === dateStr;
      });

      const studyTimeMs = daySessions.reduce((sum, s) => sum + (s.timeSpentMs || 0), 0);
      const questionsAttempted = dayQuizzes.reduce((sum, q) => sum + q.questions.length, 0);
      const questionsCorrect = dayQuizzes.reduce(
        (sum, q) => sum + q.questions.filter((qn) => qn.isCorrect).length,
        0
      );

      stats.push({
        date: dateStr,
        studyTimeMs,
        questionsAttempted,
        questionsCorrect,
        accuracy: questionsAttempted > 0 ? Math.round((questionsCorrect / questionsAttempted) * 100) : 0,
      });
    }

    return stats;
  }, [sessions, quizzes]);

  // Calculate knowledge mastery distribution
  const masteryDistribution = useMemo(() => {
    const knowledgePoints = Object.values(store.textbookKnowledgePoints).flat();
    const total = knowledgePoints.length;

    if (total === 0) {
      return { mastered: 0, learning: 0, notStarted: 100, total: 0 };
    }

    // Simplified mastery calculation based on quiz results
    const masteredIds = new Set<string>();
    const learningIds = new Set<string>();

    for (const quiz of quizzes) {
      for (const question of quiz.questions) {
        const kpId = question.sourceQuestion?.knowledgePointIds?.[0];
        if (!kpId) continue;

        if (question.isCorrect) {
          masteredIds.add(kpId);
        } else {
          learningIds.add(kpId);
          masteredIds.delete(kpId);
        }
      }
    }

    const mastered = Math.round((masteredIds.size / total) * 100);
    const learning = Math.round((learningIds.size / total) * 100);
    const notStarted = 100 - mastered - learning;

    return { mastered, learning, notStarted, total };
  }, [store.textbookKnowledgePoints, quizzes]);

  // Calculate streak info
  const streakInfo = useMemo(() => {
    const now = new Date();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const hasStudy = sessions.some((s) => {
        const sessionDate = new Date(s.startedAt).toISOString().split('T')[0];
        return sessionDate === dateStr;
      });

      if (hasStudy) {
        tempStreak++;
        if (i === 0 || currentStreak > 0) {
          currentStreak = tempStreak;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        if (i === 0) currentStreak = 0;
        tempStreak = 0;
      }
    }

    return { currentStreak, longestStreak };
  }, [sessions]);

  // Get max study time for chart scaling
  const maxStudyTime = useMemo(() => {
    return Math.max(...dailyStats.map((d) => d.studyTimeMs), 3600000); // Min 1 hour for scale
  }, [dailyStats]);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Clock}
          label="总学习时间"
          value={formatDuration(globalStats.totalStudyTimeMs)}
          trend={`本周 ${formatDuration(dailyStats.reduce((sum, d) => sum + d.studyTimeMs, 0))}`}
          color="text-blue-500"
        />
        <StatCard
          icon={Target}
          label="答题正确率"
          value={`${globalStats.averageAccuracy}%`}
          trend={`${globalStats.totalQuestionsCorrect}/${globalStats.totalQuestionsAttempted} 题`}
          color="text-green-500"
        />
        <StatCard
          icon={Flame}
          label="学习连续天数"
          value={`${streakInfo.currentStreak} 天`}
          trend={`最长记录 ${streakInfo.longestStreak} 天`}
          color="text-orange-500"
        />
        <StatCard
          icon={Trophy}
          label="完成测验"
          value={`${globalStats.quizzesCompleted}`}
          trend={`${globalStats.sessionsCompleted} 次学习`}
          color="text-purple-500"
        />
      </div>

      {/* Study Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            学习时间趋势
          </CardTitle>
          <CardDescription>过去7天的学习时间统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-end gap-2">
            {dailyStats.map((day) => {
              const height = maxStudyTime > 0 ? (day.studyTimeMs / maxStudyTime) * 100 : 0;
              const dayLabel = new Date(day.date).toLocaleDateString('zh-CN', { weekday: 'short' });

              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative w-full">
                    <div
                      className={cn(
                        'w-full rounded-t-md transition-all',
                        day.studyTimeMs > 0 ? 'bg-primary' : 'bg-muted'
                      )}
                      style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{dayLabel}</span>
                  <span className="text-xs font-medium">
                    {day.studyTimeMs > 0 ? formatShortDuration(day.studyTimeMs) : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Accuracy Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              正确率变化
            </CardTitle>
            <CardDescription>过去7天答题正确率</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyStats.map((day) => {
                const dayLabel = new Date(day.date).toLocaleDateString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-muted-foreground">{dayLabel}</span>
                    <div className="flex-1">
                      <Progress
                        value={day.accuracy}
                        className={cn(
                          'h-2',
                          day.accuracy >= 80
                            ? '[&>div]:bg-green-500'
                            : day.accuracy >= 60
                            ? '[&>div]:bg-yellow-500'
                            : '[&>div]:bg-red-500'
                        )}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium">
                      {day.questionsAttempted > 0 ? `${day.accuracy}%` : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Mastery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              知识掌握度
            </CardTitle>
            <CardDescription>
              共 {masteryDistribution.total} 个知识点
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <MasteryBar
                label="已掌握"
                percentage={masteryDistribution.mastered}
                color="bg-green-500"
                icon={CheckCircle2}
              />
              <MasteryBar
                label="学习中"
                percentage={masteryDistribution.learning}
                color="bg-yellow-500"
                icon={BookOpen}
              />
              <MasteryBar
                label="未开始"
                percentage={masteryDistribution.notStarted}
                color="bg-gray-300"
                icon={Clock}
              />
            </div>

            {masteryDistribution.total === 0 && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                开始学习后将显示掌握度统计
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Wrong Questions Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            错题分析
          </CardTitle>
          <CardDescription>
            共 {wrongQuestions.length} 道错题需要复习
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wrongQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500/50" />
              <p className="mt-4 text-muted-foreground">暂无错题记录</p>
              <p className="mt-1 text-sm text-muted-foreground">
                做练习时答错的题目会自动记录到错题本
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <WrongQuestionStat
                  label="需要复习"
                  count={wrongQuestions.filter((w) => w.reviewCount === 0).length}
                  color="text-red-500"
                />
                <WrongQuestionStat
                  label="复习中"
                  count={wrongQuestions.filter((w) => w.reviewCount > 0 && w.reviewCount < 3).length}
                  color="text-yellow-500"
                />
                <WrongQuestionStat
                  label="已掌握"
                  count={wrongQuestions.filter((w) => w.reviewCount >= 3).length}
                  color="text-green-500"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            最近活动
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground">
              暂无学习记录
            </div>
          ) : (
            <div className="space-y-3">
              {sessions
                .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
                .slice(0, 5)
                .map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {store.tutorials?.[session.tutorialId]?.title || '学习记录'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.startedAt).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatShortDuration(session.timeSpentMs || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.sectionsCompleted?.length || 0} 节完成
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  trend: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, trend, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-full bg-primary/10', color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MasteryBarProps {
  label: string;
  percentage: number;
  color: string;
  icon: React.ElementType;
}

function MasteryBar({ label, percentage, color, icon: Icon }: MasteryBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface WrongQuestionStatProps {
  label: string;
  count: number;
  color: string;
}

function WrongQuestionStat({ label, count, color }: WrongQuestionStatProps) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <p className={cn('text-2xl font-bold', color)}>{count}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDuration(ms: number): string {
  if (ms === 0) return '0分钟';

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  if (hours === 0) return `${minutes}分钟`;
  if (minutes === 0) return `${hours}小时`;
  return `${hours}小时${minutes}分`;
}

function formatShortDuration(ms: number): string {
  if (ms === 0) return '0m';

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes}m`;
}

export default AnalyticsDashboard;
