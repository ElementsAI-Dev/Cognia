/**
 * GitTagPanel Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitTagPanel } from './git-tag-panel';
import type { GitTag } from '@/types/system/git';

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

describe('GitTagPanel', () => {
  const mockTags: GitTag[] = [
    {
      name: 'v2.0.0',
      commitHash: 'abc123def456789012345678901234567890abcd',
      shortHash: 'abc123d',
      message: 'Release 2.0.0 - Major update',
      tagger: 'Alice <alice@example.com>',
      date: '2025-01-15T10:00:00Z',
      isAnnotated: true,
    },
    {
      name: 'v1.1.0',
      commitHash: 'def456abc789012345678901234567890abcdef01',
      shortHash: 'def456a',
      message: 'Release 1.1.0',
      tagger: 'Bob <bob@example.com>',
      date: '2025-01-10T09:00:00Z',
      isAnnotated: true,
    },
    {
      name: 'v1.0.0',
      commitHash: 'ghi789def012345678901234567890abcdef0123',
      shortHash: 'ghi789d',
      message: '',
      tagger: '',
      date: '2025-01-05T08:00:00Z',
      isAnnotated: false,
    },
  ];

  const mockOnCreateTag = jest.fn().mockResolvedValue(true);
  const mockOnDeleteTag = jest.fn().mockResolvedValue(true);
  const mockOnPushTag = jest.fn().mockResolvedValue(true);
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no tags', () => {
    render(
      <GitTagPanel
        tags={[]}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    expect(screen.getByText('tags.empty')).toBeInTheDocument();
  });

  it('should render title and tag count', () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    expect(screen.getByText('tags.title')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render tag names', () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    expect(screen.getByText('v2.0.0')).toBeInTheDocument();
    expect(screen.getByText('v1.1.0')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });

  it('should render annotated badge for annotated tags', () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    const annotatedBadges = screen.getAllByText('tags.annotated');
    expect(annotatedBadges.length).toBe(2);
  });

  it('should render lightweight badge for lightweight tags', () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    expect(screen.getByText('tags.lightweight')).toBeInTheDocument();
  });

  it('should render short hash for tags', () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    expect(screen.getByText('abc123d')).toBeInTheDocument();
  });

  it('should render tag message', () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    expect(screen.getByText('Release 2.0.0 - Major update')).toBeInTheDocument();
  });

  it('should show search input when more than 5 tags', () => {
    const manyTags: GitTag[] = Array.from({ length: 6 }, (_, i) => ({
      name: `v${i}.0.0`,
      commitHash: `hash${i}`.padEnd(40, '0'),
      shortHash: `hash${i}`,
      message: `Release ${i}`,
      tagger: 'Alice',
      date: '2025-01-01T00:00:00Z',
      isAnnotated: true,
    }));
    render(
      <GitTagPanel
        tags={manyTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    expect(screen.getByPlaceholderText('tags.search')).toBeInTheDocument();
  });

  it('should not show search input when 5 or fewer tags', () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    expect(screen.queryByPlaceholderText('tags.search')).not.toBeInTheDocument();
  });

  it('should render "New Tag" button', () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    expect(screen.getByText('tags.new')).toBeInTheDocument();
  });

  it('should open create tag dialog when clicking New Tag', async () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );

    fireEvent.click(screen.getByText('tags.new'));

    await waitFor(() => {
      expect(screen.getByText('tags.createTitle')).toBeInTheDocument();
      expect(screen.getByText('tags.createDescription')).toBeInTheDocument();
    });
  });

  it('should call onCreateTag with name and options', async () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );

    fireEvent.click(screen.getByText('tags.new'));

    await waitFor(() => {
      expect(screen.getByText('tags.createTitle')).toBeInTheDocument();
    });

    // Fill tag name (placeholder is "v1.0.0" in the component)
    const nameInput = screen.getByPlaceholderText('v1.0.0');
    fireEvent.change(nameInput, { target: { value: 'v3.0.0' } });

    // Fill message
    const messageInput = screen.getByPlaceholderText('tags.messagePlaceholder');
    fireEvent.change(messageInput, { target: { value: 'Release 3.0' } });

    // Submit
    fireEvent.click(screen.getByText('tags.createButton'));

    await waitFor(() => {
      expect(mockOnCreateTag).toHaveBeenCalled();
      expect(mockOnCreateTag.mock.calls[0][0]).toBe('v3.0.0');
    });
  });

  it('should show loading state', () => {
    const { container } = render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
        isLoading={true}
        onRefresh={mockOnRefresh}
      />
    );
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render push and delete action buttons for each tag', () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    // Push/delete buttons are icon-only with title attributes
    const pushButtons = screen.getAllByTitle('tags.push');
    const deleteButtons = screen.getAllByTitle('tags.delete');
    expect(pushButtons.length).toBe(3);
    expect(deleteButtons.length).toBe(3);
  });

  it('should call onPushTag when clicking push button', async () => {
    render(
      <GitTagPanel
        tags={mockTags}
        onCreateTag={mockOnCreateTag}
        onDeleteTag={mockOnDeleteTag}
        onPushTag={mockOnPushTag}
      />
    );
    const pushButtons = screen.getAllByTitle('tags.push');
    fireEvent.click(pushButtons[0]);
    await waitFor(() => {
      expect(mockOnPushTag).toHaveBeenCalledWith('v2.0.0');
    });
  });
});
