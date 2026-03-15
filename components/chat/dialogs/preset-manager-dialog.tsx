'use client';

import { useTranslations } from 'next-intl';

import { PresetsManager } from '@/components/presets';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Preset } from '@/types/content/preset';

interface PresetManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPresetId?: string | null;
  openCreateOnMount?: boolean;
  onPresetSelect?: (preset: Preset) => void;
}

export function PresetManagerDialog({
  open,
  onOpenChange,
  editPresetId,
  openCreateOnMount = false,
  onPresetSelect,
}: PresetManagerDialogProps) {
  const t = useTranslations('presets');

  const handlePresetSelect = (preset: Preset) => {
    onPresetSelect?.(preset);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-200 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('managePresets')}</DialogTitle>
        </DialogHeader>

        <PresetsManager
          onSelectPreset={handlePresetSelect}
          initialEditPresetId={editPresetId}
          openCreateOnMount={openCreateOnMount}
        />
      </DialogContent>
    </Dialog>
  );
}

export default PresetManagerDialog;
