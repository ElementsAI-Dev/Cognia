/**
 * Goal Polish - AI-powered goal refinement utility
 * Helps users create clearer, more specific, and actionable goals
 */

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { ProviderName } from '@/types';

export interface GoalPolishInput {
  content: string;
  context?: string; // Optional conversation context
}

export interface GoalPolishOutput {
  polishedContent: string;
  suggestedSteps?: string[];
  improvements?: string[];
}

export interface GoalPolishConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

const GOAL_POLISH_PROMPT = `You are a goal refinement assistant. Your task is to take a user's goal and make it:
1. More specific and clear
2. Actionable with measurable outcomes
3. Realistic and achievable

You should also suggest 3-5 concrete steps to achieve the goal.

Respond in JSON format:
{
  "polishedContent": "The refined, specific goal",
  "suggestedSteps": ["Step 1", "Step 2", "Step 3"],
  "improvements": ["What was made more specific", "What was clarified"]
}

IMPORTANT: 
- Keep the core intent of the original goal
- Use the same language as the input (if Chinese, respond in Chinese)
- Make the goal SMART (Specific, Measurable, Achievable, Relevant, Time-bound if applicable)
- Keep the response concise and practical`;

export async function polishGoal(
  input: GoalPolishInput,
  config: GoalPolishConfig
): Promise<GoalPolishOutput> {
  const { provider, model, apiKey, baseUrl } = config;

  let modelInstance;

  if (provider === 'openai') {
    const openai = createOpenAI({
      apiKey,
      baseURL: baseUrl,
    });
    modelInstance = openai(model);
  } else if (provider === 'anthropic') {
    const anthropic = createAnthropic({
      apiKey,
      baseURL: baseUrl,
    });
    modelInstance = anthropic(model);
  } else {
    // Default to OpenAI-compatible API
    const openai = createOpenAI({
      apiKey,
      baseURL: baseUrl,
    });
    modelInstance = openai(model);
  }

  const userMessage = input.context
    ? `Context: ${input.context}\n\nGoal to refine: ${input.content}`
    : `Goal to refine: ${input.content}`;

  const { text } = await generateText({
    model: modelInstance,
    system: GOAL_POLISH_PROMPT,
    prompt: userMessage,
  });

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonStr);
    return {
      polishedContent: result.polishedContent || input.content,
      suggestedSteps: result.suggestedSteps || [],
      improvements: result.improvements || [],
    };
  } catch {
    // If JSON parsing fails, return the raw text as polished content
    return {
      polishedContent: text.trim() || input.content,
      suggestedSteps: [],
      improvements: [],
    };
  }
}
