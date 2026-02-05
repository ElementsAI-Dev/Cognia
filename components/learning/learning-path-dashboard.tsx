'use client';

/**
 * Learning Path Dashboard
 * 
 * Dashboard component for managing and tracking long-term learning paths.
 * Shows milestones, progress, and study statistics.
 */

import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Map,
  Target,
  Clock,
  Flame,
  CheckCircle2,
  Circle,
  ChevronRight,
  Calendar,
  TrendingUp,
  BookOpen,
  Trophy,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { useLearningStore } from '@/stores/learning';
import { 
  formatTimeSpent, 
  formatProgress, 
  getProgressColorClass,
  getCategoryDisplayName,
} from '@/lib/learning';
import { cn } from '@/lib/utils';
import type { LearningPath, LearningMilestone } from '@/types/learning';

interface LearningPathDashboardProps {
  pathId?: string;
  onSelectPath?: (pathId: string) => void;
  onContinueLearning?: (pathId: string) => void;
  className?: string;
}

export const LearningPathDashboard = memo(function LearningPathDashboard({
  pathId,
  onSelectPath,
  onContinueLearning,
  className,
}: LearningPathDashboardProps) {
  const t = useTranslations('learningMode');
  const { 
    learningPaths, 
    activeLearningPathId, 
    getActivePaths, 
    getAllPaths,
    globalStats,
  } = useLearningStore();

  const activePaths = useMemo(() => getActivePaths(), [getActivePaths]);
  const allPaths = useMemo(() => getAllPaths(), [getAllPaths]);
  const selectedPath = pathId ? learningPaths[pathId] : 
    (activeLearningPathId ? learningPaths[activeLearningPathId] : undefined);

  const completedPaths = useMemo(() => 
    allPaths.filter(p => p.completedAt), [allPaths]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard
          icon={<Map className="h-4 w-4" />}
          label={t('dashboard.activePaths')}
          value={activePaths.length.toString()}
        />
        <StatsCard
          icon={<Trophy className="h-4 w-4" />}
          label={t('dashboard.completedPaths')}
          value={completedPaths.length.toString()}
        />
        <StatsCard
          icon={<Clock className="h-4 w-4" />}
          label={t('dashboard.totalTime')}
          value={formatTimeSpent(globalStats.totalTimeSpentMs)}
        />
        <StatsCard
          icon={<Flame className="h-4 w-4" />}
          label={t('dashboard.streak')}
          value={`${globalStats.currentStreak} ${t('dashboard.days')}`}
        />
      </div>

      {/* Active Paths List */}
      {activePaths.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {t('dashboard.activeLearningPaths')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.activePathsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {activePaths.map((path) => (
                  <PathCard
                    key={path.id}
                    path={path}
                    isActive={path.id === activeLearningPathId}
                    onSelect={() => onSelectPath?.(path.id)}
                    onContinue={() => onContinueLearning?.(path.id)}
                    t={t}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Selected Path Details */}
      {selectedPath && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{selectedPath.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {getCategoryDisplayName(selectedPath.category)}
                  </Badge>
                  <span>•</span>
                  <span className="text-xs">
                    {formatProgress(selectedPath.overallProgress)} {t('dashboard.complete') || '完成'}
                  </span>
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                onClick={() => onContinueLearning?.(selectedPath.id)}
              >
                {t('dashboard.continueLearning') || '继续学习'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('dashboard.overallProgress') || '总体进度'}
                </span>
                <span className={getProgressColorClass(selectedPath.overallProgress)}>
                  {formatProgress(selectedPath.overallProgress)}
                </span>
              </div>
              <Progress value={selectedPath.overallProgress} className="h-2" />
            </div>

            {/* Milestones */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                {t('dashboard.milestones') || '里程碑'}
              </h4>
              <div className="space-y-2">
                {selectedPath.milestones.map((milestone, index) => (
                  <MilestoneItem
                    key={milestone.id}
                    milestone={milestone}
                    index={index}
                    isCurrent={milestone.id === selectedPath.currentMilestoneId}
                  />
                ))}
              </div>
            </div>

            {/* Path Stats */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t">
              <div className="text-center">
                <div className="text-lg font-semibold">{selectedPath.sessionsCompleted}</div>
                <div className="text-xs text-muted-foreground">
                  {t('dashboard.sessions') || '学习次数'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {formatTimeSpent(selectedPath.totalTimeSpentMs)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('dashboard.timeSpent') || '学习时长'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{selectedPath.streakDays}</div>
                <div className="text-xs text-muted-foreground">
                  {t('dashboard.streakDays') || '连续天数'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {activePaths.length === 0 && !selectedPath && (
        <Card>
          <CardContent className="py-8">
            <Empty className="border-0">
              <EmptyMedia variant="icon">
                <Map className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>
                {t('dashboard.noActivePaths') || '还没有学习路径'}
              </EmptyTitle>
              <EmptyDescription>
                {t('dashboard.noActivePathsDesc') || '开始一个系统学习计划，跟踪你的学习进度'}
              </EmptyDescription>
            </Empty>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

// Stats Card Component
interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const StatsCard = memo(function StatsCard({ icon, label, value }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <div className="text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
});

// Path Card Component
interface PathCardProps {
  path: LearningPath;
  isActive: boolean;
  onSelect: () => void;
  onContinue: () => void;
  t: ReturnType<typeof useTranslations>;
}

const PathCard = memo(function PathCard({ 
  path, 
  isActive, 
  onSelect, 
  onContinue,
  t,
}: PathCardProps) {
  const completedMilestones = path.milestones.filter(m => m.progress >= 100).length;
  
  return (
    <div
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-colors',
        isActive ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{path.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {getCategoryDisplayName(path.category)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {completedMilestones}/{path.milestones.length} {t('dashboard.milestonesComplete') || '里程碑'}
            </span>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onContinue(); }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2">
        <Progress value={path.overallProgress} className="h-1.5" />
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{formatProgress(path.overallProgress)}</span>
          {path.streakDays > 0 && (
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              {path.streakDays} {t('dashboard.days') || '天'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// Milestone Item Component
interface MilestoneItemProps {
  milestone: LearningMilestone;
  index: number;
  isCurrent: boolean;
}

const MilestoneItem = memo(function MilestoneItem({
  milestone,
  index,
  isCurrent,
}: MilestoneItemProps) {
  const isComplete = milestone.progress >= 100;
  
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg',
        isCurrent && 'bg-primary/5 border border-primary/20',
        isComplete && 'opacity-70'
      )}
    >
      <div className="flex-shrink-0">
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : isCurrent ? (
          <TrendingUp className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{index + 1}.</span>
          <span className={cn(
            'text-sm',
            isComplete && 'line-through',
            isCurrent && 'font-medium'
          )}>
            {milestone.title}
          </span>
        </div>
        {milestone.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {milestone.description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        {!isComplete && milestone.progress > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatProgress(milestone.progress)}
          </span>
        )}
        {milestone.targetDate && !isComplete && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Calendar className="h-3 w-3" />
            {new Date(milestone.targetDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
});

export default LearningPathDashboard;
