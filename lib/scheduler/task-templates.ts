/**
 * Task Templates
 * Pre-configured task templates for common scheduling scenarios
 */

import type { CreateScheduledTaskInput, ScheduledTaskType, TaskTriggerType } from '@/types/scheduler';

export interface TaskTemplate {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  category: 'data' | 'ai' | 'monitoring' | 'automation';
  icon: string;
  taskType: ScheduledTaskType;
  triggerType: TaskTriggerType;
  getInput: () => CreateScheduledTaskInput;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  // ===== Data Category =====
  {
    id: 'daily-backup',
    name: 'Daily Backup',
    nameZh: '每日备份',
    description: 'Back up all data daily at 2 AM',
    descriptionZh: '每天凌晨2点备份所有数据',
    category: 'data',
    icon: '💾',
    taskType: 'backup',
    triggerType: 'cron',
    getInput: () => ({
      name: 'Daily Backup',
      description: 'Automatic daily backup of all data',
      type: 'backup',
      trigger: {
        type: 'cron',
        cronExpression: '0 2 * * *',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      payload: {
        backupType: 'full',
        destination: 'local',
        options: {
          includeSessions: true,
          includeSettings: true,
          includeArtifacts: true,
          includeIndexedDB: true,
        },
      },
      notification: {
        onStart: false,
        onComplete: true,
        onError: true,
        channels: ['toast'],
      },
      tags: ['backup', 'daily', 'auto'],
    }),
  },
  {
    id: 'weekly-sync',
    name: 'Weekly Data Sync',
    nameZh: '每周数据同步',
    description: 'Sync data bidirectionally every Sunday at midnight',
    descriptionZh: '每周日午夜双向同步数据',
    category: 'data',
    icon: '🔄',
    taskType: 'sync',
    triggerType: 'cron',
    getInput: () => ({
      name: 'Weekly Data Sync',
      description: 'Automatic weekly bidirectional data sync',
      type: 'sync',
      trigger: {
        type: 'cron',
        cronExpression: '0 0 * * 0',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      payload: {
        direction: 'bidirectional',
      },
      notification: {
        onStart: false,
        onComplete: true,
        onError: true,
        channels: ['toast'],
      },
      tags: ['sync', 'weekly', 'auto'],
    }),
  },

  // ===== AI Category =====
  {
    id: 'daily-summary',
    name: 'Daily AI Summary',
    nameZh: '每日 AI 摘要',
    description: 'Generate a summary of recent conversations daily at 6 PM',
    descriptionZh: '每天下午6点生成近期对话摘要',
    category: 'ai',
    icon: '📝',
    taskType: 'ai-generation',
    triggerType: 'cron',
    getInput: () => ({
      name: 'Daily AI Summary',
      description: 'Generate a daily summary of recent conversations',
      type: 'ai-generation',
      trigger: {
        type: 'cron',
        cronExpression: '0 18 * * *',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      payload: {
        prompt: 'Summarize the key topics and insights from today\'s conversations.',
        generationType: 'summary',
        outputFormat: 'markdown',
      },
      notification: {
        onStart: false,
        onComplete: true,
        onError: true,
        channels: ['toast'],
      },
      tags: ['ai', 'summary', 'daily'],
    }),
  },
  {
    id: 'scheduled-chat',
    name: 'Scheduled Chat Message',
    nameZh: '定时聊天消息',
    description: 'Send a pre-configured message to a chat session on schedule',
    descriptionZh: '定时向聊天会话发送预设消息',
    category: 'ai',
    icon: '💬',
    taskType: 'chat',
    triggerType: 'cron',
    getInput: () => ({
      name: 'Scheduled Chat',
      description: 'Send a scheduled message and get AI response',
      type: 'chat',
      trigger: {
        type: 'cron',
        cronExpression: '0 9 * * 1-5',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      payload: {
        message: 'What are the most important tasks I should focus on today?',
        autoReply: true,
      },
      notification: {
        onStart: false,
        onComplete: true,
        onError: true,
        channels: ['toast'],
      },
      tags: ['chat', 'daily', 'ai'],
    }),
  },

  // ===== Monitoring Category =====
  {
    id: 'health-check',
    name: 'System Health Check',
    nameZh: '系统健康检查',
    description: 'Run health checks every 30 minutes',
    descriptionZh: '每30分钟运行一次系统健康检查',
    category: 'monitoring',
    icon: '🏥',
    taskType: 'test',
    triggerType: 'cron',
    getInput: () => ({
      name: 'System Health Check',
      description: 'Periodic system health check',
      type: 'test',
      trigger: {
        type: 'cron',
        cronExpression: '*/30 * * * *',
      },
      payload: {
        testType: 'health-check',
      },
      notification: {
        onStart: false,
        onComplete: false,
        onError: true,
        channels: ['toast', 'desktop'],
      },
      tags: ['monitoring', 'health', 'auto'],
    }),
  },
  {
    id: 'api-ping',
    name: 'API Endpoint Monitor',
    nameZh: 'API 端点监控',
    description: 'Ping an API endpoint every 5 minutes to check availability',
    descriptionZh: '每5分钟 ping 一次 API 端点以检查可用性',
    category: 'monitoring',
    icon: '📡',
    taskType: 'test',
    triggerType: 'cron',
    getInput: () => ({
      name: 'API Monitor',
      description: 'Monitor API endpoint availability',
      type: 'test',
      trigger: {
        type: 'cron',
        cronExpression: '*/5 * * * *',
      },
      payload: {
        testType: 'api-ping',
        url: 'https://api.example.com/health',
        expectedStatus: 200,
        timeout: 10000,
      },
      notification: {
        onStart: false,
        onComplete: false,
        onError: true,
        channels: ['toast', 'desktop'],
      },
      tags: ['monitoring', 'api', 'auto'],
    }),
  },
  {
    id: 'provider-check',
    name: 'AI Provider Status Check',
    nameZh: 'AI 提供商状态检查',
    description: 'Check configured AI provider availability every hour',
    descriptionZh: '每小时检查已配置的 AI 提供商可用性',
    category: 'monitoring',
    icon: '🤖',
    taskType: 'test',
    triggerType: 'cron',
    getInput: () => ({
      name: 'Provider Status Check',
      description: 'Check all configured AI providers',
      type: 'test',
      trigger: {
        type: 'cron',
        cronExpression: '0 * * * *',
      },
      payload: {
        testType: 'provider-check',
      },
      notification: {
        onStart: false,
        onComplete: false,
        onError: true,
        channels: ['toast'],
      },
      tags: ['monitoring', 'provider', 'auto'],
    }),
  },

  // ===== Automation Category =====
  {
    id: 'cleanup-executions',
    name: 'Execution History Cleanup',
    nameZh: '执行历史清理',
    description: 'Clean up old execution records weekly',
    descriptionZh: '每周清理旧的执行记录',
    category: 'automation',
    icon: '🧹',
    taskType: 'custom',
    triggerType: 'cron',
    getInput: () => ({
      name: 'Execution History Cleanup',
      description: 'Clean up execution records older than 30 days',
      type: 'custom',
      trigger: {
        type: 'cron',
        cronExpression: '0 3 * * 0',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      payload: {
        handler: 'cleanup-executions',
        args: { maxAgeDays: 30 },
      },
      notification: {
        onStart: false,
        onComplete: false,
        onError: true,
        channels: ['toast'],
      },
      tags: ['maintenance', 'cleanup', 'auto'],
    }),
  },
];

export type TaskTemplateCategory = TaskTemplate['category'];

export const TEMPLATE_CATEGORIES: Array<{ value: TaskTemplateCategory; label: string; labelZh: string }> = [
  { value: 'data', label: 'Data & Backup', labelZh: '数据与备份' },
  { value: 'ai', label: 'AI & Chat', labelZh: 'AI 与聊天' },
  { value: 'monitoring', label: 'Monitoring', labelZh: '监控' },
  { value: 'automation', label: 'Automation', labelZh: '自动化' },
];

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category?: TaskTemplateCategory): TaskTemplate[] {
  if (!category) return TASK_TEMPLATES;
  return TASK_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): TaskTemplate | undefined {
  return TASK_TEMPLATES.find((t) => t.id === id);
}
