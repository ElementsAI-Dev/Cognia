/**
 * Tests for Tailwind Configuration
 */

import {
  CSS_VARIABLES,
  BASE_STYLES,
  TAILWIND_CDN_SCRIPT,
  TAILWIND_CONFIG,
  generateSandpackStyles,
  getTailwindExternalResources,
  generateStyleInjectionScript,
} from './tailwind-config';

describe('CSS_VARIABLES', () => {
  it('should contain root variables', () => {
    expect(CSS_VARIABLES).toContain(':root');
    expect(CSS_VARIABLES).toContain('--background');
    expect(CSS_VARIABLES).toContain('--foreground');
    expect(CSS_VARIABLES).toContain('--primary');
  });

  it('should contain dark mode variables', () => {
    expect(CSS_VARIABLES).toContain('.dark');
  });
});

describe('BASE_STYLES', () => {
  it('should include CSS variables', () => {
    expect(BASE_STYLES).toContain(':root');
  });

  it('should include body styles', () => {
    expect(BASE_STYLES).toContain('body');
    expect(BASE_STYLES).toContain('background-color');
  });

  it('should include utility classes', () => {
    expect(BASE_STYLES).toContain('.bg-background');
    expect(BASE_STYLES).toContain('.text-foreground');
  });
});

describe('TAILWIND_CDN_SCRIPT', () => {
  it('should be a valid CDN URL', () => {
    expect(TAILWIND_CDN_SCRIPT).toContain('tailwindcss.com');
  });
});

describe('TAILWIND_CONFIG', () => {
  it('should contain tailwind.config', () => {
    expect(TAILWIND_CONFIG).toContain('tailwind.config');
  });

  it('should configure dark mode', () => {
    expect(TAILWIND_CONFIG).toContain("darkMode: 'class'");
  });

  it('should extend colors', () => {
    expect(TAILWIND_CONFIG).toContain('colors:');
    expect(TAILWIND_CONFIG).toContain('primary');
    expect(TAILWIND_CONFIG).toContain('secondary');
  });

  it('should configure border radius', () => {
    expect(TAILWIND_CONFIG).toContain('borderRadius');
  });
});

describe('generateSandpackStyles', () => {
  it('should include CSS variables', () => {
    const styles = generateSandpackStyles();
    expect(styles).toContain(':root');
    expect(styles).toContain('--background');
  });

  it('should include base styles', () => {
    const styles = generateSandpackStyles();
    expect(styles).toContain('body');
    expect(styles).toContain('@apply bg-background');
  });

  it('should include component layer', () => {
    const styles = generateSandpackStyles();
    expect(styles).toContain('@layer components');
    expect(styles).toContain('.card');
    expect(styles).toContain('.btn');
  });

  it('should apply dark mode when specified', () => {
    const styles = generateSandpackStyles(true);
    expect(styles).toContain('@apply dark');
  });

  it('should not apply dark mode by default', () => {
    const styles = generateSandpackStyles(false);
    expect(styles).not.toContain('@apply dark');
  });
});

describe('getTailwindExternalResources', () => {
  it('should return array with CDN URL', () => {
    const resources = getTailwindExternalResources();
    expect(Array.isArray(resources)).toBe(true);
    expect(resources).toContain(TAILWIND_CDN_SCRIPT);
  });
});

describe('generateStyleInjectionScript', () => {
  it('should include tailwind config', () => {
    const script = generateStyleInjectionScript();
    expect(script).toContain('tailwind.config');
  });

  it('should add dark class when isDark is true', () => {
    const script = generateStyleInjectionScript(true);
    expect(script).toContain("classList.add('dark')");
  });

  it('should remove dark class when isDark is false', () => {
    const script = generateStyleInjectionScript(false);
    expect(script).toContain("classList.remove('dark')");
  });

  it('should be wrapped in IIFE', () => {
    const script = generateStyleInjectionScript();
    expect(script).toContain('(function()');
    expect(script).toContain('})()');
  });
});
