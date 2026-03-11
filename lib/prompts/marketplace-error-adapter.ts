import { PromptMarketplaceRepositoryError as PromptMarketplaceRepositoryErrorCtor } from './marketplace';
import type { PromptMarketplaceErrorCategory } from './marketplace-utils';

export interface PromptMarketplaceNormalizedError {
  message: string;
  category: PromptMarketplaceErrorCategory;
  code: string;
  retryable: boolean;
  status?: number;
}

function mapRepositoryCode(
  code: string,
  status?: number
): Pick<PromptMarketplaceNormalizedError, 'category' | 'retryable' | 'code'> {
  switch (code) {
    case 'NOT_CONFIGURED':
      return { category: 'validation', retryable: false, code };
    case 'NETWORK':
    case 'REQUEST_TIMEOUT':
      return { category: 'network', retryable: true, code };
    case 'HTTP':
      if (status === 401 || status === 403) {
        return { category: 'auth', retryable: false, code: `HTTP_${status}` };
      }
      if (status === 429) {
        return { category: 'rate_limit', retryable: true, code: `HTTP_${status}` };
      }
      if (status === 404) {
        return { category: 'not_found', retryable: false, code: `HTTP_${status}` };
      }
      if (status === 409) {
        return { category: 'conflict', retryable: true, code: `HTTP_${status}` };
      }
      if (status && status >= 500) {
        return { category: 'network', retryable: true, code: `HTTP_${status}` };
      }
      return { category: 'unknown', retryable: true, code: `HTTP_${status || 'unknown'}` };
    case 'INVALID_PAYLOAD':
    case 'REMOTE_EMPTY':
      return { category: 'validation', retryable: false, code };
    case 'UNKNOWN':
    default:
      return { category: 'unknown', retryable: true, code: code || 'UNKNOWN' };
  }
}

function mapErrorMessage(message: string): Pick<PromptMarketplaceNormalizedError, 'category' | 'retryable' | 'code'> {
  const lower = message.toLowerCase();
  if (
    lower.includes('auth')
    || lower.includes('unauthorized')
    || lower.includes('forbidden')
    || lower.includes('api key')
  ) {
    return { category: 'auth', retryable: false, code: 'AUTH_MESSAGE' };
  }
  if (lower.includes('rate') || lower.includes('too many requests') || lower.includes('429')) {
    return { category: 'rate_limit', retryable: true, code: 'RATE_LIMIT_MESSAGE' };
  }
  if (
    lower.includes('network')
    || lower.includes('timeout')
    || lower.includes('connection')
    || lower.includes('offline')
  ) {
    return { category: 'network', retryable: true, code: 'NETWORK_MESSAGE' };
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return { category: 'not_found', retryable: false, code: 'NOT_FOUND_MESSAGE' };
  }
  if (
    lower.includes('invalid')
    || lower.includes('required')
    || lower.includes('validation')
    || lower.includes('payload')
  ) {
    return { category: 'validation', retryable: false, code: 'VALIDATION_MESSAGE' };
  }
  if (lower.includes('conflict') || lower.includes('already')) {
    return { category: 'conflict', retryable: true, code: 'CONFLICT_MESSAGE' };
  }
  return { category: 'unknown', retryable: true, code: 'UNKNOWN_MESSAGE' };
}

export function normalizePromptMarketplaceError(
  error: unknown,
  fallbackMessage: string = 'Unknown marketplace error'
): PromptMarketplaceNormalizedError {
  if (
    typeof PromptMarketplaceRepositoryErrorCtor === 'function'
    && error instanceof PromptMarketplaceRepositoryErrorCtor
  ) {
    const mapped = mapRepositoryCode(error.code, error.status);
    return {
      message: error.message || fallbackMessage,
      category: mapped.category,
      retryable: mapped.retryable,
      code: mapped.code,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    const mapped = mapErrorMessage(error.message || fallbackMessage);
    return {
      message: error.message || fallbackMessage,
      category: mapped.category,
      retryable: mapped.retryable,
      code: mapped.code,
    };
  }

  return {
    message: fallbackMessage,
    category: 'unknown',
    retryable: true,
    code: 'UNKNOWN',
  };
}

export function getPromptMarketplaceErrorMessageKey(
  category: PromptMarketplaceErrorCategory | undefined
): string {
  switch (category) {
    case 'auth':
      return 'errors.auth';
    case 'network':
      return 'errors.network';
    case 'rate_limit':
      return 'errors.rateLimit';
    case 'validation':
      return 'errors.validation';
    case 'not_found':
      return 'errors.notFound';
    case 'conflict':
      return 'errors.conflict';
    case 'unknown':
    default:
      return 'errors.unknown';
  }
}
