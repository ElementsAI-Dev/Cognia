'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useVectorDB } from '@/hooks/rag';
import { useVectorStore } from '@/stores';
import type { VectorCollectionInfo, VectorStats, CollectionExport } from '@/lib/vector';

export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export function useVectorManager() {
  const t = useTranslations('vectorManager');
  const settings = useVectorStore((state) => state.settings);

  // Collection state
  const [collectionName, setCollectionName] = useState('default');
  const [collections, setCollections] = useState<VectorCollectionInfo[]>([]);
  const [newCollection, setNewCollection] = useState('');
  const [stats, setStats] = useState<VectorStats | null>(null);
  const [selectedCollectionInfo, setSelectedCollectionInfo] = useState<VectorCollectionInfo | null>(null);

  // Document state
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocMeta, setNewDocMeta] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0);
  const [filterJson, setFilterJson] = useState('');
  const [results, setResults] = useState<VectorSearchResult[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [sortField, setSortField] = useState<'score' | 'id' | 'metadataLen'>('score');
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // UI state
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameNewName, setRenameNewName] = useState('');
  const [activeTab, setActiveTab] = useState('collections');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showMetadataSummary, setShowMetadataSummary] = useState(true);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'clear' | 'truncate' | 'deleteAllDocs' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vector = useVectorDB({ collectionName, autoInitialize: false });

  const totalPages = Math.ceil(totalResults / pageSize);

  // Load collections on mount
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

  // Collection handlers
  const handleRefresh = async () => {
    const list = await vector.listAllCollections();
    setCollections(list);
    try {
      const s = await vector.getStats();
      setStats(s);
    } catch {
      // Stats not available
    }
    if (collectionName) {
      try {
        const info = await vector.getCollectionInfo(collectionName);
        setSelectedCollectionInfo(info);
      } catch {
        setSelectedCollectionInfo(null);
      }
    }
  };

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

  const handleRename = async () => {
    if (!collectionName || !renameNewName.trim()) return;
    try {
      await vector.renameCollection(collectionName, renameNewName.trim());
      setCollectionName(renameNewName.trim());
      setRenameNewName('');
      setShowRenameDialog(false);
      toast.success(t('renameSuccess'));
      await handleRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('renameFailed'));
    }
  };

  const handleTruncate = async () => {
    if (!collectionName) return;
    try {
      await vector.truncateCollection(collectionName);
      toast.success(t('truncateSuccess'));
      await handleRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('truncateFailed'));
    }
  };

  const handleDeleteAllDocs = async () => {
    if (!collectionName) return;
    try {
      const count = await vector.removeAllDocuments();
      toast.success(t('deleteDocsSuccess', { count }));
      await handleRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('deleteDocsFailed'));
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
      toast.success(t('exportSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('exportFailed'));
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as CollectionExport;
      await vector.importCollection(data, true);
      toast.success(t('importSuccess', { name: data.meta.name }));
      await handleRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('importFailed'));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Document handlers
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

  const handleAddDocumentsFromModal = async (
    documents: Array<{ content: string; metadata: Record<string, unknown> }>
  ) => {
    for (const doc of documents) {
      await vector.addDocument(doc.content, doc.metadata as Record<string, string | number | boolean>);
    }
    await handleRefresh();
    setShowAddDocModal(false);
  };

  // Search handlers
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
      toast.error(err instanceof Error ? err.message : t('searchFailed'));
    }
  };

  const handlePeek = async () => {
    setResults(await vector.peek(topK));
  };

  // Confirm action handler
  const handleConfirmAction = async () => {
    switch (confirmAction) {
      case 'delete': await handleDelete(); break;
      case 'clear': await handleClear(); break;
      case 'truncate': await handleTruncate(); break;
      case 'deleteAllDocs': await handleDeleteAllDocs(); break;
    }
    setConfirmAction(null);
  };

  const confirmLabels = {
    delete: { title: t('confirmDeleteTitle'), desc: t('confirmDeleteDesc') },
    clear: { title: t('confirmClearTitle'), desc: t('confirmClearDesc') },
    truncate: { title: t('confirmTruncateTitle'), desc: t('confirmTruncateDesc') },
    deleteAllDocs: { title: t('confirmDeleteDocsTitle'), desc: t('confirmDeleteDocsDesc') },
  };

  return {
    // Collection state
    collectionName,
    setCollectionName,
    collections,
    newCollection,
    setNewCollection,
    stats,
    selectedCollectionInfo,

    // Document state
    newDocContent,
    setNewDocContent,
    newDocMeta,
    setNewDocMeta,
    filterError,

    // Search state
    query,
    setQuery,
    topK,
    setTopK,
    threshold,
    setThreshold,
    filterJson,
    setFilterJson,
    results,
    sortOrder,
    setSortOrder,
    sortField,
    setSortField,
    totalResults,
    totalPages,
    currentPage,
    pageSize,
    setPageSize,

    // UI state
    showAddDocModal,
    setShowAddDocModal,
    showRenameDialog,
    setShowRenameDialog,
    renameNewName,
    setRenameNewName,
    activeTab,
    setActiveTab,
    expanded,
    setExpanded,
    showMetadataSummary,
    setShowMetadataSummary,
    confirmAction,
    setConfirmAction,
    confirmLabels,
    fileInputRef,
    settings,

    // Handlers
    handleRefresh,
    handleCreate,
    handleRename,
    handleExport,
    handleImport,
    handleAddDocument,
    handleAddDocumentsFromModal,
    handleSearchWithPagination,
    handlePeek,
    handleConfirmAction,
  };
}
