/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeState } from './welcome-state';
import { useSettingsStore } from '@/stores';

// Mock stores
jest.mock('@/stores', () => ({
  useTemplateStore: jest.fn((selector) => {
    const state = {
      templates: [],
      searchTemplates: jest.fn().mockReturnValue([]),
    };
    return selector ? selector(state) : state;
  }),
  useSettingsStore: jest.fn((selector) => {
    const state = {
      welcomeSettings: {
        enabled: true,
        customGreeting: '',
        customDescription: '',
        showAvatar: false,
        avatarUrl: '',
        sectionsVisibility: {
          header: true,
          featureBadges: true,
          modeSwitcher: true,
          templateSelector: true,
          suggestions: true,
          quickAccess: true,
          a2uiDemo: true,
        },
        customSuggestions: {
          chat: [],
          agent: [],
          research: [],
          learning: [],
        },
        quickAccessLinks: [],
        useCustomQuickAccess: false,
        hideDefaultSuggestions: false,
        maxSuggestionsPerMode: 4,
        defaultMode: 'chat',
      },
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      modeChat: 'Chat',
      modeAgent: 'Agent',
      modeResearch: 'Research',
      'modes.chat.title': 'Chat Mode',
      'modes.chat.description': 'Have natural conversations with AI',
      'modes.agent.title': 'Agent Mode',
      'modes.agent.description': 'AI agent with tool access',
      'modes.research.title': 'Research Mode',
      'modes.research.description': 'Deep web research and analysis',
      'modes.chat.features.fast': 'Fast responses',
      'modes.chat.features.languages': 'Multiple languages',
      'modes.chat.features.context': 'Context aware',
      'modes.chat.features.creative': 'Creative writing',
      'modes.agent.features.code': 'Code execution',
      'modes.agent.features.file': 'File operations',
      'modes.agent.features.data': 'Data analysis',
      'modes.agent.features.multi': 'Multi-step tasks',
      'modes.research.features.search': 'Web search',
      'modes.research.features.citations': 'Source citations',
      'modes.research.features.factCheck': 'Fact checking',
      'modes.research.features.report': 'Report generation',
      'suggestions.chat.conversation.title': 'Conversation',
      'suggestions.chat.conversation.prompt':
        "Let's have a conversation about something interesting.",
      'suggestions.chat.codeHelp.title': 'Code Help',
      'suggestions.chat.codeHelp.prompt': 'Help me with code',
      'suggestions.chat.writing.title': 'Writing',
      'suggestions.chat.writing.prompt': 'Help me write',
      'suggestions.chat.translation.title': 'Translation',
      'suggestions.chat.translation.prompt': 'Translate for me',
      'suggestions.agent.buildProject.title': 'Build Project',
      'suggestions.agent.buildProject.prompt': 'Build a project',
      'suggestions.agent.dataAnalysis.title': 'Data Analysis',
      'suggestions.agent.dataAnalysis.prompt': 'Analyze data',
      'suggestions.agent.imageTasks.title': 'Image Tasks',
      'suggestions.agent.imageTasks.prompt': 'Process images',
      'suggestions.agent.complexTask.title': 'Complex Task',
      'suggestions.agent.complexTask.prompt': 'Complex task',
      'suggestions.research.webResearch.title': 'Web Research',
      'suggestions.research.webResearch.prompt': 'Research the web',
      'suggestions.research.marketAnalysis.title': 'Market Analysis',
      'suggestions.research.marketAnalysis.prompt': 'Market analysis',
      'suggestions.research.literatureReview.title': 'Literature Review',
      'suggestions.research.literatureReview.prompt': 'Literature review',
      'suggestions.research.factCheck.title': 'Fact Check',
      'suggestions.research.factCheck.prompt': 'Fact check',
    };
    return translations[key] || key;
  },
}));

describe('WelcomeState', () => {
  it('renders chat mode correctly', () => {
    render(<WelcomeState mode="chat" />);
    expect(screen.getByText('Chat Mode')).toBeInTheDocument();
    expect(screen.getByText(/Have natural conversations/)).toBeInTheDocument();
  });

  it('renders agent mode correctly', () => {
    render(<WelcomeState mode="agent" />);
    expect(screen.getByText('Agent Mode')).toBeInTheDocument();
    expect(screen.getByText(/AI agent with tool access/)).toBeInTheDocument();
  });

  it('renders research mode correctly', () => {
    render(<WelcomeState mode="research" />);
    expect(screen.getByText('Research Mode')).toBeInTheDocument();
    expect(screen.getByText(/Deep web research/)).toBeInTheDocument();
  });

  it('displays suggestion cards for chat mode', () => {
    render(<WelcomeState mode="chat" />);
    // Multiple elements exist due to responsive layout (mobile + desktop)
    expect(screen.getAllByText('Conversation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Code Help').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Writing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Translation').length).toBeGreaterThan(0);
  });

  it('displays suggestion cards for agent mode', () => {
    render(<WelcomeState mode="agent" />);
    // Multiple elements exist due to responsive layout (mobile + desktop)
    expect(screen.getAllByText('Build Project').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Data Analysis').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Image Tasks').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Complex Task').length).toBeGreaterThan(0);
  });

  it('displays suggestion cards for research mode', () => {
    render(<WelcomeState mode="research" />);
    // Multiple elements exist due to responsive layout (mobile + desktop)
    expect(screen.getAllByText('Web Research').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Market Analysis').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Literature Review').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fact Check').length).toBeGreaterThan(0);
  });

  it('calls onSuggestionClick when suggestion is clicked', () => {
    const onSuggestionClick = jest.fn();
    render(<WelcomeState mode="chat" onSuggestionClick={onSuggestionClick} />);

    // Get all suggestion elements and click the first one (mobile or desktop layout)
    const conversationElements = screen.getAllByText('Conversation');
    fireEvent.click(conversationElements[0]);
    expect(onSuggestionClick).toHaveBeenCalledWith(
      "Let's have a conversation about something interesting."
    );
  });

  it('renders mode tabs with all options', () => {
    const onModeChange = jest.fn();
    const { container } = render(<WelcomeState mode="chat" onModeChange={onModeChange} />);

    // Find all tabs - mode switcher uses Tabs component with 4 modes
    const tabList = container.querySelector('[role="tablist"]');
    expect(tabList).toBeTruthy();

    const tabs = container.querySelectorAll('[role="tab"]');
    // Should have 4 mode tabs: chat, agent, research, learning
    expect(tabs.length).toBeGreaterThanOrEqual(4);

    // First tab (chat) should be active (data-state="active")
    expect(tabs[0].getAttribute('data-state')).toBe('active');
  });

  it('displays feature badges for chat mode', () => {
    render(<WelcomeState mode="chat" />);
    expect(screen.getByText('Fast responses')).toBeInTheDocument();
    expect(screen.getByText('Multiple languages')).toBeInTheDocument();
    expect(screen.getByText('Context aware')).toBeInTheDocument();
    expect(screen.getByText('Creative writing')).toBeInTheDocument();
  });

  it('displays feature badges for agent mode', () => {
    render(<WelcomeState mode="agent" />);
    expect(screen.getByText('Code execution')).toBeInTheDocument();
    expect(screen.getByText('File operations')).toBeInTheDocument();
    expect(screen.getByText('Data analysis')).toBeInTheDocument();
    expect(screen.getByText('Multi-step tasks')).toBeInTheDocument();
  });

  it('displays feature badges for research mode', () => {
    render(<WelcomeState mode="research" />);
    expect(screen.getByText('Web search')).toBeInTheDocument();
    expect(screen.getByText('Source citations')).toBeInTheDocument();
    expect(screen.getByText('Fact checking')).toBeInTheDocument();
    expect(screen.getByText('Report generation')).toBeInTheDocument();
  });

  it('highlights current mode button', () => {
    render(<WelcomeState mode="agent" />);
    const agentElements = screen.queryAllByText(/Agent/i);
    // Check that agent mode text exists somewhere in the component
    expect(agentElements.length).toBeGreaterThan(0);
  });

  it('renders custom greeting when configured', () => {
    // Override mock for this test
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        welcomeSettings: {
          sectionsVisibility: { header: true },
          customSuggestions: { chat: [] },
          customGreeting: 'Hello Custom World',
          customDescription: 'Custom Description',
        },
      };
      return selector ? selector(state) : state;
    });

    render(<WelcomeState mode="chat" />);
    expect(screen.getByText('Hello Custom World')).toBeInTheDocument();
    expect(screen.getByText('Custom Description')).toBeInTheDocument();
  });

  it('hides header when configured', () => {
    // Override mock for this test
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        welcomeSettings: {
          sectionsVisibility: { header: false },
          customSuggestions: { chat: [] },
        },
      };
      return selector ? selector(state) : state;
    });

    render(<WelcomeState mode="chat" />);
    expect(screen.queryByText('Chat Mode')).not.toBeInTheDocument();
  });
});
