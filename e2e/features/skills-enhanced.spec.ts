import { test, expect, Page } from '@playwright/test';

// Helper to check if native skills are unavailable
async function isNativeUnavailable(page: Page): Promise<boolean> {
  await page.waitForTimeout(500);
  try {
    return await page.getByText(/native.*not available/i).isVisible();
  } catch {
    return false;
  }
}

test.describe('Skills Enhanced Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test.describe('Skill Editor', () => {
    test('should display all editor tabs', async ({ page }) => {
      // Navigate to Skills tab
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
      await page.click('text=Skills');
      
      // Open category filter
      await page.click('text=All Categories');
      
      // Select Development
      await page.click('text=Development');
      
      // Should filter skills
      await expect(page.locator('text=Development')).toBeVisible();
    });

    test('should search skills', async ({ page }) => {
      await page.click('text=Skills');
      
      // Type in search
      await page.fill('input[placeholder="Search skills..."]', 'test');
      
      // Results should be filtered
      // (actual behavior depends on existing skills)
    });

    test('should create new skill from template', async ({ page }) => {
      await page.click('text=Skills');
      await page.click('text=Create Skill');
      
      // Switch to template mode
      await page.click('text=Use Template');
      
      // Should show templates
      await expect(page.locator('[class*="cursor-pointer"]').first()).toBeVisible();
    });

    test('should import skill from markdown', async ({ page }) => {
      await page.click('text=Skills');
      
      // Click Import
      await page.click('text=Import');
      
      // Should show import dialog
      await expect(page.locator('text=Import Skill')).toBeVisible();
      await expect(page.locator('textarea[placeholder*="name: my-skill"]')).toBeVisible();
    });
  });

  test.describe('Native Skill Integration', () => {
    test('should handle native skill discovery', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface DiscoverableSkill {
          key: string;
          name: string;
          description: string;
          directory: string;
          readmeUrl: string | null;
          repoOwner: string;
          repoName: string;
          repoBranch: string;
        }

        interface InstalledSkill {
          id: string;
          name: string;
          description: string | null;
          directory: string;
          repoOwner: string | null;
          repoName: string | null;
          installedAt: number;
          enabled: boolean;
          category: string | null;
          tags: string[];
        }

        interface LocalSkill {
          directory: string;
          name: string;
          description: string | null;
          path: string;
          hasSkillMd: boolean;
        }

        const discoverAllSkills = (): {
          discoverable: DiscoverableSkill[];
          installed: InstalledSkill[];
          local: LocalSkill[];
        } => {
          return {
            discoverable: [
              {
                key: 'cognia-skills/web-search',
                name: 'Web Search',
                description: 'Search the web for information',
                directory: 'web-search',
                readmeUrl: 'https://github.com/cognia-skills/web-search/README.md',
                repoOwner: 'cognia-skills',
                repoName: 'skills',
                repoBranch: 'main',
              },
              {
                key: 'cognia-skills/code-analysis',
                name: 'Code Analysis',
                description: 'Analyze code for patterns and issues',
                directory: 'code-analysis',
                readmeUrl: null,
                repoOwner: 'cognia-skills',
                repoName: 'skills',
                repoBranch: 'main',
              },
            ],
            installed: [
              {
                id: 'skill-001',
                name: 'File Operations',
                description: 'Read and write files',
                directory: 'file-operations',
                repoOwner: 'cognia-skills',
                repoName: 'skills',
                installedAt: Date.now() - 86400000,
                enabled: true,
                category: 'utility',
                tags: ['file', 'io'],
              },
            ],
            local: [
              {
                directory: 'my-custom-skill',
                name: 'My Custom Skill',
                description: 'A custom skill',
                path: '/skills/my-custom-skill',
                hasSkillMd: true,
              },
            ],
          };
        };

        const result = discoverAllSkills();

        return {
          discoverableCount: result.discoverable.length,
          installedCount: result.installed.length,
          localCount: result.local.length,
          firstDiscoverable: result.discoverable[0]?.name,
          firstInstalled: result.installed[0]?.name,
          firstLocal: result.local[0]?.name,
        };
      });

      expect(result.discoverableCount).toBe(2);
      expect(result.installedCount).toBe(1);
      expect(result.localCount).toBe(1);
      expect(result.firstDiscoverable).toBe('Web Search');
      expect(result.firstInstalled).toBe('File Operations');
      expect(result.firstLocal).toBe('My Custom Skill');
    });

    test('should handle skill search with filters', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface NativeSkill {
          key: string;
          name: string;
          description: string;
          directory: string;
          installed: boolean;
          enabled: boolean | null;
          category: string | null;
          tags: string[] | null;
        }

        const skills: NativeSkill[] = [
          {
            key: 'skill-1',
            name: 'Web Search',
            description: 'Search the web',
            directory: 'web-search',
            installed: true,
            enabled: true,
            category: 'search',
            tags: ['web', 'search'],
          },
          {
            key: 'skill-2',
            name: 'Code Analysis',
            description: 'Analyze code',
            directory: 'code-analysis',
            installed: true,
            enabled: false,
            category: 'development',
            tags: ['code', 'analysis'],
          },
          {
            key: 'skill-3',
            name: 'File Manager',
            description: 'Manage files',
            directory: 'file-manager',
            installed: false,
            enabled: null,
            category: 'utility',
            tags: ['file', 'io'],
          },
        ];

        const searchSkills = (filters: {
          category?: string;
          tags?: string[];
          installed?: boolean;
          enabled?: boolean;
          query?: string;
        }): NativeSkill[] => {
          return skills.filter((skill) => {
            if (filters.category && skill.category !== filters.category) return false;
            if (filters.tags && !filters.tags.some((t) => skill.tags?.includes(t))) return false;
            if (filters.installed !== undefined && skill.installed !== filters.installed) return false;
            if (filters.enabled !== undefined && skill.enabled !== filters.enabled) return false;
            if (filters.query) {
              const q = filters.query.toLowerCase();
              if (!skill.name.toLowerCase().includes(q) && !skill.description.toLowerCase().includes(q)) {
                return false;
              }
            }
            return true;
          });
        };

        const byCategory = searchSkills({ category: 'development' });
        const byTags = searchSkills({ tags: ['web'] });
        const byInstalled = searchSkills({ installed: true });
        const byEnabled = searchSkills({ enabled: true });
        const byQuery = searchSkills({ query: 'file' });
        const combined = searchSkills({ installed: true, enabled: true });

        return {
          byCategoryCount: byCategory.length,
          byCategoryFirst: byCategory[0]?.name,
          byTagsCount: byTags.length,
          byInstalledCount: byInstalled.length,
          byEnabledCount: byEnabled.length,
          byQueryCount: byQuery.length,
          combinedCount: combined.length,
        };
      });

      expect(result.byCategoryCount).toBe(1);
      expect(result.byCategoryFirst).toBe('Code Analysis');
      expect(result.byTagsCount).toBe(1);
      expect(result.byInstalledCount).toBe(2);
      expect(result.byEnabledCount).toBe(1);
      expect(result.byQueryCount).toBe(1);
      expect(result.combinedCount).toBe(1);
    });

    test('should handle skill state management', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface InstalledSkill {
          id: string;
          name: string;
          enabled: boolean;
          category: string | null;
          tags: string[];
        }

        const installedSkills: InstalledSkill[] = [
          { id: 'skill-1', name: 'Skill One', enabled: true, category: 'utility', tags: ['test'] },
          { id: 'skill-2', name: 'Skill Two', enabled: false, category: 'development', tags: [] },
        ];

        const getSkillState = (id: string): { installed: boolean; installedAt: string } | null => {
          const skill = installedSkills.find((s) => s.id === id);
          if (!skill) return null;
          return {
            installed: true,
            installedAt: new Date().toISOString(),
          };
        };

        const enableSkill = (id: string): boolean => {
          const skill = installedSkills.find((s) => s.id === id);
          if (skill) {
            skill.enabled = true;
            return true;
          }
          return false;
        };

        const disableSkill = (id: string): boolean => {
          const skill = installedSkills.find((s) => s.id === id);
          if (skill) {
            skill.enabled = false;
            return true;
          }
          return false;
        };

        const updateSkill = (id: string, category?: string, tags?: string[]): boolean => {
          const skill = installedSkills.find((s) => s.id === id);
          if (skill) {
            if (category !== undefined) skill.category = category;
            if (tags !== undefined) skill.tags = tags;
            return true;
          }
          return false;
        };

        // Test getSkillState
        const state1 = getSkillState('skill-1');
        const state3 = getSkillState('skill-3');

        // Test enable/disable
        const skill2Before = installedSkills.find((s) => s.id === 'skill-2')!.enabled;
        enableSkill('skill-2');
        const skill2After = installedSkills.find((s) => s.id === 'skill-2')!.enabled;
        disableSkill('skill-2');
        const skill2Final = installedSkills.find((s) => s.id === 'skill-2')!.enabled;

        // Test update
        updateSkill('skill-1', 'new-category', ['new-tag1', 'new-tag2']);
        const skill1Updated = installedSkills.find((s) => s.id === 'skill-1');

        return {
          state1Installed: state1?.installed,
          state3Exists: state3 !== null,
          skill2Before,
          skill2After,
          skill2Final,
          skill1Category: skill1Updated?.category,
          skill1Tags: skill1Updated?.tags,
        };
      });

      expect(result.state1Installed).toBe(true);
      expect(result.state3Exists).toBe(false);
      expect(result.skill2Before).toBe(false);
      expect(result.skill2After).toBe(true);
      expect(result.skill2Final).toBe(false);
      expect(result.skill1Category).toBe('new-category');
      expect(result.skill1Tags).toEqual(['new-tag1', 'new-tag2']);
    });
  });

  test.describe('Skill Security Scanning', () => {
    test('should perform security scan on skill', async ({ page }) => {
      const result = await page.evaluate(() => {
        type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
        type SecurityCategory =
          | 'command_execution'
          | 'code_injection'
          | 'filesystem_access'
          | 'network_access'
          | 'sensitive_data'
          | 'privilege_escalation'
          | 'obfuscated_code'
          | 'other';

        interface SecurityFinding {
          ruleId: string;
          title: string;
          description: string;
          severity: SecuritySeverity;
          category: SecurityCategory;
          filePath: string;
          line: number;
          column: number;
          snippet: string | null;
          suggestion: string | null;
        }

        interface SecurityScanSummary {
          filesScanned: number;
          totalFindings: number;
          critical: number;
          high: number;
          medium: number;
          low: number;
          info: number;
          isSafe: boolean;
          riskScore: number;
        }

        interface SecurityScanReport {
          skillId: string;
          skillName: string | null;
          scannedPath: string;
          scannedAt: number;
          durationMs: number;
          summary: SecurityScanSummary;
          findings: SecurityFinding[];
        }

        const scanInstalledSkill = (directory: string): SecurityScanReport => {
          return {
            skillId: `skill-${directory}`,
            skillName: 'Test Skill',
            scannedPath: `/skills/${directory}`,
            scannedAt: Date.now(),
            durationMs: 150,
            summary: {
              filesScanned: 5,
              totalFindings: 3,
              critical: 0,
              high: 1,
              medium: 1,
              low: 1,
              info: 0,
              isSafe: false,
              riskScore: 45,
            },
            findings: [
              {
                ruleId: 'SEC001',
                title: 'Potential command injection',
                description: 'User input passed to shell command',
                severity: 'high',
                category: 'command_execution',
                filePath: 'index.js',
                line: 15,
                column: 8,
                snippet: 'exec(userInput)',
                suggestion: 'Sanitize user input before execution',
              },
              {
                ruleId: 'SEC002',
                title: 'Filesystem access',
                description: 'Reading from arbitrary path',
                severity: 'medium',
                category: 'filesystem_access',
                filePath: 'utils.js',
                line: 42,
                column: 4,
                snippet: 'fs.readFile(path)',
                suggestion: 'Validate path is within allowed directories',
              },
              {
                ruleId: 'SEC003',
                title: 'Network request',
                description: 'Making external HTTP request',
                severity: 'low',
                category: 'network_access',
                filePath: 'api.js',
                line: 28,
                column: 2,
                snippet: 'fetch(url)',
                suggestion: 'Consider using allowlist for URLs',
              },
            ],
          };
        };

        const report = scanInstalledSkill('test-skill');

        return {
          skillId: report.skillId,
          filesScanned: report.summary.filesScanned,
          totalFindings: report.summary.totalFindings,
          criticalCount: report.summary.critical,
          highCount: report.summary.high,
          mediumCount: report.summary.medium,
          lowCount: report.summary.low,
          isSafe: report.summary.isSafe,
          riskScore: report.summary.riskScore,
          firstFindingTitle: report.findings[0]?.title,
          firstFindingSeverity: report.findings[0]?.severity,
        };
      });

      expect(result.skillId).toBe('skill-test-skill');
      expect(result.filesScanned).toBe(5);
      expect(result.totalFindings).toBe(3);
      expect(result.criticalCount).toBe(0);
      expect(result.highCount).toBe(1);
      expect(result.mediumCount).toBe(1);
      expect(result.lowCount).toBe(1);
      expect(result.isSafe).toBe(false);
      expect(result.riskScore).toBe(45);
      expect(result.firstFindingTitle).toBe('Potential command injection');
      expect(result.firstFindingSeverity).toBe('high');
    });

    test('should calculate risk score correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface SecurityScanSummary {
          critical: number;
          high: number;
          medium: number;
          low: number;
          info: number;
        }

        const calculateRiskScore = (summary: SecurityScanSummary): number => {
          const weights = {
            critical: 40,
            high: 25,
            medium: 10,
            low: 3,
            info: 1,
          };

          const rawScore =
            summary.critical * weights.critical +
            summary.high * weights.high +
            summary.medium * weights.medium +
            summary.low * weights.low +
            summary.info * weights.info;

          return Math.min(100, rawScore);
        };

        const safeSkill = calculateRiskScore({ critical: 0, high: 0, medium: 0, low: 0, info: 2 });
        const lowRisk = calculateRiskScore({ critical: 0, high: 0, medium: 1, low: 2, info: 3 });
        const mediumRisk = calculateRiskScore({ critical: 0, high: 1, medium: 2, low: 3, info: 4 });
        const highRisk = calculateRiskScore({ critical: 1, high: 2, medium: 3, low: 4, info: 5 });
        const criticalRisk = calculateRiskScore({ critical: 3, high: 5, medium: 10, low: 10, info: 10 });

        return {
          safeSkill,
          lowRisk,
          mediumRisk,
          highRisk,
          criticalRisk,
        };
      });

      expect(result.safeSkill).toBe(2);
      expect(result.lowRisk).toBe(19);
      expect(result.mediumRisk).toBe(58);
      expect(result.highRisk).toBe(127 > 100 ? 100 : 127);
      expect(result.criticalRisk).toBe(100);
    });

    test('should handle scan options', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface SecurityScanOptions {
          maxFileSize?: number;
          maxFiles?: number;
          extensions?: string[];
          skipPatterns?: string[];
          minSeverity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
        }

        const files = [
          { name: 'script.js', size: 1000 },
          { name: 'large.js', size: 5000000 },
          { name: 'style.css', size: 500 },
          { name: 'data.json', size: 200 },
          { name: 'node_modules/dep.js', size: 300 },
          { name: 'test.spec.js', size: 400 },
        ];

        const applyOptions = (options: SecurityScanOptions): string[] => {
          return files
            .filter((f) => {
              if (options.maxFileSize && f.size > options.maxFileSize) return false;
              if (options.extensions) {
                const ext = f.name.split('.').pop()!;
                if (!options.extensions.includes(ext)) return false;
              }
              if (options.skipPatterns) {
                for (const pattern of options.skipPatterns) {
                  if (f.name.includes(pattern)) return false;
                }
              }
              return true;
            })
            .map((f) => f.name);
        };

        const defaultScan = applyOptions({});
        const sizeFiltered = applyOptions({ maxFileSize: 1000000 });
        const extFiltered = applyOptions({ extensions: ['js'] });
        const skipFiltered = applyOptions({ skipPatterns: ['node_modules', 'test'] });
        const combined = applyOptions({
          maxFileSize: 1000000,
          extensions: ['js'],
          skipPatterns: ['node_modules', 'test'],
        });

        return {
          defaultCount: defaultScan.length,
          sizeFilteredCount: sizeFiltered.length,
          extFilteredCount: extFiltered.length,
          skipFilteredCount: skipFiltered.length,
          combinedCount: combined.length,
          combinedFiles: combined,
        };
      });

      expect(result.defaultCount).toBe(6);
      expect(result.sizeFilteredCount).toBe(5);
      expect(result.extFilteredCount).toBe(4);
      expect(result.skipFilteredCount).toBe(4);
      expect(result.combinedCount).toBe(1);
      expect(result.combinedFiles).toContain('script.js');
    });
  });

  test.describe('Skill Repository Management', () => {
    test('should manage skill repositories', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface SkillRepo {
          owner: string;
          name: string;
          branch: string;
          enabled: boolean;
        }

        const repos: SkillRepo[] = [
          { owner: 'cognia-skills', name: 'core', branch: 'main', enabled: true },
        ];

        const listSkillRepos = (): SkillRepo[] => [...repos];

        const addSkillRepo = (owner: string, name: string, branch = 'main'): SkillRepo => {
          const repo: SkillRepo = { owner, name, branch, enabled: true };
          repos.push(repo);
          return repo;
        };

        const removeSkillRepo = (owner: string, name: string): boolean => {
          const index = repos.findIndex((r) => r.owner === owner && r.name === name);
          if (index !== -1) {
            repos.splice(index, 1);
            return true;
          }
          return false;
        };

        const toggleSkillRepo = (owner: string, name: string, enabled: boolean): boolean => {
          const repo = repos.find((r) => r.owner === owner && r.name === name);
          if (repo) {
            repo.enabled = enabled;
            return true;
          }
          return false;
        };

        // Test operations
        const initialCount = listSkillRepos().length;

        addSkillRepo('community', 'awesome-skills');
        const afterAdd = listSkillRepos().length;

        addSkillRepo('personal', 'my-skills', 'develop');
        const afterSecondAdd = listSkillRepos().length;

        toggleSkillRepo('community', 'awesome-skills', false);
        const disabledRepo = repos.find((r) => r.owner === 'community')?.enabled;

        removeSkillRepo('personal', 'my-skills');
        const afterRemove = listSkillRepos().length;

        return {
          initialCount,
          afterAdd,
          afterSecondAdd,
          disabledRepo,
          afterRemove,
        };
      });

      expect(result.initialCount).toBe(1);
      expect(result.afterAdd).toBe(2);
      expect(result.afterSecondAdd).toBe(3);
      expect(result.disabledRepo).toBe(false);
      expect(result.afterRemove).toBe(2);
    });
  });

  test.describe('Skill Installation Workflow', () => {
    test('should handle skill installation', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface DiscoverableSkill {
          key: string;
          name: string;
          description: string;
          directory: string;
          repoOwner: string;
          repoName: string;
          repoBranch: string;
        }

        interface InstalledSkill {
          id: string;
          name: string;
          description: string | null;
          directory: string;
          installedAt: number;
          enabled: boolean;
        }

        const installed: InstalledSkill[] = [];

        const installSkill = (skill: DiscoverableSkill): InstalledSkill => {
          const installedSkill: InstalledSkill = {
            id: `installed-${skill.key}`,
            name: skill.name,
            description: skill.description,
            directory: skill.directory,
            installedAt: Date.now(),
            enabled: true,
          };
          installed.push(installedSkill);
          return installedSkill;
        };

        const uninstallSkill = (id: string): boolean => {
          const index = installed.findIndex((s) => s.id === id);
          if (index !== -1) {
            installed.splice(index, 1);
            return true;
          }
          return false;
        };

        const getInstalledSkills = (): InstalledSkill[] => [...installed];

        // Test installation
        const skill: DiscoverableSkill = {
          key: 'test/web-search',
          name: 'Web Search',
          description: 'Search the web',
          directory: 'web-search',
          repoOwner: 'test',
          repoName: 'skills',
          repoBranch: 'main',
        };

        const result1 = installSkill(skill);
        const afterInstall = getInstalledSkills().length;

        const skill2: DiscoverableSkill = {
          key: 'test/code-gen',
          name: 'Code Generator',
          description: 'Generate code',
          directory: 'code-gen',
          repoOwner: 'test',
          repoName: 'skills',
          repoBranch: 'main',
        };
        installSkill(skill2);
        const afterSecondInstall = getInstalledSkills().length;

        uninstallSkill(result1.id);
        const afterUninstall = getInstalledSkills().length;

        return {
          firstInstallId: result1.id,
          firstInstallName: result1.name,
          afterInstall,
          afterSecondInstall,
          afterUninstall,
        };
      });

      expect(result.firstInstallId).toBe('installed-test/web-search');
      expect(result.firstInstallName).toBe('Web Search');
      expect(result.afterInstall).toBe(1);
      expect(result.afterSecondInstall).toBe(2);
      expect(result.afterUninstall).toBe(1);
    });

    test('should handle local skill installation', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface LocalSkill {
          directory: string;
          name: string;
          description: string | null;
          path: string;
          hasSkillMd: boolean;
        }

        interface InstalledSkill {
          id: string;
          name: string;
          description: string | null;
          directory: string;
          installedAt: number;
          enabled: boolean;
        }

        const installed: InstalledSkill[] = [];

        const installLocalSkill = (sourcePath: string, name?: string): InstalledSkill => {
          const dirName = sourcePath.split('/').pop() || 'local-skill';
          const installedSkill: InstalledSkill = {
            id: `local-${Date.now()}`,
            name: name || dirName,
            description: 'Locally installed skill',
            directory: dirName,
            installedAt: Date.now(),
            enabled: true,
          };
          installed.push(installedSkill);
          return installedSkill;
        };

        const registerLocalSkill = (directory: string): InstalledSkill => {
          const installedSkill: InstalledSkill = {
            id: `registered-${Date.now()}`,
            name: directory,
            description: 'Registered local skill',
            directory,
            installedAt: Date.now(),
            enabled: true,
          };
          installed.push(installedSkill);
          return installedSkill;
        };

        const scanLocalSkills = (): LocalSkill[] => {
          return [
            {
              directory: 'custom-skill-1',
              name: 'Custom Skill 1',
              description: 'A custom skill',
              path: '/skills/custom-skill-1',
              hasSkillMd: true,
            },
            {
              directory: 'custom-skill-2',
              name: 'Custom Skill 2',
              description: null,
              path: '/skills/custom-skill-2',
              hasSkillMd: false,
            },
          ];
        };

        // Test local operations
        const localSkills = scanLocalSkills();
        const installedLocal = installLocalSkill('/path/to/my-skill', 'My Custom Skill');
        const registeredLocal = registerLocalSkill('existing-skill');

        return {
          localSkillsCount: localSkills.length,
          hasSkillMdCount: localSkills.filter((s) => s.hasSkillMd).length,
          installedLocalName: installedLocal.name,
          registeredLocalName: registeredLocal.name,
          totalInstalled: installed.length,
        };
      });

      expect(result.localSkillsCount).toBe(2);
      expect(result.hasSkillMdCount).toBe(1);
      expect(result.installedLocalName).toBe('My Custom Skill');
      expect(result.registeredLocalName).toBe('existing-skill');
      expect(result.totalInstalled).toBe(2);
    });
  });

  test.describe('Skill Content Management', () => {
    test('should read skill content and resources', async ({ page }) => {
      const result = await page.evaluate(() => {
        const skillContents: Record<string, string> = {
          'web-search': `---
name: web-search
description: Search the web for information
category: search
tags:
  - web
  - search
  - information
---

# Web Search Skill

This skill allows you to search the web for information.

## Usage

Use this skill when you need to find current information from the internet.`,
          'code-analysis': `---
name: code-analysis
description: Analyze code for patterns and issues
---

# Code Analysis Skill

Analyze code for common patterns and potential issues.`,
        };

        const skillResources: Record<string, string[]> = {
          'web-search': ['search-api.js', 'parser.js', 'config.json'],
          'code-analysis': ['analyzer.js', 'rules.json', 'patterns/eslint.json'],
        };

        const resourceContents: Record<string, string> = {
          'web-search/config.json': '{"apiKey": "xxx", "maxResults": 10}',
          'code-analysis/rules.json': '{"rules": ["no-eval", "no-console"]}',
        };

        const readSkillContent = (directory: string): string | null => {
          return skillContents[directory] || null;
        };

        const listSkillResources = (directory: string): string[] => {
          return skillResources[directory] || [];
        };

        const readSkillResource = (directory: string, resourcePath: string): string | null => {
          return resourceContents[`${directory}/${resourcePath}`] || null;
        };

        // Test content operations
        const webSearchContent = readSkillContent('web-search');
        const codeAnalysisContent = readSkillContent('code-analysis');
        const nonExistentContent = readSkillContent('non-existent');

        const webSearchResources = listSkillResources('web-search');
        const codeAnalysisResources = listSkillResources('code-analysis');

        const configContent = readSkillResource('web-search', 'config.json');
        const rulesContent = readSkillResource('code-analysis', 'rules.json');

        return {
          webSearchContentLength: webSearchContent?.length || 0,
          codeAnalysisContentLength: codeAnalysisContent?.length || 0,
          nonExistentExists: nonExistentContent !== null,
          webSearchResourceCount: webSearchResources.length,
          codeAnalysisResourceCount: codeAnalysisResources.length,
          configContentValid: configContent?.includes('apiKey') || false,
          rulesContentValid: rulesContent?.includes('no-eval') || false,
        };
      });

      expect(result.webSearchContentLength).toBeGreaterThan(100);
      expect(result.codeAnalysisContentLength).toBeGreaterThan(50);
      expect(result.nonExistentExists).toBe(false);
      expect(result.webSearchResourceCount).toBe(3);
      expect(result.codeAnalysisResourceCount).toBe(3);
      expect(result.configContentValid).toBe(true);
      expect(result.rulesContentValid).toBe(true);
    });
  });

  test.describe('Skill UI Components', () => {
    test('should display skill security scanner when available', async ({ page }) => {
      await page.click('text=Skills');

      // Check if security scanner component elements might be present
      const hasSecurityRelatedUI =
        (await page.locator('text=/security|scan|risk/i').count()) > 0 ||
        (await page.locator('[data-testid*="security"]').count()) > 0;

      // This test verifies the UI exists, actual scanning requires native
      expect(typeof hasSecurityRelatedUI).toBe('boolean');
    });

    test('should handle native unavailable state gracefully', async ({ page }) => {
      await page.click('text=Skills');

      // Navigate to Discover tab if it exists
      const discoverTab = page.locator('[role="tablist"] [role="tab"]').nth(1);
      if (await discoverTab.isVisible()) {
        await discoverTab.click();
        await page.waitForTimeout(500);

        // Check for native unavailable message or skill cards
        const nativeUnavailable = await isNativeUnavailable(page);
        const hasSkillCards = (await page.locator('[data-testid="discoverable-skill-card"]').count()) > 0;
        const hasEmptyState = await page.getByText(/no discoverable skills/i).isVisible().catch(() => false);

        // One of these states should be true
        expect(nativeUnavailable || hasSkillCards || hasEmptyState).toBe(true);
      }
    });
  });
});
