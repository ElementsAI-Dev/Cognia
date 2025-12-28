/**
 * Tests for SandboxStats component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SandboxStats } from './sandbox-stats';
import type { SandboxStats as SandboxStatsType, LanguageStats, DailyExecutionCount } from '@/types/sandbox';

// Mock data
const mockStats: SandboxStatsType = {
  total_executions: 100,
  successful_executions: 80,
  failed_executions: 15,
  timeout_executions: 5,
  total_execution_time_ms: 50000,
  avg_execution_time_ms: 500,
  total_snippets: 20,
  total_sessions: 5,
  most_used_language: 'python',
  languages: [],
};

const mockLanguageStats: LanguageStats[] = [
  {
    language: 'python',
    total_executions: 50,
    successful_executions: 45,
    failed_executions: 3,
    timeout_executions: 2,
    total_execution_time_ms: 25000,
    avg_execution_time_ms: 500,
    total_memory_used_bytes: 1024000,
    last_used: '2024-01-01T00:00:00Z',
  },
  {
    language: 'javascript',
    total_executions: 30,
    successful_executions: 25,
    failed_executions: 4,
    timeout_executions: 1,
    total_execution_time_ms: 15000,
    avg_execution_time_ms: 500,
    total_memory_used_bytes: 512000,
    last_used: '2024-01-02T00:00:00Z',
  },
];

const mockDailyCounts: DailyExecutionCount[] = [
  { date: '2024-01-01', count: 10 },
  { date: '2024-01-02', count: 15 },
  { date: '2024-01-03', count: 8 },
  { date: '2024-01-04', count: 20 },
  { date: '2024-01-05', count: 12 },
];

const mockUseSandboxStats = {
  stats: mockStats,
  languageStats: mockLanguageStats,
  dailyCounts: mockDailyCounts,
  loading: false,
  error: null,
  refresh: jest.fn(),
};

jest.mock('@/hooks/use-sandbox-db', () => ({
  useSandboxStats: () => mockUseSandboxStats,
}));

describe('SandboxStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render stats cards', () => {
    render(<SandboxStats />);

    expect(screen.getByText('总执行次数')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('成功率')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('should display average execution time', () => {
    render(<SandboxStats />);

    expect(screen.getByText('平均执行时间')).toBeInTheDocument();
    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('should display failed and timeout counts', () => {
    render(<SandboxStats />);

    expect(screen.getByText('失败/超时')).toBeInTheDocument();
    expect(screen.getByText('15/5')).toBeInTheDocument();
  });

  it('should display total snippets count', () => {
    render(<SandboxStats />);

    expect(screen.getByText('20 个代码片段')).toBeInTheDocument();
  });

  it('should display trend chart section', () => {
    render(<SandboxStats />);

    expect(screen.getByText('最近 30 天执行趋势')).toBeInTheDocument();
  });

  it('should display language statistics section', () => {
    render(<SandboxStats />);

    expect(screen.getByText('语言统计')).toBeInTheDocument();
  });

  it('should display language names', () => {
    render(<SandboxStats />);

    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
  });

  it('should display execution counts for languages', () => {
    render(<SandboxStats />);

    expect(screen.getByText('50 次')).toBeInTheDocument();
    expect(screen.getByText('30 次')).toBeInTheDocument();
  });

  it('should display success rates for languages', () => {
    render(<SandboxStats />);

    // Python: 45/50 = 90%
    expect(screen.getByText('90%')).toBeInTheDocument();
    // JavaScript: 25/30 = 83%
    expect(screen.getByText('83%')).toBeInTheDocument();
  });

  it('should display most used language', () => {
    render(<SandboxStats />);

    expect(screen.getByText('最常用语言')).toBeInTheDocument();
    // Python should appear as the most used language
    const pythonElements = screen.getAllByText('Python');
    expect(pythonElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should display session count', () => {
    render(<SandboxStats />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

describe('SandboxStats rendering', () => {
  it('should render stats cards with data', () => {
    render(<SandboxStats />);

    // Verify the main stats sections are present
    expect(screen.getByText('总执行次数')).toBeInTheDocument();
    expect(screen.getByText('成功率')).toBeInTheDocument();
    expect(screen.getByText('平均执行时间')).toBeInTheDocument();
  });

  it('should show trend indicator for good success rate', () => {
    render(<SandboxStats />);

    // With 80% success rate, should show positive trend
    expect(screen.getByText('良好')).toBeInTheDocument();
  });

  it('should render chart section', () => {
    render(<SandboxStats />);

    expect(screen.getByText('最近 30 天执行趋势')).toBeInTheDocument();
  });

  it('should render language stats section', () => {
    render(<SandboxStats />);

    expect(screen.getByText('语言统计')).toBeInTheDocument();
  });
});
