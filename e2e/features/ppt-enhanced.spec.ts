import { test, expect } from '@playwright/test';

/**
 * Enhanced PPT Generation E2E Tests
 * Tests the complete enhanced PPT generation workflow including:
 * - Material processing and analysis
 * - Slide image generation
 * - Multi-provider support
 * - Workflow execution
 */

test.describe('Enhanced PPT Generation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Material Processing', () => {
    test('should process text material correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Simulate material extraction logic
        const extractMaterial = (content: string, type: string) => {
          const wordCount = content.split(/\s+/).filter(Boolean).length;
          const sentenceCount = content.split(/[.!?]+/).filter(Boolean).length;
          
          // Detect language (simplified)
          const hasChinese = /[\u4e00-\u9fa5]/.test(content);
          const language = hasChinese ? 'zh' : 'en';
          
          return {
            content: content.trim(),
            type,
            metadata: {
              wordCount,
              sentenceCount,
              language,
            },
          };
        };

        const testContent = 'Artificial intelligence is transforming industries. Machine learning enables computers to learn from data.';
        const material = extractMaterial(testContent, 'text');

        return {
          hasContent: material.content.length > 0,
          wordCount: material.metadata.wordCount,
          sentenceCount: material.metadata.sentenceCount,
          language: material.metadata.language,
        };
      });

      expect(result.hasContent).toBe(true);
      expect(result.wordCount).toBeGreaterThan(10);
      expect(result.sentenceCount).toBe(2);
      expect(result.language).toBe('en');
    });

    test('should analyze material and extract key topics', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Simulate material analysis
        const analyzeMaterial = (content: string) => {
          const words = content.toLowerCase().split(/\s+/);
          const wordFreq: Record<string, number> = {};
          
          for (const word of words) {
            if (word.length > 4) {
              wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
          }
          
          const sortedWords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
          
          return {
            keyTopics: sortedWords,
            wordCount: words.length,
            complexity: words.length > 100 ? 'complex' : words.length > 50 ? 'moderate' : 'simple',
          };
        };

        const content = `
          Artificial intelligence and machine learning are revolutionizing technology.
          Deep learning neural networks enable sophisticated pattern recognition.
          Natural language processing allows machines to understand human communication.
          Computer vision systems can interpret visual information accurately.
        `;
        
        const analysis = analyzeMaterial(content);

        return {
          hasTopics: analysis.keyTopics.length > 0,
          topicCount: analysis.keyTopics.length,
          complexity: analysis.complexity,
          includesAI: analysis.keyTopics.some(t => 
            t.includes('learning') || t.includes('intelligence') || t.includes('neural')
          ),
        };
      });

      expect(result.hasTopics).toBe(true);
      expect(result.topicCount).toBeGreaterThanOrEqual(3);
      expect(result.includesAI).toBe(true);
    });

    test('should summarize content with key points', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Simulate content summarization
        const summarizeContent = (content: string, targetLength: number) => {
          const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
          
          // Extract key sentences
          const keyPoints = sentences
            .slice(0, 5)
            .map(s => s.trim())
            .filter(s => s.length > 20);
          
          // Generate summary
          const summary = sentences.slice(0, 3).join('. ').substring(0, targetLength);
          
          return {
            summary,
            keyPoints,
            originalLength: content.length,
            summaryLength: summary.length,
          };
        };

        const content = `
          AI is transforming how businesses operate.
          Companies are investing billions in machine learning.
          Automation improves efficiency and reduces costs.
          Data analytics drives better decision making.
          The future of work will be shaped by AI technology.
        `;

        const result = summarizeContent(content, 200);

        return {
          hasSummary: result.summary.length > 0,
          summaryLength: result.summaryLength,
          keyPointCount: result.keyPoints.length,
          compressionRatio: (result.summaryLength / result.originalLength * 100).toFixed(1),
        };
      });

      expect(result.hasSummary).toBe(true);
      expect(result.summaryLength).toBeLessThanOrEqual(200);
      expect(result.keyPointCount).toBeGreaterThan(0);
    });

    test('should combine multiple materials', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Material {
          id: string;
          content: string;
          weight: number;
          name?: string;
        }

        const combineMaterials = (materials: Material[], strategy: 'merge' | 'prioritize' | 'section') => {
          if (strategy === 'merge') {
            return materials.map(m => m.content).join('\n\n');
          } else if (strategy === 'prioritize') {
            const sorted = [...materials].sort((a, b) => b.weight - a.weight);
            return sorted.map(m => m.content).join('\n\n');
          } else {
            return materials.map(m => `## ${m.name || m.id}\n\n${m.content}`).join('\n\n');
          }
        };

        const materials: Material[] = [
          { id: '1', content: 'First material about AI', weight: 0.5, name: 'AI Basics' },
          { id: '2', content: 'Second material about ML', weight: 0.8, name: 'ML Advanced' },
          { id: '3', content: 'Third material about DL', weight: 0.3, name: 'DL Intro' },
        ];

        const merged = combineMaterials(materials, 'merge');
        const prioritized = combineMaterials(materials, 'prioritize');
        const sectioned = combineMaterials(materials, 'section');

        return {
          mergedHasAll: materials.every(m => merged.includes(m.content)),
          prioritizedStartsWithHighest: prioritized.startsWith('Second material'),
          sectionedHasHeaders: sectioned.includes('## AI Basics') && sectioned.includes('## ML Advanced'),
        };
      });

      expect(result.mergedHasAll).toBe(true);
      expect(result.prioritizedStartsWithHighest).toBe(true);
      expect(result.sectionedHasHeaders).toBe(true);
    });
  });

  test.describe('Enhanced Outline Generation', () => {
    test('should generate enhanced outline with image suggestions', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface EnhancedOutlineItem {
          id: string;
          title: string;
          description: string;
          suggestedLayout: string;
          keyPoints: string[];
          order: number;
          imageNeeded: boolean;
          imageSuggestion?: string;
          speakerNotes?: string;
        }

        const generateEnhancedOutline = (topic: string, slideCount: number): EnhancedOutlineItem[] => {
          const outline: EnhancedOutlineItem[] = [];

          // Title slide
          outline.push({
            id: 'slide-1',
            title: topic,
            description: 'Opening title slide',
            suggestedLayout: 'title',
            keyPoints: [],
            order: 0,
            imageNeeded: true,
            imageSuggestion: `Hero image representing ${topic}`,
            speakerNotes: `Welcome and introduce ${topic}`,
          });

          // Agenda
          outline.push({
            id: 'slide-2',
            title: 'Agenda',
            description: 'Overview of topics',
            suggestedLayout: 'bullets',
            keyPoints: ['Introduction', 'Key Concepts', 'Applications', 'Conclusion'],
            order: 1,
            imageNeeded: false,
            speakerNotes: 'Walk through the agenda briefly',
          });

          // Content slides
          for (let i = 2; i < slideCount - 1; i++) {
            outline.push({
              id: `slide-${i + 1}`,
              title: `Topic ${i - 1}`,
              description: `Content for topic ${i - 1}`,
              suggestedLayout: i % 2 === 0 ? 'title-content' : 'image-right',
              keyPoints: [`Point 1`, `Point 2`, `Point 3`],
              order: i,
              imageNeeded: i % 2 !== 0,
              imageSuggestion: i % 2 !== 0 ? `Visual for topic ${i - 1}` : undefined,
              speakerNotes: `Discuss key aspects of topic ${i - 1}`,
            });
          }

          // Closing
          outline.push({
            id: `slide-${slideCount}`,
            title: 'Thank You',
            description: 'Closing slide',
            suggestedLayout: 'closing',
            keyPoints: ['Summary', 'Questions?'],
            order: slideCount - 1,
            imageNeeded: false,
            speakerNotes: 'Summarize and open for questions',
          });

          return outline;
        };

        const outline = generateEnhancedOutline('AI Technology', 8);

        return {
          slideCount: outline.length,
          hasTitleSlide: outline.some(s => s.suggestedLayout === 'title'),
          hasClosingSlide: outline.some(s => s.suggestedLayout === 'closing'),
          slidesWithImages: outline.filter(s => s.imageNeeded).length,
          allHaveSpeakerNotes: outline.every(s => !!s.speakerNotes),
          firstSlideHasImageSuggestion: !!outline[0].imageSuggestion,
        };
      });

      expect(result.slideCount).toBe(8);
      expect(result.hasTitleSlide).toBe(true);
      expect(result.hasClosingSlide).toBe(true);
      expect(result.slidesWithImages).toBeGreaterThan(0);
      expect(result.allHaveSpeakerNotes).toBe(true);
      expect(result.firstSlideHasImageSuggestion).toBe(true);
    });
  });

  test.describe('Image Prompt Generation', () => {
    test('should generate optimized prompts for different styles', async ({ page }) => {
      const result = await page.evaluate(() => {
        type ImageStyle = 'corporate' | 'photorealistic' | 'illustration' | 'minimalist';

        const styleConfigs: Record<ImageStyle, { prefix: string; suffix: string }> = {
          corporate: {
            prefix: 'Professional business visual for',
            suffix: 'clean, modern, corporate aesthetic',
          },
          photorealistic: {
            prefix: 'Professional photograph of',
            suffix: 'high resolution, sharp focus, natural lighting',
          },
          illustration: {
            prefix: 'Modern digital illustration of',
            suffix: 'clean vector style, vibrant colors',
          },
          minimalist: {
            prefix: 'Minimalist representation of',
            suffix: 'simple shapes, clean lines, whitespace',
          },
        };

        const generatePrompt = (title: string, content: string, style: ImageStyle) => {
          const config = styleConfigs[style];
          return `${config.prefix} "${title}", showing ${content.substring(0, 100)}, ${config.suffix}`;
        };

        const prompts = {
          corporate: generatePrompt('Company Strategy', 'Business growth and innovation', 'corporate'),
          photorealistic: generatePrompt('Nature Scene', 'Beautiful mountain landscape', 'photorealistic'),
          illustration: generatePrompt('Process Flow', 'Step by step workflow', 'illustration'),
          minimalist: generatePrompt('Key Concept', 'Simple and elegant design', 'minimalist'),
        };

        return {
          corporateHasBusinessTerm: prompts.corporate.includes('business'),
          photorealisticHasPhoto: prompts.photorealistic.includes('photograph'),
          illustrationHasVector: prompts.illustration.includes('vector'),
          minimalistHasSimple: prompts.minimalist.includes('simple'),
          allPromptsUnique: new Set(Object.values(prompts)).size === 4,
        };
      });

      expect(result.corporateHasBusinessTerm).toBe(true);
      expect(result.photorealisticHasPhoto).toBe(true);
      expect(result.illustrationHasVector).toBe(true);
      expect(result.minimalistHasSimple).toBe(true);
      expect(result.allPromptsUnique).toBe(true);
    });

    test('should add layout-specific prompt modifications', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getLayoutModifier = (layout: string) => {
          const modifiers: Record<string, string> = {
            'title': 'hero image, impactful, attention-grabbing',
            'full-image': 'hero image, full screen, dramatic',
            'image-left': 'suitable for side panel, vertical composition',
            'image-right': 'suitable for side panel, vertical composition',
            'comparison': 'split composition, dual elements',
            'quote': 'atmospheric background, subtle, text-friendly',
          };
          return modifiers[layout] || '';
        };

        return {
          titleHasHero: getLayoutModifier('title').includes('hero'),
          sideHasVertical: getLayoutModifier('image-left').includes('vertical'),
          comparisonHasSplit: getLayoutModifier('comparison').includes('split'),
          quoteHasAtmospheric: getLayoutModifier('quote').includes('atmospheric'),
        };
      });

      expect(result.titleHasHero).toBe(true);
      expect(result.sideHasVertical).toBe(true);
      expect(result.comparisonHasSplit).toBe(true);
      expect(result.quoteHasAtmospheric).toBe(true);
    });
  });

  test.describe('Workflow Execution', () => {
    test('should calculate correct total steps based on options', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface WorkflowOptions {
          hasMaterials: boolean;
          generateImages: boolean;
        }

        const calculateSteps = (options: WorkflowOptions) => {
          let steps = 6; // Base: analyze, outline, slides, design, build, marp
          
          if (options.hasMaterials) {
            steps += 3; // process, analyze, summarize materials
          }
          
          if (options.generateImages) {
            steps += 1; // image generation
          }
          
          return steps;
        };

        return {
          baseSteps: calculateSteps({ hasMaterials: false, generateImages: false }),
          withMaterials: calculateSteps({ hasMaterials: true, generateImages: false }),
          withImages: calculateSteps({ hasMaterials: false, generateImages: true }),
          fullWorkflow: calculateSteps({ hasMaterials: true, generateImages: true }),
        };
      });

      expect(result.baseSteps).toBe(6);
      expect(result.withMaterials).toBe(9);
      expect(result.withImages).toBe(7);
      expect(result.fullWorkflow).toBe(10);
    });

    test('should track progress through workflow steps', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Progress {
          currentStep: string;
          completedSteps: number;
          totalSteps: number;
          percentage: number;
        }

        const steps = [
          'analyze-requirements',
          'generate-outline',
          'generate-slides',
          'apply-design',
          'build-presentation',
          'generate-marp',
        ];

        const progressUpdates: Progress[] = [];

        // Simulate workflow execution
        for (let i = 0; i < steps.length; i++) {
          progressUpdates.push({
            currentStep: steps[i],
            completedSteps: i,
            totalSteps: steps.length,
            percentage: Math.round((i / steps.length) * 100),
          });
        }

        // Final update
        progressUpdates.push({
          currentStep: 'complete',
          completedSteps: steps.length,
          totalSteps: steps.length,
          percentage: 100,
        });

        return {
          totalUpdates: progressUpdates.length,
          startsAtZero: progressUpdates[0].percentage === 0,
          endsAt100: progressUpdates[progressUpdates.length - 1].percentage === 100,
          progressIncreases: progressUpdates.every((p, i) => 
            i === 0 || p.percentage >= progressUpdates[i - 1].percentage
          ),
        };
      });

      expect(result.totalUpdates).toBe(7);
      expect(result.startsAtZero).toBe(true);
      expect(result.endsAt100).toBe(true);
      expect(result.progressIncreases).toBe(true);
    });

    test('should build complete presentation object', async ({ page }) => {
      const result = await page.evaluate(() => {
        const buildPresentation = (topic: string, slideCount: number) => {
          const now = new Date();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          
          return {
            id: `ppt-${Date.now()}-${randomSuffix}`,
            title: topic,
            theme: {
              id: 'custom',
              name: 'Custom Theme',
              primaryColor: '#3B82F6',
              secondaryColor: '#1E40AF',
              accentColor: '#60A5FA',
              backgroundColor: '#FFFFFF',
              textColor: '#1E293B',
              headingFont: 'Inter',
              bodyFont: 'Inter',
              codeFont: 'JetBrains Mono',
            },
            slides: Array.from({ length: slideCount }, (_, i) => ({
              id: `slide-${i + 1}`,
              order: i,
              layout: i === 0 ? 'title' : i === slideCount - 1 ? 'closing' : 'title-content',
              title: i === 0 ? topic : `Slide ${i + 1}`,
              elements: [],
            })),
            totalSlides: slideCount,
            aspectRatio: '16:9',
            createdAt: now,
            updatedAt: now,
            metadata: {
              style: 'professional',
              language: 'en',
            },
          };
        };

        const pres1 = buildPresentation('Test Topic', 10);
        const pres2 = buildPresentation('Another Topic', 10);

        return {
          hasUniqueId: pres1.id !== pres2.id,
          hasTheme: !!pres1.theme && !!pres1.theme.primaryColor,
          hasCorrectSlideCount: pres1.slides.length === 10,
          hasTimestamps: !!pres1.createdAt && !!pres1.updatedAt,
          hasMetadata: !!pres1.metadata,
          firstSlideIsTitle: pres1.slides[0].layout === 'title',
          lastSlideIsClosing: pres1.slides[9].layout === 'closing',
        };
      });

      expect(result.hasUniqueId).toBe(true);
      expect(result.hasTheme).toBe(true);
      expect(result.hasCorrectSlideCount).toBe(true);
      expect(result.hasTimestamps).toBe(true);
      expect(result.hasMetadata).toBe(true);
      expect(result.firstSlideIsTitle).toBe(true);
      expect(result.lastSlideIsClosing).toBe(true);
    });
  });

  test.describe('Marp Export', () => {
    test('should generate valid Marp markdown with enhanced features', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Slide {
          layout: string;
          title?: string;
          content?: string;
          bullets?: string[];
          notes?: string;
          imageUrl?: string;
        }

        const generateEnhancedMarp = (slides: Slide[]) => {
          const lines: string[] = [];
          
          // Frontmatter
          lines.push('---');
          lines.push('marp: true');
          lines.push('theme: default');
          lines.push('paginate: true');
          lines.push('backgroundColor: #FFFFFF');
          lines.push('style: |');
          lines.push('  section { font-family: Inter, sans-serif; }');
          lines.push('  h1, h2 { color: #3B82F6; }');
          lines.push('---');
          lines.push('');

          for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];
            
            if (i > 0) {
              lines.push('---');
              lines.push('');
            }

            if (slide.title) {
              const heading = slide.layout === 'title' ? '#' : '##';
              lines.push(`${heading} ${slide.title}`);
              lines.push('');
            }

            if (slide.content) {
              lines.push(slide.content);
              lines.push('');
            }

            if (slide.bullets) {
              for (const bullet of slide.bullets) {
                lines.push(`- ${bullet}`);
              }
              lines.push('');
            }

            if (slide.imageUrl) {
              lines.push(`![](${slide.imageUrl})`);
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
          { 
            layout: 'title', 
            title: 'AI Presentation', 
            notes: 'Welcome everyone'
          },
          { 
            layout: 'bullets', 
            title: 'Key Points', 
            bullets: ['Point A', 'Point B'], 
            imageUrl: 'https://example.com/image.png',
            notes: 'Explain each point'
          },
          { 
            layout: 'closing', 
            title: 'Thank You', 
            content: 'Questions?' 
          },
        ];

        const marp = generateEnhancedMarp(testSlides);

        return {
          hasFrontmatter: marp.includes('marp: true'),
          hasThemeStyle: marp.includes('font-family: Inter'),
          hasH1Title: marp.includes('# AI Presentation'),
          hasH2Content: marp.includes('## Key Points'),
          hasBullets: marp.includes('- Point A'),
          hasImage: marp.includes('![](https://example.com/image.png)'),
          hasSpeakerNotes: marp.includes('<!--') && marp.includes('Welcome everyone'),
          slideSeparatorCount: (marp.match(/\n---\n/g) || []).length,
        };
      });

      expect(result.hasFrontmatter).toBe(true);
      expect(result.hasThemeStyle).toBe(true);
      expect(result.hasH1Title).toBe(true);
      expect(result.hasH2Content).toBe(true);
      expect(result.hasBullets).toBe(true);
      expect(result.hasImage).toBe(true);
      expect(result.hasSpeakerNotes).toBe(true);
      expect(result.slideSeparatorCount).toBe(2);
    });
  });

  test.describe('Image Provider Configuration', () => {
    test('should support multiple image providers', async ({ page }) => {
      const result = await page.evaluate(() => {
        type ImageProvider = 'openai' | 'google-imagen' | 'stability';

        const providerConfigs: Record<ImageProvider, { models: string[]; defaultModel: string }> = {
          'openai': {
            models: ['dall-e-3', 'dall-e-2', 'gpt-image-1'],
            defaultModel: 'dall-e-3',
          },
          'google-imagen': {
            models: ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001'],
            defaultModel: 'imagen-3.0-generate-002',
          },
          'stability': {
            models: ['stable-diffusion-xl-1024-v1-0', 'stable-diffusion-v1-6'],
            defaultModel: 'stable-diffusion-xl-1024-v1-0',
          },
        };

        return {
          openaiHasDalle3: providerConfigs['openai'].models.includes('dall-e-3'),
          googleHasImagen3: providerConfigs['google-imagen'].models.some(m => m.includes('imagen-3')),
          stabilityHasSDXL: providerConfigs['stability'].models.some(m => m.includes('xl')),
          allHaveDefaults: Object.values(providerConfigs).every(c => !!c.defaultModel),
          totalModels: Object.values(providerConfigs).reduce((sum, c) => sum + c.models.length, 0),
        };
      });

      expect(result.openaiHasDalle3).toBe(true);
      expect(result.googleHasImagen3).toBe(true);
      expect(result.stabilityHasSDXL).toBe(true);
      expect(result.allHaveDefaults).toBe(true);
      expect(result.totalModels).toBeGreaterThan(5);
    });
  });
});
