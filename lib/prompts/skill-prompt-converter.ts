/**
 * Skill-Prompt Converter
 * Bidirectional conversion between Skills and Prompt Templates
 */

import type { Skill, CreateSkillInput } from '@/types/skill';
import type {
  PromptTemplate,
  CreatePromptTemplateInput,
  TemplateVariable,
} from '@/types/prompt-template';
import { buildTemplateVariables } from './template-utils';

/**
 * Convert a Prompt Template to a Skill
 */
export function promptTemplateToSkill(
  template: PromptTemplate,
  options?: {
    category?: string;
    author?: string;
  }
): CreateSkillInput {
  const variableSection = template.variables.length > 0
    ? `\n\n## Variables\n\n${template.variables.map(v => 
        `- **{{${v.name}}}**${v.required ? ' (required)' : ''}: ${v.description || 'No description'}`
      ).join('\n')}`
    : '';

  const content = `# ${template.name}

${template.description || 'No description provided.'}

## Instructions

${template.content}${variableSection}

## Usage

This skill was converted from a prompt template. Use it when you need to:
${template.tags.map(tag => `- Work with ${tag}`).join('\n') || '- Apply the instructions above'}

## Notes

- Source: Prompt Template
- Category: ${template.category || 'custom'}
- Created: ${template.createdAt.toISOString()}
`;

  return {
    name: template.name,
    description: template.description || `Skill created from template: ${template.name}`,
    content,
    category: (options?.category || template.category || 'custom') as CreateSkillInput['category'],
    tags: [...template.tags, 'from-template'],
    author: options?.author,
  };
}

/**
 * Convert a Skill to a Prompt Template
 */
export function skillToPromptTemplate(
  skill: Skill,
  options?: {
    category?: string;
    extractVariables?: boolean;
  }
): CreatePromptTemplateInput {
  // Extract the main content from the skill
  // Try to find the Instructions section, or use the full content
  let promptContent = skill.content;
  
  // Try to extract just the instructions section
  const instructionsMatch = skill.content.match(/##\s*Instructions\s*\n+([\s\S]*?)(?=\n##|$)/i);
  if (instructionsMatch) {
    promptContent = instructionsMatch[1].trim();
  }

  // Build variables from content
  const variables: TemplateVariable[] = options?.extractVariables !== false
    ? buildTemplateVariables(promptContent)
    : [];

  // Try to extract any existing variable definitions from the skill
  const variablesSection = skill.content.match(/##\s*Variables\s*\n+([\s\S]*?)(?=\n##|$)/i);
  if (variablesSection) {
    const varLines = variablesSection[1].split('\n').filter(line => line.trim().startsWith('-'));
    varLines.forEach(line => {
      const varMatch = line.match(/\{\{(\w+)\}\}/);
      const requiredMatch = line.includes('(required)');
      const descMatch = line.match(/:\s*(.+)$/);
      
      if (varMatch) {
        const existingVar = variables.find(v => v.name === varMatch[1]);
        if (existingVar) {
          existingVar.required = requiredMatch;
          if (descMatch) {
            existingVar.description = descMatch[1].trim();
          }
        } else {
          variables.push({
            name: varMatch[1],
            required: requiredMatch,
            description: descMatch ? descMatch[1].trim() : undefined,
            type: 'text',
          });
        }
      }
    });
  }

  return {
    name: skill.metadata.name,
    description: skill.metadata.description,
    content: promptContent,
    category: options?.category || skill.category || 'custom',
    tags: [...skill.tags, 'from-skill'],
    variables,
    targets: ['chat', 'agent'],
    source: 'user',
    meta: {
      icon: '🎯',
      color: '#22c55e',
      author: skill.author,
    },
  };
}

/**
 * Extract prompt content from a skill for direct use
 */
export function extractPromptFromSkill(skill: Skill): string {
  // Try to find the Instructions section
  const instructionsMatch = skill.content.match(/##\s*Instructions\s*\n+([\s\S]*?)(?=\n##|$)/i);
  if (instructionsMatch) {
    return instructionsMatch[1].trim();
  }

  // If no Instructions section, try to get content after the first heading
  const afterHeading = skill.content.match(/^#[^#].*\n+([\s\S]*)$/m);
  if (afterHeading) {
    // Remove other sections like Variables, Usage, Notes
    let content = afterHeading[1];
    content = content.replace(/##\s*Variables\s*\n+[\s\S]*?(?=\n##|$)/gi, '');
    content = content.replace(/##\s*Usage\s*\n+[\s\S]*?(?=\n##|$)/gi, '');
    content = content.replace(/##\s*Notes\s*\n+[\s\S]*?(?=\n##|$)/gi, '');
    content = content.replace(/##\s*Examples?\s*\n+[\s\S]*?(?=\n##|$)/gi, '');
    return content.trim();
  }

  return skill.content;
}

/**
 * Merge a prompt template into an existing skill
 */
export function mergePromptIntoSkill(
  skill: Skill,
  template: PromptTemplate
): Partial<Skill> {
  const existingContent = skill.content;
  
  // Find or create the Instructions section
  const hasInstructions = /##\s*Instructions/i.test(existingContent);
  
  let newContent: string;
  if (hasInstructions) {
    // Replace existing instructions
    newContent = existingContent.replace(
      /##\s*Instructions\s*\n+[\s\S]*?(?=\n##|$)/i,
      `## Instructions\n\n${template.content}\n\n`
    );
  } else {
    // Add instructions section after the first heading
    const firstHeadingEnd = existingContent.indexOf('\n\n');
    if (firstHeadingEnd !== -1) {
      newContent = existingContent.slice(0, firstHeadingEnd) +
        `\n\n## Instructions\n\n${template.content}` +
        existingContent.slice(firstHeadingEnd);
    } else {
      newContent = existingContent + `\n\n## Instructions\n\n${template.content}`;
    }
  }

  // Merge tags
  const mergedTags = [...new Set([...skill.tags, ...template.tags])];

  return {
    content: newContent,
    tags: mergedTags,
    updatedAt: new Date(),
  };
}

/**
 * Create a system prompt from a skill for chat context
 */
export function skillToSystemPrompt(skill: Skill): string {
  const prompt = extractPromptFromSkill(skill);
  
  return `You are an AI assistant with the following skill:

## ${skill.metadata.name}

${skill.metadata.description}

### Instructions

${prompt}

Apply this skill when responding to the user's request.`;
}

/**
 * Batch convert multiple templates to skills
 */
export function batchConvertTemplatesToSkills(
  templates: PromptTemplate[],
  options?: Parameters<typeof promptTemplateToSkill>[1]
): CreateSkillInput[] {
  return templates.map(t => promptTemplateToSkill(t, options));
}

/**
 * Batch convert multiple skills to templates
 */
export function batchConvertSkillsToTemplates(
  skills: Skill[],
  options?: Parameters<typeof skillToPromptTemplate>[1]
): CreatePromptTemplateInput[] {
  return skills.map(s => skillToPromptTemplate(s, options));
}

/**
 * Analyze compatibility between a skill and template
 */
export function analyzeCompatibility(
  skill: Skill,
  template: PromptTemplate
): {
  compatible: boolean;
  overlap: number;
  commonTags: string[];
  suggestions: string[];
} {
  const commonTags = skill.tags.filter(t => template.tags.includes(t));
  const overlap = commonTags.length / Math.max(skill.tags.length, template.tags.length, 1);
  
  const suggestions: string[] = [];
  
  if (overlap < 0.2) {
    suggestions.push('Low tag overlap - these may serve different purposes');
  }
  
  if (template.variables.length > 0 && !skill.content.includes('{{')) {
    suggestions.push('Template has variables but skill does not - consider adding placeholders to skill');
  }
  
  if (skill.category !== template.category) {
    suggestions.push(`Different categories: skill is "${skill.category}", template is "${template.category}"`);
  }

  return {
    compatible: overlap > 0.1 || commonTags.length > 0,
    overlap,
    commonTags,
    suggestions,
  };
}

const skillPromptConverter = {
  promptTemplateToSkill,
  skillToPromptTemplate,
  extractPromptFromSkill,
  mergePromptIntoSkill,
  skillToSystemPrompt,
  batchConvertTemplatesToSkills,
  batchConvertSkillsToTemplates,
  analyzeCompatibility,
};

export default skillPromptConverter;
