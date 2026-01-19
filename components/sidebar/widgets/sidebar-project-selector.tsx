'use client';

/**
 * SidebarProjectSelector - Quick project switching and filtering in sidebar
 * Allows users to filter sessions by project and see active project indicator
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  FolderKanban,
  ChevronDown,
  Check,
  Plus,
  Settings,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectStore } from '@/stores';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

interface SidebarProjectSelectorProps {
  onFilterChange?: (projectId: string | null) => void;
  filterProjectId?: string | null;
  collapsed?: boolean;
}

export function SidebarProjectSelector({
  onFilterChange,
  filterProjectId,
  collapsed = false,
}: SidebarProjectSelectorProps) {
  const t = useTranslations('sidebar');
  const tProjects = useTranslations('projects');
  const [open, setOpen] = useState(false);

  const projects = useProjectStore((state) => state.projects);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  const getActiveProjects = useProjectStore((state) => state.getActiveProjects);

  // Get non-archived projects
  const activeProjects = useMemo(() => getActiveProjects(), [getActiveProjects]);

  // Get current filter project or active project
  const currentFilterProject = useMemo(() => {
    if (filterProjectId) {
      return projects.find((p) => p.id === filterProjectId);
    }
    return null;
  }, [filterProjectId, projects]);

  const activeProject = useMemo(() => {
    if (activeProjectId) {
      return projects.find((p) => p.id === activeProjectId);
    }
    return null;
  }, [activeProjectId, projects]);

  const handleSelectProject = (projectId: string | null) => {
    if (onFilterChange) {
      onFilterChange(projectId);
    }
    setOpen(false);
  };

  const handleSetActiveProject = (projectId: string) => {
    setActiveProject(projectId);
    if (onFilterChange) {
      onFilterChange(projectId);
    }
    setOpen(false);
  };

  // Collapsed state - just show icon
  if (collapsed) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'relative',
              (filterProjectId || activeProjectId) && 'text-primary'
            )}
          >
            <FolderKanban className="h-4 w-4" />
            {(filterProjectId || activeProjectId) && (
              <span
                className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    currentFilterProject?.color ||
                    activeProject?.color ||
                    '#3B82F6',
                }}
              />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-56">
          <ProjectMenuContent
            projects={activeProjects}
            filterProjectId={filterProjectId}
            activeProjectId={activeProjectId}
            onSelectFilter={handleSelectProject}
            onSetActive={handleSetActiveProject}
            t={t}
            tProjects={tProjects}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="px-2 py-1">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-full justify-between h-8 text-xs',
              filterProjectId && 'border-primary/50 bg-primary/5'
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <FolderKanban className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {currentFilterProject
                  ? currentFilterProject.name
                  : activeProject
                    ? activeProject.name
                    : t('allProjects') || 'All Projects'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {filterProjectId && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1 text-[10px]"
                  style={{
                    backgroundColor: currentFilterProject?.color + '20',
                    color: currentFilterProject?.color,
                  }}
                >
                  {t('filtered') || 'Filtered'}
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <ProjectMenuContent
            projects={activeProjects}
            filterProjectId={filterProjectId}
            activeProjectId={activeProjectId}
            onSelectFilter={handleSelectProject}
            onSetActive={handleSetActiveProject}
            t={t}
            tProjects={tProjects}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Separate component for menu content to avoid duplication
interface ProjectMenuContentProps {
  projects: Project[];
  filterProjectId: string | null | undefined;
  activeProjectId: string | null;
  onSelectFilter: (projectId: string | null) => void;
  onSetActive: (projectId: string) => void;
  t: ReturnType<typeof useTranslations>;
  tProjects: ReturnType<typeof useTranslations>;
}

function ProjectMenuContent({
  projects,
  filterProjectId,
  activeProjectId,
  onSelectFilter,
  onSetActive,
  t,
  tProjects,
}: ProjectMenuContentProps) {
  return (
    <>
      {/* Show all option */}
      <DropdownMenuItem
        onClick={() => onSelectFilter(null)}
        className="flex items-center justify-between"
      >
        <span>{t('allProjects') || 'All Projects'}</span>
        {!filterProjectId && <Check className="h-4 w-4 text-primary" />}
      </DropdownMenuItem>

      {projects.length > 0 && <DropdownMenuSeparator />}

      {/* Project list */}
      {projects.length > 0 ? (
        <ScrollArea className="max-h-[200px]">
          <div className="p-1">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onSelectFilter(project.id)}
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: project.color || '#3B82F6' }}
                  />
                  <span className="truncate">{project.name}</span>
                  {project.id === activeProjectId && (
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                      {t('active') || 'Active'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {filterProjectId === project.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  {project.id !== activeProjectId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetActive(project.id);
                      }}
                      title={t('setAsActive') || 'Set as active project'}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  )}
                </div>
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
          <FolderKanban className="h-4 w-4" />
          <span>{t('manageProjects') || 'Manage Projects'}</span>
        </Link>
      </DropdownMenuItem>
    </>
  );
}

export default SidebarProjectSelector;
