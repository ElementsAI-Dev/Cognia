/**
 * AI Tool Definitions - MCP-style tools for AI agents
 */

export { webSearchTool, executeWebSearch, webSearchInputSchema, type WebSearchToolInput, type WebSearchResult } from './web-search';
export { type ToolDefinition, type ToolRegistry, type ToolFunction, createToolRegistry, getGlobalToolRegistry } from './registry';
export { ragSearchTool, executeRAGSearch, ragSearchInputSchema, type RAGSearchInput, type RAGSearchResult } from './rag-search';
export { calculatorTool, executeCalculator, calculatorInputSchema, convertUnit, unitConversions, type CalculatorInput, type CalculatorResult } from './calculator';
export { documentTools, executeDocumentSummarize, executeDocumentChunk, executeDocumentAnalyze } from './document-tool';
