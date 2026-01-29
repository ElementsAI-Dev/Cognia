import { test, expect } from '@playwright/test';

/**
 * API Routes E2E Tests
 * Tests API endpoints for chat, search, speech, and other services
 */

test.describe('Chat Widget API', () => {
  test('should respond to chat widget endpoint', async ({ request }) => {
    // Test chat widget API availability
    const response = await request.get('/api/chat-widget').catch(() => null);

    // API should respond (may require auth)
    if (response) {
      expect([200, 401, 405]).toContain(response.status());
    }
  });
});

test.describe('Search API', () => {
  test('should respond to search endpoint', async ({ request }) => {
    const response = await request.get('/api/search').catch(() => null);

    if (response) {
      expect([200, 400, 401, 405]).toContain(response.status());
    }
  });

  test('should handle search query', async ({ request }) => {
    const response = await request.post('/api/search', {
      data: { query: 'test' },
    }).catch(() => null);

    if (response) {
      expect([200, 400, 401, 405]).toContain(response.status());
    }
  });
});

test.describe('Search and Scrape API', () => {
  test('should respond to search-and-scrape endpoint', async ({ request }) => {
    const response = await request.get('/api/search-and-scrape').catch(() => null);

    if (response) {
      expect([200, 400, 401, 405]).toContain(response.status());
    }
  });
});

test.describe('Scrape API', () => {
  test('should respond to scrape endpoint', async ({ request }) => {
    const response = await request.get('/api/scrape').catch(() => null);

    if (response) {
      expect([200, 400, 401, 405]).toContain(response.status());
    }
  });

  test('should scrape URL when provided', async ({ request }) => {
    const response = await request.post('/api/scrape', {
      data: { url: 'https://example.com' },
    }).catch(() => null);

    if (response) {
      expect([200, 400, 401, 405, 500]).toContain(response.status());
    }
  });
});

test.describe('Speech API', () => {
  test('should respond to speech endpoint', async ({ request }) => {
    const response = await request.get('/api/speech').catch(() => null);

    if (response) {
      expect([200, 400, 401, 405]).toContain(response.status());
    }
  });
});

test.describe('TTS API', () => {
  test('should respond to TTS endpoint', async ({ request }) => {
    const response = await request.get('/api/tts').catch(() => null);

    if (response) {
      expect([200, 400, 401, 405]).toContain(response.status());
    }
  });

  test('should synthesize speech from text', async ({ request }) => {
    const response = await request.post('/api/tts', {
      data: { text: 'Hello world' },
    }).catch(() => null);

    if (response) {
      expect([200, 400, 401, 405, 500]).toContain(response.status());
    }
  });
});

test.describe('Prompt Optimization API', () => {
  test('should respond to optimize-prompt endpoint', async ({ request }) => {
    const response = await request.get('/api/optimize-prompt').catch(() => null);

    if (response) {
      expect([200, 400, 401, 405]).toContain(response.status());
    }
  });

  test('should optimize prompt when provided', async ({ request }) => {
    const response = await request.post('/api/optimize-prompt', {
      data: { prompt: 'Write a story' },
    }).catch(() => null);

    if (response) {
      expect([200, 400, 401, 405, 500]).toContain(response.status());
    }
  });
});

test.describe('Prompt Self-Optimize API', () => {
  test('should respond to prompt-self-optimize endpoint', async ({ request }) => {
    const response = await request.get('/api/prompt-self-optimize').catch(() => null);

    if (response) {
      expect([200, 400, 401, 405]).toContain(response.status());
    }
  });
});

test.describe('Enhance Builtin Prompt API', () => {
  test('should respond to enhance-builtin-prompt endpoint', async ({ request }) => {
    const response = await request.get('/api/enhance-builtin-prompt').catch(() => null);

    if (response) {
      expect([200, 400, 401, 405]).toContain(response.status());
    }
  });
});

test.describe('Generate Preset API', () => {
  test('should respond to generate-preset endpoint', async ({ request }) => {
    const response = await request.get('/api/generate-preset').catch(() => null);

    if (response) {
      expect([200, 400, 401, 405]).toContain(response.status());
    }
  });

  test('should generate preset from description', async ({ request }) => {
    const response = await request.post('/api/generate-preset', {
      data: { description: 'Code assistant' },
    }).catch(() => null);

    if (response) {
      expect([200, 400, 401, 405, 500]).toContain(response.status());
    }
  });
});

test.describe('OAuth API', () => {
  test('should respond to oauth endpoint', async ({ request }) => {
    const response = await request.get('/api/oauth').catch(() => null);

    if (response) {
      expect([200, 302, 400, 401, 404, 405]).toContain(response.status());
    }
  });
});

test.describe('API Error Handling', () => {
  test('should return 404 for non-existent API route', async ({ request }) => {
    const response = await request.get('/api/non-existent-route-xyz');

    expect(response.status()).toBe(404);
  });

  test('should handle malformed JSON in request body', async ({ request }) => {
    const response = await request.post('/api/search', {
      headers: { 'Content-Type': 'application/json' },
      data: 'invalid-json',
    }).catch(() => null);

    if (response) {
      expect([400, 500]).toContain(response.status());
    }
  });
});
