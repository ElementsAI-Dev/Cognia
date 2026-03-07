export type GenerationCapabilityExposure =
  | "product-wired"
  | "internal-utility"
  | "experimental"
  | "legacy-compat";

export type GenerationSurfaceKind = "hook" | "service" | "route" | "export";

export interface GenerationCapabilityEntry {
  id: string;
  name: string;
  description: string;
  exposure: GenerationCapabilityExposure;
  surfaceKind: GenerationSurfaceKind;
  invocationSurface: string;
  runtimeOwner: string;
  status: "active" | "deprecated-compat";
  migrationTarget?: string;
}

export const GENERATION_CAPABILITIES: GenerationCapabilityEntry[] = [
  {
    id: "selection-skill-ai",
    name: "Selection / Skill AI generation",
    description: "Selection toolbar and Skill editor AI text processing path.",
    exposure: "product-wired",
    surfaceKind: "hook",
    invocationSurface: "hook:useSkillAI.requestAI",
    runtimeOwner: "hooks/skills/use-skill-ai.ts -> lib/ai/generation/selection-ai.ts",
    status: "active",
  },
  {
    id: "preset-generation",
    name: "Preset generation from description",
    description: "Create preset with AI from free-text use case description.",
    exposure: "product-wired",
    surfaceKind: "hook",
    invocationSurface: "hook:usePresetAI.handleGeneratePreset",
    runtimeOwner: "hooks/presets/use-preset-ai.ts -> lib/ai/presets/preset-ai-service.ts",
    status: "active",
  },
  {
    id: "preset-prompt-optimization",
    name: "Preset prompt optimization",
    description: "Optimize preset system prompt for clarity and effectiveness.",
    exposure: "product-wired",
    surfaceKind: "hook",
    invocationSurface: "hook:usePresetAI.handleOptimizePrompt",
    runtimeOwner: "hooks/presets/use-preset-ai.ts -> lib/ai/presets/preset-ai-service.ts",
    status: "active",
  },
  {
    id: "prompt-self-optimization",
    name: "Prompt self optimization workflow",
    description: "Analyze and optimize prompt templates with AI feedback loops.",
    exposure: "product-wired",
    surfaceKind: "hook",
    invocationSurface: "hook:usePromptOptimizer",
    runtimeOwner: "hooks/ai/use-prompt-optimizer.ts -> lib/ai/prompts/prompt-self-optimizer.ts",
    status: "active",
  },
  {
    id: "legacy-generate-preset-route",
    name: "Legacy generate preset API route",
    description: "Backward-compatible API wrapper for preset generation.",
    exposure: "legacy-compat",
    surfaceKind: "route",
    invocationSurface: "route:/api/generate-preset",
    runtimeOwner: "app/api/generate-preset/route.ts",
    status: "deprecated-compat",
    migrationTarget: "lib/ai/presets/preset-ai-service.ts#generatePresetFromDescription",
  },
  {
    id: "legacy-optimize-prompt-route",
    name: "Legacy optimize prompt API route",
    description: "Backward-compatible API wrapper for prompt optimization.",
    exposure: "legacy-compat",
    surfaceKind: "route",
    invocationSurface: "route:/api/optimize-prompt",
    runtimeOwner: "app/api/optimize-prompt/route.ts",
    status: "deprecated-compat",
    migrationTarget: "lib/ai/presets/preset-ai-service.ts#optimizePresetPrompt",
  },
  {
    id: "legacy-enhance-builtin-prompt-route",
    name: "Legacy enhance builtin prompts API route",
    description: "Backward-compatible API wrapper for builtin prompts generation.",
    exposure: "legacy-compat",
    surfaceKind: "route",
    invocationSurface: "route:/api/enhance-builtin-prompt",
    runtimeOwner: "app/api/enhance-builtin-prompt/route.ts",
    status: "deprecated-compat",
    migrationTarget: "lib/ai/presets/preset-ai-service.ts#generateBuiltinPrompts",
  },
  {
    id: "legacy-prompt-self-optimize-route",
    name: "Legacy prompt self optimize API route",
    description: "Backward-compatible API wrapper for prompt self optimization.",
    exposure: "legacy-compat",
    surfaceKind: "route",
    invocationSurface: "route:/api/prompt-self-optimize",
    runtimeOwner: "app/api/prompt-self-optimize/route.ts",
    status: "deprecated-compat",
    migrationTarget:
      "lib/ai/prompts/prompt-self-optimizer.ts#analyzePrompt|optimizePromptFromAnalysis",
  },
  {
    id: "sequential-helpers",
    name: "Sequential generation helpers",
    description: "Generic generation composition helpers not directly product-wired.",
    exposure: "internal-utility",
    surfaceKind: "export",
    invocationSurface: "export:lib/ai/generation/sequential",
    runtimeOwner: "lib/ai/generation/sequential.ts",
    status: "active",
  },
];

export function getGenerationCapabilityById(
  id: string
): GenerationCapabilityEntry | undefined {
  return GENERATION_CAPABILITIES.find((entry) => entry.id === id);
}

export function getProductGenerationCapabilities(): GenerationCapabilityEntry[] {
  return GENERATION_CAPABILITIES.filter(
    (entry) => entry.exposure === "product-wired"
  );
}

export function validateGenerationCapabilityRegistry(
  entries: GenerationCapabilityEntry[] = GENERATION_CAPABILITIES
): string[] {
  const errors: string[] = [];
  const idSeen = new Set<string>();
  const surfaceSeen = new Set<string>();

  for (const entry of entries) {
    if (!entry.id.trim()) {
      errors.push("Capability id cannot be empty");
    }
    if (idSeen.has(entry.id)) {
      errors.push(`Duplicate capability id: ${entry.id}`);
    } else {
      idSeen.add(entry.id);
    }

    if (!entry.invocationSurface.trim()) {
      errors.push(`Capability ${entry.id} has empty invocationSurface`);
    }
    if (surfaceSeen.has(entry.invocationSurface)) {
      errors.push(`Duplicate invocationSurface: ${entry.invocationSurface}`);
    } else {
      surfaceSeen.add(entry.invocationSurface);
    }

    if (!entry.runtimeOwner.trim()) {
      errors.push(`Capability ${entry.id} has empty runtimeOwner`);
    }

    if (entry.exposure === "legacy-compat" && !entry.migrationTarget) {
      errors.push(`Legacy capability ${entry.id} must provide migrationTarget`);
    }
  }

  return errors;
}

export function findOrphanedGenerationSurfaces(
  discoveredSurfaces: string[],
  entries: GenerationCapabilityEntry[] = GENERATION_CAPABILITIES
): string[] {
  const knownSurfaces = new Set(entries.map((entry) => entry.invocationSurface));
  return discoveredSurfaces.filter((surface) => !knownSurfaces.has(surface));
}

