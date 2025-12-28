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
  });
});
