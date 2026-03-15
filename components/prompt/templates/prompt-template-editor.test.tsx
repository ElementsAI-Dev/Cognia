import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PromptTemplate } from '@/types/content/prompt-template';
import { PromptTemplateEditor } from './prompt-template-editor';

describe('PromptTemplateEditor', () => {
  const categories = ['code-review', 'custom'];

  it('submits new template with detected variables and tags', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(<PromptTemplateEditor categories={categories} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), '  My Template  ');
    await user.type(screen.getByLabelText('Description'), 'Do something useful');
    // Use paste to avoid special character interpretation in userEvent
    const contentInput = screen.getByLabelText('Content');
    await user.click(contentInput);
    await user.paste('Hello {{name}}');
    await user.type(screen.getByPlaceholderText('Add tag and press Enter'), 'greeting{enter}');

    await user.click(screen.getByText('Create template'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Template',
        description: 'Do something useful',
        tags: ['greeting'],
        variables: expect.arrayContaining([expect.objectContaining({ name: 'name' })]),
      })
    );
  });

  it('edits existing template, toggles targets, and shows preview output', async () => {
    const template: PromptTemplate = {
      id: 'tpl-1',
      name: 'Edit Me',
      description: 'Original',
      content: 'Hi {{name}}',
      category: 'custom',
      tags: ['old'],
      variables: [{ name: 'name', required: true, type: 'text' }],
      targets: ['chat'],
      source: 'user',
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(<PromptTemplateEditor key={template.id} template={template} categories={categories} onSubmit={onSubmit} />);

    await user.click(screen.getByText('workflow'));
    await user.type(screen.getByLabelText('Content'), ' and welcome');

    const previewInput = screen.getByLabelText('preview-name');
    await user.clear(previewInput);
    await user.type(previewInput, 'Alex');

    await user.click(screen.getByText('Output'));
    const output = screen.getByLabelText('template-preview-output');
    expect((output as HTMLTextAreaElement).value).toContain('Alex');

    await user.click(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        targets: expect.arrayContaining(['workflow']),
        content: expect.stringContaining('welcome'),
      })
    );
  });

  it('renders submit error message when provided', () => {
    const onSubmit = jest.fn();
    render(
      <PromptTemplateEditor
        categories={categories}
        onSubmit={onSubmit}
        submitError="Template save failed"
      />
    );

    expect(screen.getByText('Template save failed')).toBeInTheDocument();
  });

  it('saves a draft on cancel and shows workflow hints for linked templates', async () => {
    const onSubmit = jest.fn();
    const onSaveDraft = jest.fn();
    const onCancel = jest.fn();
    const user = userEvent.setup();

    const template: PromptTemplate = {
      id: 'linked-1',
      name: 'Linked Prompt',
      description: '',
      content: 'Hello {{name}}',
      category: 'chat',
      tags: ['marketplace'],
      variables: [{ name: 'name', required: true, type: 'text' }],
      targets: ['chat'],
      source: 'imported',
      meta: {
        marketplace: {
          marketplaceId: 'market-1',
          linkageType: 'installed',
          installedVersion: '1.0.0',
          latestVersion: '2.0.0',
          baseline: {
            version: '1.0.0',
            name: 'Linked Prompt',
            description: '',
            content: 'Original content',
            category: 'chat',
            tags: ['marketplace'],
            variables: [{ name: 'name', required: true, type: 'text' }],
            targets: ['chat'],
            capturedAt: '2026-03-14T00:00:00.000Z',
          },
        },
      },
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <PromptTemplateEditor
        template={template}
        categories={categories}
        onSubmit={onSubmit}
        onSaveDraft={onSaveDraft}
        onCancel={onCancel}
      />
    );

    await user.type(screen.getByLabelText('Content'), ' updated');
    expect(screen.getByText('Publish blocked')).toBeInTheDocument();
    expect(screen.getByText(/restricted-update/i)).toBeInTheDocument();

    await user.click(screen.getByText('Cancel'));

    expect(onSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('updated'),
      })
    );
    expect(onCancel).toHaveBeenCalled();
  });
});
