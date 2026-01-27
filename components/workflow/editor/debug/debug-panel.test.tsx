'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { DebugPanel } from './debug-panel';

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn(() => ({
    currentWorkflow: {
      nodes: [
        { id: 'node-1', data: { label: 'Start Node' } },
        { id: 'node-2', data: { label: 'AI Node' } },
      ],
    },
    isExecuting: false,
    executionState: null,
    startExecution: jest.fn(),
    pauseExecution: jest.fn(),
    resumeExecution: jest.fn(),
    cancelExecution: jest.fn(),
    updateNode: jest.fn(),
  })),
}));

const messages = {
  workflowEditor: {
    debug: 'Debug',
    debugMode: 'Debug Mode',
    startDebug: 'Start Debug',
    continue: 'Continue',
    pause: 'Pause',
    stop: 'Stop',
    stepInto: 'Step Into',
    stepOver: 'Step Over',
    breakpoints: 'Breakpoints',
    watch: 'Watch',
    callStack: 'Call Stack',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('DebugPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders debug header', () => {
    renderWithProviders(<DebugPanel />);
    expect(screen.getByText('Debug')).toBeInTheDocument();
  });

  it('renders debug mode switch', () => {
    renderWithProviders(<DebugPanel />);
    expect(screen.getByText('Debug Mode')).toBeInTheDocument();
  });

  it('renders breakpoints section', () => {
    renderWithProviders(<DebugPanel />);
    expect(screen.getByText('Breakpoints')).toBeInTheDocument();
  });

  it('renders watch section', () => {
    renderWithProviders(<DebugPanel />);
    expect(screen.getByText('Watch')).toBeInTheDocument();
  });

  it('renders call stack section', () => {
    renderWithProviders(<DebugPanel />);
    expect(screen.getByText('Call Stack')).toBeInTheDocument();
  });

  it('shows empty breakpoints message', () => {
    renderWithProviders(<DebugPanel />);
    expect(screen.getByText('Click on a node to set a breakpoint')).toBeInTheDocument();
  });

  it('shows empty watch message', () => {
    renderWithProviders(<DebugPanel />);
    expect(screen.getByText('Add expressions to watch their values')).toBeInTheDocument();
  });

  it('shows no active execution message', () => {
    renderWithProviders(<DebugPanel />);
    expect(screen.getByText('No active execution')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(<DebugPanel className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
