/**
 * Re-export canonical types from @/types to avoid local duplication.
 * The single source of truth for Attachment is types/core/message.ts
 * and for UploadSettings / DEFAULT_UPLOAD_SETTINGS is types/core/chat-input.ts.
 */
export type { Attachment } from '@/types/core/message';
export type { UploadSettings } from '@/types/core/chat-input';
export { DEFAULT_UPLOAD_SETTINGS } from '@/types/core/chat-input';
