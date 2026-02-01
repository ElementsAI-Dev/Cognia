/**
 * ChatGPT Export Format Types
 */

export interface ChatGPTConversation {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, ChatGPTNode>;
  current_node: string;
}

export interface ChatGPTNode {
  id: string;
  message: ChatGPTMessage | null;
  parent: string | null;
  children: string[];
}

export interface ChatGPTMessage {
  id: string;
  author: ChatGPTAuthor;
  create_time: number;
  update_time: number | null;
  content: ChatGPTContent;
  status: string;
  metadata?: ChatGPTMetadata;
  recipient?: string;
}

export interface ChatGPTAuthor {
  role: 'user' | 'assistant' | 'system' | 'tool';
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatGPTContent {
  content_type: string;
  parts: Array<string | ChatGPTContentPart>;
}

export interface ChatGPTContentPart {
  content_type: string;
  asset_pointer?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatGPTMetadata {
  model_slug?: string;
  default_model_slug?: string;
  timestamp_?: string;
  [key: string]: unknown;
}
