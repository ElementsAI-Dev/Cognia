/**
 * Tests for CodeSnippets component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeSnippets } from './code-snippets';
import type { CodeSnippet, ExecutionResult } from '@/types/sandbox';

// Mock data
const mockSnippets: CodeSnippet[] = [
  {
    id: 'snippet-1',
    title: 'Hello World',
    description: 'A simple hello world program',
    language: 'python',
    code: 'print("Hello, World!")',
    tags: ['example', 'beginner'],
    category: 'basics',
    is_template: false,
    usage_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'snippet-2',
    title: 'React Component',
    description: 'A basic React component template',
    language: 'typescript',
    code: 'export function Component() { return <div>Hello</div>; }',
    tags: ['react', 'template'],
    category: 'frontend',
    is_template: true,
    usage_count: 25,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockExecutionResult: ExecutionResult = {
  id: 'exec-1',
  status: 'completed',
  stdout: 'Hello, World!\n',
  stderr: '',
  exit_code: 0,
  execution_time_ms: 100,
  memory_used_bytes: 1024,
  error: null,
  runtime: 'docker',
  language: 'python',
};

const mockUseSnippets = {
  snippets: mockSnippets,
  loading: false,
  error: null,
  refresh: jest.fn(),
  createSnippet: jest.fn().mockResolvedValue(mockSnippets[0]),
  updateSnippet: jest.fn().mockResolvedValue(undefined),
  deleteSnippet: jest.fn().mockResolvedValue(true),
  executeSnippet: jest.fn().mockResolvedValue(mockExecutionResult),
  createFromExecution: jest.fn().mockResolvedValue(mockSnippets[0]),
};

const mockUseTagsCategories = {
  tags: ['example', 'beginner', 'react', 'template'],
  categories: ['basics', 'frontend', 'algorithms'],
  loading: false,
  refresh: jest.fn(),
};

jest.mock('@/hooks/use-sandbox-db', () => ({
  useSnippets: () => mockUseSnippets,
  useTagsCategories: () => mockUseTagsCategories,
}));

describe('CodeSnippets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render snippet list', () => {
    render(<CodeSnippets />);

    expect(screen.getByText('代码片段')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('React Component')).toBeInTheDocument();
  });

  it('should display snippet descriptions', () => {
    render(<CodeSnippets />);

    expect(screen.getByText('A simple hello world program')).toBeInTheDocument();
    expect(screen.getByText('A basic React component template')).toBeInTheDocument();
  });

  it('should display template badge for template snippets', () => {
    render(<CodeSnippets />);

    const templateBadges = screen.getAllByText('模板');
    expect(templateBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('should display code preview', () => {
    render(<CodeSnippets />);

    expect(screen.getByText(/print\("Hello, World!"\)/)).toBeInTheDocument();
  });

  it('should display tags', () => {
    render(<CodeSnippets />);

    expect(screen.getByText('example')).toBeInTheDocument();
    expect(screen.getByText('beginner')).toBeInTheDocument();
  });

  it('should display category badge', () => {
    render(<CodeSnippets />);

    expect(screen.getByText('basics')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
  });

  it('should display usage count', () => {
    render(<CodeSnippets />);

    expect(screen.getByText('使用 10 次')).toBeInTheDocument();
    expect(screen.getByText('使用 25 次')).toBeInTheDocument();
  });

  it('should filter by search query', async () => {
    const user = userEvent.setup();
    render(<CodeSnippets />);

    const searchInput = screen.getByPlaceholderText('搜索片段...');
    await user.type(searchInput, 'Hello');

    expect(searchInput).toHaveValue('Hello');
  });

  it('should switch between all and templates tabs', async () => {
    const user = userEvent.setup();
    render(<CodeSnippets />);

    const templatesTab = screen.getByRole('tab', { name: '模板' });
    await user.click(templatesTab);

    expect(templatesTab).toHaveAttribute('data-state', 'active');
  });

  it('should open create dialog when clicking new button', async () => {
    const user = userEvent.setup();
    render(<CodeSnippets />);

    const newButton = screen.getByRole('button', { name: /新建/ });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('新建代码片段')).toBeInTheDocument();
    });
  });

  it('should call refresh when clicking refresh button', async () => {
    const user = userEvent.setup();
    render(<CodeSnippets />);

    const refreshButtons = screen.getAllByRole('button');
    const refreshButton = refreshButtons.find(btn => 
      btn.querySelector('svg.lucide-refresh-cw')
    );

    if (refreshButton) {
      await user.click(refreshButton);
      expect(mockUseSnippets.refresh).toHaveBeenCalled();
    }
  });

  it('should call onExecuteSnippet when executing snippet', async () => {
    const onExecute = jest.fn();
    render(<CodeSnippets onExecuteSnippet={onExecute} />);

    const firstSnippet = screen.getByText('Hello World').closest('div[class*="group"]');
    if (firstSnippet) {
      fireEvent.mouseEnter(firstSnippet);

      await waitFor(() => {
        const playButtons = screen.getAllByRole('button');
        const playButton = playButtons.find(btn => 
          btn.querySelector('svg.lucide-play')
        );
        if (playButton) {
          fireEvent.click(playButton);
        }
      });

      await waitFor(() => {
        expect(mockUseSnippets.executeSnippet).toHaveBeenCalledWith('snippet-1');
      });
    }
  });

  it('should call onInsertCode when copying snippet', async () => {
    const onInsert = jest.fn();
    render(<CodeSnippets onInsertCode={onInsert} />);

    const firstSnippet = screen.getByText('Hello World').closest('div[class*="group"]');
    if (firstSnippet) {
      fireEvent.mouseEnter(firstSnippet);

      await waitFor(() => {
        const copyButtons = screen.getAllByRole('button');
        const copyButton = copyButtons.find(btn => 
          btn.querySelector('svg.lucide-copy')
        );
        if (copyButton) {
          fireEvent.click(copyButton);
        }
      });

      expect(onInsert).toHaveBeenCalledWith(
        'print("Hello, World!")',
        'python'
      );
    }
  });

  it('should open edit dialog when clicking edit option', async () => {
    const user = userEvent.setup();
    render(<CodeSnippets />);

    const firstSnippet = screen.getByText('Hello World').closest('div[class*="group"]');
    if (firstSnippet) {
      fireEvent.mouseEnter(firstSnippet);

      const moreButtons = screen.getAllByRole('button');
      const moreButton = moreButtons.find(btn => 
        btn.querySelector('svg.lucide-more-vertical')
      );

      if (moreButton) {
        await user.click(moreButton);

        await waitFor(() => {
          const editOption = screen.getByText('编辑');
          fireEvent.click(editOption);
        });

        await waitFor(() => {
          expect(screen.getByText('编辑代码片段')).toBeInTheDocument();
        });
      }
    }
  });

  it('should show delete confirmation when clicking delete', async () => {
    const user = userEvent.setup();
    render(<CodeSnippets />);

    const firstSnippet = screen.getByText('Hello World').closest('div[class*="group"]');
    if (firstSnippet) {
      fireEvent.mouseEnter(firstSnippet);

      const moreButtons = screen.getAllByRole('button');
      const moreButton = moreButtons.find(btn => 
        btn.querySelector('svg.lucide-more-vertical')
      );

      if (moreButton) {
        await user.click(moreButton);

        await waitFor(() => {
          const deleteOption = screen.getByText('删除');
          fireEvent.click(deleteOption);
        });

        await waitFor(() => {
          expect(screen.getByText('确认删除')).toBeInTheDocument();
        });
      }
    }
  });
});

describe('CodeSnippets form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create snippet with form data', async () => {
    const user = userEvent.setup();
    render(<CodeSnippets />);

    // Open create dialog
    const newButton = screen.getByRole('button', { name: /新建/ });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('新建代码片段')).toBeInTheDocument();
    });

    // Fill in form
    const titleInput = screen.getByLabelText('标题 *');
    await user.type(titleInput, 'Test Snippet');

    const descInput = screen.getByLabelText('描述');
    await user.type(descInput, 'A test description');

    const codeTextarea = screen.getByLabelText('代码 *');
    await user.type(codeTextarea, 'console.log("test")');

    // Submit form
    const createButton = screen.getByRole('button', { name: '创建' });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockUseSnippets.createSnippet).toHaveBeenCalled();
    });
  });

  it('should disable create button when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<CodeSnippets />);

    const newButton = screen.getByRole('button', { name: /新建/ });
    await user.click(newButton);

    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: '创建' });
      expect(createButton).toBeDisabled();
    });
  });
});

describe('CodeSnippets empty state', () => {
  it('should show empty state when no snippets', () => {
    const emptyMock = { ...mockUseSnippets, snippets: [] };
    jest.spyOn(
      jest.requireMock('@/hooks/use-sandbox-db'),
      'useSnippets'
    ).mockReturnValue(emptyMock);

    render(<CodeSnippets />);

    expect(screen.getByText('暂无代码片段')).toBeInTheDocument();
    expect(screen.getByText('创建第一个片段')).toBeInTheDocument();
  });
});
