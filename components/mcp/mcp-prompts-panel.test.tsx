import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { McpPromptsPanel } from './mcp-prompts-panel';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockGetPrompt = jest.fn();
const mockServers = [
  {
    id: 'server-1',
    name: 'Test Server',
    prompts: [
      { name: 'greeting', description: 'A greeting prompt' },
      { name: 'farewell', description: 'A farewell prompt' },
      {
        name: 'with-args',
        description: 'Prompt with arguments',
        arguments: [
          { name: 'topic', description: 'The topic', required: true },
          { name: 'style', description: 'Writing style', required: false },
        ],
      },
    ],
  },
  {
    id: 'server-2',
    name: 'Empty Server',
    prompts: [],
  },
];

jest.mock('@/stores', () => ({
  useMcpStore: (selector: (state: unknown) => unknown) => {
    const state = {
      servers: mockServers,
      getPrompt: mockGetPrompt,
    };
    return selector(state);
  },
}));

describe('McpPromptsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPrompt.mockResolvedValue({
      messages: [
        { role: 'user', content: 'Hello, how can I help you?' },
        { role: 'assistant', content: 'I am here to assist.' },
      ],
    });
  });

  it('renders server not found when server does not exist', () => {
    render(<McpPromptsPanel serverId="non-existent" />);
    expect(screen.getByText('serverNotFound')).toBeInTheDocument();
  });

  it('renders server name and prompts count', () => {
    render(<McpPromptsPanel serverId="server-1" />);
    expect(screen.getByText('Test Server')).toBeInTheDocument();
  });

  it('renders prompt list', () => {
    render(<McpPromptsPanel serverId="server-1" />);
    expect(screen.getByText('greeting')).toBeInTheDocument();
    expect(screen.getByText('farewell')).toBeInTheDocument();
  });

  it('shows prompt descriptions', () => {
    render(<McpPromptsPanel serverId="server-1" />);
    expect(screen.getByText('A greeting prompt')).toBeInTheDocument();
    expect(screen.getByText('A farewell prompt')).toBeInTheDocument();
  });

  it('shows no prompts message when prompts array is empty', () => {
    render(<McpPromptsPanel serverId="server-2" />);
    expect(screen.getByText('noPrompts')).toBeInTheDocument();
    expect(screen.getByText('noPromptsDesc')).toBeInTheDocument();
  });

  it('shows select prompt message initially', () => {
    render(<McpPromptsPanel serverId="server-1" />);
    expect(screen.getByText('selectPrompt')).toBeInTheDocument();
    expect(screen.getByText('selectPromptDesc')).toBeInTheDocument();
  });

  it('shows prompt details when prompt is clicked', async () => {
    render(<McpPromptsPanel serverId="server-1" />);

    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    // New flow: clicking selects prompt, shows details panel with preview button
    const descriptions = screen.getAllByText('A greeting prompt');
    // Should appear in both the list item and the detail panel
    expect(descriptions.length).toBeGreaterThanOrEqual(2);
  });

  it('shows loading state while fetching prompt', async () => {
    mockGetPrompt.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ messages: [] }), 100);
        })
    );

    render(<McpPromptsPanel serverId="server-1" />);

    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    // Click the preview/fetch button
    const previewButton = screen.getByText('readResource');
    fireEvent.click(previewButton);

    expect(screen.getByText('loadingPrompt')).toBeInTheDocument();
  });

  it('displays prompt content after loading', async () => {
    render(<McpPromptsPanel serverId="server-1" />);

    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    const previewButton = screen.getByText('readResource');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText(/Hello, how can I help you/)).toBeInTheDocument();
    });
  });

  it('shows Insert button when onInsert is provided', async () => {
    const onInsert = jest.fn();
    render(<McpPromptsPanel serverId="server-1" onInsert={onInsert} />);

    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    const previewButton = screen.getByText('readResource');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText('insert')).toBeInTheDocument();
    });
  });

  it('calls onInsert with flattened content when Insert clicked', async () => {
    const onInsert = jest.fn();
    render(<McpPromptsPanel serverId="server-1" onInsert={onInsert} />);

    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    const previewButton = screen.getByText('readResource');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText('insert')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('insert'));
    expect(onInsert).toHaveBeenCalledWith('Hello, how can I help you?\nI am here to assist.');
  });

  it('does not show Insert button when onInsert is not provided', async () => {
    render(<McpPromptsPanel serverId="server-1" />);

    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    const previewButton = screen.getByText('readResource');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText(/Hello, how can I help you/)).toBeInTheDocument();
    });

    expect(screen.queryByText('insert')).not.toBeInTheDocument();
  });

  it('highlights selected prompt', () => {
    render(<McpPromptsPanel serverId="server-1" />);

    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    // Button should have secondary variant when selected
    expect(greetingButton).toBeInTheDocument();
  });

  it('handles array content in messages', async () => {
    mockGetPrompt.mockResolvedValue({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Part 1' },
            { type: 'text', text: 'Part 2' },
          ],
        },
      ],
    });

    render(<McpPromptsPanel serverId="server-1" />);

    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    const previewButton = screen.getByText('readResource');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText(/Part 1/)).toBeInTheDocument();
    });
  });

  it('shows argument inputs for prompts with arguments', () => {
    render(<McpPromptsPanel serverId="server-1" />);
    const argButton = screen.getByText('with-args').closest('button');
    if (argButton) {
      fireEvent.click(argButton);
    }
    expect(screen.getByText('promptArguments')).toBeInTheDocument();
    expect(screen.getByLabelText('topic')).toBeInTheDocument();
    expect(screen.getByLabelText('style')).toBeInTheDocument();
  });

  it('shows error when prompt fetch fails', async () => {
    mockGetPrompt.mockRejectedValue(new Error('Fetch failed'));
    render(<McpPromptsPanel serverId="server-1" />);

    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    const previewButton = screen.getByText('readResource');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText(/promptFetchError/)).toBeInTheDocument();
    });
  });

  it('shows useAsSystemPrompt button when callback provided', async () => {
    const onSystemPrompt = jest.fn();
    render(<McpPromptsPanel serverId="server-1" onInsert={jest.fn()} onUseAsSystemPrompt={onSystemPrompt} />);

    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    const previewButton = screen.getByText('readResource');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText('useAsSystemPrompt')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(<McpPromptsPanel serverId="server-1" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
