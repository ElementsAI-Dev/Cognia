/**
 * Canvas Actions - AI-powered text/code processing for canvas
 */

import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from './client';

export type CanvasActionType =
  | 'review'
  | 'fix'
  | 'improve'
  | 'explain'
  | 'simplify'
  | 'expand'
  | 'translate'
  | 'format'
  | 'run';

export interface CanvasActionConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
}

export interface CanvasActionResult {
  success: boolean;
  result?: string;
  explanation?: string;
  error?: string;
}

const ACTION_PROMPTS: Record<CanvasActionType, string> = {
  review: `You are a code/text reviewer. Analyze the following content and provide a detailed review including:
- Overall quality assessment
- Potential issues or bugs
- Suggestions for improvement
- Best practices that could be applied

Provide your review in a clear, structured format.`,

  fix: `You are an expert debugger and fixer. Analyze the following content and fix any issues you find:
- Fix bugs, errors, or logical issues
- Correct syntax errors
- Fix typos and grammatical errors
- Ensure proper formatting

Return ONLY the fixed content without any explanation. Preserve the original structure and style.`,

  improve: `You are an expert at improving code and text quality. Enhance the following content by:
- Improving readability and clarity
- Optimizing performance (for code)
- Following best practices
- Enhancing structure and organization

Return ONLY the improved content without any explanation. Preserve the original intent.`,

  explain: `You are an expert teacher. Explain the following content in detail:
- What it does and how it works
- Key concepts and components
- Step-by-step breakdown
- Any important considerations

Provide a clear, educational explanation suitable for someone learning.`,

  simplify: `You are an expert at simplification. Simplify the following content by:
- Reducing complexity while preserving meaning
- Using simpler language or constructs
- Removing unnecessary parts
- Making it more concise

Return ONLY the simplified content without any explanation.`,

  expand: `You are an expert at elaboration. Expand the following content by:
- Adding more detail and context
- Including examples where helpful
- Elaborating on key points
- Adding documentation or comments (for code)

Return ONLY the expanded content without any explanation.`,

  translate: `You are a professional translator. Translate the following content to the target language specified.
If no target language is specified, translate to English.
Preserve the original formatting, structure, and meaning.

Return ONLY the translated content without any explanation.`,

  format: `You are an expert at formatting. Format the following content properly:
- Apply consistent indentation
- Fix spacing and alignment
- Organize structure logically
- Follow standard formatting conventions

Return ONLY the formatted content without any explanation.`,

  run: `You are a code execution simulator. Analyze the following code and describe what would happen if it were executed:
- Expected output
- Side effects
- Potential runtime errors
- Performance considerations

Note: This is a simulation, not actual execution.`,
};

/**
 * Execute a canvas action on the given content
 */
export async function executeCanvasAction(
  actionType: CanvasActionType,
  content: string,
  config: CanvasActionConfig,
  options?: {
    language?: string;
    targetLanguage?: string;
    selection?: string;
  }
): Promise<CanvasActionResult> {
  const { provider, model, apiKey, baseURL } = config;
  const { language, targetLanguage, selection } = options || {};

  try {
    const modelInstance = getProviderModel(provider, model, apiKey, baseURL);

    let systemPrompt = ACTION_PROMPTS[actionType];
    let userPrompt = content;

    // Add language context for code
    if (language && ['review', 'fix', 'improve', 'explain', 'format', 'run'].includes(actionType)) {
      systemPrompt = `Language: ${language}\n\n${systemPrompt}`;
    }

    // Handle translation with target language
    if (actionType === 'translate' && targetLanguage) {
      systemPrompt = `Target language: ${targetLanguage}\n\n${systemPrompt}`;
    }

    // If there's a selection, process only the selection
    if (selection && selection.trim()) {
      userPrompt = selection;
    }

    const result = await generateText({
      model: modelInstance,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: actionType === 'fix' || actionType === 'format' ? 0.3 : 0.7,
    });

    // For actions that return modified content, we might want to apply it
    const isContentAction = ['fix', 'improve', 'simplify', 'expand', 'translate', 'format'].includes(actionType);

    return {
      success: true,
      result: result.text,
      explanation: isContentAction ? undefined : result.text,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Action failed',
    };
  }
}

/**
 * Apply the result of a canvas action to the original content
 * Handles both full content replacement and selection replacement
 */
export function applyCanvasActionResult(
  originalContent: string,
  result: string,
  selection?: string
): string {
  if (!selection || !selection.trim()) {
    return result;
  }

  // Replace the selection with the result
  const selectionIndex = originalContent.indexOf(selection);
  if (selectionIndex === -1) {
    return result;
  }

  return (
    originalContent.slice(0, selectionIndex) +
    result +
    originalContent.slice(selectionIndex + selection.length)
  );
}

/**
 * Get a user-friendly description of what an action does
 */
export function getActionDescription(actionType: CanvasActionType): string {
  const descriptions: Record<CanvasActionType, string> = {
    review: 'Analyze and review the content for issues and improvements',
    fix: 'Automatically fix bugs, errors, and issues',
    improve: 'Enhance quality, readability, and best practices',
    explain: 'Get a detailed explanation of how the content works',
    simplify: 'Make the content simpler and more concise',
    expand: 'Add more detail, context, and documentation',
    translate: 'Translate to another language',
    format: 'Apply proper formatting and structure',
    run: 'Simulate code execution and show expected output',
  };
  return descriptions[actionType];
}
