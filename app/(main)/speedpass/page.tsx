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

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { SpeedLearningMode, SpeedLearningTutorial, WrongQuestionRecord } from '@/types/learning/speedpass';
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
  CheckCircle2,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useSpeedPassStore, type SpeedPassState } from '@/stores/learning/speedpass-store';
import { cn } from '@/lib/utils';
import { TextbookLibrary, TextbookCardSkeleton } from '@/components/speedpass/textbook-library';
import { AnalyticsDashboard } from '@/components/speedpass/analytics-dashboard';
import { QuizInterface } from '@/components/speedpass/quiz-interface';
import { ModeSelectorDialog } from '@/components/speedpass/mode-selector-dialog';
import { useSpeedPassUser } from '@/hooks/learning';

// ============================================================================
// Main Component
// ============================================================================

export default function SpeedPassPage() {
  const t = useTranslations('learningMode.speedpass.page');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [selectedTextbookForMode, setSelectedTextbookForMode] = useState<string | null>(null);
  const [quizTextbookId, setQuizTextbookId] = useState<string | null>(null);
  const store = useSpeedPassStore();

  // Start tutorial with selected mode and textbook
  const startTutorial = useCallback(async (mode: SpeedLearningMode, textbookId: string) => {
    try {
      const tutorial = await store.createTutorial({
        courseId: '', // courseId can be set when implementing course management
        textbookId,
        mode,
      });
      
      toast.success(
        mode === 'extreme' ? t('modes.rapid.title') :
        mode === 'speed' ? t('modes.intensive.title') : t('modes.comprehensive.title'),
        { description: `${tutorial.totalEstimatedMinutes} ${t('minutes')}` }
      );
      
      setActiveTab('tutorials');
    } catch (error) {
      toast.error(t('error') || 'Failed', {
        description: error instanceof Error ? error.message : '',
      });
    }
  }, [store, t]);

  // Handle mode selection from QuickActionCard
  const handleModeSelect = useCallback((_mode: SpeedLearningMode) => {
    const textbookCount = Object.keys(store.textbooks).length;
    
    if (textbookCount === 0) {
      toast.info(t('noTextbooks'), {
        description: t('uploadPdfOrAdd'),
        action: {
          label: t('addTextbook'),
          onClick: () => setActiveTab('textbooks'),
        },
      });
      return;
    }
    
    if (textbookCount === 1) {
      const textbook = Object.values(store.textbooks)[0];
      setSelectedTextbookForMode(textbook.id);
      setShowModeDialog(true);
      return;
    }
    
    // Multiple textbooks: show mode selector with first textbook
    setSelectedTextbookForMode(Object.values(store.textbooks)[0]?.id || null);
    setShowModeDialog(true);
  }, [store.textbooks, t]);

  // Handle mode selection from ModeSelectorDialog
  const handleModeDialogSelect = useCallback((mode: SpeedLearningMode) => {
    if (selectedTextbookForMode) {
      startTutorial(mode, selectedTextbookForMode);
      setShowModeDialog(false);
      setSelectedTextbookForMode(null);
    }
  }, [selectedTextbookForMode, startTutorial]);

  // Get selected textbook object for ModeSelectorDialog
  const selectedTextbookObj = useMemo(
    () => selectedTextbookForMode ? store.textbooks[selectedTextbookForMode] || null : null,
    [selectedTextbookForMode, store.textbooks]
  );

  // Listen for custom events from TextbookCard
  useEffect(() => {
    const handleOpenModeSelector = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.textbookId) {
        setSelectedTextbookForMode(detail.textbookId);
        setShowModeDialog(true);
      }
    };

    const handleStartQuiz = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.textbookId) {
        setQuizTextbookId(detail.textbookId);
        setActiveTab('quiz');
      }
    };

    window.addEventListener('speedpass:open-mode-selector', handleOpenModeSelector);
    window.addEventListener('speedpass:start-quiz', handleStartQuiz);

    return () => {
      window.removeEventListener('speedpass:open-mode-selector', handleOpenModeSelector);
      window.removeEventListener('speedpass:start-quiz', handleStartQuiz);
    };
  }, []);

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
            <Button size="sm" onClick={() => setActiveTab('textbooks')}>
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
                <OverviewTab
                  store={store}
                  router={router}
                  onModeSelect={handleModeSelect}
                  onAddTextbook={() => setActiveTab('textbooks')}
                />
              </TabsContent>

              <TabsContent value="textbooks" className="mt-0">
                {store.isLoading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <TextbookCardSkeleton />
                    <TextbookCardSkeleton />
                    <TextbookCardSkeleton />
                  </div>
                ) : (
                  <TextbookLibrary />
                )}
              </TabsContent>

              <TabsContent value="tutorials" className="mt-0">
                <TutorialsTab store={store} router={router} onAddTextbook={() => setActiveTab('textbooks')} />
              </TabsContent>

              <TabsContent value="quiz" className="mt-0">
                <QuizTab
                  store={store}
                  quizTextbookId={quizTextbookId}
                  setQuizTextbookId={setQuizTextbookId}
                  onGoToTextbooks={() => setActiveTab('textbooks')}
                />
              </TabsContent>

              <TabsContent value="wrong-book" className="mt-0">
                <WrongBookTab store={store} />
              </TabsContent>

              <TabsContent value="analytics" className="mt-0">
                <AnalyticsDashboard />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Mode Selector Dialog */}
      <ModeSelectorDialog
        open={showModeDialog}
        onOpenChange={setShowModeDialog}
        textbook={selectedTextbookObj}
        onSelect={handleModeDialogSelect}
      />
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

interface OverviewTabProps {
  store: SpeedPassState;
  router: ReturnType<typeof useRouter>;
  onModeSelect: (mode: SpeedLearningMode) => void;
  onAddTextbook: () => void;
}

function OverviewTab({ store, router, onModeSelect, onAddTextbook }: OverviewTabProps) {
  const globalStats = store.globalStats;
  const textbookCount = Object.keys(store.textbooks).length;
  const tutorialCount = Object.keys(store.tutorials).length;
  const activeSession = store.currentSessionId ? store.studySessions[store.currentSessionId] : null;
  const { profile, progress: userProgress, todayProgress, isDailyGoalMet } = useSpeedPassUser();

  return (
    <div className="space-y-6">
      {/* Daily Goal Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <span className="text-lg font-bold">Lv{userProgress.level}</span>
              </div>
              <div>
                <p className="font-medium">{profile.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {isDailyGoalMet ? '✅ ' + t('stats.daysStreak') : `${todayProgress.studyMinutes}/${todayProgress.targetMinutes} ${t('minutes')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userProgress.badges.slice(0, 3).map((badge) => (
                <Badge key={badge} variant="secondary" className="text-xs">
                  {badge.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
          <Progress value={todayProgress.percentage} className="mt-3" />
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Clock}
          label={t('stats.totalStudyTime')}
          value={formatStudyTime(globalStats.totalStudyTimeMs)}
          trend={`${globalStats.currentStreak} ${t('stats.daysStreak')}`}
        />
        <StatCard
          icon={BookOpen}
          label={t('stats.textbookCount')}
          value={textbookCount.toString()}
          trend={`${tutorialCount} ${t('stats.tutorials')}`}
        />
        <StatCard
          icon={Target}
          label={t('stats.accuracy')}
          value={`${globalStats.averageAccuracy}%`}
          trend={`${globalStats.totalQuestionsAttempted} ${t('stats.questions')}`}
        />
        <StatCard
          icon={TrendingUp}
          label={t('stats.quizzesCompleted')}
          value={globalStats.quizzesCompleted.toString()}
          trend={`${globalStats.sessionsCompleted} ${t('stats.sessions')}`}
        />
      </div>

      {/* Active Session */}
      {activeSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              {t('activeSession')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {store.tutorials[activeSession.tutorialId]?.title || '学习中'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('completedSections', { count: activeSession.sectionsCompleted.length })}
                </p>
              </div>
              <Button onClick={() => router.push(`/speedpass/tutorial/${activeSession.tutorialId}`)}>{t('continueLearning')}</Button>
            </div>
            <Progress value={activeSession.sectionsCompleted.length > 0 ? Math.min(activeSession.sectionsCompleted.length * 10, 100) : 0} className="mt-4" />
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <QuickActionCard
          icon={GraduationCap}
          title={t('modes.rapid.title')}
          description={t('modes.rapid.description')}
          duration={t('modes.rapid.duration')}
          color="text-red-500"
          bgColor="bg-red-500/10"
          mode="extreme"
          onClick={onModeSelect}
        />
        <QuickActionCard
          icon={BookOpen}
          title={t('modes.intensive.title')}
          description={t('modes.intensive.description')}
          duration={t('modes.intensive.duration')}
          color="text-orange-500"
          bgColor="bg-orange-500/10"
          mode="speed"
          onClick={onModeSelect}
        />
        <QuickActionCard
          icon={Brain}
          title={t('modes.comprehensive.title')}
          description={t('modes.comprehensive.description')}
          duration={t('modes.comprehensive.duration')}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          mode="comprehensive"
          onClick={onModeSelect}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentActivity')}</CardTitle>
          <CardDescription>{t('recentActivityDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(store.tutorials).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">{t('noLearningRecords')}</p>
              <Button className="mt-4" variant="outline" onClick={onAddTextbook}>
                {t('addTextbookToStart')}
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
                          {t('progress')}: {tutorial.progress}%
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/speedpass/tutorial/${tutorial.id}`)}>
                      {t('continue')}
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
  mode: SpeedLearningMode;
  onClick: (mode: SpeedLearningMode) => void;
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  duration,
  color,
  bgColor,
  mode,
  onClick,
}: QuickActionCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-shadow hover:shadow-md active:scale-[0.98]"
      onClick={() => onClick(mode)}
    >
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
// Tutorials Tab - Shows real tutorials from store
// ============================================================================

interface TutorialsTabProps {
  store: SpeedPassState;
  router: ReturnType<typeof useRouter>;
  onAddTextbook: () => void;
}

function TutorialsTab({ store, router, onAddTextbook }: TutorialsTabProps) {
  const t = useTranslations('learningMode.speedpass.page');
  const tutorials = useMemo(() => Object.values(store.tutorials) as SpeedLearningTutorial[], [store.tutorials]);
  const activeTutorials = useMemo(() => tutorials.filter((t) => !t.completedAt), [tutorials]);
  const completedTutorials = useMemo(() => tutorials.filter((t) => t.completedAt), [tutorials]);

  const handleContinueTutorial = useCallback((tutorialId: string) => {
    store.setCurrentTutorial(tutorialId);
    router.push(`/speedpass/tutorial/${tutorialId}`);
  }, [store, router]);

  const handleDeleteTutorial = useCallback((tutorialId: string) => {
    store.deleteTutorial(tutorialId);
    toast.success(t('tutorialsTitle'));
  }, [store, t]);

  const getModeLabel = (mode: SpeedLearningMode) => {
    return mode === 'extreme' ? t('modes.rapid.title') : mode === 'speed' ? t('modes.intensive.title') : t('modes.comprehensive.title');
  };

  const getModeColor = (mode: SpeedLearningMode) => {
    return mode === 'extreme' ? 'text-red-500 bg-red-100 dark:bg-red-900/30' :
           mode === 'speed' ? 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' :
           'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
  };

  if (tutorials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('tutorialsTitle')}</CardTitle>
          <CardDescription>{t('tutorialsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-lg text-muted-foreground">{t('noTutorials')}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('addTextbookFirst')}
            </p>
            <Button className="mt-6" variant="outline" onClick={onAddTextbook}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addTextbook')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Tutorials */}
      {activeTutorials.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('tutorialsTitle')}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {activeTutorials.map((tutorial) => (
              <Card key={tutorial.id} className="overflow-hidden">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate">{tutorial.title}</h4>
                        <Badge variant="secondary" className={getModeColor(tutorial.mode)}>
                          {getModeLabel(tutorial.mode)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground truncate">{tutorial.overview}</p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {tutorial.totalEstimatedMinutes} {t('minutes')}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {tutorial.sections?.length || 0}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>{t('progress')}</span>
                          <span>{tutorial.progress || 0}%</span>
                        </div>
                        <Progress value={tutorial.progress || 0} className="h-2" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" onClick={() => handleContinueTutorial(tutorial.id)}>
                      <Play className="mr-2 h-3 w-3" />
                      {t('continueLearning')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTutorial(tutorial.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tutorials */}
      {completedTutorials.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('tabs.tutorials')}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {completedTutorials.map((tutorial) => (
              <Card key={tutorial.id} className="opacity-75">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <h4 className="font-semibold truncate">{tutorial.title}</h4>
                        <Badge variant="secondary" className={getModeColor(tutorial.mode)}>
                          {getModeLabel(tutorial.mode)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tutorial.sections?.length || 0} · ✅
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTutorial(tutorial.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Quiz Tab - Textbook selection + Quiz interface
// ============================================================================

interface QuizTabProps {
  store: SpeedPassState;
  quizTextbookId: string | null;
  setQuizTextbookId: (id: string | null) => void;
  onGoToTextbooks: () => void;
}

function QuizTab({ store, quizTextbookId, setQuizTextbookId, onGoToTextbooks }: QuizTabProps) {
  const t = useTranslations('learningMode.speedpass.page');
  const textbooks = useMemo(() => Object.values(store.textbooks), [store.textbooks]);

  // If a quiz is active, show the QuizInterface
  if (quizTextbookId) {
    const knowledgePointIds = (store.textbookKnowledgePoints[quizTextbookId] || []).map((kp) => kp.id);
    return (
      <QuizInterface
        textbookId={quizTextbookId}
        knowledgePointIds={knowledgePointIds}
        questionCount={10}
        onComplete={() => {
          setQuizTextbookId(null);
          toast.success(t('quizComplete'));
        }}
        onCancel={() => setQuizTextbookId(null)}
      />
    );
  }

  // No textbooks available
  if (textbooks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('tabs.quiz')}</CardTitle>
          <CardDescription>{t('quizDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Brain className="h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-lg text-muted-foreground">{t('noTextbooks')}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('uploadPdfOrAdd')}
            </p>
            <Button className="mt-6" variant="outline" onClick={onGoToTextbooks}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addTextbook')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Textbook selection for quiz
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('tabs.quiz')}</CardTitle>
          <CardDescription>{t('selectTextbookForQuiz')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {textbooks.map((textbook) => {
              const questions = store.textbookQuestions[textbook.id] || [];
              const kps = store.textbookKnowledgePoints[textbook.id] || [];
              return (
                <Card
                  key={textbook.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => {
                    if (questions.length === 0) {
                      toast.info(t('noQuestions'), {
                        description: t('parseTextbookFirst'),
                      });
                      return;
                    }
                    setQuizTextbookId(textbook.id);
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{textbook.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {kps.length} · {questions.length}
                        </p>
                      </div>
                    </div>
                    <Button className="mt-4 w-full" size="sm" disabled={questions.length === 0}>
                      {questions.length > 0 ? t('startQuiz') : t('noQuestions')}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Wrong Book Tab - Shows wrong questions with review actions
// ============================================================================

interface WrongBookTabProps {
  store: SpeedPassState;
}

function WrongBookTab({ store }: WrongBookTabProps) {
  const t = useTranslations('learningMode.speedpass.page');
  const wrongQuestions = useMemo(
    () => Object.values(store.wrongQuestions) as WrongQuestionRecord[],
    [store.wrongQuestions]
  );
  const activeWrongQuestions = useMemo(
    () => wrongQuestions.filter((r) => r.status !== 'mastered'),
    [wrongQuestions]
  );
  const masteredQuestions = useMemo(
    () => wrongQuestions.filter((r) => r.status === 'mastered'),
    [wrongQuestions]
  );

  if (wrongQuestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('tabs.wrongBook')}</CardTitle>
          <CardDescription>{t('wrongBookDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-lg text-muted-foreground">{t('noWrongQuestions')}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('wrongQuestionsAutoRecord')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-destructive">{activeWrongQuestions.length}</p>
            <p className="text-sm text-muted-foreground">{t('pendingReview')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-500">{masteredQuestions.length}</p>
            <p className="text-sm text-muted-foreground">{t('mastered')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{wrongQuestions.length}</p>
            <p className="text-sm text-muted-foreground">{t('totalWrongQuestions')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Wrong Question List */}
      {activeWrongQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('pendingReview')}</CardTitle>
            <CardDescription>{activeWrongQuestions.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeWrongQuestions.slice(0, 20).map((record) => {
                const textbook = store.textbooks[record.textbookId];
                const question = (store.textbookQuestions[record.textbookId] || [])
                  .find((q) => q.id === record.questionId);
                const lastAttempt = record.attempts[record.attempts.length - 1];

                return (
                  <div key={record.id} className="flex items-start gap-4 rounded-lg border p-4">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium shrink-0',
                      record.status === 'new' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'
                    )}>
                      {record.status === 'new' ? '新' : record.reviewCount}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {question?.content?.slice(0, 100) || `题目 ${record.questionId}`}
                        {(question?.content?.length || 0) > 100 && '...'}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {textbook && <span>{textbook.name}</span>}
                        <span>{record.attempts.filter((a) => !a.isCorrect).length}x</span>
                        {lastAttempt && (
                          <span>{lastAttempt.userAnswer?.slice(0, 30) || '-'}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        store.markWrongQuestionReviewed(record.id, true);
                        toast.success(t('markedReviewed'));
                      }}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      {t('markReviewed')}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mastered Questions */}
      {masteredQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {t('mastered')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {masteredQuestions.length}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
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
