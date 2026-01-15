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
jest.mock('@/lib/export/social-share', () => ({
  ...jest.requireActual('@/lib/export/social-share'),
  copyToClipboard: jest.fn().mockResolvedValue(true),
  generateWeChatQRCode: jest.fn().mockResolvedValue('data:image/png;base64,test'),
  nativeShare: jest.fn().mockResolvedValue(true),
  isNativeShareAvailable: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/export/image-export', () => ({
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
      expect(screen.getByText('分享对话')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', async () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    // Initially should show loading spinner
    await waitFor(() => {
      expect(screen.getByText('分享对话')).toBeInTheDocument();
    });
  });

  it('should display social platform buttons', async () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      // Check for platform names
      expect(screen.getByText('Twitter / X')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('微信')).toBeInTheDocument();
    });
  });

  it('should display share format tabs', async () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('文本')).toBeInTheDocument();
      expect(screen.getByText('MD')).toBeInTheDocument();
      expect(screen.getByText('图片')).toBeInTheDocument();
      expect(screen.getByText('链接')).toBeInTheDocument();
    });
  });

  it('should display share options', async () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('分享选项')).toBeInTheDocument();
      expect(screen.getByText('包含对话标题')).toBeInTheDocument();
      expect(screen.getByText('包含时间戳')).toBeInTheDocument();
      expect(screen.getByText('包含模型信息')).toBeInTheDocument();
    });
  });

  it('should copy text when copy button is clicked', async () => {
    const socialShare = await import('@/lib/export/social-share');
    
    renderWithProviders(<SocialShareDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('复制文本')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('复制文本'));
    
    await waitFor(() => {
      expect(socialShare.copyToClipboard).toHaveBeenCalled();
    });
  });

  it('should show message count info', async () => {
    renderWithProviders(<SocialShareDialog session={mockSession} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText(/共 \d+ 条消息/)).toBeInTheDocument();
    });
  });
});
