'use client';

/**
 * Tutorial Detail Client Component
 *
 * Displays a SpeedPass tutorial with:
 * - Section navigation
 * - Knowledge point cards
 * - Progress tracking
 * - Practice questions
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';
import type { SpeedLearningTutorial, TutorialSection, SpeedLearningMode } from '@/types/learning/speedpass';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  createExtremeModeEngine,
  formatCountdown,
  getUrgencyLevel,
  calculateProgress as calcTutorialProgress,
  estimateCompletionTime,
  getNextSection,
  optimizeSectionOrder,
} from '@/lib/learning/speedpass';
import type { ExtremeModeOverview } from '@/lib/learning/speedpass';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Lightbulb,
  Play,
  Target,
  Timer,
  Zap,
} from 'lucide-react';

// ============================================================================
// Main Component
// ============================================================================

export default function TutorialDetailClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tTutorial = useTranslations('learningMode.speedpass.tutorialDetail');
  const routeParamId = typeof params.id === 'string' ? params.id : undefined;
  const queryTutorialId = searchParams.get('id') || undefined;
  const tutorialId = queryTutorialId || routeParamId || '';

  const store = useSpeedPassStore();
  const tutorial = store.tutorials[tutorialId] as SpeedLearningTutorial | undefined;
  const textbook = tutorial ? store.textbooks[tutorial.textbookId] : null;

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [isLoading] = useState(!tutorial);
  const startTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);

  // Extreme mode engine
  const extremeEngine = useMemo(() => {
    if (tutorial?.mode !== 'extreme') return null;
    const engine = createExtremeModeEngine({
      totalTimeMinutes: tutorial.totalEstimatedMinutes || 90,
    });
    engine.startSession();
    return engine;
  }, [tutorial?.mode, tutorial?.totalEstimatedMinutes]);

  // Extreme mode state (overview and countdown)
  const [extremeOverview, setExtremeOverview] = useState<ExtremeModeOverview | null>(null);
  const [remainingTimeMs, setRemainingTimeMs] = useState<number>(0);

  // Initialize: start time + study session on mount
  useEffect(() => {
    if (!tutorialId) {
      return;
    }
    startTimeRef.current = Date.now();

    if (tutorialId && store.tutorials[tutorialId]) {
      try {
        const session = store.startStudySession(tutorialId);
        sessionIdRef.current = session.id;
      } catch {
        // Session may already exist
      }
    }

    // End study session on unmount
    return () => {
      if (sessionIdRef.current) {
        store.endStudySession(sessionIdRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialId]);

  // Handle missing tutorial
  useEffect(() => {
    if (!tutorialId) {
      toast.error(tTutorial('missingTutorialId'));
      router.push('/speedpass');
      return;
    }
    if (!tutorial) {
      toast.error(tTutorial('tutorialNotFound'));
      router.push('/speedpass');
    }
  }, [tutorialId, tutorial, router, tTutorial]);

  // Get completed sections from store (derived, no effect needed)
  const storeCompletedSections = useMemo(() => {
    const session = store.currentSessionId
      ? store.studySessions[store.currentSessionId]
      : null;
    return session?.sectionsCompleted || [];
  }, [store.currentSessionId, store.studySessions]);

  // Merge store and local completed sections
  const allCompletedSections = useMemo(() => {
    const combined = new Set([...completedSections, ...storeCompletedSections]);
    return combined;
  }, [completedSections, storeCompletedSections]);

  // Optimized section order for better learning flow
  const optimizedSections = useMemo(() => {
    if (!tutorial?.sections) return [];
    return optimizeSectionOrder(tutorial.sections);
  }, [tutorial]);

  // Get current section from optimized order
  const currentSection = useMemo(() => {
    return optimizedSections[currentSectionIndex] || null;
  }, [optimizedSections, currentSectionIndex]);

  // Smart next section suggestion
  const suggestedNextSection = useMemo(() => {
    if (!tutorial) return null;
    return getNextSection(tutorial) || null;
  }, [tutorial]);

  // Update extreme mode overview when sections change
  useEffect(() => {
    if (!extremeEngine || !tutorial) return;

    const knowledgePoints = store.textbookKnowledgePoints[tutorial.textbookId] || [];
    const questions = store.textbookQuestions[tutorial.textbookId] || [];

    const overview = extremeEngine.generateOverview(
      tutorial.sections,
      knowledgePoints,
      questions
    );
    setExtremeOverview(overview);
  }, [extremeEngine, tutorial, store.textbookKnowledgePoints, store.textbookQuestions, allCompletedSections]);

  // Extreme mode countdown timer
  useEffect(() => {
    if (!extremeEngine) return;
    const interval = setInterval(() => {
      const remaining = extremeEngine.updateRemainingTime();
      setRemainingTimeMs(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [extremeEngine]);

  // Calculate progress using tutorial-generator utility
  const progress = useMemo(() => {
    if (!tutorial) return 0;
    return calcTutorialProgress(tutorial);
  }, [tutorial]);

  // Estimated remaining time
  const estimatedRemainingMinutes = useMemo(() => {
    if (!tutorial) return 0;
    return estimateCompletionTime(tutorial);
  }, [tutorial]);

  // Handle section completion
  const handleCompleteSection = useCallback(() => {
    if (!currentSection || !tutorial) return;

    setCompletedSections((prev) => {
      const newSet = new Set(prev);
      newSet.add(currentSection.id);
      return newSet;
    });

    // Sync progress to store
    store.updateTutorialProgress(tutorialId, currentSection.id);

    // Mark completed in extreme engine
    if (extremeEngine) {
      extremeEngine.markCompleted(currentSection.id);
    }

    // Move to next section if available
    if (currentSectionIndex < tutorial.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      toast.success(tTutorial('sectionCompleted'), {
        description: tTutorial('progressDescription', {
          progress: Math.round(((completedSections.size + 1) / tutorial.sections.length) * 100),
        }),
      });
    } else {
      // All sections done — mark tutorial complete
      store.completeTutorial(tutorialId);

      // End study session
      if (sessionIdRef.current) {
        store.endStudySession(sessionIdRef.current);
        sessionIdRef.current = null;
      }

      const timeSpent = Date.now() - startTimeRef.current;
      toast.success(tTutorial('tutorialCompleted'), {
        description: tTutorial('timeSpentDescription', {
          duration: formatDuration(timeSpent, (key, values) => tTutorial(key, values)),
        }),
      });
    }
  }, [
    currentSection,
    currentSectionIndex,
    tutorial,
    completedSections.size,
    store,
    tutorialId,
    extremeEngine,
    tTutorial,
  ]);

  // Handle navigation
  const handlePrevSection = useCallback(() => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  }, [currentSectionIndex]);

  const handleNextSection = useCallback(() => {
    if (tutorial?.sections && currentSectionIndex < tutorial.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  }, [currentSectionIndex, tutorial]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push('/speedpass');
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">{tTutorial('loading')}</p>
        </div>
      </div>
    );
  }

  if (!tutorial) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{tutorial.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {textbook && <span>{textbook.name}</span>}
                <span>·</span>
                <ModeBadge mode={tutorial.mode} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{tTutorial('progressLabel')}</p>
              <p className="font-semibold">{progress}%</p>
              {estimatedRemainingMinutes > 0 && (
                <p className="text-xs text-muted-foreground">
                  {tTutorial('remainingMinutes', { minutes: estimatedRemainingMinutes })}
                </p>
              )}
            </div>
            <Progress value={progress} className="w-32" />
          </div>
        </div>

        {/* Extreme Mode Status Bar */}
        {tutorial.mode === 'extreme' && extremeOverview && (
          <div className={cn(
            'mt-3 flex items-center justify-between rounded-lg px-4 py-2 text-sm',
            getUrgencyLevel(remainingTimeMs / 60000) === 'critical'
              ? 'bg-red-100 dark:bg-red-950'
              : getUrgencyLevel(remainingTimeMs / 60000) === 'warning'
              ? 'bg-orange-100 dark:bg-orange-950'
              : 'bg-blue-100 dark:bg-blue-950'
          )}>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 font-mono font-semibold">
                <Timer className="h-4 w-4" />
                {formatCountdown(remainingTimeMs)}
              </span>
              <span className="text-muted-foreground">
                {tTutorial('completedItems', {
                  completed: extremeOverview.completedItems,
                  total: extremeOverview.totalItems,
                })}
              </span>
            </div>
            <span className={cn(
              'text-xs',
              extremeOverview.onTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {extremeOverview.recommendation}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Section Navigation */}
        <div className="w-64 border-r">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h3 className="mb-4 font-semibold">{tTutorial('chapterToc')}</h3>
              <div className="space-y-1">
                {optimizedSections.map((section, sectionIndex) => (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSectionIndex(sectionIndex)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      currentSectionIndex === sectionIndex
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted',
                      allCompletedSections.has(section.id) && 'text-muted-foreground'
                    )}
                  >
                    {allCompletedSections.has(section.id) ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <div
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-xs',
                          currentSectionIndex === sectionIndex
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        )}
                      >
                        {sectionIndex + 1}
                      </div>
                    )}
                    <span className="truncate">
                      {section.textbookLocation?.section ||
                        tTutorial('chapterIndex', { index: sectionIndex + 1 })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              {currentSection ? (
                <SectionViewer
                  section={currentSection}
                  mode={tutorial.mode}
                  isCompleted={allCompletedSections.has(currentSection.id)}
                  onComplete={handleCompleteSection}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground/50" />
                  <p className="mt-4 text-lg text-muted-foreground">{tTutorial('selectChapterHint')}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t px-6 py-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handlePrevSection} disabled={currentSectionIndex === 0}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {tTutorial('previousSection')}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentSectionIndex + 1} / {optimizedSections.length}
            </span>
            {suggestedNextSection && suggestedNextSection.id !== currentSection?.id && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary"
                onClick={() => {
                  const idx = optimizedSections.findIndex((s) => s.id === suggestedNextSection.id);
                  if (idx >= 0) setCurrentSectionIndex(idx);
                }}
              >
                {tTutorial('jumpToSuggested')}
              </Button>
            )}
          </div>
          {currentSectionIndex === optimizedSections.length - 1 ? (
            <Button onClick={handleCompleteSection} disabled={allCompletedSections.has(currentSection?.id || '')}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {tTutorial('completeTutorial')}
            </Button>
          ) : (
            <Button onClick={handleNextSection}>
              {tTutorial('nextSection')}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Section Viewer Component
// ============================================================================

interface SectionViewerProps {
  section: TutorialSection;
  mode: SpeedLearningMode;
  isCompleted: boolean;
  onComplete: () => void;
}

function SectionViewer({ section, mode, isCompleted, onComplete }: SectionViewerProps) {
  const tTutorial = useTranslations('learningMode.speedpass.tutorialDetail');
  const sectionTitle =
    section.textbookLocation?.section || tTutorial('knowledgePointIndex', { index: section.orderIndex + 1 });
  const importanceLabel =
    section.importanceLevel === 'critical'
      ? tTutorial('importance.critical')
      : section.importanceLevel === 'important'
        ? tTutorial('importance.important')
        : tTutorial('importance.supplementary');
  const importanceColor = section.importanceLevel === 'critical' ? 'text-red-500' :
    section.importanceLevel === 'important' ? 'text-orange-500' : 'text-gray-500';

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{sectionTitle}</h2>
          <Badge variant="outline" className={importanceColor}>{importanceLabel}</Badge>
          {isCompleted && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {tTutorial('completed')}
            </Badge>
          )}
        </div>
        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {section.textbookLocation?.textbookName} · {section.textbookLocation?.chapter}
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            {tTutorial('pageRange', { range: section.textbookLocation?.pageRange || '-' })}
          </span>
        </div>
      </div>

      <Separator />

      {/* Quick Summary */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          {tTutorial('quickSummary')}
        </h3>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm leading-relaxed">{section.quickSummary}</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Points */}
      {section.keyPoints && section.keyPoints.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Target className="h-5 w-5 text-blue-500" />
            {tTutorial('keyPoints')}
          </h3>
          <ul className="space-y-2">
            {section.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span className="text-sm">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Must-Know Formulas (especially for extreme mode) */}
      {section.mustKnowFormulas && section.mustKnowFormulas.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Zap className="h-5 w-5 text-amber-500" />
            {tTutorial('mustKnowFormulas')}
          </h3>
          <div className="grid gap-3">
            {section.mustKnowFormulas.map((formula, idx) => (
              <Card key={idx} className="bg-amber-50 dark:bg-amber-950">
                <CardContent className="pt-4">
                  <code className="block rounded bg-white p-2 font-mono text-sm dark:bg-black">
                    {formula.formula}
                  </code>
                  <p className="mt-2 text-sm text-muted-foreground">{formula.explanation}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Examples (for speed/comprehensive mode) */}
      {(mode === 'speed' || mode === 'comprehensive') && section.examples && section.examples.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Brain className="h-5 w-5 text-purple-500" />
            {tTutorial('examples')}
          </h3>
          <div className="grid gap-3">
            {section.examples.map((example, idx) => (
              <Card key={idx}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{example.title}</span>
                    <Badge variant="outline">
                      {example.difficulty === 'easy'
                        ? tTutorial('difficulty.easy')
                        : example.difficulty === 'medium'
                          ? tTutorial('difficulty.medium')
                          : tTutorial('difficulty.hard')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tTutorial('pageNumber', { page: example.pageNumber })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Common Mistakes */}
      {section.commonMistakes && section.commonMistakes.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold text-red-500">
            <Clock className="h-5 w-5" />
            {tTutorial('commonMistakes')}
          </h3>
          <ul className="space-y-2">
            {section.commonMistakes.map((mistake, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <span>⚠️</span>
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Memory Tips (for comprehensive mode) */}
      {mode === 'comprehensive' && section.memoryTips && section.memoryTips.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold text-blue-500">
            <Lightbulb className="h-5 w-5" />
            {tTutorial('memoryTips')}
          </h3>
          <ul className="space-y-2">
            {section.memoryTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span>💡</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Complete Section Button */}
      {!isCompleted && (
        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={onComplete}>
            <CheckCircle2 className="mr-2 h-5 w-5" />
            {tTutorial('completeSection')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function ModeBadge({ mode }: { mode: SpeedLearningMode }) {
  const tMode = useTranslations('learningMode.speedpass.tutorialDetail.modeBadge');
  const config = {
    extreme: { icon: Zap, label: tMode('extreme'), color: 'text-red-500 bg-red-100' },
    speed: { icon: Play, label: tMode('speed'), color: 'text-orange-500 bg-orange-100' },
    comprehensive: { icon: GraduationCap, label: tMode('comprehensive'), color: 'text-blue-500 bg-blue-100' },
  };

  const { icon: Icon, label, color } = config[mode];

  return (
    <Badge variant="secondary" className={color}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDuration(
  ms: number,
  translate: (key: string, values?: Record<string, string | number>) => string
): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return translate('duration.minutesOnly', { minutes });
  }
  if (remainingMinutes === 0) {
    return translate('duration.hoursOnly', { hours });
  }
  return translate('duration.hoursMinutes', { hours, minutes: remainingMinutes });
}
