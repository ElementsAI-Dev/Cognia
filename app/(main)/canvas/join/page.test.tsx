/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CanvasJoinPage from './page';

const mockSearchParams = new URLSearchParams();
const mockReplace = jest.fn();
const mockCreateCanvasDocument = jest.fn(() => 'canvas-doc-1');
const mockSetActiveCanvas = jest.fn();
const mockOpenPanel = jest.fn();

const mockDeserializeState = jest.fn();
const mockGetSession = jest.fn();
const mockGetDocumentContent = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/stores', () => ({
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createCanvasDocument: mockCreateCanvasDocument,
      setActiveCanvas: mockSetActiveCanvas,
      openPanel: mockOpenPanel,
    };
    return selector(state);
  },
}));

jest.mock('@/lib/canvas/collaboration/crdt-store', () => ({
  crdtStore: {
    deserializeState: (...args: unknown[]) => mockDeserializeState(...args),
    getSession: (...args: unknown[]) => mockGetSession(...args),
    getDocumentContent: (...args: unknown[]) => mockGetDocumentContent(...args),
  },
}));

describe('CanvasJoinPage', () => {
  beforeEach(() => {
    mockSearchParams.delete('session');
    jest.clearAllMocks();
  });

  it('shows missing payload message when session query is absent', async () => {
    render(<CanvasJoinPage />);

    await waitFor(() => {
      expect(screen.getByTestId('canvas-join-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Missing shared session payload.')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows invalid payload message when session is malformed', async () => {
    mockSearchParams.set('session', '%7Binvalid-json');

    render(<CanvasJoinPage />);

    await waitFor(() => {
      expect(screen.getByTestId('canvas-join-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Invalid shared session payload.')).toBeInTheDocument();
  });

  it('imports shared session and redirects to root with canvas opened', async () => {
    const serialized = JSON.stringify({
      session: { id: 'session-1234' },
      document: { id: 'doc-1', content: '# Shared canvas content' },
    });

    mockSearchParams.set('session', encodeURIComponent(serialized));
    mockDeserializeState.mockReturnValue('session-1234');
    mockGetSession.mockReturnValue({ id: 'session-1234' });
    mockGetDocumentContent.mockReturnValue('# Shared canvas content');

    render(<CanvasJoinPage />);

    await waitFor(() => {
      expect(mockCreateCanvasDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'shared-session-1234',
          title: 'Shared Canvas session-',
          content: '# Shared canvas content',
        })
      );
    });

    expect(mockSetActiveCanvas).toHaveBeenCalledWith('canvas-doc-1');
    expect(mockOpenPanel).toHaveBeenCalledWith('canvas');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});