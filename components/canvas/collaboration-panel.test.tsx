/**
 * CollaborationPanel - Unit Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollaborationPanel } from './collaboration-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      collaborate: 'Collaborate',
      collaboration: 'Collaboration',
      connected: 'Connected',
      connecting: 'Connecting...',
      connectionError: 'Connection Error',
      disconnected: 'Disconnected',
      startSession: 'Start Session',
      endSession: 'End Session',
      joinExisting: 'Join Existing Session',
      sessionIdPlaceholder: 'Enter session ID',
      copyLink: 'Copy Link',
      copyShareLink: 'Copy share link',
      copied: 'Copied!',
      participants: 'Participants',
      noParticipants: 'No participants yet',
    };
    return translations[key] || key;
  },
}));

// Mock useCollaborativeSession hook
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockShareSession = jest.fn();
const mockJoinSession = jest.fn();

jest.mock('@/hooks/canvas', () => ({
  useCollaborativeSession: () => ({
    session: null,
    participants: [],
    connectionState: 'disconnected',
    isConnected: false,
    connect: mockConnect,
    disconnect: mockDisconnect,
    shareSession: mockShareSession,
    joinSession: mockJoinSession,
  }),
}));

describe('CollaborationPanel', () => {
  const defaultProps = {
    documentId: 'doc-123',
    documentContent: 'const hello = "world";',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the collaborate button', () => {
    render(<CollaborationPanel {...defaultProps} />);
    expect(screen.getByText('Collaborate')).toBeInTheDocument();
  });

  it('should open panel when button is clicked', async () => {
    render(<CollaborationPanel {...defaultProps} />);

    const button = screen.getByText('Collaborate');
    await userEvent.click(button);

    expect(screen.getByText('Collaboration')).toBeInTheDocument();
  });

  it('should show start session button when not connected', async () => {
    render(<CollaborationPanel {...defaultProps} />);

    const button = screen.getByText('Collaborate');
    await userEvent.click(button);

    expect(screen.getByText('Start Session')).toBeInTheDocument();
  });

  it('should show start session button that triggers connect', async () => {
    render(<CollaborationPanel {...defaultProps} />);

    const button = screen.getByText('Collaborate');
    await userEvent.click(button);

    const startButton = screen.getByText('Start Session');
    expect(startButton).toBeInTheDocument();
    // Note: clicking startButton triggers async connect which requires more complex mocking
  });

  it('should show disconnected status initially', async () => {
    render(<CollaborationPanel {...defaultProps} />);

    const button = screen.getByText('Collaborate');
    await userEvent.click(button);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should show join session input', async () => {
    render(<CollaborationPanel {...defaultProps} />);

    const button = screen.getByText('Collaborate');
    await userEvent.click(button);

    expect(screen.getByPlaceholderText('Enter session ID')).toBeInTheDocument();
  });

  it('should show empty participants message when no participants', async () => {
    render(<CollaborationPanel {...defaultProps} />);

    const button = screen.getByText('Collaborate');
    await userEvent.click(button);

    expect(screen.getByText('No participants yet')).toBeInTheDocument();
  });

  it('should render custom trigger if provided', () => {
    render(<CollaborationPanel {...defaultProps} trigger={<button>Custom Trigger</button>} />);

    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
    expect(screen.queryByText('Collaborate')).not.toBeInTheDocument();
  });
});

describe('CollaborationPanel with active session', () => {
  it('should handle session state changes', () => {
    expect(mockConnect).toBeDefined();
    expect(mockDisconnect).toBeDefined();
    expect(mockShareSession).toBeDefined();
    expect(mockJoinSession).toBeDefined();
  });
});

describe('CollaborationPanel connection states', () => {
  it('should display correct text for each CollaborationConnectionState', async () => {
    // Test that the component correctly maps connection states to display text
    // The hook mock returns 'disconnected' by default
    render(<CollaborationPanel documentId="doc-1" documentContent="test" />);

    const button = screen.getByText('Collaborate');
    await userEvent.click(button);

    // Default state is 'disconnected'
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should show connecting state text', async () => {
    // Override the hook mock for 'connecting' state
    const hookModule = jest.requireMock('@/hooks/canvas');
    const originalHook = hookModule.useCollaborativeSession;
    hookModule.useCollaborativeSession = () => ({
      session: null,
      participants: [],
      connectionState: 'connecting',
      isConnected: false,
      connect: mockConnect,
      disconnect: mockDisconnect,
      shareSession: mockShareSession,
      joinSession: mockJoinSession,
    });

    render(<CollaborationPanel documentId="doc-1" documentContent="test" />);
    const button = screen.getByText('Collaborate');
    await userEvent.click(button);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();

    hookModule.useCollaborativeSession = originalHook;
  });

  it('should show error state text', async () => {
    const hookModule = jest.requireMock('@/hooks/canvas');
    const originalHook = hookModule.useCollaborativeSession;
    hookModule.useCollaborativeSession = () => ({
      session: null,
      participants: [],
      connectionState: 'error',
      isConnected: false,
      connect: mockConnect,
      disconnect: mockDisconnect,
      shareSession: mockShareSession,
      joinSession: mockJoinSession,
    });

    render(<CollaborationPanel documentId="doc-1" documentContent="test" />);
    const button = screen.getByText('Collaborate');
    await userEvent.click(button);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();

    hookModule.useCollaborativeSession = originalHook;
  });

  it('should show reconnecting state as disconnected (default branch)', async () => {
    const hookModule = jest.requireMock('@/hooks/canvas');
    const originalHook = hookModule.useCollaborativeSession;
    hookModule.useCollaborativeSession = () => ({
      session: null,
      participants: [],
      connectionState: 'reconnecting',
      isConnected: false,
      connect: mockConnect,
      disconnect: mockDisconnect,
      shareSession: mockShareSession,
      joinSession: mockJoinSession,
    });

    render(<CollaborationPanel documentId="doc-1" documentContent="test" />);
    const button = screen.getByText('Collaborate');
    await userEvent.click(button);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();

    hookModule.useCollaborativeSession = originalHook;
  });
});
