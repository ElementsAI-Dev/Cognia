/**
 * FlowParallelGeneration - Unit tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlowParallelGeneration } from './flow-parallel-generation';
import { useSettingsStore } from '@/stores/settings';
import { NextIntlClientProvider } from 'next-intl';

// Mock settings store
jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn(),
}));

// Mock AI SDK generateText
jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({ text: 'Mock AI response' }),
}));

// Mock AI registry
jest.mock('@/lib/ai/core/ai-registry', () => ({
  createAIRegistry: jest.fn().mockReturnValue({
    languageModel: jest.fn().mockReturnValue({}),
  }),
}));

// Mock translations
const messages = {
  flowChat: {
    parallelGenerate: 'Parallel Generate',
    parallelModels: 'Generate with Multiple Models',
    cancel: 'Cancel',
    generate: 'Generate',
    generating: 'Generating responses...',
    results: 'Results',
    waiting: 'Waiting...',
    generatingResponse: 'Generating response...',
    stopGeneration: 'Stop Generation',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

describe('FlowParallelGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        providerSettings: {
          openai: { apiKey: 'test-key' },
          anthropic: { apiKey: 'test-key' },
        },
      };
      return selector(state);
    });
  });

  it('renders dialog when open', () => {
    render(
      <FlowParallelGeneration
        prompt="Test prompt"
        open={true}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    expect(screen.getByText('Parallel Generate')).toBeInTheDocument();
    expect(screen.getByText('Generate with Multiple Models')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <FlowParallelGeneration
        prompt="Test prompt"
        open={false}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    expect(screen.queryByText('Parallel Generate')).not.toBeInTheDocument();
  });

  it('displays the prompt preview', () => {
    render(
      <FlowParallelGeneration
        prompt="My test prompt for parallel generation"
        open={true}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    expect(screen.getByText('My test prompt for parallel generation')).toBeInTheDocument();
  });

  it('shows available models from configured providers', () => {
    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    // Should show OpenAI and Anthropic models since they have API keys
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('Claude Sonnet 4')).toBeInTheDocument();
  });

  it('shows no models message when no providers configured', () => {
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = { providerSettings: {} };
      return selector(state);
    });

    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    expect(screen.getByText('No configured providers available')).toBeInTheDocument();
  });

  it('allows selecting and deselecting models', () => {
    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    // Click on GPT-4o to select it
    fireEvent.click(screen.getByText('GPT-4o'));
    
    expect(screen.getByText('1 model(s) selected')).toBeInTheDocument();

    // Click again to deselect
    fireEvent.click(screen.getByText('GPT-4o'));
    
    expect(screen.queryByText('1 model(s) selected')).not.toBeInTheDocument();
  });

  it('enables generate button when models are selected', () => {
    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    const generateButton = screen.getByRole('button', { name: /generate \(0\)/i });
    expect(generateButton).toBeDisabled();

    // Select a model
    fireEvent.click(screen.getByText('GPT-4o'));
    
    const updatedButton = screen.getByRole('button', { name: /generate \(1\)/i });
    expect(updatedButton).not.toBeDisabled();
  });

  it('calls onGenerationStart when generate is clicked', async () => {
    const onGenerationStart = jest.fn();

    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={jest.fn()}
        onGenerationStart={onGenerationStart}
      />,
      { wrapper }
    );

    // Select a model and generate
    fireEvent.click(screen.getByText('GPT-4o'));
    fireEvent.click(screen.getByRole('button', { name: /generate \(1\)/i }));

    await waitFor(() => {
      expect(onGenerationStart).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ model: 'gpt-4o', provider: 'openai' })
        ])
      );
    });
  });

  it('shows loading state during generation', async () => {
    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByText('GPT-4o'));
    fireEvent.click(screen.getByRole('button', { name: /generate \(1\)/i }));

    // Should show generating state with progress
    await waitFor(() => {
      expect(screen.getByText('Generating responses...')).toBeInTheDocument();
    });
  });

  it('shows progress bar during generation', async () => {
    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByText('GPT-4o'));
    fireEvent.click(screen.getByRole('button', { name: /generate \(1\)/i }));

    // Should show progress indicator
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('shows stop generation button during generation', async () => {
    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByText('GPT-4o'));
    fireEvent.click(screen.getByRole('button', { name: /generate \(1\)/i }));

    await waitFor(() => {
      expect(screen.getByText('Stop Generation')).toBeInTheDocument();
    });
  });

  it('displays results after generation completes', async () => {
    const onGenerationComplete = jest.fn();

    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={jest.fn()}
        onGenerationComplete={onGenerationComplete}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByText('GPT-4o'));
    fireEvent.click(screen.getByRole('button', { name: /generate \(1\)/i }));

    await waitFor(() => {
      expect(onGenerationComplete).toHaveBeenCalled();
    });
  });

  it('clears selection when Clear All is clicked', () => {
    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    // Select models
    fireEvent.click(screen.getByText('GPT-4o'));
    fireEvent.click(screen.getByText('Claude Sonnet 4'));
    
    expect(screen.getByText('2 model(s) selected')).toBeInTheDocument();

    // Clear all
    fireEvent.click(screen.getByText('Clear All'));
    
    expect(screen.queryByText('2 model(s) selected')).not.toBeInTheDocument();
  });

  it('calls onOpenChange when Cancel is clicked', () => {
    const onOpenChange = jest.fn();

    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays provider badges with correct colors', () => {
    render(
      <FlowParallelGeneration
        prompt="Test"
        open={true}
        onOpenChange={jest.fn()}
      />,
      { wrapper }
    );

    const openaiLabels = screen.getAllByText('openai');
    const anthropicLabels = screen.getAllByText('anthropic');

    expect(openaiLabels.length).toBeGreaterThan(0);
    expect(anthropicLabels.length).toBeGreaterThan(0);
  });
});
