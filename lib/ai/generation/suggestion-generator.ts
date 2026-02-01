/**
 * Suggestion Generator - AI-powered follow-up suggestions
 * 
 * Uses AI SDK generateObject for structured output
 * Provides reliable suggestion generation with schema validation
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { getProviderModel, type ProviderName } from '../core/client';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

export interface SuggestionGeneratorOptions {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
  maxSuggestions?: number;
  context?: string;
  temperature?: number;
}

// Zod schema for structured suggestion output
const suggestionCategorySchema = z.enum(['follow-up', 'clarification', 'exploration', 'action']);

const suggestionSchema = z.object({
  text: z.string().describe('The suggestion text, concise and actionable'),
  category: suggestionCategorySchema.describe('The type of suggestion'),
});

const suggestionsArraySchema = z.object({
  suggestions: z.array(suggestionSchema).describe('Array of follow-up suggestions'),
});

export type SuggestionCategory = z.infer<typeof suggestionCategorySchema>;

export interface GeneratedSuggestion {
  text: string;
  category?: SuggestionCategory;
}

export interface SuggestionResult {
  success: boolean;
  suggestions?: GeneratedSuggestion[];
  error?: string;
}

const SUGGESTION_SYSTEM_PROMPT = `You are a helpful assistant that generates follow-up suggestions based on a conversation.
Given the conversation context, generate short, actionable follow-up prompts that the user might want to ask next.

Rules:
- Each suggestion should be concise (under 60 characters if possible)
- Suggestions should be diverse and cover different aspects
- Include a mix of: follow-up questions, clarifications, deeper explorations, and action items
- Make suggestions natural and conversational`;

/**
 * Generate follow-up suggestions based on conversation context
 * Uses AI SDK generateObject for reliable structured output
 */
export async function generateSuggestions(
  lastUserMessage: string,
  lastAssistantMessage: string,
  options: SuggestionGeneratorOptions
): Promise<SuggestionResult> {
  const {
    provider,
    model,
    apiKey,
    baseURL,
    maxSuggestions = 4,
    context,
    temperature = 0.8,
  } = options;

  try {
    const modelInstance = getProviderModel(provider, model, apiKey, baseURL);

    const conversationContext = context
      ? `Previous context: ${context}\n\n`
      : '';

    const prompt = `${conversationContext}User: ${lastUserMessage}\n\nAssistant: ${lastAssistantMessage}\n\nGenerate ${maxSuggestions} diverse follow-up suggestions for the user.`;

    // Use generateObject for structured output
    const result = await generateObject({
      model: modelInstance,
      schema: suggestionsArraySchema,
      system: SUGGESTION_SYSTEM_PROMPT,
      prompt,
      temperature,
    });

    const suggestions = result.object.suggestions
      .slice(0, maxSuggestions)
      .filter((s) => s.text && s.text.length > 0);

    return {
      success: true,
      suggestions,
    };
  } catch (error) {
    // Fallback to default suggestions on error
    log.warn('Suggestion generation failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions',
      suggestions: getDefaultSuggestions(extractTopic(lastUserMessage)),
    };
  }
}

/**
 * Generate quick suggestions without AI (fallback)
 */
export function getDefaultSuggestions(topic?: string): GeneratedSuggestion[] {
  const defaults: GeneratedSuggestion[] = [
    { text: 'Tell me more about this', category: 'follow-up' },
    { text: 'Can you give an example?', category: 'clarification' },
    { text: 'What are the alternatives?', category: 'exploration' },
    { text: 'How do I implement this?', category: 'action' },
  ];

  if (topic) {
    return [
      { text: 'Explain ' + topic + ' in more detail', category: 'clarification' },
      { text: 'What are best practices for ' + topic + '?', category: 'exploration' },
      { text: 'Show me a ' + topic + ' example', category: 'follow-up' },
      { text: 'Help me get started with ' + topic, category: 'action' },
    ];
  }

  return defaults;
}

/**
 * Extract topic from message for better suggestions
 */
export function extractTopic(message: string): string | undefined {
  // Simple extraction - get the main subject
  const words = message.toLowerCase().split(/\s+/);
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
    'because', 'until', 'while', 'about', 'against', 'what', 'which', 'who',
    'whom', 'this', 'that', 'these', 'those', 'am', 'i', 'me', 'my', 'myself',
    'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
    'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it',
    'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  ]);

  const significantWords = words.filter(
    (word) => word.length > 3 && !stopWords.has(word)
  );

  return significantWords[0];
}
