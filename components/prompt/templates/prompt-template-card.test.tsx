import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PromptTemplate } from '@/types/content/prompt-template';
import { PromptTemplateCard } from './prompt-template-card';

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
  it('renders template info and triggers actions', async () => {
    const onEdit = jest.fn();
    const onDuplicate = jest.fn();
    const onDelete = jest.fn();

    render(
      <PromptTemplateCard
        template={mockTemplate}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.getByText('Helpful description')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
    expect(screen.getByText('Used 2×')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('template-actions'));
    await userEvent.click(screen.getByText('Edit'));
    await userEvent.click(screen.getByLabelText('template-actions'));
    await userEvent.click(screen.getByText('Duplicate'));
    await userEvent.click(screen.getByLabelText('template-actions'));
    await userEvent.click(screen.getByText('Delete'));

    expect(onEdit).toHaveBeenCalledWith(mockTemplate);
    expect(onDuplicate).toHaveBeenCalledWith('tpl-1');
    expect(onDelete).toHaveBeenCalledWith('tpl-1');
  });

  it('shows select button when onSelect is provided', async () => {
    const onSelect = jest.fn();

    render(
      <PromptTemplateCard
        template={mockTemplate}
        onEdit={jest.fn()}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
        onSelect={onSelect}
      />
    );

    await userEvent.click(screen.getByText('Use template'));
    expect(onSelect).toHaveBeenCalledWith(mockTemplate);
  });
});
