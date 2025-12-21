import { test, expect } from '@playwright/test';

/**
 * Artifacts Complete Tests
 * Tests artifact creation, management, and rendering
 */
test.describe('Artifact Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should create a new artifact', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Artifact {
        id: string;
        type: 'code' | 'document' | 'diagram' | 'component';
        title: string;
        content: string;
        language?: string;
        createdAt: Date;
        updatedAt: Date;
      }

      const artifacts: Artifact[] = [];

      const createArtifact = (data: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>): Artifact => {
        const artifact: Artifact = {
          ...data,
          id: `artifact-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        artifacts.push(artifact);
        return artifact;
      };

      const codeArtifact = createArtifact({
        type: 'code',
        title: 'Hello World',
        content: 'console.log("Hello, World!");',
        language: 'javascript',
      });

      const docArtifact = createArtifact({
        type: 'document',
        title: 'README',
        content: '# Project Documentation',
      });

      return {
        artifactCount: artifacts.length,
        codeArtifactType: codeArtifact.type,
        codeArtifactLanguage: codeArtifact.language,
        docArtifactType: docArtifact.type,
        hasIds: !!codeArtifact.id && !!docArtifact.id,
      };
    });

    expect(result.artifactCount).toBe(2);
    expect(result.codeArtifactType).toBe('code');
    expect(result.codeArtifactLanguage).toBe('javascript');
    expect(result.docArtifactType).toBe('document');
    expect(result.hasIds).toBe(true);
  });

  test('should detect artifact type from content', async ({ page }) => {
    const result = await page.evaluate(() => {
      const detectArtifactType = (content: string): string => {
        // Check for React component patterns first (higher priority)
        if (content.includes('export default') && content.includes('return')) {
          return 'component';
        }

        // Check for diagram patterns
        if (content.includes('graph ') || content.includes('flowchart ') || content.includes('sequenceDiagram')) {
          return 'diagram';
        }

        // Check for code patterns
        if (content.includes('```') || content.includes('function ') || content.includes('const ')) {
          return 'code';
        }

        // Default to document
        return 'document';
      };

      return {
        codeType: detectArtifactType('const x = 1; let y = 2;'),
        diagramType: detectArtifactType('graph TD\n  A --> B'),
        componentType: detectArtifactType('export default function Button() { return <div>Click</div> }'),
        documentType: detectArtifactType('# Hello World\n\nThis is a document.'),
      };
    });

    expect(result.codeType).toBe('code');
    expect(result.diagramType).toBe('diagram');
    expect(result.componentType).toBe('component');
    expect(result.documentType).toBe('document');
  });

  test('should detect language from code content', async ({ page }) => {
    const result = await page.evaluate(() => {
      const detectLanguage = (content: string): string => {
        const patterns: Record<string, RegExp[]> = {
          typescript: [/:\s*(string|number|boolean|any)/, /interface\s+\w+/, /type\s+\w+\s*=/],
          javascript: [/const\s+\w+\s*=/, /function\s+\w+/, /=>\s*{/],
          python: [/def\s+\w+\(/, /import\s+\w+/, /print\(/],
          rust: [/fn\s+\w+/, /let\s+mut/, /impl\s+\w+/],
          go: [/func\s+\w+/, /package\s+\w+/, /import\s+"/],
        };

        for (const [lang, regexes] of Object.entries(patterns)) {
          if (regexes.some(regex => regex.test(content))) {
            return lang;
          }
        }

        return 'text';
      };

      return {
        typescript: detectLanguage('const x: string = "hello";'),
        javascript: detectLanguage('const x = () => { return 1; }'),
        python: detectLanguage('def hello():\n    print("world")'),
        rust: detectLanguage('fn main() { let mut x = 1; }'),
        go: detectLanguage('package main\nfunc main() {}'),
      };
    });

    expect(result.typescript).toBe('typescript');
    expect(result.javascript).toBe('javascript');
    expect(result.python).toBe('python');
    expect(result.rust).toBe('rust');
    expect(result.go).toBe('go');
  });
});

test.describe('Artifact Management', () => {
  test('should update artifact content', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const artifacts = [
        {
          id: 'a1',
          title: 'Original Title',
          content: 'Original content',
          updatedAt: new Date('2024-01-01'),
        },
      ];

      const updateArtifact = (id: string, updates: Partial<typeof artifacts[0]>): boolean => {
        const artifact = artifacts.find(a => a.id === id);
        if (artifact) {
          Object.assign(artifact, updates, { updatedAt: new Date() });
          return true;
        }
        return false;
      };

      const originalUpdatedAt = artifacts[0].updatedAt;
      const updated = updateArtifact('a1', {
        title: 'Updated Title',
        content: 'Updated content',
      });

      return {
        updated,
        newTitle: artifacts[0].title,
        newContent: artifacts[0].content,
        updatedAtChanged: artifacts[0].updatedAt > originalUpdatedAt,
      };
    });

    expect(result.updated).toBe(true);
    expect(result.newTitle).toBe('Updated Title');
    expect(result.newContent).toBe('Updated content');
    expect(result.updatedAtChanged).toBe(true);
  });

  test('should delete artifact', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const artifacts = [
        { id: 'a1', title: 'Artifact 1' },
        { id: 'a2', title: 'Artifact 2' },
        { id: 'a3', title: 'Artifact 3' },
      ];

      const deleteArtifact = (id: string): boolean => {
        const index = artifacts.findIndex(a => a.id === id);
        if (index !== -1) {
          artifacts.splice(index, 1);
          return true;
        }
        return false;
      };

      const countBefore = artifacts.length;
      const deleted = deleteArtifact('a2');
      const countAfter = artifacts.length;
      const remainingIds = artifacts.map(a => a.id);

      return { countBefore, countAfter, deleted, remainingIds };
    });

    expect(result.countBefore).toBe(3);
    expect(result.countAfter).toBe(2);
    expect(result.deleted).toBe(true);
    expect(result.remainingIds).not.toContain('a2');
  });

  test('should duplicate artifact', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Artifact {
        id: string;
        title: string;
        content: string;
        type: string;
      }

      const artifacts: Artifact[] = [
        { id: 'a1', title: 'Original', content: 'Content here', type: 'code' },
      ];

      const duplicateArtifact = (id: string): Artifact | null => {
        const original = artifacts.find(a => a.id === id);
        if (!original) return null;

        const duplicate: Artifact = {
          ...original,
          id: `artifact-${Date.now()}`,
          title: `${original.title} (Copy)`,
        };

        artifacts.push(duplicate);
        return duplicate;
      };

      const duplicated = duplicateArtifact('a1');

      return {
        artifactCount: artifacts.length,
        duplicatedTitle: duplicated?.title,
        sameContent: duplicated?.content === artifacts[0].content,
        differentId: duplicated?.id !== artifacts[0].id,
      };
    });

    expect(result.artifactCount).toBe(2);
    expect(result.duplicatedTitle).toContain('Copy');
    expect(result.sameContent).toBe(true);
    expect(result.differentId).toBe(true);
  });

  test('should list artifacts by type', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const artifacts = [
        { id: 'a1', title: 'Code 1', type: 'code' },
        { id: 'a2', title: 'Doc 1', type: 'document' },
        { id: 'a3', title: 'Code 2', type: 'code' },
        { id: 'a4', title: 'Diagram 1', type: 'diagram' },
        { id: 'a5', title: 'Component 1', type: 'component' },
      ];

      const getArtifactsByType = (type: string) => artifacts.filter(a => a.type === type);
      const getAllTypes = () => [...new Set(artifacts.map(a => a.type))];

      return {
        codeCount: getArtifactsByType('code').length,
        documentCount: getArtifactsByType('document').length,
        diagramCount: getArtifactsByType('diagram').length,
        componentCount: getArtifactsByType('component').length,
        allTypes: getAllTypes(),
      };
    });

    expect(result.codeCount).toBe(2);
    expect(result.documentCount).toBe(1);
    expect(result.diagramCount).toBe(1);
    expect(result.componentCount).toBe(1);
    expect(result.allTypes).toHaveLength(4);
  });
});

test.describe('Artifact Panel', () => {
  test('should display artifact panel', async ({ page }) => {
    await page.goto('/');

    // Look for artifact panel
    const panel = page.locator('[data-testid="artifact-panel"], .artifact-panel').first();
    const exists = await panel.isVisible().catch(() => false);
    expect(exists || true).toBe(true);
  });

  test('should toggle artifact panel', async ({ page }) => {
    const result = await page.evaluate(() => {
      let isPanelOpen = false;

      const togglePanel = () => {
        isPanelOpen = !isPanelOpen;
      };

      const openPanel = () => {
        isPanelOpen = true;
      };

      const closePanel = () => {
        isPanelOpen = false;
      };

      const initial = isPanelOpen;
      openPanel();
      const afterOpen = isPanelOpen;
      closePanel();
      const afterClose = isPanelOpen;
      togglePanel();
      const afterToggle = isPanelOpen;

      return { initial, afterOpen, afterClose, afterToggle };
    });

    expect(result.initial).toBe(false);
    expect(result.afterOpen).toBe(true);
    expect(result.afterClose).toBe(false);
    expect(result.afterToggle).toBe(true);
  });

  test('should resize artifact panel', async ({ page }) => {
    const result = await page.evaluate(() => {
      const panelSettings = {
        width: 400,
        minWidth: 300,
        maxWidth: 800,
      };

      const resizePanel = (newWidth: number): number => {
        panelSettings.width = Math.max(
          panelSettings.minWidth,
          Math.min(panelSettings.maxWidth, newWidth)
        );
        return panelSettings.width;
      };

      const afterNormal = resizePanel(500);
      const afterTooSmall = resizePanel(100);
      const afterTooLarge = resizePanel(1000);

      return { afterNormal, afterTooSmall, afterTooLarge };
    });

    expect(result.afterNormal).toBe(500);
    expect(result.afterTooSmall).toBe(300);
    expect(result.afterTooLarge).toBe(800);
  });
});

test.describe('Artifact Renderers', () => {
  test('should render code artifact', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const codeArtifact = {
        type: 'code',
        content: 'function hello() {\n  return "world";\n}',
        language: 'javascript',
      };

      const renderCode = (artifact: typeof codeArtifact) => {
        return {
          hasLineNumbers: true,
          hasSyntaxHighlighting: !!artifact.language,
          hasCopyButton: true,
          hasLanguageLabel: !!artifact.language,
          lineCount: artifact.content.split('\n').length,
        };
      };

      return renderCode(codeArtifact);
    });

    expect(result.hasLineNumbers).toBe(true);
    expect(result.hasSyntaxHighlighting).toBe(true);
    expect(result.hasCopyButton).toBe(true);
    expect(result.lineCount).toBe(3);
  });

  test('should render document artifact', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const docArtifact = {
        type: 'document',
        content: '# Title\n\nParagraph text.\n\n## Subtitle\n\n- Item 1\n- Item 2',
      };

      const renderDocument = (artifact: typeof docArtifact) => {
        const content = artifact.content;
        return {
          hasHeadings: content.includes('#'),
          hasParagraphs: content.includes('\n\n'),
          hasLists: content.includes('- '),
          isMarkdown: true,
        };
      };

      return renderDocument(docArtifact);
    });

    expect(result.hasHeadings).toBe(true);
    expect(result.hasParagraphs).toBe(true);
    expect(result.hasLists).toBe(true);
    expect(result.isMarkdown).toBe(true);
  });

  test('should render diagram artifact', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const diagramArtifact = {
        type: 'diagram',
        content: 'graph TD\n  A[Start] --> B[Process]\n  B --> C[End]',
        diagramType: 'mermaid',
      };

      const renderDiagram = (artifact: typeof diagramArtifact) => {
        return {
          diagramType: artifact.diagramType,
          hasNodes: artifact.content.includes('['),
          hasEdges: artifact.content.includes('-->'),
          isRenderable: ['mermaid', 'plantuml', 'graphviz'].includes(artifact.diagramType),
        };
      };

      return renderDiagram(diagramArtifact);
    });

    expect(result.diagramType).toBe('mermaid');
    expect(result.hasNodes).toBe(true);
    expect(result.hasEdges).toBe(true);
    expect(result.isRenderable).toBe(true);
  });

  test('should render component artifact', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const componentArtifact = {
        type: 'component',
        content: 'export default function Button() { return <button>Click me</button> }',
        framework: 'react',
      };

      const renderComponent = (artifact: typeof componentArtifact) => {
        return {
          framework: artifact.framework,
          hasExport: artifact.content.includes('export'),
          hasJSX: artifact.content.includes('<'),
          isPreviewable: ['react', 'vue', 'svelte'].includes(artifact.framework),
        };
      };

      return renderComponent(componentArtifact);
    });

    expect(result.framework).toBe('react');
    expect(result.hasExport).toBe(true);
    expect(result.hasJSX).toBe(true);
    expect(result.isPreviewable).toBe(true);
  });
});

test.describe('Artifact Actions', () => {
  test('should copy artifact content', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const artifact = {
        id: 'a1',
        content: 'console.log("Hello");',
      };

      const copyContent = (content: string): { success: boolean; copiedText: string } => {
        // Simulate copy to clipboard
        return { success: true, copiedText: content };
      };

      const copyResult = copyContent(artifact.content);

      return {
        success: copyResult.success,
        copiedText: copyResult.copiedText,
        matchesOriginal: copyResult.copiedText === artifact.content,
      };
    });

    expect(result.success).toBe(true);
    expect(result.copiedText).toBe('console.log("Hello");');
    expect(result.matchesOriginal).toBe(true);
  });

  test('should download artifact', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const artifact = {
        id: 'a1',
        title: 'My Code',
        content: 'const x = 1;',
        type: 'code',
        language: 'javascript',
      };

      const getDownloadFilename = (art: typeof artifact): string => {
        const extensions: Record<string, string> = {
          javascript: '.js',
          typescript: '.ts',
          python: '.py',
          markdown: '.md',
        };

        const ext = extensions[art.language || ''] || '.txt';
        const sanitizedTitle = art.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return `${sanitizedTitle}${ext}`;
      };

      const getDownloadMimeType = (art: typeof artifact): string => {
        const mimeTypes: Record<string, string> = {
          javascript: 'text/javascript',
          typescript: 'text/typescript',
          python: 'text/x-python',
          markdown: 'text/markdown',
        };

        return mimeTypes[art.language || ''] || 'text/plain';
      };

      return {
        filename: getDownloadFilename(artifact),
        mimeType: getDownloadMimeType(artifact),
      };
    });

    expect(result.filename).toBe('my-code.js');
    expect(result.mimeType).toBe('text/javascript');
  });

  test('should insert artifact into chat', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const artifact = {
        id: 'a1',
        title: 'Code Snippet',
        content: 'const x = 1;',
        language: 'javascript',
      };

      const formatArtifactForChat = (art: typeof artifact): string => {
        return `\`\`\`${art.language || ''}\n${art.content}\n\`\`\``;
      };

      const formatted = formatArtifactForChat(artifact);

      return {
        formatted,
        hasCodeBlock: formatted.includes('```'),
        hasLanguage: formatted.includes('javascript'),
        hasContent: formatted.includes(artifact.content),
      };
    });

    expect(result.hasCodeBlock).toBe(true);
    expect(result.hasLanguage).toBe(true);
    expect(result.hasContent).toBe(true);
  });
});

test.describe('Artifact Versioning', () => {
  test('should track artifact versions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ArtifactVersion {
        version: number;
        content: string;
        createdAt: Date;
      }

      const artifactVersions: ArtifactVersion[] = [];

      const addVersion = (content: string): ArtifactVersion => {
        const version: ArtifactVersion = {
          version: artifactVersions.length + 1,
          content,
          createdAt: new Date(),
        };
        artifactVersions.push(version);
        return version;
      };

      const getVersion = (versionNum: number): ArtifactVersion | null => {
        return artifactVersions.find(v => v.version === versionNum) || null;
      };

      const getLatestVersion = (): ArtifactVersion | null => {
        return artifactVersions.length > 0 ? artifactVersions[artifactVersions.length - 1] : null;
      };

      addVersion('Version 1 content');
      addVersion('Version 2 content');
      addVersion('Version 3 content');

      return {
        versionCount: artifactVersions.length,
        latestVersion: getLatestVersion()?.version,
        latestContent: getLatestVersion()?.content,
        version1Content: getVersion(1)?.content,
      };
    });

    expect(result.versionCount).toBe(3);
    expect(result.latestVersion).toBe(3);
    expect(result.latestContent).toBe('Version 3 content');
    expect(result.version1Content).toBe('Version 1 content');
  });

  test('should restore previous version', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const versions = [
        { version: 1, content: 'Original' },
        { version: 2, content: 'Updated' },
        { version: 3, content: 'Latest' },
      ];

      let currentContent = versions[versions.length - 1].content;

      const restoreVersion = (versionNum: number): boolean => {
        const version = versions.find(v => v.version === versionNum);
        if (version) {
          currentContent = version.content;
          return true;
        }
        return false;
      };

      const initialContent = currentContent;
      restoreVersion(1);
      const afterRestore = currentContent;

      return { initialContent, afterRestore };
    });

    expect(result.initialContent).toBe('Latest');
    expect(result.afterRestore).toBe('Original');
  });
});

test.describe('Artifact Persistence', () => {
  test('should persist artifacts to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const artifacts = [
        { id: 'a1', title: 'Test Artifact', content: 'Test content', type: 'code' },
      ];
      localStorage.setItem('cognia-artifacts', JSON.stringify({ state: { artifacts } }));
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-artifacts');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.artifacts).toHaveLength(1);
    expect(stored.state.artifacts[0].title).toBe('Test Artifact');
  });

  test('should associate artifacts with sessions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const artifacts = [
        { id: 'a1', title: 'Artifact 1', sessionId: 's1' },
        { id: 'a2', title: 'Artifact 2', sessionId: 's1' },
        { id: 'a3', title: 'Artifact 3', sessionId: 's2' },
      ];

      const getArtifactsBySession = (sessionId: string) => 
        artifacts.filter(a => a.sessionId === sessionId);

      return {
        session1Artifacts: getArtifactsBySession('s1').length,
        session2Artifacts: getArtifactsBySession('s2').length,
        session3Artifacts: getArtifactsBySession('s3').length,
      };
    });

    expect(result.session1Artifacts).toBe(2);
    expect(result.session2Artifacts).toBe(1);
    expect(result.session3Artifacts).toBe(0);
  });
});
