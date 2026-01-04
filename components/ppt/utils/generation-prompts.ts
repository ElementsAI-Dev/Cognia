/**
 * PPT Generation Prompts
 * Enhanced AI prompts for better slide content generation
 */

import type { PPTSlideLayout, PPTTheme } from '@/types/workflow';

export interface GenerationContext {
  topic: string;
  audience?: string;
  purpose?: 'informative' | 'persuasive' | 'educational' | 'pitch' | 'report';
  tone?: 'formal' | 'casual' | 'professional' | 'creative';
  slideCount?: number;
  language?: string;
  includeImages?: boolean;
  includeCharts?: boolean;
}

// Build system prompt for PPT generation
export function buildSystemPrompt(context: GenerationContext): string {
  const { audience, purpose, tone } = context;
  
  let systemPrompt = `You are an expert presentation designer and content strategist. 
You create compelling, well-structured presentations that engage audiences and communicate ideas effectively.

## Your Expertise:
- Visual storytelling and information hierarchy
- Concise, impactful messaging
- Professional slide design principles
- Data visualization best practices

## Design Principles:
1. **One idea per slide** - Keep slides focused on a single concept
2. **6x6 Rule** - Maximum 6 bullet points, 6 words per bullet
3. **Visual hierarchy** - Use size, color, and position to guide attention
4. **White space** - Leave breathing room for content
5. **Consistent styling** - Maintain visual consistency throughout`;

  if (audience) {
    systemPrompt += `\n\n## Target Audience: ${audience}
Tailor content complexity, terminology, and examples to this audience.`;
  }

  if (purpose) {
    const purposeGuidance: Record<string, string> = {
      informative: 'Focus on clear explanations and key facts. Use supporting evidence and examples.',
      persuasive: 'Build a compelling argument. Use emotional appeals and strong calls to action.',
      educational: 'Structure content for learning. Include examples, analogies, and review points.',
      pitch: 'Highlight value propositions. Include problem-solution structure and clear benefits.',
      report: 'Present data clearly. Include key findings, insights, and actionable recommendations.',
    };
    systemPrompt += `\n\n## Presentation Purpose: ${purpose}
${purposeGuidance[purpose]}`;
  }

  if (tone) {
    const toneGuidance: Record<string, string> = {
      formal: 'Use professional language, avoid slang, maintain business-appropriate tone.',
      casual: 'Use conversational language, relatable examples, and friendly tone.',
      professional: 'Balance expertise with accessibility. Clear and confident.',
      creative: 'Use engaging language, storytelling elements, and creative metaphors.',
    };
    systemPrompt += `\n\n## Communication Tone: ${tone}
${toneGuidance[tone]}`;
  }

  return systemPrompt;
}

// Build prompt for outline generation
export function buildOutlinePrompt(context: GenerationContext): string {
  const { topic, slideCount = 10, language = 'en' } = context;
  
  return `Create an outline for a presentation about: "${topic}"

## Requirements:
- Generate exactly ${slideCount} slides
- First slide should be a title slide
- Last slide should be a closing/thank you slide
- Include a mix of content types (bullets, images, charts where appropriate)
- Each slide should have a clear purpose and flow logically

## Output Format (JSON):
\`\`\`json
{
  "title": "Presentation Title",
  "subtitle": "Optional subtitle",
  "outline": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "layout": "title|title-content|bullets|image-left|image-right|two-column|comparison|chart|quote|section|closing",
      "keyPoints": ["point 1", "point 2"],
      "notes": "Brief speaker notes",
      "suggestedVisual": "Description of recommended visual/image if any"
    }
  ]
}
\`\`\`

${language !== 'en' ? `Generate all content in ${language}.` : ''}

Generate the outline now:`;
}

// Build prompt for slide content generation
export function buildSlideContentPrompt(
  slideOutline: {
    title: string;
    layout: PPTSlideLayout;
    keyPoints?: string[];
    notes?: string;
  },
  presentationContext: GenerationContext,
  previousSlide?: { title: string; content?: string }
): string {
  return `Generate detailed content for this slide:

## Slide Information:
- Title: ${slideOutline.title}
- Layout: ${slideOutline.layout}
${slideOutline.keyPoints ? `- Key Points to Cover: ${slideOutline.keyPoints.join(', ')}` : ''}
${previousSlide ? `- Previous Slide: "${previousSlide.title}"` : ''}

## Presentation Context:
- Topic: ${presentationContext.topic}
- Audience: ${presentationContext.audience || 'General'}
- Tone: ${presentationContext.tone || 'Professional'}

## Output Format (JSON):
\`\`\`json
{
  "title": "Refined slide title",
  "subtitle": "Optional subtitle if layout supports it",
  "content": "Main content text if applicable",
  "bullets": ["Bullet point 1", "Bullet point 2"],
  "notes": "Detailed speaker notes",
  "imagePrompt": "Description for AI image generation if visual needed",
  "transition": "How this connects to next slide"
}
\`\`\`

Generate engaging, concise content following the 6x6 rule:`;
}

// Build prompt for improving existing content
export function buildImprovementPrompt(
  currentContent: {
    title?: string;
    subtitle?: string;
    content?: string;
    bullets?: string[];
  },
  improvementType: 'concise' | 'detailed' | 'engaging' | 'professional' | 'simplified'
): string {
  const improvementGuidance: Record<string, string> = {
    concise: 'Make the content more concise. Remove unnecessary words. Focus on key messages.',
    detailed: 'Add more detail and supporting information while maintaining clarity.',
    engaging: 'Make the content more engaging. Add hooks, questions, or compelling language.',
    professional: 'Refine for a professional business audience. Polish language and tone.',
    simplified: 'Simplify complex concepts. Use clearer language and shorter sentences.',
  };

  return `Improve this slide content with focus on: ${improvementType}

## Current Content:
${currentContent.title ? `Title: ${currentContent.title}` : ''}
${currentContent.subtitle ? `Subtitle: ${currentContent.subtitle}` : ''}
${currentContent.content ? `Content: ${currentContent.content}` : ''}
${currentContent.bullets?.length ? `Bullets:\n${currentContent.bullets.map(b => `- ${b}`).join('\n')}` : ''}

## Improvement Goal:
${improvementGuidance[improvementType]}

## Output Format (JSON):
\`\`\`json
{
  "title": "Improved title",
  "subtitle": "Improved subtitle",
  "content": "Improved content",
  "bullets": ["Improved bullet 1", "Improved bullet 2"],
  "changes": ["Description of change 1", "Description of change 2"]
}
\`\`\`

Provide the improved content:`;
}

// Build prompt for image generation
export function buildImagePrompt(
  slideContext: {
    title: string;
    content?: string;
    theme: PPTTheme;
  },
  style: 'photo' | 'illustration' | 'icon' | 'diagram' | 'abstract' = 'illustration'
): string {
  const styleGuidance: Record<string, string> = {
    photo: 'professional photography, high quality, realistic',
    illustration: 'modern illustration, clean lines, flat design',
    icon: 'simple icon, minimal design, single concept',
    diagram: 'clear diagram, labeled, explanatory visual',
    abstract: 'abstract art, conceptual, modern design',
  };

  return `Create a ${style} image for a presentation slide.

## Slide Context:
- Title: ${slideContext.title}
${slideContext.content ? `- Content: ${slideContext.content}` : ''}

## Visual Style:
- Style: ${styleGuidance[style]}
- Color scheme: Primary color ${slideContext.theme.primaryColor}, accent ${slideContext.theme.accentColor}
- Background: Should work with ${slideContext.theme.backgroundColor} background

## Requirements:
- Professional and polished
- Relevant to the slide topic
- Clean composition with visual focus
- No text in the image (text will be overlaid)
- Suitable for business/educational presentation

Generate image prompt:`;
}

// Suggest layout based on content analysis
export function suggestLayoutFromContent(content: string): PPTSlideLayout {
  const lowerContent = content.toLowerCase();
  
  // Check for comparison patterns
  if (lowerContent.includes('vs') || lowerContent.includes('versus') || 
      lowerContent.includes('compare') || lowerContent.includes('difference')) {
    return 'comparison';
  }
  
  // Check for timeline/process patterns
  if (lowerContent.includes('step') || lowerContent.includes('process') ||
      lowerContent.includes('timeline') || lowerContent.includes('phase')) {
    return 'timeline';
  }
  
  // Check for data/chart patterns
  if (lowerContent.includes('data') || lowerContent.includes('chart') ||
      lowerContent.includes('graph') || lowerContent.includes('statistics') ||
      lowerContent.includes('%') || /\d+%/.test(content)) {
    return 'chart';
  }
  
  // Check for quote patterns
  if (lowerContent.includes('"') || lowerContent.includes('quote') ||
      lowerContent.includes('said') || lowerContent.includes('according to')) {
    return 'quote';
  }
  
  // Check for image suggestions
  if (lowerContent.includes('image') || lowerContent.includes('photo') ||
      lowerContent.includes('picture') || lowerContent.includes('visual')) {
    return 'image-right';
  }
  
  // Check for list patterns
  const bulletIndicators = (content.match(/[-•*]\s/g) || []).length;
  const numberIndicators = (content.match(/\d+\.\s/g) || []).length;
  
  if (bulletIndicators >= 3 || numberIndicators >= 3) {
    return numberIndicators > bulletIndicators ? 'numbered' : 'bullets';
  }
  
  // Check content length for two-column
  if (content.length > 500) {
    return 'two-column';
  }
  
  // Default
  return 'title-content';
}

// Generate speaker notes from content
export function generateSpeakerNotesPrompt(slide: {
  title: string;
  content?: string;
  bullets?: string[];
}): string {
  return `Generate comprehensive speaker notes for this slide:

## Slide Content:
Title: ${slide.title}
${slide.content ? `Main Content: ${slide.content}` : ''}
${slide.bullets?.length ? `Bullet Points:\n${slide.bullets.map(b => `- ${b}`).join('\n')}` : ''}

## Requirements:
- Provide talking points for each key element
- Include transition phrases to next topic
- Suggest engagement techniques (questions, pauses)
- Note timing recommendations
- Include backup points for Q&A

## Output Format:
Provide natural speaker notes that can be read or used as reference during presentation.`;
}

const generationPrompts = {
  buildSystemPrompt,
  buildOutlinePrompt,
  buildSlideContentPrompt,
  buildImprovementPrompt,
  buildImagePrompt,
  suggestLayoutFromContent,
  generateSpeakerNotesPrompt,
};

export default generationPrompts;
