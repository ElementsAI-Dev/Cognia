/**
 * Custom Mode Store - Manages user-defined agent modes with persistence
 * Supports A2UI template integration, dynamic generation, and full customization
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { AgentModeConfig } from '@/types/agent/agent-mode';
import type { A2UIComponent } from '@/types/artifact/a2ui';

// =============================================================================
// Types
// =============================================================================

/**
 * Extended custom mode configuration with A2UI support
 */
export interface CustomModeConfig extends AgentModeConfig {
  type: 'custom';
  isBuiltIn: false;
  createdAt: Date;
  updatedAt: Date;
  // A2UI Integration
  a2uiEnabled?: boolean;
  a2uiTemplate?: CustomModeA2UITemplate;
  // Advanced options
  modelOverride?: string;
  temperatureOverride?: number;
  maxTokensOverride?: number;
  // MCP Tools integration
  mcpTools?: McpToolReference[];
  // Categorization
  category?: CustomModeCategory;
  tags?: string[];
  // Usage tracking
  usageCount?: number;
  lastUsedAt?: Date;
  // Sharing
  isShared?: boolean;
  sharedBy?: string;
}

/**
 * Reference to an MCP tool for custom modes
 */
export interface McpToolReference {
  serverId: string;
  toolName: string;
  displayName?: string;
}

/**
 * A2UI template for custom modes
 */
export interface CustomModeA2UITemplate {
  id: string;
  name: string;
  description?: string;
  components: A2UIComponent[];
  dataModel: Record<string, unknown>;
  actions?: CustomModeA2UIAction[];
}

/**
 * A2UI action handler for custom modes
 */
export interface CustomModeA2UIAction {
  id: string;
  name: string;
  description?: string;
  handler: 'ai_process' | 'data_update' | 'custom';
  prompt?: string; // For ai_process handler
  dataPath?: string; // For data_update handler
}

/**
 * Custom mode categories
 */
export type CustomModeCategory = 
  | 'productivity'
  | 'creative'
  | 'technical'
  | 'research'
  | 'education'
  | 'business'
  | 'personal'
  | 'other';

/**
 * Mode generation request from natural language
 */
export interface ModeGenerationRequest {
  description: string;
  language?: 'en' | 'zh';
  includeA2UI?: boolean;
  suggestedTools?: string[];
}

/**
 * Generated mode result
 */
export interface GeneratedModeResult {
  mode: Partial<CustomModeConfig>;
  suggestedTools: string[];
  suggestedA2UITemplate?: CustomModeA2UITemplate;
  confidence: number;
}

// =============================================================================
// Available Tools Definition
// =============================================================================

/**
 * Tool categories for selection
 */
export const TOOL_CATEGORIES = {
  search: {
    name: 'Search & Web',
    icon: 'Search',
    tools: ['web_search', 'rag_search', 'web_scraper', 'bulk_web_scraper', 'search_and_scrape'],
  },
  file: {
    name: 'File Operations',
    icon: 'FileText',
    tools: ['file_read', 'file_write', 'file_list', 'file_exists', 'file_delete', 'file_copy', 'file_rename', 'file_info', 'file_search', 'file_append', 'directory_create'],
  },
  document: {
    name: 'Document Processing',
    icon: 'FileSearch',
    tools: ['document_summarize', 'document_chunk', 'document_analyze'],
  },
  academic: {
    name: 'Academic Research',
    icon: 'GraduationCap',
    tools: ['academic_search', 'academic_analysis', 'paper_comparison'],
  },
  media: {
    name: 'Media Generation',
    icon: 'Image',
    tools: ['image_generate', 'image_edit', 'image_variation', 'video_generate', 'video_status', 'video_subtitles', 'video_analyze'],
  },
  ppt: {
    name: 'Presentations',
    icon: 'Presentation',
    tools: ['ppt_outline', 'ppt_slide_content', 'ppt_finalize', 'ppt_export'],
  },
  learning: {
    name: 'Learning Tools',
    icon: 'BookOpen',
    tools: ['display_flashcard', 'display_flashcard_deck', 'display_quiz', 'display_quiz_question', 'display_review_session', 'display_progress_summary', 'display_concept_explanation'],
  },
  system: {
    name: 'System',
    icon: 'Calculator',
    tools: ['calculator'],
  },
} as const;

/**
 * All available tools flattened
 */
export const ALL_AVAILABLE_TOOLS = Object.values(TOOL_CATEGORIES).flatMap(cat => cat.tools);

/**
 * Tool requirements - which tools need specific API keys or configurations
 */
export const TOOL_REQUIREMENTS: Record<string, { requiresApiKey?: string; description: string }> = {
  web_search: { requiresApiKey: 'tavily', description: 'Requires Tavily API key for web search' },
  search_and_scrape: { requiresApiKey: 'tavily', description: 'Requires Tavily API key' },
  image_generate: { requiresApiKey: 'openai', description: 'Requires OpenAI API key for DALL-E' },
  image_edit: { requiresApiKey: 'openai', description: 'Requires OpenAI API key for DALL-E' },
  image_variation: { requiresApiKey: 'openai', description: 'Requires OpenAI API key for DALL-E' },
  video_generate: { requiresApiKey: 'openai', description: 'Requires OpenAI API key for Sora' },
  video_status: { requiresApiKey: 'openai', description: 'Requires OpenAI API key' },
  video_subtitles: { requiresApiKey: 'openai', description: 'Requires OpenAI API key for Whisper' },
  video_analyze: { requiresApiKey: 'openai', description: 'Requires OpenAI API key' },
};

/**
 * Check tool availability based on provided API keys
 */
export function checkToolAvailability(
  tools: string[],
  availableApiKeys: { tavily?: boolean; openai?: boolean; [key: string]: boolean | undefined }
): { available: string[]; unavailable: Array<{ tool: string; reason: string }> } {
  const available: string[] = [];
  const unavailable: Array<{ tool: string; reason: string }> = [];

  for (const tool of tools) {
    const requirement = TOOL_REQUIREMENTS[tool];
    if (requirement?.requiresApiKey) {
      if (availableApiKeys[requirement.requiresApiKey]) {
        available.push(tool);
      } else {
        unavailable.push({ tool, reason: requirement.description });
      }
    } else {
      available.push(tool);
    }
  }

  return { available, unavailable };
}

/**
 * Predefined mode templates for quick creation
 */
export interface ModeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: CustomModeCategory;
  tools: string[];
  systemPrompt: string;
  outputFormat: 'text' | 'code' | 'html' | 'react' | 'markdown';
  previewEnabled?: boolean;
  tags: string[];
}

export const MODE_TEMPLATES: ModeTemplate[] = [
  {
    id: 'coding-assistant',
    name: 'Coding Assistant',
    description: 'Expert programmer for code generation, debugging, and reviews',
    icon: 'Code2',
    category: 'technical',
    tools: ['calculator', 'file_read', 'file_write', 'file_list', 'web_search'],
    systemPrompt: `You are an expert software developer. Help users with:
- Writing clean, efficient, and well-documented code
- Debugging and fixing issues
- Code reviews and best practices
- Explaining complex programming concepts
- Suggesting optimal solutions and design patterns

Always explain your reasoning and provide working code examples.`,
    outputFormat: 'code',
    tags: ['coding', 'programming', 'development'],
  },
  {
    id: 'research-analyst',
    name: 'Research Analyst',
    description: 'Academic and web research with citation support',
    icon: 'GraduationCap',
    category: 'research',
    tools: ['web_search', 'rag_search', 'academic_search', 'academic_analysis', 'paper_comparison', 'web_scraper'],
    systemPrompt: `You are a thorough research analyst. Help users with:
- Finding and synthesizing information from multiple sources
- Academic paper analysis and comparison
- Fact-checking and source verification
- Creating well-cited summaries and reports
- Identifying key insights and trends

Always cite your sources and indicate confidence levels in your findings.`,
    outputFormat: 'markdown',
    tags: ['research', 'academic', 'analysis'],
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    description: 'Professional writing for blogs, articles, and marketing',
    icon: 'PenTool',
    category: 'creative',
    tools: ['web_search', 'rag_search'],
    systemPrompt: `You are a professional content writer. Help users with:
- Blog posts and articles with engaging hooks and clear structure
- Marketing copy and persuasive content
- Technical documentation and guides
- SEO-optimized content with relevant keywords
- Editing and improving existing content

Focus on clarity, engagement, and the target audience's needs.`,
    outputFormat: 'markdown',
    tags: ['writing', 'content', 'marketing'],
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Data analysis, visualization, and insights generation',
    icon: 'BarChart3',
    category: 'technical',
    tools: ['calculator', 'rag_search', 'file_read'],
    systemPrompt: `You are a data analyst expert. Help users with:
- Analyzing datasets and finding patterns
- Creating clear data visualizations
- Statistical analysis and interpretation
- Building dashboards and reports
- Data-driven decision making recommendations

Present findings clearly with supporting evidence and visualizations.`,
    outputFormat: 'markdown',
    tags: ['data', 'analytics', 'visualization'],
  },
  {
    id: 'ui-designer',
    name: 'UI Designer',
    description: 'Web and app UI design with live preview',
    icon: 'Layout',
    category: 'creative',
    tools: ['image_generate', 'web_search'],
    systemPrompt: `You are a UI/UX designer and React developer. Help users with:
- Creating modern, responsive web interfaces
- Implementing best UX practices and accessibility
- Building reusable React components with Tailwind CSS
- Following design systems and consistency
- Creating interactive prototypes

Generate clean React code that can be previewed immediately.`,
    outputFormat: 'react',
    previewEnabled: true,
    tags: ['design', 'ui', 'web'],
  },
  {
    id: 'presentation-creator',
    name: 'Presentation Creator',
    description: 'PPT slides and presentation content generation',
    icon: 'Presentation',
    category: 'productivity',
    tools: ['ppt_outline', 'ppt_slide_content', 'ppt_finalize', 'ppt_export', 'web_search', 'image_generate'],
    systemPrompt: `You are a presentation expert. Help users with:
- Creating compelling presentation outlines
- Writing concise, impactful slide content
- Structuring presentations for maximum engagement
- Visual storytelling and data presentation
- Speaker notes and delivery tips

Focus on clear messaging and visual appeal.`,
    outputFormat: 'markdown',
    tags: ['presentation', 'slides', 'ppt'],
  },
  {
    id: 'learning-tutor',
    name: 'Learning Tutor',
    description: 'Educational assistant with flashcards and quizzes',
    icon: 'BookOpen',
    category: 'education',
    tools: ['display_flashcard', 'display_flashcard_deck', 'display_quiz', 'display_quiz_question', 'display_review_session', 'display_progress_summary', 'display_concept_explanation', 'web_search', 'rag_search'],
    systemPrompt: `You are an expert tutor using proven learning techniques. Help users with:
- Explaining concepts clearly with examples
- Creating interactive flashcards for memorization
- Designing quizzes to test understanding
- Using spaced repetition for retention
- Adapting to the learner's pace and style

Make learning engaging and effective through active recall and practice.`,
    outputFormat: 'markdown',
    tags: ['learning', 'education', 'tutor'],
  },
  {
    id: 'translation-assistant',
    name: 'Translation Assistant',
    description: 'Multi-language translation and localization',
    icon: 'Globe',
    category: 'productivity',
    tools: ['web_search'],
    systemPrompt: `You are a professional translator. Help users with:
- Accurate translation between languages
- Cultural adaptation and localization
- Technical and specialized terminology
- Maintaining tone and style across languages
- Explaining nuances and idioms

Preserve meaning while ensuring natural expression in the target language.`,
    outputFormat: 'text',
    tags: ['translation', 'language', 'localization'],
  },
];

/**
 * Get a mode template by ID
 */
export function getModeTemplate(templateId: string): ModeTemplate | undefined {
  return MODE_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Available icons for custom modes
 */
export const AVAILABLE_MODE_ICONS = [
  'Bot', 'Brain', 'Lightbulb', 'Rocket', 'Star', 'Heart', 'Zap',
  'Layout', 'Code2', 'BarChart3', 'PenTool', 'Search', 'Settings',
  'FileText', 'Image', 'Video', 'Music', 'Globe', 'Database',
  'Shield', 'Lock', 'Key', 'Briefcase', 'GraduationCap', 'BookOpen',
  'Palette', 'Wand2', 'Sparkles', 'Target', 'Flag', 'Award',
  'MessageSquare', 'Mail', 'Phone', 'Calendar', 'Clock', 'Timer',
  'Calculator', 'Clipboard', 'List', 'CheckSquare', 'Grid',
  'Layers', 'Box', 'Package', 'Truck', 'Home', 'Building',
  'Users', 'User', 'UserPlus', 'UserCheck', 'Smile', 'Frown',
  'Sun', 'Moon', 'Cloud', 'Umbrella', 'Thermometer',
  'Cpu', 'HardDrive', 'Monitor', 'Smartphone', 'Tablet',
  'Camera', 'Mic', 'Speaker', 'Headphones', 'Radio',
  'Coffee', 'Pizza', 'Apple', 'Leaf', 'Flower2', 'Tree',
  'Car', 'Plane', 'Ship', 'Train', 'Bike',
  'Gamepad2', 'Dice5', 'Puzzle', 'Trophy', 'Medal',
] as const;

// =============================================================================
// Store State
// =============================================================================

interface CustomModeState {
  // Custom modes
  customModes: Record<string, CustomModeConfig>;
  
  // Active/selected mode
  activeModeId: string | null;
  
  // Loading states
  isGenerating: boolean;
  generationError: string | null;
  
  // Actions - CRUD
  createMode: (mode: Partial<CustomModeConfig>) => CustomModeConfig;
  updateMode: (id: string, updates: Partial<CustomModeConfig>) => void;
  deleteMode: (id: string) => void;
  duplicateMode: (id: string) => CustomModeConfig | null;
  
  // Actions - Selection
  setActiveMode: (id: string | null) => void;
  
  // Actions - Queries
  getMode: (id: string) => CustomModeConfig | undefined;
  getModesByCategory: (category: CustomModeCategory) => CustomModeConfig[];
  getModesByTags: (tags: string[]) => CustomModeConfig[];
  searchModes: (query: string) => CustomModeConfig[];
  getRecentModes: (limit?: number) => CustomModeConfig[];
  getMostUsedModes: (limit?: number) => CustomModeConfig[];
  
  // Actions - Usage tracking
  recordModeUsage: (id: string) => void;
  
  // Actions - A2UI Templates
  setModeA2UITemplate: (id: string, template: CustomModeA2UITemplate | undefined) => void;
  
  // Actions - Import/Export
  exportMode: (id: string) => string | null;
  importMode: (json: string) => CustomModeConfig | null;
  exportAllModes: () => string;
  importModes: (json: string) => number;
  
  // Actions - Generation
  generateModeFromDescription: (request: ModeGenerationRequest) => Promise<GeneratedModeResult>;
  setGenerationError: (error: string | null) => void;
  
  // Reset
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  customModes: {} as Record<string, CustomModeConfig>,
  activeModeId: null as string | null,
  isGenerating: false,
  generationError: null as string | null,
};

// =============================================================================
// Store Implementation
// =============================================================================

export const useCustomModeStore = create<CustomModeState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // =====================================================================
      // CRUD Actions
      // =====================================================================

      createMode: (mode) => {
        const id = mode.id || `custom-${nanoid()}`;
        const now = new Date();
        
        const newMode: CustomModeConfig = {
          id,
          type: 'custom',
          isBuiltIn: false,
          name: mode.name || 'New Custom Mode',
          description: mode.description || '',
          icon: mode.icon || 'Bot',
          systemPrompt: mode.systemPrompt || '',
          tools: mode.tools || [],
          outputFormat: mode.outputFormat || 'text',
          previewEnabled: mode.previewEnabled ?? false,
          customConfig: mode.customConfig || {},
          a2uiEnabled: mode.a2uiEnabled ?? false,
          a2uiTemplate: mode.a2uiTemplate,
          modelOverride: mode.modelOverride,
          temperatureOverride: mode.temperatureOverride,
          maxTokensOverride: mode.maxTokensOverride,
          mcpTools: mode.mcpTools || [],
          category: mode.category || 'other',
          tags: mode.tags || [],
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          customModes: { ...state.customModes, [id]: newMode },
        }));

        return newMode;
      },

      updateMode: (id, updates) => {
        set((state) => {
          const mode = state.customModes[id];
          if (!mode) return state;

          return {
            customModes: {
              ...state.customModes,
              [id]: {
                ...mode,
                ...updates,
                updatedAt: new Date(),
              },
            },
          };
        });
      },

      deleteMode: (id) => {
        set((state) => {
          const { [id]: _removed, ...rest } = state.customModes;
          return {
            customModes: rest,
            activeModeId: state.activeModeId === id ? null : state.activeModeId,
          };
        });
      },

      duplicateMode: (id) => {
        const mode = get().customModes[id];
        if (!mode) return null;

        const duplicated = get().createMode({
          ...mode,
          id: undefined, // Generate new ID
          name: `${mode.name} (Copy)`,
          usageCount: 0,
          lastUsedAt: undefined,
        });

        return duplicated;
      },

      // =====================================================================
      // Selection Actions
      // =====================================================================

      setActiveMode: (id) => {
        set({ activeModeId: id });
      },

      // =====================================================================
      // Query Actions
      // =====================================================================

      getMode: (id) => {
        return get().customModes[id];
      },

      getModesByCategory: (category) => {
        return Object.values(get().customModes).filter(
          (mode) => mode.category === category
        );
      },

      getModesByTags: (tags) => {
        return Object.values(get().customModes).filter((mode) =>
          tags.some((tag) => mode.tags?.includes(tag))
        );
      },

      searchModes: (query) => {
        const lowerQuery = query.toLowerCase();
        return Object.values(get().customModes).filter(
          (mode) =>
            mode.name.toLowerCase().includes(lowerQuery) ||
            mode.description.toLowerCase().includes(lowerQuery) ||
            mode.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
        );
      },

      getRecentModes: (limit = 5) => {
        return Object.values(get().customModes)
          .filter((mode) => mode.lastUsedAt)
          .sort((a, b) => {
            const aTime = a.lastUsedAt?.getTime() || 0;
            const bTime = b.lastUsedAt?.getTime() || 0;
            return bTime - aTime;
          })
          .slice(0, limit);
      },

      getMostUsedModes: (limit = 5) => {
        return Object.values(get().customModes)
          .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
          .slice(0, limit);
      },

      // =====================================================================
      // Usage Tracking
      // =====================================================================

      recordModeUsage: (id) => {
        set((state) => {
          const mode = state.customModes[id];
          if (!mode) return state;

          return {
            customModes: {
              ...state.customModes,
              [id]: {
                ...mode,
                usageCount: (mode.usageCount || 0) + 1,
                lastUsedAt: new Date(),
              },
            },
          };
        });
      },

      // =====================================================================
      // A2UI Templates
      // =====================================================================

      setModeA2UITemplate: (id, template) => {
        set((state) => {
          const mode = state.customModes[id];
          if (!mode) return state;

          return {
            customModes: {
              ...state.customModes,
              [id]: {
                ...mode,
                a2uiTemplate: template,
                a2uiEnabled: !!template,
                updatedAt: new Date(),
              },
            },
          };
        });
      },

      // =====================================================================
      // Import/Export
      // =====================================================================

      exportMode: (id) => {
        const mode = get().customModes[id];
        if (!mode) return null;

        const exportData = {
          version: '1.0',
          type: 'custom-mode',
          mode: {
            ...mode,
            // Reset usage stats for export
            usageCount: 0,
            lastUsedAt: undefined,
          },
        };

        return JSON.stringify(exportData, null, 2);
      },

      importMode: (json) => {
        try {
          const data = JSON.parse(json);
          if (data.type !== 'custom-mode' || !data.mode) {
            throw new Error('Invalid mode export format');
          }

          const imported = get().createMode({
            ...data.mode,
            id: undefined, // Generate new ID
            isShared: true,
            sharedBy: data.mode.name,
          });

          return imported;
        } catch {
          return null;
        }
      },

      exportAllModes: () => {
        const modes = Object.values(get().customModes).map((mode) => ({
          ...mode,
          usageCount: 0,
          lastUsedAt: undefined,
        }));

        const exportData = {
          version: '1.0',
          type: 'custom-modes-collection',
          modes,
          exportedAt: new Date().toISOString(),
        };

        return JSON.stringify(exportData, null, 2);
      },

      importModes: (json) => {
        try {
          const data = JSON.parse(json);
          if (data.type !== 'custom-modes-collection' || !Array.isArray(data.modes)) {
            throw new Error('Invalid modes collection format');
          }

          let imported = 0;
          for (const mode of data.modes) {
            get().createMode({
              ...mode,
              id: undefined,
              isShared: true,
            });
            imported++;
          }

          return imported;
        } catch {
          return 0;
        }
      },

      // =====================================================================
      // Mode Generation from Natural Language
      // =====================================================================

      generateModeFromDescription: async (request) => {
        set({ isGenerating: true, generationError: null });

        try {
          // Analyze description for patterns
          const result = analyzeModeDescription(request);
          
          set({ isGenerating: false });
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Generation failed';
          set({ isGenerating: false, generationError: errorMessage });
          throw error;
        }
      },

      setGenerationError: (error) => {
        set({ generationError: error });
      },

      // =====================================================================
      // Reset
      // =====================================================================

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'cognia-custom-modes',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        customModes: Object.fromEntries(
          Object.entries(state.customModes).map(([id, mode]) => [
            id,
            {
              ...mode,
              // Convert dates to strings for storage
              createdAt: mode.createdAt instanceof Date 
                ? mode.createdAt.toISOString() 
                : mode.createdAt,
              updatedAt: mode.updatedAt instanceof Date 
                ? mode.updatedAt.toISOString() 
                : mode.updatedAt,
              lastUsedAt: mode.lastUsedAt instanceof Date 
                ? mode.lastUsedAt.toISOString() 
                : mode.lastUsedAt,
            },
          ])
        ),
      }),
      onRehydrateStorage: () => (state) => {
        // Convert date strings back to Date objects
        if (state?.customModes) {
          for (const mode of Object.values(state.customModes)) {
            if (typeof mode.createdAt === 'string') {
              mode.createdAt = new Date(mode.createdAt);
            }
            if (typeof mode.updatedAt === 'string') {
              mode.updatedAt = new Date(mode.updatedAt);
            }
            if (typeof mode.lastUsedAt === 'string') {
              mode.lastUsedAt = new Date(mode.lastUsedAt);
            }
          }
        }
      },
    }
  )
);

// =============================================================================
// Mode Generation Helper
// =============================================================================

/**
 * Analyze description and generate mode configuration
 */
function analyzeModeDescription(request: ModeGenerationRequest): GeneratedModeResult {
  const { description, includeA2UI } = request;
  const lowerDesc = description.toLowerCase();
  
  // Pattern matching for common use cases
  const patterns = {
    coding: {
      keywords: ['code', 'programming', 'developer', 'coding', '代码', '编程', '开发'],
      tools: ['calculator', 'file_read', 'file_write'],
      icon: 'Code2',
      category: 'technical' as CustomModeCategory,
      outputFormat: 'code' as const,
    },
    research: {
      keywords: ['research', 'academic', 'paper', 'study', '研究', '学术', '论文'],
      tools: ['academic_search', 'academic_analysis', 'web_search', 'rag_search'],
      icon: 'GraduationCap',
      category: 'research' as CustomModeCategory,
      outputFormat: 'markdown' as const,
    },
    writing: {
      keywords: ['write', 'writing', 'content', 'article', 'blog', '写作', '文章', '博客'],
      tools: ['web_search', 'rag_search'],
      icon: 'PenTool',
      category: 'creative' as CustomModeCategory,
      outputFormat: 'markdown' as const,
    },
    data: {
      keywords: ['data', 'analysis', 'analytics', 'chart', 'report', '数据', '分析', '报表'],
      tools: ['calculator', 'rag_search'],
      icon: 'BarChart3',
      category: 'technical' as CustomModeCategory,
      outputFormat: 'markdown' as const,
    },
    design: {
      keywords: ['design', 'ui', 'web', 'interface', 'layout', '设计', '界面', '网页'],
      tools: ['image_generate'],
      icon: 'Layout',
      category: 'creative' as CustomModeCategory,
      outputFormat: 'react' as const,
      previewEnabled: true,
    },
    presentation: {
      keywords: ['ppt', 'presentation', 'slide', '演示', 'PPT', '幻灯片'],
      tools: ['ppt_outline', 'ppt_slide_content', 'ppt_finalize', 'ppt_export'],
      icon: 'Presentation',
      category: 'productivity' as CustomModeCategory,
      outputFormat: 'markdown' as const,
    },
    learning: {
      keywords: ['learn', 'study', 'education', 'teach', 'tutor', '学习', '教育', '辅导'],
      tools: ['display_flashcard', 'display_quiz', 'rag_search', 'web_search'],
      icon: 'BookOpen',
      category: 'education' as CustomModeCategory,
      outputFormat: 'markdown' as const,
    },
  };

  // Find matching pattern
  let matchedPattern = null;
  let maxMatches = 0;
  
  for (const [_key, pattern] of Object.entries(patterns)) {
    const matches = pattern.keywords.filter(kw => lowerDesc.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      matchedPattern = pattern;
    }
  }

  // Default if no pattern matched
  if (!matchedPattern) {
    matchedPattern = {
      tools: ['web_search', 'rag_search', 'calculator'],
      icon: 'Bot',
      category: 'other' as CustomModeCategory,
      outputFormat: 'text' as const,
    };
  }

  // Extract name from description
  const name = extractModeName(description);
  
  // Build the mode configuration
  const mode: Partial<CustomModeConfig> = {
    name,
    description: description.slice(0, 200),
    icon: matchedPattern.icon,
    tools: matchedPattern.tools,
    outputFormat: matchedPattern.outputFormat,
    category: matchedPattern.category,
    previewEnabled: 'previewEnabled' in matchedPattern ? matchedPattern.previewEnabled : false,
    systemPrompt: generateSystemPrompt(description, matchedPattern),
  };

  // Generate A2UI template if requested
  let suggestedA2UITemplate: CustomModeA2UITemplate | undefined;
  if (includeA2UI) {
    suggestedA2UITemplate = generateA2UITemplate(description, matchedPattern.category);
  }

  return {
    mode,
    suggestedTools: matchedPattern.tools,
    suggestedA2UITemplate,
    confidence: maxMatches > 0 ? Math.min(0.9, 0.5 + maxMatches * 0.1) : 0.3,
  };
}

/**
 * Extract a name from the description
 */
function extractModeName(description: string): string {
  // Try to extract name patterns
  const patterns = [
    /(?:create|make|build|生成|创建)\s*(?:a|an|一个)?\s*[「"']?([^「」"'\s,，。.]+)[」"']?/i,
    /([^,，。.\s]+?)(?:助手|模式|agent|assistant|mode|helper)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Generate from first few words
  const words = description.split(/\s+/).slice(0, 3);
  return words.join(' ').slice(0, 30) || 'Custom Mode';
}

/**
 * Generate system prompt based on description and pattern
 */
function generateSystemPrompt(description: string, pattern: { category?: CustomModeCategory; [key: string]: unknown }): string {
  const categoryPrompts: Record<string, string> = {
    technical: `You are a technical expert assistant. Help users with coding, development, and technical problems.`,
    research: `You are a research assistant. Help users find, analyze, and synthesize information from academic sources.`,
    creative: `You are a creative assistant. Help users with writing, design, and creative projects.`,
    productivity: `You are a productivity assistant. Help users accomplish tasks efficiently and effectively.`,
    education: `You are an educational assistant. Help users learn new concepts and skills through explanation and practice.`,
    business: `You are a business assistant. Help users with business planning, analysis, and communication.`,
    personal: `You are a personal assistant. Help users with everyday tasks and personal organization.`,
    other: `You are a helpful assistant.`,
  };

  const basePrompt = categoryPrompts[pattern.category || 'other'];
  return `${basePrompt}\n\nUser's requirements: ${description}`;
}

/**
 * Generate basic A2UI template based on category
 */
function generateA2UITemplate(description: string, category: CustomModeCategory): CustomModeA2UITemplate {
  const id = `template-${nanoid(8)}`;
  
  // Basic template structure
  const components: A2UIComponent[] = [
    {
      id: 'root',
      component: 'Column',
      children: ['header', 'content', 'actions'],
      className: 'gap-4 p-4',
    },
    {
      id: 'header',
      component: 'Text',
      text: extractModeName(description),
      variant: 'heading2',
    },
    {
      id: 'content',
      component: 'Card',
      children: ['main-input'],
      className: 'p-4',
    },
    {
      id: 'main-input',
      component: 'TextArea',
      value: { path: '/input' },
      placeholder: 'Enter your request...',
      rows: 4,
    },
    {
      id: 'actions',
      component: 'Row',
      children: ['submit-btn', 'clear-btn'],
      className: 'gap-2',
    },
    {
      id: 'submit-btn',
      component: 'Button',
      text: 'Submit',
      action: 'submit',
      variant: 'primary',
    },
    {
      id: 'clear-btn',
      component: 'Button',
      text: 'Clear',
      action: 'clear',
      variant: 'outline',
    },
  ] as A2UIComponent[];

  return {
    id,
    name: `${extractModeName(description)} Template`,
    description: `Auto-generated template for ${category} mode`,
    components,
    dataModel: {
      input: '',
      output: '',
    },
    actions: [
      {
        id: 'submit',
        name: 'Submit',
        handler: 'ai_process',
        prompt: 'Process the user input according to the mode configuration',
      },
      {
        id: 'clear',
        name: 'Clear',
        handler: 'data_update',
        dataPath: '/input',
      },
    ],
  };
}

// =============================================================================
// System Prompt Template Variables
// =============================================================================

/**
 * Available template variables for system prompts
 */
export const PROMPT_TEMPLATE_VARIABLES = {
  '{{date}}': 'Current date (YYYY-MM-DD)',
  '{{time}}': 'Current time (HH:MM)',
  '{{datetime}}': 'Current date and time',
  '{{weekday}}': 'Current day of the week',
  '{{timezone}}': 'User timezone',
  '{{language}}': 'User preferred language',
  '{{tools_list}}': 'List of available tools for this mode',
  '{{mode_name}}': 'Name of the current mode',
  '{{mode_description}}': 'Description of the current mode',
} as const;

export type PromptTemplateVariable = keyof typeof PROMPT_TEMPLATE_VARIABLES;

/**
 * Context for template variable replacement
 */
export interface PromptTemplateContext {
  modeName?: string;
  modeDescription?: string;
  tools?: string[];
  language?: string;
  timezone?: string;
}

/**
 * Process template variables in a system prompt
 * Replaces {{variable}} placeholders with actual values
 */
export function processPromptTemplateVariables(
  prompt: string,
  context: PromptTemplateContext = {}
): string {
  if (!prompt) return prompt;

  const now = new Date();
  
  const replacements: Record<string, string> = {
    '{{date}}': now.toISOString().split('T')[0],
    '{{time}}': now.toTimeString().slice(0, 5),
    '{{datetime}}': now.toLocaleString(),
    '{{weekday}}': now.toLocaleDateString('en-US', { weekday: 'long' }),
    '{{timezone}}': context.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    '{{language}}': context.language || navigator?.language || 'en',
    '{{tools_list}}': context.tools?.length 
      ? context.tools.join(', ') 
      : 'No specific tools configured',
    '{{mode_name}}': context.modeName || 'Custom Mode',
    '{{mode_description}}': context.modeDescription || '',
  };

  let processedPrompt = prompt;
  for (const [variable, value] of Object.entries(replacements)) {
    processedPrompt = processedPrompt.replaceAll(variable, value);
  }

  return processedPrompt;
}

/**
 * Get a preview of template variable replacements
 */
export function getTemplateVariablePreview(context: PromptTemplateContext = {}): Record<string, string> {
  const now = new Date();
  
  return {
    '{{date}}': now.toISOString().split('T')[0],
    '{{time}}': now.toTimeString().slice(0, 5),
    '{{datetime}}': now.toLocaleString(),
    '{{weekday}}': now.toLocaleDateString('en-US', { weekday: 'long' }),
    '{{timezone}}': context.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    '{{language}}': context.language || 'en',
    '{{tools_list}}': context.tools?.length 
      ? context.tools.join(', ') 
      : 'No specific tools configured',
    '{{mode_name}}': context.modeName || 'Custom Mode',
    '{{mode_description}}': context.modeDescription || '',
  };
}

// =============================================================================
// Selectors
// =============================================================================

export const selectCustomModes = (state: CustomModeState) => 
  Object.values(state.customModes);

export const selectCustomModeById = (id: string) => (state: CustomModeState) => 
  state.customModes[id];

export const selectActiveCustomMode = (state: CustomModeState) => 
  state.activeModeId ? state.customModes[state.activeModeId] : undefined;

export const selectIsGenerating = (state: CustomModeState) => 
  state.isGenerating;

export const selectGenerationError = (state: CustomModeState) => 
  state.generationError;

export const selectCustomModeCount = (state: CustomModeState) => 
  Object.keys(state.customModes).length;
