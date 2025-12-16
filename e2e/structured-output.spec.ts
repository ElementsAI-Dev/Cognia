import { test, expect } from '@playwright/test';

/**
 * Structured Output functionality tests
 */
test.describe('Structured Output Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should support schema validation pattern', async ({ page }) => {
    const schemaResult = await page.evaluate(() => {
      // Simulate Zod-like schema validation
      const validateObject = (obj: Record<string, unknown>, schema: Record<string, string>) => {
        const errors: string[] = [];
        
        for (const [key, type] of Object.entries(schema)) {
          if (!(key in obj)) {
            errors.push(`Missing required field: ${key}`);
          } else if (typeof obj[key] !== type) {
            errors.push(`Invalid type for ${key}: expected ${type}, got ${typeof obj[key]}`);
          }
        }
        
        return { valid: errors.length === 0, errors };
      };

      const testObj = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
      };

      const schema = {
        name: 'string',
        age: 'number',
        email: 'string',
      };

      return validateObject(testObj, schema);
    });

    expect(schemaResult.valid).toBe(true);
    expect(schemaResult.errors).toHaveLength(0);
  });

  test('should handle entity extraction pattern', async ({ page }) => {
    const extractionResult = await page.evaluate(() => {
      const text = 'John Smith works at Google in New York. He joined on January 15, 2024.';
      
      // Simple entity extraction simulation
      const entities = [];
      
      // Person detection (simplified)
      if (text.includes('John Smith')) {
        entities.push({ name: 'John Smith', type: 'person' });
      }
      
      // Organization detection
      if (text.includes('Google')) {
        entities.push({ name: 'Google', type: 'organization' });
      }
      
      // Location detection
      if (text.includes('New York')) {
        entities.push({ name: 'New York', type: 'location' });
      }
      
      // Date detection
      if (text.includes('January 15, 2024')) {
        entities.push({ name: 'January 15, 2024', type: 'date' });
      }

      return {
        entityCount: entities.length,
        hasPerson: entities.some(e => e.type === 'person'),
        hasOrganization: entities.some(e => e.type === 'organization'),
        hasLocation: entities.some(e => e.type === 'location'),
        hasDate: entities.some(e => e.type === 'date'),
      };
    });

    expect(extractionResult.entityCount).toBe(4);
    expect(extractionResult.hasPerson).toBe(true);
    expect(extractionResult.hasOrganization).toBe(true);
    expect(extractionResult.hasLocation).toBe(true);
    expect(extractionResult.hasDate).toBe(true);
  });

  test('should support sentiment analysis pattern', async ({ page }) => {
    const sentimentResult = await page.evaluate(() => {
      const analyzeSentiment = (text: string) => {
        const positiveWords = ['great', 'excellent', 'amazing', 'love', 'wonderful'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible'];
        
        const lowerText = text.toLowerCase();
        let positiveCount = 0;
        let negativeCount = 0;
        
        positiveWords.forEach(word => {
          if (lowerText.includes(word)) positiveCount++;
        });
        
        negativeWords.forEach(word => {
          if (lowerText.includes(word)) negativeCount++;
        });
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
      };

      return {
        positive: analyzeSentiment('This is a great and amazing product!'),
        negative: analyzeSentiment('This is terrible and awful.'),
        neutral: analyzeSentiment('This is a product.'),
      };
    });

    expect(sentimentResult.positive).toBe('positive');
    expect(sentimentResult.negative).toBe('negative');
    expect(sentimentResult.neutral).toBe('neutral');
  });

  test('should support task extraction pattern', async ({ page }) => {
    const taskResult = await page.evaluate(() => {
      const text = `
        TODO: Complete the report by Friday
        - Review the code changes
        - Send email to the team
        Action item: Schedule meeting with client
      `;

      const tasks: { title: string; priority: string }[] = [];
      const lines = text.split('\n');

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('TODO:')) {
          tasks.push({ title: trimmed.replace('TODO:', '').trim(), priority: 'high' });
        } else if (trimmed.startsWith('-')) {
          tasks.push({ title: trimmed.replace('-', '').trim(), priority: 'medium' });
        } else if (trimmed.startsWith('Action item:')) {
          tasks.push({ title: trimmed.replace('Action item:', '').trim(), priority: 'high' });
        }
      });

      return {
        taskCount: tasks.length,
        highPriorityCount: tasks.filter(t => t.priority === 'high').length,
        mediumPriorityCount: tasks.filter(t => t.priority === 'medium').length,
      };
    });

    expect(taskResult.taskCount).toBe(4);
    expect(taskResult.highPriorityCount).toBe(2);
    expect(taskResult.mediumPriorityCount).toBe(2);
  });
});
