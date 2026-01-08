'use client';

/**
 * BackgroundImportExport - Import and export background settings
 * Supports JSON format for sharing and backup
 */

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Upload, FileJson, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
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
import type { BackgroundSettings } from '@/lib/themes';

interface BackgroundExportData {
  version: string;
  exportedAt: string;
  settings: Omit<BackgroundSettings, 'localAssetId'>; // Don't export local asset ID
}

/**
 * Validate imported background data structure
 */
function validateBackgroundData(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format' };
  }

  const bgData = data as Record<string, unknown>;

  if (bgData.version !== '1.0') {
    return { valid: false, error: 'Unsupported version format' };
  }

  if (!bgData.settings || typeof bgData.settings !== 'object') {
    return { valid: false, error: 'Missing settings object' };
  }

  const settings = bgData.settings as Record<string, unknown>;

  // Validate required fields
  if (typeof settings.enabled !== 'boolean') {
    return { valid: false, error: 'Missing enabled property' };
  }

  if (!['none', 'url', 'local', 'preset'].includes(settings.source as string)) {
    return { valid: false, error: 'Invalid source type' };
  }

  return { valid: true };
}

export function BackgroundImportExport() {
  const _t = useTranslations('settings');
  const tc = useTranslations('common');
  const language = useSettingsStore((state) => state.language);

  const backgroundSettings = useSettingsStore((state) => state.backgroundSettings);
  const setBackgroundSettings = useSettingsStore((state) => state.setBackgroundSettings);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const isZh = language === 'zh-CN';

  const handleExport = () => {
    // Don't export localAssetId as it's specific to the local storage
    const { localAssetId: _localAssetId, ...settingsToExport } = backgroundSettings;

    const exportData: BackgroundExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: settingsToExport,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cognia-background-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setImportStatus('success');
    setImportMessage(isZh ? '导出成功' : 'Export successful');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        const validation = validateBackgroundData(data);
        if (!validation.valid) {
          setImportStatus('error');
          setImportMessage(validation.error || 'Invalid file format');
          return;
        }

        const bgData = data as BackgroundExportData;

        // Apply imported settings (but don't set localAssetId)
        setBackgroundSettings({
          ...bgData.settings,
          localAssetId: null, // Reset local asset since we can't import local files
        });

        setImportStatus('success');
        setImportMessage(isZh ? '导入成功' : 'Import successful');
      } catch {
        setImportStatus('error');
        setImportMessage(isZh ? '解析文件失败' : 'Failed to parse file');
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
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <FileJson className="h-3 w-3 mr-1" />
          {isZh ? '导入/导出' : 'Import/Export'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {isZh ? '背景设置导入/导出' : 'Background Import/Export'}
          </DialogTitle>
          <DialogDescription>
            {isZh
              ? '分享您的背景设置或从文件导入'
              : 'Share your background settings or import from a file'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {isZh ? '导出设置' : 'Export Settings'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isZh
                ? '将当前背景设置导出为JSON文件'
                : 'Export current background settings to a JSON file'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="w-full"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {isZh ? '导出到文件' : 'Export to File'}
            </Button>
          </div>

          {/* Import Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {isZh ? '导入设置' : 'Import Settings'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isZh
                ? '从JSON文件导入背景设置'
                : 'Import background settings from a JSON file'}
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
              {isZh ? '选择文件' : 'Select File'}
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

          {/* Note about local files */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
            <p>
              {isZh
                ? '注意：本地上传的图片不会包含在导出中。只有URL和预设背景会被导出。'
                : 'Note: Locally uploaded images are not included in exports. Only URL and preset backgrounds are exported.'}
            </p>
          </div>
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

export default BackgroundImportExport;
