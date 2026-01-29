'use client';

/**
 * LaTeX Export Dialog - Export LaTeX documents to various formats
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { FileText, FileCode, Download, Loader2, Check } from 'lucide-react';
import { useLatex } from '@/hooks/latex';
import { cn } from '@/lib/utils';

export type ExportFormat = 'html' | 'markdown' | 'plaintext';

export interface LaTeXExportDialogProps {
  content: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onExportComplete?: (format: ExportFormat, content: string) => void;
}

export function LaTeXExportDialog({
  content,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onExportComplete,
}: LaTeXExportDialogProps) {
  const t = useTranslations('latex');
  const [internalOpen, setInternalOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('html');
  const [fileName, setFileName] = useState('document');
  const [includeMathJax, setIncludeMathJax] = useState(true);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');

  const { exportToFormat, isExporting } = useLatex();

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleExport = useCallback(async () => {
    setExportStatus('exporting');
    try {
      const result = await exportToFormat(content, format);
      
      // Generate file extension based on format
      const extensions: Record<ExportFormat, string> = {
        html: 'html',
        markdown: 'md',
        plaintext: 'txt',
      };
      
      const fullFileName = `${fileName}.${extensions[format]}`;
      
      // Create blob and download
      const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fullFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportStatus('success');
      onExportComplete?.(format, result);
      
      // Reset status after 2 seconds
      setTimeout(() => {
        setExportStatus('idle');
        setIsOpen(false);
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    }
  }, [content, format, fileName, exportToFormat, onExportComplete, setIsOpen]);

  const formatOptions = [
    {
      value: 'html' as const,
      label: 'HTML',
      description: t('exportHtmlDesc', { defaultValue: 'HTML with MathJax for math rendering' }),
      icon: FileText,
    },
    {
      value: 'markdown' as const,
      label: 'Markdown',
      description: t('exportMarkdownDesc', { defaultValue: 'Markdown with LaTeX math blocks' }),
      icon: FileCode,
    },
    {
      value: 'plaintext' as const,
      label: t('plainText', { defaultValue: 'Plain Text' }),
      description: t('exportPlainTextDesc', { defaultValue: 'Plain text without formatting' }),
      icon: FileText,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('exportDocument', { defaultValue: 'Export Document' })}
          </DialogTitle>
          <DialogDescription>
            {t('exportDescription', { defaultValue: 'Choose format and options for export' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Name */}
          <div className="space-y-2">
            <Label htmlFor="fileName">{t('fileName', { defaultValue: 'File Name' })}</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="document"
            />
          </div>

          <Separator />

          {/* Format Selection */}
          <div className="space-y-3">
            <Label>{t('format', { defaultValue: 'Format' })}</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="space-y-2"
            >
              {formatOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    'flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors',
                    format === option.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent/50'
                  )}
                  onClick={() => setFormat(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Options for HTML */}
          {format === 'html' && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>{t('options', { defaultValue: 'Options' })}</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeMathJax"
                    checked={includeMathJax}
                    onCheckedChange={(checked) => setIncludeMathJax(checked === true)}
                  />
                  <Label htmlFor="includeMathJax" className="text-sm font-normal cursor-pointer">
                    {t('includeMathJax', { defaultValue: 'Include MathJax script for math rendering' })}
                  </Label>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t('cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || exportStatus === 'exporting' || !fileName.trim()}
            className="gap-2"
          >
            {exportStatus === 'exporting' && <Loader2 className="h-4 w-4 animate-spin" />}
            {exportStatus === 'success' && <Check className="h-4 w-4 text-green-500" />}
            {exportStatus === 'idle' && <Download className="h-4 w-4" />}
            {exportStatus === 'success'
              ? t('exported', { defaultValue: 'Exported!' })
              : t('export', { defaultValue: 'Export' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LaTeXExportDialog;
