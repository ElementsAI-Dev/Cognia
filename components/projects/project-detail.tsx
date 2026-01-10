'use client';

/**
 * ProjectDetail - detailed view of a single project
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
  Calendar,
  Clock,
  Archive,
  ArchiveRestore,
  Tag,
  History,
  GitBranch,
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
import { ProjectActivity } from './project-activity';
import { ProjectGitPanel } from './project-git-panel';
import { useProjectStore, useSessionStore, useProjectActivityStore } from '@/stores';
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
  const t = useTranslations('projectDetail');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sessionToRemove, setSessionToRemove] = useState<string | null>(null);

  const project = useProjectStore((state) => state.getProject(projectId));
  const updateProject = useProjectStore((state) => state.updateProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const archiveProject = useProjectStore((state) => state.archiveProject);
  const unarchiveProject = useProjectStore((state) => state.unarchiveProject);
  const removeSessionFromProject = useProjectStore(
    (state) => state.removeSessionFromProject
  );

  const sessions = useSessionStore((state) => state.sessions);
  
  // Get project activities - must be called before any conditional returns
  const getActivitiesForProject = useProjectActivityStore((state) => state.getActivitiesForProject);

  const projectSessions = useMemo(() => {
    if (!project) return [];
    return sessions.filter((s) => project.sessionIds.includes(s.id));
  }, [project, sessions]);
  
  // Get activities for this project (memoized to avoid unnecessary rerenders)
  const projectActivities = useMemo(() => {
    return getActivitiesForProject(projectId);
  }, [getActivitiesForProject, projectId]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">{t('notFound')}</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToProjects')}
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
              <span>{t('sessionsCount', { count: projectSessions.length })}</span>
              <span>{t('filesCount', { count: project.knowledgeBase.length })}</span>
              <span>{t('created')} {formatDate(project.createdAt)}</span>
            </div>
            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs gap-1">
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {/* Archive Badge */}
            {project.isArchived && (
              <Badge variant="secondary" className="mt-2 gap-1">
                <Archive className="h-3 w-3" />
                {t('archived')}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <ProjectActivity
            projectId={projectId}
            activities={projectActivities}
            trigger={
              <Button variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" />
                {t('activity')}
              </Button>
            }
          />
          {project.isArchived ? (
            <Button variant="outline" onClick={() => unarchiveProject(projectId)}>
              <ArchiveRestore className="mr-2 h-4 w-4" />
              {t('unarchive')}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => archiveProject(projectId)}>
              <Archive className="mr-2 h-4 w-4" />
              {t('archive')}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Settings className="mr-2 h-4 w-4" />
            {t('settings')}
          </Button>
          {onNewChat && !project.isArchived && (
            <Button onClick={() => onNewChat(projectId)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('newChat')}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats - Enhanced Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <span className="text-2xl font-bold">{projectSessions.length}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t('chatSessions')}</p>
          <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(projectSessions.length * 10, 100)}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-2 rounded-lg bg-green-500/10">
                <FileText className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <span className="text-2xl font-bold">{project.knowledgeBase.length}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t('knowledgeFiles')}</p>
          <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(project.knowledgeBase.length * 10, 100)}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="h-4 w-4 text-purple-500" />
              </div>
            </div>
          </div>
          <p className="mt-2 text-sm font-medium">{formatDate(project.createdAt)}</p>
          <p className="text-xs text-muted-foreground">{t('created')}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-4 w-4 text-orange-500" />
              </div>
            </div>
          </div>
          <p className="mt-2 text-sm font-medium">{formatDate(project.updatedAt)}</p>
          <p className="text-xs text-muted-foreground">{t('lastUpdated')}</p>
        </div>
      </div>

      {/* Project Info Badges */}
      {(project.customInstructions || project.defaultMode || project.defaultProvider) && (
        <div className="flex flex-wrap gap-2">
          {project.customInstructions && (
            <Badge variant="secondary">{t('customInstructions')}</Badge>
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
            {t('sessions')}
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('knowledgeBase')}
          </TabsTrigger>
          <TabsTrigger value="git" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {t('versionControl')}
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
                        <span>{t('messagesCount', { count: session.messageCount || 0 })}</span>
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
              <h3 className="mt-4 font-medium">{t('noSessionsYet')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('startNewChatToAdd')}
              </p>
              {onNewChat && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => onNewChat(projectId)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('newChat')}
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          <KnowledgeBase projectId={projectId} />
        </TabsContent>

        <TabsContent value="git" className="mt-4">
          <ProjectGitPanel projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/50 p-4">
        <h3 className="font-semibold text-destructive">{t('dangerZone')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('deleteWarning')}
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('deleteProject')}
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
            <AlertDialogTitle>{t('deleteProject')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmation', { name: project.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
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
            <AlertDialogTitle>{t('removeSession')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('removeSessionConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveSession}>
              {t('remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProjectDetail;
