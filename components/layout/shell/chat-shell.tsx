'use client';

/**
 * ChatShell — shared wrapper for all chat-facing routes.
 *
 * Composes ErrorBoundaryProvider, AppShell, SidebarProvider, AppSidebar,
 * SidebarInset, and global panels into a single reusable layout component.
 *
 * Used by both `app/(main)/page.tsx` and `app/(main)/(chat)/layout.tsx`
 * so that layout changes only need to happen in one place.
 */

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppShell } from '@/components/layout/shell/app-shell';
import { AppSidebar } from '@/components/sidebar';
import { ArtifactPanel } from '@/components/artifacts';
import { CanvasPanel } from '@/components/canvas';
import { BackgroundAgentPanel, AgentTeamPanelSheet } from '@/components/agent';
import { ErrorBoundaryProvider } from '@/components/providers/core';

interface ChatShellProps {
  children: React.ReactNode;
}

export function ChatShell({ children }: ChatShellProps) {
  return (
    <ErrorBoundaryProvider>
      <AppShell>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </AppShell>
      <ArtifactPanel />
      <CanvasPanel />
      <BackgroundAgentPanel />
      <AgentTeamPanelSheet />
    </ErrorBoundaryProvider>
  );
}
