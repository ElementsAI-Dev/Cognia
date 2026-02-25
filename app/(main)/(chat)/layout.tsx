'use client';

/**
 * Chat layout — unified layout wrapping chat pages with sidebar and panels.
 *
 * Delegates to ChatShell which composes SidebarProvider, AppShell, AppSidebar,
 * panels, and error boundary into a single reusable component.
 *
 * @see components/layout/shell/chat-shell.tsx
 */

import { ChatShell } from '@/components/layout/shell/chat-shell';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChatShell>{children}</ChatShell>;
}
