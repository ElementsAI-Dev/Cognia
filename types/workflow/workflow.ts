/**
 * Workflow type definitions
 * Defines workflow types, PPT types, and workflow execution states
 */

import type { z } from 'zod';

/**
 * Available workflow types
 */
export type WorkflowType =
  | 'ppt-generation' // PowerPoint/Presentation generation
  | 'report-generation' // Report document generation
  | 'code-project' // Code project scaffolding
  | 'data-analysis' // Data analysis workflow
  | 'content-creation' // General content creation
  | 'research' // Research and summarization
  | 'custom'
  | 'chatflow'; // Custom user-defined workflow

/**
 * Workflow step status
 */
export type WorkflowStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting_approval';

/**
 * Workflow execution status
 */
export type WorkflowExecutionStatus =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type WorkflowRuntimeSource = 'browser' | 'tauri';

export type WorkflowCodeRuntime = 'auto' | 'docker' | 'podman' | 'native';

export interface WorkflowCodeSandboxOptions {
  runtime?: WorkflowCodeRuntime;
  timeoutMs?: number;
  memoryLimitMb?: number;
  networkEnabled?: boolean;
  env?: Record<string, string>;
  args?: string[];
  files?: Record<string, string>;
}

/**
 * Input/Output schema for workflow steps
 */
export interface WorkflowIOSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: unknown;
  schema?: z.ZodType;
}

/**
 * Workflow step types - maps to visual node types
 */
export type WorkflowStepType =
  | 'ai'
  | 'tool'
  | 'human'
  | 'conditional'
  | 'parallel'
  | 'code'
  | 'transform'
  | 'loop'
  | 'webhook'
  | 'delay'
  | 'merge'
  | 'subworkflow'
  | 'knowledgeRetrieval'
  | 'parameterExtractor'
  | 'variableAggregator'
  | 'questionClassifier'
  | 'templateTransform'
  | 'chart'
  | 'lineChart'
  | 'barChart'
  | 'pieChart'
  | 'areaChart'
  | 'scatterChart'
  | 'radarChart';

export interface WorkflowVariableReference {
  nodeId: string;
  variableName: string;
  variablePath?: string[];
}

export interface WorkflowChartSeriesConfig {
  dataKey: string;
  name: string;
  color?: string;
  type?: 'line' | 'bar' | 'area';
  stackId?: string;
}

/**
 * Workflow step definition
 */
export interface WorkflowStepDefinition {
  id: string;
  name: string;
  description: string;
  type: WorkflowStepType;
  toolName?: string;
  aiPrompt?: string;
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
  dependencies?: string[];
  optional?: boolean;
  retryCount?: number;
  continueOnFail?: boolean;
  timeout?: number;
  errorBranch?: 'stop' | 'continue' | 'fallback';
  fallbackOutput?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  condition?: string;
  // Code step specific
  code?: string;
  language?: string;
  codeSandbox?: WorkflowCodeSandboxOptions;
  // Transform step specific
  transformType?: 'map' | 'filter' | 'reduce' | 'sort' | 'custom';
  expression?: string;
  // Loop step specific
  loopType?: 'forEach' | 'while' | 'times';
  iteratorVariable?: string;
  collection?: string;
  maxIterations?: number;
  // Webhook step specific
  webhookUrl?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  retries?: number;
  allowInternalNetwork?: boolean;
  // Delay step specific
  delayType?: 'fixed' | 'until' | 'cron';
  delayMs?: number;
  untilTime?: string;
  cronExpression?: string;
  // Merge step specific
  mergeStrategy?: 'concat' | 'merge' | 'first' | 'last' | 'custom';
  // Subworkflow step specific
  workflowId?: string;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  // Dify-inspired step specific
  queryVariable?: WorkflowVariableReference | null;
  knowledgeBaseIds?: string[];
  retrievalMode?: 'single' | 'multiple';
  topK?: number;
  scoreThreshold?: number;
  rerankingEnabled?: boolean;
  rerankingModel?: string;
  model?: string;
  instruction?: string;
  inputVariable?: WorkflowVariableReference | null;
  parameters?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
    enumValues?: string[];
  }>;
  variableRefs?: WorkflowVariableReference[];
  aggregationMode?: 'first' | 'last' | 'array' | 'merge';
  outputVariableName?: string;
  classes?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  template?: string;
  outputType?: 'string' | 'json';
  // Chart step specific
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar' | 'composed';
  title?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  series?: WorkflowChartSeriesConfig[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
  aspectRatio?: number;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  schemaVersion?: string;
  name: string;
  description: string;
  type: WorkflowType;
  version: string;
  icon: string;
  category: string;
  tags: string[];
  steps: WorkflowStepDefinition[];
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
  defaultConfig?: Record<string, unknown>;
  estimatedDuration?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Workflow step execution state
 */
export interface WorkflowStepExecution {
  stepId: string;
  status: WorkflowStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  logs: WorkflowLog[];
}

/**
 * Workflow log entry
 */
export interface WorkflowLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  stepId?: string;
  data?: unknown;
}

/**
 * Workflow execution instance
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowType: WorkflowType;
  sessionId: string;
  status: WorkflowExecutionStatus;
  config: Record<string, unknown>;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  steps: WorkflowStepExecution[];
  currentStepId?: string;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  logs: WorkflowLog[];
  runtime?: WorkflowRuntimeSource;
  triggerId?: string;
  isReplay?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Workflow template for quick start
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  workflowId: string;
  presetInputs: Record<string, unknown>;
  presetConfig: Record<string, unknown>;
  icon: string;
  category: string;
}

// =====================
// PPT-specific types
// =====================

/**
 * PPT slide layout types
 */
export type PPTSlideLayout =
  | 'title' // Title slide
  | 'title-content' // Title with content
  | 'two-column' // Two column layout
  | 'image-left' // Image on left, content on right
  | 'image-right' // Image on right, content on left
  | 'full-image' // Full background image
  | 'comparison' // Side by side comparison
  | 'quote' // Quote/testimonial
  | 'bullets' // Bullet points
  | 'numbered' // Numbered list
  | 'section' // Section divider
  | 'blank' // Blank slide
  | 'chart' // Chart/graph slide
  | 'table' // Table slide
  | 'timeline' // Timeline layout
  | 'closing'; // Closing/thank you slide

/**
 * PPT theme definition
 */
export interface PPTTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  codeFont: string;
}

/**
 * Animation effect types for PPT elements
 */
export type PPTAnimationEffect =
  | 'none'
  | 'fade'
  | 'fade-in'
  | 'fade-out'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'bounce'
  | 'rotate'
  | 'flip'
  | 'grow'
  | 'shrink'
  | 'pulse'
  | 'shake'
  | 'swing'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'split-horizontal'
  | 'split-vertical'
  | 'blinds-horizontal'
  | 'blinds-vertical'
  | 'checkerboard'
  | 'dissolve'
  | 'wheel'
  | 'random-bars'
  | 'typewriter';

/**
 * Animation timing function
 */
export type PPTAnimationTiming =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'elastic';

/**
 * Animation trigger type
 */
export type PPTAnimationTrigger =
  | 'on-click'
  | 'with-previous'
  | 'after-previous'
  | 'on-enter'
  | 'on-exit';

/**
 * Animation configuration for an element
 */
export interface PPTAnimation {
  /** Animation effect type */
  effect: PPTAnimationEffect;
  /** Duration in milliseconds */
  duration: number;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Animation timing function */
  timing?: PPTAnimationTiming;
  /** How the animation is triggered */
  trigger?: PPTAnimationTrigger;
  /** Direction for directional animations */
  direction?: 'normal' | 'reverse' | 'alternate';
  /** Number of times to repeat (0 = infinite) */
  iterations?: number;
  /** Animation order within the slide */
  order?: number;
}

/**
 * Slide transition configuration
 */
export interface PPTSlideTransition {
  /** Transition effect */
  effect: PPTAnimationEffect;
  /** Transition duration in milliseconds */
  duration: number;
  /** Timing function */
  timing?: PPTAnimationTiming;
  /** Sound to play during transition */
  sound?: string;
  /** Advance slide automatically after duration */
  advanceAfter?: number;
  /** Advance on mouse click */
  advanceOnClick?: boolean;
}

/**
 * PPT slide element
 */
export interface PPTSlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'chart' | 'table' | 'code' | 'icon' | 'video';
  content: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style?: Record<string, string>;
  metadata?: Record<string, unknown>;
  /** Enter animation */
  enterAnimation?: PPTAnimation;
  /** Exit animation */
  exitAnimation?: PPTAnimation;
  /** Emphasis animation (while on screen) */
  emphasisAnimation?: PPTAnimation;
}

/**
 * PPT slide definition
 */
export interface PPTSlide {
  id: string;
  order: number;
  layout: PPTSlideLayout;
  title?: string;
  subtitle?: string;
  content?: string;
  bullets?: string[];
  notes?: string;
  elements: PPTSlideElement[];
  backgroundImage?: string;
  backgroundColor?: string;
  /** Slide transition configuration */
  transition?: PPTSlideTransition;
  /** Legacy transition string (deprecated) */
  transitionLegacy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * PPT outline item
 */
export interface PPTOutlineItem {
  id: string;
  title: string;
  description?: string;
  suggestedLayout: PPTSlideLayout;
  keyPoints?: string[];
  order: number;
}

/**
 * PPT presentation definition
 */
export interface PPTPresentation {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  description?: string;
  theme: PPTTheme;
  slides: PPTSlide[];
  outline?: PPTOutlineItem[];
  totalSlides: number;
  aspectRatio: '16:9' | '4:3' | '16:10';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * PPT generation options
 */
export interface PPTGenerationOptions {
  topic: string;
  description?: string;
  targetAudience?: string;
  slideCount?: number;
  style?: 'professional' | 'creative' | 'minimal' | 'academic' | 'casual';
  includeImages?: boolean;
  includeCharts?: boolean;
  includeNotes?: boolean;
  language?: string;
  theme?: Partial<PPTTheme>;
  customInstructions?: string;
}

/**
 * PPT export format
 */
export type PPTExportFormat = 'marp' | 'html' | 'pdf' | 'pptx' | 'reveal';

/**
 * PPT export options
 */
export interface PPTExportOptions {
  format: PPTExportFormat;
  includeNotes?: boolean;
  includeAnimations?: boolean;
  quality?: 'low' | 'medium' | 'high';
  customCSS?: string;
}

// =====================
// Default values
// =====================

/**
 * Default PPT themes
 */
export const DEFAULT_PPT_THEMES: PPTTheme[] = [
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#60A5FA',
    backgroundColor: '#0F172A',
    textColor: '#F8FAFC',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
  },
  {
    id: 'modern-light',
    name: 'Modern Light',
    primaryColor: '#2563EB',
    secondaryColor: '#1D4ED8',
    accentColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    textColor: '#1E293B',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
  },
  {
    id: 'professional',
    name: 'Professional',
    primaryColor: '#1E40AF',
    secondaryColor: '#1E3A8A',
    accentColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    headingFont: 'Georgia',
    bodyFont: 'Arial',
    codeFont: 'Consolas',
  },
  {
    id: 'creative',
    name: 'Creative',
    primaryColor: '#7C3AED',
    secondaryColor: '#5B21B6',
    accentColor: '#A78BFA',
    backgroundColor: '#FAF5FF',
    textColor: '#1F2937',
    headingFont: 'Poppins',
    bodyFont: 'Open Sans',
    codeFont: 'Fira Code',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    primaryColor: '#18181B',
    secondaryColor: '#27272A',
    accentColor: '#52525B',
    backgroundColor: '#FAFAFA',
    textColor: '#18181B',
    headingFont: 'Helvetica Neue',
    bodyFont: 'Helvetica Neue',
    codeFont: 'Monaco',
  },
  {
    id: 'nature',
    name: 'Nature',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    accentColor: '#34D399',
    backgroundColor: '#ECFDF5',
    textColor: '#064E3B',
    headingFont: 'Merriweather',
    bodyFont: 'Source Sans Pro',
    codeFont: 'Source Code Pro',
  },
  // Business Templates
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    primaryColor: '#0F4C81',
    secondaryColor: '#1E3A5F',
    accentColor: '#4A90D9',
    backgroundColor: '#FFFFFF',
    textColor: '#1A1A2E',
    headingFont: 'Roboto',
    bodyFont: 'Roboto',
    codeFont: 'Roboto Mono',
  },
  {
    id: 'executive',
    name: 'Executive',
    primaryColor: '#2C3E50',
    secondaryColor: '#34495E',
    accentColor: '#E74C3C',
    backgroundColor: '#FDFEFE',
    textColor: '#2C3E50',
    headingFont: 'Playfair Display',
    bodyFont: 'Lato',
    codeFont: 'IBM Plex Mono',
  },
  {
    id: 'finance',
    name: 'Finance',
    primaryColor: '#1B4F72',
    secondaryColor: '#154360',
    accentColor: '#2ECC71',
    backgroundColor: '#FFFFFF',
    textColor: '#17202A',
    headingFont: 'Nunito',
    bodyFont: 'Open Sans',
    codeFont: 'Consolas',
  },
  // Technology Templates
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    primaryColor: '#6366F1',
    secondaryColor: '#4F46E5',
    accentColor: '#22D3EE',
    backgroundColor: '#0F0F23',
    textColor: '#E2E8F0',
    headingFont: 'Space Grotesk',
    bodyFont: 'Inter',
    codeFont: 'Fira Code',
  },
  {
    id: 'cyber',
    name: 'Cyber',
    primaryColor: '#00FF88',
    secondaryColor: '#00CC6A',
    accentColor: '#00FFFF',
    backgroundColor: '#0D1117',
    textColor: '#C9D1D9',
    headingFont: 'JetBrains Mono',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
  },
  {
    id: 'ai-future',
    name: 'AI Future',
    primaryColor: '#8B5CF6',
    secondaryColor: '#7C3AED',
    accentColor: '#F472B6',
    backgroundColor: '#1E1B4B',
    textColor: '#E0E7FF',
    headingFont: 'Outfit',
    bodyFont: 'Inter',
    codeFont: 'Fira Code',
  },
  // Education Templates
  {
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
  },
  {
    id: 'classroom',
    name: 'Classroom',
    primaryColor: '#FF6B35',
    secondaryColor: '#F7931E',
    accentColor: '#FFD93D',
    backgroundColor: '#FFFEF7',
    textColor: '#2D3436',
    headingFont: 'Nunito',
    bodyFont: 'Nunito',
    codeFont: 'Monaco',
  },
  {
    id: 'research',
    name: 'Research',
    primaryColor: '#00695C',
    secondaryColor: '#004D40',
    accentColor: '#26A69A',
    backgroundColor: '#FAFAFA',
    textColor: '#263238',
    headingFont: 'Libre Baskerville',
    bodyFont: 'Source Sans Pro',
    codeFont: 'Source Code Pro',
  },
  // Creative Templates
  {
    id: 'gradient-wave',
    name: 'Gradient Wave',
    primaryColor: '#EC4899',
    secondaryColor: '#8B5CF6',
    accentColor: '#06B6D4',
    backgroundColor: '#18181B',
    textColor: '#FAFAFA',
    headingFont: 'Poppins',
    bodyFont: 'Inter',
    codeFont: 'Fira Code',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    primaryColor: '#F97316',
    secondaryColor: '#EA580C',
    accentColor: '#FBBF24',
    backgroundColor: '#FFFBEB',
    textColor: '#451A03',
    headingFont: 'DM Sans',
    bodyFont: 'DM Sans',
    codeFont: 'JetBrains Mono',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    primaryColor: '#0EA5E9',
    secondaryColor: '#0284C7',
    accentColor: '#38BDF8',
    backgroundColor: '#F0F9FF',
    textColor: '#0C4A6E',
    headingFont: 'Quicksand',
    bodyFont: 'Nunito Sans',
    codeFont: 'Monaco',
  },
  // Special Templates
  {
    id: 'pitch-deck',
    name: 'Pitch Deck',
    primaryColor: '#EF4444',
    secondaryColor: '#DC2626',
    accentColor: '#F97316',
    backgroundColor: '#FFFFFF',
    textColor: '#18181B',
    headingFont: 'Montserrat',
    bodyFont: 'Open Sans',
    codeFont: 'Consolas',
  },
  {
    id: 'medical',
    name: 'Medical',
    primaryColor: '#0891B2',
    secondaryColor: '#0E7490',
    accentColor: '#22D3EE',
    backgroundColor: '#FFFFFF',
    textColor: '#164E63',
    headingFont: 'Roboto',
    bodyFont: 'Roboto',
    codeFont: 'Roboto Mono',
  },
  {
    id: 'legal',
    name: 'Legal',
    primaryColor: '#78350F',
    secondaryColor: '#92400E',
    accentColor: '#D97706',
    backgroundColor: '#FFFBEB',
    textColor: '#451A03',
    headingFont: 'Libre Baskerville',
    bodyFont: 'Crimson Text',
    codeFont: 'Courier New',
  },
];

/**
 * Get default theme by ID
 */
export function getDefaultPPTTheme(themeId: string): PPTTheme {
  return DEFAULT_PPT_THEMES.find((t) => t.id === themeId) || DEFAULT_PPT_THEMES[0];
}

/**
 * Slide layout metadata
 */
export const SLIDE_LAYOUT_INFO: Record<
  PPTSlideLayout,
  { name: string; description: string; icon: string }
> = {
  title: {
    name: 'Title Slide',
    description: 'Opening slide with title and subtitle',
    icon: 'Type',
  },
  'title-content': {
    name: 'Title + Content',
    description: 'Title with main content area',
    icon: 'FileText',
  },
  'two-column': {
    name: 'Two Columns',
    description: 'Side by side content columns',
    icon: 'Columns',
  },
  'image-left': {
    name: 'Image Left',
    description: 'Image on left, content on right',
    icon: 'ImageIcon',
  },
  'image-right': {
    name: 'Image Right',
    description: 'Content on left, image on right',
    icon: 'ImageIcon',
  },
  'full-image': { name: 'Full Image', description: 'Full background image', icon: 'Image' },
  comparison: {
    name: 'Comparison',
    description: 'Compare two items side by side',
    icon: 'GitCompare',
  },
  quote: { name: 'Quote', description: 'Featured quote or testimonial', icon: 'Quote' },
  bullets: { name: 'Bullet Points', description: 'List of bullet points', icon: 'List' },
  numbered: { name: 'Numbered List', description: 'Numbered step list', icon: 'ListOrdered' },
  section: { name: 'Section Divider', description: 'Section break slide', icon: 'Minus' },
  blank: { name: 'Blank', description: 'Empty slide for custom content', icon: 'Square' },
  chart: { name: 'Chart', description: 'Data visualization chart', icon: 'BarChart' },
  table: { name: 'Table', description: 'Data table layout', icon: 'Table' },
  timeline: { name: 'Timeline', description: 'Timeline or process flow', icon: 'Clock' },
  closing: { name: 'Closing', description: 'Thank you or closing slide', icon: 'CheckCircle' },
};

/**
 * Create empty presentation
 */
export function createEmptyPresentation(title: string, theme?: PPTTheme): PPTPresentation {
  const now = new Date();
  return {
    id: `ppt-${Date.now()}`,
    title,
    theme: theme || DEFAULT_PPT_THEMES[0],
    slides: [],
    totalSlides: 0,
    aspectRatio: '16:9',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create empty slide
 */
export function createEmptySlide(
  layout: PPTSlideLayout = 'title-content',
  order: number = 0
): PPTSlide {
  return {
    id: `slide-${Date.now()}-${order}`,
    order,
    layout,
    elements: [],
  };
}

// =====================
// Material Processing Types
// =====================

/**
 * Material source type
 */
export type PPTMaterialType = 'text' | 'file' | 'url' | 'document';

/**
 * Material input for PPT generation
 */
export interface PPTMaterial {
  id: string;
  type: PPTMaterialType;
  name: string;
  content: string;
  mimeType?: string;
  url?: string;
  metadata?: {
    wordCount?: number;
    pageCount?: number;
    language?: string;
    extractedAt?: Date;
  };
}

/**
 * Material analysis result
 */
export interface PPTMaterialAnalysis {
  id: string;
  materialId: string;
  summary: string;
  keyTopics: string[];
  keyPoints: string[];
  entities: Array<{
    name: string;
    type: 'person' | 'organization' | 'location' | 'concept' | 'date' | 'number';
    mentions: number;
  }>;
  structure: {
    sections: Array<{
      title: string;
      content: string;
      importance: number;
    }>;
    hasData: boolean;
    hasImages: boolean;
    suggestedSlideCount: number;
  };
  sentiment?: 'positive' | 'neutral' | 'negative';
  complexity: 'simple' | 'moderate' | 'complex';
  language: string;
}

/**
 * Enhanced outline item with material references
 */
export interface PPTEnhancedOutlineItem extends PPTOutlineItem {
  sourceReferences?: Array<{
    materialId: string;
    excerpt: string;
    relevance: number;
  }>;
  imageNeeded: boolean;
  imageSuggestion?: string;
  imageStyle?: string;
  dataVisualization?: {
    type:
      | 'bar-chart'
      | 'line-chart'
      | 'pie-chart'
      | 'table'
      | 'timeline'
      | 'flowchart'
      | 'comparison';
    data?: Record<string, unknown>;
    description?: string;
  };
  speakerNotes: string;
  estimatedDuration?: number;
  transitionNote?: string;
}

/**
 * Enhanced slide with image generation
 */
export interface PPTEnhancedSlide extends PPTSlide {
  imagePrompt?: string;
  generatedImageUrl?: string;
  generatedImageBase64?: string;
  imageStyle?: PPTImageStyle;
  sourceReferences?: string[];
  aiGeneratedContent?: {
    originalContent: string;
    enhancedContent: string;
    suggestions: string[];
  };
}

// =====================
// Image Generation Types
// =====================

/**
 * Image style for PPT slides
 */
export type PPTImageStyle =
  | 'photorealistic'
  | 'illustration'
  | 'minimalist'
  | 'corporate'
  | 'artistic'
  | 'infographic'
  | 'icon-based'
  | 'abstract'
  | 'diagram'
  | '3d-render';

/**
 * Image generation provider
 */
export type PPTImageProvider = 'openai' | 'google-imagen' | 'stability' | 'midjourney';

/**
 * Image generation configuration
 */
export interface PPTImageGenerationConfig {
  provider: PPTImageProvider;
  model?: string;
  style: PPTImageStyle;
  size: '1024x1024' | '1024x1792' | '1792x1024';
  quality: 'draft' | 'standard' | 'high';
  negativePrompt?: string;
  seed?: number;
}

/**
 * Slide image generation request
 */
export interface PPTSlideImageRequest {
  slideId: string;
  slideTitle: string;
  slideContent: string;
  slideLayout: PPTSlideLayout;
  presentationStyle: string;
  presentationTheme: PPTTheme;
  customPrompt?: string;
  config: PPTImageGenerationConfig;
}

/**
 * Slide image generation result
 */
export interface PPTSlideImageResult {
  slideId: string;
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  revisedPrompt?: string;
  generatedPrompt: string;
  provider: PPTImageProvider;
  error?: string;
}

// =====================
// Enhanced Generation Options
// =====================

/**
 * Enhanced PPT generation options with material support
 */
export interface PPTEnhancedGenerationOptions extends PPTGenerationOptions {
  materials?: PPTMaterial[];
  materialUrls?: string[];
  generateImages?: boolean;
  imageProvider?: PPTImageProvider;
  imageStyle?: PPTImageStyle;
  imageQuality?: 'draft' | 'standard' | 'high';
  maxImagesPerSlide?: number;
  summarizationDepth?: 'brief' | 'standard' | 'detailed';
  outlineApprovalRequired?: boolean;
  preserveSourceStructure?: boolean;
}

// =====================
// Workflow Execution Types
// =====================

/**
 * PPT workflow step result
 */
export interface PPTWorkflowStepResult {
  stepId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
  tokensUsed?: number;
}

/**
 * PPT workflow progress
 */
export interface PPTWorkflowProgress {
  currentStep: string;
  currentStepName: string;
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  currentStepProgress?: number;
}

/**
 * PPT workflow execution result
 */
export interface PPTWorkflowResult {
  success: boolean;
  presentation?: PPTPresentation;
  outline?: PPTEnhancedOutlineItem[];
  materialAnalysis?: PPTMaterialAnalysis[];
  generatedImages?: PPTSlideImageResult[];
  marpContent?: string;
  exportedFiles?: Array<{
    format: PPTExportFormat;
    filename: string;
    content: string;
  }>;
  statistics: {
    totalDuration: number;
    tokensUsed: number;
    imagesGenerated: number;
    slidesCreated: number;
    materialsProcessed: number;
  };
  errors?: string[];
  warnings?: string[];
}

/**
 * Default image generation config
 */
export const DEFAULT_IMAGE_CONFIG: PPTImageGenerationConfig = {
  provider: 'openai',
  model: 'dall-e-3',
  style: 'corporate',
  size: '1792x1024',
  quality: 'standard',
};

/**
 * Image style descriptions for prompt generation
 */
export const IMAGE_STYLE_PROMPTS: Record<PPTImageStyle, string> = {
  photorealistic: 'photorealistic, high detail, professional photography, natural lighting',
  illustration: 'digital illustration, clean lines, vibrant colors, modern style',
  minimalist: 'minimalist design, simple shapes, clean background, elegant',
  corporate: 'professional business style, clean and modern, corporate aesthetic',
  artistic: 'artistic interpretation, creative, expressive, unique visual style',
  infographic: 'infographic style, data visualization, icons, clean layout',
  'icon-based': 'flat icons, simple graphics, vector style, clean design',
  abstract: 'abstract art, geometric shapes, modern art style, conceptual',
  diagram: 'technical diagram, schematic style, clear labels, professional',
  '3d-render': '3D rendered, realistic materials, professional lighting, high quality render',
};
