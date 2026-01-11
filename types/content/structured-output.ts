/**
 * Structured Output Types
 */

import { z } from 'zod';

export interface StructuredOutputConfig {
  provider: string;
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

// Pre-defined schema types
export interface EntityExtraction {
  entities: Array<{
    name: string;
    type: 'person' | 'organization' | 'location' | 'date' | 'product' | 'other';
    description?: string;
    mentions: number;
  }>;
  summary: string;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  aspects: Array<{
    aspect: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    reason: string;
  }>;
}

export interface TextClassification {
  category: string;
  subcategory?: string;
  confidence: number;
  tags: string[];
  reasoning: string;
}

export interface QuestionAnswer {
  answer: string;
  confidence: number;
  sources?: string[];
  followUpQuestions?: string[];
}

export interface TaskExtraction {
  tasks: Array<{
    title: string;
    description?: string;
    priority: 'high' | 'medium' | 'low';
    dueDate?: string;
    assignee?: string;
    dependencies?: string[];
  }>;
}

export interface CodeAnalysis {
  language: string;
  purpose: string;
  complexity: 'simple' | 'moderate' | 'complex';
  issues: Array<{
    type: 'bug' | 'security' | 'performance' | 'style' | 'maintainability';
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    line?: number;
    suggestion?: string;
  }>;
  suggestions: string[];
}

export interface MeetingNotes {
  title: string;
  date?: string;
  attendees: string[];
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    task: string;
    assignee?: string;
    dueDate?: string;
  }>;
  decisions: string[];
  nextSteps: string[];
}
