/**
 * @jest-environment jsdom
 */

import {
  isInsideImportPath,
  isInsideClassAttribute,
  isInsideJSXTag,
  NPM_PACKAGES,
  PROJECT_PATHS,
  SHADCN_COMPONENTS,
  TAILWIND_CLASSES,
  ALL_TAILWIND_CLASSES,
  JSX_ATTRIBUTES,
} from './completion-providers';

describe('completion-providers', () => {
  describe('isInsideImportPath', () => {
    it('should detect import from single quotes', () => {
      const result = isInsideImportPath("import { useState } from 'react", 32);
      expect(result.isImport).toBe(true);
      expect(result.currentPath).toBe('react');
    });

    it('should detect import from double quotes', () => {
      const result = isInsideImportPath('import { useState } from "react', 32);
      expect(result.isImport).toBe(true);
      expect(result.currentPath).toBe('react');
    });

    it('should detect partial path', () => {
      const result = isInsideImportPath("import { Button } from '@/components/ui/", 42);
      expect(result.isImport).toBe(true);
      expect(result.currentPath).toBe('@/components/ui/');
    });

    it('should detect empty path', () => {
      const result = isInsideImportPath("import { useState } from '", 27);
      expect(result.isImport).toBe(true);
      expect(result.currentPath).toBe('');
    });

    it('should detect require path', () => {
      const result = isInsideImportPath("const fs = require('fs", 23);
      expect(result.isImport).toBe(true);
      expect(result.currentPath).toBe('fs');
    });

    it('should not detect non-import lines', () => {
      const result = isInsideImportPath("const x = 'hello'", 18);
      expect(result.isImport).toBe(false);
    });

    it('should not detect outside quotes', () => {
      const result = isInsideImportPath("import { useState } from 'react'", 5);
      expect(result.isImport).toBe(false);
    });
  });

  describe('isInsideClassAttribute', () => {
    it('should detect className with double quotes', () => {
      expect(isInsideClassAttribute('className="flex items-center', 30)).toBe(true);
    });

    it('should detect className with single quotes', () => {
      expect(isInsideClassAttribute("className='flex items-center", 30)).toBe(true);
    });

    it('should detect class attribute', () => {
      expect(isInsideClassAttribute('class="flex items-center', 26)).toBe(true);
    });

    it('should detect cn() utility', () => {
      expect(isInsideClassAttribute('cn("flex items-center', 22)).toBe(true);
    });

    it('should detect clsx() utility', () => {
      expect(isInsideClassAttribute('clsx("flex items-center', 24)).toBe(true);
    });

    it('should detect twMerge() utility', () => {
      expect(isInsideClassAttribute('twMerge("flex items-center', 28)).toBe(true);
    });

    it('should not detect outside className', () => {
      expect(isInsideClassAttribute('const x = "hello"', 18)).toBe(false);
    });

    it('should not detect after closing quote', () => {
      expect(isInsideClassAttribute('className="flex" onClick', 24)).toBe(false);
    });
  });

  describe('isInsideJSXTag', () => {
    it('should detect inside opening tag', () => {
      expect(isInsideJSXTag('<Button ', 9)).toBe(true);
    });

    it('should detect after attribute', () => {
      expect(isInsideJSXTag('<Button variant="default" ', 27)).toBe(true);
    });

    it('should not detect outside tag', () => {
      expect(isInsideJSXTag('const x = 5;', 13)).toBe(false);
    });

    it('should not detect after closing tag', () => {
      expect(isInsideJSXTag('<Button> some text', 18)).toBe(false);
    });

    it('should not detect inside attribute value', () => {
      expect(isInsideJSXTag('<Button variant="def', 21)).toBe(false);
    });
  });

  describe('NPM_PACKAGES', () => {
    it('should contain common packages', () => {
      const names = NPM_PACKAGES.map(p => p.name);
      expect(names).toContain('react');
      expect(names).toContain('next/link');
      expect(names).toContain('zustand');
      expect(names).toContain('ai');
      expect(names).toContain('zod');
    });

    it('should have descriptions for all packages', () => {
      for (const pkg of NPM_PACKAGES) {
        expect(pkg.description).toBeTruthy();
      }
    });

    it('should have exports for react', () => {
      const react = NPM_PACKAGES.find(p => p.name === 'react');
      expect(react?.exports).toContain('useState');
      expect(react?.exports).toContain('useEffect');
      expect(react?.exports).toContain('use');
    });
  });

  describe('PROJECT_PATHS', () => {
    it('should contain standard project paths', () => {
      const paths = PROJECT_PATHS.map(p => p.path);
      expect(paths).toContain('@/components/');
      expect(paths).toContain('@/components/ui/');
      expect(paths).toContain('@/hooks/');
      expect(paths).toContain('@/lib/');
      expect(paths).toContain('@/stores/');
      expect(paths).toContain('@/types/');
    });
  });

  describe('SHADCN_COMPONENTS', () => {
    it('should contain common components', () => {
      const names = SHADCN_COMPONENTS.map(c => c.name);
      expect(names).toContain('button');
      expect(names).toContain('input');
      expect(names).toContain('dialog');
      expect(names).toContain('card');
      expect(names).toContain('select');
    });

    it('should have exports for each component', () => {
      for (const comp of SHADCN_COMPONENTS) {
        expect(comp.exports.length).toBeGreaterThan(0);
      }
    });

    it('should have Button in button exports', () => {
      const button = SHADCN_COMPONENTS.find(c => c.name === 'button');
      expect(button?.exports).toContain('Button');
    });
  });

  describe('TAILWIND_CLASSES', () => {
    it('should have multiple categories', () => {
      expect(Object.keys(TAILWIND_CLASSES).length).toBeGreaterThan(20);
    });

    it('should contain display classes', () => {
      expect(TAILWIND_CLASSES.display.classes).toContain('flex');
      expect(TAILWIND_CLASSES.display.classes).toContain('grid');
      expect(TAILWIND_CLASSES.display.classes).toContain('hidden');
    });

    it('should contain padding classes', () => {
      expect(TAILWIND_CLASSES.padding.classes).toContain('p-4');
      expect(TAILWIND_CLASSES.padding.classes).toContain('px-2');
    });
  });

  describe('ALL_TAILWIND_CLASSES', () => {
    it('should be a flat array of all classes', () => {
      expect(ALL_TAILWIND_CLASSES.length).toBeGreaterThan(100);
      expect(ALL_TAILWIND_CLASSES[0]).toHaveProperty('className');
      expect(ALL_TAILWIND_CLASSES[0]).toHaveProperty('category');
    });
  });

  describe('JSX_ATTRIBUTES', () => {
    it('should contain common attributes', () => {
      const names = JSX_ATTRIBUTES.map(a => a.name);
      expect(names).toContain('onClick');
      expect(names).toContain('onChange');
      expect(names).toContain('className');
      expect(names).toContain('style');
      expect(names).toContain('ref');
      expect(names).toContain('key');
    });

    it('should contain accessibility attributes', () => {
      const names = JSX_ATTRIBUTES.map(a => a.name);
      expect(names).toContain('aria-label');
      expect(names).toContain('role');
      expect(names).toContain('tabIndex');
    });

    it('should have value snippets for event handlers', () => {
      const onClick = JSX_ATTRIBUTES.find(a => a.name === 'onClick');
      expect(onClick?.valueSnippet).toBeTruthy();
      expect(onClick?.valueSnippet).toContain('=>');
    });
  });
});
