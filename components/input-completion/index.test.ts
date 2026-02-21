/**
 * @jest-environment jsdom
 */

import { CompletionOverlay, CompletionSettings } from './index';

 
const indexModule = require('./index');
 
const completionOverlayModule = require('./completion-overlay');
 
const completionSettingsModule = require('./completion-settings');

// Mock the dependencies for the components
jest.mock('@/hooks/input-completion', () => ({
  useInputCompletion: () => ({
    currentSuggestion: null,
    config: {
      enabled: true,
      model: {
        provider: 'ollama',
        model_id: 'qwen2.5-coder:0.5b',
        max_tokens: 128,
        temperature: 0.1,
        timeout_secs: 5,
      },
      trigger: {
        debounce_ms: 400,
        min_context_length: 5,
        max_context_length: 500,
        trigger_on_word_boundary: false,
        skip_chars: [' ', '\n', '\t', '\r'],
        skip_with_modifiers: true,
      },
      ui: {
        show_inline_preview: true,
        max_suggestions: 1,
        font_size: 14,
        ghost_text_opacity: 0.5,
        auto_dismiss_ms: 5000,
        show_accept_hint: true,
      },
    },
    accept: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

// Mock framer-motion for CompletionOverlay
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
  },
  AnimatePresence: 'div',
}));

// Mock UI components for CompletionSettings
jest.mock('@/components/ui/card', () => ({}));
jest.mock('@/components/ui/label', () => ({}));
jest.mock('@/components/ui/switch', () => ({}));
jest.mock('@/components/ui/slider', () => ({}));
jest.mock('@/components/ui/select', () => ({}));
jest.mock('@/components/ui/input', () => ({}));
jest.mock('@/components/ui/button', () => ({}));

describe('components/input-completion/index', () => {
  describe('Module Exports', () => {
    it('should export CompletionOverlay component', () => {
      expect(CompletionOverlay).toBeDefined();
      expect(typeof CompletionOverlay).toBe('function');
    });

    it('should export CompletionSettings component', () => {
      expect(CompletionSettings).toBeDefined();
      expect(typeof CompletionSettings).toBe('function');
    });

    it('should export exactly 2 items', () => {
      const exports = Object.keys(indexModule);
      expect(exports.length).toBe(2);
      expect(exports).toContain('CompletionOverlay');
      expect(exports).toContain('CompletionSettings');
    });

    it('should export CompletionOverlay as named export', () => {
      expect(indexModule.CompletionOverlay).toBe(CompletionOverlay);
    });

    it('should export CompletionSettings as named export', () => {
      expect(indexModule.CompletionSettings).toBe(CompletionSettings);
    });

    it('should not have default export', () => {
      expect(indexModule.default).toBeUndefined();
    });
  });

  describe('CompletionOverlay Export', () => {
    it('should be the same as importing directly from the file', () => {
      const directImport = completionOverlayModule.CompletionOverlay;
      expect(CompletionOverlay).toBe(directImport);
    });
  });

  describe('CompletionSettings Export', () => {
    it('should be the same as importing directly from the file', () => {
      const directImport = completionSettingsModule.CompletionSettings;
      expect(CompletionSettings).toBe(directImport);
    });
  });

  describe('Import Patterns', () => {
    it('should support named import', () => {
      expect(() => {
         
        require('./index');
      }).not.toThrow();
    });

    it('should support destructuring import', () => {
       
      const { CompletionOverlay: Overlay, CompletionSettings: Settings } = require('./index');
      expect(Overlay).toBeDefined();
      expect(Settings).toBeDefined();
    });

    it('should allow importing both components together', () => {
       
      const { CompletionOverlay: Overlay, CompletionSettings: Settings } = require('./index');
      expect(Overlay).toBe(CompletionOverlay);
      expect(Settings).toBe(CompletionSettings);
    });
  });

  describe('Export Consistency', () => {
    it('should export components with consistent names', () => {
      const exports = Object.keys(indexModule);
      expect(exports).toEqual(expect.arrayContaining(['CompletionOverlay', 'CompletionSettings']));
    });
  });

  describe('Barrel File Pattern', () => {
    it('should re-export from component files', () => {
      const { CompletionOverlay: Overlay } = indexModule;
      expect(Overlay).toBeDefined();

      const { CompletionSettings: Settings } = indexModule;
      expect(Settings).toBeDefined();
    });

    it('should not modify the exported components', () => {
      const directOverlay = completionOverlayModule.CompletionOverlay;
      const directSettings = completionSettingsModule.CompletionSettings;

      expect(CompletionOverlay).toBe(directOverlay);
      expect(CompletionSettings).toBe(directSettings);
    });
  });

  describe('Type Safety', () => {
    it('should export components that are React components', () => {
      expect(typeof CompletionOverlay).toBe('function');
      expect(typeof CompletionSettings).toBe('function');
    });
  });

  describe('Module Loading', () => {
    it('should not throw errors when importing the index', () => {
      expect(() => {
         
        require('./index');
      }).not.toThrow();
    });

    it('should not have circular dependencies', () => {
      expect(() => {
        const { CompletionOverlay: Overlay, CompletionSettings: Settings } = indexModule;
        expect(Overlay).toBeDefined();
        expect(Settings).toBeDefined();
      }).not.toThrow();
    });

    it('should load all dependencies correctly', () => {
      expect(CompletionOverlay).toBeDefined();
      expect(CompletionSettings).toBeDefined();
    });
  });

  describe('Export Completeness', () => {
    it('should export all components from the directory', () => {
      const exports = Object.keys(indexModule);
      const expectedExports = ['CompletionOverlay', 'CompletionSettings'];

      expect(exports.sort()).toEqual(expectedExports.sort());
    });

    it('should not have unused exports', () => {
      const exports = Object.keys(indexModule);
      exports.forEach((exportName) => {
        expect(indexModule[exportName]).toBeDefined();
      });
    });
  });

  describe('Named vs Default Exports', () => {
    it('should use named exports (not default)', () => {
      expect(indexModule.default).toBeUndefined();
    });

    it('should allow named imports', () => {
      expect(() => {
        const { CompletionOverlay: Overlay, CompletionSettings: Settings } = indexModule;
        expect(Overlay).toBeDefined();
        expect(Settings).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Integration with Component Files', () => {
    it('should re-export CompletionOverlay with its props interface', () => {
      expect(CompletionOverlay).toBeDefined();
    });

    it('should re-export CompletionSettings with its props interface', () => {
      expect(CompletionSettings).toBeDefined();
    });
  });
});
