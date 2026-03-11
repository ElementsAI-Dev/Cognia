/**
 * @jest-environment jsdom
 */

import { normalizeExternalAgentConfigInput } from './config-normalizer';

describe('config-normalizer', () => {
  it('should preserve advanced retry configuration fields', () => {
    const normalized = normalizeExternalAgentConfigInput(
      {
        name: 'ACP Agent',
        protocol: 'acp',
        transport: 'http',
        network: { endpoint: 'https://example.com/acp' },
        retryConfig: {
          maxRetries: 5,
          retryDelay: 200,
          exponentialBackoff: false,
          maxRetryDelay: 1200,
          retryOnErrors: ['timeout', '503'],
        },
      },
      {
        id: 'agent-1',
        now: new Date('2026-03-10T00:00:00.000Z'),
      }
    );

    expect(normalized.retryConfig).toEqual({
      maxRetries: 5,
      retryDelay: 200,
      exponentialBackoff: false,
      maxRetryDelay: 1200,
      retryOnErrors: ['timeout', '503'],
    });
  });

  it('should apply default retry fields when optional values are missing', () => {
    const normalized = normalizeExternalAgentConfigInput(
      {
        name: 'ACP Agent',
        protocol: 'acp',
        transport: 'http',
        network: { endpoint: 'https://example.com/acp' },
      },
      {
        id: 'agent-2',
        now: new Date('2026-03-10T00:00:00.000Z'),
      }
    );

    expect(normalized.retryConfig).toEqual({
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      maxRetryDelay: 30000,
      retryOnErrors: [],
    });
  });
});

