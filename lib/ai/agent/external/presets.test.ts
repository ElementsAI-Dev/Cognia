/**
 * @jest-environment jsdom
 */

/**
 * Tests for External Agent Presets
 */

import {
  EXTERNAL_AGENT_PRESETS,
  getAvailablePresets,
  getPresetConfig,
  createAgentFromPreset,
  isFromPreset,
  getPresetDisplayInfo,
} from './presets';
import type { ExternalAgentConfig } from '@/types/agent/external-agent';

// Mock nanoid for deterministic IDs
jest.mock('nanoid', () => ({
  nanoid: () => 'test-nanoid-id',
}));

describe('External Agent Presets', () => {
  describe('EXTERNAL_AGENT_PRESETS', () => {
    it('should have codex preset', () => {
      const preset = EXTERNAL_AGENT_PRESETS['codex'];

      expect(preset).not.toBeNull();
      expect(preset?.name).toBe('Codex CLI');
      expect(preset?.protocol).toBe('acp');
      expect(preset?.transport).toBe('stdio');
      expect(preset?.process?.command).toBe('npx');
      expect(preset?.tags).toContain('openai');
    });

    it('should have claude-code preset', () => {
      const preset = EXTERNAL_AGENT_PRESETS['claude-code'];

      expect(preset).not.toBeNull();
      expect(preset?.name).toBe('Claude Code');
      expect(preset?.protocol).toBe('acp');
      expect(preset?.tags).toContain('anthropic');
    });

    it('should have gemini-cli preset', () => {
      const preset = EXTERNAL_AGENT_PRESETS['gemini-cli'];

      expect(preset).not.toBeNull();
      expect(preset?.name).toBe('Gemini CLI');
      expect(preset?.tags).toContain('google');
    });

    it('should have custom preset as null', () => {
      expect(EXTERNAL_AGENT_PRESETS['custom']).toBeNull();
    });
  });

  describe('getAvailablePresets', () => {
    it('should return all presets except custom', () => {
      const presets = getAvailablePresets();

      expect(presets).toContain('codex');
      expect(presets).toContain('claude-code');
      expect(presets).toContain('gemini-cli');
      expect(presets).not.toContain('custom');
    });

    it('should only return non-null presets', () => {
      const presets = getAvailablePresets();

      presets.forEach((id) => {
        expect(EXTERNAL_AGENT_PRESETS[id]).not.toBeNull();
      });
    });
  });

  describe('getPresetConfig', () => {
    it('should return preset config for valid ID', () => {
      const config = getPresetConfig('codex');

      expect(config).not.toBeNull();
      expect(config?.name).toBe('Codex CLI');
    });

    it('should return null for custom preset', () => {
      const config = getPresetConfig('custom');
      expect(config).toBeNull();
    });

    it('should return correct config for each preset', () => {
      const codexConfig = getPresetConfig('codex');
      const claudeConfig = getPresetConfig('claude-code');
      const geminiConfig = getPresetConfig('gemini-cli');

      expect(codexConfig?.envVarHint).toContain('OPENAI_API_KEY');
      expect(claudeConfig?.envVarHint).toContain('ANTHROPIC_API_KEY');
      expect(geminiConfig?.envVarHint).toContain('GOOGLE_API_KEY');
    });
  });

  describe('createAgentFromPreset', () => {
    it('should create full agent config from preset', () => {
      const agent = createAgentFromPreset('codex');

      expect(agent).not.toBeNull();
      expect(agent?.id).toBe('test-nanoid-id');
      expect(agent?.name).toBe('Codex CLI');
      expect(agent?.protocol).toBe('acp');
      expect(agent?.transport).toBe('stdio');
      expect(agent?.enabled).toBe(true);
      expect(agent?.defaultPermissionMode).toBe('default');
      expect(agent?.timeout).toBe(30000);
      expect(agent?.metadata?.preset).toBe('codex');
      expect(agent?.createdAt).toBeInstanceOf(Date);
      expect(agent?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null for custom preset', () => {
      const agent = createAgentFromPreset('custom');
      expect(agent).toBeNull();
    });

    it('should allow overriding name', () => {
      const agent = createAgentFromPreset('codex', { name: 'My Custom Codex' });

      expect(agent?.name).toBe('My Custom Codex');
    });

    it('should allow overriding id', () => {
      const agent = createAgentFromPreset('codex', { id: 'custom-id-123' });

      expect(agent?.id).toBe('custom-id-123');
    });

    it('should allow overriding enabled', () => {
      const agent = createAgentFromPreset('codex', { enabled: false });

      expect(agent?.enabled).toBe(false);
    });

    it('should allow overriding permission mode', () => {
      const agent = createAgentFromPreset('codex', { defaultPermissionMode: 'bypassPermissions' });

      expect(agent?.defaultPermissionMode).toBe('bypassPermissions');
    });

    it('should merge process configuration', () => {
      const agent = createAgentFromPreset('codex', {
        process: {
          command: 'custom-command',
          args: ['--custom-arg'],
          env: { CUSTOM_VAR: 'value' },
          cwd: '/custom/path',
        },
      });

      expect(agent?.process?.command).toBe('custom-command');
      expect(agent?.process?.args).toEqual(['--custom-arg']);
      expect(agent?.process?.env?.CUSTOM_VAR).toBe('value');
      expect(agent?.process?.cwd).toBe('/custom/path');
    });

    it('should merge tags', () => {
      const agent = createAgentFromPreset('codex', { tags: ['custom-tag', 'another-tag'] });

      expect(agent?.tags).toContain('coding');
      expect(agent?.tags).toContain('openai');
      expect(agent?.tags).toContain('custom-tag');
      expect(agent?.tags).toContain('another-tag');
    });

    it('should merge metadata', () => {
      const agent = createAgentFromPreset('codex', {
        metadata: { customField: 'customValue' },
      });

      expect(agent?.metadata?.preset).toBe('codex');
      expect(agent?.metadata?.customField).toBe('customValue');
    });

    it('should override timeout', () => {
      const agent = createAgentFromPreset('codex', { timeout: 60000 });

      expect(agent?.timeout).toBe(60000);
    });

    it('should handle network config for presets without it', () => {
      const agent = createAgentFromPreset('codex', {
        network: { endpoint: 'http://localhost:8080' },
      });

      expect(agent?.network?.endpoint).toBe('http://localhost:8080');
    });
  });

  describe('isFromPreset', () => {
    it('should return preset ID for agent created from preset', () => {
      const agent = createAgentFromPreset('claude-code')!;
      const presetId = isFromPreset(agent);

      expect(presetId).toBe('claude-code');
    });

    it('should return null for agent without preset metadata', () => {
      const agent: ExternalAgentConfig = {
        id: 'custom-agent',
        name: 'Custom Agent',
        protocol: 'acp',
        transport: 'http',
        enabled: true,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const presetId = isFromPreset(agent);
      expect(presetId).toBeNull();
    });

    it('should return null for invalid preset in metadata', () => {
      const agent: ExternalAgentConfig = {
        id: 'test',
        name: 'Test',
        protocol: 'acp',
        transport: 'stdio',
        enabled: true,
        defaultPermissionMode: 'default',
        timeout: 30000,
        metadata: { preset: 'invalid-preset-id' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const presetId = isFromPreset(agent);
      expect(presetId).toBeNull();
    });

    it('should return correct ID for each preset type', () => {
      const codexAgent = createAgentFromPreset('codex')!;
      const claudeAgent = createAgentFromPreset('claude-code')!;
      const geminiAgent = createAgentFromPreset('gemini-cli')!;

      expect(isFromPreset(codexAgent)).toBe('codex');
      expect(isFromPreset(claudeAgent)).toBe('claude-code');
      expect(isFromPreset(geminiAgent)).toBe('gemini-cli');
    });
  });

  describe('getPresetDisplayInfo', () => {
    it('should return display info for valid preset', () => {
      const info = getPresetDisplayInfo('codex');

      expect(info).not.toBeNull();
      expect(info?.name).toBe('Codex CLI');
      expect(info?.description).toBe('OpenAI Codex coding assistant via ACP adapter');
      expect(info?.envVarHint).toContain('OPENAI_API_KEY');
      expect(info?.tags).toContain('coding');
    });

    it('should return null for custom preset', () => {
      const info = getPresetDisplayInfo('custom');
      expect(info).toBeNull();
    });

    it('should return correct info for claude-code', () => {
      const info = getPresetDisplayInfo('claude-code');

      expect(info?.name).toBe('Claude Code');
      expect(info?.envVarHint).toContain('ANTHROPIC_API_KEY');
      expect(info?.tags).toContain('anthropic');
    });

    it('should return correct info for gemini-cli', () => {
      const info = getPresetDisplayInfo('gemini-cli');

      expect(info?.name).toBe('Gemini CLI');
      expect(info?.envVarHint).toContain('GOOGLE_API_KEY');
      expect(info?.tags).toContain('gemini');
    });
  });

  describe('Preset Structure Validation', () => {
    it('all presets should have required fields', () => {
      const presets = getAvailablePresets();

      presets.forEach((presetId) => {
        const preset = getPresetConfig(presetId);
        expect(preset).not.toBeNull();
        expect(preset?.name).toBeTruthy();
        expect(preset?.description).toBeTruthy();
        expect(preset?.protocol).toBeTruthy();
        expect(preset?.transport).toBeTruthy();
        expect(preset?.defaultPermissionMode).toBeTruthy();
        expect(Array.isArray(preset?.tags)).toBe(true);
      });
    });

    it('stdio presets should have process config', () => {
      const presets = getAvailablePresets();

      presets.forEach((presetId) => {
        const preset = getPresetConfig(presetId);
        if (preset?.transport === 'stdio') {
          expect(preset.process).toBeDefined();
          expect(preset.process?.command).toBeTruthy();
          expect(Array.isArray(preset.process?.args)).toBe(true);
        }
      });
    });
  });
});
