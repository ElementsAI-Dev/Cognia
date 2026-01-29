/**
 * Profiler API Tests
 *
 * @description Tests for performance profiler API type definitions.
 */

import type {
  PerformanceSample,
  MemoryUsage,
  PerformanceBucket,
  PerformanceReport,
  SlowOperationEntry,
  ProfilerConfig,
  PluginProfilerAPI,
} from './profiler';

describe('Profiler API Types', () => {
  describe('PerformanceSample', () => {
    it('should create a basic sample', () => {
      const sample: PerformanceSample = {
        name: 'fetchData',
        startTime: 1000,
        endTime: 1500,
        duration: 500,
      };

      expect(sample.name).toBe('fetchData');
      expect(sample.duration).toBe(500);
    });

    it('should create a sample with memory usage', () => {
      const sample: PerformanceSample = {
        name: 'processItems',
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
        memory: {
          usedHeapSize: 50 * 1024 * 1024,
          totalHeapSize: 100 * 1024 * 1024,
          heapSizeLimit: 512 * 1024 * 1024,
        },
      };

      expect(sample.memory).toBeDefined();
      expect(sample.memory!.usedHeapSize).toBe(50 * 1024 * 1024);
    });

    it('should create a sample with metadata', () => {
      const sample: PerformanceSample = {
        name: 'apiCall',
        startTime: 1000,
        endTime: 1200,
        duration: 200,
        metadata: {
          endpoint: '/api/data',
          method: 'GET',
          statusCode: 200,
        },
      };

      expect(sample.metadata).toEqual({
        endpoint: '/api/data',
        method: 'GET',
        statusCode: 200,
      });
    });
  });

  describe('MemoryUsage', () => {
    it('should create memory usage info', () => {
      const memory: MemoryUsage = {
        usedHeapSize: 30 * 1024 * 1024,
        totalHeapSize: 64 * 1024 * 1024,
        heapSizeLimit: 512 * 1024 * 1024,
      };

      expect(memory.usedHeapSize).toBe(30 * 1024 * 1024);
      expect(memory.totalHeapSize).toBe(64 * 1024 * 1024);
      expect(memory.heapSizeLimit).toBe(512 * 1024 * 1024);
    });

    it('should include external memory', () => {
      const memory: MemoryUsage = {
        usedHeapSize: 30 * 1024 * 1024,
        totalHeapSize: 64 * 1024 * 1024,
        heapSizeLimit: 512 * 1024 * 1024,
        external: 5 * 1024 * 1024,
      };

      expect(memory.external).toBe(5 * 1024 * 1024);
    });
  });

  describe('PerformanceBucket', () => {
    it('should create a performance bucket', () => {
      const bucket: PerformanceBucket = {
        name: 'tool:search',
        count: 100,
        totalDuration: 5000,
        avgDuration: 50,
        minDuration: 10,
        maxDuration: 200,
        p50: 45,
        p95: 150,
        p99: 180,
      };

      expect(bucket.name).toBe('tool:search');
      expect(bucket.count).toBe(100);
      expect(bucket.avgDuration).toBe(50);
      expect(bucket.p95).toBe(150);
    });

    it('should have percentiles in order', () => {
      const bucket: PerformanceBucket = {
        name: 'hook:onMessage',
        count: 50,
        totalDuration: 2500,
        avgDuration: 50,
        minDuration: 5,
        maxDuration: 300,
        p50: 40,
        p95: 200,
        p99: 280,
      };

      expect(bucket.minDuration).toBeLessThanOrEqual(bucket.p50);
      expect(bucket.p50).toBeLessThanOrEqual(bucket.p95);
      expect(bucket.p95).toBeLessThanOrEqual(bucket.p99);
      expect(bucket.p99).toBeLessThanOrEqual(bucket.maxDuration);
    });
  });

  describe('SlowOperationEntry', () => {
    it('should create a slow operation entry', () => {
      const entry: SlowOperationEntry = {
        name: 'heavyComputation',
        duration: 5000,
        threshold: 1000,
        timestamp: Date.now(),
      };

      expect(entry.name).toBe('heavyComputation');
      expect(entry.duration).toBeGreaterThan(entry.threshold);
    });

    it('should include stack trace', () => {
      const entry: SlowOperationEntry = {
        name: 'slowFunction',
        duration: 3000,
        threshold: 500,
        timestamp: Date.now(),
        stack: 'at slowFunction (file.ts:10)\n  at caller (main.ts:20)',
      };

      expect(entry.stack).toContain('slowFunction');
    });
  });

  describe('ProfilerConfig', () => {
    it('should create a basic config', () => {
      const config: ProfilerConfig = {
        enabled: true,
        sampleRate: 1.0,
        maxSamples: 1000,
        slowThreshold: 1000,
        trackMemory: false,
        memorySnapshotInterval: 60000,
      };

      expect(config.enabled).toBe(true);
      expect(config.sampleRate).toBe(1.0);
      expect(config.maxSamples).toBe(1000);
    });

    it('should create config with memory tracking', () => {
      const config: ProfilerConfig = {
        enabled: true,
        sampleRate: 0.5,
        maxSamples: 500,
        slowThreshold: 500,
        trackMemory: true,
        memorySnapshotInterval: 30000,
      };

      expect(config.trackMemory).toBe(true);
      expect(config.memorySnapshotInterval).toBe(30000);
    });

    it('should support sample rate from 0 to 1', () => {
      const configs: ProfilerConfig[] = [
        { enabled: true, sampleRate: 0, maxSamples: 100, slowThreshold: 100, trackMemory: false, memorySnapshotInterval: 60000 },
        { enabled: true, sampleRate: 0.1, maxSamples: 100, slowThreshold: 100, trackMemory: false, memorySnapshotInterval: 60000 },
        { enabled: true, sampleRate: 0.5, maxSamples: 100, slowThreshold: 100, trackMemory: false, memorySnapshotInterval: 60000 },
        { enabled: true, sampleRate: 1.0, maxSamples: 100, slowThreshold: 100, trackMemory: false, memorySnapshotInterval: 60000 },
      ];

      configs.forEach(config => {
        expect(config.sampleRate).toBeGreaterThanOrEqual(0);
        expect(config.sampleRate).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('PerformanceReport', () => {
    it('should create a performance report', () => {
      const report: PerformanceReport = {
        pluginId: 'my-plugin',
        generatedAt: new Date(),
        duration: 60000,
        totalSamples: 500,
        buckets: [],
        memorySnapshots: [],
        slowOperations: [],
      };

      expect(report.pluginId).toBe('my-plugin');
      expect(report.duration).toBe(60000);
      expect(report.totalSamples).toBe(500);
    });

    it('should create a report with buckets', () => {
      const report: PerformanceReport = {
        pluginId: 'my-plugin',
        generatedAt: new Date(),
        duration: 120000,
        totalSamples: 1000,
        buckets: [
          { name: 'tool:search', count: 50, totalDuration: 2500, avgDuration: 50, minDuration: 10, maxDuration: 200, p50: 45, p95: 150, p99: 180 },
          { name: 'hook:onStep', count: 100, totalDuration: 1000, avgDuration: 10, minDuration: 5, maxDuration: 50, p50: 8, p95: 30, p99: 45 },
        ],
        memorySnapshots: [],
        slowOperations: [],
      };

      expect(report.buckets).toHaveLength(2);
      expect(report.buckets[0].name).toBe('tool:search');
    });

    it('should create a report with memory snapshots', () => {
      const report: PerformanceReport = {
        pluginId: 'my-plugin',
        generatedAt: new Date(),
        duration: 60000,
        totalSamples: 200,
        buckets: [],
        memorySnapshots: [
          { timestamp: Date.now() - 60000, usage: { usedHeapSize: 30 * 1024 * 1024, totalHeapSize: 64 * 1024 * 1024, heapSizeLimit: 512 * 1024 * 1024 } },
          { timestamp: Date.now() - 30000, usage: { usedHeapSize: 35 * 1024 * 1024, totalHeapSize: 64 * 1024 * 1024, heapSizeLimit: 512 * 1024 * 1024 } },
          { timestamp: Date.now(), usage: { usedHeapSize: 40 * 1024 * 1024, totalHeapSize: 64 * 1024 * 1024, heapSizeLimit: 512 * 1024 * 1024 } },
        ],
        slowOperations: [],
      };

      expect(report.memorySnapshots).toHaveLength(3);
    });

    it('should create a report with slow operations', () => {
      const report: PerformanceReport = {
        pluginId: 'my-plugin',
        generatedAt: new Date(),
        duration: 60000,
        totalSamples: 100,
        buckets: [],
        memorySnapshots: [],
        slowOperations: [
          { name: 'heavyOp1', duration: 5000, threshold: 1000, timestamp: Date.now() - 30000 },
          { name: 'heavyOp2', duration: 3000, threshold: 1000, timestamp: Date.now() - 10000 },
        ],
      };

      expect(report.slowOperations).toHaveLength(2);
      expect(report.slowOperations[0].duration).toBe(5000);
    });
  });

  describe('PluginProfilerAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginProfilerAPI = {
        start: jest.fn(),
        stop: jest.fn(),
        isActive: jest.fn(),
        configure: jest.fn(),
        getConfig: jest.fn(),
        profile: jest.fn(),
        startTiming: jest.fn(),
        recordSample: jest.fn(),
        getSamples: jest.fn(),
        clearSamples: jest.fn(),
        getMetrics: jest.fn(),
        getAllMetrics: jest.fn(),
        generateReport: jest.fn(),
        exportReport: jest.fn(),
        getMemoryUsage: jest.fn(),
        takeMemorySnapshot: jest.fn(),
        getMemorySnapshots: jest.fn(),
        onSlowOperation: jest.fn(),
        setSlowThreshold: jest.fn(),
        getSlowOperations: jest.fn(),
        mark: jest.fn(),
        measureBetween: jest.fn(),
      };

      expect(mockAPI.start).toBeDefined();
      expect(mockAPI.stop).toBeDefined();
      expect(mockAPI.isActive).toBeDefined();
      expect(mockAPI.configure).toBeDefined();
      expect(mockAPI.getConfig).toBeDefined();
      expect(mockAPI.profile).toBeDefined();
      expect(mockAPI.startTiming).toBeDefined();
      expect(mockAPI.recordSample).toBeDefined();
      expect(mockAPI.getSamples).toBeDefined();
      expect(mockAPI.clearSamples).toBeDefined();
      expect(mockAPI.getMetrics).toBeDefined();
      expect(mockAPI.getAllMetrics).toBeDefined();
      expect(mockAPI.generateReport).toBeDefined();
      expect(mockAPI.exportReport).toBeDefined();
      expect(mockAPI.getMemoryUsage).toBeDefined();
      expect(mockAPI.takeMemorySnapshot).toBeDefined();
      expect(mockAPI.getMemorySnapshots).toBeDefined();
      expect(mockAPI.onSlowOperation).toBeDefined();
      expect(mockAPI.setSlowThreshold).toBeDefined();
      expect(mockAPI.getSlowOperations).toBeDefined();
      expect(mockAPI.mark).toBeDefined();
      expect(mockAPI.measureBetween).toBeDefined();
    });

    it('should start and stop profiling', () => {
      let active = false;
      const mockAPI: PluginProfilerAPI = {
        start: jest.fn().mockImplementation(() => { active = true; }),
        stop: jest.fn().mockImplementation(() => { active = false; }),
        isActive: jest.fn().mockImplementation(() => active),
        configure: jest.fn(),
        getConfig: jest.fn(),
        profile: jest.fn(),
        startTiming: jest.fn(),
        recordSample: jest.fn(),
        getSamples: jest.fn(),
        clearSamples: jest.fn(),
        getMetrics: jest.fn(),
        getAllMetrics: jest.fn(),
        generateReport: jest.fn(),
        exportReport: jest.fn(),
        getMemoryUsage: jest.fn(),
        takeMemorySnapshot: jest.fn(),
        getMemorySnapshots: jest.fn(),
        onSlowOperation: jest.fn(),
        setSlowThreshold: jest.fn(),
        getSlowOperations: jest.fn(),
        mark: jest.fn(),
        measureBetween: jest.fn(),
      };

      expect(mockAPI.isActive()).toBe(false);

      mockAPI.start();
      expect(mockAPI.isActive()).toBe(true);

      mockAPI.stop();
      expect(mockAPI.isActive()).toBe(false);
    });

    it('should configure profiler', () => {
      let config: ProfilerConfig = {
        enabled: false,
        sampleRate: 1.0,
        maxSamples: 1000,
        slowThreshold: 1000,
        trackMemory: false,
        memorySnapshotInterval: 60000,
      };

      const mockAPI: PluginProfilerAPI = {
        start: jest.fn(),
        stop: jest.fn(),
        isActive: jest.fn(),
        configure: jest.fn().mockImplementation((partial) => {
          config = { ...config, ...partial };
        }),
        getConfig: jest.fn().mockImplementation(() => config),
        profile: jest.fn(),
        startTiming: jest.fn(),
        recordSample: jest.fn(),
        getSamples: jest.fn(),
        clearSamples: jest.fn(),
        getMetrics: jest.fn(),
        getAllMetrics: jest.fn(),
        generateReport: jest.fn(),
        exportReport: jest.fn(),
        getMemoryUsage: jest.fn(),
        takeMemorySnapshot: jest.fn(),
        getMemorySnapshots: jest.fn(),
        onSlowOperation: jest.fn(),
        setSlowThreshold: jest.fn(),
        getSlowOperations: jest.fn(),
        mark: jest.fn(),
        measureBetween: jest.fn(),
      };

      mockAPI.configure({ enabled: true, slowThreshold: 500 });

      const newConfig = mockAPI.getConfig();
      expect(newConfig.enabled).toBe(true);
      expect(newConfig.slowThreshold).toBe(500);
    });

    it('should profile functions', async () => {
      const mockAPI: PluginProfilerAPI = {
        start: jest.fn(),
        stop: jest.fn(),
        isActive: jest.fn(),
        configure: jest.fn(),
        getConfig: jest.fn(),
        profile: jest.fn().mockImplementation(async (name, fn, metadata) => fn()),
        startTiming: jest.fn(),
        recordSample: jest.fn(),
        getSamples: jest.fn(),
        clearSamples: jest.fn(),
        getMetrics: jest.fn(),
        getAllMetrics: jest.fn(),
        generateReport: jest.fn(),
        exportReport: jest.fn(),
        getMemoryUsage: jest.fn(),
        takeMemorySnapshot: jest.fn(),
        getMemorySnapshots: jest.fn(),
        onSlowOperation: jest.fn(),
        setSlowThreshold: jest.fn(),
        getSlowOperations: jest.fn(),
        mark: jest.fn(),
        measureBetween: jest.fn(),
      };

      const result = await mockAPI.profile('fetchData', async () => {
        return { data: 'test' };
      }, { url: '/api/data' });

      expect(result).toEqual({ data: 'test' });
      expect(mockAPI.profile).toHaveBeenCalledWith('fetchData', expect.any(Function), { url: '/api/data' });
    });

    it('should handle manual timing', () => {
      const mockEndTiming = jest.fn().mockReturnValue({
        name: 'manualOp',
        startTime: 1000,
        endTime: 1500,
        duration: 500,
      });

      const mockAPI: PluginProfilerAPI = {
        start: jest.fn(),
        stop: jest.fn(),
        isActive: jest.fn(),
        configure: jest.fn(),
        getConfig: jest.fn(),
        profile: jest.fn(),
        startTiming: jest.fn().mockReturnValue(mockEndTiming),
        recordSample: jest.fn(),
        getSamples: jest.fn(),
        clearSamples: jest.fn(),
        getMetrics: jest.fn(),
        getAllMetrics: jest.fn(),
        generateReport: jest.fn(),
        exportReport: jest.fn(),
        getMemoryUsage: jest.fn(),
        takeMemorySnapshot: jest.fn(),
        getMemorySnapshots: jest.fn(),
        onSlowOperation: jest.fn(),
        setSlowThreshold: jest.fn(),
        getSlowOperations: jest.fn(),
        mark: jest.fn(),
        measureBetween: jest.fn(),
      };

      const endTiming = mockAPI.startTiming('manualOp');
      expect(mockAPI.startTiming).toHaveBeenCalledWith('manualOp');

      const sample = endTiming();
      expect(sample.duration).toBe(500);
    });

    it('should manage samples', () => {
      const samples: PerformanceSample[] = [];
      const mockAPI: PluginProfilerAPI = {
        start: jest.fn(),
        stop: jest.fn(),
        isActive: jest.fn(),
        configure: jest.fn(),
        getConfig: jest.fn(),
        profile: jest.fn(),
        startTiming: jest.fn(),
        recordSample: jest.fn().mockImplementation((sample) => samples.push(sample)),
        getSamples: jest.fn().mockImplementation((name, limit) => {
          let result = samples;
          if (name) result = result.filter(s => s.name === name);
          if (limit) result = result.slice(0, limit);
          return result;
        }),
        clearSamples: jest.fn().mockImplementation(() => samples.length = 0),
        getMetrics: jest.fn(),
        getAllMetrics: jest.fn(),
        generateReport: jest.fn(),
        exportReport: jest.fn(),
        getMemoryUsage: jest.fn(),
        takeMemorySnapshot: jest.fn(),
        getMemorySnapshots: jest.fn(),
        onSlowOperation: jest.fn(),
        setSlowThreshold: jest.fn(),
        getSlowOperations: jest.fn(),
        mark: jest.fn(),
        measureBetween: jest.fn(),
      };

      mockAPI.recordSample({ name: 'op1', startTime: 1000, endTime: 1100, duration: 100 });
      mockAPI.recordSample({ name: 'op2', startTime: 1100, endTime: 1250, duration: 150 });

      expect(mockAPI.getSamples()).toHaveLength(2);
      expect(mockAPI.getSamples('op1')).toHaveLength(1);

      mockAPI.clearSamples();
      expect(mockAPI.getSamples()).toHaveLength(0);
    });

    it('should get metrics', () => {
      const mockAPI: PluginProfilerAPI = {
        start: jest.fn(),
        stop: jest.fn(),
        isActive: jest.fn(),
        configure: jest.fn(),
        getConfig: jest.fn(),
        profile: jest.fn(),
        startTiming: jest.fn(),
        recordSample: jest.fn(),
        getSamples: jest.fn(),
        clearSamples: jest.fn(),
        getMetrics: jest.fn().mockImplementation((name) => {
          if (name === 'tool:search') {
            return { name: 'tool:search', count: 50, totalDuration: 2500, avgDuration: 50, minDuration: 10, maxDuration: 200, p50: 45, p95: 150, p99: 180 };
          }
          return null;
        }),
        getAllMetrics: jest.fn().mockReturnValue([
          { name: 'tool:search', count: 50, totalDuration: 2500, avgDuration: 50, minDuration: 10, maxDuration: 200, p50: 45, p95: 150, p99: 180 },
          { name: 'hook:onStep', count: 100, totalDuration: 1000, avgDuration: 10, minDuration: 5, maxDuration: 50, p50: 8, p95: 30, p99: 45 },
        ]),
        generateReport: jest.fn(),
        exportReport: jest.fn(),
        getMemoryUsage: jest.fn(),
        takeMemorySnapshot: jest.fn(),
        getMemorySnapshots: jest.fn(),
        onSlowOperation: jest.fn(),
        setSlowThreshold: jest.fn(),
        getSlowOperations: jest.fn(),
        mark: jest.fn(),
        measureBetween: jest.fn(),
      };

      const metrics = mockAPI.getMetrics('tool:search');
      expect(metrics).not.toBeNull();
      expect(metrics!.avgDuration).toBe(50);

      const allMetrics = mockAPI.getAllMetrics();
      expect(allMetrics).toHaveLength(2);
    });

    it('should generate and export reports', () => {
      const mockAPI: PluginProfilerAPI = {
        start: jest.fn(),
        stop: jest.fn(),
        isActive: jest.fn(),
        configure: jest.fn(),
        getConfig: jest.fn(),
        profile: jest.fn(),
        startTiming: jest.fn(),
        recordSample: jest.fn(),
        getSamples: jest.fn(),
        clearSamples: jest.fn(),
        getMetrics: jest.fn(),
        getAllMetrics: jest.fn(),
        generateReport: jest.fn().mockReturnValue({
          pluginId: 'test-plugin',
          generatedAt: new Date(),
          duration: 60000,
          totalSamples: 100,
          buckets: [],
          memorySnapshots: [],
          slowOperations: [],
        }),
        exportReport: jest.fn().mockReturnValue(JSON.stringify({
          pluginId: 'test-plugin',
          buckets: [],
        })),
        getMemoryUsage: jest.fn(),
        takeMemorySnapshot: jest.fn(),
        getMemorySnapshots: jest.fn(),
        onSlowOperation: jest.fn(),
        setSlowThreshold: jest.fn(),
        getSlowOperations: jest.fn(),
        mark: jest.fn(),
        measureBetween: jest.fn(),
      };

      const report = mockAPI.generateReport();
      expect(report.pluginId).toBe('test-plugin');

      const exported = mockAPI.exportReport();
      const parsed = JSON.parse(exported);
      expect(parsed.pluginId).toBe('test-plugin');
    });

    it('should handle memory monitoring', () => {
      const snapshots: Array<{ timestamp: number; usage: MemoryUsage }> = [];
      const mockAPI: PluginProfilerAPI = {
        start: jest.fn(),
        stop: jest.fn(),
        isActive: jest.fn(),
        configure: jest.fn(),
        getConfig: jest.fn(),
        profile: jest.fn(),
        startTiming: jest.fn(),
        recordSample: jest.fn(),
        getSamples: jest.fn(),
        clearSamples: jest.fn(),
        getMetrics: jest.fn(),
        getAllMetrics: jest.fn(),
        generateReport: jest.fn(),
        exportReport: jest.fn(),
        getMemoryUsage: jest.fn().mockReturnValue({
          usedHeapSize: 50 * 1024 * 1024,
          totalHeapSize: 100 * 1024 * 1024,
          heapSizeLimit: 512 * 1024 * 1024,
        }),
        takeMemorySnapshot: jest.fn().mockImplementation(() => {
          snapshots.push({
            timestamp: Date.now(),
            usage: { usedHeapSize: 50 * 1024 * 1024, totalHeapSize: 100 * 1024 * 1024, heapSizeLimit: 512 * 1024 * 1024 },
          });
        }),
        getMemorySnapshots: jest.fn().mockImplementation(() => snapshots),
        onSlowOperation: jest.fn(),
        setSlowThreshold: jest.fn(),
        getSlowOperations: jest.fn(),
        mark: jest.fn(),
        measureBetween: jest.fn(),
      };

      const memory = mockAPI.getMemoryUsage();
      expect(memory).not.toBeNull();
      expect(memory!.usedHeapSize).toBe(50 * 1024 * 1024);

      mockAPI.takeMemorySnapshot();
      mockAPI.takeMemorySnapshot();

      const allSnapshots = mockAPI.getMemorySnapshots();
      expect(allSnapshots).toHaveLength(2);
    });

    it('should monitor slow operations', () => {
      const slowOps: SlowOperationEntry[] = [];
      const mockAPI: PluginProfilerAPI = {
        start: jest.fn(),
        stop: jest.fn(),
        isActive: jest.fn(),
        configure: jest.fn(),
        getConfig: jest.fn(),
        profile: jest.fn(),
        startTiming: jest.fn(),
        recordSample: jest.fn(),
        getSamples: jest.fn(),
        clearSamples: jest.fn(),
        getMetrics: jest.fn(),
        getAllMetrics: jest.fn(),
        generateReport: jest.fn(),
        exportReport: jest.fn(),
        getMemoryUsage: jest.fn(),
        takeMemorySnapshot: jest.fn(),
        getMemorySnapshots: jest.fn(),
        onSlowOperation: jest.fn().mockReturnValue(() => {}),
        setSlowThreshold: jest.fn(),
        getSlowOperations: jest.fn().mockReturnValue(slowOps),
        mark: jest.fn(),
        measureBetween: jest.fn(),
      };

      const unsubscribe = mockAPI.onSlowOperation((entry) => {
        slowOps.push(entry);
      });

      expect(typeof unsubscribe).toBe('function');

      mockAPI.setSlowThreshold(500);
      expect(mockAPI.setSlowThreshold).toHaveBeenCalledWith(500);
    });

    it('should handle marks and measurements', () => {
      const marks: Record<string, number> = {};
      const mockAPI: PluginProfilerAPI = {
        start: jest.fn(),
        stop: jest.fn(),
        isActive: jest.fn(),
        configure: jest.fn(),
        getConfig: jest.fn(),
        profile: jest.fn(),
        startTiming: jest.fn(),
        recordSample: jest.fn(),
        getSamples: jest.fn(),
        clearSamples: jest.fn(),
        getMetrics: jest.fn(),
        getAllMetrics: jest.fn(),
        generateReport: jest.fn(),
        exportReport: jest.fn(),
        getMemoryUsage: jest.fn(),
        takeMemorySnapshot: jest.fn(),
        getMemorySnapshots: jest.fn(),
        onSlowOperation: jest.fn(),
        setSlowThreshold: jest.fn(),
        getSlowOperations: jest.fn(),
        mark: jest.fn().mockImplementation((name) => {
          marks[name] = Date.now();
        }),
        measureBetween: jest.fn().mockImplementation((name, startMark, endMark) => {
          if (marks[startMark] && marks[endMark]) {
            return marks[endMark] - marks[startMark];
          }
          return null;
        }),
      };

      mockAPI.mark('start');
      mockAPI.mark('end');

      expect(mockAPI.mark).toHaveBeenCalledWith('start');
      expect(mockAPI.mark).toHaveBeenCalledWith('end');

      mockAPI.measureBetween('total', 'start', 'end');
      expect(mockAPI.measureBetween).toHaveBeenCalledWith('total', 'start', 'end');
    });
  });
});
