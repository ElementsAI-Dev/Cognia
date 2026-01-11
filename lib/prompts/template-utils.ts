/**
 * Helpers for prompt template parsing and substitution
 */

import type { PromptTemplate, TemplateVariable } from '@/types/content/prompt-template';

const VARIABLE_REGEX = /{{\s*([\w.-]+)\s*}}/g;

export function extractVariableNames(content: string): string[] {
  if (!content) return [];
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = VARIABLE_REGEX.exec(content)) !== null) {
    names.add(match[1]);
  }
  return Array.from(names);
}

export function buildTemplateVariables(
  content: string,
  existing: TemplateVariable[] = []
): TemplateVariable[] {
  const names = extractVariableNames(content);
  return names.map((name) => {
    const fromExisting = existing.find((v) => v.name === name);
    return (
      fromExisting || {
        name,
        description: '',
        required: false,
        type: 'text',
      }
    );
  });
}

export function applyTemplateVariables(
  content: string,
  values: Record<string, string | number | boolean | undefined>
): {
  output: string;
  missing: string[];
} {
  const missing: string[] = [];
  const output = content.replace(VARIABLE_REGEX, (_, varName: string) => {
    const value = values[varName];
    if (value === undefined || value === null || value === '') {
      missing.push(varName);
      return `{{${varName}}}`;
    }
    return String(value);
  });

  return { output, missing };
}

export function sortTemplatesByUpdatedAt(templates: PromptTemplate[]): PromptTemplate[] {
  return [...templates].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
