/**
 * Video Processing Shaders
 *
 * GLSL shaders for GPU-accelerated video effects and transformations.
 */

/**
 * Vertex shader for video processing
 * Simple pass-through that maps texture coordinates
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

/**
 * Base fragment shader for texture sampling
 */
export const PASSTHROUGH_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  varying vec2 v_texCoord;
  
  void main() {
    gl_FragColor = texture2D(u_texture, v_texCoord);
  }
`;

/**
 * Brightness adjustment shader
 */
export const BRIGHTNESS_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_brightness;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    color.rgb += u_brightness;
    gl_FragColor = clamp(color, 0.0, 1.0);
  }
`;

/**
 * Contrast adjustment shader
 */
export const CONTRAST_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_contrast;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
    gl_FragColor = clamp(color, 0.0, 1.0);
  }
`;

/**
 * Saturation adjustment shader
 */
export const SATURATION_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_saturation;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    float gray = dot(color.rgb, vec3(0.2989, 0.587, 0.114));
    color.rgb = mix(vec3(gray), color.rgb, u_saturation);
    gl_FragColor = clamp(color, 0.0, 1.0);
  }
`;

/**
 * Hue rotation shader
 */
export const HUE_ROTATION_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_hue;
  varying vec2 v_texCoord;
  
  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }
  
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    vec3 hsv = rgb2hsv(color.rgb);
    hsv.x = fract(hsv.x + u_hue);
    color.rgb = hsv2rgb(hsv);
    gl_FragColor = color;
  }
`;

/**
 * Gaussian blur shader (horizontal pass)
 */
export const BLUR_HORIZONTAL_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform float u_radius;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = vec4(0.0);
    float total = 0.0;
    float sigma = u_radius / 3.0;
    
    for (float x = -10.0; x <= 10.0; x += 1.0) {
      float offset = x * u_radius / 10.0;
      float weight = exp(-(offset * offset) / (2.0 * sigma * sigma));
      vec2 coord = v_texCoord + vec2(offset / u_resolution.x, 0.0);
      color += texture2D(u_texture, coord) * weight;
      total += weight;
    }
    
    gl_FragColor = color / total;
  }
`;

/**
 * Gaussian blur shader (vertical pass)
 */
export const BLUR_VERTICAL_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform float u_radius;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = vec4(0.0);
    float total = 0.0;
    float sigma = u_radius / 3.0;
    
    for (float y = -10.0; y <= 10.0; y += 1.0) {
      float offset = y * u_radius / 10.0;
      float weight = exp(-(offset * offset) / (2.0 * sigma * sigma));
      vec2 coord = v_texCoord + vec2(0.0, offset / u_resolution.y);
      color += texture2D(u_texture, coord) * weight;
      total += weight;
    }
    
    gl_FragColor = color / total;
  }
`;

/**
 * Sharpen shader
 */
export const SHARPEN_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform float u_amount;
  varying vec2 v_texCoord;
  
  void main() {
    vec2 texel = 1.0 / u_resolution;
    
    vec4 center = texture2D(u_texture, v_texCoord);
    vec4 top = texture2D(u_texture, v_texCoord + vec2(0.0, texel.y));
    vec4 bottom = texture2D(u_texture, v_texCoord - vec2(0.0, texel.y));
    vec4 left = texture2D(u_texture, v_texCoord - vec2(texel.x, 0.0));
    vec4 right = texture2D(u_texture, v_texCoord + vec2(texel.x, 0.0));
    
    vec4 laplacian = 4.0 * center - top - bottom - left - right;
    gl_FragColor = clamp(center + laplacian * u_amount, 0.0, 1.0);
  }
`;

/**
 * Grayscale shader
 */
export const GRAYSCALE_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    float gray = dot(color.rgb, vec3(0.2989, 0.587, 0.114));
    gl_FragColor = vec4(vec3(gray), color.a);
  }
`;

/**
 * Sepia shader
 */
export const SEPIA_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_amount;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    
    vec3 sepia = vec3(
      dot(color.rgb, vec3(0.393, 0.769, 0.189)),
      dot(color.rgb, vec3(0.349, 0.686, 0.168)),
      dot(color.rgb, vec3(0.272, 0.534, 0.131))
    );
    
    color.rgb = mix(color.rgb, sepia, u_amount);
    gl_FragColor = color;
  }
`;

/**
 * Invert shader
 */
export const INVERT_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    color.rgb = 1.0 - color.rgb;
    gl_FragColor = color;
  }
`;

/**
 * Vignette shader
 */
export const VIGNETTE_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_amount;
  uniform float u_radius;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    vec2 center = v_texCoord - 0.5;
    float dist = length(center);
    float vignette = smoothstep(u_radius, u_radius - 0.3, dist);
    color.rgb *= mix(1.0 - u_amount, 1.0, vignette);
    gl_FragColor = color;
  }
`;

/**
 * Color correction shader (lift/gamma/gain)
 */
export const COLOR_CORRECTION_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform vec3 u_lift;
  uniform vec3 u_gamma;
  uniform vec3 u_gain;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    
    // Apply lift (shadows)
    color.rgb = color.rgb + u_lift * (1.0 - color.rgb);
    
    // Apply gamma (midtones)
    color.rgb = pow(color.rgb, 1.0 / u_gamma);
    
    // Apply gain (highlights)
    color.rgb = color.rgb * u_gain;
    
    gl_FragColor = clamp(color, 0.0, 1.0);
  }
`;

/**
 * Chromatic aberration shader
 */
export const CHROMATIC_ABERRATION_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_amount;
  uniform vec2 u_center;
  varying vec2 v_texCoord;
  
  void main() {
    vec2 dir = v_texCoord - u_center;
    float dist = length(dir);
    vec2 offset = dir * dist * u_amount;
    
    float r = texture2D(u_texture, v_texCoord + offset).r;
    float g = texture2D(u_texture, v_texCoord).g;
    float b = texture2D(u_texture, v_texCoord - offset).b;
    float a = texture2D(u_texture, v_texCoord).a;
    
    gl_FragColor = vec4(r, g, b, a);
  }
`;

/**
 * Film grain shader
 */
export const FILM_GRAIN_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_amount;
  uniform float u_time;
  varying vec2 v_texCoord;
  
  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    float grain = random(v_texCoord + u_time) * 2.0 - 1.0;
    color.rgb += grain * u_amount;
    gl_FragColor = clamp(color, 0.0, 1.0);
  }
`;

/**
 * Cross-process shader (retro film look)
 */
export const CROSS_PROCESS_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_amount;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    
    // Cross-process curves
    color.r = pow(color.r, 0.8);
    color.g = pow(color.g, 1.1);
    color.b = pow(color.b, 1.3);
    
    // Add cyan to shadows, yellow to highlights
    color.r += 0.1 * (1.0 - color.r);
    color.b += 0.15 * color.b;
    
    vec4 original = texture2D(u_texture, v_texCoord);
    gl_FragColor = mix(original, clamp(color, 0.0, 1.0), u_amount);
  }
`;

/**
 * Transition: Fade shader
 */
export const FADE_TRANSITION_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture1;
  uniform sampler2D u_texture2;
  uniform float u_progress;
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color1 = texture2D(u_texture1, v_texCoord);
    vec4 color2 = texture2D(u_texture2, v_texCoord);
    gl_FragColor = mix(color1, color2, u_progress);
  }
`;

/**
 * Transition: Wipe shader
 */
export const WIPE_TRANSITION_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture1;
  uniform sampler2D u_texture2;
  uniform float u_progress;
  uniform float u_direction; // 0: left-right, 1: top-bottom, 2: diagonal
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color1 = texture2D(u_texture1, v_texCoord);
    vec4 color2 = texture2D(u_texture2, v_texCoord);
    
    float coord;
    if (u_direction < 0.5) {
      coord = v_texCoord.x;
    } else if (u_direction < 1.5) {
      coord = v_texCoord.y;
    } else {
      coord = (v_texCoord.x + v_texCoord.y) / 2.0;
    }
    
    float edge = u_progress;
    float blend = smoothstep(edge - 0.02, edge + 0.02, coord);
    
    gl_FragColor = mix(color2, color1, blend);
  }
`;

/**
 * Transition: Zoom shader
 */
export const ZOOM_TRANSITION_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture1;
  uniform sampler2D u_texture2;
  uniform float u_progress;
  varying vec2 v_texCoord;
  
  void main() {
    float scale = 1.0 + u_progress;
    vec2 center = vec2(0.5, 0.5);
    vec2 uv1 = (v_texCoord - center) / scale + center;
    
    vec4 color1 = texture2D(u_texture1, uv1);
    vec4 color2 = texture2D(u_texture2, v_texCoord);
    
    float alpha = u_progress;
    gl_FragColor = mix(color1, color2, alpha);
  }
`;

/**
 * Shader type mapping
 */
export type ShaderType =
  | 'passthrough'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'blur_h'
  | 'blur_v'
  | 'sharpen'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'vignette'
  | 'color_correction'
  | 'chromatic_aberration'
  | 'film_grain'
  | 'cross_process'
  | 'fade_transition'
  | 'wipe_transition'
  | 'zoom_transition';

/**
 * Get fragment shader source by type
 */
export function getFragmentShader(type: ShaderType): string {
  const shaders: Record<ShaderType, string> = {
    passthrough: PASSTHROUGH_SHADER,
    brightness: BRIGHTNESS_SHADER,
    contrast: CONTRAST_SHADER,
    saturation: SATURATION_SHADER,
    hue: HUE_ROTATION_SHADER,
    blur_h: BLUR_HORIZONTAL_SHADER,
    blur_v: BLUR_VERTICAL_SHADER,
    sharpen: SHARPEN_SHADER,
    grayscale: GRAYSCALE_SHADER,
    sepia: SEPIA_SHADER,
    invert: INVERT_SHADER,
    vignette: VIGNETTE_SHADER,
    color_correction: COLOR_CORRECTION_SHADER,
    chromatic_aberration: CHROMATIC_ABERRATION_SHADER,
    film_grain: FILM_GRAIN_SHADER,
    cross_process: CROSS_PROCESS_SHADER,
    fade_transition: FADE_TRANSITION_SHADER,
    wipe_transition: WIPE_TRANSITION_SHADER,
    zoom_transition: ZOOM_TRANSITION_SHADER,
  };

  return shaders[type] || PASSTHROUGH_SHADER;
}
