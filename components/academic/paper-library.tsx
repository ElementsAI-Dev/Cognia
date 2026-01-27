'use client';

/**
 * PaperLibrary - Component for managing saved papers
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Library,
  Grid,
  List,
  Table2,
  Star,
  Trash2,
  FolderPlus,
  Download,
  FileText,
  MoreVertical,
  Eye,
  Clock,
  CheckCircle2,
  Archive,
  BookMarked,
  Square,
  CheckSquare,
  X,
  FolderInput,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAcademic } from '@/hooks/academic';
import { cn } from '@/lib/utils';
import type { LibraryPaper, PaperReadingStatus } from '@/types/learning/academic';

const STATUS_ICONS: Record<PaperReadingStatus, typeof Clock> = {
  unread: Clock,
  reading: BookMarked,
  completed: CheckCircle2,
  archived: Archive,
};

const STATUS_COLORS: Record<PaperReadingStatus, string> = {
  unread: 'text-muted-foreground',
  reading: 'text-blue-500',
  completed: 'text-green-500',
  archived: 'text-gray-400',
};

interface PaperLibraryProps {
  onPaperSelect?: (paper: LibraryPaper) => void;
  className?: string;
}

export function PaperLibrary({ onPaperSelect, className }: PaperLibraryProps) {
  const t = useTranslations('academic.paperLibrary');
  const {
    libraryPapers,
    collections,
    selectedCollection,
    viewMode,
    setViewMode,
    selectPaper,
    selectCollection,
    removeFromLibrary,
    updatePaperStatus,
    updatePaperRating,
    downloadPdf,
    createCollection,
    exportBibtex,
    // Batch operations
    selectedPaperIds,
    togglePaperSelection,
    selectAllPapers,
    clearPaperSelection,
    batchUpdateStatus,
    batchAddToCollection,
    batchRemove,
  } = useAcademic();
  
  const [isBatchMode, setIsBatchMode] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaperReadingStatus | 'all'>('all');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Filter papers
  const filteredPapers = useMemo(() => {
    let papers = libraryPapers;

    // Filter by collection
    if (selectedCollection) {
      papers = papers.filter((p) => p.collections?.includes(selectedCollection.id));
    }

    // Filter by status
    if (statusFilter !== 'all') {
      papers = papers.filter((p) => p.readingStatus === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      papers = papers.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.authors.some((a: { name: string }) => a.name.toLowerCase().includes(query)) ||
          p.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }

    return papers;
  }, [libraryPapers, selectedCollection, statusFilter, searchQuery]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    await createCollection(newCollectionName.trim());
    setNewCollectionName('');
    setIsCreateDialogOpen(false);
  };

  const handleExport = async () => {
    const paperIds = filteredPapers.map((p) => p.id);
    const bibtex = await exportBibtex(paperIds);

    // Download as file
    const blob = new Blob([bibtex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'papers.bib';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Sidebar - Collections */}
      <div className="w-56 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">{t('collections')}</h3>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('createCollection')}</DialogTitle>
                  <DialogDescription>
                    {t('createCollectionDescription')}
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder={t('collectionName')}
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button onClick={handleCreateCollection}>{t('create')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <Button
              variant={!selectedCollection ? 'secondary' : 'ghost'}
              className="w-full justify-start text-sm h-8"
              onClick={() => selectCollection(null)}
            >
              <Library className="h-4 w-4 mr-2" />
              {t('allPapers')}
              <Badge variant="outline" className="ml-auto text-xs">
                {libraryPapers.length}
              </Badge>
            </Button>

            {collections.map((collection) => (
              <div key={collection.id} className="group">
                <Button
                  variant={selectedCollection?.id === collection.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-sm h-8"
                  onClick={() => selectCollection(collection.id)}
                >
                  <div
                    className="h-3 w-3 rounded-full mr-2"
                    style={{ backgroundColor: collection.color || '#888' }}
                  />
                  <span className="truncate flex-1 text-left">{collection.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {collection.paperIds.length}
                  </Badge>
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder={t('searchPapers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-none border-x"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setViewMode('table')}
              >
                <Table2 className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              {t('export')}
            </Button>
          </div>

          {/* Status filters */}
          <div className="flex items-center justify-between">
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as PaperReadingStatus | 'all')}
            >
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs h-7">
                  {t('status.all')}
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs h-7">
                  {t('status.unread')}
                </TabsTrigger>
                <TabsTrigger value="reading" className="text-xs h-7">
                  {t('status.reading')}
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs h-7">
                  {t('status.completed')}
                </TabsTrigger>
                <TabsTrigger value="archived" className="text-xs h-7">
                  {t('status.archived')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button
              variant={isBatchMode ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setIsBatchMode(!isBatchMode);
                if (isBatchMode) clearPaperSelection();
              }}
            >
              {isBatchMode ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
              {isBatchMode ? t('exitSelection') : t('select')}
            </Button>
          </div>
          
          {/* Batch Action Bar */}
          {isBatchMode && selectedPaperIds.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedPaperIds.length} {t('selected')}
              </span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectAllPapers()}
              >
                {t('selectAll')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Clock className="h-4 w-4 mr-1" />
                    {t('setStatus')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => batchUpdateStatus('unread')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Unread
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => batchUpdateStatus('reading')}>
                    <BookMarked className="h-4 w-4 mr-2" />
                    Reading
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => batchUpdateStatus('completed')}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => batchUpdateStatus('archived')}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archived
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FolderInput className="h-4 w-4 mr-1" />
                    {t('addToCollection')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {collections.length === 0 ? (
                    <DropdownMenuItem disabled>{t('noCollections')}</DropdownMenuItem>
                  ) : (
                    collections.map((coll) => (
                      <DropdownMenuItem
                        key={coll.id}
                        onClick={() => batchAddToCollection(coll.id)}
                      >
                        <div
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: coll.color || '#888' }}
                        />
                        {coll.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await batchRemove();
                  clearPaperSelection();
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('remove')}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => clearPaperSelection()}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Papers list */}
        <ScrollArea className="flex-1">
          <div className={cn('p-3', viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2')}>
            {filteredPapers.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('emptyState')}</p>
                <p className="text-sm mt-2">{t('emptyStateHint')}</p>
              </div>
            ) : (
              filteredPapers.map((paper) => (
                <LibraryPaperCard
                  key={paper.libraryId}
                  paper={paper}
                  viewMode={viewMode}
                  isBatchMode={isBatchMode}
                  isSelected={selectedPaperIds.includes(paper.id)}
                  onToggleSelect={() => togglePaperSelection(paper.id)}
                  onSelect={() => {
                    if (isBatchMode) {
                      togglePaperSelection(paper.id);
                    } else {
                      selectPaper(paper.id);
                      onPaperSelect?.(paper);
                    }
                  }}
                  onStatusChange={(status) => updatePaperStatus(paper.id, status)}
                  onRatingChange={(rating) => updatePaperRating(paper.id, rating)}
                  onDownloadPdf={() => paper.pdfUrl && downloadPdf(paper.id, paper.pdfUrl)}
                  onRemove={() => removeFromLibrary(paper.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

interface LibraryPaperCardProps {
  paper: LibraryPaper;
  viewMode: 'list' | 'grid' | 'table';
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onSelect: () => void;
  onStatusChange: (status: PaperReadingStatus) => void;
  onRatingChange: (rating: number) => void;
  onDownloadPdf: () => void;
  onRemove: () => void;
}

function LibraryPaperCard({
  paper,
  viewMode,
  isBatchMode = false,
  isSelected = false,
  onToggleSelect,
  onSelect,
  onStatusChange,
  onRatingChange,
  onDownloadPdf,
  onRemove,
}: LibraryPaperCardProps) {
  const StatusIcon = STATUS_ICONS[paper.readingStatus];
  const statusColor = STATUS_COLORS[paper.readingStatus];

  const authors = paper.authors
    .slice(0, 2)
    .map((a: { name: string }) => a.name)
    .join(', ');

  if (viewMode === 'grid') {
    return (
      <Card 
        className={cn(
          'cursor-pointer hover:bg-accent/50 transition-colors',
          isSelected && 'ring-2 ring-primary'
        )} 
        onClick={onSelect}
      >
        <CardHeader className="pb-2">
          {isBatchMode && (
            <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect?.()}
              />
            </div>
          )}
          <CardTitle className="text-sm font-medium line-clamp-2">{paper.title}</CardTitle>
          <CardDescription className="text-xs line-clamp-1">{authors}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <StatusIcon className={cn('h-3.5 w-3.5', statusColor)} />
              <span className="text-xs text-muted-foreground capitalize">
                {paper.readingStatus}
              </span>
            </div>
            {paper.userRating && (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3 w-3',
                      i <= paper.userRating!
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors',
        isSelected && 'ring-2 ring-primary bg-accent/30'
      )}
      onClick={onSelect}
    >
      {isBatchMode && (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.()}
          />
        </div>
      )}
      <StatusIcon className={cn('h-5 w-5 shrink-0', statusColor)} />

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{paper.title}</h4>
        <p className="text-xs text-muted-foreground truncate">
          {authors} • {paper.year}
        </p>
      </div>

      {paper.userRating && (
        <div className="flex items-center gap-0.5 shrink-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={cn(
                'h-3 w-3',
                i <= paper.userRating!
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/30'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onRatingChange(i);
              }}
            />
          ))}
        </div>
      )}

      {paper.hasCachedPdf && (
        <Badge variant="outline" className="text-xs shrink-0">
          PDF
        </Badge>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange('reading');
            }}
          >
            <BookMarked className="h-4 w-4 mr-2" />
            Mark as Reading
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange('completed');
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark as Completed
          </DropdownMenuItem>
          {paper.pdfUrl && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDownloadPdf();
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove from Library
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default PaperLibrary;
