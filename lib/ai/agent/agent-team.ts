/**
 * AgentTeam Manager - Coordinate multiple agent instances as a team
 *
 * Features:
 * - Team lead + teammates coordination
 * - Shared task list with dependency management
 * - Inter-agent messaging (direct + broadcast)
 * - Plan approval workflow
 * - Automatic task decomposition via LLM
 * - Result synthesis from all teammates
 * - Token usage tracking
 *
 * Reuses existing infrastructure:
 * - executeAgent from agent-executor for teammate execution
 * - AgentOrchestrator patterns for planning
 * - SubAgent types for token tracking
 */

import { nanoid } from 'nanoid';
import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from '../core/client';
import { executeAgent, type AgentConfig, type AgentTool } from './agent-executor';
import {
  DEFAULT_TEAM_CONFIG,
  type AgentTeam,
  type AgentTeammate,
  type AgentTeamTask,
  type AgentTeamMessage,
  type AgentTeamConfig,
  type AgentTeamEvent,
  type AgentTeamTemplate,
  type TeamTaskStatus,
  type TeamExecutionOptions,
  type CreateTeamInput,
  type AddTeammateInput,
  type CreateTaskInput,
  type SendMessageInput,
} from '@/types/agent/agent-team';
import type { SubAgentTokenUsage } from '@/types/agent/sub-agent';
import { loggers } from '@/lib/logger';

const log = loggers.agent;

// ============================================================================
// Prompts
// ============================================================================

const TEAM_PLANNING_PROMPT = `You are a team lead coordinating multiple AI agents. Analyze the given task and decompose it into subtasks for your team members.

Team Members:
{{teammates}}

For each subtask, provide:
1. A clear title
2. A detailed description (the prompt for the teammate)
3. Which teammate it should be assigned to (by name)
4. Dependencies on other tasks (by title)
5. Priority (critical, high, normal, low, background)
6. Estimated complexity (simple, moderate, complex)

Consider:
- Each teammate's specialization and strengths
- Which tasks can be done in parallel
- Dependencies and ordering
- Avoid assigning the same files/resources to multiple teammates

Output JSON:
{
  "reasoning": "Brief explanation of your decomposition strategy",
  "tasks": [
    {
      "title": "Task Title",
      "description": "Detailed task prompt for the teammate",
      "assignedTo": "Teammate Name",
      "dependencies": ["Other Task Title"],
      "priority": "normal",
      "tags": ["tag1"]
    }
  ]
}

Task to decompose:
`;

const TEAM_SYNTHESIS_PROMPT = `You are a team lead synthesizing results from your team members. Combine the following results into a coherent, comprehensive response.

Original Task: {{task}}

Team Results:
{{results}}

Provide a unified response that:
1. Synthesizes all findings from team members
2. Resolves any conflicts or inconsistencies
3. Highlights key insights from each team member
4. Presents the information clearly and actionably
5. Notes any areas of agreement or disagreement
`;

const PLAN_REVIEW_PROMPT = `You are a team lead reviewing a teammate's proposed plan. Evaluate whether the plan is sound and should be approved.

Original Task: {{task}}
Teammate: {{teammateName}} ({{teammateDescription}})
Proposed Plan: {{plan}}

Evaluation criteria:
{{criteria}}

Respond with JSON:
{
  "approved": true/false,
  "feedback": "Specific feedback for the teammate",
  "suggestions": ["Optional suggestions for improvement"]
}
`;

// ============================================================================
// AgentTeamManager
// ============================================================================

/**
 * Manager for coordinating agent teams
 */
export class AgentTeamManager {
  private teams: Map<string, AgentTeam> = new Map();
  private teammates: Map<string, AgentTeammate> = new Map();
  private tasks: Map<string, AgentTeamTask> = new Map();
  private messages: Map<string, AgentTeamMessage> = new Map();
  private activeExecutions: Map<string, AbortController> = new Map();
  private globalTools: Record<string, AgentTool> = {};

  constructor(tools?: Record<string, AgentTool>) {
    if (tools) {
      this.globalTools = tools;
    }
  }

  // ==========================================================================
  // Team Management
  // ==========================================================================

  /**
   * Create a new team
   */
  createTeam(input: CreateTeamInput): AgentTeam {
    const config: AgentTeamConfig = {
      ...DEFAULT_TEAM_CONFIG,
      ...input.config,
    };

    const teamId = nanoid();

    // Create the lead teammate
    const lead: AgentTeammate = {
      id: nanoid(),
      teamId,
      name: 'Team Lead',
      description: 'Coordinates team work, assigns tasks, and synthesizes results',
      role: 'lead',
      status: 'idle',
      config: {
        provider: config.defaultProvider,
        model: config.defaultModel,
        apiKey: config.defaultApiKey,
        baseURL: config.defaultBaseURL,
        temperature: config.defaultTemperature,
        maxSteps: config.defaultMaxSteps,
        timeout: config.defaultTimeout,
      },
      completedTaskIds: [],
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      progress: 0,
      createdAt: new Date(),
    };

    this.teammates.set(lead.id, lead);

    const team: AgentTeam = {
      id: teamId,
      name: input.name,
      description: input.description || '',
      task: input.task,
      status: 'idle',
      config,
      leadId: lead.id,
      teammateIds: [lead.id],
      taskIds: [],
      messageIds: [],
      progress: 0,
      totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      createdAt: new Date(),
      sessionId: input.sessionId,
      metadata: input.metadata,
    };

    this.teams.set(teamId, team);

    log.info('Team created', { teamId, name: input.name });
    return team;
  }

  /**
   * Add a teammate to a team
   */
  addTeammate(input: AddTeammateInput): AgentTeammate | null {
    const team = this.teams.get(input.teamId);
    if (!team) {
      log.error('Team not found', { teamId: input.teamId });
      return null;
    }

    if (team.teammateIds.length >= team.config.maxTeammates) {
      log.warn('Team is full', { teamId: input.teamId, max: team.config.maxTeammates });
      return null;
    }

    const teammate: AgentTeammate = {
      id: nanoid(),
      teamId: input.teamId,
      name: input.name,
      description: input.description || '',
      role: input.role || 'teammate',
      status: 'idle',
      config: input.config || {},
      spawnPrompt: input.spawnPrompt,
      completedTaskIds: [],
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      progress: 0,
      createdAt: new Date(),
    };

    this.teammates.set(teammate.id, teammate);
    team.teammateIds.push(teammate.id);

    log.info('Teammate added', { teamId: input.teamId, teammateId: teammate.id, name: input.name });
    return teammate;
  }

  /**
   * Remove a teammate from a team (cannot remove lead)
   */
  removeTeammate(teammateId: string): boolean {
    const teammate = this.teammates.get(teammateId);
    if (!teammate || teammate.role === 'lead') return false;

    const team = this.teams.get(teammate.teamId);
    if (!team) return false;

    // Cancel any active execution
    this.shutdownTeammate(teammateId);

    // Remove from team
    team.teammateIds = team.teammateIds.filter(id => id !== teammateId);

    // Unassign any tasks
    for (const taskId of team.taskIds) {
      const task = this.tasks.get(taskId);
      if (task && (task.assignedTo === teammateId || task.claimedBy === teammateId)) {
        task.assignedTo = undefined;
        task.claimedBy = undefined;
        if (task.status === 'claimed' || task.status === 'in_progress') {
          task.status = 'pending';
        }
      }
    }

    this.teammates.delete(teammateId);
    return true;
  }

  // ==========================================================================
  // Task Management
  // ==========================================================================

  /**
   * Create a new task in the shared task list
   */
  createTask(input: CreateTaskInput): AgentTeamTask {
    const team = this.teams.get(input.teamId);
    const task: AgentTeamTask = {
      id: nanoid(),
      teamId: input.teamId,
      title: input.title,
      description: input.description,
      status: this.hasUnmetDependencies(input.dependencies || [], input.teamId) ? 'blocked' : 'pending',
      priority: input.priority || 'normal',
      assignedTo: input.assignedTo,
      dependencies: input.dependencies || [],
      tags: input.tags || [],
      expectedOutput: input.expectedOutput,
      createdAt: new Date(),
      estimatedDuration: input.estimatedDuration,
      order: input.order ?? (team?.taskIds.length || 0),
      metadata: input.metadata,
    };

    this.tasks.set(task.id, task);
    if (team) {
      team.taskIds.push(task.id);
    }

    log.info('Task created', { taskId: task.id, teamId: input.teamId, title: input.title });
    return task;
  }

  /**
   * Claim a task (teammate self-assigns)
   */
  claimTask(taskId: string, teammateId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return false;

    const teammate = this.teammates.get(teammateId);
    if (!teammate) return false;

    task.claimedBy = teammateId;
    task.status = 'claimed';

    log.info('Task claimed', { taskId, teammateId });
    return true;
  }

  /**
   * Assign a task to a specific teammate (lead assigns)
   */
  assignTask(taskId: string, teammateId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const teammate = this.teammates.get(teammateId);
    if (!teammate) return false;

    task.assignedTo = teammateId;
    if (task.status === 'pending' || task.status === 'blocked') {
      task.status = this.hasUnmetDependencies(task.dependencies, task.teamId) ? 'blocked' : 'pending';
    }

    log.info('Task assigned', { taskId, teammateId });
    return true;
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: TeamTaskStatus, result?: string, error?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = status;
    if (result) task.result = result;
    if (error) task.error = error;

    if (status === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date();
    }
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      task.completedAt = new Date();
      if (task.startedAt) {
        task.actualDuration = task.completedAt.getTime() - task.startedAt.getTime();
      }
    }

    // When a task completes, unblock dependent tasks
    if (status === 'completed') {
      this.unblockDependentTasks(taskId, task.teamId);
    }
  }

  /**
   * Get available tasks (pending + no unmet dependencies) for a teammate
   */
  getAvailableTasks(teamId: string, teammateId?: string): AgentTeamTask[] {
    const team = this.teams.get(teamId);
    if (!team) return [];

    return team.taskIds
      .map(id => this.tasks.get(id))
      .filter((task): task is AgentTeamTask => {
        if (!task) return false;
        if (task.status !== 'pending') return false;
        // If assigned to someone specific, only show to that teammate
        if (task.assignedTo && teammateId && task.assignedTo !== teammateId) return false;
        return true;
      })
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3, background: 4 };
        return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2) || a.order - b.order;
      });
  }

  // ==========================================================================
  // Messaging
  // ==========================================================================

  /**
   * Send a message between teammates
   */
  sendMessage(input: SendMessageInput): AgentTeamMessage {
    const sender = this.teammates.get(input.senderId);
    const recipient = input.recipientId ? this.teammates.get(input.recipientId) : undefined;

    const message: AgentTeamMessage = {
      id: nanoid(),
      teamId: input.teamId,
      type: input.type || (input.recipientId ? 'direct' : 'broadcast'),
      senderId: input.senderId,
      senderName: sender?.name || 'Unknown',
      recipientId: input.recipientId,
      recipientName: recipient?.name,
      content: input.content,
      taskId: input.taskId,
      read: false,
      timestamp: new Date(),
      metadata: input.metadata,
    };

    this.messages.set(message.id, message);

    const team = this.teams.get(input.teamId);
    if (team) {
      team.messageIds.push(message.id);
    }

    return message;
  }

  /**
   * Get unread messages for a teammate
   */
  getUnreadMessages(teammateId: string): AgentTeamMessage[] {
    return Array.from(this.messages.values()).filter(msg => {
      if (msg.read) return false;
      // Direct messages to this teammate
      if (msg.recipientId === teammateId) return true;
      // Broadcasts (not from self)
      if (msg.type === 'broadcast' && msg.senderId !== teammateId) return true;
      return false;
    });
  }

  /**
   * Mark messages as read
   */
  markMessagesRead(messageIds: string[]): void {
    for (const id of messageIds) {
      const msg = this.messages.get(id);
      if (msg) msg.read = true;
    }
  }

  // ==========================================================================
  // Team Execution
  // ==========================================================================

  /**
   * Execute a team - the main entry point
   */
  async executeTeam(
    teamId: string,
    options: TeamExecutionOptions = {}
  ): Promise<AgentTeam> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error(`Team not found: ${teamId}`);

    const abortController = new AbortController();
    this.activeExecutions.set(teamId, abortController);

    team.status = 'planning';
    team.startedAt = new Date();
    this.emitEvent(team, 'team_started', options);

    try {
      // Phase 1: Generate task decomposition if no tasks exist
      if (team.taskIds.length === 0) {
        options.onProgress?.(5, 'Decomposing task for the team...');
        await this.decomposeTask(team, options);
      }

      if (abortController.signal.aborted) throw new Error('Team execution cancelled');

      // Phase 2: Execute teammates
      team.status = 'executing';
      options.onProgress?.(10, 'Starting teammates...');
      await this.executeTeammates(team, options, abortController.signal);

      if (abortController.signal.aborted) throw new Error('Team execution cancelled');

      // Phase 3: Synthesize results
      options.onProgress?.(90, 'Synthesizing results...');
      const finalResult = await this.synthesizeResults(team);
      team.finalResult = finalResult;

      // Complete
      team.status = 'completed';
      team.completedAt = new Date();
      team.totalDuration = team.completedAt.getTime() - (team.startedAt?.getTime() || 0);
      team.progress = 100;

      // Aggregate token usage
      this.aggregateTokenUsage(team);

      this.emitEvent(team, 'team_completed', options);
      options.onProgress?.(100, 'Team completed');
      options.onComplete?.(team);

      log.info('Team completed', { teamId, duration: team.totalDuration });
      return team;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Team execution failed';

      if (errorMessage === 'Team execution cancelled') {
        team.status = 'cancelled';
      } else {
        team.status = 'failed';
        team.error = errorMessage;
      }

      team.completedAt = new Date();
      team.totalDuration = team.completedAt.getTime() - (team.startedAt?.getTime() || 0);

      this.emitEvent(team, team.status === 'cancelled' ? 'team_cancelled' : 'team_failed', options);
      options.onError?.(errorMessage);

      log.error('Team execution failed', { teamId, error: errorMessage });
      return team;
    } finally {
      this.activeExecutions.delete(teamId);

      // Auto-shutdown teammates if configured
      if (team.config.autoShutdown) {
        this.shutdownAllTeammates(teamId);
      }
    }
  }

  /**
   * Decompose the main task into subtasks using LLM
   */
  private async decomposeTask(
    team: AgentTeam,
    options: TeamExecutionOptions
  ): Promise<void> {
    const lead = this.teammates.get(team.leadId);
    if (!lead) throw new Error('Team lead not found');

    const config = this.resolveTeammateModelConfig(lead, team.config);

    // Build teammate descriptions for the planning prompt
    const teammateDescriptions = team.teammateIds
      .filter(id => id !== team.leadId)
      .map(id => {
        const tm = this.teammates.get(id);
        if (!tm) return '';
        return `- ${tm.name}: ${tm.description}${tm.config.specialization ? ` (Specialization: ${tm.config.specialization})` : ''}`;
      })
      .filter(Boolean)
      .join('\n');

    const prompt = TEAM_PLANNING_PROMPT
      .replace('{{teammates}}', teammateDescriptions || 'No specific teammates defined yet')
      + team.task;

    const modelInstance = getProviderModel(
      config.provider,
      config.model,
      config.apiKey,
      config.baseURL
    );

    const result = await generateText({
      model: modelInstance,
      prompt,
      temperature: 0.3,
    });

    // Parse tasks from LLM response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse task decomposition response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const taskDefs = parsed.tasks || [];

    // Build name-to-id map for teammates
    const nameToTeammateId = new Map<string, string>();
    for (const id of team.teammateIds) {
      const tm = this.teammates.get(id);
      if (tm) nameToTeammateId.set(tm.name.toLowerCase(), id);
    }

    // Build title-to-id map for dependency resolution
    const titleToTaskId = new Map<string, string>();

    // First pass: create tasks
    for (let i = 0; i < taskDefs.length; i++) {
      const def = taskDefs[i];
      const assignedTeammateId = def.assignedTo
        ? nameToTeammateId.get(def.assignedTo.toLowerCase())
        : undefined;

      const task = this.createTask({
        teamId: team.id,
        title: def.title,
        description: def.description,
        priority: def.priority || 'normal',
        tags: def.tags || [],
        assignedTo: assignedTeammateId,
        order: i,
      });

      titleToTaskId.set(def.title.toLowerCase(), task.id);
      this.emitEvent(team, 'task_created', options, undefined, task.id);
    }

    // Second pass: resolve dependencies
    for (const def of taskDefs) {
      if (def.dependencies && def.dependencies.length > 0) {
        const taskId = titleToTaskId.get(def.title.toLowerCase());
        if (!taskId) continue;

        const task = this.tasks.get(taskId);
        if (!task) continue;

        task.dependencies = def.dependencies
          .map((depTitle: string) => titleToTaskId.get(depTitle.toLowerCase()))
          .filter((id: string | undefined): id is string => id !== undefined);

        // Update blocked status
        if (this.hasUnmetDependencies(task.dependencies, team.id)) {
          task.status = 'blocked';
        }
      }
    }

    // Track lead token usage
    if (result.usage) {
      const usage = result.usage as Record<string, number>;
      lead.tokenUsage.promptTokens += usage.promptTokens ?? 0;
      lead.tokenUsage.completionTokens += usage.completionTokens ?? 0;
      lead.tokenUsage.totalTokens += usage.totalTokens ?? 0;
    }

    log.info('Task decomposition complete', { teamId: team.id, taskCount: taskDefs.length });
  }

  /**
   * Execute all teammates on their assigned tasks
   */
  private async executeTeammates(
    team: AgentTeam,
    options: TeamExecutionOptions,
    signal: AbortSignal
  ): Promise<void> {
    const teammateIds = team.teammateIds.filter(id => id !== team.leadId);
    const maxConcurrent = team.config.maxConcurrentTeammates;

    // Execute in batches respecting concurrency
    let completedCount = 0;
    const totalTasks = team.taskIds.length;

    while (!signal.aborted) {
      // Check if all tasks are done
      const allTasks = team.taskIds.map(id => this.tasks.get(id)).filter(Boolean) as AgentTeamTask[];
      const pendingTasks = allTasks.filter(t =>
        t.status === 'pending' || t.status === 'claimed' || t.status === 'in_progress' || t.status === 'blocked'
      );

      if (pendingTasks.length === 0) break;

      // Find available tasks
      const availableTasks = allTasks.filter(t => t.status === 'pending');
      if (availableTasks.length === 0 && pendingTasks.every(t => t.status === 'blocked')) {
        // Deadlock detection
        log.warn('Potential deadlock detected', { teamId: team.id });
        break;
      }

      if (availableTasks.length === 0) {
        // Wait for in-progress tasks to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      // Get idle teammates
      const idleTeammates = teammateIds
        .map(id => this.teammates.get(id))
        .filter((tm): tm is AgentTeammate =>
          tm !== undefined && (tm.status === 'idle' || tm.status === 'completed')
        );

      // Determine how many to start (respect concurrency)
      const activeCount = teammateIds
        .map(id => this.teammates.get(id))
        .filter(tm => tm?.status === 'executing' || tm?.status === 'planning').length;

      const slotsAvailable = maxConcurrent - activeCount;
      const toStart = Math.min(slotsAvailable, availableTasks.length, idleTeammates.length);

      if (toStart === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      // Start teammates on available tasks
      const executions: Promise<void>[] = [];
      for (let i = 0; i < toStart; i++) {
        const task = availableTasks[i];
        let teammate: AgentTeammate | undefined;

        // If task is assigned to a specific teammate, use them
        if (task.assignedTo) {
          teammate = this.teammates.get(task.assignedTo);
          if (teammate && teammate.status !== 'idle' && teammate.status !== 'completed') {
            teammate = undefined; // Assigned teammate is busy
          }
        }

        // Otherwise use any idle teammate
        if (!teammate) {
          teammate = idleTeammates[i];
        }

        if (!teammate) continue;

        // Claim and start
        task.claimedBy = teammate.id;
        task.status = 'in_progress';
        task.startedAt = new Date();
        teammate.currentTaskId = task.id;

        executions.push(
          this.executeTeammateOnTask(team, teammate, task, options, signal)
            .then(() => {
              completedCount++;
              const progress = 10 + Math.round((completedCount / totalTasks) * 80);
              team.progress = progress;
              options.onProgress?.(progress, `Completed ${completedCount}/${totalTasks} tasks`);
            })
        );
      }

      // Wait for at least one to complete
      if (executions.length > 0) {
        await Promise.race(executions);
      }

      // Small delay to prevent tight loop
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Execute a single teammate on a task
   */
  private async executeTeammateOnTask(
    team: AgentTeam,
    teammate: AgentTeammate,
    task: AgentTeamTask,
    options: TeamExecutionOptions,
    signal: AbortSignal
  ): Promise<void> {
    teammate.status = 'executing';
    teammate.lastActiveAt = new Date();
    this.emitEvent(team, 'teammate_started', options, teammate.id);
    this.emitEvent(team, 'task_started', options, teammate.id, task.id);
    options.onTeammateStart?.(teammate);

    try {
      // Handle plan approval workflow
      if (teammate.config.requirePlanApproval || team.config.requirePlanApproval) {
        await this.handlePlanApproval(team, teammate, task, options, signal);
      }

      if (signal.aborted) throw new Error('Team execution cancelled');

      // Build the system prompt for this teammate
      const systemPrompt = this.buildTeammateSystemPrompt(team, teammate, task);

      // Resolve model config
      const config = this.resolveTeammateModelConfig(teammate, team.config);

      // Build agent config reusing existing executeAgent
      const agentConfig: AgentConfig = {
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        systemPrompt,
        temperature: teammate.config.temperature ?? team.config.defaultTemperature ?? 0.7,
        maxSteps: teammate.config.maxSteps ?? team.config.defaultMaxSteps ?? 15,
        tools: this.globalTools,
        agentName: teammate.name,
        onStepStart: (step) => {
          if (signal.aborted) throw new Error('Team execution cancelled');
          teammate.progress = Math.min(90, (step / (teammate.config.maxSteps || 15)) * 100);
          teammate.lastActivity = `Step ${step}`;
        },
        onStepComplete: (step, _response) => {
          teammate.lastActivity = `Completed step ${step}`;
          teammate.lastActiveAt = new Date();
        },
        onError: (error) => {
          log.error('Teammate step error', {
            teammateId: teammate.id,
            error: error.message,
          });
        },
      };

      // Execute the agent
      const result = await executeAgent(task.description, agentConfig);

      // Update token usage
      if (result.steps.length > 0) {
        for (const step of result.steps) {
          if (step.usage) {
            teammate.tokenUsage.promptTokens += step.usage.promptTokens;
            teammate.tokenUsage.completionTokens += step.usage.completionTokens;
            teammate.tokenUsage.totalTokens += step.usage.totalTokens;
          }
        }
        task.tokenUsage = { ...teammate.tokenUsage };
      }

      // Update task
      this.updateTaskStatus(
        task.id,
        result.success ? 'completed' : 'failed',
        result.finalResponse,
        result.error
      );

      // Update teammate
      teammate.status = result.success ? 'completed' : 'failed';
      teammate.completedTaskIds.push(task.id);
      teammate.currentTaskId = undefined;
      teammate.progress = 100;
      teammate.error = result.error;
      teammate.lastActiveAt = new Date();

      if (result.success) {
        this.emitEvent(team, 'teammate_completed', options, teammate.id, task.id);
        this.emitEvent(team, 'task_completed', options, teammate.id, task.id);
        options.onTeammateComplete?.(teammate);
        options.onTaskComplete?.(task);

        // Share results with other teammates via messaging
        if (team.config.enableMessaging) {
          this.sendMessage({
            teamId: team.id,
            senderId: teammate.id,
            type: 'result_share',
            content: `Completed task "${task.title}": ${result.finalResponse.slice(0, 500)}`,
            taskId: task.id,
          });
        }
      } else {
        this.emitEvent(team, 'teammate_failed', options, teammate.id, task.id);
        this.emitEvent(team, 'task_failed', options, teammate.id, task.id);
        options.onTeammateError?.(teammate, result.error || 'Unknown error');
      }

      // Reset teammate to idle for next task
      if (result.success) {
        teammate.status = 'idle';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Teammate execution failed';
      teammate.status = 'failed';
      teammate.error = errorMessage;
      teammate.currentTaskId = undefined;

      this.updateTaskStatus(task.id, 'failed', undefined, errorMessage);
      this.emitEvent(team, 'teammate_failed', options, teammate.id, task.id);
      options.onTeammateError?.(teammate, errorMessage);
    }
  }

  /**
   * Handle plan approval workflow
   */
  private async handlePlanApproval(
    team: AgentTeam,
    teammate: AgentTeammate,
    task: AgentTeamTask,
    options: TeamExecutionOptions,
    signal: AbortSignal
  ): Promise<void> {
    teammate.status = 'planning';

    // Have the teammate generate a plan
    const config = this.resolveTeammateModelConfig(teammate, team.config);
    const modelInstance = getProviderModel(
      config.provider,
      config.model,
      config.apiKey,
      config.baseURL
    );

    const planResult = await generateText({
      model: modelInstance,
      prompt: `You are ${teammate.name}. ${teammate.description}\n\nCreate a detailed plan for the following task. Describe what steps you will take, what tools you will use, and what output you expect.\n\nTask: ${task.description}`,
      temperature: 0.5,
    });

    teammate.proposedPlan = planResult.text;
    teammate.status = 'awaiting_approval';

    this.emitEvent(team, 'plan_submitted', options, teammate.id, task.id);
    options.onPlanSubmitted?.(teammate, planResult.text);

    // Send plan to lead for review
    this.sendMessage({
      teamId: team.id,
      senderId: teammate.id,
      type: 'plan_approval',
      recipientId: team.leadId,
      content: `Plan for "${task.title}":\n\n${planResult.text}`,
      taskId: task.id,
    });

    // Have the lead review the plan
    const lead = this.teammates.get(team.leadId);
    if (!lead) throw new Error('Team lead not found');

    const leadConfig = this.resolveTeammateModelConfig(lead, team.config);
    const leadModel = getProviderModel(
      leadConfig.provider,
      leadConfig.model,
      leadConfig.apiKey,
      leadConfig.baseURL
    );

    const reviewPrompt = PLAN_REVIEW_PROMPT
      .replace('{{task}}', task.description)
      .replace('{{teammateName}}', teammate.name)
      .replace('{{teammateDescription}}', teammate.description)
      .replace('{{plan}}', planResult.text)
      .replace('{{criteria}}', 'The plan should be thorough, well-structured, and achievable within the task scope.');

    const reviewResult = await generateText({
      model: leadModel,
      prompt: reviewPrompt,
      temperature: 0.3,
    });

    // Parse review result
    let approved = true;
    let feedback = '';
    try {
      const reviewJson = JSON.parse(reviewResult.text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      approved = reviewJson.approved ?? true;
      feedback = reviewJson.feedback || '';
    } catch {
      // If parsing fails, approve by default
      approved = true;
      feedback = 'Plan approved (auto-approved due to parsing failure)';
    }

    teammate.planFeedback = feedback;

    if (approved) {
      this.emitEvent(team, 'plan_approved', options, teammate.id, task.id);
      this.sendMessage({
        teamId: team.id,
        senderId: team.leadId,
        type: 'plan_feedback',
        recipientId: teammate.id,
        content: `Plan approved: ${feedback}`,
        taskId: task.id,
      });
    } else {
      this.emitEvent(team, 'plan_rejected', options, teammate.id, task.id);
      this.sendMessage({
        teamId: team.id,
        senderId: team.leadId,
        type: 'plan_feedback',
        recipientId: teammate.id,
        content: `Plan needs revision: ${feedback}`,
        taskId: task.id,
      });

      // Have teammate revise and resubmit (one retry)
      if (!signal.aborted) {
        const revisionResult = await generateText({
          model: modelInstance,
          prompt: `Your plan was not approved. Feedback: ${feedback}\n\nRevise your plan for: ${task.description}`,
          temperature: 0.5,
        });
        teammate.proposedPlan = revisionResult.text;
        // Auto-approve revision to avoid infinite loop
      }
    }

    teammate.status = 'executing';
  }

  /**
   * Synthesize results from all teammates into a final response
   */
  private async synthesizeResults(team: AgentTeam): Promise<string> {
    const lead = this.teammates.get(team.leadId);
    if (!lead) throw new Error('Team lead not found');

    // Collect all task results
    const results = team.taskIds
      .map(id => this.tasks.get(id))
      .filter((task): task is AgentTeamTask => task !== undefined && task.status === 'completed')
      .map(task => {
        const assignee = task.claimedBy ? this.teammates.get(task.claimedBy) : undefined;
        return `## ${task.title} (by ${assignee?.name || 'Unknown'})\n${task.result || 'No result'}`;
      })
      .join('\n\n---\n\n');

    if (!results) {
      return 'No tasks were completed successfully.';
    }

    // If only one task with result, return it directly
    const completedTasks = team.taskIds
      .map(id => this.tasks.get(id))
      .filter(t => t?.status === 'completed');

    if (completedTasks.length === 1 && completedTasks[0]?.result) {
      return completedTasks[0].result;
    }

    const config = this.resolveTeammateModelConfig(lead, team.config);
    const modelInstance = getProviderModel(
      config.provider,
      config.model,
      config.apiKey,
      config.baseURL
    );

    const prompt = TEAM_SYNTHESIS_PROMPT
      .replace('{{task}}', team.task)
      .replace('{{results}}', results);

    const synthesisResult = await generateText({
      model: modelInstance,
      prompt,
      temperature: 0.5,
    });

    // Track lead token usage
    if (synthesisResult.usage) {
      const usage = synthesisResult.usage as Record<string, number>;
      lead.tokenUsage.promptTokens += usage.promptTokens ?? 0;
      lead.tokenUsage.completionTokens += usage.completionTokens ?? 0;
      lead.tokenUsage.totalTokens += usage.totalTokens ?? 0;
    }

    return synthesisResult.text;
  }

  // ==========================================================================
  // Team Control
  // ==========================================================================

  /**
   * Cancel team execution
   */
  cancelTeam(teamId: string): boolean {
    const controller = this.activeExecutions.get(teamId);
    if (controller) {
      controller.abort();
    }

    const team = this.teams.get(teamId);
    if (!team) return false;

    team.status = 'cancelled';
    this.shutdownAllTeammates(teamId);

    // Cancel pending tasks
    for (const taskId of team.taskIds) {
      const task = this.tasks.get(taskId);
      if (task && (task.status === 'pending' || task.status === 'in_progress' || task.status === 'claimed')) {
        task.status = 'cancelled';
      }
    }

    return true;
  }

  /**
   * Pause team execution
   */
  pauseTeam(teamId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team || team.status !== 'executing') return false;

    team.status = 'paused';
    for (const id of team.teammateIds) {
      const tm = this.teammates.get(id);
      if (tm && tm.status === 'executing') {
        tm.status = 'paused';
      }
    }
    return true;
  }

  /**
   * Resume team execution
   */
  resumeTeam(teamId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team || team.status !== 'paused') return false;

    team.status = 'executing';
    for (const id of team.teammateIds) {
      const tm = this.teammates.get(id);
      if (tm && tm.status === 'paused') {
        tm.status = 'idle';
      }
    }
    return true;
  }

  /**
   * Shutdown a specific teammate
   */
  shutdownTeammate(teammateId: string): void {
    const teammate = this.teammates.get(teammateId);
    if (!teammate) return;

    teammate.status = 'shutdown';
    teammate.currentTaskId = undefined;
  }

  /**
   * Shutdown all teammates in a team
   */
  shutdownAllTeammates(teamId: string): void {
    const team = this.teams.get(teamId);
    if (!team) return;

    for (const id of team.teammateIds) {
      const tm = this.teammates.get(id);
      if (tm && tm.status !== 'shutdown' && tm.status !== 'completed' && tm.status !== 'failed') {
        tm.status = 'shutdown';
        tm.currentTaskId = undefined;
      }
    }
  }

  /**
   * Clean up a team (remove all data)
   */
  cleanupTeam(teamId: string): void {
    const team = this.teams.get(teamId);
    if (!team) return;

    // Remove all teammates
    for (const id of team.teammateIds) {
      this.teammates.delete(id);
    }

    // Remove all tasks
    for (const id of team.taskIds) {
      this.tasks.delete(id);
    }

    // Remove all messages
    for (const id of team.messageIds) {
      this.messages.delete(id);
    }

    // Remove team
    this.teams.delete(teamId);
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  getTeam(teamId: string): AgentTeam | undefined {
    return this.teams.get(teamId);
  }

  getTeammate(teammateId: string): AgentTeammate | undefined {
    return this.teammates.get(teammateId);
  }

  getTeammates(teamId: string): AgentTeammate[] {
    const team = this.teams.get(teamId);
    if (!team) return [];
    return team.teammateIds
      .map(id => this.teammates.get(id))
      .filter((tm): tm is AgentTeammate => tm !== undefined);
  }

  getTask(taskId: string): AgentTeamTask | undefined {
    return this.tasks.get(taskId);
  }

  getTeamTasks(teamId: string): AgentTeamTask[] {
    const team = this.teams.get(teamId);
    if (!team) return [];
    return team.taskIds
      .map(id => this.tasks.get(id))
      .filter((t): t is AgentTeamTask => t !== undefined)
      .sort((a, b) => a.order - b.order);
  }

  getTeamMessages(teamId: string): AgentTeamMessage[] {
    const team = this.teams.get(teamId);
    if (!team) return [];
    return team.messageIds
      .map(id => this.messages.get(id))
      .filter((m): m is AgentTeamMessage => m !== undefined)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getAllTeams(): AgentTeam[] {
    return Array.from(this.teams.values());
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Build system prompt for a teammate
   */
  private buildTeammateSystemPrompt(
    team: AgentTeam,
    teammate: AgentTeammate,
    task: AgentTeamTask
  ): string {
    const parts: string[] = [];

    // Teammate identity
    parts.push(`You are "${teammate.name}", a member of an AI agent team.`);
    if (teammate.description) {
      parts.push(`Your role: ${teammate.description}`);
    }
    if (teammate.config.specialization) {
      parts.push(`Your specialization: ${teammate.config.specialization}`);
    }

    // Custom system prompt
    if (teammate.config.systemPrompt) {
      parts.push(teammate.config.systemPrompt);
    } else if (team.config.defaultSystemPrompt) {
      parts.push(team.config.defaultSystemPrompt);
    }

    // Spawn prompt from lead
    if (teammate.spawnPrompt) {
      parts.push(`\nInstructions from the team lead:\n${teammate.spawnPrompt}`);
    }

    // Task context
    parts.push(`\n--- Your Current Task ---`);
    parts.push(`Task: ${task.title}`);
    if (task.expectedOutput) {
      parts.push(`Expected output: ${task.expectedOutput}`);
    }

    // Include messages from other teammates (context sharing)
    if (team.config.enableMessaging) {
      const relevantMessages = this.getUnreadMessages(teammate.id)
        .filter(msg => msg.type === 'result_share')
        .slice(-5); // Last 5 results

      if (relevantMessages.length > 0) {
        parts.push(`\n--- Results from Other Teammates ---`);
        for (const msg of relevantMessages) {
          parts.push(`[${msg.senderName}]: ${msg.content.slice(0, 500)}`);
        }
      }
    }

    // Plan feedback if available
    if (teammate.planFeedback) {
      parts.push(`\n--- Plan Feedback ---`);
      parts.push(teammate.planFeedback);
    }

    parts.push('\nFocus on completing your task efficiently. Provide clear, actionable results.');

    return parts.join('\n');
  }

  /**
   * Resolve model config for a teammate
   */
  private resolveTeammateModelConfig(
    teammate: AgentTeammate,
    teamConfig: AgentTeamConfig
  ): { provider: ProviderName; model: string; apiKey: string; baseURL?: string } {
    return {
      provider: (teammate.config.provider || teamConfig.defaultProvider || 'openai') as ProviderName,
      model: teammate.config.model || teamConfig.defaultModel || 'gpt-4o-mini',
      apiKey: teammate.config.apiKey || teamConfig.defaultApiKey || '',
      baseURL: teammate.config.baseURL || teamConfig.defaultBaseURL,
    };
  }

  /**
   * Check if task has unmet dependencies
   */
  private hasUnmetDependencies(dependencyIds: string[], _teamId: string): boolean {
    for (const depId of dependencyIds) {
      const depTask = this.tasks.get(depId);
      if (!depTask || depTask.status !== 'completed') {
        return true;
      }
    }
    return false;
  }

  /**
   * Unblock tasks that depend on the completed task
   */
  private unblockDependentTasks(completedTaskId: string, teamId: string): void {
    const team = this.teams.get(teamId);
    if (!team) return;

    for (const taskId of team.taskIds) {
      const task = this.tasks.get(taskId);
      if (!task || task.status !== 'blocked') continue;

      if (task.dependencies.includes(completedTaskId)) {
        // Check if all other dependencies are met
        if (!this.hasUnmetDependencies(task.dependencies, teamId)) {
          task.status = 'pending';
        }
      }
    }
  }

  /**
   * Aggregate token usage for the entire team
   */
  private aggregateTokenUsage(team: AgentTeam): void {
    const total: SubAgentTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    for (const id of team.teammateIds) {
      const tm = this.teammates.get(id);
      if (tm) {
        total.promptTokens += tm.tokenUsage.promptTokens;
        total.completionTokens += tm.tokenUsage.completionTokens;
        total.totalTokens += tm.tokenUsage.totalTokens;
      }
    }

    team.totalTokenUsage = total;
  }

  /**
   * Emit a team event
   */
  private emitEvent(
    team: AgentTeam,
    type: AgentTeamEvent['type'],
    options: TeamExecutionOptions,
    teammateId?: string,
    taskId?: string
  ): void {
    const event: AgentTeamEvent = {
      type,
      teamId: team.id,
      teammateId,
      taskId,
      timestamp: new Date(),
    };

    options.onEvent?.(event);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let globalTeamManager: AgentTeamManager | null = null;

/**
 * Get or create the global team manager
 */
export function getAgentTeamManager(tools?: Record<string, AgentTool>): AgentTeamManager {
  if (!globalTeamManager) {
    globalTeamManager = new AgentTeamManager(tools);
  }
  return globalTeamManager;
}

/**
 * Set the global team manager
 */
export function setAgentTeamManager(manager: AgentTeamManager): void {
  globalTeamManager = manager;
}

/**
 * Reset the global team manager
 */
export function resetAgentTeamManager(): void {
  globalTeamManager = null;
}

/**
 * Create a team from a template
 */
export function createTeamFromTemplate(
  template: AgentTeamTemplate,
  task: string,
  config?: Partial<AgentTeamConfig>,
  tools?: Record<string, AgentTool>
): AgentTeam {
  const manager = getAgentTeamManager(tools);

  // Create team
  const team = manager.createTeam({
    name: template.name,
    description: template.description,
    task,
    config: {
      ...template.config,
      ...config,
    },
  });

  // Add teammates from template
  for (const tmDef of template.teammates) {
    manager.addTeammate({
      teamId: team.id,
      name: tmDef.name,
      description: tmDef.description,
      config: {
        specialization: tmDef.specialization,
        ...tmDef.config,
        ...config,
      },
    });
  }

  // Add tasks from template if defined
  if (template.taskTemplates) {
    const teammates = manager.getTeammates(team.id);
    for (const taskDef of template.taskTemplates) {
      const assignedTeammate = taskDef.assignedToIndex !== undefined
        ? teammates[taskDef.assignedToIndex + 1] // +1 to skip lead
        : undefined;

      manager.createTask({
        teamId: team.id,
        title: taskDef.title,
        description: taskDef.description,
        priority: taskDef.priority,
        assignedTo: assignedTeammate?.id,
      });
    }
  }

  return team;
}
