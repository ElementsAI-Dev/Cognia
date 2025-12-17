/**
 * Tests for Clipboard utilities
 */

import {
  base64ToBlob,
  base64ToDataUrl,
} from './clipboard';

describe('base64ToBlob', () => {
  it('creates blob from base64 string', () => {
    const base64 = 'SGVsbG8gV29ybGQ=';
    const result = base64ToBlob(base64, 'text/plain');
    
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('text/plain');
  });

  it('creates blob with correct size', () => {
    const base64 = 'SGVsbG8gV29ybGQ=';
    const result = base64ToBlob(base64, 'text/plain');
    
    expect(result.size).toBe(11);
  });

  it('handles image/png mime type', () => {
    const base64 = 'iVBORw0KGgo=';
    const result = base64ToBlob(base64, 'image/png');
    
    expect(result.type).toBe('image/png');
  });

  it('handles image/jpeg mime type', () => {
    const base64 = '/9j/4AAQSkZJRg==';
    const result = base64ToBlob(base64, 'image/jpeg');
    
    expect(result.type).toBe('image/jpeg');
  });

  it('handles empty base64 string', () => {
    const result = base64ToBlob('', 'text/plain');
    
    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBe(0);
  });

  it('handles application/json mime type', () => {
    const base64 = 'eyJrZXkiOiJ2YWx1ZSJ9';
    const result = base64ToBlob(base64, 'application/json');
    
    expect(result.type).toBe('application/json');
  });
});

describe('base64ToDataUrl', () => {
  it('creates data URL from base64', () => {
    const base64 = 'SGVsbG8gV29ybGQ=';
    const result = base64ToDataUrl(base64, 'text/plain');
    
    expect(result).toBe('data:text/plain;base64,SGVsbG8gV29ybGQ=');
  });

  it('handles image/png mime type', () => {
    const base64 = 'iVBORw0KGgo=';
    const result = base64ToDataUrl(base64, 'image/png');
    
    expect(result).toBe('data:image/png;base64,iVBORw0KGgo=');
  });

  it('handles image/jpeg mime type', () => {
    const base64 = '/9j/4AAQSkZJRg==';
    const result = base64ToDataUrl(base64, 'image/jpeg');
    
    expect(result).toBe('data:image/jpeg;base64,/9j/4AAQSkZJRg==');
  });

  it('handles image/gif mime type', () => {
    const base64 = 'R0lGODlhAQABAIAAAP///wAAACH5';
    const result = base64ToDataUrl(base64, 'image/gif');
    
    expect(result).toBe('data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5');
  });

  it('handles application/pdf mime type', () => {
    const base64 = 'JVBERi0xLjQ=';
    const result = base64ToDataUrl(base64, 'application/pdf');
    
    expect(result).toBe('data:application/pdf;base64,JVBERi0xLjQ=');
  });

  it('handles empty base64 string', () => {
    const result = base64ToDataUrl('', 'text/plain');
    
    expect(result).toBe('data:text/plain;base64,');
  });

  it('preserves complex base64 data', () => {
    const base64 = 'SGVsbG8rV29ybGQvVGVzdD0=';
    const result = base64ToDataUrl(base64, 'text/plain');
    
    expect(result).toContain(base64);
  });
});
