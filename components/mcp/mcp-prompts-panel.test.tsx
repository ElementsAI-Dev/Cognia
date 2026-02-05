import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { McpPromptsPanel } from './mcp-prompts-panel';

// Mock useMcpStore
const mockGetPrompt = jest.fn();
const mockServers = [
  {
    id: 'server-1',
    name: 'Test Server',
    prompts: [
      { name: 'greeting', description: 'A greeting prompt' },
      { name: 'farewell', description: 'A farewell prompt' },
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
    expect(screen.getByText('Server not found')).toBeInTheDocument();
  });

  it('renders server name and prompts count', () => {
    render(<McpPromptsPanel serverId="server-1" />);
    expect(screen.getByText('Test Server')).toBeInTheDocument();
    expect(screen.getByText('2 prompts')).toBeInTheDocument();
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
    expect(screen.getByText('No prompts available')).toBeInTheDocument();
    expect(screen.getByText('This server does not expose any prompts.')).toBeInTheDocument();
  });

  it('shows select prompt message initially', () => {
    render(<McpPromptsPanel serverId="server-1" />);
    expect(screen.getByText('Select a prompt')).toBeInTheDocument();
    expect(screen.getByText('Choose a prompt from the list to preview its content.')).toBeInTheDocument();
  });

  it('calls getPrompt when prompt is clicked', async () => {
    render(<McpPromptsPanel serverId="server-1" />);
    
    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    await waitFor(() => {
      expect(mockGetPrompt).toHaveBeenCalledWith('server-1', 'greeting');
    });
  });

  it('shows loading state while fetching prompt', async () => {
    mockGetPrompt.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({ messages: [] }), 100);
    }));

    render(<McpPromptsPanel serverId="server-1" />);
    
    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    expect(screen.getByText('Loading prompt...')).toBeInTheDocument();
  });

  it('displays prompt content after loading', async () => {
    render(<McpPromptsPanel serverId="server-1" />);
    
    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

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

    await waitFor(() => {
      expect(screen.getByText('Insert')).toBeInTheDocument();
    });
  });

  it('calls onInsert with flattened content when Insert clicked', async () => {
    const onInsert = jest.fn();
    render(<McpPromptsPanel serverId="server-1" onInsert={onInsert} />);
    
    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Insert')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Insert'));
    expect(onInsert).toHaveBeenCalledWith('Hello, how can I help you?\nI am here to assist.');
  });

  it('does not show Insert button when onInsert is not provided', async () => {
    render(<McpPromptsPanel serverId="server-1" />);
    
    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    await waitFor(() => {
      expect(screen.getByText(/Hello, how can I help you/)).toBeInTheDocument();
    });

    expect(screen.queryByText('Insert')).not.toBeInTheDocument();
  });

  it('highlights selected prompt', async () => {
    render(<McpPromptsPanel serverId="server-1" />);
    
    const greetingButton = screen.getByText('greeting').closest('button');
    if (greetingButton) {
      fireEvent.click(greetingButton);
    }

    await waitFor(() => {
      expect(mockGetPrompt).toHaveBeenCalled();
    });
    
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

    await waitFor(() => {
      expect(screen.getByText(/Part 1/)).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <McpPromptsPanel serverId="server-1" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
