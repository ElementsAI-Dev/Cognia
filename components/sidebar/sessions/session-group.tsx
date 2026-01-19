'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores';
import { SessionItem } from './session-item';
import type { Session } from '@/types';

export type GroupType = 'pinned' | 'today' | 'yesterday' | 'lastWeek' | 'older' | 'custom';

interface SessionGroupProps {
  title: string;
  type: GroupType;
  sessions: Session[];
  collapsed?: boolean;
  defaultOpen?: boolean;
  onSessionClick?: (session: Session) => void;
  className?: string;
}

export function SessionGroup({
  title,
  type: _type,
  sessions,
  collapsed,
  defaultOpen = true,
  onSessionClick: _onSessionClick,
  className,
}: SessionGroupProps) {
  const _t = useTranslations('sidebar');
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const deleteSession = useSessionStore((state) => state.deleteSession);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);

  const handleDeleteAll = useCallback(() => {
    sessions.forEach(session => {
      deleteSession(session.id);
    });
  }, [sessions, deleteSession]);

  if (sessions.length === 0) return null;

  if (collapsed) {
    return (
      <div className={cn("space-y-1", className)}>
        {sessions.slice(0, 3).map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            collapsed
          />
        ))}
        {sessions.length > 3 && (
          <div className="text-center text-xs text-muted-foreground py-1">
            +{sessions.length - 3}
          </div>
        )}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="flex items-center justify-between px-2 py-1.5 group">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 hover:bg-transparent gap-1 text-xs font-medium text-muted-foreground"
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {title}
            <span className="ml-1 text-muted-foreground/60">({sessions.length})</span>
          </Button>
        </CollapsibleTrigger>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive gap-2"
              onClick={handleDeleteAll}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CollapsibleContent className="space-y-0.5">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function useSessionGroups(sessions: Session[]) {
  return useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups: Record<GroupType, Session[]> = {
      pinned: [],
      today: [],
      yesterday: [],
      lastWeek: [],
      older: [],
      custom: [],
    };

    // Sort sessions by updatedAt descending
    const sorted = [...sessions].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    for (const session of sorted) {
      const updatedAt = new Date(session.updatedAt);

      if (session.pinned) {
        groups.pinned.push(session);
      } else if (updatedAt >= today) {
        groups.today.push(session);
      } else if (updatedAt >= yesterday) {
        groups.yesterday.push(session);
      } else if (updatedAt >= lastWeek) {
        groups.lastWeek.push(session);
      } else {
        groups.older.push(session);
      }
    }

    return groups;
  }, [sessions]);
}

export default SessionGroup;
