'use client';

/**
 * Chat layout - wraps chat pages with sidebar and panels
 */

import { AppShell } from '@/components/layout/shell/app-shell';
import { SidebarContainer } from '@/components/sidebar';
import { ArtifactPanel } from '@/components/artifacts';
import { CanvasPanel } from '@/components/canvas';
import { BackgroundAgentPanel, AgentTeamPanelSheet } from '@/components/agent';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell sidebar={<SidebarContainer />}>
      {children}
      <ArtifactPanel />
      <CanvasPanel />
      <BackgroundAgentPanel />
      <AgentTeamPanelSheet />
    </AppShell>
  );
}
