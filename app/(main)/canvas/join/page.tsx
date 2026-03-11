'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useArtifactStore } from '@/stores';
import { crdtStore } from '@/lib/canvas/collaboration/crdt-store';

interface ParseResult {
  serialized: string | null;
  error: string | null;
}

function decodeSharedSession(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function parseSharedSession(serialized: string | null): ParseResult {
  if (!serialized) {
    return {
      serialized: null,
      error: 'Missing shared session payload.',
    };
  }

  try {
    JSON.parse(serialized);
    return { serialized, error: null };
  } catch {
    return {
      serialized: null,
      error: 'Invalid shared session payload.',
    };
  }
}

export default function CanvasJoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);
  const setActiveCanvas = useArtifactStore((state) => state.setActiveCanvas);
  const openPanel = useArtifactStore((state) => state.openPanel);

  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);
  const deferRuntimeError = useCallback((message: string) => {
    queueMicrotask(() => setRuntimeError(message));
  }, []);

  const sessionParam = searchParams.get('session');
  const decodedSession = useMemo(() => decodeSharedSession(sessionParam), [sessionParam]);
  const parsed = useMemo(() => parseSharedSession(decodedSession), [decodedSession]);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    if (!parsed.serialized) {
      deferRuntimeError(parsed.error || 'Missing shared session payload.');
      return;
    }

    const sessionId = crdtStore.deserializeState(parsed.serialized);
    if (!sessionId) {
      deferRuntimeError('Invalid shared session payload.');
      return;
    }

    const session = crdtStore.getSession(sessionId);
    const content = crdtStore.getDocumentContent(sessionId);

    if (!session || content === null) {
      deferRuntimeError('Unable to load shared Canvas session.');
      return;
    }

    const docId = createCanvasDocument({
      sessionId: `shared-${session.id}`,
      title: `Shared Canvas ${session.id.slice(0, 8)}`,
      content,
      language: 'markdown',
      type: 'text',
    });

    setActiveCanvas(docId);
    openPanel('canvas');
    router.replace('/');
  }, [
    createCanvasDocument,
    deferRuntimeError,
    openPanel,
    parsed.error,
    parsed.serialized,
    router,
    setActiveCanvas,
  ]);

  if (runtimeError) {
    return (
      <div className="h-[calc(100vh-var(--titlebar-height,0px))] flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="canvas-join-error">
          <AlertCircle className="h-4 w-4" />
          <span>{runtimeError}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--titlebar-height,0px))] flex items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="canvas-join-loading">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading shared Canvas session...</span>
      </div>
    </div>
  );
}
