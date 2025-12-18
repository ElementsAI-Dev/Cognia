'use client';

/**
 * BranchSelector - UI for managing conversation branches
 */

import { useState } from 'react';
import {
  GitBranch,
  ChevronDown,
  Trash2,
  Pencil,
  Check,
  X,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
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
import { useSessionStore } from '@/stores';
import { cn } from '@/lib/utils';
import { messageRepository } from '@/lib/db';
import type { ConversationBranch } from '@/types';

interface BranchSelectorProps {
  sessionId: string;
  onBranchChange?: (branchId: string | null) => void;
  compact?: boolean;
}

export function BranchSelector({
  sessionId,
  onBranchChange,
  compact = false,
}: BranchSelectorProps) {
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<ConversationBranch | null>(null);

  const getBranches = useSessionStore((state) => state.getBranches);
  const getActiveBranchId = useSessionStore((state) => state.getActiveBranchId);
  const switchBranch = useSessionStore((state) => state.switchBranch);
  const deleteBranch = useSessionStore((state) => state.deleteBranch);
  const renameBranch = useSessionStore((state) => state.renameBranch);

  const branches = getBranches(sessionId);
  const activeBranchId = getActiveBranchId(sessionId);
  const activeBranch = branches.find((b) => b.id === activeBranchId);

  const handleSwitchBranch = (branchId: string | null) => {
    switchBranch(sessionId, branchId);
    onBranchChange?.(branchId);
  };

  const handleStartRename = (branch: ConversationBranch) => {
    setEditingBranchId(branch.id);
    setEditName(branch.name);
  };

  const handleSaveRename = (branchId: string) => {
    if (editName.trim()) {
      renameBranch(sessionId, branchId, editName.trim());
    }
    setEditingBranchId(null);
    setEditName('');
  };

  const handleCancelRename = () => {
    setEditingBranchId(null);
    setEditName('');
  };

  const handleDeleteBranch = async () => {
    if (branchToDelete) {
      // Delete all messages in this branch from the database
      try {
        await messageRepository.deleteByBranchId(sessionId, branchToDelete.id);
      } catch (err) {
        console.error('Failed to delete branch messages:', err);
      }
      // Delete the branch from session store
      deleteBranch(sessionId, branchToDelete.id);
      setBranchToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // If no branches, don't show the selector
  if (branches.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <GitBranch className="h-3.5 w-3.5" />
              {branches.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {branches.length}
                </Badge>
              )}
              <ChevronDown className="h-3 w-3" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-2">
              <GitBranch className="h-4 w-4" />
              <span className="truncate max-w-[120px]">
                {activeBranch?.name || 'Main'}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Conversation Branches
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Main branch */}
          <DropdownMenuItem
            onClick={() => handleSwitchBranch(null)}
            className={cn(!activeBranchId && 'bg-accent')}
          >
            <Home className="mr-2 h-4 w-4" />
            <span className="flex-1">Main</span>
            {!activeBranchId && (
              <Badge variant="default" className="text-xs">
                Active
              </Badge>
            )}
          </DropdownMenuItem>

          {/* Branch list */}
          {branches.map((branch) => (
            <div key={branch.id} className="relative">
              {editingBranchId === branch.id ? (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(branch.id);
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleSaveRename(branch.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleCancelRename}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <DropdownMenuItem
                  onClick={() => handleSwitchBranch(branch.id)}
                  className={cn(
                    'group',
                    activeBranchId === branch.id && 'bg-accent'
                  )}
                >
                  <GitBranch className="mr-2 h-4 w-4" />
                  <span className="flex-1 truncate">{branch.name}</span>
                  {activeBranchId === branch.id && (
                    <Badge variant="default" className="text-xs mr-1">
                      Active
                    </Badge>
                  )}
                  <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(branch);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBranchToDelete(branch);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              )}
            </div>
          ))}

          <DropdownMenuSeparator />
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Click &quot;Branch&quot; on a message to create a new branch
          </p>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{branchToDelete?.name}&quot;? This
              will delete all messages in this branch. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBranch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Branch button for individual messages
interface BranchButtonProps {
  sessionId: string;
  messageId: string;
  onBranchCreated?: (branchId: string) => void;
  onCopyMessages?: (branchPointMessageId: string, newBranchId: string) => Promise<unknown>;
}

export function BranchButton({
  sessionId,
  messageId,
  onBranchCreated,
  onCopyMessages,
}: BranchButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const createBranch = useSessionStore((state) => state.createBranch);

  const handleCreateBranch = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const branch = createBranch(sessionId, messageId);
      if (branch) {
        // Copy messages up to the branch point to the new branch
        if (onCopyMessages) {
          await onCopyMessages(messageId, branch.id);
        }
        onBranchCreated?.(branch.id);
      }
    } catch (err) {
      console.error('Failed to create branch:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 text-xs"
      onClick={handleCreateBranch}
      disabled={isCreating}
    >
      <GitBranch className="h-3.5 w-3.5" />
      {isCreating ? 'Creating...' : 'Branch'}
    </Button>
  );
}

export default BranchSelector;
