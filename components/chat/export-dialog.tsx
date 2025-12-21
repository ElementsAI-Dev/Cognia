'use client';

/**
 * Export Dialog - export conversation to various formats
 * Enhanced with animated HTML export, rich markdown, and more options
 */

import { useState } from 'react';
import {
  Download,
  FileJson,
  FileText,
  Code2,
  Loader2,
  FileType,
  Play,
  ChevronDown,
} from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { messageRepository } from '@/lib/db';
import {
  exportToMarkdown,
  exportToHTML,
  exportToPDF,
  exportToPlainText,
  exportToRichMarkdown,
  exportToRichJSON,
  exportToAnimatedHTML,
  downloadFile,
  generateFilename,
  type ExportData,
} from '@/lib/export';
import type { Session } from '@/types';

interface ExportDialogProps {
  session: Session;
  trigger?: React.ReactNode;
}

type ExportFormat = 'markdown' | 'json' | 'html' | 'animated-html' | 'pdf' | 'text';

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string; icon: React.ReactNode; badge?: string }[] = [
  {
    value: 'animated-html',
    label: 'Animated HTML',
    description: 'Interactive replay with typing animation (GPT-style)',
    icon: <Play className="h-5 w-5" />,
    badge: 'NEW',
  },
  {
    value: 'markdown',
    label: 'Rich Markdown',
    description: 'Full formatting with reasoning, tools, and attachments',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'Complete data export, can be re-imported later',
    icon: <FileJson className="h-5 w-5" />,
  },
  {
    value: 'html',
    label: 'Static HTML',
    description: 'Simple web page with styling',
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
  const [format, setFormat] = useState<ExportFormat>('animated-html');
  const [isExporting, setIsExporting] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Load messages from database
      const messages = await messageRepository.getBySessionId(session.id);
      const exportedAt = new Date();

      const exportData: ExportData = {
        session,
        messages,
        exportedAt,
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
        case 'animated-html':
          content = exportToAnimatedHTML({
            session,
            messages,
            exportedAt,
            options: {
              theme: 'system',
              showControls: true,
              showTimestamps: true,
              autoPlay: false,
            },
          });
          extension = 'html';
          mimeType = 'text/html';
          break;
        case 'markdown':
          content = exportToRichMarkdown({
            session,
            messages,
            exportedAt,
            includeMetadata,
            includeAttachments: true,
          });
          extension = 'md';
          mimeType = 'text/markdown';
          break;
        case 'json':
          content = exportToRichJSON({
            session,
            messages,
            exportedAt,
          });
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

        <div className="py-4 space-y-4">
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
                    {option.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {option.badge}
                      </Badge>
                    )}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>

          {/* Advanced Options */}
          {(format === 'markdown' || format === 'json') && (
            <Collapsible open={showOptions} onOpenChange={setShowOptions}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <ChevronDown className={`h-4 w-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
                    Advanced Options
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="include-metadata">Include Metadata</Label>
                    <p className="text-xs text-muted-foreground">
                      Session info, model settings, timestamps
                    </p>
                  </div>
                  <Switch
                    id="include-metadata"
                    checked={includeMetadata}
                    onCheckedChange={setIncludeMetadata}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
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
