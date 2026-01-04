'use client';

/**
 * A2UI App Gallery Component
 * Displays and manages created A2UI mini-apps in a gallery view
 */

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  MoreVertical,
  Play,
  Copy,
  Trash2,
  Edit2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Clock,
  LayoutGrid,
} from 'lucide-react';
import { icons } from 'lucide-react';
import { useA2UIAppBuilder, type A2UIAppInstance } from '@/hooks/a2ui/use-app-builder';
import { A2UIInlineSurface } from './a2ui-surface';
import type { A2UIUserAction, A2UIDataModelChange } from '@/types/a2ui';

interface AppGalleryProps {
  className?: string;
  onAction?: (action: A2UIUserAction) => void;
  onDataChange?: (change: A2UIDataModelChange) => void;
  onAppOpen?: (appId: string) => void;
  showPreview?: boolean;
  columns?: 1 | 2 | 3 | 4;
}

export function AppGallery({
  className,
  onAction,
  onDataChange,
  onAppOpen,
  showPreview = true,
  columns = 2,
}: AppGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renameDialogId, setRenameDialogId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const appBuilder = useA2UIAppBuilder({
    onAction: (action) => {
      appBuilder.handleAppAction(action);
      onAction?.(action);
    },
    onDataChange,
  });

  // Get and filter apps
  const apps = useMemo(() => {
    const allApps = appBuilder.getAllApps();
    if (!searchQuery) return allApps;

    const query = searchQuery.toLowerCase();
    return allApps.filter((app) => {
      const template = appBuilder.getTemplate(app.templateId);
      return (
        app.name.toLowerCase().includes(query) ||
        template?.name.toLowerCase().includes(query) ||
        template?.tags.some((t) => t.toLowerCase().includes(query))
      );
    });
  }, [appBuilder, searchQuery]);

  // Handle app selection
  const handleSelectApp = useCallback(
    (appId: string) => {
      setSelectedAppId(appId);
      onAppOpen?.(appId);
    },
    [onAppOpen]
  );

  // Handle delete
  const handleDelete = useCallback(
    (appId: string) => {
      appBuilder.deleteApp(appId);
      if (selectedAppId === appId) {
        setSelectedAppId(null);
      }
      setDeleteConfirmId(null);
    },
    [appBuilder, selectedAppId]
  );

  // Handle duplicate
  const handleDuplicate = useCallback(
    (appId: string) => {
      const newAppId = appBuilder.duplicateApp(appId);
      if (newAppId) {
        setSelectedAppId(newAppId);
      }
    },
    [appBuilder]
  );

  // Handle rename
  const handleRename = useCallback(() => {
    if (renameDialogId && newName.trim()) {
      appBuilder.renameApp(renameDialogId, newName.trim());
      setRenameDialogId(null);
      setNewName('');
    }
  }, [appBuilder, renameDialogId, newName]);

  // Open rename dialog
  const openRenameDialog = useCallback((app: A2UIAppInstance) => {
    setRenameDialogId(app.id);
    setNewName(app.name);
  }, []);

  // Get column class
  const getGridClass = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      default:
        return 'grid-cols-1 md:grid-cols-2';
    }
  };

  // Format date - localized
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

    return date.toLocaleDateString();
  };

  // Render app card
  const renderAppCard = (app: A2UIAppInstance) => {
    const template = appBuilder.getTemplate(app.templateId);
    const IconComponent = template?.icon
      ? icons[template.icon as keyof typeof icons]
      : null;
    const isSelected = selectedAppId === app.id;

    return (
      <Card
        key={app.id}
        className={cn(
          'group relative transition-all hover:shadow-md active:shadow-md cursor-pointer touch-manipulation',
          isSelected && 'ring-2 ring-primary shadow-md'
        )}
        onClick={() => handleSelectApp(app.id)}
      >
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div
                className={cn(
                  'flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg',
                  isSelected ? 'bg-primary/20' : 'bg-muted'
                )}
              >
                {IconComponent ? (
                  <IconComponent
                    className={cn(
                      'h-4 w-4 sm:h-5 sm:w-5',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                ) : (
                  <Sparkles
                    className={cn(
                      'h-4 w-4 sm:h-5 sm:w-5',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                )}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xs sm:text-sm truncate">{app.name}</CardTitle>
                <CardDescription className="text-xs truncate">
                  {template?.name || '自定义应用'}
                </CardDescription>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSelectApp(app.id)}>
                  <Play className="h-4 w-4 mr-2" />
                  打开
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openRenameDialog(app)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  重命名
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicate(app.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  复制
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => appBuilder.resetAppData(app.id)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重置数据
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteConfirmId(app.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardFooter className="pt-0 pb-2 sm:pb-3 px-3 sm:px-4">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{formatDate(app.lastModified)}</span>
            {template && (
              <Badge variant="outline" className="text-xs py-0 hidden sm:inline-flex">
                {template.category}
              </Badge>
            )}
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header - Mobile optimized */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm sm:text-base">应用库</h2>
          <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
            {apps.length}
          </Badge>
        </div>
      </div>

      {/* Search - Mobile optimized */}
      <div className="p-3 sm:p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索应用..."
            className="pl-9 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Content - Mobile optimized with responsive preview */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Apps list */}
        <ScrollArea className={cn(
          'flex-1',
          showPreview && selectedAppId && 'sm:w-1/2'
        )}>
          <div className={cn('p-3 sm:p-4 grid gap-2 sm:gap-3', getGridClass())}>
            {apps.map(renderAppCard)}
            {apps.length === 0 && (
              <div className="col-span-full text-center py-8 sm:py-12 text-muted-foreground">
                <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-base sm:text-lg font-medium">还没有应用</p>
                <p className="text-xs sm:text-sm">
                  从模板创建你的第一个应用
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Preview panel - Hidden on mobile, shown on desktop when selected */}
        {showPreview && selectedAppId && (
          <div className="hidden sm:flex sm:w-1/2 border-l flex-col">
            <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
              <span className="text-sm font-medium px-2 truncate">
                {appBuilder.getAppInstance(selectedAppId)?.name || '应用预览'}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="touch-manipulation"
                  onClick={() => onAppOpen?.(selectedAppId)}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  打开
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 touch-manipulation"
                  onClick={() => setSelectedAppId(null)}
                >
                  ×
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <A2UIInlineSurface
                surfaceId={selectedAppId}
                onAction={onAction}
                onDataChange={onDataChange}
              />
            </ScrollArea>
          </div>
        )}
      </div>
      
      {/* Mobile preview - Bottom sheet style */}
      {showPreview && selectedAppId && (
        <div className="sm:hidden border-t max-h-[50vh] flex flex-col">
          <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
            <span className="text-xs font-medium px-2 truncate flex-1">
              {appBuilder.getAppInstance(selectedAppId)?.name || '应用预览'}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs touch-manipulation"
                onClick={() => onAppOpen?.(selectedAppId)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                打开
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 touch-manipulation"
                onClick={() => setSelectedAppId(null)}
              >
                ×
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <A2UIInlineSurface
              surfaceId={selectedAppId}
              onAction={onAction}
              onDataChange={onDataChange}
            />
          </ScrollArea>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除应用</DialogTitle>
            <DialogDescription>
              确定要删除这个应用吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto touch-manipulation" onClick={() => setDeleteConfirmId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto touch-manipulation"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameDialogId} onOpenChange={() => setRenameDialogId(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重命名应用</DialogTitle>
            <DialogDescription>输入新的应用名称。</DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="应用名称"
            className="text-sm sm:text-base"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto touch-manipulation" onClick={() => setRenameDialogId(null)}>
              取消
            </Button>
            <Button className="w-full sm:w-auto touch-manipulation" onClick={handleRename} disabled={!newName.trim()}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AppGallery;
