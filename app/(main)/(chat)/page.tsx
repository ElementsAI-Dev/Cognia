'use client';

/**
 * Main chat page — renders the central ChatContainer.
 * Layout (sidebar, panels, error boundary) is provided by the parent ChatLayout.
 */

import { ChatContainer } from '@/components/chat';

export default function ChatPage() {
  return <ChatContainer />;
}
