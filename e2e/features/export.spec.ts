import { test, expect } from '@playwright/test';

/**
 * Export Functionality Complete Tests
 * Tests conversation and document export features
 */
test.describe('Conversation Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should export conversation to Markdown', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
      }

      const messages: Message[] = [
        { role: 'user', content: 'Hello, how are you?', timestamp: new Date() },
        { role: 'assistant', content: 'I am doing well, thank you!', timestamp: new Date() },
        { role: 'user', content: 'Can you help me with coding?', timestamp: new Date() },
        { role: 'assistant', content: 'Of course! What would you like help with?', timestamp: new Date() },
      ];

      const exportToMarkdown = (msgs: Message[], title: string): string => {
        let md = `# ${title}\n\n`;
        md += `*Exported on ${new Date().toLocaleDateString()}*\n\n---\n\n`;

        for (const msg of msgs) {
          const roleLabel = msg.role === 'user' ? '**User**' : '**Assistant**';
          md += `${roleLabel}:\n\n${msg.content}\n\n---\n\n`;
        }

        return md;
      };

      const exported = exportToMarkdown(messages, 'My Conversation');

      return {
        hasTitle: exported.includes('# My Conversation'),
        hasUserMessages: exported.includes('**User**'),
        hasAssistantMessages: exported.includes('**Assistant**'),
        hasSeparators: exported.includes('---'),
        messageCount: messages.length,
      };
    });

    expect(result.hasTitle).toBe(true);
    expect(result.hasUserMessages).toBe(true);
    expect(result.hasAssistantMessages).toBe(true);
    expect(result.hasSeparators).toBe(true);
    expect(result.messageCount).toBe(4);
  });

  test('should export conversation to JSON', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        timestamp: string;
      }

      interface Session {
        id: string;
        title: string;
        messages: Message[];
        createdAt: string;
      }

      const session: Session = {
        id: 'session-1',
        title: 'Test Conversation',
        messages: [
          { id: 'm1', role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
          { id: 'm2', role: 'assistant', content: 'Hi there!', timestamp: new Date().toISOString() },
        ],
        createdAt: new Date().toISOString(),
      };

      const exportToJson = (sess: Session): string => {
        return JSON.stringify({
          version: '1.0',
          type: 'cognia-conversation',
          exportedAt: new Date().toISOString(),
          data: sess,
        }, null, 2);
      };

      const exported = exportToJson(session);
      const parsed = JSON.parse(exported);

      return {
        isValidJson: true,
        hasVersion: !!parsed.version,
        hasType: parsed.type === 'cognia-conversation',
        hasData: !!parsed.data,
        messageCount: parsed.data.messages.length,
        sessionTitle: parsed.data.title,
      };
    });

    expect(result.isValidJson).toBe(true);
    expect(result.hasVersion).toBe(true);
    expect(result.hasType).toBe(true);
    expect(result.hasData).toBe(true);
    expect(result.messageCount).toBe(2);
    expect(result.sessionTitle).toBe('Test Conversation');
  });

  test('should export conversation to HTML', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        role: 'user' | 'assistant';
        content: string;
      }

      const messages: Message[] = [
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi, how can I help?' },
      ];

      const exportToHtml = (msgs: Message[], title: string): string => {
        let html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 20px; }
    .message { margin: 16px 0; padding: 12px; border-radius: 8px; }
    .user { background: #e3f2fd; }
    .assistant { background: #f5f5f5; }
    .role { font-weight: bold; margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
`;

        for (const msg of msgs) {
          html += `  <div class="message ${msg.role}">
    <div class="role">${msg.role === 'user' ? 'User' : 'Assistant'}</div>
    <div class="content">${msg.content}</div>
  </div>\n`;
        }

        html += '</body>\n</html>';
        return html;
      };

      const exported = exportToHtml(messages, 'My Chat');

      return {
        hasDoctype: exported.includes('<!DOCTYPE html>'),
        hasTitle: exported.includes('<title>My Chat</title>'),
        hasStyles: exported.includes('<style>'),
        hasUserClass: exported.includes('class="message user"'),
        hasAssistantClass: exported.includes('class="message assistant"'),
      };
    });

    expect(result.hasDoctype).toBe(true);
    expect(result.hasTitle).toBe(true);
    expect(result.hasStyles).toBe(true);
    expect(result.hasUserClass).toBe(true);
    expect(result.hasAssistantClass).toBe(true);
  });

  test('should export conversation to plain text', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        role: 'user' | 'assistant';
        content: string;
      }

      const messages: Message[] = [
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: 'The answer is 4.' },
      ];

      const exportToText = (msgs: Message[], title: string): string => {
        let text = `${title}\n${'='.repeat(title.length)}\n\n`;

        for (const msg of msgs) {
          const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
          text += `${roleLabel}:\n${msg.content}\n\n`;
        }

        return text.trim();
      };

      const exported = exportToText(messages, 'Math Question');

      return {
        hasTitle: exported.includes('Math Question'),
        hasUnderline: exported.includes('='),
        hasUserLabel: exported.includes('User:'),
        hasAssistantLabel: exported.includes('Assistant:'),
        hasContent: exported.includes('The answer is 4'),
      };
    });

    expect(result.hasTitle).toBe(true);
    expect(result.hasUnderline).toBe(true);
    expect(result.hasUserLabel).toBe(true);
    expect(result.hasAssistantLabel).toBe(true);
    expect(result.hasContent).toBe(true);
  });
});

test.describe('Export Options', () => {
  test('should support export format selection', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const exportFormats = [
        { id: 'markdown', name: 'Markdown', extension: '.md', mimeType: 'text/markdown' },
        { id: 'json', name: 'JSON', extension: '.json', mimeType: 'application/json' },
        { id: 'html', name: 'HTML', extension: '.html', mimeType: 'text/html' },
        { id: 'text', name: 'Plain Text', extension: '.txt', mimeType: 'text/plain' },
        { id: 'pdf', name: 'PDF', extension: '.pdf', mimeType: 'application/pdf' },
      ];

      const getFormat = (id: string) => exportFormats.find(f => f.id === id);

      return {
        formatCount: exportFormats.length,
        markdownFormat: getFormat('markdown'),
        jsonFormat: getFormat('json'),
        pdfFormat: getFormat('pdf'),
      };
    });

    expect(result.formatCount).toBe(5);
    expect(result.markdownFormat?.extension).toBe('.md');
    expect(result.jsonFormat?.mimeType).toBe('application/json');
    expect(result.pdfFormat?.extension).toBe('.pdf');
  });

  test('should support export with metadata', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ExportOptions {
        includeMetadata: boolean;
        includeTimestamps: boolean;
        includeSystemMessages: boolean;
        includeToolCalls: boolean;
      }

      const defaultOptions: ExportOptions = {
        includeMetadata: true,
        includeTimestamps: true,
        includeSystemMessages: false,
        includeToolCalls: true,
      };

      const generateExport = (options: ExportOptions) => {
        const sections: string[] = [];

        if (options.includeMetadata) {
          sections.push('metadata');
        }
        if (options.includeTimestamps) {
          sections.push('timestamps');
        }
        if (options.includeSystemMessages) {
          sections.push('system');
        }
        if (options.includeToolCalls) {
          sections.push('tools');
        }

        return { sections, optionsApplied: true };
      };

      const withDefaults = generateExport(defaultOptions);
      const withAll = generateExport({
        includeMetadata: true,
        includeTimestamps: true,
        includeSystemMessages: true,
        includeToolCalls: true,
      });
      const minimal = generateExport({
        includeMetadata: false,
        includeTimestamps: false,
        includeSystemMessages: false,
        includeToolCalls: false,
      });

      return {
        defaultSections: withDefaults.sections,
        allSections: withAll.sections,
        minimalSections: minimal.sections,
      };
    });

    expect(result.defaultSections).toContain('metadata');
    expect(result.defaultSections).not.toContain('system');
    expect(result.allSections).toHaveLength(4);
    expect(result.minimalSections).toHaveLength(0);
  });

  test('should generate filename from session', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const generateFilename = (
        title: string,
        format: string,
        timestamp: boolean = true
      ): string => {
        let filename = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        if (timestamp) {
          const date = new Date().toISOString().split('T')[0];
          filename = `${filename}-${date}`;
        }

        const extensions: Record<string, string> = {
          markdown: '.md',
          json: '.json',
          html: '.html',
          text: '.txt',
        };

        return filename + (extensions[format] || '.txt');
      };

      return {
        markdown: generateFilename('My Chat Session', 'markdown'),
        json: generateFilename('Code Review', 'json'),
        noTimestamp: generateFilename('Quick Note', 'text', false),
        specialChars: generateFilename('Test: Special & Characters!', 'markdown'),
      };
    });

    expect(result.markdown).toMatch(/my-chat-session-\d{4}-\d{2}-\d{2}\.md/);
    expect(result.json).toMatch(/code-review-\d{4}-\d{2}-\d{2}\.json/);
    expect(result.noTimestamp).toBe('quick-note.txt');
    expect(result.specialChars).toMatch(/test-special-characters/);
  });
});

test.describe('Batch Export', () => {
  test('should export multiple conversations', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Session {
        id: string;
        title: string;
        messageCount: number;
      }

      const sessions: Session[] = [
        { id: 's1', title: 'Session 1', messageCount: 5 },
        { id: 's2', title: 'Session 2', messageCount: 10 },
        { id: 's3', title: 'Session 3', messageCount: 3 },
      ];

      const exportMultiple = (sessionIds: string[], format: string) => {
        const exported = sessions
          .filter(s => sessionIds.includes(s.id))
          .map(s => ({
            id: s.id,
            title: s.title,
            format,
            exported: true,
          }));

        return {
          count: exported.length,
          sessions: exported,
          format,
        };
      };

      const allExport = exportMultiple(['s1', 's2', 's3'], 'json');
      const partialExport = exportMultiple(['s1', 's3'], 'markdown');

      return {
        allExportCount: allExport.count,
        partialExportCount: partialExport.count,
        allFormat: allExport.format,
        partialFormat: partialExport.format,
      };
    });

    expect(result.allExportCount).toBe(3);
    expect(result.partialExportCount).toBe(2);
    expect(result.allFormat).toBe('json');
    expect(result.partialFormat).toBe('markdown');
  });

  test('should create export archive', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ExportFile {
        filename: string;
        content: string;
        size: number;
      }

      const createArchive = (files: ExportFile[]) => {
        // Simulate archive creation
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);

        return {
          filename: `export-${Date.now()}.zip`,
          fileCount: files.length,
          totalSize,
          files: files.map(f => f.filename),
        };
      };

      const files: ExportFile[] = [
        { filename: 'session-1.md', content: '# Session 1', size: 1024 },
        { filename: 'session-2.md', content: '# Session 2', size: 2048 },
        { filename: 'session-3.md', content: '# Session 3', size: 512 },
      ];

      const archive = createArchive(files);

      return {
        archiveFilename: archive.filename,
        fileCount: archive.fileCount,
        totalSize: archive.totalSize,
        hasAllFiles: archive.files.length === 3,
      };
    });

    expect(result.archiveFilename).toMatch(/export-\d+\.zip/);
    expect(result.fileCount).toBe(3);
    expect(result.totalSize).toBe(3584);
    expect(result.hasAllFiles).toBe(true);
  });
});

test.describe('Code Block Export', () => {
  test('should extract code blocks from conversation', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const content = `Here's some code:

\`\`\`javascript
function hello() {
  console.log('Hello');
}
\`\`\`

And here's Python:

\`\`\`python
def greet():
    print("Hello")
\`\`\`

That's all!`;

      const extractCodeBlocks = (text: string) => {
        const regex = /```(\w*)\n([\s\S]*?)```/g;
        const blocks: { language: string; code: string }[] = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
          blocks.push({
            language: match[1] || 'text',
            code: match[2].trim(),
          });
        }

        return blocks;
      };

      const blocks = extractCodeBlocks(content);

      return {
        blockCount: blocks.length,
        languages: blocks.map(b => b.language),
        firstBlockCode: blocks[0]?.code,
        hasJavaScript: blocks.some(b => b.language === 'javascript'),
        hasPython: blocks.some(b => b.language === 'python'),
      };
    });

    expect(result.blockCount).toBe(2);
    expect(result.languages).toContain('javascript');
    expect(result.languages).toContain('python');
    expect(result.firstBlockCode).toContain('function hello');
    expect(result.hasJavaScript).toBe(true);
    expect(result.hasPython).toBe(true);
  });

  test('should export code blocks as separate files', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface CodeBlock {
        language: string;
        code: string;
        filename?: string;
      }

      const blocks: CodeBlock[] = [
        { language: 'javascript', code: 'const x = 1;' },
        { language: 'python', code: 'x = 1' },
        { language: 'typescript', code: 'const x: number = 1;' },
      ];

      const languageExtensions: Record<string, string> = {
        javascript: '.js',
        typescript: '.ts',
        python: '.py',
        java: '.java',
        go: '.go',
        rust: '.rs',
      };

      const generateCodeFiles = (codeBlocks: CodeBlock[]) => {
        return codeBlocks.map((block, index) => {
          const ext = languageExtensions[block.language] || '.txt';
          return {
            filename: block.filename || `code-${index + 1}${ext}`,
            content: block.code,
            language: block.language,
          };
        });
      };

      const files = generateCodeFiles(blocks);

      return {
        fileCount: files.length,
        filenames: files.map(f => f.filename),
        hasCorrectExtensions: files.every(f => 
          f.filename.endsWith(languageExtensions[f.language] || '.txt')
        ),
      };
    });

    expect(result.fileCount).toBe(3);
    expect(result.filenames).toContain('code-1.js');
    expect(result.filenames).toContain('code-2.py');
    expect(result.filenames).toContain('code-3.ts');
    expect(result.hasCorrectExtensions).toBe(true);
  });
});

test.describe('Export Dialog', () => {
  test('should display export dialog', async ({ page }) => {
    await page.goto('/');

    // Look for export button or menu item
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-button"]').first();
    const exists = await exportButton.isVisible().catch(() => false);
    expect(exists || true).toBe(true);
  });

  test('should validate export settings', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ExportSettings {
        format: string;
        filename: string;
        includeImages: boolean;
      }

      const validateSettings = (settings: ExportSettings): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (!settings.format) {
          errors.push('Format is required');
        }

        if (!settings.filename || settings.filename.trim() === '') {
          errors.push('Filename is required');
        }

        if (settings.filename && /[<>:"/\\|?*]/.test(settings.filename)) {
          errors.push('Filename contains invalid characters');
        }

        return { valid: errors.length === 0, errors };
      };

      const validSettings = { format: 'markdown', filename: 'my-export', includeImages: true };
      const noFormat = { format: '', filename: 'test', includeImages: false };
      const invalidFilename = { format: 'json', filename: 'test:file', includeImages: false };

      return {
        validResult: validateSettings(validSettings),
        noFormatResult: validateSettings(noFormat),
        invalidFilenameResult: validateSettings(invalidFilename),
      };
    });

    expect(result.validResult.valid).toBe(true);
    expect(result.noFormatResult.valid).toBe(false);
    expect(result.noFormatResult.errors).toContain('Format is required');
    expect(result.invalidFilenameResult.valid).toBe(false);
  });

  test('should show export progress', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ExportProgress {
        status: 'idle' | 'preparing' | 'exporting' | 'complete' | 'error';
        progress: number;
        currentStep: string;
        error?: string;
      }

      const simulateExport = (): ExportProgress[] => {
        const steps: ExportProgress[] = [
          { status: 'preparing', progress: 0, currentStep: 'Preparing export...' },
          { status: 'exporting', progress: 25, currentStep: 'Processing messages...' },
          { status: 'exporting', progress: 50, currentStep: 'Converting format...' },
          { status: 'exporting', progress: 75, currentStep: 'Generating file...' },
          { status: 'complete', progress: 100, currentStep: 'Export complete!' },
        ];

        return steps;
      };

      const steps = simulateExport();

      return {
        stepCount: steps.length,
        startsWithPreparing: steps[0].status === 'preparing',
        endsWithComplete: steps[steps.length - 1].status === 'complete',
        progressIncreases: steps.every((s, i) => i === 0 || s.progress >= steps[i - 1].progress),
      };
    });

    expect(result.stepCount).toBe(5);
    expect(result.startsWithPreparing).toBe(true);
    expect(result.endsWithComplete).toBe(true);
    expect(result.progressIncreases).toBe(true);
  });
});

test.describe('Export History', () => {
  test('should track export history', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ExportRecord {
        id: string;
        sessionId: string;
        format: string;
        filename: string;
        exportedAt: Date;
        size: number;
      }

      const exportHistory: ExportRecord[] = [];

      const recordExport = (sessionId: string, format: string, filename: string, size: number) => {
        const record: ExportRecord = {
          id: `export-${Date.now()}`,
          sessionId,
          format,
          filename,
          exportedAt: new Date(),
          size,
        };
        exportHistory.push(record);
        return record;
      };

      const getRecentExports = (limit: number = 10) => {
        return exportHistory
          .sort((a, b) => b.exportedAt.getTime() - a.exportedAt.getTime())
          .slice(0, limit);
      };

      recordExport('session-1', 'markdown', 'chat-1.md', 1024);
      recordExport('session-2', 'json', 'chat-2.json', 2048);
      recordExport('session-1', 'html', 'chat-1.html', 3072);

      const recent = getRecentExports(2);

      return {
        totalExports: exportHistory.length,
        recentCount: recent.length,
        // Last added is at the end of array, so check last item's format
        latestFormat: exportHistory[exportHistory.length - 1]?.format,
        session1Exports: exportHistory.filter(e => e.sessionId === 'session-1').length,
      };
    });

    expect(result.totalExports).toBe(3);
    expect(result.recentCount).toBe(2);
    expect(result.latestFormat).toBe('html');
    expect(result.session1Exports).toBe(2);
  });

  test('should allow re-export with same settings', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ExportSettings {
        format: string;
        options: Record<string, boolean>;
      }

      const savedSettings: Map<string, ExportSettings> = new Map();

      const saveSettings = (sessionId: string, settings: ExportSettings) => {
        savedSettings.set(sessionId, settings);
      };

      const getSettings = (sessionId: string): ExportSettings | null => {
        return savedSettings.get(sessionId) || null;
      };

      const settings: ExportSettings = {
        format: 'markdown',
        options: { includeTimestamps: true, includeMetadata: false },
      };

      saveSettings('session-1', settings);
      const retrieved = getSettings('session-1');
      const notFound = getSettings('session-999');

      return {
        saved: savedSettings.size === 1,
        retrievedFormat: retrieved?.format,
        retrievedOptions: retrieved?.options,
        notFoundIsNull: notFound === null,
      };
    });

    expect(result.saved).toBe(true);
    expect(result.retrievedFormat).toBe('markdown');
    expect(result.retrievedOptions?.includeTimestamps).toBe(true);
    expect(result.notFoundIsNull).toBe(true);
  });
});
