'use client';

/**
 * ProjectSelector - Quick project switching in chat header
 * Allows users to link/unlink sessions to projects
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  FolderKanban,
  ChevronDown,
  Check,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectStore, useSessionStore } from '@/stores';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

interface ProjectSelectorProps {
  sessionId?: string;
  compact?: boolean;
  className?: string;
}

export function ProjectSelector({
  sessionId,
  compact = false,
  className,
}: ProjectSelectorProps) {
  const t = useTranslations('chatHeader');
  const tProjects = useTranslations('projects');
  const tToasts = useTranslations('toasts');
  const [open, setOpen] = useState(false);

  // Session store
  const sessions = useSessionStore((state) => state.sessions);
  const updateSession = useSessionStore((state) => state.updateSession);
  const session = sessionId 
    ? sessions.find((s) => s.id === sessionId)
    : null;

  // Project store
  const addSessionToProject = useProjectStore((state) => state.addSessionToProject);
  const removeSessionFromProject = useProjectStore((state) => state.removeSessionFromProject);
  const getProject = useProjectStore((state) => state.getProject);
  const getActiveProjects = useProjectStore((state) => state.getActiveProjects);

  // Get non-archived projects
  const activeProjects = useMemo(() => getActiveProjects(), [getActiveProjects]);

  // Get linked project
  const linkedProject = session?.projectId 
    ? getProject(session.projectId) 
    : null;

  const handleSelectProject = (projectId: string) => {
    if (!session) return;

    // Remove from current project if exists
    if (session.projectId && session.projectId !== projectId) {
      removeSessionFromProject(session.projectId, session.id);
    }

    // Add to new project
    addSessionToProject(projectId, session.id);
    updateSession(session.id, { projectId });

    const project = getProject(projectId);
    toast.success(tToasts('linkedToProject') || `Linked to ${project?.name}`);
    setOpen(false);
  };

  const handleUnlinkProject = () => {
    if (!session || !session.projectId) return;

    removeSessionFromProject(session.projectId, session.id);
    updateSession(session.id, { projectId: undefined });

    toast.success(tToasts('unlinkedFromProject') || 'Unlinked from project');
    setOpen(false);
  };

  // Don't render if no session
  if (!session) return null;

  // Compact mode - just show indicator if linked
  if (compact && !linkedProject) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', className)}
          >
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <ProjectMenuContent
            projects={activeProjects}
            linkedProjectId={undefined}
            onSelect={handleSelectProject}
            onUnlink={handleUnlinkProject}
            t={t}
            tProjects={tProjects}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {linkedProject ? (
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5 px-2 py-1 cursor-pointer transition-colors hover:bg-accent',
              'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
              className
            )}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: linkedProject.color || '#3b82f6' }}
            />
            <span className="max-w-[80px] truncate text-xs font-medium">
              {linkedProject.name}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Badge>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-1.5 h-7 text-xs text-muted-foreground', className)}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('linkToProject') || 'Link to Project'}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <ProjectMenuContent
          projects={activeProjects}
          linkedProjectId={linkedProject?.id}
          onSelect={handleSelectProject}
          onUnlink={handleUnlinkProject}
          t={t}
          tProjects={tProjects}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Separate component for menu content
interface ProjectMenuContentProps {
  projects: ReturnType<typeof useProjectStore.getState>['projects'];
  linkedProjectId?: string;
  onSelect: (projectId: string) => void;
  onUnlink: () => void;
  t: ReturnType<typeof useTranslations>;
  tProjects: ReturnType<typeof useTranslations>;
}

function ProjectMenuContent({
  projects,
  linkedProjectId,
  onSelect,
  onUnlink,
  t,
  tProjects,
}: ProjectMenuContentProps) {
  return (
    <>
      <DropdownMenuLabel className="flex items-center gap-2">
        <FolderKanban className="h-4 w-4" />
        <span>{t('projectLink') || 'Project Link'}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />

      {/* Unlink option if currently linked */}
      {linkedProjectId && (
        <>
          <DropdownMenuItem
            onClick={onUnlink}
            className="text-muted-foreground"
          >
            <X className="mr-2 h-4 w-4" />
            <span>{t('unlinkProject') || 'Unlink from project'}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}

      {/* Project list */}
      {projects.length > 0 ? (
        <ScrollArea className="max-h-[200px]">
          <div className="p-1">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onSelect(project.id)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: project.color || '#3B82F6' }}
                  />
                  <span className="truncate">{project.name}</span>
                </div>
                {linkedProjectId === project.id && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
          <p>{tProjects('noProjectsYet') || 'No projects yet'}</p>
        </div>
      )}

      <DropdownMenuSeparator />

      {/* Actions */}
      <DropdownMenuItem asChild>
        <Link href="/projects" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>{tProjects('createProject') || 'Create Project'}</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/projects" className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          <span>{t('manageProjects') || 'Manage Projects'}</span>
        </Link>
      </DropdownMenuItem>
    </>
  );
}

export default ProjectSelector;
