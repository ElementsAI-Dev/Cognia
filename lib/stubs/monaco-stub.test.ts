/**
 * Tests for monaco-stub.ts
 * Browser stub for monaco-editor
 */

import { editor, KeyMod, KeyCode, languages } from './monaco-stub';

describe('monaco-stub', () => {
  describe('editor', () => {
    beforeEach(() => {
      jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('create', () => {
      it('should log warning when called', () => {
        const container = document.createElement('div');
        editor.create(container);

        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('monaco-editor direct import is not available')
        );
      });

      it('should return editor mock object', () => {
        const container = document.createElement('div');
        const instance = editor.create(container, {});

        expect(instance.getValue).toBeDefined();
        expect(instance.setValue).toBeDefined();
        expect(instance.dispose).toBeDefined();
        expect(instance.onDidChangeModelContent).toBeDefined();
        expect(instance.addCommand).toBeDefined();
      });

      it('should return empty string from getValue', () => {
        const container = document.createElement('div');
        const instance = editor.create(container);

        expect(instance.getValue()).toBe('');
      });

      it('should have no-op setValue', () => {
        const container = document.createElement('div');
        const instance = editor.create(container);

        expect(() => instance.setValue('test')).not.toThrow();
      });

      it('should have no-op dispose', () => {
        const container = document.createElement('div');
        const instance = editor.create(container);

        expect(() => instance.dispose()).not.toThrow();
      });

      it('should return disposable from onDidChangeModelContent', () => {
        const container = document.createElement('div');
        const instance = editor.create(container);
        const callback = jest.fn();

        const disposable = instance.onDidChangeModelContent(callback);

        expect(disposable.dispose).toBeDefined();
        expect(() => disposable.dispose()).not.toThrow();
      });

      it('should return empty string from addCommand', () => {
        const container = document.createElement('div');
        const instance = editor.create(container);

        const result = instance.addCommand(KeyMod.CtrlCmd, () => {});

        expect(result).toBe('');
      });
    });

    describe('setTheme', () => {
      it('should be a no-op', () => {
        expect(() => editor.setTheme('vs-dark')).not.toThrow();
      });
    });

    describe('defineTheme', () => {
      it('should be a no-op', () => {
        expect(() => editor.defineTheme('custom', {})).not.toThrow();
      });
    });
  });

  describe('KeyMod', () => {
    it('should export key modifier constants', () => {
      expect(KeyMod.CtrlCmd).toBe(2048);
      expect(KeyMod.Shift).toBe(1024);
      expect(KeyMod.Alt).toBe(512);
      expect(KeyMod.WinCtrl).toBe(256);
    });
  });

  describe('KeyCode', () => {
    it('should export key code constants', () => {
      expect(KeyCode.KeyS).toBe(49);
      expect(KeyCode.KeyZ).toBe(56);
      expect(KeyCode.KeyY).toBe(55);
    });
  });

  describe('languages', () => {
    describe('register', () => {
      it('should be a no-op', () => {
        expect(() => languages.register({ id: 'test' })).not.toThrow();
      });
    });

    describe('setMonarchTokensProvider', () => {
      it('should be a no-op', () => {
        expect(() => languages.setMonarchTokensProvider('test', {})).not.toThrow();
      });
    });

    describe('registerCompletionItemProvider', () => {
      it('should return disposable', () => {
        const disposable = languages.registerCompletionItemProvider('test', {});

        expect(disposable.dispose).toBeDefined();
        expect(() => disposable.dispose()).not.toThrow();
      });
    });
  });
});
