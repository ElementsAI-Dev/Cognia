'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Upload, X, Loader2, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { chunkDocument, type ChunkingStrategy } from '@/lib/ai/embedding/chunking';
import { useDocumentProcessor } from '@/hooks/document';

export interface DocumentFile {
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  chunks?: number;
}

export interface AddDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionName: string;
  onAddDocuments: (
    documents: Array<{
      content: string;
      metadata: Record<string, unknown>;
    }>
  ) => Promise<void>;
  chunkSize?: number;
  chunkOverlap?: number;
}

const ACCEPTED_EXTENSIONS = [
  '.txt', '.md', '.json', '.csv', '.xml', '.html', '.htm',
  '.pdf', '.docx', '.doc', '.xlsx', '.xls',
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (binary files can be larger)

const CHUNKING_STRATEGIES: ChunkingStrategy[] = [
  'fixed',
  'sentence',
  'paragraph',
  'semantic',
  'recursive',
  'sliding_window',
];

export function AddDocumentModal({
  open,
  onOpenChange,
  collectionName,
  onAddDocuments,
  chunkSize = 1000,
  chunkOverlap = 200,
}: AddDocumentModalProps) {
  const t = useTranslations('vectorSettings');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processFile: processDocFile } = useDocumentProcessor();

  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [strategy, setStrategy] = useState<ChunkingStrategy>('recursive');
  const [progress, setProgress] = useState(0);

  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        return t('addDocument.invalidType');
      }
      if (file.size > MAX_FILE_SIZE) {
        return t('addDocument.fileTooLarge');
      }
      return null;
    },
    [t]
  );

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newFiles: DocumentFile[] = [];
      const fileArray = Array.from(fileList);

      for (const file of fileArray) {
        const error = validateFile(file);
        newFiles.push({
          file,
          name: file.name,
          size: file.size,
          status: error ? 'error' : 'pending',
          error: error || undefined,
        });
      }

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [validateFile]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files?.length) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        addFiles(e.target.files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addFiles]
  );

  const handleProcess = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    const allDocuments: Array<{ content: string; metadata: Record<string, unknown> }> = [];
    let processedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const docFile = files[i];
      if (docFile.status !== 'pending') continue;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'processing' } : f))
      );

      try {
        // Use unified processFile from useDocumentProcessor hook
        // Handles both binary (PDF, Word, Excel) and text files automatically
        const processed = await processDocFile(docFile.file, { extractEmbeddable: true });
        const textContent = processed?.embeddableContent || processed?.content || '';

        const result = chunkDocument(textContent, {
          strategy,
          chunkSize,
          chunkOverlap,
        });

        for (const chunk of result.chunks) {
          allDocuments.push({
            content: chunk.content,
            metadata: {
              source: docFile.name,
              chunkIndex: chunk.index,
              totalChunks: result.totalChunks,
              strategy: result.strategy,
              collection: collectionName,
            },
          });
        }

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'done', chunks: result.totalChunks } : f
          )
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
              : f
          )
        );
      }

      processedCount++;
      setProgress(Math.round((processedCount / pendingFiles.length) * 100));
    }

    if (allDocuments.length > 0) {
      try {
        await onAddDocuments(allDocuments);
      } catch (err) {
        console.error('Failed to add documents:', err);
      }
    }

    setIsProcessing(false);
  };

  const handleClose = () => {
    if (!isProcessing) {
      setFiles([]);
      setProgress(0);
      onOpenChange(false);
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('addDocument.title')}</DialogTitle>
          <DialogDescription>
            {t('addDocument.description', { collection: collectionName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className={cn(
              'relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">{t('addDocument.dropHere')}</p>
            <p className="text-xs text-muted-foreground">{t('addDocument.orClick')}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {t('addDocument.supportedFormats')}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Chunking strategy */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t('addDocument.chunkingStrategy')}</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as ChunkingStrategy)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHUNKING_STRATEGIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`addDocument.strategy.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-lg border p-2">
              {files.map((docFile, index) => (
                <div
                  key={`${docFile.name}-${index}`}
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{docFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatSize(docFile.size)}
                      {docFile.chunks !== undefined && ` • ${docFile.chunks} chunks`}
                      {docFile.error && ` • ${docFile.error}`}
                    </p>
                  </div>
                  {docFile.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {docFile.status === 'processing' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {docFile.status === 'done' && <Check className="h-4 w-4 text-green-500" />}
                  {docFile.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {t('addDocument.processing', { progress })}
              </p>
            </div>
          )}

          {/* Stats */}
          {files.length > 0 && !isProcessing && (
            <p className="text-xs text-muted-foreground">
              {t('addDocument.stats', {
                total: files.length,
                pending: pendingCount,
                done: doneCount,
                error: errorCount,
              })}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {t('addDocument.cancel')}
          </Button>
          <Button onClick={handleProcess} disabled={pendingCount === 0 || isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('addDocument.processing', { progress })}
              </>
            ) : (
              t('addDocument.add')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
