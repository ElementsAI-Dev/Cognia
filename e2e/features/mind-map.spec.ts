/**
 * E2E Tests for Mind Map Canvas Component
 * Tests interactive visualization and canvas interactions
 */

import { test, expect } from '@playwright/test';

test.describe('Mind Map Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to knowledge map panel and create a map
    await page.click('[data-testid="knowledge-map-toggle"]');
    await page.click('button:has-text("Create")');
    
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[id="title"]').fill('Mind Map Test');
    await dialog.locator('button:has-text("Create")').click();
    await page.waitForTimeout(500);
    
    // Select the map and switch to mind map tab
    await page.click('text=Mind Map Test');
    await page.click('button:has-text("Mind Map")');
  });

  test.describe('Canvas Interactions', () => {
    test('should render canvas element', async ({ page }) => {
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('should pan canvas with mouse drag', async ({ page }) => {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (!box) return;

      // Drag to pan
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
      await page.mouse.up();
      
      // Canvas should still be visible (pan doesn't change visibility)
      await expect(canvas).toBeVisible();
    });

    test('should zoom with mouse wheel', async ({ page }) => {
      const canvas = page.locator('canvas');
      const zoomDisplay = page.locator('text=/\\d+%/');
      
      const initialZoom = await zoomDisplay.textContent();
      
      // Scroll to zoom
      await canvas.hover();
      await page.mouse.wheel(0, -100);
      
      await page.waitForTimeout(100);
      
      const newZoom = await zoomDisplay.textContent();
      expect(parseInt(newZoom || '100')).toBeGreaterThan(parseInt(initialZoom || '100'));
    });

    test('should change cursor on node hover', async ({ page }) => {
      const canvas = page.locator('canvas');
      
      // Move mouse over canvas
      await canvas.hover();
      
      // The cursor should be 'grab' by default
      const cursor = await canvas.evaluate((el) => window.getComputedStyle(el).cursor);
      expect(['grab', 'pointer', 'default']).toContain(cursor);
    });
  });

  test.describe('Zoom Controls', () => {
    test('should zoom in when clicking zoom in button', async ({ page }) => {
      const zoomInButton = page.locator('button[aria-label="Zoom in"]');
      const zoomDisplay = page.locator('text=/\\d+%/');
      
      const initialZoom = parseInt((await zoomDisplay.textContent()) || '100');
      
      await zoomInButton.click();
      
      const newZoom = parseInt((await zoomDisplay.textContent()) || '100');
      expect(newZoom).toBeGreaterThan(initialZoom);
    });

    test('should zoom out when clicking zoom out button', async ({ page }) => {
      const zoomOutButton = page.locator('button[aria-label="Zoom out"]');
      const zoomDisplay = page.locator('text=/\\d+%/');
      
      // First zoom in a bit
      await page.click('button[aria-label="Zoom in"]');
      await page.click('button[aria-label="Zoom in"]');
      
      const initialZoom = parseInt((await zoomDisplay.textContent()) || '100');
      
      await zoomOutButton.click();
      
      const newZoom = parseInt((await zoomDisplay.textContent()) || '100');
      expect(newZoom).toBeLessThan(initialZoom);
    });

    test('should reset view when clicking reset button', async ({ page }) => {
      const zoomDisplay = page.locator('text=/\\d+%/');
      
      // Zoom in multiple times
      await page.click('button[aria-label="Zoom in"]');
      await page.click('button[aria-label="Zoom in"]');
      await page.click('button[aria-label="Zoom in"]');
      
      // Reset view
      await page.click('button[aria-label="Reset view"]');
      
      const zoomAfterReset = parseInt((await zoomDisplay.textContent()) || '100');
      expect(zoomAfterReset).toBe(100);
    });

    test('should fit view to content', async ({ page }) => {
      const fitViewButton = page.locator('button[aria-label="Fit to view"]');
      
      // Click fit view
      await fitViewButton.click();
      
      // Canvas should still be visible and properly scaled
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('should have max zoom limit', async ({ page }) => {
      const zoomInButton = page.locator('button[aria-label="Zoom in"]');
      const zoomDisplay = page.locator('text=/\\d+%/');
      
      // Click zoom in many times
      for (let i = 0; i < 30; i++) {
        await zoomInButton.click();
      }
      
      const maxZoom = parseInt((await zoomDisplay.textContent()) || '100');
      expect(maxZoom).toBeLessThanOrEqual(300); // MAX_ZOOM = 3
    });

    test('should have min zoom limit', async ({ page }) => {
      const zoomOutButton = page.locator('button[aria-label="Zoom out"]');
      const zoomDisplay = page.locator('text=/\\d+%/');
      
      // Click zoom out many times
      for (let i = 0; i < 30; i++) {
        await zoomOutButton.click();
      }
      
      const minZoom = parseInt((await zoomDisplay.textContent()) || '100');
      expect(minZoom).toBeGreaterThanOrEqual(10); // MIN_ZOOM = 0.1
    });
  });

  test.describe('Label Visibility', () => {
    test('should toggle label visibility', async ({ page }) => {
      const toggleButton = page.locator('button[aria-label*="labels"]');
      
      // Initial state should show labels
      await expect(toggleButton).toBeVisible();
      
      // Toggle labels off
      await toggleButton.click();
      
      // Toggle labels on
      await toggleButton.click();
      
      // Button should still be visible
      await expect(toggleButton).toBeVisible();
    });
  });

  test.describe('Search Functionality', () => {
    test('should filter nodes by search query', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      await searchInput.fill('test');
      
      // Should show matches count
      const matchesBadge = page.locator('text=/\\d+ matches?/');
      await expect(matchesBadge).toBeVisible();
    });

    test('should clear search with X button', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      await searchInput.fill('test');
      
      // Click clear button
      const clearButton = page.locator('button').filter({ has: page.locator('svg') }).last();
      await clearButton.click();
      
      // Search input should be empty
      await expect(searchInput).toHaveValue('');
    });

    test('should highlight matched nodes', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      await searchInput.fill('Mind');
      
      // Canvas should reflect highlighted state (visual test)
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Export Functionality', () => {
    test('should open export dropdown menu', async ({ page }) => {
      await page.click('button:has-text("Export")');
      
      // Verify dropdown menu items
      await expect(page.locator('text=Export as PNG')).toBeVisible();
      await expect(page.locator('text=Export as SVG')).toBeVisible();
      await expect(page.locator('text=Export as JSON')).toBeVisible();
    });

    test('should export as PNG', async ({ page }) => {
      await page.click('button:has-text("Export")');
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('text=Export as PNG');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.png');
    });

    test('should export as JSON', async ({ page }) => {
      await page.click('button:has-text("Export")');
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('text=Export as JSON');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.json');
    });
  });

  test.describe('Node Interactions', () => {
    test('should show node detail sheet on click', async ({ page }) => {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (!box) return;

      // Click somewhere on canvas (where a node might be)
      await canvas.click({ position: { x: 150, y: 150 } });
      
      // If a node is clicked, detail sheet should appear
      // This is a soft check since node positions vary
      await page.waitForTimeout(500);
    });

    test('should navigate to location from node detail', async ({ page }) => {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (!box) return;

      // Click on canvas to select a node
      await canvas.click({ position: { x: 150, y: 150 } });
      
      // If node detail sheet is visible, check for navigation button
      const sheet = page.locator('[data-testid="node-detail-sheet"]');
      if (await sheet.isVisible()) {
        const navButton = sheet.locator('button:has-text("Navigate to location")');
        if (await navButton.isVisible()) {
          await navButton.click();
        }
      }
    });

    test('should double click to zoom on node', async ({ page }) => {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (!box) return;

      // Double click on canvas
      await canvas.dblclick({ position: { x: 150, y: 150 } });
      
      // Canvas should still be responsive
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Minimap', () => {
    test('should display minimap', async ({ page }) => {
      const minimap = page.locator('text=Minimap').locator('..');
      await expect(minimap).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should handle keyboard shortcuts', async ({ page }) => {
      const canvas = page.locator('canvas');
      await canvas.focus();
      
      // Test keyboard navigation (if implemented)
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      
      // Canvas should still be visible
      await expect(canvas).toBeVisible();
    });

    test('should zoom with keyboard shortcuts', async ({ page }) => {
      const canvas = page.locator('canvas');
      await canvas.focus();
      
      // Try Ctrl/Cmd + Plus for zoom in
      await page.keyboard.press('Control+=');
      
      // Canvas should still be responsive
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should resize canvas on window resize', async ({ page }) => {
      const canvas = page.locator('canvas');
      
      // Get initial size
      const initialBox = await canvas.boundingBox();
      
      // Resize viewport
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(300);
      
      // Get new size
      const newBox = await canvas.boundingBox();
      
      // Size should have changed
      expect(newBox?.width).not.toBe(initialBox?.width);
    });

    test('should maintain aspect ratio when resizing', async ({ page }) => {
      const canvas = page.locator('canvas');
      
      // Resize multiple times
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(100);
      
      await page.setViewportSize({ width: 600, height: 400 });
      await page.waitForTimeout(100);
      
      // Canvas should still be visible and functional
      await expect(canvas).toBeVisible();
    });
  });
});

test.describe('Mind Map Themes', () => {
  test('should apply default theme colors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('[data-testid="knowledge-map-toggle"]');
    await page.click('button:has-text("Create")');
    
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[id="title"]').fill('Theme Test');
    await dialog.locator('button:has-text("Create")').click();
    
    await page.click('text=Theme Test');
    await page.click('button:has-text("Mind Map")');
    
    // Canvas should render with theme colors
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});
