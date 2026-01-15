/**
 * Tests for Agent Demo Export functionality
 */

import {
  exportAgentDemo,
  exportAgentAsMarkdown,
} from './agent-demo-export';
import type { BackgroundAgent } from '@/types/agent/background-agent';

// Mock agent for testing
const mockAgent = ({
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
    currentStep: 3,
    totalSteps: 3,
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
      title: 'Calling web search',
      description: 'Searching for relevant information',
      toolCalls: [
        {
          id: 'tc-1',
          name: 'web_search',
          args: { query: 'test query' },
          status: 'completed' as const,
          result: { data: 'search results' },
        },
      ],
      startedAt: new Date('2024-01-01T10:00:05Z'),
      completedAt: new Date('2024-01-01T10:00:10Z'),
      duration: 5000,
    },
    {
      id: 'step-3',
      stepNumber: 3,
      type: 'response' as const,
      status: 'completed' as const,
      title: 'Generating response',
      response: 'Here is the result of your request.',
      startedAt: new Date('2024-01-01T10:00:10Z'),
      completedAt: new Date('2024-01-01T10:00:15Z'),
      duration: 5000,
    },
  ],
  logs: [],
  notifications: [],
  createdAt: new Date('2024-01-01T09:59:00Z'),
  startedAt: new Date('2024-01-01T10:00:00Z'),
  completedAt: new Date('2024-01-01T10:00:15Z'),
  retryCount: 0,
  priority: 1,
} as unknown as BackgroundAgent);

describe('Agent Demo Export', () => {
  describe('exportAgentDemo', () => {
    it('should generate HTML with agent info', () => {
      const html = exportAgentDemo(mockAgent);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain(mockAgent.name);
      expect(html).toContain(mockAgent.task);
    });

    it('should include step information', () => {
      const html = exportAgentDemo(mockAgent);
      
      expect(html).toContain('Analyzing request');
      expect(html).toContain('Calling web search');
      expect(html).toContain('Generating response');
    });

    it('should include timeline when enabled', () => {
      const html = exportAgentDemo(mockAgent, { showTimeline: true });
      
      expect(html).toContain('timeline-container');
      expect(html).toContain('timeline-track');
    });

    it('should include controls when enabled', () => {
      const html = exportAgentDemo(mockAgent, { showControls: true });
      
      expect(html).toContain('playPauseBtn');
      expect(html).toContain('restartBtn');
      expect(html).toContain('speedSelect');
    });

    it('should respect autoPlay option', () => {
      const html = exportAgentDemo(mockAgent, { autoPlay: true });
      
      expect(html).toContain('"autoPlay":true');
    });

    it('should include JavaScript animation script', () => {
      const html = exportAgentDemo(mockAgent);
      
      expect(html).toContain('<script>');
      expect(html).toContain('function init()');
      expect(html).toContain('function play()');
      expect(html).toContain('function pause()');
    });
  });

  describe('exportAgentAsMarkdown', () => {
    it('should generate markdown with agent info', () => {
      const markdown = exportAgentAsMarkdown(mockAgent);
      
      expect(markdown).toContain(`# 🤖 ${mockAgent.name}`);
      expect(markdown).toContain(`**任务**: ${mockAgent.task}`);
      expect(markdown).toContain(`**状态**: 已完成`);
    });

    it('should include steps', () => {
      const markdown = exportAgentAsMarkdown(mockAgent);
      
      expect(markdown).toContain('## 执行步骤');
      expect(markdown).toContain('Analyzing request');
      expect(markdown).toContain('Calling web search');
    });

    it('should include tool calls when includeDetails is true', () => {
      const markdown = exportAgentAsMarkdown(mockAgent, { includeDetails: true });
      
      expect(markdown).toContain('**工具调用:**');
      expect(markdown).toContain('`web_search`');
    });

    it('should include duration when available', () => {
      const markdown = exportAgentAsMarkdown(mockAgent, { includeDetails: true });
      
      expect(markdown).toContain('耗时:');
    });

    it('should include export footer', () => {
      const markdown = exportAgentAsMarkdown(mockAgent);
      
      expect(markdown).toContain('导出自 Cognia');
    });
  });

  describe('exportAgentDemo options', () => {
    it('should respect theme option', () => {
      const lightHtml = exportAgentDemo(mockAgent, { theme: 'light' });
      const darkHtml = exportAgentDemo(mockAgent, { theme: 'dark' });
      
      expect(lightHtml).toContain('"theme":"light"');
      expect(darkHtml).toContain('"theme":"dark"');
    });

    it('should respect animation style option', () => {
      const smoothHtml = exportAgentDemo(mockAgent, { animationStyle: 'smooth' });
      const steppedHtml = exportAgentDemo(mockAgent, { animationStyle: 'stepped' });
      
      expect(smoothHtml).toContain('"animationStyle":"smooth"');
      expect(steppedHtml).toContain('"animationStyle":"stepped"');
    });

    it('should respect playback speed option', () => {
      const normalSpeed = exportAgentDemo(mockAgent, { playbackSpeed: 1 });
      const fastSpeed = exportAgentDemo(mockAgent, { playbackSpeed: 2 });
      
      expect(normalSpeed).toContain('"playbackSpeed":1');
      expect(fastSpeed).toContain('"playbackSpeed":2');
    });

    it('should hide timeline when disabled', () => {
      const html = exportAgentDemo(mockAgent, { showTimeline: false });
      
      expect(html).toContain('"showTimeline":false');
    });

    it('should hide tool details when disabled', () => {
      const html = exportAgentDemo(mockAgent, { showToolDetails: false });
      
      expect(html).toContain('"showToolDetails":false');
    });

    it('should hide thinking process when disabled', () => {
      const html = exportAgentDemo(mockAgent, { showThinkingProcess: false });
      
      expect(html).toContain('"showThinkingProcess":false');
    });

    it('should hide controls when disabled', () => {
      const html = exportAgentDemo(mockAgent, { showControls: false });
      
      // When controls are disabled, the controls div should not be in the HTML
      expect(html).toContain('"showControls":false');
    });

    it('should enable compact mode when set', () => {
      const html = exportAgentDemo(mockAgent, { compactMode: true });
      
      expect(html).toContain('"compactMode":true');
    });
  });

  describe('exportAgentDemo HTML structure', () => {
    it('should include proper DOCTYPE and HTML structure', () => {
      const html = exportAgentDemo(mockAgent);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="zh-CN">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
    });

    it('should include meta tags', () => {
      const html = exportAgentDemo(mockAgent);
      
      expect(html).toContain('charset="UTF-8"');
      expect(html).toContain('viewport');
    });

    it('should include CSS styles', () => {
      const html = exportAgentDemo(mockAgent);
      
      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
      expect(html).toContain('--bg-primary');
      expect(html).toContain('--accent-color');
    });

    it('should include serialized agent data', () => {
      const html = exportAgentDemo(mockAgent);
      
      expect(html).toContain('const agent =');
      expect(html).toContain(mockAgent.id);
      expect(html).toContain(mockAgent.name);
    });

    it('should include all step types', () => {
      const html = exportAgentDemo(mockAgent);
      
      // Check step type icons/identifiers
      expect(html).toContain('🤔'); // thinking
      expect(html).toContain('🔧'); // tool_call
      expect(html).toContain('💬'); // response
    });

    it('should include animation functions', () => {
      const html = exportAgentDemo(mockAgent);
      
      expect(html).toContain('function togglePlayPause()');
      expect(html).toContain('function restart()');
      expect(html).toContain('function nextStep()');
      expect(html).toContain('function showStep(index)');
    });

    it('should include footer with stats', () => {
      const html = exportAgentDemo(mockAgent);
      
      expect(html).toContain('总耗时');
      expect(html).toContain('步骤数');
      expect(html).toContain('导出自 Cognia');
    });
  });

  describe('exportAgentAsMarkdown edge cases', () => {
    it('should handle agent with no steps', () => {
      const emptyAgent = ({
        ...mockAgent,
        steps: [],
      } as unknown as BackgroundAgent);
      
      const markdown = exportAgentAsMarkdown(emptyAgent);
      
      expect(markdown).toContain(`# 🤖 ${mockAgent.name}`);
      expect(markdown).toContain('## 执行步骤');
    });

    it('should handle failed steps', () => {
      const failedAgent = ({
        ...mockAgent,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'tool_call' as const,
            status: 'failed' as const,
            title: 'Failed step',
            error: 'Something went wrong',
          },
        ],
      } as unknown as BackgroundAgent);
      
      const markdown = exportAgentAsMarkdown(failedAgent);
      
      expect(markdown).toContain('Failed step');
      expect(markdown).toContain('❌');
    });

    it('should handle pending steps', () => {
      const pendingAgent = ({
        ...mockAgent,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'thinking' as const,
            status: 'pending' as const,
            title: 'Pending step',
          },
        ],
      } as unknown as BackgroundAgent);
      
      const markdown = exportAgentAsMarkdown(pendingAgent);
      
      expect(markdown).toContain('Pending step');
      expect(markdown).toContain('⏳');
    });

    it('should handle steps without duration', () => {
      const noDurationAgent = ({
        ...mockAgent,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'thinking' as const,
            status: 'completed' as const,
            title: 'Quick step',
            // No duration
          },
        ],
      } as unknown as BackgroundAgent);
      
      const markdown = exportAgentAsMarkdown(noDurationAgent, { includeDetails: true });
      
      expect(markdown).toContain('Quick step');
      // Should not crash even without duration
    });
  });
});
