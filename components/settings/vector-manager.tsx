'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVectorDB } from '@/hooks/use-vector-db';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { VectorCollectionInfo } from '@/lib/vector';

export function VectorManager() {
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

  const handleSearch = async () => {
    if (!collectionName) return;
    let parsedFilter: Record<string, unknown> | undefined;
    if (filterJson.trim()) {
      try {
        parsedFilter = JSON.parse(filterJson);
        if (typeof parsedFilter !== 'object' || Array.isArray(parsedFilter)) {
          setFilterError('Filter must be a JSON object');
          setResults([{ id: 'error', content: 'Invalid filter JSON object', score: 0 }]);
          return;
        }
        setFilterError(null);
      } catch {
        setFilterError('Invalid JSON');
        setResults([{ id: 'error', content: 'Invalid filter JSON', score: 0 }]);
        return;
      }
    } else {
      setFilterError(null);
      parsedFilter = undefined;
    }
    const res = await vector.searchWithOptions(query, { topK, threshold, filter: parsedFilter });
    const sorted = [...res].sort((a, b) => {
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
  };

  const handleRefresh = async () => {
    const list = await vector.listAllCollections();
    setCollections(list);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections & Search</CardTitle>
        <CardDescription>Manage collections, clear data, and run vector searches.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Active collection</Label>
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
                Refresh
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Create new collection</Label>
            <div className="flex gap-2">
              <Input
                placeholder="collection name"
                value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)}
              />
              <Button onClick={handleCreate} disabled={!newCollection.trim()}>
                Create
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDelete} disabled={!collectionName}>
            Delete collection
          </Button>
          <Button variant="outline" onClick={handleClear} disabled={!collectionName}>
            Clear collection
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Add document</Label>
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="Document content"
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              className="md:col-span-2"
            />
            <Input
              placeholder='Metadata JSON e.g. {"type":"note"}'
              value={newDocMeta}
              onChange={(e) => setNewDocMeta(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddDocument} disabled={!newDocContent.trim()}>
              Add Document
            </Button>
            {filterError && <p className="text-xs text-destructive">{filterError}</p>}
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label>Query</Label>
            <Input
              placeholder="Search text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Top K</Label>
            <Input
              type="number"
              min={1}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-2">
            <Label>Threshold (0-1)</Label>
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
            <Label>Filter (JSON)</Label>
            <Input
              placeholder='e.g. {"type":"doc"}'
              value={filterJson}
              onChange={(e) => setFilterJson(e.target.value)}
            />
            {filterError && <p className="text-xs text-destructive">{filterError}</p>}
          </div>
          <div className="space-y-2">
            <Label>Sort</Label>
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
          <div className="flex items-end">
            <Button onClick={handleSearch} className="w-full">
              Search
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Results</Label>
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
