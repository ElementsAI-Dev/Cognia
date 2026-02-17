/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/providers/core', () => ({
  ErrorBoundaryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary-provider">{children}</div>
  ),
}));

jest.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-inset">{children}</div>
  ),
}));

jest.mock('@/components/layout/shell/app-shell', () => ({
  AppShell: ({
    children,
    sidebar,
  }: {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
  }) => (
    <div data-testid="app-shell">
      <div data-testid="app-shell-sidebar">{sidebar}</div>
      {children}
    </div>
  ),
}));

jest.mock('@/components/sidebar', () => ({
  AppSidebar: () => <div data-testid="app-sidebar" />,
}));

jest.mock('@/components/artifacts', () => ({
  ArtifactPanel: () => <div data-testid="artifact-panel" />,
}));

jest.mock('@/components/canvas', () => ({
  CanvasPanel: () => <div data-testid="canvas-panel" />,
}));

jest.mock('@/components/agent', () => ({
  BackgroundAgentPanel: () => <div data-testid="background-agent-panel" />,
  AgentTeamPanelSheet: () => <div data-testid="agent-team-panel-sheet" />,
}));

import ChatLayout from './layout';

describe('ChatLayout', () => {
  it('renders children and core layout wrappers', () => {
    render(
      <ChatLayout>
        <div data-testid="child">chat child</div>
      </ChatLayout>
    );

    expect(screen.getByTestId('error-boundary-provider')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-provider')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-inset')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('artifact-panel')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel')).toBeInTheDocument();
    expect(screen.getByTestId('background-agent-panel')).toBeInTheDocument();
    expect(screen.getByTestId('agent-team-panel-sheet')).toBeInTheDocument();
  });
});

