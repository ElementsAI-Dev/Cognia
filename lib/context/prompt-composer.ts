/**
 * Prompt composer for deterministic context assembly.
 *
 * This utility centralizes:
 * - deterministic section ordering
 * - semantic deduplication (preserve-first)
 * - per-section budget truncation
 * - basic sensitive-value redaction
 * - freshness filtering for ephemeral sections
 */

export interface ContextPromptSection {
  /** Stable section id (optional) */
  id?: string;
  /** Section source/category */
  source: string;
  /** Raw section text */
  content: string;
  /** Sort priority (lower comes first) */
  priority?: number;
  /** Optional semantic dedupe key override */
  dedupeKey?: string;
  /** Optional explicit max chars for this section */
  maxChars?: number;
  /** Timestamp for freshness filtering */
  createdAt?: Date | number;
  /** Whether this section is ephemeral */
  ephemeral?: boolean;
  /** Maximum allowed age in milliseconds */
  maxAgeMs?: number;
  /** Whether redaction should be applied to this section */
  redact?: boolean;
}

export interface ComposeContextPromptOptions {
  /** Section separator */
  separator?: string;
  /** Current clock for deterministic tests */
  nowMs?: number;
  /** Section budgets keyed by source */
  sectionBudgets?: Record<string, number>;
  /** Default max age for ephemeral sections */
  defaultEphemeralMaxAgeMs?: number;
  /** Truncation marker appended when budget is exceeded */
  truncationMarker?: string;
  /** Enable/disable semantic dedup */
  enableDeduplication?: boolean;
  /** Enable/disable freshness filtering */
  enableFreshnessFiltering?: boolean;
  /** Enable/disable content redaction */
  enableRedaction?: boolean;
}

export const DEFAULT_CONTEXT_TRUNCATION_MARKER = '[...truncated by context budget...]';

const DEFAULT_EPHEMERAL_MAX_AGE_MS = 5 * 60 * 1000;

const REDACTION_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /(api[_-]?key\s*[:=]\s*)([^\s,;]+)/gi,
    replacement: '$1[REDACTED]',
  },
  {
    pattern: /(token\s*[:=]\s*)([^\s,;]+)/gi,
    replacement: '$1[REDACTED]',
  },
  {
    pattern: /(bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi,
    replacement: '$1[REDACTED]',
  },
  {
    pattern: /\b(sk-[A-Za-z0-9]{10,})\b/g,
    replacement: '[REDACTED]',
  },
];

interface NormalizedSection {
  section: ContextPromptSection;
  index: number;
  priority: number;
  content: string;
}

function toTimestamp(value?: Date | number): number | undefined {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.getTime();
  return Number.isFinite(value) ? value : undefined;
}

function extractHeading(content: string): string | null {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match?.[1]?.trim() || null;
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSemanticKey(section: ContextPromptSection, content: string): string {
  if (section.dedupeKey && section.dedupeKey.trim()) {
    return normalizeKey(section.dedupeKey);
  }

  const heading = extractHeading(content);
  if (heading) {
    return normalizeKey(heading);
  }

  const firstLine = content.split('\n').find((line) => line.trim().length > 0) ?? '';
  return normalizeKey(firstLine.slice(0, 160));
}

function redactSensitiveContent(content: string): string {
  let sanitized = content;
  for (const { pattern, replacement } of REDACTION_RULES) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}

function isStale(
  section: ContextPromptSection,
  nowMs: number,
  defaultEphemeralMaxAgeMs: number
): boolean {
  const createdAt = toTimestamp(section.createdAt);
  if (createdAt === undefined) {
    return false;
  }

  const age = nowMs - createdAt;
  const maxAgeMs =
    section.maxAgeMs ?? (section.ephemeral ? defaultEphemeralMaxAgeMs : undefined);

  if (maxAgeMs === undefined) {
    return false;
  }

  return age > maxAgeMs;
}

function applyBudget(
  content: string,
  budget: number | undefined,
  truncationMarker: string
): string {
  if (!budget || budget <= 0) {
    return '';
  }

  if (content.length <= budget) {
    return content;
  }

  const marker = `\n\n${truncationMarker}`;
  const limit = Math.max(0, budget - marker.length);
  const truncated = content.slice(0, limit).trimEnd();
  return `${truncated}${marker}`;
}

function normalizeSections(
  sections: ContextPromptSection[],
  options: ComposeContextPromptOptions
): NormalizedSection[] {
  const nowMs = options.nowMs ?? Date.now();
  const defaultEphemeralMaxAgeMs =
    options.defaultEphemeralMaxAgeMs ?? DEFAULT_EPHEMERAL_MAX_AGE_MS;
  const enableFreshnessFiltering = options.enableFreshnessFiltering ?? true;
  const enableRedaction = options.enableRedaction ?? true;

  const normalized: NormalizedSection[] = [];

  sections.forEach((section, index) => {
    const raw = section.content?.trim();
    if (!raw) return;

    if (enableFreshnessFiltering && isStale(section, nowMs, defaultEphemeralMaxAgeMs)) {
      return;
    }

    const content = enableRedaction && section.redact !== false ? redactSensitiveContent(raw) : raw;
    if (!content.trim()) {
      return;
    }

    normalized.push({
      section,
      index,
      priority: section.priority ?? 100,
      content,
    });
  });

  normalized.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.index - b.index;
  });

  return normalized;
}

export function composeContextPrompt(
  sections: ContextPromptSection[],
  options: ComposeContextPromptOptions = {}
): string {
  const separator = options.separator ?? '\n\n';
  const truncationMarker = options.truncationMarker ?? DEFAULT_CONTEXT_TRUNCATION_MARKER;
  const enableDeduplication = options.enableDeduplication ?? true;
  const sectionBudgets = options.sectionBudgets ?? {};

  const normalized = normalizeSections(sections, options);
  if (normalized.length === 0) {
    return '';
  }

  const seen = new Set<string>();
  const parts: string[] = [];

  for (const item of normalized) {
    const key = buildSemanticKey(item.section, item.content);
    if (enableDeduplication && key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }

    const budget = item.section.maxChars ?? sectionBudgets[item.section.source];
    const bounded = applyBudget(item.content, budget, truncationMarker).trim();
    if (!bounded) continue;

    parts.push(bounded);
  }

  return parts.join(separator);
}
