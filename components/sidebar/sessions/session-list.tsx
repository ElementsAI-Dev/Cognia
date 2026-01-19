'use client';

/**
 * SessionList - displays list of chat sessions
 */

import { MessageSquare } from 'lucide-react';
import { useSessionStore } from '@/stores';
import { SessionItem } from './session-item';

interface SessionListProps {
  collapsed?: boolean;
}

export function SessionList({ collapsed = false }: SessionListProps) {
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center animate-in fade-in-0 duration-300">
        {!collapsed && (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-muted/50">
              <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Start a new chat to begin</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          isActive={session.id === activeSessionId}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}

export default SessionList;
