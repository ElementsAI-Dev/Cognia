import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { BackgroundAgent } from '@/types/agent/background-agent';
import type { AgentDemoExportFormat, AgentDemoStats } from '@/types/export/agent-demo';
import {
  exportAgentDemo,
  exportAgentAsMarkdown,
  type AgentDemoOptions,
} from '@/lib/export/agent/agent-demo-export';
import { downloadFile } from '@/lib/export';
import { formatAgentDuration } from '@/lib/export/agent/constants';

/**
 * Hook for agent demo export — format/options state, step expansion, export handler, stats
 */
export function useAgentDemoExport(
  agent: BackgroundAgent,
  t: (key: string) => string
) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<AgentDemoExportFormat>('html');
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // Demo options
  const [autoPlay, setAutoPlay] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showToolDetails, setShowToolDetails] = useState(true);
  const [showThinkingProcess, setShowThinkingProcess] = useState(true);
  const [playbackSpeed] = useState(1);

  const toggleStep = useCallback((stepNumber: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      const options: Partial<AgentDemoOptions> = {
        autoPlay,
        showTimeline,
        showToolDetails,
        showThinkingProcess,
        playbackSpeed,
        theme: 'system',
        showControls: true,
      };

      let content: string;
      let filename: string;
      let mimeType: string;

      if (exportFormat === 'html') {
        content = exportAgentDemo(agent, options);
        filename = `agent-demo-${agent.name.slice(0, 30)}-${new Date().toISOString().slice(0, 10)}.html`;
        mimeType = 'text/html';
      } else {
        content = exportAgentAsMarkdown(agent, { includeDetails: showToolDetails });
        filename = `agent-workflow-${agent.name.slice(0, 30)}-${new Date().toISOString().slice(0, 10)}.md`;
        mimeType = 'text/markdown';
      }

      downloadFile(content, filename, mimeType);
      toast.success(exportFormat === 'html' ? t('demoExported') : t('markdownExported'));
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }, [agent, exportFormat, autoPlay, showTimeline, showToolDetails, showThinkingProcess, playbackSpeed, t]);

  // Calculate statistics
  const stats: AgentDemoStats = {
    totalSteps: agent.steps.length,
    completedSteps: agent.steps.filter((s) => s.status === 'completed').length,
    failedSteps: agent.steps.filter((s) => s.status === 'failed').length,
    totalDuration: agent.steps.reduce((sum, s) => sum + (s.duration || 0), 0),
    toolCalls: agent.steps.filter((s) => s.type === 'tool_call').length,
  };

  const progress = stats.totalSteps > 0 ? (stats.completedSteps / stats.totalSteps) * 100 : 0;

  return {
    isExporting,
    exportFormat,
    setExportFormat,
    expandedSteps,
    toggleStep,
    autoPlay,
    setAutoPlay,
    showTimeline,
    setShowTimeline,
    showToolDetails,
    setShowToolDetails,
    showThinkingProcess,
    setShowThinkingProcess,
    handleExport,
    stats,
    progress,
    formatDuration: formatAgentDuration,
  };
}
