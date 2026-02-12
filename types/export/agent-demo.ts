/**
 * Types for AgentDemoPreview component
 */

import type { BackgroundAgent } from '@/types/agent/background-agent';

export type AgentDemoExportFormat = 'html' | 'markdown';

export interface StepStatusConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export interface AgentDemoStats {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: number;
  toolCalls: number;
}

export interface AgentDemoPreviewProps {
  agent: BackgroundAgent;
  trigger?: React.ReactNode;
}
