import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PromptTemplate } from '@/types/content/prompt-template';
import { PromptTemplateCard } from './prompt-template-card';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      edit: 'Edit',
      duplicate: 'Duplicate',
      delete: 'Delete',
      feedback: 'Feedback',
      builtIn: 'Built-in',
      noContent: 'No content',
      targetTooltip: 'Target context',
      usedCount: 'Used {{count}}×',
      lastUpdated: 'Last updated',
      useTemplate: 'Use template',
    };
    return translations[key] || key;
  },
}));

const mockTemplate: PromptTemplate = {
  id: 'tpl-1',
  name: 'Test Template',
  description: 'Helpful description',
  content: 'Hello {{name}}',
  category: 'testing',
  tags: ['tag1', 'tag2'],
  variables: [{ name: 'name', required: true, type: 'text' }],
  targets: ['chat'],
  source: 'user',
  meta: { icon: '🧪' },
  usageCount: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PromptTemplateCard', () => {
  it('renders template info', () => {
    render(
      <PromptTemplateCard
        template={mockTemplate}
        onEdit={jest.fn()}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.getByText('Helpful description')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
  });

  it('triggers edit action from dropdown menu', async () => {
    const onEdit = jest.fn();

    render(
      <PromptTemplateCard
        template={mockTemplate}
        onEdit={onEdit}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    await userEvent.click(screen.getByLabelText('template-actions'));
    await userEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(mockTemplate);
  });

  it('triggers duplicate action from dropdown menu', async () => {
    const onDuplicate = jest.fn();

    render(
      <PromptTemplateCard
        template={mockTemplate}
        onEdit={jest.fn()}
        onDuplicate={onDuplicate}
        onDelete={jest.fn()}
      />
    );

    await userEvent.click(screen.getByLabelText('template-actions'));
    await userEvent.click(screen.getByText('Duplicate'));
    expect(onDuplicate).toHaveBeenCalledWith('tpl-1');
  });

  it('triggers delete action from dropdown menu', async () => {
    const onDelete = jest.fn();

    render(
      <PromptTemplateCard
        template={mockTemplate}
        onEdit={jest.fn()}
        onDuplicate={jest.fn()}
        onDelete={onDelete}
      />
    );

    await userEvent.click(screen.getByLabelText('template-actions'));
    await userEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('tpl-1');
  });

  it('shows use button when onUse is provided', async () => {
    const onUse = jest.fn();

    render(
      <PromptTemplateCard
        template={mockTemplate}
        onEdit={jest.fn()}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
        onUse={onUse}
      />
    );

    await userEvent.click(screen.getByText('Use template'));
    expect(onUse).toHaveBeenCalledWith(mockTemplate);
  });

  it('displays tags', () => {
    render(
      <PromptTemplateCard
        template={mockTemplate}
        onEdit={jest.fn()}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('displays content preview', () => {
    render(
      <PromptTemplateCard
        template={mockTemplate}
        onEdit={jest.fn()}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Hello {{name}}')).toBeInTheDocument();
  });
});
