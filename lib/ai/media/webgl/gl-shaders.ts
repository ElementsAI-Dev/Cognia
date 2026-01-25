/**
 * WebGL Shaders for Image Processing
 * GLSL shader programs for GPU-accelerated image adjustments
 */

export const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

export const PASSTHROUGH_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;

  void main() {
    gl_FragColor = texture2D(u_image, v_texCoord);
  }
`;

export const BRIGHTNESS_CONTRAST_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_brightness;
  uniform float u_contrast;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // Brightness
    color.rgb += u_brightness;
    
    // Contrast
    color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
    
    gl_FragColor = clamp(color, 0.0, 1.0);
  }
`;

export const SATURATION_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_saturation;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    float gray = dot(color.rgb, vec3(0.2989, 0.587, 0.114));
    color.rgb = mix(vec3(gray), color.rgb, u_saturation);
    gl_FragColor = clamp(color, 0.0, 1.0);
  }
`;

export const HUE_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_hue;

  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    vec3 hsv = rgb2hsv(color.rgb);
    hsv.x = fract(hsv.x + u_hue);
    color.rgb = hsv2rgb(hsv);
    gl_FragColor = color;
  }
`;

export const GAUSSIAN_BLUR_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform vec2 u_direction;
  uniform float u_radius;

  void main() {
    vec4 color = vec4(0.0);
    float total = 0.0;
    
    for (float i = -20.0; i <= 20.0; i += 1.0) {
      if (abs(i) > u_radius) continue;
      float weight = exp(-i * i / (2.0 * u_radius * u_radius));
      vec2 offset = u_direction * i / u_resolution;
      color += texture2D(u_image, v_texCoord + offset) * weight;
      total += weight;
    }
    
    gl_FragColor = color / total;
  }
`;

export const SHARPEN_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform float u_amount;

  void main() {
    vec2 step = 1.0 / u_resolution;
    
    vec4 center = texture2D(u_image, v_texCoord);
    vec4 top = texture2D(u_image, v_texCoord + vec2(0.0, -step.y));
    vec4 bottom = texture2D(u_image, v_texCoord + vec2(0.0, step.y));
    vec4 left = texture2D(u_image, v_texCoord + vec2(-step.x, 0.0));
    vec4 right = texture2D(u_image, v_texCoord + vec2(step.x, 0.0));
    
    vec4 laplacian = 4.0 * center - top - bottom - left - right;
    
    gl_FragColor = clamp(center + laplacian * u_amount, 0.0, 1.0);
  }
`;

export const LEVELS_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_inputBlack;
  uniform float u_inputWhite;
  uniform float u_inputGamma;
  uniform float u_outputBlack;
  uniform float u_outputWhite;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // Input levels
    color.rgb = clamp((color.rgb - u_inputBlack) / (u_inputWhite - u_inputBlack), 0.0, 1.0);
    
    // Gamma
    color.rgb = pow(color.rgb, vec3(1.0 / u_inputGamma));
    
    // Output levels
    color.rgb = color.rgb * (u_outputWhite - u_outputBlack) + u_outputBlack;
    
    gl_FragColor = color;
  }
`;

export const CURVES_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform sampler2D u_curveLUT;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    color.r = texture2D(u_curveLUT, vec2(color.r, 0.5)).r;
    color.g = texture2D(u_curveLUT, vec2(color.g, 0.5)).g;
    color.b = texture2D(u_curveLUT, vec2(color.b, 0.5)).b;
    
    gl_FragColor = color;
  }
`;

export const HSL_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_hue;
  uniform float u_saturation;
  uniform float u_lightness;

  vec3 rgb2hsl(vec3 c) {
    float maxC = max(max(c.r, c.g), c.b);
    float minC = min(min(c.r, c.g), c.b);
    float l = (maxC + minC) / 2.0;
    
    if (maxC == minC) {
      return vec3(0.0, 0.0, l);
    }
    
    float d = maxC - minC;
    float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
    
    float h;
    if (maxC == c.r) {
      h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    } else if (maxC == c.g) {
      h = (c.b - c.r) / d + 2.0;
    } else {
      h = (c.r - c.g) / d + 4.0;
    }
    h /= 6.0;
    
    return vec3(h, s, l);
  }

  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
  }

  vec3 hsl2rgb(vec3 c) {
    if (c.y == 0.0) {
      return vec3(c.z);
    }
    
    float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
    float p = 2.0 * c.z - q;
    
    float r = hue2rgb(p, q, c.x + 1.0/3.0);
    float g = hue2rgb(p, q, c.x);
    float b = hue2rgb(p, q, c.x - 1.0/3.0);
    
    return vec3(r, g, b);
  }

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    vec3 hsl = rgb2hsl(color.rgb);
    
    hsl.x = fract(hsl.x + u_hue);
    hsl.y = clamp(hsl.y + u_saturation, 0.0, 1.0);
    hsl.z = clamp(hsl.z + u_lightness, 0.0, 1.0);
    
    color.rgb = hsl2rgb(hsl);
    gl_FragColor = color;
  }
`;

export const COLOR_BALANCE_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform vec3 u_shadows;
  uniform vec3 u_midtones;
  uniform vec3 u_highlights;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Shadows (dark areas)
    float shadowWeight = 1.0 - smoothstep(0.0, 0.5, lum);
    // Highlights (bright areas)
    float highlightWeight = smoothstep(0.5, 1.0, lum);
    // Midtones
    float midtoneWeight = 1.0 - shadowWeight - highlightWeight;
    
    color.rgb += u_shadows * shadowWeight;
    color.rgb += u_midtones * midtoneWeight;
    color.rgb += u_highlights * highlightWeight;
    
    gl_FragColor = clamp(color, 0.0, 1.0);
  }
`;

export const VIBRANCE_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_vibrance;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    float maxC = max(max(color.r, color.g), color.b);
    float minC = min(min(color.r, color.g), color.b);
    float sat = maxC - minC;
    
    // Vibrance boosts less saturated colors more
    float amount = u_vibrance * (1.0 - sat);
    
    float gray = dot(color.rgb, vec3(0.2989, 0.587, 0.114));
    color.rgb = mix(vec3(gray), color.rgb, 1.0 + amount);
    
    gl_FragColor = clamp(color, 0.0, 1.0);
  }
`;

export const NOISE_REDUCTION_FRAGMENT = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform float u_strength;
  uniform float u_preserveDetail;

  void main() {
    vec2 step = 1.0 / u_resolution;
    vec4 center = texture2D(u_image, v_texCoord);
    vec4 sum = vec4(0.0);
    float weightSum = 0.0;
    
    // Bilateral-like filtering
    for (float dy = -2.0; dy <= 2.0; dy += 1.0) {
      for (float dx = -2.0; dx <= 2.0; dx += 1.0) {
        vec2 offset = vec2(dx, dy) * step;
        vec4 sample_color = texture2D(u_image, v_texCoord + offset);
        
        // Spatial weight
        float spatialWeight = exp(-(dx*dx + dy*dy) / (2.0 * u_strength * u_strength));
        
        // Range weight (color similarity)
        vec3 diff = sample_color.rgb - center.rgb;
        float rangeWeight = exp(-dot(diff, diff) / (2.0 * u_preserveDetail * u_preserveDetail));
        
        float weight = spatialWeight * rangeWeight;
        sum += sample_color * weight;
        weightSum += weight;
      }
    }
    
    gl_FragColor = sum / weightSum;
  }
`;

/**
 * Shader type definitions
 */
export type ShaderType =
  | 'passthrough'
  | 'brightness-contrast'
  | 'saturation'
  | 'hue'
  | 'blur'
  | 'sharpen'
  | 'levels'
  | 'curves'
  | 'hsl'
  | 'color-balance'
  | 'vibrance'
  | 'noise-reduction';

/**
 * Get fragment shader source by type
 */
export function getFragmentShader(type: ShaderType): string {
  const shaders: Record<ShaderType, string> = {
    'passthrough': PASSTHROUGH_FRAGMENT,
    'brightness-contrast': BRIGHTNESS_CONTRAST_FRAGMENT,
    'saturation': SATURATION_FRAGMENT,
    'hue': HUE_FRAGMENT,
    'blur': GAUSSIAN_BLUR_FRAGMENT,
    'sharpen': SHARPEN_FRAGMENT,
    'levels': LEVELS_FRAGMENT,
    'curves': CURVES_FRAGMENT,
    'hsl': HSL_FRAGMENT,
    'color-balance': COLOR_BALANCE_FRAGMENT,
    'vibrance': VIBRANCE_FRAGMENT,
    'noise-reduction': NOISE_REDUCTION_FRAGMENT,
  };

  return shaders[type];
}
