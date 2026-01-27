'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  cancelText?: string;
  deleteText?: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  title,
  description,
  cancelText,
  deleteText,
}: DeleteConfirmDialogProps) {
  const t = useTranslations('deleteConfirm');
  const displayTitle = title ?? t('title');
  const displayDescription = description ?? t('description');
  const displayCancelText = cancelText ?? t('cancel');
  const displayDeleteText = deleteText ?? t('delete');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{displayTitle}</DialogTitle>
          <DialogDescription>{displayDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {displayCancelText}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {displayDeleteText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
