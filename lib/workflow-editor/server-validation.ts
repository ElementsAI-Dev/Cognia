import type { ValidationError } from '@/types/workflow/workflow-editor';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function asSeverity(value: unknown): ValidationError['severity'] {
  if (value === 'error' || value === 'warning' || value === 'info') {
    return value;
  }
  return 'error';
}

function normalizeValidationIssue(input: unknown, index: number): ValidationError | null {
  if (typeof input === 'string') {
    return {
      id: `server:global:validation:${index}`,
      message: input,
      severity: 'error',
      blocking: true,
      source: 'server',
    };
  }

  const issue = asRecord(input);
  if (!issue) {
    return null;
  }

  const path = Array.isArray(issue.path) ? issue.path.filter((part) => typeof part === 'string') : [];
  const fieldFromPath = path.length > 0 ? path.join('.') : undefined;

  const field = asString(issue.field) || asString(issue.parameter) || fieldFromPath;
  const nodeId =
    asString(issue.nodeId) || asString(issue.nodeID) || asString(issue.targetNodeId);
  const edgeId =
    asString(issue.edgeId) || asString(issue.edgeID) || asString(issue.targetEdgeId);
  const code = asString(issue.code) || asString(issue.errorCode) || 'validation';
  const message =
    asString(issue.message) ||
    asString(issue.detail) ||
    asString(issue.title) ||
    asString(issue.reason);

  if (!message) {
    return null;
  }

  const severity = asSeverity(issue.severity || issue.level);
  const blocking = typeof issue.blocking === 'boolean' ? issue.blocking : severity === 'error';
  const target = nodeId || edgeId || field || 'global';

  return {
    id: `server:${target}:${code}:${index}`,
    nodeId,
    edgeId,
    field,
    message,
    severity,
    blocking,
    source: 'server',
    code,
  };
}

function extractIssueLists(error: unknown): unknown[][] {
  const root = asRecord(error);
  if (!root) {
    return [];
  }

  const responseData = asRecord(root.response)?.data;
  const cause = asRecord(root.cause);

  const containers: Array<UnknownRecord | null | undefined> = [root, responseData as UnknownRecord | null, cause];
  const keys = ['validationErrors', 'errors', 'issues', 'details'];

  const lists: unknown[][] = [];
  for (const container of containers) {
    if (!container) continue;
    for (const key of keys) {
      const value = container[key];
      if (Array.isArray(value) && value.length > 0) {
        lists.push(value);
      }
    }
  }

  return lists;
}

export function normalizeServerValidationErrors(error: unknown): ValidationError[] {
  const extractedLists = extractIssueLists(error);
  const normalized = extractedLists
    .flatMap((list) => list.map((item, index) => normalizeValidationIssue(item, index)))
    .filter((issue): issue is ValidationError => issue !== null);

  if (normalized.length > 0) {
    return normalized;
  }

  const root = asRecord(error);
  const responseData = asRecord(asRecord(root?.response)?.data);
  const fallbackMessage =
    asString(root?.message) || asString(responseData?.message);

  if (!fallbackMessage) {
    return [];
  }

  const looksLikeValidationFailure =
    /validation|invalid|required|constraint|schema/i.test(fallbackMessage);
  if (!looksLikeValidationFailure) {
    return [];
  }

  return [
    {
      id: 'server:global:validation:0',
      message: fallbackMessage,
      severity: 'error',
      blocking: true,
      source: 'server',
      code: 'validation',
    },
  ];
}

export function summarizeServerValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'Validation failed';
  }

  const blockingCount = errors.filter((issue) => issue.blocking ?? issue.severity === 'error').length;
  const firstMessage = errors[0]?.message;

  if (errors.length === 1) {
    return firstMessage || 'Validation failed';
  }

  return `${blockingCount} blocking issue(s): ${firstMessage || 'Validation failed'}`;
}
