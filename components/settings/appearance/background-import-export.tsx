'use client';

/**
 * BackgroundImportExport - Import and export background settings
 * Supports JSON format for sharing and backup
 */

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Upload, FileJson, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import type { BackgroundSettings } from '@/lib/themes';
import { migrateAndSanitizeBackgroundSettings } from '@/lib/themes';
import type { BackgroundExportData } from '@/types/settings';

export function BackgroundImportExport() {
  const t = useTranslations('backgroundImportExport');
  const tc = useTranslations('common');

  const backgroundSettings = useSettingsStore((state) => state.backgroundSettings);
  const setBackgroundSettings = useSettingsStore((state) => state.setBackgroundSettings);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const stripLocalAssetsForTransport = (
    settings: BackgroundSettings
  ): Partial<BackgroundSettings> => ({
    ...settings,
    localAssetId: null,
    layers: settings.layers.map((layer) => ({ ...layer, localAssetId: null })),
    slideshow: {
      ...settings.slideshow,
      slides: settings.slideshow.slides.map((slide) => ({ ...slide, localAssetId: null })),
    },
  });

  const handleExport = () => {
    const migrated = migrateAndSanitizeBackgroundSettings(
      stripLocalAssetsForTransport(backgroundSettings),
      {
        downgradeUnresolvedLocalToNone: true,
        allowIncompleteUrlSource: false,
      }
    );

    if (!migrated.success) {
      setImportStatus('error');
      setImportMessage(migrated.error || t('invalidFileFormat'));
      return;
    }

    const { localAssetId: _localAssetId, ...rest } = migrated.settings;
    const settingsToExport: BackgroundExportData['settings'] = {
      ...rest,
      layers: migrated.settings.layers.map(({ localAssetId: _layerLocalAssetId, ...layer }) => layer),
      slideshow: {
        ...migrated.settings.slideshow,
        slides: migrated.settings.slideshow.slides.map(({ localAssetId: _slideLocalAssetId, ...slide }) => slide),
      },
    };

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
    setImportMessage(t('exportSuccess'));
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!data || typeof data !== 'object' || !('version' in data) || !('settings' in data)) {
          setImportStatus('error');
          setImportMessage(t('invalidFileFormat'));
          return;
        }

        const bgData = data as { settings: Partial<BackgroundSettings> };
        const slideshow = bgData.settings.slideshow
          ? {
              ...bgData.settings.slideshow,
              slides: bgData.settings.slideshow.slides.map((slide) => ({
                ...slide,
                localAssetId: null,
              })),
            }
          : undefined;

        const migrated = migrateAndSanitizeBackgroundSettings(
          {
            ...bgData.settings,
            localAssetId: null,
            layers: (bgData.settings.layers ?? []).map((layer) => ({
              ...layer,
              localAssetId: null,
            })),
            slideshow,
          },
          {
            downgradeUnresolvedLocalToNone: true,
            allowIncompleteUrlSource: false,
          }
        );

        if (!migrated.success) {
          setImportStatus('error');
          setImportMessage(migrated.error || t('invalidFileFormat'));
          return;
        }

        setBackgroundSettings(migrated.settings);

        setImportStatus('success');
        setImportMessage(t('importSuccess'));
      } catch {
        setImportStatus('error');
        setImportMessage(t('parseFileFailed'));
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
          {t('importExportButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {t('dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {t('exportSettings')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('exportSettingsDesc')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
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
              <span className="font-medium text-sm">
                {t('importSettings')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('importSettingsDesc')}
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
              <Alert
                variant={importStatus === 'error' ? 'destructive' : 'default'}
                className="py-2"
              >
                {importStatus === 'success' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription className="text-xs">
                  {importMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Note about local files */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
            <p>
              {t('localFilesNote')}
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
