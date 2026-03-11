import { z } from 'zod';
import {
  DEFAULT_PPT_STYLE_KITS,
  createDefaultPPTGenerationBlueprint,
  normalizePPTGenerationBlueprint,
  type PPTAudienceTone,
  type PPTContentDensity,
  type PPTGenerationBlueprint,
  type PPTStyleKitId,
  type PPTTemplateDirection,
} from '@/types/workflow';

const templateDirectionSchema = z.enum([
  'storytelling',
  'pitch-deck',
  'reporting',
  'educational',
  'product-showcase',
  'portfolio',
]);

const audienceToneSchema = z.enum(['executive', 'professional', 'friendly', 'academic', 'creative']);

const contentDensitySchema = z.enum(['light', 'balanced', 'dense']);

const styleKitIdSchema = z.enum(['canva-clean', 'canva-bold', 'canva-elegant', 'canva-playful']);

const styleKitTokensSchema = z.object({
  palette: z
    .array(z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/))
    .length(4)
    .transform((value) => value as [string, string, string, string]),
  typographyPair: z
    .array(z.string().min(1))
    .length(2)
    .transform((value) => value as [string, string]),
  spacingRhythm: z.enum(['airy', 'balanced', 'compact']),
  visualWeight: z.enum(['soft', 'balanced', 'strong']),
  cornerRadius: z.enum(['sharp', 'rounded', 'pill']),
});

export const generationBlueprintSchema = z.object({
  templateDirection: templateDirectionSchema,
  audienceTone: audienceToneSchema,
  contentDensity: contentDensitySchema,
  styleKitId: styleKitIdSchema,
  styleTokens: styleKitTokensSchema,
});

export type GenerationBlueprintInput = Partial<{
  templateDirection: PPTTemplateDirection;
  audienceTone: PPTAudienceTone;
  contentDensity: PPTContentDensity;
  styleKitId: PPTStyleKitId;
}> &
  Partial<Pick<PPTGenerationBlueprint, 'styleTokens'>>;

/**
 * Parse and normalize blueprint input with runtime-safe defaults.
 */
export function parseGenerationBlueprint(input?: GenerationBlueprintInput): PPTGenerationBlueprint {
  const normalized = normalizePPTGenerationBlueprint(input);
  return generationBlueprintSchema.parse(normalized);
}

export function resolveStyleKitId(styleKitId?: string): PPTStyleKitId {
  if (styleKitId && styleKitId in DEFAULT_PPT_STYLE_KITS) {
    return styleKitId as PPTStyleKitId;
  }
  return 'canva-clean';
}

export function createDefaultBlueprintWithStyleKit(styleKitId?: string): PPTGenerationBlueprint {
  const resolvedKit = resolveStyleKitId(styleKitId);
  return createDefaultPPTGenerationBlueprint({ styleKitId: resolvedKit });
}

