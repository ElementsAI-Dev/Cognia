/**
 * Tests for CollabToolbar component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { CollabToolbar } from './collab-toolbar';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      startSession: 'Start Collaboration',
      shareLink: 'Share Link',
      leaveSession: 'Leave Session',
      you: 'Your name',
      inviteCollaborators: 'Invite Collaborators',
      linkCopied: 'Link copied!',
    };
    return translations[key] || key;
  },
}));

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockShareSession = jest.fn();
const mockSetParticipantInfo = jest.fn();

jest.mock('@/hooks/designer', () => ({
  useDesignerCollaboration: () => ({
    session: null,
    participants: [],
    connectionState: 'disconnected',
    isConnected: false,
    localParticipant: null,
    remoteCursors: [],
    connect: mockConnect,
    disconnect: mockDisconnect,
    shareSession: mockShareSession,
    setParticipantInfo: mockSetParticipantInfo,
    updateCode: jest.fn(),
    updateCursor: jest.fn(),
    updateSelection: jest.fn(),
    getCode: jest.fn(),
    joinSession: jest.fn(),
  }),
}));

describe('CollabToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render start session button when not connected', () => {
    render(<CollabToolbar documentId="doc-123" />);

    expect(screen.getByText('Start Collaboration')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CollabToolbar documentId="doc-123" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should open popover on start session click', () => {
    render(<CollabToolbar documentId="doc-123" />);

    const startButton = screen.getByText('Start Collaboration');
    fireEvent.click(startButton);

    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
  });

  it('should handle name input change', () => {
    render(<CollabToolbar documentId="doc-123" />);

    const startButton = screen.getByText('Start Collaboration');
    fireEvent.click(startButton);

    const nameInput = screen.getByPlaceholderText('Your name');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });

    expect(nameInput).toHaveValue('Test User');
  });
});

describe('CollabToolbar - Connected State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    jest.doMock('@/hooks/designer', () => ({
      useDesignerCollaboration: () => ({
        session: { id: 'session-123' },
        participants: [
          { id: 'user-1', name: 'Alice', color: '#3b82f6', isOnline: true, lastActive: new Date() },
        ],
        connectionState: 'connected',
        isConnected: true,
        localParticipant: { id: 'user-1', name: 'Alice', color: '#3b82f6' },
        remoteCursors: [],
        connect: mockConnect,
        disconnect: mockDisconnect,
        shareSession: mockShareSession.mockReturnValue('serialized-session'),
        setParticipantInfo: mockSetParticipantInfo,
        updateCode: jest.fn(),
        updateCursor: jest.fn(),
        updateSelection: jest.fn(),
        getCode: jest.fn(),
        joinSession: jest.fn(),
      }),
    }));
  });

  it('should render when connected', () => {
    render(<CollabToolbar documentId="doc-123" />);

    // Component should render without errors
    expect(screen.getByText('Start Collaboration')).toBeInTheDocument();
  });
});
