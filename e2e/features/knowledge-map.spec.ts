/**
 * E2E Tests for Knowledge Map Feature
 * Tests the complete workflow of knowledge map generation, visualization, and interaction
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Knowledge Map Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Text Selection Knowledge Map Generation', () => {
    test('should show knowledge map button in selection popover', async ({ page }) => {
      // Create a chat message with content
      await createChatMessage(page, 'Explain the concept of machine learning');
      
      // Wait for assistant response
      await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });
      
      // Select text in the response
      const messageContent = page.locator('[data-testid="assistant-message"]').first();
      await selectTextInElement(page, messageContent);
      
      // Verify popover appears with knowledge map button
      const popover = page.locator('[data-testid="text-selection-popover"]');
      await expect(popover).toBeVisible({ timeout: 5000 });
      
      // Check for knowledge map button
      const knowledgeMapButton = popover.locator('button:has-text("knowledgeMap")');
      await expect(knowledgeMapButton).toBeVisible();
    });

    test('should generate knowledge map from selected text', async ({ page }) => {
      await createChatMessage(page, 'Explain neural networks in detail');
      await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });
      
      const messageContent = page.locator('[data-testid="assistant-message"]').first();
      await selectTextInElement(page, messageContent);
      
      const popover = page.locator('[data-testid="text-selection-popover"]');
      await expect(popover).toBeVisible({ timeout: 5000 });
      
      // Click knowledge map button
      const knowledgeMapButton = popover.locator('button:has-text("knowledgeMap")');
      await knowledgeMapButton.click();
      
      // Verify toast notification
      await expect(page.locator('text=Knowledge map generated')).toBeVisible({ timeout: 10000 });
    });

    test('should trigger knowledge map with keyboard shortcut K', async ({ page }) => {
      await createChatMessage(page, 'What is deep learning?');
      await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });
      
      const messageContent = page.locator('[data-testid="assistant-message"]').first();
      await selectTextInElement(page, messageContent);
      
      // Wait for popover
      await page.locator('[data-testid="text-selection-popover"]').waitFor({ state: 'visible' });
      
      // Press K for knowledge map shortcut
      await page.keyboard.press('k');
      
      // Verify action triggered
      await expect(page.locator('text=Knowledge map generated')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Knowledge Map Panel', () => {
    test('should open knowledge map panel', async ({ page }) => {
      // Navigate to academic mode or open panel
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      // Verify panel is visible
      const panel = page.locator('[data-testid="knowledge-map-panel"]');
      await expect(panel).toBeVisible();
      
      // Verify header elements
      await expect(panel.locator('h2:has-text("Knowledge Map")')).toBeVisible();
    });

    test('should create new knowledge map', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      // Click create button
      await page.click('button:has-text("Create")');
      
      // Fill in dialog
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      
      await dialog.locator('input[id="title"]').fill('Test Knowledge Map');
      await dialog.locator('button:has-text("Create")').click();
      
      // Verify map is created
      await expect(page.locator('text=Test Knowledge Map')).toBeVisible();
    });

    test('should display knowledge map list', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      // Create multiple maps
      for (let i = 1; i <= 3; i++) {
        await page.click('button:has-text("Create")');
        const dialog = page.locator('[role="dialog"]');
        await dialog.locator('input[id="title"]').fill(`Knowledge Map ${i}`);
        await dialog.locator('button:has-text("Create")').click();
        await page.waitForTimeout(500);
      }
      
      // Verify all maps are listed
      await expect(page.locator('text=Knowledge Map 1')).toBeVisible();
      await expect(page.locator('text=Knowledge Map 2')).toBeVisible();
      await expect(page.locator('text=Knowledge Map 3')).toBeVisible();
    });

    test('should search knowledge maps', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      // Create maps with different names
      await createKnowledgeMap(page, 'Machine Learning Guide');
      await createKnowledgeMap(page, 'Deep Learning Tutorial');
      await createKnowledgeMap(page, 'Neural Network Basics');
      
      // Search for specific map
      await page.fill('input[placeholder*="Search"]', 'Neural');
      
      // Verify filtered results
      await expect(page.locator('text=Neural Network Basics')).toBeVisible();
      await expect(page.locator('text=Machine Learning Guide')).not.toBeVisible();
    });

    test('should delete knowledge map', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMap(page, 'Map to Delete');
      
      // Open dropdown menu
      await page.locator('button[aria-label="More options"]').first().click();
      
      // Click delete
      await page.click('text=Delete');
      
      // Confirm deletion
      const confirmDialog = page.locator('[role="dialog"]');
      await confirmDialog.locator('button:has-text("Delete")').click();
      
      // Verify map is removed
      await expect(page.locator('text=Map to Delete')).not.toBeVisible();
    });

    test('should select and display knowledge map details', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMap(page, 'Detailed Map');
      
      // Click on the map
      await page.click('text=Detailed Map');
      
      // Verify tabs are visible
      await expect(page.locator('button:has-text("Traces")')).toBeVisible();
      await expect(page.locator('button:has-text("Mind Map")')).toBeVisible();
      await expect(page.locator('button:has-text("Markdown")')).toBeVisible();
    });
  });

  test.describe('Knowledge Map Traces', () => {
    test('should display trace list', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      // Create map with content that generates traces
      await createKnowledgeMapWithContent(page, 'Test Map', '# Introduction\n\nThis is a test document.\n\n## Methods\n\nDescription of methods.');
      
      // Select the map
      await page.click('text=Test Map');
      
      // Verify trace list is displayed
      const traceList = page.locator('[data-testid="trace-list"]');
      await expect(traceList).toBeVisible();
    });

    test('should select and display trace details', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMapWithContent(page, 'Trace Test Map', '# Topic 1\n\nContent for topic 1.\n\n# Topic 2\n\nContent for topic 2.');
      
      await page.click('text=Trace Test Map');
      
      // Click on a trace
      const firstTrace = page.locator('[data-testid="trace-item"]').first();
      await firstTrace.click();
      
      // Verify trace details are shown
      await expect(page.locator('[data-testid="trace-detail"]')).toBeVisible();
    });

    test('should navigate between traces', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMapWithContent(page, 'Navigation Test', '# Section 1\n\nContent 1.\n\n# Section 2\n\nContent 2.\n\n# Section 3\n\nContent 3.');
      
      await page.click('text=Navigation Test');
      
      // Click traces sequentially
      const traces = page.locator('[data-testid="trace-item"]');
      
      await traces.nth(0).click();
      await expect(page.locator('[data-testid="trace-detail"]')).toContainText('Section 1');
      
      await traces.nth(1).click();
      await expect(page.locator('[data-testid="trace-detail"]')).toContainText('Section 2');
    });
  });

  test.describe('Mind Map Visualization', () => {
    test('should switch to mind map tab', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMapWithContent(page, 'Mind Map Test', '# Root\n\n## Branch 1\n\nLeaf 1.\n\n## Branch 2\n\nLeaf 2.');
      
      await page.click('text=Mind Map Test');
      
      // Switch to mind map tab
      await page.click('button:has-text("Mind Map")');
      
      // Verify canvas is visible
      await expect(page.locator('canvas')).toBeVisible();
    });

    test('should zoom in and out', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMapWithContent(page, 'Zoom Test', '# Root\n\n## Child 1\n\n## Child 2');
      
      await page.click('text=Zoom Test');
      await page.click('button:has-text("Mind Map")');
      
      // Get initial zoom level
      const zoomDisplay = page.locator('text=/\\d+%/');
      const initialZoom = await zoomDisplay.textContent();
      
      // Click zoom in
      await page.click('button[aria-label="Zoom in"]');
      
      // Verify zoom increased
      const newZoom = await zoomDisplay.textContent();
      expect(parseInt(newZoom || '100')).toBeGreaterThan(parseInt(initialZoom || '100'));
    });

    test('should search nodes in mind map', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMapWithContent(page, 'Search Test', '# Main Topic\n\n## Subtopic A\n\nDetails A.\n\n## Subtopic B\n\nDetails B.');
      
      await page.click('text=Search Test');
      await page.click('button:has-text("Mind Map")');
      
      // Search for a node
      await page.fill('input[placeholder*="Search"]', 'Subtopic A');
      
      // Verify matches found badge
      await expect(page.locator('text=/\\d+ matches?/')).toBeVisible();
    });

    test('should export mind map', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMapWithContent(page, 'Export Test', '# Topic\n\n## Details');
      
      await page.click('text=Export Test');
      await page.click('button:has-text("Mind Map")');
      
      // Click export dropdown
      await page.click('button:has-text("Export")');
      
      // Verify export options
      await expect(page.locator('text=Export as PNG')).toBeVisible();
      await expect(page.locator('text=Export as JSON')).toBeVisible();
    });

    test('should reset view', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMapWithContent(page, 'Reset Test', '# Root\n\n## Branch');
      
      await page.click('text=Reset Test');
      await page.click('button:has-text("Mind Map")');
      
      // Zoom and pan
      await page.click('button[aria-label="Zoom in"]');
      await page.click('button[aria-label="Zoom in"]');
      
      // Reset view
      await page.click('button[aria-label="Reset view"]');
      
      // Verify zoom is reset to 100%
      await expect(page.locator('text=100%')).toBeVisible();
    });
  });

  test.describe('Knowledge Map Import/Export', () => {
    test('should export knowledge map to file', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMap(page, 'Export Map');
      
      // Click export button
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export")');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.json');
    });

    test('should import knowledge map from file', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      // Prepare file input
      const fileInput = page.locator('input[type="file"]');
      
      // Create a test file content
      const testContent = JSON.stringify({
        title: 'Imported Map',
        traces: [],
        metadata: { mode: 'FAST' },
      });
      
      await fileInput.setInputFiles({
        name: 'test-map.json',
        mimeType: 'application/json',
        buffer: Buffer.from(testContent),
      });
      
      // Verify map is imported
      await expect(page.locator('text=Imported Map')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Knowledge Map Navigation', () => {
    test('should navigate back and forward', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMap(page, 'Nav Map 1');
      await createKnowledgeMap(page, 'Nav Map 2');
      
      // Select first map
      await page.click('text=Nav Map 1');
      
      // Select second map
      await page.click('text=Nav Map 2');
      
      // Verify back button is enabled
      const backButton = page.locator('button[aria-label="Navigate back"]');
      await expect(backButton).toBeEnabled();
      
      // Click back
      await backButton.click();
      
      // Verify we're back to first map
      await expect(page.locator('[data-testid="active-map-badge"]:has-text("Nav Map 1")')).toBeVisible();
      
      // Verify forward button is enabled
      const forwardButton = page.locator('button[aria-label="Navigate forward"]');
      await expect(forwardButton).toBeEnabled();
    });

    test('should navigate to location from mind map node', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMapWithContent(page, 'Location Nav Test', '# Section 1\n\nPage 1 content.\n\n# Section 2\n\nPage 2 content.');
      
      await page.click('text=Location Nav Test');
      await page.click('button:has-text("Mind Map")');
      
      // Click on a node (simulate by clicking on canvas at approximate position)
      const canvas = page.locator('canvas');
      await canvas.click({ position: { x: 200, y: 100 } });
      
      // Verify node detail sheet opens
      await expect(page.locator('[data-testid="node-detail-sheet"]')).toBeVisible();
    });
  });

  test.describe('Generation Modes', () => {
    test('should create knowledge map with FAST mode', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await page.click('button:has-text("Create")');
      
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input[id="title"]').fill('Fast Mode Map');
      
      // Select FAST mode
      await dialog.locator('button[role="combobox"]').click();
      await page.click('text=Fast');
      
      await dialog.locator('button:has-text("Create")').click();
      
      // Verify map is created with FAST mode
      await expect(page.locator('text=FAST')).toBeVisible();
    });

    test('should create knowledge map with DETAILED mode', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await page.click('button:has-text("Create")');
      
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input[id="title"]').fill('Detailed Mode Map');
      
      // Select DETAILED mode
      await dialog.locator('button[role="combobox"]').click();
      await page.click('text=Detailed');
      
      await dialog.locator('button:has-text("Create")').click();
      
      // Verify map is created with DETAILED mode
      await expect(page.locator('text=DETAILED')).toBeVisible();
    });

    test('should show generation progress', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      // Mock a slow generation to see progress
      await page.route('**/academic_generate_knowledge_map**', async (route) => {
        await page.waitForTimeout(2000);
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ id: 'test', title: 'Test', traces: [] }),
        });
      });
      
      await page.click('button:has-text("Create")');
      
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input[id="title"]').fill('Progress Test Map');
      await dialog.locator('button:has-text("Create")').click();
      
      // Verify progress bar is visible during generation
      await expect(page.locator('[role="progressbar"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should display error message on generation failure', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      // Mock API error
      await page.route('**/academic_generate_knowledge_map**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Generation failed' }),
        });
      });
      
      await page.click('button:has-text("Create")');
      
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input[id="title"]').fill('Error Test Map');
      await dialog.locator('button:has-text("Create")').click();
      
      // Verify error alert is shown
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });

    test('should dismiss error message', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      // Mock API error
      await page.route('**/academic_generate_knowledge_map**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Test error' }),
        });
      });
      
      await page.click('button:has-text("Create")');
      
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input[id="title"]').fill('Dismiss Error Test');
      await dialog.locator('button:has-text("Create")').click();
      
      // Wait for error
      await expect(page.locator('[role="alert"]')).toBeVisible();
      
      // Dismiss error
      await page.click('button:has-text("Dismiss")');
      
      // Verify error is dismissed
      await expect(page.locator('[role="alert"]')).not.toBeVisible();
    });
  });

  test.describe('Mermaid Diagram Tab', () => {
    test('should display mermaid diagram', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMapWithContent(page, 'Mermaid Test', '# Main\n\n## Sub 1\n\n## Sub 2');
      
      await page.click('text=Mermaid Test');
      await page.click('button:has-text("Markdown")');
      
      // Verify mermaid content is displayed
      const mermaidContent = page.locator('pre');
      await expect(mermaidContent).toBeVisible();
    });

    test('should copy mermaid diagram', async ({ page }) => {
      await page.click('[data-testid="knowledge-map-toggle"]');
      
      await createKnowledgeMapWithContent(page, 'Copy Mermaid Test', '# Topic\n\n## Detail');
      
      await page.click('text=Copy Mermaid Test');
      await page.click('button:has-text("Markdown")');
      
      // Click copy button
      await page.click('button:has-text("Copy")');
      
      // Verify copied indicator
      await expect(page.locator('button:has-text("Copied")')).toBeVisible();
    });
  });
});

// Helper functions

async function createChatMessage(page: Page, message: string) {
  const input = page.locator('[data-testid="chat-input"]');
  await input.fill(message);
  await page.keyboard.press('Enter');
}

async function selectTextInElement(page: Page, element: ReturnType<Page['locator']>) {
  const boundingBox = await element.boundingBox();
  if (!boundingBox) return;

  await page.mouse.move(boundingBox.x + 10, boundingBox.y + boundingBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(boundingBox.x + boundingBox.width - 10, boundingBox.y + boundingBox.height / 2);
  await page.mouse.up();
}

async function createKnowledgeMap(page: Page, title: string) {
  await page.click('button:has-text("Create")');
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('input[id="title"]').fill(title);
  await dialog.locator('button:has-text("Create")').click();
  await page.waitForTimeout(500);
}

async function createKnowledgeMapWithContent(page: Page, title: string, content: string) {
  // This would be implemented based on the actual UI for creating maps with content
  await page.click('button:has-text("Create")');
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('input[id="title"]').fill(title);
  
  // If there's a content field
  const contentField = dialog.locator('textarea[id="content"]');
  if (await contentField.isVisible()) {
    await contentField.fill(content);
  }
  
  await dialog.locator('button:has-text("Create")').click();
  await page.waitForTimeout(500);
}
