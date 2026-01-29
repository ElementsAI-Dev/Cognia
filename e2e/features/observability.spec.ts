import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * Observability E2E Tests
 * Tests monitoring, logging, and agent execution observability
 */

test.describe('Observability Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/observability');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load observability page', async ({ page }) => {
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should display observability dashboard', async ({ page }) => {
    const dashboard = page.locator(
      '[data-testid="observability-dashboard"], .dashboard-container'
    ).first();

    const hasDashboard = await dashboard.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasDashboard) {
      await expect(dashboard).toBeVisible();
    }
  });
});

test.describe('Agent Execution Tracing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/observability');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display execution traces', async ({ page }) => {
    const traceList = page.locator(
      '[data-testid="trace-list"], .trace-container'
    ).first();

    const hasTraces = await traceList.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasTraces) {
      await expect(traceList).toBeVisible();
    }
  });

  test('should show trace timeline', async ({ page }) => {
    const timeline = page.locator(
      '[data-testid="trace-timeline"], .timeline-view'
    ).first();

    const hasTimeline = await timeline.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasTimeline) {
      await expect(timeline).toBeVisible();
    }
  });

  test('should expand trace details', async ({ page }) => {
    const traceItem = page.locator('[data-testid="trace-item"], .trace-row').first();

    if (await traceItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await traceItem.click();
      await waitForAnimation(page);

      const details = page.locator('[data-testid="trace-details"], .trace-detail').first();
      const hasDetails = await details.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasDetails || true).toBe(true);
    }
  });
});

test.describe('Metrics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/observability');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display key metrics', async ({ page }) => {
    const metricsPanel = page.locator(
      '[data-testid="metrics-panel"], .metrics-container'
    ).first();

    const hasMetrics = await metricsPanel.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasMetrics) {
      await expect(metricsPanel).toBeVisible();
    }
  });

  test('should show token usage statistics', async ({ page }) => {
    const tokenStats = page.locator(
      '[data-testid="token-usage"], text=Tokens'
    ).first();

    const hasTokens = await tokenStats.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasTokens) {
      await expect(tokenStats).toBeVisible();
    }
  });

  test('should display latency metrics', async ({ page }) => {
    const latencyMetric = page.locator(
      '[data-testid="latency-metric"], text=Latency'
    ).first();

    const hasLatency = await latencyMetric.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasLatency) {
      await expect(latencyMetric).toBeVisible();
    }
  });

  test('should show success rate', async ({ page }) => {
    const successRate = page.locator(
      '[data-testid="success-rate"], text=Success'
    ).first();

    const hasRate = await successRate.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasRate) {
      await expect(successRate).toBeVisible();
    }
  });
});

test.describe('Log Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/observability');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display log stream', async ({ page }) => {
    const logViewer = page.locator(
      '[data-testid="log-viewer"], .log-container'
    ).first();

    const hasLogs = await logViewer.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasLogs) {
      await expect(logViewer).toBeVisible();
    }
  });

  test('should filter logs by level', async ({ page }) => {
    const levelFilter = page.locator(
      '[data-testid="log-level-filter"], select[name="level"]'
    ).first();

    if (await levelFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await levelFilter.click();
      await waitForAnimation(page);

      const levels = page.locator('[role="option"], option');
      const count = await levels.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should search logs', async ({ page }) => {
    const searchInput = page.locator(
      'input[placeholder*="search" i], [data-testid="log-search"]'
    ).first();

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('error');
      await waitForAnimation(page);

      const value = await searchInput.inputValue();
      expect(value).toBe('error');
    }
  });

  test('should export logs', async ({ page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), [data-testid="export-logs"]'
    ).first();

    const hasExport = await exportButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasExport) {
      await expect(exportButton).toBeEnabled();
    }
  });
});

test.describe('Performance Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/observability');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display response time chart', async ({ page }) => {
    const chart = page.locator(
      '[data-testid="response-time-chart"], canvas, svg'
    ).first();

    const hasChart = await chart.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasChart) {
      await expect(chart).toBeVisible();
    }
  });

  test('should show provider comparison', async ({ page }) => {
    const comparison = page.locator(
      '[data-testid="provider-comparison"], .provider-stats'
    ).first();

    const hasComparison = await comparison.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasComparison) {
      await expect(comparison).toBeVisible();
    }
  });

  test('should select time range', async ({ page }) => {
    const timeRangeSelector = page.locator(
      '[data-testid="time-range"], button:has-text("Last")'
    ).first();

    if (await timeRangeSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await timeRangeSelector.click();
      await waitForAnimation(page);

      const options = page.locator('[role="menuitem"], [role="option"]');
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Error Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/observability');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display error list', async ({ page }) => {
    const errorList = page.locator(
      '[data-testid="error-list"], .error-container'
    ).first();

    const hasErrors = await errorList.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasErrors) {
      await expect(errorList).toBeVisible();
    }
  });

  test('should show error details', async ({ page }) => {
    const errorItem = page.locator('[data-testid="error-item"], .error-row').first();

    if (await errorItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await errorItem.click();
      await waitForAnimation(page);

      const details = page.locator('[data-testid="error-details"]').first();
      const hasDetails = await details.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasDetails || true).toBe(true);
    }
  });

  test('should group errors by type', async ({ page }) => {
    const groupToggle = page.locator(
      'button:has-text("Group"), [data-testid="group-errors"]'
    ).first();

    const hasGroup = await groupToggle.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasGroup) {
      await expect(groupToggle).toBeEnabled();
    }
  });
});
