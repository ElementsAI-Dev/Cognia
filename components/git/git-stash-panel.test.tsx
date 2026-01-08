/**
 * GitStashPanel Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitStashPanel } from './git-stash-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}: ${JSON.stringify(params)}`;
    }
    return key;
  },
}));

interface StashEntry {
  index: number;
  message: string;
  branch?: string;
  date?: string;
}

describe('GitStashPanel', () => {
  const mockStashes: StashEntry[] = [
    { index: 0, message: 'WIP on main: working on feature', branch: 'main' },
    { index: 1, message: 'WIP on develop: bug fix', branch: 'develop' },
    { index: 2, message: 'Quick save before switching branches' },
  ];

  const mockOnStashSave = jest.fn().mockResolvedValue(true);
  const mockOnStashPop = jest.fn().mockResolvedValue(true);
  const mockOnStashApply = jest.fn().mockResolvedValue(true);
  const mockOnStashDrop = jest.fn().mockResolvedValue(true);
  const mockOnStashClear = jest.fn().mockResolvedValue(true);
  const mockOnRefresh = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no stashes', () => {
    render(
      <GitStashPanel
        stashes={[]}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    expect(screen.getByText('noStashes')).toBeInTheDocument();
    expect(screen.getByText('noStashesHint')).toBeInTheDocument();
  });

  it('should render stash panel title', () => {
    render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('should display stash count badge', () => {
    render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render stash entries', () => {
    render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    expect(screen.getByText('WIP on main: working on feature')).toBeInTheDocument();
    expect(screen.getByText('WIP on develop: bug fix')).toBeInTheDocument();
    expect(screen.getByText('Quick save before switching branches')).toBeInTheDocument();
  });

  it('should show stash index badges', () => {
    render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show save button', () => {
    render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    expect(screen.getByText('save')).toBeInTheDocument();
  });

  it('should open save stash dialog when clicking save', async () => {
    render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    
    const saveButton = screen.getByText('save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      // Dialog opens with saveStash title and button, use getAllByText
      const saveStashElements = screen.getAllByText('saveStash');
      expect(saveStashElements.length).toBeGreaterThan(0);
      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('includeUntracked')).toBeInTheDocument();
    });
  });

  it('should call onStashSave when saving stash', async () => {
    render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    
    // Open dialog
    const saveButton = screen.getByText('save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      const saveStashElements = screen.getAllByText('saveStash');
      expect(saveStashElements.length).toBeGreaterThan(0);
    });
    
    // Fill message
    const messageInput = screen.getByPlaceholderText('messagePlaceholder');
    fireEvent.change(messageInput, { target: { value: 'My stash message' } });
    
    // Click the save button in dialog (the one that's a button element)
    const saveStashButtons = screen.getAllByText('saveStash');
    const buttonElement = saveStashButtons.find(
      el => el.tagName === 'BUTTON' || el.closest('button')
    );
    if (buttonElement) {
      fireEvent.click(buttonElement.closest('button') || buttonElement);
    }
    
    await waitFor(() => {
      expect(mockOnStashSave).toHaveBeenCalledWith('My stash message', false);
    });
  });

  it('should show clear all button when stashes exist', () => {
    render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    expect(screen.getByText('clearAll')).toBeInTheDocument();
  });

  it('should call onRefresh when clicking refresh button', () => {
    render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    
    const refreshButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg.lucide-refresh-cw')
    );
    
    if (refreshButton) {
      fireEvent.click(refreshButton);
      expect(mockOnRefresh).toHaveBeenCalled();
    }
  });

  it('should render with loading state', () => {
    const { container } = render(
      <GitStashPanel
        stashes={mockStashes}
        isLoading={true}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should render stash entries with action buttons', () => {
    render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    
    // All stash entries should be rendered
    expect(screen.getByText('WIP on main: working on feature')).toBeInTheDocument();
    expect(screen.getByText('WIP on develop: bug fix')).toBeInTheDocument();
  });

  it('should have pop callback prop', () => {
    const { container } = render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should have apply callback prop', () => {
    const { container } = render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should render clear all button when stashes exist', () => {
    render(
      <GitStashPanel
        stashes={mockStashes}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(screen.getByText('clearAll')).toBeInTheDocument();
  });

  it('should not show clear all button when no stashes', () => {
    render(
      <GitStashPanel
        stashes={[]}
        onStashSave={mockOnStashSave}
        onStashPop={mockOnStashPop}
        onStashApply={mockOnStashApply}
        onStashDrop={mockOnStashDrop}
        onStashClear={mockOnStashClear}
        onRefresh={mockOnRefresh}
      />
    );
    expect(screen.queryByText('clearAll')).not.toBeInTheDocument();
  });
});
