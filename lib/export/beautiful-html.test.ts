/**
 * Unit tests for beautiful-html.ts
 */

import { exportToBeautifulHTML, type BeautifulExportData } from './beautiful-html';
import type { Session, UIMessage } from '@/types';

describe('beautiful-html', () => {
  const mockSession: Session = {
    id: 'test-session-id',
    title: 'Test Conversation',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    mode: 'chat',
    provider: 'openai',
    model: 'gpt-4',
  };

  const mockMessages: UIMessage[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello, how are you?',
      parts: [{ type: 'text', content: 'Hello, how are you?' }],
      createdAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'I am doing well, thank you for asking!',
      parts: [{ type: 'text', content: 'I am doing well, thank you for asking!' }],
      createdAt: new Date('2024-01-15T10:01:00Z'),
    },
  ];

  const mockExportData: BeautifulExportData = {
    session: mockSession,
    messages: mockMessages,
    exportedAt: new Date('2024-01-15T12:00:00Z'),
  };

  describe('exportToBeautifulHTML', () => {
    it('should generate valid HTML document', () => {
      const html = exportToBeautifulHTML(mockExportData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
    });

    it('should include session title', () => {
      const html = exportToBeautifulHTML(mockExportData);
      expect(html).toContain('Test Conversation');
    });

    it('should include message content', () => {
      const html = exportToBeautifulHTML(mockExportData);
      expect(html).toContain('Hello, how are you?');
      expect(html).toContain('I am doing well, thank you for asking!');
    });

    it('should include CSS styles', () => {
      const html = exportToBeautifulHTML(mockExportData);
      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
    });

    it('should include JavaScript for interactivity', () => {
      const html = exportToBeautifulHTML(mockExportData);
      expect(html).toContain('<script>');
      expect(html).toContain('</script>');
    });

    describe('with options', () => {
      it('should include cover page when enabled', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          options: { includeCoverPage: true },
        });
        expect(html).toContain('cover-page');
      });

      it('should exclude cover page when disabled', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          options: { includeCoverPage: false },
        });
        // Check that no cover page element is rendered (CSS class still exists in styles)
        expect(html).not.toContain('<div class="cover-page');
      });

      it('should include table of contents when enabled', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          options: { includeTableOfContents: true },
        });
        expect(html).toContain('toc');
      });

      it('should exclude table of contents when disabled', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          options: { includeTableOfContents: false },
        });
        expect(html).not.toContain('class="toc"');
      });

      it('should include timestamps when enabled', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          options: { showTimestamps: true },
        });
        expect(html).toContain('message-time');
      });

      it('should apply compact mode styling', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          options: { compactMode: true },
        });
        expect(html).toContain('20px'); // Compact gap
      });

      it('should apply default mode styling', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          options: { compactMode: false },
        });
        expect(html).toContain('32px'); // Default gap
      });

      it('should use specified syntax theme', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          options: { syntaxTheme: 'dracula' },
        });
        // Dracula theme colors should be in the CSS
        expect(html).toContain('#ff79c6'); // Dracula keyword color
      });

      it('should set theme attribute', () => {
        const htmlLight = exportToBeautifulHTML({
          ...mockExportData,
          options: { theme: 'light' },
        });
        expect(htmlLight).toContain('data-theme="light"');

        const htmlDark = exportToBeautifulHTML({
          ...mockExportData,
          options: { theme: 'dark' },
        });
        expect(htmlDark).toContain('data-theme="dark"');
      });
    });

    describe('with code blocks', () => {
      const messagesWithCode: UIMessage[] = [
        {
          id: 'msg-code',
          role: 'assistant',
          content: 'Here is some code:\n```javascript\nconst x = 42;\nconsole.log(x);\n```',
          parts: [
            {
              type: 'text',
              content: 'Here is some code:\n```javascript\nconst x = 42;\nconsole.log(x);\n```',
            },
          ],
          createdAt: new Date('2024-01-15T10:01:00Z'),
        },
      ];

      it('should render code blocks', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithCode,
        });
        expect(html).toContain('code-block');
        expect(html).toContain('language-javascript');
      });

      it('should include syntax highlighting when enabled', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithCode,
          options: { syntaxHighlighting: true },
        });
        expect(html).toContain('token');
      });
    });

    describe('with thinking process', () => {
      const messagesWithThinking: UIMessage[] = [
        {
          id: 'msg-thinking',
          role: 'assistant',
          content: 'Here is my answer.',
          parts: [
            { type: 'reasoning', content: 'Let me think about this...', isStreaming: false, duration: 2.5 },
            { type: 'text', content: 'Here is my answer.' },
          ],
          createdAt: new Date('2024-01-15T10:01:00Z'),
        },
      ];

      it('should include thinking block when enabled', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithThinking,
          options: { showThinkingProcess: true },
        });
        expect(html).toContain('thinking-block');
        expect(html).toContain('Let me think about this...');
      });

      it('should exclude thinking block when disabled', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithThinking,
          options: { showThinkingProcess: false },
        });
        // Check that no thinking block element is rendered (CSS class still exists in styles)
        expect(html).not.toContain('<div class="thinking-block');
      });
    });

    describe('with tool calls', () => {
      const messagesWithTools: UIMessage[] = [
        {
          id: 'msg-tool',
          role: 'assistant',
          content: 'Based on my search...',
          parts: [
            {
              type: 'tool-invocation',
              toolName: 'search',
              toolCallId: 'call-1',
              args: { query: 'test' },
              state: 'output-available',
              result: { results: ['result1', 'result2'] },
            },
            { type: 'text', content: 'Based on my search...' },
          ],
          createdAt: new Date('2024-01-15T10:01:00Z'),
        },
      ];

      it('should include tool block when enabled', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithTools,
          options: { showToolCalls: true },
        });
        expect(html).toContain('tool-block');
        expect(html).toContain('Search');
      });

      it('should exclude tool block when disabled', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithTools,
          options: { showToolCalls: false },
        });
        // Check that no tool block details element is rendered (CSS class still exists in styles)
        expect(html).not.toContain('<details class="tool-block');
      });
    });

    describe('message statistics', () => {
      it('should calculate correct message counts', () => {
        const html = exportToBeautifulHTML(mockExportData);
        // Session stats should be included
        expect(html).toContain('2'); // Total messages
      });
    });

    describe('with image parts', () => {
      const messagesWithImages: UIMessage[] = [
        {
          id: 'msg-image',
          role: 'assistant',
          content: 'Here is the generated image:',
          parts: [
            { type: 'text', content: 'Here is the generated image:' },
            {
              type: 'image',
              url: 'https://example.com/sunset.png',
              alt: 'A beautiful sunset',
              width: 1024,
              height: 768,
              isGenerated: true,
              prompt: 'Generate a beautiful sunset over the ocean',
              revisedPrompt: 'A stunning sunset with orange and purple hues',
            },
          ],
          createdAt: new Date('2024-01-15T10:01:00Z'),
        },
      ];

      it('should render image block with AI badge', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithImages,
        });
        expect(html).toContain('media-block');
        expect(html).toContain('image-block');
        expect(html).toContain('ai-generated');
        expect(html).toContain('AI Generated');
      });

      it('should include image src and alt', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithImages,
        });
        expect(html).toContain('https://example.com/sunset.png');
        expect(html).toContain('A beautiful sunset');
      });

      it('should include image prompt details', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithImages,
        });
        expect(html).toContain('View prompt');
        expect(html).toContain('Generate a beautiful sunset over the ocean');
        expect(html).toContain('Revised');
      });

      it('should render base64 image correctly', () => {
        const messagesWithBase64: UIMessage[] = [
          {
            id: 'msg-base64',
            role: 'assistant',
            content: 'Image:',
            parts: [
              {
                type: 'image',
                url: '',
                base64: 'iVBORw0KGgoAAAANSUhEUg==',
                mimeType: 'image/png',
                isGenerated: true,
              },
            ],
            createdAt: new Date('2024-01-15T10:01:00Z'),
          },
        ];

        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithBase64,
        });
        expect(html).toContain('data:image/png;base64,');
      });
    });

    describe('with video parts', () => {
      const messagesWithVideos: UIMessage[] = [
        {
          id: 'msg-video',
          role: 'assistant',
          content: 'Here is the generated video:',
          parts: [
            { type: 'text', content: 'Here is the generated video:' },
            {
              type: 'video',
              url: 'https://example.com/video.mp4',
              title: 'Dancing Cat',
              thumbnailUrl: 'https://example.com/thumb.jpg',
              durationSeconds: 30,
              width: 1920,
              height: 1080,
              fps: 30,
              mimeType: 'video/mp4',
              isGenerated: true,
              provider: 'google-veo',
              model: 'veo-2',
              prompt: 'A cat dancing to music',
            },
          ],
          createdAt: new Date('2024-01-15T10:01:00Z'),
        },
      ];

      it('should render video block with AI badge', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithVideos,
        });
        expect(html).toContain('media-block');
        expect(html).toContain('video-block');
        expect(html).toContain('ai-generated');
        expect(html).toContain('AI Generated Video');
      });

      it('should include video source and poster', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithVideos,
        });
        expect(html).toContain('https://example.com/video.mp4');
        expect(html).toContain('poster');
        expect(html).toContain('https://example.com/thumb.jpg');
      });

      it('should include video metadata', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithVideos,
        });
        expect(html).toContain('30s'); // Duration (less than 1 min shows as Xs)
        expect(html).toContain('1920×1080'); // Dimensions
        expect(html).toContain('30fps'); // FPS
        expect(html).toContain('veo-2'); // Model
      });

      it('should include provider info in AI badge', () => {
        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: messagesWithVideos,
        });
        expect(html).toContain('google-veo');
      });

      it('should render video without optional fields', () => {
        const minimalVideo: UIMessage[] = [
          {
            id: 'msg-minimal',
            role: 'assistant',
            content: 'Video:',
            parts: [
              {
                type: 'video',
                url: 'https://example.com/simple.mp4',
              },
            ],
            createdAt: new Date('2024-01-15T10:01:00Z'),
          },
        ];

        const html = exportToBeautifulHTML({
          ...mockExportData,
          messages: minimalVideo,
        });
        expect(html).toContain('video-block');
        expect(html).toContain('https://example.com/simple.mp4');
        // Should not have ai-generated class on the figure element (CSS class in styles is fine)
        expect(html).not.toContain('video-block ai-generated');
        expect(html).not.toContain('AI Generated Video');
      });
    });

    describe('media block CSS styles', () => {
      it('should include media block styles', () => {
        const html = exportToBeautifulHTML(mockExportData);
        expect(html).toContain('.media-block');
        expect(html).toContain('.ai-badge');
        expect(html).toContain('.video-container');
        expect(html).toContain('.media-caption');
      });
    });
  });
});
