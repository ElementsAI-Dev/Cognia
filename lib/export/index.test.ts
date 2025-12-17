/**
 * Tests for Export utilities
 */

import {
  exportToMarkdown,
  exportToJSON,
  exportToHTML,
  exportToPlainText,
  generateFilename,
  type ExportData,
} from './index';
import type { UIMessage, Session } from '@/types';

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-1',
  title: 'Test Conversation',
  provider: 'openai',
  model: 'gpt-4',
  mode: 'chat',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z'),
  messageCount: 2,
  ...overrides,
});

const createMockMessage = (overrides: Partial<UIMessage> = {}): UIMessage => ({
  id: 'msg-1',
  role: 'user',
  content: 'Hello',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  ...overrides,
});

const createExportData = (overrides: Partial<ExportData> = {}): ExportData => ({
  session: createMockSession(),
  messages: [
    createMockMessage({ id: '1', role: 'user', content: 'Hello' }),
    createMockMessage({ id: '2', role: 'assistant', content: 'Hi there!' }),
  ],
  exportedAt: new Date('2024-01-01T14:00:00Z'),
  ...overrides,
});

describe('exportToMarkdown', () => {
  it('includes session title as heading', () => {
    const data = createExportData();
    const result = exportToMarkdown(data);
    
    expect(result).toContain('# Test Conversation');
  });

  it('includes model information', () => {
    const data = createExportData();
    const result = exportToMarkdown(data);
    
    expect(result).toContain('openai');
    expect(result).toContain('gpt-4');
  });

  it('includes mode information', () => {
    const data = createExportData();
    const result = exportToMarkdown(data);
    
    expect(result).toContain('chat');
  });

  it('formats user messages correctly', () => {
    const data = createExportData();
    const result = exportToMarkdown(data);
    
    expect(result).toContain('**You**');
    expect(result).toContain('Hello');
  });

  it('formats assistant messages correctly', () => {
    const data = createExportData();
    const result = exportToMarkdown(data);
    
    expect(result).toContain('**Assistant**');
    expect(result).toContain('Hi there!');
  });

  it('includes horizontal rule separator', () => {
    const data = createExportData();
    const result = exportToMarkdown(data);
    
    expect(result).toContain('---');
  });

  it('handles empty messages array', () => {
    const data = createExportData({ messages: [] });
    const result = exportToMarkdown(data);
    
    expect(result).toContain('# Test Conversation');
    expect(result).not.toContain('**You**');
  });

  it('handles multi-line content', () => {
    const data = createExportData({
      messages: [
        createMockMessage({ content: 'Line 1\nLine 2\nLine 3' }),
      ],
    });
    const result = exportToMarkdown(data);
    
    expect(result).toContain('Line 1\nLine 2\nLine 3');
  });
});

describe('exportToJSON', () => {
  it('produces valid JSON', () => {
    const data = createExportData();
    const result = exportToJSON(data);
    
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes version', () => {
    const data = createExportData();
    const result = JSON.parse(exportToJSON(data));
    
    expect(result.version).toBe('1.0');
  });

  it('includes session data', () => {
    const data = createExportData();
    const result = JSON.parse(exportToJSON(data));
    
    expect(result.session.id).toBe('session-1');
    expect(result.session.title).toBe('Test Conversation');
    expect(result.session.provider).toBe('openai');
    expect(result.session.model).toBe('gpt-4');
  });

  it('includes messages with all properties', () => {
    const data = createExportData();
    const result = JSON.parse(exportToJSON(data));
    
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content).toBe('Hello');
  });

  it('includes exportedAt timestamp', () => {
    const data = createExportData();
    const result = JSON.parse(exportToJSON(data));
    
    expect(result.exportedAt).toBeDefined();
  });

  it('converts dates to ISO strings', () => {
    const data = createExportData();
    const result = JSON.parse(exportToJSON(data));
    
    expect(result.session.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.messages[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('preserves message attachments', () => {
    const data = createExportData({
      messages: [
        createMockMessage({
          attachments: [{ id: '1', name: 'file.txt', url: 'url', mimeType: 'text/plain', size: 100, type: 'file' }],
        }),
      ],
    });
    const result = JSON.parse(exportToJSON(data));
    
    expect(result.messages[0].attachments).toBeDefined();
  });

  it('preserves token usage', () => {
    const data = createExportData({
      messages: [
        createMockMessage({
          tokens: { prompt: 10, completion: 20, total: 30 },
        }),
      ],
    });
    const result = JSON.parse(exportToJSON(data));
    
    expect(result.messages[0].tokens).toEqual({ prompt: 10, completion: 20, total: 30 });
  });
});

describe('exportToHTML', () => {
  it('produces valid HTML structure', () => {
    const data = createExportData();
    const result = exportToHTML(data);
    
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<html');
    expect(result).toContain('</html>');
    expect(result).toContain('<head>');
    expect(result).toContain('<body>');
  });

  it('includes title in head', () => {
    const data = createExportData();
    const result = exportToHTML(data);
    
    expect(result).toContain('<title>Test Conversation');
  });

  it('includes session title in body', () => {
    const data = createExportData();
    const result = exportToHTML(data);
    
    expect(result).toContain('Test Conversation');
  });

  it('escapes HTML in content', () => {
    const data = createExportData({
      messages: [
        createMockMessage({ content: '<script>alert("xss")</script>' }),
      ],
    });
    const result = exportToHTML(data);
    
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('formats user and assistant messages differently', () => {
    const data = createExportData();
    const result = exportToHTML(data);
    
    expect(result).toContain('You');
    expect(result).toContain('Assistant');
  });

  it('includes CSS styling', () => {
    const data = createExportData();
    const result = exportToHTML(data);
    
    expect(result).toContain('<style>');
    expect(result).toContain('</style>');
  });

  it('includes export timestamp in footer', () => {
    const data = createExportData();
    const result = exportToHTML(data);
    
    expect(result).toContain('Exported from Cognia');
  });

  it('handles special characters', () => {
    const data = createExportData({
      messages: [
        createMockMessage({ content: 'Test & "quotes" \'single\'' }),
      ],
    });
    const result = exportToHTML(data);
    
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;');
  });
});

describe('exportToPlainText', () => {
  it('includes session title', () => {
    const data = createExportData();
    const result = exportToPlainText(data);
    
    expect(result).toContain('Test Conversation');
  });

  it('includes underline for title', () => {
    const data = createExportData();
    const result = exportToPlainText(data);
    
    expect(result).toContain('='.repeat('Test Conversation'.length));
  });

  it('includes model information', () => {
    const data = createExportData();
    const result = exportToPlainText(data);
    
    expect(result).toContain('openai / gpt-4');
  });

  it('formats messages with role labels', () => {
    const data = createExportData();
    const result = exportToPlainText(data);
    
    expect(result).toContain('[You]');
    expect(result).toContain('[Assistant]');
  });

  it('includes message content', () => {
    const data = createExportData();
    const result = exportToPlainText(data);
    
    expect(result).toContain('Hello');
    expect(result).toContain('Hi there!');
  });

  it('includes separator between messages', () => {
    const data = createExportData();
    const result = exportToPlainText(data);
    
    expect(result).toContain('-'.repeat(50));
  });

  it('handles empty messages', () => {
    const data = createExportData({ messages: [] });
    const result = exportToPlainText(data);
    
    expect(result).toContain('Test Conversation');
  });
});

describe('generateFilename', () => {
  it('converts title to lowercase', () => {
    const result = generateFilename('My Title', 'md');
    
    expect(result).toMatch(/^my-title/);
  });

  it('replaces spaces with hyphens', () => {
    const result = generateFilename('My Test Title', 'md');
    
    expect(result).toContain('my-test-title');
  });

  it('removes special characters', () => {
    const result = generateFilename('Test: A/B @#$%', 'md');
    
    expect(result).not.toContain(':');
    expect(result).not.toContain('/');
    expect(result).not.toContain('@');
  });

  it('includes correct extension', () => {
    expect(generateFilename('Test', 'md')).toMatch(/\.md$/);
    expect(generateFilename('Test', 'json')).toMatch(/\.json$/);
    expect(generateFilename('Test', 'html')).toMatch(/\.html$/);
  });

  it('includes date', () => {
    const result = generateFilename('Test', 'md');
    
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('truncates long titles', () => {
    const longTitle = 'A'.repeat(100);
    const result = generateFilename(longTitle, 'md');
    
    expect(result.length).toBeLessThan(100);
  });

  it('removes leading/trailing hyphens', () => {
    const result = generateFilename('---Test---', 'md');
    
    expect(result).not.toMatch(/^-/);
    expect(result).toMatch(/^test/);
  });

  it('handles empty title', () => {
    const result = generateFilename('', 'md');
    
    expect(result).toMatch(/\.md$/);
  });
});
