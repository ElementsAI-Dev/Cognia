/**
 * Mode Types Tests
 *
 * @description Tests for mode integration type definitions.
 */

import type { PluginModeDef } from './types';

describe('Mode Types', () => {
  describe('PluginModeDef', () => {
    it('should create a valid mode definition', () => {
      const modeDef: PluginModeDef = {
        id: 'code-review',
        name: 'Code Review',
        description: 'Expert code review and analysis',
        icon: 'code',
        systemPrompt: 'You are an expert code reviewer...',
        tools: ['web_search', 'file_reader'],
        outputFormat: 'markdown',
        previewEnabled: true,
      };

      expect(modeDef.id).toBe('code-review');
      expect(modeDef.name).toBe('Code Review');
      expect(modeDef.description).toBe('Expert code review and analysis');
      expect(modeDef.icon).toBe('code');
      expect(modeDef.systemPrompt).toBe('You are an expert code reviewer...');
      expect(modeDef.tools).toContain('web_search');
      expect(modeDef.tools).toContain('file_reader');
      expect(modeDef.outputFormat).toBe('markdown');
      expect(modeDef.previewEnabled).toBe(true);
    });

    it('should create a minimal mode definition', () => {
      const modeDef: PluginModeDef = {
        id: 'simple-mode',
        name: 'Simple Mode',
        description: 'A simple mode',
        icon: 'star',
      };

      expect(modeDef.id).toBe('simple-mode');
      expect(modeDef.name).toBe('Simple Mode');
      expect(modeDef.systemPrompt).toBeUndefined();
      expect(modeDef.tools).toBeUndefined();
      expect(modeDef.outputFormat).toBeUndefined();
      expect(modeDef.previewEnabled).toBeUndefined();
    });

    it('should support all output formats', () => {
      const formats: NonNullable<PluginModeDef['outputFormat']>[] = [
        'text',
        'code',
        'html',
        'react',
        'markdown',
      ];

      expect(formats).toContain('text');
      expect(formats).toContain('code');
      expect(formats).toContain('html');
      expect(formats).toContain('react');
      expect(formats).toContain('markdown');
      expect(formats).toHaveLength(5);
    });

    it('should create a mode with text output format', () => {
      const modeDef: PluginModeDef = {
        id: 'text-mode',
        name: 'Text Mode',
        description: 'Plain text output',
        icon: 'file-text',
        outputFormat: 'text',
      };

      expect(modeDef.outputFormat).toBe('text');
    });

    it('should create a mode with code output format', () => {
      const modeDef: PluginModeDef = {
        id: 'code-mode',
        name: 'Code Mode',
        description: 'Code generation',
        icon: 'code',
        outputFormat: 'code',
        previewEnabled: true,
      };

      expect(modeDef.outputFormat).toBe('code');
      expect(modeDef.previewEnabled).toBe(true);
    });

    it('should create a mode with html output format', () => {
      const modeDef: PluginModeDef = {
        id: 'html-mode',
        name: 'HTML Mode',
        description: 'HTML generation',
        icon: 'globe',
        outputFormat: 'html',
        previewEnabled: true,
      };

      expect(modeDef.outputFormat).toBe('html');
    });

    it('should create a mode with react output format', () => {
      const modeDef: PluginModeDef = {
        id: 'react-mode',
        name: 'React Mode',
        description: 'React component generation',
        icon: 'component',
        outputFormat: 'react',
        previewEnabled: true,
      };

      expect(modeDef.outputFormat).toBe('react');
    });

    it('should create a mode with multiple tools', () => {
      const modeDef: PluginModeDef = {
        id: 'research-mode',
        name: 'Research Mode',
        description: 'Research assistant',
        icon: 'search',
        tools: [
          'web_search',
          'paper_search',
          'summarize',
          'cite',
          'export_bibliography',
        ],
        outputFormat: 'markdown',
      };

      expect(modeDef.tools).toHaveLength(5);
      expect(modeDef.tools).toContain('web_search');
      expect(modeDef.tools).toContain('summarize');
    });

    it('should create a mode with detailed system prompt', () => {
      const systemPrompt = `You are an expert software architect.

Your responsibilities:
1. Design scalable systems
2. Review architecture decisions
3. Recommend best practices
4. Identify potential issues

Always provide detailed explanations with examples.`;

      const modeDef: PluginModeDef = {
        id: 'architect-mode',
        name: 'Software Architect',
        description: 'Expert software architecture advice',
        icon: 'building',
        systemPrompt,
        outputFormat: 'markdown',
      };

      expect(modeDef.systemPrompt).toContain('software architect');
      expect(modeDef.systemPrompt).toContain('scalable systems');
    });

    it('should create a mode with empty tools array', () => {
      const modeDef: PluginModeDef = {
        id: 'chat-mode',
        name: 'Chat Mode',
        description: 'Basic chat mode',
        icon: 'message-circle',
        tools: [],
      };

      expect(modeDef.tools).toHaveLength(0);
    });

    it('should create mode without preview', () => {
      const modeDef: PluginModeDef = {
        id: 'analysis-mode',
        name: 'Analysis Mode',
        description: 'Data analysis mode',
        icon: 'chart-bar',
        outputFormat: 'text',
        previewEnabled: false,
      };

      expect(modeDef.previewEnabled).toBe(false);
    });
  });
});
