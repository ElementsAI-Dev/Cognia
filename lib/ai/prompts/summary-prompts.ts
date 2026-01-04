/**
 * Summary Prompts - Templates for AI-powered chat summarization
 * 
 * Provides structured prompts for:
 * - Chat summarization in multiple formats
 * - Key point extraction
 * - Topic identification
 * - Multi-language support
 */

import type { UIMessage } from '@/types/message';
import type { SummaryFormat, SummaryStyle, KeyPointCategory } from '@/types/summary';

/**
 * Summary style configurations
 */
export const SUMMARY_STYLE_CONFIGS: Record<SummaryStyle, {
  name: string;
  description: string;
  instructions: string;
}> = {
  professional: {
    name: 'Professional',
    description: 'Formal, business-appropriate summary',
    instructions: 'Use formal language, focus on actionable insights and decisions made. Avoid casual expressions.',
  },
  concise: {
    name: 'Concise',
    description: 'Brief, to-the-point summary',
    instructions: 'Be extremely brief. Use short sentences. Focus only on the most critical points. Avoid elaboration.',
  },
  detailed: {
    name: 'Detailed',
    description: 'Comprehensive summary with context',
    instructions: 'Provide thorough coverage of all topics discussed. Include context, reasoning, and conclusions.',
  },
  academic: {
    name: 'Academic',
    description: 'Scholarly, analytical summary',
    instructions: 'Use academic language. Structure analysis logically. Highlight methodologies and findings. Be objective.',
  },
  casual: {
    name: 'Casual',
    description: 'Informal, easy-to-read summary',
    instructions: 'Use conversational language. Make it easy to understand. Can use common expressions.',
  },
};

/**
 * Build the main summary prompt
 */
export function buildSummaryPrompt(params: {
  messages: UIMessage[];
  format: SummaryFormat;
  style?: SummaryStyle;
  language?: string;
  maxLength?: number;
  includeCode?: boolean;
  includeToolCalls?: boolean;
  sessionTitle?: string;
  customInstructions?: string;
}): string {
  const {
    messages,
    format,
    style = 'professional',
    language,
    maxLength,
    includeCode = true,
    includeToolCalls = true,
    sessionTitle,
    customInstructions,
  } = params;

  const styleConfig = SUMMARY_STYLE_CONFIGS[style];
  const formatInstructions = getFormatInstructions(format);
  const conversationText = formatConversationForPrompt(messages, includeCode, includeToolCalls);

  const languageInstruction = language 
    ? `IMPORTANT: Write the entire summary in ${language}.`
    : 'Write the summary in the same language as the conversation.';

  const lengthInstruction = maxLength 
    ? `Keep the summary under ${maxLength} characters.`
    : '';

  return `You are an expert conversation summarizer. Your task is to create a high-quality summary of the following conversation${sessionTitle ? ` titled "${sessionTitle}"` : ''}.

## Style Guidelines
${styleConfig.instructions}

## Format Requirements
${formatInstructions}

## Additional Instructions
${languageInstruction}
${lengthInstruction}
${customInstructions || ''}

## Conversation to Summarize
${conversationText}

## Your Summary
Generate the summary now, following all the guidelines above:`;
}

/**
 * Build prompt for AI-powered key point extraction
 */
export function buildKeyPointExtractionPrompt(params: {
  messages: UIMessage[];
  maxPoints?: number;
  language?: string;
  categories?: KeyPointCategory[];
}): string {
  const {
    messages,
    maxPoints = 10,
    language,
    categories = ['question', 'answer', 'decision', 'action', 'insight', 'code', 'tool'],
  } = params;

  const conversationText = formatConversationForPrompt(messages, true, true);
  const languageInstruction = language 
    ? `Write all key points in ${language}.`
    : 'Write key points in the same language as the conversation.';

  return `You are an expert at extracting key information from conversations. Analyze the following conversation and extract the most important points.

## Instructions
1. Extract up to ${maxPoints} key points from the conversation
2. Each key point should be a single, clear statement
3. Categorize each point into one of these categories: ${categories.join(', ')}
4. Rate importance from 0.0 to 1.0 (1.0 being most important)
5. ${languageInstruction}

## Output Format
Return a JSON array with this structure:
[
  {
    "content": "The key point text",
    "category": "category_name",
    "importance": 0.85,
    "sourceRole": "user" or "assistant"
  }
]

## Conversation
${conversationText}

## Key Points (JSON array only, no other text):`;
}

/**
 * Build prompt for AI-powered topic identification
 */
export function buildTopicIdentificationPrompt(params: {
  messages: UIMessage[];
  maxTopics?: number;
  language?: string;
}): string {
  const {
    messages,
    maxTopics = 5,
    language,
  } = params;

  const conversationText = formatConversationForPrompt(messages, false, true);
  const languageInstruction = language 
    ? `Write all topics in ${language}.`
    : 'Write topics in the same language as the conversation.';

  return `You are an expert at identifying discussion topics in conversations. Analyze the following conversation and identify the main topics discussed.

## Instructions
1. Identify up to ${maxTopics} main topics from the conversation
2. For each topic, provide a brief description
3. List relevant keywords for each topic
4. Estimate what percentage of the conversation relates to each topic
5. ${languageInstruction}

## Output Format
Return a JSON array with this structure:
[
  {
    "name": "Topic Name",
    "description": "Brief description of what was discussed",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "coverage": 0.35
  }
]

## Conversation
${conversationText}

## Topics (JSON array only, no other text):`;
}

/**
 * Build prompt for incremental/continuation summary
 */
export function buildIncrementalSummaryPrompt(params: {
  previousSummary: string;
  newMessages: UIMessage[];
  format: SummaryFormat;
  style?: SummaryStyle;
  language?: string;
}): string {
  const {
    previousSummary,
    newMessages,
    format,
    style = 'professional',
    language,
  } = params;

  const styleConfig = SUMMARY_STYLE_CONFIGS[style];
  const formatInstructions = getFormatInstructions(format);
  const newConversationText = formatConversationForPrompt(newMessages, true, true);

  const languageInstruction = language 
    ? `Write the updated summary in ${language}.`
    : 'Write in the same language as the previous summary.';

  return `You are an expert conversation summarizer. Your task is to update an existing summary with new conversation content.

## Previous Summary
${previousSummary}

## New Conversation Content
${newConversationText}

## Instructions
1. Integrate the new content into the existing summary
2. Maintain consistency with the previous summary's style and structure
3. Update any conclusions or key points if the new content changes them
4. ${styleConfig.instructions}
5. ${languageInstruction}

## Format Requirements
${formatInstructions}

## Updated Summary
Generate the updated summary now:`;
}

/**
 * Build prompt for context compression (for long context management)
 */
export function buildContextCompressionPrompt(params: {
  messages: UIMessage[];
  targetTokens?: number;
  preserveRecent?: number;
}): string {
  const {
    messages,
    targetTokens = 2000,
    preserveRecent = 5,
  } = params;

  const olderMessages = messages.slice(0, -preserveRecent);
  const conversationText = formatConversationForPrompt(olderMessages, true, true);

  return `You are an expert at compressing conversation context while preserving essential information.

## Task
Compress the following conversation into a concise summary that:
1. Preserves all critical information, decisions, and context
2. Maintains any code snippets or technical details that are referenced later
3. Keeps track of any ongoing tasks or unresolved questions
4. Fits within approximately ${targetTokens} tokens

## Conversation to Compress
${conversationText}

## Output Format
Create a structured summary with these sections:
1. **Context**: Essential background information
2. **Key Decisions**: Any decisions made
3. **Technical Details**: Important code or configurations (if any)
4. **Open Items**: Unresolved questions or ongoing tasks
5. **Summary**: Brief overview of what was discussed

## Compressed Context:`;
}

/**
 * Build prompt for sentiment/quality analysis
 */
export function buildConversationAnalysisPrompt(params: {
  messages: UIMessage[];
  language?: string;
}): string {
  const { messages, language } = params;
  const conversationText = formatConversationForPrompt(messages, false, true);

  const languageInstruction = language 
    ? `Provide analysis in ${language}.`
    : 'Provide analysis in English.';

  return `Analyze the following conversation and provide insights about its quality and characteristics.

## Conversation
${conversationText}

## Analysis Required
Provide a JSON object with the following analysis:
{
  "sentiment": {
    "overall": "positive" | "neutral" | "negative",
    "userSentiment": "positive" | "neutral" | "negative",
    "assistantTone": "helpful" | "formal" | "casual" | "technical"
  },
  "quality": {
    "clarity": 0.0-1.0,
    "completeness": 0.0-1.0,
    "helpfulness": 0.0-1.0
  },
  "characteristics": {
    "isQA": boolean,
    "isTechnical": boolean,
    "isCreative": boolean,
    "isDebugSession": boolean,
    "hasCodingContent": boolean
  },
  "suggestions": ["suggestion1", "suggestion2"]
}

${languageInstruction}

## Analysis (JSON only):`;
}

/**
 * Get format-specific instructions
 */
function getFormatInstructions(format: SummaryFormat): string {
  switch (format) {
    case 'brief':
      return `Create a brief summary in 1-2 short paragraphs. Focus only on the main topic and outcome.`;
    
    case 'bullets':
      return `Create a bullet-point summary with:
- Main topic/question at the top
- Key points as bullet items (use - for bullets)
- Final outcome or conclusion at the end
Keep each bullet concise (1-2 sentences max).`;
    
    case 'structured':
      return `Create a structured summary with these sections:
## Overview
Brief description of what the conversation is about.

## Key Topics
Main topics discussed (as a list).

## Important Points
Key information, decisions, or insights.

## Conclusion
Final outcome or next steps.`;
    
    case 'detailed':
    default:
      return `Create a comprehensive summary that:
1. Opens with the main topic or question being addressed
2. Covers all significant points discussed
3. Includes any code examples or technical details mentioned (summarized)
4. Notes any tools or resources used
5. Concludes with the outcome, resolution, or next steps
Use paragraphs and clear organization.`;
  }
}

/**
 * Format conversation messages for prompt inclusion
 */
function formatConversationForPrompt(
  messages: UIMessage[],
  includeCode: boolean,
  includeToolCalls: boolean
): string {
  return messages.map(msg => {
    const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
    let content = msg.content;

    // Handle code blocks
    if (!includeCode) {
      content = content.replace(/```[\s\S]*?```/g, '[code block omitted]');
    }

    // Handle tool calls
    if (includeToolCalls && msg.parts) {
      const toolParts = msg.parts.filter(p => p.type === 'tool-invocation');
      if (toolParts.length > 0) {
        const toolNames = toolParts.map(p => (p as { toolName: string }).toolName);
        content += `\n[Tools used: ${toolNames.join(', ')}]`;
      }
    }

    // Truncate very long messages
    if (content.length > 3000) {
      content = content.slice(0, 2500) + '\n[... content truncated ...]' + content.slice(-500);
    }

    return `### ${role}\n${content}`;
  }).join('\n\n');
}

/**
 * Detect conversation language
 */
export function detectConversationLanguage(messages: UIMessage[]): string {
  // Get content from first few messages
  const sampleText = messages
    .slice(0, 5)
    .map(m => m.content)
    .join(' ')
    .slice(0, 1000);

  // Simple heuristic-based detection
  const chineseChars = (sampleText.match(/[\u4e00-\u9fff]/g) || []).length;
  const japaneseChars = (sampleText.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const koreanChars = (sampleText.match(/[\uac00-\ud7af]/g) || []).length;
  const cyrillicChars = (sampleText.match(/[\u0400-\u04ff]/g) || []).length;
  const arabicChars = (sampleText.match(/[\u0600-\u06ff]/g) || []).length;
  
  const _totalSpecialChars = chineseChars + japaneseChars + koreanChars + cyrillicChars + arabicChars;
  const threshold = sampleText.length * 0.1;

  // Check Japanese first - hiragana/katakana are uniquely Japanese
  // Japanese text may also contain Kanji (Chinese chars), but hiragana/katakana identify it as Japanese
  if (japaneseChars > 0) return 'Japanese';
  if (chineseChars > threshold) return 'Chinese';
  if (koreanChars > threshold) return 'Korean';
  if (cyrillicChars > threshold) return 'Russian';
  if (arabicChars > threshold) return 'Arabic';
  
  // Check for common language patterns
  if (/\b(el|la|los|las|una|uno|que|por|para)\b/i.test(sampleText)) return 'Spanish';
  if (/\b(le|la|les|une|des|que|pour|dans)\b/i.test(sampleText)) return 'French';
  if (/\b(der|die|das|und|ist|für|mit|auf)\b/i.test(sampleText)) return 'German';
  if (/\b(il|la|di|che|per|non|con|una)\b/i.test(sampleText)) return 'Italian';
  if (/\b(de|het|een|van|en|voor|met|op)\b/i.test(sampleText)) return 'Dutch';
  if (/\b(o|a|os|as|um|uma|de|para|que)\b/i.test(sampleText)) return 'Portuguese';

  return 'English';
}

/**
 * Summary template presets
 */
export const SUMMARY_TEMPLATES = {
  meeting: {
    name: 'Meeting Notes',
    description: 'Structured meeting summary with action items',
    prompt: `Create a meeting-style summary with:
## Meeting Summary
Brief overview of what was discussed.

## Discussion Points
- Point 1
- Point 2

## Decisions Made
- Decision 1

## Action Items
- [ ] Action item 1 (assigned to: X)
- [ ] Action item 2

## Next Steps
What happens next.`,
  },
  
  technical: {
    name: 'Technical Summary',
    description: 'Technical discussion with code highlights',
    prompt: `Create a technical summary with:
## Problem/Task
What was being solved or implemented.

## Technical Approach
How it was approached technically.

## Code Highlights
Key code snippets or configurations discussed.

## Solution/Outcome
Final solution or current status.

## Technical Notes
Any important technical details to remember.`,
  },
  
  learning: {
    name: 'Learning Session',
    description: 'Educational content summary',
    prompt: `Create a learning summary with:
## Topic Learned
Main subject of the learning session.

## Key Concepts
- Concept 1: explanation
- Concept 2: explanation

## Examples
Important examples discussed.

## Questions Answered
Q&A from the session.

## Further Learning
Topics to explore next.`,
  },
  
  debugging: {
    name: 'Debug Session',
    description: 'Debugging session summary',
    prompt: `Create a debugging summary with:
## Issue Description
What problem was being debugged.

## Investigation Steps
1. Step 1
2. Step 2

## Root Cause
What was found to be the cause.

## Solution
How it was fixed.

## Prevention
How to prevent this in the future.`,
  },
};

export type SummaryTemplate = keyof typeof SUMMARY_TEMPLATES;
