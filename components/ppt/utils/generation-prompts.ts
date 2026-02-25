/**
 * PPT Generation Prompts
 * Enhanced AI prompts for better slide content generation
 */

import type { PPTSlideLayout, PPTTheme } from '@/types/workflow';
import { suggestLayout } from './layout-engine';

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
- Vary the layout types — avoid using the same layout for 3+ consecutive slides
- keyPoints MUST contain real, specific information about the topic — never use generic placeholders like "Key point 1"

## Output Format (JSON):
\`\`\`json
{
  "title": "Presentation Title",
  "subtitle": "Optional subtitle",
  "outline": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "layout": "title|title-content|bullets|image-left|image-right|two-column|comparison|chart|quote|section|closing|timeline",
      "keyPoints": ["Specific factual point about the topic", "Another concrete detail"],
      "notes": "Brief speaker notes",
      "suggestedVisual": "Description of recommended visual/image if any"
    }
  ]
}
\`\`\`

## Example (5-slide presentation about "Remote Work Trends"):
\`\`\`json
{
  "title": "The Future of Remote Work",
  "subtitle": "Trends, Challenges, and Opportunities in 2025",
  "outline": [
    { "slideNumber": 1, "title": "The Future of Remote Work", "layout": "title", "keyPoints": [], "notes": "Welcome the audience and introduce the topic", "suggestedVisual": "Modern home office with city skyline" },
    { "slideNumber": 2, "title": "Remote Work by the Numbers", "layout": "chart", "keyPoints": ["58% of Americans can work remotely at least part-time", "Remote job postings increased 3x since 2020", "Hybrid model adopted by 74% of Fortune 500"], "notes": "Start with compelling data to set the stage", "suggestedVisual": "Bar chart of remote work adoption rates" },
    { "slideNumber": 3, "title": "Key Benefits vs Challenges", "layout": "comparison", "keyPoints": ["Benefits: flexibility, no commute, global talent pool", "Challenges: isolation, communication gaps, work-life boundaries", "Companies saving $11,000 per remote worker annually"], "notes": "Present both sides to build credibility" },
    { "slideNumber": 4, "title": "Building Effective Remote Teams", "layout": "bullets", "keyPoints": ["Establish clear communication protocols and meeting cadence", "Invest in async collaboration tools like Notion and Loom", "Create virtual social spaces for team bonding", "Measure output and impact, not hours worked"], "notes": "Actionable takeaways the audience can implement" },
    { "slideNumber": 5, "title": "Thank You", "layout": "closing", "keyPoints": ["Questions?", "Contact: email@example.com"], "notes": "Open for Q&A" }
  ]
}
\`\`\`

${language !== 'en' ? `IMPORTANT: Generate all content in ${language}. The example above is for reference format only — your output must be in ${language}.` : ''}

Now generate the outline for "${topic}":`;
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
  previousSlide?: { title: string; content?: string },
  allOutlineTitles?: string[]
): string {
  const outlineContext = allOutlineTitles?.length
    ? `\n## Full Presentation Outline:\n${allOutlineTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : '';

  return `Generate detailed content for this slide:

## Slide Information:
- Title: ${slideOutline.title}
- Layout: ${slideOutline.layout}
${slideOutline.keyPoints ? `- Key Points to Cover: ${slideOutline.keyPoints.join(', ')}` : ''}
${previousSlide ? `- Previous Slide: "${previousSlide.title}"` : ''}
${outlineContext}
## Presentation Context:
- Topic: ${presentationContext.topic}
- Audience: ${presentationContext.audience || 'General'}
- Tone: ${presentationContext.tone || 'Professional'}

## Critical Rules:
- Every bullet point MUST contain specific, factual information — never write generic placeholders
- Content should be directly relevant to "${slideOutline.title}" within the context of "${presentationContext.topic}"
- If the layout is "chart", include a "chartData" field with {type, labels, datasets} for visualization
- If the layout is "table", include a "tableData" field as a 2D string array

## Output Format (JSON):
\`\`\`json
{
  "title": "Refined slide title",
  "subtitle": "Optional subtitle if layout supports it",
  "content": "Main content text if applicable",
  "bullets": ["Specific factual bullet point", "Another concrete detail"],
  "notes": "Detailed speaker notes with talking points",
  "imagePrompt": "Description for AI image generation if visual needed",
  "chartData": { "type": "bar", "labels": ["A", "B"], "datasets": [{ "label": "Series", "data": [10, 20] }] },
  "tableData": [["Header1", "Header2"], ["Row1Col1", "Row1Col2"]]
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

// Suggest layout based on content analysis — delegates to unified suggestLayout
export function suggestLayoutFromContent(content: string): PPTSlideLayout {
  return suggestLayout({ content });
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
