/**
 * Telemetry Tests
 */

import {
  createTelemetryConfig,
  toExperimentalTelemetry,
  createInMemoryTelemetryCollector,
  createConsoleTelemetryCollector,
  calculateMetrics,
  getDefaultTelemetryCollector,
  setDefaultTelemetryCollector,
  TELEMETRY_PRESETS,
  type TelemetrySpanData,
} from './telemetry';

describe('Telemetry', () => {
  describe('createTelemetryConfig', () => {
    it('should create default config with isEnabled false', () => {
      const config = createTelemetryConfig();
      
      expect(config.isEnabled).toBe(false);
      expect(config.recordInputs).toBe(true);
      expect(config.recordOutputs).toBe(true);
    });

    it('should respect provided options', () => {
      const config = createTelemetryConfig({
        isEnabled: true,
        functionId: 'test-function',
        recordInputs: false,
        recordOutputs: false,
        metadata: { key: 'value' },
      });
      
      expect(config.isEnabled).toBe(true);
      expect(config.functionId).toBe('test-function');
      expect(config.recordInputs).toBe(false);
      expect(config.recordOutputs).toBe(false);
      expect(config.metadata).toEqual({ key: 'value' });
    });
  });

  describe('toExperimentalTelemetry', () => {
    it('should return undefined when telemetry is disabled', () => {
      const config = createTelemetryConfig({ isEnabled: false });
      const result = toExperimentalTelemetry(config);
      
      expect(result).toBeUndefined();
    });

    it('should return telemetry config when enabled', () => {
      const config = createTelemetryConfig({
        isEnabled: true,
        functionId: 'my-function',
        metadata: { custom: 'data' },
      });
      const result = toExperimentalTelemetry(config);
      
      expect(result).toBeDefined();
      expect(result?.isEnabled).toBe(true);
      expect(result?.functionId).toBe('my-function');
      expect(result?.metadata).toEqual({ custom: 'data' });
    });
  });

  describe('createInMemoryTelemetryCollector', () => {
    it('should start and end spans', () => {
      const collector = createInMemoryTelemetryCollector();
      
      const span = collector.startSpan('ai.generateText', { prompt: 'test' });
      span.setAttribute('model', 'gpt-4');
      span.addEvent('processing');
      span.end();
      
      const spans = collector.getSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].operationId).toBe('ai.generateText');
      expect(spans[0].attributes).toEqual({ prompt: 'test', model: 'gpt-4' });
      expect(spans[0].events).toHaveLength(1);
      expect(spans[0].status).toBe('ok');
      expect(spans[0].duration).toBeDefined();
    });

    it('should track error spans', () => {
      const collector = createInMemoryTelemetryCollector();
      
      const span = collector.startSpan('ai.generateText');
      span.endWithError(new Error('API error'));
      
      const spans = collector.getSpans();
      expect(spans[0].status).toBe('error');
      expect(spans[0].error?.message).toBe('API error');
    });

    it('should record global events', () => {
      const collector = createInMemoryTelemetryCollector();
      
      collector.recordEvent('custom-event', { data: 'test' });
      
      // Global events are tracked internally
      expect(collector.getSpans()).toHaveLength(0);
    });

    it('should clear all data', () => {
      const collector = createInMemoryTelemetryCollector();
      
      collector.startSpan('test').end();
      collector.startSpan('test2').end();
      
      expect(collector.getSpans()).toHaveLength(2);
      
      collector.clear();
      
      expect(collector.getSpans()).toHaveLength(0);
    });
  });

  describe('createConsoleTelemetryCollector', () => {
    let consoleSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      errorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should log span start and end', () => {
      const collector = createConsoleTelemetryCollector();
      
      const span = collector.startSpan('ai.generateText');
      span.end();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting'),
        undefined
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completed'),
      );
    });

    it('should log errors', () => {
      const collector = createConsoleTelemetryCollector();
      
      const span = collector.startSpan('ai.generateText');
      span.endWithError(new Error('Test error'));
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error'),
        expect.any(Error)
      );
    });

    it('should use custom prefix', () => {
      const collector = createConsoleTelemetryCollector({ prefix: '[Custom]' });
      
      collector.startSpan('test').end();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Custom]'),
        undefined
      );
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate metrics from spans', () => {
      const spans: TelemetrySpanData[] = [
        {
          operationId: 'ai.generateText',
          startTime: 1000,
          endTime: 1500,
          duration: 500,
          attributes: { 'ai.usage': { totalTokens: 100 } },
          events: [],
          status: 'ok',
        },
        {
          operationId: 'ai.generateText',
          startTime: 2000,
          endTime: 2300,
          duration: 300,
          attributes: { 'ai.usage': { totalTokens: 50 } },
          events: [],
          status: 'ok',
        },
        {
          operationId: 'ai.streamText',
          startTime: 3000,
          endTime: 3800,
          duration: 800,
          attributes: { 
            'ai.usage': { totalTokens: 200 },
            'ai.response.msToFirstChunk': 100,
          },
          events: [],
          status: 'error',
          error: new Error('Failed'),
        },
      ];
      
      const metrics = calculateMetrics(spans);
      
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.avgResponseTime).toBeCloseTo(533.33, 1);
      expect(metrics.totalTokens).toBe(350);
      expect(metrics.requestsByOperation['ai.generateText']).toBe(2);
      expect(metrics.requestsByOperation['ai.streamText']).toBe(1);
      expect(metrics.avgTimeToFirstChunk).toBe(100);
    });

    it('should handle empty spans array', () => {
      const metrics = calculateMetrics([]);
      
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.avgResponseTime).toBe(0);
    });
  });

  describe('TELEMETRY_PRESETS', () => {
    it('should have full preset with all recording enabled', () => {
      expect(TELEMETRY_PRESETS.full.isEnabled).toBe(true);
      expect(TELEMETRY_PRESETS.full.recordInputs).toBe(true);
      expect(TELEMETRY_PRESETS.full.recordOutputs).toBe(true);
    });

    it('should have minimal preset without recording', () => {
      expect(TELEMETRY_PRESETS.minimal.isEnabled).toBe(true);
      expect(TELEMETRY_PRESETS.minimal.recordInputs).toBe(false);
      expect(TELEMETRY_PRESETS.minimal.recordOutputs).toBe(false);
    });

    it('should have disabled preset', () => {
      expect(TELEMETRY_PRESETS.disabled.isEnabled).toBe(false);
    });
  });

  describe('default collector', () => {
    it('should get and set default collector', () => {
      const customCollector = createInMemoryTelemetryCollector();
      
      setDefaultTelemetryCollector(customCollector);
      const retrieved = getDefaultTelemetryCollector();
      
      expect(retrieved).toBe(customCollector);
    });
  });
});
