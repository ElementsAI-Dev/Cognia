import type { Preset } from '@/types/content/preset';
import type { Session } from '@/types/core/session';

import {
  createPresetInputFromSession,
  createSessionUpdateFromPreset,
} from './chat-session';

describe('createSessionUpdateFromPreset', () => {
  it('maps preset fields into a chat session update payload', () => {
    const preset: Preset = {
      id: 'preset-1',
      name: 'Research Preset',
      provider: 'openai',
      model: 'gpt-4o',
      mode: 'research',
      systemPrompt: 'Focus on sources',
      builtinPrompts: [{ id: 'bp-1', name: 'Summarize', content: 'Summarize this' }],
      temperature: 0.4,
      maxTokens: 2048,
      webSearchEnabled: true,
      thinkingEnabled: true,
      usageCount: 0,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    expect(createSessionUpdateFromPreset(preset)).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
      mode: 'research',
      systemPrompt: 'Focus on sources',
      builtinPrompts: [{ id: 'bp-1', name: 'Summarize', content: 'Summarize this' }],
      temperature: 0.4,
      maxTokens: 2048,
      webSearchEnabled: true,
      thinkingEnabled: true,
      presetId: 'preset-1',
    });
  });
});

describe('createPresetInputFromSession', () => {
  it('maps session fields into preset creation input while preserving overrides', () => {
    const session: Session = {
      id: 'session-1',
      title: 'Debug Session',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      mode: 'agent',
      systemPrompt: 'Use tools carefully',
      builtinPrompts: [{ id: 'bp-1', name: 'Checklist', content: 'Make a checklist' }],
      temperature: 0.2,
      maxTokens: 4096,
      webSearchEnabled: false,
      thinkingEnabled: true,
    };

    expect(
      createPresetInputFromSession(session, {
        name: 'Saved Session',
        description: 'Saved from chat',
        icon: '🎯',
        color: '#3b82f6',
        category: 'coding',
      }),
    ).toEqual({
      name: 'Saved Session',
      description: 'Saved from chat',
      icon: '🎯',
      color: '#3b82f6',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      mode: 'agent',
      systemPrompt: 'Use tools carefully',
      builtinPrompts: [{ id: 'bp-1', name: 'Checklist', content: 'Make a checklist' }],
      temperature: 0.2,
      maxTokens: 4096,
      webSearchEnabled: false,
      thinkingEnabled: true,
      category: 'coding',
    });
  });
});
