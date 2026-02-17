/**
 * Tests for Context File System (ContextFS)
 */

import {
  writeContextFile,
  readContextFile,
  tailContextFile,
  searchContextFiles,
  searchContextFileEntries,
  grepContextFiles,
  deleteContextFile,
  getContextStats,
  gcContextFiles,
  clearAllContextFiles,
  estimateTokens,
  formatSize,
  isLongOutput,
  createToolOutputRef,
} from './context-fs';

describe('ContextFS', () => {
  beforeEach(async () => {
    // Clear all files before each test
    await clearAllContextFiles();
  });

  describe('writeContextFile', () => {
    it('should write a file and return metadata', async () => {
      const content = 'Hello, world!';
      const file = await writeContextFile(content, {
        category: 'tool-output',
        source: 'test-tool',
      });

      expect(file.content).toBe(content);
      expect(file.metadata.category).toBe('tool-output');
      expect(file.metadata.source).toBe('test-tool');
      expect(file.metadata.sizeBytes).toBe(content.length);
      expect(file.path).toContain('.cognia/context/tool-io/');
    });

    it('should estimate tokens correctly', async () => {
      const content = 'A'.repeat(1000);
      const file = await writeContextFile(content, {
        category: 'temp',
        source: 'test',
      });

      // ~0.25 tokens per char
      expect(file.metadata.estimatedTokens).toBe(250);
    });

    it('should append content when append option is true', async () => {
      const _file1 = await writeContextFile('Line 1', {
        category: 'terminal',
        source: 'session1',
        filename: 'test.txt',
      });

      const file2 = await writeContextFile('Line 2', {
        category: 'terminal',
        source: 'session1',
        filename: 'test.txt',
        append: true,
      });

      expect(file2.content).toContain('Line 1');
      expect(file2.content).toContain('Line 2');
    });

    it('should apply custom tags', async () => {
      const file = await writeContextFile('content', {
        category: 'mcp',
        source: 'server1',
        tags: ['tag1', 'tag2'],
      });

      expect(file.metadata.tags).toContain('tag1');
      expect(file.metadata.tags).toContain('tag2');
    });
  });

  describe('readContextFile', () => {
    it('should read full file content', async () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const written = await writeContextFile(content, {
        category: 'tool-output',
        source: 'test',
      });

      const read = await readContextFile(written.path);

      expect(read).not.toBeNull();
      expect(read!.content).toBe(content);
    });

    it('should read specific line range', async () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const written = await writeContextFile(content, {
        category: 'tool-output',
        source: 'test',
      });

      const read = await readContextFile(written.path, {
        startLine: 2,
        endLine: 4,
      });

      expect(read).not.toBeNull();
      expect(read!.content).toBe('Line 2\nLine 3\nLine 4');
    });

    it('should return null for non-existent file', async () => {
      const read = await readContextFile('non-existent.txt');
      expect(read).toBeNull();
    });

    it('should apply maxBytes limit', async () => {
      const content = 'A'.repeat(1000);
      const written = await writeContextFile(content, {
        category: 'temp',
        source: 'test',
      });

      const read = await readContextFile(written.path, { maxBytes: 100 });

      expect(read).not.toBeNull();
      expect(read!.content.length).toBe(100);
    });
  });

  describe('tailContextFile', () => {
    it('should read last N lines', async () => {
      const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');
      const written = await writeContextFile(content, {
        category: 'terminal',
        source: 'test',
      });

      const tail = await tailContextFile(written.path, 10);

      expect(tail).not.toBeNull();
      const tailLines = tail!.content.split('\n');
      expect(tailLines.length).toBe(10);
      expect(tailLines[0]).toBe('Line 91');
      expect(tailLines[9]).toBe('Line 100');
    });
  });

  describe('searchContextFiles', () => {
    it('should filter by category', async () => {
      await writeContextFile('content1', { category: 'tool-output', source: 'tool1' });
      await writeContextFile('content2', { category: 'terminal', source: 'session1' });
      await writeContextFile('content3', { category: 'tool-output', source: 'tool2' });

      const results = await searchContextFiles({ category: 'tool-output' });

      expect(results.length).toBe(2);
      expect(results.every(r => r.category === 'tool-output')).toBe(true);
    });

    it('should filter by source', async () => {
      await writeContextFile('content1', { category: 'mcp', source: 'server1' });
      await writeContextFile('content2', { category: 'mcp', source: 'server2' });

      const results = await searchContextFiles({ source: 'server1' });

      expect(results.length).toBe(1);
      expect(results[0].source).toBe('server1');
    });

    it('should limit results', async () => {
      for (let i = 0; i < 10; i++) {
        await writeContextFile(`content${i}`, { category: 'temp', source: `source${i}` });
      }

      const results = await searchContextFiles({ limit: 5 });

      expect(results.length).toBe(5);
    });

    it('should sort by createdAt', async () => {
      await writeContextFile('first', { category: 'temp', source: 'a' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await writeContextFile('second', { category: 'temp', source: 'b' });

      const ascResults = await searchContextFiles({ sortBy: 'createdAt', sortOrder: 'asc' });
      const descResults = await searchContextFiles({ sortBy: 'createdAt', sortOrder: 'desc' });

      expect(ascResults[0].source).toBe('a');
      expect(descResults[0].source).toBe('b');
    });

    it('should return entry path and metadata', async () => {
      const file = await writeContextFile('content', {
        category: 'mcp',
        source: 'server-1',
        filename: 'server-1_tool.json',
      });

      const entries = await searchContextFileEntries({ category: 'mcp' });

      expect(entries).toHaveLength(1);
      expect(entries[0].path).toBe(file.path);
      expect(entries[0].metadata.source).toBe('server-1');
      expect(entries[0].metadata.filename).toBe('server-1_tool.json');
    });
  });

  describe('grepContextFiles', () => {
    it('should find matching lines', async () => {
      const content = 'Line with ERROR here\nNormal line\nAnother ERROR line';
      await writeContextFile(content, { category: 'terminal', source: 'test' });

      const results = await grepContextFiles('ERROR');

      expect(results.length).toBe(2);
      expect(results[0].content).toContain('ERROR');
      expect(results[1].content).toContain('ERROR');
    });

    it('should support regex patterns', async () => {
      const content = 'error: something\nError: another\nERROR: third';
      await writeContextFile(content, { category: 'terminal', source: 'test' });

      const results = await grepContextFiles('error|Error|ERROR', { isRegex: true });

      expect(results.length).toBe(3);
    });

    it('should support case-insensitive search', async () => {
      const content = 'ERROR here\nerror there';
      await writeContextFile(content, { category: 'terminal', source: 'test' });

      const results = await grepContextFiles('error', { ignoreCase: true });

      expect(results.length).toBe(2);
    });

    it('should filter by category', async () => {
      await writeContextFile('error in terminal', { category: 'terminal', source: 'test1' });
      await writeContextFile('error in tool', { category: 'tool-output', source: 'test2' });

      const results = await grepContextFiles('error', { category: 'terminal' });

      expect(results.length).toBe(1);
    });
  });

  describe('deleteContextFile', () => {
    it('should delete an existing file', async () => {
      const file = await writeContextFile('content', { category: 'temp', source: 'test' });
      
      const deleted = await deleteContextFile(file.path);
      const read = await readContextFile(file.path);

      expect(deleted).toBe(true);
      expect(read).toBeNull();
    });

    it('should return false for non-existent file', async () => {
      const deleted = await deleteContextFile('non-existent.txt');
      expect(deleted).toBe(false);
    });
  });

  describe('getContextStats', () => {
    it('should return correct statistics', async () => {
      await writeContextFile('A'.repeat(100), { category: 'tool-output', source: 'test1' });
      await writeContextFile('B'.repeat(200), { category: 'terminal', source: 'test2' });
      await writeContextFile('C'.repeat(150), { category: 'tool-output', source: 'test3' });

      const stats = await getContextStats();

      expect(stats.filesByCategory['tool-output']).toBe(2);
      expect(stats.filesByCategory['terminal']).toBe(1);
      expect(stats.totalSizeBytes).toBe(450);
    });
  });

  describe('gcContextFiles', () => {
    it('should remove files exceeding maxAge', async () => {
      await writeContextFile('old content', { 
        category: 'temp', 
        source: 'test',
        ttlMs: 1, // 1ms TTL
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await gcContextFiles({ maxAge: 5 });

      expect(result.filesRemoved).toBe(1);
    });

    it('should respect dryRun option', async () => {
      await writeContextFile('content', { 
        category: 'temp', 
        source: 'test',
        ttlMs: 1,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await gcContextFiles({ maxAge: 5, dryRun: true });

      expect(result.filesRemoved).toBe(0);
      expect(result.filesToRemove?.length).toBe(1);
    });
  });

  describe('utility functions', () => {
    it('estimateTokens should calculate correctly', () => {
      expect(estimateTokens('A'.repeat(100))).toBe(25);
      expect(estimateTokens('A'.repeat(1000))).toBe(250);
    });

    it('formatSize should format bytes correctly', () => {
      expect(formatSize(500)).toBe('500B');
      expect(formatSize(1024)).toBe('1.0KB');
      expect(formatSize(1024 * 1024)).toBe('1.0MB');
    });

    it('isLongOutput should detect long content', () => {
      expect(isLongOutput('short')).toBe(false);
      expect(isLongOutput('A'.repeat(5000))).toBe(true);
    });

    it('createToolOutputRef should create reference', () => {
      const ref = createToolOutputRef('test-tool', '/path/to/file.txt', 'A'.repeat(1000), 5);

      expect(ref.toolName).toBe('test-tool');
      expect(ref.path).toBe('/path/to/file.txt');
      expect(ref.sizeSummary).toContain('tokens');
    });
  });
});
