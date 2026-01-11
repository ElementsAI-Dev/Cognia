import { render, screen } from '@testing-library/react';
import { SkillEditor } from './skill-editor';
import type { Skill } from '@/types/system/skill';

const mockSkill: Skill = {
  id: 'test-skill-1',
  metadata: {
    name: 'test-skill',
    description: 'A test skill for testing',
  },
  content: '# Test Skill\n\nThis is test content.',
  rawContent: `---
name: test-skill
description: A test skill for testing
---

# Test Skill

This is test content.`,
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'development',
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SkillEditor', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with skill name in header', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    // Skill name appears in multiple places, just verify at least one exists
    const elements = screen.getAllByText('test-skill');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('shows Valid badge when content is valid', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('disables Save button when no changes', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('renders cancel button when onCancel is provided', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('shows token estimate', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    // Token estimate is displayed as "~{number}" 
    expect(screen.getByText(/~\d+/)).toBeInTheDocument();
  });

  it('renders with initial content when no skill provided', () => {
    render(
      <SkillEditor
        initialContent="# New Skill"
        onSave={mockOnSave}
      />
    );

    // The title should show "New Skill" in the header
    expect(screen.getByText('New Skill')).toBeInTheDocument();
  });

  it('shows export button when skill has valid name', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    // Download options are in a dropdown, check for export button
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });
});
