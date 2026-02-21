/**
 * Academic Analysis Tool - AI-powered paper analysis for academic research
 * Provides structured analysis, summaries, and insights from papers
 */

import { z } from 'zod';
import type { 
  Paper, 
  LibraryPaper,
  PaperAnalysisType,
} from '@/types/academic';
import type { ProviderName } from '@/types/provider';

export const academicAnalysisInputSchema = z.object({
  paperId: z.string().optional().describe('ID of paper from library to analyze'),
  paperTitle: z.string().optional().describe('Title of the paper to analyze'),
  paperAbstract: z.string().optional().describe('Abstract or content of the paper'),
  paperContent: z.string().optional().describe('Full paper content if available'),
  analysisType: z
    .enum([
      'summary',
      'key-insights',
      'methodology',
      'findings',
      'limitations',
      'future-work',
      'related-work',
      'technical-details',
      'comparison',
      'critique',
      'eli5',
      'custom',
    ])
    .default('summary')
    .describe('Type of analysis to perform'),
  customPrompt: z.string().optional().describe('Custom analysis prompt for "custom" type'),
  depth: z
    .enum(['brief', 'standard', 'detailed'])
    .default('standard')
    .describe('Depth of analysis'),
  language: z.string().default('en').describe('Output language'),
  comparePapers: z
    .array(z.object({
      title: z.string(),
      abstract: z.string().optional(),
    }))
    .optional()
    .describe('Other papers to compare against'),
});

export type AcademicAnalysisInput = z.infer<typeof academicAnalysisInputSchema>;

export interface AcademicAnalysisResult {
  success: boolean;
  analysisType: PaperAnalysisType;
  paperTitle?: string;
  analysis: string;
  structuredAnalysis?: {
    summary?: string;
    keyInsights?: string[];
    methodology?: string;
    findings?: string[];
    limitations?: string[];
    futureWork?: string[];
    technicalDetails?: string;
    critique?: {
      strengths: string[];
      weaknesses: string[];
    };
  };
  suggestedQuestions?: string[];
  relatedTopics?: string[];
  error?: string;
}

/**
 * Analysis prompt templates for different analysis types
 */
const ANALYSIS_PROMPTS: Record<PaperAnalysisType, (paper: { title: string; abstract?: string; content?: string }, depth: string) => string> = {
  summary: (paper, depth) => `
Provide a ${depth} summary of the following academic paper:

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}
${paper.content ? `**Content:** ${paper.content.slice(0, 8000)}` : ''}

Structure your summary to include:
1. Main objective/research question
2. Key methodology
3. Principal findings
4. Significance and contributions

${depth === 'brief' ? 'Keep it concise (2-3 paragraphs).' : depth === 'detailed' ? 'Provide comprehensive coverage with technical details.' : 'Balance detail with readability.'}
`,

  'key-insights': (paper, depth) => `
Extract the key insights from this academic paper:

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}
${paper.content ? `**Content:** ${paper.content.slice(0, 8000)}` : ''}

Identify and explain:
1. Novel contributions to the field
2. Surprising or counterintuitive findings
3. Important implications for theory or practice
4. Methodological innovations
5. Potential applications

${depth === 'brief' ? 'List 3-5 main insights briefly.' : depth === 'detailed' ? 'Provide 8-10 insights with detailed explanations.' : 'Provide 5-7 insights with clear explanations.'}
`,

  methodology: (paper, depth) => `
Analyze the methodology of this academic paper:

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}
${paper.content ? `**Content:** ${paper.content.slice(0, 8000)}` : ''}

Examine:
1. Research design and approach
2. Data collection methods
3. Analysis techniques
4. Validity and reliability considerations
5. Potential methodological limitations

${depth === 'detailed' ? 'Include technical details and statistical methods used.' : ''}
`,

  findings: (paper, depth) => `
Summarize the findings and results of this academic paper:

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}
${paper.content ? `**Content:** ${paper.content.slice(0, 8000)}` : ''}

Cover:
1. Primary results
2. Statistical significance (if applicable)
3. Unexpected findings
4. How findings relate to hypotheses
5. Practical implications

${depth === 'brief' ? 'Focus on top 3-4 findings.' : ''}
`,

  limitations: (paper, _depth) => `
Identify the limitations of this academic paper:

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}
${paper.content ? `**Content:** ${paper.content.slice(0, 8000)}` : ''}

Analyze:
1. Methodological limitations
2. Sample/data limitations
3. Scope limitations
4. Potential biases
5. Generalizability concerns
6. Areas requiring further research
`,

  'future-work': (paper, _depth) => `
Identify future research directions based on this paper:

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}
${paper.content ? `**Content:** ${paper.content.slice(0, 8000)}` : ''}

Suggest:
1. Immediate extensions of this work
2. Open questions raised by the findings
3. Alternative approaches to explore
4. Cross-disciplinary opportunities
5. Practical applications to develop
`,

  'related-work': (paper, _depth) => `
Analyze the related work context of this paper:

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}
${paper.content ? `**Content:** ${paper.content.slice(0, 8000)}` : ''}

Discuss:
1. How this work builds on existing research
2. Key prior works it references
3. How it differentiates from similar studies
4. Its position in the broader research landscape
5. Potential connections to other fields
`,

  'technical-details': (paper, _depth) => `
Explain the technical details of this paper:

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}
${paper.content ? `**Content:** ${paper.content.slice(0, 8000)}` : ''}

Cover:
1. Core algorithms or mathematical frameworks
2. Implementation details
3. System architecture (if applicable)
4. Key parameters and their significance
5. Reproducibility considerations
`,

  comparison: (paper, _depth) => `
Prepare a comparative analysis framework for this paper:

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}

Create a framework for comparing this paper with others:
1. Key dimensions for comparison
2. Unique aspects of this approach
3. Common evaluation metrics
4. Strengths relative to alternatives
5. Weaknesses relative to alternatives
`,

  critique: (paper, depth) => `
Provide a critical evaluation of this academic paper:

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}
${paper.content ? `**Content:** ${paper.content.slice(0, 8000)}` : ''}

Evaluate:
**Strengths:**
- Methodological rigor
- Novelty and contribution
- Clarity and presentation
- Evidence quality

**Weaknesses:**
- Potential flaws or gaps
- Missing considerations
- Overgeneralizations
- Presentation issues

${depth === 'detailed' ? 'Provide specific examples and detailed reasoning.' : ''}
`,

  eli5: (paper, _depth) => `
Explain this academic paper as if to a curious beginner (ELI5 - Explain Like I'm 5):

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}

Use simple language and analogies to explain:
1. What problem does this paper try to solve?
2. What's the main idea or approach?
3. What did they discover?
4. Why does it matter?

Avoid jargon and use everyday examples where possible.
`,

  custom: (paper, _depth) => `
Analyze this academic paper:

**Title:** ${paper.title}
${paper.abstract ? `**Abstract:** ${paper.abstract}` : ''}
${paper.content ? `**Content:** ${paper.content.slice(0, 8000)}` : ''}
`,
};

/**
 * Generate suggested follow-up questions based on paper content
 */
function generateSuggestedQuestions(paper: { title: string; abstract?: string }, analysisType: PaperAnalysisType): string[] {
  const baseQuestions = [
    `What are the main contributions of "${paper.title}"?`,
    `How does this paper relate to recent developments in the field?`,
    `What are the practical applications of the findings?`,
  ];

  const typeSpecificQuestions: Record<string, string[]> = {
    summary: [
      'Can you explain the methodology in more detail?',
      'What makes this paper significant?',
    ],
    methodology: [
      'Are there alternative methods that could be used?',
      'What are the validity concerns with this approach?',
    ],
    findings: [
      'How do these results compare to previous studies?',
      'Are these findings generalizable?',
    ],
    limitations: [
      'How could future research address these limitations?',
      'Do these limitations significantly impact the conclusions?',
    ],
    critique: [
      'What would strengthen this paper?',
      'How do these weaknesses affect the validity of conclusions?',
    ],
  };

  return [...baseQuestions, ...(typeSpecificQuestions[analysisType] || [])];
}

/**
 * Extract related topics from paper content
 */
function extractRelatedTopics(paper: { title: string; abstract?: string }): string[] {
  const topics: string[] = [];
  const content = `${paper.title} ${paper.abstract || ''}`.toLowerCase();
  
  const topicPatterns: Record<string, string[]> = {
    'machine learning': ['neural network', 'deep learning', 'transformer', 'attention', 'bert', 'gpt'],
    'natural language processing': ['nlp', 'language model', 'text', 'sentiment', 'translation'],
    'computer vision': ['image', 'visual', 'cnn', 'object detection', 'segmentation'],
    'reinforcement learning': ['rl', 'reward', 'policy', 'agent', 'q-learning'],
    'optimization': ['gradient', 'convergence', 'loss', 'objective'],
    'data science': ['dataset', 'data analysis', 'statistics', 'visualization'],
  };

  for (const [topic, keywords] of Object.entries(topicPatterns)) {
    if (keywords.some(kw => content.includes(kw))) {
      topics.push(topic);
    }
  }

  return topics.slice(0, 5);
}

/**
 * Build analysis prompt for the given paper and analysis type
 */
export function buildAnalysisPrompt(
  paper: { title: string; abstract?: string; content?: string },
  analysisType: PaperAnalysisType,
  depth: 'brief' | 'standard' | 'detailed' = 'standard',
  customPrompt?: string
): string {
  if (analysisType === 'custom' && customPrompt) {
    return `${ANALYSIS_PROMPTS.custom(paper, depth)}\n\n**Analysis Focus:** ${customPrompt}`;
  }
  
  return ANALYSIS_PROMPTS[analysisType](paper, depth);
}

interface StructuredAnalysisPayload {
  summary?: string;
  keyInsights?: string[];
  methodology?: string;
  findings?: string[];
  limitations?: string[];
  futureWork?: string[];
  technicalDetails?: string;
  critique?: {
    strengths?: string[];
    weaknesses?: string[];
  };
}

function normalizeStringList(value: unknown, maxItems: number = 8): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function buildAnalysisMarkdown(structured: StructuredAnalysisPayload): string {
  const sections: string[] = [];
  if (structured.summary) {
    sections.push(`## Summary\n${structured.summary}`);
  }
  if (structured.keyInsights?.length) {
    sections.push(`## Key Insights\n${structured.keyInsights.map((item) => `- ${item}`).join('\n')}`);
  }
  if (structured.methodology) {
    sections.push(`## Methodology\n${structured.methodology}`);
  }
  if (structured.findings?.length) {
    sections.push(`## Findings\n${structured.findings.map((item) => `- ${item}`).join('\n')}`);
  }
  if (structured.limitations?.length) {
    sections.push(`## Limitations\n${structured.limitations.map((item) => `- ${item}`).join('\n')}`);
  }
  if (structured.futureWork?.length) {
    sections.push(`## Future Work\n${structured.futureWork.map((item) => `- ${item}`).join('\n')}`);
  }
  if (structured.technicalDetails) {
    sections.push(`## Technical Details\n${structured.technicalDetails}`);
  }
  if (structured.critique) {
    const strengths = normalizeStringList(structured.critique.strengths, 6);
    const weaknesses = normalizeStringList(structured.critique.weaknesses, 6);
    if (strengths.length || weaknesses.length) {
      sections.push(
        `## Critique\n${[
          strengths.length ? `**Strengths**\n${strengths.map((item) => `- ${item}`).join('\n')}` : '',
          weaknesses.length ? `**Weaknesses**\n${weaknesses.map((item) => `- ${item}`).join('\n')}` : '',
        ]
          .filter(Boolean)
          .join('\n\n')}`
      );
    }
  }
  return sections.join('\n\n');
}

async function generateStructuredAnalysis(
  analysisPrompt: string,
  language: string
): Promise<StructuredAnalysisPayload> {
  const [{ useSettingsStore }, { getProxyProviderModel }, { parseAIJSON }, { generateText }] =
    await Promise.all([
      import('@/stores'),
      import('@/lib/ai/core/proxy-client'),
      import('@/lib/ai/utils/parse-ai-json'),
      import('ai'),
    ]);

  const settings = useSettingsStore.getState();
  const providerSettings = settings.providerSettings;
  const defaultProvider = settings.defaultProvider as ProviderName;

  const candidates: Array<{
    provider: ProviderName;
    model: string;
    apiKey: string;
    baseURL?: string;
  }> = [];

  const pushCandidate = (provider: ProviderName) => {
    const setting = providerSettings[provider];
    if (!setting) {
      return;
    }
    const model = setting.defaultModel || '';
    if (!model) {
      return;
    }
    const apiKey = setting.apiKey || '';
    if (!apiKey && provider !== 'ollama') {
      return;
    }
    candidates.push({
      provider,
      model,
      apiKey,
      baseURL: setting.baseURL,
    });
  };

  pushCandidate(defaultProvider);
  for (const provider of Object.keys(providerSettings) as ProviderName[]) {
    if (provider !== defaultProvider) {
      pushCandidate(provider);
    }
  }

  if (candidates.length === 0) {
    throw new Error('No available AI provider/model configured for academic analysis');
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const model = getProxyProviderModel(
        candidate.provider,
        candidate.model,
        candidate.apiKey,
        candidate.baseURL,
        true
      );

      const { text } = await generateText({
        model,
        temperature: 0.2,
        prompt: `${analysisPrompt}

Return strict JSON only in this shape:
{
  "summary": "string",
  "keyInsights": ["string"],
  "methodology": "string",
  "findings": ["string"],
  "limitations": ["string"],
  "futureWork": ["string"],
  "technicalDetails": "string",
  "critique": {
    "strengths": ["string"],
    "weaknesses": ["string"]
  }
}

Write in language: ${language}.`,
      });

      const parsed = (parseAIJSON(text) || {}) as StructuredAnalysisPayload;
      return {
        summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : undefined,
        keyInsights: normalizeStringList(parsed.keyInsights, 10),
        methodology: typeof parsed.methodology === 'string' ? parsed.methodology.trim() : undefined,
        findings: normalizeStringList(parsed.findings, 10),
        limitations: normalizeStringList(parsed.limitations, 8),
        futureWork: normalizeStringList(parsed.futureWork, 8),
        technicalDetails:
          typeof parsed.technicalDetails === 'string' ? parsed.technicalDetails.trim() : undefined,
        critique: {
          strengths: normalizeStringList(parsed.critique?.strengths, 8),
          weaknesses: normalizeStringList(parsed.critique?.weaknesses, 8),
        },
      };
    } catch (error) {
      lastError = error;
      console.warn('[academic-analysis] provider fallback', {
        provider: candidate.provider,
        model: candidate.model,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw (lastError instanceof Error ? lastError : new Error(String(lastError)));
}

/**
 * Execute academic paper analysis
 */
export async function executeAcademicAnalysis(
  input: AcademicAnalysisInput
): Promise<AcademicAnalysisResult> {
  const { 
    paperTitle, 
    paperAbstract, 
    paperContent, 
    analysisType, 
    customPrompt, 
    depth = 'standard',
  } = input;

  if (!paperTitle && !paperAbstract && !paperContent) {
    return {
      success: false,
      analysisType: analysisType as PaperAnalysisType,
      analysis: '',
      error: 'Please provide paper title, abstract, or content to analyze',
    };
  }

  const paper = {
    title: paperTitle || 'Untitled Paper',
    abstract: paperAbstract,
    content: paperContent,
  };

  const analysisPrompt = buildAnalysisPrompt(paper, analysisType as PaperAnalysisType, depth, customPrompt);
  const suggestedQuestions = generateSuggestedQuestions(paper, analysisType as PaperAnalysisType);
  const relatedTopics = extractRelatedTopics(paper);

  try {
    const structured = await generateStructuredAnalysis(analysisPrompt, input.language || 'en');
    const analysis = buildAnalysisMarkdown(structured);
    return {
      success: true,
      analysisType: analysisType as PaperAnalysisType,
      paperTitle: paper.title,
      analysis: analysis || structured.summary || 'Analysis generated successfully.',
      structuredAnalysis: {
        summary: structured.summary,
        keyInsights: structured.keyInsights,
        methodology: structured.methodology,
        findings: structured.findings,
        limitations: structured.limitations,
        futureWork: structured.futureWork,
        technicalDetails: structured.technicalDetails,
        critique: structured.critique
          ? {
              strengths: structured.critique.strengths || [],
              weaknesses: structured.critique.weaknesses || [],
            }
          : undefined,
      },
      suggestedQuestions,
      relatedTopics,
    };
  } catch (error) {
    const fallback = [
      paper.abstract || '',
      paper.content?.slice(0, 800) || '',
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    return {
      success: true,
      analysisType: analysisType as PaperAnalysisType,
      paperTitle: paper.title,
      analysis: fallback || 'AI analysis generation failed; no content available for fallback.',
      suggestedQuestions,
      relatedTopics,
      error: error instanceof Error ? error.message : 'AI analysis generation failed',
    };
  }
}

/**
 * Format library paper for analysis
 */
export function formatPaperForAnalysis(paper: Paper | LibraryPaper): {
  title: string;
  abstract?: string;
  authors: string;
  year?: number;
  venue?: string;
} {
  return {
    title: paper.title,
    abstract: paper.abstract,
    authors: paper.authors.map(a => a.name).join(', '),
    year: paper.year,
    venue: paper.venue,
  };
}

/**
 * Academic analysis tool definition for AI agents
 */
export const academicAnalysisTool = {
  name: 'academic_analysis',
  description: `Analyze academic papers to extract insights, summaries, and structured information. Use this tool to:
- Generate summaries of research papers
- Extract key insights and contributions
- Analyze methodology and findings
- Identify limitations and future work
- Provide simplified explanations (ELI5)
- Compare multiple papers
- Critically evaluate research

The tool returns real AI-generated structured analysis output.`,
  parameters: academicAnalysisInputSchema,
  execute: executeAcademicAnalysis,
};

/**
 * Paper comparison tool
 */
export const paperComparisonInputSchema = z.object({
  papers: z.array(z.object({
    title: z.string(),
    abstract: z.string().optional(),
    authors: z.string().optional(),
    year: z.number().optional(),
  })).min(2).max(5).describe('Papers to compare (2-5 papers)'),
  comparisonAspects: z
    .array(z.enum(['methodology', 'findings', 'contributions', 'limitations', 'applications']))
    .default(['methodology', 'findings', 'contributions'])
    .describe('Aspects to compare'),
});

export type PaperComparisonInput = z.infer<typeof paperComparisonInputSchema>;

export interface PaperComparisonResult {
  success: boolean;
  comparisonPrompt: string;
  papers: string[];
  aspects: string[];
  error?: string;
}

/**
 * Generate paper comparison analysis
 */
export async function executePaperComparison(
  input: PaperComparisonInput
): Promise<PaperComparisonResult> {
  const { papers, comparisonAspects } = input;

  if (papers.length < 2) {
    return {
      success: false,
      comparisonPrompt: '',
      papers: [],
      aspects: [],
      error: 'At least 2 papers are required for comparison',
    };
  }

  const papersInfo = papers.map((p, i) => `
**Paper ${i + 1}:** ${p.title}
${p.authors ? `Authors: ${p.authors}` : ''}
${p.year ? `Year: ${p.year}` : ''}
${p.abstract ? `Abstract: ${p.abstract}` : ''}
`).join('\n---\n');

  const comparisonPrompt = `
Compare the following ${papers.length} academic papers:

${papersInfo}

Please compare these papers across the following aspects:
${comparisonAspects.map(a => `- **${a.charAt(0).toUpperCase() + a.slice(1)}**`).join('\n')}

Provide:
1. A comparison table or structured overview
2. Key similarities between the papers
3. Key differences and unique contributions
4. Relative strengths and weaknesses
5. Recommendations on which paper(s) to read based on different research goals
`;

  return {
    success: true,
    comparisonPrompt,
    papers: papers.map(p => p.title),
    aspects: comparisonAspects,
  };
}

export const paperComparisonTool = {
  name: 'paper_comparison',
  description: 'Compare multiple academic papers to identify similarities, differences, and relative strengths. Useful for literature reviews and understanding research landscape.',
  parameters: paperComparisonInputSchema,
  execute: executePaperComparison,
};

export default academicAnalysisTool;
