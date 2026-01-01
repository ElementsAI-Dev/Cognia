/**
 * Tests for Image utilities
 */

import {
  extractBase64,
  isImageFile,
  isVisionModel,
} from './image-utils';

describe('extractBase64', () => {
  it('extracts base64 data from valid data URL', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
    const result = extractBase64(dataUrl);
    
    expect(result.mimeType).toBe('image/png');
    expect(result.data).toBe('iVBORw0KGgoAAAANSUhEUgAAAAUA');
  });

  it('extracts JPEG data URL correctly', () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABI';
    const result = extractBase64(dataUrl);
    
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.data).toBe('/9j/4AAQSkZJRgABAQEASABI');
  });

  it('handles GIF data URL', () => {
    const dataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5';
    const result = extractBase64(dataUrl);
    
    expect(result.mimeType).toBe('image/gif');
    expect(result.data).toBe('R0lGODlhAQABAIAAAP///wAAACH5');
  });

  it('handles WebP data URL', () => {
    const dataUrl = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgA';
    const result = extractBase64(dataUrl);
    
    expect(result.mimeType).toBe('image/webp');
    expect(result.data).toBe('UklGRiQAAABXRUJQVlA4IBgA');
  });

  it('throws error for invalid data URL format', () => {
    expect(() => extractBase64('not-a-data-url')).toThrow('Invalid data URL');
  });

  it('throws error for URL without base64 prefix', () => {
    expect(() => extractBase64('data:image/png,rawdata')).toThrow('Invalid data URL');
  });

  it('handles empty base64 data', () => {
    const dataUrl = 'data:image/png;base64,';
    // Empty base64 data is invalid and should throw
    expect(() => extractBase64(dataUrl)).toThrow('Invalid data URL');
  });
});

describe('isImageFile', () => {
  it('returns true for image/png', () => {
    expect(isImageFile('image/png')).toBe(true);
  });

  it('returns true for image/jpeg', () => {
    expect(isImageFile('image/jpeg')).toBe(true);
  });

  it('returns true for image/gif', () => {
    expect(isImageFile('image/gif')).toBe(true);
  });

  it('returns true for image/webp', () => {
    expect(isImageFile('image/webp')).toBe(true);
  });

  it('returns true for image/svg+xml', () => {
    expect(isImageFile('image/svg+xml')).toBe(true);
  });

  it('returns false for text/plain', () => {
    expect(isImageFile('text/plain')).toBe(false);
  });

  it('returns false for application/json', () => {
    expect(isImageFile('application/json')).toBe(false);
  });

  it('returns false for video/mp4', () => {
    expect(isImageFile('video/mp4')).toBe(false);
  });

  it('returns false for audio/mpeg', () => {
    expect(isImageFile('audio/mpeg')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isImageFile('')).toBe(false);
  });
});

describe('isVisionModel', () => {
  describe('OpenAI models', () => {
    it('returns true for gpt-4o', () => {
      expect(isVisionModel('gpt-4o')).toBe(true);
    });

    it('returns true for gpt-4o-mini', () => {
      expect(isVisionModel('gpt-4o-mini')).toBe(true);
    });

    it('returns true for gpt-4-turbo', () => {
      expect(isVisionModel('gpt-4-turbo')).toBe(true);
    });

    it('returns true for gpt-4-vision-preview', () => {
      expect(isVisionModel('gpt-4-vision-preview')).toBe(true);
    });
  });

  describe('Anthropic models', () => {
    it('returns true for claude-3-opus', () => {
      expect(isVisionModel('claude-3-opus')).toBe(true);
    });

    it('returns true for claude-3-sonnet', () => {
      expect(isVisionModel('claude-3-sonnet')).toBe(true);
    });

    it('returns true for claude-3-haiku', () => {
      expect(isVisionModel('claude-3-haiku')).toBe(true);
    });

    it('returns true for claude-3-5-sonnet', () => {
      expect(isVisionModel('claude-3-5-sonnet')).toBe(true);
    });

    it('returns true for claude-sonnet-4', () => {
      expect(isVisionModel('claude-sonnet-4')).toBe(true);
    });
  });

  describe('Google models', () => {
    it('returns true for gemini-pro-vision', () => {
      expect(isVisionModel('gemini-pro-vision')).toBe(true);
    });

    it('returns true for gemini-1.5-pro', () => {
      expect(isVisionModel('gemini-1.5-pro')).toBe(true);
    });

    it('returns true for gemini-1.5-flash', () => {
      expect(isVisionModel('gemini-1.5-flash')).toBe(true);
    });

    it('returns true for gemini-2.0-flash-exp', () => {
      expect(isVisionModel('gemini-2.0-flash-exp')).toBe(true);
    });
  });

  describe('non-vision models', () => {
    it('returns false for gpt-3.5-turbo', () => {
      expect(isVisionModel('gpt-3.5-turbo')).toBe(false);
    });

    it('returns false for claude-2', () => {
      expect(isVisionModel('claude-2')).toBe(false);
    });

    it('returns false for text-davinci-003', () => {
      expect(isVisionModel('text-davinci-003')).toBe(false);
    });

    it('returns false for llama-2', () => {
      expect(isVisionModel('llama-2')).toBe(false);
    });

    it('returns false for mistral-7b', () => {
      expect(isVisionModel('mistral-7b')).toBe(false);
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase model names', () => {
      expect(isVisionModel('GPT-4O')).toBe(true);
    });

    it('handles mixed case model names', () => {
      expect(isVisionModel('Claude-3-Sonnet')).toBe(true);
    });
  });
});
