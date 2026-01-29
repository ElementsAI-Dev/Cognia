/**
 * Sketch to LaTeX - Unit Tests
 */

import sketchToLatexApi, {
  SketchToLaTeXService,
  DEFAULT_SKETCH_CONFIG,
  preprocessStrokes,
  normalizeStrokes,
  isSketchRecognitionAvailable,
} from './sketch-to-latex';

describe('Sketch to LaTeX', () => {
  describe('default export API', () => {
    it('should export all functions', () => {
      expect(sketchToLatexApi.SketchToLaTeXService).toBeDefined();
      expect(sketchToLatexApi.DEFAULT_SKETCH_CONFIG).toBeDefined();
      expect(sketchToLatexApi.preprocessStrokes).toBeDefined();
      expect(sketchToLatexApi.normalizeStrokes).toBeDefined();
      expect(sketchToLatexApi.convertSketchToLaTeX).toBeDefined();
      expect(sketchToLatexApi.isSketchRecognitionAvailable).toBeDefined();
    });
  });

  describe('DEFAULT_SKETCH_CONFIG', () => {
    it('should have required properties', () => {
      expect(DEFAULT_SKETCH_CONFIG).toBeDefined();
      expect(DEFAULT_SKETCH_CONFIG.provider).toBeDefined();
    });
  });

  describe('isSketchRecognitionAvailable', () => {
    it('should return true for local provider', () => {
      expect(isSketchRecognitionAvailable('local')).toBe(true);
    });

    it('should return false for cloud providers without config', () => {
      expect(isSketchRecognitionAvailable('mathpix')).toBe(false);
      expect(isSketchRecognitionAvailable('myscript')).toBe(false);
    });
  });

  describe('preprocessStrokes', () => {
    it('should preprocess empty strokes', () => {
      const result = preprocessStrokes([]);
      expect(result).toEqual([]);
    });

    it('should preprocess strokes with points', () => {
      const strokes = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
          color: '#000',
          width: 2,
          timestamp: Date.now(),
        },
      ];
      const result = preprocessStrokes(strokes);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('normalizeStrokes', () => {
    it('should normalize empty strokes', () => {
      const result = normalizeStrokes([]);
      expect(result).toEqual([]);
    });

    it('should be a function', () => {
      expect(typeof normalizeStrokes).toBe('function');
    });
  });

  describe('SketchToLaTeXService', () => {
    let service: SketchToLaTeXService;

    beforeEach(() => {
      service = new SketchToLaTeXService();
    });

    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(SketchToLaTeXService);
    });

    it('should have recognize method', () => {
      expect(typeof service.recognize).toBe('function');
    });

    it('should have updateConfig method', () => {
      expect(typeof service.updateConfig).toBe('function');
    });

    it('should allow configuration update', () => {
      service.updateConfig({ provider: 'local' });
      // Should not throw
    });
  });
});
