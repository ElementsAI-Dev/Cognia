import { readFileSync } from 'fs';
import { join } from 'path';

export interface RoutingGuardrailPattern {
  patternId: string;
  regex: RegExp;
  description: string;
}

export interface RoutingGuardrailViolation {
  filePath: string;
  patternId: string;
  description: string;
  match: string;
}

export const MIGRATED_ROUTING_GUARDRAILS: RoutingGuardrailPattern[] = [
  {
    patternId: 'legacy-model-helper',
    regex: /\bgetProviderModel\s*\(/,
    description: 'Migrated files must not call the legacy getProviderModel helper.',
  },
  {
    patternId: 'hardcoded-openai-key',
    regex: /providerSettings\.openai\?\.(apiKey|defaultModel)/,
    description: 'Migrated files must not read OpenAI credentials or models directly from settings.',
  },
  {
    patternId: 'inline-no-api-key-message',
    regex: /No API key configured/,
    description: 'Migrated files must reuse shared blocked guidance instead of hardcoded API key copy.',
  },
];

const MIGRATED_ROUTING_FILES = [
  'lib/ai/workflows/step-executors/ai-executor.ts',
  'lib/ai/prompts/prompt-optimizer.ts',
  'lib/ai/prompts/prompt-self-optimizer.ts',
  'lib/ai/generation/suggestion-generator.ts',
  'lib/ai/generation/structured-output.ts',
  'hooks/canvas/use-canvas-suggestions.ts',
  'hooks/arena/use-arena.ts',
  'lib/designer/ai/ai.ts',
  'lib/designer/ai/ai-generator.ts',
  'lib/designer/ai/ai-conversation.ts',
  'lib/designer/ai/ai-analyzer.ts',
  'lib/ai/agent/agent-executor.ts',
  'lib/ai/presets/preset-ai-service.ts',
  'hooks/media/use-image-generation.ts',
  'hooks/media/use-video-generation.ts',
  'hooks/media/use-video-analysis.ts',
  'hooks/video-studio/use-video-subtitles.ts',
  'components/chat/dialogs/image-generation-dialog.tsx',
  'components/chat/dialogs/video-generation-dialog.tsx',
  'app/(main)/image-studio/page.tsx',
];

export function validateRoutingContent(
  content: string,
  options: {
    filePath: string;
    patterns?: RoutingGuardrailPattern[];
  }
): RoutingGuardrailViolation[] {
  const patterns = options.patterns || MIGRATED_ROUTING_GUARDRAILS;
  const violations: RoutingGuardrailViolation[] = [];

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    const match = pattern.regex.exec(content);
    if (!match) continue;

    violations.push({
      filePath: options.filePath,
      patternId: pattern.patternId,
      description: pattern.description,
      match: match[0],
    });
  }

  return violations;
}

export function validateMigratedRoutingFiles(rootDir: string = process.cwd()): {
  checkedFiles: string[];
  violations: RoutingGuardrailViolation[];
} {
  const checkedFiles: string[] = [];
  const violations: RoutingGuardrailViolation[] = [];

  for (const relativePath of MIGRATED_ROUTING_FILES) {
    const absolutePath = join(rootDir, relativePath);
    const content = readFileSync(absolutePath, 'utf8');
    checkedFiles.push(relativePath);
    violations.push(...validateRoutingContent(content, { filePath: relativePath }));
  }

  return {
    checkedFiles,
    violations,
  };
}
