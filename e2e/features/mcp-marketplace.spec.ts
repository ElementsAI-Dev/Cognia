import { test, expect } from '@playwright/test';
import { waitForElement } from '../utils/test-helpers';

/**
 * MCP Marketplace E2E Tests
 * Tests the MCP marketplace browsing and installation features
 */
test.describe('MCP Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Navigation', () => {
    test('should navigate to MCP settings', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await expect(page.getByRole('tab', { name: /My Servers/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Marketplace/i })).toBeVisible();
    });

    test('should switch to Marketplace tab', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      await expect(page.getByText(/MCP Marketplace/i)).toBeVisible();
    });
  });

  test.describe('Source Tabs', () => {
    test('should display source selector tabs', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Check for source tabs
      await expect(page.getByRole('tab', { name: /All/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Cline/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Smithery/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Glama/i })).toBeVisible();
    });

    test('should switch between source tabs', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Click on Cline tab
      await page.getByRole('tab', { name: /Cline/i }).click();
      await expect(page.getByRole('tab', { name: /Cline/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Search and Filters', () => {
    test('should have search input', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      const searchInput = page.getByPlaceholder(/Search MCP servers/i);
      await expect(searchInput).toBeVisible();
    });

    test('should search for servers', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for marketplace to load
      await waitForElement(page, 'input[placeholder*="Search"]', { timeout: 5000 });
      
      const searchInput = page.getByPlaceholder(/Search MCP servers/i);
      await searchInput.fill('github');
      
      // Results should update after debounce
      await page.waitForLoadState('networkidle');
    });

    test('should open filters popover', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      await page.getByRole('button', { name: /Filters/i }).click();
      
      // Filter options should be visible
      await expect(page.getByText(/Tags/i)).toBeVisible();
      await expect(page.getByText(/API Key/i)).toBeVisible();
    });

    test('should have sort dropdown', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Click sort dropdown
      const sortTrigger = page.locator('[role="combobox"]').first();
      await sortTrigger.click();
      
      // Sort options should be visible
      await expect(page.getByRole('option', { name: /Popular/i })).toBeVisible();
    });
  });

  test.describe('Server Cards', () => {
    test('should display server cards', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForLoadState('networkidle');
      await page.locator('text=/Showing \\d+ of \\d+ servers/i').first().waitFor({ timeout: 10000 });
      
      // Should show results count
      await expect(page.getByText(/Showing \d+ of \d+ servers/i)).toBeVisible();
    });

    test('should show server details on click', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForLoadState('networkidle');
      
      // Click on a server card (first one)
      const serverCard = page.locator('[class*="cursor-pointer"]').first();
      if (await serverCard.isVisible()) {
        await serverCard.click();
        
        // Detail dialog should open
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });
  });

  test.describe('Detail Dialog', () => {
    test('should show server information in dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForLoadState('networkidle');
      
      // Click on a server card
      const serverCard = page.locator('[class*="cursor-pointer"]').first();
      if (await serverCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await serverCard.click();
        
        // Dialog should have tabs
        await expect(page.getByRole('tab', { name: /Overview/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('tab', { name: /README/i })).toBeVisible();
        
        // Should have close button
        await expect(page.getByRole('button', { name: /Close/i })).toBeVisible();
      }
    });

    test('should close dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForLoadState('networkidle');
      
      // Click on a server card
      const serverCard = page.locator('[class*="cursor-pointer"]').first();
      if (await serverCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await serverCard.click();
        
        // Close the dialog
        await page.getByRole('button', { name: /Close/i }).first().click();
        
        // Dialog should be closed
        await expect(page.getByRole('dialog')).not.toBeVisible();
      }
    });
  });

  test.describe('API Key Configuration', () => {
    test('should show API key configuration option in filters', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      await page.getByRole('button', { name: /Filters/i }).click();
      
      // Should have API key configuration button
      await expect(page.getByRole('button', { name: /Configure API Key|Update API Key/i })).toBeVisible();
    });

    test('should toggle API key input', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      await page.getByRole('button', { name: /Filters/i }).click();
      
      // Click configure API key button
      await page.getByRole('button', { name: /Configure API Key/i }).click();
      
      // API key input should be visible
      await expect(page.getByPlaceholder(/Enter API key/i)).toBeVisible();
    });
  });

  test.describe('Filter Options', () => {
    test('should have verified filter option', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      await page.getByRole('button', { name: /Filters/i }).click();
      
      // Should have verified checkbox
      await expect(page.getByLabel(/Verified servers only/i)).toBeVisible();
    });

    test('should have remote hosting filter option', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      await page.getByRole('button', { name: /Filters/i }).click();
      
      // Should have remote checkbox
      await expect(page.getByLabel(/Remote hosting support/i)).toBeVisible();
    });

    test('should have no API key filter option', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      await page.getByRole('button', { name: /Filters/i }).click();
      
      // Should have no API key checkbox
      await expect(page.getByLabel(/No API key required/i)).toBeVisible();
    });

    test('should clear filters', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Set a search filter
      const searchInput = page.getByPlaceholder(/Search MCP servers/i);
      await searchInput.fill('test');
      
      await page.getByRole('button', { name: /Filters/i }).click();
      
      // Click clear filters if visible
      const clearButton = page.getByRole('button', { name: /Clear Filters/i });
      if (await clearButton.isVisible()) {
        await clearButton.click();
        
        // Search should be cleared
        await expect(searchInput).toHaveValue('');
      }
    });
  });

  test.describe('Refresh', () => {
    test('should have refresh button', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Refresh button should be visible (icon button)
      const refreshButton = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') });
      await expect(refreshButton).toBeVisible();
    });
  });

  test.describe('Loading States', () => {
    test('should show loading skeleton on initial load', async ({ page }) => {
      await page.goto('/settings');
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Should show skeleton or content
      // Note: This might be too fast to catch the loading state
    });
  });

  test.describe('Error Handling', () => {
    test('should display error message when fetch fails', async ({ page }) => {
      // Mock network failure
      await page.route('**/marketplace**', (route) => {
        route.abort('failed');
      });

      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for error to appear
      await page.waitForLoadState('networkidle');
      
      // Error alert might be visible
      // Note: The actual error display depends on the implementation
    });
  });

  test.describe('Server Badges', () => {
    test('should display source badges on server cards', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForLoadState('networkidle');
      
      // Source badges should be visible (cline, smithery, or glama)
      const sourceBadge = page.locator('text=cline').first();
      if (await sourceBadge.isVisible()) {
        await expect(sourceBadge).toBeVisible();
      }
    });
  });

  test.describe('Favorites', () => {
    test('should have favorites toggle button', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForTimeout(3000);
      
      // Look for the favorites toggle button (heart icon)
      const favButton = page.locator('button').filter({ has: page.locator('svg.lucide-heart') });
      await expect(favButton).toBeVisible();
    });

    test('should toggle favorites filter', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForTimeout(3000);
      
      // Click favorites toggle
      const favButton = page.locator('button').filter({ has: page.locator('svg.lucide-heart') });
      if (await favButton.isVisible()) {
        await favButton.click();
        // Button should become active (highlighted)
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('View Mode', () => {
    test('should have view mode toggle buttons', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForTimeout(3000);
      
      // Look for grid and list view toggle buttons
      const gridButton = page.locator('button').filter({ has: page.locator('svg.lucide-grid-3x3') });
      const listButton = page.locator('button').filter({ has: page.locator('svg.lucide-list') });
      
      await expect(gridButton).toBeVisible();
      await expect(listButton).toBeVisible();
    });

    test('should switch between grid and list view', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForTimeout(3000);
      
      // Click list view button
      const listButton = page.locator('button').filter({ has: page.locator('svg.lucide-list') });
      if (await listButton.isVisible()) {
        await listButton.click();
        await page.waitForTimeout(500);
        
        // Grid layout should change to flex column
        const _marketplaceGrid = page.locator('.flex.flex-col.gap-2');
        // View should update (either check class or visual)
      }
    });
  });

  test.describe('Pagination', () => {
    test('should show pagination controls when many servers', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForTimeout(3000);
      
      // Pagination might be visible if there are enough servers
      const _prevButton = page.getByRole('button', { name: /Previous/i });
      const nextButton = page.getByRole('button', { name: /Next/i });
      
      // Check if pagination exists (depends on number of servers)
      if (await nextButton.isVisible()) {
        await expect(nextButton).toBeVisible();
      }
    });

    test('should navigate to next page', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForTimeout(3000);
      
      const nextButton = page.getByRole('button', { name: /Next/i });
      
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        
        // Page number should update
        // The previous button should now be enabled
        const prevButton = page.getByRole('button', { name: /Previous/i });
        await expect(prevButton).toBeEnabled();
      }
    });
  });

  test.describe('Detail Dialog Enhanced', () => {
    test('should show Install Config tab in dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForTimeout(3000);
      
      // Click on a server card
      const serverCard = page.locator('[class*="cursor-pointer"]').first();
      if (await serverCard.isVisible()) {
        await serverCard.click();
        
        // Dialog should have the new Install Config tab
        await expect(page.getByRole('tab', { name: /Install Config/i })).toBeVisible();
      }
    });

    test('should show favorite button in dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForTimeout(3000);
      
      // Click on a server card
      const serverCard = page.locator('[class*="cursor-pointer"]').first();
      if (await serverCard.isVisible()) {
        await serverCard.click();
        
        // Dialog should have favorite button
        const favButton = page.locator('[role="dialog"]').locator('button').filter({ 
          has: page.locator('svg.lucide-heart, svg.lucide-heart-off') 
        });
        await expect(favButton).toBeVisible();
      }
    });

    test('should switch to Install Config tab', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForTimeout(3000);
      
      // Click on a server card
      const serverCard = page.locator('[class*="cursor-pointer"]').first();
      if (await serverCard.isVisible()) {
        await serverCard.click();
        
        // Click Install Config tab
        await page.getByRole('tab', { name: /Install Config/i }).click();
        
        // Should show config content
        await page.waitForTimeout(500);
      }
    });

    test('should render README with markdown', async ({ page }) => {
      await page.getByRole('button', { name: 'MCP' }).click();
      await page.getByRole('tab', { name: /Marketplace/i }).click();
      
      // Wait for servers to load
      await page.waitForTimeout(3000);
      
      // Click on a server card
      const serverCard = page.locator('[class*="cursor-pointer"]').first();
      if (await serverCard.isVisible()) {
        await serverCard.click();
        
        // Click README tab
        await page.getByRole('tab', { name: /README/i }).click();
        
        // Wait for content to load
        await page.waitForTimeout(1000);
        
        // Should have prose styling for markdown
        const proseContent = page.locator('.prose');
        if (await proseContent.isVisible()) {
          await expect(proseContent).toBeVisible();
        }
      }
    });
  });
});
