'use client';

/**
 * MediaLibraryPanel - Media asset management panel
 * 
 * Features:
 * - Grid/list view of media assets
 * - Import from file system
 * - Drag to timeline
 * - Search and filter
 * - Asset metadata display
 * - Thumbnail preview
 */

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FolderOpen,
  Search,
  Grid,
  List,
  Film,
  Image,
  Music,
  FileText,
  MoreHorizontal,
  Trash2,
  Info,
  Plus,
  Play,
  Clock,
  HardDrive,
  Filter,
} from 'lucide-react';

export type MediaType = 'video' | 'image' | 'audio' | 'text';

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  path: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  size: number;
  createdAt: number;
  favorite?: boolean;
  tags?: string[];
}

export interface MediaLibraryPanelProps {
  assets: MediaAsset[];
  selectedAssetIds: string[];
  onAssetSelect: (assetIds: string[]) => void;
  onAssetDoubleClick: (asset: MediaAsset) => void;
  onAssetDragStart: (asset: MediaAsset, event: React.DragEvent) => void;
  onImport: () => void;
  onDelete: (assetId: string) => void;
  onShowInfo: (asset: MediaAsset) => void;
  className?: string;
}

const MEDIA_TYPE_ICONS: Record<MediaType, typeof Film> = {
  video: Film,
  image: Image,
  audio: Music,
  text: FileText,
};

const MEDIA_TYPE_COLORS: Record<MediaType, string> = {
  video: 'bg-blue-500/10 text-blue-500',
  image: 'bg-green-500/10 text-green-500',
  audio: 'bg-purple-500/10 text-purple-500',
  text: 'bg-orange-500/10 text-orange-500',
};

export function MediaLibraryPanel({
  assets,
  selectedAssetIds,
  onAssetSelect,
  onAssetDoubleClick,
  onAssetDragStart,
  onImport,
  onDelete,
  onShowInfo,
  className,
}: MediaLibraryPanelProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<MediaType | 'all'>('all');
  const [sortBy, _setSortBy] = useState<'name' | 'date' | 'size'>('date');

  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((a) => a.type === filterType);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.createdAt - a.createdAt;
        case 'size':
          return b.size - a.size;
        default:
          return 0;
      }
    });

    return filtered;
  }, [assets, filterType, searchQuery, sortBy]);

  const handleAssetClick = useCallback(
    (e: React.MouseEvent, asset: MediaAsset) => {
      if (e.ctrlKey || e.metaKey) {
        if (selectedAssetIds.includes(asset.id)) {
          onAssetSelect(selectedAssetIds.filter((id) => id !== asset.id));
        } else {
          onAssetSelect([...selectedAssetIds, asset.id]);
        }
      } else {
        onAssetSelect([asset.id]);
      }
    },
    [selectedAssetIds, onAssetSelect]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex flex-col h-full bg-background border rounded-lg', className)}>
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Media Library
          </h3>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Grid View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>List View</TooltipContent>
            </Tooltip>
            <Button size="sm" onClick={onImport}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Import
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as MediaType | 'all')}>
            <SelectTrigger className="h-8 w-24">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="text">Text</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Asset list */}
      <ScrollArea className="flex-1">
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No media files</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onImport}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Import Media
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredAssets.map((asset) => {
              const Icon = MEDIA_TYPE_ICONS[asset.type];
              const isSelected = selectedAssetIds.includes(asset.id);

              return (
                <div
                  key={asset.id}
                  draggable
                  className={cn(
                    'group relative aspect-video rounded-lg overflow-hidden cursor-pointer transition-all',
                    'border-2 hover:border-primary/50',
                    isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
                  )}
                  onClick={(e) => handleAssetClick(e, asset)}
                  onDoubleClick={() => onAssetDoubleClick(asset)}
                  onDragStart={(e) => onAssetDragStart(asset, e)}
                >
                  {/* Thumbnail */}
                  {asset.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Icon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Duration badge */}
                  {asset.duration && (
                    <Badge
                      variant="secondary"
                      className="absolute bottom-1 right-1 text-xs bg-black/60 text-white"
                    >
                      {formatDuration(asset.duration)}
                    </Badge>
                  )}

                  {/* Type badge */}
                  <Badge
                    variant="outline"
                    className={cn(
                      'absolute top-1 left-1 text-xs',
                      MEDIA_TYPE_COLORS[asset.type]
                    )}
                  >
                    {asset.type}
                  </Badge>

                  {/* Name */}
                  <div className="absolute bottom-0 left-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{asset.name}</p>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onAssetDoubleClick(asset)}>
                          <Play className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onShowInfo(asset)}>
                          <Info className="h-4 w-4 mr-2" />
                          Info
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(asset.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredAssets.map((asset) => {
              const Icon = MEDIA_TYPE_ICONS[asset.type];
              const isSelected = selectedAssetIds.includes(asset.id);

              return (
                <div
                  key={asset.id}
                  draggable
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                    isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'
                  )}
                  onClick={(e) => handleAssetClick(e, asset)}
                  onDoubleClick={() => onAssetDoubleClick(asset)}
                  onDragStart={(e) => onAssetDragStart(asset, e)}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-8 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {asset.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{asset.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className={cn('text-xs', MEDIA_TYPE_COLORS[asset.type])}>
                        {asset.type}
                      </Badge>
                      {asset.duration && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {formatDuration(asset.duration)}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(asset.size)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAssetDoubleClick(asset)}>
                        <Play className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShowInfo(asset)}>
                        <Info className="h-4 w-4 mr-2" />
                        Info
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(asset.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer status */}
      <div className="p-2 border-t text-xs text-muted-foreground flex items-center justify-between">
        <span>{filteredAssets.length} items</span>
        {selectedAssetIds.length > 0 && (
          <span>{selectedAssetIds.length} selected</span>
        )}
      </div>
    </div>
  );
}

export default MediaLibraryPanel;
