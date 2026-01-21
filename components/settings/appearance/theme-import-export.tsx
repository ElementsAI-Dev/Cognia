'use client';

/**
 * ThemeImportExport - Import and export custom themes
 * Supports JSON format for sharing and backup
 */

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Upload, FileJson, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSettingsStore } from '@/stores';
import { cn } from '@/lib/utils';
import { validateThemeData } from '@/lib/themes';
import type { ThemeExportData } from '@/types/settings';

export function ThemeImportExport() {
  const t = useTranslations('themeEditor');
  const tc = useTranslations('common');

  const customThemes = useSettingsStore((state) => state.customThemes);
  const createCustomTheme = useSettingsStore((state) => state.createCustomTheme);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleExport = () => {
    if (customThemes.length === 0) {
      return;
    }

    const exportData: ThemeExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      themes: customThemes.map(({ id, ...rest }) => ({ id, ...rest })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cognia-themes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        const validation = validateThemeData(data);
        if (!validation.valid) {
          setImportStatus('error');
          setImportMessage(validation.error || 'Invalid file format');
          return;
        }

        const themeData = data as ThemeExportData;
        let importedCount = 0;

        for (const theme of themeData.themes) {
          // Check if theme with same name exists
          const exists = customThemes.some(
            (t) => t.name.toLowerCase() === theme.name.toLowerCase()
          );

          if (!exists) {
            createCustomTheme({
              name: theme.name,
              isDark: theme.isDark,
              colors: theme.colors,
            });
            importedCount++;
          }
        }

        if (importedCount > 0) {
          setImportStatus('success');
          setImportMessage(`Successfully imported ${importedCount} theme(s)`);
        } else {
          setImportStatus('error');
          setImportMessage('All themes already exist');
        }
      } catch {
        setImportStatus('error');
        setImportMessage('Failed to parse file');
      }
    };

    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Reset status when closing
      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 200);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileJson className="h-3.5 w-3.5 mr-1.5" />
          {t('importExportThemes')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('importExportThemes')}</DialogTitle>
          <DialogDescription>
            {t('importExportDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('exportThemes')}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('exportThemesDesc', { count: customThemes.length })}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={customThemes.length === 0}
              className="w-full"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {t('exportToFile')}
            </Button>
          </div>

          {/* Import Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('importThemes')}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('importThemesDesc')}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {t('selectFile')}
            </Button>

            {/* Import Status */}
            {importStatus !== 'idle' && (
              <div
                className={cn(
                  'flex items-center gap-2 p-2 rounded-md text-xs',
                  importStatus === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                )}
              >
                {importStatus === 'success' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                {importMessage}
              </div>
            )}
          </div>

          {/* Current Themes Count */}
          {customThemes.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              {t('customThemesCount', { count: customThemes.length })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {tc('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ThemeImportExport;
