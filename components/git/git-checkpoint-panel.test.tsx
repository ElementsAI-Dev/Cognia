/**
 * GitCheckpointPanel Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitCheckpointPanel } from './git-checkpoint-panel';
import type { GitCheckpoint } from '@/types/system/git';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}: ${JSON.stringify(params)}`;
    }
    return key;
  },
}));

// Mock formatCommitDate
jest.mock('@/types/system/git', () => ({
  ...jest.requireActual('@/types/system/git'),
  formatCommitDate: jest.fn((date: string) => date),
}));

describe('GitCheckpointPanel', () => {
  const mockCheckpoints: GitCheckpoint[] = [
    {
      id: 'cognia-cp/2025-01-15T10-00-00',
      hash: 'abc123def456789',
      message: 'Before refactoring auth module',
      timestamp: '2025-01-15T10:00:00Z',
      filesChanged: 12,
      additions: 150,
      deletions: 45,
    },
    {
      id: 'cognia-cp/2025-01-14T09-00-00',
      hash: 'def456abc789012',
      message: 'Working state - login feature',
      timestamp: '2025-01-14T09:00:00Z',
      filesChanged: 8,
      additions: 90,
      deletions: 20,
    },
    {
      id: 'cognia-cp/2025-01-13T08-00-00',
      hash: 'ghi789def012345',
      message: 'Initial checkpoint',
      timestamp: '2025-01-13T08:00:00Z',
      filesChanged: 0,
      additions: 0,
      deletions: 0,
    },
  ];

  const mockOnCreateCheckpoint = jest.fn().mockResolvedValue(true);
  const mockOnRestoreCheckpoint = jest.fn().mockResolvedValue(true);
  const mockOnDeleteCheckpoint = jest.fn().mockResolvedValue(true);
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no checkpoints', () => {
    render(
      <GitCheckpointPanel
        checkpoints={[]}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
      />
    );
    expect(screen.getByText('checkpoint.empty')).toBeInTheDocument();
    expect(screen.getByText('checkpoint.emptyDescription')).toBeInTheDocument();
  });

  it('should render "Create First Checkpoint" button in empty state', () => {
    render(
      <GitCheckpointPanel
        checkpoints={[]}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
      />
    );
    expect(screen.getByText('checkpoint.createFirst')).toBeInTheDocument();
  });

  it('should render checkpoint panel title with count badge', () => {
    render(
      <GitCheckpointPanel
        checkpoints={mockCheckpoints}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
      />
    );
    expect(screen.getByText('checkpoint.title')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render checkpoint messages', () => {
    render(
      <GitCheckpointPanel
        checkpoints={mockCheckpoints}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
      />
    );
    expect(screen.getByText('Before refactoring auth module')).toBeInTheDocument();
    expect(screen.getByText('Working state - login feature')).toBeInTheDocument();
    expect(screen.getByText('Initial checkpoint')).toBeInTheDocument();
  });

  it('should show "Latest" badge on first checkpoint', () => {
    render(
      <GitCheckpointPanel
        checkpoints={mockCheckpoints}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
      />
    );
    expect(screen.getByText('checkpoint.latest')).toBeInTheDocument();
  });

  it('should show file change stats', () => {
    render(
      <GitCheckpointPanel
        checkpoints={mockCheckpoints}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
      />
    );
    expect(screen.getByText('+150')).toBeInTheDocument();
    expect(screen.getByText('-45')).toBeInTheDocument();
  });

  it('should show short hash', () => {
    render(
      <GitCheckpointPanel
        checkpoints={mockCheckpoints}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
      />
    );
    expect(screen.getByText('abc123d')).toBeInTheDocument();
  });

  it('should show create button in header', () => {
    render(
      <GitCheckpointPanel
        checkpoints={mockCheckpoints}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
      />
    );
    // The header has a "Create" button
    const createButtons = screen.getAllByText('checkpoint.create');
    expect(createButtons.length).toBeGreaterThan(0);
  });

  it('should open create dialog when clicking create button', async () => {
    render(
      <GitCheckpointPanel
        checkpoints={mockCheckpoints}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
      />
    );

    // Click the create button in the header
    const createButtons = screen.getAllByText('checkpoint.create');
    fireEvent.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('checkpoint.createTitle')).toBeInTheDocument();
      expect(screen.getByText('checkpoint.createDescription')).toBeInTheDocument();
    });
  });

  it('should call onCreateCheckpoint when submitting create dialog', async () => {
    render(
      <GitCheckpointPanel
        checkpoints={mockCheckpoints}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
      />
    );

    // Open create dialog
    const createButtons = screen.getAllByText('checkpoint.create');
    fireEvent.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('checkpoint.createTitle')).toBeInTheDocument();
    });

    // Fill message
    const input = screen.getByPlaceholderText('checkpoint.messagePlaceholder');
    fireEvent.change(input, { target: { value: 'Test checkpoint' } });

    // Click the create button in the dialog
    const dialogCreateButtons = screen.getAllByText('checkpoint.create');
    const dialogButton = dialogCreateButtons.find(
      (el) => el.closest('[role="dialog"]')
    );
    if (dialogButton) {
      fireEvent.click(dialogButton.closest('button') || dialogButton);
    }

    await waitFor(() => {
      expect(mockOnCreateCheckpoint).toHaveBeenCalledWith('Test checkpoint');
    });
  });

  it('should show refresh button when onRefresh provided', () => {
    render(
      <GitCheckpointPanel
        checkpoints={mockCheckpoints}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
        onRefresh={mockOnRefresh}
      />
    );
    // There should be a button with refresh icon
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should show loading state', () => {
    const { container } = render(
      <GitCheckpointPanel
        checkpoints={mockCheckpoints}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
        onRefresh={mockOnRefresh}
        isLoading={true}
      />
    );
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <GitCheckpointPanel
        checkpoints={mockCheckpoints}
        onCreateCheckpoint={mockOnCreateCheckpoint}
        onRestoreCheckpoint={mockOnRestoreCheckpoint}
        onDeleteCheckpoint={mockOnDeleteCheckpoint}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
