/**
 * Tests for Designer Export utilities
 */

import {
  normalizeSandpackFiles,
  generateViteProject,
  copyToClipboard,
  generateShareableUrl,
  encodeCodeForSharing,
  decodeSharedCode,
  generateCompactShareUrl,
  parseSharedUrl,
  generateEmbedCode,
  getQRCodeData,
  generateSocialShareLinks,
} from './export-utils';

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock URL for tests
const originalURL = global.URL;
beforeAll(() => {
  global.URL = class extends originalURL {
    constructor(url: string) {
      super(url, 'http://localhost');
    }
  } as typeof URL;
});

afterAll(() => {
  global.URL = originalURL;
});

describe('normalizeSandpackFiles', () => {
  it('should normalize file paths', () => {
    const files = {
      '/App.js': { code: 'const App = () => {}' },
      '/styles.css': { code: 'body {}' },
    };

    const result = normalizeSandpackFiles(files);
    expect(result['App.js']).toBe('const App = () => {}');
    expect(result['styles.css']).toBe('body {}');
  });

  it('should handle string files', () => {
    const files = {
      '/App.js': 'const App = () => {}',
    };

    const result = normalizeSandpackFiles(files);
    expect(result['App.js']).toBe('const App = () => {}');
  });
});

describe('generateViteProject', () => {
  it('should generate package.json', () => {
    const files = { 'App.js': 'export default function App() { return <div>Hello</div>; }' };
    const result = generateViteProject(files);

    expect(result['package.json']).toBeDefined();
    const pkg = JSON.parse(result['package.json']);
    expect(pkg.dependencies.react).toBeDefined();
    expect(pkg.devDependencies.vite).toBeDefined();
  });

  it('should generate vite.config.js', () => {
    const files = { 'App.js': 'export default function App() { return <div>Hello</div>; }' };
    const result = generateViteProject(files);

    expect(result['vite.config.js']).toBeDefined();
    expect(result['vite.config.js']).toContain('defineConfig');
  });

  it('should generate tailwind.config.js', () => {
    const files = { 'App.js': 'export default function App() { return <div>Hello</div>; }' };
    const result = generateViteProject(files);

    expect(result['tailwind.config.js']).toBeDefined();
    expect(result['tailwind.config.js']).toContain('tailwindcss');
  });

  it('should generate index.html', () => {
    const files = { 'App.js': 'export default function App() { return <div>Hello</div>; }' };
    const result = generateViteProject(files, { projectName: 'TestProject' });

    expect(result['index.html']).toBeDefined();
    expect(result['index.html']).toContain('TestProject');
  });

  it('should copy App code to src/App.jsx', () => {
    const appCode = 'export default function App() { return <div>Hello</div>; }';
    const files = { 'App.js': appCode };
    const result = generateViteProject(files);

    expect(result['src/App.jsx']).toBe(appCode);
  });
});

describe('copyToClipboard', () => {
  it('should copy text to clipboard', async () => {
    const result = await copyToClipboard('test text');
    expect(result).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
  });
});

describe('generateShareableUrl', () => {
  it('should generate data URL', () => {
    const result = generateShareableUrl('const x = 1;');
    expect(result).toContain('data:text/javascript;base64,');
  });
});

describe('encodeCodeForSharing', () => {
  it('should encode simple code', () => {
    const code = 'const x = 1;';
    const encoded = encodeCodeForSharing(code);
    expect(encoded).toBeTruthy();
    expect(typeof encoded).toBe('string');
  });

  it('should encode Unicode characters', () => {
    const code = 'const greeting = "你好世界";';
    const encoded = encodeCodeForSharing(code);
    expect(encoded).toBeTruthy();
  });
});

describe('decodeSharedCode', () => {
  it('should decode encoded code', () => {
    const original = 'const x = 1;';
    const encoded = encodeCodeForSharing(original);
    const decoded = decodeSharedCode(encoded);
    expect(decoded).toBe(original);
  });

  it('should handle Unicode', () => {
    const original = 'const greeting = "你好世界";';
    const encoded = encodeCodeForSharing(original);
    const decoded = decodeSharedCode(encoded);
    expect(decoded).toBe(original);
  });
});

describe('generateCompactShareUrl', () => {
  it('should generate URL with code parameter', () => {
    const code = 'const x = 1;';
    const url = generateCompactShareUrl(code, 'https://example.com');
    expect(url).toContain('https://example.com/designer?code=');
  });

  it('should use window.location.origin when no baseUrl', () => {
    // In test environment, window.location.origin might not be set
    const code = 'const x = 1;';
    const url = generateCompactShareUrl(code);
    expect(url).toContain('/designer?code=');
  });
});

describe('parseSharedUrl', () => {
  it('should parse code from URL', () => {
    const original = 'const x = 1;';
    const url = generateCompactShareUrl(original, 'https://example.com');
    const parsed = parseSharedUrl(url);
    expect(parsed).toBe(original);
  });

  it('should return null for invalid URL', () => {
    const result = parseSharedUrl('not-a-url');
    expect(result).toBeNull();
  });

  it('should return null when no code param', () => {
    const result = parseSharedUrl('https://example.com/designer');
    expect(result).toBeNull();
  });
});

describe('generateEmbedCode', () => {
  it('should generate iframe HTML', () => {
    const code = 'const x = 1;';
    const embed = generateEmbedCode(code);
    expect(embed).toContain('<iframe');
    expect(embed).toContain('</iframe>');
    expect(embed).toContain('sandbox=');
  });

  it('should use custom dimensions', () => {
    const code = 'const x = 1;';
    const embed = generateEmbedCode(code, { width: '800px', height: '600px' });
    expect(embed).toContain('width="800px"');
    expect(embed).toContain('height="600px"');
  });

  it('should use theme parameter', () => {
    const code = 'const x = 1;';
    const embed = generateEmbedCode(code, { theme: 'dark' });
    expect(embed).toContain('theme=dark');
  });
});

describe('getQRCodeData', () => {
  it('should return share URL for QR encoding', () => {
    const code = 'const x = 1;';
    const qrData = getQRCodeData(code);
    expect(qrData).toContain('/designer?code=');
  });
});

describe('generateSocialShareLinks', () => {
  it('should generate Twitter share link', () => {
    const code = 'const x = 1;';
    const links = generateSocialShareLinks(code, 'My Component');
    expect(links.twitter).toContain('twitter.com');
    expect(links.twitter).toContain('intent/tweet');
  });

  it('should generate LinkedIn share link', () => {
    const code = 'const x = 1;';
    const links = generateSocialShareLinks(code);
    expect(links.linkedin).toContain('linkedin.com');
    expect(links.linkedin).toContain('share-offsite');
  });

  it('should generate Reddit share link', () => {
    const code = 'const x = 1;';
    const links = generateSocialShareLinks(code);
    expect(links.reddit).toContain('reddit.com');
    expect(links.reddit).toContain('submit');
  });

  it('should include title in share links', () => {
    const code = 'const x = 1;';
    const links = generateSocialShareLinks(code, 'Test Component');
    expect(links.twitter).toContain(encodeURIComponent('Test Component'));
  });
});
