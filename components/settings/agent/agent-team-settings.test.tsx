/**
 * AgentTeamSettings component tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const translations: Record<string, Record<string, string>> = {
      agentTeamSettings: {
        title: 'Agent Teams',
        description: 'Configure multi-agent team coordination',
        executionMode: 'Default Execution Mode',
        executionModeDesc: 'How teammates collaborate',
        modeCoordinate: 'Coordinated',
        modeAutonomous: 'Autonomous',
        modeDelegate: 'Delegate',
        maxTeammates: 'Max Teammates',
        maxTeammatesDesc: 'Maximum teammates per team',
        maxConcurrent: 'Max Concurrent',
        maxConcurrentDesc: 'Maximum concurrent teammates',
        defaultTimeout: 'Teammate Timeout',
        defaultTimeoutDesc: 'Timeout per teammate',
        maxSteps: 'Max Steps',
        maxStepsDesc: 'Max steps per teammate',
        autoApprovePlans: 'Auto-approve Plans',
        autoApprovePlansDesc: 'Auto-approve without review',
        enableMessaging: 'Inter-agent Messaging',
        enableMessagingDesc: 'Allow inter-agent messages',
        contextIsolation: 'Auto Shutdown',
        contextIsolationDesc: 'Auto shut down teammates',
        templates: 'Team Templates',
        templatesDesc: 'Pre-configured templates',
        viewTemplates: 'View Templates',
        builtInTemplates: 'Built-in Templates',
        customTemplates: 'Custom Templates',
        builtInProtected: 'Built-in protected',
        noTemplates: 'No templates',
        teamsOverview: 'Teams Overview',
        teamsOverviewDesc: 'View teams',
        viewTeams: 'View Teams',
        active: 'active',
        total: 'total',
        noTeamsYet: 'No teams yet',
        cleanupCompleted: 'Cleanup Completed',
        cleanupTitle: 'Cleanup?',
        cleanupDesc: 'Remove completed teams',
        cleanupConfirm: 'Cleanup All',
        dangerZone: 'Danger Zone',
        resetAll: 'Reset Agent Teams',
        resetAllDesc: 'Clear all data',
        resetButton: 'Reset',
        resetTitle: 'Reset?',
        resetDesc: 'This will clear everything',
        deleteTemplateTitle: 'Delete Template?',
        deleteTemplateDesc: 'Permanently delete template',
      },
      common: {
        cancel: 'Cancel',
        delete: 'Delete',
      },
    };
    return (key: string) => translations[namespace]?.[key] || key;
  },
}));

// Mock the store
const mockUpdateDefaultConfig = jest.fn();
const mockDeleteTemplate = jest.fn();
const mockCleanupTeam = jest.fn();
const mockReset = jest.fn();

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      defaultConfig: {
        maxTeammates: 10,
        maxConcurrentTeammates: 5,
        executionMode: 'coordinated',
        displayMode: 'expanded',
        defaultTimeout: 300000,
        defaultMaxSteps: 15,
        requirePlanApproval: false,
        enableMessaging: true,
        autoShutdown: true,
      },
      teams: {},
      templates: {
        'code-review': {
          id: 'code-review',
          name: 'Code Review Team',
          description: 'Multi-perspective code review',
          category: 'review',
          teammates: [],
          isBuiltIn: true,
          icon: 'ShieldCheck',
        },
      },
      updateDefaultConfig: mockUpdateDefaultConfig,
      deleteTemplate: mockDeleteTemplate,
      cleanupTeam: mockCleanupTeam,
      reset: mockReset,
    };
    return selector(state);
  },
}));

// Mock alert-dialog to simplify testing
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import { AgentTeamSettings } from './agent-team-settings';

describe('AgentTeamSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the title and description', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('Agent Teams')).toBeInTheDocument();
    expect(screen.getByText('Configure multi-agent team coordination')).toBeInTheDocument();
  });

  it('should render execution mode selector', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('Default Execution Mode')).toBeInTheDocument();
  });

  it('should render max teammates slider', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('Max Teammates')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should render max concurrent slider', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('Max Concurrent')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render timeout input', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('Teammate Timeout')).toBeInTheDocument();
  });

  it('should render max steps input', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('Max Steps')).toBeInTheDocument();
  });

  it('should render messaging toggle', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('Inter-agent Messaging')).toBeInTheDocument();
  });

  it('should render auto-approve toggle', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('Auto-approve Plans')).toBeInTheDocument();
  });

  it('should render templates section', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('Team Templates')).toBeInTheDocument();
  });

  it('should render teams overview section', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('Teams Overview')).toBeInTheDocument();
  });

  it('should render no teams message when empty', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('No teams yet')).toBeInTheDocument();
  });

  it('should render danger zone with reset button', () => {
    render(<AgentTeamSettings />);
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('should open reset dialog when reset clicked', () => {
    render(<AgentTeamSettings />);
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    expect(screen.getByText('Reset?')).toBeInTheDocument();
  });
});
