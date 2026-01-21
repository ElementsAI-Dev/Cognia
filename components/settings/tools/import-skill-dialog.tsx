'use client';

/**
 * ImportSkillDialog Component
 *
 * Dialog for importing a skill from SKILL.md content.
 */

import { useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { parseSkillMd } from '@/lib/skills/parser';
import type { useTranslations } from 'next-intl';

export interface ImportSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (content: string) => void;
  t: ReturnType<typeof useTranslations>;
}

export function ImportSkillDialog({ open, onOpenChange, onImport, t }: ImportSkillDialogProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    const result = parseSkillMd(content);
    if (!result.success) {
      setError(result.errors[0]?.message || 'Invalid SKILL.md content');
      return;
    }
    onImport(content);
    setContent('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('importSkill')}</DialogTitle>
          <DialogDescription>{t('importSkillDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="---&#10;name: my-skill&#10;description: What this skill does...&#10;---&#10;&#10;# My Skill&#10;..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError(null);
            }}
            rows={15}
            className="font-mono text-sm"
          />
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleImport} disabled={!content}>
            <Upload className="h-4 w-4 mr-2" />
            {t('import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
