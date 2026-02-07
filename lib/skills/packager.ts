/**
 * Skill Packager - Import/Export utilities for skills
 * 
 * Handles packaging skills for distribution and import
 */

import type {
  Skill,
  SkillPackage,
} from '@/types/system/skill';
import { parseSkillMd, validateSkill, inferCategoryFromContent, extractTagsFromContent } from './parser';

/**
 * Current package format version
 */
export const PACKAGE_FORMAT_VERSION = '1.0.0';

/**
 * Export a skill to a package format
 */
export function exportSkillToPackage(skill: Skill): SkillPackage {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    status: _status,
    isActive: _isActive,
    usageCount: _usageCount,
    lastUsedAt: _lastUsedAt,
    ...skillData
  } = skill;

  return {
    formatVersion: PACKAGE_FORMAT_VERSION,
    skill: skillData,
    exportedAt: new Date().toISOString(),
    checksum: generateChecksum(skill.rawContent),
  };
}

/**
 * Import a skill from a package
 */
export function importSkillFromPackage(pkg: SkillPackage): {
  success: boolean;
  skill?: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>;
  errors?: string[];
} {
  const errors: string[] = [];

  // Validate format version
  if (!pkg.formatVersion) {
    errors.push('Missing format version');
  }

  // Validate skill data
  if (!pkg.skill) {
    errors.push('Missing skill data');
    return { success: false, errors };
  }

  if (!pkg.skill.metadata) {
    errors.push('Missing skill metadata');
    return { success: false, errors };
  }

  if (!pkg.skill.content) {
    errors.push('Missing skill content');
    return { success: false, errors };
  }

  // Verify checksum if present
  if (pkg.checksum && pkg.skill.rawContent) {
    const calculatedChecksum = generateChecksum(pkg.skill.rawContent);
    if (calculatedChecksum !== pkg.checksum) {
      errors.push('Checksum mismatch - skill content may be corrupted');
    }
  }

  // Validate skill structure
  const validationErrors = validateSkill({
    metadata: pkg.skill.metadata,
    content: pkg.skill.content,
  });

  const hasErrors = validationErrors.some(e => e.severity === 'error');
  if (hasErrors) {
    errors.push(...validationErrors.filter(e => e.severity === 'error').map(e => e.message));
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    skill: {
      ...pkg.skill,
      status: 'enabled',
      source: 'imported',
    },
  };
}

/**
 * Export a skill to SKILL.md format
 */
export function exportSkillToMarkdown(skill: Skill): string {
  return skill.rawContent;
}

/**
 * Import a skill from SKILL.md content
 */
export function importSkillFromMarkdown(content: string): {
  success: boolean;
  skill?: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>;
  errors?: string[];
} {
  const parseResult = parseSkillMd(content);

  if (!parseResult.success) {
    return {
      success: false,
      errors: parseResult.errors.map(e => `${e.field}: ${e.message}`),
    };
  }

  if (!parseResult.metadata || !parseResult.content) {
    return {
      success: false,
      errors: ['Failed to parse skill metadata or content'],
    };
  }

  // Auto-detect category and tags from content
  const detectedCategory = inferCategoryFromContent(parseResult.metadata, parseResult.content);
  const detectedTags = extractTagsFromContent(parseResult.content);

  return {
    success: true,
    skill: {
      metadata: parseResult.metadata,
      content: parseResult.content,
      rawContent: content,
      resources: [],
      status: 'enabled',
      source: 'imported',
      category: detectedCategory,
      tags: detectedTags,
    },
  };
}

/**
 * Export multiple skills to a bundle
 */
export function exportSkillBundle(skills: Skill[]): {
  formatVersion: string;
  skills: SkillPackage[];
  exportedAt: string;
  count: number;
} {
  return {
    formatVersion: PACKAGE_FORMAT_VERSION,
    skills: skills.map(exportSkillToPackage),
    exportedAt: new Date().toISOString(),
    count: skills.length,
  };
}

/**
 * Import skills from a bundle
 */
export function importSkillBundle(bundle: {
  skills: SkillPackage[];
}): {
  success: boolean;
  skills: Array<Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>>;
  errors: Array<{ index: number; errors: string[] }>;
} {
  const importedSkills: Array<Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>> = [];
  const errors: Array<{ index: number; errors: string[] }> = [];

  bundle.skills.forEach((pkg, index) => {
    const result = importSkillFromPackage(pkg);
    if (result.success && result.skill) {
      importedSkills.push(result.skill);
    } else {
      errors.push({ index, errors: result.errors || ['Unknown error'] });
    }
  });

  return {
    success: errors.length === 0,
    skills: importedSkills,
    errors,
  };
}

/**
 * Generate a simple checksum for content verification
 */
export function generateChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Validate a skill package structure
 */
export function validatePackage(pkg: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!pkg || typeof pkg !== 'object') {
    errors.push('Package must be an object');
    return { valid: false, errors };
  }

  const p = pkg as Record<string, unknown>;

  if (!p.formatVersion) {
    errors.push('Missing formatVersion');
  }

  if (!p.skill || typeof p.skill !== 'object') {
    errors.push('Missing or invalid skill data');
  } else {
    const skill = p.skill as Record<string, unknown>;
    if (!skill.metadata) {
      errors.push('Missing skill metadata');
    }
    if (!skill.content) {
      errors.push('Missing skill content');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a downloadable blob from skill content
 */
export function createSkillBlob(skill: Skill): Blob {
  return new Blob([skill.rawContent], { type: 'text/markdown' });
}

/**
 * Create a downloadable blob from skill package
 */
export function createPackageBlob(pkg: SkillPackage): Blob {
  return new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
}

/**
 * Download a skill as markdown
 */
export function downloadSkillAsMarkdown(skill: Skill): void {
  const blob = createSkillBlob(skill);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${skill.metadata.name}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a skill as JSON package
 */
export function downloadSkillAsPackage(skill: Skill): void {
  const pkg = exportSkillToPackage(skill);
  const blob = createPackageBlob(pkg);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${skill.metadata.name}.skill.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a file and parse as skill
 */
export async function readSkillFile(file: File): Promise<{
  success: boolean;
  skill?: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>;
  errors?: string[];
}> {
  const content = await file.text();
  
  // Check if it's a JSON package or markdown
  if (file.name.endsWith('.json') || file.name.endsWith('.skill.json')) {
    try {
      const pkg = JSON.parse(content) as SkillPackage;
      return importSkillFromPackage(pkg);
    } catch {
      return {
        success: false,
        errors: ['Invalid JSON format'],
      };
    }
  }
  
  // Assume markdown
  return importSkillFromMarkdown(content);
}

const skillPackager = {
  PACKAGE_FORMAT_VERSION,
  exportSkillToPackage,
  importSkillFromPackage,
  exportSkillToMarkdown,
  importSkillFromMarkdown,
  exportSkillBundle,
  importSkillBundle,
  generateChecksum,
  validatePackage,
  createSkillBlob,
  createPackageBlob,
  downloadSkillAsMarkdown,
  downloadSkillAsPackage,
  readSkillFile,
};

export default skillPackager;
