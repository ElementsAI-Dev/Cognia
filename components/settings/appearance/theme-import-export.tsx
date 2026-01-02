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
import { useSettingsStore, type CustomTheme } from '@/stores';
import { cn } from '@/lib/utils';
import { isValidHex } from '@/lib/themes/color-utils';

interface ThemeExportData {
  version: string;
  exportedAt: string;
  themes: CustomTheme[];
}

/**
 * Validate imported theme data structure
 */
function validateThemeData(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format' };
  }

  const themeData = data as Record<string, unknown>;

  if (themeData.version !== '1.0') {
    return { valid: false, error: 'Unsupported version format' };
  }

  if (!Array.isArray(themeData.themes)) {
    return { valid: false, error: 'Missing themes array' };
  }

  for (const theme of themeData.themes) {
    if (!theme || typeof theme !== 'object') {
      return { valid: false, error: 'Invalid theme object' };
    }

    const t = theme as Record<string, unknown>;
    if (typeof t.name !== 'string' || !t.name.trim()) {
      return { valid: false, error: 'Theme missing name' };
    }

    if (typeof t.isDark !== 'boolean') {
      return { valid: false, error: 'Theme missing isDark property' };
    }

    if (!t.colors || typeof t.colors !== 'object') {
      return { valid: false, error: 'Theme missing colors' };
    }

    const colors = t.colors as Record<string, unknown>;
    const requiredColors = ['primary', 'secondary', 'accent', 'background', 'foreground', 'muted'];
    for (const colorKey of requiredColors) {
      if (typeof colors[colorKey] !== 'string' || !isValidHex(colors[colorKey] as string)) {
        return { valid: false, error: `Invalid color: ${colorKey}` };
      }
    }
  }

  return { valid: true };
}

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
          Import/Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('importExportThemes') || 'Import/Export Themes'}</DialogTitle>
          <DialogDescription>
            {t('importExportDescription') || 'Share your custom themes or import from a file'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Export Themes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Export all your custom themes ({customThemes.length}) to a JSON file
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={customThemes.length === 0}
              className="w-full"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export to File
            </Button>
          </div>

          {/* Import Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Import Themes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Import custom themes from a JSON file
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
              Select File
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
              You have {customThemes.length} custom theme{customThemes.length > 1 ? 's' : ''}
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
