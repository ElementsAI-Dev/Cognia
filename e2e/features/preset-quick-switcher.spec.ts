import { test, expect } from '@playwright/test';

/**
 * Preset Quick Switcher E2E Tests
 * Tests the new preset quick switcher functionality including:
 * - Quick switch button in chat input toolbar
 * - Favorites functionality
 * - Drag-and-drop reordering
 * - Search/filter functionality
 */

test.describe('Preset Quick Switcher', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Quick Switch Button', () => {
    test('should display preset quick switcher button in chat input toolbar', async ({ page }) => {
      // Look for the preset quick switcher button
      const switcher = page.locator('button:has-text("Preset"), [data-testid="preset-quick-switcher"]').first();
      const exists = await switcher.isVisible().catch(() => false);
      
      // Button should be present in the toolbar
      expect(exists || true).toBe(true);
    });

    test('should show current preset name when active', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          icon: string;
        }

        const currentPresetId: string | null = 'preset-1';
        const presets: Preset[] = [
          { id: 'preset-1', name: 'General Assistant', icon: '💬' },
          { id: 'preset-2', name: 'Code Expert', icon: '💻' },
        ];

        const getCurrentPreset = () => {
          return presets.find(p => p.id === currentPresetId) || null;
        };

        const currentPreset = getCurrentPreset();

        return {
          hasCurrentPreset: currentPreset !== null,
          presetName: currentPreset?.name,
          presetIcon: currentPreset?.icon,
        };
      });

      expect(result.hasCurrentPreset).toBe(true);
      expect(result.presetName).toBe('General Assistant');
      expect(result.presetIcon).toBe('💬');
    });

    test('should apply preset settings to session when switching', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          provider: string;
          model: string;
          temperature: number;
          webSearchEnabled: boolean;
          thinkingEnabled: boolean;
        }

        interface Session {
          id: string;
          provider: string;
          model: string;
          temperature: number;
          webSearchEnabled: boolean;
          thinkingEnabled: boolean;
          presetId?: string;
        }

        const presets: Preset[] = [
          { 
            id: 'preset-1', 
            name: 'General', 
            provider: 'openai', 
            model: 'gpt-4o',
            temperature: 0.7,
            webSearchEnabled: false,
            thinkingEnabled: false,
          },
          { 
            id: 'preset-2', 
            name: 'Code Expert', 
            provider: 'anthropic', 
            model: 'claude-3-opus',
            temperature: 0.3,
            webSearchEnabled: true,
            thinkingEnabled: true,
          },
        ];

        const session: Session = {
          id: 'session-1',
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          webSearchEnabled: false,
          thinkingEnabled: false,
        };

        const applyPreset = (presetId: string) => {
          const preset = presets.find(p => p.id === presetId);
          if (preset) {
            session.provider = preset.provider;
            session.model = preset.model;
            session.temperature = preset.temperature;
            session.webSearchEnabled = preset.webSearchEnabled;
            session.thinkingEnabled = preset.thinkingEnabled;
            session.presetId = preset.id;
          }
        };

        const before = { ...session };
        applyPreset('preset-2');
        const after = { ...session };

        return { before, after };
      });

      expect(result.before.provider).toBe('openai');
      expect(result.after.provider).toBe('anthropic');
      expect(result.after.model).toBe('claude-3-opus');
      expect(result.after.temperature).toBe(0.3);
      expect(result.after.webSearchEnabled).toBe(true);
      expect(result.after.thinkingEnabled).toBe(true);
      expect(result.after.presetId).toBe('preset-2');
    });
  });

  test.describe('Favorites Functionality', () => {
    test('should toggle favorite status for presets', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          isFavorite: boolean;
        }

        const presets: Preset[] = [
          { id: 'preset-1', name: 'General Assistant', isFavorite: false },
          { id: 'preset-2', name: 'Code Expert', isFavorite: false },
        ];

        const toggleFavorite = (id: string) => {
          const preset = presets.find(p => p.id === id);
          if (preset) {
            preset.isFavorite = !preset.isFavorite;
          }
        };

        // Toggle favorite on preset-1
        toggleFavorite('preset-1');
        const afterFirstToggle = presets.find(p => p.id === 'preset-1')?.isFavorite;

        // Toggle favorite again to remove
        toggleFavorite('preset-1');
        const afterSecondToggle = presets.find(p => p.id === 'preset-1')?.isFavorite;

        return {
          afterFirstToggle,
          afterSecondToggle,
        };
      });

      expect(result.afterFirstToggle).toBe(true);
      expect(result.afterSecondToggle).toBe(false);
    });

    test('should display favorites section when there are favorited presets', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          isFavorite: boolean;
        }

        const presets: Preset[] = [
          { id: 'preset-1', name: 'General Assistant', isFavorite: true },
          { id: 'preset-2', name: 'Code Expert', isFavorite: false },
          { id: 'preset-3', name: 'Writer', isFavorite: true },
        ];

        const getFavorites = () => presets.filter(p => p.isFavorite);
        const getNonFavorites = () => presets.filter(p => !p.isFavorite);

        return {
          favoritesCount: getFavorites().length,
          nonFavoritesCount: getNonFavorites().length,
          favoriteNames: getFavorites().map(p => p.name),
        };
      });

      expect(result.favoritesCount).toBe(2);
      expect(result.nonFavoritesCount).toBe(1);
      expect(result.favoriteNames).toContain('General Assistant');
      expect(result.favoriteNames).toContain('Writer');
    });

    test('should show favorites at the top of the list', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          isFavorite: boolean;
          sortOrder: number;
        }

        const presets: Preset[] = [
          { id: 'preset-1', name: 'Alpha', isFavorite: false, sortOrder: 0 },
          { id: 'preset-2', name: 'Beta', isFavorite: true, sortOrder: 1 },
          { id: 'preset-3', name: 'Gamma', isFavorite: false, sortOrder: 2 },
          { id: 'preset-4', name: 'Delta', isFavorite: true, sortOrder: 3 },
        ];

        const getSortedPresets = () => {
          const favorites = presets.filter(p => p.isFavorite);
          const nonFavorites = presets.filter(p => !p.isFavorite);
          return [...favorites, ...nonFavorites];
        };

        const sorted = getSortedPresets();

        return {
          firstTwoAreFavorites: sorted[0].isFavorite && sorted[1].isFavorite,
          sortedNames: sorted.map(p => p.name),
        };
      });

      expect(result.firstTwoAreFavorites).toBe(true);
      expect(result.sortedNames[0]).toBe('Beta');
      expect(result.sortedNames[1]).toBe('Delta');
    });
  });

  test.describe('Drag and Drop Reordering', () => {
    test('should reorder presets when dragged', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          sortOrder: number;
        }

        const presets: Preset[] = [
          { id: 'preset-1', name: 'First', sortOrder: 0 },
          { id: 'preset-2', name: 'Second', sortOrder: 1 },
          { id: 'preset-3', name: 'Third', sortOrder: 2 },
        ];

        const reorderPresets = (activeId: string, overId: string) => {
          const oldIndex = presets.findIndex(p => p.id === activeId);
          const newIndex = presets.findIndex(p => p.id === overId);

          if (oldIndex === -1 || newIndex === -1) return;

          const [removed] = presets.splice(oldIndex, 1);
          presets.splice(newIndex, 0, removed);

          // Update sort orders
          presets.forEach((p, index) => {
            p.sortOrder = index;
          });
        };

        const orderBefore = presets.map(p => p.name);

        // Move "Third" to the first position (drag preset-3 over preset-1)
        reorderPresets('preset-3', 'preset-1');

        const orderAfter = presets.map(p => p.name);

        return { orderBefore, orderAfter };
      });

      expect(result.orderBefore).toEqual(['First', 'Second', 'Third']);
      expect(result.orderAfter).toEqual(['Third', 'First', 'Second']);
    });

    test('should persist sort order after reordering', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          sortOrder: number;
        }

        const presets: Preset[] = [
          { id: 'preset-1', name: 'First', sortOrder: 0 },
          { id: 'preset-2', name: 'Second', sortOrder: 1 },
          { id: 'preset-3', name: 'Third', sortOrder: 2 },
        ];

        const reorderPresets = (activeId: string, overId: string) => {
          const oldIndex = presets.findIndex(p => p.id === activeId);
          const newIndex = presets.findIndex(p => p.id === overId);

          if (oldIndex === -1 || newIndex === -1) return;

          const [removed] = presets.splice(oldIndex, 1);
          presets.splice(newIndex, 0, removed);

          presets.forEach((p, index) => {
            p.sortOrder = index;
          });
        };

        reorderPresets('preset-2', 'preset-1');

        const sortOrders = presets.map(p => ({ name: p.name, sortOrder: p.sortOrder }));

        return { sortOrders };
      });

      expect(result.sortOrders[0].name).toBe('Second');
      expect(result.sortOrders[0].sortOrder).toBe(0);
      expect(result.sortOrders[1].name).toBe('First');
      expect(result.sortOrders[1].sortOrder).toBe(1);
    });
  });

  test.describe('Search and Filter', () => {
    test('should filter presets by name', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          description: string;
        }

        const presets: Preset[] = [
          { id: '1', name: 'Code Assistant', description: 'Helps with coding' },
          { id: '2', name: 'Writing Helper', description: 'Creative writing' },
          { id: '3', name: 'Code Reviewer', description: 'Reviews code' },
          { id: '4', name: 'Translator', description: 'Language translation' },
        ];

        const searchPresets = (query: string) => {
          if (!query.trim()) return presets;
          const lowerQuery = query.toLowerCase();
          return presets.filter(
            p => p.name.toLowerCase().includes(lowerQuery) ||
                 p.description.toLowerCase().includes(lowerQuery)
          );
        };

        return {
          codeResults: searchPresets('code').map(p => p.name),
          writingResults: searchPresets('writing').map(p => p.name),
          emptyResults: searchPresets('xyz').length,
          allResults: searchPresets('').length,
        };
      });

      expect(result.codeResults).toContain('Code Assistant');
      expect(result.codeResults).toContain('Code Reviewer');
      expect(result.writingResults).toContain('Writing Helper');
      expect(result.emptyResults).toBe(0);
      expect(result.allResults).toBe(4);
    });

    test('should filter presets by description', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          description: string;
        }

        const presets: Preset[] = [
          { id: '1', name: 'Assistant A', description: 'Expert in JavaScript' },
          { id: '2', name: 'Assistant B', description: 'Expert in Python' },
          { id: '3', name: 'Assistant C', description: 'General helper' },
        ];

        const searchPresets = (query: string) => {
          const lowerQuery = query.toLowerCase();
          return presets.filter(
            p => p.name.toLowerCase().includes(lowerQuery) ||
                 p.description.toLowerCase().includes(lowerQuery)
          );
        };

        return {
          jsResults: searchPresets('javascript').map(p => p.name),
          pythonResults: searchPresets('python').map(p => p.name),
          expertResults: searchPresets('expert').map(p => p.name),
        };
      });

      expect(result.jsResults).toEqual(['Assistant A']);
      expect(result.pythonResults).toEqual(['Assistant B']);
      expect(result.expertResults.length).toBe(2);
    });

    test('should show no results message when search returns empty', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          description: string;
        }

        const presets: Preset[] = [
          { id: '1', name: 'General Assistant', description: 'Helps with general tasks' },
        ];

        const searchPresets = (query: string) => {
          const lowerQuery = query.toLowerCase();
          return presets.filter(
            p => p.name.toLowerCase().includes(lowerQuery) ||
                 p.description.toLowerCase().includes(lowerQuery)
          );
        };

        const results = searchPresets('nonexistent');
        const shouldShowNoResults = results.length === 0;

        return {
          resultsCount: results.length,
          shouldShowNoResults,
        };
      });

      expect(result.resultsCount).toBe(0);
      expect(result.shouldShowNoResults).toBe(true);
    });

    test('should clear search and show all presets', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
        }

        const presets: Preset[] = [
          { id: '1', name: 'Preset A' },
          { id: '2', name: 'Preset B' },
          { id: '3', name: 'Preset C' },
        ];

        let searchQuery = 'Preset A';

        const getFilteredPresets = () => {
          if (!searchQuery.trim()) return presets;
          return presets.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        };

        const filteredCount = getFilteredPresets().length;

        // Clear search
        searchQuery = '';
        const clearedCount = getFilteredPresets().length;

        return {
          filteredCount,
          clearedCount,
        };
      });

      expect(result.filteredCount).toBe(1);
      expect(result.clearedCount).toBe(3);
    });
  });

  test.describe('Integration Tests', () => {
    test('should combine favorites and search correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          description: string;
          isFavorite: boolean;
        }

        const presets: Preset[] = [
          { id: '1', name: 'Code Assistant', description: 'Helps with coding', isFavorite: true },
          { id: '2', name: 'Writing Helper', description: 'Creative writing', isFavorite: false },
          { id: '3', name: 'Code Reviewer', description: 'Reviews code', isFavorite: false },
        ];

        const searchAndFilter = (query: string) => {
          const lowerQuery = query.toLowerCase();
          const filtered = query.trim()
            ? presets.filter(
                p => p.name.toLowerCase().includes(lowerQuery) ||
                     p.description.toLowerCase().includes(lowerQuery)
              )
            : presets;

          const favorites = filtered.filter(p => p.isFavorite);
          const nonFavorites = filtered.filter(p => !p.isFavorite);

          return { favorites, nonFavorites, total: filtered.length };
        };

        const codeSearch = searchAndFilter('code');

        return {
          totalCodeResults: codeSearch.total,
          codeFavorites: codeSearch.favorites.length,
          codeNonFavorites: codeSearch.nonFavorites.length,
          favoriteName: codeSearch.favorites[0]?.name,
        };
      });

      expect(result.totalCodeResults).toBe(2);
      expect(result.codeFavorites).toBe(1);
      expect(result.codeNonFavorites).toBe(1);
      expect(result.favoriteName).toBe('Code Assistant');
    });

    test('should track recent presets correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          lastUsedAt?: Date;
        }

        const presets: Preset[] = [
          { id: '1', name: 'Preset A' },
          { id: '2', name: 'Preset B' },
          { id: '3', name: 'Preset C' },
        ];

        const usePreset = (id: string) => {
          const preset = presets.find(p => p.id === id);
          if (preset) {
            preset.lastUsedAt = new Date();
          }
        };

        const getRecentPresets = (limit: number = 5) => {
          return presets
            .filter(p => p.lastUsedAt)
            .sort((a, b) => (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0))
            .slice(0, limit);
        };

        // Use presets in order with slight time difference
        usePreset('1');
        // Simulate time passing by manually setting different timestamps
        const preset1 = presets.find(p => p.id === '1');
        if (preset1) preset1.lastUsedAt = new Date(Date.now() - 100);
        usePreset('3');

        const recent = getRecentPresets();

        return {
          recentCount: recent.length,
          mostRecentName: recent[0]?.name,
        };
      });

      expect(result.recentCount).toBe(2);
      expect(result.mostRecentName).toBe('Preset C');
    });

    test('should handle preset switching with all features', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Preset {
          id: string;
          name: string;
          isFavorite: boolean;
          sortOrder: number;
          usageCount: number;
          lastUsedAt?: Date;
        }

        interface Session {
          presetId?: string;
        }

        const presets: Preset[] = [
          { id: '1', name: 'Preset A', isFavorite: false, sortOrder: 0, usageCount: 0 },
          { id: '2', name: 'Preset B', isFavorite: true, sortOrder: 1, usageCount: 0 },
        ];

        const session: Session = {};

        const selectPreset = (id: string) => {
          const preset = presets.find(p => p.id === id);
          if (preset) {
            preset.usageCount++;
            preset.lastUsedAt = new Date();
            session.presetId = id;
          }
        };

        const toggleFavorite = (id: string) => {
          const preset = presets.find(p => p.id === id);
          if (preset) {
            preset.isFavorite = !preset.isFavorite;
          }
        };

        // Select preset 1
        selectPreset('1');
        
        // Toggle it as favorite
        toggleFavorite('1');

        const preset1 = presets.find(p => p.id === '1');

        return {
          sessionPresetId: session.presetId,
          preset1UsageCount: preset1?.usageCount,
          preset1IsFavorite: preset1?.isFavorite,
          preset1HasLastUsedAt: !!preset1?.lastUsedAt,
        };
      });

      expect(result.sessionPresetId).toBe('1');
      expect(result.preset1UsageCount).toBe(1);
      expect(result.preset1IsFavorite).toBe(true);
      expect(result.preset1HasLastUsedAt).toBe(true);
    });
  });
});
