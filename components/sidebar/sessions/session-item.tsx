'use client';

/**
 * SessionItem - single session item in the sidebar
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare, MoreHorizontal, Pencil, Trash2, Copy, Link2, Check, Archive, Pin, PinOff } from 'lucide-react';
import { createDeepLink } from '@/lib/native/deep-link';
import { useNativeStore } from '@/stores';
import { Button } from '@/components/ui/button';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { useSessionStore } from '@/stores';
import { cn } from '@/lib/utils';
import type { Session } from '@/types';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  collapsed?: boolean;
}

export function SessionItem({ session, isActive, collapsed = false }: SessionItemProps) {
  const t = useTranslations('sidebar');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isDesktop = useNativeStore((state) => state.isDesktop);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const updateSession = useSessionStore((state) => state.updateSession);
  const deleteSession = useSessionStore((state) => state.deleteSession);
  const duplicateSession = useSessionStore((state) => state.duplicateSession);
  const togglePinSession = useSessionStore((state) => state.togglePinSession);
  const archiveSession = useSessionStore((state) => state.archiveSession);
  const unarchiveSession = useSessionStore((state) => state.unarchiveSession);

  const handleCopyLink = async () => {
    const deepLink = createDeepLink('chat/open', { id: session.id });
    await navigator.clipboard.writeText(deepLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleClick = () => {
    setActiveSession(session.id);
  };

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== session.title) {
      updateSession(session.id, { title: editTitle.trim() });
    } else {
      setEditTitle(session.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditTitle(session.title);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteSession(session.id);
    setShowDeleteConfirm(false);
  };

  const handleDuplicate = () => {
    duplicateSession(session.id);
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('w-full', isActive && 'bg-sidebar-accent text-sidebar-accent-foreground')}
            onClick={handleClick}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{session.title}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground'
      )}
    >
      <button
        className="flex flex-1 items-center gap-2 overflow-hidden text-left"
        onClick={handleClick}
      >
        <MessageSquare className="h-4 w-4 flex-shrink-0" />
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="h-6 px-1 py-0 text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate">{session.title}</span>
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('rename')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            {t('duplicate')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => togglePinSession(session.id)}>
            {session.pinned ? (
              <><PinOff className="mr-2 h-4 w-4" />{t('unpin') || 'Unpin'}</>
            ) : (
              <><Pin className="mr-2 h-4 w-4" />{t('pin') || 'Pin'}</>
            )}
          </DropdownMenuItem>
          {session.isArchived ? (
            <DropdownMenuItem onClick={() => unarchiveSession(session.id)}>
              <Archive className="mr-2 h-4 w-4" />
              {t('unarchive') || 'Unarchive'}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => archiveSession(session.id)}>
              <Archive className="mr-2 h-4 w-4" />
              {t('archive') || 'Archive'}
            </DropdownMenuItem>
          )}
          {isDesktop && (
            <DropdownMenuItem onClick={handleCopyLink}>
              {linkCopied ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              {linkCopied ? t('linkCopied') : t('copyLink')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteConfirmTitle') || 'Delete conversation?'}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteConfirmDescription', { title: session.title }) || `"${session.title}" and all its messages will be permanently deleted.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel') || 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

export default SessionItem;
