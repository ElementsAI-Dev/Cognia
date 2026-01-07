/**
 * Message type definitions for the chat application
 */

import type { TokenUsage } from './usage';
import type { SourceVerification } from './search';

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
  // Enhanced metadata
  description?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  riskLevel?: 'low' | 'medium' | 'high';
  isApproved?: boolean;
  // MCP server information
  /** MCP server ID if this is an MCP tool call */
  mcpServerId?: string;
  /** MCP server display name */
  mcpServerName?: string;
}

export interface SourcesPart {
  type: 'sources';
  sources: Source[];
}

export interface ImagePart {
  type: 'image';
  url: string;
  alt?: string;
  /** Base64 encoded image data */
  base64?: string;
  /** MIME type of the image */
  mimeType?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Whether this is an AI-generated image */
  isGenerated?: boolean;
  /** Original prompt used to generate the image */
  prompt?: string;
  /** Revised prompt from the model */
  revisedPrompt?: string;
}

export interface VideoPart {
  type: 'video';
  /** URL to the video */
  url?: string;
  /** Base64 encoded video data */
  base64?: string;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Thumbnail base64 */
  thumbnailBase64?: string;
  /** Video title or description */
  title?: string;
  /** Duration in seconds */
  durationSeconds?: number;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Frames per second */
  fps?: number;
  /** MIME type */
  mimeType?: string;
  /** Whether this is an AI-generated video */
  isGenerated?: boolean;
  /** Original prompt used to generate the video */
  prompt?: string;
  /** Revised prompt from the model */
  revisedPrompt?: string;
  /** Video provider (e.g., 'google-veo', 'openai-sora') */
  provider?: string;
  /** Video model used */
  model?: string;
}

export interface FilePart {
  type: 'file';
  attachment: Attachment;
}

export interface A2UIPart {
  type: 'a2ui';
  surfaceId: string;
  content: string;
}

export type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolInvocationPart
  | SourcesPart
  | ImagePart
  | VideoPart
  | FilePart
  | A2UIPart;

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'file' | 'document';
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
  /** Optional source verification data */
  verification?: SourceVerification;
}

export type MessageReaction = 'like' | 'dislike';

export interface EmojiReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

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
  reactions?: EmojiReaction[];

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
