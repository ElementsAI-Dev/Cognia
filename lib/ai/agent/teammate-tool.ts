/**
 * TeammateTool - Allows AI agents to create and manage agent teams during conversation
 *
 * Provides agent tools that can be registered into the agent-tools system,
 * enabling the AI to spawn teams, add teammates, assign tasks, send messages,
 * and query team status programmatically.
 *
 * Inspired by Claude Code's TeammateTool pattern where the lead agent
 * can dynamically spawn and coordinate teammates.
 */

import { z } from 'zod';
import type { AgentTool } from './agent-executor';
import {
  getAgentTeamManager,
  createTeamFromTemplate,
} from './agent-team';
import type {
  TeamExecutionMode,
  AgentTeamTemplate,
} from '@/types/agent/agent-team';
import type { SubAgentPriority } from '@/types/agent/sub-agent';
import { loggers } from '@/lib/logger';

const log = loggers.agent;

// ============================================================================
// Tool: spawn_team
// ============================================================================

export function createSpawnTeamTool(): AgentTool {
  return {
    name: 'spawn_team',
    description: `Create a new agent team to collaboratively solve a complex task. Use this when a task would benefit from multiple specialized agents working in parallel. You can specify teammates with different specializations.

Example use cases:
- Code review from multiple angles (security, performance, testing)
- Research from multiple perspectives
- Debugging with competing hypotheses
- Cross-layer feature implementation`,
    parameters: z.object({
      name: z.string().describe('Team name'),
      task: z.string().describe('The main task to accomplish'),
      description: z.string().optional().describe('Team description/purpose'),
      executionMode: z.enum(['coordinated', 'autonomous', 'delegate']).optional()
        .describe('coordinated: lead assigns tasks; autonomous: teammates self-claim; delegate: lead only delegates'),
      teammates: z.array(z.object({
        name: z.string().describe('Teammate name'),
        description: z.string().describe('Role description'),
        specialization: z.string().optional().describe('Area of expertise (e.g., security, performance, testing)'),
      })).min(1).describe('List of teammates to create'),
      tokenBudget: z.number().optional().describe('Total token budget for the team'),
    }),
    execute: async (args) => {
      const manager = getAgentTeamManager();
      if (!manager) {
        return { error: 'Agent team manager not initialized' };
      }

      try {
        const { name, task, description, executionMode, teammates, tokenBudget } = args as {
          name: string;
          task: string;
          description?: string;
          executionMode?: TeamExecutionMode;
          teammates: Array<{ name: string; description: string; specialization?: string }>;
          tokenBudget?: number;
        };

        const team = manager.createTeam({
          name,
          task,
          description,
          config: {
            executionMode: executionMode || 'coordinated',
            tokenBudget,
          },
        });

        // Add teammates
        const addedTeammates = [];
        for (const tm of teammates) {
          const teammate = manager.addTeammate({
            teamId: team.id,
            name: tm.name,
            description: tm.description,
            config: { specialization: tm.specialization },
          });
          if (teammate) {
            addedTeammates.push({ id: teammate.id, name: teammate.name });
          }
        }

        log.info('Team spawned via tool', { teamId: team.id, teammates: addedTeammates.length });

        return {
          success: true,
          teamId: team.id,
          teamName: team.name,
          teammates: addedTeammates,
          message: `Team "${name}" created with ${addedTeammates.length} teammates. Use assign_task to add tasks, then the team will execute automatically.`,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to spawn team';
        log.error('spawn_team failed', { error: msg });
        return { error: msg };
      }
    },
  };
}

// ============================================================================
// Tool: spawn_teammate
// ============================================================================

export function createSpawnTeammateTool(): AgentTool {
  return {
    name: 'spawn_teammate',
    description: 'Add a new teammate to an existing agent team at runtime. Useful for dynamically scaling the team when new expertise is needed.',
    parameters: z.object({
      teamId: z.string().describe('ID of the team to add the teammate to'),
      name: z.string().describe('Teammate name'),
      description: z.string().describe('Role and purpose description'),
      specialization: z.string().optional().describe('Area of expertise'),
      spawnPrompt: z.string().optional().describe('Special instructions from the lead'),
    }),
    execute: async (args) => {
      const manager = getAgentTeamManager();
      if (!manager) {
        return { error: 'Agent team manager not initialized' };
      }

      try {
        const { teamId, name, description, specialization, spawnPrompt } = args as {
          teamId: string;
          name: string;
          description: string;
          specialization?: string;
          spawnPrompt?: string;
        };

        const teammate = manager.addTeammate({
          teamId,
          name,
          description,
          config: { specialization },
          spawnPrompt,
        });

        if (!teammate) {
          return { error: 'Failed to add teammate. Team may be full or not found.' };
        }

        return {
          success: true,
          teammateId: teammate.id,
          name: teammate.name,
          message: `Teammate "${name}" added to team.`,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to spawn teammate';
        return { error: msg };
      }
    },
  };
}

// ============================================================================
// Tool: assign_task
// ============================================================================

export function createAssignTaskTool(): AgentTool {
  return {
    name: 'assign_task',
    description: 'Create and assign a task to the team\'s shared task list. Tasks can have dependencies on other tasks and be assigned to specific teammates.',
    parameters: z.object({
      teamId: z.string().describe('ID of the team'),
      title: z.string().describe('Task title'),
      description: z.string().describe('Detailed task description/prompt for the teammate'),
      priority: z.enum(['critical', 'high', 'normal', 'low', 'background']).optional()
        .describe('Task priority level'),
      assignedTo: z.string().optional().describe('Teammate ID to assign to (optional, auto-assigned if omitted)'),
      dependencies: z.array(z.string()).optional().describe('Task IDs that must complete before this task'),
      tags: z.array(z.string()).optional().describe('Tags for categorization and specialization matching'),
    }),
    execute: async (args) => {
      const manager = getAgentTeamManager();
      if (!manager) {
        return { error: 'Agent team manager not initialized' };
      }

      try {
        const { teamId, title, description, priority, assignedTo, dependencies, tags } = args as {
          teamId: string;
          title: string;
          description: string;
          priority?: SubAgentPriority;
          assignedTo?: string;
          dependencies?: string[];
          tags?: string[];
        };

        const task = manager.createTask({
          teamId,
          title,
          description,
          priority,
          assignedTo,
          dependencies,
          tags,
        });

        return {
          success: true,
          taskId: task.id,
          title: task.title,
          status: task.status,
          message: `Task "${title}" created${assignedTo ? ' and assigned' : ''}.`,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to assign task';
        return { error: msg };
      }
    },
  };
}

// ============================================================================
// Tool: send_team_message
// ============================================================================

export function createSendTeamMessageTool(): AgentTool {
  return {
    name: 'send_team_message',
    description: 'Send a message to a specific teammate or broadcast to all teammates. Use for coordination, sharing context, or providing feedback.',
    parameters: z.object({
      teamId: z.string().describe('ID of the team'),
      senderId: z.string().describe('ID of the sending teammate'),
      content: z.string().describe('Message content'),
      recipientId: z.string().optional().describe('Specific teammate ID (omit for broadcast)'),
    }),
    execute: async (args) => {
      const manager = getAgentTeamManager();
      if (!manager) {
        return { error: 'Agent team manager not initialized' };
      }

      try {
        const { teamId, senderId, content, recipientId } = args as {
          teamId: string;
          senderId: string;
          content: string;
          recipientId?: string;
        };

        const message = manager.sendMessage({
          teamId,
          senderId,
          content,
          recipientId,
          type: recipientId ? 'direct' : 'broadcast',
        });

        return {
          success: true,
          messageId: message.id,
          type: message.type,
          message: recipientId
            ? `Message sent to ${message.recipientName}`
            : 'Message broadcast to all teammates',
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to send message';
        return { error: msg };
      }
    },
  };
}

// ============================================================================
// Tool: get_team_status
// ============================================================================

export function createGetTeamStatusTool(): AgentTool {
  return {
    name: 'get_team_status',
    description: 'Get the current status of an agent team, including teammate statuses, task progress, and token usage.',
    parameters: z.object({
      teamId: z.string().describe('ID of the team to check'),
    }),
    execute: async (args) => {
      const manager = getAgentTeamManager();
      if (!manager) {
        return { error: 'Agent team manager not initialized' };
      }

      try {
        const { teamId } = args as { teamId: string };

        const team = manager.getTeam(teamId);
        if (!team) {
          return { error: `Team not found: ${teamId}` };
        }

        const teammates = manager.getTeammates(teamId).map(tm => ({
          id: tm.id,
          name: tm.name,
          status: tm.status,
          progress: tm.progress,
          currentTask: tm.currentTaskId,
          completedTasks: tm.completedTaskIds.length,
          tokenUsage: tm.tokenUsage,
        }));

        const tasks = manager.getTeamTasks(teamId).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assignedTo: t.assignedTo,
          claimedBy: t.claimedBy,
          result: t.result?.slice(0, 200),
          retryCount: t.retryCount,
        }));

        return {
          team: {
            id: team.id,
            name: team.name,
            status: team.status,
            progress: team.progress,
            totalTokenUsage: team.totalTokenUsage,
            executionMode: team.config.executionMode,
          },
          teammates,
          tasks,
          summary: {
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.status === 'completed').length,
            failedTasks: tasks.filter(t => t.status === 'failed').length,
            pendingTasks: tasks.filter(t => t.status === 'pending').length,
            inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
          },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to get team status';
        return { error: msg };
      }
    },
  };
}

// ============================================================================
// Tool: shutdown_teammate
// ============================================================================

export function createShutdownTeammateTool(): AgentTool {
  return {
    name: 'shutdown_teammate',
    description: 'Shut down a specific teammate or remove them from the team. Their unfinished tasks will be reassigned.',
    parameters: z.object({
      teammateId: z.string().describe('ID of the teammate to shut down'),
    }),
    execute: async (args) => {
      const manager = getAgentTeamManager();
      if (!manager) {
        return { error: 'Agent team manager not initialized' };
      }

      try {
        const { teammateId } = args as { teammateId: string };
        manager.shutdownTeammate(teammateId);

        return {
          success: true,
          message: `Teammate ${teammateId} has been shut down.`,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to shutdown teammate';
        return { error: msg };
      }
    },
  };
}

// ============================================================================
// Tool: spawn_team_from_template
// ============================================================================

export function createSpawnTeamFromTemplateTool(templates: AgentTeamTemplate[]): AgentTool {
  const templateList = templates.map(t => `- ${t.id}: ${t.name} (${t.category}) - ${t.description}`).join('\n');

  return {
    name: 'spawn_team_from_template',
    description: `Create a team from a predefined template. Available templates:\n${templateList}`,
    parameters: z.object({
      templateId: z.string().describe('Template ID to use'),
      task: z.string().describe('The main task for the team'),
      name: z.string().optional().describe('Custom team name (uses template name if omitted)'),
    }),
    execute: async (args) => {
      const manager = getAgentTeamManager();
      if (!manager) {
        return { error: 'Agent team manager not initialized' };
      }

      try {
        const { templateId, task, name } = args as {
          templateId: string;
          task: string;
          name?: string;
        };

        const template = templates.find(t => t.id === templateId);
        if (!template) {
          return { error: `Template not found: ${templateId}. Available: ${templates.map(t => t.id).join(', ')}` };
        }

        const team = createTeamFromTemplate(template, task, name);
        if (!team) {
          return { error: 'Failed to create team from template' };
        }

        return {
          success: true,
          teamId: team.id,
          teamName: team.name,
          teammateCount: team.teammateIds.length - 1, // Exclude lead
          message: `Team "${team.name}" created from template "${template.name}".`,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to spawn team from template';
        return { error: msg };
      }
    },
  };
}

// ============================================================================
// Registry: Get all team tools
// ============================================================================

/**
 * Create all agent team tools for registration in the agent-tools system
 */
export function createTeamTools(templates?: AgentTeamTemplate[]): Record<string, AgentTool> {
  const tools: Record<string, AgentTool> = {
    spawn_team: createSpawnTeamTool(),
    spawn_teammate: createSpawnTeammateTool(),
    assign_task: createAssignTaskTool(),
    send_team_message: createSendTeamMessageTool(),
    get_team_status: createGetTeamStatusTool(),
    shutdown_teammate: createShutdownTeammateTool(),
  };

  if (templates && templates.length > 0) {
    tools.spawn_team_from_template = createSpawnTeamFromTemplateTool(templates);
  }

  return tools;
}

/**
 * Get system prompt additions for team tools
 */
export function getTeamToolsSystemPrompt(): string {
  return `
## Agent Team Tools
You have access to tools for creating and managing agent teams. Use teams when:
- A task requires multiple specialized perspectives (e.g., security + performance review)
- Work can be parallelized across independent subtasks
- Competing hypotheses need simultaneous investigation
- Cross-functional collaboration would improve results

Team workflow:
1. Use spawn_team or spawn_team_from_template to create a team
2. Use assign_task to add tasks (or let task decomposition handle it automatically)
3. The team will execute tasks based on its execution mode
4. Use get_team_status to monitor progress
5. Results are synthesized automatically when all tasks complete
`.trim();
}
