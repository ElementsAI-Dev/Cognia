/**
 * PPT Generation Workflow - Complete workflow for generating presentations
 * 
 * Enhanced workflow with:
 * - Material extraction and summarization
 * - AI-powered content analysis
 * - Intelligent outline generation
 * - Slide content generation with rich elements
 * - Image generation for visual slides
 * - Multiple export formats
 */

import type {
  WorkflowDefinition,
  WorkflowTemplate,
  PPTPresentation,
  PPTSlide,
  PPTOutlineItem,
  PPTGenerationOptions,
  PPTEnhancedOutlineItem,
  PPTEnhancedSlide,
  PPTMaterial,
  PPTMaterialAnalysis,
  PPTEnhancedGenerationOptions,
  PPTImageStyle,
} from '@/types/workflow';
import { getGlobalWorkflowRegistry } from './registry';

/**
 * PPT Generation Workflow Definition
 */
export const PPT_GENERATION_WORKFLOW: WorkflowDefinition = {
  id: 'ppt-generation',
  name: 'PPT Generation',
  description: 'Generate professional presentations from topics or content',
  type: 'ppt-generation',
  version: '1.0.0',
  icon: 'Presentation',
  category: 'content',
  tags: ['ppt', 'presentation', 'slides', 'powerpoint'],
  inputs: {
    topic: {
      type: 'string',
      description: 'The main topic or title for the presentation',
      required: true,
    },
    description: {
      type: 'string',
      description: 'Additional description or context for the presentation',
      required: false,
    },
    slideCount: {
      type: 'number',
      description: 'Target number of slides',
      required: false,
      default: 10,
    },
    style: {
      type: 'string',
      description: 'Presentation style (professional, creative, minimal, academic, casual)',
      required: false,
      default: 'professional',
    },
    targetAudience: {
      type: 'string',
      description: 'Who is the target audience',
      required: false,
    },
    language: {
      type: 'string',
      description: 'Language for the presentation content',
      required: false,
      default: 'en',
    },
  },
  outputs: {
    presentation: {
      type: 'object',
      description: 'The generated PPT presentation object',
    },
    outline: {
      type: 'array',
      description: 'The presentation outline',
    },
    marpContent: {
      type: 'string',
      description: 'Marp-formatted markdown content',
    },
  },
  defaultConfig: {
    includeImages: true,
    includeNotes: true,
    autoDesign: true,
  },
  estimatedDuration: 60,
  steps: [
    {
      id: 'analyze-requirements',
      name: 'Analyze Requirements',
      description: 'Analyze the topic and requirements to understand presentation needs',
      type: 'ai',
      aiPrompt: `Analyze the following presentation request and extract key requirements:

Topic: {{topic}}
Description: {{description}}
Target Audience: {{targetAudience}}
Style: {{style}}
Slide Count: {{slideCount}}

Provide a structured analysis including:
1. Main themes to cover
2. Key messages
3. Suggested structure
4. Tone and style recommendations
5. Visual suggestions

Output as JSON with fields: themes, keyMessages, structure, toneRecommendations, visualSuggestions`,
      inputs: {
        topic: { type: 'string', description: 'Presentation topic', required: true },
        description: { type: 'string', description: 'Additional description', required: false },
        targetAudience: { type: 'string', description: 'Target audience', required: false },
        style: { type: 'string', description: 'Presentation style', required: false },
        slideCount: { type: 'number', description: 'Number of slides', required: false },
      },
      outputs: {
        analysis: { type: 'object', description: 'Requirements analysis result' },
      },
    },
    {
      id: 'generate-outline',
      name: 'Generate Outline',
      description: 'Create a detailed outline for the presentation',
      type: 'ai',
      dependencies: ['analyze-requirements'],
      aiPrompt: `Based on the analysis, create a detailed presentation outline.

Topic: {{topic}}
Analysis: {{analysis}}
Target Slides: {{slideCount}}

Generate an outline with the following structure for each slide:
- id: unique identifier
- title: slide title
- description: brief description of content
- suggestedLayout: one of (title, title-content, two-column, bullets, image-left, image-right, quote, chart, comparison, section, closing)
- keyPoints: array of key points to cover
- order: slide order number

Output as a JSON array of outline items.`,
      inputs: {
        topic: { type: 'string', description: 'Presentation topic', required: true },
        analysis: { type: 'object', description: 'Requirements analysis', required: true },
        slideCount: { type: 'number', description: 'Number of slides', required: false },
      },
      outputs: {
        outline: { type: 'array', description: 'Presentation outline' },
      },
    },
    {
      id: 'generate-slides',
      name: 'Generate Slide Content',
      description: 'Generate detailed content for each slide',
      type: 'ai',
      dependencies: ['generate-outline'],
      aiPrompt: `Generate detailed content for each slide in the presentation.

Topic: {{topic}}
Outline: {{outline}}
Style: {{style}}
Language: {{language}}

For each outline item, generate:
- title: slide title
- subtitle: optional subtitle
- content: main content (can be markdown)
- bullets: array of bullet points (if applicable)
- notes: speaker notes
- layout: slide layout type

Important:
- Keep content concise and impactful
- Use clear, professional language
- Include relevant examples where appropriate
- Match the specified style

Output as a JSON array of slide objects.`,
      inputs: {
        topic: { type: 'string', description: 'Presentation topic', required: true },
        outline: { type: 'array', description: 'Presentation outline', required: true },
        style: { type: 'string', description: 'Presentation style', required: false },
        language: { type: 'string', description: 'Content language', required: false },
      },
      outputs: {
        slides: { type: 'array', description: 'Generated slides' },
      },
    },
    {
      id: 'apply-design',
      name: 'Apply Design',
      description: 'Apply visual design and formatting to slides',
      type: 'ai',
      dependencies: ['generate-slides'],
      aiPrompt: `Apply visual design elements to the presentation slides.

Slides: {{slides}}
Style: {{style}}
Theme: {{theme}}

For each slide, suggest:
- backgroundColor or backgroundImage
- Color scheme adjustments
- Icon or image suggestions
- Typography recommendations
- Layout refinements

Keep the design consistent across all slides.
Output as a JSON array of enhanced slide objects.`,
      inputs: {
        slides: { type: 'array', description: 'Generated slides', required: true },
        style: { type: 'string', description: 'Presentation style', required: false },
        theme: { type: 'object', description: 'Theme configuration', required: false },
      },
      outputs: {
        designedSlides: { type: 'array', description: 'Slides with design applied' },
      },
    },
    {
      id: 'generate-marp',
      name: 'Generate Marp Output',
      description: 'Convert slides to Marp markdown format',
      type: 'ai',
      dependencies: ['apply-design'],
      aiPrompt: `Convert the presentation slides to Marp markdown format.

Slides: {{designedSlides}}
Theme: {{theme}}

Generate valid Marp markdown with:
- Proper frontmatter (marp: true, theme, paginate, etc.)
- Slide separators (---)
- Proper heading hierarchy
- Bullet points
- Speaker notes (using HTML comments)
- Image placeholders where appropriate

Output the complete Marp markdown as a string.`,
      inputs: {
        designedSlides: { type: 'array', description: 'Designed slides', required: true },
        theme: { type: 'object', description: 'Theme configuration', required: false },
      },
      outputs: {
        marpContent: { type: 'string', description: 'Marp markdown content' },
      },
    },
    {
      id: 'finalize',
      name: 'Finalize Presentation',
      description: 'Create the final presentation object',
      type: 'tool',
      toolName: 'ppt_finalize',
      dependencies: ['generate-marp'],
      inputs: {
        topic: { type: 'string', description: 'Presentation topic', required: true },
        outline: { type: 'array', description: 'Presentation outline', required: true },
        designedSlides: { type: 'array', description: 'Designed slides', required: true },
        marpContent: { type: 'string', description: 'Marp content', required: true },
        theme: { type: 'object', description: 'Theme configuration', required: false },
      },
      outputs: {
        presentation: { type: 'object', description: 'Final presentation object' },
      },
    },
  ],
};

/**
 * PPT Workflow Templates
 */
export const PPT_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'business-pitch',
    name: 'Business Pitch',
    description: 'Create a compelling business pitch presentation',
    workflowId: 'ppt-generation',
    presetInputs: {
      style: 'professional',
      slideCount: 12,
    },
    presetConfig: {
      includeImages: true,
      includeNotes: true,
    },
    icon: 'Briefcase',
    category: 'business',
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Announce a new product or feature',
    workflowId: 'ppt-generation',
    presetInputs: {
      style: 'creative',
      slideCount: 15,
    },
    presetConfig: {
      includeImages: true,
      includeNotes: true,
    },
    icon: 'Rocket',
    category: 'marketing',
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Create educational or training content',
    workflowId: 'ppt-generation',
    presetInputs: {
      style: 'academic',
      slideCount: 20,
    },
    presetConfig: {
      includeImages: true,
      includeNotes: true,
    },
    icon: 'GraduationCap',
    category: 'education',
  },
  {
    id: 'project-update',
    name: 'Project Update',
    description: 'Share project status and progress',
    workflowId: 'ppt-generation',
    presetInputs: {
      style: 'minimal',
      slideCount: 8,
    },
    presetConfig: {
      includeImages: false,
      includeNotes: true,
    },
    icon: 'BarChart',
    category: 'business',
  },
  {
    id: 'quick-presentation',
    name: 'Quick Presentation',
    description: 'Create a simple presentation quickly',
    workflowId: 'ppt-generation',
    presetInputs: {
      style: 'minimal',
      slideCount: 5,
    },
    presetConfig: {
      includeImages: false,
      includeNotes: false,
    },
    icon: 'Zap',
    category: 'quick',
  },
];

/**
 * Register PPT workflow and templates with the global registry
 */
export function registerPPTWorkflow(): void {
  const registry = getGlobalWorkflowRegistry();
  
  // Register basic workflow
  registry.register(PPT_GENERATION_WORKFLOW);
  
  for (const template of PPT_WORKFLOW_TEMPLATES) {
    registry.registerTemplate(template);
  }
  
  // Register enhanced workflow
  registry.register(PPT_ENHANCED_WORKFLOW);
  
  for (const template of PPT_ENHANCED_TEMPLATES) {
    registry.registerTemplate(template);
  }
}

/**
 * Parse outline from AI response
 */
export function parseOutlineResponse(response: string): PPTOutlineItem[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]);
      return items.map((item: Record<string, unknown>, index: number) => ({
        id: item.id || `outline-${index}`,
        title: item.title || `Slide ${index + 1}`,
        description: item.description,
        suggestedLayout: item.suggestedLayout || 'title-content',
        keyPoints: item.keyPoints || [],
        order: item.order ?? index,
      }));
    }
  } catch (error) {
    console.error('Failed to parse outline response:', error);
  }
  return [];
}

/**
 * Parse slides from AI response
 */
export function parseSlidesResponse(response: string): PPTSlide[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]);
      return items.map((item: Record<string, unknown>, index: number) => ({
        id: item.id || `slide-${index}`,
        order: item.order ?? index,
        layout: item.layout || 'title-content',
        title: item.title,
        subtitle: item.subtitle,
        content: item.content,
        bullets: item.bullets,
        notes: item.notes,
        elements: item.elements || [],
        backgroundColor: item.backgroundColor,
        backgroundImage: item.backgroundImage,
      }));
    }
  } catch (error) {
    console.error('Failed to parse slides response:', error);
  }
  return [];
}

/**
 * Build presentation object from workflow outputs
 */
export function buildPresentation(
  options: PPTGenerationOptions,
  outline: PPTOutlineItem[],
  slides: PPTSlide[],
  theme?: Record<string, unknown>
): PPTPresentation {
  const now = new Date();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return {
    id: `ppt-${Date.now()}-${randomSuffix}`,
    title: options.topic,
    subtitle: options.description,
    description: options.description,
    theme: {
      id: 'custom',
      name: 'Custom Theme',
      primaryColor: (theme?.primaryColor as string) || '#3B82F6',
      secondaryColor: (theme?.secondaryColor as string) || '#1E40AF',
      accentColor: (theme?.accentColor as string) || '#60A5FA',
      backgroundColor: (theme?.backgroundColor as string) || '#FFFFFF',
      textColor: (theme?.textColor as string) || '#1E293B',
      headingFont: (theme?.headingFont as string) || 'Inter',
      bodyFont: (theme?.bodyFont as string) || 'Inter',
      codeFont: (theme?.codeFont as string) || 'JetBrains Mono',
    },
    slides,
    outline,
    totalSlides: slides.length,
    aspectRatio: '16:9',
    createdAt: now,
    updatedAt: now,
    metadata: {
      targetAudience: options.targetAudience,
      style: options.style,
      language: options.language,
    },
  };
}

// =====================
// Enhanced PPT Workflow Definition
// =====================

/**
 * Enhanced PPT Generation Workflow with Material Processing
 */
export const PPT_ENHANCED_WORKFLOW: WorkflowDefinition = {
  id: 'ppt-enhanced-generation',
  name: 'Enhanced PPT Generation',
  description: 'Generate professional presentations from materials with AI-powered analysis and image generation',
  type: 'ppt-generation',
  version: '2.0.0',
  icon: 'Presentation',
  category: 'content',
  tags: ['ppt', 'presentation', 'slides', 'ai', 'images', 'materials'],
  inputs: {
    topic: {
      type: 'string',
      description: 'The main topic or title for the presentation',
      required: true,
    },
    description: {
      type: 'string',
      description: 'Additional description or context for the presentation',
      required: false,
    },
    materials: {
      type: 'array',
      description: 'Input materials (documents, URLs, text) to analyze',
      required: false,
    },
    slideCount: {
      type: 'number',
      description: 'Target number of slides',
      required: false,
      default: 10,
    },
    style: {
      type: 'string',
      description: 'Presentation style (professional, creative, minimal, academic, casual)',
      required: false,
      default: 'professional',
    },
    targetAudience: {
      type: 'string',
      description: 'Who is the target audience',
      required: false,
    },
    language: {
      type: 'string',
      description: 'Language for the presentation content',
      required: false,
      default: 'en',
    },
    generateImages: {
      type: 'boolean',
      description: 'Whether to generate images for slides',
      required: false,
      default: true,
    },
    imageStyle: {
      type: 'string',
      description: 'Style for generated images',
      required: false,
      default: 'corporate',
    },
  },
  outputs: {
    presentation: {
      type: 'object',
      description: 'The generated PPT presentation object',
    },
    outline: {
      type: 'array',
      description: 'The presentation outline with enhanced metadata',
    },
    materialAnalysis: {
      type: 'array',
      description: 'Analysis results from input materials',
    },
    generatedImages: {
      type: 'array',
      description: 'Generated images for slides',
    },
    marpContent: {
      type: 'string',
      description: 'Marp-formatted markdown content',
    },
  },
  defaultConfig: {
    includeImages: true,
    includeNotes: true,
    autoDesign: true,
    imageProvider: 'openai',
    imageModel: 'dall-e-3',
  },
  estimatedDuration: 120,
  steps: [
    {
      id: 'process-materials',
      name: 'Process Materials',
      description: 'Extract and analyze input materials',
      type: 'tool',
      toolName: 'material_extract',
      optional: true,
      inputs: {
        materials: { type: 'array', description: 'Input materials', required: false },
      },
      outputs: {
        extractedMaterials: { type: 'array', description: 'Extracted material content' },
      },
    },
    {
      id: 'analyze-materials',
      name: 'Analyze Materials',
      description: 'AI analysis of material content for presentation structure',
      type: 'ai',
      dependencies: ['process-materials'],
      optional: true,
      aiPrompt: `Analyze the following materials for creating a presentation.

Materials:
{{extractedMaterials}}

Topic: {{topic}}
Target Audience: {{targetAudience}}
Style: {{style}}

Provide a comprehensive analysis including:
1. Key themes and topics identified
2. Main points to cover
3. Data and statistics found
4. Suggested presentation structure
5. Important quotes or facts
6. Visual content recommendations

Output as JSON with fields: themes, mainPoints, dataElements, suggestedStructure, keyQuotes, visualRecommendations`,
      inputs: {
        extractedMaterials: { type: 'array', description: 'Extracted materials', required: false },
        topic: { type: 'string', description: 'Presentation topic', required: true },
        targetAudience: { type: 'string', description: 'Target audience', required: false },
        style: { type: 'string', description: 'Presentation style', required: false },
      },
      outputs: {
        materialAnalysis: { type: 'object', description: 'Material analysis result' },
      },
    },
    {
      id: 'summarize-content',
      name: 'Summarize Content',
      description: 'Generate comprehensive summary from materials',
      type: 'ai',
      dependencies: ['analyze-materials'],
      optional: true,
      aiPrompt: `Based on the material analysis, create a comprehensive summary for the presentation.

Analysis: {{materialAnalysis}}
Topic: {{topic}}
Target Slides: {{slideCount}}

Create a summary that:
1. Captures all essential information
2. Organizes content logically
3. Highlights key data points
4. Identifies visual opportunities
5. Suggests speaker talking points

Output as JSON with fields: executiveSummary, sectionSummaries, keyDataPoints, visualOpportunities, talkingPoints`,
      inputs: {
        materialAnalysis: { type: 'object', description: 'Material analysis', required: false },
        topic: { type: 'string', description: 'Presentation topic', required: true },
        slideCount: { type: 'number', description: 'Target slide count', required: false },
      },
      outputs: {
        contentSummary: { type: 'object', description: 'Content summary' },
      },
    },
    {
      id: 'analyze-requirements',
      name: 'Analyze Requirements',
      description: 'Analyze the topic and requirements to understand presentation needs',
      type: 'ai',
      dependencies: ['summarize-content'],
      aiPrompt: `Analyze the following presentation request and extract key requirements:

Topic: {{topic}}
Description: {{description}}
Content Summary: {{contentSummary}}
Target Audience: {{targetAudience}}
Style: {{style}}
Slide Count: {{slideCount}}

Provide a structured analysis including:
1. Main themes to cover (derived from materials if available)
2. Key messages
3. Suggested structure
4. Tone and style recommendations
5. Visual suggestions
6. Data visualization opportunities

Output as JSON with fields: themes, keyMessages, structure, toneRecommendations, visualSuggestions, dataVisualizations`,
      inputs: {
        topic: { type: 'string', description: 'Presentation topic', required: true },
        description: { type: 'string', description: 'Additional description', required: false },
        contentSummary: { type: 'object', description: 'Content summary from materials', required: false },
        targetAudience: { type: 'string', description: 'Target audience', required: false },
        style: { type: 'string', description: 'Presentation style', required: false },
        slideCount: { type: 'number', description: 'Number of slides', required: false },
      },
      outputs: {
        analysis: { type: 'object', description: 'Requirements analysis result' },
      },
    },
    {
      id: 'generate-enhanced-outline',
      name: 'Generate Enhanced Outline',
      description: 'Create a detailed outline with image and data visualization suggestions',
      type: 'ai',
      dependencies: ['analyze-requirements'],
      aiPrompt: `Based on the analysis, create a detailed presentation outline with enhanced metadata.

Topic: {{topic}}
Analysis: {{analysis}}
Content Summary: {{contentSummary}}
Target Slides: {{slideCount}}
Image Style: {{imageStyle}}

Generate an enhanced outline with the following structure for each slide:
- id: unique identifier
- title: slide title
- description: brief description of content
- suggestedLayout: one of (title, title-content, two-column, bullets, image-left, image-right, quote, chart, comparison, section, closing, full-image, timeline, table)
- keyPoints: array of key points to cover (3-5 points with full details)
- order: slide order number
- imageNeeded: boolean indicating if slide needs an image
- imageSuggestion: description of suggested image if needed
- imageStyle: style for the image (photorealistic, illustration, minimalist, etc.)
- dataVisualization: object with type and data if chart/table needed
- speakerNotes: detailed notes for the presenter
- sourceReferences: references to source materials if applicable
- transitionNote: how to transition to next slide

Important:
- Each slide should have COMPLETE information, not placeholders
- Include actual content from the materials analysis
- Suggest specific images that enhance the content
- Add detailed speaker notes

Output as a JSON array of enhanced outline items.`,
      inputs: {
        topic: { type: 'string', description: 'Presentation topic', required: true },
        analysis: { type: 'object', description: 'Requirements analysis', required: true },
        contentSummary: { type: 'object', description: 'Content summary', required: false },
        slideCount: { type: 'number', description: 'Number of slides', required: false },
        imageStyle: { type: 'string', description: 'Default image style', required: false },
      },
      outputs: {
        enhancedOutline: { type: 'array', description: 'Enhanced presentation outline' },
      },
    },
    {
      id: 'generate-slide-content',
      name: 'Generate Slide Content',
      description: 'Generate detailed content for each slide with full information',
      type: 'ai',
      dependencies: ['generate-enhanced-outline'],
      aiPrompt: `Generate detailed, complete content for each slide in the presentation.

Topic: {{topic}}
Enhanced Outline: {{enhancedOutline}}
Style: {{style}}
Language: {{language}}
Content Summary: {{contentSummary}}

For each outline item, generate COMPLETE slide content:
- id: slide id from outline
- title: compelling slide title
- subtitle: optional subtitle
- content: main content with ACTUAL information (not placeholders)
- bullets: array of detailed bullet points (each should be informative)
- notes: comprehensive speaker notes with talking points
- layout: slide layout type
- imagePrompt: detailed prompt for image generation if imageNeeded is true
- dataVisualization: complete data for charts/tables if applicable
- elements: additional slide elements

CRITICAL REQUIREMENTS:
- NO placeholder text - every bullet must contain real, useful information
- Include specific facts, figures, and examples from the materials
- Write professional, polished content
- Speaker notes should help presenter deliver the slide effectively
- Image prompts should be detailed enough for AI image generation

Output as a JSON array of complete slide objects.`,
      inputs: {
        topic: { type: 'string', description: 'Presentation topic', required: true },
        enhancedOutline: { type: 'array', description: 'Enhanced outline', required: true },
        style: { type: 'string', description: 'Presentation style', required: false },
        language: { type: 'string', description: 'Content language', required: false },
        contentSummary: { type: 'object', description: 'Content summary', required: false },
      },
      outputs: {
        detailedSlides: { type: 'array', description: 'Detailed slide content' },
      },
    },
    {
      id: 'generate-images',
      name: 'Generate Slide Images',
      description: 'Generate images for slides that need visual content',
      type: 'tool',
      toolName: 'ppt_generate_images',
      dependencies: ['generate-slide-content'],
      optional: true,
      inputs: {
        detailedSlides: { type: 'array', description: 'Slides with image prompts', required: true },
        imageStyle: { type: 'string', description: 'Image style', required: false },
        imageProvider: { type: 'string', description: 'Image generation provider', required: false },
      },
      outputs: {
        slidesWithImages: { type: 'array', description: 'Slides with generated images' },
        generatedImages: { type: 'array', description: 'Generated image results' },
      },
    },
    {
      id: 'apply-design',
      name: 'Apply Design',
      description: 'Apply visual design and formatting to slides',
      type: 'ai',
      dependencies: ['generate-images'],
      aiPrompt: `Apply visual design elements to the presentation slides.

Slides: {{slidesWithImages}}
Style: {{style}}
Theme: {{theme}}

For each slide, enhance with:
- backgroundColor or backgroundImage
- Color scheme adjustments based on theme
- Typography recommendations
- Layout refinements
- Element positioning suggestions
- Animation recommendations

Keep the design consistent across all slides.
Output as a JSON array of enhanced slide objects with design properties.`,
      inputs: {
        slidesWithImages: { type: 'array', description: 'Slides with images', required: true },
        style: { type: 'string', description: 'Presentation style', required: false },
        theme: { type: 'object', description: 'Theme configuration', required: false },
      },
      outputs: {
        designedSlides: { type: 'array', description: 'Slides with design applied' },
      },
    },
    {
      id: 'generate-marp',
      name: 'Generate Marp Output',
      description: 'Convert slides to Marp markdown format',
      type: 'tool',
      toolName: 'ppt_generate_marp',
      dependencies: ['apply-design'],
      inputs: {
        designedSlides: { type: 'array', description: 'Designed slides', required: true },
        theme: { type: 'object', description: 'Theme configuration', required: false },
      },
      outputs: {
        marpContent: { type: 'string', description: 'Marp markdown content' },
      },
    },
    {
      id: 'finalize',
      name: 'Finalize Presentation',
      description: 'Create the final presentation object with all components',
      type: 'tool',
      toolName: 'ppt_finalize_enhanced',
      dependencies: ['generate-marp'],
      inputs: {
        topic: { type: 'string', description: 'Presentation topic', required: true },
        enhancedOutline: { type: 'array', description: 'Enhanced outline', required: true },
        designedSlides: { type: 'array', description: 'Designed slides', required: true },
        materialAnalysis: { type: 'object', description: 'Material analysis', required: false },
        generatedImages: { type: 'array', description: 'Generated images', required: false },
        marpContent: { type: 'string', description: 'Marp content', required: true },
        theme: { type: 'object', description: 'Theme configuration', required: false },
      },
      outputs: {
        presentation: { type: 'object', description: 'Final presentation object' },
      },
    },
  ],
};

// =====================
// Enhanced Workflow Templates
// =====================

/**
 * Enhanced PPT Workflow Templates
 */
export const PPT_ENHANCED_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'material-to-presentation',
    name: 'Material to Presentation',
    description: 'Convert documents or content into a professional presentation',
    workflowId: 'ppt-enhanced-generation',
    presetInputs: {
      style: 'professional',
      slideCount: 12,
      generateImages: true,
      imageStyle: 'corporate',
    },
    presetConfig: {
      includeImages: true,
      includeNotes: true,
      autoDesign: true,
    },
    icon: 'FileText',
    category: 'content',
  },
  {
    id: 'research-presentation',
    name: 'Research Presentation',
    description: 'Create an academic presentation from research materials',
    workflowId: 'ppt-enhanced-generation',
    presetInputs: {
      style: 'academic',
      slideCount: 20,
      generateImages: true,
      imageStyle: 'diagram',
    },
    presetConfig: {
      includeImages: true,
      includeNotes: true,
      autoDesign: true,
    },
    icon: 'BookOpen',
    category: 'education',
  },
  {
    id: 'visual-storytelling',
    name: 'Visual Storytelling',
    description: 'Create a visually rich presentation with AI-generated images',
    workflowId: 'ppt-enhanced-generation',
    presetInputs: {
      style: 'creative',
      slideCount: 15,
      generateImages: true,
      imageStyle: 'illustration',
    },
    presetConfig: {
      includeImages: true,
      includeNotes: true,
      autoDesign: true,
      imageProvider: 'openai',
      imageModel: 'dall-e-3',
    },
    icon: 'Image',
    category: 'creative',
  },
  {
    id: 'data-driven-presentation',
    name: 'Data-Driven Presentation',
    description: 'Create a presentation focused on data visualization',
    workflowId: 'ppt-enhanced-generation',
    presetInputs: {
      style: 'professional',
      slideCount: 15,
      generateImages: true,
      imageStyle: 'infographic',
    },
    presetConfig: {
      includeImages: true,
      includeNotes: true,
      autoDesign: true,
    },
    icon: 'BarChart2',
    category: 'business',
  },
];

// =====================
// Helper Functions for Enhanced Workflow
// =====================

/**
 * Parse enhanced outline from AI response
 */
export function parseEnhancedOutlineResponse(response: string): PPTEnhancedOutlineItem[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]);
      return items.map((item: Record<string, unknown>, index: number) => ({
        id: item.id || `outline-${index}`,
        title: item.title || `Slide ${index + 1}`,
        description: item.description,
        suggestedLayout: item.suggestedLayout || 'title-content',
        keyPoints: item.keyPoints || [],
        order: item.order ?? index,
        imageNeeded: item.imageNeeded ?? false,
        imageSuggestion: item.imageSuggestion,
        imageStyle: item.imageStyle,
        dataVisualization: item.dataVisualization,
        speakerNotes: item.speakerNotes || '',
        sourceReferences: item.sourceReferences,
        transitionNote: item.transitionNote,
        estimatedDuration: item.estimatedDuration,
      }));
    }
  } catch (error) {
    console.error('Failed to parse enhanced outline response:', error);
  }
  return [];
}

/**
 * Parse enhanced slides from AI response
 */
export function parseEnhancedSlidesResponse(response: string): PPTEnhancedSlide[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]);
      return items.map((item: Record<string, unknown>, index: number) => ({
        id: item.id || `slide-${index}`,
        order: item.order ?? index,
        layout: item.layout || 'title-content',
        title: item.title,
        subtitle: item.subtitle,
        content: item.content,
        bullets: item.bullets,
        notes: item.notes,
        elements: item.elements || [],
        backgroundColor: item.backgroundColor,
        backgroundImage: item.backgroundImage,
        imagePrompt: item.imagePrompt,
        imageStyle: item.imageStyle as PPTImageStyle | undefined,
        sourceReferences: item.sourceReferences as string[] | undefined,
        aiGeneratedContent: item.aiGeneratedContent as PPTEnhancedSlide['aiGeneratedContent'],
      }));
    }
  } catch (error) {
    console.error('Failed to parse enhanced slides response:', error);
  }
  return [];
}

/**
 * Build enhanced presentation from workflow outputs
 */
export function buildEnhancedPresentation(
  options: PPTEnhancedGenerationOptions,
  outline: PPTEnhancedOutlineItem[],
  slides: PPTEnhancedSlide[],
  materialAnalysis?: PPTMaterialAnalysis[],
  theme?: Record<string, unknown>
): PPTPresentation {
  const now = new Date();
  
  return {
    id: `ppt-enhanced-${Date.now()}`,
    title: options.topic,
    subtitle: options.description,
    description: options.description,
    theme: {
      id: 'custom',
      name: 'Custom Theme',
      primaryColor: (theme?.primaryColor as string) || '#3B82F6',
      secondaryColor: (theme?.secondaryColor as string) || '#1E40AF',
      accentColor: (theme?.accentColor as string) || '#60A5FA',
      backgroundColor: (theme?.backgroundColor as string) || '#FFFFFF',
      textColor: (theme?.textColor as string) || '#1E293B',
      headingFont: (theme?.headingFont as string) || 'Inter',
      bodyFont: (theme?.bodyFont as string) || 'Inter',
      codeFont: (theme?.codeFont as string) || 'JetBrains Mono',
    },
    slides: slides as PPTSlide[],
    outline: outline as PPTOutlineItem[],
    totalSlides: slides.length,
    aspectRatio: '16:9',
    createdAt: now,
    updatedAt: now,
    metadata: {
      targetAudience: options.targetAudience,
      style: options.style,
      language: options.language,
      materialsProcessed: materialAnalysis?.length || 0,
      imageStyle: options.imageStyle,
      enhancedGeneration: true,
    },
  };
}

/**
 * Generate Marp markdown from presentation
 */
export function generateMarpMarkdown(presentation: PPTPresentation): string {
  const lines: string[] = [];
  
  // Frontmatter
  lines.push('---');
  lines.push('marp: true');
  lines.push(`theme: default`);
  lines.push('paginate: true');
  lines.push(`backgroundColor: ${presentation.theme.backgroundColor}`);
  lines.push(`color: ${presentation.theme.textColor}`);
  lines.push('style: |');
  lines.push(`  section {`);
  lines.push(`    font-family: ${presentation.theme.bodyFont}, sans-serif;`);
  lines.push(`  }`);
  lines.push(`  h1, h2, h3 {`);
  lines.push(`    font-family: ${presentation.theme.headingFont}, sans-serif;`);
  lines.push(`    color: ${presentation.theme.primaryColor};`);
  lines.push(`  }`);
  lines.push('---');
  lines.push('');
  
  // Generate slides
  for (let i = 0; i < presentation.slides.length; i++) {
    const slide = presentation.slides[i];
    
    if (i > 0) {
      lines.push('---');
      lines.push('');
    }
    
    // Title
    if (slide.title) {
      if (slide.layout === 'title' || slide.layout === 'section') {
        lines.push(`# ${slide.title}`);
      } else {
        lines.push(`## ${slide.title}`);
      }
    }
    
    // Subtitle
    if (slide.subtitle) {
      lines.push(`### ${slide.subtitle}`);
    }
    
    lines.push('');
    
    // Content
    if (slide.content) {
      lines.push(slide.content);
      lines.push('');
    }
    
    // Bullets
    if (slide.bullets && slide.bullets.length > 0) {
      for (const bullet of slide.bullets) {
        lines.push(`- ${bullet}`);
      }
      lines.push('');
    }
    
    // Speaker notes
    if (slide.notes) {
      lines.push('<!--');
      lines.push(slide.notes);
      lines.push('-->');
      lines.push('');
    }
  }
  
  return lines.join('\n');
}
