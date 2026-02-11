/**
 * Chat Widget shared constants
 * Derives provider/model lists from the canonical PROVIDERS definition
 * so that changes propagate automatically.
 */

import { PROVIDERS as CANONICAL_PROVIDERS } from '@/types/provider/provider';
import type { ProviderName } from '@/types';

/** Providers shown in the chat widget (cloud + commonly used local) */
const CHAT_WIDGET_PROVIDER_IDS: ProviderName[] = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'groq',
  'mistral',
  'xai',
  'ollama',
];

/** Provider list for selectors */
export const CHAT_WIDGET_PROVIDERS: { value: ProviderName; label: string }[] =
  CHAT_WIDGET_PROVIDER_IDS
    .filter((id) => CANONICAL_PROVIDERS[id])
    .map((id) => ({
      value: id,
      label: CANONICAL_PROVIDERS[id].name,
    }));

/** Model lists keyed by provider, derived from canonical data */
export const CHAT_WIDGET_MODELS: Partial<
  Record<ProviderName, { value: string; label: string }[]>
> = Object.fromEntries(
  CHAT_WIDGET_PROVIDER_IDS
    .filter((id) => CANONICAL_PROVIDERS[id])
    .map((id) => [
      id,
      CANONICAL_PROVIDERS[id].models.map((m) => ({
        value: m.id,
        label: m.name,
      })),
    ])
);

/** Get short display name for a provider */
export function getProviderShortName(provider: ProviderName): string {
  const shortNames: Record<string, string> = {
    openai: 'GPT',
    anthropic: 'Claude',
    google: 'Gemini',
    deepseek: 'DeepSeek',
    groq: 'Groq',
    mistral: 'Mistral',
    xai: 'Grok',
    ollama: 'Local',
  };
  return shortNames[provider] || provider;
}

/** Get short display name for a model */
export function getShortModelName(model: string): string {
  const shortNames: Record<string, string> = {
    'gpt-4o': '4o',
    'gpt-4o-mini': '4o-mini',
    'o1': 'o1',
    'o1-mini': 'o1-mini',
    'claude-sonnet-4-20250514': 'Sonnet 4',
    'claude-opus-4-20250514': 'Opus 4',
    'claude-3-5-haiku-20241022': 'Haiku',
    'gemini-2.0-flash-exp': '2.0 Flash',
    'gemini-1.5-pro': '1.5 Pro',
    'gemini-1.5-flash': '1.5 Flash',
    'deepseek-chat': 'Chat',
    'deepseek-reasoner': 'Reasoner',
    'llama-3.3-70b-versatile': 'Llama 70B',
    'mixtral-8x7b-32768': 'Mixtral',
    'mistral-large-latest': 'Large',
    'mistral-small-latest': 'Small',
    'grok-3': 'Grok 3',
    'grok-3-mini': 'Grok Mini',
    'llama3.2': 'Llama 3.2',
    'qwen2.5': 'Qwen 2.5',
  };
  return shortNames[model] || model.split('-').pop() || model;
}

/** Export chat messages as a markdown file download */
export function exportChatMessages(
  messages: { role: string; content: string }[],
  t: (key: string) => string
): void {
  const content = messages
    .map(
      (m) =>
        `${m.role === 'user' ? t('export.user') : t('export.assistant')}:\n${m.content}`
    )
    .join('\n\n---\n\n');
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
