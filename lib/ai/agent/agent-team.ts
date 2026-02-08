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
  type SharedMemoryEntry,
  type SharedMemoryNamespace,
  type ConsensusRequest,
  type ConsensusVote,
  type CreateConsensusInput,
  type CastVoteInput,
} from '@/types/agent/agent-team';
import type { SubAgentTokenUsage } from '@/types/agent/sub-agent';
import { getAgentBridge } from './agent-bridge';
import type { SharedMemoryManager } from './agent-bridge';
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
  private consensusRequests: Map<string, ConsensusRequest> = new Map();

  constructor(tools?: Record<string, AgentTool>) {
    if (tools) {
      this.globalTools = tools;
    }
    // Register with bridge for cross-system delegation
    const bridge = getAgentBridge();
    bridge.setTeamManagerGetter(() => this);
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

    // When a task completes, unblock dependent tasks and write to shared memory
    if (status === 'completed') {
      this.unblockDependentTasks(taskId, task.teamId);

      // Write result to shared memory (blackboard pattern)
      if (result) {
        const claimedByTeammate = task.claimedBy ? this.teammates.get(task.claimedBy) : undefined;
        this.writeSharedMemory(
          task.teamId,
          `task:${taskId}:result`,
          result,
          task.claimedBy || 'system',
          {
            namespace: 'results',
            writerName: claimedByTeammate?.name || 'Unknown',
            tags: ['task_result', task.title],
          }
        );
      }
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
   * Supports three execution modes:
   * - coordinated: Lead assigns tasks to specific teammates
   * - autonomous: Teammates self-claim the next available task
   * - delegate: Lead assigns tasks, never implements itself
   */
  private async executeTeammates(
    team: AgentTeam,
    options: TeamExecutionOptions,
    signal: AbortSignal
  ): Promise<void> {
    const teammateIds = team.teammateIds.filter(id => id !== team.leadId);
    const maxConcurrent = team.config.maxConcurrentTeammates;
    const executionMode = team.config.executionMode;

    let completedCount = 0;
    const totalTasks = team.taskIds.length;
    let deadlockAttempts = 0;
    const MAX_DEADLOCK_ATTEMPTS = 3;

    while (!signal.aborted) {
      // Token budget check
      if (team.config.tokenBudget && team.config.tokenBudget > 0) {
        this.aggregateTokenUsage(team);
        if (team.totalTokenUsage.totalTokens >= team.config.tokenBudget) {
          log.warn('Token budget exceeded', {
            teamId: team.id,
            used: team.totalTokenUsage.totalTokens,
            budget: team.config.tokenBudget,
          });
          this.emitEvent(team, 'budget_exceeded', options);
          break;
        }
      }

      // Check if all tasks are done
      const allTasks = team.taskIds.map(id => this.tasks.get(id)).filter(Boolean) as AgentTeamTask[];
      const pendingTasks = allTasks.filter(t =>
        t.status === 'pending' || t.status === 'claimed' || t.status === 'in_progress' || t.status === 'blocked'
      );

      if (pendingTasks.length === 0) break;

      // Find available tasks (pending + no unmet dependencies)
      const availableTasks = allTasks.filter(t => t.status === 'pending');

      // Deadlock detection and recovery
      if (availableTasks.length === 0 && pendingTasks.every(t => t.status === 'blocked')) {
        if (team.config.enableDeadlockRecovery && deadlockAttempts < MAX_DEADLOCK_ATTEMPTS) {
          deadlockAttempts++;
          log.warn('Deadlock detected, attempting recovery', {
            teamId: team.id,
            attempt: deadlockAttempts,
          });
          const resolved = this.resolveDeadlock(team);
          if (resolved) {
            this.emitEvent(team, 'deadlock_resolved', options);
            continue;
          }
        }
        log.error('Unresolvable deadlock', { teamId: team.id });
        break;
      }

      // Reset deadlock counter when tasks are available
      if (availableTasks.length > 0) {
        deadlockAttempts = 0;
      }

      if (availableTasks.length === 0) {
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

      // Start teammates on available tasks (mode-specific assignment)
      const executions: Promise<void>[] = [];
      for (let i = 0; i < toStart; i++) {
        const task = availableTasks[i];
        let teammate: AgentTeammate | undefined;

        if (executionMode === 'autonomous') {
          // Autonomous: any idle teammate can self-claim
          teammate = this.findBestTeammateForTask(task, idleTeammates, i);
        } else {
          // Coordinated / Delegate: respect explicit assignments
          if (task.assignedTo) {
            teammate = this.teammates.get(task.assignedTo);
            if (teammate && teammate.status !== 'idle' && teammate.status !== 'completed') {
              teammate = undefined;
            }
          }
          if (!teammate) {
            teammate = this.findBestTeammateForTask(task, idleTeammates, i);
          }
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

              // Autonomous mode: teammate auto-claims next task after completion
              if (executionMode === 'autonomous' && teammate && teammate.status === 'idle') {
                const nextTask = this.getAvailableTasks(team.id, teammate.id)[0];
                if (nextTask) {
                  log.info('Autonomous self-claim', {
                    teammateId: teammate.id,
                    taskId: nextTask.id,
                  });
                }
              }
            })
            .catch(async (_err) => {
              // Error retry: if enabled and retries remaining, retry the task
              if (team.config.enableTaskRetry && task.status === 'failed') {
                const maxRetries = team.config.maxRetries ?? 1;
                const currentRetries = task.retryCount ?? 0;
                if (currentRetries < maxRetries) {
                  log.info('Retrying failed task', {
                    taskId: task.id,
                    attempt: currentRetries + 1,
                    maxRetries,
                  });
                  task.retryCount = currentRetries + 1;
                  task.status = 'pending';
                  task.error = undefined;
                  task.result = undefined;
                  task.claimedBy = undefined;
                  task.startedAt = undefined;
                  task.completedAt = undefined;
                  task.actualDuration = undefined;

                  // Try to reassign to a different teammate if available
                  const otherTeammates = idleTeammates.filter(tm => tm.id !== teammate?.id);
                  if (otherTeammates.length > 0) {
                    task.assignedTo = otherTeammates[0].id;
                  }

                  this.emitEvent(team, 'task_retried', options, teammate?.id, task.id);
                }
              }
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
   * Find the best idle teammate for a task based on specialization match
   */
  private findBestTeammateForTask(
    task: AgentTeamTask,
    idleTeammates: AgentTeammate[],
    fallbackIndex: number
  ): AgentTeammate | undefined {
    // Try to match by specialization via task tags
    if (task.tags.length > 0) {
      const specialized = idleTeammates.find(tm =>
        tm.config.specialization &&
        task.tags.some(tag =>
          tag.toLowerCase().includes(tm.config.specialization!.toLowerCase()) ||
          tm.config.specialization!.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (specialized) return specialized;
    }

    // Fallback: round-robin assignment
    return idleTeammates[fallbackIndex % idleTeammates.length];
  }

  /**
   * Attempt to resolve a deadlock by cancelling circular dependencies
   */
  private resolveDeadlock(team: AgentTeam): boolean {
    const allTasks = team.taskIds
      .map(id => this.tasks.get(id))
      .filter((t): t is AgentTeamTask => t !== undefined && t.status === 'blocked');

    if (allTasks.length === 0) return false;

    // Strategy 1: Find tasks whose dependencies are all failed/cancelled → unblock them
    for (const task of allTasks) {
      const depsAllTerminal = task.dependencies.every(depId => {
        const dep = this.tasks.get(depId);
        return dep && (dep.status === 'completed' || dep.status === 'failed' || dep.status === 'cancelled');
      });
      if (depsAllTerminal) {
        task.status = 'pending';
        log.info('Unblocked task with terminal dependencies', { taskId: task.id });
        return true;
      }
    }

    // Strategy 2: Cancel the blocked task with the most dependencies (break the cycle)
    const sorted = [...allTasks].sort((a, b) => b.dependencies.length - a.dependencies.length);
    if (sorted.length > 0) {
      const toCancel = sorted[0];
      toCancel.status = 'cancelled';
      toCancel.error = 'Cancelled to resolve deadlock';
      toCancel.completedAt = new Date();
      this.unblockDependentTasks(toCancel.id, team.id);
      log.info('Cancelled task to resolve deadlock', { taskId: toCancel.id });
      return true;
    }

    return false;
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
   * Handle plan approval workflow with multi-round revision support
   * Supports up to maxPlanRevisions rounds before auto-approving
   */
  private async handlePlanApproval(
    team: AgentTeam,
    teammate: AgentTeammate,
    task: AgentTeamTask,
    options: TeamExecutionOptions,
    signal: AbortSignal
  ): Promise<void> {
    const maxRevisions = Math.min(team.config.maxPlanRevisions ?? 3, 5);
    let currentPlan = '';
    let approved = false;
    let feedback = '';

    const config = this.resolveTeammateModelConfig(teammate, team.config);
    const modelInstance = getProviderModel(
      config.provider,
      config.model,
      config.apiKey,
      config.baseURL
    );

    const lead = this.teammates.get(team.leadId);
    if (!lead) throw new Error('Team lead not found');

    const leadConfig = this.resolveTeammateModelConfig(lead, team.config);
    const leadModel = getProviderModel(
      leadConfig.provider,
      leadConfig.model,
      leadConfig.apiKey,
      leadConfig.baseURL
    );

    for (let revision = 0; revision <= maxRevisions; revision++) {
      if (signal.aborted) throw new Error('Team execution cancelled');

      teammate.status = 'planning';

      // Generate or revise the plan
      const planPrompt = revision === 0
        ? `You are ${teammate.name}. ${teammate.description}\n\nCreate a detailed plan for the following task. Describe what steps you will take, what tools you will use, and what output you expect.\n\nTask: ${task.description}`
        : `You are ${teammate.name}. ${teammate.description}\n\nYour previous plan was not approved (revision ${revision}/${maxRevisions}).\n\nFeedback from lead: ${feedback}\n\nRevise your plan accordingly for: ${task.description}\n\nPrevious plan:\n${currentPlan}`;

      const planResult = await generateText({
        model: modelInstance,
        prompt: planPrompt,
        temperature: 0.5,
      });

      currentPlan = planResult.text;
      teammate.proposedPlan = currentPlan;
      teammate.status = 'awaiting_approval';

      this.emitEvent(team, 'plan_submitted', options, teammate.id, task.id);
      options.onPlanSubmitted?.(teammate, currentPlan);

      this.sendMessage({
        teamId: team.id,
        senderId: teammate.id,
        type: 'plan_approval',
        recipientId: team.leadId,
        content: revision === 0
          ? `Plan for "${task.title}":\n\n${currentPlan}`
          : `Revised plan (revision ${revision}) for "${task.title}":\n\n${currentPlan}`,
        taskId: task.id,
      });

      // Lead reviews the plan
      const reviewPrompt = PLAN_REVIEW_PROMPT
        .replace('{{task}}', task.description)
        .replace('{{teammateName}}', teammate.name)
        .replace('{{teammateDescription}}', teammate.description)
        .replace('{{plan}}', currentPlan)
        .replace('{{criteria}}', revision > 0
          ? `This is revision ${revision}/${maxRevisions}. Previous feedback was: "${feedback}". Check if the revision addresses the feedback. The plan should be thorough, well-structured, and achievable.`
          : 'The plan should be thorough, well-structured, and achievable within the task scope.');

      const reviewResult = await generateText({
        model: leadModel,
        prompt: reviewPrompt,
        temperature: 0.3,
      });

      try {
        const reviewJson = JSON.parse(reviewResult.text.match(/\{[\s\S]*\}/)?.[0] || '{}');
        approved = reviewJson.approved ?? true;
        feedback = reviewJson.feedback || '';
      } catch {
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
        break;
      }

      this.emitEvent(team, 'plan_rejected', options, teammate.id, task.id);
      this.sendMessage({
        teamId: team.id,
        senderId: team.leadId,
        type: 'plan_feedback',
        recipientId: teammate.id,
        content: `Plan needs revision (${revision + 1}/${maxRevisions}): ${feedback}`,
        taskId: task.id,
      });

      // If max revisions reached, auto-approve to prevent infinite loop
      if (revision === maxRevisions) {
        log.warn('Max plan revisions reached, auto-approving', {
          teammateId: teammate.id,
          taskId: task.id,
          revisions: maxRevisions,
        });
        this.sendMessage({
          teamId: team.id,
          senderId: team.leadId,
          type: 'plan_feedback',
          recipientId: teammate.id,
          content: `Plan auto-approved after ${maxRevisions} revisions. Proceed with latest version.`,
          taskId: task.id,
        });
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
  // Shared Memory (Blackboard Pattern)
  // ==========================================================================

  /**
   * Get the shared memory manager from the bridge
   */
  private getSharedMemory(): SharedMemoryManager {
    return getAgentBridge().getSharedMemory();
  }

  /**
   * Write to team shared memory
   */
  writeSharedMemory(
    teamId: string,
    key: string,
    value: unknown,
    writtenBy: string,
    options: {
      namespace?: SharedMemoryNamespace;
      writerName?: string;
      expiresInMs?: number;
      tags?: string[];
      readableBy?: string[];
    } = {}
  ): SharedMemoryEntry | null {
    const team = this.teams.get(teamId);
    if (!team) return null;

    const namespace = options.namespace || 'results';
    const namespacedKey = `team:${teamId}:${namespace}:${key}`;

    const entry = this.getSharedMemory().write(
      namespace,
      namespacedKey,
      value,
      writtenBy,
      {
        writerName: options.writerName,
        expiresInMs: options.expiresInMs,
        tags: [...(options.tags || []), `team:${teamId}`],
        readableBy: options.readableBy,
      }
    );

    // Also store locally on the team object
    if (!team.sharedMemory) team.sharedMemory = {};
    team.sharedMemory[key] = entry;

    return entry;
  }

  /**
   * Read from team shared memory
   */
  readSharedMemory(
    teamId: string,
    key: string,
    readerId?: string,
    namespace: SharedMemoryNamespace = 'results'
  ): SharedMemoryEntry | undefined {
    const namespacedKey = `team:${teamId}:${namespace}:${key}`;
    return this.getSharedMemory().read(namespace, namespacedKey, readerId);
  }

  /**
   * Read all shared memory for a team in a namespace
   */
  readAllSharedMemory(
    teamId: string,
    readerId?: string,
    namespace: SharedMemoryNamespace = 'results'
  ): SharedMemoryEntry[] {
    return this.getSharedMemory()
      .searchByTags(namespace, [`team:${teamId}`], readerId);
  }

  /**
   * Build a context string from shared memory for injection into prompts
   */
  buildSharedMemoryContext(
    teamId: string,
    readerId?: string,
    namespace: SharedMemoryNamespace = 'results'
  ): string {
    const entries = this.readAllSharedMemory(teamId, readerId, namespace);
    if (entries.length === 0) return '';

    const parts = entries.map((entry) => {
      const shortKey = entry.key.replace(`team:${teamId}:${namespace}:`, '');
      const value = typeof entry.value === 'string'
        ? entry.value
        : JSON.stringify(entry.value, null, 2);
      const meta = entry.writerName ? ` (by ${entry.writerName})` : '';
      return `[${shortKey}]${meta}: ${typeof value === 'string' && value.length > 500 ? value.slice(0, 500) + '...' : value}`;
    });

    return `\n--- Team Shared Memory (${namespace}) ---\n${parts.join('\n')}`;
  }

  // ==========================================================================
  // Consensus / Voting
  // ==========================================================================

  /**
   * Create a consensus request for team-wide decision making
   */
  createConsensus(input: CreateConsensusInput): ConsensusRequest {
    const request: ConsensusRequest = {
      id: nanoid(),
      teamId: input.teamId,
      initiatorId: input.initiatorId,
      question: input.question,
      options: input.options,
      type: input.type || 'majority',
      status: 'open',
      votes: [],
      taskId: input.taskId,
      timeoutMs: input.timeoutMs,
      createdAt: new Date(),
    };

    this.consensusRequests.set(request.id, request);

    const team = this.teams.get(input.teamId);
    if (team) {
      if (!team.consensusIds) team.consensusIds = [];
      team.consensusIds.push(request.id);
    }

    // Broadcast the consensus request to all teammates
    if (team?.config.enableMessaging) {
      this.sendMessage({
        teamId: input.teamId,
        senderId: input.initiatorId,
        type: 'broadcast',
        content: `🗳️ Consensus requested: "${input.question}"\nOptions: ${input.options.map((o, i) => `${i + 1}. ${o}`).join(', ')}`,
        metadata: { consensusId: request.id },
      });
    }

    log.info('Consensus request created', {
      id: request.id,
      teamId: input.teamId,
      question: input.question,
      type: request.type,
    });

    return request;
  }

  /**
   * Cast a vote on a consensus request
   */
  castVote(input: CastVoteInput): ConsensusVote | null {
    const request = this.consensusRequests.get(input.consensusId);
    if (!request || request.status !== 'open') return null;

    // Prevent duplicate votes
    if (request.votes.some((v) => v.voterId === input.voterId)) {
      log.warn('Duplicate vote attempt', {
        consensusId: input.consensusId,
        voterId: input.voterId,
      });
      return null;
    }

    // Validate option index
    if (input.optionIndex < 0 || input.optionIndex >= request.options.length) {
      return null;
    }

    const voter = this.teammates.get(input.voterId);
    const vote: ConsensusVote = {
      voterId: input.voterId,
      voterName: voter?.name || 'Unknown',
      optionIndex: input.optionIndex,
      reasoning: input.reasoning,
      weight: voter?.role === 'lead' ? 2 : 1,
      votedAt: new Date(),
    };

    request.votes.push(vote);

    // Check if consensus is reached
    const team = this.teams.get(request.teamId);
    if (team) {
      const totalVoters = team.teammateIds.length;
      if (request.votes.length >= totalVoters) {
        this.resolveConsensus(request);
      }
    }

    return vote;
  }

  /**
   * Resolve a consensus request by tallying votes
   */
  private resolveConsensus(request: ConsensusRequest): void {
    if (request.status !== 'open') return;

    const tallies: number[] = new Array(request.options.length).fill(0);

    for (const vote of request.votes) {
      const weight = request.type === 'weighted' ? (vote.weight ?? 1) : 1;
      tallies[vote.optionIndex] += weight;
    }

    const maxTally = Math.max(...tallies);
    const winningIndex = tallies.indexOf(maxTally);
    const totalWeight = request.type === 'weighted'
      ? request.votes.reduce((sum, v) => sum + (v.weight ?? 1), 0)
      : request.votes.length;

    let isResolved = false;

    switch (request.type) {
      case 'majority':
        isResolved = maxTally > totalWeight / 2;
        break;
      case 'supermajority':
        isResolved = maxTally >= totalWeight * 2 / 3;
        break;
      case 'unanimous':
        isResolved = maxTally === totalWeight;
        break;
      case 'weighted':
        isResolved = maxTally > totalWeight / 2;
        break;
      case 'lead_override':
        isResolved = true; // Lead can always decide
        break;
    }

    if (isResolved) {
      request.status = 'resolved';
      request.winningOption = winningIndex;
      request.summary = `Decision: "${request.options[winningIndex]}" (${maxTally}/${totalWeight} votes)`;
      request.resolvedAt = new Date();

      // Store decision in shared memory
      this.writeSharedMemory(
        request.teamId,
        `consensus:${request.id}`,
        {
          question: request.question,
          decision: request.options[winningIndex],
          votes: request.votes.length,
          tallies,
        },
        request.initiatorId,
        { namespace: 'decisions', tags: ['consensus'] }
      );

      // Broadcast result
      const team = this.teams.get(request.teamId);
      if (team?.config.enableMessaging) {
        this.sendMessage({
          teamId: request.teamId,
          senderId: request.initiatorId,
          type: 'broadcast',
          content: `✅ Consensus reached: "${request.options[winningIndex]}" for "${request.question}"`,
          metadata: { consensusId: request.id, result: request.winningOption },
        });
      }

      log.info('Consensus resolved', {
        id: request.id,
        winner: request.options[winningIndex],
        votes: maxTally,
        total: totalWeight,
      });
    }
  }

  /**
   * Auto-vote for a consensus using LLM (for autonomous mode)
   */
  async autoVoteConsensus(
    consensusId: string,
    teammateId: string
  ): Promise<ConsensusVote | null> {
    const request = this.consensusRequests.get(consensusId);
    if (!request || request.status !== 'open') return null;

    const teammate = this.teammates.get(teammateId);
    if (!teammate) return null;

    const team = this.teams.get(request.teamId);
    if (!team) return null;

    const config = this.resolveTeammateModelConfig(teammate, team.config);
    const modelInstance = getProviderModel(
      config.provider,
      config.model,
      config.apiKey,
      config.baseURL
    );

    const prompt = `You are "${teammate.name}" (${teammate.description}).
You need to vote on the following decision:

Question: ${request.question}

Options:
${request.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}

${request.votes.length > 0 ? `\nPrevious votes:\n${request.votes.map((v) => `- ${v.voterName}: Option ${v.optionIndex + 1} (${request.options[v.optionIndex]})${v.reasoning ? ` - ${v.reasoning}` : ''}`).join('\n')}` : ''}

Respond with a JSON object: {"optionIndex": <0-based index>, "reasoning": "<your reasoning>"}`;

    try {
      const result = await generateText({
        model: modelInstance,
        prompt,
        temperature: 0.3,
      });

      const parsed = JSON.parse(result.text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      const optionIndex = typeof parsed.optionIndex === 'number'
        ? Math.max(0, Math.min(parsed.optionIndex, request.options.length - 1))
        : 0;

      return this.castVote({
        consensusId,
        voterId: teammateId,
        optionIndex,
        reasoning: parsed.reasoning || '',
      });
    } catch (error) {
      log.error('Auto-vote failed', { consensusId, teammateId, error: String(error) });
      return null;
    }
  }

  /**
   * Get a consensus request
   */
  getConsensus(consensusId: string): ConsensusRequest | undefined {
    return this.consensusRequests.get(consensusId);
  }

  /**
   * Get all consensus requests for a team
   */
  getTeamConsensus(teamId: string): ConsensusRequest[] {
    return Array.from(this.consensusRequests.values())
      .filter((r) => r.teamId === teamId);
  }

  // ==========================================================================
  // Bridge Delegation
  // ==========================================================================

  /**
   * Delegate a subtask to a BackgroundAgent via the bridge
   * Useful when a team task is long-running and should execute asynchronously
   */
  async delegateTaskToBackground(
    teamId: string,
    taskId: string,
    options: {
      priority?: number;
      name?: string;
      description?: string;
    } = {}
  ): Promise<string | null> {
    const team = this.teams.get(teamId);
    const task = this.tasks.get(taskId);
    if (!team || !task) return null;

    const bridge = getAgentBridge();

    const delegation = await bridge.delegateToBackground({
      task: task.description,
      name: options.name || `Team task: ${task.title}`,
      description: options.description || `Delegated from team "${team.name}"`,
      sourceType: 'team',
      sourceId: teamId,
      sessionId: team.sessionId,
      priority: options.priority,
      config: {
        taskId: task.id,
        teamId: team.id,
      },
    });

    // Update task metadata with delegation info
    task.metadata = {
      ...task.metadata,
      delegationId: delegation.id,
      delegatedToBackground: true,
    };

    // Track on team
    if (!team.delegationIds) team.delegationIds = [];
    team.delegationIds.push(delegation.id);

    log.info('Task delegated to background', {
      teamId,
      taskId,
      delegationId: delegation.id,
    });

    // When delegation completes, update the task result
    if (delegation.status === 'completed') {
      this.updateTaskStatus(taskId, 'completed', delegation.result);
    } else if (delegation.status === 'failed') {
      this.updateTaskStatus(taskId, 'failed', undefined, delegation.error);
    }

    return delegation.id;
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

    // Include completed task results for context (richer than just messages)
    const completedTasks = team.taskIds
      .map(id => this.tasks.get(id))
      .filter((t): t is AgentTeamTask =>
        t !== undefined && t.status === 'completed' && t.id !== task.id && !!t.result
      );

    if (completedTasks.length > 0) {
      parts.push(`\n--- Completed Task Results (for context) ---`);
      for (const ct of completedTasks.slice(-5)) {
        const assignee = ct.claimedBy ? this.teammates.get(ct.claimedBy) : undefined;
        parts.push(`[${assignee?.name || 'Unknown'}] ${ct.title}: ${ct.result!.slice(0, 300)}`);
      }
    }

    // Include messages from other teammates (context sharing)
    if (team.config.enableMessaging) {
      const relevantMessages = this.getUnreadMessages(teammate.id)
        .filter(msg => msg.type === 'result_share' || msg.type === 'direct')
        .slice(-5);

      if (relevantMessages.length > 0) {
        parts.push(`\n--- Messages from Teammates ---`);
        for (const msg of relevantMessages) {
          parts.push(`[${msg.senderName}]: ${msg.content.slice(0, 500)}`);
        }
      }
    }

    // Include shared memory context (blackboard pattern)
    const sharedMemoryContext = this.buildSharedMemoryContext(team.id, teammate.id, 'results');
    if (sharedMemoryContext) {
      parts.push(sharedMemoryContext);
    }
    const decisionsContext = this.buildSharedMemoryContext(team.id, teammate.id, 'decisions');
    if (decisionsContext) {
      parts.push(decisionsContext);
    }

    // Plan feedback if available
    if (teammate.planFeedback) {
      parts.push(`\n--- Plan Feedback ---`);
      parts.push(teammate.planFeedback);
    }

    // Execution mode context
    if (team.config.executionMode === 'autonomous') {
      parts.push('\nYou are operating in autonomous mode. After completing this task, you may self-claim the next available task.');
    } else if (team.config.executionMode === 'delegate') {
      parts.push('\nYou are operating in delegate mode. Focus only on your assigned task.');
    }

    // Token budget awareness
    if (team.config.tokenBudget && team.config.tokenBudget > 0) {
      this.aggregateTokenUsage(team);
      const remaining = team.config.tokenBudget - team.totalTokenUsage.totalTokens;
      if (remaining < team.config.tokenBudget * 0.2) {
        parts.push(`\nToken budget is running low (${remaining.toLocaleString()} tokens remaining). Be concise.`);
      }
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
