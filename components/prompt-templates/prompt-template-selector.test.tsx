import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePromptTemplateStore } from '@/stores/prompt/prompt-template-store';
import type { PromptTemplate } from '@/types/prompt-template';
import { PromptTemplateSelector } from './prompt-template-selector';

// Bypass __mocks__/stores.ts which doesn't export usePromptTemplateStore
jest.unmock('@/stores');

const makeTemplate = (id: string, name: string, updatedAt: Date): PromptTemplate => ({
  id,
  name,
  description: `${name} description`,
  content: 'Content',
  category: 'cat',
  tags: [],
  variables: [],
  targets: ['chat'],
  source: 'user',
  usageCount: 0,
  createdAt: updatedAt,
  updatedAt,
});

describe('PromptTemplateSelector', () => {
  beforeEach(() => {
    usePromptTemplateStore.setState({ templates: [] });
  });

  it('renders templates and calls onSelect', async () => {
    const now = new Date();
    usePromptTemplateStore.setState({
      templates: [
        makeTemplate('1', 'Older', new Date(now.getTime() - 1000)),
        makeTemplate('2', 'Newer', now),
      ],
    });

    const onSelect = jest.fn();

    render(<PromptTemplateSelector open onOpenChange={jest.fn()} onSelect={onSelect} />);

    expect(screen.getByText('Insert prompt template')).toBeInTheDocument();
    expect(screen.getByText('Newer')).toBeInTheDocument();
    expect(screen.getByText('Older')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Newer'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
  });
});
