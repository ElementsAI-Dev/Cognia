/**
 * AI Tool Definitions - MCP-style tools for AI agents
 */

export { webSearchTool, executeWebSearch, webSearchInputSchema, type WebSearchToolInput, type WebSearchResult, type WebSearchConfig } from './web-search';
export {
  webScraperTool,
  bulkWebScraperTool,
  searchAndScrapeTool,
  executeWebScraper,
  executeBulkWebScraper,
  executeSearchAndScrape,
  webScraperInputSchema,
  bulkWebScraperInputSchema,
  searchAndScraperInputSchema,
  type WebScraperInput,
  type BulkWebScraperInput,
  type SearchAndScrapeInput,
  type WebScraperResult,
  type BulkWebScraperResult,
  type SearchAndScrapeResult,
} from './web-scraper';
export { type ToolDefinition, type ToolRegistry, type ToolFunction, createToolRegistry, getGlobalToolRegistry } from './registry';
export { ragSearchTool, executeRAGSearch, ragSearchInputSchema, type RAGSearchInput, type RAGSearchResult } from './rag-search';
export { 
  academicSearchTool, 
  executeAcademicSearch, 
  academicSearchInputSchema,
  formatAcademicResultsForAI,
  type AcademicSearchInput, 
  type AcademicSearchResult,
  type AcademicSearchConfig,
} from './academic-search-tool';
export {
  academicAnalysisTool,
  executeAcademicAnalysis,
  academicAnalysisInputSchema,
  buildAnalysisPrompt,
  formatPaperForAnalysis,
  paperComparisonTool,
  executePaperComparison,
  paperComparisonInputSchema,
  type AcademicAnalysisInput,
  type AcademicAnalysisResult,
  type PaperComparisonInput,
  type PaperComparisonResult,
} from './academic-analysis-tool';
export { calculatorTool, executeCalculator, calculatorInputSchema, convertUnit, unitConversions, type CalculatorInput, type CalculatorResult } from './calculator';
export { documentTools, executeDocumentSummarize, executeDocumentChunk, executeDocumentAnalyze, executeDocumentExtractTables, executeDocumentReadFile, documentExtractTablesInputSchema, documentReadFileInputSchema, documentToolSystemPrompt, documentToolPromptSnippet, type DocumentToolResult, type DocumentReadFileInput } from './document-tool';
export { 
  fileTools,
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
  type FileReadInput,
  type FileWriteInput,
  type FileListInput,
  type FileExistsInput,
  type FileDeleteInput,
  type DirectoryCreateInput,
  type FileCopyInput,
  type FileRenameInput,
  type FileInfoInput,
  type FileSearchInput,
  type FileAppendInput,
  type FileToolResult,
  executeBinaryWrite,
  fileBinaryWriteInputSchema,
  type FileBinaryWriteInput,
  executeContentSearch,
  contentSearchInputSchema,
  type ContentSearchInput,
  executeDirectoryDelete,
  directoryDeleteInputSchema,
  type DirectoryDeleteInput,
  executeFileMove,
  fileMoveInputSchema,
  type FileMoveInput,
  executeFileHash,
  fileHashInputSchema,
  type FileHashInput,
  executeFileDiff,
  fileDiffInputSchema,
  type FileDiffInput,
  fileToolSystemPrompt,
  fileToolPromptSnippet,
} from './file-tool';
export {
  shellTools,
  executeShellCommand,
  shellExecuteInputSchema,
  shellToolSystemPrompt,
  type ShellExecuteInput,
  type ShellToolResult,
} from './shell-tool';
export {
  pptTools,
  executePPTOutline,
  executePPTSlideContent,
  executePPTFinalize,
  executePPTExport,
  registerPPTTools,
  pptOutlineInputSchema,
  pptSlideContentInputSchema,
  pptFinalizeInputSchema,
  pptExportInputSchema,
  type PPTOutlineInput,
  type PPTSlideContentInput,
  type PPTFinalizeInput,
  type PPTExportInput,
  type PPTToolResult,
} from './ppt-tool';

// PPT generation tool (for agent chat)
export {
  createPPTGenerationTool,
  detectPPTGenerationIntent,
  buildPPTSuggestionResponse,
  pptGenerationInputSchema,
  type PPTGenerationInput,
  type PPTGenerationResult,
  type PPTGenerationCallback,
} from './ppt-generation-tool';

// Material processing tools for PPT
export {
  materialTools,
  executeMaterialExtract,
  executeMaterialSummarize,
  executeMaterialAnalyze,
  executeMaterialCombine,
  registerMaterialTools,
  materialExtractInputSchema,
  materialSummarizeInputSchema,
  materialAnalyzeInputSchema,
  materialCombineInputSchema,
  generateSummarizationPrompt,
  generateAnalysisPrompt,
  type MaterialExtractInput,
  type MaterialSummarizeInput,
  type MaterialAnalyzeInput,
  type MaterialCombineInput,
  type MaterialToolResult,
} from './material-tool';

// Slide image generation tools
export {
  slideImageTools,
  executeSlideImageGenerate,
  executeSlideBatchImageGenerate,
  executeSlideImagePromptGenerate,
  enhanceSlidesWithImages,
  registerSlideImageTools,
  slideImageGenerateInputSchema,
  slideBatchImageGenerateInputSchema,
  slideImagePromptGenerateInputSchema,
  type SlideImageGenerateInput,
  type SlideBatchImageGenerateInput,
  type SlideImagePromptGenerateInput,
  type SlideImageToolResult,
} from './slide-image-tool';

// PPT image generation tools
export {
  pptImageTools,
  executePPTImageGenerate,
  executePPTBatchImageGenerate,
  generateSlideImage as generatePPTSlideImage,
  buildImagePrompt,
  applyImagesToSlides,
  registerPPTImageTools,
  pptImageGenerateInputSchema,
  pptBatchImageGenerateInputSchema,
  type PPTImageGenerateInput,
  type PPTBatchImageGenerateInput,
  type PPTImageToolResult,
} from './ppt-image-tool';

// Video generation tools
export {
  videoTools,
  videoGenerateTool,
  videoStatusTool,
  executeVideoGenerate,
  executeVideoStatus,
  executeGetVideoModels,
  registerVideoTools,
  videoGenerateInputSchema,
  videoStatusInputSchema,
  type VideoGenerateInput,
  type VideoStatusInput,
  type VideoToolResult,
} from './video-tool';

// Video analysis tools (subtitle extraction, transcription, analysis)
export {
  videoAnalysisTools,
  videoSubtitleTool,
  videoAnalysisTool,
  subtitleParseTool,
  executeVideoSubtitleExtraction,
  executeVideoAnalysis,
  executeSubtitleParse,
  formatVideoAnalysisForAI,
  registerVideoAnalysisTools,
  videoSubtitleInputSchema,
  videoAnalysisInputSchema,
  subtitleParseInputSchema,
  type VideoSubtitleInput,
  type VideoAnalysisInput,
  type SubtitleParseInput,
  type VideoAnalysisToolResult,
} from './video-analysis-tool';

// Image generation tools
export {
  imageTools,
  imageGenerateTool,
  imageEditTool,
  imageVariationTool,
  executeImageGenerate,
  executeImageEdit,
  executeImageVariation,
  executeGetImageModels,
  executeEstimateCost,
  registerImageTools,
  imageGenerateInputSchema,
  imageEditInputSchema,
  imageVariationInputSchema,
  type ImageGenerateInput,
  type ImageEditInput,
  type ImageVariationInput,
  type ImageToolResult,
} from './image-tool';

// Learning tools for generative UI
export {
  learningTools,
  executeDisplayFlashcard,
  executeDisplayFlashcardDeck,
  executeDisplayQuiz,
  executeDisplayQuizQuestion,
  executeDisplayReviewSession,
  executeDisplayProgressSummary,
  executeDisplayConceptExplanation,
  flashcardSchema,
  quizQuestionSchema,
  quizSchema,
  reviewSessionSchema,
  displayFlashcardInputSchema,
  displayFlashcardDeckInputSchema,
  displayQuizInputSchema,
  displayQuizQuestionInputSchema,
  displayReviewSessionInputSchema,
  displayProgressSummaryInputSchema,
  displayConceptExplanationInputSchema,
  type FlashcardData,
  type QuizQuestionData,
  type QuizData,
  type ReviewSessionData,
  type DisplayFlashcardInput,
  type DisplayFlashcardDeckInput,
  type DisplayQuizInput,
  type DisplayQuizQuestionInput,
  type DisplayReviewSessionInput,
  type DisplayProgressSummaryInput,
  type DisplayConceptExplanationInput,
  type FlashcardToolOutput,
  type FlashcardDeckToolOutput,
  type QuizToolOutput,
  type QuizQuestionToolOutput,
  type ReviewSessionToolOutput,
  type ProgressSummaryToolOutput,
  type ConceptExplanationToolOutput,
  type LearningToolOutput,
} from './learning-tools';

// Unified Tool Registry
export {
  UnifiedToolRegistry,
  getUnifiedToolRegistry,
  setUnifiedToolRegistry,
  registerBuiltinTools,
  registerSkillTools,
  registerMcpTools,
  registerCustomTools,
  inferToolCategory,
  type ToolSource,
  type ToolCategory as UnifiedToolCategory,
  type ToolMetadata,
  type ToolRegistrationMetadata,
  type RegisteredTool,
  type ToolRegistryConfig,
  type ToolFilterOptions,
} from './unified-registry';

// Intent detection for mode switching
export {
  detectUserIntent,
  detectChatIntent,
  detectModeMismatch,
  getModeSwitchSuggestion,
  shouldSuggestModeSwitch,
  getEnhancedModeSuggestion,
  type IntentDetectionResult,
} from './intent-detection';

// App builder tools
export {
  appBuilderTools,
  appGenerateTool,
  appCreateFromTemplateTool,
  appListTemplatesTool,
  appDeleteTool,
  executeAppGenerate,
  executeAppCreateFromTemplate,
  executeAppList,
  executeAppDelete,
  registerAppBuilderTools,
  getAppBuilderToolsPrompt,
  appGenerateInputSchema,
  appCreateFromTemplateInputSchema,
  appListInputSchema,
  appDeleteInputSchema,
  type AppGenerateInput,
  type AppCreateFromTemplateInput,
  type AppListInput,
  type AppDeleteInput,
  type AppBuilderToolResult,
} from './app-builder-tool';

// Artifact tools
export {
  artifactTools,
  artifactCreateTool,
  artifactUpdateTool,
  artifactReadTool,
  artifactSearchTool,
  artifactRenderTool,
  artifactExportTool,
  artifactDeleteTool,
  executeArtifactCreate,
  executeArtifactUpdate,
  executeArtifactRead,
  executeArtifactSearch,
  executeArtifactRender,
  executeArtifactExport,
  executeArtifactDelete,
  registerArtifactTools,
  getArtifactToolsPrompt,
  artifactCreateInputSchema,
  artifactUpdateInputSchema,
  artifactReadInputSchema,
  artifactSearchInputSchema,
  artifactRenderInputSchema,
  artifactExportInputSchema,
  artifactDeleteInputSchema,
  ARTIFACT_TYPES,
  SUPPORTED_LANGUAGES as ARTIFACT_SUPPORTED_LANGUAGES,
  type ArtifactCreateInput,
  type ArtifactUpdateInput,
  type ArtifactReadInput,
  type ArtifactSearchInput,
  type ArtifactRenderInput,
  type ArtifactExportInput,
  type ArtifactDeleteInput,
  type ArtifactToolResult,
} from './artifact-tool';

// Memory tools
export {
  memoryTools,
  memoryStoreTool,
  memoryRecallTool,
  memorySearchTool,
  memoryDeleteTool,
  memoryListTool,
  memoryUpdateTool,
  executeMemoryStore,
  executeMemoryRecall,
  executeMemorySearch,
  executeMemoryDelete,
  executeMemoryList,
  executeMemoryUpdate,
  registerMemoryTools,
  getMemoryToolsPrompt,
  memoryStoreInputSchema,
  memoryRecallInputSchema,
  memorySearchInputSchema,
  memoryDeleteInputSchema,
  memoryListInputSchema,
  memoryUpdateInputSchema,
  type MemoryStoreInput,
  type MemoryRecallInput,
  type MemorySearchInput,
  type MemoryDeleteInput,
  type MemoryListInput,
  type MemoryUpdateInput,
  type MemoryToolResult,
} from './memory-tool';

// Tool Cache - LRU cache for tool results
export {
  ToolCache,
  globalToolCache,
  type ToolCacheEntry,
  type ToolCacheConfig,
  type ToolCacheStats,
} from './tool-cache';

// Tool Call Manager - Parallel tool execution
export {
  ToolCallManager,
  createToolCallManager,
  getGlobalToolCallManager,
  setGlobalToolCallManager,
  resetGlobalToolCallManager,
  type ToolExecutionMode,
  type ToolCallManagerConfig,
  type ToolCallManagerStats,
  type PendingToolResult,
  type FlushResult,
  DEFAULT_TOOL_CALL_MANAGER_CONFIG,
} from './tool-call-manager';

// MCP Tools Adapter - Convert MCP tools to AgentTool format
export {
  convertMcpToolToAgentTool,
  convertMcpServerTools,
  convertAllMcpTools,
  createMcpToolsFromStore,
  createMcpToolsFromBackend,
  getMcpToolDescriptions,
  filterMcpToolsByServers,
  getMcpToolByOriginalName,
  formatMcpToolResult,
  scoreMcpToolRelevance,
  selectMcpToolsByRelevance,
  applyToolSelection,
  getMcpToolsWithSelection,
  getRecommendedMcpTools,
  type McpToolAdapterConfig,
} from './mcp-tools';

// Canvas Tools - Canvas document interaction
export {
  createCanvasCreateTool,
  createCanvasUpdateTool,
  createCanvasReadTool,
  createCanvasOpenTool,
  createCanvasTools,
  getCanvasToolsRecord,
  type CanvasCreateInput,
  type CanvasUpdateInput,
  type CanvasReadInput,
} from './canvas-tool';

// Environment Tools - Python virtual environment management
export {
  getEnvironmentTools,
  initializeEnvironmentTools,
  createVenvTool,
  createInstallPackagesTool,
  createRunPythonTool,
  createRunInEnvTool,
  createListPackagesTool,
  createCheckEnvTool,
  createGetPythonVersionsTool,
  getEnvironmentToolsSystemPrompt,
  getEnvironmentToolsPromptSnippet,
} from './environment-tools';

// Jupyter Tools - Jupyter notebook execution
export {
  getJupyterTools,
  getJupyterToolsSystemPrompt,
} from './jupyter-tools';

// Process Tools - Local process management
export {
  initializeProcessTools,
  createListProcessesTool,
  createGetProcessTool,
  createSearchProcessesTool,
  createTopMemoryProcessesTool,
  createStartProcessTool,
  createTerminateProcessTool,
  createCheckProgramTool,
  getProcessToolsSystemPrompt,
  getProcessToolsPromptSnippet,
  type ProcessToolsConfig,
} from './process-tools';

// LaTeX Assistant Tool - AI-powered LaTeX generation and assistance
export {
  latexAssistantTool,
  executeLatexAssistant,
  latexAssistantInputSchema,
  type LaTeXAssistantInput,
} from './latex-assistant-tool';

// Tool Execution Middleware - Cache, retry, and rate limiting
export {
  withMiddleware,
  applyMiddlewareToTools,
  getToolCacheStats,
  clearToolCache,
  invalidateToolCache,
  resetRateLimit,
  getRateLimitStatus,
  type ToolMiddlewareConfig,
  type ToolMiddlewareOptions,
  type RetryConfig,
  type RateLimitConfig,
} from './tool-middleware';
