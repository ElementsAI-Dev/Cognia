'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Download,
  Upload,
  FileJson,
  Check,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { usePromptMarketplaceStore } from '@/stores/prompt/prompt-marketplace-store';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';

interface PromptImportExportProps {
  trigger?: React.ReactNode;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

export function PromptImportExport({ trigger }: PromptImportExportProps) {
  const t = useTranslations('promptMarketplace.importExport');
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const installedPrompts = usePromptMarketplaceStore((state) => state.userActivity.installed);
  const getPromptById = usePromptMarketplaceStore((state) => state.getPromptById);
  const installPrompt = usePromptMarketplaceStore((state) => state.installPrompt);

  const installedPromptsList = installedPrompts
    .map((i) => getPromptById(i.marketplaceId))
    .filter(Boolean) as MarketplacePrompt[];

  const exportData = JSON.stringify(
    {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      prompts: installedPromptsList.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        content: p.content,
        category: p.category,
        tags: p.tags,
        variables: p.variables,
        author: p.author,
      })),
    },
    null,
    2
  );

  const handleCopyExport = async () => {
    await navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadExport = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImportText(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setImportResult(null);

    try {
      const data = JSON.parse(importText);
      const result: ImportResult = {
        success: true,
        imported: 0,
        skipped: 0,
        errors: [],
      };

      if (!data.prompts || !Array.isArray(data.prompts)) {
        result.success = false;
        result.errors.push(t('invalidFormat'));
        setImportResult(result);
        return;
      }

      for (const prompt of data.prompts) {
        try {
          const existingPrompt = getPromptById(prompt.id);
          if (existingPrompt) {
            const isInstalled = installedPrompts.some(
              (i) => i.marketplaceId === prompt.id
            );
            if (isInstalled) {
              result.skipped++;
              continue;
            }
          }

          await installPrompt(prompt.id);
          result.imported++;
        } catch {
          result.errors.push(`${t('failedToImport')}: ${prompt.name || prompt.id}`);
        }
      }

      setImportResult(result);
    } catch {
      setImportResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: [t('parseError')],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <FileJson className="h-4 w-4" />
            {t('title')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'export' | 'import')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              {t('export')}
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              {t('import')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('exportDesc', { count: installedPromptsList.length })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyExport}
                  disabled={installedPromptsList.length === 0}
                  className="gap-1.5"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? t('copied') : t('copy')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownloadExport}
                  disabled={installedPromptsList.length === 0}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  {t('download')}
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[300px] border rounded-lg">
              <pre className="p-4 text-xs font-mono">
                {installedPromptsList.length > 0 ? exportData : t('noPromptsToExport')}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <Upload className="h-4 w-4" />
                  {t('selectFile')}
                </Button>
                <span className="text-sm text-muted-foreground">{t('orPasteJson')}</span>
              </div>
              <Textarea
                placeholder={t('pasteJsonHere')}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="h-[200px] font-mono text-xs"
              />
            </div>

            {importResult && (
              <div
                className={cn(
                  'p-4 rounded-lg border',
                  importResult.success && importResult.errors.length === 0
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                    : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                )}
              >
                <div className="flex items-start gap-3">
                  {importResult.success && importResult.errors.length === 0 ? (
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-medium">
                      {importResult.success ? t('importComplete') : t('importFailed')}
                    </p>
                    <div className="flex gap-3 text-sm">
                      <Badge variant="secondary">{t('imported')}: {importResult.imported}</Badge>
                      <Badge variant="outline">{t('skipped')}: {importResult.skipped}</Badge>
                    </div>
                    {importResult.errors.length > 0 && (
                      <ul className="text-sm text-red-600 mt-2 space-y-1">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleImport}
                disabled={!importText.trim() || isProcessing}
                className="gap-1.5"
              >
                {isProcessing ? t('importing') : t('importButton')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default PromptImportExport;
