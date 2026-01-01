'use client';

/**
 * ProjectActivity - displays project activity history and timeline
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  History,
  MessageSquare,
  Settings,
  Plus,
  Trash2,
  Clock,
  ChevronDown,
  Filter,
  Archive,
  ArchiveRestore,
  Tag,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ActivityType, ProjectActivityItem } from '@/types';

// Re-export types for backward compatibility
export type { ActivityType, ProjectActivityItem } from '@/types';

interface ProjectActivityProps {
  projectId: string;
  activities: ProjectActivityItem[];
  trigger?: React.ReactNode;
}

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  session_created: <MessageSquare className="h-4 w-4 text-green-500" />,
  session_added: <MessageSquare className="h-4 w-4 text-green-500" />,
  session_removed: <Trash2 className="h-4 w-4 text-red-500" />,
  settings_updated: <Settings className="h-4 w-4 text-blue-500" />,
  knowledge_added: <Plus className="h-4 w-4 text-green-500" />,
  knowledge_removed: <Trash2 className="h-4 w-4 text-red-500" />,
  knowledge_updated: <FileText className="h-4 w-4 text-blue-500" />,
  project_created: <Plus className="h-4 w-4 text-purple-500" />,
  project_updated: <Settings className="h-4 w-4 text-blue-500" />,
  project_archived: <Archive className="h-4 w-4 text-orange-500" />,
  project_unarchived: <ArchiveRestore className="h-4 w-4 text-green-500" />,
  tags_updated: <Tag className="h-4 w-4 text-blue-500" />,
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  session_created: 'Session Created',
  session_added: 'Session Added',
  session_removed: 'Session Removed',
  settings_updated: 'Settings Updated',
  knowledge_added: 'Knowledge Added',
  knowledge_removed: 'Knowledge Removed',
  knowledge_updated: 'Knowledge Updated',
  project_created: 'Project Created',
  project_updated: 'Project Updated',
  project_archived: 'Project Archived',
  project_unarchived: 'Project Unarchived',
  tags_updated: 'Tags Updated',
};

export function ProjectActivity({
  projectId: _projectId,
  activities,
  trigger,
}: ProjectActivityProps) {
  const t = useTranslations('projectActivity');
  const [open, setOpen] = useState(false);
  const [filterTypes, setFilterTypes] = useState<Set<ActivityType>>(new Set());

  const filteredActivities = useMemo(() => {
    if (filterTypes.size === 0) return activities;
    return activities.filter((a) => filterTypes.has(a.type));
  }, [activities, filterTypes]);

  const groupedActivities = useMemo(() => {
    const groups: Record<string, ProjectActivityItem[]> = {};
    
    for (const activity of filteredActivities) {
      const dateKey = activity.timestamp.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    }
    
    return groups;
  }, [filteredActivities]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleFilter = (type: ActivityType) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('activity')}</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('activityHistory')}
            </SheetTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {t('filter')}
                  {filterTypes.size > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {filterTypes.size}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((type) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={filterTypes.has(type)}
                    onCheckedChange={() => toggleFilter(type)}
                  >
                    <span className="flex items-center gap-2">
                      {ACTIVITY_ICONS[type]}
                      {t(`activityTypes.${type}`)}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {Object.keys(groupedActivities).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {t('noActivityYet')}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {Object.entries(groupedActivities).map(([dateKey, dateActivities]) => (
                <Collapsible key={dateKey} defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                    <span>{dateKey}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {dateActivities.length}
                      </Badge>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2">
                    {dateActivities.map((activity) => (
                      <ActivityItem
                        key={activity.id}
                        activity={activity}
                        formatTime={formatTime}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface ActivityItemProps {
  activity: ProjectActivityItem;
  formatTime: (date: Date) => string;
}

function ActivityItem({ activity, formatTime }: ActivityItemProps) {
  const t = useTranslations('projectActivity');
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      <div className="mt-0.5">{ACTIVITY_ICONS[activity.type]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {t(`activityTypes.${activity.type}`)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 truncate">
          {activity.description}
        </p>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatTime(activity.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to get project activities from the store
 * Note: Import useProjectActivityStore from @/stores when using this hook
 */
export function useProjectActivity(_projectId: string): ProjectActivityItem[] {
  // Return empty array - components should use useProjectActivityStore directly
  // This hook provides a simpler interface for basic usage
  return useMemo(() => {
    // Activities will be populated by components that import the store directly
    return [];
  }, []);
}

export default ProjectActivity;
