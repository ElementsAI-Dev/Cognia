'use client';

/**
 * Main chat page - new chat with shadcn/ui sidebar
 */

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar';
import { ChatContainer } from '@/components/chat';

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ChatContainer />
      </SidebarInset>
    </SidebarProvider>
  );
}
