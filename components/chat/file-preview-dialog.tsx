'use client';

/**
 * FilePreviewDialog - Preview files and images in a dialog
 */

import { useState } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  FileText,
  FileCode,
  FileImage,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface PreviewFile {
  name: string;
  url: string;
  mimeType: string;
  size?: number;
  content?: string;
}

interface FilePreviewDialogProps {
  file: PreviewFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <FileImage className="h-5 w-5" />;
  }
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('json') ||
    mimeType.includes('xml') ||
    mimeType.includes('html') ||
    mimeType.includes('css')
  ) {
    return <FileCode className="h-5 w-5" />;
  }
  return <FileText className="h-5 w-5" />;
}

export function FilePreviewDialog({
  file,
  open,
  onOpenChange,
}: FilePreviewDialogProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  if (!file) return null;

  const isImage = file.mimeType.startsWith('image/');
  const isText =
    file.mimeType.startsWith('text/') ||
    file.mimeType.includes('json') ||
    file.mimeType.includes('javascript') ||
    file.mimeType.includes('typescript');

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              {getFileIcon(file.mimeType)}
              <span className="truncate max-w-[300px]">{file.name}</span>
              {file.size && (
                <span className="text-sm text-muted-foreground font-normal">
                  ({formatFileSize(file.size)})
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-1">
              {isImage && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomOut}
                    title="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-12 text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomIn}
                    title="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRotate}
                    title="Rotate"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleReset}
                    title="Reset"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {isImage ? (
            <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg overflow-auto p-4">
              <img
                src={file.url}
                alt={file.name}
                className={cn(
                  'max-w-full max-h-full object-contain transition-transform duration-200',
                  'select-none'
                )}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
                draggable={false}
              />
            </div>
          ) : isText && file.content ? (
            <ScrollArea className="h-full max-h-[60vh]">
              <pre className="p-4 text-sm font-mono bg-muted/30 rounded-lg overflow-x-auto whitespace-pre-wrap wrap-break-word">
                {file.content}
              </pre>
            </ScrollArea>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              {getFileIcon(file.mimeType)}
              <p>Preview not available for this file type</p>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FilePreviewDialog;
