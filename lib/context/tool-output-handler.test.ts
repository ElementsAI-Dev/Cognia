/**
 * Tests for Tool Output Handler
 */

import {
  processToolOutput,
  formatToolOutputRefForPrompt,
  formatToolOutputRefsForPrompt,
  readToolOutput,
  tailToolOutput,
  getToolOutputSummary,
} from './tool-output-handler';
import { clearAllContextFiles, CONTEXT_CONSTANTS } from './context-fs';

describe('Tool Output Handler', () => {
  beforeEach(async () => {
    await clearAllContextFiles();
  });

  describe('processToolOutput', () => {
    it('should return inline content for short outputs', async () => {
      const shortOutput = 'This is a short output';
      
      const result = await processToolOutput(shortOutput, {
        toolName: 'test-tool',
      });

      expect(result.writtenToFile).toBe(false);
      expect(result.inlineContent).toBe(shortOutput);
      expect(result.wasTruncated).toBe(false);
    });

    it('should write long outputs to file', async () => {
      const longOutput = 'A'.repeat(CONTEXT_CONSTANTS.LONG_OUTPUT_THRESHOLD + 1000);
      
      const result = await processToolOutput(longOutput, {
        toolName: 'test-tool',
      });

      expect(result.writtenToFile).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.ref).toBeDefined();
      expect(result.ref?.toolName).toBe('test-tool');
    });

    it('should include tail preview for long outputs', async () => {
      // Create lines that are long enough to exceed threshold (>4000 chars)
      const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}: ${'A'.repeat(50)}`);
      const longOutput = lines.join('\n');
      
      const result = await processToolOutput(longOutput, {
        toolName: 'test-tool',
        maxPreviewLines: 10,
      });

      expect(result.writtenToFile).toBe(true);
      expect(result.inlineContent).toContain('Line 100');
      expect(result.inlineContent).toContain('lines above');
    });

    it('should force write to file when forceFile is true', async () => {
      const shortOutput = 'Short';
      
      const result = await processToolOutput(shortOutput, {
        toolName: 'test-tool',
        forceFile: true,
      });

      expect(result.writtenToFile).toBe(true);
    });

    it('should serialize objects to JSON', async () => {
      const objectOutput = { key: 'value', nested: { a: 1 } };
      
      const result = await processToolOutput(objectOutput, {
        toolName: 'test-tool',
      });

      expect(result.inlineContent).toContain('"key"');
      expect(result.inlineContent).toContain('"value"');
    });

    it('should apply custom TTL', async () => {
      const longOutput = 'A'.repeat(5000);
      
      const result = await processToolOutput(longOutput, {
        toolName: 'test-tool',
        ttlMs: 60000,
      });

      expect(result.writtenToFile).toBe(true);
    });
  });

  describe('formatToolOutputRefForPrompt', () => {
    it('should format reference for prompt', async () => {
      const longOutput = 'A'.repeat(5000);
      const result = await processToolOutput(longOutput, {
        toolName: 'my-tool',
      });

      const formatted = formatToolOutputRefForPrompt(result.ref!);

      expect(formatted).toContain('📁 Tool output saved');
      expect(formatted).toContain('my-tool');
      expect(formatted).toContain('Size:');
    });
  });

  describe('formatToolOutputRefsForPrompt', () => {
    it('should format multiple references', async () => {
      const refs = [
        { id: '1', toolName: 'tool1', path: '/path1', sizeSummary: '1KB', timestamp: new Date() },
        { id: '2', toolName: 'tool2', path: '/path2', sizeSummary: '2KB', timestamp: new Date() },
      ];

      const formatted = formatToolOutputRefsForPrompt(refs);

      expect(formatted).toContain('2 tool output(s)');
      expect(formatted).toContain('tool1');
      expect(formatted).toContain('tool2');
    });

    it('should return empty string for no refs', () => {
      const formatted = formatToolOutputRefsForPrompt([]);
      expect(formatted).toBe('');
    });
  });

  describe('readToolOutput', () => {
    it('should read tool output with range', async () => {
      const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
      const longOutput = lines.join('\n');
      
      const result = await processToolOutput(longOutput, {
        toolName: 'test-tool',
        forceFile: true,
      });

      const read = await readToolOutput(result.filePath!, 10, 20);

      expect(read).not.toBeNull();
      expect(read!.content).toContain('Line 10');
      expect(read!.content).toContain('Line 20');
    });
  });

  describe('tailToolOutput', () => {
    it('should tail tool output', async () => {
      const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
      const longOutput = lines.join('\n');
      
      const result = await processToolOutput(longOutput, {
        toolName: 'test-tool',
        forceFile: true,
      });

      const tail = await tailToolOutput(result.filePath!, 10);

      expect(tail).not.toBeNull();
      const tailLines = tail!.content.split('\n');
      expect(tailLines[tailLines.length - 1]).toBe('Line 100');
    });
  });

  describe('getToolOutputSummary', () => {
    it('should return summary with preview', async () => {
      const content = 'First line\nSecond line\nThird line\nFourth line\nFifth line\nSixth line';
      
      const result = await processToolOutput(content, {
        toolName: 'test-tool',
        forceFile: true,
      });

      const summary = await getToolOutputSummary(result.filePath!);

      expect(summary).not.toBeNull();
      expect(summary).toContain('File:');
      expect(summary).toContain('Size:');
      expect(summary).toContain('First line');
    });
  });
});
