'use client';

/**
 * StorageCleanupDialog - Dialog for storage cleanup operations
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Trash2,
  Zap,
  Sparkles,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useStorageCleanup } from '@/hooks/storage';
import type { CleanupResult, StorageCategory } from '@/lib/storage';
import { CATEGORY_INFO } from '@/lib/storage';

interface StorageCleanupDialogProps {
  trigger?: React.ReactNode;
  formatBytes: (bytes: number) => string;
  onCleanupComplete?: () => void;
}

export function StorageCleanupDialog({
  trigger,
  formatBytes,
  onCleanupComplete,
}: StorageCleanupDialogProps) {
  const t = useTranslations('dataSettings');
  const [open, setOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<StorageCategory[]>([]);
  const [previewResult, setPreviewResult] = useState<CleanupResult | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [step, setStep] = useState<'select' | 'preview' | 'result'>('select');

  const {
    cleanup,
    quickCleanup,
    deepCleanup,
    previewCleanup,
    isRunning,
  } = useStorageCleanup();

  const handleCategoryToggle = (category: StorageCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handlePreview = async () => {
    const result = await previewCleanup({
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    });
    setPreviewResult(result);
    setStep('preview');
  };

  const handleCleanup = async () => {
    const result = await cleanup({
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    });
    setCleanupResult(result);
    setStep('result');
    onCleanupComplete?.();
  };

  const handleQuickCleanup = async () => {
    const result = await quickCleanup();
    setCleanupResult(result);
    setStep('result');
    onCleanupComplete?.();
  };

  const handleDeepCleanup = async () => {
    const result = await deepCleanup();
    setCleanupResult(result);
    setStep('result');
    onCleanupComplete?.();
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after animation
    setTimeout(() => {
      setStep('select');
      setPreviewResult(null);
      setCleanupResult(null);
      setSelectedCategories([]);
    }, 200);
  };

  const categories = Object.keys(CATEGORY_INFO) as StorageCategory[];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t('cleanup') || 'Cleanup'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('storageCleanup') || 'Storage Cleanup'}</DialogTitle>
          <DialogDescription>
            {t('storageCleanupDesc') || 'Free up space by removing old or unused data.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quick" className="text-xs">
                <Zap className="mr-1 h-3 w-3" />
                {t('quick') || 'Quick'}
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">
                <Sparkles className="mr-1 h-3 w-3" />
                {t('custom') || 'Custom'}
              </TabsTrigger>
              <TabsTrigger value="deep" className="text-xs">
                <Trash2 className="mr-1 h-3 w-3" />
                {t('deep') || 'Deep'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                {t('quickCleanupDesc') || 'Clear temporary cache data. Safe and fast.'}
              </p>
              <Button
                onClick={handleQuickCleanup}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                {t('runQuickCleanup') || 'Run Quick Cleanup'}
              </Button>
            </TabsContent>

            <TabsContent value="custom" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                {t('customCleanupDesc') || 'Select which categories to clean up.'}
              </p>
              <ScrollArea className="h-48 rounded-md border p-2">
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={category}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <Label
                        htmlFor={category}
                        className="text-xs font-normal cursor-pointer"
                      >
                        {CATEGORY_INFO[category].displayName}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={isRunning}
                  className="flex-1"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('preview') || 'Preview'}
                </Button>
                <Button
                  onClick={handleCleanup}
                  disabled={isRunning}
                  className="flex-1"
                >
                  {isRunning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {t('cleanup') || 'Cleanup'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="deep" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                {t('deepCleanupDesc') || 'Aggressive cleanup of all old data. Use with caution.'}
              </p>
              <div className="rounded-md border border-yellow-500/50 bg-yellow-500/5 p-2 text-xs">
                <AlertCircle className="inline-block h-3 w-3 mr-1 text-yellow-500" />
                {t('deepCleanupWarning') || 'This will remove data older than 7 days.'}
              </div>
              <Button
                variant="destructive"
                onClick={handleDeepCleanup}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {t('runDeepCleanup') || 'Run Deep Cleanup'}
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {step === 'preview' && previewResult && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{formatBytes(previewResult.freedSpace)}</p>
              <p className="text-xs text-muted-foreground">
                {t('willBeFreed') || 'will be freed'}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {previewResult.deletedItems} {t('itemsWillBeDeleted') || 'items will be deleted'}
            </div>
            <ScrollArea className="h-32 rounded-md border p-2">
              {previewResult.details.map((detail, i) => (
                <div key={i} className="flex justify-between text-xs py-1">
                  <span>{CATEGORY_INFO[detail.category]?.displayName || detail.category}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {detail.deletedItems} items
                  </Badge>
                </div>
              ))}
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select')}>
                {t('back') || 'Back'}
              </Button>
              <Button onClick={handleCleanup} disabled={isRunning}>
                {isRunning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {t('confirmCleanup') || 'Confirm Cleanup'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'result' && cleanupResult && (
          <div className="space-y-3">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-bold">
                {t('cleanupComplete') || 'Cleanup Complete!'}
              </p>
            </div>
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('freedSpace') || 'Freed space'}</span>
                <span className="font-medium text-green-600">
                  {formatBytes(cleanupResult.freedSpace)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('deletedItems') || 'Deleted items'}</span>
                <span className="font-medium">{cleanupResult.deletedItems}</span>
              </div>
            </div>
            {cleanupResult.errors.length > 0 && (
              <div className="text-xs text-yellow-600">
                {cleanupResult.errors.length} {t('errorsOccurred') || 'errors occurred'}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>{t('done') || 'Done'}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default StorageCleanupDialog;
