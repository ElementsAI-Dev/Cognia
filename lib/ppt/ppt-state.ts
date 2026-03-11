/**
 * PPT shared state and error vocabulary.
 * Keeps page, hooks, and stores aligned on canonical semantics.
 */

export type PPTCreationMode = 'generate' | 'import' | 'paste' | 'template';

export type PPTOperationStatus = 'idle' | 'running' | 'succeeded' | 'failed';

export type PPTProgressStage =
  | 'idle'
  | 'outline'
  | 'review'
  | 'content'
  | 'finalizing'
  | 'complete'
  | 'error';

export type PPTReviewSessionAction =
  | 'retry'
  | 'back'
  | 'cancel'
  | 'discard'
  | 'regenerate-outline'
  | 'edit-outline';

export type PPTErrorCode =
  | 'unknown'
  | 'invalid_presentation'
  | 'ingestion_error'
  | 'validation_error'
  | 'generation_error'
  | 'validation_failed'
  | 'provider_unavailable'
  | 'generation_failed'
  | 'material_processing_failed'
  | 'parse_failed'
  | 'export_failed'
  | 'popup_blocked'
  | 'state_sync_failed';

export interface PPTError {
  code: PPTErrorCode;
  message: string;
  recoverable: boolean;
}

export type PPTCreationValidationCode =
  | 'topic_required'
  | 'material_required'
  | 'invalid_url'
  | 'paste_too_short';

export interface PPTCreationValidationIssue {
  code: PPTCreationValidationCode;
  message: string;
}

export interface PPTCreationValidationInput {
  mode: Exclude<PPTCreationMode, 'template'>;
  topic: string;
  hasImportedFile?: boolean;
  importUrl?: string;
  pastedText?: string;
}

export interface PPTCreationValidationResult {
  isValid: boolean;
  normalizedTopic: string;
  issues: PPTCreationValidationIssue[];
}

const MIN_PASTE_LENGTH = 50;

export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeCreationTopic(input: PPTCreationValidationInput): string {
  const trimmedTopic = input.topic.trim();
  if (trimmedTopic) return trimmedTopic;

  if (input.mode === 'import' && input.importUrl?.trim()) {
    try {
      const url = new URL(input.importUrl.trim());
      return url.hostname;
    } catch {
      return '';
    }
  }

  if (input.mode === 'paste' && input.pastedText?.trim()) {
    return 'Presentation';
  }

  return '';
}

export function validatePPTCreationInput(
  input: PPTCreationValidationInput
): PPTCreationValidationResult {
  const normalizedTopic = normalizeCreationTopic(input);
  const issues: PPTCreationValidationIssue[] = [];

  if (!normalizedTopic) {
    issues.push({
      code: 'topic_required',
      message: 'Topic is required.',
    });
  }

  if (input.mode === 'import') {
    const hasFile = Boolean(input.hasImportedFile);
    const rawUrl = input.importUrl?.trim() || '';
    const hasUrl = rawUrl.length > 0;

    if (!hasFile && !hasUrl) {
      issues.push({
        code: 'material_required',
        message: 'Either a file or URL is required.',
      });
    }

    if (hasUrl && !isValidHttpUrl(rawUrl)) {
      issues.push({
        code: 'invalid_url',
        message: 'URL must be a valid http(s) address.',
      });
    }
  }

  if (input.mode === 'paste') {
    const textLength = input.pastedText?.trim().length || 0;
    if (textLength < MIN_PASTE_LENGTH) {
      issues.push({
        code: 'paste_too_short',
        message: `Paste content must be at least ${MIN_PASTE_LENGTH} characters.`,
      });
    }
  }

  return {
    isValid: issues.length === 0,
    normalizedTopic,
    issues,
  };
}

const DEFAULT_ERROR_MESSAGES: Record<PPTErrorCode, string> = {
  unknown: 'Unexpected error occurred.',
  invalid_presentation: 'Presentation data is invalid.',
  ingestion_error: 'Failed to ingest source materials.',
  validation_error: 'Input validation failed.',
  generation_error: 'Presentation generation failed.',
  validation_failed: 'Input validation failed.',
  provider_unavailable: 'AI provider is unavailable.',
  generation_failed: 'Presentation generation failed.',
  material_processing_failed: 'Material processing failed.',
  parse_failed: 'Failed to parse AI output.',
  export_failed: 'Failed to export presentation.',
  popup_blocked: 'Export window was blocked by browser settings.',
  state_sync_failed: 'Failed to synchronize presentation state.',
};

export function toPPTError(
  code: PPTErrorCode,
  message?: string,
  recoverable = true
): PPTError {
  return {
    code,
    message: message || DEFAULT_ERROR_MESSAGES[code],
    recoverable,
  };
}

export function classifyPPTError(
  error: unknown,
  fallbackCode: PPTErrorCode = 'unknown'
): PPTError {
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code.toLowerCase()
      : '';
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (
    code === 'unsupported_format' ||
    code === 'extraction_failed' ||
    code === 'empty_content' ||
    code === 'invalid_url' ||
    code === 'ingestion_error' ||
    code === 'material_processing_failed'
  ) {
    return toPPTError('ingestion_error', message || undefined);
  }

  if (
    code === 'validation_error' ||
    code === 'validation_failed' ||
    code === 'content_too_short' ||
    code === 'low_readability' ||
    code === 'noisy_content'
  ) {
    return toPPTError('validation_error', message || undefined);
  }

  if (code === 'generation_error' || code === 'generation_failed') {
    return toPPTError('generation_error', message || undefined);
  }

  if (normalized.includes('api key') || normalized.includes('provider')) {
    return toPPTError('provider_unavailable', message);
  }

  if (normalized.includes('parse') || normalized.includes('json')) {
    return toPPTError('parse_failed', message);
  }

  if (normalized.includes('material')) {
    return toPPTError('ingestion_error', message);
  }

  if (normalized.includes('valid') || normalized.includes('invalid') || normalized.includes('quality')) {
    return toPPTError('validation_error', message);
  }

  if (normalized.includes('generation')) {
    return toPPTError('generation_error', message);
  }

  if (normalized.includes('export')) {
    return toPPTError('export_failed', message);
  }

  if (fallbackCode === 'generation_failed') {
    return toPPTError('generation_error', message || undefined);
  }

  if (fallbackCode === 'validation_failed') {
    return toPPTError('validation_error', message || undefined);
  }

  if (fallbackCode === 'material_processing_failed') {
    return toPPTError('ingestion_error', message || undefined);
  }

  return toPPTError(fallbackCode, message || undefined);
}

export function isRetryablePPTErrorCode(code: PPTErrorCode): boolean {
  return code !== 'ingestion_error' && code !== 'validation_error';
}

export function mapPPTWorkflowStepNameToStage(stepName?: string | null): PPTProgressStage {
  const normalized = (stepName || '').toLowerCase();
  if (!normalized) return 'idle';
  if (normalized.includes('outline')) return 'outline';
  if (normalized.includes('slide')) return 'content';
  if (
    normalized.includes('material') ||
    normalized.includes('design') ||
    normalized.includes('build') ||
    normalized.includes('marp') ||
    normalized.includes('image')
  ) {
    return 'finalizing';
  }
  return 'finalizing';
}

export function shouldPreservePPTReviewSession(
  action: PPTReviewSessionAction,
  errorCode?: PPTErrorCode | null
): boolean {
  if (action === 'discard') {
    return false;
  }

  if (action === 'retry' || action === 'back' || action === 'regenerate-outline' || action === 'edit-outline') {
    return true;
  }

  if (action === 'cancel') {
    return errorCode !== 'ingestion_error' && errorCode !== 'validation_error';
  }

  return true;
}

