'use client';

/**
 * KnowledgeBase - manage project knowledge files
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Code,
  File,
  Upload,
  Trash2,
  Plus,
  Search,
  Download,
  Eye,
  FileSpreadsheet,
  FileType,
  Globe,
  Loader2,
  ExternalLink,
  CheckSquare,
  Square,
  Pencil,
} from 'lucide-react';
import { opener } from '@/lib/native';
import { useNativeStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProjectStore, useDocumentStore } from '@/stores';
import type { KnowledgeFile } from '@/types';
import { cn } from '@/lib/utils';
import { detectDocumentType } from '@/lib/document';
import { useDocumentProcessor } from '@/hooks/document';

interface KnowledgeBaseProps {
  projectId: string;
}

const fileTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  pdf: File,
  code: Code,
  markdown: FileText,
  json: Code,
  word: FileType,
  excel: FileSpreadsheet,
  csv: FileSpreadsheet,
  html: Globe,
};

const fileTypeColors: Record<string, string> = {
  text: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  pdf: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  code: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  markdown: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  json: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  word: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  excel: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  csv: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  html: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

function detectFileType(filename: string, content?: string): KnowledgeFile['type'] {
  const docType = detectDocumentType(filename);
  
  // Map DocumentType to KnowledgeFile type
  const typeMap: Record<string, KnowledgeFile['type']> = {
    markdown: 'markdown',
    code: 'code',
    text: 'text',
    json: 'json',
    pdf: 'pdf',
    word: 'word',
    excel: 'excel',
    csv: 'csv',
    html: 'html',
    unknown: 'text',
  };

  const mappedType = typeMap[docType];
  if (mappedType && mappedType !== 'text') return mappedType;

  // Try to detect from content for text files
  if (content) {
    if (content.startsWith('{') || content.startsWith('[')) return 'json';
    if (content.includes('```') || content.startsWith('#')) return 'markdown';
  }

  return 'text';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function KnowledgeBase({ projectId }: KnowledgeBaseProps) {
  const t = useTranslations('knowledgeBase');
  const tCommon = useTranslations('common');
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

  const isDesktop = useNativeStore((state) => state.isDesktop);
  const project = useProjectStore((state) => state.getProject(projectId));
  const addKnowledgeFile = useProjectStore((state) => state.addKnowledgeFile);
  const removeKnowledgeFile = useProjectStore((state) => state.removeKnowledgeFile);
  const updateKnowledgeFile = useProjectStore((state) => state.updateKnowledgeFile);
  const deleteFromDocumentStore = useDocumentStore((state) => state.deleteDocument);
  const { processFile, validate } = useDocumentProcessor();

  // Open file content with default application (creates temp file)
  const handleOpenFile = useCallback(async (file: KnowledgeFile) => {
    if (!isDesktop) return;
    
    // Create a blob URL and open it
    const blob = new Blob([file.content], { type: file.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    await opener.openUrl(url);
  }, [isDesktop]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      for (const file of Array.from(files)) {
        // Validate file before processing
        const validation = validate(file);
        if (!validation.valid) {
          setUploadError(`${file.name}: ${validation.errors.join(', ')}`);
          continue;
        }

        try {
          // Use unified processFile from useDocumentProcessor hook
          // Handles both binary (PDF, Word, Excel) and text files automatically
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
      // Reset input
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

    const extMap: Record<string, string> = {
      js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
      py: 'python', rs: 'rust', go: 'go', java: 'java',
      cpp: 'cpp', c: 'c', h: 'c', cs: 'csharp',
      rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
      json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
      xml: 'xml', html: 'html', htm: 'html', css: 'css', scss: 'scss',
      md: 'markdown', sql: 'sql', sh: 'bash', bash: 'bash',
      dockerfile: 'dockerfile', csv: 'csv',
    };

    const ext = viewingFile.name.split('.').pop()?.toLowerCase() || '';
    const lang = extMap[ext];

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if leaving the drop zone entirely
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
      // Reuse the same upload handler by creating a synthetic event
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

  if (!project) return null;

  const filteredFiles = searchQuery
    ? project.knowledgeBase.filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : project.knowledgeBase;

  const handleAddManual = () => {
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
  };

  const handleDelete = () => {
    if (deleteFileId) {
      // Find the file to get its name for document store cleanup
      const file = project?.knowledgeBase.find((f) => f.id === deleteFileId);
      removeKnowledgeFile(projectId, deleteFileId);
      // Also clean up from document store by searching for matching filename
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
    }
  };

  const handleBatchDelete = () => {
    const filesToDelete = project?.knowledgeBase.filter((f) => selectedFiles.has(f.id)) || [];
    for (const fileId of selectedFiles) {
      removeKnowledgeFile(projectId, fileId);
    }
    // Also clean up from document store
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
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleDownload = (file: KnowledgeFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        'space-y-4 relative rounded-lg transition-colors',
        isDragging && 'ring-2 ring-primary ring-dashed bg-primary/5'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/5 border-2 border-dashed border-primary pointer-events-none">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium text-primary">{t('dropFilesHere') || 'Drop files here'}</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('title')}</h3>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.rs,.go,.java,.cpp,.c,.h,.pdf,.docx,.doc,.xlsx,.xls,.csv,.tsv,.html,.htm,.xml,.yaml,.yml,.css,.scss"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? t('processing') : t('upload')}
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {tCommon('add')}
          </Button>
        </div>
      </div>

      {/* Upload error message */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{uploadError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadError(null)}
            >
              {t('dismiss')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {project.knowledgeBase.length > 0 && (
        <div className="flex items-center gap-2">
          <InputGroup className="flex-1">
            <InputGroupAddon align="inline-start">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
            />
          </InputGroup>
          {filteredFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="gap-1"
              >
                {selectedFiles.size === filteredFiles.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedFiles.size > 0 ? t('selectedCount', { count: selectedFiles.size }) : t('selectAll')}
              </Button>
              {selectedFiles.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBatchDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('deleteSelected')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {filteredFiles.length > 0 ? (
        <div className="space-y-2">
          {filteredFiles.map((file) => {
            const IconComponent = fileTypeIcons[file.type] || FileText;
            const isSelected = selectedFiles.has(file.id);
            return (
              <div
                key={file.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 cursor-pointer transition-colors",
                  isSelected && "border-primary bg-primary/5"
                )}
                onClick={() => toggleFileSelection(file.id)}
              >
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFileSelection(file.id);
                    }}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', fileTypeColors[file.type])}
                      >
                        {file.type}
                      </Badge>
                      <span>{formatFileSize(file.size)}</span>
                      <span>
                        {file.updatedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingFile(file);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('view')}</TooltipContent>
                  </Tooltip>
                  {isDesktop && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFile(file);
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('openWithDefault')}</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('download')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteFileId(file.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('deleteFile')}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={searchQuery ? t('noResults') : t('noFiles')}
          description={searchQuery ? t('tryDifferent') : t('uploadHint')}
        />
      )}

      {/* Add File Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addFile')}</DialogTitle>
            <DialogDescription>
              {t('addFileDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filename">{t('fileName')}</Label>
              <Input
                id="filename"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={t('fileNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">{t('content')}</Label>
              <Textarea
                id="content"
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder={t('contentPlaceholder')}
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleAddManual}
              disabled={!newFileName.trim() || !newFileContent.trim()}
            >
              {t('addFile')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Edit File Dialog */}
      <Dialog
        open={!!viewingFile}
        onOpenChange={() => {
          setViewingFile(null);
          setIsEditing(false);
          setEditContent('');
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingFile?.name}
              {isEditing && (
                <Badge variant="secondary" className="text-xs">
                  {t('editing') || 'Editing'}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {viewingFile && (
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">{viewingFile.type}</Badge>
                  <span>{formatFileSize(viewingFile.size)}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {isEditing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                rows={20}
              />
            ) : highlightedHtml ? (
              <div
                className="rounded-lg text-sm [&_pre]:p-4 [&_pre]:overflow-x-auto [&_code]:font-mono"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            ) : (
              <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm font-mono">
                {viewingFile?.content}
              </pre>
            )}
          </ScrollArea>
          <DialogFooter>
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent('');
                  }}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  onClick={() => {
                    if (viewingFile && editContent !== viewingFile.content) {
                      updateKnowledgeFile(projectId, viewingFile.id, editContent);
                    }
                    setIsEditing(false);
                    setEditContent('');
                    setViewingFile(null);
                  }}
                  disabled={!editContent.trim()}
                >
                  {tCommon('save') || 'Save'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewingFile(null);
                    setIsEditing(false);
                  }}
                >
                  {tCommon('close')}
                </Button>
                {viewingFile && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditContent(viewingFile.content);
                        setIsEditing(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {tCommon('edit') || 'Edit'}
                    </Button>
                    <Button onClick={() => handleDownload(viewingFile)}>
                      <Download className="mr-2 h-4 w-4" />
                      {t('download')}
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteFile')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteMultipleFiles')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteMultipleConfirm', { count: selectedFiles.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('deleteAll', { count: selectedFiles.size })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default KnowledgeBase;
