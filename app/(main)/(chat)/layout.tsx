'use client';

/**
 * Chat layout — unified layout wrapping chat pages with sidebar and panels.
 *
 * Uses shadcn/ui SidebarProvider + AppSidebar (feature-rich sidebar) inside
 * AppShell (provides mobile swipe gestures, offline banner, network indicator,
 * mobile bottom nav).
 *
 * All chat route pages rendered as children inherit this layout.
 */

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppShell } from '@/components/layout/shell/app-shell';
import { AppSidebar } from '@/components/sidebar';
import { ArtifactPanel } from '@/components/artifacts';
import { CanvasPanel } from '@/components/canvas';
import { BackgroundAgentPanel, AgentTeamPanelSheet } from '@/components/agent';
import { ErrorBoundaryProvider } from '@/components/providers/core';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundaryProvider>
      <SidebarProvider>
        <AppShell sidebar={<AppSidebar />}>
          <SidebarInset>
            {children}
          </SidebarInset>
          <ArtifactPanel />
          <CanvasPanel />
          <BackgroundAgentPanel />
          <AgentTeamPanelSheet />
        </AppShell>
      </SidebarProvider>
    </ErrorBoundaryProvider>
  );
}
