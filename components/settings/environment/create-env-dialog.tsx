'use client';

/**
 * CreateEnvDialog - Dialog for creating new virtual environments
 * Extracted from components/settings/system/virtual-env-panel.tsx
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Loader2,
  Sparkles,
  Terminal,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { VirtualEnvType } from '@/types/system/environment';
import { ENV_PRESETS, type EnvPresetTemplate } from '@/types/system/environment';

export interface CreateEnvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (options: {
    name: string;
    type: VirtualEnvType;
    pythonVersion?: string;
    packages?: string[];
  }) => Promise<void>;
  availablePythonVersions: string[];
  isCreating: boolean;
}

export function CreateEnvDialog({
  open,
  onOpenChange,
  onSubmit,
  availablePythonVersions,
  isCreating,
}: CreateEnvDialogProps) {
  const t = useTranslations('virtualEnv');
  const [name, setName] = useState('');
  const [type, setType] = useState<VirtualEnvType>('uv');
  const [pythonVersion, setPythonVersion] = useState('');
  const [packages, setPackages] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handlePresetSelect = (preset: EnvPresetTemplate) => {
    setSelectedPreset(preset.id);
    setName(preset.id);
    if (preset.pythonVersion) {
      setPythonVersion(preset.pythonVersion);
    }
    if (preset.packages?.python) {
      setPackages(preset.packages.python.join(', '));
    }
  };

  const handleSubmit = async () => {
    const packageList = packages
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    await onSubmit({
      name,
      type,
      pythonVersion: pythonVersion || undefined,
      packages: packageList.length > 0 ? packageList : undefined,
    });

    // Reset form
    setName('');
    setPythonVersion('');
    setPackages('');
    setSelectedPreset(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('createEnvironment')}
          </DialogTitle>
          <DialogDescription>{t('createEnvironmentDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-xs">{t('presets')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {ENV_PRESETS.filter((p) => p.type === 'python' || p.type === 'data-science').map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPreset === preset.id ? 'default' : 'outline'}
                  size="sm"
                  className="h-auto py-2 flex-col gap-1"
                  onClick={() => handlePresetSelect(preset)}
                >
                  <span className="text-lg">{preset.icon}</span>
                  <span className="text-[10px]">{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="env-name" className="text-xs">{t('environmentName')}</Label>
            <Input
              id="env-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project-env"
              className="h-8 text-sm"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('environmentType')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as VirtualEnvType)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uv">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                    <span>uv (Fastest)</span>
                  </div>
                </SelectItem>
                <SelectItem value="venv">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-blue-500" />
                    <span>venv (Standard)</span>
                  </div>
                </SelectItem>
                <SelectItem value="conda">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-green-500" />
                    <span>conda</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Python Version */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('pythonVersion')}</Label>
            <Select value={pythonVersion} onValueChange={setPythonVersion}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t('selectPythonVersion')} />
              </SelectTrigger>
              <SelectContent>
                {availablePythonVersions.map((version) => (
                  <SelectItem key={version} value={version}>
                    Python {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Initial Packages */}
          <div className="space-y-1.5">
            <Label htmlFor="packages" className="text-xs">{t('initialPackages')}</Label>
            <Input
              id="packages"
              value={packages}
              onChange={(e) => setPackages(e.target.value)}
              placeholder="numpy, pandas, requests"
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">{t('packagesHint')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('creating')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {t('create')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateEnvDialog;
