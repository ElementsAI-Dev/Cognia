/**
 * Tests for useAgentDemoExport hook
 */

import { renderHook, act } from '@testing-library/react';
import { useAgentDemoExport } from './use-agent-demo-export';
import type { BackgroundAgent } from '@/types/agent/background-agent';

jest.mock('@/lib/export/agent/agent-demo-export', () => ({
  exportAgentDemo: jest.fn(() => '<html>demo</html>'),
  exportAgentAsMarkdown: jest.fn(() => '# Agent Workflow'),
}));

jest.mock('@/lib/export', () => ({
  downloadFile: jest.fn(),
}));

jest.mock('@/lib/export/agent/constants', () => ({
  formatAgentDuration: jest.fn((ms: number) => `${ms}ms`),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockAgent: BackgroundAgent = {
  id: 'agent-1',
  sessionId: 'session-1',
  name: 'Test Agent',
  task: 'Perform a test task',
  status: 'completed',
  progress: 100,
  config: {
    runInBackground: true,
    notifyOnProgress: true,
    notifyOnComplete: true,
    notifyOnError: true,
    autoRetry: false,
    maxRetries: 3,
    retryDelay: 1000,
    persistState: true,
    maxConcurrentSubAgents: 3,
  },
  executionState: {
    currentStep: 2,
    totalSteps: 2,
    currentPhase: 'completed' as const,
    activeSubAgents: [],
    completedSubAgents: [],
    failedSubAgents: [],
    pendingApprovals: [],
    lastActivity: new Date(),
  },
  subAgents: [],
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      type: 'thinking' as const,
      status: 'completed' as const,
      title: 'Analyzing request',
      description: 'Understanding the user request',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      completedAt: new Date('2024-01-01T10:00:05Z'),
      duration: 5000,
    },
    {
      id: 'step-2',
      stepNumber: 2,
      type: 'tool_call' as const,
      status: 'completed' as const,
      title: 'Executing search',
      description: 'Searching for information',
      startedAt: new Date('2024-01-01T10:00:05Z'),
      completedAt: new Date('2024-01-01T10:00:10Z'),
      duration: 5000,
      toolCalls: [{ name: 'web_search', status: 'completed' as const }],
    },
  ],
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:10Z'),
} as unknown as BackgroundAgent;

const mockT = jest.fn((key: string) => key);

describe('useAgentDemoExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAgentDemoExport(mockAgent, mockT));

    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportFormat).toBe('html');
    expect(result.current.autoPlay).toBe(false);
    expect(result.current.showTimeline).toBe(true);
    expect(result.current.showToolDetails).toBe(true);
    expect(result.current.showThinkingProcess).toBe(true);
  });

  it('should calculate stats from agent steps', () => {
    const { result } = renderHook(() => useAgentDemoExport(mockAgent, mockT));

    expect(result.current.stats.totalSteps).toBe(2);
    expect(result.current.stats.completedSteps).toBe(2);
    expect(result.current.stats.failedSteps).toBe(0);
    expect(result.current.stats.totalDuration).toBe(10000);
    expect(result.current.stats.toolCalls).toBe(1);
  });

  it('should calculate progress percentage', () => {
    const { result } = renderHook(() => useAgentDemoExport(mockAgent, mockT));
    expect(result.current.progress).toBe(100);
  });

  it('should allow changing export format', () => {
    const { result } = renderHook(() => useAgentDemoExport(mockAgent, mockT));

    act(() => {
      result.current.setExportFormat('markdown');
    });

    expect(result.current.exportFormat).toBe('markdown');
  });

  it('should toggle step expansion', () => {
    const { result } = renderHook(() => useAgentDemoExport(mockAgent, mockT));

    expect(result.current.expandedSteps.has(1)).toBe(false);

    act(() => {
      result.current.toggleStep(1);
    });

    expect(result.current.expandedSteps.has(1)).toBe(true);

    act(() => {
      result.current.toggleStep(1);
    });

    expect(result.current.expandedSteps.has(1)).toBe(false);
  });

  it('should toggle demo options', () => {
    const { result } = renderHook(() => useAgentDemoExport(mockAgent, mockT));

    act(() => {
      result.current.setAutoPlay(true);
      result.current.setShowTimeline(false);
      result.current.setShowToolDetails(false);
      result.current.setShowThinkingProcess(false);
    });

    expect(result.current.autoPlay).toBe(true);
    expect(result.current.showTimeline).toBe(false);
    expect(result.current.showToolDetails).toBe(false);
    expect(result.current.showThinkingProcess).toBe(false);
  });

  it('should handle HTML export', async () => {
    const { exportAgentDemo } = jest.requireMock('@/lib/export/agent/agent-demo-export');
    const { downloadFile } = jest.requireMock('@/lib/export');
    const { result } = renderHook(() => useAgentDemoExport(mockAgent, mockT));

    await act(async () => {
      await result.current.handleExport();
    });

    expect(exportAgentDemo).toHaveBeenCalledWith(mockAgent, expect.objectContaining({
      theme: 'system',
      showControls: true,
    }));
    expect(downloadFile).toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });

  it('should handle Markdown export', async () => {
    const { exportAgentAsMarkdown } = jest.requireMock('@/lib/export/agent/agent-demo-export');
    const { downloadFile } = jest.requireMock('@/lib/export');
    const { result } = renderHook(() => useAgentDemoExport(mockAgent, mockT));

    act(() => {
      result.current.setExportFormat('markdown');
    });

    await act(async () => {
      await result.current.handleExport();
    });

    expect(exportAgentAsMarkdown).toHaveBeenCalled();
    expect(downloadFile).toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });

  it('should expose formatDuration function', () => {
    const { result } = renderHook(() => useAgentDemoExport(mockAgent, mockT));
    expect(typeof result.current.formatDuration).toBe('function');
    expect(result.current.formatDuration(5000)).toBe('5000ms');
  });

  it('should handle export failure gracefully', async () => {
    const { exportAgentDemo } = jest.requireMock('@/lib/export/agent/agent-demo-export');
    const { toast } = jest.requireMock('sonner');
    exportAgentDemo.mockImplementationOnce(() => { throw new Error('Export failed'); });

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAgentDemoExport(mockAgent, mockT));

    await act(async () => {
      await result.current.handleExport();
    });

    expect(toast.error).toHaveBeenCalledWith('exportFailed');
    expect(result.current.isExporting).toBe(false);
    consoleError.mockRestore();
  });
});
