/**
 * Tests for parseAIJSON shared utility
 */

import { parseAIJSON } from './parse-ai-json';

describe('parseAIJSON', () => {
  describe('plain JSON parsing', () => {
    it('should parse a plain JSON object', () => {
      expect(parseAIJSON('{"key": "value"}')).toEqual({ key: 'value' });
    });

    it('should parse a plain JSON array', () => {
      expect(parseAIJSON('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('should parse JSON with whitespace padding', () => {
      expect(parseAIJSON('  \n  {"key": "value"}  \n  ')).toEqual({ key: 'value' });
    });

    it('should parse nested JSON objects', () => {
      const nested = { outer: { inner: { deep: true } } };
      expect(parseAIJSON(JSON.stringify(nested))).toEqual(nested);
    });
  });

  describe('markdown code block extraction', () => {
    it('should parse JSON from ```json code block', () => {
      expect(parseAIJSON('```json\n{"title": "Hello"}\n```')).toEqual({ title: 'Hello' });
    });

    it('should parse JSON from ``` code block without language tag', () => {
      expect(parseAIJSON('```\n{"data": [1,2,3]}\n```')).toEqual({ data: [1, 2, 3] });
    });

    it('should handle code block with extra whitespace', () => {
      expect(parseAIJSON('```json  \n  {"key": "value"}  \n  ```')).toEqual({ key: 'value' });
    });

    it('should prefer code block content over raw text', () => {
      const input = 'Some text {"wrong": true} ```json\n{"right": true}\n``` more text';
      expect(parseAIJSON(input)).toEqual({ right: true });
    });

    it('should handle complex AI response with explanation + JSON', () => {
      const input = `Here's the optimized slide content:

\`\`\`json
{
  "title": "AI Revolution",
  "bullets": ["Point 1", "Point 2"],
  "layout": "title-content"
}
\`\`\`

This should work well for your presentation.`;
      const result = parseAIJSON(input) as Record<string, unknown>;
      expect(result.title).toBe('AI Revolution');
      expect(result.bullets).toEqual(['Point 1', 'Point 2']);
    });
  });

  describe('JSON extraction from surrounding text', () => {
    it('should extract JSON object from surrounding text', () => {
      expect(
        parseAIJSON('Here is the result: {"title": "Extracted"} and some extra text')
      ).toEqual({ title: 'Extracted' });
    });

    it('should extract JSON array from surrounding text', () => {
      expect(parseAIJSON('The items are: [1, 2, 3] in the response')).toEqual([1, 2, 3]);
    });
  });

  describe('error handling', () => {
    it('should throw on completely invalid input', () => {
      expect(() => parseAIJSON('no json here at all')).toThrow('Failed to parse AI response as JSON');
    });

    it('should throw on empty string', () => {
      expect(() => parseAIJSON('')).toThrow();
    });

    it('should throw on malformed JSON', () => {
      expect(() => parseAIJSON('{invalid json}')).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle JSON with special characters', () => {
      const input = '{"message": "Hello \\"world\\""}';
      expect(parseAIJSON(input)).toEqual({ message: 'Hello "world"' });
    });

    it('should handle boolean and null values', () => {
      expect(parseAIJSON('{"flag": true, "empty": null}')).toEqual({ flag: true, empty: null });
    });

    it('should handle numeric values', () => {
      expect(parseAIJSON('{"count": 42, "ratio": 3.14}')).toEqual({ count: 42, ratio: 3.14 });
    });
  });
});
