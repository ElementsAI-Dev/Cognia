import { render, screen, fireEvent } from '@testing-library/react';
import { SkillEditor } from './skill-editor';
import type { Skill } from '@/types/skill';

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

  it('renders with skill content', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('test-skill')).toBeInTheDocument();
  });

  it('shows Edit tab by default', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByRole('tab', { name: /edit/i })).toHaveAttribute('data-state', 'active');
  });

  it('displays all tabs', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByRole('tab', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /resources/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ai assist/i })).toBeInTheDocument();
  });

  it('has clickable Preview tab', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    expect(previewTab).toBeInTheDocument();
    expect(previewTab).not.toBeDisabled();
  });

  it('has clickable Resources tab', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    const resourcesTab = screen.getByRole('tab', { name: /resources/i });
    expect(resourcesTab).toBeInTheDocument();
    expect(resourcesTab).not.toBeDisabled();
  });

  it('has clickable AI Assist tab', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    const aiTab = screen.getByRole('tab', { name: /ai assist/i });
    expect(aiTab).toBeInTheDocument();
    expect(aiTab).not.toBeDisabled();
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

  it('enables Save button when content changes', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: mockSkill.rawContent + '\n\nAdded content' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('shows Unsaved badge when content changes', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: mockSkill.rawContent + '\n\nModified' } });

    expect(screen.getByText('Unsaved')).toBeInTheDocument();
  });

  it('calls onSave when Save button is clicked', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    const textarea = screen.getByRole('textbox');
    const newContent = mockSkill.rawContent + '\n\n## New Section';
    fireEvent.change(textarea, { target: { value: newContent } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(mockOnSave).toHaveBeenCalledWith(newContent, []);
  });

  it('calls onCancel when Cancel button is clicked', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('resets content when Reset button is clicked', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Modified content' } });
    
    expect(screen.getByText('Unsaved')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(screen.queryByText('Unsaved')).not.toBeInTheDocument();
  });

  it('shows token estimate', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(/tokens/i)).toBeInTheDocument();
  });

  it('disables editing when readOnly is true', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
        readOnly={true}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('readonly');
  });

  it('renders with initial content when no skill provided', () => {
    render(
      <SkillEditor
        initialContent="# New Skill"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('New Skill')).toBeInTheDocument();
  });

  it('shows download buttons when skill has valid name', () => {
    render(
      <SkillEditor
        skill={mockSkill}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByRole('button', { name: /\.md/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\.json/i })).toBeInTheDocument();
  });
});
