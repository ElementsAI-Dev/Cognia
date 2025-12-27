'use client';

/**
 * Main chat page - new chat with shadcn/ui sidebar
 */

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar';
import { ChatContainer } from '@/components/chat';
import { ArtifactPanel } from '@/components/artifacts';
import { CanvasPanel } from '@/components/canvas';
import { BackgroundAgentPanel } from '@/components/agent';

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ChatContainer />
      </SidebarInset>
      <ArtifactPanel />
      <CanvasPanel />
      <BackgroundAgentPanel />
    </SidebarProvider>
  );
}
