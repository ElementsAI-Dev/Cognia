'use client';

/**
 * BatchActionToolbar - Floating toolbar for batch plugin operations
 * Appears when plugins are selected
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Power, PowerOff, Trash2, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BatchActionToolbarProps {
  /** Number of selected plugins */
  selectedCount: number;
  /** Total number of plugins */
  totalCount: number;
  /** Callback for select all */
  onSelectAll: () => void;
  /** Callback for deselect all */
  onDeselectAll: () => void;
  /** Callback for batch enable */
  onBatchEnable: () => Promise<void> | void;
  /** Callback for batch disable */
  onBatchDisable: () => Promise<void> | void;
  /** Callback for batch uninstall */
  onBatchUninstall: () => Promise<void> | void;
  /** Additional class names */
  className?: string;
  /** Whether any operation is in progress */
  isLoading?: boolean;
}

export function BatchActionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBatchEnable,
  onBatchDisable,
  onBatchUninstall,
  className,
  isLoading = false,
}: BatchActionToolbarProps) {
  const t = useTranslations('pluginSettings.batchActions');
  const [showUninstallDialog, setShowUninstallDialog] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Don't render if nothing is selected
  if (selectedCount === 0) {
    return null;
  }

  // Handle batch enable
  const handleEnable = async () => {
    setIsProcessing(true);
    try {
      await onBatchEnable();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle batch disable
  const handleDisable = async () => {
    setIsProcessing(true);
    try {
      await onBatchDisable();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle batch uninstall
  const handleUninstall = async () => {
    setIsProcessing(true);
    try {
      await onBatchUninstall();
      setShowUninstallDialog(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Toolbar */}
      <div
        className={cn(
          'fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50',
          'animate-in slide-in-from-bottom-4 fade-in duration-300',
          className
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-xl',
            'bg-card border shadow-lg',
            'backdrop-blur-sm'
          )}
        >
          {/* Selection count */}
          <Badge variant="secondary" className="h-6 px-2">
            {selectedCount} {t('selected')}
          </Badge>

          <Separator orientation="vertical" className="h-5" />

          {/* Select all / Deselect */}
          <div className="hidden sm:flex items-center gap-1">
            {selectedCount < totalCount ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onSelectAll}
                disabled={isProcessing || isLoading}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {t('selectAll')}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onDeselectAll}
                disabled={isProcessing || isLoading}
              >
                <X className="h-3 w-3 mr-1" />
                {t('deselectAll')}
              </Button>
            )}
          </div>

          <Separator orientation="vertical" className="h-5 hidden sm:block" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={handleEnable}
              disabled={isProcessing || isLoading}
            >
              <Power className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">{t('enableAll')}</span>
              <span className="sm:hidden">{t('enable')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={handleDisable}
              disabled={isProcessing || isLoading}
            >
              <PowerOff className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">{t('disableAll')}</span>
              <span className="sm:hidden">{t('disable')}</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={() => setShowUninstallDialog(true)}
              disabled={isProcessing || isLoading}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">{t('uninstallAll')}</span>
              <span className="sm:hidden">{t('uninstall')}</span>
            </Button>
          </div>

          {/* Close button */}
          <Separator orientation="vertical" className="h-5" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDeselectAll}
            disabled={isProcessing || isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Uninstall Confirmation Dialog */}
      <AlertDialog open={showUninstallDialog} onOpenChange={setShowUninstallDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('uninstallConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('uninstallConfirmDesc', { count: selectedCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUninstall}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? t('uninstalling') : t('uninstall')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default BatchActionToolbar;
