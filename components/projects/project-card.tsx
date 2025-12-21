'use client';

/**
 * ProjectCard - displays a single project in a card format
 */

import { useState } from 'react';
import {
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
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  MessageSquare,
  FileText,
  Archive,
  ArchiveRestore,
  Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { Project } from '@/types';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  isActive?: boolean;
  onSelect: (projectId: string) => void;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onDuplicate: (projectId: string) => void;
  onArchive?: (projectId: string) => void;
  onUnarchive?: (projectId: string) => void;
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

export function ProjectCard({
  project,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onUnarchive,
}: ProjectCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const IconComponent = iconMap[project.icon || 'Folder'] || Folder;

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          isActive && 'ring-2 ring-primary'
        )}
        onClick={() => onSelect(project.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${project.color}20` }}
              >
                <IconComponent
                  className="h-5 w-5"
                  style={{ color: project.color }}
                />
              </div>
              <div>
                <h3 className="font-semibold">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(project);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(project.id);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                {project.isArchived ? (
                  onUnarchive && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnarchive(project.id);
                      }}
                    >
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                      Unarchive
                    </DropdownMenuItem>
                  )
                ) : (
                  onArchive && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive(project.id);
                      }}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                  )
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{project.sessionCount} sessions</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{project.knowledgeBase.length} files</span>
            </div>
          </div>
          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {project.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs gap-1">
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </Badge>
              ))}
              {project.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{project.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1">
              {project.isArchived && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Archive className="h-2.5 w-2.5" />
                  Archived
                </Badge>
              )}
              {project.customInstructions && (
                <Badge variant="secondary" className="text-xs">
                  Instructions
                </Badge>
              )}
              {project.defaultMode && (
                <Badge variant="outline" className="text-xs">
                  {project.defaultMode}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDate(project.lastAccessedAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{project.name}&quot;? This will not
              delete the sessions associated with this project, but they will be
              unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(project.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ProjectCard;
