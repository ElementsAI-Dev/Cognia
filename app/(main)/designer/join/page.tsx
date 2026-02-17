'use client';

/**
 * Designer Join Page - imports a shared collaboration snapshot and opens Designer.
 */

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { DesignerShell } from '@/components/designer';

interface SharedSessionSnapshot {
  document?: {
    content?: string;
  };
}

function decodeSharedSession(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function getInitialCodeFromSnapshot(serialized: string | null): string {
  if (!serialized) return '';
  try {
    const parsed = JSON.parse(serialized) as SharedSessionSnapshot;
    return parsed.document?.content || '';
  } catch {
    return '';
  }
}

export default function DesignerJoinPage() {
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session');

  const serializedSession = useMemo(() => decodeSharedSession(sessionParam), [sessionParam]);
  const initialCode = useMemo(() => getInitialCodeFromSnapshot(serializedSession), [serializedSession]);

  if (!serializedSession) {
    return (
      <div className="h-[calc(100vh-var(--titlebar-height,0px))] flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>Missing shared session payload.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--titlebar-height,0px))]">
      <DesignerShell
        standalone
        initialCode={initialCode}
        sharedSessionSerialized={serializedSession}
        className="h-full"
      />
    </div>
  );
}
