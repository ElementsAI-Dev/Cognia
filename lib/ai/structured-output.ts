/**
 * Structured Output - Generate structured data using AI SDK
 * Uses generateObject and streamObject APIs
 */

import { generateObject as aiGenerateObject, streamObject as aiStreamObject } from 'ai';
import { z } from 'zod';
import { getProviderModel, type ProviderName } from './client';

export interface StructuredOutputConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateObjectOptions<T extends z.ZodType> {
  schema: T;
  prompt: string;
  systemPrompt?: string;
  config: StructuredOutputConfig;
}

export interface GenerateArrayOptions<T extends z.ZodType> {
  elementSchema: T;
  prompt: string;
  systemPrompt?: string;
  config: StructuredOutputConfig;
}

export interface StreamObjectOptions<T extends z.ZodType> {
  schema: T;
  prompt: string;
  systemPrompt?: string;
  config: StructuredOutputConfig;
  onPartial?: (partial: Partial<z.infer<T>>) => void;
}

/**
 * Generate a structured object based on a Zod schema
 */
export async function generateStructuredObject<T extends z.ZodType>(
  options: GenerateObjectOptions<T>
): Promise<{ object: z.infer<T> }> {
  const { schema, prompt, systemPrompt, config } = options;

  const model = getProviderModel(
    config.provider,
    config.model,
    config.apiKey,
    config.baseURL
  );

  const result = await aiGenerateObject({
    model,
    schema,
    prompt,
    system: systemPrompt,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens,
  });

  return {
    object: result.object as z.infer<T>,
  };
}

/**
 * Generate an array of structured objects
 */
export async function generateStructuredArray<T extends z.ZodType>(
  options: GenerateArrayOptions<T>
): Promise<{ object: z.infer<T>[] }> {
  const { elementSchema, prompt, systemPrompt, config } = options;

  const model = getProviderModel(
    config.provider,
    config.model,
    config.apiKey,
    config.baseURL
  );

  // Wrap element schema in array
  const arraySchema = z.array(elementSchema);

  const result = await aiGenerateObject({
    model,
    schema: arraySchema,
    prompt,
    system: systemPrompt,
    temperature: config.temperature ?? 0.7,
  });

  return {
    object: result.object as z.infer<T>[],
  };
}

/**
 * Stream a structured object with partial updates
 */
export async function streamStructuredObject<T extends z.ZodType>(
  options: StreamObjectOptions<T>
): Promise<z.infer<T>> {
  const { schema, prompt, systemPrompt, config, onPartial } = options;

  const model = getProviderModel(
    config.provider,
    config.model,
    config.apiKey,
    config.baseURL
  );

  const result = aiStreamObject({
    model,
    schema,
    prompt,
    system: systemPrompt,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens,
  });

  // Handle partial updates if callback provided
  if (onPartial) {
    for await (const partial of result.partialObjectStream) {
      onPartial(partial as Partial<z.infer<T>>);
    }
  }

  const finalResult = await result.object;
  return finalResult as z.infer<T>;
}

/**
 * Stream an array of structured objects
 */
export async function streamStructuredArray<T extends z.ZodType>(
  options: GenerateArrayOptions<T> & { onPartial?: (partial: z.infer<T>[]) => void }
): Promise<z.infer<T>[]> {
  const { elementSchema, prompt, systemPrompt, config, onPartial } = options;

  const model = getProviderModel(
    config.provider,
    config.model,
    config.apiKey,
    config.baseURL
  );

  // Wrap element schema in array
  const arraySchema = z.array(elementSchema);

  const result = aiStreamObject({
    model,
    schema: arraySchema,
    prompt,
    system: systemPrompt,
    temperature: config.temperature ?? 0.7,
  });

  if (onPartial) {
    for await (const partial of result.partialObjectStream) {
      onPartial(partial as z.infer<T>[]);
    }
  }

  const finalResult = await result.object;
  return finalResult as z.infer<T>[];
}

// ============================================
// Pre-defined schemas for common use cases
// ============================================

/**
 * Schema for extracting entities from text
 */
export const EntityExtractionSchema = z.object({
  entities: z.array(
    z.object({
      name: z.string().describe('The name of the entity'),
      type: z.enum(['person', 'organization', 'location', 'date', 'product', 'other']),
      description: z.string().optional().describe('Brief description of the entity'),
      mentions: z.number().describe('Number of times mentioned'),
    })
  ),
  summary: z.string().describe('Brief summary of the text'),
});

/**
 * Schema for sentiment analysis
 */
export const SentimentAnalysisSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  confidence: z.number().min(0).max(1),
  aspects: z.array(
    z.object({
      aspect: z.string(),
      sentiment: z.enum(['positive', 'negative', 'neutral']),
      reason: z.string(),
    })
  ),
});

/**
 * Schema for text classification
 */
export const TextClassificationSchema = z.object({
  category: z.string().describe('Primary category'),
  subcategory: z.string().optional().describe('Subcategory if applicable'),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()).describe('Relevant tags'),
  reasoning: z.string().describe('Explanation for the classification'),
});

/**
 * Schema for question answering
 */
export const QuestionAnswerSchema = z.object({
  answer: z.string().describe('The answer to the question'),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()).optional().describe('Sources used for the answer'),
  followUpQuestions: z.array(z.string()).optional().describe('Suggested follow-up questions'),
});

/**
 * Schema for task extraction
 */
export const TaskExtractionSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(['high', 'medium', 'low']),
      dueDate: z.string().optional(),
      assignee: z.string().optional(),
      dependencies: z.array(z.string()).optional(),
    })
  ),
});

/**
 * Schema for code analysis
 */
export const CodeAnalysisSchema = z.object({
  language: z.string(),
  purpose: z.string().describe('What the code does'),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  issues: z.array(
    z.object({
      type: z.enum(['bug', 'security', 'performance', 'style', 'maintainability']),
      description: z.string(),
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      line: z.number().optional(),
      suggestion: z.string().optional(),
    })
  ),
  suggestions: z.array(z.string()),
});

/**
 * Schema for meeting notes
 */
export const MeetingNotesSchema = z.object({
  title: z.string(),
  date: z.string().optional(),
  attendees: z.array(z.string()),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  actionItems: z.array(
    z.object({
      task: z.string(),
      assignee: z.string().optional(),
      dueDate: z.string().optional(),
    })
  ),
  decisions: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

// ============================================
// Helper functions for common operations
// ============================================

/**
 * Extract entities from text
 */
export async function extractEntities(
  text: string,
  config: StructuredOutputConfig
) {
  return generateStructuredObject({
    schema: EntityExtractionSchema,
    prompt: `Extract all named entities from the following text:\n\n${text}`,
    systemPrompt: 'You are an expert at extracting named entities from text. Be thorough and accurate.',
    config,
  });
}

/**
 * Analyze sentiment of text
 */
export async function analyzeSentiment(
  text: string,
  config: StructuredOutputConfig
) {
  return generateStructuredObject({
    schema: SentimentAnalysisSchema,
    prompt: `Analyze the sentiment of the following text:\n\n${text}`,
    systemPrompt: 'You are an expert at sentiment analysis. Consider both overall sentiment and specific aspects.',
    config,
  });
}

/**
 * Classify text into categories
 */
export async function classifyText(
  text: string,
  categories: string[],
  config: StructuredOutputConfig
) {
  const schema = TextClassificationSchema.extend({
    category: z.enum(categories as [string, ...string[]]),
  });

  return generateStructuredObject({
    schema,
    prompt: `Classify the following text into one of these categories: ${categories.join(', ')}\n\nText:\n${text}`,
    systemPrompt: 'You are an expert at text classification. Choose the most appropriate category.',
    config,
  });
}

/**
 * Extract tasks from text
 */
export async function extractTasks(
  text: string,
  config: StructuredOutputConfig
) {
  return generateStructuredObject({
    schema: TaskExtractionSchema,
    prompt: `Extract all tasks and action items from the following text:\n\n${text}`,
    systemPrompt: 'You are an expert at identifying tasks and action items. Be thorough.',
    config,
  });
}

/**
 * Analyze code
 */
export async function analyzeCode(
  code: string,
  language: string,
  config: StructuredOutputConfig
) {
  return generateStructuredObject({
    schema: CodeAnalysisSchema,
    prompt: `Analyze the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
    systemPrompt: 'You are an expert code reviewer. Identify issues and suggest improvements.',
    config,
  });
}

/**
 * Generate meeting notes from transcript
 */
export async function generateMeetingNotes(
  transcript: string,
  config: StructuredOutputConfig
) {
  return generateStructuredObject({
    schema: MeetingNotesSchema,
    prompt: `Generate structured meeting notes from the following transcript:\n\n${transcript}`,
    systemPrompt: 'You are an expert at summarizing meetings. Extract key information and action items.',
    config,
  });
}
