/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeState } from './welcome-state';

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
    
    fireEvent.click(screen.getByText('agent'));
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
    const agentButton = screen.getByText('agent').closest('button');
    expect(agentButton).toHaveClass('bg-primary');
  });

  it('renders mode switcher buttons', () => {
    render(<WelcomeState mode="chat" />);
    expect(screen.getByText('chat')).toBeInTheDocument();
    expect(screen.getByText('agent')).toBeInTheDocument();
    expect(screen.getByText('research')).toBeInTheDocument();
  });
});
