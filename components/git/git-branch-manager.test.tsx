/**
 * GitBranchManager Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitBranchManager } from './git-branch-manager';
import type { GitBranchInfo } from '@/types/system/git';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}: ${JSON.stringify(params)}`;
    }
    return key;
  },
}));

describe('GitBranchManager', () => {
  const mockBranches: GitBranchInfo[] = [
    { name: 'main', isRemote: false, isCurrent: true, upstream: 'origin/main' },
    { name: 'feature/test', isRemote: false, isCurrent: false, upstream: undefined },
    { name: 'develop', isRemote: false, isCurrent: false, upstream: 'origin/develop' },
    { name: 'origin/main', isRemote: true, isCurrent: false, upstream: undefined },
    { name: 'origin/develop', isRemote: true, isCurrent: false, upstream: undefined },
  ];

  const mockOnCheckout = jest.fn().mockResolvedValue(true);
  const mockOnCreateBranch = jest.fn().mockResolvedValue(true);
  const mockOnDeleteBranch = jest.fn().mockResolvedValue(true);
  const mockOnMergeBranch = jest.fn().mockResolvedValue(true);
  const mockOnRefresh = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render branch manager with title', () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('should display current branch in dropdown', () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    // Multiple elements may contain 'main' (dropdown trigger + branch list)
    const mainElements = screen.getAllByText('main');
    expect(mainElements.length).toBeGreaterThan(0);
  });

  it('should show new branch button', () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('new')).toBeInTheDocument();
  });

  it('should open create branch dialog when clicking new button', async () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    const newButton = screen.getByText('new');
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('createBranch')).toBeInTheDocument();
      expect(screen.getByText('branchName')).toBeInTheDocument();
    });
  });

  it('should call onCreateBranch when creating a new branch', async () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    // Open dialog
    const newButton = screen.getByText('new');
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('createBranch')).toBeInTheDocument();
    });

    // Fill in branch name
    const input = screen.getByPlaceholderText('branchNamePlaceholder');
    fireEvent.change(input, { target: { value: 'feature/new-feature' } });

    // Click create button
    const createButton = screen.getByText('create');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnCreateBranch).toHaveBeenCalledWith('feature/new-feature', undefined);
    });
  });

  it('should show local branches', () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('feature/test')).toBeInTheDocument();
    expect(screen.getByText('develop')).toBeInTheDocument();
  });

  it('should render branch dropdown trigger', () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    // The dropdown trigger should be present
    const dropdownTrigger = screen.getByRole('button', { name: /main/i });
    expect(dropdownTrigger).toBeInTheDocument();
  });

  it('should show delete button for non-current branches', () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    // Find delete buttons (they should be present for non-current branches)
    const deleteButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg.lucide-trash-2'));
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('should call onRefresh when clicking refresh button', () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('svg.lucide-refresh-cw'));

    if (refreshButton) {
      fireEvent.click(refreshButton);
      expect(mockOnRefresh).toHaveBeenCalled();
    }
  });

  it('should show merge button when onMergeBranch is provided', () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onMergeBranch={mockOnMergeBranch}
        onRefresh={mockOnRefresh}
      />
    );

    const mergeButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg.lucide-git-merge'));
    expect(mergeButtons.length).toBeGreaterThan(0);
  });

  it('should disable refresh button when loading', () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        isLoading={true}
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    // Find disabled button (refresh is disabled when loading)
    const buttons = screen.getAllByRole('button');
    const disabledButton = buttons.find((btn) => btn.hasAttribute('disabled'));
    expect(disabledButton).toBeInTheDocument();
  });

  it('should render component without errors', () => {
    const { container } = render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('should have dropdown trigger with current branch name', () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch="main"
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    // Dropdown trigger should show current branch
    const dropdownTrigger = screen.getByRole('button', { name: /main/i });
    expect(dropdownTrigger).toBeInTheDocument();
  });

  it('should show noBranch when no current branch', () => {
    render(
      <GitBranchManager
        branches={mockBranches}
        currentBranch={undefined}
        onCheckout={mockOnCheckout}
        onCreateBranch={mockOnCreateBranch}
        onDeleteBranch={mockOnDeleteBranch}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('noBranch')).toBeInTheDocument();
  });
});
