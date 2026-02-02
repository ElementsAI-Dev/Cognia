/**
 * Webhook Step Executor
 * Makes HTTP requests to external services
 * Enhanced with retry logic, timeout handling, and security validation
 */

import { withRetry, NETWORK_RETRY_CONFIG } from '@/lib/utils/retry';
import { loggers } from '@/lib/logger';
import type { WorkflowStepDefinition, StepExecutorConfig } from './types';

const log = loggers.ai;

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;

// Blocked hosts for security (prevent SSRF)
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,        // Link-local IPv4
  /^0\.0\.0\.0$/,
  /^::1$/,              // IPv6 loopback
  /^fc00:/i,            // IPv6 unique local
  /^fd00:/i,            // IPv6 unique local (fd00::/8)
  /^fe80:/i,            // IPv6 link-local
  /^::ffff:127\./i,     // IPv4-mapped IPv6 loopback
  /^::ffff:10\./i,      // IPv4-mapped IPv6 private
  /^::ffff:192\.168\./i, // IPv4-mapped IPv6 private
];

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function validateWebhookUrl(url: string, allowInternal = false): void {
  try {
    const parsed = new URL(url);
    if (!allowInternal && isBlockedHost(parsed.hostname)) {
      throw new Error(`Blocked host: ${parsed.hostname}. Internal network access is not allowed.`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Invalid protocol: ${parsed.protocol}. Only HTTP(S) is allowed.`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('Blocked')) {
      throw e;
    }
    throw new Error(`Invalid webhook URL: ${url}`);
  }
}

function sanitizeHeadersForLogging(headers: Record<string, string>): Record<string, string> {
  const sensitiveKeys = ['authorization', 'x-api-key', 'api-key', 'cookie', 'token'];
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export async function executeWebhookStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  config?: StepExecutorConfig
): Promise<unknown> {
  if (!step.webhookUrl) {
    throw new Error('Webhook step requires webhookUrl');
  }

  // Replace placeholders in URL and body
  let url = step.webhookUrl;
  let body = step.body || '';

  for (const [key, value] of Object.entries(input)) {
    url = url.replace(`{{${key}}}`, String(value));
    body = body.replace(`{{${key}}}`, String(value));
  }

  // Validate URL security
  validateWebhookUrl(url, step.allowInternalNetwork);

  const timeout = step.timeout || config?.stepTimeout || DEFAULT_TIMEOUT;
  const maxRetries = step.retries ?? config?.maxRetries ?? DEFAULT_MAX_RETRIES;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...step.headers,
  };

  log.info(`[Webhook Step] Executing request`, {
    stepId: step.id,
    stepName: step.name,
    url,
    method: step.method || 'POST',
    headers: sanitizeHeadersForLogging(requestHeaders),
    timeout,
    maxRetries,
  });

  const executeRequest = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: step.method || 'POST',
        headers: requestHeaders,
        body: step.method !== 'GET' ? body : undefined,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    const response = await withRetry(executeRequest, {
      ...NETWORK_RETRY_CONFIG,
      maxRetries,
      onRetry: (error, attempt, delay) => {
        log.warn(`[Webhook Step] Retry attempt ${attempt} after ${delay}ms`, {
          stepId: step.id,
          stepName: step.name,
          url,
          error: error.message,
        });
      },
    });

    const responseText = await response.text();
    let responseData: unknown;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Check for HTTP error status
    if (!response.ok) {
      log.warn(`[Webhook Step] HTTP error response`, {
        stepId: step.id,
        status: response.status,
        statusText: response.statusText,
      });
    }

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error(`[Webhook Step] Request failed`, {
      stepId: step.id,
      stepName: step.name,
      url,
      error: errorMessage,
    });
    throw new Error(`Webhook request failed: ${errorMessage}`);
  }
}
