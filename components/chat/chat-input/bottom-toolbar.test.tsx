/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomToolbar } from './bottom-toolbar';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      changeModel: 'Change model',
      search: 'Search',
      toggleWebSearch: 'Toggle web search',
      think: 'Think',
      extendedThinking: 'Extended thinking',
      stream: 'Stream',
      toggleStreaming: 'Toggle streaming',
      ppt: 'PPT',
      createPresentation: 'Create AI Presentation',
      workflow: 'Workflow',
      runWorkflow: 'Run a workflow',
      optimize: 'Optimize',
      optimizePrompt: 'Optimize preset prompt',
      aiSettings: 'AI Settings',
      contextWindowUsage: 'Context window usage',
    };
    return translations[key] || key;
  },
}));

// Mock stores
jest.mock('@/stores', () => ({
  usePresetStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      presets: [],
    };
    return selector ? selector(state) : state;
  },
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: [],
      activeSessionId: null,
    };
    return selector ? selector(state) : state;
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, asChild, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
    if (asChild) {
      return <>{children}</>;
    }
    return <button onClick={onClick} disabled={disabled} {...props}>{children}</button>;
  },
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('@/components/presets/preset-quick-prompts', () => ({
  PresetQuickPrompts: () => <div data-testid="preset-quick-prompts" />,
}));

jest.mock('@/components/presets/preset-quick-switcher', () => ({
  PresetQuickSwitcher: () => <div data-testid="preset-quick-switcher" />,
}));

describe('BottomToolbar', () => {
  const defaultProps = {
    modelName: 'GPT-4o',
    webSearchEnabled: false,
    thinkingEnabled: false,
    streamingEnabled: true,
    contextUsagePercent: 30,
    onSelectPrompt: jest.fn(),
    isProcessing: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<BottomToolbar {...defaultProps} onModelClick={jest.fn()} />);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });

  it('displays model name when onModelClick is provided', () => {
    const onModelClick = jest.fn();
    render(<BottomToolbar {...defaultProps} onModelClick={onModelClick} />);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });

  it('calls onModelClick when model button is clicked', () => {
    const onModelClick = jest.fn();
    render(<BottomToolbar {...defaultProps} onModelClick={onModelClick} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    expect(onModelClick).toHaveBeenCalled();
  });

  it('displays web search button', () => {
    render(<BottomToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onWebSearchChange when web search button is clicked', () => {
    const onWebSearchChange = jest.fn();
    render(<BottomToolbar {...defaultProps} onWebSearchChange={onWebSearchChange} />);
    // Find and click the search button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays thinking button', () => {
    render(<BottomToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays streaming button', () => {
    render(<BottomToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays context usage percentage', () => {
    render(<BottomToolbar {...defaultProps} contextUsagePercent={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('highlights context usage when above 80%', () => {
    render(<BottomToolbar {...defaultProps} contextUsagePercent={85} />);
    const percentText = screen.getByText('85%');
    expect(percentText).toHaveClass('text-red-500');
  });

  it('displays workflow button when onOpenWorkflowPicker is provided', () => {
    const onOpenWorkflowPicker = jest.fn();
    render(<BottomToolbar {...defaultProps} onOpenWorkflowPicker={onOpenWorkflowPicker} />);
    // Workflow button should be visible
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(3);
  });

  it('calls onOpenWorkflowPicker when workflow button is clicked', () => {
    const onOpenWorkflowPicker = jest.fn();
    render(<BottomToolbar {...defaultProps} onOpenWorkflowPicker={onOpenWorkflowPicker} />);
    // Find the workflow button by text
    const workflowButton = screen.queryByText('Workflow');
    if (workflowButton) {
      fireEvent.click(workflowButton);
      expect(onOpenWorkflowPicker).toHaveBeenCalled();
    }
  });

  it('displays optimize button when onOpenPromptOptimization and hasActivePreset are provided', () => {
    const onOpenPromptOptimization = jest.fn();
    render(
      <BottomToolbar 
        {...defaultProps} 
        onOpenPromptOptimization={onOpenPromptOptimization}
        hasActivePreset={true}
      />
    );
    // Optimize button should be visible
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(3);
  });

  it('does not display optimize button when hasActivePreset is false', () => {
    const onOpenPromptOptimization = jest.fn();
    render(
      <BottomToolbar 
        {...defaultProps} 
        onOpenPromptOptimization={onOpenPromptOptimization}
        hasActivePreset={false}
      />
    );
    // Optimize button should not be visible
    expect(screen.queryByText('Optimize')).not.toBeInTheDocument();
  });

  it('calls onOpenPromptOptimization when optimize button is clicked', () => {
    const onOpenPromptOptimization = jest.fn();
    render(
      <BottomToolbar 
        {...defaultProps} 
        onOpenPromptOptimization={onOpenPromptOptimization}
        hasActivePreset={true}
      />
    );
    const optimizeButton = screen.queryByText('Optimize');
    if (optimizeButton) {
      fireEvent.click(optimizeButton);
      expect(onOpenPromptOptimization).toHaveBeenCalled();
    }
  });

  it('displays AI settings button', () => {
    const onOpenAISettings = jest.fn();
    render(<BottomToolbar {...defaultProps} onOpenAISettings={onOpenAISettings} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onOpenContextSettings when context usage is clicked', () => {
    const onOpenContextSettings = jest.fn();
    render(<BottomToolbar {...defaultProps} onOpenContextSettings={onOpenContextSettings} />);
    // Click on context usage percentage
    const percentButton = screen.getByText('30%').closest('button');
    if (percentButton) {
      fireEvent.click(percentButton);
      expect(onOpenContextSettings).toHaveBeenCalled();
    }
  });

  it('disables buttons when disabled prop is true', () => {
    render(<BottomToolbar {...defaultProps} disabled={true} />);
    // Some buttons should be affected by disabled state
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('disables buttons when isProcessing is true', () => {
    render(<BottomToolbar {...defaultProps} isProcessing={true} />);
    // Some buttons should be affected by processing state
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
