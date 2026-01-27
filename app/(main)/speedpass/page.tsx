'use client';

/**
 * SpeedPass - Speed Learning Mode
 * 
 * Main page for the SpeedPass learning platform featuring:
 * - Textbook library management
 * - Speed learning tutorials (极速/速成/全面 modes)
 * - Quiz and practice system
 * - Wrong question book
 * - Study analytics and reports
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen,
  GraduationCap,
  Brain,
  Target,
  Clock,
  TrendingUp,
  FileText,
  AlertCircle,
  Play,
  Plus,
  Settings,
  BarChart3,
} from 'lucide-react';
import { useSpeedPassStore, type SpeedPassState } from '@/stores/learning/speedpass-store';
import { cn } from '@/lib/utils';

// ============================================================================
// Main Component
// ============================================================================

export default function SpeedPassPage() {
  const t = useTranslations('learningMode.speedpass.page');
  const [activeTab, setActiveTab] = useState('overview');
  const store = useSpeedPassStore();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{t('title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              {t('settings')}
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t('addTextbook')}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b px-6">
            <TabsList className="h-12 bg-transparent p-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Target className="mr-2 h-4 w-4" />
                {t('tabs.overview')}
              </TabsTrigger>
              <TabsTrigger
                value="textbooks"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {t('tabs.textbooks')}
              </TabsTrigger>
              <TabsTrigger
                value="tutorials"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <FileText className="mr-2 h-4 w-4" />
                {t('tabs.tutorials')}
              </TabsTrigger>
              <TabsTrigger
                value="quiz"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Brain className="mr-2 h-4 w-4" />
                {t('tabs.quiz')}
              </TabsTrigger>
              <TabsTrigger
                value="wrong-book"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                {t('tabs.wrongBook')}
                {Object.keys(store.wrongQuestions).length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                    {Object.keys(store.wrongQuestions).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                {t('tabs.analytics')}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[calc(100%-3rem)]">
            <div className="p-6">
              <TabsContent value="overview" className="mt-0">
                <OverviewTab store={store} />
              </TabsContent>

              <TabsContent value="textbooks" className="mt-0">
                <TextbooksTab />
              </TabsContent>

              <TabsContent value="tutorials" className="mt-0">
                <TutorialsTab />
              </TabsContent>

              <TabsContent value="quiz" className="mt-0">
                <QuizTab />
              </TabsContent>

              <TabsContent value="wrong-book" className="mt-0">
                <WrongBookTab />
              </TabsContent>

              <TabsContent value="analytics" className="mt-0">
                <AnalyticsTab />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

interface OverviewTabProps {
  store: SpeedPassState;
}

function OverviewTab({ store }: OverviewTabProps) {
  const globalStats = store.globalStats;
  const textbookCount = Object.keys(store.textbooks).length;
  const tutorialCount = Object.keys(store.tutorials).length;
  const activeSession = store.currentSessionId ? store.studySessions[store.currentSessionId] : null;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Clock}
          label="累计学习时间"
          value={formatStudyTime(globalStats.totalStudyTimeMs)}
          trend={`${globalStats.currentStreak} 天连续`}
        />
        <StatCard
          icon={BookOpen}
          label="教材数量"
          value={textbookCount.toString()}
          trend={`${tutorialCount} 个教程`}
        />
        <StatCard
          icon={Target}
          label="答题正确率"
          value={`${globalStats.averageAccuracy}%`}
          trend={`${globalStats.totalQuestionsAttempted} 题`}
        />
        <StatCard
          icon={TrendingUp}
          label="完成测验"
          value={globalStats.quizzesCompleted.toString()}
          trend={`${globalStats.sessionsCompleted} 次学习`}
        />
      </div>

      {/* Active Session */}
      {activeSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              正在进行的学习
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {store.tutorials[activeSession.tutorialId]?.title || '学习中'}
                </p>
                <p className="text-sm text-muted-foreground">
                  已完成 {activeSession.sectionsCompleted.length} 个知识点
                </p>
              </div>
              <Button>继续学习</Button>
            </div>
            <Progress value={activeSession.sectionsCompleted.length > 0 ? Math.min(activeSession.sectionsCompleted.length * 10, 100) : 0} className="mt-4" />
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <QuickActionCard
          icon={GraduationCap}
          title="极速模式"
          description="1-2小时快速掌握核心考点"
          duration="1-2h"
          color="text-red-500"
          bgColor="bg-red-500/10"
        />
        <QuickActionCard
          icon={BookOpen}
          title="速成模式"
          description="2-4小时系统学习重点内容"
          duration="2-4h"
          color="text-orange-500"
          bgColor="bg-orange-500/10"
        />
        <QuickActionCard
          icon={Brain}
          title="全面模式"
          description="6-12小时深入学习全部内容"
          duration="6-12h"
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>最近学习</CardTitle>
          <CardDescription>继续上次的学习进度</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(store.tutorials).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">还没有学习记录</p>
              <Button className="mt-4" variant="outline">
                添加教材开始学习
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {(Object.values(store.tutorials) as Array<{ id: string; title: string; progress: number }>)
                .slice(0, 3)
                .map((tutorial) => (
                  <div
                    key={tutorial.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{tutorial.title}</p>
                        <p className="text-sm text-muted-foreground">
                          进度: {tutorial.progress}%
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      继续
                    </Button>
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
}

function StatCard({ icon: Icon, label, value, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  duration: string;
  color: string;
  bgColor: string;
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  duration,
  color,
  bgColor,
}: QuickActionCardProps) {
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', bgColor)}>
            <Icon className={cn('h-6 w-6', color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{title}</h3>
              <Badge variant="secondary">{duration}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Placeholder Tabs (to be implemented)
// ============================================================================

function TextbooksTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>教材库</CardTitle>
        <CardDescription>管理您的教材和学习资料</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground/50" />
          <p className="mt-4 text-lg text-muted-foreground">暂无教材</p>
          <p className="mt-2 text-sm text-muted-foreground">
            上传 PDF 教材或添加在线教材
          </p>
          <Button className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            添加教材
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TutorialsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>学习教程</CardTitle>
        <CardDescription>基于教材生成的速学教程</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground/50" />
          <p className="mt-4 text-lg text-muted-foreground">暂无教程</p>
          <p className="mt-2 text-sm text-muted-foreground">
            先添加教材，然后生成速学教程
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuizTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>练习测验</CardTitle>
        <CardDescription>智能题库，精准练习</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12">
          <Brain className="h-16 w-16 text-muted-foreground/50" />
          <p className="mt-4 text-lg text-muted-foreground">开始练习</p>
          <p className="mt-2 text-sm text-muted-foreground">
            从教材例题和习题中智能选题
          </p>
          <Button className="mt-6">开始测验</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WrongBookTab() {
  const store = useSpeedPassStore();
  const wrongCount = Object.keys(store.wrongQuestions).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>错题本</CardTitle>
        <CardDescription>记录并复习做错的题目</CardDescription>
      </CardHeader>
      <CardContent>
        {wrongCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-lg text-muted-foreground">没有错题</p>
            <p className="mt-2 text-sm text-muted-foreground">
              做练习时答错的题目会自动记录
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              共 {wrongCount} 道错题需要复习
            </p>
            <Button>开始复习错题</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>学习报告</CardTitle>
        <CardDescription>查看学习数据和进步趋势</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-16 w-16 text-muted-foreground/50" />
          <p className="mt-4 text-lg text-muted-foreground">暂无数据</p>
          <p className="mt-2 text-sm text-muted-foreground">
            开始学习后将生成学习报告
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatStudyTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  if (hours === 0) {
    return `${minutes}分钟`;
  }

  if (minutes === 0) {
    return `${hours}小时`;
  }

  return `${hours}小时${minutes}分`;
}
