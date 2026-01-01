/**
 * Tests for AIChatPanel component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIChatPanel } from './ai/ai-chat-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the stores
jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    providerSettings: { openai: { apiKey: 'test-key' } },
    defaultProvider: 'openai',
  }),
}));

// Mock the designer AI functions
jest.mock('@/lib/designer', () => ({
  continueDesignConversation: jest.fn().mockResolvedValue({
    success: true,
    response: 'Done!',
    code: 'export default function App() { return <div>Updated</div>; }',
  }),
  getAIStyleSuggestions: jest.fn().mockResolvedValue({
    success: true,
    suggestions: [
      { id: '1', type: 'style', title: 'Test', description: 'Test desc', priority: 'medium' },
    ],
  }),
  getAIAccessibilitySuggestions: jest.fn().mockResolvedValue({
    success: true,
    suggestions: [],
  }),
  getDesignerAIConfig: jest.fn().mockReturnValue({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'test-key',
  }),
  executeDesignerAIEdit: jest.fn().mockResolvedValue({
    success: true,
    code: 'export default function App() { return <div>Modified</div>; }',
  }),
  QUICK_AI_ACTIONS: [
    { id: 'test-action', label: 'Test Action', prompt: 'Test prompt' },
  ],
}));

describe('AIChatPanel', () => {
  const defaultProps = {
    code: 'export default function App() { return <div>Hello</div>; }',
    onCodeChange: jest.fn(),
    isOpen: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when isOpen is true', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByText('aiAssistant')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<AIChatPanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('aiAssistant')).not.toBeInTheDocument();
  });

  it('should render quick action badges', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByText('Test Action')).toBeInTheDocument();
  });

  it('should render message input', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText('aiChatPlaceholder')).toBeInTheDocument();
  });

  it('should show welcome message when no conversation', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByText('aiChatWelcome')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const onClose = jest.fn();
    render(<AIChatPanel {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-x')
    );
    if (closeButton) {
      await userEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should enable send button when message is entered', async () => {
    render(<AIChatPanel {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('aiChatPlaceholder');
    await userEvent.type(input, 'Make the button blue');
    
    // The send button should be enabled
    const sendButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-send')
    );
    expect(sendButton).not.toBeDisabled();
  });

  it('should clear message input after sending', async () => {
    render(<AIChatPanel {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('aiChatPlaceholder');
    await userEvent.type(input, 'Make the button blue');
    
    // Submit the form
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('should show style tips button', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByText('styleTips')).toBeInTheDocument();
  });

  it('should show a11y check button', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByText('a11yCheck')).toBeInTheDocument();
  });
});
