/**
 * Tests for Social Share functionality
 */

import {
  generateShareLink,
  generateAllShareLinks,
  generateShareContent,
  copyToClipboard,
  generateOpenGraphMeta,
  isNativeShareAvailable,
  generateShareableMarkdown,
  PLATFORM_CONFIGS,
  type SocialPlatform,
} from './social-share';
import type { Session, UIMessage } from '@/types';

// Mock session and messages for testing
const mockSession = {
  id: 'test-session-id',
  title: 'Test Conversation',
  provider: 'openai',
  model: 'gpt-4',
  mode: 'chat',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z'),
} as Session;

const mockMessages = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, how are you?',
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'I am doing well, thank you for asking!',
    createdAt: new Date('2024-01-01T10:01:00Z'),
  },
] as UIMessage[];

describe('Social Share', () => {
  describe('PLATFORM_CONFIGS', () => {
    it('should have all required platforms configured', () => {
      const platforms: SocialPlatform[] = [
        'twitter', 'linkedin', 'reddit', 'wechat', 'weibo', 'telegram', 'facebook', 'email'
      ];
      
      platforms.forEach(platform => {
        expect(PLATFORM_CONFIGS[platform]).toBeDefined();
        expect(PLATFORM_CONFIGS[platform].name).toBeTruthy();
        expect(PLATFORM_CONFIGS[platform].maxLength).toBeGreaterThan(0);
      });
    });
  });

  describe('generateShareLink', () => {
    it('should generate Twitter share link', () => {
      const link = generateShareLink('twitter', {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        hashtags: ['AI', 'Chat'],
      });
      
      expect(link).toContain('twitter.com/intent/tweet');
      expect(link).toContain('url=');
      expect(link).toContain('hashtags=');
    });

    it('should generate LinkedIn share link', () => {
      const link = generateShareLink('linkedin', {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
      });
      
      expect(link).toContain('linkedin.com/sharing/share-offsite');
      expect(link).toContain('url=');
    });

    it('should generate Reddit share link', () => {
      const link = generateShareLink('reddit', {
        title: 'Test Title',
        url: 'https://example.com',
      });
      
      expect(link).toContain('reddit.com/submit');
      expect(link).toContain('title=');
    });

    it('should generate Telegram share link', () => {
      const link = generateShareLink('telegram', {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
      });
      
      expect(link).toContain('t.me/share/url');
    });

    it('should generate Facebook share link', () => {
      const link = generateShareLink('facebook', {
        title: 'Test Title',
        url: 'https://example.com',
      });
      
      expect(link).toContain('facebook.com/sharer');
    });

    it('should generate email link', () => {
      const link = generateShareLink('email', {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
      });
      
      expect(link).toContain('mailto:');
      expect(link).toContain('subject=');
      expect(link).toContain('body=');
    });

    it('should return empty string for WeChat (requires QR code)', () => {
      const link = generateShareLink('wechat', {
        title: 'Test Title',
      });
      
      expect(link).toBe('');
    });
  });

  describe('generateAllShareLinks', () => {
    it('should generate links for all platforms', () => {
      const links = generateAllShareLinks({
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
      });
      
      expect(Object.keys(links)).toHaveLength(8);
      expect(links.twitter).toContain('twitter.com');
      expect(links.linkedin).toContain('linkedin.com');
      expect(links.reddit).toContain('reddit.com');
    });
  });

  describe('generateShareContent', () => {
    it('should generate share content from session and messages', () => {
      const content = generateShareContent(mockSession, mockMessages);
      
      expect(content.title).toBe(mockSession.title);
      expect(content.messageCount).toBe(mockMessages.length);
      expect(content.text).toContain('👤 用户');
      expect(content.text).toContain('🤖 助手');
    });

    it('should include model info when requested', () => {
      const content = generateShareContent(mockSession, mockMessages, {
        includeModel: true,
      });
      
      expect(content.text).toContain(mockSession.model);
    });

    it('should limit messages when maxMessages is set', () => {
      const content = generateShareContent(mockSession, mockMessages, {
        maxMessages: 1,
      });
      
      expect(content.text).toContain('还有 1 条消息');
    });
  });

  describe('generateOpenGraphMeta', () => {
    it('should generate Open Graph meta tags', () => {
      const meta = generateOpenGraphMeta({
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        imageUrl: 'https://example.com/image.png',
      });
      
      expect(meta).toContain('og:title');
      expect(meta).toContain('og:description');
      expect(meta).toContain('og:url');
      expect(meta).toContain('og:image');
      expect(meta).toContain('twitter:card');
    });
  });

  describe('generateShareableMarkdown', () => {
    it('should generate markdown content', () => {
      const markdown = generateShareableMarkdown(mockSession, mockMessages);
      
      expect(markdown).toContain(`# ${mockSession.title}`);
      expect(markdown).toContain('**用户**');
      expect(markdown).toContain('**助手**');
      expect(markdown).toContain('导出自 Cognia');
    });

    it('should include metadata when requested', () => {
      const markdown = generateShareableMarkdown(mockSession, mockMessages, {
        includeMetadata: true,
      });
      
      expect(markdown).toContain('**模型**');
      expect(markdown).toContain('**模式**');
    });
  });

  describe('copyToClipboard', () => {
    it('should copy text to clipboard', async () => {
      // Mock clipboard API
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });
      
      const result = await copyToClipboard('Test content');
      
      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('Test content');
    });
  });

  describe('isNativeShareAvailable', () => {
    it('should return false when navigator.share is not available', () => {
      // navigator.share is typically not available in test environment
      expect(isNativeShareAvailable()).toBe(false);
    });
  });

  describe('generateShareLink edge cases', () => {
    it('should handle empty title', () => {
      const link = generateShareLink('twitter', {
        title: '',
        description: 'Test',
      });
      
      expect(link).toContain('twitter.com');
    });

    it('should handle special characters in content', () => {
      const link = generateShareLink('twitter', {
        title: 'Test & <script>alert("xss")</script>',
        description: 'Special chars: 你好 🚀',
      });
      
      expect(link).toContain('twitter.com');
      // Should be URL encoded
      expect(link).not.toContain('<script>');
    });

    it('should handle very long content by truncating', () => {
      const longText = 'A'.repeat(1000);
      const link = generateShareLink('twitter', {
        title: longText,
        description: longText,
      });
      
      // Twitter has 280 char limit, should be truncated
      expect(link.length).toBeLessThan(2000);
    });

    it('should handle weibo share link', () => {
      const link = generateShareLink('weibo', {
        title: '测试标题',
        description: '测试描述',
        url: 'https://example.com',
      });
      
      expect(link).toContain('weibo.com');
      expect(link).toContain('share.php');
    });
  });

  describe('generateShareContent edge cases', () => {
    it('should handle empty messages array', () => {
      const content = generateShareContent(mockSession, []);
      
      expect(content.messageCount).toBe(0);
      expect(content.title).toBe(mockSession.title);
    });

    it('should handle messages without timestamps option', () => {
      const content = generateShareContent(mockSession, mockMessages, {
        includeTimestamps: false,
      });
      
      // Should not include timestamp format
      expect(content.text).not.toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('should include HTML content', () => {
      const content = generateShareContent(mockSession, mockMessages);
      
      expect(content.html).toBeDefined();
      expect(content.html).toContain('<h2>');
      expect(content.html).toContain('<p>');
    });

    it('should generate summary from first user message', () => {
      const content = generateShareContent(mockSession, mockMessages);
      
      expect(content.summary).toBeTruthy();
      expect(content.summary.length).toBeLessThanOrEqual(200);
    });
  });

  describe('generateShareableMarkdown edge cases', () => {
    it('should handle empty messages', () => {
      const markdown = generateShareableMarkdown(mockSession, []);
      
      expect(markdown).toContain(`# ${mockSession.title}`);
      expect(markdown).toContain('导出自 Cognia');
    });

    it('should respect maxMessages limit', () => {
      const markdown = generateShareableMarkdown(mockSession, mockMessages, {
        maxMessages: 1,
      });
      
      expect(markdown).toContain('还有 1 条消息');
    });

    it('should exclude metadata when not requested', () => {
      const markdown = generateShareableMarkdown(mockSession, mockMessages, {
        includeMetadata: false,
      });
      
      expect(markdown).not.toContain('**模型**');
    });
  });
});
