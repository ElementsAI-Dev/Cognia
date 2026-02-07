'use client';

/**
 * Analytics Dashboard
 *
 * Learning analytics visualization for SpeedPass including:
 * - Study time charts
 * - Accuracy trends
 * - Knowledge point mastery heatmap (via study-analyzer)
 * - Learning insights and predictions
 * - Smart recommendations
 * - Study report generation
 * - Progress overview
 */

import { useMemo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';
import {
  generateLearningInsights,
  generateRecommendations,
  analyzeKnowledgePointMastery,
  identifyWeakPoints,
  calculateStreak,
  type LearningInsights,
  type StudyRecommendation,
} from '@/lib/learning/speedpass/study-analyzer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  Lightbulb,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
import type { SpeedStudySession, Quiz, WrongQuestionRecord, TextbookKnowledgePoint } from '@/types/learning/speedpass';

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
  const sessions = Object.values(store.studySessions) as SpeedStudySession[];
  const quizzes = Object.values(store.quizzes) as Quiz[];
  const wrongQuestions = Object.values(store.wrongQuestions) as WrongQuestionRecord[];
  const knowledgePoints = useMemo(
    () => Object.values(store.textbookKnowledgePoints).flat() as TextbookKnowledgePoint[],
    [store.textbookKnowledgePoints]
  );
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

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

  // Learning insights from study-analyzer
  const insights: LearningInsights | null = useMemo(() => {
    if (sessions.length === 0 && quizzes.length === 0) return null;
    return generateLearningInsights(sessions, quizzes, wrongQuestions, knowledgePoints);
  }, [sessions, quizzes, wrongQuestions, knowledgePoints]);

  // Smart recommendations from study-analyzer
  const recommendations: StudyRecommendation[] = useMemo(() => {
    if (!insights) return [];
    const lastSession = sessions.length > 0
      ? sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]
      : undefined;
    return generateRecommendations(
      insights,
      wrongQuestions,
      lastSession ? new Date(lastSession.startedAt) : undefined
    );
  }, [insights, wrongQuestions, sessions]);

  // Knowledge mastery analysis via study-analyzer
  const masteryAnalysis = useMemo(() => {
    if (knowledgePoints.length === 0) {
      return { mastered: 0, learning: 0, notStarted: 100, total: 0, weakPoints: [] as TextbookKnowledgePoint[] };
    }

    const masteryMap = analyzeKnowledgePointMastery(knowledgePoints, quizzes, wrongQuestions);
    const weakPoints = identifyWeakPoints(masteryMap, knowledgePoints);

    let masteredCount = 0;
    let learningCount = 0;
    for (const [, data] of masteryMap) {
      if (data.mastery >= 80) masteredCount++;
      else if (data.attempts > 0) learningCount++;
    }

    const total = knowledgePoints.length;
    return {
      mastered: Math.round((masteredCount / total) * 100),
      learning: Math.round((learningCount / total) * 100),
      notStarted: Math.round(((total - masteredCount - learningCount) / total) * 100),
      total,
      weakPoints,
    };
  }, [knowledgePoints, quizzes, wrongQuestions]);

  // Calculate streak via study-analyzer
  const streakDays = useMemo(() => calculateStreak(sessions), [sessions]);

  // Get max study time for chart scaling
  const maxStudyTime = useMemo(() => {
    return Math.max(...dailyStats.map((d) => d.studyTimeMs), 3600000);
  }, [dailyStats]);

  // Generate study report
  const handleGenerateReport = useCallback(() => {
    setIsGeneratingReport(true);
    try {
      const report = store.generateStudyReport();
      toast.success('学习报告已生成', {
        description: `覆盖 ${report.knowledgePointsCovered} 个知识点，正确率 ${report.accuracy}%`,
      });
    } catch {
      toast.error('生成报告失败');
    } finally {
      setIsGeneratingReport(false);
    }
  }, [store]);

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
          value={`${streakDays} 天`}
          trend={`${globalStats.sessionsCompleted} 次学习`}
          color="text-orange-500"
        />
        <StatCard
          icon={Trophy}
          label="完成测验"
          value={`${globalStats.quizzesCompleted}`}
          trend={`${globalStats.tutorialsCompleted} 个教程`}
          color="text-purple-500"
        />
      </div>

      {/* Exam Readiness + Learning Patterns (from study-analyzer) */}
      {insights && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                考试准备度
              </CardTitle>
              <CardDescription>基于知识点掌握情况的预测分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative h-24 w-24">
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                    <circle
                      cx="50" cy="50" r="40" fill="none" strokeWidth="8"
                      strokeDasharray={`${insights.predictions.examReadiness * 2.51} 251`}
                      strokeLinecap="round"
                      className={cn(
                        insights.predictions.examReadiness >= 80 ? 'text-green-500' :
                        insights.predictions.examReadiness >= 60 ? 'text-yellow-500' : 'text-red-500'
                      )}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold">{insights.predictions.examReadiness}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">预测分数：</span>
                    <span className="font-semibold">
                      {insights.predictions.predictedScore.min}-{insights.predictions.predictedScore.max}分
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">置信度：</span>
                    <span className="font-semibold">
                      {Math.round(insights.predictions.confidence * 100)}%
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      insights.predictions.examReadiness >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      insights.predictions.examReadiness >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    )}
                  >
                    {insights.predictions.examReadiness >= 80 ? '准备充分' :
                     insights.predictions.examReadiness >= 60 ? '基本掌握' : '需要加强'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                学习模式分析
              </CardTitle>
              <CardDescription>你的学习习惯和偏好</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.learningPatterns.bestTimeOfDay && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">最佳学习时段</span>
                    <Badge variant="outline">{insights.learningPatterns.bestTimeOfDay}</Badge>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">平均每次学习</span>
                  <span className="font-medium">{insights.learningPatterns.averageSessionLength} 分钟</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">学习一致性</span>
                  <div className="flex items-center gap-2">
                    <Progress value={insights.learningPatterns.consistency} className="h-2 w-20" />
                    <span className="font-medium">{insights.learningPatterns.consistency}%</span>
                  </div>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  {insights.learningPatterns.consistency >= 70
                    ? '学习节奏保持得很好，继续坚持！'
                    : insights.learningPatterns.consistency >= 40
                    ? '建议提高学习频率，保持每日学习习惯'
                    : '学习频率较低，尝试设定每日固定学习时间'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Smart Recommendations (from study-analyzer) */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              智能学习建议
            </CardTitle>
            <CardDescription>根据你的学习数据生成的个性化建议</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-lg border p-4',
                    rec.priority === 'high' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30' :
                    rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30' :
                    'border-muted'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      rec.type === 'review' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50' :
                      rec.type === 'practice' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50' :
                      rec.type === 'new_content' ? 'bg-green-100 text-green-600 dark:bg-green-900/50' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-900/50'
                    )}>
                      {rec.type === 'review' ? <XCircle className="h-3.5 w-3.5" /> :
                       rec.type === 'practice' ? <Target className="h-3.5 w-3.5" /> :
                       rec.type === 'new_content' ? <BookOpen className="h-3.5 w-3.5" /> :
                       <Clock className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{rec.description}</p>
                      <ul className="mt-1.5 space-y-0.5">
                        {rec.actionItems.map((item, i) => (
                          <li key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1.5 text-xs text-muted-foreground">预计 {rec.estimatedTime} 分钟</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

        {/* Knowledge Mastery (via study-analyzer) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              知识掌握度
            </CardTitle>
            <CardDescription>
              共 {masteryAnalysis.total} 个知识点
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <MasteryBar
                label="已掌握"
                percentage={masteryAnalysis.mastered}
                color="bg-green-500"
                icon={CheckCircle2}
              />
              <MasteryBar
                label="学习中"
                percentage={masteryAnalysis.learning}
                color="bg-yellow-500"
                icon={BookOpen}
              />
              <MasteryBar
                label="未开始"
                percentage={masteryAnalysis.notStarted}
                color="bg-gray-300"
                icon={Clock}
              />
            </div>

            {masteryAnalysis.total === 0 && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                开始学习后将显示掌握度统计
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weak Points (from study-analyzer identifyWeakPoints) */}
      {masteryAnalysis.weakPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              薄弱知识点
            </CardTitle>
            <CardDescription>
              以下 {masteryAnalysis.weakPoints.length} 个知识点需要重点复习
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {masteryAnalysis.weakPoints.slice(0, 8).map((kp) => (
                <div key={kp.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        kp.importance === 'critical' ? 'border-red-300 text-red-600' :
                        kp.importance === 'high' ? 'border-orange-300 text-orange-600' :
                        'border-gray-300 text-gray-600'
                      )}
                    >
                      {kp.importance === 'critical' ? '核心' : kp.importance === 'high' ? '重要' : '一般'}
                    </Badge>
                    <span className="text-sm font-medium">{kp.title}</span>
                  </div>
                  <TrendingDown className="h-4 w-4 text-red-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strength Areas (from study-analyzer insights) */}
      {insights && insights.strengthAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-500" />
              优势领域
            </CardTitle>
            <CardDescription>掌握度较高的知识点</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {insights.strengthAreas.map((area) => (
                <div key={area.knowledgePointId} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">{area.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {area.accuracy}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wrong Questions Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            错题分析
          </CardTitle>
          <CardDescription>
            共 {wrongQuestions.length} 道错题
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
                  label="待复习"
                  count={wrongQuestions.filter((w) => w.status === 'new').length}
                  color="text-red-500"
                />
                <WrongQuestionStat
                  label="复习中"
                  count={wrongQuestions.filter((w) => w.status === 'reviewing').length}
                  color="text-yellow-500"
                />
                <WrongQuestionStat
                  label="已掌握"
                  count={wrongQuestions.filter((w) => w.status === 'mastered').length}
                  color="text-green-500"
                />
              </div>
              {/* Spaced repetition info */}
              {wrongQuestions.filter((w) => w.nextReviewAt && w.status !== 'mastered').length > 0 && (
                <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">间隔复习：</span>
                  {wrongQuestions.filter((w) => w.nextReviewAt && new Date(w.nextReviewAt) <= new Date() && w.status !== 'mastered').length} 道题目到期需要复习，
                  {wrongQuestions.filter((w) => w.nextReviewAt && new Date(w.nextReviewAt) > new Date() && w.status !== 'mastered').length} 道题目在未来安排复习
                </div>
              )}
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

      {/* Study Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            学习报告
          </CardTitle>
          <CardDescription>生成综合学习报告，总结学习进度和改进建议</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                已有 {store.studyReports?.length || 0} 份报告
              </p>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport || sessions.length === 0}
            >
              {isGeneratingReport ? '生成中...' : '生成报告'}
            </Button>
          </div>
          {/* Show recent reports */}
          {store.studyReports && store.studyReports.length > 0 && (
            <div className="mt-4 space-y-2">
              {store.studyReports
                .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
                .slice(0, 3)
                .map((report) => (
                  <div key={report.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(report.generatedAt).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.knowledgePointsCovered} 个知识点 · 正确率 {report.accuracy}% · 学习 {report.totalTimeSpentMinutes} 分钟
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.nextSteps && report.nextSteps.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {report.nextSteps.length} 项建议
                        </Badge>
                      )}
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
