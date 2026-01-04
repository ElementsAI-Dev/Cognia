'use client';

/**
 * Git Branch Manager - Branch switching, creation, and deletion
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  GitBranch,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  RefreshCw,
  Loader2,
  GitMerge,
  Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';
import type { GitBranchInfo } from '@/types/git';

interface GitBranchManagerProps {
  branches: GitBranchInfo[];
  currentBranch?: string;
  isLoading?: boolean;
  onCheckout: (branch: string, createNew?: boolean) => Promise<boolean>;
  onCreateBranch: (name: string, startPoint?: string) => Promise<boolean>;
  onDeleteBranch: (name: string, force?: boolean) => Promise<boolean>;
  onMergeBranch?: (branch: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function GitBranchManager({
  branches,
  currentBranch,
  isLoading = false,
  onCheckout,
  onCreateBranch,
  onDeleteBranch,
  onMergeBranch,
  onRefresh,
  className,
}: GitBranchManagerProps) {
  const t = useTranslations('git.branches');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [startPoint, setStartPoint] = useState('');
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const [branchToMerge, setBranchToMerge] = useState<string | null>(null);
  const [isOperating, setIsOperating] = useState(false);
  const [filter, setFilter] = useState('');

  const localBranches = branches.filter((b) => !b.isRemote);
  const remoteBranches = branches.filter((b) => b.isRemote);

  const filteredLocalBranches = localBranches.filter((b) =>
    b.name.toLowerCase().includes(filter.toLowerCase())
  );
  const filteredRemoteBranches = remoteBranches.filter((b) =>
    b.name.toLowerCase().includes(filter.toLowerCase())
  );

  const handleCheckout = async (branch: string) => {
    setIsOperating(true);
    try {
      await onCheckout(branch);
    } finally {
      setIsOperating(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    setIsOperating(true);
    try {
      const success = await onCreateBranch(
        newBranchName.trim(),
        startPoint.trim() || undefined
      );
      if (success) {
        setShowCreateDialog(false);
        setNewBranchName('');
        setStartPoint('');
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handleDeleteBranch = async (force: boolean = false) => {
    if (!branchToDelete) return;

    setIsOperating(true);
    try {
      const success = await onDeleteBranch(branchToDelete, force);
      if (success) {
        setShowDeleteDialog(false);
        setBranchToDelete(null);
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handleMergeBranch = async () => {
    if (!branchToMerge || !onMergeBranch) return;

    setIsOperating(true);
    try {
      const success = await onMergeBranch(branchToMerge);
      if (success) {
        setShowMergeDialog(false);
        setBranchToMerge(null);
      }
    } finally {
      setIsOperating(false);
    }
  };

  const confirmDelete = (branch: string) => {
    setBranchToDelete(branch);
    setShowDeleteDialog(true);
  };

  const confirmMerge = (branch: string) => {
    setBranchToMerge(branch);
    setShowMergeDialog(true);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span className="font-medium text-sm">{t('title')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('new')}
          </Button>
        </div>
      </div>

      {/* Current Branch Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span className="truncate">{currentBranch || t('noBranch')}</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <div className="p-2">
            <Input
              placeholder={t('searchBranches')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8"
            />
          </div>
          <DropdownMenuSeparator />
          <ScrollArea className="h-64">
            {filteredLocalBranches.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  {t('localBranches')}
                </div>
                {filteredLocalBranches.map((branch) => (
                  <DropdownMenuItem
                    key={branch.name}
                    onClick={() => handleCheckout(branch.name)}
                    disabled={branch.isCurrent || isOperating}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">{branch.name}</span>
                    {branch.isCurrent && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {filteredRemoteBranches.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Cloud className="h-3 w-3" />
                  {t('remoteBranches')}
                </div>
                {filteredRemoteBranches.map((branch) => (
                  <DropdownMenuItem
                    key={branch.name}
                    onClick={() => handleCheckout(branch.name)}
                    disabled={isOperating}
                    className="flex items-center gap-2"
                  >
                    <Cloud className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{branch.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Branch List */}
      <ScrollArea className="h-48">
        <div className="space-y-1">
          {localBranches.map((branch) => (
            <div
              key={branch.name}
              className={cn(
                'flex items-center justify-between p-2 rounded-md',
                branch.isCurrent ? 'bg-primary/10' : 'hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {branch.isCurrent ? (
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm truncate">{branch.name}</span>
                {branch.upstream && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    <Cloud className="h-3 w-3 mr-1" />
                    {branch.upstream}
                  </Badge>
                )}
              </div>
              {!branch.isCurrent && (
                <div className="flex items-center gap-1 shrink-0">
                  {onMergeBranch && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => confirmMerge(branch.name)}
                      title={t('merge')}
                    >
                      <GitMerge className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                    onClick={() => confirmDelete(branch.name)}
                    title={t('delete')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Create Branch Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createBranch')}</DialogTitle>
            <DialogDescription>{t('createBranchDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branchName">{t('branchName')}</Label>
              <Input
                id="branchName"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder={t('branchNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startPoint">{t('startPoint')}</Label>
              <Input
                id="startPoint"
                value={startPoint}
                onChange={(e) => setStartPoint(e.target.value)}
                placeholder={t('startPointPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">{t('startPointHint')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim() || isOperating}
            >
              {isOperating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Branch Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteBranch')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteBranchConfirm', { branch: branchToDelete || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteBranch(false)}
              className="bg-red-600 hover:bg-red-700"
            >
              {isOperating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge Branch Dialog */}
      <AlertDialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('mergeBranch')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('mergeBranchConfirm', { source: branchToMerge || '', target: currentBranch || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMergeBranch}>
              {isOperating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GitMerge className="h-4 w-4 mr-2" />
              )}
              {t('merge')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GitBranchManager;
