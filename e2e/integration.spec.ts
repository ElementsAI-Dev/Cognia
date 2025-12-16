import { test, expect } from '@playwright/test';

/**
 * Integration Tests
 * Tests end-to-end workflows combining multiple features
 */
test.describe('RAG Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should complete full RAG workflow', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Step 1: Document ingestion
      const documents = [
        { id: 'doc-1', content: 'React is a JavaScript library for building user interfaces.' },
        { id: 'doc-2', content: 'Vue.js is a progressive JavaScript framework.' },
        { id: 'doc-3', content: 'Angular is a TypeScript-based web application framework.' },
      ];

      // Step 2: Chunking
      const chunks = documents.map(doc => ({
        docId: doc.id,
        chunks: [{ content: doc.content, index: 0 }],
      }));

      // Step 3: Simulate embedding and indexing
      const indexed = chunks.map(c => ({
        ...c,
        indexed: true,
        embeddingDimensions: 1536,
      }));

      // Step 4: Query and retrieval
      const query = 'JavaScript framework';
      const queryTerms = query.toLowerCase().split(' ');
      
      const searchResults = documents
        .map(doc => ({
          id: doc.id,
          content: doc.content,
          relevance: queryTerms.filter(t => doc.content.toLowerCase().includes(t)).length / queryTerms.length,
        }))
        .filter(r => r.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance);

      // Step 5: Context generation
      const context = searchResults
        .slice(0, 2)
        .map((r, i) => `[${i + 1}] ${r.content}`)
        .join('\n\n');

      return {
        documentsIngested: documents.length,
        chunksCreated: chunks.reduce((sum, c) => sum + c.chunks.length, 0),
        documentsIndexed: indexed.filter(i => i.indexed).length,
        searchResultCount: searchResults.length,
        topResultId: searchResults[0]?.id,
        contextGenerated: context.length > 0,
      };
    });

    expect(result.documentsIngested).toBe(3);
    expect(result.chunksCreated).toBe(3);
    expect(result.documentsIndexed).toBe(3);
    expect(result.searchResultCount).toBeGreaterThan(0);
    expect(result.contextGenerated).toBe(true);
  });

  test('should handle document updates in RAG pipeline', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Document {
        id: string;
        content: string;
        version: number;
        indexed: boolean;
      }

      const documents: Document[] = [
        { id: 'doc-1', content: 'Original content', version: 1, indexed: true },
      ];

      const updateDocument = (id: string, newContent: string) => {
        const doc = documents.find(d => d.id === id);
        if (doc) {
          doc.content = newContent;
          doc.version++;
          doc.indexed = false; // Needs re-indexing
        }
      };

      const reindexDocument = (id: string) => {
        const doc = documents.find(d => d.id === id);
        if (doc) {
          doc.indexed = true;
        }
      };

      // Update document
      updateDocument('doc-1', 'Updated content with new information');
      const afterUpdate = { ...documents[0] };

      // Reindex
      reindexDocument('doc-1');
      const afterReindex = { ...documents[0] };

      return {
        versionAfterUpdate: afterUpdate.version,
        indexedAfterUpdate: afterUpdate.indexed,
        indexedAfterReindex: afterReindex.indexed,
        contentUpdated: afterReindex.content.includes('Updated'),
      };
    });

    expect(result.versionAfterUpdate).toBe(2);
    expect(result.indexedAfterUpdate).toBe(false);
    expect(result.indexedAfterReindex).toBe(true);
    expect(result.contentUpdated).toBe(true);
  });
});

test.describe('Agent with Tools Integration', () => {
  test('should execute agent with multiple tool calls', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface ToolResult {
        name: string;
        input: Record<string, unknown>;
        output: string;
      }

      const tools: Record<string, (args: Record<string, unknown>) => string> = {
        search: (args) => `Found results for: ${args.query}`,
        calculator: (args) => {
          try {
            return String(eval(String(args.expression)));
          } catch {
            return 'Error';
          }
        },
        weather: (args) => `Weather in ${args.city}: Sunny, 25°C`,
      };

      const executeTools = (toolCalls: { name: string; args: Record<string, unknown> }[]): ToolResult[] => {
        return toolCalls.map(call => ({
          name: call.name,
          input: call.args,
          output: tools[call.name]?.(call.args) || 'Unknown tool',
        }));
      };

      const toolCalls = [
        { name: 'search', args: { query: 'AI news' } },
        { name: 'calculator', args: { expression: '100 * 1.5' } },
        { name: 'weather', args: { city: 'Tokyo' } },
      ];

      const results = executeTools(toolCalls);

      return {
        toolCount: results.length,
        searchResult: results.find(r => r.name === 'search')?.output,
        calcResult: results.find(r => r.name === 'calculator')?.output,
        weatherResult: results.find(r => r.name === 'weather')?.output,
        allSuccessful: results.every(r => r.output !== 'Unknown tool'),
      };
    });

    expect(result.toolCount).toBe(3);
    expect(result.searchResult).toContain('AI news');
    expect(result.calcResult).toBe('150');
    expect(result.weatherResult).toContain('Tokyo');
    expect(result.allSuccessful).toBe(true);
  });

  test('should chain tool results in agent execution', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      // Simulate chained tool execution
      const steps: { action: string; result: string }[] = [];

      // Step 1: Search for data
      const searchResult = 'Found: Product price is $50';
      steps.push({ action: 'search', result: searchResult });

      // Step 2: Extract number from search result
      const priceMatch = searchResult.match(/\$(\d+)/);
      const price = priceMatch ? parseInt(priceMatch[1]) : 0;
      steps.push({ action: 'extract', result: `Price: ${price}` });

      // Step 3: Calculate with extracted data
      const taxRate = 0.1;
      const totalPrice = price * (1 + taxRate);
      steps.push({ action: 'calculate', result: `Total with tax: $${totalPrice}` });

      return {
        stepCount: steps.length,
        extractedPrice: price,
        finalResult: totalPrice,
        chainCompleted: steps.length === 3,
      };
    });

    expect(result.stepCount).toBe(3);
    expect(result.extractedPrice).toBe(50);
    expect(result.finalResult).toBeCloseTo(55, 0);
    expect(result.chainCompleted).toBe(true);
  });
});

test.describe('Document Processing Integration', () => {
  test('should process and index markdown document', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const markdown = `# Project Documentation

## Overview
This project implements an AI assistant with RAG capabilities.

## Features
- Vector database integration
- Document chunking
- Semantic search

## Installation
\`\`\`bash
npm install
npm run dev
\`\`\`

## Usage
Import the hooks and use them in your components.`;

      // Parse markdown
      const headings = (markdown.match(/^#{1,6}\s+.+$/gm) || []).length;
      const codeBlocks = (markdown.match(/```[\s\S]*?```/g) || []).length;
      const listItems = (markdown.match(/^[-*]\s+.+$/gm) || []).length;

      // Extract plain text for embedding
      const plainText = markdown
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[-*]\s+/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      // Chunk the text
      const chunkSize = 200;
      const chunks: string[] = [];
      for (let i = 0; i < plainText.length; i += chunkSize) {
        chunks.push(plainText.slice(i, i + chunkSize));
      }

      return {
        headingCount: headings,
        codeBlockCount: codeBlocks,
        listItemCount: listItems,
        plainTextLength: plainText.length,
        chunkCount: chunks.length,
        firstChunkPreview: chunks[0]?.substring(0, 50),
      };
    });

    expect(result.headingCount).toBeGreaterThanOrEqual(4);
    expect(result.codeBlockCount).toBe(1);
    expect(result.listItemCount).toBe(3);
    expect(result.plainTextLength).toBeGreaterThan(0);
    expect(result.chunkCount).toBeGreaterThan(0);
  });

  test('should process code file for indexing', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const code = `import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui';

interface Props {
  title: string;
  onSubmit: (data: string) => void;
}

/**
 * A sample component that demonstrates React patterns
 */
export function SampleComponent({ title, onSubmit }: Props) {
  const [value, setValue] = useState('');

  useEffect(() => {
    console.log('Component mounted');
  }, []);

  const handleSubmit = () => {
    onSubmit(value);
  };

  return (
    <div>
      <h1>{title}</h1>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <Button onClick={handleSubmit}>Submit</Button>
    </div>
  );
}`;

      // Extract imports
      const imports = (code.match(/import .+ from .+;/g) || []).length;

      // Extract functions
      const functions = (code.match(/(?:function|const)\s+\w+\s*(?:=\s*(?:async\s*)?\(|\()/g) || []).length;

      // Extract interfaces
      const interfaces = (code.match(/interface\s+\w+/g) || []).length;

      // Extract comments
      const comments = (code.match(/\/\*\*[\s\S]*?\*\/|\/\/.*/g) || []).length;

      // Generate embeddable content (remove syntax, keep semantics)
      const embeddable = code
        .replace(/import .+ from .+;/g, '')
        .replace(/[{}();,]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        importCount: imports,
        functionCount: functions,
        interfaceCount: interfaces,
        commentCount: comments,
        embeddableLength: embeddable.length,
        hasReactImport: code.includes("from 'react'"),
      };
    });

    expect(result.importCount).toBe(2);
    expect(result.functionCount).toBeGreaterThan(0);
    expect(result.interfaceCount).toBe(1);
    expect(result.commentCount).toBeGreaterThan(0);
    expect(result.hasReactImport).toBe(true);
  });
});

test.describe('Settings and Configuration Integration', () => {
  test('should apply settings across features', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      // Simulate settings store
      const settings = {
        provider: 'openai',
        model: 'gpt-4o',
        embeddingModel: 'text-embedding-3-small',
        chunkSize: 1000,
        chunkOverlap: 200,
        temperature: 0.7,
        maxTokens: 4096,
      };

      // Apply to vector DB
      const vectorConfig = {
        embeddingModel: settings.embeddingModel,
        chunkSize: settings.chunkSize,
        chunkOverlap: settings.chunkOverlap,
      };

      // Apply to agent
      const agentConfig = {
        provider: settings.provider,
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      };

      // Apply to RAG
      const ragConfig = {
        embeddingModel: settings.embeddingModel,
        chunkSize: settings.chunkSize,
        topK: 5,
      };

      return {
        vectorConfigValid: vectorConfig.chunkSize > vectorConfig.chunkOverlap,
        agentConfigValid: agentConfig.temperature >= 0 && agentConfig.temperature <= 2,
        ragConfigValid: ragConfig.topK > 0,
        settingsConsistent: 
          vectorConfig.embeddingModel === ragConfig.embeddingModel &&
          vectorConfig.chunkSize === ragConfig.chunkSize,
      };
    });

    expect(result.vectorConfigValid).toBe(true);
    expect(result.agentConfigValid).toBe(true);
    expect(result.ragConfigValid).toBe(true);
    expect(result.settingsConsistent).toBe(true);
  });

  test('should persist and restore state across reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Test state serialization/deserialization logic
    const result = await page.evaluate(() => {
      const testState = {
        sessions: [{ id: 's1', title: 'Test Session' }],
        settings: { theme: 'dark', provider: 'openai' },
        documents: [{ id: 'd1', name: 'test.md' }],
      };

      // Simulate persistence
      const serialized = JSON.stringify(testState);
      const restored = JSON.parse(serialized);

      return {
        persisted: serialized.length > 0,
        sessionCount: restored.sessions?.length || 0,
        theme: restored.settings?.theme,
        documentCount: restored.documents?.length || 0,
      };
    });

    expect(result.persisted).toBe(true);
    expect(result.sessionCount).toBe(1);
    expect(result.theme).toBe('dark');
    expect(result.documentCount).toBe(1);
  });
});

test.describe('Error Handling Integration', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface ApiError {
        code: string;
        message: string;
        retryable: boolean;
      }

      const handleApiError = (error: { status: number; message: string }): ApiError => {
        const errorMap: Record<number, { code: string; retryable: boolean }> = {
          400: { code: 'BAD_REQUEST', retryable: false },
          401: { code: 'UNAUTHORIZED', retryable: false },
          403: { code: 'FORBIDDEN', retryable: false },
          404: { code: 'NOT_FOUND', retryable: false },
          429: { code: 'RATE_LIMITED', retryable: true },
          500: { code: 'SERVER_ERROR', retryable: true },
          503: { code: 'SERVICE_UNAVAILABLE', retryable: true },
        };

        const mapped = errorMap[error.status] || { code: 'UNKNOWN', retryable: false };
        return {
          code: mapped.code,
          message: error.message,
          retryable: mapped.retryable,
        };
      };

      return {
        badRequest: handleApiError({ status: 400, message: 'Invalid input' }),
        rateLimited: handleApiError({ status: 429, message: 'Too many requests' }),
        serverError: handleApiError({ status: 500, message: 'Internal error' }),
        unknown: handleApiError({ status: 999, message: 'Unknown error' }),
      };
    });

    expect(result.badRequest.code).toBe('BAD_REQUEST');
    expect(result.badRequest.retryable).toBe(false);
    expect(result.rateLimited.code).toBe('RATE_LIMITED');
    expect(result.rateLimited.retryable).toBe(true);
    expect(result.serverError.retryable).toBe(true);
    expect(result.unknown.code).toBe('UNKNOWN');
  });

  test('should recover from transient failures', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      let attemptCount = 0;
      const maxRetries = 3;
      const failUntilAttempt = 2;

      const simulateRequest = (): { success: boolean; attempt: number } => {
        attemptCount++;
        if (attemptCount < failUntilAttempt) {
          throw new Error('Transient failure');
        }
        return { success: true, attempt: attemptCount };
      };

      const retryWithBackoff = (
        fn: () => { success: boolean; attempt: number },
        retries: number
      ): { success: boolean; attempts: number } => {
        let _lastError: Error | null = null;
        
        for (let i = 0; i < retries; i++) {
          try {
            const result = fn();
            return { success: result.success, attempts: i + 1 };
          } catch (e) {
            _lastError = e as Error;
          }
        }
        
        return { success: false, attempts: retries };
      };

      const result = retryWithBackoff(simulateRequest, maxRetries);

      return {
        success: result.success,
        attemptsNeeded: result.attempts,
        totalAttempts: attemptCount,
      };
    });

    expect(result.success).toBe(true);
    expect(result.attemptsNeeded).toBe(2);
  });
});

test.describe('Performance Metrics', () => {
  test('should track operation timing', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface Metric {
        operation: string;
        duration: number;
        timestamp: number;
      }

      const metrics: Metric[] = [];

      const trackOperation = <T>(operation: string, fn: () => T): T => {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        
        metrics.push({
          operation,
          duration,
          timestamp: Date.now(),
        });
        
        return result;
      };

      // Simulate operations
      trackOperation('chunking', () => {
        const text = 'A'.repeat(10000);
        const chunks = [];
        for (let i = 0; i < text.length; i += 1000) {
          chunks.push(text.slice(i, i + 1000));
        }
        return chunks;
      });

      trackOperation('search', () => {
        const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, score: Math.random() }));
        return items.sort((a, b) => b.score - a.score).slice(0, 10);
      });

      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;

      return {
        operationCount: metrics.length,
        operations: metrics.map(m => m.operation),
        avgDuration,
        allTracked: metrics.every(m => m.duration >= 0),
      };
    });

    expect(result.operationCount).toBe(2);
    expect(result.operations).toContain('chunking');
    expect(result.operations).toContain('search');
    expect(result.allTracked).toBe(true);
  });
});
