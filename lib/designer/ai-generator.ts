/**
 * AI Generator - Multi-variant component generation with style options
 * Generates multiple design variations based on descriptions
 */

import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getProviderModel } from '@/lib/ai/core/client';
import { cleanAICodeResponse, type DesignerAIConfig } from './ai';

export type FrameworkType = 'react' | 'vue' | 'html';
export type StyleType = 'minimal' | 'modern' | 'brutalist' | 'glassmorphism' | 'neomorphism' | 'gradient';

export interface ComponentVariant {
  id: string;
  name: string;
  description: string;
  code: string;
  framework: FrameworkType;
  style: StyleType;
  features: string[];
  thumbnail?: string;
}

export interface ComponentGenerationRequest {
  description: string;
  variants?: number;
  styles?: StyleType[];
  features?: string[];
  framework?: FrameworkType;
  baseCode?: string;
}

export interface GenerationResult {
  success: boolean;
  variants?: ComponentVariant[];
  error?: string;
}

const variantSchema = z.object({
  name: z.string(),
  description: z.string(),
  code: z.string(),
  style: z.enum(['minimal', 'modern', 'brutalist', 'glassmorphism', 'neomorphism', 'gradient']),
  features: z.array(z.string()),
});

const variantsResultSchema = z.object({
  variants: z.array(variantSchema),
});

const GENERATION_SYSTEM_PROMPT = `You are an expert React component designer specializing in modern UI/UX.

Your task is to generate React component variations based on user descriptions.

Rules:
1. Always use export default function App() as the component
2. Use Tailwind CSS for all styling
3. Ensure valid JSX that can render immediately
4. Only use useState, useEffect from 'react' - no external dependencies
5. Make components visually appealing and modern
6. Include responsive design considerations
7. Follow accessibility best practices

Style Guidelines:
- minimal: Clean, simple, lots of whitespace, subtle borders
- modern: Shadows, rounded corners, gradients, animations
- brutalist: Bold borders, stark colors, no rounded corners
- glassmorphism: Blur effects, transparency, soft shadows
- neomorphism: Soft shadows, subtle 3D effect, monochromatic
- gradient: Vibrant color gradients, smooth transitions`;

/**
 * Generate a single component from description
 */
export async function generateComponent(
  description: string,
  style: StyleType,
  framework: FrameworkType,
  config: DesignerAIConfig
): Promise<{ success: boolean; variant?: ComponentVariant; error?: string }> {
  if (!config.apiKey && config.provider !== 'ollama') {
    return {
      success: false,
      error: `No API key configured for ${config.provider}`,
    };
  }

  try {
    const model = getProviderModel(
      config.provider,
      config.model,
      config.apiKey || '',
      config.baseURL
    );

    const prompt = `Create a React component based on this description:
"${description}"

Style: ${style}
Framework: ${framework}

Return ONLY the complete component code, no explanations.
Use Tailwind CSS and make it visually appealing.`;

    const result = await generateText({
      model,
      system: GENERATION_SYSTEM_PROMPT,
      prompt,
      temperature: 0.8,
    });

    if (!result.text) {
      return { success: false, error: 'No response from AI' };
    }

    const code = cleanAICodeResponse(result.text);

    const variant: ComponentVariant = {
      id: nanoid(),
      name: `${style.charAt(0).toUpperCase() + style.slice(1)} Variant`,
      description: `${style} style implementation of: ${description}`,
      code,
      framework,
      style,
      features: [],
    };

    return { success: true, variant };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed',
    };
  }
}

/**
 * Generate multiple component variants
 */
export async function generateComponentVariants(
  request: ComponentGenerationRequest,
  config: DesignerAIConfig
): Promise<GenerationResult> {
  const {
    description,
    variants: variantCount = 3,
    styles = ['minimal', 'modern', 'glassmorphism'],
    features = [],
    framework = 'react',
  } = request;

  if (!config.apiKey && config.provider !== 'ollama') {
    return {
      success: false,
      error: `No API key configured for ${config.provider}`,
    };
  }

  try {
    const model = getProviderModel(
      config.provider,
      config.model,
      config.apiKey || '',
      config.baseURL
    );

    const stylesPrompt = styles.slice(0, variantCount).join(', ');
    const featuresPrompt = features.length > 0 ? `\nRequired features: ${features.join(', ')}` : '';

    const prompt = `Create ${variantCount} React component variations based on this description:
"${description}"

Generate variants in these styles: ${stylesPrompt}${featuresPrompt}

For each variant, provide:
- A descriptive name
- A brief description
- The complete React component code
- The style type used
- Features included

Each component must:
- Use export default function App()
- Use Tailwind CSS for styling
- Be visually distinct from other variants
- Be production-ready code`;

    const result = await generateObject({
      model,
      schema: variantsResultSchema,
      system: GENERATION_SYSTEM_PROMPT,
      prompt,
      temperature: 0.8,
    });

    const variants: ComponentVariant[] = result.object.variants.map((v) => ({
      id: nanoid(),
      name: v.name,
      description: v.description,
      code: cleanAICodeResponse(v.code),
      framework,
      style: v.style as StyleType,
      features: v.features,
    }));

    return { success: true, variants };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed',
    };
  }
}

/**
 * Generate variant from existing code
 */
export async function generateVariantFromCode(
  baseCode: string,
  targetStyle: StyleType,
  config: DesignerAIConfig
): Promise<{ success: boolean; variant?: ComponentVariant; error?: string }> {
  if (!config.apiKey && config.provider !== 'ollama') {
    return {
      success: false,
      error: `No API key configured for ${config.provider}`,
    };
  }

  try {
    const model = getProviderModel(
      config.provider,
      config.model,
      config.apiKey || '',
      config.baseURL
    );

    const prompt = `Transform this React component to use "${targetStyle}" style:

${baseCode}

Keep the same functionality but completely restyle it using the ${targetStyle} design approach.
Return ONLY the complete modified code.`;

    const result = await generateText({
      model,
      system: GENERATION_SYSTEM_PROMPT,
      prompt,
      temperature: 0.7,
    });

    if (!result.text) {
      return { success: false, error: 'No response from AI' };
    }

    const code = cleanAICodeResponse(result.text);

    const variant: ComponentVariant = {
      id: nanoid(),
      name: `${targetStyle.charAt(0).toUpperCase() + targetStyle.slice(1)} Variant`,
      description: `${targetStyle} style variant`,
      code,
      framework: 'react',
      style: targetStyle,
      features: [],
    };

    return { success: true, variant };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed',
    };
  }
}

/**
 * Generate component with specific features
 */
export async function generateComponentWithFeatures(
  description: string,
  features: string[],
  config: DesignerAIConfig
): Promise<{ success: boolean; variant?: ComponentVariant; error?: string }> {
  if (!config.apiKey && config.provider !== 'ollama') {
    return {
      success: false,
      error: `No API key configured for ${config.provider}`,
    };
  }

  try {
    const model = getProviderModel(
      config.provider,
      config.model,
      config.apiKey || '',
      config.baseURL
    );

    const featuresList = features.map((f) => `- ${f}`).join('\n');

    const prompt = `Create a React component based on this description:
"${description}"

Required features:
${featuresList}

The component must include all specified features.
Return ONLY the complete component code.
Use Tailwind CSS and make it visually modern.`;

    const result = await generateText({
      model,
      system: GENERATION_SYSTEM_PROMPT,
      prompt,
      temperature: 0.7,
    });

    if (!result.text) {
      return { success: false, error: 'No response from AI' };
    }

    const code = cleanAICodeResponse(result.text);

    const variant: ComponentVariant = {
      id: nanoid(),
      name: 'Feature-rich Variant',
      description: `Component with: ${features.join(', ')}`,
      code,
      framework: 'react',
      style: 'modern',
      features,
    };

    return { success: true, variant };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed',
    };
  }
}

/**
 * Predefined component templates
 */
export const COMPONENT_TEMPLATES = {
  hero: {
    name: 'Hero Section',
    description: 'A landing page hero section with headline, subtext, and CTA',
    features: ['headline', 'subtitle', 'cta-button', 'responsive'],
  },
  card: {
    name: 'Card Component',
    description: 'A versatile card with image, title, description, and actions',
    features: ['image', 'title', 'description', 'actions', 'hover-effects'],
  },
  form: {
    name: 'Contact Form',
    description: 'A form with inputs, validation hints, and submit button',
    features: ['inputs', 'validation', 'submit', 'accessible'],
  },
  navbar: {
    name: 'Navigation Bar',
    description: 'A responsive navigation bar with logo, links, and mobile menu',
    features: ['logo', 'nav-links', 'mobile-menu', 'responsive'],
  },
  pricing: {
    name: 'Pricing Table',
    description: 'A pricing comparison table with features and CTA',
    features: ['tiers', 'features-list', 'highlighted-tier', 'cta'],
  },
  testimonial: {
    name: 'Testimonial Section',
    description: 'Customer testimonials with avatar, quote, and name',
    features: ['avatar', 'quote', 'name', 'company', 'rating'],
  },
  footer: {
    name: 'Footer',
    description: 'A site footer with links, social media, and copyright',
    features: ['link-columns', 'social-icons', 'copyright', 'newsletter'],
  },
  feature: {
    name: 'Feature Grid',
    description: 'A grid of features with icons and descriptions',
    features: ['icons', 'titles', 'descriptions', 'grid-layout'],
  },
} as const;

export type ComponentTemplateKey = keyof typeof COMPONENT_TEMPLATES;

/**
 * Generate from predefined template
 */
export async function generateFromTemplate(
  templateKey: ComponentTemplateKey,
  style: StyleType,
  config: DesignerAIConfig
): Promise<{ success: boolean; variant?: ComponentVariant; error?: string }> {
  const template = COMPONENT_TEMPLATES[templateKey];
  
  return generateComponent(
    template.description,
    style,
    'react',
    config
  );
}

const aiGeneratorAPI = {
  generateComponent,
  generateComponentVariants,
  generateVariantFromCode,
  generateComponentWithFeatures,
  generateFromTemplate,
  COMPONENT_TEMPLATES,
};

export default aiGeneratorAPI;
