'use client';

/**
 * Git Stash Panel - Stash management UI
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Archive, Plus, Play, Trash2, RefreshCw, Loader2, Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Empty, EmptyMedia, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

interface StashEntry {
  index: number;
  message: string;
  branch?: string;
  date?: string;
}

interface GitStashPanelProps {
  stashes: StashEntry[];
  isLoading?: boolean;
  onStashSave: (message?: string, includeUntracked?: boolean) => Promise<boolean>;
  onStashPop: (index?: number) => Promise<boolean>;
  onStashApply: (index?: number) => Promise<boolean>;
  onStashDrop: (index?: number) => Promise<boolean>;
  onStashClear: () => Promise<boolean>;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function GitStashPanel({
  stashes,
  isLoading = false,
  onStashSave,
  onStashPop,
  onStashApply,
  onStashDrop,
  onStashClear,
  onRefresh,
  className,
}: GitStashPanelProps) {
  const t = useTranslations('git.stash');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDropDialog, setShowDropDialog] = useState(false);
  const [stashMessage, setStashMessage] = useState('');
  const [includeUntracked, setIncludeUntracked] = useState(false);
  const [selectedStash, setSelectedStash] = useState<number | null>(null);
  const [isOperating, setIsOperating] = useState(false);

  const handleSave = async () => {
    setIsOperating(true);
    try {
      const success = await onStashSave(stashMessage.trim() || undefined, includeUntracked);
      if (success) {
        setShowSaveDialog(false);
        setStashMessage('');
        setIncludeUntracked(false);
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handlePop = async (index: number) => {
    setIsOperating(true);
    try {
      await onStashPop(index);
    } finally {
      setIsOperating(false);
    }
  };

  const handleApply = async (index: number) => {
    setIsOperating(true);
    try {
      await onStashApply(index);
    } finally {
      setIsOperating(false);
    }
  };

  const handleDrop = async () => {
    if (selectedStash === null) return;
    setIsOperating(true);
    try {
      const success = await onStashDrop(selectedStash);
      if (success) {
        setShowDropDialog(false);
        setSelectedStash(null);
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handleClear = async () => {
    setIsOperating(true);
    try {
      const success = await onStashClear();
      if (success) {
        setShowClearDialog(false);
      }
    } finally {
      setIsOperating(false);
    }
  };

  const confirmDrop = (index: number) => {
    setSelectedStash(index);
    setShowDropDialog(true);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4" />
          <span className="font-medium text-sm">{t('title')}</span>
          {stashes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {stashes.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowSaveDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('save')}
          </Button>
        </div>
      </div>

      {/* Stash List */}
      {stashes.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <Archive className="h-12 w-12 opacity-50" />
          </EmptyMedia>
          <EmptyDescription>
            {t('noStashes')}
            <br />
            <span className="text-xs">{t('noStashesHint')}</span>
          </EmptyDescription>
        </Empty>
      ) : (
        <>
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {stashes.map((stash) => (
                <div
                  key={stash.index}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {stash.index}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{stash.message}</p>
                      {stash.branch && (
                        <p className="text-xs text-muted-foreground">
                          {t('onBranch', { branch: stash.branch })}
                        </p>
                      )}
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <DropdownMenu>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Play className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>{t('actionsTooltip')}</TooltipContent>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handlePop(stash.index)}
                            disabled={isOperating}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {t('pop')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleApply(stash.index)}
                            disabled={isOperating}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            {t('apply')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => confirmDrop(stash.index)}
                            disabled={isOperating}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('drop')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Clear All Button */}
          <Button
            size="sm"
            variant="outline"
            className="w-full text-red-600 hover:text-red-700"
            onClick={() => setShowClearDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('clearAll')}
          </Button>
        </>
      )}

      {/* Save Stash Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('saveStash')}</DialogTitle>
            <DialogDescription>{t('saveStashDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stashMessage">{t('message')}</Label>
              <Input
                id="stashMessage"
                value={stashMessage}
                onChange={(e) => setStashMessage(e.target.value)}
                placeholder={t('messagePlaceholder')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('includeUntracked')}</Label>
                <p className="text-xs text-muted-foreground">{t('includeUntrackedHint')}</p>
              </div>
              <Switch checked={includeUntracked} onCheckedChange={setIncludeUntracked} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isOperating}>
              {isOperating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t('saveStash')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drop Stash Dialog */}
      <AlertDialog open={showDropDialog} onOpenChange={setShowDropDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dropStash')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dropStashConfirm', { index: selectedStash ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDrop} className="bg-red-600 hover:bg-red-700">
              {isOperating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('drop')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clearAllStashes')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clearAllConfirm', { count: stashes.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} className="bg-red-600 hover:bg-red-700">
              {isOperating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('clearAll')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GitStashPanel;
