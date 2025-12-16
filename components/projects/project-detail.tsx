'use client';

/**
 * ProjectDetail - detailed view of a single project
 */

import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  FileText,
  Settings,
  Plus,
  Trash2,
  Folder,
  Code,
  BookOpen,
  Briefcase,
  GraduationCap,
  Heart,
  Home,
  Lightbulb,
  Music,
  Palette,
  PenTool,
  Rocket,
  Star,
  Target,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { KnowledgeBase } from './knowledge-base';
import { CreateProjectDialog } from './create-project-dialog';
import { useProjectStore, useSessionStore } from '@/stores';
import type { CreateProjectInput } from '@/types';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  onNewChat?: (projectId: string) => void;
  onSelectSession?: (sessionId: string) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Folder,
  Code,
  BookOpen,
  Briefcase,
  GraduationCap,
  Heart,
  Home,
  Lightbulb,
  Music,
  Palette,
  PenTool,
  Rocket,
  Star,
  Target,
  Zap,
};

export function ProjectDetail({
  projectId,
  onBack,
  onNewChat,
  onSelectSession,
}: ProjectDetailProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sessionToRemove, setSessionToRemove] = useState<string | null>(null);

  const project = useProjectStore((state) => state.getProject(projectId));
  const updateProject = useProjectStore((state) => state.updateProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const removeSessionFromProject = useProjectStore(
    (state) => state.removeSessionFromProject
  );

  const sessions = useSessionStore((state) => state.sessions);
  const _deleteSession = useSessionStore((state) => state.deleteSession);

  const projectSessions = useMemo(() => {
    if (!project) return [];
    return sessions.filter((s) => project.sessionIds.includes(s.id));
  }, [project, sessions]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const IconComponent = iconMap[project.icon || 'Folder'] || Folder;

  const handleEdit = (input: CreateProjectInput) => {
    updateProject(projectId, input);
    setShowEditDialog(false);
  };

  const handleDelete = () => {
    deleteProject(projectId);
    onBack();
  };

  const handleRemoveSession = () => {
    if (sessionToRemove) {
      removeSessionFromProject(projectId, sessionToRemove);
      setSessionToRemove(null);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${project.color}20` }}
          >
            <IconComponent
              className="h-7 w-7"
              style={{ color: project.color }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-muted-foreground">{project.description}</p>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span>{projectSessions.length} sessions</span>
              <span>{project.knowledgeBase.length} files</span>
              <span>Created {formatDate(project.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          {onNewChat && (
            <Button onClick={() => onNewChat(projectId)}>
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          )}
        </div>
      </div>

      {/* Project Info Badges */}
      {(project.customInstructions || project.defaultMode || project.defaultProvider) && (
        <div className="flex flex-wrap gap-2">
          {project.customInstructions && (
            <Badge variant="secondary">Custom Instructions</Badge>
          )}
          {project.defaultMode && (
            <Badge variant="outline">Default: {project.defaultMode}</Badge>
          )}
          {project.defaultProvider && (
            <Badge variant="outline">Provider: {project.defaultProvider}</Badge>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Knowledge Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-4">
          {projectSessions.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {projectSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 cursor-pointer"
                    onClick={() => onSelectSession?.(session.id)}
                  >
                    <div>
                      <p className="font-medium">{session.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{session.mode}</Badge>
                        <span>{session.provider}/{session.model}</span>
                        <span>{session.messageCount || 0} messages</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(session.updatedAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToRemove(session.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 font-medium">No sessions yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Start a new chat to add sessions to this project
              </p>
              {onNewChat && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => onNewChat(projectId)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Chat
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          <KnowledgeBase projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/50 p-4">
        <h3 className="font-semibold text-destructive">Danger Zone</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting this project will not delete associated sessions, but they will be
          unlinked.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Project
        </Button>
      </div>

      {/* Edit Dialog */}
      <CreateProjectDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={handleEdit}
        editProject={project}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{project.name}&quot;? This action
              cannot be undone. Sessions will be unlinked but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Session Confirmation */}
      <AlertDialog
        open={!!sessionToRemove}
        onOpenChange={() => setSessionToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Session</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this session from the project? The session will not be deleted,
              just unlinked from this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveSession}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProjectDetail;
