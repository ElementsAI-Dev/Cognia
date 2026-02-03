/**
 * Tests for usage export utilities
 */

import {
  exportRecordsToCSV,
  exportRecordsToJSON,
  exportTimeSeriesToCSV,
  exportSummaryToJSON,
  downloadFile,
} from './usage-export';
import type { UsageRecord } from '@/types/system/usage';
import type { TimeSeriesDataPoint } from './usage-analytics';

// Mock DOM APIs
const mockCreateObjectURL = jest.fn(() => 'mock-url');
const mockRevokeObjectURL = jest.fn();
const mockClick = jest.fn();

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
});

describe('usage-export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportRecordsToCSV', () => {
    it('should export empty records to CSV with headers only', () => {
      const result = exportRecordsToCSV([]);
      expect(result).toBe(
        'id,sessionId,messageId,provider,model,promptTokens,completionTokens,totalTokens,cost,latency,status,createdAt'
      );
    });

    it('should export records to CSV format', () => {
      const records: UsageRecord[] = [
        {
          id: 'test-1',
          sessionId: 'session-1',
          messageId: 'msg-1',
          provider: 'openai',
          model: 'gpt-4',
          tokens: { prompt: 100, completion: 50, total: 150 },
          cost: 0.001,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          latency: 500,
          status: 'success',
        },
      ];

      const result = exportRecordsToCSV(records);
      const lines = result.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('id,sessionId');
      expect(lines[1]).toContain('test-1');
      expect(lines[1]).toContain('openai');
      expect(lines[1]).toContain('gpt-4');
      expect(lines[1]).toContain('100');
      expect(lines[1]).toContain('50');
      expect(lines[1]).toContain('150');
      expect(lines[1]).toContain('500');
      expect(lines[1]).toContain('success');
    });

    it('should handle records without latency and status', () => {
      const records: UsageRecord[] = [
        {
          id: 'test-2',
          sessionId: 'session-2',
          messageId: 'msg-2',
          provider: 'anthropic',
          model: 'claude-3',
          tokens: { prompt: 200, completion: 100, total: 300 },
          cost: 0.002,
          createdAt: new Date('2024-01-15T11:00:00Z'),
        },
      ];

      const result = exportRecordsToCSV(records);
      const lines = result.split('\n');

      expect(lines[1]).toContain('test-2');
      expect(lines[1]).toContain('success'); // Default status
    });
  });

  describe('exportRecordsToJSON', () => {
    it('should export empty records to JSON', () => {
      const result = exportRecordsToJSON([]);
      expect(result).toBe('[]');
    });

    it('should export records to formatted JSON', () => {
      const records: UsageRecord[] = [
        {
          id: 'test-1',
          sessionId: 'session-1',
          messageId: 'msg-1',
          provider: 'openai',
          model: 'gpt-4',
          tokens: { prompt: 100, completion: 50, total: 150 },
          cost: 0.001,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
      ];

      const result = exportRecordsToJSON(records);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('test-1');
      expect(parsed[0].provider).toBe('openai');
    });
  });

  describe('exportTimeSeriesToCSV', () => {
    it('should export empty time series to CSV with headers only', () => {
      const result = exportTimeSeriesToCSV([]);
      expect(result).toBe('date,tokens,cost,requests');
    });

    it('should export time series data to CSV', () => {
      const data: TimeSeriesDataPoint[] = [
        { date: '2024-01-15', timestamp: 1705312800000, tokens: 1000, cost: 0.01, requests: 5 },
        { date: '2024-01-16', timestamp: 1705399200000, tokens: 2000, cost: 0.02, requests: 10 },
      ];

      const result = exportTimeSeriesToCSV(data);
      const lines = result.split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('2024-01-15');
      expect(lines[1]).toContain('1000');
      expect(lines[2]).toContain('2024-01-16');
      expect(lines[2]).toContain('2000');
    });
  });

  describe('exportSummaryToJSON', () => {
    it('should export summary to formatted JSON', () => {
      const summary = {
        totalRequests: 100,
        totalTokens: 50000,
        totalCost: 5.5,
        averageLatency: 250,
        errorRate: 0.02,
        timeRange: '24h',
        exportedAt: '2024-01-15T12:00:00Z',
      };

      const result = exportSummaryToJSON(summary);
      const parsed = JSON.parse(result);

      expect(parsed.totalRequests).toBe(100);
      expect(parsed.totalTokens).toBe(50000);
      expect(parsed.totalCost).toBe(5.5);
      expect(parsed.averageLatency).toBe(250);
      expect(parsed.errorRate).toBe(0.02);
      expect(parsed.timeRange).toBe('24h');
    });
  });

  describe('downloadFile', () => {
    it('should create blob and trigger download', () => {
      const mockLink = {
        href: '',
        download: '',
        click: mockClick,
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as HTMLAnchorElement);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as HTMLAnchorElement);

      downloadFile('test content', 'test.csv', 'text/csv');

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockLink.download).toBe('test.csv');
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
  });
});
