'use client';

/**
 * Export Dialog - export conversation to various formats
 */

import { useState } from 'react';
import { Download, FileJson, FileText, Code2, Loader2, FileType } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { messageRepository } from '@/lib/db';
import {
  exportToMarkdown,
  exportToJSON,
  exportToHTML,
  exportToPDF,
  exportToPlainText,
  downloadFile,
  generateFilename,
  type ExportData,
} from '@/lib/export';
import type { Session } from '@/types';

interface ExportDialogProps {
  session: Session;
  trigger?: React.ReactNode;
}

type ExportFormat = 'markdown' | 'json' | 'html' | 'pdf' | 'text';

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'Plain text with formatting, great for documentation',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'Structured data, can be re-imported later',
    icon: <FileJson className="h-5 w-5" />,
  },
  {
    value: 'html',
    label: 'HTML',
    description: 'Standalone web page with styling',
    icon: <Code2 className="h-5 w-5" />,
  },
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Print-ready document format',
    icon: <FileType className="h-5 w-5" />,
  },
  {
    value: 'text',
    label: 'Plain Text',
    description: 'Simple text without formatting',
    icon: <FileText className="h-5 w-5" />,
  },
];

export function ExportDialog({ session, trigger }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Load messages from database
      const messages = await messageRepository.getBySessionId(session.id);

      const exportData: ExportData = {
        session,
        messages,
        exportedAt: new Date(),
      };

      // Handle PDF separately as it uses print dialog
      if (format === 'pdf') {
        await exportToPDF(exportData);
        setOpen(false);
        return;
      }

      let content: string;
      let extension: string;
      let mimeType: string;

      switch (format) {
        case 'markdown':
          content = exportToMarkdown(exportData);
          extension = 'md';
          mimeType = 'text/markdown';
          break;
        case 'json':
          content = exportToJSON(exportData);
          extension = 'json';
          mimeType = 'application/json';
          break;
        case 'html':
          content = exportToHTML(exportData);
          extension = 'html';
          mimeType = 'text/html';
          break;
        case 'text':
          content = exportToPlainText(exportData);
          extension = 'txt';
          mimeType = 'text/plain';
          break;
        default:
          content = exportToMarkdown(exportData);
          extension = 'md';
          mimeType = 'text/markdown';
      }

      const filename = generateFilename(session.title, extension);
      downloadFile(content, filename, mimeType);

      setOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
          <DialogDescription>
            Export &ldquo;{session.title}&rdquo; to your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={format}
            onValueChange={(value) => setFormat(value as ExportFormat)}
            className="space-y-3"
          >
            {FORMAT_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  format === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setFormat(option.value)}
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <div className="flex-1">
                  <Label
                    htmlFor={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {option.icon}
                    <span className="font-medium">{option.label}</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;
