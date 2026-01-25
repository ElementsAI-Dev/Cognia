/**
 * Keyframe Animation System
 *
 * Provides a powerful keyframe-based animation system for video editing:
 * - Multi-property keyframing
 * - Various interpolation algorithms
 * - Easing functions
 * - Bezier curve support
 */

import { nanoid } from 'nanoid';

/**
 * Keyframe value types
 */
export type KeyframeValue =
  | number
  | { x: number; y: number }
  | { x: number; y: number; z: number }
  | { r: number; g: number; b: number; a?: number };

/**
 * Interpolation types
 */
export type InterpolationType = 'linear' | 'bezier' | 'step' | 'spline' | 'hold';

/**
 * Easing function types
 */
export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-quad'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'ease-in-quart'
  | 'ease-out-quart'
  | 'ease-in-out-quart'
  | 'ease-in-quint'
  | 'ease-out-quint'
  | 'ease-in-out-quint'
  | 'ease-in-sine'
  | 'ease-out-sine'
  | 'ease-in-out-sine'
  | 'ease-in-expo'
  | 'ease-out-expo'
  | 'ease-in-out-expo'
  | 'ease-in-circ'
  | 'ease-out-circ'
  | 'ease-in-out-circ'
  | 'ease-in-back'
  | 'ease-out-back'
  | 'ease-in-out-back'
  | 'ease-in-elastic'
  | 'ease-out-elastic'
  | 'ease-in-out-elastic'
  | 'ease-in-bounce'
  | 'ease-out-bounce'
  | 'ease-in-out-bounce';

/**
 * Bezier control points
 */
export interface BezierControlPoints {
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}

/**
 * Single keyframe
 */
export interface Keyframe {
  id: string;
  time: number;
  value: KeyframeValue;
  easing: EasingFunction;
  interpolation: InterpolationType;
  bezierControls?: BezierControlPoints;
}

/**
 * Keyframe track for a single property
 */
export interface KeyframeTrack {
  id: string;
  property: string;
  keyframes: Keyframe[];
  isEnabled: boolean;
  defaultValue: KeyframeValue;
}

/**
 * Animation layer containing multiple tracks
 */
export interface AnimationLayer {
  id: string;
  name: string;
  tracks: KeyframeTrack[];
  startTime: number;
  duration: number;
  isEnabled: boolean;
}

/**
 * Easing functions implementation
 */
const easingFunctions: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  'ease-in-quad': (t) => t * t,
  'ease-out-quad': (t) => t * (2 - t),
  'ease-in-out-quad': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  'ease-in-cubic': (t) => t * t * t,
  'ease-out-cubic': (t) => --t * t * t + 1,
  'ease-in-out-cubic': (t) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  'ease-in-quart': (t) => t * t * t * t,
  'ease-out-quart': (t) => 1 - --t * t * t * t,
  'ease-in-out-quart': (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
  'ease-in-quint': (t) => t * t * t * t * t,
  'ease-out-quint': (t) => 1 + --t * t * t * t * t,
  'ease-in-out-quint': (t) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,
  'ease-in-sine': (t) => 1 - Math.cos((t * Math.PI) / 2),
  'ease-out-sine': (t) => Math.sin((t * Math.PI) / 2),
  'ease-in-out-sine': (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  'ease-in-expo': (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  'ease-out-expo': (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  'ease-in-out-expo': (t) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? Math.pow(2, 20 * t - 10) / 2
          : (2 - Math.pow(2, -20 * t + 10)) / 2,
  'ease-in-circ': (t) => 1 - Math.sqrt(1 - t * t),
  'ease-out-circ': (t) => Math.sqrt(1 - --t * t),
  'ease-in-out-circ': (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  'ease-in-back': (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  'ease-out-back': (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  'ease-in-out-back': (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  'ease-in-elastic': (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  'ease-out-elastic': (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  'ease-in-out-elastic': (t) => {
    const c5 = (2 * Math.PI) / 4.5;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
          : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },
  'ease-in-bounce': (t) => 1 - easingFunctions['ease-out-bounce'](1 - t),
  'ease-out-bounce': (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  'ease-in-out-bounce': (t) =>
    t < 0.5
      ? (1 - easingFunctions['ease-out-bounce'](1 - 2 * t)) / 2
      : (1 + easingFunctions['ease-out-bounce'](2 * t - 1)) / 2,
};

/**
 * Keyframe Animation System
 */
export class KeyframeSystem {
  private tracks: Map<string, KeyframeTrack> = new Map();
  private layers: Map<string, AnimationLayer> = new Map();

  /**
   * Create a new keyframe track
   */
  public createTrack(property: string, defaultValue: KeyframeValue): KeyframeTrack {
    const track: KeyframeTrack = {
      id: nanoid(),
      property,
      keyframes: [],
      isEnabled: true,
      defaultValue,
    };

    this.tracks.set(track.id, track);
    return track;
  }

  /**
   * Add a track
   */
  public addTrack(track: KeyframeTrack): void {
    this.tracks.set(track.id, track);
  }

  /**
   * Remove a track
   */
  public removeTrack(trackId: string): void {
    this.tracks.delete(trackId);
  }

  /**
   * Get a track by ID
   */
  public getTrack(trackId: string): KeyframeTrack | undefined {
    return this.tracks.get(trackId);
  }

  /**
   * Get all tracks
   */
  public getAllTracks(): KeyframeTrack[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Add keyframe to a track
   */
  public addKeyframe(
    trackId: string,
    time: number,
    value: KeyframeValue,
    options: {
      easing?: EasingFunction;
      interpolation?: InterpolationType;
      bezierControls?: BezierControlPoints;
    } = {}
  ): Keyframe | null {
    const track = this.tracks.get(trackId);
    if (!track) return null;

    const keyframe: Keyframe = {
      id: nanoid(),
      time,
      value,
      easing: options.easing || 'linear',
      interpolation: options.interpolation || 'linear',
      bezierControls: options.bezierControls,
    };

    // Check if keyframe exists at this time
    const existingIndex = track.keyframes.findIndex((k) => k.time === time);
    if (existingIndex >= 0) {
      track.keyframes[existingIndex] = keyframe;
    } else {
      track.keyframes.push(keyframe);
      track.keyframes.sort((a, b) => a.time - b.time);
    }

    return keyframe;
  }

  /**
   * Remove keyframe from a track
   */
  public removeKeyframe(trackId: string, keyframeId: string): boolean {
    const track = this.tracks.get(trackId);
    if (!track) return false;

    const index = track.keyframes.findIndex((k) => k.id === keyframeId);
    if (index >= 0) {
      track.keyframes.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Update a keyframe
   */
  public updateKeyframe(
    trackId: string,
    keyframeId: string,
    updates: Partial<Omit<Keyframe, 'id'>>
  ): Keyframe | null {
    const track = this.tracks.get(trackId);
    if (!track) return null;

    const keyframe = track.keyframes.find((k) => k.id === keyframeId);
    if (!keyframe) return null;

    Object.assign(keyframe, updates);

    // Re-sort if time changed
    if (updates.time !== undefined) {
      track.keyframes.sort((a, b) => a.time - b.time);
    }

    return keyframe;
  }

  /**
   * Get value at specific time
   */
  public getValue(trackId: string, time: number): KeyframeValue | null {
    const track = this.tracks.get(trackId);
    if (!track || !track.isEnabled || track.keyframes.length === 0) {
      return track?.defaultValue || null;
    }

    // Find surrounding keyframes
    let prevKeyframe: Keyframe | null = null;
    let nextKeyframe: Keyframe | null = null;

    for (const keyframe of track.keyframes) {
      if (keyframe.time <= time) {
        prevKeyframe = keyframe;
      } else {
        nextKeyframe = keyframe;
        break;
      }
    }

    // Handle edge cases
    if (!prevKeyframe && !nextKeyframe) {
      return track.defaultValue;
    }

    if (!prevKeyframe) {
      return nextKeyframe!.value;
    }

    if (!nextKeyframe) {
      return prevKeyframe.value;
    }

    // Calculate interpolation
    const duration = nextKeyframe.time - prevKeyframe.time;
    const elapsed = time - prevKeyframe.time;
    const progress = duration > 0 ? elapsed / duration : 0;

    return this.interpolate(prevKeyframe, nextKeyframe, progress);
  }

  /**
   * Interpolate between two keyframes
   */
  private interpolate(
    from: Keyframe,
    to: Keyframe,
    progress: number
  ): KeyframeValue {
    // Apply easing
    const easedProgress = this.applyEasing(progress, from.easing);

    // Apply interpolation based on type
    switch (from.interpolation) {
      case 'linear':
        return this.linearInterpolate(from.value, to.value, easedProgress);
      case 'bezier':
        return this.bezierInterpolate(from.value, to.value, easedProgress, from.bezierControls);
      case 'step':
      case 'hold':
        return from.value;
      case 'spline':
        return this.splineInterpolate(from.value, to.value, easedProgress);
      default:
        return this.linearInterpolate(from.value, to.value, easedProgress);
    }
  }

  /**
   * Apply easing function
   */
  private applyEasing(t: number, easing: EasingFunction): number {
    const fn = easingFunctions[easing];
    return fn ? fn(t) : t;
  }

  /**
   * Linear interpolation
   */
  private linearInterpolate(
    from: KeyframeValue,
    to: KeyframeValue,
    t: number
  ): KeyframeValue {
    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * t;
    }

    if (this.isVector2(from) && this.isVector2(to)) {
      return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      };
    }

    if (this.isVector3(from) && this.isVector3(to)) {
      return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        z: from.z + (to.z - from.z) * t,
      };
    }

    if (this.isColor(from) && this.isColor(to)) {
      return {
        r: from.r + (to.r - from.r) * t,
        g: from.g + (to.g - from.g) * t,
        b: from.b + (to.b - from.b) * t,
        a: (from.a ?? 1) + ((to.a ?? 1) - (from.a ?? 1)) * t,
      };
    }

    return from;
  }

  /**
   * Bezier interpolation
   */
  private bezierInterpolate(
    from: KeyframeValue,
    to: KeyframeValue,
    t: number,
    controls?: BezierControlPoints
  ): KeyframeValue {
    if (!controls) {
      return this.linearInterpolate(from, to, t);
    }

    // Cubic bezier calculation
    const { cp1x, cp1y, cp2x, cp2y } = controls;
    const bezierT = this.cubicBezier(t, 0, cp1x, cp2x, 1);
    const bezierValue = this.cubicBezier(bezierT, 0, cp1y, cp2y, 1);

    return this.linearInterpolate(from, to, bezierValue);
  }

  /**
   * Cubic bezier calculation
   */
  private cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
  }

  /**
   * Spline interpolation (Catmull-Rom)
   */
  private splineInterpolate(
    from: KeyframeValue,
    to: KeyframeValue,
    t: number
  ): KeyframeValue {
    // Simplified spline - uses linear for now
    // Full implementation would use Catmull-Rom with neighboring keyframes
    return this.linearInterpolate(from, to, t);
  }

  /**
   * Type guards
   */
  private isVector2(value: KeyframeValue): value is { x: number; y: number } {
    return typeof value === 'object' && 'x' in value && 'y' in value && !('z' in value);
  }

  private isVector3(value: KeyframeValue): value is { x: number; y: number; z: number } {
    return typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value;
  }

  private isColor(
    value: KeyframeValue
  ): value is { r: number; g: number; b: number; a?: number } {
    return typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value;
  }

  /**
   * Create animation layer
   */
  public createLayer(name: string, startTime: number, duration: number): AnimationLayer {
    const layer: AnimationLayer = {
      id: nanoid(),
      name,
      tracks: [],
      startTime,
      duration,
      isEnabled: true,
    };

    this.layers.set(layer.id, layer);
    return layer;
  }

  /**
   * Add track to layer
   */
  public addTrackToLayer(layerId: string, trackId: string): boolean {
    const layer = this.layers.get(layerId);
    const track = this.tracks.get(trackId);

    if (!layer || !track) return false;

    if (!layer.tracks.find((t) => t.id === trackId)) {
      layer.tracks.push(track);
    }

    return true;
  }

  /**
   * Get all keyframes in a time range
   */
  public getKeyframesInRange(
    trackId: string,
    startTime: number,
    endTime: number
  ): Keyframe[] {
    const track = this.tracks.get(trackId);
    if (!track) return [];

    return track.keyframes.filter((k) => k.time >= startTime && k.time <= endTime);
  }

  /**
   * Copy keyframes
   */
  public copyKeyframes(
    trackId: string,
    keyframeIds: string[]
  ): Keyframe[] {
    const track = this.tracks.get(trackId);
    if (!track) return [];

    return track.keyframes
      .filter((k) => keyframeIds.includes(k.id))
      .map((k) => ({ ...k, id: nanoid() }));
  }

  /**
   * Paste keyframes at time offset
   */
  public pasteKeyframes(
    trackId: string,
    keyframes: Keyframe[],
    timeOffset: number
  ): Keyframe[] {
    const track = this.tracks.get(trackId);
    if (!track) return [];

    const newKeyframes: Keyframe[] = [];

    for (const kf of keyframes) {
      const newKeyframe: Keyframe = {
        ...kf,
        id: nanoid(),
        time: kf.time + timeOffset,
      };

      // Check for existing keyframe at this time
      const existingIndex = track.keyframes.findIndex((k) => k.time === newKeyframe.time);
      if (existingIndex >= 0) {
        track.keyframes[existingIndex] = newKeyframe;
      } else {
        track.keyframes.push(newKeyframe);
      }

      newKeyframes.push(newKeyframe);
    }

    track.keyframes.sort((a, b) => a.time - b.time);
    return newKeyframes;
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.tracks.clear();
    this.layers.clear();
  }

  /**
   * Export to JSON
   */
  public toJSON(): {
    tracks: KeyframeTrack[];
    layers: AnimationLayer[];
  } {
    return {
      tracks: Array.from(this.tracks.values()),
      layers: Array.from(this.layers.values()),
    };
  }

  /**
   * Import from JSON
   */
  public fromJSON(data: { tracks: KeyframeTrack[]; layers: AnimationLayer[] }): void {
    this.clear();

    for (const track of data.tracks) {
      this.tracks.set(track.id, track);
    }

    for (const layer of data.layers) {
      this.layers.set(layer.id, layer);
    }
  }
}

/**
 * Create a new keyframe system instance
 */
export function createKeyframeSystem(): KeyframeSystem {
  return new KeyframeSystem();
}

/**
 * Get all available easing functions
 */
export function getEasingFunctions(): EasingFunction[] {
  return Object.keys(easingFunctions) as EasingFunction[];
}

/**
 * Preview easing function values
 */
export function previewEasing(easing: EasingFunction, steps: number = 100): number[] {
  const fn = easingFunctions[easing];
  const values: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    values.push(fn(t));
  }

  return values;
}
