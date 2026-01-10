'use client';

/**
 * ProjectList - displays all projects with search and create functionality
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, FolderOpen, FolderPlus, MessageSquare, TrendingUp, Download, Sparkles, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { EmptyState } from '@/components/layout/empty-state';
import { ProjectCard } from './project-card';
import { CreateProjectDialog } from './create-project-dialog';
import { ImportExportDialog } from './import-export-dialog';
import { ProjectTemplatesDialog } from './project-templates';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProjectStore, useSessionStore } from '@/stores';
import type { Project, CreateProjectInput } from '@/types';

interface ProjectListProps {
  onProjectSelect?: (projectId: string) => void;
}

export function ProjectList({ onProjectSelect }: ProjectListProps) {
  const tPlaceholders = useTranslations('placeholders');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const projects = useProjectStore((state) => state.projects);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const createProject = useProjectStore((state) => state.createProject);
  const updateProject = useProjectStore((state) => state.updateProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const duplicateProject = useProjectStore((state) => state.duplicateProject);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  const archiveProject = useProjectStore((state) => state.archiveProject);
  const unarchiveProject = useProjectStore((state) => state.unarchiveProject);
  
  const sessions = useSessionStore((state) => state.sessions);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalSessions = sessions.filter(s => s.projectId).length;
    const now = Date.now();
    const recentProjects = projects.filter(p => {
      const dayAgo = now - 24 * 60 * 60 * 1000;
      return new Date(p.updatedAt).getTime() > dayAgo;
    }).length;
    
    return { totalProjects, totalSessions, recentProjects };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length, sessions.length]);

  const filteredProjects = useMemo(() => {
    // First filter by archive status
    let filtered = projects.filter((p) => 
      showArchived ? p.isArchived : !p.isArchived
    );

    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [projects, searchQuery, showArchived]);

  const handleCreate = (input: CreateProjectInput) => {
    createProject(input);
    setShowCreateDialog(false);
  };

  const handleEdit = (input: CreateProjectInput) => {
    if (editingProject) {
      updateProject(editingProject.id, input);
      setEditingProject(null);
    }
  };

  const handleSelect = (projectId: string) => {
    setActiveProject(projectId);
    onProjectSelect?.(projectId);
  };

  const handleDelete = (projectId: string) => {
    deleteProject(projectId);
  };

  const handleDuplicate = (projectId: string) => {
    duplicateProject(projectId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Projects</h2>
          {showArchived && (
            <Badge variant="secondary">Archived</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-4 w-4 mr-2" />
            {showArchived ? 'Active' : 'Archived'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportExport(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Import/Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-tour="projects-create">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Blank Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTemplates(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                From Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistics Cards */}
      {projects.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <FolderOpen className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalProjects}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <MessageSquare className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Conversations</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.recentProjects}</p>
                <p className="text-xs text-muted-foreground">Active Today</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <Search className="h-4 w-4" />
        </InputGroupAddon>
        <InputGroupInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={tPlaceholders('searchProjects')}
        />
      </InputGroup>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={project.id === activeProjectId}
              onSelect={handleSelect}
              onEdit={setEditingProject}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onArchive={archiveProject}
              onUnarchive={unarchiveProject}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={searchQuery ? Search : FolderOpen}
          title={searchQuery ? 'No projects found' : 'No projects yet'}
          description={
            searchQuery
              ? 'Try a different search term or create a new project'
              : 'Create your first project to organize conversations and knowledge'
          }
          actions={
            searchQuery
              ? undefined
              : [
                  {
                    label: 'Create Project',
                    onClick: () => setShowCreateDialog(true),
                    icon: FolderPlus,
                  },
                ]
          }
        />
      )}

      {/* Create Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
      />

      {/* Edit Dialog */}
      <CreateProjectDialog
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        onSubmit={handleEdit}
        editProject={editingProject}
      />

      {/* Import/Export Dialog */}
      <ImportExportDialog
        open={showImportExport}
        onOpenChange={setShowImportExport}
      />

      {/* Templates Dialog */}
      <ProjectTemplatesDialog
        open={showTemplates}
        onOpenChange={setShowTemplates}
        onProjectCreated={(projectId) => {
          onProjectSelect?.(projectId);
        }}
      />
    </div>
  );
}

export default ProjectList;
