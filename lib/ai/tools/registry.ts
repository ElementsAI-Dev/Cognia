/**
 * Tool Registry - Manages available tools for AI agents
 * 
 * Uses AI SDK compatible tool definitions with Zod schemas
 * Provides centralized tool management for agent execution
 */

import { z } from 'zod';
import { calculatorInputSchema, executeCalculator } from './calculator';
import { ragSearchInputSchema, executeRAGSearch, type RAGSearchInput, type RAGSearchConfig } from './rag-search';
import { webSearchInputSchema, executeWebSearch } from './web-search';
import {
  webScraperInputSchema,
  bulkWebScraperInputSchema,
  searchAndScraperInputSchema,
  executeWebScraper,
  executeBulkWebScraper,
  executeSearchAndScrape,
  type WebScraperInput,
  type BulkWebScraperInput,
  type SearchAndScrapeInput,
} from './web-scraper';
import { 
  documentSummarizeInputSchema, 
  documentChunkInputSchema, 
  documentAnalyzeInputSchema,
  documentExtractTablesInputSchema,
  documentReadFileInputSchema,
  executeDocumentSummarize,
  executeDocumentChunk,
  executeDocumentAnalyze,
  executeDocumentExtractTables,
  executeDocumentReadFile,
} from './document-tool';
import {
  fileReadInputSchema,
  fileWriteInputSchema,
  fileListInputSchema,
  fileExistsInputSchema,
  fileDeleteInputSchema,
  directoryCreateInputSchema,
  fileCopyInputSchema,
  fileRenameInputSchema,
  fileInfoInputSchema,
  fileSearchInputSchema,
  fileAppendInputSchema,
  fileBinaryWriteInputSchema,
  contentSearchInputSchema,
  directoryDeleteInputSchema,
  fileMoveInputSchema,
  fileHashInputSchema,
  fileDiffInputSchema,
  executeFileRead,
  executeFileWrite,
  executeFileList,
  executeFileExists,
  executeFileDelete,
  executeDirectoryCreate,
  executeFileCopy,
  executeFileRename,
  executeFileInfo,
  executeFileSearch,
  executeFileAppend,
  executeBinaryWrite,
  executeContentSearch,
  executeDirectoryDelete,
  executeFileMove,
  executeFileHash,
  executeFileDiff,
} from './file-tool';
import {
  videoGenerateInputSchema,
  videoStatusInputSchema,
  executeVideoGenerate,
  executeVideoStatus,
  type VideoGenerateInput,
  type VideoStatusInput,
} from './video-tool';
import {
  academicSearchInputSchema,
  executeAcademicSearch,
  type AcademicSearchInput,
  type AcademicSearchConfig,
} from './academic-search-tool';
import {
  academicAnalysisInputSchema,
  executeAcademicAnalysis,
  paperComparisonInputSchema,
  executePaperComparison,
  type AcademicAnalysisInput,
  type PaperComparisonInput,
} from './academic-analysis-tool';
import {
  videoSubtitleInputSchema,
  videoAnalysisInputSchema,
  subtitleParseInputSchema,
  executeVideoSubtitleExtraction,
  executeVideoAnalysis,
  executeSubtitleParse,
  type VideoSubtitleInput,
  type VideoAnalysisInput,
  type SubtitleParseInput,
} from './video-analysis-tool';
import {
  imageGenerateInputSchema,
  imageEditInputSchema,
  imageVariationInputSchema,
  executeImageGenerate,
  executeImageEdit,
  executeImageVariation,
  type ImageGenerateInput,
  type ImageEditInput,
  type ImageVariationInput,
} from './image-tool';
import {
  pptOutlineInputSchema,
  pptSlideContentInputSchema,
  pptFinalizeInputSchema,
  pptExportInputSchema,
  executePPTOutline,
  executePPTSlideContent,
  executePPTFinalize,
  executePPTExport,
  type PPTOutlineInput,
  type PPTSlideContentInput,
  type PPTFinalizeInput,
  type PPTExportInput,
} from './ppt-tool';
import {
  displayFlashcardInputSchema,
  displayFlashcardDeckInputSchema,
  displayQuizInputSchema,
  displayQuizQuestionInputSchema,
  displayReviewSessionInputSchema,
  displayProgressSummaryInputSchema,
  displayConceptExplanationInputSchema,
  executeDisplayFlashcard,
  executeDisplayFlashcardDeck,
  executeDisplayQuiz,
  executeDisplayQuizQuestion,
  executeDisplayReviewSession,
  executeDisplayProgressSummary,
  executeDisplayConceptExplanation,
  type DisplayFlashcardInput,
  type DisplayFlashcardDeckInput,
  type DisplayQuizInput,
  type DisplayQuizQuestionInput,
  type DisplayReviewSessionInput,
  type DisplayProgressSummaryInput,
  type DisplayConceptExplanationInput,
} from './learning-tools';
import { registerArtifactTools } from './artifact-tool';
import { registerMemoryTools } from './memory-tool';
import {
  shellExecuteInputSchema,
  executeShellCommand,
} from './shell-tool';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolFunction = (...args: any[]) => any;

export interface ToolDefinition<T extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  parameters: T;
  requiresApproval?: boolean;
  category?: 'search' | 'code' | 'file' | 'system' | 'custom' | 'ppt' | 'video' | 'image' | 'academic' | 'learning' | 'artifact' | 'memory';
  create: (config: Record<string, unknown>) => ToolFunction;
}

/**
 * Tool format compatible with AI SDK's tool calling
 */
export interface AICompatibleTool {
  description: string;
  parameters: z.ZodType;
  execute: (args: unknown) => Promise<unknown>;
}

/**
 * Convert a ToolDefinition to AI SDK compatible format
 */
export function toAICompatibleTool<T extends z.ZodType>(
  toolDef: ToolDefinition<T>,
  config: Record<string, unknown> = {}
): AICompatibleTool {
  const executeFn = toolDef.create(config);
  
  return {
    description: toolDef.description,
    parameters: toolDef.parameters,
    execute: async (args: unknown) => executeFn(args),
  };
}

/**
 * Convert multiple ToolDefinitions to AI SDK compatible tools record
 */
export function toAICompatibleTools(
  toolDefs: ToolDefinition[],
  config: Record<string, unknown> = {}
): Record<string, AICompatibleTool> {
  const result: Record<string, AICompatibleTool> = {};
  
  for (const toolDef of toolDefs) {
    result[toolDef.name] = toAICompatibleTool(toolDef, config);
  }
  
  return result;
}

export interface ToolRegistry {
  tools: Map<string, ToolDefinition>;
  register: (tool: ToolDefinition) => void;
  unregister: (name: string) => void;
  get: (name: string) => ToolDefinition | undefined;
  getAll: () => ToolDefinition[];
  getByCategory: (category: ToolDefinition['category']) => ToolDefinition[];
  createTools: (
    toolNames: string[],
    config: Record<string, unknown>
  ) => Record<string, ToolFunction>;
  /**
   * Create AI compatible tools from registry
   */
  toAICompatibleTools: (
    toolNames: string[],
    config: Record<string, unknown>
  ) => Record<string, AICompatibleTool>;
  /**
   * Get all tools as AI compatible tools
   */
  getAllAsAICompatibleTools: (config: Record<string, unknown>) => Record<string, AICompatibleTool>;
}

/**
 * Create a new tool registry
 */
export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, ToolDefinition>();

  return {
    tools,

    register(toolDef: ToolDefinition) {
      tools.set(toolDef.name, toolDef);
    },

    unregister(name: string) {
      tools.delete(name);
    },

    get(name: string) {
      return tools.get(name);
    },

    getAll() {
      return Array.from(tools.values());
    },

    getByCategory(category: ToolDefinition['category']) {
      return Array.from(tools.values()).filter((t) => t.category === category);
    },

    createTools(toolNames: string[], config: Record<string, unknown>) {
      const result: Record<string, ToolFunction> = {};

      for (const name of toolNames) {
        const toolDef = tools.get(name);
        if (toolDef) {
          result[name] = toolDef.create(config);
        }
      }

      return result;
    },

    toAICompatibleTools(toolNames: string[], config: Record<string, unknown>) {
      const result: Record<string, AICompatibleTool> = {};

      for (const name of toolNames) {
        const toolDef = tools.get(name);
        if (toolDef) {
          result[name] = toAICompatibleTool(toolDef, config);
        }
      }

      return result;
    },

    getAllAsAICompatibleTools(config: Record<string, unknown>) {
      return toAICompatibleTools(this.getAll(), config);
    },
  };
}

/**
 * Global tool registry instance
 */
let globalRegistry: ToolRegistry | null = null;

export function getGlobalToolRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = createToolRegistry();
    // Pre-register default tools
    registerDefaultTools(globalRegistry);
  }
  return globalRegistry;
}

/**
 * Register all default tools to a registry
 */
function registerDefaultTools(registry: ToolRegistry): void {
  // Calculator tool
  registry.register({
    name: 'calculator',
    description: `Perform mathematical calculations and unit conversions.
Calculate mode (default): +, -, *, /, ^, %. Functions: sqrt, cbrt, abs, floor, ceil, round, sign, trunc, exp, pow, sin, cos, tan, asin, acos, atan, atan2, log (base-10), log2, ln, min, max, hypot. Combinatorics: n! (factorial), P(n,r), C(n,r). Constants: pi, e, tau, inf.
Convert mode: set mode="convert" with value, fromUnit, toUnit, category (length/weight/temperature/time/data/speed/area/volume/angle/pressure).`,
    parameters: calculatorInputSchema,
    requiresApproval: false,
    category: 'system',
    create: () => executeCalculator,
  });

  // RAG search tool
  registry.register({
    name: 'rag_search',
    description: 'Search the knowledge base for relevant information using semantic similarity.',
    parameters: ragSearchInputSchema,
    requiresApproval: false,
    category: 'search',
    create: (config) => (input: unknown) => executeRAGSearch(input as RAGSearchInput, config as unknown as RAGSearchConfig),
  });

  // Web search tool
  registry.register({
    name: 'web_search',
    description: 'Search the web for current information using multiple search providers.',
    parameters: webSearchInputSchema,
    requiresApproval: false,
    category: 'search',
    create: (config) => (input: unknown) => executeWebSearch(input as Parameters<typeof executeWebSearch>[0], config as unknown as Parameters<typeof executeWebSearch>[1]),
  });

  // Document tools
  registry.register({
    name: 'document_summarize',
    description: 'Generate a concise summary of document content.',
    parameters: documentSummarizeInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeDocumentSummarize,
  });

  registry.register({
    name: 'document_chunk',
    description: 'Split document content into smaller chunks for processing.',
    parameters: documentChunkInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeDocumentChunk,
  });

  registry.register({
    name: 'document_analyze',
    description: 'Analyze document structure and extract metadata.',
    parameters: documentAnalyzeInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeDocumentAnalyze,
  });

  registry.register({
    name: 'document_extract_tables',
    description: 'Extract tables from document content. Supports Markdown and HTML table formats. Returns structured table data with headers and rows.',
    parameters: documentExtractTablesInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeDocumentExtractTables,
  });

  registry.register({
    name: 'document_read_file',
    description: 'Read a document file from the local file system and process it in one step. Supports text, code, markdown, PDF, Word, Excel, CSV, HTML. Returns structured content with type detection, metadata, summary, and optional table extraction.',
    parameters: documentReadFileInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeDocumentReadFile,
  });

  // File tools
  registry.register({
    name: 'file_read',
    description: 'Read the contents of a text file from the local file system.',
    parameters: fileReadInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileRead,
  });

  registry.register({
    name: 'file_write',
    description: 'Write content to a file on the local file system.',
    parameters: fileWriteInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeFileWrite,
  });

  registry.register({
    name: 'file_list',
    description: 'List the contents of a directory.',
    parameters: fileListInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileList,
  });

  registry.register({
    name: 'file_exists',
    description: 'Check if a file or directory exists.',
    parameters: fileExistsInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileExists,
  });

  registry.register({
    name: 'file_delete',
    description: 'Delete a file from the local file system.',
    parameters: fileDeleteInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeFileDelete,
  });

  registry.register({
    name: 'directory_create',
    description: 'Create a new directory on the local file system.',
    parameters: directoryCreateInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeDirectoryCreate,
  });

  registry.register({
    name: 'file_copy',
    description: 'Copy a file from one location to another on the local file system.',
    parameters: fileCopyInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeFileCopy,
  });

  registry.register({
    name: 'file_rename',
    description: 'Rename or move a file to a new location on the local file system.',
    parameters: fileRenameInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeFileRename,
  });

  registry.register({
    name: 'file_info',
    description: 'Get detailed information about a file or directory, including size, type, and modification time.',
    parameters: fileInfoInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileInfo,
  });

  registry.register({
    name: 'file_search',
    description: 'Search for files in a directory by name pattern or file extension. Can search recursively.',
    parameters: fileSearchInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileSearch,
  });

  registry.register({
    name: 'file_append',
    description: 'Append content to the end of an existing file. Creates the file if it does not exist.',
    parameters: fileAppendInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeFileAppend,
  });

  registry.register({
    name: 'file_binary_write',
    description: 'Write binary data to a file on the local file system. Use this to save images, audio, video, or other binary files. Data must be base64-encoded.',
    parameters: fileBinaryWriteInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeBinaryWrite,
  });

  registry.register({
    name: 'content_search',
    description: 'Search for text patterns within file contents (grep-like). Searches recursively through text files in a directory. Supports regex, case-sensitive matching, and file extension filtering.',
    parameters: contentSearchInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeContentSearch,
  });

  registry.register({
    name: 'directory_delete',
    description: 'Delete a directory from the local file system. Can delete recursively. System-critical directories are protected.',
    parameters: directoryDeleteInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeDirectoryDelete,
  });

  registry.register({
    name: 'file_move',
    description: 'Move a file or directory to a new location. Handles cross-partition moves automatically (copy + delete).',
    parameters: fileMoveInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeFileMove,
  });

  registry.register({
    name: 'file_hash',
    description: 'Compute a hash/checksum of a file. Supports sha256 (default), sha1, sha512, and md5 algorithms.',
    parameters: fileHashInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileHash,
  });

  // File diff tool
  registry.register({
    name: 'file_diff',
    description: 'Compare two files and show differences in unified diff format. Shows added/removed lines with surrounding context. Useful for reviewing changes or comparing file versions.',
    parameters: fileDiffInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileDiff,
  });

  // Web scraper tools
  registry.register({
    name: 'web_scraper',
    description: 'Scrape and extract content from a web page. Supports both static HTML and JavaScript-rendered dynamic pages (using Playwright). Use this to get full text content from a specific URL.',
    parameters: webScraperInputSchema,
    requiresApproval: false,
    category: 'search',
    create: () => (input: unknown) => executeWebScraper(input as WebScraperInput),
  });

  registry.register({
    name: 'bulk_web_scraper',
    description: 'Scrape and extract content from multiple web pages in parallel. Limited to 10 URLs per request. Useful for gathering information from multiple sources at once.',
    parameters: bulkWebScraperInputSchema,
    requiresApproval: false,
    category: 'search',
    create: () => (input: unknown) => executeBulkWebScraper(input as BulkWebScraperInput),
  });

  registry.register({
    name: 'search_and_scrape',
    description: 'Search the web and scrape the full content of top results. Combines web search with content extraction for comprehensive information gathering.',
    parameters: searchAndScraperInputSchema,
    requiresApproval: false,
    category: 'search',
    create: (config) => (input: unknown) => executeSearchAndScrape(input as SearchAndScrapeInput, config as { apiKey?: string; provider?: string }),
  });

  // Video generation tools
  registry.register({
    name: 'video_generate',
    description: `Generate a video from a text prompt using AI. Supports Google Veo (veo-3, veo-3.1) and OpenAI Sora (sora-1, sora-turbo).

Features:
- Text-to-video generation
- Image-to-video generation (provide referenceImageUrl)
- Multiple resolutions (480p to 4K)
- Various aspect ratios (16:9, 9:16, 1:1, etc.)
- Durations from 5s to 60s
- Visual styles (cinematic, animation, documentary, etc.)
- Audio generation (Veo 3.1 only)

Returns a jobId for async operations. Use video_status to check progress.`,
    parameters: videoGenerateInputSchema,
    requiresApproval: false,
    category: 'video',
    create: (config) => (input: unknown) => executeVideoGenerate(input as VideoGenerateInput, (config.apiKey as string) || ''),
  });

  registry.register({
    name: 'video_status',
    description: 'Check the status of a video generation job. Returns progress percentage and video URL when complete.',
    parameters: videoStatusInputSchema,
    requiresApproval: false,
    category: 'video',
    create: (config) => (input: unknown) => executeVideoStatus(input as VideoStatusInput, (config.apiKey as string) || ''),
  });

  // Academic search tools
  registry.register({
    name: 'academic_search',
    description: `Search academic databases (arXiv, Semantic Scholar, OpenAlex, HuggingFace Papers) for scholarly papers.
Use this tool to find research papers, discover publications, search by authors, or explore AI/ML papers.
Returns paper metadata including title, authors, abstract, year, citations, and PDF links.`,
    parameters: academicSearchInputSchema,
    requiresApproval: false,
    category: 'academic',
    create: (config) => (input: unknown) => executeAcademicSearch(input as AcademicSearchInput, config as AcademicSearchConfig),
  });

  registry.register({
    name: 'academic_analysis',
    description: `Analyze academic papers to extract insights, summaries, and structured information.
Use this to generate summaries, extract key insights, analyze methodology, identify limitations, or provide simplified explanations.`,
    parameters: academicAnalysisInputSchema,
    requiresApproval: false,
    category: 'academic',
    create: () => (input: unknown) => executeAcademicAnalysis(input as AcademicAnalysisInput),
  });

  registry.register({
    name: 'paper_comparison',
    description: 'Compare multiple academic papers to identify similarities, differences, and relative strengths. Useful for literature reviews.',
    parameters: paperComparisonInputSchema,
    requiresApproval: false,
    category: 'academic',
    create: () => (input: unknown) => executePaperComparison(input as PaperComparisonInput),
  });

  // Video analysis tools
  registry.register({
    name: 'video_subtitles',
    description: `Extract subtitles from a video file. Supports embedded subtitles (SRT, ASS, VTT) and audio transcription via Whisper.`,
    parameters: videoSubtitleInputSchema,
    requiresApproval: false,
    category: 'video',
    create: (config) => (input: unknown) => executeVideoSubtitleExtraction(input as VideoSubtitleInput, (config.apiKey as string) || ''),
  });

  registry.register({
    name: 'video_analyze',
    description: `Analyze video content using subtitles or transcription. Analysis types: summary, transcript, key-moments, qa, full.`,
    parameters: videoAnalysisInputSchema,
    requiresApproval: false,
    category: 'video',
    create: (config) => (input: unknown) => executeVideoAnalysis(
      input as VideoAnalysisInput, 
      (config.apiKey as string) || '',
      config.analyzeCallback as ((text: string, prompt: string) => Promise<string>) | undefined
    ),
  });

  registry.register({
    name: 'subtitle_parse',
    description: 'Parse subtitle content in various formats (SRT, VTT, ASS/SSA). Returns structured data with cues and plain text transcript.',
    parameters: subtitleParseInputSchema,
    requiresApproval: false,
    category: 'video',
    create: () => (input: unknown) => executeSubtitleParse(input as SubtitleParseInput),
  });

  // Image generation tools
  registry.register({
    name: 'image_generate',
    description: `Generate an image from a text prompt using AI. Supports OpenAI DALL-E (dall-e-3, dall-e-2), Google Imagen, and Stability AI.
Features: multiple sizes, quality options, style options, and batch generation.`,
    parameters: imageGenerateInputSchema,
    requiresApproval: false,
    category: 'image',
    create: (config) => (input: unknown) => executeImageGenerate(input as ImageGenerateInput, (config.apiKey as string) || ''),
  });

  registry.register({
    name: 'image_edit',
    description: 'Edit an existing image using AI (inpainting). Provide a base64 encoded PNG image and a description of the edit.',
    parameters: imageEditInputSchema,
    requiresApproval: false,
    category: 'image',
    create: (config) => (input: unknown) => executeImageEdit(input as ImageEditInput, (config.apiKey as string) || ''),
  });

  registry.register({
    name: 'image_variation',
    description: 'Create variations of an existing image. The AI will generate similar but unique versions of the input image.',
    parameters: imageVariationInputSchema,
    requiresApproval: false,
    category: 'image',
    create: (config) => (input: unknown) => executeImageVariation(input as ImageVariationInput, (config.apiKey as string) || ''),
  });

  // PPT tools
  registry.register({
    name: 'ppt_outline',
    description: 'Generate a presentation outline from a topic. Creates structured slide outline with title, agenda, content slides, and closing.',
    parameters: pptOutlineInputSchema,
    requiresApproval: false,
    category: 'ppt',
    create: () => (input: unknown) => executePPTOutline(input as PPTOutlineInput),
  });

  registry.register({
    name: 'ppt_slide_content',
    description: 'Generate detailed slide content from an outline. Creates content, bullet points, and notes for each slide.',
    parameters: pptSlideContentInputSchema,
    requiresApproval: false,
    category: 'ppt',
    create: () => (input: unknown) => executePPTSlideContent(input as PPTSlideContentInput),
  });

  registry.register({
    name: 'ppt_finalize',
    description: 'Finalize and build the presentation object from outline and designed slides.',
    parameters: pptFinalizeInputSchema,
    requiresApproval: false,
    category: 'ppt',
    create: () => (input: unknown) => executePPTFinalize(input as PPTFinalizeInput),
  });

  registry.register({
    name: 'ppt_export',
    description: 'Export presentation to various formats (marp, html, reveal). Supports speaker notes and custom CSS.',
    parameters: pptExportInputSchema,
    requiresApproval: false,
    category: 'ppt',
    create: () => (input: unknown) => executePPTExport(input as PPTExportInput),
  });

  // Learning tools (Generative UI)
  registry.register({
    name: 'display_flashcard',
    description: 'Display an interactive flashcard for the user to review. Use for concepts that need memorization with question-answer format.',
    parameters: displayFlashcardInputSchema,
    requiresApproval: false,
    category: 'learning',
    create: () => (input: unknown) => executeDisplayFlashcard(input as DisplayFlashcardInput),
  });

  registry.register({
    name: 'display_flashcard_deck',
    description: 'Display a deck of flashcards for sequential review. Use when presenting multiple related concepts for study.',
    parameters: displayFlashcardDeckInputSchema,
    requiresApproval: false,
    category: 'learning',
    create: () => (input: unknown) => executeDisplayFlashcardDeck(input as DisplayFlashcardDeckInput),
  });

  registry.register({
    name: 'display_quiz',
    description: 'Display an interactive quiz to test understanding. Supports multiple choice, true/false, fill in the blank, and short answer.',
    parameters: displayQuizInputSchema,
    requiresApproval: false,
    category: 'learning',
    create: () => (input: unknown) => executeDisplayQuiz(input as DisplayQuizInput),
  });

  registry.register({
    name: 'display_quiz_question',
    description: 'Display a single quiz question for quick knowledge check during learning conversations.',
    parameters: displayQuizQuestionInputSchema,
    requiresApproval: false,
    category: 'learning',
    create: () => (input: unknown) => executeDisplayQuizQuestion(input as DisplayQuizQuestionInput),
  });

  registry.register({
    name: 'display_review_session',
    description: 'Start an interactive review session combining flashcards and quiz questions with spaced repetition support.',
    parameters: displayReviewSessionInputSchema,
    requiresApproval: false,
    category: 'learning',
    create: () => (input: unknown) => executeDisplayReviewSession(input as DisplayReviewSessionInput),
  });

  registry.register({
    name: 'display_progress_summary',
    description: 'Display a visual summary of learning progress including mastery levels, review statistics, and achievements.',
    parameters: displayProgressSummaryInputSchema,
    requiresApproval: false,
    category: 'learning',
    create: () => (input: unknown) => executeDisplayProgressSummary(input as DisplayProgressSummaryInput),
  });

  registry.register({
    name: 'display_concept_explanation',
    description: 'Display an interactive concept explanation with expandable sections, examples, and related concepts.',
    parameters: displayConceptExplanationInputSchema,
    requiresApproval: false,
    category: 'learning',
    create: () => (input: unknown) => executeDisplayConceptExplanation(input as DisplayConceptExplanationInput),
  });

  // Shell tools
  registry.register({
    name: 'shell_execute',
    description: `Execute a shell command on the local system. Commands are validated against an allowlist for safety.
Allowed: git, npm, node, python, grep, curl, docker, ls, cat, etc.
Blocked: rm, del, format, shutdown, chmod, registry editing.
Use file tools for file creation/deletion instead.`,
    parameters: shellExecuteInputSchema,
    requiresApproval: true,
    category: 'system',
    create: () => executeShellCommand,
  });

  // Artifact tools
  registerArtifactTools(registry);

  // Memory tools
  registerMemoryTools(registry);
}
