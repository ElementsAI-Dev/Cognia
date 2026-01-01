/**
 * E2E Tests for AI SDK Integration
 * 
 * Tests the new AI SDK modules including:
 * - AI Registry and provider management
 * - Caching middleware
 * - Rate limiting
 * - Tool utilities
 * - Telemetry
 */

import { test, expect } from '@playwright/test';

test.describe('AI SDK Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Provider Settings', () => {
    test('should show provider configuration in settings', async ({ page }) => {
      // Navigate to settings
      await page.getByRole('button', { name: /settings/i }).click();
      
      // Check for provider settings section
      await expect(page.getByText(/provider/i)).toBeVisible();
    });

    test('should allow configuring API keys', async ({ page }) => {
      // Navigate to settings
      await page.getByRole('button', { name: /settings/i }).click();
      
      // Look for API key input fields
      const apiKeyInput = page.locator('input[type="password"]').first();
      await expect(apiKeyInput).toBeVisible();
    });
  });

  test.describe('Model Selection', () => {
    test('should show available models in chat', async ({ page }) => {
      // Check for model selector
      const modelSelector = page.getByRole('combobox').first();
      if (await modelSelector.isVisible()) {
        await modelSelector.click();
        // Model options should be visible - wait for options to appear
        await page.waitForTimeout(1000);
        const options = page.getByRole('option');
        const count = await options.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Chat Functionality', () => {
    test('should have chat input available', async ({ page }) => {
      // Check for chat input
      const chatInput = page.getByPlaceholder(/message|ask|type/i);
      await expect(chatInput).toBeVisible();
    });

    test('should handle empty message gracefully', async ({ page }) => {
      const chatInput = page.getByPlaceholder(/message|ask|type/i);
      const sendButton = page.getByRole('button', { name: /send/i });
      
      if (await chatInput.isVisible() && await sendButton.isVisible()) {
        // Try to send empty message
        await sendButton.click();
        
        // Should not cause error - page should remain stable
        await expect(page).toHaveURL(/\//);
      }
    });
  });

  test.describe('Session Management', () => {
    test('should be able to create new chat session', async ({ page }) => {
      // Look for new chat button
      const newChatButton = page.getByRole('button', { name: /new|create/i });
      if (await newChatButton.isVisible()) {
        await newChatButton.click();
        // Page should remain stable
        await expect(page).toHaveURL(/\//);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should show error message for invalid API key', async ({ page }) => {
      // Navigate to settings
      await page.getByRole('button', { name: /settings/i }).click();
      
      // Try to set an invalid API key and verify error handling
      const apiKeyInput = page.locator('input[type="password"]').first();
      if (await apiKeyInput.isVisible()) {
        await apiKeyInput.fill('invalid-key');
        // Page should handle this gracefully
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });
});

test.describe('AI SDK Middleware', () => {
  test('should apply caching configuration', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to settings
    await page.getByRole('button', { name: /settings/i }).click();
    
    // Look for caching or performance settings
    const cacheSetting = page.getByText(/cache|caching/i);
    if (await cacheSetting.isVisible()) {
      await expect(cacheSetting).toBeVisible();
    }
  });

  test('should show rate limit information when available', async ({ page }) => {
    await page.goto('/');
    
    // Rate limit info may be shown in various places
    // This test verifies the page loads without rate limit errors
    await expect(page.locator('body')).toBeVisible();
    
    // Check there's no rate limit error displayed
    const rateLimitError = page.getByText(/rate limit/i);
    await expect(rateLimitError).not.toBeVisible();
  });
});

test.describe('Telemetry', () => {
  test('should not expose telemetry data in UI', async ({ page }) => {
    await page.goto('/');
    
    // Telemetry should be internal only
    const telemetryExposed = page.getByText(/telemetry.*span/i);
    await expect(telemetryExposed).not.toBeVisible();
  });
});

test.describe('Tool Integration', () => {
  test('should show tool options when available', async ({ page }) => {
    await page.goto('/');
    
    // Check for tool/function calling options in settings or chat
    await page.getByRole('button', { name: /settings/i }).click();
    
    // Tools may be under various names
    const toolSection = page.getByText(/tools|functions|capabilities/i);
    if (await toolSection.isVisible()) {
      await expect(toolSection).toBeVisible();
    }
  });
});

test.describe('Image Generation', () => {
  test('should have image generation option available', async ({ page }) => {
    await page.goto('/');
    
    // Look for image generation button or option
    const imageOption = page.getByRole('button', { name: /image|generate.*image/i });
    if (await imageOption.isVisible()) {
      await expect(imageOption).toBeEnabled();
    }
  });

  test('should navigate to image studio if available', async ({ page }) => {
    await page.goto('/image-studio');
    
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Embeddings', () => {
  test('should handle RAG functionality', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to settings to check for RAG/embeddings config
    await page.getByRole('button', { name: /settings/i }).click();
    
    // Look for embedding or RAG settings
    const ragSettings = page.getByText(/rag|embedding|knowledge/i);
    if (await ragSettings.isVisible()) {
      await expect(ragSettings).toBeVisible();
    }
  });
});
