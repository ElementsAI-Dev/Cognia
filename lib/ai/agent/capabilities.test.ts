/**
 * Tests for Capabilities Detection
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { z } from 'zod';
import {
  detectCapabilities,
  isTauriEnvironment,
  getCapabilitySummary,
  getCapabilitySystemPrompt,
  hasCapability,
  createCapabilityAwareTool,
} from './capabilities';

// Mock the native environment check
jest.mock('@/lib/native/environment', () => ({
  isEnvironmentAvailable: jest.fn(() => false),
}));

describe('Capabilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window state
    if (typeof window !== 'undefined') {
      delete (window as unknown as Record<string, unknown>).__TAURI__;
      delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    }
  });

  describe('isTauriEnvironment', () => {
    it('should return false in non-Tauri environment', () => {
      expect(isTauriEnvironment()).toBe(false);
    });
  });

  describe('detectCapabilities', () => {
    it('should detect web platform by default', () => {
      const caps = detectCapabilities();
      
      expect(caps.platform).toBe('web');
      expect(caps.isDesktop).toBe(false);
    });

    it('should detect MCP servers when provided', () => {
      const caps = detectCapabilities({
        mcpServers: [
          { name: 'server1', status: { type: 'connected' } },
          { name: 'server2', status: { type: 'disconnected' } },
        ],
      });

      expect(caps.features.mcpServers).toBe(true);
      expect(caps.mcpServerNames).toEqual(['server1']);
    });

    it('should detect web search when API key available', () => {
      const caps = detectCapabilities({
        hasApiKeys: { tavily: true },
      });

      expect(caps.features.webSearch).toBe(true);
    });

    it('should detect RAG when vector DB enabled', () => {
      const caps = detectCapabilities({
        vectorDbEnabled: true,
      });

      expect(caps.features.ragSearch).toBe(true);
    });

    it('should always have artifacts and memory available', () => {
      const caps = detectCapabilities();
      
      expect(caps.features.artifacts).toBe(true);
      expect(caps.features.memory).toBe(true);
      expect(caps.features.canvas).toBe(true);
    });
  });

  describe('getCapabilitySummary', () => {
    it('should generate readable summary', () => {
      const caps = detectCapabilities({
        hasApiKeys: { tavily: true },
      });
      
      const summary = getCapabilitySummary(caps);
      
      expect(summary).toContain('Platform: Web Browser');
      expect(summary).toContain('Available capabilities');
      expect(summary).toContain('Web search');
    });

    it('should list unavailable capabilities', () => {
      const caps = detectCapabilities();
      
      const summary = getCapabilitySummary(caps);
      
      expect(summary).toContain('Not available');
      expect(summary).toContain('File system access');
    });

    it('should list MCP servers when connected', () => {
      const caps = detectCapabilities({
        mcpServers: [
          { name: 'test-server', status: { type: 'connected' } },
        ],
      });
      
      const summary = getCapabilitySummary(caps);
      
      expect(summary).toContain('Connected MCP servers');
      expect(summary).toContain('test-server');
    });
  });

  describe('getCapabilitySystemPrompt', () => {
    it('should generate system prompt with available capabilities', () => {
      const caps = detectCapabilities({
        hasApiKeys: { tavily: true },
        vectorDbEnabled: true,
      });
      
      const prompt = getCapabilitySystemPrompt(caps);
      
      expect(prompt).toContain('Your Capabilities');
      expect(prompt).toContain('Search the web');
      expect(prompt).toContain('knowledge base');
    });

    it('should include artifact and memory capabilities', () => {
      const caps = detectCapabilities();
      
      const prompt = getCapabilitySystemPrompt(caps);
      
      expect(prompt).toContain('rich artifacts');
      expect(prompt).toContain('Store and recall');
    });
  });

  describe('hasCapability', () => {
    it('should check specific capability', () => {
      const caps = detectCapabilities({
        hasApiKeys: { tavily: true },
      });
      
      expect(hasCapability(caps, 'webSearch')).toBe(true);
      expect(hasCapability(caps, 'fileSystem')).toBe(false);
    });
  });

  describe('createCapabilityAwareTool', () => {
    const mockTool: {
      name: string;
      description: string;
      parameters: z.ZodType;
      execute: jest.Mock<Promise<unknown>>;
    } = {
      name: 'test_tool',
      description: 'Test tool',
      parameters: {} as z.ZodType,
      execute: jest.fn().mockResolvedValue({ success: true }),
    };

    it('should return original tool when capability available', () => {
      const caps = detectCapabilities();
      caps.features.artifacts = true;

      const wrappedTool = createCapabilityAwareTool(mockTool, 'artifacts', caps);

      expect(wrappedTool).toBe(mockTool);
    });

    it('should return error-returning tool when capability unavailable', async () => {
      const caps = detectCapabilities();
      caps.features.fileSystem = false;

      const wrappedTool = createCapabilityAwareTool(mockTool, 'fileSystem', caps);

      expect(wrappedTool).not.toBe(mockTool);

      const result = await wrappedTool.execute({}) as { success: boolean; error?: string };
      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('not available'),
      });
    });
  });
});
