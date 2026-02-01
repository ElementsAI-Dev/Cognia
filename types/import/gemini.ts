/**
 * Google Gemini Export Format Types
 * Supports both Google Takeout and browser extension formats
 */

/**
 * Google Takeout export structure
 */
export interface GeminiTakeoutExport {
  conversations: GeminiConversation[];
}

/**
 * Single conversation in Takeout format
 */
export interface GeminiConversation {
  id: string;
  title: string;
  create_time: string;
  update_time: string;
  messages: GeminiMessage[];
}

/**
 * Message in Gemini conversation
 */
export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  metadata?: GeminiMessageMetadata;
}

/**
 * Message metadata
 */
export interface GeminiMessageMetadata {
  model_version?: string;
  attachments?: GeminiAttachment[];
  citations?: GeminiCitation[];
}

/**
 * Attachment in Gemini message
 */
export interface GeminiAttachment {
  type: 'image' | 'file' | 'code' | 'audio' | 'video';
  name: string;
  mime_type?: string;
  size_bytes?: number;
  content?: string;
}

/**
 * Citation/source reference
 */
export interface GeminiCitation {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * Simple export format (from browser extensions)
 * Compatible with chat-exporter and similar tools
 */
export interface GeminiSimpleExport {
  messages: GeminiSimpleMessage[];
  title?: string;
  url?: string;
  exported_at?: string;
}

/**
 * Simple message format
 */
export interface GeminiSimpleMessage {
  role: 'user' | 'model';
  content: GeminiContentPart[];
}

/**
 * Content part in simple format
 */
export interface GeminiContentPart {
  type: 'text' | 'image' | 'code';
  text?: string;
  data?: string;
  language?: string;
}

/**
 * Google AI Studio export format
 */
export interface GeminiAIStudioExport {
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  messages: GeminiAIStudioMessage[];
}

/**
 * AI Studio message format
 */
export interface GeminiAIStudioMessage {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }>;
}
