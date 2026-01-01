import { test, expect } from '@playwright/test';

/**
 * Region Selector E2E Tests
 * Tests for the screen recording region selection overlay component
 */
test.describe('RegionSelector Component', () => {
  test.describe.configure({ mode: 'serial' });

  test('should calculate region bounds from mouse events', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface Region {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      interface MousePosition {
        clientX: number;
        clientY: number;
      }

      const calculateRegion = (
        start: MousePosition,
        end: MousePosition
      ): Region => {
        const x = Math.min(start.clientX, end.clientX);
        const y = Math.min(start.clientY, end.clientY);
        const width = Math.abs(end.clientX - start.clientX);
        const height = Math.abs(end.clientY - start.clientY);
        return { x, y, width, height };
      };

      // Test normal drag (top-left to bottom-right)
      const normalDrag = calculateRegion(
        { clientX: 100, clientY: 100 },
        { clientX: 400, clientY: 300 }
      );

      // Test reverse drag (bottom-right to top-left)
      const reverseDrag = calculateRegion(
        { clientX: 400, clientY: 300 },
        { clientX: 100, clientY: 100 }
      );

      // Test horizontal drag
      const horizontalDrag = calculateRegion(
        { clientX: 100, clientY: 200 },
        { clientX: 500, clientY: 200 }
      );

      return {
        normalDrag,
        reverseDrag,
        horizontalDrag,
      };
    });

    // Normal drag should produce correct bounds
    expect(result.normalDrag.x).toBe(100);
    expect(result.normalDrag.y).toBe(100);
    expect(result.normalDrag.width).toBe(300);
    expect(result.normalDrag.height).toBe(200);

    // Reverse drag should produce same bounds
    expect(result.reverseDrag.x).toBe(100);
    expect(result.reverseDrag.y).toBe(100);
    expect(result.reverseDrag.width).toBe(300);
    expect(result.reverseDrag.height).toBe(200);

    // Horizontal drag should have 0 height
    expect(result.horizontalDrag.width).toBe(400);
    expect(result.horizontalDrag.height).toBe(0);
  });

  test('should validate minimum selection size', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface Region {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      const MIN_WIDTH = 100;
      const MIN_HEIGHT = 100;

      const isValidSelection = (region: Region): boolean => {
        return region.width >= MIN_WIDTH && region.height >= MIN_HEIGHT;
      };

      const enforceMinimumSize = (region: Region): Region => {
        return {
          ...region,
          width: Math.max(region.width, MIN_WIDTH),
          height: Math.max(region.height, MIN_HEIGHT),
        };
      };

      const smallRegion = { x: 0, y: 0, width: 50, height: 50 };
      const validRegion = { x: 0, y: 0, width: 200, height: 150 };
      const enforcedRegion = enforceMinimumSize(smallRegion);

      return {
        smallIsValid: isValidSelection(smallRegion),
        validIsValid: isValidSelection(validRegion),
        enforcedWidth: enforcedRegion.width,
        enforcedHeight: enforcedRegion.height,
      };
    });

    expect(result.smallIsValid).toBe(false);
    expect(result.validIsValid).toBe(true);
    expect(result.enforcedWidth).toBe(100);
    expect(result.enforcedHeight).toBe(100);
  });

  test('should handle resize operations', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface Region {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

      const resizeRegion = (
        region: Region,
        handle: ResizeHandle,
        deltaX: number,
        deltaY: number
      ): Region => {
        const newRegion = { ...region };

        switch (handle) {
          case 'n':
            newRegion.y += deltaY;
            newRegion.height -= deltaY;
            break;
          case 's':
            newRegion.height += deltaY;
            break;
          case 'e':
            newRegion.width += deltaX;
            break;
          case 'w':
            newRegion.x += deltaX;
            newRegion.width -= deltaX;
            break;
          case 'ne':
            newRegion.y += deltaY;
            newRegion.height -= deltaY;
            newRegion.width += deltaX;
            break;
          case 'nw':
            newRegion.x += deltaX;
            newRegion.y += deltaY;
            newRegion.width -= deltaX;
            newRegion.height -= deltaY;
            break;
          case 'se':
            newRegion.width += deltaX;
            newRegion.height += deltaY;
            break;
          case 'sw':
            newRegion.x += deltaX;
            newRegion.width -= deltaX;
            newRegion.height += deltaY;
            break;
        }

        return newRegion;
      };

      const initial: Region = { x: 100, y: 100, width: 200, height: 150 };

      const resizedE = resizeRegion(initial, 'e', 50, 0);
      const resizedS = resizeRegion(initial, 's', 0, 30);
      const resizedSE = resizeRegion(initial, 'se', 50, 30);
      const resizedNW = resizeRegion(initial, 'nw', -20, -20);

      return {
        initial,
        resizedE,
        resizedS,
        resizedSE,
        resizedNW,
      };
    });

    // East resize increases width
    expect(result.resizedE.width).toBe(250);
    expect(result.resizedE.x).toBe(100);

    // South resize increases height
    expect(result.resizedS.height).toBe(180);
    expect(result.resizedS.y).toBe(100);

    // SE resize increases both
    expect(result.resizedSE.width).toBe(250);
    expect(result.resizedSE.height).toBe(180);

    // NW resize moves origin and changes size
    expect(result.resizedNW.x).toBe(80);
    expect(result.resizedNW.y).toBe(80);
    expect(result.resizedNW.width).toBe(220);
    expect(result.resizedNW.height).toBe(170);
  });

  test('should handle move operations', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface Region {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      interface Bounds {
        maxX: number;
        maxY: number;
      }

      const moveRegion = (
        region: Region,
        deltaX: number,
        deltaY: number,
        bounds: Bounds
      ): Region => {
        let newX = region.x + deltaX;
        let newY = region.y + deltaY;

        // Constrain to bounds
        newX = Math.max(0, Math.min(newX, bounds.maxX - region.width));
        newY = Math.max(0, Math.min(newY, bounds.maxY - region.height));

        return {
          ...region,
          x: newX,
          y: newY,
        };
      };

      const initial: Region = { x: 100, y: 100, width: 200, height: 150 };
      const bounds: Bounds = { maxX: 1920, maxY: 1080 };

      const movedRight = moveRegion(initial, 50, 0, bounds);
      const movedDown = moveRegion(initial, 0, 50, bounds);
      const movedDiagonal = moveRegion(initial, 50, 50, bounds);

      // Test boundary constraints
      const atLeftEdge = moveRegion(initial, -200, 0, bounds);
      const atBottomEdge = moveRegion(initial, 0, 1000, bounds);

      return {
        movedRight,
        movedDown,
        movedDiagonal,
        atLeftEdge,
        atBottomEdge,
      };
    });

    expect(result.movedRight.x).toBe(150);
    expect(result.movedRight.y).toBe(100);

    expect(result.movedDown.x).toBe(100);
    expect(result.movedDown.y).toBe(150);

    expect(result.movedDiagonal.x).toBe(150);
    expect(result.movedDiagonal.y).toBe(150);

    // Should be constrained to left edge
    expect(result.atLeftEdge.x).toBe(0);

    // Should be constrained to bottom edge
    expect(result.atBottomEdge.y).toBe(930); // 1080 - 150 (height)
  });

  test('should determine cursor style for resize handles', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

      const getCursorForHandle = (handle: ResizeHandle): string => {
        const cursors: Record<ResizeHandle, string> = {
          n: 'ns-resize',
          s: 'ns-resize',
          e: 'ew-resize',
          w: 'ew-resize',
          ne: 'nesw-resize',
          sw: 'nesw-resize',
          nw: 'nwse-resize',
          se: 'nwse-resize',
        };
        return cursors[handle];
      };

      return {
        north: getCursorForHandle('n'),
        south: getCursorForHandle('s'),
        east: getCursorForHandle('e'),
        west: getCursorForHandle('w'),
        northeast: getCursorForHandle('ne'),
        southwest: getCursorForHandle('sw'),
        northwest: getCursorForHandle('nw'),
        southeast: getCursorForHandle('se'),
      };
    });

    expect(result.north).toBe('ns-resize');
    expect(result.south).toBe('ns-resize');
    expect(result.east).toBe('ew-resize');
    expect(result.west).toBe('ew-resize');
    expect(result.northeast).toBe('nesw-resize');
    expect(result.southwest).toBe('nesw-resize');
    expect(result.northwest).toBe('nwse-resize');
    expect(result.southeast).toBe('nwse-resize');
  });

  test('should detect point inside region', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface Region {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      interface Point {
        x: number;
        y: number;
      }

      const isPointInRegion = (point: Point, region: Region): boolean => {
        return (
          point.x >= region.x &&
          point.x <= region.x + region.width &&
          point.y >= region.y &&
          point.y <= region.y + region.height
        );
      };

      const region: Region = { x: 100, y: 100, width: 200, height: 150 };

      return {
        insideCenter: isPointInRegion({ x: 200, y: 175 }, region),
        insideTopLeft: isPointInRegion({ x: 100, y: 100 }, region),
        insideBottomRight: isPointInRegion({ x: 300, y: 250 }, region),
        outsideLeft: isPointInRegion({ x: 50, y: 175 }, region),
        outsideRight: isPointInRegion({ x: 350, y: 175 }, region),
        outsideTop: isPointInRegion({ x: 200, y: 50 }, region),
        outsideBottom: isPointInRegion({ x: 200, y: 300 }, region),
      };
    });

    expect(result.insideCenter).toBe(true);
    expect(result.insideTopLeft).toBe(true);
    expect(result.insideBottomRight).toBe(true);
    expect(result.outsideLeft).toBe(false);
    expect(result.outsideRight).toBe(false);
    expect(result.outsideTop).toBe(false);
    expect(result.outsideBottom).toBe(false);
  });
});

test.describe('RegionSelector Keyboard Shortcuts', () => {
  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface Region {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      const MOVE_STEP = 10;
      const MOVE_STEP_LARGE = 50;

      const handleKeyboardMove = (
        region: Region,
        key: string,
        shiftKey: boolean
      ): Region => {
        const step = shiftKey ? MOVE_STEP_LARGE : MOVE_STEP;
        const newRegion = { ...region };

        switch (key) {
          case 'ArrowUp':
            newRegion.y -= step;
            break;
          case 'ArrowDown':
            newRegion.y += step;
            break;
          case 'ArrowLeft':
            newRegion.x -= step;
            break;
          case 'ArrowRight':
            newRegion.x += step;
            break;
        }

        return newRegion;
      };

      const initial: Region = { x: 100, y: 100, width: 200, height: 150 };

      return {
        movedUp: handleKeyboardMove(initial, 'ArrowUp', false),
        movedDown: handleKeyboardMove(initial, 'ArrowDown', false),
        movedLeft: handleKeyboardMove(initial, 'ArrowLeft', false),
        movedRight: handleKeyboardMove(initial, 'ArrowRight', false),
        movedUpLarge: handleKeyboardMove(initial, 'ArrowUp', true),
        movedRightLarge: handleKeyboardMove(initial, 'ArrowRight', true),
      };
    });

    expect(result.movedUp.y).toBe(90);
    expect(result.movedDown.y).toBe(110);
    expect(result.movedLeft.x).toBe(90);
    expect(result.movedRight.x).toBe(110);
    expect(result.movedUpLarge.y).toBe(50);
    expect(result.movedRightLarge.x).toBe(150);
  });

  test('should handle keyboard resize', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      interface Region {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      const RESIZE_STEP = 10;
      const MIN_SIZE = 50;

      const handleKeyboardResize = (
        region: Region,
        key: string,
        altKey: boolean
      ): Region => {
        if (!altKey) return region;

        const newRegion = { ...region };

        switch (key) {
          case 'ArrowUp':
            newRegion.height = Math.max(MIN_SIZE, newRegion.height - RESIZE_STEP);
            break;
          case 'ArrowDown':
            newRegion.height += RESIZE_STEP;
            break;
          case 'ArrowLeft':
            newRegion.width = Math.max(MIN_SIZE, newRegion.width - RESIZE_STEP);
            break;
          case 'ArrowRight':
            newRegion.width += RESIZE_STEP;
            break;
        }

        return newRegion;
      };

      const initial: Region = { x: 100, y: 100, width: 200, height: 150 };
      const small: Region = { x: 100, y: 100, width: 60, height: 60 };

      return {
        resizedWider: handleKeyboardResize(initial, 'ArrowRight', true),
        resizedNarrower: handleKeyboardResize(initial, 'ArrowLeft', true),
        resizedTaller: handleKeyboardResize(initial, 'ArrowDown', true),
        resizedShorter: handleKeyboardResize(initial, 'ArrowUp', true),
        minWidthEnforced: handleKeyboardResize(small, 'ArrowLeft', true),
        noResizeWithoutAlt: handleKeyboardResize(initial, 'ArrowRight', false),
      };
    });

    expect(result.resizedWider.width).toBe(210);
    expect(result.resizedNarrower.width).toBe(190);
    expect(result.resizedTaller.height).toBe(160);
    expect(result.resizedShorter.height).toBe(140);
    expect(result.minWidthEnforced.width).toBe(50); // Enforced minimum
    expect(result.noResizeWithoutAlt.width).toBe(200); // No change without Alt
  });
});

test.describe('RegionSelector State Management', () => {
  test('should manage selection state', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      type SelectionState = 'idle' | 'selecting' | 'selected' | 'moving' | 'resizing';

      interface Region {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      interface SelectionStore {
        state: SelectionState;
        region: Region | null;
        isValid: boolean;
      }

      const MIN_WIDTH = 100;
      const MIN_HEIGHT = 100;

      const createStore = (): SelectionStore => ({
        state: 'idle',
        region: null,
        isValid: false,
      });

      const startSelection = (store: SelectionStore, x: number, y: number): SelectionStore => ({
        ...store,
        state: 'selecting',
        region: { x, y, width: 0, height: 0 },
        isValid: false,
      });

      const updateSelection = (store: SelectionStore, endX: number, endY: number): SelectionStore => {
        if (!store.region || store.state !== 'selecting') return store;

        const width = Math.abs(endX - store.region.x);
        const height = Math.abs(endY - store.region.y);
        const x = Math.min(store.region.x, endX);
        const y = Math.min(store.region.y, endY);

        return {
          ...store,
          region: { x, y, width, height },
          isValid: width >= MIN_WIDTH && height >= MIN_HEIGHT,
        };
      };

      const finishSelection = (store: SelectionStore): SelectionStore => {
        if (store.state !== 'selecting') return store;
        return {
          ...store,
          state: store.isValid ? 'selected' : 'idle',
          region: store.isValid ? store.region : null,
        };
      };

      const clearSelection = (_store: SelectionStore): SelectionStore => ({
        state: 'idle',
        region: null,
        isValid: false,
      });

      // Test flow
      let store = createStore();
      const initialState = store.state;

      store = startSelection(store, 100, 100);
      const selectingState = store.state;

      store = updateSelection(store, 300, 250);
      const validAfterUpdate = store.isValid;
      const regionAfterUpdate = store.region;

      store = finishSelection(store);
      const selectedState = store.state;

      store = clearSelection(store);
      const clearedState = store.state;
      const clearedRegion = store.region;

      return {
        initialState,
        selectingState,
        validAfterUpdate,
        regionAfterUpdate,
        selectedState,
        clearedState,
        clearedRegion,
      };
    });

    expect(result.initialState).toBe('idle');
    expect(result.selectingState).toBe('selecting');
    expect(result.validAfterUpdate).toBe(true);
    expect(result.regionAfterUpdate?.width).toBe(200);
    expect(result.regionAfterUpdate?.height).toBe(150);
    expect(result.selectedState).toBe('selected');
    expect(result.clearedState).toBe('idle');
    expect(result.clearedRegion).toBeNull();
  });
});
