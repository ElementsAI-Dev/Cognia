/**
 * Tests for SocialShareDialog component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { SocialShareDialog } from './social-share-dialog';
import type { Session } from '@/types';

// Mock the message repository
jest.mock('@/lib/db', () => ({
  messageRepository: {
    getBySessionId: jest.fn().mockResolvedValue([
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        createdAt: new Date(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        createdAt: new Date(),
      },
    ]),
  },
}));

// Mock the export functions
jest.mock('@/lib/export/social/social-share', () => ({
  ...jest.requireActual('@/lib/export/social/social-share'),
  copyToClipboard: jest.fn().mockResolvedValue(true),
  generateWeChatQRCode: jest.fn().mockResolvedValue('data:image/png;base64,test'),
  nativeShare: jest.fn().mockResolvedValue(true),
  isNativeShareAvailable: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/export/image/image-export', () => ({
  exportToImage: jest.fn().mockResolvedValue({
    blob: new Blob(),
    dataUrl: 'data:image/png;base64,test',
    width: 800,
    height: 600,
    format: 'png',
  }),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockSession = {
  id: 'test-session',
  title: 'Test Conversation',
  provider: 'openai',
  model: 'gpt-4',
  mode: 'chat',
  createdAt: new Date(),
  updatedAt: new Date(),
} as Session;

const messages = {
  export: {
    share: 'Share',
    shareConversation: 'Share Conversation',
    shareConversationDesc: 'Share this conversation to social media or copy content',
    shareToLabel: 'Share to',
    textTab: 'Text',
    mdTab: 'MD',
    imageTab: 'Image',
    linkTab: 'Link',
    shareOptionsLabel: 'Share Options',
    includeTitleOption: 'Include Title',
    includeTimestampsShareOption: 'Include Timestamps',
    includeModelOption: 'Include Model Info',
    messagesInfo: '{count} messages (max {max})',
    copyTextBtn: 'Copy Text',
    copyMarkdownBtn: 'Copy Markdown',
    copyLinkBtn: 'Copy Link',
    exportImageBtn: 'Export Image',
    copied: 'Copied!',
    copiedToClipboard: 'Copied to clipboard',
    copyFailed: 'Copy failed',
    shareFailed: 'Share failed',
    qrCodeFailed: 'QR code generation failed',
    wechatScanToShare: 'Scan to Share',
    wechatScanHint: 'Scan with WeChat',
    close: 'Close',
    loading: 'Loading...',
    generating: 'Generating...',
    imageExported: 'Image exported',
    imageExportFailed: 'Image export failed',
    exportImageDescription: 'Export as image for easy sharing',
    useSystemShareBtn: 'Use System Share',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('SocialShareDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render trigger button', () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render custom trigger when provided', () => {
    renderWithProviders(
      <SocialShareDialog
        session={mockSession}
        trigger={<button data-testid="custom-trigger">Custom Share</button>}
      />
    );

    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  it('should open dialog when trigger is clicked', async () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Share Conversation')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', async () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    // Initially should show loading spinner
    await waitFor(() => {
      expect(screen.getByText('Share Conversation')).toBeInTheDocument();
    });
  });

  it('should display social platform buttons', async () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      // Check for share label and at least one platform
      expect(screen.getByText('Share to')).toBeInTheDocument();
    });

    // Platform buttons should be rendered as a grid
    const platformButtons = screen.getAllByRole('button');
    expect(platformButtons.length).toBeGreaterThan(1);
  });

  it('should display share format tabs', async () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('MD')).toBeInTheDocument();
      expect(screen.getByText('Image')).toBeInTheDocument();
      expect(screen.getByText('Link')).toBeInTheDocument();
    });
  });

  it('should display share options', async () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Share Options')).toBeInTheDocument();
      expect(screen.getByText('Include Title')).toBeInTheDocument();
      expect(screen.getByText('Include Timestamps')).toBeInTheDocument();
      expect(screen.getByText('Include Model Info')).toBeInTheDocument();
    });
  });

  it('should copy text when copy button is clicked', async () => {
    const socialShare = await import('@/lib/export/social/social-share');

    renderWithProviders(<SocialShareDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Copy Text')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Copy Text'));

    await waitFor(() => {
      expect(socialShare.copyToClipboard).toHaveBeenCalled();
    });
  });

  it('should show message count info', async () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/\d+ messages/)).toBeInTheDocument();
    });
  });
});
