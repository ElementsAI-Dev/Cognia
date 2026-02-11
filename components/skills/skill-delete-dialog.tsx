'use client';

/**
 * Skill Delete Confirmation Dialog
 *
 * Confirmation dialog before deleting a skill
 */

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
import type { Skill } from '@/types/system/skill';

interface SkillDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
  onConfirm: () => void;
}

export function SkillDeleteDialog({ open, onOpenChange, skill, onConfirm }: SkillDeleteDialogProps) {
  const t = useTranslations('skills');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteSkill')}</DialogTitle>
          <DialogDescription>
            {t('deleteSkillConfirmation')}: &quot;{skill?.metadata.name}&quot;
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SkillDeleteDialog;
