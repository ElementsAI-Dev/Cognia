'use client';

/**
 * Root page — renders ChatContainer with the full chat layout.
 *
 * Both this page and (chat)/page.tsx map to `/`, but Next.js resolves the
 * direct page.tsx first, bypassing the (chat) layout. We therefore use
 * ChatShell here to get the same sidebar, panels, and error boundary.
 *
 * @see components/layout/shell/chat-shell.tsx — Shared layout component
 * @see app/(main)/(chat)/layout.tsx           — Chat route layout (same shell)
 */

import { ChatShell } from '@/components/layout/shell/chat-shell';
import { ChatContainer } from '@/components/chat';

export default function Home() {
  return (
    <ChatShell>
      <ChatContainer />
    </ChatShell>
  );
}
