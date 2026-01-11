/**
 * Skill Parser - Parse and validate SKILL.md files
 * 
 * Handles parsing of YAML frontmatter and Markdown content
 * following the Claude Skills specification.
 */

import type {
  Skill,
  SkillMetadata,
  SkillResource,
  SkillResourceType,
  SkillValidationError,
  SkillCategory,
} from '@/types/system/skill';

/**
 * Result of parsing a SKILL.md file
 */
export interface SkillParseResult {
  success: boolean;
  metadata?: SkillMetadata;
  content?: string;
  rawContent: string;
  errors: SkillValidationError[];
  warnings: SkillValidationError[];
}

/**
 * Result of parsing a complete skill directory
 */
export interface SkillDirectoryParseResult extends SkillParseResult {
  resources: SkillResource[];
  category?: SkillCategory;
  tags: string[];
}

/**
 * YAML frontmatter regex pattern
 * Matches content between --- delimiters at the start of the file
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Validation rules for skill metadata
 */
const VALIDATION_RULES = {
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
};

/**
 * Parse YAML-like frontmatter (simple key: value format)
 * This is a simple parser that doesn't require external dependencies
 */
function parseYamlFrontmatter(yamlContent: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = yamlContent.split('\n');
  
  let currentKey = '';
  let currentValue = '';
  let isMultiline = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      if (isMultiline) {
        currentValue += '\n';
      }
      continue;
    }
    
    // Check for key: value pattern
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0 && !isMultiline) {
      // Save previous key-value if exists
      if (currentKey) {
        result[currentKey] = currentValue.trim();
      }
      
      currentKey = line.substring(0, colonIndex).trim();
      const afterColon = line.substring(colonIndex + 1).trim();
      
      // Check for multiline indicator (|) or (>)
      if (afterColon === '|' || afterColon === '>') {
        isMultiline = true;
        currentValue = '';
      } else {
        // Remove quotes if present
        currentValue = afterColon.replace(/^["']|["']$/g, '');
        isMultiline = false;
      }
    } else if (isMultiline) {
      // Continue multiline value
      currentValue += (currentValue ? '\n' : '') + line;
    }
  }
  
  // Save last key-value
  if (currentKey) {
    result[currentKey] = currentValue.trim();
  }
  
  return result;
}

/**
 * Validate skill name according to specification
 */
export function validateSkillName(name: string): SkillValidationError[] {
  const errors: SkillValidationError[] = [];
  const rules = VALIDATION_RULES.name;
  
  if (!name || name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Skill name is required',
      severity: 'error',
    });
    return errors;
  }
  
  if (name.length > rules.maxLength) {
    errors.push({
      field: 'name',
      message: `Name must be ${rules.maxLength} characters or less (currently ${name.length})`,
      severity: 'error',
    });
  }
  
  if (!rules.pattern.test(name)) {
    errors.push({
      field: 'name',
      message: `Name must be ${rules.patternDescription}`,
      severity: 'error',
    });
  }
  
  if (name.startsWith('-') || name.endsWith('-')) {
    errors.push({
      field: 'name',
      message: 'Name cannot start or end with a hyphen',
      severity: 'error',
    });
  }
  
  if (name.includes('--')) {
    errors.push({
      field: 'name',
      message: 'Name cannot contain consecutive hyphens',
      severity: 'error',
    });
  }
  
  return errors;
}

/**
 * Validate skill description according to specification
 */
export function validateSkillDescription(description: string): SkillValidationError[] {
  const errors: SkillValidationError[] = [];
  const rules = VALIDATION_RULES.description;
  
  if (!description || description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: 'Skill description is required',
      severity: 'error',
    });
    return errors;
  }
  
  if (description.length > rules.maxLength) {
    errors.push({
      field: 'description',
      message: `Description must be ${rules.maxLength} characters or less (currently ${description.length})`,
      severity: 'error',
    });
  }
  
  for (const char of rules.forbiddenChars) {
    if (description.includes(char)) {
      errors.push({
        field: 'description',
        message: `Description cannot contain "${char}" character`,
        severity: 'error',
      });
    }
  }
  
  return errors;
}

/**
 * Validate skill content with recommendations
 */
export function validateSkillContent(content: string): SkillValidationError[] {
  const errors: SkillValidationError[] = [];
  const rules = VALIDATION_RULES.content;
  
  if (!content || content.trim().length === 0) {
    errors.push({
      field: 'content',
      message: 'Skill content is required',
      severity: 'error',
    });
    return errors;
  }
  
  const lineCount = content.split('\n').length;
  if (lineCount > rules.maxRecommendedLines) {
    errors.push({
      field: 'content',
      message: `Content has ${lineCount} lines, recommended maximum is ${rules.maxRecommendedLines}. Consider using reference files.`,
      severity: 'warning',
    });
  }
  
  // Rough token estimate (words * 1.3)
  const wordCount = content.split(/\s+/).length;
  const estimatedTokens = Math.ceil(wordCount * 1.3);
  if (estimatedTokens > rules.maxRecommendedTokens) {
    errors.push({
      field: 'content',
      message: `Content has approximately ${estimatedTokens} tokens, recommended maximum is ${rules.maxRecommendedTokens}. Consider using progressive disclosure.`,
      severity: 'warning',
    });
  }
  
  return errors;
}

/**
 * Parse a SKILL.md file content
 */
export function parseSkillMd(rawContent: string): SkillParseResult {
  const result: SkillParseResult = {
    success: false,
    rawContent,
    errors: [],
    warnings: [],
  };
  
  // Check for empty content
  if (!rawContent || rawContent.trim().length === 0) {
    result.errors.push({
      field: 'rawContent',
      message: 'SKILL.md content is empty',
      severity: 'error',
    });
    return result;
  }
  
  // Check for frontmatter
  const match = rawContent.match(FRONTMATTER_REGEX);
  if (!match) {
    result.errors.push({
      field: 'frontmatter',
      message: 'SKILL.md must start with YAML frontmatter (--- delimiters)',
      severity: 'error',
    });
    return result;
  }
  
  const [, yamlContent, markdownContent] = match;
  
  // Parse YAML frontmatter
  const frontmatter = parseYamlFrontmatter(yamlContent);
  
  // Validate required fields
  if (!frontmatter.name) {
    result.errors.push({
      field: 'name',
      message: 'Required field "name" is missing from frontmatter',
      severity: 'error',
    });
  }
  
  if (!frontmatter.description) {
    result.errors.push({
      field: 'description',
      message: 'Required field "description" is missing from frontmatter',
      severity: 'error',
    });
  }
  
  // Validate name format
  if (frontmatter.name) {
    const nameErrors = validateSkillName(frontmatter.name);
    result.errors.push(...nameErrors.filter(e => e.severity === 'error'));
    result.warnings.push(...nameErrors.filter(e => e.severity === 'warning'));
  }
  
  // Validate description format
  if (frontmatter.description) {
    const descErrors = validateSkillDescription(frontmatter.description);
    result.errors.push(...descErrors.filter(e => e.severity === 'error'));
    result.warnings.push(...descErrors.filter(e => e.severity === 'warning'));
  }
  
  // Validate content
  const contentErrors = validateSkillContent(markdownContent);
  result.errors.push(...contentErrors.filter(e => e.severity === 'error'));
  result.warnings.push(...contentErrors.filter(e => e.severity === 'warning'));
  
  // Set results if no errors
  if (result.errors.length === 0) {
    result.success = true;
    result.metadata = {
      name: frontmatter.name,
      description: frontmatter.description,
    };
    result.content = markdownContent.trim();
  }
  
  return result;
}

/**
 * Generate SKILL.md content from metadata and instructions
 */
export function generateSkillMd(metadata: SkillMetadata, content: string): string {
  return `---
name: ${metadata.name}
description: ${metadata.description}
---

${content}`;
}

/**
 * Extract tags from skill content (looks for keywords section or tags)
 */
export function extractTagsFromContent(content: string): string[] {
  const tags: string[] = [];
  
  // Look for ## Keywords section
  const keywordsMatch = content.match(/##\s*Keywords?\s*\n([^\n#]+)/i);
  if (keywordsMatch) {
    const keywordsLine = keywordsMatch[1].trim();
    // Split by comma or newline
    const keywords = keywordsLine.split(/[,\n]/).map(k => k.trim().toLowerCase()).filter(Boolean);
    tags.push(...keywords);
  }
  
  // Look for common skill-related terms
  const contentLower = content.toLowerCase();
  const commonTags = [
    'code', 'design', 'writing', 'analysis', 'data', 'automation',
    'documentation', 'testing', 'review', 'communication', 'planning',
  ];
  
  for (const tag of commonTags) {
    if (contentLower.includes(tag) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return tags.slice(0, 10); // Limit to 10 tags
}

/**
 * Infer category from skill content and metadata
 */
export function inferCategoryFromContent(
  metadata: SkillMetadata,
  content: string
): SkillCategory {
  const combined = `${metadata.name} ${metadata.description} ${content}`.toLowerCase();
  
  const categoryKeywords: Record<SkillCategory, string[]> = {
    'creative-design': ['design', 'creative', 'art', 'visual', 'canvas', 'brand', 'ui', 'ux', 'graphic'],
    'development': ['code', 'develop', 'programming', 'api', 'mcp', 'build', 'test', 'debug', 'software'],
    'enterprise': ['business', 'enterprise', 'corporate', 'compliance', 'policy', 'workflow'],
    'productivity': ['productivity', 'efficiency', 'automate', 'organize', 'manage', 'task'],
    'data-analysis': ['data', 'analysis', 'analytics', 'report', 'chart', 'metrics', 'statistics'],
    'communication': ['communication', 'email', 'message', 'internal', 'external', 'comms'],
    'meta': ['skill', 'create', 'generator', 'template', 'meta'],
    'custom': [],
  };
  
  let maxScore = 0;
  let bestCategory: SkillCategory = 'custom';
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category as SkillCategory;
    }
  }
  
  return bestCategory;
}

/**
 * Determine resource type from file path
 */
export function getResourceType(filePath: string): SkillResourceType {
  const lowerPath = filePath.toLowerCase();
  
  if (lowerPath.includes('script') || lowerPath.endsWith('.py') || 
      lowerPath.endsWith('.sh') || lowerPath.endsWith('.js') ||
      lowerPath.endsWith('.ts')) {
    return 'script';
  }
  
  if (lowerPath.includes('asset') || lowerPath.endsWith('.png') ||
      lowerPath.endsWith('.jpg') || lowerPath.endsWith('.svg') ||
      lowerPath.endsWith('.pdf') || lowerPath.endsWith('.xlsx') ||
      lowerPath.endsWith('.pptx') || lowerPath.endsWith('.docx') ||
      lowerPath.endsWith('.ttf') || lowerPath.endsWith('.woff')) {
    return 'asset';
  }
  
  // Default to reference for .md files and others
  return 'reference';
}

/**
 * Get MIME type for a file
 */
export function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    'md': 'text/markdown',
    'txt': 'text/plain',
    'py': 'text/x-python',
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'sh': 'text/x-shellscript',
    'json': 'application/json',
    'yaml': 'text/yaml',
    'yml': 'text/yaml',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Create a SkillResource from file information
 */
export function createSkillResource(
  path: string,
  name: string,
  content?: string
): SkillResource {
  return {
    type: getResourceType(path),
    path,
    name,
    content,
    size: content?.length || 0,
    mimeType: getMimeType(path),
  };
}

/**
 * Convert a name to valid hyphen-case
 */
export function toHyphenCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * Validate a complete skill object
 */
export function validateSkill(skill: Partial<Skill>): SkillValidationError[] {
  const errors: SkillValidationError[] = [];
  
  if (skill.metadata) {
    errors.push(...validateSkillName(skill.metadata.name));
    errors.push(...validateSkillDescription(skill.metadata.description));
  } else {
    errors.push({
      field: 'metadata',
      message: 'Skill metadata is required',
      severity: 'error',
    });
  }
  
  if (skill.content) {
    errors.push(...validateSkillContent(skill.content));
  } else {
    errors.push({
      field: 'content',
      message: 'Skill content is required',
      severity: 'error',
    });
  }
  
  return errors;
}

/**
 * Check if a skill is valid (no errors, warnings are ok)
 */
export function isSkillValid(skill: Partial<Skill>): boolean {
  const errors = validateSkill(skill);
  return !errors.some(e => e.severity === 'error');
}

const skillParser = {
  parseSkillMd,
  generateSkillMd,
  validateSkill,
  validateSkillName,
  validateSkillDescription,
  validateSkillContent,
  extractTagsFromContent,
  inferCategoryFromContent,
  getResourceType,
  getMimeType,
  createSkillResource,
  toHyphenCase,
  isSkillValid,
};

export default skillParser;
