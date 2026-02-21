import { sanitizeBackgroundUrl } from './background-safety';

describe('sanitizeBackgroundUrl', () => {
  it('accepts secure https URLs', () => {
    const result = sanitizeBackgroundUrl('https://example.com/background.jpg');
    expect(result.valid).toBe(true);
    expect(result.normalized).toContain('https://example.com/background.jpg');
  });

  it('accepts allowed local/runtime protocols', () => {
    expect(sanitizeBackgroundUrl('blob:https://example.com/abc').valid).toBe(true);
    expect(sanitizeBackgroundUrl('asset://localhost/path/to/image.png').valid).toBe(true);
    expect(sanitizeBackgroundUrl('tauri://localhost/path/to/image.png').valid).toBe(true);
  });

  it('accepts supported data URL image mime types', () => {
    const result = sanitizeBackgroundUrl('data:image/png;base64,aGVsbG8=');
    expect(result.valid).toBe(true);
  });

  it('rejects unsafe protocols', () => {
    expect(sanitizeBackgroundUrl('http://example.com/image.jpg').valid).toBe(false);
    expect(sanitizeBackgroundUrl('file:///tmp/image.jpg').valid).toBe(false);
    expect(sanitizeBackgroundUrl('javascript:alert(1)').valid).toBe(false);
  });

  it('rejects SVG URLs', () => {
    expect(sanitizeBackgroundUrl('https://example.com/image.svg').valid).toBe(false);
    expect(sanitizeBackgroundUrl('data:image/svg+xml;base64,PHN2Zy8+').valid).toBe(false);
  });
});
