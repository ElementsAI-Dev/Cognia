'use client';

/**
 * Shortcut Conflict Dialog
 * 
 * Dialog for resolving keyboard shortcut conflicts
 */

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ShortcutConflict, ConflictResolution } from '@/types/shortcut';
import { cn } from '@/lib/utils';

interface ShortcutConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ShortcutConflict[];
  onResolve: (conflict: ShortcutConflict, resolution: ConflictResolution) => void;
  onResolveAll?: (resolution: ConflictResolution) => void;
}

export function ShortcutConflictDialog({
  open,
  onOpenChange,
  conflicts,
  onResolve,
  onResolveAll,
}: ShortcutConflictDialogProps) {
  const t = useTranslations('shortcutConflict');
  const tCommon = useTranslations('common');

  const handleResolve = useCallback(
    (conflict: ShortcutConflict, resolution: ConflictResolution) => {
      onResolve(conflict, resolution);
    },
    [onResolve]
  );

  const handleResolveAll = useCallback(
    (resolution: ConflictResolution) => {
      if (onResolveAll) {
        onResolveAll(resolution);
      } else {
        conflicts.forEach((conflict) => onResolve(conflict, resolution));
      }
      onOpenChange(false);
    },
    [conflicts, onResolve, onResolveAll, onOpenChange]
  );

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {t('title')}
            </DialogTitle>
            <DialogDescription>
              {conflicts.length === 1
                ? t('singleDescription')
                : t('multipleDescription', { count: conflicts.length })}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {conflicts.map((conflict, index) => (
                <div
                  key={`${conflict.shortcut}-${conflict.timestamp}`}
                  className={cn(
                    'rounded-lg border p-4 space-y-3',
                    'bg-muted/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="font-mono">
                          {conflict.shortcut}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {t('conflictNumber', { number: index + 1 })}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground min-w-[80px]">
                            {t('existing')}
                          </span>
                          <span className="font-medium">
                            {conflict.existingAction}
                            <span className="text-muted-foreground ml-1">
                              ({conflict.existingOwner})
                            </span>
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground min-w-[80px]">
                            {t('new')}
                          </span>
                          <span className="font-medium">
                            {conflict.newAction}
                            <span className="text-muted-foreground ml-1">
                              ({conflict.newOwner})
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(conflict, 'keep-existing')}
                          className="flex-1"
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          {t('keepExisting')}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('keepExistingTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(conflict, 'use-new')}
                          className="flex-1"
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          {t('useNew')}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('useNewTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResolve(conflict, 'cancel')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {conflicts.length > 1 && (
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2 flex-1">
                <Button
                  variant="outline"
                  onClick={() => handleResolveAll('keep-existing')}
                  className="flex-1"
                >
                  {t('keepAllExisting')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleResolveAll('use-new')}
                  className="flex-1"
                >
                  {t('useAllNew')}
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                {tCommon('cancel')}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

export default ShortcutConflictDialog;
