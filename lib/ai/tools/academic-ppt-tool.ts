/**
 * Academic PPT Tool - Convert academic papers to presentations
 * 
 * Provides tools for generating academic-style presentations from research papers,
 * supporting various presentation styles (conference, seminar, thesis defense, etc.)
 */

import { z } from 'zod';
import type {
  PaperPPTSection,
  PaperPPTOutlineItem,
} from '@/types/academic';
import { DEFAULT_PPT_SECTIONS } from '@/types/academic';
import type {
  PPTPresentation,
  PPTSlide,
  PPTTheme,
  PPTSlideLayout,
  PPTOutlineItem,
} from '@/types/workflow';
import { DEFAULT_PPT_THEMES } from '@/types/workflow';

/**
 * Simplified paper type for PPT generation input
 * (doesn't require all fields of full Paper type)
 */
type InputPaper = {
  id: string;
  title: string;
  abstract?: string;
  authors: { name: string; affiliation?: string }[];
  year?: number;
  venue?: string;
  content?: string;
  pdfUrl?: string;
};

// =====================
// Input Schemas
// =====================

export const paperToPPTInputSchema = z.object({
  papers: z.array(z.object({
    id: z.string(),
    title: z.string(),
    abstract: z.string().optional(),
    authors: z.array(z.object({
      name: z.string(),
      affiliation: z.string().optional(),
    })),
    year: z.number().optional(),
    venue: z.string().optional(),
    content: z.string().optional(),
    pdfUrl: z.string().optional(),
  })).min(1).describe('Papers to convert to presentation'),
  
  style: z.enum(['academic', 'conference', 'seminar', 'thesis-defense', 'journal-club'])
    .default('academic')
    .describe('Presentation style'),
  
  slideCount: z.number().min(5).max(50).default(15)
    .describe('Target number of slides'),
  
  audienceLevel: z.enum(['expert', 'graduate', 'undergraduate', 'general'])
    .default('graduate')
    .describe('Target audience level'),
  
  language: z.string().default('en')
    .describe('Language for the presentation'),
  
  includeSections: z.array(z.enum([
    'title', 'authors', 'abstract', 'introduction', 'background',
    'related-work', 'methodology', 'experiments', 'results',
    'discussion', 'limitations', 'future-work', 'conclusion',
    'references', 'qa',
  ])).optional()
    .describe('Specific sections to include'),
  
  generateImages: z.boolean().default(true)
    .describe('Whether to generate AI images'),
  
  imageStyle: z.enum(['diagram', 'illustration', 'minimalist', 'scientific'])
    .default('diagram')
    .describe('Style for generated images'),
  
  includeNotes: z.boolean().default(true)
    .describe('Include speaker notes'),
  
  includeCitations: z.boolean().default(true)
    .describe('Include citations in slides'),
  
  includeReferences: z.boolean().default(true)
    .describe('Include references slide'),
  
  customInstructions: z.string().optional()
    .describe('Custom instructions for generation'),
});

export type PaperToPPTInput = z.infer<typeof paperToPPTInputSchema>;

// =====================
// Helper Functions
// =====================

/**
 * Get the academic theme for PPT
 */
function getAcademicTheme(): PPTTheme {
  const academicTheme = DEFAULT_PPT_THEMES.find(t => t.id === 'academic');
  return academicTheme || {
    id: 'academic',
    name: 'Academic',
    primaryColor: '#7B1FA2',
    secondaryColor: '#6A1B9A',
    accentColor: '#CE93D8',
    backgroundColor: '#FFFFFF',
    textColor: '#212121',
    headingFont: 'Merriweather',
    bodyFont: 'Source Serif Pro',
    codeFont: 'Source Code Pro',
  };
}

/**
 * Generate section title based on section type and audience level
 */
function getSectionTitle(
  section: PaperPPTSection,
  audienceLevel: string,
  language: string
): string {
  const titles: Record<PaperPPTSection, Record<string, string>> = {
    title: { en: 'Title', zh: '标题' },
    authors: { en: 'Authors & Affiliations', zh: '作者与单位' },
    abstract: { en: 'Abstract', zh: '摘要' },
    introduction: { en: 'Introduction', zh: '引言' },
    background: { en: 'Background', zh: '背景' },
    'related-work': { en: 'Related Work', zh: '相关工作' },
    methodology: { en: 'Methodology', zh: '方法' },
    experiments: { en: 'Experiments', zh: '实验' },
    results: { en: 'Results', zh: '结果' },
    discussion: { en: 'Discussion', zh: '讨论' },
    limitations: { en: 'Limitations', zh: '局限性' },
    'future-work': { en: 'Future Work', zh: '未来工作' },
    conclusion: { en: 'Conclusion', zh: '结论' },
    references: { en: 'References', zh: '参考文献' },
    qa: { en: 'Questions & Discussion', zh: '问答与讨论' },
  };

  const lang = language.startsWith('zh') ? 'zh' : 'en';
  return titles[section]?.[lang] || titles[section]?.en || section;
}

/**
 * Get suggested layout for a section
 */
function getLayoutForSection(section: PaperPPTSection): PPTSlideLayout {
  const layoutMap: Record<PaperPPTSection, PPTSlideLayout> = {
    title: 'title',
    authors: 'title-content',
    abstract: 'bullets',
    introduction: 'title-content',
    background: 'two-column',
    'related-work': 'bullets',
    methodology: 'image-left',
    experiments: 'two-column',
    results: 'chart',
    discussion: 'title-content',
    limitations: 'bullets',
    'future-work': 'bullets',
    conclusion: 'bullets',
    references: 'bullets',
    qa: 'closing',
  };
  return layoutMap[section] || 'title-content';
}

/**
 * Check if section needs an image
 */
function sectionNeedsImage(section: PaperPPTSection): boolean {
  const imageSections: PaperPPTSection[] = [
    'methodology', 'experiments', 'results', 'background',
  ];
  return imageSections.includes(section);
}

/**
 * Generate image suggestion for a section
 */
function getImageSuggestion(
  section: PaperPPTSection,
  paperTitle: string,
  imageStyle: string
): string {
  const suggestions: Record<PaperPPTSection, string> = {
    title: `Academic presentation title slide background for "${paperTitle}"`,
    authors: '',
    abstract: '',
    introduction: `Conceptual diagram introducing the research problem of "${paperTitle}"`,
    background: `Background context visualization for ${paperTitle}`,
    'related-work': `Network diagram showing related research connections`,
    methodology: `${imageStyle === 'diagram' ? 'Flowchart' : 'Illustration'} of the research methodology`,
    experiments: `Experimental setup diagram or visualization`,
    results: `Data visualization chart showing key results`,
    discussion: `Discussion points visualization`,
    limitations: '',
    'future-work': `Future research directions visualization`,
    conclusion: '',
    references: '',
    qa: `Q&A session background image`,
  };
  return suggestions[section] || '';
}

/**
 * Extract key points from paper abstract for a section
 */
function extractKeyPointsForSection(
  paper: InputPaper,
  section: PaperPPTSection,
  _audienceLevel: string
): string[] {
  const abstract = paper.abstract || '';
  
  // Generate placeholder key points based on section
  // In production, this would use AI to extract actual content
  const keyPointsMap: Record<PaperPPTSection, string[]> = {
    title: [],
    authors: paper.authors.map((a: { name: string; affiliation?: string }) => `${a.name}${a.affiliation ? ` (${a.affiliation})` : ''}`),
    abstract: abstract.split('. ').slice(0, 3).map((s: string) => s.trim()).filter(Boolean),
    introduction: [
      'Research motivation and problem statement',
      'Key challenges in the field',
      'Main contributions of this work',
    ],
    background: [
      'Foundational concepts',
      'Previous approaches',
      'Key terminology',
    ],
    'related-work': [
      'Prior research in this area',
      'Comparison with existing methods',
      'Gap in current literature',
    ],
    methodology: [
      'Proposed approach overview',
      'Key technical components',
      'Implementation details',
    ],
    experiments: [
      'Experimental setup',
      'Datasets and benchmarks',
      'Evaluation metrics',
    ],
    results: [
      'Main findings',
      'Quantitative results',
      'Qualitative analysis',
    ],
    discussion: [
      'Interpretation of results',
      'Implications for the field',
      'Comparison with baselines',
    ],
    limitations: [
      'Current limitations',
      'Assumptions made',
      'Scope constraints',
    ],
    'future-work': [
      'Potential extensions',
      'Open research questions',
      'Planned improvements',
    ],
    conclusion: [
      'Summary of contributions',
      'Key takeaways',
      'Final remarks',
    ],
    references: [
      'Key cited works',
      'Foundational papers',
      'Recent related publications',
    ],
    qa: [
      'Thank you for your attention',
      'Questions and discussion welcome',
    ],
  };

  return keyPointsMap[section] || [];
}

/**
 * Generate speaker notes for a section
 */
function generateSpeakerNotes(
  section: PaperPPTSection,
  _paper: InputPaper,
  audienceLevel: string
): string {
  const levelNote = audienceLevel === 'general' 
    ? 'Explain concepts in simple terms. '
    : audienceLevel === 'undergraduate'
    ? 'Provide context for technical terms. '
    : '';

  const notesMap: Record<PaperPPTSection, string> = {
    title: `${levelNote}Introduce the paper title and provide a brief hook to capture audience attention.`,
    authors: `${levelNote}Briefly introduce the authors and their affiliations. Mention any notable prior work.`,
    abstract: `${levelNote}Provide a high-level overview of the paper. This sets expectations for the presentation.`,
    introduction: `${levelNote}Explain the problem being addressed and why it matters. Establish the research gap.`,
    background: `${levelNote}Cover necessary background knowledge. Adjust depth based on audience familiarity.`,
    'related-work': `${levelNote}Position this work within the broader research landscape. Highlight key differences from prior work.`,
    methodology: `${levelNote}Walk through the proposed approach step by step. Use diagrams to illustrate key concepts.`,
    experiments: `${levelNote}Describe the experimental setup clearly. Justify the choice of datasets and metrics.`,
    results: `${levelNote}Present the main findings. Highlight surprising or important results.`,
    discussion: `${levelNote}Interpret the results and discuss their implications. Compare with baseline methods.`,
    limitations: `${levelNote}Be honest about limitations. This shows academic rigor and opens discussion.`,
    'future-work': `${levelNote}Discuss potential extensions and open questions. This can spark interesting discussions.`,
    conclusion: `${levelNote}Summarize the key contributions. End with a memorable takeaway.`,
    references: `${levelNote}Acknowledge key references. Mention where to find more information.`,
    qa: `${levelNote}Open the floor for questions. Be prepared to elaborate on any section.`,
  };

  return notesMap[section] || '';
}

// =====================
// Main Execution Functions
// =====================

/**
 * Generate PPT outline from papers
 */
export function executePaperToPPTOutline(input: PaperToPPTInput): {
  success: boolean;
  outline?: PaperPPTOutlineItem[];
  error?: string;
} {
  try {
    const mainPaper = input.papers[0];
    const sections = input.includeSections || DEFAULT_PPT_SECTIONS[input.style];
    
    const outline: PaperPPTOutlineItem[] = sections.map((section, index) => {
      const needsImage = input.generateImages && sectionNeedsImage(section);
      
      return {
        id: `slide-${index + 1}`,
        section,
        title: section === 'title' 
          ? mainPaper.title 
          : getSectionTitle(section, input.audienceLevel, input.language),
        keyPoints: extractKeyPointsForSection(mainPaper, section, input.audienceLevel),
        suggestedLayout: getLayoutForSection(section),
        imageNeeded: needsImage,
        imageSuggestion: needsImage 
          ? getImageSuggestion(section, mainPaper.title, input.imageStyle)
          : undefined,
        citations: input.includeCitations ? [] : undefined,
        speakerNotes: input.includeNotes 
          ? generateSpeakerNotes(section, mainPaper, input.audienceLevel)
          : undefined,
      };
    });

    return { success: true, outline };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate outline',
    };
  }
}

/**
 * Generate full PPT presentation from papers
 */
export function executePaperToPPT(input: PaperToPPTInput): {
  success: boolean;
  presentation?: PPTPresentation;
  outline?: PaperPPTOutlineItem[];
  error?: string;
} {
  try {
    // Generate outline first
    const outlineResult = executePaperToPPTOutline(input);
    if (!outlineResult.success || !outlineResult.outline) {
      return { success: false, error: outlineResult.error };
    }

    const mainPaper = input.papers[0];
    const theme = getAcademicTheme();
    
    // Convert outline to slides
    const slides: PPTSlide[] = outlineResult.outline.map((item, index) => ({
      id: item.id,
      order: index,
      layout: item.suggestedLayout as PPTSlideLayout,
      title: item.title,
      content: item.section === 'title' 
        ? mainPaper.abstract?.slice(0, 200) || ''
        : '',
      bullets: item.keyPoints,
      notes: item.speakerNotes || '',
      elements: [],
    }));

    // Convert to PPTOutlineItem format
    const pptOutline: PPTOutlineItem[] = outlineResult.outline.map(item => ({
      id: item.id,
      title: item.title,
      description: item.keyPoints.join('. '),
      suggestedLayout: item.suggestedLayout as PPTSlideLayout,
      keyPoints: item.keyPoints,
      order: parseInt(item.id.replace('slide-', '')) - 1,
    }));

    // Build presentation object
    const presentation: PPTPresentation = {
      id: `ppt-${Date.now()}`,
      title: mainPaper.title,
      description: `Academic presentation based on: ${mainPaper.title}`,
      theme,
      slides,
      outline: pptOutline,
      totalSlides: slides.length,
      aspectRatio: '16:9',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        source: 'academic-paper',
        paperIds: input.papers.map(p => p.id),
        style: input.style,
        audienceLevel: input.audienceLevel,
        language: input.language,
      },
    };

    return {
      success: true,
      presentation,
      outline: outlineResult.outline,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate presentation',
    };
  }
}

/**
 * Build AI prompt for academic PPT generation
 */
export function buildAcademicPPTPrompt(input: PaperToPPTInput): string {
  const mainPaper = input.papers[0];
  const sections = input.includeSections || DEFAULT_PPT_SECTIONS[input.style];
  
  const audienceLevelDescriptions: Record<string, string> = {
    expert: 'domain experts who are familiar with the technical details',
    graduate: 'graduate students with foundational knowledge in the field',
    undergraduate: 'undergraduate students who may need more context',
    general: 'general audience with limited technical background',
  };

  const styleDescriptions: Record<string, string> = {
    academic: 'formal academic presentation with comprehensive coverage',
    conference: 'concise conference presentation focusing on key contributions',
    seminar: 'educational seminar with more background and discussion',
    'thesis-defense': 'comprehensive thesis defense covering all aspects',
    'journal-club': 'critical analysis presentation for journal club discussion',
  };

  return `Create an academic presentation for the following research paper:

**Paper Title:** ${mainPaper.title}

**Authors:** ${mainPaper.authors.map(a => a.name).join(', ')}
${mainPaper.year ? `**Year:** ${mainPaper.year}` : ''}
${mainPaper.venue ? `**Venue:** ${mainPaper.venue}` : ''}

**Abstract:**
${mainPaper.abstract || 'No abstract provided'}

**Presentation Style:** ${styleDescriptions[input.style] || input.style}

**Target Audience:** ${audienceLevelDescriptions[input.audienceLevel] || input.audienceLevel}

**Target Slide Count:** ${input.slideCount}

**Sections to Include:** ${sections.join(', ')}

**Language:** ${input.language === 'zh' ? 'Chinese' : 'English'}

**Requirements:**
- Generate ${input.slideCount} slides covering the specified sections
- Each slide should have a clear title and 3-5 key bullet points
- Include detailed speaker notes for each slide
${input.includeCitations ? '- Include relevant citations where appropriate' : ''}
${input.generateImages ? `- Suggest ${input.imageStyle} style images for visual slides` : ''}
${input.customInstructions ? `\n**Additional Instructions:** ${input.customInstructions}` : ''}

Output the presentation outline as a JSON array with the following structure for each slide:
{
  "id": "slide-N",
  "section": "section-type",
  "title": "Slide Title",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "suggestedLayout": "layout-type",
  "imageNeeded": true/false,
  "imageSuggestion": "Image description if needed",
  "speakerNotes": "Detailed speaker notes"
}`;
}

// =====================
// Tool Registry Export
// =====================

export const academicPPTTools = {
  paper_to_ppt_outline: {
    name: 'paper_to_ppt_outline',
    description: 'Generate a presentation outline from academic papers. Creates structured outline with sections, key points, and speaker notes.',
    parameters: paperToPPTInputSchema,
    requiresApproval: false,
    category: 'academic' as const,
  },
  paper_to_ppt: {
    name: 'paper_to_ppt',
    description: 'Generate a complete presentation from academic papers. Creates full PPT with slides, content, and speaker notes.',
    parameters: paperToPPTInputSchema,
    requiresApproval: false,
    category: 'academic' as const,
  },
};
