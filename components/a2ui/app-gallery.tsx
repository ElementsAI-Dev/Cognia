'use client';

/**
 * A2UI App Gallery Component
 * Displays and manages created A2UI mini-apps in a gallery view
 * Enhanced with thumbnail support, metadata display, and app store preparation
 */

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search,
  ExternalLink,
  Sparkles,
  LayoutGrid,
  LayoutList,
  Filter,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { useA2UIAppBuilder, type A2UIAppInstance } from '@/hooks/a2ui/use-app-builder';
import { A2UIInlineSurface } from './a2ui-surface';
import { AppCard } from './app-card';
import { AppDetailDialog } from './app-detail-dialog';
import { captureSurfaceThumbnail } from '@/lib/a2ui/thumbnail';
import type { A2UIUserAction, A2UIDataModelChange } from '@/types/artifact/a2ui';

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'lastModified' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const CATEGORY_OPTIONS = [
  { value: 'all', label: '全部分类' },
  { value: 'productivity', label: '效率工具' },
  { value: 'data', label: '数据分析' },
  { value: 'form', label: '表单' },
  { value: 'utility', label: '实用工具' },
  { value: 'social', label: '社交' },
];

interface AppGalleryProps {
  className?: string;
  onAction?: (action: A2UIUserAction) => void;
  onDataChange?: (change: A2UIDataModelChange) => void;
  onAppOpen?: (appId: string) => void;
  showPreview?: boolean;
  showThumbnails?: boolean;
  columns?: 1 | 2 | 3 | 4;
  defaultViewMode?: ViewMode;
}

export function AppGallery({
  className,
  onAction,
  onDataChange,
  onAppOpen,
  showPreview = true,
  showThumbnails = true,
  columns = 2,
  defaultViewMode = 'grid',
}: AppGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renameDialogId, setRenameDialogId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [detailApp, setDetailApp] = useState<A2UIAppInstance | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('lastModified');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const appBuilder = useA2UIAppBuilder({
    onAction: (action) => {
      appBuilder.handleAppAction(action);
      onAction?.(action);
    },
    onDataChange,
  });

  // Get and filter apps
  const apps = useMemo(() => {
    let filteredApps = appBuilder.getAllApps();

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredApps = filteredApps.filter((app) => {
        const template = appBuilder.getTemplate(app.templateId);
        return (
          app.name.toLowerCase().includes(query) ||
          app.description?.toLowerCase().includes(query) ||
          template?.name.toLowerCase().includes(query) ||
          template?.tags.some((t) => t.toLowerCase().includes(query)) ||
          app.tags?.some((t) => t.toLowerCase().includes(query))
        );
      });
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filteredApps = filteredApps.filter((app) => {
        const template = appBuilder.getTemplate(app.templateId);
        return app.category === categoryFilter || template?.category === categoryFilter;
      });
    }

    // Sort
    filteredApps.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'lastModified':
          comparison = a.lastModified - b.lastModified;
          break;
        case 'createdAt':
          comparison = a.createdAt - b.createdAt;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filteredApps;
  }, [appBuilder, searchQuery, categoryFilter, sortField, sortOrder]);

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

  // Handle thumbnail generation
  const handleThumbnailGenerated = useCallback(
    (appId: string, thumbnail: string) => {
      appBuilder.setAppThumbnail(appId, thumbnail);
    },
    [appBuilder]
  );

  // Handle generate thumbnail for selected app
  const handleGenerateThumbnail = useCallback(
    async (appId: string) => {
      try {
        const result = await captureSurfaceThumbnail(appId);
        if (result) {
          appBuilder.setAppThumbnail(appId, result.dataUrl);
        }
      } catch (error) {
        console.error('[AppGallery] Failed to generate thumbnail:', error);
      }
    },
    [appBuilder]
  );

  // Handle metadata save
  const handleMetadataSave = useCallback(
    (appId: string, metadata: Partial<A2UIAppInstance>) => {
      appBuilder.updateAppMetadata(appId, metadata);
    },
    [appBuilder]
  );

  // Handle view details
  const handleViewDetails = useCallback(
    (app: A2UIAppInstance) => {
      setDetailApp(app);
      appBuilder.incrementAppViews(app.id);
    },
    [appBuilder]
  );

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

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
    if (viewMode === 'list') return 'grid-cols-1';
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

  // Render app card
  const renderAppCard = (app: A2UIAppInstance) => {
    const template = appBuilder.getTemplate(app.templateId);
    const isSelected = selectedAppId === app.id;

    return (
      <AppCard
        key={app.id}
        app={app}
        template={template}
        isSelected={isSelected}
        showThumbnail={showThumbnails && viewMode === 'grid'}
        showStats={true}
        showDescription={viewMode === 'grid'}
        compact={viewMode === 'list'}
        onSelect={handleSelectApp}
        onOpen={onAppOpen}
        onRename={openRenameDialog}
        onDuplicate={handleDuplicate}
        onDelete={(id) => setDeleteConfirmId(id)}
        onReset={(id) => appBuilder.resetAppData(id)}
        onViewDetails={handleViewDetails}
        onThumbnailGenerated={handleThumbnailGenerated}
      />
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
        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>网格视图</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>列表视图</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-3 sm:p-4 border-b space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索应用..."
              className="pl-9 text-sm sm:text-base"
            />
          </div>
          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32 sm:w-36">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Sort options */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>排序:</span>
          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastModified">修改时间</SelectItem>
              <SelectItem value="createdAt">创建时间</SelectItem>
              <SelectItem value="name">名称</SelectItem>
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={toggleSortOrder}>
            {sortOrder === 'asc' ? (
              <SortAsc className="h-3 w-3" />
            ) : (
              <SortDesc className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Content - Mobile optimized with responsive preview */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Apps list */}
        <ScrollArea className={cn('flex-1', showPreview && selectedAppId && 'sm:w-1/2')}>
          <div className={cn('p-3 sm:p-4 grid gap-2 sm:gap-3', getGridClass())}>
            {apps.map(renderAppCard)}
            {apps.length === 0 && (
              <div className="col-span-full text-center py-8 sm:py-12 text-muted-foreground">
                <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-base sm:text-lg font-medium">还没有应用</p>
                <p className="text-xs sm:text-sm">从模板创建你的第一个应用</p>
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
            <DialogDescription>确定要删除这个应用吗？此操作无法撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto touch-manipulation"
              onClick={() => setDeleteConfirmId(null)}
            >
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
            <Button
              variant="outline"
              className="w-full sm:w-auto touch-manipulation"
              onClick={() => setRenameDialogId(null)}
            >
              取消
            </Button>
            <Button
              className="w-full sm:w-auto touch-manipulation"
              onClick={handleRename}
              disabled={!newName.trim()}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* App detail dialog */}
      <AppDetailDialog
        app={detailApp}
        template={detailApp ? appBuilder.getTemplate(detailApp.templateId) : undefined}
        open={!!detailApp}
        onOpenChange={(open) => !open && setDetailApp(null)}
        onSave={handleMetadataSave}
        onGenerateThumbnail={handleGenerateThumbnail}
        onPreparePublish={appBuilder.prepareForPublish}
      />
    </div>
  );
}

export default AppGallery;
