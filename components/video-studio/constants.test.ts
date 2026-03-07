import {
  VIDEO_PROMPT_TEMPLATES,
  VIDEO_STYLE_PRESETS,
  RESOLUTION_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  DURATION_OPTIONS,
  CAMERA_PRESETS,
  VIDEO_ZOOM_LEVELS,
} from './constants';

describe('Video Studio Constants', () => {
  describe('VIDEO_PROMPT_TEMPLATES', () => {
    it('should have at least 5 templates', () => {
      expect(VIDEO_PROMPT_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    });

    it('should have valid template structure', () => {
      VIDEO_PROMPT_TEMPLATES.forEach((template) => {
        expect(template).toHaveProperty('label');
        expect(template).toHaveProperty('prompt');
        expect(template).toHaveProperty('category');
        expect(typeof template.label).toBe('string');
        expect(typeof template.prompt).toBe('string');
        expect(typeof template.category).toBe('string');
        expect(template.label.length).toBeGreaterThan(0);
        expect(template.prompt.length).toBeGreaterThan(0);
      });
    });

    it('should have unique labels', () => {
      const labels = VIDEO_PROMPT_TEMPLATES.map((t) => t.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });
  });

  describe('VIDEO_STYLE_PRESETS', () => {
    it('should have at least 5 style presets', () => {
      expect(VIDEO_STYLE_PRESETS.length).toBeGreaterThanOrEqual(5);
    });

    it('should have valid style preset structure', () => {
      VIDEO_STYLE_PRESETS.forEach((preset) => {
        expect(preset).toHaveProperty('label');
        expect(preset).toHaveProperty('value');
        expect(preset).toHaveProperty('icon');
        expect(preset).toHaveProperty('description');
        expect(typeof preset.label).toBe('string');
        expect(typeof preset.value).toBe('string');
        expect(typeof preset.icon).toBe('string');
        expect(typeof preset.description).toBe('string');
      });
    });

    it('should have unique values', () => {
      const values = VIDEO_STYLE_PRESETS.map((p) => p.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should include common styles', () => {
      const values = VIDEO_STYLE_PRESETS.map((p) => p.value);
      expect(values).toContain('cinematic');
      expect(values).toContain('natural');
    });
  });

  describe('RESOLUTION_OPTIONS', () => {
    it('should have standard resolution options', () => {
      const values = RESOLUTION_OPTIONS.map((r) => r.value);
      expect(values).toContain('480p');
      expect(values).toContain('720p');
      expect(values).toContain('1080p');
      expect(values).toContain('4k');
    });

    it('should have valid resolution structure', () => {
      RESOLUTION_OPTIONS.forEach((option) => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('description');
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
        expect(typeof option.description).toBe('string');
      });
    });
  });

  describe('ASPECT_RATIO_OPTIONS', () => {
    it('should have standard aspect ratios', () => {
      const values = ASPECT_RATIO_OPTIONS.map((a) => a.value);
      expect(values).toContain('16:9');
      expect(values).toContain('9:16');
      expect(values).toContain('1:1');
    });

    it('should have valid aspect ratio structure', () => {
      ASPECT_RATIO_OPTIONS.forEach((option) => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('icon');
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
        expect(typeof option.icon).toBe('string');
      });
    });
  });

  describe('DURATION_OPTIONS', () => {
    it('should have at least 3 duration options', () => {
      expect(DURATION_OPTIONS.length).toBeGreaterThanOrEqual(3);
    });

    it('should have valid duration structure', () => {
      DURATION_OPTIONS.forEach((option) => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('seconds');
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
        expect(typeof option.seconds).toBe('number');
        expect(option.seconds).toBeGreaterThan(0);
      });
    });

    it('should be sorted by duration', () => {
      const seconds = DURATION_OPTIONS.map((d) => d.seconds);
      const sortedSeconds = [...seconds].sort((a, b) => a - b);
      expect(seconds).toEqual(sortedSeconds);
    });

    it('should include common durations', () => {
      const values = DURATION_OPTIONS.map((d) => d.value);
      expect(values).toContain('5s');
      expect(values).toContain('10s');
    });
  });

  describe('CAMERA_PRESETS', () => {
    it('should have at least 8 presets', () => {
      expect(CAMERA_PRESETS.length).toBeGreaterThanOrEqual(8);
    });

    it('should have valid preset structure', () => {
      CAMERA_PRESETS.forEach((preset) => {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('label');
        expect(preset).toHaveProperty('icon');
        expect(preset).toHaveProperty('motion');
        expect(typeof preset.id).toBe('string');
        expect(typeof preset.label).toBe('string');
        expect(typeof preset.icon).toBe('string');
        expect(preset.motion).toHaveProperty('horizontal');
        expect(preset.motion).toHaveProperty('vertical');
        expect(preset.motion).toHaveProperty('pan');
        expect(preset.motion).toHaveProperty('tilt');
        expect(preset.motion).toHaveProperty('zoom');
        expect(preset.motion).toHaveProperty('roll');
      });
    });

    it('should have unique ids', () => {
      const ids = CAMERA_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should include a static preset with all zeros', () => {
      const staticPreset = CAMERA_PRESETS.find((p) => p.id === 'static');
      expect(staticPreset).toBeDefined();
      expect(Object.values(staticPreset!.motion).every((v) => v === 0)).toBe(true);
    });

    it('should have motion values in valid range (-100 to 100)', () => {
      CAMERA_PRESETS.forEach((preset) => {
        Object.values(preset.motion).forEach((v) => {
          expect(v).toBeGreaterThanOrEqual(-100);
          expect(v).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('VIDEO_ZOOM_LEVELS', () => {
    it('should have at least 3 zoom levels', () => {
      expect(VIDEO_ZOOM_LEVELS.length).toBeGreaterThanOrEqual(3);
    });

    it('should have valid zoom level structure', () => {
      VIDEO_ZOOM_LEVELS.forEach((level) => {
        expect(level).toHaveProperty('label');
        expect(level).toHaveProperty('cols');
        expect(typeof level.label).toBe('string');
        expect(typeof level.cols).toBe('number');
        expect(level.cols).toBeGreaterThan(0);
      });
    });

    it('should have increasing column counts', () => {
      const cols = VIDEO_ZOOM_LEVELS.map((l) => l.cols);
      const sorted = [...cols].sort((a, b) => a - b);
      expect(cols).toEqual(sorted);
    });
  });
});
