/**
 * Claude Skills Type Definitions
 *
 * Skills are modular, self-contained packages that extend Claude's capabilities
 * by providing specialized knowledge, workflows, and tools.
 */

/**
 * Skill metadata from YAML frontmatter
 * Required fields in SKILL.md
 */
export interface SkillMetadata {
  /** Human-readable name (64 characters max, hyphen-case: lowercase with hyphens) */
  name: string;
  /** Description of what the skill does and when to use it (1024 characters max) */
  description: string;
}

/**
 * Resource types that can be bundled with a skill
 */
export type SkillResourceType = 'script' | 'reference' | 'asset';

/**
 * A resource file bundled with the skill
 */
export interface SkillResource {
  /** Type of resource */
  type: SkillResourceType;
  /** Relative path within the skill directory */
  path: string;
  /** File name */
  name: string;
  /** File content (loaded on demand) */
  content?: string;
  /** File size in bytes */
  size?: number;
  /** MIME type */
  mimeType?: string;
}

/**
 * Skill source - where the skill came from
 */
export type SkillSource = 'builtin' | 'custom' | 'imported' | 'generated';

/**
 * Skill status
 */
export type SkillStatus = 'enabled' | 'disabled' | 'error' | 'loading';

/**
 * Skill category for organization
 */
export type SkillCategory =
  | 'creative-design'
  | 'development'
  | 'enterprise'
  | 'productivity'
  | 'data-analysis'
  | 'communication'
  | 'meta'
  | 'custom';

/**
 * Validation error for a skill
 */
export interface SkillValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Complete Skill definition
 */
export interface Skill {
  /** Unique identifier */
  id: string;
  /** Metadata from YAML frontmatter */
  metadata: SkillMetadata;
  /** Main instruction content (SKILL.md body after frontmatter) */
  content: string;
  /** Raw SKILL.md content including frontmatter */
  rawContent: string;
  /** Bundled resources */
  resources: SkillResource[];
  /** Current status */
  status: SkillStatus;
  /** Source of the skill */
  source: SkillSource;
  /** Category for organization */
  category: SkillCategory;
  /** Tags for filtering/search */
  tags: string[];
  /** Version string */
  version?: string;
  /** Author information */
  author?: string;
  /** License information */
  license?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Validation errors if any */
  validationErrors?: SkillValidationError[];
  /** Whether this skill is currently active in agent context */
  isActive?: boolean;
  /** Usage count */
  usageCount?: number;
  /** Last used timestamp */
  lastUsedAt?: Date;
  
  // === MCP Tool Association (Claude Best Practice) ===
  // Skills provide workflow knowledge, MCP provides tool connectivity.
  // Associating skills with MCP tools enables automatic skill loading when tools are used.
  
  /** MCP server IDs this skill is designed to work with */
  associatedMcpServers?: string[];
  /** Specific MCP tool names this skill provides guidance for */
  recommendedTools?: string[];
  /** Keywords that trigger this skill when matching MCP tool descriptions */
  toolMatchKeywords?: string[];
}

/**
 * Configuration for skill-MCP tool association
 */
export interface SkillMcpAssociation {
  /** Skill ID */
  skillId: string;
  /** Associated MCP server IDs */
  serverIds: string[];
  /** Specific tool names (format: serverId_toolName) */
  toolNames: string[];
  /** Match priority (higher = more preferred) */
  priority: number;
  /** Whether to auto-load skill when associated tools are used */
  autoLoad: boolean;
}

/**
 * Skill execution context
 */
export interface SkillExecutionContext {
  /** Current session ID */
  sessionId: string;
  /** User's request/prompt */
  userPrompt: string;
  /** Conversation history */
  conversationHistory?: Array<{ role: string; content: string }>;
  /** Additional context data */
  contextData?: Record<string, unknown>;
}

/**
 * Result of skill execution
 */
export interface SkillSandboxExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** Output from the skill */
  output?: string;
  /** Any artifacts produced */
  artifacts?: Array<{
    type: string;
    name: string;
    content: string;
  }>;
  /** Error message if failed */
  error?: string;
  /** Execution duration in ms */
  duration?: number;
  /** Resources that were loaded */
  loadedResources?: string[];
}

/**
 * Input for creating a new skill
 */
export interface CreateSkillInput {
  /** Skill name (will be converted to hyphen-case) */
  name: string;
  /** Description of the skill */
  description: string;
  /** Main instruction content */
  content: string;
  /** Category */
  category?: SkillCategory;
  /** Tags */
  tags?: string[];
  /** Resources to bundle */
  resources?: Omit<SkillResource, 'size' | 'mimeType'>[];
  /** Author */
  author?: string;
  /** Version */
  version?: string;
  /** MCP server IDs this skill works with */
  associatedMcpServers?: string[];
  /** MCP tool names this skill provides guidance for */
  recommendedTools?: string[];
  /** Keywords for matching against MCP tool descriptions */
  toolMatchKeywords?: string[];
}

/**
 * Input for updating a skill
 */
export interface UpdateSkillInput {
  /** Updated metadata */
  metadata?: Partial<SkillMetadata>;
  /** Updated content */
  content?: string;
  /** Updated category */
  category?: SkillCategory;
  /** Updated tags */
  tags?: string[];
  /** Updated resources */
  resources?: SkillResource[];
  /** Updated status */
  status?: SkillStatus;
  /** Updated MCP server associations */
  associatedMcpServers?: string[];
  /** Updated recommended tools */
  recommendedTools?: string[];
  /** Updated tool match keywords */
  toolMatchKeywords?: string[];
}

/**
 * Skill refinement types for AI-assisted improvement
 */
export type SkillRefinementType = 'optimize' | 'simplify' | 'expand' | 'fix-errors';

/**
 * Input for AI-assisted skill generation
 */
export interface GenerateSkillInput {
  /** Description of what the skill should do */
  description: string;
  /** Example use cases */
  examples?: string[];
  /** Desired category */
  category?: SkillCategory;
  /** Reference skills to learn from */
  referenceSkills?: string[];
  /** Whether to include example resources */
  includeResources?: boolean;
}

/**
 * Input for AI-assisted skill refinement
 */
export interface RefineSkillInput {
  /** ID of skill to refine */
  skillId: string;
  /** Type of refinement */
  refinementType: SkillRefinementType;
  /** Custom instructions for refinement */
  customInstructions?: string;
}

/**
 * Skill template definition
 */
export interface SkillTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Category this template belongs to */
  category: SkillCategory;
  /** Default content for SKILL.md */
  defaultContent: string;
  /** Default resources */
  defaultResources?: Omit<SkillResource, 'size' | 'mimeType'>[];
  /** Preview image/icon */
  icon?: string;
  /** Tags */
  tags?: string[];
}

/**
 * Skill package for import/export
 */
export interface SkillPackage {
  /** Package format version */
  formatVersion: string;
  /** Skill data */
  skill: Omit<
    Skill,
    'id' | 'createdAt' | 'updatedAt' | 'status' | 'isActive' | 'usageCount' | 'lastUsedAt'
  >;
  /** Export timestamp */
  exportedAt: string;
  /** Checksum for validation */
  checksum?: string;
}

/**
 * Skill discovery/search result
 */
export interface SkillSearchResult {
  /** Matching skills */
  skills: Skill[];
  /** Total count */
  total: number;
  /** Search query used */
  query: string;
  /** Filters applied */
  filters?: {
    category?: SkillCategory;
    source?: SkillSource;
    status?: SkillStatus;
    tags?: string[];
  };
}

/**
 * Skill usage statistics
 */
export interface SkillUsageStats {
  /** Skill ID */
  skillId: string;
  /** Total executions */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Average execution time in ms */
  averageExecutionTime: number;
  /** Last execution timestamp */
  lastExecutionAt?: Date;
  /** Tokens consumed (approximate) */
  tokensConsumed?: number;
}

/**
 * Validation rules for skill metadata
 */
export const SKILL_VALIDATION_RULES = {
  name: {
    maxLength: 64,
    pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/,
    patternDescription: 'lowercase letters, digits, and hyphens only (hyphen-case)',
  },
  description: {
    maxLength: 1024,
    forbiddenChars: ['<', '>'],
  },
  content: {
    maxRecommendedLines: 500,
    maxRecommendedTokens: 5000,
  },
} as const;

/**
 * Skill refinement prompts
 */
export const SKILL_REFINEMENT_PROMPTS: Record<SkillRefinementType, string> = {
  optimize: `Analyze the skill and optimize it for efficiency. Remove redundant instructions, 
consolidate related steps, and ensure the most efficient execution. Keep token usage minimal 
while maintaining the original functionality.`,

  simplify: `Simplify the skill by breaking down complex instructions into smaller, clearer steps. 
Remove unnecessary complexity while ensuring all original capabilities are preserved. 
Make the skill easier to understand and maintain.`,

  expand: `Expand the skill with more detailed instructions, additional examples, and edge case handling. 
Add intermediate steps, validation checks, and error handling. Make the skill more robust and comprehensive.`,

  'fix-errors': `Review the skill for any issues and fix them. Check for:
- Invalid YAML frontmatter format
- Name not following hyphen-case convention
- Description containing forbidden characters
- Missing required sections
- Inconsistent formatting
Fix all identified issues while preserving the skill's functionality.`,
};
