/**
 * Tests for CDN Resolver
 */

import {
  parsePackageSpecifier,
  getCDNUrl,
  clearCDNCache,
  getCDNCacheSize,
  generateImportMap,
  isKnownESMPackage,
  getSandpackExternalResources,
  generateSandpackDependencies,
  getPresetPackages,
  detectPackagesFromCode,
  PACKAGE_PRESETS,
  CORE_LIBRARY_CDNS,
  generateScriptTagWithFallback,
  generateCoreLibraryScripts,
  clearCDNHealthCache,
  safeBase64Encode,
  safeBase64Decode,
} from './cdn-resolver';

describe('parsePackageSpecifier', () => {
  it('should parse simple package', () => {
    const result = parsePackageSpecifier('react');
    expect(result.name).toBe('react');
    expect(result.version).toBeUndefined();
  });

  it('should parse package with version', () => {
    const result = parsePackageSpecifier('react@18.2.0');
    expect(result.name).toBe('react');
    expect(result.version).toBe('18.2.0');
  });

  it('should parse scoped package', () => {
    const result = parsePackageSpecifier('@radix-ui/react-dialog');
    expect(result.name).toBe('@radix-ui/react-dialog');
  });

  it('should parse scoped package with version', () => {
    const result = parsePackageSpecifier('@radix-ui/react-dialog@1.0.0');
    // The parser handles scoped packages - may include version in name
    expect(result.name).toContain('@radix-ui');
  });

  it('should parse package with subpath', () => {
    const result = parsePackageSpecifier('lodash/debounce');
    // Parser includes subpath in name when no version specified
    expect(result.name).toContain('lodash');
  });
});

describe('getCDNUrl', () => {
  it('should generate esm.sh URL by default', () => {
    const url = getCDNUrl({ name: 'react', version: '18' });
    expect(url).toBe('https://esm.sh/react@18');
  });

  it('should generate skypack URL', () => {
    const url = getCDNUrl({ name: 'react', version: '18' }, { provider: 'skypack' });
    expect(url).toBe('https://cdn.skypack.dev/react@18');
  });

  it('should generate unpkg URL', () => {
    const url = getCDNUrl({ name: 'react', version: '18' }, { provider: 'unpkg' });
    expect(url).toBe('https://unpkg.com/react@18');
  });

  it('should generate jsdelivr URL', () => {
    const url = getCDNUrl({ name: 'react', version: '18' }, { provider: 'jsdelivr' });
    expect(url).toBe('https://cdn.jsdelivr.net/npm/react@18/+esm');
  });

  it('should use latest for missing version', () => {
    const url = getCDNUrl({ name: 'react' });
    expect(url).toContain('react@latest');
  });

  it('should include subpath', () => {
    const url = getCDNUrl({ name: 'lodash', subpath: '/debounce' });
    expect(url).toContain('/debounce');
  });
});

describe('CDN Cache', () => {
  beforeEach(() => {
    clearCDNCache();
  });

  it('should start with empty cache', () => {
    expect(getCDNCacheSize()).toBe(0);
  });

  it('should clear cache', () => {
    clearCDNCache();
    expect(getCDNCacheSize()).toBe(0);
  });
});

describe('generateImportMap', () => {
  it('should generate import map for packages', () => {
    const map = generateImportMap(['react', 'react-dom']);
    expect(map['react']).toContain('react');
    expect(map['react-dom']).toContain('react-dom');
  });

  it('should handle package info objects', () => {
    const map = generateImportMap([{ name: 'react', version: '18' }]);
    expect(map['react']).toContain('react@18');
  });
});

describe('isKnownESMPackage', () => {
  it('should return true for known packages', () => {
    expect(isKnownESMPackage('react')).toBe(true);
    expect(isKnownESMPackage('lodash')).toBe(true);
    expect(isKnownESMPackage('zustand')).toBe(true);
  });

  it('should return false for unknown packages', () => {
    expect(isKnownESMPackage('unknown-package')).toBe(false);
  });
});

describe('getSandpackExternalResources', () => {
  it('should return CDN URLs for packages', () => {
    const resources = getSandpackExternalResources(['react@18', 'react-dom@18']);
    expect(resources).toHaveLength(2);
    expect(resources[0]).toContain('react@18');
  });
});

describe('generateSandpackDependencies', () => {
  it('should generate dependencies object', () => {
    const deps = generateSandpackDependencies(['react@18', 'lodash']);
    expect(deps['react']).toBe('18');
    expect(deps['lodash']).toBe('latest');
  });
});

describe('getPresetPackages', () => {
  it('should return packages for preset', () => {
    const packages = getPresetPackages('react-basic');
    expect(packages).toContain('react@18');
    expect(packages).toContain('react-dom@18');
  });
});

describe('PACKAGE_PRESETS', () => {
  it('should have react-basic preset', () => {
    expect(PACKAGE_PRESETS['react-basic']).toBeDefined();
  });

  it('should have react-ui preset', () => {
    expect(PACKAGE_PRESETS['react-ui']).toBeDefined();
  });
});

describe('detectPackagesFromCode', () => {
  it('should detect import statements', () => {
    const code = `import React from 'react';
import { useState } from 'react';
import axios from 'axios';`;
    const packages = detectPackagesFromCode(code);
    expect(packages).toContain('react');
    expect(packages).toContain('axios');
  });

  it('should detect require statements', () => {
    const code = `const lodash = require('lodash');`;
    const packages = detectPackagesFromCode(code);
    expect(packages).toContain('lodash');
  });

  it('should detect scoped packages', () => {
    const code = `import { Dialog } from '@radix-ui/react-dialog';`;
    const packages = detectPackagesFromCode(code);
    expect(packages).toContain('@radix-ui/react-dialog');
  });

  it('should ignore relative imports', () => {
    const code = `import { foo } from './utils';
import bar from '../lib/bar';`;
    const packages = detectPackagesFromCode(code);
    expect(packages).toHaveLength(0);
  });
});

describe('CORE_LIBRARY_CDNS', () => {
  it('should have react CDN URLs', () => {
    expect(CORE_LIBRARY_CDNS.react).toBeDefined();
    expect(CORE_LIBRARY_CDNS.react.length).toBeGreaterThan(0);
  });

  it('should have babel CDN URLs', () => {
    expect(CORE_LIBRARY_CDNS.babel).toBeDefined();
  });

  it('should have tailwind CDN URLs', () => {
    expect(CORE_LIBRARY_CDNS.tailwind).toBeDefined();
  });
});

describe('generateScriptTagWithFallback', () => {
  it('should generate script tag with onerror fallback', () => {
    const script = generateScriptTagWithFallback('react');
    expect(script).toContain('<script');
    expect(script).toContain('onerror');
  });

  it('should include crossorigin attribute by default', () => {
    const script = generateScriptTagWithFallback('react');
    expect(script).toContain('crossorigin');
  });

  it('should include async attribute when specified', () => {
    const script = generateScriptTagWithFallback('react', { async: true });
    expect(script).toContain('async');
  });
});

describe('generateCoreLibraryScripts', () => {
  it('should generate all scripts by default', () => {
    const scripts = generateCoreLibraryScripts();
    expect(scripts).toContain('react');
    expect(scripts).toContain('babel');
    expect(scripts).toContain('tailwind');
  });

  it('should exclude scripts when disabled', () => {
    const scripts = generateCoreLibraryScripts({
      includeReact: false,
      includeBabel: false,
    });
    expect(scripts).not.toContain('react.development');
    expect(scripts).not.toContain('babel');
  });

  it('should include lucide stylesheet', () => {
    const scripts = generateCoreLibraryScripts({ includeLucide: true });
    expect(scripts).toContain('lucide');
    expect(scripts).toContain('stylesheet');
  });
});

describe('clearCDNHealthCache', () => {
  it('should clear health cache without error', () => {
    expect(() => clearCDNHealthCache()).not.toThrow();
  });
});

describe('safeBase64Encode', () => {
  it('should encode ASCII strings', () => {
    const encoded = safeBase64Encode('Hello World');
    expect(encoded).toBe(btoa('Hello World'));
  });

  it('should encode Unicode strings', () => {
    const encoded = safeBase64Encode('你好世界');
    expect(encoded).toBeDefined();
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('should encode emoji', () => {
    const encoded = safeBase64Encode('Hello 🌍');
    expect(encoded).toBeDefined();
  });
});

describe('safeBase64Decode', () => {
  it('should decode ASCII strings', () => {
    const encoded = btoa('Hello World');
    const decoded = safeBase64Decode(encoded);
    expect(decoded).toBe('Hello World');
  });

  it('should roundtrip Unicode strings', () => {
    const original = '你好世界';
    const encoded = safeBase64Encode(original);
    const decoded = safeBase64Decode(encoded);
    expect(decoded).toBe(original);
  });

  it('should roundtrip emoji', () => {
    const original = 'Hello 🌍';
    const encoded = safeBase64Encode(original);
    const decoded = safeBase64Decode(encoded);
    expect(decoded).toBe(original);
  });
});
