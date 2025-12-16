/**
 * Suggestion Generator - AI-powered follow-up suggestions
 */

import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from './client';

export interface SuggestionGeneratorOptions {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
  maxSuggestions?: number;
  context?: string;
}

export interface GeneratedSuggestion {
  text: string;
  category?: 'follow-up' | 'clarification' | 'exploration' | 'action';
}

export interface SuggestionResult {
  success: boolean;
  suggestions?: GeneratedSuggestion[];
  error?: string;
}

const SUGGESTION_SYSTEM_PROMPT = `You are a helpful assistant that generates follow-up suggestions based on a conversation.
Given the conversation context, generate 3-5 short, actionable follow-up prompts that the user might want to ask next.

Rules:
- Each suggestion should be concise (under 60 characters if possible)
- Suggestions should be diverse and cover different aspects
- Include a mix of: follow-up questions, clarifications, deeper explorations, and action items
- Make suggestions natural and conversational
- Output as a JSON array of objects with "text" and "category" fields
- Categories: "follow-up", "clarification", "exploration", "action"

Example output:
[
  {"text": "Can you explain that in more detail?", "category": "clarification"},
  {"text": "What are the alternatives?", "category": "exploration"},
  {"text": "Show me an example", "category": "follow-up"},
  {"text": "Help me implement this", "category": "action"}
]`;

/**
 * Generate follow-up suggestions based on conversation context
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
  } = options;

  try {
    const modelInstance = getProviderModel(provider, model, apiKey, baseURL);

    const conversationContext = context
      ? 'Previous context: ' + context + '\n\n'
      : '';

    const prompt = conversationContext + 'User: ' + lastUserMessage + '\n\nAssistant: ' + lastAssistantMessage + '\n\nGenerate ' + maxSuggestions + ' follow-up suggestions:';

    const result = await generateText({
      model: modelInstance,
      system: SUGGESTION_SYSTEM_PROMPT,
      prompt,
      temperature: 0.8,
    });

    // Parse the JSON response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as GeneratedSuggestion[];
      const suggestions = parsed
        .slice(0, maxSuggestions)
        .filter((s) => s.text && typeof s.text === 'string');

      return {
        success: true,
        suggestions,
      };
    }

    // Fallback: try to extract suggestions from plain text
    const lines = result.text.split('\n').filter((line) => line.trim());
    const suggestions: GeneratedSuggestion[] = lines
      .slice(0, maxSuggestions)
      .map((line) => ({
        text: line.replace(/^[-*\d.)\s]+/, '').trim(),
        category: 'follow-up' as const,
      }))
      .filter((s) => s.text.length > 0 && s.text.length < 100);

    if (suggestions.length > 0) {
      return {
        success: true,
        suggestions,
      };
    }

    return {
      success: false,
      error: 'Failed to parse suggestions',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions',
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
