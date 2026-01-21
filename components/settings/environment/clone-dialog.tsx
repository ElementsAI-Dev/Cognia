'use client';

/**
 * CloneDialog - Dialog for cloning virtual environments
 * Extracted from components/settings/system/virtual-env-panel.tsx
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { VirtualEnvInfo } from '@/types/system/environment';

export interface CloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceEnv: VirtualEnvInfo | null;
  onClone: (newName: string) => Promise<void>;
  isCreating: boolean;
}

export function CloneDialog({ open, onOpenChange, sourceEnv, onClone, isCreating }: CloneDialogProps) {
  const t = useTranslations('virtualEnv');
  const [newName, setNewName] = useState('');

  const handleClone = async () => {
    if (newName) {
      await onClone(newName);
      setNewName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {t('cloneEnvironment')}
          </DialogTitle>
          <DialogDescription>
            {t('cloneEnvironmentDesc', { name: sourceEnv?.name || '' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="clone-name" className="text-xs">{t('newEnvironmentName')}</Label>
            <Input
              id="clone-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`${sourceEnv?.name}-copy`}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            {t('cancel')}
          </Button>
          <Button onClick={handleClone} disabled={!newName || isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {t('clone')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CloneDialog;
