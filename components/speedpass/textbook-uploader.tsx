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
import type { Textbook } from '@/types/learning/speedpass';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
  const _t = useTranslations('learningMode.speedpass.library');
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
      toast.error('不支持的文件格式', {
        description: '请上传 PDF、TXT 或 Markdown 文件',
      });
      return;
    }

    setSelectedFile(file);
    setMetadata((prev) => ({
      ...prev,
      name: file.name.replace(/\.(pdf|txt|md)$/i, ''),
    }));
    setShowMetadataDialog(true);
  }, []);

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
      toast.error('请填写教材名称');
      return;
    }

    setShowMetadataDialog(false);

    try {
      // Read file content
      const content = await readFileContent(selectedFile);

      // Generate textbook ID
      const textbookId = `textbook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create textbook object
      const textbook: Textbook = {
        id: textbookId,
        name: metadata.name,
        author: metadata.author || '未知作者',
        publisher: metadata.publisher || '未知出版社',
        isbn: metadata.isbn || undefined,
        edition: metadata.edition || undefined,
        totalPages: 0,
        parseStatus: 'parsing',
        source: 'user_upload',
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add textbook to store
      store.addTextbook(textbook);

      // Process the textbook content
      const result = await processTextbook(textbookId, content);

      if (result) {
        toast.success('教材解析完成', {
          description: `成功提取 ${result.knowledgePoints?.length || 0} 个知识点`,
        });
        onUploadComplete?.(textbook);
      }
    } catch (err) {
      toast.error('教材处理失败', {
        description: err instanceof Error ? err.message : '请重试',
      });
    }
  }, [selectedFile, metadata, store, processTextbook, onUploadComplete]);

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
            上传教材
          </CardTitle>
          <CardDescription>上传 PDF 或文本文件，系统将自动提取知识点</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Processing State */}
          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{progress?.message || '正在处理...'}</p>
                  <p className="text-sm text-muted-foreground">
                    {progress?.stage === 'parsing' && '解析教材内容中...'}
                    {progress?.stage === 'extracting' && '提取知识点中...'}
                    {progress?.stage === 'generating' && '提取例题习题中...'}
                  </p>
                </div>
              </div>
              <Progress value={progress?.current || 0} className="h-2" />
            </div>
          )}

          {/* Error State */}
          {error && !isProcessing && (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="mt-4 font-medium text-destructive">处理失败</p>
              <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
              <Button className="mt-4" variant="outline" onClick={handleCancel}>
                重试
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
              <p className="mt-4 text-lg font-medium">拖放文件到此处</p>
              <p className="mt-1 text-sm text-muted-foreground">或点击选择文件</p>
              <p className="mt-2 text-xs text-muted-foreground">支持 PDF、TXT、Markdown 格式</p>
              <Button className="mt-4" variant="outline" onClick={openFileSelector}>
                选择文件
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
              教材信息
            </DialogTitle>
            <DialogDescription>填写教材的基本信息，帮助系统更好地解析内容</DialogDescription>
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
                教材名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={metadata.name}
                onChange={(e) => handleMetadataChange('name', e.target.value)}
                placeholder="例如：高等数学（上册）"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="author">作者</Label>
                <Input
                  id="author"
                  value={metadata.author}
                  onChange={(e) => handleMetadataChange('author', e.target.value)}
                  placeholder="例如：同济大学"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisher">出版社</Label>
                <Input
                  id="publisher"
                  value={metadata.publisher}
                  onChange={(e) => handleMetadataChange('publisher', e.target.value)}
                  placeholder="例如：高等教育出版社"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edition">版次</Label>
              <Input
                id="edition"
                value={metadata.edition}
                onChange={(e) => handleMetadataChange('edition', e.target.value)}
                placeholder="例如：第七版"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN（可选）</Label>
              <Input
                id="isbn"
                value={metadata.isbn}
                onChange={(e) => handleMetadataChange('isbn', e.target.value)}
                placeholder="例如：978-7-04-037988-6"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button onClick={handleProcessTextbook} disabled={!metadata.name}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              开始解析
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file content'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default TextbookUploader;
