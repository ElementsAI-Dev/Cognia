'use client';

/**
 * DocumentExportDialog - Export chat conversations to various document formats
 * Supports: Excel, Word, CSV, and Google Sheets
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Table2,
  ExternalLink,
  Loader2,
  Check,
  Settings2,
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { messageRepository } from '@/lib/db';
import type { Session, UIMessage } from '@/types';

type ExportFormat = 'excel' | 'word' | 'csv';

interface DocumentExportDialogProps {
  session: Session;
  trigger?: React.ReactNode;
}

interface ExportOptions {
  includeMetadata: boolean;
  includeTimestamps: boolean;
  includeTokens: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {
  includeMetadata: true,
  includeTimestamps: true,
  includeTokens: false,
};

export function DocumentExportDialog({ session, trigger }: DocumentExportDialogProps) {
  const t = useTranslations('export');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);

  // Load messages when dialog opens
  useEffect(() => {
    if (open && messages.length === 0) {
      setIsLoading(true);
      messageRepository
        .getBySessionId(session.id)
        .then(setMessages)
        .finally(() => setIsLoading(false));
    }
  }, [open, session.id, messages.length]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setExportSuccess(null);
      setExportError(null);
    }
  }, [open]);

  // Export handlers
  const handleExportExcel = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      const { exportChatToExcel, downloadExcel } = await import('@/lib/export/excel-export');
      const result = await exportChatToExcel(session, messages);
      
      if (result.success && result.blob && result.filename) {
        downloadExcel(result.blob, result.filename);
        setExportSuccess('excel');
      } else {
        setExportError(result.error || 'Export failed');
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [session, messages]);

  const handleExportWord = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      const { exportChatToWord, downloadWord } = await import('@/lib/export/word-export');
      const result = await exportChatToWord(session, messages, undefined, {
        includeMetadata: options.includeMetadata,
        includeTimestamps: options.includeTimestamps,
        includeTokens: options.includeTokens,
      });
      
      if (result.success && result.blob && result.filename) {
        downloadWord(result.blob, result.filename);
        setExportSuccess('word');
      } else {
        setExportError(result.error || 'Export failed');
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [session, messages, options]);

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      const { exportChatToCSV, downloadCSV } = await import('@/lib/export/google-sheets-export');
      const result = exportChatToCSV(session, messages);
      
      if (result.success && result.content && result.filename) {
        downloadCSV(result.content, result.filename);
        setExportSuccess('csv');
      } else {
        setExportError(result.error || 'Export failed');
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [session, messages]);

  const handleOpenGoogleSheets = useCallback(async () => {
    try {
      const { exportChatToCSV, downloadCSV } = await import('@/lib/export/google-sheets-export');
      const result = exportChatToCSV(session, messages);
      
      if (result.success && result.content && result.filename) {
        // Download CSV for import
        downloadCSV(result.content, result.filename);
        // Open Google Sheets
        window.open('https://docs.google.com/spreadsheets/create', '_blank');
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Failed to open Google Sheets');
    }
  }, [session, messages]);

  const handleExport = useCallback(() => {
    switch (selectedFormat) {
      case 'excel':
        handleExportExcel();
        break;
      case 'word':
        handleExportWord();
        break;
      case 'csv':
        handleExportCSV();
        break;
    }
  }, [selectedFormat, handleExportExcel, handleExportWord, handleExportCSV]);

  const formatInfo = {
    excel: {
      icon: FileSpreadsheet,
      title: t('formatExcel'),
      description: t('formatExcelDesc'),
      extension: '.xlsx',
    },
    word: {
      icon: FileText,
      title: t('formatWord'),
      description: t('formatWordDesc'),
      extension: '.docx',
    },
    csv: {
      icon: Table2,
      title: t('formatCSV'),
      description: t('formatCSVDesc'),
      extension: '.csv',
    },
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('exportDocument')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('exportDocument')}</DialogTitle>
          <DialogDescription>
            {t('exportDocumentDesc')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="format" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="format">{t('format')}</TabsTrigger>
              <TabsTrigger value="options">
                <Settings2 className="h-4 w-4 mr-2" />
                {t('options')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="format" className="mt-4 space-y-4">
              {/* Format selection */}
              <RadioGroup
                value={selectedFormat}
                onValueChange={(value) => setSelectedFormat(value as ExportFormat)}
                className="space-y-3"
              >
                {(Object.keys(formatInfo) as ExportFormat[]).map((format) => {
                  const info = formatInfo[format];
                  const Icon = info.icon;
                  
                  return (
                    <div
                      key={format}
                      className={cn(
                        'flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors',
                        selectedFormat === format
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      )}
                      onClick={() => setSelectedFormat(format)}
                    >
                      <RadioGroupItem value={format} id={format} />
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <Label htmlFor={format} className="font-medium cursor-pointer">
                          {info.title}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {info.description}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {info.extension}
                      </span>
                    </div>
                  );
                })}
              </RadioGroup>

              {/* Google Sheets shortcut */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleOpenGoogleSheets}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('openGoogleSheets')}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {t('googleSheetsHint')}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="options" className="mt-4 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="include-metadata">{t('includeMetadata')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('includeMetadataDesc')}
                    </p>
                  </div>
                  <Switch
                    id="include-metadata"
                    checked={options.includeMetadata}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, includeMetadata: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="include-timestamps">{t('includeTimestamps')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('includeTimestampsDesc')}
                    </p>
                  </div>
                  <Switch
                    id="include-timestamps"
                    checked={options.includeTimestamps}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, includeTimestamps: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="include-tokens">{t('includeTokens')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('includeTokensDesc')}
                    </p>
                  </div>
                  <Switch
                    id="include-tokens"
                    checked={options.includeTokens}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, includeTokens: checked }))
                    }
                  />
                </div>
              </div>

              {/* Preview info */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium mb-2">{t('preview')}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {session.title}</li>
                  <li>• {messages.length} {t('messages')}</li>
                  <li>• {session.provider} / {session.model}</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Error message */}
        {exportError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {exportError}
          </div>
        )}

        {/* Success message */}
        {exportSuccess && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
            <Check className="h-4 w-4" />
            {t('exportSuccess', { format: formatInfo[exportSuccess as ExportFormat]?.title })}
          </div>
        )}

        {/* Export button */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || isLoading}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('exporting')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('export')} {formatInfo[selectedFormat]?.extension}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentExportDialog;
