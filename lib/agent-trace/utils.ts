export function countLines(content: string): number {
  if (!content) return 1;
  return content.split('\n').length;
}

export function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16)}`;
}

/**
 * Safely stringify a value to JSON, handling circular references
 */
export function safeJsonStringify(value: unknown, fallback = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

/**
 * Calculate a simple line range for content
 */
export function getLineRange(content: string): { startLine: number; endLine: number } {
  const lineCount = countLines(content);
  return { startLine: 1, endLine: lineCount };
}
