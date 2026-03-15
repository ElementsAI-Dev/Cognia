import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePromptTemplateStore } from '@/stores/prompt/prompt-template-store';
import type { PromptTemplate } from '@/types/content/prompt-template';
import { PromptTemplateManager } from './prompt-template-manager';

jest.mock('zustand', () => jest.requireActual('zustand'));
jest.mock('zustand/middleware', () => jest.requireActual('zustand/middleware'));

// Bypass __mocks__/stores.ts which doesn't export usePromptTemplateStore
jest.unmock('@/stores');

const makeTemplate = (id: string, name: string): PromptTemplate => ({
  id,
  name,
  description: `${name} description`,
  content: 'Content',
  category: 'testing',
  tags: ['tag'],
  variables: [],
  targets: ['chat'],
  source: 'user',
  usageCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('PromptTemplateManager', () => {
  beforeEach(() => {
    usePromptTemplateStore.setState({
      templates: [makeTemplate('1', 'First')],
      categories: ['testing', 'custom'],
      selectedTemplateId: null,
      isInitialized: true,
      draftSessions: {},
      operationStates: {},
    });
  });

  it('filters, creates, and imports templates', async () => {
    const user = userEvent.setup();

    render(<PromptTemplateManager />);

    await user.type(screen.getByPlaceholderText('Search templates'), 'nope');
    expect(screen.getByText('No templates found')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Search templates'));
    expect(screen.getByText('First')).toBeInTheDocument();

    await user.click(screen.getByText('New template'));
    await user.type(screen.getByLabelText('Name'), 'Created');
    await user.type(screen.getByLabelText('Content'), 'Hello {{name}}');
    // Use role to distinguish button from dialog title
    await user.click(screen.getByRole('button', { name: 'Create template' }));

    expect(usePromptTemplateStore.getState().templates).toHaveLength(2);

    await user.click(screen.getByText('Import'));
    const payload = JSON.stringify([{ name: 'Imported', content: 'Hi', tags: [], variables: [] }]);
    // Use paste to avoid userEvent interpreting curly braces as special keys
    await user.click(screen.getByPlaceholderText('Paste template JSON here'));
    await user.paste(payload);
    // Use role to distinguish button from other elements
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(usePromptTemplateStore.getState().templates.length).toBeGreaterThanOrEqual(3);
  });

  it('shows workflow cues for saved drafts and blocked publish readiness', () => {
    usePromptTemplateStore.setState({
      templates: [
        {
          ...makeTemplate('1', 'First'),
          description: '',
          meta: {
            marketplace: {
              marketplaceId: 'market-1',
              linkageType: 'installed',
              installedVersion: '1.0.0',
              latestVersion: '2.0.0',
              baseline: {
                version: '1.0.0',
                name: 'First',
                description: '',
                content: 'Content',
                category: 'testing',
                tags: ['tag'],
                variables: [],
                targets: ['chat'],
                capturedAt: '2026-03-14T00:00:00.000Z',
              },
            },
          },
        },
      ],
      draftSessions: {
        '1': {
          id: '1',
          templateId: '1',
          origin: 'editor',
          snapshot: {
            name: 'First',
            description: '',
            content: 'Draft content',
          },
          dirty: true,
          createdAt: new Date('2026-03-14T00:00:00.000Z'),
          updatedAt: new Date('2026-03-14T00:00:00.000Z'),
        },
      },
    });

    render(<PromptTemplateManager />);

    expect(screen.getByText('Resume draft')).toBeInTheDocument();
    expect(screen.getByText('Publish blocked')).toBeInTheDocument();
  });
});
