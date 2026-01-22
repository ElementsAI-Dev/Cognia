/**
 * Utility hooks
 */

export { useDebounce, useDebouncedCallback } from './use-debounce';
export { useIsMobile } from './use-mobile';
export { useDevice, useIsTouch, type DeviceInfo } from './use-device';
export {
  useSwipeGesture,
  type SwipeDirection,
  type SwipeOptions,
  type SwipeState,
} from './use-swipe-gesture';
export {
  useResizeObserver,
  useLayoutRecalculation,
  useMonacoLayoutSync,
  usePreviewRefreshTrigger,
  type Size,
  type ResizeObserverOptions,
} from './use-resize-observer';
export {
  useElementResize,
  type ResizeHandle,
  type ResizeState,
  type ElementDimensions,
  type UseElementResizeOptions,
  type UseElementResizeReturn,
} from './use-element-resize';
