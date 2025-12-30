import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared test utilities for e2e tests
 * Provides optimized waiting strategies and common patterns
 */

/**
 * Wait for an element to be visible and stable
 * Replaces waitForTimeout with intelligent waiting
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number; state?: 'visible' | 'attached' | 'hidden' } = {}
): Promise<Locator> {
  const { timeout = 5000, state = 'visible' } = options;
  const locator = page.locator(selector).first();
  await locator.waitFor({ state, timeout });
  return locator;
}

/**
 * Wait for page to be idle (no network activity)
 */
export async function waitForIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for animation to complete
 * Uses requestAnimationFrame instead of arbitrary timeout
 */
export async function waitForAnimation(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

/**
 * Click and wait for result
 * Optimized click with automatic waiting
 */
export async function clickAndWait(
  locator: Locator,
  waitFor?: Locator | string,
  page?: Page
): Promise<void> {
  await locator.click();
  
  if (waitFor) {
    if (typeof waitFor === 'string' && page) {
      await page.locator(waitFor).first().waitFor({ state: 'visible', timeout: 5000 });
    } else if (typeof waitFor !== 'string') {
      await waitFor.waitFor({ state: 'visible', timeout: 5000 });
    }
  } else {
    await locator.page().waitForLoadState('domcontentloaded');
  }
}

/**
 * Safe click - handles elements that might not exist
 */
export async function safeClick(
  locator: Locator,
  options: { timeout?: number } = {}
): Promise<boolean> {
  const { timeout = 3000 } = options;
  try {
    await locator.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for dialog to open
 */
export async function waitForDialog(page: Page, timeout = 5000): Promise<Locator> {
  const dialog = page.locator('[role="dialog"]').first();
  await dialog.waitFor({ state: 'visible', timeout });
  return dialog;
}

/**
 * Wait for dialog to close
 */
export async function waitForDialogClose(page: Page, timeout = 5000): Promise<void> {
  const dialog = page.locator('[role="dialog"]').first();
  await dialog.waitFor({ state: 'hidden', timeout }).catch(() => {});
}

/**
 * Open settings dialog
 */
export async function openSettings(page: Page): Promise<Locator | null> {
  const settingsBtn = page.locator(
    'button[aria-label*="settings" i], button:has-text("Settings"), button:has(svg[class*="Settings"])'
  ).first();
  
  if (await settingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await settingsBtn.click();
    return await waitForDialog(page);
  }
  return null;
}

/**
 * Close dialog with escape key
 */
export async function closeDialogWithEscape(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await waitForDialogClose(page);
}

/**
 * Navigate and wait for ready state
 */
export async function navigateAndWait(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Fill input and verify
 */
export async function fillAndVerify(
  locator: Locator,
  value: string
): Promise<void> {
  await locator.fill(value);
  await expect(locator).toHaveValue(value);
}

/**
 * Select option in dropdown
 */
export async function selectOption(
  page: Page,
  triggerSelector: string,
  optionText: string
): Promise<boolean> {
  const trigger = page.locator(triggerSelector).first();
  
  if (await trigger.isVisible({ timeout: 2000 }).catch(() => false)) {
    await trigger.click();
    const option = page.locator(`[role="option"]:has-text("${optionText}")`).first();
    await option.click();
    return true;
  }
  return false;
}

/**
 * Retry action with exponential backoff
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 100
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, initialDelay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

/**
 * Check if element exists without throwing
 */
export async function elementExists(
  page: Page,
  selector: string,
  timeout = 1000
): Promise<boolean> {
  try {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all visible text content
 */
export async function getVisibleText(locator: Locator): Promise<string> {
  return await locator.innerText();
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
}

/**
 * Wait for specific text to appear
 */
export async function waitForText(
  page: Page,
  text: string,
  timeout = 5000
): Promise<Locator> {
  const locator = page.getByText(text).first();
  await locator.waitFor({ state: 'visible', timeout });
  return locator;
}

/**
 * Batch evaluate - run multiple evaluations efficiently
 */
export async function batchEvaluate<T>(
  page: Page,
  evaluations: (() => T)[]
): Promise<T[]> {
  return await page.evaluate((fns) => {
    return fns.map(fn => {
      const fnStr = fn.toString();
      return eval(`(${fnStr})()`);
    });
  }, evaluations.map(fn => fn.toString()));
}
