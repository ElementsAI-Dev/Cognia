/**
 * Image Adjustments
 * Advanced image adjustment utilities
 */

export {
  applyLevels,
  applyAutoLevels,
  applyAutoContrast,
  calculateHistogram,
  autoLevels,
  createLevelsLUT,
  DEFAULT_LEVELS,
} from './levels';
export type { LevelsOptions } from './levels';

export {
  applyCurves,
  createCurveLUT,
  createCurveLUTLinear,
  sortCurvePoints,
  createContrastCurve,
  createBrightnessCurve,
  combineCurves,
  createCurveFromFunction,
  CURVE_PRESETS,
  DEFAULT_CURVE,
  DEFAULT_CURVES,
} from './curves';
export type { CurvePoint, CurvesOptions } from './curves';

export {
  applyHSL,
  applyTargetedHSL,
  applyChannelHSL,
  applyVibrance,
  applyTemperature,
  applyTint,
  rgbToHsl,
  hslToRgb,
  DEFAULT_HSL,
  HUE_RANGES,
} from './hsl';
export type { HSLOptions, HSLTargetedOptions, HSLChannelOptions } from './hsl';

export {
  applyNoiseReduction,
  applySharpen,
  applyClarity,
  applyDehaze,
  DEFAULT_NOISE_REDUCTION,
  DEFAULT_SHARPEN,
} from './noise-sharpen';
export type { NoiseReductionOptions, SharpenOptions } from './noise-sharpen';
