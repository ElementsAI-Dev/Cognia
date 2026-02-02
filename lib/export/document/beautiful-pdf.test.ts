/**
 * Tests for beautiful-pdf.ts media export functionality
 */

import { generatePdfHTML, type PdfExportData } from './beautiful-pdf';
import type { UIMessage, Session } from '@/types';

const mockSession: Session = {
  id: 'session-123',
  title: 'Test Conversation',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T11:00:00Z'),
  provider: 'openai',
  model: 'gpt-4o',
  mode: 'chat',
};

const mockMessages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Hello',
    createdAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Hi there!',
    createdAt: new Date('2024-01-15T10:01:30Z'),
  },
];

const exportedAt = new Date('2024-01-15T12:00:00Z');

describe('generatePdfHTML', () => {
  it('should generate valid HTML document', () => {
    const data: PdfExportData = { session: mockSession, messages: mockMessages, exportedAt };
    const html = generatePdfHTML(data);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<head>');
    expect(html).toContain('</body>');
  });

  it('should include session title', () => {
    const html = generatePdfHTML({ session: mockSession, messages: mockMessages, exportedAt });
    expect(html).toContain('Test Conversation');
  });

  it('should include message content', () => {
    const html = generatePdfHTML({ session: mockSession, messages: mockMessages, exportedAt });
    expect(html).toContain('Hello');
    expect(html).toContain('Hi there!');
  });

  describe('with image parts', () => {
    const messagesWithImages: UIMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Here is the image:',
        createdAt: new Date('2024-01-15T10:01:30Z'),
        parts: [
          { type: 'text', content: 'Here is the image:' },
          {
            type: 'image',
            url: 'https://example.com/sunset.png',
            alt: 'A beautiful sunset',
            width: 1024,
            height: 768,
            isGenerated: true,
            prompt: 'Generate a beautiful sunset',
            revisedPrompt: 'A stunning sunset over the ocean',
          },
        ],
      },
    ];

    it('should render image block with AI badge', () => {
      const html = generatePdfHTML({ session: mockSession, messages: messagesWithImages, exportedAt });
      
      expect(html).toContain('media-block');
      expect(html).toContain('image-block');
      expect(html).toContain('ai-generated');
      expect(html).toContain('AI Generated');
    });

    it('should include image src and alt', () => {
      const html = generatePdfHTML({ session: mockSession, messages: messagesWithImages, exportedAt });
      
      expect(html).toContain('https://example.com/sunset.png');
      expect(html).toContain('A beautiful sunset');
    });

    it('should include image dimensions', () => {
      const html = generatePdfHTML({ session: mockSession, messages: messagesWithImages, exportedAt });
      expect(html).toContain('1024×768');
    });

    it('should include prompt details', () => {
      const html = generatePdfHTML({ session: mockSession, messages: messagesWithImages, exportedAt });
      
      expect(html).toContain('Generate a beautiful sunset');
      expect(html).toContain('Revised');
      expect(html).toContain('stunning sunset over the ocean');
    });

    it('should render base64 image', () => {
      const messagesWithBase64: UIMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Image:',
          createdAt: new Date('2024-01-15T10:01:30Z'),
          parts: [
            {
              type: 'image',
              url: '',
              base64: 'iVBORw0KGgoAAAANSUhEUg==',
              mimeType: 'image/png',
              isGenerated: true,
            },
          ],
        },
      ];

      const html = generatePdfHTML({ session: mockSession, messages: messagesWithBase64, exportedAt });
      expect(html).toContain('data:image/png;base64,');
    });

    it('should render non-AI image without badge', () => {
      const messagesWithRegularImage: UIMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Photo:',
          createdAt: new Date('2024-01-15T10:01:30Z'),
          parts: [
            {
              type: 'image',
              url: 'https://example.com/photo.jpg',
              alt: 'A photo',
            },
          ],
        },
      ];

      const html = generatePdfHTML({ session: mockSession, messages: messagesWithRegularImage, exportedAt });
      
      expect(html).toContain('image-block');
      expect(html).not.toContain('image-block ai-generated');
    });
  });

  describe('with video parts', () => {
    const messagesWithVideos: UIMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Here is the video:',
        createdAt: new Date('2024-01-15T10:01:30Z'),
        parts: [
          { type: 'text', content: 'Here is the video:' },
          {
            type: 'video',
            url: 'https://example.com/video.mp4',
            title: 'Dancing Cat',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            durationSeconds: 45,
            width: 1920,
            height: 1080,
            fps: 30,
            isGenerated: true,
            provider: 'google-veo',
            model: 'veo-2',
            prompt: 'A cat dancing to music',
          },
        ],
      },
    ];

    it('should render video block with AI badge', () => {
      const html = generatePdfHTML({ session: mockSession, messages: messagesWithVideos, exportedAt });
      
      expect(html).toContain('media-block');
      expect(html).toContain('video-block');
      expect(html).toContain('ai-generated');
      expect(html).toContain('AI Generated Video');
    });

    it('should include video title', () => {
      const html = generatePdfHTML({ session: mockSession, messages: messagesWithVideos, exportedAt });
      expect(html).toContain('Dancing Cat');
    });

    it('should include thumbnail as poster', () => {
      const html = generatePdfHTML({ session: mockSession, messages: messagesWithVideos, exportedAt });
      expect(html).toContain('https://example.com/thumb.jpg');
    });

    it('should include video metadata', () => {
      const html = generatePdfHTML({ session: mockSession, messages: messagesWithVideos, exportedAt });
      
      expect(html).toContain('45s'); // Duration (under 1 min shows as Xs)
      expect(html).toContain('1920×1080'); // Dimensions
      expect(html).toContain('30fps'); // FPS
    });

    it('should include provider and model info', () => {
      const html = generatePdfHTML({ session: mockSession, messages: messagesWithVideos, exportedAt });
      
      expect(html).toContain('google-veo');
      expect(html).toContain('veo-2');
    });

    it('should include video prompt', () => {
      const html = generatePdfHTML({ session: mockSession, messages: messagesWithVideos, exportedAt });
      expect(html).toContain('A cat dancing to music');
    });

    it('should render video without optional metadata', () => {
      const minimalVideo: UIMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Video:',
          createdAt: new Date('2024-01-15T10:01:30Z'),
          parts: [
            {
              type: 'video',
              url: 'https://example.com/simple.mp4',
            },
          ],
        },
      ];

      const html = generatePdfHTML({ session: mockSession, messages: minimalVideo, exportedAt });
      
      expect(html).toContain('video-block');
      expect(html).toContain('https://example.com/simple.mp4');
      expect(html).not.toContain('video-block ai-generated');
    });

    it('should format long duration correctly', () => {
      const longVideo: UIMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Video:',
          createdAt: new Date('2024-01-15T10:01:30Z'),
          parts: [
            {
              type: 'video',
              url: 'https://example.com/video.mp4',
              durationSeconds: 125, // 2:05
            },
          ],
        },
      ];

      const html = generatePdfHTML({ session: mockSession, messages: longVideo, exportedAt });
      expect(html).toContain('2:05');
    });
  });

  describe('media CSS styles', () => {
    it('should include media block styles', () => {
      const html = generatePdfHTML({ session: mockSession, messages: mockMessages, exportedAt });
      
      expect(html).toContain('.media-block');
      expect(html).toContain('.ai-badge');
      expect(html).toContain('.media-caption');
    });

    it('should include print-friendly styles', () => {
      const html = generatePdfHTML({ session: mockSession, messages: mockMessages, exportedAt });
      
      expect(html).toContain('@media print');
      expect(html).toContain('page-break');
    });
  });
});
