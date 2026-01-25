/**
 * Tests for Keyframe Animation System
 */

import {
  KeyframeSystem,
  createKeyframeSystem,
  getEasingFunctions,
  previewEasing,
  type KeyframeTrack,
} from './keyframe-system';

describe('KeyframeSystem', () => {
  let system: KeyframeSystem;

  beforeEach(() => {
    system = createKeyframeSystem();
  });

  describe('track management', () => {
    it('should create a track with default value', () => {
      const track = system.createTrack('opacity', 1);

      expect(track.id).toBeDefined();
      expect(track.property).toBe('opacity');
      expect(track.defaultValue).toBe(1);
      expect(track.keyframes).toHaveLength(0);
      expect(track.isEnabled).toBe(true);
    });

    it('should add and retrieve a track', () => {
      const track = system.createTrack('position', { x: 0, y: 0 });

      const retrieved = system.getTrack(track.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.property).toBe('position');
    });

    it('should remove a track', () => {
      const track = system.createTrack('scale', 1);
      system.removeTrack(track.id);

      expect(system.getTrack(track.id)).toBeUndefined();
    });

    it('should get all tracks', () => {
      system.createTrack('opacity', 1);
      system.createTrack('scale', 1);
      system.createTrack('rotation', 0);

      const tracks = system.getAllTracks();
      expect(tracks).toHaveLength(3);
    });
  });

  describe('keyframe management', () => {
    let track: KeyframeTrack;

    beforeEach(() => {
      track = system.createTrack('opacity', 1);
    });

    it('should add a keyframe', () => {
      const keyframe = system.addKeyframe(track.id, 0, 0.5);

      expect(keyframe).not.toBeNull();
      expect(keyframe?.time).toBe(0);
      expect(keyframe?.value).toBe(0.5);
      expect(keyframe?.easing).toBe('linear');
    });

    it('should add keyframe with custom easing', () => {
      const keyframe = system.addKeyframe(track.id, 1000, 1, {
        easing: 'ease-in-out',
        interpolation: 'bezier',
      });

      expect(keyframe?.easing).toBe('ease-in-out');
      expect(keyframe?.interpolation).toBe('bezier');
    });

    it('should sort keyframes by time', () => {
      system.addKeyframe(track.id, 2000, 1);
      system.addKeyframe(track.id, 0, 0);
      system.addKeyframe(track.id, 1000, 0.5);

      const updatedTrack = system.getTrack(track.id);
      expect(updatedTrack?.keyframes[0].time).toBe(0);
      expect(updatedTrack?.keyframes[1].time).toBe(1000);
      expect(updatedTrack?.keyframes[2].time).toBe(2000);
    });

    it('should update existing keyframe at same time', () => {
      system.addKeyframe(track.id, 1000, 0.5);
      system.addKeyframe(track.id, 1000, 0.8);

      const updatedTrack = system.getTrack(track.id);
      expect(updatedTrack?.keyframes).toHaveLength(1);
      expect(updatedTrack?.keyframes[0].value).toBe(0.8);
    });

    it('should remove a keyframe', () => {
      const keyframe = system.addKeyframe(track.id, 1000, 0.5);
      const removed = system.removeKeyframe(track.id, keyframe!.id);

      expect(removed).toBe(true);
      expect(system.getTrack(track.id)?.keyframes).toHaveLength(0);
    });

    it('should update a keyframe', () => {
      const keyframe = system.addKeyframe(track.id, 1000, 0.5);
      const updated = system.updateKeyframe(track.id, keyframe!.id, {
        value: 0.8,
        easing: 'ease-out',
      });

      expect(updated?.value).toBe(0.8);
      expect(updated?.easing).toBe('ease-out');
    });
  });

  describe('value interpolation', () => {
    it('should return default value when no keyframes', () => {
      const track = system.createTrack('opacity', 0.5);
      const value = system.getValue(track.id, 1000);

      expect(value).toBe(0.5);
    });

    it('should return first keyframe value before first keyframe', () => {
      const track = system.createTrack('opacity', 0);
      system.addKeyframe(track.id, 1000, 0.5);

      const value = system.getValue(track.id, 500);
      expect(value).toBe(0.5);
    });

    it('should return last keyframe value after last keyframe', () => {
      const track = system.createTrack('opacity', 0);
      system.addKeyframe(track.id, 0, 0);
      system.addKeyframe(track.id, 1000, 1);

      const value = system.getValue(track.id, 2000);
      expect(value).toBe(1);
    });

    it('should interpolate linearly between keyframes', () => {
      const track = system.createTrack('opacity', 0);
      system.addKeyframe(track.id, 0, 0);
      system.addKeyframe(track.id, 1000, 1);

      const value = system.getValue(track.id, 500) as number;
      expect(value).toBeCloseTo(0.5, 2);
    });

    it('should interpolate vector values', () => {
      const track = system.createTrack('position', { x: 0, y: 0 });
      system.addKeyframe(track.id, 0, { x: 0, y: 0 });
      system.addKeyframe(track.id, 1000, { x: 100, y: 200 });

      const value = system.getValue(track.id, 500) as { x: number; y: number };
      expect(value.x).toBeCloseTo(50, 2);
      expect(value.y).toBeCloseTo(100, 2);
    });

    it('should interpolate color values', () => {
      const track = system.createTrack('color', { r: 0, g: 0, b: 0 });
      system.addKeyframe(track.id, 0, { r: 0, g: 0, b: 0 });
      system.addKeyframe(track.id, 1000, { r: 255, g: 128, b: 64 });

      const value = system.getValue(track.id, 500) as { r: number; g: number; b: number };
      expect(value.r).toBeCloseTo(127.5, 1);
      expect(value.g).toBeCloseTo(64, 1);
      expect(value.b).toBeCloseTo(32, 1);
    });

    it('should handle step interpolation', () => {
      const track = system.createTrack('visibility', 0);
      system.addKeyframe(track.id, 0, 0, { interpolation: 'step' });
      system.addKeyframe(track.id, 1000, 1);

      const value = system.getValue(track.id, 999);
      expect(value).toBe(0);
    });
  });

  describe('keyframe operations', () => {
    it('should get keyframes in time range', () => {
      const track = system.createTrack('opacity', 0);
      system.addKeyframe(track.id, 0, 0);
      system.addKeyframe(track.id, 500, 0.5);
      system.addKeyframe(track.id, 1000, 1);
      system.addKeyframe(track.id, 2000, 0.5);

      const keyframes = system.getKeyframesInRange(track.id, 400, 1100);
      expect(keyframes).toHaveLength(2);
    });

    it('should copy keyframes', () => {
      const track = system.createTrack('opacity', 0);
      const kf1 = system.addKeyframe(track.id, 0, 0);
      const kf2 = system.addKeyframe(track.id, 1000, 1);

      const copied = system.copyKeyframes(track.id, [kf1!.id, kf2!.id]);
      expect(copied).toHaveLength(2);
      expect(copied[0].id).not.toBe(kf1!.id);
    });

    it('should paste keyframes with time offset', () => {
      const track = system.createTrack('opacity', 0);
      const kf1 = system.addKeyframe(track.id, 0, 0);
      const kf2 = system.addKeyframe(track.id, 1000, 1);

      const copied = system.copyKeyframes(track.id, [kf1!.id, kf2!.id]);
      const pasted = system.pasteKeyframes(track.id, copied, 5000);

      expect(pasted).toHaveLength(2);
      expect(pasted[0].time).toBe(5000);
      expect(pasted[1].time).toBe(6000);
    });
  });

  describe('animation layers', () => {
    it('should create an animation layer', () => {
      const layer = system.createLayer('Main', 0, 10000);

      expect(layer.id).toBeDefined();
      expect(layer.name).toBe('Main');
      expect(layer.startTime).toBe(0);
      expect(layer.duration).toBe(10000);
    });

    it('should add track to layer', () => {
      const layer = system.createLayer('Main', 0, 10000);
      const track = system.createTrack('opacity', 1);

      const added = system.addTrackToLayer(layer.id, track.id);
      expect(added).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should export to JSON', () => {
      const track = system.createTrack('opacity', 1);
      system.addKeyframe(track.id, 0, 0);
      system.addKeyframe(track.id, 1000, 1);

      const json = system.toJSON();
      expect(json.tracks).toHaveLength(1);
      expect(json.tracks[0].keyframes).toHaveLength(2);
    });

    it('should import from JSON', () => {
      const track = system.createTrack('opacity', 1);
      system.addKeyframe(track.id, 0, 0);
      const json = system.toJSON();

      const newSystem = createKeyframeSystem();
      newSystem.fromJSON(json);

      expect(newSystem.getAllTracks()).toHaveLength(1);
    });
  });
});

describe('Easing Functions', () => {
  it('should return all easing function names', () => {
    const easings = getEasingFunctions();
    expect(easings).toContain('linear');
    expect(easings).toContain('ease-in');
    expect(easings).toContain('ease-out');
    expect(easings).toContain('ease-in-out');
  });

  it('should preview easing values', () => {
    const values = previewEasing('linear', 10);
    expect(values).toHaveLength(11);
    expect(values[0]).toBe(0);
    expect(values[10]).toBe(1);
    expect(values[5]).toBeCloseTo(0.5, 2);
  });

  it('should preview ease-in-out', () => {
    const values = previewEasing('ease-in-out', 10);
    expect(values[0]).toBe(0);
    expect(values[10]).toBe(1);
    // Middle should be around 0.5
    expect(values[5]).toBeCloseTo(0.5, 1);
  });
});
