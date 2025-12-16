'use client';

/**
 * SessionList - displays list of chat sessions
 */

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
      <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground">
        {!collapsed && (
          <>
            <p>No conversations yet</p>
            <p className="mt-1 text-xs">Start a new chat to begin</p>
          </>
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
