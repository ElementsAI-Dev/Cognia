/**
 * Advanced Transitions Library
 *
 * Comprehensive transition effects for video editing:
 * - Fade, wipe, zoom, slide transitions
 * - 3D transitions (cube, flip, page curl)
 * - Lens transitions (iris, zoom blur)
 * - Distortion transitions (ripple, pixelate)
 */

import { nanoid } from 'nanoid';

/**
 * Transition categories
 */
export type TransitionCategory =
  | 'basic'
  | '3d'
  | 'lens'
  | 'distortion'
  | 'blend'
  | 'mask'
  | 'custom';

/**
 * Transition direction
 */
export type TransitionDirection =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'in'
  | 'out'
  | 'clockwise'
  | 'counterclockwise';

/**
 * Transition definition
 */
export interface TransitionDefinition {
  id: string;
  name: string;
  category: TransitionCategory;
  description: string;
  defaultDuration: number;
  minDuration: number;
  maxDuration: number;
  supportsDirection: boolean;
  defaultDirection?: TransitionDirection;
  parameters: TransitionParameter[];
  shader?: string;
  thumbnail?: string;
}

/**
 * Transition parameter
 */
export interface TransitionParameter {
  name: string;
  type: 'number' | 'color' | 'boolean' | 'select';
  label: string;
  defaultValue: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
}

/**
 * Transition instance with configuration
 */
export interface TransitionInstance {
  id: string;
  transitionId: string;
  duration: number;
  direction?: TransitionDirection;
  parameters: Record<string, number | string | boolean>;
  startTime: number;
  clipAId: string;
  clipBId: string;
}

/**
 * Basic transitions
 */
const BASIC_TRANSITIONS: TransitionDefinition[] = [
  {
    id: 'fade',
    name: 'Fade',
    category: 'basic',
    description: 'Simple crossfade between clips',
    defaultDuration: 500,
    minDuration: 100,
    maxDuration: 3000,
    supportsDirection: false,
    parameters: [],
  },
  {
    id: 'dissolve',
    name: 'Dissolve',
    category: 'basic',
    description: 'Gradual dissolve with noise',
    defaultDuration: 800,
    minDuration: 200,
    maxDuration: 3000,
    supportsDirection: false,
    parameters: [
      {
        name: 'softness',
        type: 'number',
        label: 'Softness',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
      },
    ],
  },
  {
    id: 'wipe',
    name: 'Wipe',
    category: 'basic',
    description: 'Wipe transition from one side',
    defaultDuration: 600,
    minDuration: 200,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'right',
    parameters: [
      {
        name: 'softEdge',
        type: 'number',
        label: 'Soft Edge',
        defaultValue: 0.02,
        min: 0,
        max: 0.2,
        step: 0.01,
      },
    ],
  },
  {
    id: 'slide',
    name: 'Slide',
    category: 'basic',
    description: 'Slide new clip over old clip',
    defaultDuration: 500,
    minDuration: 200,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'left',
    parameters: [],
  },
  {
    id: 'push',
    name: 'Push',
    category: 'basic',
    description: 'Push old clip out with new clip',
    defaultDuration: 500,
    minDuration: 200,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'left',
    parameters: [],
  },
];

/**
 * 3D transitions
 */
const TRANSITIONS_3D: TransitionDefinition[] = [
  {
    id: 'cube',
    name: '3D Cube',
    category: '3d',
    description: 'Rotate clips like faces of a cube',
    defaultDuration: 800,
    minDuration: 400,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'left',
    parameters: [
      {
        name: 'perspective',
        type: 'number',
        label: 'Perspective',
        defaultValue: 0.5,
        min: 0.1,
        max: 1,
        step: 0.1,
      },
    ],
  },
  {
    id: 'flip',
    name: '3D Flip',
    category: '3d',
    description: 'Flip transition like a card',
    defaultDuration: 700,
    minDuration: 300,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'right',
    parameters: [
      {
        name: 'axis',
        type: 'select',
        label: 'Flip Axis',
        defaultValue: 'horizontal',
        options: [
          { label: 'Horizontal', value: 'horizontal' },
          { label: 'Vertical', value: 'vertical' },
        ],
      },
    ],
  },
  {
    id: 'pageCurl',
    name: 'Page Curl',
    category: '3d',
    description: 'Page curl effect like turning a page',
    defaultDuration: 1000,
    minDuration: 500,
    maxDuration: 3000,
    supportsDirection: true,
    defaultDirection: 'left',
    parameters: [
      {
        name: 'radius',
        type: 'number',
        label: 'Curl Radius',
        defaultValue: 0.2,
        min: 0.05,
        max: 0.5,
        step: 0.05,
      },
      {
        name: 'shadow',
        type: 'number',
        label: 'Shadow Intensity',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
      },
    ],
  },
  {
    id: 'fold',
    name: '3D Fold',
    category: '3d',
    description: 'Fold transition with multiple panels',
    defaultDuration: 800,
    minDuration: 400,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'right',
    parameters: [
      {
        name: 'folds',
        type: 'number',
        label: 'Number of Folds',
        defaultValue: 4,
        min: 2,
        max: 8,
        step: 1,
      },
    ],
  },
];

/**
 * Lens transitions
 */
const LENS_TRANSITIONS: TransitionDefinition[] = [
  {
    id: 'iris',
    name: 'Iris',
    category: 'lens',
    description: 'Circular iris wipe',
    defaultDuration: 600,
    minDuration: 200,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'in',
    parameters: [
      {
        name: 'centerX',
        type: 'number',
        label: 'Center X',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
      },
      {
        name: 'centerY',
        type: 'number',
        label: 'Center Y',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
      },
    ],
  },
  {
    id: 'zoomBlur',
    name: 'Zoom Blur',
    category: 'lens',
    description: 'Zoom with motion blur',
    defaultDuration: 500,
    minDuration: 200,
    maxDuration: 1500,
    supportsDirection: true,
    defaultDirection: 'in',
    parameters: [
      {
        name: 'strength',
        type: 'number',
        label: 'Blur Strength',
        defaultValue: 0.3,
        min: 0.1,
        max: 1,
        step: 0.1,
      },
    ],
  },
  {
    id: 'radialBlur',
    name: 'Radial Blur',
    category: 'lens',
    description: 'Radial motion blur transition',
    defaultDuration: 600,
    minDuration: 300,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'clockwise',
    parameters: [
      {
        name: 'strength',
        type: 'number',
        label: 'Blur Strength',
        defaultValue: 0.2,
        min: 0.05,
        max: 0.5,
        step: 0.05,
      },
    ],
  },
  {
    id: 'lensFlare',
    name: 'Lens Flare',
    category: 'lens',
    description: 'Lens flare transition effect',
    defaultDuration: 700,
    minDuration: 300,
    maxDuration: 2000,
    supportsDirection: false,
    parameters: [
      {
        name: 'intensity',
        type: 'number',
        label: 'Flare Intensity',
        defaultValue: 0.8,
        min: 0.3,
        max: 1,
        step: 0.1,
      },
      {
        name: 'color',
        type: 'color',
        label: 'Flare Color',
        defaultValue: '#ffffff',
      },
    ],
  },
];

/**
 * Distortion transitions
 */
const DISTORTION_TRANSITIONS: TransitionDefinition[] = [
  {
    id: 'ripple',
    name: 'Ripple',
    category: 'distortion',
    description: 'Water ripple distortion',
    defaultDuration: 800,
    minDuration: 400,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'in',
    parameters: [
      {
        name: 'amplitude',
        type: 'number',
        label: 'Amplitude',
        defaultValue: 0.1,
        min: 0.02,
        max: 0.3,
        step: 0.02,
      },
      {
        name: 'frequency',
        type: 'number',
        label: 'Frequency',
        defaultValue: 10,
        min: 2,
        max: 30,
        step: 1,
      },
    ],
  },
  {
    id: 'pixelate',
    name: 'Pixelate',
    category: 'distortion',
    description: 'Pixelation transition effect',
    defaultDuration: 600,
    minDuration: 300,
    maxDuration: 1500,
    supportsDirection: false,
    parameters: [
      {
        name: 'maxSize',
        type: 'number',
        label: 'Max Pixel Size',
        defaultValue: 50,
        min: 10,
        max: 100,
        step: 5,
      },
    ],
  },
  {
    id: 'glitch',
    name: 'Glitch',
    category: 'distortion',
    description: 'Digital glitch effect',
    defaultDuration: 400,
    minDuration: 200,
    maxDuration: 1000,
    supportsDirection: false,
    parameters: [
      {
        name: 'intensity',
        type: 'number',
        label: 'Glitch Intensity',
        defaultValue: 0.5,
        min: 0.1,
        max: 1,
        step: 0.1,
      },
      {
        name: 'colorSplit',
        type: 'boolean',
        label: 'Color Split',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'morph',
    name: 'Morph',
    category: 'distortion',
    description: 'Morphing distortion effect',
    defaultDuration: 1000,
    minDuration: 500,
    maxDuration: 3000,
    supportsDirection: false,
    parameters: [
      {
        name: 'strength',
        type: 'number',
        label: 'Morph Strength',
        defaultValue: 0.5,
        min: 0.1,
        max: 1,
        step: 0.1,
      },
    ],
  },
];

/**
 * Blend transitions
 */
const BLEND_TRANSITIONS: TransitionDefinition[] = [
  {
    id: 'additive',
    name: 'Additive',
    category: 'blend',
    description: 'Additive blend transition',
    defaultDuration: 500,
    minDuration: 200,
    maxDuration: 1500,
    supportsDirection: false,
    parameters: [],
  },
  {
    id: 'multiply',
    name: 'Multiply',
    category: 'blend',
    description: 'Multiply blend transition',
    defaultDuration: 500,
    minDuration: 200,
    maxDuration: 1500,
    supportsDirection: false,
    parameters: [],
  },
  {
    id: 'difference',
    name: 'Difference',
    category: 'blend',
    description: 'Difference blend transition',
    defaultDuration: 500,
    minDuration: 200,
    maxDuration: 1500,
    supportsDirection: false,
    parameters: [],
  },
  {
    id: 'overlay',
    name: 'Overlay',
    category: 'blend',
    description: 'Overlay blend transition',
    defaultDuration: 500,
    minDuration: 200,
    maxDuration: 1500,
    supportsDirection: false,
    parameters: [],
  },
];

/**
 * Mask transitions
 */
const MASK_TRANSITIONS: TransitionDefinition[] = [
  {
    id: 'gradientWipe',
    name: 'Gradient Wipe',
    category: 'mask',
    description: 'Wipe with gradient mask',
    defaultDuration: 700,
    minDuration: 300,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'right',
    parameters: [
      {
        name: 'softness',
        type: 'number',
        label: 'Gradient Softness',
        defaultValue: 0.3,
        min: 0,
        max: 1,
        step: 0.1,
      },
    ],
  },
  {
    id: 'shapeMask',
    name: 'Shape Mask',
    category: 'mask',
    description: 'Reveal through animated shape',
    defaultDuration: 600,
    minDuration: 300,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'in',
    parameters: [
      {
        name: 'shape',
        type: 'select',
        label: 'Shape',
        defaultValue: 'circle',
        options: [
          { label: 'Circle', value: 'circle' },
          { label: 'Rectangle', value: 'rectangle' },
          { label: 'Diamond', value: 'diamond' },
          { label: 'Star', value: 'star' },
          { label: 'Heart', value: 'heart' },
        ],
      },
      {
        name: 'softEdge',
        type: 'number',
        label: 'Edge Softness',
        defaultValue: 0.05,
        min: 0,
        max: 0.2,
        step: 0.01,
      },
    ],
  },
  {
    id: 'clock',
    name: 'Clock Wipe',
    category: 'mask',
    description: 'Radial clock-style wipe',
    defaultDuration: 800,
    minDuration: 400,
    maxDuration: 2000,
    supportsDirection: true,
    defaultDirection: 'clockwise',
    parameters: [
      {
        name: 'startAngle',
        type: 'number',
        label: 'Start Angle',
        defaultValue: 0,
        min: 0,
        max: 360,
        step: 15,
      },
    ],
  },
];

/**
 * All transitions combined
 */
const ALL_TRANSITIONS: TransitionDefinition[] = [
  ...BASIC_TRANSITIONS,
  ...TRANSITIONS_3D,
  ...LENS_TRANSITIONS,
  ...DISTORTION_TRANSITIONS,
  ...BLEND_TRANSITIONS,
  ...MASK_TRANSITIONS,
];

/**
 * Transition Library Manager
 */
export class TransitionLibrary {
  private transitions: Map<string, TransitionDefinition> = new Map();
  private customTransitions: Map<string, TransitionDefinition> = new Map();

  constructor() {
    // Load built-in transitions
    ALL_TRANSITIONS.forEach((t) => {
      this.transitions.set(t.id, t);
    });
  }

  /**
   * Get all transitions
   */
  public getAllTransitions(): TransitionDefinition[] {
    return [
      ...Array.from(this.transitions.values()),
      ...Array.from(this.customTransitions.values()),
    ];
  }

  /**
   * Get transitions by category
   */
  public getByCategory(category: TransitionCategory): TransitionDefinition[] {
    return this.getAllTransitions().filter((t) => t.category === category);
  }

  /**
   * Get transition by ID
   */
  public getById(id: string): TransitionDefinition | undefined {
    return this.transitions.get(id) || this.customTransitions.get(id);
  }

  /**
   * Search transitions
   */
  public search(query: string): TransitionDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTransitions().filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Create transition instance
   */
  public createInstance(
    transitionId: string,
    clipAId: string,
    clipBId: string,
    startTime: number,
    options: {
      duration?: number;
      direction?: TransitionDirection;
      parameters?: Record<string, number | string | boolean>;
    } = {}
  ): TransitionInstance | null {
    const definition = this.getById(transitionId);
    if (!definition) return null;

    // Build default parameters
    const defaultParams: Record<string, number | string | boolean> = {};
    definition.parameters.forEach((p) => {
      defaultParams[p.name] = p.defaultValue;
    });

    return {
      id: nanoid(),
      transitionId,
      duration: options.duration ?? definition.defaultDuration,
      direction: options.direction ?? definition.defaultDirection,
      parameters: { ...defaultParams, ...options.parameters },
      startTime,
      clipAId,
      clipBId,
    };
  }

  /**
   * Register custom transition
   */
  public registerCustom(transition: Omit<TransitionDefinition, 'id'>): TransitionDefinition {
    const id = `custom_${nanoid()}`;
    const customTransition: TransitionDefinition = {
      ...transition,
      id,
      category: 'custom',
    };

    this.customTransitions.set(id, customTransition);
    return customTransition;
  }

  /**
   * Remove custom transition
   */
  public removeCustom(id: string): boolean {
    return this.customTransitions.delete(id);
  }

  /**
   * Get categories with counts
   */
  public getCategories(): { category: TransitionCategory; count: number }[] {
    const categories = new Map<TransitionCategory, number>();

    this.getAllTransitions().forEach((t) => {
      categories.set(t.category, (categories.get(t.category) || 0) + 1);
    });

    return Array.from(categories.entries()).map(([category, count]) => ({
      category,
      count,
    }));
  }

  /**
   * Validate transition instance
   */
  public validateInstance(instance: TransitionInstance): string[] {
    const errors: string[] = [];
    const definition = this.getById(instance.transitionId);

    if (!definition) {
      errors.push(`Transition not found: ${instance.transitionId}`);
      return errors;
    }

    if (instance.duration < definition.minDuration) {
      errors.push(`Duration ${instance.duration}ms is below minimum ${definition.minDuration}ms`);
    }

    if (instance.duration > definition.maxDuration) {
      errors.push(`Duration ${instance.duration}ms exceeds maximum ${definition.maxDuration}ms`);
    }

    if (instance.direction && !definition.supportsDirection) {
      errors.push(`Transition ${definition.name} does not support direction`);
    }

    return errors;
  }
}

// Singleton instance
let libraryInstance: TransitionLibrary | null = null;

/**
 * Get the transition library instance
 */
export function getTransitionLibrary(): TransitionLibrary {
  if (!libraryInstance) {
    libraryInstance = new TransitionLibrary();
  }
  return libraryInstance;
}

/**
 * Get all available transition categories
 */
export function getTransitionCategories(): TransitionCategory[] {
  return ['basic', '3d', 'lens', 'distortion', 'blend', 'mask', 'custom'];
}
