'use client';

/**
 * KnowledgeBase - manage project knowledge files
 */

import { useState, useRef, useCallback } from 'react';
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
import { EmptyState } from '@/components/layout/empty-state';
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
import { useProjectStore } from '@/stores';
import type { KnowledgeFile } from '@/types';
import { cn } from '@/lib/utils';
import { processDocumentAsync, detectDocumentType } from '@/lib/document';

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

// Check if file is binary (needs ArrayBuffer processing)
function isBinaryFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ['pdf', 'docx', 'doc', 'xlsx', 'xls'].includes(ext);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDesktop = useNativeStore((state) => state.isDesktop);
  const project = useProjectStore((state) => state.getProject(projectId));
  const addKnowledgeFile = useProjectStore((state) => state.addKnowledgeFile);
  const removeKnowledgeFile = useProjectStore((state) => state.removeKnowledgeFile);

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
        try {
          const isBinary = isBinaryFile(file.name);
          
          if (isBinary) {
            // Process binary files (PDF, Word, Excel)
            const buffer = await file.arrayBuffer();
            const processed = await processDocumentAsync(
              `temp-${Date.now()}`,
              file.name,
              buffer
            );
            
            addKnowledgeFile(projectId, {
              name: file.name,
              type: detectFileType(file.name),
              content: processed.embeddableContent || processed.content,
              size: processed.embeddableContent?.length || processed.content.length,
              mimeType: file.type,
              originalSize: file.size,
              pageCount: typeof processed.metadata.pageCount === 'number' ? processed.metadata.pageCount : undefined,
            });
          } else {
            // Process text files
            const content = await file.text();
            const processed = await processDocumentAsync(
              `temp-${Date.now()}`,
              file.name,
              content
            );
            
            addKnowledgeFile(projectId, {
              name: file.name,
              type: detectFileType(file.name, content),
              content: processed.embeddableContent || content,
              size: content.length,
              mimeType: file.type,
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
  }, [projectId, addKnowledgeFile]);

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
      removeKnowledgeFile(projectId, deleteFileId);
      setDeleteFileId(null);
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
    <div className="space-y-4">
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
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {uploadError}
          <button
            onClick={() => setUploadError(null)}
            className="ml-2 underline hover:no-underline"
          >
            {t('dismiss')}
          </button>
        </div>
      )}

      {project.knowledgeBase.length > 0 && (
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <Search className="h-4 w-4" />
          </InputGroupAddon>
          <InputGroupInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
          />
        </InputGroup>
      )}

      {filteredFiles.length > 0 ? (
        <div className="space-y-2">
          {filteredFiles.map((file) => {
            const IconComponent = fileTypeIcons[file.type] || FileText;
            return (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewingFile(file)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {isDesktop && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenFile(file)}
                      title={t('openWithDefault')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteFileId(file.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      {/* View File Dialog */}
      <Dialog open={!!viewingFile} onOpenChange={() => setViewingFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewingFile?.name}</DialogTitle>
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
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
              {viewingFile?.content}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingFile(null)}>
              {tCommon('close')}
            </Button>
            {viewingFile && (
              <Button onClick={() => handleDownload(viewingFile)}>
                <Download className="mr-2 h-4 w-4" />
                {t('download')}
              </Button>
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
    </div>
  );
}

export default KnowledgeBase;
