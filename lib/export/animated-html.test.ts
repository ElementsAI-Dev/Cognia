/**
 * Tests for animated-html export functionality
 */

import { exportToAnimatedHTML, type AnimatedExportData, type AnimatedExportOptions } from './animated-html';
import type { UIMessage, Session } from '@/types';

// Mock session data
const mockSession: Session = {
  id: 'session-123',
  title: 'Test Conversation',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T11:00:00Z'),
  provider: 'openai',
  model: 'gpt-4o',
  mode: 'chat',
};

// Mock messages
const mockMessages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, how are you?',
    createdAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'I am doing well, thank you!',
    createdAt: new Date('2024-01-15T10:01:30Z'),
  },
];

// Mock messages with parts
const mockMessagesWithParts: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Search for news',
    createdAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Here are the results.',
    createdAt: new Date('2024-01-15T10:01:30Z'),
    parts: [
      {
        type: 'reasoning',
        content: 'Thinking about search...',
        isStreaming: false,
        duration: 1.5,
      },
      {
        type: 'tool-invocation',
        toolCallId: 'tool-1',
        toolName: 'web-search',
        state: 'output-available',
        args: { query: 'news' },
        result: { results: [] },
      },
    ],
  },
];

describe('exportToAnimatedHTML', () => {
  const exportedAt = new Date('2024-01-15T12:00:00Z');

  it('should generate valid HTML document', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<html lang="en">');
    expect(result).toContain('</html>');
  });

  it('should include session title in page title', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('<title>Test Conversation - Cognia Replay</title>');
  });

  it('should include session metadata in header', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('openai');
    expect(result).toContain('gpt-4o');
    expect(result).toContain('chat');
  });

  it('should include messages as JSON data', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('const messages =');
    expect(result).toContain('"role":"user"');
    expect(result).toContain('"role":"assistant"');
    expect(result).toContain('Hello, how are you?');
  });

  it('should include playback controls by default', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('id="playPauseBtn"');
    expect(result).toContain('id="restartBtn"');
    expect(result).toContain('id="speedSelect"');
    expect(result).toContain('id="progressBar"');
  });

  it('should hide controls when showControls is false', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
      options: { showControls: false },
    };

    const result = exportToAnimatedHTML(data);

    expect(result).not.toContain('id="playPauseBtn"');
    expect(result).not.toContain('id="restartBtn"');
  });

  it('should include animation JavaScript', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('function init()');
    expect(result).toContain('function togglePlayPause()');
    expect(result).toContain('function play()');
    expect(result).toContain('function pause()');
    expect(result).toContain('function restart()');
  });

  it('should include CSS styles', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('<style>');
    expect(result).toContain('.message');
    expect(result).toContain('.typing-cursor');
    expect(result).toContain('@keyframes');
  });

  it('should apply light theme when specified', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
      options: { theme: 'light' },
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('--bg-primary: #ffffff');
  });

  it('should apply dark theme when specified', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
      options: { theme: 'dark' },
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('--bg-primary: #1a1a1a');
  });

  it('should include typing speed option', () => {
    const options: AnimatedExportOptions = {
      typingSpeed: 100,
    };

    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
      options,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('"typingSpeed":100');
  });

  it('should include message delay option', () => {
    const options: AnimatedExportOptions = {
      messageDelay: 1000,
    };

    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
      options,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('"messageDelay":1000');
  });

  it('should include autoPlay option', () => {
    const options: AnimatedExportOptions = {
      autoPlay: true,
    };

    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
      options,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('"autoPlay":true');
  });

  it('should include message parts data', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessagesWithParts,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('"type":"reasoning"');
    expect(result).toContain('"type":"tool-invocation"');
    expect(result).toContain('"toolName":"web-search"');
  });

  it('should escape HTML in session title', () => {
    const sessionWithHtml: Session = {
      ...mockSession,
      title: '<script>alert("xss")</script>',
    };

    const data: AnimatedExportData = {
      session: sessionWithHtml,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).not.toContain('<script>alert("xss")</script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should include footer with export timestamp', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessages,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('Exported from Cognia');
    expect(result).toContain('class="footer"');
  });

  it('should include reasoning block styles', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessagesWithParts,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('.reasoning-block');
    expect(result).toContain('.reasoning-header');
    expect(result).toContain('.reasoning-content');
  });

  it('should include tool block styles', () => {
    const data: AnimatedExportData = {
      session: mockSession,
      messages: mockMessagesWithParts,
      exportedAt,
    };

    const result = exportToAnimatedHTML(data);

    expect(result).toContain('.tool-block');
    expect(result).toContain('.tool-header');
    expect(result).toContain('.tool-status');
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
          },
        ],
      },
    ];

    it('should include image data in messages JSON', () => {
      const data: AnimatedExportData = {
        session: mockSession,
        messages: messagesWithImages,
        exportedAt,
      };

      const result = exportToAnimatedHTML(data);

      expect(result).toContain('"type":"image"');
      expect(result).toContain('https://example.com/sunset.png');
    });

    it('should include media block CSS styles', () => {
      const data: AnimatedExportData = {
        session: mockSession,
        messages: messagesWithImages,
        exportedAt,
      };

      const result = exportToAnimatedHTML(data);

      expect(result).toContain('.media-block');
      expect(result).toContain('.ai-badge');
    });

    it('should include renderMessageParts JavaScript for handling images', () => {
      const data: AnimatedExportData = {
        session: mockSession,
        messages: messagesWithImages,
        exportedAt,
      };

      const result = exportToAnimatedHTML(data);

      expect(result).toContain('renderMessageParts');
      expect(result).toContain("part.type === 'image'");
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
            durationSeconds: 30,
            width: 1920,
            height: 1080,
            isGenerated: true,
            provider: 'google-veo',
            model: 'veo-2',
            prompt: 'A cat dancing to music',
          },
        ],
      },
    ];

    it('should include video data in messages JSON', () => {
      const data: AnimatedExportData = {
        session: mockSession,
        messages: messagesWithVideos,
        exportedAt,
      };

      const result = exportToAnimatedHTML(data);

      expect(result).toContain('"type":"video"');
      expect(result).toContain('https://example.com/video.mp4');
    });

    it('should include video block CSS styles', () => {
      const data: AnimatedExportData = {
        session: mockSession,
        messages: messagesWithVideos,
        exportedAt,
      };

      const result = exportToAnimatedHTML(data);

      expect(result).toContain('.video-block');
      expect(result).toContain('.video-container');
    });

    it('should include renderMessageParts JavaScript for handling videos', () => {
      const data: AnimatedExportData = {
        session: mockSession,
        messages: messagesWithVideos,
        exportedAt,
      };

      const result = exportToAnimatedHTML(data);

      expect(result).toContain('renderMessageParts');
      expect(result).toContain("part.type === 'video'");
    });

    it('should include video metadata in JSON', () => {
      const data: AnimatedExportData = {
        session: mockSession,
        messages: messagesWithVideos,
        exportedAt,
      };

      const result = exportToAnimatedHTML(data);

      expect(result).toContain('"durationSeconds":30');
      expect(result).toContain('"provider":"google-veo"');
      expect(result).toContain('"model":"veo-2"');
    });
  });
});
