/**
 * AgentTeamChat component tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock store data
let mockTeams: Record<string, unknown> = {};
let mockTeammates: Record<string, unknown> = {};
let mockMessages: Record<string, unknown> = {};
const mockAddMessage = jest.fn((input: Record<string, unknown>) => ({
  id: 'msg-new',
  ...input,
  senderName: 'Lead',
  timestamp: new Date(),
}));

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      teams: mockTeams,
      teammates: mockTeammates,
      messages: mockMessages,
      addMessage: mockAddMessage,
    };
    return selector(state);
  },
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'messages.noMessages': 'No messages yet',
      'messages.broadcast': 'Broadcast to All',
      'messages.messageTo': 'Message',
    };
    return translations[key] || key;
  },
}));

import { AgentTeamChat } from './agent-team-chat';

describe('AgentTeamChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTeams = {};
    mockTeammates = {};
    mockMessages = {};
  });

  it('should return null when team does not exist', () => {
    const { container } = render(<AgentTeamChat teamId="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });

  it('should show empty state when no messages', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        leadId: 'lead-1',
        teammateIds: ['lead-1'],
        messageIds: [],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
    };

    render(<AgentTeamChat teamId="t1" />);
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('should render messages', () => {
    mockMessages = {
      'msg-1': {
        id: 'msg-1',
        senderId: 'lead-1',
        senderName: 'Lead Agent',
        recipientName: null,
        type: 'broadcast',
        content: 'Hello team, let us begin.',
        timestamp: new Date('2025-01-01T10:00:00Z'),
      },
      'msg-2': {
        id: 'msg-2',
        senderId: 'tm-1',
        senderName: 'Researcher',
        recipientName: 'Lead Agent',
        type: 'direct',
        content: 'Ready to start!',
        timestamp: new Date('2025-01-01T10:01:00Z'),
      },
    };
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        leadId: 'lead-1',
        teammateIds: ['lead-1', 'tm-1'],
        messageIds: ['msg-1', 'msg-2'],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead Agent', role: 'lead', status: 'idle' },
      'tm-1': { id: 'tm-1', name: 'Researcher', role: 'worker', status: 'idle' },
    };

    render(<AgentTeamChat teamId="t1" />);
    expect(screen.getByText('Hello team, let us begin.')).toBeInTheDocument();
    expect(screen.getByText('Ready to start!')).toBeInTheDocument();
  });

  it('should render the message input and send button', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        leadId: 'lead-1',
        teammateIds: ['lead-1'],
        messageIds: [],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
    };

    render(<AgentTeamChat teamId="t1" />);
    const input = screen.getByPlaceholderText(/Broadcast/);
    expect(input).toBeInTheDocument();
  });

  it('should send broadcast message when typing and clicking send', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        leadId: 'lead-1',
        teammateIds: ['lead-1', 'tm-1'],
        messageIds: [],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
      'tm-1': { id: 'tm-1', name: 'Worker', role: 'worker', status: 'idle' },
    };

    render(<AgentTeamChat teamId="t1" />);

    const input = screen.getByPlaceholderText(/Broadcast/);
    fireEvent.change(input, { target: { value: 'Hello everyone!' } });

    // Find send button (it's the last button with Send icon)
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    fireEvent.click(sendButton);

    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 't1',
        senderId: 'lead-1',
        content: 'Hello everyone!',
        type: 'broadcast',
      })
    );
  });

  it('should send message on Enter key', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        leadId: 'lead-1',
        teammateIds: ['lead-1'],
        messageIds: [],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
    };

    render(<AgentTeamChat teamId="t1" />);

    const input = screen.getByPlaceholderText(/Broadcast/);
    fireEvent.change(input, { target: { value: 'Enter test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Enter test',
        type: 'broadcast',
      })
    );
  });

  it('should not send empty messages', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        leadId: 'lead-1',
        teammateIds: ['lead-1'],
        messageIds: [],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
    };

    render(<AgentTeamChat teamId="t1" />);

    const input = screen.getByPlaceholderText(/Broadcast/);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockAddMessage).not.toHaveBeenCalled();
  });

  it('should render recipient selector with teammate list', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        leadId: 'lead-1',
        teammateIds: ['lead-1', 'tm-1', 'tm-2'],
        messageIds: [],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
      'tm-1': { id: 'tm-1', name: 'Security Expert', role: 'worker', status: 'executing' },
      'tm-2': { id: 'tm-2', name: 'Perf Analyst', role: 'worker', status: 'idle' },
    };

    render(<AgentTeamChat teamId="t1" />);

    // Default shows broadcast button
    const recipientButton = screen.getByText('Broadcast to All');
    expect(recipientButton).toBeInTheDocument();
  });

  it('should display sender name and message content in bubbles', () => {
    mockMessages = {
      'msg-1': {
        id: 'msg-1',
        senderId: 'tm-1',
        senderName: 'SecurityBot',
        recipientName: null,
        type: 'broadcast',
        content: 'Found 3 vulnerabilities.',
        timestamp: new Date('2025-01-01T10:00:00Z'),
      },
    };
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        leadId: 'lead-1',
        teammateIds: ['lead-1', 'tm-1'],
        messageIds: ['msg-1'],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
      'tm-1': { id: 'tm-1', name: 'SecurityBot', role: 'worker', status: 'completed' },
    };

    render(<AgentTeamChat teamId="t1" />);
    expect(screen.getByText('SecurityBot')).toBeInTheDocument();
    expect(screen.getByText('Found 3 vulnerabilities.')).toBeInTheDocument();
  });

  it('should show recipient name in direct messages', () => {
    mockMessages = {
      'msg-1': {
        id: 'msg-1',
        senderId: 'lead-1',
        senderName: 'Lead',
        recipientName: 'Worker A',
        type: 'direct',
        content: 'Please focus on auth module.',
        timestamp: new Date('2025-01-01T10:00:00Z'),
      },
    };
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        leadId: 'lead-1',
        teammateIds: ['lead-1'],
        messageIds: ['msg-1'],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
    };

    render(<AgentTeamChat teamId="t1" />);
    expect(screen.getByText('→ Worker A')).toBeInTheDocument();
  });
});
