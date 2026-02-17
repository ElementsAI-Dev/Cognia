/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CollabToolbar } from './collab-toolbar';

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockShareSession = jest.fn();
const mockSetParticipantInfo = jest.fn();
const mockImportSharedSession = jest.fn();
const mockJoinSession = jest.fn();

let latestHookConfig: {
  onRemoteCodeChange?: (code: string) => void;
} | null = null;

let mockHookState: {
  session: { id: string } | null;
  participants: Array<{ id: string; name: string; color: string; isOnline: boolean; lastActive: Date }>;
  connectionState: 'connected' | 'disconnected' | 'connecting' | 'error' | 'reconnecting';
  isConnected: boolean;
  localParticipant: { id: string; name: string; color: string } | null;
  remoteCursors: unknown[];
  connect: typeof mockConnect;
  disconnect: typeof mockDisconnect;
  shareSession: typeof mockShareSession;
  setParticipantInfo: typeof mockSetParticipantInfo;
  importSharedSession: typeof mockImportSharedSession;
  joinSession: typeof mockJoinSession;
  updateCode: jest.Mock;
  updateCursor: jest.Mock;
  updateSelection: jest.Mock;
  getCode: jest.Mock;
};

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

jest.mock('@/hooks/designer', () => ({
  useDesignerCollaboration: (config: { onRemoteCodeChange?: (code: string) => void }) => {
    latestHookConfig = config;
    return mockHookState;
  },
}));

describe('CollabToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestHookConfig = null;
    mockHookState = {
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
      importSharedSession: mockImportSharedSession,
      joinSession: mockJoinSession,
      updateCode: jest.fn(),
      updateCursor: jest.fn(),
      updateSelection: jest.fn(),
      getCode: jest.fn(),
    };
  });

  it('renders start session button when disconnected', () => {
    render(<CollabToolbar documentId="doc-123" />);
    expect(screen.getByText('Start Collaboration')).toBeInTheDocument();
  });

  it('starts collaboration with document id and initial code', async () => {
    mockConnect.mockResolvedValue('session-1');

    render(<CollabToolbar documentId="doc-123" initialCode="<div>init</div>" />);

    fireEvent.click(screen.getByText('Start Collaboration'));
    const startButtons = screen.getAllByText('Start Collaboration');
    fireEvent.click(startButtons[startButtons.length - 1]);

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith('doc-123', '<div>init</div>');
    });
  });

  it('bridges deprecated onCodeUpdate and new onRemoteCodeChange', () => {
    const onCodeUpdate = jest.fn();
    const onRemoteCodeChange = jest.fn();

    render(
      <CollabToolbar
        documentId="doc-123"
        onCodeUpdate={onCodeUpdate}
        onRemoteCodeChange={onRemoteCodeChange}
      />
    );

    latestHookConfig?.onRemoteCodeChange?.('updated-code');

    expect(onRemoteCodeChange).toHaveBeenCalledWith('updated-code');
    expect(onCodeUpdate).toHaveBeenCalledWith('updated-code');
  });

  it('imports serialized session and joins automatically', async () => {
    mockImportSharedSession.mockResolvedValue('imported-session');
    mockJoinSession.mockResolvedValue(undefined);

    render(<CollabToolbar sharedSessionSerialized="serialized" />);

    await waitFor(() => {
      expect(mockImportSharedSession).toHaveBeenCalledWith('serialized');
      expect(mockJoinSession).toHaveBeenCalledWith('imported-session');
    });
  });

  it('builds join link using /designer/join?session when sharing', async () => {
    mockHookState = {
      ...mockHookState,
      session: { id: 'session-1' },
      participants: [{ id: 'u1', name: 'Alice', color: '#3b82f6', isOnline: true, lastActive: new Date() }],
      connectionState: 'connected',
      isConnected: true,
      localParticipant: { id: 'u1', name: 'Alice', color: '#3b82f6' },
    };
    mockShareSession.mockReturnValue('serialized-session');

    render(<CollabToolbar documentId="doc-123" />);
    fireEvent.click(screen.getByText('Share Link'));

    const shareInput = screen.getByDisplayValue(
      `${window.location.origin}/designer/join?session=${encodeURIComponent('serialized-session')}`
    );
    expect(shareInput).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<CollabToolbar className="custom-class" documentId="doc-123" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

