'use client';

/**
 * Git File Tree - File-level staging UI with tree view
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Minus,
  Check,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Empty, EmptyMedia, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { getFileStatusColor } from '@/types/system/git';
import type { GitFileStatus } from '@/types/system/git';

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  status?: GitFileStatus;
  children: TreeNode[];
}

interface GitFileTreeProps {
  files: GitFileStatus[];
  isLoading?: boolean;
  onStageFiles: (files: string[]) => Promise<boolean>;
  onUnstageFiles: (files: string[]) => Promise<boolean>;
  onDiscardFiles: (files: string[]) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function GitFileTree({
  files,
  isLoading = false,
  onStageFiles,
  onUnstageFiles,
  onDiscardFiles,
  onRefresh,
  className,
}: GitFileTreeProps) {
  const t = useTranslations('git.fileTree');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isOperating, setIsOperating] = useState(false);

  // Build tree structure from flat file list
  const tree = useMemo(() => {
    const root: TreeNode = {
      name: '',
      path: '',
      isDirectory: true,
      children: [],
    };

    for (const file of files) {
      const parts = file.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const path = parts.slice(0, i + 1).join('/');
        const isFile = i === parts.length - 1;

        let child = current.children.find((c) => c.name === part);
        if (!child) {
          child = {
            name: part,
            path,
            isDirectory: !isFile,
            status: isFile ? file : undefined,
            children: [],
          };
          current.children.push(child);
        }
        current = child;
      }
    }

    // Sort: directories first, then files, both alphabetically
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    };
    sortChildren(root);

    return root;
  }, [files]);

  const stagedFiles = files.filter((f) => f.staged);
  const unstagedFiles = files.filter((f) => !f.staged);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleSelectFile = (path: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFiles(new Set(files.map((f) => f.path)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleStageSelected = async () => {
    const toStage = Array.from(selectedFiles).filter(
      (path) => !files.find((f) => f.path === path)?.staged
    );
    if (toStage.length === 0) return;

    setIsOperating(true);
    try {
      const success = await onStageFiles(toStage);
      if (success) {
        setSelectedFiles(new Set());
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handleUnstageSelected = async () => {
    const toUnstage = Array.from(selectedFiles).filter(
      (path) => files.find((f) => f.path === path)?.staged
    );
    if (toUnstage.length === 0) return;

    setIsOperating(true);
    try {
      const success = await onUnstageFiles(toUnstage);
      if (success) {
        setSelectedFiles(new Set());
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handleDiscardSelected = async () => {
    const toDiscard = Array.from(selectedFiles);
    if (toDiscard.length === 0) return;

    setIsOperating(true);
    try {
      const success = await onDiscardFiles(toDiscard);
      if (success) {
        setSelectedFiles(new Set());
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handleStageAll = async () => {
    const toStage = unstagedFiles.map((f) => f.path);
    if (toStage.length === 0) return;

    setIsOperating(true);
    try {
      await onStageFiles(toStage);
    } finally {
      setIsOperating(false);
    }
  };

  const handleUnstageAll = async () => {
    const toUnstage = stagedFiles.map((f) => f.path);
    if (toUnstage.length === 0) return;

    setIsOperating(true);
    try {
      await onUnstageFiles(toUnstage);
    } finally {
      setIsOperating(false);
    }
  };

  const getStatusBadge = (status: string, staged: boolean) => {
    return (
      <Badge
        variant="outline"
        className={cn('text-xs h-5', getFileStatusColor(status), staged && 'bg-green-500/10')}
      >
        {status.charAt(0).toUpperCase()}
        {staged && <Check className="h-2 w-2 ml-0.5" />}
      </Badge>
    );
  };

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    if (node.isDirectory) {
      const isExpanded = expandedPaths.has(node.path);
      const dirFiles = files.filter((f) => f.path.startsWith(node.path + '/'));
      const stagedCount = dirFiles.filter((f) => f.staged).length;

      if (node.path === '') {
        // Root node - render children directly
        return node.children.map((child) => renderNode(child, depth));
      }

      return (
        <Collapsible key={node.path} open={isExpanded} onOpenChange={() => toggleExpand(node.path)}>
          <CollapsibleTrigger className="w-full">
            <div
              className="flex items-center gap-1 py-1 px-2 hover:bg-muted/50 rounded-sm"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-yellow-600 shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-yellow-600 shrink-0" />
              )}
              <span className="text-sm truncate flex-1 text-left">{node.name}</span>
              {stagedCount > 0 && (
                <Badge variant="secondary" className="text-xs h-4">
                  {stagedCount}/{dirFiles.length}
                </Badge>
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // File node
    const isSelected = selectedFiles.has(node.path);
    const file = node.status!;

    return (
      <ContextMenu key={node.path}>
        <ContextMenuTrigger>
          <div
            className={cn(
              'flex items-center gap-1 py-1 px-2 hover:bg-muted/50 rounded-sm cursor-pointer',
              isSelected && 'bg-primary/10'
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleSelectFile(node.path)}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleSelectFile(node.path)}
              className="h-3 w-3"
            />
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate flex-1">{node.name}</span>
            {getStatusBadge(file.status, file.staged)}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {!file.staged ? (
            <ContextMenuItem onClick={() => onStageFiles([file.path])} disabled={isOperating}>
              <Plus className="h-4 w-4 mr-2" />
              {t('stageFile')}
            </ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={() => onUnstageFiles([file.path])} disabled={isOperating}>
              <Minus className="h-4 w-4 mr-2" />
              {t('unstageFile')}
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDiscardFiles([file.path])}
            disabled={isOperating}
            className="text-red-600"
          >
            <X className="h-4 w-4 mr-2" />
            {t('discardChanges')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  if (files.length === 0) {
    return (
      <Empty className={className}>
        <EmptyMedia>
          <Check className="h-12 w-12 text-green-500 opacity-50" />
        </EmptyMedia>
        <EmptyDescription>{t('noChanges')}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium text-sm">{t('title')}</span>
          <Badge variant="secondary" className="text-xs">
            {files.length}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Selection Actions */}
      {selectedFiles.size > 0 && (
        <div className="flex items-center gap-1 p-2 bg-muted/50 rounded-md">
          <span className="text-xs text-muted-foreground flex-1">
            {t('selectedCount', { count: selectedFiles.size })}
          </span>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={deselectAll}>
            {t('deselectAll')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-green-600"
            onClick={handleStageSelected}
            disabled={isOperating}
          >
            <Plus className="h-3 w-3 mr-1" />
            {t('stage')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-yellow-600"
            onClick={handleUnstageSelected}
            disabled={isOperating}
          >
            <Minus className="h-3 w-3 mr-1" />
            {t('unstage')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-red-600"
            onClick={handleDiscardSelected}
            disabled={isOperating}
          >
            <X className="h-3 w-3 mr-1" />
            {t('discard')}
          </Button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={selectAll}>
          <CheckSquare className="h-3 w-3 mr-1" />
          {t('selectAll')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs flex-1"
          onClick={handleStageAll}
          disabled={unstagedFiles.length === 0 || isOperating}
        >
          <Plus className="h-3 w-3 mr-1" />
          {t('stageAll')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs flex-1"
          onClick={handleUnstageAll}
          disabled={stagedFiles.length === 0 || isOperating}
        >
          <Minus className="h-3 w-3 mr-1" />
          {t('unstageAll')}
        </Button>
      </div>

      {/* Staged Section */}
      {stagedFiles.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2">
            <Check className="h-3 w-3 text-green-500" />
            <span className="text-xs font-medium text-green-600">
              {t('staged')} ({stagedFiles.length})
            </span>
          </div>
          <div className="border rounded-md bg-green-500/5">
            {stagedFiles.map((file) => (
              <div
                key={file.path}
                className={cn(
                  'flex items-center gap-1 py-1 px-2 hover:bg-muted/50 cursor-pointer',
                  selectedFiles.has(file.path) && 'bg-primary/10'
                )}
                onClick={() => toggleSelectFile(file.path)}
              >
                <Checkbox
                  checked={selectedFiles.has(file.path)}
                  onCheckedChange={() => toggleSelectFile(file.path)}
                  className="h-3 w-3"
                />
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate flex-1">{file.path}</span>
                {getStatusBadge(file.status, file.staged)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unstaged Section */}
      {unstagedFiles.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2">
            <Square className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {t('unstaged')} ({unstagedFiles.length})
            </span>
          </div>
          <ScrollArea className="h-48">
            <div className="border rounded-md">{renderNode(tree)}</div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
