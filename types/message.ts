/**
 * Message type definitions for the chat application
 */

import type { TokenUsage } from './usage';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-error'
  | 'output-denied';

export interface TextPart {
  type: 'text';
  content: string;
}

export interface ReasoningPart {
  type: 'reasoning';
  content: string;
  isStreaming: boolean;
  duration?: number;
}

export interface ToolInvocationPart {
  type: 'tool-invocation';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: ToolState;
  result?: unknown;
  errorText?: string;
}

export interface SourcesPart {
  type: 'sources';
  sources: Source[];
}

export interface ImagePart {
  type: 'image';
  url: string;
  alt?: string;
}

export interface FilePart {
  type: 'file';
  attachment: Attachment;
}

export type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolInvocationPart
  | SourcesPart
  | ImagePart
  | FilePart;

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'document';
  url: string;
  size: number;
  mimeType: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  snippet: string;
  relevance: number;
}

export type MessageReaction = 'like' | 'dislike';

export interface MessageEdit {
  content: string;
  editedAt: Date;
}

export interface UIMessage {
  id: string;
  role: MessageRole;
  content: string;
  parts?: MessagePart[];
  createdAt: Date;

  // Metadata
  model?: string;
  provider?: string;
  tokens?: TokenUsage;

  // Attachments
  attachments?: Attachment[];

  // Research specific
  sources?: Source[];

  // Branching support
  branchId?: string; // null/undefined means main branch
  parentMessageId?: string; // For branching from a specific message

  // Edit history
  isEdited?: boolean;
  editHistory?: MessageEdit[];
  originalContent?: string;

  // Bookmark/favorite
  isBookmarked?: boolean;
  bookmarkedAt?: Date;

  // Reactions
  reaction?: MessageReaction;

  // Translation
  translatedContent?: string;
  translatedTo?: string;

  // Error state
  error?: string;
}

export interface CreateMessageInput {
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
  branchId?: string;
}
