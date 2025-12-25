import { render, screen } from '@testing-library/react';
import { SkillAIAssistant } from './skill-ai-assistant';

describe('SkillAIAssistant', () => {
  const mockOnApplyGenerated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the AI Assistant component', () => {
    render(
      <SkillAIAssistant
        onApplyGenerated={mockOnApplyGenerated}
      />
    );

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('displays tabs for generate, refine, and suggest', () => {
    render(
      <SkillAIAssistant
        onApplyGenerated={mockOnApplyGenerated}
      />
    );

    expect(screen.getByRole('tab', { name: /generate/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /refine/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /suggest/i })).toBeInTheDocument();
  });

  it('shows description input field', () => {
    render(
      <SkillAIAssistant
        onApplyGenerated={mockOnApplyGenerated}
      />
    );

    // Check for textarea element in the generate form
    const textarea = document.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
  });

  it('shows category selector', () => {
    render(
      <SkillAIAssistant
        onApplyGenerated={mockOnApplyGenerated}
      />
    );

    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('shows validation status when content is provided', () => {
    render(
      <SkillAIAssistant
        currentContent="# Valid Skill Content"
        onApplyGenerated={mockOnApplyGenerated}
      />
    );

    // Should show validation card (either valid or with issues)
    const validationCard = document.querySelector('[data-slot="card"]');
    expect(validationCard).toBeInTheDocument();
  });
});
