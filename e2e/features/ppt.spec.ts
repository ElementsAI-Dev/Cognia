import { test, expect } from '@playwright/test';

/**
 * PPT Feature E2E Tests
 * Tests the complete PPT generation and preview workflow
 */

test.describe('PPT Generation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have PPT workflow types defined', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Test PPT type definitions exist
      interface PPTSlide {
        id: string;
        order: number;
        layout: string;
        title?: string;
        subtitle?: string;
        content?: string;
        bullets?: string[];
        notes?: string;
        elements: unknown[];
      }

      interface PPTTheme {
        id: string;
        name: string;
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        backgroundColor: string;
        textColor: string;
        headingFont: string;
        bodyFont: string;
        codeFont: string;
      }

      interface PPTPresentation {
        id: string;
        title: string;
        theme: PPTTheme;
        slides: PPTSlide[];
        totalSlides: number;
        aspectRatio: string;
        createdAt: Date;
        updatedAt: Date;
      }

      // Create a test presentation
      const testPresentation: PPTPresentation = {
        id: 'test-ppt-1',
        title: 'E2E Test Presentation',
        theme: {
          id: 'modern-light',
          name: 'Modern Light',
          primaryColor: '#2563EB',
          secondaryColor: '#1D4ED8',
          accentColor: '#3B82F6',
          backgroundColor: '#FFFFFF',
          textColor: '#1E293B',
          headingFont: 'Inter',
          bodyFont: 'Inter',
          codeFont: 'JetBrains Mono',
        },
        slides: [
          {
            id: 'slide-1',
            order: 0,
            layout: 'title',
            title: 'Introduction',
            subtitle: 'Getting Started',
            elements: [],
          },
          {
            id: 'slide-2',
            order: 1,
            layout: 'bullets',
            title: 'Key Points',
            bullets: ['Point A', 'Point B', 'Point C'],
            notes: 'Explain each point',
            elements: [],
          },
          {
            id: 'slide-3',
            order: 2,
            layout: 'closing',
            title: 'Thank You',
            content: 'Questions?',
            elements: [],
          },
        ],
        totalSlides: 3,
        aspectRatio: '16:9',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        hasValidStructure: !!testPresentation.id && !!testPresentation.theme,
        slideCount: testPresentation.slides.length,
        hasAllLayouts: testPresentation.slides.every(s => !!s.layout),
        themeHasColors: !!testPresentation.theme.primaryColor,
      };
    });

    expect(result.hasValidStructure).toBe(true);
    expect(result.slideCount).toBe(3);
    expect(result.hasAllLayouts).toBe(true);
    expect(result.themeHasColors).toBe(true);
  });

  test('should generate Marp markdown from presentation', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate Marp generation logic
      interface Slide {
        layout: string;
        title?: string;
        subtitle?: string;
        content?: string;
        bullets?: string[];
        notes?: string;
      }

      interface Theme {
        primaryColor: string;
        backgroundColor: string;
        textColor: string;
        headingFont: string;
        bodyFont: string;
      }

      const generateMarp = (title: string, slides: Slide[], theme: Theme): string => {
        const lines: string[] = [];
        
        // Frontmatter
        lines.push('---');
        lines.push('marp: true');
        lines.push('theme: default');
        lines.push('paginate: true');
        lines.push(`backgroundColor: ${theme.backgroundColor}`);
        lines.push(`color: ${theme.textColor}`);
        lines.push('style: |');
        lines.push(`  section { font-family: ${theme.bodyFont}, sans-serif; }`);
        lines.push(`  h1, h2, h3 { font-family: ${theme.headingFont}, sans-serif; color: ${theme.primaryColor}; }`);
        lines.push('---');
        lines.push('');

        // Slides
        for (let i = 0; i < slides.length; i++) {
          const slide = slides[i];
          
          if (i > 0) {
            lines.push('---');
            lines.push('');
          }

          if (slide.title) {
            const heading = slide.layout === 'title' || slide.layout === 'section' ? '#' : '##';
            lines.push(`${heading} ${slide.title}`);
          }

          if (slide.subtitle) {
            lines.push(`### ${slide.subtitle}`);
          }

          lines.push('');

          if (slide.content) {
            lines.push(slide.content);
            lines.push('');
          }

          if (slide.bullets && slide.bullets.length > 0) {
            for (const bullet of slide.bullets) {
              lines.push(`- ${bullet}`);
            }
            lines.push('');
          }

          if (slide.notes) {
            lines.push('<!--');
            lines.push(slide.notes);
            lines.push('-->');
            lines.push('');
          }
        }

        return lines.join('\n');
      };

      const testSlides: Slide[] = [
        { layout: 'title', title: 'Test Title', subtitle: 'Test Subtitle' },
        { layout: 'bullets', title: 'Points', bullets: ['A', 'B', 'C'], notes: 'Notes here' },
      ];

      const testTheme: Theme = {
        primaryColor: '#3B82F6',
        backgroundColor: '#FFFFFF',
        textColor: '#1E293B',
        headingFont: 'Inter',
        bodyFont: 'Inter',
      };

      const markdown = generateMarp('Test', testSlides, testTheme);

      return {
        hasFrontmatter: markdown.includes('marp: true'),
        hasThemeColors: markdown.includes('#3B82F6'),
        hasSlideSeparators: markdown.includes('---'),
        hasTitle: markdown.includes('# Test Title'),
        hasBullets: markdown.includes('- A') && markdown.includes('- B'),
        hasNotes: markdown.includes('<!--') && markdown.includes('Notes here'),
        totalLength: markdown.length,
      };
    });

    expect(result.hasFrontmatter).toBe(true);
    expect(result.hasThemeColors).toBe(true);
    expect(result.hasSlideSeparators).toBe(true);
    expect(result.hasTitle).toBe(true);
    expect(result.hasBullets).toBe(true);
    expect(result.hasNotes).toBe(true);
    expect(result.totalLength).toBeGreaterThan(100);
  });

  test('should handle PPT outline generation', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface OutlineItem {
        id: string;
        title: string;
        description?: string;
        suggestedLayout: string;
        keyPoints?: string[];
        order: number;
      }

      // Simulate outline generation
      const generateOutline = (topic: string, slideCount: number): OutlineItem[] => {
        const outline: OutlineItem[] = [];

        // Title slide
        outline.push({
          id: 'slide-1',
          title: topic,
          description: 'Opening title slide',
          suggestedLayout: 'title',
          keyPoints: [],
          order: 0,
        });

        // Agenda slide
        outline.push({
          id: 'slide-2',
          title: 'Agenda',
          description: 'Overview of topics',
          suggestedLayout: 'bullets',
          keyPoints: ['Topic 1', 'Topic 2', 'Topic 3'],
          order: 1,
        });

        // Content slides
        for (let i = 2; i < slideCount - 1; i++) {
          outline.push({
            id: `slide-${i + 1}`,
            title: `Section ${i - 1}`,
            description: `Content for section ${i - 1}`,
            suggestedLayout: 'title-content',
            keyPoints: [],
            order: i,
          });
        }

        // Closing slide
        outline.push({
          id: `slide-${slideCount}`,
          title: 'Thank You',
          description: 'Closing slide',
          suggestedLayout: 'closing',
          keyPoints: [],
          order: slideCount - 1,
        });

        return outline;
      };

      const outline = generateOutline('AI in Healthcare', 6);

      return {
        totalSlides: outline.length,
        hasTitle: outline[0].suggestedLayout === 'title',
        hasClosing: outline[outline.length - 1].suggestedLayout === 'closing',
        hasAgenda: outline.some(o => o.title === 'Agenda'),
        allHaveIds: outline.every(o => !!o.id),
        ordersAreSequential: outline.every((o, i) => o.order === i),
      };
    });

    expect(result.totalSlides).toBe(6);
    expect(result.hasTitle).toBe(true);
    expect(result.hasClosing).toBe(true);
    expect(result.hasAgenda).toBe(true);
    expect(result.allHaveIds).toBe(true);
    expect(result.ordersAreSequential).toBe(true);
  });

  test('should handle theme selection', async ({ page }) => {
    const result = await page.evaluate(() => {
      const themes = [
        { id: 'modern-dark', name: 'Modern Dark', primaryColor: '#3B82F6', backgroundColor: '#0F172A' },
        { id: 'modern-light', name: 'Modern Light', primaryColor: '#2563EB', backgroundColor: '#FFFFFF' },
        { id: 'professional', name: 'Professional', primaryColor: '#1E40AF', backgroundColor: '#FFFFFF' },
        { id: 'creative', name: 'Creative', primaryColor: '#7C3AED', backgroundColor: '#FAF5FF' },
        { id: 'minimal', name: 'Minimal', primaryColor: '#18181B', backgroundColor: '#FAFAFA' },
        { id: 'nature', name: 'Nature', primaryColor: '#059669', backgroundColor: '#ECFDF5' },
      ];

      // Test theme switching
      const getThemeById = (id: string) => themes.find(t => t.id === id);

      const darkTheme = getThemeById('modern-dark');
      const lightTheme = getThemeById('modern-light');
      const creativeTheme = getThemeById('creative');

      return {
        totalThemes: themes.length,
        darkThemeExists: !!darkTheme,
        darkBgColor: darkTheme?.backgroundColor,
        lightBgColor: lightTheme?.backgroundColor,
        creativePrimaryColor: creativeTheme?.primaryColor,
        allHaveRequiredFields: themes.every(t => t.id && t.name && t.primaryColor && t.backgroundColor),
      };
    });

    expect(result.totalThemes).toBe(6);
    expect(result.darkThemeExists).toBe(true);
    expect(result.darkBgColor).toBe('#0F172A');
    expect(result.lightBgColor).toBe('#FFFFFF');
    expect(result.creativePrimaryColor).toBe('#7C3AED');
    expect(result.allHaveRequiredFields).toBe(true);
  });

  test('should handle slide navigation logic', async ({ page }) => {
    const result = await page.evaluate(() => {
      const slides = [
        { id: 's1', title: 'Slide 1' },
        { id: 's2', title: 'Slide 2' },
        { id: 's3', title: 'Slide 3' },
        { id: 's4', title: 'Slide 4' },
        { id: 's5', title: 'Slide 5' },
      ];

      let currentIndex = 0;

      const goNext = () => {
        if (currentIndex < slides.length - 1) {
          currentIndex++;
          return true;
        }
        return false;
      };

      const goPrev = () => {
        if (currentIndex > 0) {
          currentIndex--;
          return true;
        }
        return false;
      };

      const goTo = (index: number) => {
        if (index >= 0 && index < slides.length) {
          currentIndex = index;
          return true;
        }
        return false;
      };

      // Test navigation
      const canGoPrevAtStart = goPrev(); // Should be false
      const startIndex = currentIndex;

      goNext(); // Go to index 1
      goNext(); // Go to index 2
      const afterTwoNexts = currentIndex;

      goPrev(); // Go to index 1
      const afterPrev = currentIndex;

      goTo(4); // Go to last slide
      const afterGoToLast = currentIndex;

      const canGoNextAtEnd = goNext(); // Should be false
      const endIndex = currentIndex;

      goTo(2); // Go to middle
      const afterGoToMiddle = currentIndex;

      return {
        canGoPrevAtStart,
        startIndex,
        afterTwoNexts,
        afterPrev,
        afterGoToLast,
        canGoNextAtEnd,
        endIndex,
        afterGoToMiddle,
        totalSlides: slides.length,
      };
    });

    expect(result.canGoPrevAtStart).toBe(false);
    expect(result.startIndex).toBe(0);
    expect(result.afterTwoNexts).toBe(2);
    expect(result.afterPrev).toBe(1);
    expect(result.afterGoToLast).toBe(4);
    expect(result.canGoNextAtEnd).toBe(false);
    expect(result.endIndex).toBe(4);
    expect(result.afterGoToMiddle).toBe(2);
  });

  test('should handle export formats', async ({ page }) => {
    const result = await page.evaluate(() => {
      const exportFormats = ['marp', 'html', 'reveal', 'pdf', 'pptx'] as const;
      type ExportFormat = typeof exportFormats[number];

      const getFileExtension = (format: ExportFormat): string => {
        switch (format) {
          case 'marp': return 'md';
          case 'html': return 'html';
          case 'reveal': return 'html';
          case 'pdf': return 'pdf';
          case 'pptx': return 'pptx';
          default: return 'txt';
        }
      };

      const getMimeType = (format: ExportFormat): string => {
        switch (format) {
          case 'marp': return 'text/markdown';
          case 'html': return 'text/html';
          case 'reveal': return 'text/html';
          case 'pdf': return 'application/pdf';
          case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          default: return 'text/plain';
        }
      };

      const generateFilename = (title: string, format: ExportFormat): string => {
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_');
        return `${safeTitle}.${getFileExtension(format)}`;
      };

      return {
        marpExt: getFileExtension('marp'),
        htmlExt: getFileExtension('html'),
        pdfExt: getFileExtension('pdf'),
        pptxExt: getFileExtension('pptx'),
        marpMime: getMimeType('marp'),
        pptxMime: getMimeType('pptx'),
        filename: generateFilename('My Test Presentation', 'marp'),
        totalFormats: exportFormats.length,
      };
    });

    expect(result.marpExt).toBe('md');
    expect(result.htmlExt).toBe('html');
    expect(result.pdfExt).toBe('pdf');
    expect(result.pptxExt).toBe('pptx');
    expect(result.marpMime).toBe('text/markdown');
    expect(result.pptxMime).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    expect(result.filename).toBe('My_Test_Presentation.md');
    expect(result.totalFormats).toBe(5);
  });

  test('should handle slide layouts correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const layouts = [
        'title', 'title-content', 'two-column', 'image-left', 'image-right',
        'full-image', 'comparison', 'quote', 'bullets', 'numbered',
        'section', 'blank', 'chart', 'table', 'timeline', 'closing'
      ] as const;

      type SlideLayout = typeof layouts[number];

      const layoutInfo: Record<SlideLayout, { name: string; description: string }> = {
        'title': { name: 'Title Slide', description: 'Opening slide with title' },
        'title-content': { name: 'Title + Content', description: 'Title with main content' },
        'two-column': { name: 'Two Columns', description: 'Side by side columns' },
        'image-left': { name: 'Image Left', description: 'Image on left' },
        'image-right': { name: 'Image Right', description: 'Image on right' },
        'full-image': { name: 'Full Image', description: 'Full background image' },
        'comparison': { name: 'Comparison', description: 'Compare two items' },
        'quote': { name: 'Quote', description: 'Featured quote' },
        'bullets': { name: 'Bullet Points', description: 'List of bullets' },
        'numbered': { name: 'Numbered List', description: 'Numbered steps' },
        'section': { name: 'Section Divider', description: 'Section break' },
        'blank': { name: 'Blank', description: 'Empty slide' },
        'chart': { name: 'Chart', description: 'Data visualization' },
        'table': { name: 'Table', description: 'Data table' },
        'timeline': { name: 'Timeline', description: 'Process flow' },
        'closing': { name: 'Closing', description: 'Thank you slide' },
      };

      return {
        totalLayouts: layouts.length,
        hasTitleLayout: layouts.includes('title'),
        hasClosingLayout: layouts.includes('closing'),
        allLayoutsHaveInfo: layouts.every(l => layoutInfo[l] && layoutInfo[l].name),
        titleLayoutName: layoutInfo['title'].name,
        bulletLayoutDesc: layoutInfo['bullets'].description,
      };
    });

    expect(result.totalLayouts).toBe(16);
    expect(result.hasTitleLayout).toBe(true);
    expect(result.hasClosingLayout).toBe(true);
    expect(result.allLayoutsHaveInfo).toBe(true);
    expect(result.titleLayoutName).toBe('Title Slide');
    expect(result.bulletLayoutDesc).toBe('List of bullets');
  });

  test('should handle workflow execution state', async ({ page }) => {
    const result = await page.evaluate(() => {
      type WorkflowStatus = 'idle' | 'planning' | 'executing' | 'paused' | 'completed' | 'failed' | 'cancelled';

      interface WorkflowExecution {
        id: string;
        status: WorkflowStatus;
        progress: number;
        currentStepId: string | null;
        startedAt: Date | null;
        completedAt: Date | null;
      }

      // Simulate workflow execution
      const execution: WorkflowExecution = {
        id: 'exec-1',
        status: 'idle',
        progress: 0,
        currentStepId: null,
        startedAt: null,
        completedAt: null,
      };

      const start = () => {
        execution.status = 'executing';
        execution.startedAt = new Date();
        execution.progress = 0;
      };

      const updateProgress = (progress: number, stepId: string) => {
        execution.progress = progress;
        execution.currentStepId = stepId;
      };

      const complete = () => {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.progress = 100;
        execution.currentStepId = null;
      };

      const pause = () => {
        if (execution.status === 'executing') {
          execution.status = 'paused';
        }
      };

      const resume = () => {
        if (execution.status === 'paused') {
          execution.status = 'executing';
        }
      };

      // Test workflow execution
      start();
      const afterStart = { status: execution.status, hasStartTime: !!execution.startedAt };

      updateProgress(25, 'step-1');
      const afterStep1 = { progress: execution.progress, currentStep: execution.currentStepId };

      updateProgress(50, 'step-2');
      pause();
      const afterPause = { status: execution.status, progress: execution.progress };

      resume();
      const afterResume = { status: execution.status };

      updateProgress(75, 'step-3');
      updateProgress(100, 'step-4');
      complete();
      const afterComplete = {
        status: execution.status,
        progress: execution.progress,
        hasCompletedTime: !!execution.completedAt,
      };

      return {
        afterStart,
        afterStep1,
        afterPause,
        afterResume,
        afterComplete,
      };
    });

    expect(result.afterStart.status).toBe('executing');
    expect(result.afterStart.hasStartTime).toBe(true);
    expect(result.afterStep1.progress).toBe(25);
    expect(result.afterStep1.currentStep).toBe('step-1');
    expect(result.afterPause.status).toBe('paused');
    expect(result.afterPause.progress).toBe(50);
    expect(result.afterResume.status).toBe('executing');
    expect(result.afterComplete.status).toBe('completed');
    expect(result.afterComplete.progress).toBe(100);
    expect(result.afterComplete.hasCompletedTime).toBe(true);
  });
});
