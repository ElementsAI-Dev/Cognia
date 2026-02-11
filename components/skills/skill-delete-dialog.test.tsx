/**
 * Tests for SkillDeleteDialog component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SkillDeleteDialog } from './skill-delete-dialog';
import type { Skill } from '@/types/system/skill';

const mockSkill: Skill = {
  id: 'test-1',
  metadata: {
    name: 'Test Skill',
    description: 'A test skill',
  },
  content: '# Test',
  rawContent: '---\nname: Test Skill\n---\n# Test',
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'development',
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SkillDeleteDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open with skill name', () => {
    render(
      <SkillDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        skill={mockSkill}
        onConfirm={mockOnConfirm}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Test Skill/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <SkillDeleteDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        skill={mockSkill}
        onConfirm={mockOnConfirm}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onConfirm when delete button clicked', () => {
    render(
      <SkillDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        skill={mockSkill}
        onConfirm={mockOnConfirm}
      />
    );
    const deleteBtn = screen.getAllByRole('button').find((b) => {
      const text = b.textContent?.toLowerCase() || '';
      return text.includes('delete') || text.includes('删除');
    });
    if (deleteBtn) fireEvent.click(deleteBtn);
    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('handles null skill gracefully', () => {
    render(
      <SkillDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        skill={null}
        onConfirm={mockOnConfirm}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
