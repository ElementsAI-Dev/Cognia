/**
 * Shared test utilities for workflow node tests
 */

/**
 * Base mock props that satisfy NodeProps requirements from @xyflow/react
 */
export const createMockNodeProps = <T extends Record<string, unknown>>(
  id: string,
  data: T,
  overrides: Partial<{
    selected: boolean;
    type: string;
    draggable: boolean;
    selectable: boolean;
    deletable: boolean;
    dragging: boolean;
    zIndex: number;
    isConnectable: boolean;
    positionAbsoluteX: number;
    positionAbsoluteY: number;
  }> = {}
) => ({
  id,
  data,
  selected: false,
  type: 'custom',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  ...overrides,
});

/**
 * Default NodeProps base for spreading
 */
export const defaultNodePropsBase = {
  selected: false,
  type: 'custom',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
} as const;
