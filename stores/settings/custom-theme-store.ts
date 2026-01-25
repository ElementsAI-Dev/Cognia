/**
 * Custom Syntax Theme Store
 * Manages user-defined syntax highlighting themes for export
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SyntaxTheme } from '@/lib/export/syntax-themes';

export interface CustomSyntaxTheme extends SyntaxTheme {
  id: string;
  isCustom: true;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomThemeState {
  customThemes: CustomSyntaxTheme[];
  selectedCustomThemeId: string | null;

  // Actions
  addTheme: (
    theme: Omit<CustomSyntaxTheme, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'>
  ) => string;
  updateTheme: (
    id: string,
    updates: Partial<Omit<CustomSyntaxTheme, 'id' | 'isCustom' | 'createdAt'>>
  ) => void;
  deleteTheme: (id: string) => void;
  duplicateTheme: (id: string, newName: string) => string | null;
  getTheme: (id: string) => CustomSyntaxTheme | undefined;
  selectTheme: (id: string | null) => void;
  exportTheme: (id: string) => string | null;
  importTheme: (json: string) => { success: boolean; error?: string; themeId?: string };
}

function generateThemeId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useCustomThemeStore = create<CustomThemeState>()(
  persist(
    (set, get) => ({
      customThemes: [],
      selectedCustomThemeId: null,

      addTheme: (themeData) => {
        const id = generateThemeId();
        const now = new Date();
        const newTheme: CustomSyntaxTheme = {
          ...themeData,
          id,
          isCustom: true,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          customThemes: [...state.customThemes, newTheme],
        }));

        return id;
      },

      updateTheme: (id, updates) => {
        set((state) => ({
          customThemes: state.customThemes.map((theme) =>
            theme.id === id ? { ...theme, ...updates, updatedAt: new Date() } : theme
          ),
        }));
      },

      deleteTheme: (id) => {
        set((state) => ({
          customThemes: state.customThemes.filter((theme) => theme.id !== id),
          selectedCustomThemeId:
            state.selectedCustomThemeId === id ? null : state.selectedCustomThemeId,
        }));
      },

      duplicateTheme: (id, newName) => {
        const theme = get().customThemes.find((t) => t.id === id);
        if (!theme) return null;

        const newId = generateThemeId();
        const now = new Date();
        const duplicatedTheme: CustomSyntaxTheme = {
          ...theme,
          id: newId,
          name: newName,
          displayName: newName,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          customThemes: [...state.customThemes, duplicatedTheme],
        }));

        return newId;
      },

      getTheme: (id) => {
        return get().customThemes.find((theme) => theme.id === id);
      },

      selectTheme: (id) => {
        set({ selectedCustomThemeId: id });
      },

      exportTheme: (id) => {
        const theme = get().customThemes.find((t) => t.id === id);
        if (!theme) return null;

        const exportData = {
          name: theme.name,
          displayName: theme.displayName,
          isDark: theme.isDark,
          colors: theme.colors,
          exportedAt: new Date().toISOString(),
          version: '1.0',
        };

        return JSON.stringify(exportData, null, 2);
      },

      importTheme: (json) => {
        try {
          const data = JSON.parse(json);

          // Validate required fields
          if (!data.name || !data.displayName || !data.colors) {
            return { success: false, error: 'Invalid theme format: missing required fields' };
          }

          // Validate colors
          const requiredColors = [
            'background',
            'foreground',
            'comment',
            'keyword',
            'string',
            'number',
            'function',
            'operator',
            'property',
            'className',
            'constant',
            'tag',
            'attrName',
            'attrValue',
            'punctuation',
            'selection',
            'lineHighlight',
          ];

          for (const color of requiredColors) {
            if (!data.colors[color]) {
              return { success: false, error: `Invalid theme format: missing color "${color}"` };
            }
          }

          const themeId = get().addTheme({
            name: data.name,
            displayName: data.displayName,
            isDark: data.isDark ?? true,
            colors: data.colors,
          });

          return { success: true, themeId };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse theme JSON',
          };
        }
      },
    }),
    {
      name: 'cognia-custom-themes',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        customThemes: state.customThemes,
        selectedCustomThemeId: state.selectedCustomThemeId,
      }),
    }
  )
);

/**
 * Create a default custom theme template
 */
export function createDefaultThemeTemplate(
  name: string,
  basedOnDark: boolean = true
): Omit<CustomSyntaxTheme, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'> {
  return {
    name: name.toLowerCase().replace(/\s+/g, '-'),
    displayName: name,
    isDark: basedOnDark,
    colors: basedOnDark
      ? {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          comment: '#6a9955',
          keyword: '#569cd6',
          string: '#ce9178',
          number: '#b5cea8',
          function: '#dcdcaa',
          operator: '#d4d4d4',
          property: '#9cdcfe',
          className: '#4ec9b0',
          constant: '#4fc1ff',
          tag: '#569cd6',
          attrName: '#9cdcfe',
          attrValue: '#ce9178',
          punctuation: '#d4d4d4',
          selection: 'rgba(38, 79, 120, 0.8)',
          lineHighlight: '#282828',
        }
      : {
          background: '#ffffff',
          foreground: '#24292f',
          comment: '#6e7781',
          keyword: '#cf222e',
          string: '#0a3069',
          number: '#0550ae',
          function: '#8250df',
          operator: '#24292f',
          property: '#953800',
          className: '#953800',
          constant: '#0550ae',
          tag: '#116329',
          attrName: '#0550ae',
          attrValue: '#0a3069',
          punctuation: '#24292f',
          selection: 'rgba(33, 136, 255, 0.15)',
          lineHighlight: '#f6f8fa',
        },
  };
}

export default useCustomThemeStore;
