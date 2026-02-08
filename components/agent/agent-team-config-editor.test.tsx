/**
 * AgentTeamConfigEditor component tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock store data and actions
let mockTeams: Record<string, unknown> = {};
const mockUpdateTeamConfig = jest.fn();
const mockSaveAsTemplate = jest.fn();

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      teams: mockTeams,
      updateTeamConfig: mockUpdateTeamConfig,
      saveAsTemplate: mockSaveAsTemplate,
    };
    return selector(state);
  },
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'configEditor.title': 'Team Configuration',
      'configEditor.readOnly': 'read-only during execution',
      'configEditor.executionMode': 'Execution Mode',
      'configEditor.coordinated': 'Coordinated',
      'configEditor.autonomous': 'Autonomous',
      'configEditor.delegate': 'Delegate',
      'configEditor.coordinatedDesc': 'Lead assigns tasks to specific teammates',
      'configEditor.autonomousDesc': 'Teammates self-claim available tasks',
      'configEditor.delegateDesc': 'Lead delegates, never implements itself',
      'configEditor.maxConcurrent': 'Max Concurrent Teammates',
      'configEditor.tokenBudget': 'Token Budget',
      'configEditor.tokenBudgetDesc': '0 = unlimited. Team stops when budget is exceeded.',
      'configEditor.planApproval': 'Require Plan Approval',
      'configEditor.planApprovalDesc': 'Lead reviews teammate plans before execution',
      'configEditor.messaging': 'Enable Messaging',
      'configEditor.messagingDesc': 'Teammates share results via messages',
      'configEditor.taskRetry': 'Enable Task Retry',
      'configEditor.taskRetryDesc': 'Failed tasks are automatically retried',
      'configEditor.maxRetries': 'Max Retries',
      'templateManage.saveAsTemplate': 'Save as Template',
      'templateManage.templateName': 'Template name...',
      'templateManage.templateSaved': 'Template saved',
      'cancel': 'Cancel',
    };
    return translations[key] || key;
  },
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: { success: jest.fn() },
}));

import { AgentTeamConfigEditor } from './agent-team-config-editor';

function makeTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    name: 'Test Team',
    status: 'idle',
    config: {
      executionMode: 'coordinated',
      maxConcurrentTeammates: 3,
      tokenBudget: 0,
      requirePlanApproval: false,
      enableMessaging: true,
      enableTaskRetry: false,
      maxRetries: 1,
    },
    ...overrides,
  };
}

describe('AgentTeamConfigEditor', () => {
  beforeEach(() => {
    mockTeams = {};
    mockUpdateTeamConfig.mockClear();
    mockSaveAsTemplate.mockClear();
  });

  it('should return null when team does not exist', () => {
    const { container } = render(<AgentTeamConfigEditor teamId="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the config header', () => {
    mockTeams = { t1: makeTeam() };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.getByText('Team Configuration')).toBeInTheDocument();
  });

  it('should show read-only notice when team is executing', () => {
    mockTeams = { t1: makeTeam({ status: 'executing' }) };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.getByText('(read-only during execution)')).toBeInTheDocument();
  });

  it('should not show read-only notice when team is idle', () => {
    mockTeams = { t1: makeTeam({ status: 'idle' }) };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.queryByText('(read-only during execution)')).not.toBeInTheDocument();
  });

  it('should render execution mode label', () => {
    mockTeams = { t1: makeTeam() };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.getByText('Execution Mode')).toBeInTheDocument();
  });

  it('should show coordinated description for coordinated mode', () => {
    mockTeams = { t1: makeTeam() };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.getByText('Lead assigns tasks to specific teammates')).toBeInTheDocument();
  });

  it('should render toggle labels', () => {
    mockTeams = { t1: makeTeam() };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.getByText('Require Plan Approval')).toBeInTheDocument();
    expect(screen.getByText('Enable Messaging')).toBeInTheDocument();
    expect(screen.getByText('Enable Task Retry')).toBeInTheDocument();
  });

  it('should render Max Concurrent Teammates input', () => {
    mockTeams = { t1: makeTeam() };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.getByText('Max Concurrent Teammates')).toBeInTheDocument();
  });

  it('should render Token Budget input', () => {
    mockTeams = { t1: makeTeam() };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.getByText('Token Budget')).toBeInTheDocument();
    expect(screen.getByText('0 = unlimited. Team stops when budget is exceeded.')).toBeInTheDocument();
  });

  it('should render Save as Template button', () => {
    mockTeams = { t1: makeTeam() };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.getByText('Save as Template')).toBeInTheDocument();
  });

  it('should show template name input when Save as Template is clicked', () => {
    mockTeams = { t1: makeTeam() };
    render(<AgentTeamConfigEditor teamId="t1" />);
    fireEvent.click(screen.getByText('Save as Template'));
    expect(screen.getByPlaceholderText('Template name...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should hide template input on cancel', () => {
    mockTeams = { t1: makeTeam() };
    render(<AgentTeamConfigEditor teamId="t1" />);
    fireEvent.click(screen.getByText('Save as Template'));
    expect(screen.getByPlaceholderText('Template name...')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Template name...')).not.toBeInTheDocument();
  });

  it('should not show Max Retries when task retry is disabled', () => {
    mockTeams = { t1: makeTeam() };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.queryByText('Max Retries')).not.toBeInTheDocument();
  });

  it('should show Max Retries when task retry is enabled', () => {
    mockTeams = {
      t1: makeTeam({
        config: {
          executionMode: 'coordinated',
          maxConcurrentTeammates: 3,
          tokenBudget: 0,
          requirePlanApproval: false,
          enableMessaging: true,
          enableTaskRetry: true,
          maxRetries: 2,
        },
      }),
    };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.getByText('Max Retries')).toBeInTheDocument();
  });

  it('should also be editable when team is paused', () => {
    mockTeams = { t1: makeTeam({ status: 'paused' }) };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.queryByText('(read-only during execution)')).not.toBeInTheDocument();
  });

  it('should show read-only for completed teams', () => {
    mockTeams = { t1: makeTeam({ status: 'completed' }) };
    render(<AgentTeamConfigEditor teamId="t1" />);
    expect(screen.getByText('(read-only during execution)')).toBeInTheDocument();
  });
});
