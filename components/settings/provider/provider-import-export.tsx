'use client';

/**
 * ProviderImportExport - Import/Export provider configurations
 * Allows users to backup and restore their provider settings
 */

import { useState, useRef } from 'react';
import { Download, Upload, AlertCircle, Check, FileJson } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores';

interface ProviderImportExportProps {
  onClose?: () => void;
}

interface ExportData {
  version: number;
  exportedAt: string;
  providerSettings?: Record<string, unknown>;
  customProviders?: Record<string, unknown>;
}

export function ProviderImportExport({ onClose }: ProviderImportExportProps) {
  const t = useTranslations('providers');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const customProviders = useSettingsStore((state) => state.customProviders);
  const setProviderSettings = useSettingsStore((state) => state.setProviderSettings);
  const addCustomProvider = useSettingsStore((state) => state.addCustomProvider);
  
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [includeApiKeys, setIncludeApiKeys] = useState(false);
  const [importData, setImportData] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  
  const handleExport = () => {
    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      providerSettings: {},
      customProviders: {},
    };
    
    // Export provider settings (optionally with API keys)
    Object.entries(providerSettings).forEach(([id, settings]) => {
      const settingsCopy = { ...settings };
      if (!includeApiKeys) {
        delete settingsCopy.apiKey;
        delete settingsCopy.apiKeys;
      }
      exportData.providerSettings![id] = settingsCopy;
    });
    
    // Export custom providers (optionally with API keys)
    Object.entries(customProviders).forEach(([id, provider]) => {
      const providerCopy = { ...provider };
      if (!includeApiKeys) {
        delete (providerCopy as Record<string, unknown>).apiKey;
      }
      exportData.customProviders![id] = providerCopy;
    });
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognia-providers-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setExportDialogOpen(false);
    onClose?.();
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImportError(null);
    setImportSuccess(false);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ExportData;
        if (!data.version || !data.providerSettings) {
          throw new Error('Invalid export file format');
        }
        setImportData(data);
        setImportDialogOpen(true);
      } catch {
        setImportError('Invalid file format. Please select a valid export file.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleImport = () => {
    if (!importData) return;
    
    try {
      // Import provider settings
      if (importData.providerSettings) {
        Object.entries(importData.providerSettings).forEach(([id, settings]) => {
          setProviderSettings(id, settings as Record<string, unknown>);
        });
      }
      
      // Import custom providers
      if (importData.customProviders) {
        Object.entries(importData.customProviders).forEach(([_id, provider]) => {
          const providerData = provider as Record<string, unknown>;
          addCustomProvider({
            providerId: providerData.providerId as string,
            customName: providerData.customName as string,
            baseURL: providerData.baseURL as string,
            apiKey: providerData.apiKey as string || '',
            customModels: providerData.customModels as string[] || [],
            defaultModel: providerData.defaultModel as string,
            apiProtocol: (providerData.apiProtocol as 'openai' | 'anthropic' | 'gemini') || 'openai',
            enabled: providerData.enabled as boolean,
          });
        });
      }
      
      setImportSuccess(true);
      setTimeout(() => {
        setImportDialogOpen(false);
        setImportData(null);
        onClose?.();
      }, 1500);
    } catch {
      setImportError('Failed to import settings. Please try again.');
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      {/* Export Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setExportDialogOpen(true)}
      >
        <Download className="h-4 w-4 mr-2" />
        {t('export')}
      </Button>
      
      {/* Import Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        {t('import')}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelect}
      />
      
      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              {t('exportTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('exportDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('exportWarning')}
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-keys"
                checked={includeApiKeys}
                onCheckedChange={(checked) => setIncludeApiKeys(checked === true)}
              />
              <Label htmlFor="include-keys" className="text-sm">
                {t('includeApiKeys')}
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              {t('exportNow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('importTitle')}
            </DialogTitle>
            <DialogDescription>
              {importData && (
                <span>
                  {t('importFrom', { date: new Date(importData.exportedAt).toLocaleDateString() })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {importError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}
            
            {importSuccess && (
              <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  {t('importSuccess')}
                </AlertDescription>
              </Alert>
            )}
            
            {importData && !importSuccess && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {t('importProviderCount', { 
                    count: Object.keys(importData.providerSettings || {}).length 
                  })}
                </p>
                <p>
                  {t('importCustomCount', { 
                    count: Object.keys(importData.customProviders || {}).length 
                  })}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleImport} disabled={importSuccess}>
              <Upload className="h-4 w-4 mr-2" />
              {t('importNow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
