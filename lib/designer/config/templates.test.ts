/**
 * Tests for Designer Templates utilities
 */

import {
  DESIGNER_TEMPLATES,
  TEMPLATE_CATEGORIES,
  FRAMEWORK_OPTIONS,
  AI_SUGGESTIONS,
  TEMPLATE_ICONS,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByFramework,
  getTemplatesByCategoryAndFramework,
  getDefaultTemplate,
  getRandomSuggestions,
  getCustomTemplates,
  saveCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
  getFavoriteTemplateIds,
  toggleFavoriteTemplate,
  isTemplateFavorited,
  getFavoriteTemplates,
  getAllTemplates,
  searchTemplates,
  exportTemplatesAsJson,
  importTemplatesFromJson,
  duplicateTemplate,
} from './templates';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

beforeEach(() => {
  localStorageMock.clear();
});

describe('DESIGNER_TEMPLATES', () => {
  it('should have templates', () => {
    expect(DESIGNER_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('should have required properties for each template', () => {
    for (const template of DESIGNER_TEMPLATES) {
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('code');
      expect(template).toHaveProperty('framework');
    }
  });

  it('should have unique ids', () => {
    const ids = DESIGNER_TEMPLATES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('TEMPLATE_CATEGORIES', () => {
  it('should have categories', () => {
    expect(TEMPLATE_CATEGORIES.length).toBeGreaterThan(0);
  });

  it('should include expected categories', () => {
    expect(TEMPLATE_CATEGORIES).toContain('Basic');
    expect(TEMPLATE_CATEGORIES).toContain('Marketing');
    expect(TEMPLATE_CATEGORIES).toContain('Application');
    expect(TEMPLATE_CATEGORIES).toContain('Components');
  });
});

describe('FRAMEWORK_OPTIONS', () => {
  it('should have framework options', () => {
    expect(FRAMEWORK_OPTIONS.length).toBeGreaterThan(0);
  });

  it('should include react, vue, and html', () => {
    const values = FRAMEWORK_OPTIONS.map((f) => f.value);
    expect(values).toContain('react');
    expect(values).toContain('vue');
    expect(values).toContain('html');
  });
});

describe('getTemplateById', () => {
  it('should find template by id', () => {
    const template = getTemplateById('blank');
    expect(template).toBeDefined();
    expect(template?.id).toBe('blank');
  });

  it('should return undefined for non-existent id', () => {
    const template = getTemplateById('non-existent');
    expect(template).toBeUndefined();
  });
});

describe('getTemplatesByCategory', () => {
  it('should return templates for category', () => {
    const templates = getTemplatesByCategory('Basic');
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.category === 'Basic')).toBe(true);
  });
});

describe('getTemplatesByFramework', () => {
  it('should return templates for framework', () => {
    const templates = getTemplatesByFramework('react');
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.framework === 'react')).toBe(true);
  });

  it('should return vue templates', () => {
    const templates = getTemplatesByFramework('vue');
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.framework === 'vue')).toBe(true);
  });
});

describe('getTemplatesByCategoryAndFramework', () => {
  it('should filter by both category and framework', () => {
    const templates = getTemplatesByCategoryAndFramework('Basic', 'react');
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.category === 'Basic' && t.framework === 'react')).toBe(true);
  });
});

describe('getDefaultTemplate', () => {
  it('should return first template', () => {
    const template = getDefaultTemplate();
    expect(template).toBeDefined();
    expect(template.id).toBe(DESIGNER_TEMPLATES[0].id);
  });
});

describe('getRandomSuggestions', () => {
  it('should return specified number of suggestions', () => {
    const suggestions = getRandomSuggestions(3);
    expect(suggestions.length).toBe(3);
  });

  it('should return 4 by default', () => {
    const suggestions = getRandomSuggestions();
    expect(suggestions.length).toBe(4);
  });

  it('should return suggestions from AI_SUGGESTIONS', () => {
    const suggestions = getRandomSuggestions(2);
    expect(suggestions.every((s) => AI_SUGGESTIONS.includes(s))).toBe(true);
  });
});

describe('Custom Templates', () => {
  describe('saveCustomTemplate', () => {
    it('should save a custom template', () => {
      const template = saveCustomTemplate({
        name: 'My Template',
        description: 'A test template',
        code: '<div>Test</div>',
        category: 'Basic',
        framework: 'react',
      });

      expect(template.id).toContain('custom-');
      expect(template.name).toBe('My Template');
      expect(template.isCustom).toBe(true);
      expect(template.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getCustomTemplates', () => {
    it('should return empty array when no templates', () => {
      const templates = getCustomTemplates();
      expect(templates).toEqual([]);
    });

    it('should return saved templates', () => {
      saveCustomTemplate({
        name: 'Test',
        description: 'Test',
        code: '<div>Test</div>',
        category: 'Basic',
        framework: 'react',
      });

      const templates = getCustomTemplates();
      expect(templates.length).toBe(1);
      expect(templates[0].name).toBe('Test');
    });
  });

  describe('updateCustomTemplate', () => {
    it('should update existing template', () => {
      const template = saveCustomTemplate({
        name: 'Original',
        description: 'Original desc',
        code: '<div>Original</div>',
        category: 'Basic',
        framework: 'react',
      });

      const updated = updateCustomTemplate(template.id, {
        name: 'Updated',
        description: 'Updated desc',
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.description).toBe('Updated desc');
    });

    it('should return null for non-existent id', () => {
      const result = updateCustomTemplate('non-existent', { name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteCustomTemplate', () => {
    it('should delete existing template', () => {
      const template = saveCustomTemplate({
        name: 'To Delete',
        description: 'Test',
        code: '<div>Delete me</div>',
        category: 'Basic',
        framework: 'react',
      });

      const result = deleteCustomTemplate(template.id);
      expect(result).toBe(true);
      expect(getCustomTemplates().length).toBe(0);
    });

    it('should return false for non-existent id', () => {
      const result = deleteCustomTemplate('non-existent');
      expect(result).toBe(false);
    });
  });
});

describe('Favorite Templates', () => {
  describe('toggleFavoriteTemplate', () => {
    it('should add to favorites', () => {
      const result = toggleFavoriteTemplate('blank');
      expect(result).toBe(true);
      expect(isTemplateFavorited('blank')).toBe(true);
    });

    it('should remove from favorites', () => {
      toggleFavoriteTemplate('blank');
      const result = toggleFavoriteTemplate('blank');
      expect(result).toBe(false);
      expect(isTemplateFavorited('blank')).toBe(false);
    });
  });

  describe('getFavoriteTemplateIds', () => {
    it('should return empty array initially', () => {
      const ids = getFavoriteTemplateIds();
      expect(ids).toEqual([]);
    });

    it('should return favorited ids', () => {
      toggleFavoriteTemplate('blank');
      toggleFavoriteTemplate('landing');
      const ids = getFavoriteTemplateIds();
      expect(ids).toContain('blank');
      expect(ids).toContain('landing');
    });
  });

  describe('getFavoriteTemplates', () => {
    it('should return favorited templates', () => {
      toggleFavoriteTemplate('blank');
      const favorites = getFavoriteTemplates();
      expect(favorites.length).toBe(1);
      expect(favorites[0].id).toBe('blank');
    });
  });
});

describe('getAllTemplates', () => {
  it('should include built-in templates', () => {
    const all = getAllTemplates();
    expect(all.length).toBeGreaterThanOrEqual(DESIGNER_TEMPLATES.length);
  });

  it('should include custom templates', () => {
    saveCustomTemplate({
      name: 'Custom',
      description: 'Test',
      code: '<div>Custom</div>',
      category: 'Basic',
      framework: 'react',
    });

    const all = getAllTemplates();
    expect(all.length).toBe(DESIGNER_TEMPLATES.length + 1);
  });
});

describe('searchTemplates', () => {
  it('should search by name', () => {
    const results = searchTemplates('landing');
    expect(results.some((t) => t.name.toLowerCase().includes('landing'))).toBe(true);
  });

  it('should filter by framework', () => {
    const results = searchTemplates('', { framework: 'vue' });
    expect(results.every((t) => t.framework === 'vue')).toBe(true);
  });

  it('should filter by category', () => {
    const results = searchTemplates('', { category: 'Marketing' });
    expect(results.every((t) => t.category === 'Marketing')).toBe(true);
  });

  it('should filter favorites only', () => {
    toggleFavoriteTemplate('blank');
    const results = searchTemplates('', { favoritesOnly: true });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('blank');
  });
});

describe('exportTemplatesAsJson', () => {
  it('should export custom templates as JSON', () => {
    saveCustomTemplate({
      name: 'Export Test',
      description: 'Test',
      code: '<div>Export</div>',
      category: 'Basic',
      framework: 'react',
    });

    const json = exportTemplatesAsJson();
    const parsed = JSON.parse(json);
    expect(parsed.length).toBe(1);
    expect(parsed[0].name).toBe('Export Test');
  });
});

describe('importTemplatesFromJson', () => {
  it('should import valid JSON', () => {
    const json = JSON.stringify([
      {
        name: 'Imported',
        description: 'Test',
        code: '<div>Imported</div>',
        category: 'Basic',
        framework: 'react',
      },
    ]);

    const result = importTemplatesFromJson(json);
    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
  });

  it('should reject invalid JSON', () => {
    const result = importTemplatesFromJson('invalid json');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('duplicateTemplate', () => {
  it('should duplicate built-in template', () => {
    const duplicate = duplicateTemplate('blank', 'My Copy');
    expect(duplicate).not.toBeNull();
    expect(duplicate?.name).toBe('My Copy');
    expect(duplicate?.isCustom).toBe(true);
  });

  it('should duplicate with default name', () => {
    const duplicate = duplicateTemplate('blank');
    expect(duplicate?.name).toContain('(Copy)');
  });

  it('should return null for non-existent id', () => {
    const result = duplicateTemplate('non-existent');
    expect(result).toBeNull();
  });
});

describe('TEMPLATE_ICONS', () => {
  it('should have icons for templates', () => {
    expect(Object.keys(TEMPLATE_ICONS).length).toBeGreaterThan(0);
  });

  it('should have icon for blank template', () => {
    expect(TEMPLATE_ICONS.blank).toBeDefined();
  });
});
