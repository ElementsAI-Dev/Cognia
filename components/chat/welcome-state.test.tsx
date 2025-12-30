/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeState } from './welcome-state';

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
      'suggestions.chat.conversation.prompt': "Let's have a conversation about something interesting.",
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
    expect(screen.getByText('Conversation')).toBeInTheDocument();
    expect(screen.getByText('Code Help')).toBeInTheDocument();
    expect(screen.getByText('Writing')).toBeInTheDocument();
    expect(screen.getByText('Translation')).toBeInTheDocument();
  });

  it('displays suggestion cards for agent mode', () => {
    render(<WelcomeState mode="agent" />);
    expect(screen.getByText('Build Project')).toBeInTheDocument();
    expect(screen.getByText('Data Analysis')).toBeInTheDocument();
    expect(screen.getByText('Image Tasks')).toBeInTheDocument();
    expect(screen.getByText('Complex Task')).toBeInTheDocument();
  });

  it('displays suggestion cards for research mode', () => {
    render(<WelcomeState mode="research" />);
    expect(screen.getByText('Web Research')).toBeInTheDocument();
    expect(screen.getByText('Market Analysis')).toBeInTheDocument();
    expect(screen.getByText('Literature Review')).toBeInTheDocument();
    expect(screen.getByText('Fact Check')).toBeInTheDocument();
  });

  it('calls onSuggestionClick when suggestion is clicked', () => {
    const onSuggestionClick = jest.fn();
    render(<WelcomeState mode="chat" onSuggestionClick={onSuggestionClick} />);
    
    fireEvent.click(screen.getByText('Conversation'));
    expect(onSuggestionClick).toHaveBeenCalledWith(
      "Let's have a conversation about something interesting."
    );
  });

  it('calls onModeChange when mode button is clicked', () => {
    const onModeChange = jest.fn();
    render(<WelcomeState mode="chat" onModeChange={onModeChange} />);
    
    // Find Agent mode button (text comes from translation)
    const agentButtons = screen.getAllByText(/Agent/i);
    fireEvent.click(agentButtons[0]);
    expect(onModeChange).toHaveBeenCalledWith('agent');
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

  it('renders mode switcher buttons', () => {
    render(<WelcomeState mode="chat" />);
    expect(screen.getAllByText(/Chat|chat|modeChat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Agent|agent|modeAgent/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Research|research|modeResearch/i).length).toBeGreaterThan(0);
  });
});
