/**
 * PPT Tools - Tools for generating and managing presentations
 */

import { z } from 'zod';
import type {
  PPTPresentation,
  PPTSlide,
  PPTOutlineItem,
  PPTSlideLayout,
  PPTExportFormat,
} from '@/types/workflow';
import {
  buildPresentation,
  generateMarpMarkdown,
  parseOutlineResponse,
  parseSlidesResponse,
} from '../workflows/ppt-workflow';

/**
 * Input schema for PPT outline generation
 */
export const pptOutlineInputSchema = z.object({
  topic: z.string().describe('The main topic for the presentation'),
  description: z.string().optional().describe('Additional description or context'),
  slideCount: z.number().min(1).max(50).default(10).describe('Target number of slides'),
  style: z.enum(['professional', 'creative', 'minimal', 'academic', 'casual']).default('professional'),
  targetAudience: z.string().optional().describe('Who is the target audience'),
  language: z.string().default('en').describe('Language for the content'),
});

export type PPTOutlineInput = z.infer<typeof pptOutlineInputSchema>;

/**
 * Input schema for slide content generation
 */
export const pptSlideContentInputSchema = z.object({
  outline: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    suggestedLayout: z.string(),
    keyPoints: z.array(z.string()).optional(),
    order: z.number(),
  })).describe('The presentation outline'),
  style: z.string().optional().describe('Presentation style'),
  language: z.string().default('en').describe('Content language'),
});

export type PPTSlideContentInput = z.infer<typeof pptSlideContentInputSchema>;

/**
 * Input schema for PPT finalization
 */
export const pptFinalizeInputSchema = z.object({
  topic: z.string().describe('Presentation topic'),
  outline: z.array(z.any()).describe('Presentation outline'),
  designedSlides: z.array(z.any()).describe('Designed slides'),
  marpContent: z.string().optional().describe('Marp markdown content'),
  theme: z.record(z.string(), z.unknown()).optional().describe('Theme configuration'),
});

export type PPTFinalizeInput = z.infer<typeof pptFinalizeInputSchema>;

/**
 * Input schema for PPT export
 */
export const pptExportInputSchema = z.object({
  presentation: z.any().describe('The presentation object to export'),
  format: z.enum(['marp', 'html', 'pdf', 'pptx', 'reveal']).default('marp'),
  includeNotes: z.boolean().default(true).describe('Include speaker notes'),
  includeAnimations: z.boolean().default(false).describe('Include animations'),
  quality: z.enum(['low', 'medium', 'high']).default('medium'),
  customCSS: z.string().optional().describe('Custom CSS styles'),
});

export type PPTExportInput = z.infer<typeof pptExportInputSchema>;

/**
 * Result type for PPT operations
 */
export interface PPTToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Generate intelligent presentation outline based on topic and style
 */
export function executePPTOutline(input: PPTOutlineInput): PPTToolResult {
  try {
    const outline: PPTOutlineItem[] = [];
    const contentSlideCount = Math.max(1, input.slideCount - 3); // Reserve for title, agenda, closing

    // Title slide
    outline.push({
      id: 'slide-1',
      title: input.topic,
      description: input.description || `An overview of ${input.topic}`,
      suggestedLayout: 'title' as PPTSlideLayout,
      keyPoints: [],
      order: 0,
    });

    // Agenda slide (for presentations with 5+ slides)
    if (input.slideCount >= 5) {
      const agendaPoints = generateAgendaPoints(input.topic, contentSlideCount, input.style);
      outline.push({
        id: 'slide-2',
        title: getLocalizedText('Agenda', input.language),
        description: 'Overview of presentation topics',
        suggestedLayout: 'bullets' as PPTSlideLayout,
        keyPoints: agendaPoints,
        order: 1,
      });
    }

    // Generate content slides based on style and topic
    const contentStartIndex = input.slideCount >= 5 ? 2 : 1;
    const layouts = getLayoutsForStyle(input.style);
    
    for (let i = 0; i < contentSlideCount; i++) {
      const slideIndex = contentStartIndex + i;
      const layout = layouts[i % layouts.length];
      
      outline.push({
        id: `slide-${slideIndex + 1}`,
        title: generateSectionTitle(input.topic, i + 1, contentSlideCount, input.style),
        description: generateSectionDescription(input.topic, i + 1, input.style),
        suggestedLayout: layout as PPTSlideLayout,
        keyPoints: generateKeyPoints(input.topic, i + 1, input.style),
        order: slideIndex,
      });
    }

    // Closing slide
    outline.push({
      id: `slide-${input.slideCount}`,
      title: getLocalizedText('Thank You', input.language),
      description: getClosingDescription(input.style),
      suggestedLayout: 'closing' as PPTSlideLayout,
      keyPoints: getClosingPoints(input.style, input.language),
      order: input.slideCount - 1,
    });

    return {
      success: true,
      data: {
        outline,
        topic: input.topic,
        slideCount: outline.length,
        style: input.style,
        language: input.language,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate outline',
    };
  }
}

// Helper functions for intelligent outline generation
function generateAgendaPoints(topic: string, sectionCount: number, style: string): string[] {
  const points: string[] = [];
  const prefixes = {
    professional: ['Introduction to', 'Key Aspects of', 'Analysis of', 'Implementation', 'Conclusions'],
    creative: ['Exploring', 'Discovering', 'Creating with', 'Innovating', 'Future Vision'],
    academic: ['Background', 'Literature Review', 'Methodology', 'Results', 'Discussion'],
    minimal: ['Overview', 'Details', 'Examples', 'Summary'],
    casual: ['What is', 'Why it matters', 'How it works', 'Key takeaways'],
  };
  
  const stylePrefix = prefixes[style as keyof typeof prefixes] || prefixes.professional;
  
  for (let i = 0; i < Math.min(sectionCount, stylePrefix.length); i++) {
    points.push(`${stylePrefix[i]} ${topic}`);
  }
  
  return points;
}

function getLayoutsForStyle(style: string): string[] {
  const styleLayouts: Record<string, string[]> = {
    professional: ['title-content', 'bullets', 'two-column', 'chart', 'title-content'],
    creative: ['full-image', 'quote', 'title-content', 'comparison', 'bullets'],
    academic: ['title-content', 'bullets', 'chart', 'table', 'title-content'],
    minimal: ['title-content', 'bullets', 'title-content'],
    casual: ['title-content', 'bullets', 'image-left', 'quote', 'bullets'],
  };
  
  return styleLayouts[style] || styleLayouts.professional;
}

function generateSectionTitle(topic: string, sectionNum: number, totalSections: number, style: string): string {
  if (style === 'academic') {
    const academicTitles = ['Introduction', 'Background', 'Methodology', 'Results', 'Analysis', 'Discussion', 'Conclusion'];
    return academicTitles[Math.min(sectionNum - 1, academicTitles.length - 1)];
  }
  
  if (totalSections <= 3) {
    const simpleTitles = ['Introduction', 'Main Points', 'Summary'];
    return simpleTitles[Math.min(sectionNum - 1, simpleTitles.length - 1)];
  }
  
  return `${topic} - Part ${sectionNum}`;
}

function generateSectionDescription(topic: string, sectionNum: number, style: string): string {
  const descriptions: Record<string, string[]> = {
    professional: ['Key concepts and definitions', 'Strategic analysis', 'Implementation details', 'Best practices', 'Case studies'],
    creative: ['Inspiration and ideas', 'Creative exploration', 'Innovation showcase', 'Design thinking', 'Future possibilities'],
    academic: ['Theoretical framework', 'Research methodology', 'Data analysis', 'Findings', 'Implications'],
    minimal: ['Core concepts', 'Key details', 'Examples'],
    casual: ['Getting started', 'Deep dive', 'Practical tips', 'Real examples'],
  };
  
  const styleDescs = descriptions[style] || descriptions.professional;
  return styleDescs[Math.min(sectionNum - 1, styleDescs.length - 1)];
}

function generateKeyPoints(topic: string, sectionNum: number, style: string): string[] {
  // Generate placeholder key points that AI can expand
  const pointCount = style === 'minimal' ? 2 : style === 'academic' ? 4 : 3;
  const points: string[] = [];
  
  for (let i = 0; i < pointCount; i++) {
    points.push(`Key point ${i + 1} for section ${sectionNum}`);
  }
  
  return points;
}

function getLocalizedText(key: string, language: string): string {
  const translations: Record<string, Record<string, string>> = {
    'Agenda': { en: 'Agenda', zh: '议程', ja: 'アジェンダ', ko: '의제', es: 'Agenda', fr: 'Ordre du jour', de: 'Agenda' },
    'Thank You': { en: 'Thank You', zh: '谢谢', ja: 'ありがとうございました', ko: '감사합니다', es: 'Gracias', fr: 'Merci', de: 'Danke' },
    'Questions': { en: 'Questions?', zh: '问题？', ja: 'ご質問は？', ko: '질문?', es: '¿Preguntas?', fr: 'Questions?', de: 'Fragen?' },
  };
  
  return translations[key]?.[language] || translations[key]?.['en'] || key;
}

function getClosingDescription(style: string): string {
  const descriptions: Record<string, string> = {
    professional: 'Summary and next steps',
    creative: 'Thank you for your attention',
    academic: 'Conclusions and future research',
    minimal: 'Summary',
    casual: 'Thanks for listening!',
  };
  
  return descriptions[style] || descriptions.professional;
}

function getClosingPoints(style: string, language: string): string[] {
  const points = [getLocalizedText('Questions', language)];
  
  if (style === 'professional') {
    points.push('Contact Information', 'Next Steps');
  } else if (style === 'academic') {
    points.push('References', 'Acknowledgments');
  }
  
  return points;
}

/**
 * Generate slide content from outline
 */
export function executePPTSlideContent(input: PPTSlideContentInput): PPTToolResult {
  try {
    const slides: PPTSlide[] = input.outline.map((item, index) => ({
      id: item.id || `slide-${index}`,
      order: item.order ?? index,
      layout: (item.suggestedLayout || 'title-content') as PPTSlideLayout,
      title: item.title,
      content: item.description || '',
      bullets: item.keyPoints || [],
      notes: `Speaker notes for: ${item.title}`,
      elements: [],
    }));

    return {
      success: true,
      data: {
        slides,
        slideCount: slides.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate slide content',
    };
  }
}

/**
 * Finalize and build presentation object
 */
export function executePPTFinalize(input: PPTFinalizeInput): PPTToolResult {
  try {
    const outline = parseOutlineResponse(JSON.stringify(input.outline));
    const slides = parseSlidesResponse(JSON.stringify(input.designedSlides));

    const presentation = buildPresentation(
      {
        topic: input.topic,
        description: input.topic,
      },
      outline,
      slides,
      input.theme
    );

    // Generate Marp content if not provided
    const marpContent = input.marpContent || generateMarpMarkdown(presentation);

    return {
      success: true,
      data: {
        presentation,
        marpContent,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to finalize presentation',
    };
  }
}

/**
 * Export presentation to various formats
 */
export function executePPTExport(input: PPTExportInput): PPTToolResult {
  try {
    const presentation = input.presentation as PPTPresentation;
    let exportContent: string;

    switch (input.format) {
      case 'marp':
        exportContent = generateMarpMarkdown(presentation);
        break;

      case 'html':
        exportContent = generateHTMLPresentation(presentation, input.customCSS);
        break;

      case 'reveal':
        exportContent = generateRevealJSPresentation(presentation);
        break;

      case 'pdf':
        // Generate print-ready HTML that can be saved as PDF
        exportContent = generatePDFReadyHTML(presentation, input.includeNotes);
        break;

      case 'pptx':
        // Generate PPTX-compatible XML structure
        exportContent = generatePPTXContent(presentation);
        break;

      default:
        return {
          success: false,
          error: `Unknown export format: ${input.format}`,
        };
    }

    return {
      success: true,
      data: {
        format: input.format,
        content: exportContent,
        filename: `${presentation.title.replace(/[^a-z0-9]/gi, '_')}.${getFileExtension(input.format)}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export presentation',
    };
  }
}

/**
 * Get file extension for export format
 */
function getFileExtension(format: PPTExportFormat): string {
  switch (format) {
    case 'marp':
      return 'md';
    case 'html':
      return 'html';
    case 'reveal':
      return 'html';
    case 'pdf':
      return 'pdf';
    case 'pptx':
      return 'pptx';
    default:
      return 'txt';
  }
}

/**
 * Generate HTML presentation
 */
function generateHTMLPresentation(presentation: PPTPresentation, customCSS?: string): string {
  const slides = presentation.slides
    .map(
      (slide, index) => `
    <section class="slide" data-slide="${index + 1}">
      ${slide.title ? `<h2>${escapeHtml(slide.title)}</h2>` : ''}
      ${slide.subtitle ? `<h3>${escapeHtml(slide.subtitle)}</h3>` : ''}
      ${slide.content ? `<div class="content">${escapeHtml(slide.content)}</div>` : ''}
      ${
        slide.bullets && slide.bullets.length > 0
          ? `<ul>${slide.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
          : ''
      }
    </section>
  `
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(presentation.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${presentation.theme.bodyFont}, sans-serif;
      background: ${presentation.theme.backgroundColor};
      color: ${presentation.theme.textColor};
    }
    .slide {
      width: 100vw;
      height: 100vh;
      padding: 60px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    h1, h2, h3 {
      font-family: ${presentation.theme.headingFont}, sans-serif;
      color: ${presentation.theme.primaryColor};
      margin-bottom: 24px;
    }
    h1 { font-size: 3em; }
    h2 { font-size: 2.5em; }
    h3 { font-size: 1.5em; color: ${presentation.theme.secondaryColor}; }
    .content { font-size: 1.5em; line-height: 1.6; }
    ul { font-size: 1.5em; padding-left: 40px; }
    li { margin: 12px 0; }
    ${customCSS || ''}
  </style>
</head>
<body>
  ${slides}
  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    
    function showSlide(n) {
      slides.forEach((s, i) => {
        s.style.display = i === n ? 'flex' : 'none';
      });
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        currentSlide = Math.min(currentSlide + 1, slides.length - 1);
        showSlide(currentSlide);
      } else if (e.key === 'ArrowLeft') {
        currentSlide = Math.max(currentSlide - 1, 0);
        showSlide(currentSlide);
      }
    });
    
    showSlide(0);
  </script>
</body>
</html>`;
}

/**
 * Generate Reveal.js presentation
 */
function generateRevealJSPresentation(presentation: PPTPresentation): string {
  const slides = presentation.slides
    .map(
      (slide) => `
        <section>
          ${slide.title ? `<h2>${escapeHtml(slide.title)}</h2>` : ''}
          ${slide.subtitle ? `<h3>${escapeHtml(slide.subtitle)}</h3>` : ''}
          ${slide.content ? `<p>${escapeHtml(slide.content)}</p>` : ''}
          ${
            slide.bullets && slide.bullets.length > 0
              ? `<ul>${slide.bullets.map(b => `<li class="fragment">${escapeHtml(b)}</li>`).join('')}</ul>`
              : ''
          }
          <aside class="notes">${escapeHtml(slide.notes || '')}</aside>
        </section>
      `
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(presentation.title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4/dist/theme/white.css">
  <style>
    :root {
      --r-main-color: ${presentation.theme.textColor};
      --r-heading-color: ${presentation.theme.primaryColor};
      --r-background-color: ${presentation.theme.backgroundColor};
    }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slides}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@4/dist/reveal.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      showNotes: false,
    });
  </script>
</body>
</html>`;
}

/**
 * Generate PDF-ready HTML (print-optimized)
 */
function generatePDFReadyHTML(presentation: PPTPresentation, includeNotes: boolean = true): string {
  const slides = presentation.slides
    .map(
      (slide, index) => `
    <div class="slide-page">
      <div class="slide-content">
        ${slide.title ? `<h1>${escapeHtml(slide.title)}</h1>` : ''}
        ${slide.subtitle ? `<h2>${escapeHtml(slide.subtitle)}</h2>` : ''}
        ${slide.content ? `<div class="content">${escapeHtml(slide.content)}</div>` : ''}
        ${
          slide.bullets && slide.bullets.length > 0
            ? `<ul class="bullets">${slide.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
            : ''
        }
      </div>
      ${includeNotes && slide.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(slide.notes)}</div>` : ''}
      <div class="slide-number">${index + 1} / ${presentation.slides.length}</div>
    </div>
  `
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(presentation.title)} - PDF Export</title>
  <style>
    @page {
      size: landscape;
      margin: 0;
    }
    @media print {
      .slide-page { page-break-after: always; }
      .slide-page:last-child { page-break-after: auto; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${presentation.theme.bodyFont}, -apple-system, BlinkMacSystemFont, sans-serif;
      background: white;
      color: ${presentation.theme.textColor};
    }
    .slide-page {
      width: 100vw;
      height: 100vh;
      padding: 40px 60px;
      display: flex;
      flex-direction: column;
      background: ${presentation.theme.backgroundColor};
      position: relative;
    }
    .slide-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    h1 {
      font-family: ${presentation.theme.headingFont}, sans-serif;
      font-size: 2.5em;
      color: ${presentation.theme.primaryColor};
      margin-bottom: 20px;
    }
    h2 {
      font-size: 1.5em;
      color: ${presentation.theme.secondaryColor};
      margin-bottom: 30px;
      font-weight: normal;
    }
    .content {
      font-size: 1.3em;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .bullets {
      font-size: 1.2em;
      padding-left: 30px;
      line-height: 1.8;
    }
    .bullets li {
      margin: 10px 0;
    }
    .notes {
      margin-top: auto;
      padding: 15px;
      background: #f5f5f5;
      border-left: 4px solid ${presentation.theme.primaryColor};
      font-size: 0.9em;
      color: #666;
    }
    .slide-number {
      position: absolute;
      bottom: 20px;
      right: 30px;
      font-size: 0.8em;
      color: #999;
    }
    /* Print button - hidden when printing */
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${presentation.theme.primaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .print-button:hover { opacity: 0.9; }
    @media print {
      .print-button { display: none; }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">📄 Save as PDF</button>
  ${slides}
</body>
</html>`;
}

/**
 * Generate PPTX-compatible content (Office Open XML structure as JSON)
 * This generates a JSON representation that can be used with pptxgenjs or similar libraries
 */
function generatePPTXContent(presentation: PPTPresentation): string {
  const pptxData = {
    title: presentation.title,
    author: 'Cognia AI',
    subject: presentation.title,
    company: '',
    theme: {
      headingFont: presentation.theme.headingFont,
      bodyFont: presentation.theme.bodyFont,
      primaryColor: presentation.theme.primaryColor,
      secondaryColor: presentation.theme.secondaryColor,
      backgroundColor: presentation.theme.backgroundColor,
      textColor: presentation.theme.textColor,
    },
    slides: presentation.slides.map((slide, index) => ({
      slideNumber: index + 1,
      layout: slide.layout,
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      content: slide.content || '',
      bullets: slide.bullets || [],
      notes: slide.notes || '',
      elements: slide.elements || [],
    })),
    metadata: {
      totalSlides: presentation.slides.length,
      createdAt: new Date().toISOString(),
      format: 'pptx-json',
      version: '1.0',
    },
  };

  // Return as formatted JSON with embedded JavaScript to create actual PPTX
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(presentation.title)} - PPTX Export</title>
  <script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: ${presentation.theme.primaryColor}; margin-bottom: 10px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .download-btn {
      display: inline-block;
      padding: 15px 30px;
      background: ${presentation.theme.primaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      cursor: pointer;
      margin-right: 10px;
    }
    .download-btn:hover { opacity: 0.9; }
    .info { margin-top: 20px; color: #888; font-size: 14px; }
    .preview { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    .slide-preview {
      background: #fafafa;
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      border-left: 4px solid ${presentation.theme.primaryColor};
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>📊 ${escapeHtml(presentation.title)}</h1>
    <p class="subtitle">${presentation.slides.length} slides ready for export</p>
    
    <button class="download-btn" onclick="generatePPTX()">⬇️ Download PPTX</button>
    <button class="download-btn" style="background: #666;" onclick="copyJSON()">📋 Copy JSON</button>
    
    <p class="info">Click the button above to generate and download your PowerPoint file.</p>
    
    <div class="preview">
      <h3>Slide Preview:</h3>
      ${presentation.slides.map((s, i) => `
        <div class="slide-preview">
          <strong>Slide ${i + 1}:</strong> ${escapeHtml(s.title || 'Untitled')}
          ${s.bullets && s.bullets.length > 0 ? `<br><small>${s.bullets.length} bullet points</small>` : ''}
        </div>
      `).join('')}
    </div>
  </div>
  
  <script>
    const presentationData = ${JSON.stringify(pptxData, null, 2)};
    
    function generatePPTX() {
      const pptx = new PptxGenJS();
      
      // Set presentation properties
      pptx.author = presentationData.author;
      pptx.title = presentationData.title;
      pptx.subject = presentationData.subject;
      
      // Define master slide
      pptx.defineSlideMaster({
        title: 'MAIN',
        background: { color: presentationData.theme.backgroundColor.replace('#', '') },
      });
      
      // Create slides
      presentationData.slides.forEach((slideData, index) => {
        const slide = pptx.addSlide({ masterName: 'MAIN' });
        
        // Title
        if (slideData.title) {
          slide.addText(slideData.title, {
            x: 0.5,
            y: 0.5,
            w: '90%',
            h: 1,
            fontSize: 36,
            bold: true,
            color: presentationData.theme.primaryColor.replace('#', ''),
            fontFace: presentationData.theme.headingFont,
          });
        }
        
        // Subtitle
        if (slideData.subtitle) {
          slide.addText(slideData.subtitle, {
            x: 0.5,
            y: 1.5,
            w: '90%',
            h: 0.5,
            fontSize: 24,
            color: presentationData.theme.secondaryColor.replace('#', ''),
            fontFace: presentationData.theme.bodyFont,
          });
        }
        
        // Content or bullets
        let yPos = slideData.subtitle ? 2.2 : 1.8;
        
        if (slideData.content) {
          slide.addText(slideData.content, {
            x: 0.5,
            y: yPos,
            w: '90%',
            h: 2,
            fontSize: 18,
            color: presentationData.theme.textColor.replace('#', ''),
            fontFace: presentationData.theme.bodyFont,
          });
          yPos += 2.2;
        }
        
        if (slideData.bullets && slideData.bullets.length > 0) {
          const bulletText = slideData.bullets.map(b => ({ text: b, options: { bullet: true } }));
          slide.addText(bulletText, {
            x: 0.5,
            y: yPos,
            w: '90%',
            h: 3,
            fontSize: 18,
            color: presentationData.theme.textColor.replace('#', ''),
            fontFace: presentationData.theme.bodyFont,
          });
        }
        
        // Notes
        if (slideData.notes) {
          slide.addNotes(slideData.notes);
        }
        
        // Slide number
        slide.addText(String(index + 1), {
          x: 9,
          y: 5.2,
          w: 0.5,
          h: 0.3,
          fontSize: 10,
          color: '999999',
        });
      });
      
      // Save the file
      pptx.writeFile({ fileName: presentationData.title.replace(/[^a-z0-9]/gi, '_') + '.pptx' });
    }
    
    function copyJSON() {
      navigator.clipboard.writeText(JSON.stringify(presentationData, null, 2))
        .then(() => alert('JSON copied to clipboard!'))
        .catch(err => console.error('Copy failed:', err));
    }
  </script>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * PPT tool definitions for registry
 */
export const pptTools = {
  ppt_outline: {
    name: 'ppt_outline',
    description: 'Generate a presentation outline from a topic',
    parameters: pptOutlineInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: () => (input: unknown) => executePPTOutline(input as PPTOutlineInput),
  },
  ppt_slide_content: {
    name: 'ppt_slide_content',
    description: 'Generate slide content from an outline',
    parameters: pptSlideContentInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: () => (input: unknown) => executePPTSlideContent(input as PPTSlideContentInput),
  },
  ppt_finalize: {
    name: 'ppt_finalize',
    description: 'Finalize and build the presentation object',
    parameters: pptFinalizeInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: () => (input: unknown) => executePPTFinalize(input as PPTFinalizeInput),
  },
  ppt_export: {
    name: 'ppt_export',
    description: 'Export presentation to various formats (marp, html, reveal)',
    parameters: pptExportInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: () => (input: unknown) => executePPTExport(input as PPTExportInput),
  },
};

/**
 * Register all PPT tools with the global registry
 */
export function registerPPTTools(): void {
  // Dynamic import to avoid circular dependencies
  import('./registry').then(({ getGlobalToolRegistry }) => {
    const registry = getGlobalToolRegistry();
    for (const tool of Object.values(pptTools)) {
      registry.register(tool);
    }
  });
}
