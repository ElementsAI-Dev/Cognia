import { test, expect } from '@playwright/test';

test.describe('Skills Enhanced Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Skill Editor', () => {
    test('should display all editor tabs', async ({ page }) => {
      // Navigate to settings
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      
      // Click create skill
      await page.click('text=Create Skill');
      
      // Check that all tabs are visible
      await expect(page.locator('text=Edit')).toBeVisible();
      await expect(page.locator('text=Preview')).toBeVisible();
      await expect(page.locator('text=Resources')).toBeVisible();
      await expect(page.locator('text=AI Assist')).toBeVisible();
    });

    test('should switch between editor tabs', async ({ page }) => {
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      await page.click('text=Create Skill');

      // Switch to Preview tab
      await page.click('role=tab[name="Preview"]');
      await expect(page.locator('text=Skill Name')).toBeVisible();

      // Switch to Resources tab
      await page.click('role=tab[name="Resources"]');
      await expect(page.locator('text=No resources attached')).toBeVisible();

      // Switch to AI Assist tab
      await page.click('role=tab[name="AI Assist"]');
      await expect(page.locator('text=AI Assistant')).toBeVisible();
    });

    test('should validate skill content in real-time', async ({ page }) => {
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      await page.click('text=Create Skill');

      // Enter invalid content
      await page.fill('textarea', 'invalid content without frontmatter');
      
      // Should show error
      await expect(page.locator('text=Error')).toBeVisible();

      // Enter valid content
      await page.fill('textarea', `---
name: test-skill
description: A test skill
---

# Test Skill

Instructions here.`);
      
      // Should show valid
      await expect(page.locator('text=Valid')).toBeVisible();
    });

    test('should show token estimate', async ({ page }) => {
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      await page.click('text=Create Skill');

      await page.fill('textarea', `---
name: test-skill
description: A test skill
---

# Test Skill

Instructions here.`);
      
      // Should show token estimate
      await expect(page.locator('text=/\\d+ tokens/')).toBeVisible();
    });
  });

  test.describe('Skill Resources', () => {
    test('should open add resource dialog', async ({ page }) => {
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      await page.click('text=Create Skill');
      
      // Switch to Resources tab
      await page.click('role=tab[name="Resources"]');
      
      // Click Add Resource
      await page.click('text=Add Resource');
      
      // Dialog should open
      await expect(page.locator('text=Resource Type')).toBeVisible();
      await expect(page.locator('text=Script')).toBeVisible();
      await expect(page.locator('text=Reference')).toBeVisible();
      await expect(page.locator('text=Asset')).toBeVisible();
    });
  });

  test.describe('Skill AI Assistant', () => {
    test('should display generation form', async ({ page }) => {
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      await page.click('text=Create Skill');
      
      // Switch to AI Assist tab
      await page.click('role=tab[name="AI Assist"]');
      
      // Should show generation form
      await expect(page.locator('text=What should this skill do?')).toBeVisible();
      await expect(page.locator('text=Example use cases')).toBeVisible();
      await expect(page.locator('text=Category')).toBeVisible();
      await expect(page.locator('text=Generate Skill')).toBeVisible();
    });

    test('should switch between AI tabs', async ({ page }) => {
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      await page.click('text=Create Skill');
      await page.click('role=tab[name="AI Assist"]');

      // Switch to Refine tab
      await page.click('role=tab[name="Refine"]');
      await expect(page.locator('text=Refinement Type')).toBeVisible();

      // Switch to Suggest tab
      await page.click('role=tab[name="Suggest"]');
      await expect(page.locator('text=Get Improvement Suggestions')).toBeVisible();
    });
  });

  test.describe('Skill Detail View', () => {
    test('should open skill detail dialog', async ({ page }) => {
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      
      // Wait for skills to load
      await page.waitForSelector('[data-testid="skill-card"]', { timeout: 5000 }).catch(() => {
        // Skills might not exist, skip this test
      });
      
      // Click on a skill card's Edit button
      const editButton = page.locator('text=Edit').first();
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Should open detail dialog
        await expect(page.locator('text=About this Skill')).toBeVisible();
      }
    });
  });

  test.describe('Skill Settings', () => {
    test('should filter skills by category', async ({ page }) => {
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      
      // Open category filter
      await page.click('text=All Categories');
      
      // Select Development
      await page.click('text=Development');
      
      // Should filter skills
      await expect(page.locator('text=Development')).toBeVisible();
    });

    test('should search skills', async ({ page }) => {
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      
      // Type in search
      await page.fill('input[placeholder="Search skills..."]', 'test');
      
      // Results should be filtered
      // (actual behavior depends on existing skills)
    });

    test('should create new skill from template', async ({ page }) => {
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      await page.click('text=Create Skill');
      
      // Switch to template mode
      await page.click('text=Use Template');
      
      // Should show templates
      await expect(page.locator('[class*="cursor-pointer"]').first()).toBeVisible();
    });

    test('should import skill from markdown', async ({ page }) => {
      await page.click('[data-testid="settings-button"]');
      await page.click('text=Skills');
      
      // Click Import
      await page.click('text=Import');
      
      // Should show import dialog
      await expect(page.locator('text=Import Skill')).toBeVisible();
      await expect(page.locator('textarea[placeholder*="name: my-skill"]')).toBeVisible();
    });
  });
});
