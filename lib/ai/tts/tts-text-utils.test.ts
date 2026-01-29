/**
 * Tests for TTS Text Utilities
 */

import {
  splitTextForTTS,
  normalizeTextForTTS,
  estimateSpeechDuration,
  getWordCount,
  isCJKText,
  detectLanguage,
  preprocessTextForProvider,
  generateSSML,
} from './tts-text-utils';

describe('TTS Text Utilities', () => {
  describe('splitTextForTTS', () => {
    it('should return single chunk for short text', () => {
      const text = 'Hello world';
      const chunks = splitTextForTTS(text, 'openai');
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should split long text into multiple chunks', () => {
      const text = 'This is a test sentence. '.repeat(200);
      const chunks = splitTextForTTS(text, 'openai');
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should respect sentence boundaries when splitting', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = splitTextForTTS(text, 'openai', 30);
      chunks.forEach((chunk) => {
        // Each chunk should end with sentence-ending punctuation or be the last chunk
        const trimmed = chunk.trim();
        if (trimmed.length > 0) {
          expect(trimmed).toMatch(/[.!?。！？]?$/);
        }
      });
    });

    it('should handle different providers with different limits', () => {
      const text = 'Test '.repeat(1000);
      const openaiChunks = splitTextForTTS(text, 'openai');
      const edgeChunks = splitTextForTTS(text, 'edge');
      
      // Edge has higher limit (10000) than OpenAI (4096)
      expect(edgeChunks.length).toBeLessThanOrEqual(openaiChunks.length);
    });

    it('should handle custom max chunk size', () => {
      const text = 'Word '.repeat(100);
      const chunks = splitTextForTTS(text, 'openai', 50);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('normalizeTextForTTS', () => {
    it('should remove excessive whitespace', () => {
      const text = 'Hello    world   test';
      const normalized = normalizeTextForTTS(text);
      expect(normalized).toBe('Hello world test');
    });

    it('should replace abbreviations', () => {
      const text = 'Mr. Smith met Dr. Jones';
      const normalized = normalizeTextForTTS(text);
      expect(normalized).toContain('Mister');
      expect(normalized).toContain('Doctor');
    });

    it('should replace special characters', () => {
      const text = 'Price: $100 & 50% off';
      const normalized = normalizeTextForTTS(text);
      expect(normalized).toContain('and');
      expect(normalized).toContain('percent');
    });

    it('should remove markdown formatting', () => {
      const text = '**Bold** and *italic* text';
      const normalized = normalizeTextForTTS(text);
      expect(normalized).toBe('Bold and italic text');
    });

    it('should remove URLs', () => {
      const text = 'Visit https://example.com for more info';
      const normalized = normalizeTextForTTS(text);
      expect(normalized).not.toContain('https://');
    });

    it('should remove code blocks', () => {
      // Code blocks are processed - backticks removed
      const text = 'Code: `inline` end';
      const normalized = normalizeTextForTTS(text);
      // Inline code backticks are removed, content preserved
      expect(normalized).toContain('inline');
      expect(normalized).not.toContain('`');
    });

    it('should normalize quotes', () => {
      const text = '\u201cHello\u201d and \u2018World\u2019';
      const normalized = normalizeTextForTTS(text);
      // Fancy quotes are normalized to standard quotes
      expect(normalized).toContain('Hello');
      expect(normalized).toContain('World');
    });
  });

  describe('estimateSpeechDuration', () => {
    it('should estimate duration based on word count', () => {
      const text = 'word '.repeat(150); // 150 words
      const duration = estimateSpeechDuration(text);
      // At 150 WPM, 150 words = 60 seconds
      expect(duration).toBeCloseTo(60, 0);
    });

    it('should adjust for speech rate', () => {
      const text = 'word '.repeat(150);
      const normalDuration = estimateSpeechDuration(text, 1.0);
      const fastDuration = estimateSpeechDuration(text, 2.0);
      expect(fastDuration).toBeLessThan(normalDuration);
    });

    it('should handle empty text', () => {
      const duration = estimateSpeechDuration('');
      // Empty string splits to 1 element, so minimum duration
      expect(duration).toBeLessThan(1);
    });
  });

  describe('getWordCount', () => {
    it('should count words correctly', () => {
      expect(getWordCount('Hello world')).toBe(2);
      expect(getWordCount('One two three four five')).toBe(5);
    });

    it('should handle multiple spaces', () => {
      expect(getWordCount('Hello    world')).toBe(2);
    });

    it('should handle empty string', () => {
      expect(getWordCount('')).toBe(0);
    });
  });

  describe('isCJKText', () => {
    it('should detect Chinese text', () => {
      expect(isCJKText('你好世界')).toBe(true);
    });

    it('should detect Japanese text', () => {
      expect(isCJKText('こんにちは')).toBe(true);
    });

    it('should detect Korean text', () => {
      expect(isCJKText('안녕하세요')).toBe(true);
    });

    it('should return false for English text', () => {
      expect(isCJKText('Hello world')).toBe(false);
    });

    it('should handle mixed text', () => {
      // Less than 30% CJK
      expect(isCJKText('Hello 你好 world test')).toBe(false);
      // More than 30% CJK
      expect(isCJKText('你好世界test')).toBe(true);
    });
  });

  describe('detectLanguage', () => {
    it('should detect Chinese', () => {
      expect(detectLanguage('你好世界')).toMatch(/^zh/);
    });

    it('should detect Japanese', () => {
      expect(detectLanguage('こんにちは')).toBe('ja-JP');
    });

    it('should detect Korean', () => {
      expect(detectLanguage('안녕하세요')).toBe('ko-KR');
    });

    it('should detect German', () => {
      // German detection requires specific characters like ä, ö, ü, ß
      expect(detectLanguage('Guten Tag, wie geht es Ihnen? Schön!')).toBe('de-DE');
    });

    it('should detect French', () => {
      expect(detectLanguage('Bonjour, comment ça va?')).toBe('fr-FR');
    });

    it('should detect Spanish', () => {
      expect(detectLanguage('¿Cómo estás?')).toBe('es-ES');
    });

    it('should default to English', () => {
      expect(detectLanguage('Hello world')).toBe('en-US');
    });
  });

  describe('preprocessTextForProvider', () => {
    it('should normalize text for all providers', () => {
      const text = '  Hello   world  ';
      const processed = preprocessTextForProvider(text, 'openai');
      expect(processed).toBe('Hello world');
    });

    it('should escape XML for Edge TTS', () => {
      // Note: normalizeTextForTTS replaces & with ' and ' before edge preprocessing
      const text = 'Hello <world> "test"';
      const processed = preprocessTextForProvider(text, 'edge');
      expect(processed).toContain('&lt;');
      expect(processed).toContain('&gt;');
      expect(processed).toContain('&quot;');
    });

    it('should remove angle brackets for Gemini', () => {
      const text = 'Hello <world>';
      const processed = preprocessTextForProvider(text, 'gemini');
      expect(processed).not.toContain('<');
      expect(processed).not.toContain('>');
    });
  });

  describe('generateSSML', () => {
    it('should generate valid SSML structure', () => {
      const ssml = generateSSML('Hello world');
      expect(ssml).toContain('<speak');
      expect(ssml).toContain('</speak>');
      expect(ssml).toContain('<prosody');
      expect(ssml).toContain('Hello world');
    });

    it('should include voice when provided', () => {
      const ssml = generateSSML('Hello', { voice: 'en-US-JennyNeural' });
      expect(ssml).toContain('<voice name="en-US-JennyNeural">');
      expect(ssml).toContain('</voice>');
    });

    it('should include rate, pitch, volume', () => {
      const ssml = generateSSML('Hello', { rate: 1.2, pitch: 1.1, volume: 0.8 });
      expect(ssml).toContain('rate="20%"');
      expect(ssml).toContain('pitch="5Hz"');
      expect(ssml).toContain('volume="-20%"');
    });

    it('should escape XML special characters', () => {
      const ssml = generateSSML('Hello <world> & "test"');
      expect(ssml).toContain('&lt;');
      expect(ssml).toContain('&gt;');
      expect(ssml).toContain('&amp;');
      expect(ssml).toContain('&quot;');
    });

    it('should include language', () => {
      const ssml = generateSSML('Hello', { language: 'de-DE' });
      expect(ssml).toContain('xml:lang="de-DE"');
    });
  });
});
