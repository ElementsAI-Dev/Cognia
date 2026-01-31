'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

interface LatexEquationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (prompt: string) => Promise<string | null>;
  onInsert: (latex: string) => void;
  isLoading?: boolean;
}

export function LatexEquationDialog({
  open,
  onOpenChange,
  onGenerate,
  onInsert,
  isLoading = false,
}: LatexEquationDialogProps) {
  const t = useTranslations('latex');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string>('');

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        setPrompt('');
        setResult('');
      }
    },
    [onOpenChange]
  );

  const handleGenerate = useCallback(async () => {
    const input = prompt.trim();
    if (!input) return;

    const generated = await onGenerate(input);
    if (generated) {
      setResult(generated);
    }
  }, [onGenerate, prompt]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('ai.equationDialog.title')}</DialogTitle>
          <DialogDescription>{t('ai.equationDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('ai.equationDialog.inputPlaceholder')}
          />

          <div className="flex justify-end">
            <Button type="button" onClick={() => void handleGenerate()} disabled={isLoading || !prompt.trim()}>
              {t('ai.equationDialog.generate')}
            </Button>
          </div>

          <Separator />

          <Textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={8}
            placeholder={t('ai.equationDialog.resultPlaceholder')}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('ai.equationDialog.cancel')}
            </Button>
            <Button type="button" onClick={() => onInsert(result)} disabled={!result.trim()}>
              {t('ai.equationDialog.insert')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LatexEquationDialog;
