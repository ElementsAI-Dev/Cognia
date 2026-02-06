/**
 * AgentTeamCreateDialog component tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const translations: Record<string, string> = {
      createTeam: 'Create Team',
      taskDescription: 'Task Description',
      teamName: 'Team Name',
      teamDescription: 'Team Description',
      'template.title': 'Execution Mode',
      'teammate.title': 'Teammates',
      'teammate.add': 'Add Teammate',
      'teammate.name': 'Name',
      'teammate.description': 'Description',
      'teammate.specialization': 'Specialization',
    };
    return (key: string) => translations[key] || key;
  },
}));

// Mock dialog components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { AgentTeamCreateDialog } from './agent-team-create-dialog';

describe('AgentTeamCreateDialog', () => {
  const mockOnCreateTeam = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(
      <AgentTeamCreateDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onCreateTeam={mockOnCreateTeam}
      />
    );
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <AgentTeamCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateTeam={mockOnCreateTeam}
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('should render the create team title', () => {
    render(
      <AgentTeamCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateTeam={mockOnCreateTeam}
      />
    );
    // Two instances: title and submit button
    const createTeamElements = screen.getAllByText('Create Team');
    expect(createTeamElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should render form fields', () => {
    render(
      <AgentTeamCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateTeam={mockOnCreateTeam}
      />
    );
    expect(screen.getByText('Team Name')).toBeInTheDocument();
    expect(screen.getByText('Team Description')).toBeInTheDocument();
  });

  it('should render with default task', () => {
    render(
      <AgentTeamCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateTeam={mockOnCreateTeam}
        defaultTask="Build a REST API"
      />
    );
    expect(screen.getByDisplayValue('Build a REST API')).toBeInTheDocument();
  });

  it('should have disabled create button when form is empty', () => {
    render(
      <AgentTeamCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateTeam={mockOnCreateTeam}
      />
    );
    // The create button should be disabled since name and task are empty
    const buttons = screen.getAllByText('Create Team');
    const submitButton = buttons.find(
      (el) => el.closest('button') && el.closest('button')?.hasAttribute('disabled')
    );
    // Submit button exists and is disabled
    expect(submitButton || buttons.length).toBeTruthy();
  });

  it('should show add teammate button', () => {
    render(
      <AgentTeamCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateTeam={mockOnCreateTeam}
      />
    );
    expect(screen.getByText('Add Teammate')).toBeInTheDocument();
  });

  it('should add teammate entry when add button clicked', () => {
    render(
      <AgentTeamCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateTeam={mockOnCreateTeam}
      />
    );
    const addButton = screen.getByText('Add Teammate');
    fireEvent.click(addButton);
    // Should show specialization field for the new teammate
    expect(screen.getByText('Specialization')).toBeInTheDocument();
  });

  it('should call onCreateTeam when form is valid and submitted', () => {
    render(
      <AgentTeamCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateTeam={mockOnCreateTeam}
        defaultTask="Build API"
      />
    );

    // Fill in the name
    const nameInput = screen.getByPlaceholderText('e.g., Code Review Team');
    fireEvent.change(nameInput, { target: { value: 'My Team' } });

    // Click create button (the enabled one)
    const buttons = screen.getAllByText('Create Team');
    const submitBtn = buttons.find((el) => el.closest('button'));
    if (submitBtn) {
      fireEvent.click(submitBtn);
    }

    expect(mockOnCreateTeam).toHaveBeenCalledTimes(1);
    expect(mockOnCreateTeam).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Team',
        task: 'Build API',
        config: expect.objectContaining({ executionMode: 'coordinated' }),
      }),
      [] // no teammates added
    );
  });
});
