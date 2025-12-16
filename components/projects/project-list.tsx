'use client';

/**
 * ProjectList - displays all projects with search and create functionality
 */

import { useState, useMemo } from 'react';
import { Plus, Search, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectCard } from './project-card';
import { CreateProjectDialog } from './create-project-dialog';
import { useProjectStore } from '@/stores';
import type { Project, CreateProjectInput } from '@/types';

interface ProjectListProps {
  onProjectSelect?: (projectId: string) => void;
}

export function ProjectList({ onProjectSelect }: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const projects = useProjectStore((state) => state.projects);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const createProject = useProjectStore((state) => state.createProject);
  const updateProject = useProjectStore((state) => state.updateProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const duplicateProject = useProjectStore((state) => state.duplicateProject);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;

    const query = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Projects</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          className="pl-10"
        />
      </div>

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
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-medium">
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery
              ? 'Try a different search term'
              : 'Create your first project to organize conversations'}
          </p>
          {!searchQuery && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          )}
        </div>
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
    </div>
  );
}

export default ProjectList;
