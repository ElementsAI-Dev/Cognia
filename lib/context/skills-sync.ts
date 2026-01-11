/**
 * Skills Sync - Sync agent skill descriptions to files for dynamic discovery
 * 
 * Instead of injecting all skill descriptions into the prompt,
 * this module syncs them to context files. The agent receives only
 * skill names in the static prompt and can discover relevant skills
 * through grep/semantic search.
 */

import {
  writeContextFile,
  readContextFile,
  searchContextFiles,
  grepContextFiles,
} from './context-fs';
import type { SkillDescriptionFile, ContextFile } from '@/types/system/context';
import type { Skill } from '@/types/system/skill';

/**
 * Minimal skill reference for static prompt
 */
export interface SkillRef {
  /** Skill ID */
  id: string;
  /** Skill name */
  name: string;
  /** Brief description (first line) */
  briefDescription: string;
  /** Keywords for discovery */
  keywords: string[];
}

/**
 * Sync a skill to a context file
 */
export async function syncSkill(skill: Skill): Promise<ContextFile> {
  const description: SkillDescriptionFile = {
    skillId: skill.id,
    name: skill.metadata.name,
    shortDescription: skill.metadata.description.split('\n')[0],
    fullDescription: skill.content,
    toolNames: [], // Would be populated from skill tools
    keywords: extractKeywords(skill.metadata.name + ' ' + skill.metadata.description),
    lastUpdated: new Date(),
  };
  
  const content = JSON.stringify(description, null, 2);
  
  return writeContextFile(content, {
    category: 'skills',
    source: skill.id,
    filename: `${sanitizeFilename(skill.id)}.json`,
    tags: ['skill', ...description.keywords.slice(0, 5)],
  });
}

/**
 * Sync multiple skills
 */
export async function syncSkills(skills: Skill[]): Promise<{
  synced: number;
  errors: Array<{ skillId: string; error: string }>;
}> {
  const result = { synced: 0, errors: [] as Array<{ skillId: string; error: string }> };
  
  for (const skill of skills) {
    try {
      await syncSkill(skill);
      result.synced++;
    } catch (err) {
      result.errors.push({ skillId: skill.id, error: String(err) });
    }
  }
  
  return result;
}

/**
 * Read a skill description
 */
export async function readSkillDescription(skillId: string): Promise<SkillDescriptionFile | null> {
  const path = `.cognia/context/skills/${sanitizeFilename(skillId)}.json`;
  const file = await readContextFile(path);
  if (!file) return null;
  
  try {
    return JSON.parse(file.content);
  } catch {
    return null;
  }
}

/**
 * Search for skills by query
 */
export async function searchSkills(
  query: string,
  options: { limit?: number } = {}
): Promise<SkillDescriptionFile[]> {
  const grepResults = await grepContextFiles(query, {
    category: 'skills',
    ignoreCase: true,
    limit: options.limit ?? 10,
  });
  
  const uniquePaths = [...new Set(grepResults.map(r => r.path))];
  const skills: SkillDescriptionFile[] = [];
  
  for (const path of uniquePaths) {
    const file = await readContextFile(path);
    if (file) {
      try {
        skills.push(JSON.parse(file.content));
      } catch {
        // Skip invalid files
      }
    }
  }
  
  return skills;
}

/**
 * Get minimal skill references for static prompt
 */
export async function getSkillRefs(): Promise<SkillRef[]> {
  const files = await searchContextFiles({ category: 'skills' });
  const refs: SkillRef[] = [];
  
  for (const meta of files) {
    const path = `.cognia/context/skills/${sanitizeFilename(meta.source)}.json`;
    const file = await readContextFile(path);
    if (file) {
      try {
        const skill: SkillDescriptionFile = JSON.parse(file.content);
        refs.push({
          id: skill.skillId,
          name: skill.name,
          briefDescription: skill.shortDescription.slice(0, 80),
          keywords: skill.keywords.slice(0, 5),
        });
      } catch {
        // Skip invalid files
      }
    }
  }
  
  return refs;
}

/**
 * Generate minimal static prompt for skills
 */
export function generateSkillsStaticPrompt(refs: SkillRef[]): string {
  if (refs.length === 0) {
    return '';
  }
  
  const lines = [
    '## Agent Skills Available',
    '',
    'The following specialized skills can help with domain-specific tasks:',
    '',
  ];
  
  for (const ref of refs) {
    lines.push(`- **${ref.name}**: ${ref.briefDescription}`);
    if (ref.keywords.length > 0) {
      lines.push(`  Keywords: ${ref.keywords.join(', ')}`);
    }
  }
  
  lines.push('');
  lines.push('Use `grep_context("keyword", category: "skills")` to find relevant skills.');
  lines.push('Use `read_context_file(".cognia/context/skills/<skill_id>.json")` for full details.');
  
  return lines.join('\n');
}

/**
 * Discover skills relevant to a query
 * Returns skills ranked by relevance
 */
export async function discoverSkills(
  query: string,
  options: { maxResults?: number; minRelevance?: number } = {}
): Promise<Array<{ skill: SkillDescriptionFile; relevanceScore: number }>> {
  const { maxResults = 5 } = options;
  
  // Search skills
  const skills = await searchSkills(query, { limit: maxResults * 2 });
  
  // Simple relevance scoring based on keyword matches
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  const scored = skills.map(skill => {
    const text = (skill.name + ' ' + skill.shortDescription + ' ' + skill.keywords.join(' ')).toLowerCase();
    let score = 0;
    
    for (const word of queryWords) {
      if (text.includes(word)) {
        score += 1;
        // Bonus for name match
        if (skill.name.toLowerCase().includes(word)) {
          score += 2;
        }
        // Bonus for keyword match
        if (skill.keywords.some(k => k.includes(word))) {
          score += 1;
        }
      }
    }
    
    return { skill, relevanceScore: score / queryWords.length };
  });
  
  return scored
    .filter(s => s.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'to',
    'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'and',
    'or', 'but', 'if', 'then', 'else', 'when', 'where', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so',
    'than', 'too', 'very', 'just', 'also', 'now', 'this', 'that',
  ]);
  
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  // Count frequency and return unique
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}
