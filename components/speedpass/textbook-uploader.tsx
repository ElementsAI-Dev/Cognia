'use client';

/**
 * Textbook Uploader Component
 *
 * Handles textbook file uploads with:
 * - Drag & drop support
 * - Progress tracking
 * - PDF/text file support
 * - Integration with textbook processor hook
 */

import { useCallback, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';
import { useTextbookProcessor } from '@/hooks/learning/use-textbook-processor';
import { extractTextbookContent } from '@/lib/learning/speedpass/textbook-content-extractor';
import type { Textbook } from '@/types/learning/speedpass';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface TextbookUploaderProps {
  onUploadComplete?: (textbook: Textbook) => void;
  onCancel?: () => void;
  className?: string;
}

interface TextbookMetadata {
  name: string;
  author: string;
  publisher: string;
  isbn: string;
  edition: string;
}

// ============================================================================
// Component
// ============================================================================

export function TextbookUploader({
  onUploadComplete,
  onCancel,
  className,
}: TextbookUploaderProps) {
  const tUploader = useTranslations('learningMode.speedpass.uploader');
  const store = useSpeedPassStore();
  const { processTextbook, progress, isProcessing, error, reset } = useTextbookProcessor();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [metadata, setMetadata] = useState<TextbookMetadata>({
    name: '',
    author: '',
    publisher: '',
    isbn: '',
    edition: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    const validExtensions = ['.pdf', '.txt', '.md'];

    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidType && !hasValidExtension) {
      toast.error(tUploader('errors.unsupportedFileFormat.title'), {
        description: tUploader('errors.unsupportedFileFormat.description'),
      });
      return;
    }

    setSelectedFile(file);
    setMetadata((prev) => ({
      ...prev,
      name: file.name.replace(/\.(pdf|txt|md)$/i, ''),
    }));
    setShowMetadataDialog(true);
  }, [tUploader]);

  // Handle drag events
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

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // Open file selector
  const openFileSelector = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle metadata form change
  const handleMetadataChange = useCallback((field: keyof TextbookMetadata, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Process the textbook
  const handleProcessTextbook = useCallback(async () => {
    if (!selectedFile || !metadata.name) {
      toast.error(tUploader('errors.missingTextbookName'));
      return;
    }

    setShowMetadataDialog(false);

    let createdTextbookId: string | null = null;
    try {
      const extraction = await extractTextbookContent({
        file: selectedFile,
      });

      // Generate textbook ID
      const textbookId = `textbook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      createdTextbookId = textbookId;

      // Create textbook object
      const textbook: Textbook = {
        id: textbookId,
        name: metadata.name,
        author: metadata.author || tUploader('defaults.unknownAuthor'),
        publisher: metadata.publisher || tUploader('defaults.unknownPublisher'),
        isbn: metadata.isbn || undefined,
        edition: metadata.edition || undefined,
        totalPages: extraction.pageCount || 0,
        parseStatus: 'uploading',
        parseProgress: 10,
        source: 'user_upload',
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add textbook to store
      store.addTextbook(textbook);
      store.setParseProgress({
        textbookId,
        status: 'uploading',
        progress: 30,
        message: tUploader('progress.fileReadReady'),
      });
      store.updateTextbook(textbookId, {
        parseStatus: 'uploading',
        parseProgress: 30,
      });

      // Process the textbook content
      const result = await processTextbook(textbookId, extraction.content);

      if (result) {
        const parsedTextbook = store.textbooks[textbookId] || textbook;
        toast.success(tUploader('success.parsedTitle'), {
          description: tUploader('success.parsedDescription', {
            count: result.knowledgePoints?.length || 0,
          }),
        });
        onUploadComplete?.(parsedTextbook);
      } else {
        throw new Error(tUploader('errors.processingFailed'));
      }
    } catch (err) {
      if (createdTextbookId) {
        const fallbackErrorMessage = tUploader('errors.processingFailed');
        const errorMessage = err instanceof Error ? err.message : fallbackErrorMessage;
        store.updateTextbook(createdTextbookId, {
          parseStatus: 'failed',
          parseProgress: 0,
          parseError: errorMessage,
        });
        store.setParseProgress({
          textbookId: createdTextbookId,
          status: 'failed',
          progress: 0,
          message: errorMessage,
        });
      }
      toast.error(tUploader('errors.processingFailed'), {
        description: err instanceof Error ? err.message : tUploader('errors.retry'),
      });
    }
  }, [selectedFile, metadata, store, processTextbook, onUploadComplete, tUploader]);

  // Cancel upload
  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setShowMetadataDialog(false);
    reset();
    onCancel?.();
  }, [reset, onCancel]);

  return (
    <>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {tUploader('card.title')}
          </CardTitle>
          <CardDescription>{tUploader('card.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Processing State */}
          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{progress?.message || tUploader('processing.inProgress')}</p>
                  <p className="text-sm text-muted-foreground">
                    {progress?.stage === 'parsing' && tUploader('processing.stage.parsing')}
                    {progress?.stage === 'extracting_chapters' && tUploader('processing.stage.extractingChapters')}
                    {progress?.stage === 'extracting_knowledge_points' &&
                      tUploader('processing.stage.extractingKnowledgePoints')}
                    {progress?.stage === 'extracting_questions' &&
                      tUploader('processing.stage.extractingQuestions')}
                  </p>
                </div>
              </div>
              <Progress value={progress?.current || 0} className="h-2" />
            </div>
          )}

          {/* Error State */}
          {error && !isProcessing && (
            <div className="space-y-4 py-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{tUploader('errorState.title')}</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
              <Button className="mt-4" variant="outline" onClick={handleCancel}>
                {tUploader('errorState.retry')}
              </Button>
            </div>
          )}

          {/* Upload Zone */}
          {!isProcessing && !error && (
            <div
              className={cn(
                'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={handleInputChange}
              />
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">{tUploader('uploadZone.dragDrop')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tUploader('uploadZone.clickToSelect')}</p>
              <p className="mt-2 text-xs text-muted-foreground">{tUploader('uploadZone.supportedFormats')}</p>
              <Button className="mt-4" variant="outline" onClick={openFileSelector}>
                {tUploader('uploadZone.selectFile')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata Dialog */}
      <Dialog open={showMetadataDialog} onOpenChange={setShowMetadataDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {tUploader('metadataDialog.title')}
            </DialogTitle>
            <DialogDescription>{tUploader('metadataDialog.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedFile && (
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                {tUploader('fields.name.label')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={metadata.name}
                onChange={(e) => handleMetadataChange('name', e.target.value)}
                placeholder={tUploader('fields.name.placeholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="author">{tUploader('fields.author.label')}</Label>
                <Input
                  id="author"
                  value={metadata.author}
                  onChange={(e) => handleMetadataChange('author', e.target.value)}
                  placeholder={tUploader('fields.author.placeholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisher">{tUploader('fields.publisher.label')}</Label>
                <Input
                  id="publisher"
                  value={metadata.publisher}
                  onChange={(e) => handleMetadataChange('publisher', e.target.value)}
                  placeholder={tUploader('fields.publisher.placeholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edition">{tUploader('fields.edition.label')}</Label>
              <Input
                id="edition"
                value={metadata.edition}
                onChange={(e) => handleMetadataChange('edition', e.target.value)}
                placeholder={tUploader('fields.edition.placeholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isbn">{tUploader('fields.isbn.label')}</Label>
              <Input
                id="isbn"
                value={metadata.isbn}
                onChange={(e) => handleMetadataChange('isbn', e.target.value)}
                placeholder={tUploader('fields.isbn.placeholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              {tUploader('metadataDialog.cancel')}
            </Button>
            <Button onClick={handleProcessTextbook} disabled={!metadata.name}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {tUploader('metadataDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default TextbookUploader;
