import { useState, useEffect, useCallback, useRef } from 'react';
import { messageRepository } from '@/lib/db';
import type { UIMessage } from '@/types';

/**
 * Shared hook for loading messages in export dialogs.
 * Encapsulates the common pattern of loading messages when a dialog opens.
 */
export function useExportMessages(sessionId: string, open: boolean) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!open || loadedRef.current) return;

    let cancelled = false;
    loadedRef.current = true;

    const load = async () => {
      try {
        const msgs = await messageRepository.getBySessionId(sessionId);
        if (!cancelled) {
          setMessages(msgs);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    load();

    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  useEffect(() => {
    if (!open) {
      loadedRef.current = false;
    }
  }, [open]);

  const reload = useCallback(() => {
    setIsLoading(true);
    messageRepository
      .getBySessionId(sessionId)
      .then(setMessages)
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  return { messages, isLoading, reload };
}
