/**
 * useKnowledgeBase - hook for managing project knowledge base files
 * Extracts file upload, drag-drop, selection, highlighting, and delete logic
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { opener } from '@/lib/native';
import { useNativeStore, useProjectStore, useDocumentStore } from '@/stores';
import { useDocumentProcessor } from '@/hooks/document';
import { detectFileType } from '@/lib/project/knowledge-base-utils';
import { downloadFile } from '@/lib/project/import-export';
import type { KnowledgeFile } from '@/types';

interface UseKnowledgeBaseOptions {
  projectId: string;
}

/**
 * Syntax highlighting language map for file extensions
 */
const EXT_LANG_MAP: Record<string, string> = {
  js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  py: 'python', rs: 'rust', go: 'go', java: 'java',
  cpp: 'cpp', c: 'c', h: 'c', cs: 'csharp',
  rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
  xml: 'xml', html: 'html', htm: 'html', css: 'css', scss: 'scss',
  md: 'markdown', sql: 'sql', sh: 'bash', bash: 'bash',
  dockerfile: 'dockerfile', csv: 'csv',
};

export function useKnowledgeBase({ projectId }: UseKnowledgeBaseOptions) {
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewingFile, setViewingFile] = useState<KnowledgeFile | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Store access
  const isDesktop = useNativeStore((state) => state.isDesktop);
  const project = useProjectStore((state) => state.getProject(projectId));
  const addKnowledgeFile = useProjectStore((state) => state.addKnowledgeFile);
  const removeKnowledgeFile = useProjectStore((state) => state.removeKnowledgeFile);
  const updateKnowledgeFile = useProjectStore((state) => state.updateKnowledgeFile);
  const deleteFromDocumentStore = useDocumentStore((state) => state.deleteDocument);
  const { processFile, validate } = useDocumentProcessor();

  // Filtered files based on search
  const filteredFiles = useMemo(() => {
    const files = project?.knowledgeBase ?? [];
    if (!searchQuery) return files;
    const query = searchQuery.toLowerCase();
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.content.toLowerCase().includes(query)
    );
  }, [project?.knowledgeBase, searchQuery]);

  // Open file with default application (desktop only)
  const handleOpenFile = useCallback(async (file: KnowledgeFile) => {
    if (!isDesktop) return;
    const blob = new Blob([file.content], { type: file.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    await opener.openUrl(url);
  }, [isDesktop]);

  // File upload handler
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      for (const file of Array.from(files)) {
        const validation = validate(file);
        if (!validation.valid) {
          setUploadError(`${file.name}: ${validation.errors.join(', ')}`);
          continue;
        }

        try {
          const processed = await processFile(file, {
            extractEmbeddable: true,
            storeResult: true,
            projectId,
          });

          if (processed) {
            const fileContent = processed.embeddableContent || processed.content;
            addKnowledgeFile(projectId, {
              name: file.name,
              type: detectFileType(file.name, fileContent),
              content: fileContent,
              size: fileContent.length,
              mimeType: file.type,
              originalSize: file.size,
              pageCount: typeof processed.metadata.pageCount === 'number' ? processed.metadata.pageCount : undefined,
            });
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          setUploadError(`Failed to process ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [projectId, addKnowledgeFile, processFile, validate]);

  // Syntax highlighting for viewed file
  useEffect(() => {
    if (!viewingFile || isEditing) {
      setHighlightedHtml(null);
      return;
    }

    const ext = viewingFile.name.split('.').pop()?.toLowerCase() || '';
    const lang = EXT_LANG_MAP[ext];

    if (!lang || viewingFile.content.length > 50000) {
      setHighlightedHtml(null);
      return;
    }

    let cancelled = false;
    import('shiki').then(({ codeToHtml }) =>
      codeToHtml(viewingFile.content, {
        lang: lang as import('shiki').BundledLanguage,
        theme: 'github-dark',
      })
    ).then((html) => {
      if (!cancelled) setHighlightedHtml(html);
    }).catch(() => {
      if (!cancelled) setHighlightedHtml(null);
    });

    return () => { cancelled = true; };
  }, [viewingFile, isEditing]);

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const dataTransfer = new DataTransfer();
      for (const file of Array.from(files)) {
        dataTransfer.items.add(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, []);

  // Manual file add
  const handleAddManual = useCallback(() => {
    if (!newFileName.trim() || !newFileContent.trim()) return;

    addKnowledgeFile(projectId, {
      name: newFileName.trim(),
      type: detectFileType(newFileName, newFileContent),
      content: newFileContent,
      size: newFileContent.length,
    });

    setNewFileName('');
    setNewFileContent('');
    setShowAddDialog(false);
  }, [projectId, newFileName, newFileContent, addKnowledgeFile]);

  // Delete single file
  const handleDelete = useCallback(() => {
    if (!deleteFileId) return;
    const file = project?.knowledgeBase.find((f) => f.id === deleteFileId);
    removeKnowledgeFile(projectId, deleteFileId);
    if (file) {
      const docStoreDocuments = useDocumentStore.getState().filterDocuments({
        projectId,
        searchQuery: file.name,
      });
      for (const doc of docStoreDocuments) {
        if (doc.filename === file.name) {
          deleteFromDocumentStore(doc.id);
        }
      }
    }
    setDeleteFileId(null);
  }, [deleteFileId, project, projectId, removeKnowledgeFile, deleteFromDocumentStore]);

  // Batch delete
  const handleBatchDelete = useCallback(() => {
    const filesToDelete = project?.knowledgeBase.filter((f) => selectedFiles.has(f.id)) || [];
    for (const fileId of selectedFiles) {
      removeKnowledgeFile(projectId, fileId);
    }
    for (const file of filesToDelete) {
      const docStoreDocuments = useDocumentStore.getState().filterDocuments({
        projectId,
        searchQuery: file.name,
      });
      for (const doc of docStoreDocuments) {
        if (doc.filename === file.name) {
          deleteFromDocumentStore(doc.id);
        }
      }
    }
    setSelectedFiles(new Set());
    setShowBatchDeleteDialog(false);
  }, [project, projectId, selectedFiles, removeKnowledgeFile, deleteFromDocumentStore]);

  // File selection
  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map((f) => f.id)));
    }
  }, [selectedFiles.size, filteredFiles]);

  // Download file
  const handleDownload = useCallback((file: KnowledgeFile) => {
    downloadFile(file.content, file.name);
  }, []);

  // Edit helpers
  const startEditing = useCallback((file: KnowledgeFile) => {
    setEditContent(file.content);
    setIsEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditContent('');
  }, []);

  const saveEdit = useCallback(() => {
    if (viewingFile && editContent !== viewingFile.content) {
      updateKnowledgeFile(projectId, viewingFile.id, editContent);
    }
    setIsEditing(false);
    setEditContent('');
    setViewingFile(null);
  }, [viewingFile, editContent, projectId, updateKnowledgeFile]);

  const closeViewer = useCallback(() => {
    setViewingFile(null);
    setIsEditing(false);
    setEditContent('');
  }, []);

  return {
    // State
    project,
    searchQuery,
    setSearchQuery,
    filteredFiles,
    isDesktop,
    isDragging,
    isUploading,
    uploadError,
    setUploadError,
    selectedFiles,
    showAddDialog,
    setShowAddDialog,
    showBatchDeleteDialog,
    setShowBatchDeleteDialog,
    deleteFileId,
    setDeleteFileId,
    viewingFile,
    setViewingFile,
    isEditing,
    editContent,
    setEditContent,
    highlightedHtml,
    newFileName,
    setNewFileName,
    newFileContent,
    setNewFileContent,

    // Refs
    fileInputRef,
    dropZoneRef,

    // Handlers
    handleFileUpload,
    handleOpenFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleAddManual,
    handleDelete,
    handleBatchDelete,
    handleDownload,
    toggleFileSelection,
    toggleSelectAll,
    startEditing,
    cancelEditing,
    saveEdit,
    closeViewer,
  };
}
