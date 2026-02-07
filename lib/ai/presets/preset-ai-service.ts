/**
 * Preset AI Service - client-side AI-powered preset generation and optimization
 * Replaces broken /api/ routes with direct AI SDK calls (compatible with static export)
 */

import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from '../core/client';
import { detectPromptLanguage } from '../prompts/prompt-optimizer';

export interface PresetAIServiceConfig {
  provider: ProviderName;
  model?: string;
  apiKey: string;
  baseURL?: string;
}

export interface GeneratedPreset {
  name: string;
  description: string;
  icon: string;
  color: string;
  mode: 'chat' | 'agent' | 'research' | 'learning';
  systemPrompt: string;
  temperature: number;
  webSearchEnabled: boolean;
  thinkingEnabled: boolean;
  builtinPrompts?: Array<{ name: string; content: string; description?: string }>;
  category?: string;
}

export interface GeneratedBuiltinPrompt {
  name: string;
  content: string;
  description?: string;
}

const PRESET_ICONS = ['💬', '🤖', '✨', '🎯', '🔮', '💡', '📝', '🎨', '💻', '🔬', '📊', '🎓', '🌟', '🚀', '⚡', '🔥'];
const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6',
];

function getModelInstance(config: PresetAIServiceConfig) {
  const provider = config.provider === ('auto' as string) ? 'openai' as ProviderName : config.provider;
  const model = config.model || 'gpt-4o-mini';
  return getProviderModel(provider, model, config.apiKey, config.baseURL);
}

/**
 * Generate a complete preset from a natural language description
 */
export async function generatePresetFromDescription(
  description: string,
  config: PresetAIServiceConfig
): Promise<{ success: boolean; preset?: GeneratedPreset; error?: string }> {
  try {
    const modelInstance = getModelInstance(config);
    const lang = detectPromptLanguage(description);

    const langInstruction = lang === 'zh'
      ? '\n\nIMPORTANT: The user description is in Chinese. Output the preset name, description, and systemPrompt in Chinese.'
      : lang === 'mixed'
        ? '\n\nIMPORTANT: The user description contains mixed Chinese and English. Preserve the language mix in the output.'
        : '';

    const result = await generateText({
      model: modelInstance,
      system: `You are an expert AI configuration designer. Generate a chat preset configuration based on the user's description.

Output a valid JSON object with these fields:
- name: A short, catchy name (2-5 words)
- description: Brief description (1 sentence)
- icon: One emoji from this list: ${PRESET_ICONS.join(', ')}
- color: One hex color from this list: ${PRESET_COLORS.join(', ')}
- mode: One of "chat", "agent", "research", "learning"
- systemPrompt: A well-crafted system prompt (100-300 words) that guides the AI behavior precisely
- temperature: A number between 0 and 2 (lower for precision, higher for creativity)
- webSearchEnabled: boolean - true if the use case benefits from web search
- thinkingEnabled: boolean - true if the use case requires deep reasoning
- builtinPrompts: Array of 2-4 quick-access prompt objects with {name, content, description}
- category: One of "general", "coding", "writing", "research", "education", "business", "creative", "productivity"

Output ONLY the JSON object, no explanation or markdown.${langInstruction}`,
      prompt: `Create a preset for: ${description}`,
      temperature: 0.7,
      maxOutputTokens: 2000,
    });

    const text = result.text.trim();
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    const preset = JSON.parse(jsonMatch[1]!.trim()) as GeneratedPreset;

    // Validate and sanitize
    if (!PRESET_ICONS.includes(preset.icon)) preset.icon = '✨';
    if (!PRESET_COLORS.includes(preset.color)) preset.color = '#6366f1';
    if (!['chat', 'agent', 'research', 'learning'].includes(preset.mode)) preset.mode = 'chat';
    preset.temperature = Math.max(0, Math.min(2, preset.temperature ?? 0.7));

    return { success: true, preset };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate preset',
    };
  }
}

/**
 * Optimize a system prompt for better AI performance
 */
export async function optimizePresetPrompt(
  prompt: string,
  config: PresetAIServiceConfig
): Promise<{ success: boolean; optimizedPrompt?: string; error?: string }> {
  try {
    const modelInstance = getModelInstance(config);
    const lang = detectPromptLanguage(prompt);

    const langInstruction = lang === 'zh'
      ? '\n\nIMPORTANT: The input prompt is in Chinese. You MUST output the optimized prompt in Chinese.'
      : lang === 'mixed'
        ? '\n\nIMPORTANT: The input prompt contains mixed Chinese and English. Preserve the language mix.'
        : '';

    const result = await generateText({
      model: modelInstance,
      system: `You are a prompt engineering expert. Optimize the given system prompt for better AI performance.

Rules:
- Preserve the original intent and core functionality
- Add clear role definition if missing
- Add specific behavioral guidelines
- Structure with clear sections if the prompt is complex
- Add output format preferences when appropriate
- Remove redundancy and ambiguity
- Keep the tone and style appropriate for the use case
- Preserve all code blocks, inline code, and technical identifiers exactly as-is
- Preserve all variable placeholders like {{variable_name}}
- Output ONLY the optimized prompt, no explanation or meta-text${langInstruction}`,
      prompt: `Original prompt:\n\n${prompt}\n\nOptimized prompt:`,
      temperature: 0.5,
      maxOutputTokens: 2000,
    });

    return { success: true, optimizedPrompt: result.text.trim() };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to optimize prompt',
    };
  }
}

/**
 * Generate built-in quick prompts for a preset
 */
export async function generateBuiltinPrompts(
  presetName: string,
  presetDescription: string | undefined,
  systemPrompt: string | undefined,
  existingPrompts: Array<{ name: string; content: string }>,
  config: PresetAIServiceConfig,
  count: number = 3
): Promise<{ success: boolean; prompts?: GeneratedBuiltinPrompt[]; error?: string }> {
  try {
    const modelInstance = getModelInstance(config);
    const lang = detectPromptLanguage(presetName + (presetDescription || '') + (systemPrompt || ''));

    const langInstruction = lang === 'zh'
      ? '\n\nIMPORTANT: The preset is in Chinese. Output prompt names, content and descriptions in Chinese.'
      : lang === 'mixed'
        ? '\n\nIMPORTANT: The preset contains mixed Chinese and English. Preserve the language mix.'
        : '';

    const existingContext = existingPrompts.length > 0
      ? `\n\nExisting prompts (do not duplicate these):\n${existingPrompts.map(p => `- ${p.name}: ${p.content}`).join('\n')}`
      : '';

    const action = existingPrompts.length > 0 ? 'enhance' : 'generate';

    const result = await generateText({
      model: modelInstance,
      system: `You are an expert at creating useful quick-access prompts for AI chat presets.

${action === 'enhance' ? 'Generate additional complementary prompts that work well alongside the existing ones.' : 'Generate a set of useful quick-access prompts for this preset.'}

Each prompt should be:
- Practical and immediately useful
- Specific to the preset's purpose
- Clear and concise (1-3 sentences each)
- Distinct from each other and from existing prompts

Output a JSON array of objects with {name, content, description} fields.
- name: Short label (2-5 words)
- content: The actual prompt text the user will send
- description: Brief explanation of what this prompt does

Output ONLY the JSON array, no explanation or markdown.${langInstruction}`,
      prompt: `Preset: "${presetName}"${presetDescription ? `\nDescription: ${presetDescription}` : ''}${systemPrompt ? `\nSystem prompt: ${systemPrompt.substring(0, 500)}` : ''}${existingContext}\n\nGenerate ${count} ${action === 'enhance' ? 'additional ' : ''}quick prompts:`,
      temperature: 0.7,
      maxOutputTokens: 1500,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    const prompts = JSON.parse(jsonMatch[1]!.trim()) as GeneratedBuiltinPrompt[];

    if (!Array.isArray(prompts)) {
      return { success: false, error: 'Invalid response format' };
    }

    return { success: true, prompts };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate prompts',
    };
  }
}
