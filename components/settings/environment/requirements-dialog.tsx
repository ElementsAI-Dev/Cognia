'use client';

/**
 * RequirementsDialog - Dialog for import/export requirements.txt
 * Extracted from components/settings/system/virtual-env-panel.tsx
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Download,
  Upload,
  Loader2,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface RequirementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envPath: string;
  onExport: () => Promise<string>;
  onImport: (content: string) => Promise<boolean>;
  isExporting: boolean;
  isInstalling: boolean;
}

export function RequirementsDialog({
  open,
  onOpenChange,
  onExport,
  onImport,
  isExporting,
  isInstalling,
}: RequirementsDialogProps) {
  const t = useTranslations('virtualEnv');
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportContent, setExportContent] = useState('');
  const [importContent, setImportContent] = useState('');

  const handleExport = async () => {
    const content = await onExport();
    setExportContent(content);
  };

  const handleImport = async () => {
    const success = await onImport(importContent);
    if (success) {
      setImportContent('');
      onOpenChange(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportContent);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('requirementsTitle')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'export' | 'import')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {t('export')}
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {t('import')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-3">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t('generateRequirements')}
            </Button>
            {exportContent && (
              <>
                <Textarea
                  value={exportContent}
                  readOnly
                  className="h-[200px] font-mono text-xs"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyToClipboard}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t('copyToClipboard')}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-3">
            <Textarea
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
              placeholder={t('pasteRequirements')}
              className="h-[200px] font-mono text-xs"
            />
            <Button
              onClick={handleImport}
              disabled={!importContent || isInstalling}
              className="w-full"
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {t('installFromRequirements')}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RequirementsDialog;
