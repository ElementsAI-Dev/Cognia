'use client';

/**
 * SessionItem - single session item in the sidebar
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare, MoreHorizontal, Pencil, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const updateSession = useSessionStore((state) => state.updateSession);
  const deleteSession = useSessionStore((state) => state.deleteSession);
  const duplicateSession = useSessionStore((state) => state.duplicateSession);

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
    deleteSession(session.id);
  };

  const handleDuplicate = () => {
    duplicateSession(session.id);
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? 'secondary' : 'ghost'}
            size="icon"
            className="w-full"
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
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
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
  );
}

export default SessionItem;
