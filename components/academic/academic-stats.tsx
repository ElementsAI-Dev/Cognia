'use client';

/**
 * AcademicStats - Reading statistics and analytics dashboard
 */

import { useMemo } from 'react';
import {
  BookOpen, Clock, TrendingUp, Target,
  Award, BarChart3, PieChart, Library, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAcademic } from '@/hooks/academic';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

function StatCard({ title, value, description, icon, trend, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs mt-2",
            trend.value > 0 ? "text-green-600" : trend.value < 0 ? "text-red-600" : "text-muted-foreground"
          )}>
            <TrendingUp className={cn("h-3 w-3", trend.value < 0 && "rotate-180")} />
            {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AcademicStats() {
  const { libraryPapers, collections } = useAcademic();
  
  // Calculate statistics
  const stats = useMemo(() => {
    const total = libraryPapers.length;
    const unread = libraryPapers.filter(p => p.readingStatus === 'unread').length;
    const reading = libraryPapers.filter(p => p.readingStatus === 'reading').length;
    const completed = libraryPapers.filter(p => p.readingStatus === 'completed').length;
    const archived = libraryPapers.filter(p => p.readingStatus === 'archived').length;
    
    const withPdf = libraryPapers.filter(p => p.hasCachedPdf).length;
    const withRating = libraryPapers.filter(p => p.userRating).length;
    const avgRating = withRating > 0
      ? libraryPapers.filter(p => p.userRating).reduce((sum, p) => sum + (p.userRating || 0), 0) / withRating
      : 0;
    
    const withNotes = libraryPapers.filter(p => p.userNotes || (p.notes && p.notes.length > 0)).length;
    const withAnnotations = libraryPapers.filter(p => p.annotations && p.annotations.length > 0).length;
    
    // Papers by year
    const byYear: Record<number, number> = {};
    libraryPapers.forEach(p => {
      if (p.year) {
        byYear[p.year] = (byYear[p.year] || 0) + 1;
      }
    });
    
    // Papers by provider
    const byProvider: Record<string, number> = {};
    libraryPapers.forEach(p => {
      byProvider[p.providerId] = (byProvider[p.providerId] || 0) + 1;
    });
    
    // Top fields
    const fieldCounts: Record<string, number> = {};
    libraryPapers.forEach(p => {
      p.fieldsOfStudy?.forEach(field => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      });
    });
    const topFields = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Reading progress
    const avgProgress = libraryPapers.length > 0
      ? libraryPapers.reduce((sum, p) => sum + (p.readingProgress || 0), 0) / libraryPapers.length
      : 0;
    
    // This week's activity (mock - would need actual date tracking)
    const thisWeek = libraryPapers.filter(p => {
      const added = new Date(p.addedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return added >= weekAgo;
    }).length;
    
    return {
      total,
      unread,
      reading,
      completed,
      archived,
      withPdf,
      withRating,
      avgRating,
      withNotes,
      withAnnotations,
      byYear,
      byProvider,
      topFields,
      avgProgress,
      thisWeek,
      collectionsCount: collections.length,
    };
  }, [libraryPapers, collections]);
  
  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;
  
  return (
    <div className="space-y-6 p-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Papers"
          value={stats.total}
          description={`${stats.thisWeek} added this week`}
          icon={<Library className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          description={`${completionRate}% completion rate`}
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
        />
        <StatCard
          title="Currently Reading"
          value={stats.reading}
          description={`${stats.unread} in queue`}
          icon={<BookOpen className="h-4 w-4 text-blue-600" />}
        />
        <StatCard
          title="Collections"
          value={stats.collectionsCount}
          description="Paper collections"
          icon={<Target className="h-4 w-4 text-purple-600" />}
        />
      </div>
      
      {/* Reading Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reading Progress
          </CardTitle>
          <CardDescription>Your overall reading status breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Unread</span>
              <span className="text-muted-foreground">{stats.unread} papers</span>
            </div>
            <Progress value={stats.total > 0 ? (stats.unread / stats.total) * 100 : 0} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Reading</span>
              <span className="text-muted-foreground">{stats.reading} papers</span>
            </div>
            <Progress value={stats.total > 0 ? (stats.reading / stats.total) * 100 : 0} className="h-2 [&>div]:bg-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completed</span>
              <span className="text-muted-foreground">{stats.completed} papers</span>
            </div>
            <Progress value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} className="h-2 [&>div]:bg-green-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Archived</span>
              <span className="text-muted-foreground">{stats.archived} papers</span>
            </div>
            <Progress value={stats.total > 0 ? (stats.archived / stats.total) * 100 : 0} className="h-2 [&>div]:bg-gray-400" />
          </div>
        </CardContent>
      </Card>
      
      {/* Two column layout */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Top Research Fields
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topFields.length > 0 ? (
              <div className="space-y-3">
                {stats.topFields.map(([field, count], idx) => (
                  <div key={field} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-medium">
                      {idx + 1}
                    </div>
                    <span className="flex-1 text-sm truncate">{field}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No fields data available yet
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Paper Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byProvider)
                .sort((a, b) => b[1] - a[1])
                .map(([provider, count]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{provider.replace('-', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Engagement Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Engagement Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.withPdf}</div>
              <p className="text-xs text-muted-foreground">PDFs Downloaded</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.withNotes}</div>
              <p className="text-xs text-muted-foreground">Papers with Notes</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.withAnnotations}</div>
              <p className="text-xs text-muted-foreground">With Annotations</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AcademicStats;
