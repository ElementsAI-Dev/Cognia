/**
 * Tests for useSocialShare hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSocialShare } from './use-social-share';
import type { Session, UIMessage } from '@/types';

jest.mock('@/lib/export/social/social-share', () => ({
  generateShareContent: jest.fn(() => ({
    title: 'Test Session',
    text: 'User: Hello\nAssistant: Hi',
    summary: 'A test conversation',
  })),
  openSharePopup: jest.fn(),
  copyToClipboard: jest.fn().mockResolvedValue(true),
  generateWeChatQRCode: jest.fn().mockResolvedValue('data:image/png;base64,qr'),
  nativeShare: jest.fn().mockResolvedValue(true),
  generateShareableMarkdown: jest.fn(() => '# Test\n\nMarkdown content'),
}));

jest.mock('@/lib/export/image/image-export', () => ({
  exportToImage: jest.fn().mockResolvedValue({ dataUrl: 'data:image/png;base64,img' }),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockSession = {
  id: 'session-1',
  title: 'Test Session',
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Session;

const mockMessages = [
  { id: 'msg-1', role: 'user', content: 'Hello' },
  { id: 'msg-2', role: 'assistant', content: 'Hi there' },
] as unknown as UIMessage[];

const mockT = jest.fn((key: string) => key);

describe('useSocialShare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSocialShare(mockSession, mockMessages, mockT));

    expect(result.current.shareFormat).toBe('text');
    expect(result.current.copied).toBe(false);
    expect(result.current.wechatQR).toBeNull();
    expect(result.current.isGeneratingImage).toBe(false);
    expect(result.current.includeTitle).toBe(true);
    expect(result.current.includeTimestamps).toBe(false);
    expect(result.current.includeModel).toBe(true);
    expect(result.current.maxMessages).toBe(10);
  });

  it('should generate content from messages', () => {
    const { result } = renderHook(() => useSocialShare(mockSession, mockMessages, mockT));

    expect(result.current.content).not.toBeNull();
    expect(result.current.content?.title).toBe('Test Session');
  });

  it('should return null content when no messages', () => {
    const { result } = renderHook(() => useSocialShare(mockSession, [] as unknown as UIMessage[], mockT));

    expect(result.current.content).toBeNull();
  });

  it('should allow changing share format', () => {
    const { result } = renderHook(() => useSocialShare(mockSession, mockMessages, mockT));

    act(() => {
      result.current.setShareFormat('markdown');
    });

    expect(result.current.shareFormat).toBe('markdown');
  });

  it('should toggle share options', () => {
    const { result } = renderHook(() => useSocialShare(mockSession, mockMessages, mockT));

    act(() => {
      result.current.setIncludeTitle(false);
      result.current.setIncludeTimestamps(true);
      result.current.setIncludeModel(false);
    });

    expect(result.current.includeTitle).toBe(false);
    expect(result.current.includeTimestamps).toBe(true);
    expect(result.current.includeModel).toBe(false);
  });

  it('should handle platform share', async () => {
    const { openSharePopup } = jest.requireMock('@/lib/export/social/social-share');
    const { result } = renderHook(() => useSocialShare(mockSession, mockMessages, mockT));

    await act(async () => {
      await result.current.handlePlatformShare('twitter');
    });

    expect(openSharePopup).toHaveBeenCalledWith('twitter', expect.objectContaining({
      title: 'Test Session',
    }));
  });

  it('should generate QR code for wechat', async () => {
    const { result } = renderHook(() => useSocialShare(mockSession, mockMessages, mockT));

    await act(async () => {
      await result.current.handlePlatformShare('wechat');
    });

    expect(result.current.wechatQR).toBe('data:image/png;base64,qr');
  });

  it('should close QR code', async () => {
    const { result } = renderHook(() => useSocialShare(mockSession, mockMessages, mockT));

    await act(async () => {
      await result.current.handlePlatformShare('wechat');
    });

    expect(result.current.wechatQR).not.toBeNull();

    act(() => {
      result.current.closeQRCode();
    });

    expect(result.current.wechatQR).toBeNull();
  });

  it('should handle copy', async () => {
    const { copyToClipboard } = jest.requireMock('@/lib/export/social/social-share');
    const { result } = renderHook(() => useSocialShare(mockSession, mockMessages, mockT));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(copyToClipboard).toHaveBeenCalled();
  });

  it('should handle native share', async () => {
    const { nativeShare } = jest.requireMock('@/lib/export/social/social-share');
    const { result } = renderHook(() => useSocialShare(mockSession, mockMessages, mockT));

    await act(async () => {
      await result.current.handleNativeShare();
    });

    expect(nativeShare).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Session',
    }));
  });

  it('should handle image export', async () => {
    const { exportToImage } = jest.requireMock('@/lib/export/image/image-export');
    const { result } = renderHook(() => useSocialShare(mockSession, mockMessages, mockT));

    // Mock link click
    const mockClick = jest.fn();
    jest.spyOn(document, 'createElement').mockReturnValue({ href: '', download: '', click: mockClick } as unknown as HTMLElement);

    await act(async () => {
      await result.current.handleImageExport();
    });

    expect(exportToImage).toHaveBeenCalled();
    expect(result.current.isGeneratingImage).toBe(false);

    jest.restoreAllMocks();
  });
});
