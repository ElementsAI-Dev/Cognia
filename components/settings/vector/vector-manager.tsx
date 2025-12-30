'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVectorDB } from '@/hooks/use-vector-db';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { VectorCollectionInfo, VectorStats, CollectionExport } from '@/lib/vector';

export function VectorManager() {
  const t = useTranslations('vectorManager');

  const [collectionName, setCollectionName] = useState('default');
  const [collections, setCollections] = useState<VectorCollectionInfo[]>([]);
  const [newCollection, setNewCollection] = useState('');
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0);
  const [filterJson, setFilterJson] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocMeta, setNewDocMeta] = useState('');
  const [results, setResults] = useState<
    { id: string; content: string; score: number; metadata?: Record<string, unknown> }[]
  >([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [sortField, setSortField] = useState<'score' | 'id' | 'metadataLen'>('score');
  const [filterError, setFilterError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showMetadataSummary, setShowMetadataSummary] = useState(true);
  
  // New state for enhanced features
  const [renameNewName, setRenameNewName] = useState('');
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [stats, setStats] = useState<VectorStats | null>(null);
  const [selectedCollectionInfo, setSelectedCollectionInfo] = useState<VectorCollectionInfo | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vector = useVectorDB({ collectionName, autoInitialize: false });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await vector.listAllCollections();
        if (mounted) setCollections(list);
      } catch {
        // ignore load errors in settings UI
      }
    })();
    return () => {
      mounted = false;
    };
  }, [vector]);

  const handleCreate = async () => {
    const name = newCollection.trim();
    if (!name) return;
    await vector.createCollection(name);
    setCollectionName(name);
    setNewCollection('');
    const list = await vector.listAllCollections();
    setCollections(list);
  };

  const handleDelete = async () => {
    if (!collectionName) return;
    await vector.deleteCollection(collectionName);
    setCollectionName(collections.find((c) => c.name !== collectionName)?.name || 'default');
    const list = await vector.listAllCollections();
    setCollections(list);
  };

  const handleClear = async () => {
    if (!collectionName) return;
    await vector.clearCollection();
    const list = await vector.listAllCollections();
    setCollections(list);
  };

  const handleAddDocument = async () => {
    if (!collectionName || !newDocContent.trim()) return;
    let parsedMeta: Record<string, unknown> | undefined;
    if (newDocMeta.trim()) {
      try {
        parsedMeta = JSON.parse(newDocMeta);
        if (typeof parsedMeta !== 'object' || Array.isArray(parsedMeta)) {
          setFilterError('Document metadata must be JSON object');
          return;
        }
      } catch {
        setFilterError('Invalid document metadata JSON');
        return;
      }
    }
    setFilterError(null);
    await vector.addDocument(newDocContent, parsedMeta as Record<string, string | number | boolean> | undefined);
    setNewDocContent('');
    setNewDocMeta('');
    const list = await vector.listAllCollections();
    setCollections(list);
  };

  const handleRefresh = async () => {
    const list = await vector.listAllCollections();
    setCollections(list);
    // Load stats
    try {
      const s = await vector.getStats();
      setStats(s);
    } catch {
      // Stats not available
    }
    // Load selected collection info
    if (collectionName) {
      try {
        const info = await vector.getCollectionInfo(collectionName);
        setSelectedCollectionInfo(info);
      } catch {
        setSelectedCollectionInfo(null);
      }
    }
  };

  const handleRename = async () => {
    if (!collectionName || !renameNewName.trim()) return;
    try {
      await vector.renameCollection(collectionName, renameNewName.trim());
      setCollectionName(renameNewName.trim());
      setRenameNewName('');
      setShowRenameInput(false);
      setActionMessage({ type: 'success', text: 'Collection renamed successfully' });
      await handleRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Rename failed' });
    }
  };

  const handleTruncate = async () => {
    if (!collectionName) return;
    try {
      await vector.truncateCollection(collectionName);
      setActionMessage({ type: 'success', text: 'Collection truncated successfully' });
      await handleRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Truncate failed' });
    }
  };

  const handleDeleteAllDocs = async () => {
    if (!collectionName) return;
    try {
      const count = await vector.removeAllDocuments();
      setActionMessage({ type: 'success', text: `Deleted ${count} documents` });
      await handleRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Delete all failed' });
    }
  };

  const handleExport = async () => {
    if (!collectionName) return;
    try {
      const data = await vector.exportCollection(collectionName);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collectionName}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      setActionMessage({ type: 'success', text: 'Collection exported successfully' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Export failed' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as CollectionExport;
      await vector.importCollection(data, true);
      setActionMessage({ type: 'success', text: `Imported collection: ${data.meta.name}` });
      await handleRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Import failed' });
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSearchWithPagination = async (page: number = 1) => {
    if (!collectionName) return;
    setCurrentPage(page);
    const offset = (page - 1) * pageSize;
    
    let parsedFilter: Record<string, unknown> | undefined;
    if (filterJson.trim()) {
      try {
        parsedFilter = JSON.parse(filterJson);
        if (typeof parsedFilter !== 'object' || Array.isArray(parsedFilter)) {
          setFilterError('Filter must be a JSON object');
          return;
        }
        setFilterError(null);
      } catch {
        setFilterError('Invalid JSON');
        return;
      }
    }
    
    try {
      const response = await vector.searchWithTotal(query, { 
        topK, 
        threshold: threshold > 0 ? threshold : undefined, 
        filter: parsedFilter,
        offset,
        limit: pageSize,
      });
      setTotalResults(response.total);
      const sorted = [...response.results].sort((a, b) => {
        if (sortField === 'id') {
          const cmp = a.id.localeCompare(b.id);
          return sortOrder === 'desc' ? -cmp : cmp;
        }
        if (sortField === 'metadataLen') {
          const lenA = a.metadata ? JSON.stringify(a.metadata).length : 0;
          const lenB = b.metadata ? JSON.stringify(b.metadata).length : 0;
          return sortOrder === 'desc' ? lenB - lenA : lenA - lenB;
        }
        return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
      });
      setResults(sorted);
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Search failed' });
    }
  };

  const totalPages = Math.ceil(totalResults / pageSize);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('activeCollection')}</Label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border px-2 py-1 text-sm"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
              >
                {collections.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.documentCount})
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={handleRefresh} size="sm">
                {t('refresh')}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('createNewCollection')}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t('collectionNamePlaceholder')}
                value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)}
              />
              <Button onClick={handleCreate} disabled={!newCollection.trim()}>
                {t('create')}
              </Button>
            </div>
          </div>
        </div>

        {/* Action message */}
        {actionMessage && (
          <div className={`p-2 rounded-md text-sm ${actionMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
            {actionMessage.text}
            <Button variant="ghost" size="sm" className="ml-2 h-5" onClick={() => setActionMessage(null)}>×</Button>
          </div>
        )}

        {/* Collection info display */}
        {selectedCollectionInfo && (
          <div className="p-3 rounded-md border bg-muted/30 text-sm space-y-1">
            <div className="font-medium">{t('collection')}: {selectedCollectionInfo.name}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
              <span>{t('documents')}: {selectedCollectionInfo.documentCount}</span>
              {selectedCollectionInfo.dimension && <span>{t('dimension')}: {selectedCollectionInfo.dimension}</span>}
              {selectedCollectionInfo.embeddingModel && <span>{t('model')}: {selectedCollectionInfo.embeddingModel}</span>}
              {selectedCollectionInfo.embeddingProvider && <span>{t('provider')}: {selectedCollectionInfo.embeddingProvider}</span>}
            </div>
            {selectedCollectionInfo.description && (
              <div className="text-xs text-muted-foreground">{t('descriptionLabel')}: {selectedCollectionInfo.description}</div>
            )}
          </div>
        )}

        {/* Stats display */}
        {stats && (
          <div className="p-2 rounded-md border bg-muted/20 text-xs text-muted-foreground flex flex-wrap gap-4">
            <span>{t('collections')}: {stats.collectionCount}</span>
            <span>{t('totalPoints')}: {stats.totalPoints}</span>
            <span>{t('storage')}: {(stats.storageSizeBytes / 1024).toFixed(1)} KB</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDelete} disabled={!collectionName}>
            {t('deleteCollection')}
          </Button>
          <Button variant="outline" onClick={handleClear} disabled={!collectionName}>
            {t('clearCollection')}
          </Button>
          <Button variant="outline" onClick={handleTruncate} disabled={!collectionName}>
            {t('truncate')}
          </Button>
          <Button variant="outline" onClick={handleDeleteAllDocs} disabled={!collectionName}>
            {t('deleteAllDocs')}
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!collectionName}>
            {t('export')}
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            {t('import')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>

        {/* Rename section */}
        <div className="flex gap-2 items-center">
          {showRenameInput ? (
            <>
              <Input
                placeholder={t('newName')}
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                className="w-48"
              />
              <Button size="sm" onClick={handleRename} disabled={!renameNewName.trim()}>
                {t('confirm')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowRenameInput(false); setRenameNewName(''); }}>
                {t('cancel')}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowRenameInput(true)} disabled={!collectionName}>
              {t('renameCollection')}
            </Button>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>{t('addDocument')}</Label>
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder={t('documentContentPlaceholder')}
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              className="md:col-span-2"
            />
            <Input
              placeholder={t('metadataPlaceholder')}
              value={newDocMeta}
              onChange={(e) => setNewDocMeta(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddDocument} disabled={!newDocContent.trim()}>
              {t('addDocumentBtn')}
            </Button>
            {filterError && <p className="text-xs text-destructive">{filterError}</p>}
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label>{t('query')}</Label>
            <Input
              placeholder={t('searchTextPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('topK')}</Label>
            <Input
              type="number"
              min={1}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('threshold')}</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t('filterJson')}</Label>
            <Input
              placeholder={t('filterPlaceholder')}
              value={filterJson}
              onChange={(e) => setFilterJson(e.target.value)}
            />
            {filterError && <p className="text-xs text-destructive">{filterError}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t('sort')}</Label>
            <div className="flex gap-2">
              <Button
                variant={sortOrder === 'desc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOrder('desc')}
              >
                Score ↓
              </Button>
              <Button
                variant={sortOrder === 'asc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOrder('asc')}
              >
                Score ↑
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortField === 'score' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortField('score')}
              >
                Sort by score
              </Button>
              <Button
                variant={sortField === 'id' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortField('id')}
              >
                Sort by id
              </Button>
              <Button
                variant={sortField === 'metadataLen' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortField('metadataLen')}
              >
                Sort by metadata size
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => setShowMetadataSummary((v) => !v)}
              >
                {showMetadataSummary ? 'Hide summary' : 'Show summary'}
              </Button>
              <span className="text-muted-foreground">
                Toggle metadata summary preview
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('pageSize')}</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) || 10)}
              className="w-20"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => handleSearchWithPagination(1)} className="w-full">
              Search
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Results {totalResults > 0 && <span className="text-muted-foreground">({totalResults} total)</span>}</Label>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => handleSearchWithPagination(currentPage - 1)}
                >
                  Prev
                </Button>
                <span className="text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handleSearchWithPagination(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          <ScrollArea className="h-60 rounded-md border p-3">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No results</p>
            ) : (
              <div className="space-y-3">
                {results.map((r) => (
                  <div key={r.id} className="rounded-md border p-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Score: {r.score.toFixed(4)}</span>
                      {r.metadata && Object.keys(r.metadata).length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          metadata
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium truncate">{r.id}</div>
                    <div className="text-sm mt-1 wrap-break-word">{r.content}</div>
                    {r.metadata && (
                      <div className="mt-1 space-y-1">
                        {showMetadataSummary && (
                          <div className="text-[11px] text-muted-foreground">
                            Summary: {JSON.stringify(r.metadata).slice(0, 80)}
                            {JSON.stringify(r.metadata).length > 80 ? '…' : ''}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }))
                          }
                        >
                          {expanded[r.id] ? 'Hide metadata' : 'Show metadata'}
                        </Button>
                        {expanded[r.id] && (
                          <pre className="rounded bg-muted/50 p-2 text-[11px] text-muted-foreground overflow-x-auto">
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
        <div className="space-y-2">
          <Label>Peek (first N)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value) || 1)}
              className="w-24"
            />
            <Button variant="outline" onClick={async () => setResults(await vector.peek(topK))}>
              Peek
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default VectorManager;
