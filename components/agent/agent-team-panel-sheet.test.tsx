/**
 * AgentTeamPanelSheet component tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock store state
let mockIsPanelOpen = false;
let mockSelectedTeammateId: string | null = null;
const mockSetIsPanelOpen = jest.fn();
const mockSetSelectedTeammate = jest.fn();

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        isPanelOpen: mockIsPanelOpen,
        setIsPanelOpen: mockSetIsPanelOpen,
        selectedTeammateId: mockSelectedTeammateId,
        setSelectedTeammate: mockSetSelectedTeammate,
        teams: {},
        teammates: {},
        tasks: {},
        messages: {},
        templates: {},
        activeTeamId: null,
        displayMode: 'expanded',
        setActiveTeam: jest.fn(),
        setDisplayMode: jest.fn(),
      };
      return selector(state);
    },
    {
      getState: () => ({
        teams: {},
        teammates: {},
        tasks: {},
      }),
    }
  ),
}));

// Mock useAgentTeam hook
const mockCreateTeam = jest.fn(() => ({ id: 'new-team', name: 'New Team' }));
const mockCreateTeamFromTemplate = jest.fn(() => ({ id: 'tmpl-team', name: 'Template Team' }));
const mockExecuteTeam = jest.fn();
const mockCancelTeam = jest.fn();
const mockPauseTeam = jest.fn();
const mockResumeTeam = jest.fn();
const mockDeleteTeam = jest.fn();
const mockAddTeammate = jest.fn();

jest.mock('@/hooks/agent/use-agent-team', () => ({
  useAgentTeam: () => ({
    createTeam: mockCreateTeam,
    createTeamFromTemplate: mockCreateTeamFromTemplate,
    executeTeam: mockExecuteTeam,
    cancelTeam: mockCancelTeam,
    pauseTeam: mockPauseTeam,
    resumeTeam: mockResumeTeam,
    deleteTeam: mockDeleteTeam,
    addTeammate: mockAddTeammate,
  }),
}));

jest.mock('@/stores/chat', () => ({
  useChatStore: {
    getState: () => ({
      appendMessage: jest.fn(),
    }),
  },
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('nanoid', () => ({
  nanoid: () => 'mock-nano-id',
}));

// Mock child components to simplify testing
jest.mock('./agent-team-panel', () => ({
  AgentTeamPanel: ({ onCreateTeam }: { onCreateTeam?: () => void }) => (
    <div data-testid="agent-team-panel">
      <button data-testid="create-team-btn" onClick={onCreateTeam}>Create Team</button>
    </div>
  ),
}));

jest.mock('./agent-team-create-dialog', () => ({
  AgentTeamCreateDialog: ({ open }: { open: boolean }) => (
    open ? <div data-testid="create-dialog">Create Dialog</div> : null
  ),
}));

jest.mock('./agent-team-template-selector', () => ({
  AgentTeamTemplateSelector: ({
    open,
    onSelectTemplate,
  }: {
    open: boolean;
    onSelectTemplate: (t: unknown) => void;
  }) =>
    open ? (
      <div data-testid="template-selector">
        <button
          data-testid="select-custom"
          onClick={() => onSelectTemplate({ id: 'custom', name: 'Custom' })}
        >
          Custom
        </button>
        <button
          data-testid="select-template"
          onClick={() => onSelectTemplate({ id: 'research', name: 'Research Team', teammates: [] })}
        >
          Research
        </button>
      </div>
    ) : null,
}));

jest.mock('./agent-team-teammate-editor', () => ({
  AgentTeamTeammateEditor: ({ teammateId }: { teammateId: string }) => (
    <div data-testid="teammate-editor">Editing: {teammateId}</div>
  ),
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { AgentTeamPanelSheet } from './agent-team-panel-sheet';

describe('AgentTeamPanelSheet', () => {
  beforeEach(() => {
    mockIsPanelOpen = false;
    mockSelectedTeammateId = null;
    jest.clearAllMocks();
  });

  it('should render Sheet when panel is open', () => {
    mockIsPanelOpen = true;
    render(<AgentTeamPanelSheet />);
    expect(screen.getByTestId('agent-team-panel')).toBeInTheDocument();
  });

  it('should show template selector when create team is clicked', () => {
    mockIsPanelOpen = true;
    render(<AgentTeamPanelSheet />);

    fireEvent.click(screen.getByTestId('create-team-btn'));
    expect(screen.getByTestId('template-selector')).toBeInTheDocument();
  });

  it('should open create dialog when custom template selected', () => {
    mockIsPanelOpen = true;
    render(<AgentTeamPanelSheet />);

    fireEvent.click(screen.getByTestId('create-team-btn'));
    fireEvent.click(screen.getByTestId('select-custom'));
    expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
  });

  it('should open create dialog when template selected', () => {
    mockIsPanelOpen = true;
    render(<AgentTeamPanelSheet />);

    fireEvent.click(screen.getByTestId('create-team-btn'));
    fireEvent.click(screen.getByTestId('select-template'));
    expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
  });

  it('should render teammate editor when teammate is selected', () => {
    mockIsPanelOpen = true;
    mockSelectedTeammateId = 'tm-123';
    render(<AgentTeamPanelSheet />);
    expect(screen.getByTestId('teammate-editor')).toBeInTheDocument();
    expect(screen.getByText('Editing: tm-123')).toBeInTheDocument();
  });

  it('should not render teammate editor when no teammate selected', () => {
    mockIsPanelOpen = true;
    mockSelectedTeammateId = null;
    render(<AgentTeamPanelSheet />);
    expect(screen.queryByTestId('teammate-editor')).not.toBeInTheDocument();
  });
});
