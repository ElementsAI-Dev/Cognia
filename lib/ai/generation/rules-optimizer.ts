import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { ProviderName } from '@/types';

export interface RulesOptimizeInput {
  content: string;
  target: string; // e.g. '.cursorrules'
  context?: string; // e.g. Tech stack info
}

export interface RulesOptimizeOutput {
  optimizedContent: string;
  changes: string[];
}

export interface RulesOptimizeConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

const RULES_OPTIMIZE_PROMPT = `You are an expert in AI-driven development. Your task is to optimize an instruction rules file (like .cursorrules) for better AI coherence and project efficiency.

Optimization goals:
1. Make instructions clear, concise, and unambiguous.
2. Ensure the rules promote best practices for the given technology stack.
3. Remove redundant or contradictory rules.
4. Add missing essential rules (e.g., error handling, testing, styling conventions).
5. Improve the structure and readability of the markdown file.

Target File: {{target}}
Current Context: {{context}}

Current Rules:
{{content}}

Respond in the same language as the input.
Provide the output in JSON format:
{
  "optimizedContent": "The full optimized markdown content",
  "changes": ["List of key changes made", "Reasoning for changes"]
}`;

export async function optimizeRules(
  input: RulesOptimizeInput,
  config: RulesOptimizeConfig
): Promise<RulesOptimizeOutput> {
  const { provider, model, apiKey, baseUrl } = config;

  let modelInstance;
  if (provider === 'openai') {
    const openai = createOpenAI({ apiKey, baseURL: baseUrl });
    modelInstance = openai(model);
  } else if (provider === 'anthropic') {
    const anthropic = createAnthropic({ apiKey, baseURL: baseUrl });
    modelInstance = anthropic(model);
  } else {
    const openai = createOpenAI({ apiKey, baseURL: baseUrl });
    modelInstance = openai(model);
  }

  const systemPrompt = RULES_OPTIMIZE_PROMPT
    .replace('{{target}}', input.target)
    .replace('{{context}}', input.context || 'Not specified')
    .replace('{{content}}', input.content);

  const { text } = await generateText({
    model: modelInstance,
    system: systemPrompt,
    prompt: "Optimize the provided rules.",
  });

  try {
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonStr);
    return {
      optimizedContent: result.optimizedContent || input.content,
      changes: result.changes || [],
    };
  } catch {
    return {
      optimizedContent: text.trim() || input.content,
      changes: ['AI optimization completed but failed to parse change log.'],
    };
  }
}
