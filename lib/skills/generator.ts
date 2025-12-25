/**
 * AI-Powered Skill Generator
 * 
 * Uses AI to help create, refine, and optimize skills.
 */

import type {
  SkillMetadata,
  SkillCategory,
  GenerateSkillInput,
  SkillRefinementType,
} from '@/types/skill';
import { toHyphenCase, inferCategoryFromContent, extractTagsFromContent } from './parser';
import { getTemplateById, TEMPLATE_SKILL } from './templates';

/**
 * Prompts for skill generation and refinement
 */
const GENERATION_PROMPTS = {
  create: `You are an expert at creating Claude Skills. A Skill is a modular, self-contained package that extends Claude's capabilities.

Create a SKILL.md file based on the following request:

**User Request:**
{description}

{examples}

**Requirements:**
1. Start with YAML frontmatter containing:
   - name: A hyphen-case name (lowercase, hyphens only, max 64 chars)
   - description: What the skill does and when to use it (max 1024 chars, no < or > characters)

2. Write clear instructions in Markdown:
   - Explain when to use this skill
   - Provide step-by-step guidance
   - Include examples where helpful
   - Keep content under 500 lines

3. Follow best practices:
   - Write in third person for description
   - Use imperative form for instructions
   - Be concise but comprehensive
   - Include keywords section for discoverability

Generate the complete SKILL.md content:`,

  refine: {
    optimize: `Analyze this skill and optimize it for efficiency. Remove redundant instructions, consolidate related steps, and minimize token usage while maintaining functionality.

**Current Skill:**
{skillContent}

{instructions}

Generate the optimized SKILL.md:`,

    simplify: `Simplify this skill by breaking down complex instructions into clearer steps. Remove unnecessary complexity while preserving capabilities.

**Current Skill:**
{skillContent}

{instructions}

Generate the simplified SKILL.md:`,

    expand: `Expand this skill with more detailed instructions, additional examples, and better edge case handling. Make it more robust and comprehensive.

**Current Skill:**
{skillContent}

{instructions}

Generate the expanded SKILL.md:`,

    'fix-errors': `Review this skill and fix any issues:
- Validate YAML frontmatter format
- Ensure name follows hyphen-case convention
- Check description for forbidden characters
- Fix formatting inconsistencies

**Current Skill:**
{skillContent}

{instructions}

Generate the corrected SKILL.md:`,
  },

  suggest: `Analyze this skill and suggest improvements:

**Current Skill:**
{skillContent}

Provide 3-5 specific, actionable suggestions to improve this skill. Consider:
1. Clarity of instructions
2. Completeness of coverage
3. Best practices adherence
4. Token efficiency
5. User experience

Format each suggestion as:
- **[Area]**: [Specific suggestion]`,
};

/**
 * Result of skill generation
 */
export interface SkillGenerationResult {
  success: boolean;
  rawContent?: string;
  metadata?: SkillMetadata;
  content?: string;
  category?: SkillCategory;
  tags?: string[];
  error?: string;
  prompt?: string;
}

/**
 * Result of skill suggestions
 */
export interface SkillSuggestionsResult {
  success: boolean;
  suggestions?: string[];
  error?: string;
}

/**
 * Build the prompt for generating a new skill
 */
export function buildGenerationPrompt(input: GenerateSkillInput): string {
  let prompt = GENERATION_PROMPTS.create.replace('{description}', input.description);
  
  // Add examples if provided
  if (input.examples && input.examples.length > 0) {
    const examplesText = input.examples
      .map((ex, i) => `${i + 1}. ${ex}`)
      .join('\n');
    prompt = prompt.replace('{examples}', `**Example Use Cases:**\n${examplesText}`);
  } else {
    prompt = prompt.replace('{examples}', '');
  }
  
  // Add category hint if provided
  if (input.category) {
    prompt += `\n\n**Target Category:** ${input.category}`;
  }
  
  // Add reference skills if provided
  if (input.referenceSkills && input.referenceSkills.length > 0) {
    const refs = input.referenceSkills.map(id => {
      const template = getTemplateById(id);
      return template ? `- ${template.name}: ${template.description}` : null;
    }).filter(Boolean).join('\n');
    
    if (refs) {
      prompt += `\n\n**Reference Skills for Style:**\n${refs}`;
    }
  }
  
  return prompt;
}

/**
 * Build the prompt for refining an existing skill
 */
export function buildRefinementPrompt(
  skillContent: string,
  refinementType: SkillRefinementType,
  customInstructions?: string
): string {
  const basePrompt = GENERATION_PROMPTS.refine[refinementType];
  
  let prompt = basePrompt.replace('{skillContent}', skillContent);
  
  if (customInstructions) {
    prompt = prompt.replace('{instructions}', `**Additional Instructions:**\n${customInstructions}`);
  } else {
    prompt = prompt.replace('{instructions}', '');
  }
  
  return prompt;
}

/**
 * Build the prompt for suggesting improvements
 */
export function buildSuggestionsPrompt(skillContent: string): string {
  return GENERATION_PROMPTS.suggest.replace('{skillContent}', skillContent);
}

/**
 * Parse the generated SKILL.md content
 */
export function parseGeneratedSkill(rawContent: string): SkillGenerationResult {
  // Try to extract YAML frontmatter
  const frontmatterMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  
  if (!frontmatterMatch) {
    // Try to find frontmatter within the content (AI might add extra text)
    const embeddedMatch = rawContent.match(/---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*?)(?:```|$)/);
    if (embeddedMatch) {
      return parseGeneratedSkill(`---\n${embeddedMatch[1]}\n---\n${embeddedMatch[2]}`);
    }
    
    return {
      success: false,
      error: 'Generated content does not contain valid YAML frontmatter',
      rawContent,
    };
  }
  
  const [, yamlContent, markdownContent] = frontmatterMatch;
  
  // Parse simple YAML
  const metadata: SkillMetadata = { name: '', description: '' };
  
  for (const line of yamlContent.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      // Remove quotes if present
      value = value.replace(/^["']|["']$/g, '');
      
      if (key === 'name') {
        metadata.name = toHyphenCase(value);
      } else if (key === 'description') {
        metadata.description = value;
      }
    }
  }
  
  // Validate metadata
  if (!metadata.name) {
    return {
      success: false,
      error: 'Generated skill is missing a name',
      rawContent,
    };
  }
  
  if (!metadata.description) {
    return {
      success: false,
      error: 'Generated skill is missing a description',
      rawContent,
    };
  }
  
  const content = markdownContent.trim();
  
  // Infer category and tags
  const category = inferCategoryFromContent(metadata, content);
  const tags = extractTagsFromContent(content);
  
  return {
    success: true,
    rawContent: `---\nname: ${metadata.name}\ndescription: ${metadata.description}\n---\n\n${content}`,
    metadata,
    content,
    category,
    tags,
  };
}

/**
 * Parse suggestions from AI response
 */
export function parseSuggestions(response: string): string[] {
  const suggestions: string[] = [];
  
  // Look for bullet points or numbered items
  const lines = response.split('\n');
  let currentSuggestion = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for new bullet or number
    if (trimmed.match(/^[-*•]\s+\*\*/) || trimmed.match(/^\d+\.\s+\*\*/)) {
      if (currentSuggestion) {
        suggestions.push(currentSuggestion.trim());
      }
      currentSuggestion = trimmed.replace(/^[-*•\d.]+\s*/, '');
    } else if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
      if (currentSuggestion) {
        suggestions.push(currentSuggestion.trim());
      }
      currentSuggestion = trimmed.replace(/^[-*•\d.]+\s*/, '');
    } else if (currentSuggestion && trimmed) {
      currentSuggestion += ' ' + trimmed;
    }
  }
  
  if (currentSuggestion) {
    suggestions.push(currentSuggestion.trim());
  }
  
  return suggestions.filter(s => s.length > 10).slice(0, 5);
}

/**
 * Get a starter template for a new skill
 */
export function getStarterContent(name: string, description: string): string {
  const hyphenName = toHyphenCase(name);
  const template = TEMPLATE_SKILL.defaultContent;
  
  return `---
name: ${hyphenName}
description: ${description}
---

${template.replace('[Skill Name]', name).replace('[Brief description of what this skill does]', description)}`;
}

/**
 * Generate example content based on category
 */
export function generateCategoryExample(category: SkillCategory): string {
  const examples: Record<SkillCategory, string> = {
    'creative-design': `# Design Skill

This skill helps create design assets following best practices.

## When to Use

Use this skill when:
- Creating visual designs
- Building design systems
- Applying brand guidelines

## Instructions

### Step 1: Understand Requirements
Gather information about the design requirements, including:
- Purpose and audience
- Brand guidelines
- Technical constraints

### Step 2: Create Design
Follow these principles:
- Use consistent spacing
- Apply brand colors
- Ensure accessibility

### Step 3: Review and Refine
- Check against requirements
- Verify accessibility
- Get feedback

## Keywords
design, creative, visual, brand`,

    'development': `# Development Skill

This skill helps with software development tasks.

## When to Use

Use this skill when:
- Writing code
- Debugging issues
- Reviewing code

## Instructions

### Step 1: Understand the Problem
Analyze the requirements and constraints.

### Step 2: Implement Solution
Write clean, maintainable code following best practices.

### Step 3: Test and Validate
Ensure the solution works correctly.

## Keywords
code, development, programming, software`,

    'enterprise': `# Enterprise Skill

This skill helps with enterprise workflows and processes.

## When to Use

Use this skill when:
- Following company procedures
- Applying policies
- Managing workflows

## Instructions

Follow established procedures and ensure compliance.

## Keywords
enterprise, business, workflow, compliance`,

    'productivity': `# Productivity Skill

This skill helps improve productivity and efficiency.

## When to Use

Use this skill when:
- Organizing tasks
- Automating workflows
- Managing time

## Instructions

Apply productivity best practices to optimize work.

## Keywords
productivity, efficiency, automation, organization`,

    'data-analysis': `# Data Analysis Skill

This skill helps analyze data and generate insights.

## When to Use

Use this skill when:
- Analyzing datasets
- Creating visualizations
- Generating reports

## Instructions

### Step 1: Understand the Data
Review data structure and quality.

### Step 2: Analyze
Apply appropriate analysis methods.

### Step 3: Report
Present findings clearly.

## Keywords
data, analysis, visualization, insights`,

    'communication': `# Communication Skill

This skill helps with written communications.

## When to Use

Use this skill when:
- Writing emails
- Creating documents
- Preparing presentations

## Instructions

Follow communication best practices for clarity and effectiveness.

## Keywords
communication, writing, email, document`,

    'meta': `# Meta Skill

This skill helps create or manage other skills.

## When to Use

Use this skill when:
- Creating new skills
- Improving existing skills
- Managing skill library

## Instructions

Follow the skill creation process.

## Keywords
skill, meta, generator, template`,

    'custom': `# Custom Skill

This skill provides custom functionality.

## When to Use

Define when this skill should be used.

## Instructions

Provide step-by-step instructions.

## Keywords
custom`,
  };
  
  return examples[category] || examples['custom'];
}

/**
 * Validate AI-generated skill content
 */
export function validateGeneratedContent(content: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for frontmatter
  if (!content.includes('---')) {
    errors.push('Missing YAML frontmatter delimiters (---)');
  }
  
  // Check for required fields
  if (!content.includes('name:')) {
    errors.push('Missing required field: name');
  }
  if (!content.includes('description:')) {
    errors.push('Missing required field: description');
  }
  
  // Check for forbidden characters in description
  const descMatch = content.match(/description:\s*([^\n]+)/);
  if (descMatch) {
    const desc = descMatch[1];
    if (desc.includes('<') || desc.includes('>')) {
      errors.push('Description contains forbidden characters (< or >)');
    }
    if (desc.length > 1024) {
      errors.push(`Description exceeds 1024 character limit (${desc.length})`);
    }
  }
  
  // Check content length
  const lines = content.split('\n').length;
  if (lines > 500) {
    warnings.push(`Content has ${lines} lines, recommended maximum is 500`);
  }
  
  // Check for common sections
  if (!content.toLowerCase().includes('## when to use') && 
      !content.toLowerCase().includes('## instructions')) {
    warnings.push('Consider adding "When to Use" and "Instructions" sections');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

const skillGenerator = {
  buildGenerationPrompt,
  buildRefinementPrompt,
  buildSuggestionsPrompt,
  parseGeneratedSkill,
  parseSuggestions,
  getStarterContent,
  generateCategoryExample,
  validateGeneratedContent,
};

export default skillGenerator;
