'use client';

/**
 * Main chat page - new chat
 */

import { ChatContainer } from '@/components/chat';
import { ErrorBoundaryProvider } from '@/components/providers/core';

export default function ChatPage() {
  return (
    <ErrorBoundaryProvider>
      <ChatContainer />
    </ErrorBoundaryProvider>
  );
}
