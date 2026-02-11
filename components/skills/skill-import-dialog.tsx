'use client';

/**
 * Skill Import Dialog
 *
 * Dialog for importing skills from JSON data
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';
import { useSkillStore } from '@/stores/skills';

interface SkillImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SkillImportDialog({ open, onOpenChange }: SkillImportDialogProps) {
  const t = useTranslations('skills');
  const { importSkill } = useSkillStore();
  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = useCallback(async () => {
    if (!importData.trim()) return;

    setIsImporting(true);
    try {
      const parsed = JSON.parse(importData);
      const skillsToImport = Array.isArray(parsed) ? parsed : [parsed];
      for (const skillData of skillsToImport) {
        importSkill(skillData);
      }
      onOpenChange(false);
      setImportData('');
    } catch (err) {
      toast.error(t('importFailed'), err instanceof Error ? err.message : t('invalidJson'));
    } finally {
      setIsImporting(false);
    }
  }, [importData, importSkill, t, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('importSkills')}</DialogTitle>
          <DialogDescription>
            {t('importSkillsDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            className="h-64 font-mono text-sm resize-none"
            placeholder={t('pasteSkillsJson')}
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleImport} disabled={!importData.trim() || isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('importing')}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t('import')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SkillImportDialog;
