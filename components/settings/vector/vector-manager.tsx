'use client';

import { useTranslations } from 'next-intl';
import { FilePlus, MoreHorizontal, Trash2, Eraser, Download, Upload, Pencil, Search, FileText, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddDocumentModal } from './add-document-modal';
import { SectionHeader } from './section-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { SettingsCard } from '@/components/settings/common/settings-section';
import { useVectorManager } from '@/hooks/vector/use-vector-manager';

export function VectorManager() {
  const t = useTranslations('vectorManager');

  const {
    // Collection state
    collectionName, setCollectionName, collections, newCollection, setNewCollection,
    stats, selectedCollectionInfo,
    // Document state
    newDocContent, setNewDocContent, newDocMeta, setNewDocMeta, filterError,
    // Search state
    query, setQuery, topK, setTopK, threshold, setThreshold,
    filterJson, setFilterJson, results, sortOrder, setSortOrder,
    sortField, setSortField, totalResults, totalPages, currentPage, pageSize, setPageSize,
    // UI state
    showAddDocModal, setShowAddDocModal, showRenameDialog, setShowRenameDialog,
    renameNewName, setRenameNewName, activeTab, setActiveTab,
    expanded, setExpanded, showMetadataSummary, setShowMetadataSummary,
    confirmAction, setConfirmAction, confirmLabels, fileInputRef, settings,
    // Handlers
    handleRefresh, handleCreate, handleRename, handleExport, handleImport,
    handleAddDocument, handleAddDocumentsFromModal, handleSearchWithPagination,
    handlePeek, handleConfirmAction,
  } = useVectorManager();

  return (
    <SettingsCard
      title={t('title')}
      description={t('description')}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto bg-muted/30 border rounded-lg p-1 gap-1 flex">
          <TabsTrigger value="collections" className="flex-1 gap-1.5 text-xs sm:text-sm h-8 rounded-md">
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('activeCollection')}</span>
            <span className="sm:hidden">{t('activeCollection')}</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex-1 gap-1.5 text-xs sm:text-sm h-8 rounded-md">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('addDocument')}</span>
            <span className="sm:hidden">{t('addDocument')}</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex-1 gap-1.5 text-xs sm:text-sm h-8 rounded-md">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('query')}</span>
            <span className="sm:hidden">{t('query')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Collection Management */}
        <TabsContent value="collections" className="space-y-3 mt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm">{t('activeCollection')}</Label>
              <div className="flex gap-2">
                <Select value={collectionName} onValueChange={setCollectionName}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder={t('activeCollection')} />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name} ({c.documentCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleRefresh} size="sm" className="h-9">
                  {t('refresh')}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t('createNewCollection')}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t('collectionNamePlaceholder')}
                  value={newCollection}
                  onChange={(e) => setNewCollection(e.target.value)}
                  className="h-9"
                />
                <Button onClick={handleCreate} disabled={!newCollection.trim()} size="sm" className="h-9">
                  {t('create')}
                </Button>
              </div>
            </div>
          </div>

          {/* Collection Info + Stats */}
          {(selectedCollectionInfo || stats) && (
            <div className="p-2.5 rounded-lg border bg-muted/20 text-xs text-muted-foreground space-y-1.5">
              {selectedCollectionInfo && (
                <>
                  <div className="text-sm font-medium text-foreground">{selectedCollectionInfo.name}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>{t('documents')}: {selectedCollectionInfo.documentCount}</span>
                    {selectedCollectionInfo.dimension && <span>{t('dimension')}: {selectedCollectionInfo.dimension}</span>}
                    {selectedCollectionInfo.embeddingModel && <span>{t('model')}: {selectedCollectionInfo.embeddingModel}</span>}
                    {selectedCollectionInfo.embeddingProvider && <span>{t('provider')}: {selectedCollectionInfo.embeddingProvider}</span>}
                  </div>
                </>
              )}
              {stats && (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>{t('collections')}: {stats.collectionCount}</span>
                  <span>{t('totalPoints')}: {stats.totalPoints}</span>
                  <span>{t('storage')}: {(stats.storageSizeBytes / 1024).toFixed(1)} KB</span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons: grouped primary + secondary */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setShowAddDocModal(true)} className="gap-1.5">
                <FilePlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('addFromFiles')}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!collectionName} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('export')}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('import')}</span>
              </Button>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <Button variant="outline" size="sm" onClick={() => { setRenameNewName(collectionName); setShowRenameDialog(true); }} disabled={!collectionName} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('renameCollection')}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setConfirmAction('clear')} disabled={!collectionName}>
                    <Eraser className="mr-2 h-3.5 w-3.5" />
                    {t('clearCollection')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirmAction('truncate')} disabled={!collectionName}>
                    <Eraser className="mr-2 h-3.5 w-3.5" />
                    {t('truncate')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setConfirmAction('deleteAllDocs')}
                    disabled={!collectionName}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    {t('deleteAllDocs')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setConfirmAction('delete')}
                    disabled={!collectionName}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    {t('deleteCollection')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </TabsContent>

        {/* Tab 2: Add Document */}
        <TabsContent value="documents" className="space-y-3 mt-3">
          <SectionHeader icon={FileText} title={t('addDocument')} />
          <div className="space-y-2">
            <Textarea
              placeholder={t('documentContentPlaceholder')}
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              className="min-h-[80px] w-full"
            />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('metadataPlaceholder')}</Label>
              <Textarea
                placeholder='{"source": "manual", "category": "faq"}'
                value={newDocMeta}
                onChange={(e) => setNewDocMeta(e.target.value)}
                className="min-h-[48px] font-mono text-xs"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Button size="sm" onClick={handleAddDocument} disabled={!newDocContent.trim()}>
                {t('addDocumentBtn')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setActiveTab('collections'); setShowAddDocModal(true); }} className="gap-1.5">
                <FilePlus className="h-3.5 w-3.5" />
                {t('addFromFiles')}
              </Button>
              {filterError && <p className="text-xs text-destructive">{filterError}</p>}
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Search & Results */}
        <TabsContent value="search" className="space-y-3 mt-3">
          <SectionHeader icon={Search} title={t('query')} />

          {/* Row 1: Search input full width */}
          <Input
            placeholder={t('searchTextPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />

          {/* Row 2: topK + threshold */}
          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('topK')}</Label>
              <Input
                type="number"
                min={1}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value) || 1)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('threshold')}</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value) || 0)}
                className="h-9"
              />
            </div>
          </div>

          {/* Row 3: Filter JSON full width */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('filterJson')}</Label>
            <Input
              placeholder={t('filterPlaceholder')}
              value={filterJson}
              onChange={(e) => setFilterJson(e.target.value)}
              className="h-9"
            />
            {filterError && <p className="text-xs text-destructive">{filterError}</p>}
          </div>

          {/* Row 4: Sort + PageSize + Buttons */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('sort')}</Label>
              <Select value={`${sortField}-${sortOrder}`} onValueChange={(v) => {
                const [field, order] = v.split('-') as [typeof sortField, typeof sortOrder];
                setSortField(field);
                setSortOrder(order);
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score-desc">{t('sortByScore')} ↓</SelectItem>
                  <SelectItem value="score-asc">{t('sortByScore')} ↑</SelectItem>
                  <SelectItem value="id-desc">{t('sortById')} ↓</SelectItem>
                  <SelectItem value="id-asc">{t('sortById')} ↑</SelectItem>
                  <SelectItem value="metadataLen-desc">{t('sortByMetadataSize')} ↓</SelectItem>
                  <SelectItem value="metadataLen-asc">{t('sortByMetadataSize')} ↑</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('pageSize')}</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 10)}
                className="h-9"
              />
            </div>
            <div className="flex items-end col-span-2 sm:col-span-2 gap-2">
              <Button onClick={() => handleSearchWithPagination(1)} className="flex-1 h-9">
                {t('search')}
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={handlePeek}>
                {t('peekBtn')}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowMetadataSummary((v) => !v)}
            >
              {showMetadataSummary ? t('hideSummary') : t('showSummary')}
            </Button>
            <span className="text-xs text-muted-foreground">{t('toggleSummaryHint')}</span>
          </div>

          {/* Results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('results')} {totalResults > 0 && <span className="text-muted-foreground">({totalResults} {t('total')})</span>}</Label>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    disabled={currentPage <= 1}
                    onClick={() => handleSearchWithPagination(currentPage - 1)}
                  >
                    {t('prev')}
                  </Button>
                  <span className="text-xs text-muted-foreground px-1">
                    {t('pageInfo', { current: currentPage, total: totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    disabled={currentPage >= totalPages}
                    onClick={() => handleSearchWithPagination(currentPage + 1)}
                  >
                    {t('next')}
                  </Button>
                </div>
              )}
            </div>
            <ScrollArea className="min-h-[120px] max-h-[min(400px,50vh)] rounded-md border p-3">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('noResults')}</p>
              ) : (
                <div className="space-y-2">
                  {results.map((r) => (
                    <div key={r.id} className="rounded-md border p-2.5 space-y-1 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate flex-1">{r.id}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {r.score.toFixed(4)}
                          </Badge>
                          {r.metadata && Object.keys(r.metadata).length > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {t('metadata')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground break-words line-clamp-3">{r.content}</div>
                      {r.metadata && (
                        <div className="space-y-1">
                          {showMetadataSummary && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              {JSON.stringify(r.metadata).slice(0, 100)}
                              {JSON.stringify(r.metadata).length > 100 ? '…' : ''}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px]"
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }))
                            }
                          >
                            {expanded[r.id] ? t('hideMetadata') : t('showMetadata')}
                          </Button>
                          {expanded[r.id] && (
                            <pre className="rounded bg-muted/50 p-2 text-[10px] text-muted-foreground overflow-x-auto">
                              {JSON.stringify(r.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('renameCollection')}</DialogTitle>
            <DialogDescription>
              {collectionName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">{t('newName')}</Label>
            <Input
              value={renameNewName}
              onChange={(e) => setRenameNewName(e.target.value)}
              placeholder={t('newName')}
              className="h-9"
              onKeyDown={(e) => e.key === 'Enter' && renameNewName.trim() && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>{t('cancel')}</Button>
            <Button onClick={handleRename} disabled={!renameNewName.trim()}>{t('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog for dangerous actions */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction && confirmLabels[confirmAction].title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction && confirmLabels[confirmAction].desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>{t('confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Document Modal */}
      <AddDocumentModal
        open={showAddDocModal}
        onOpenChange={setShowAddDocModal}
        collectionName={collectionName}
        onAddDocuments={handleAddDocumentsFromModal}
        chunkSize={settings.chunkSize}
        chunkOverlap={settings.chunkOverlap}
      />
    </SettingsCard>
  );
}

export default VectorManager;
