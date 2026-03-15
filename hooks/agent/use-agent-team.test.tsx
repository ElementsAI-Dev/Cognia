/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import {
  DEFAULT_TEAM_CONFIG,
  type AddTeammateInput,
  type AgentTeam,
  type AgentTeamMessage,
  type AgentTeamTask,
  type AgentTeamTemplate,
  type AgentTeammate,
  type TeamRoutingAssessment,
  type CreateTaskInput,
  type CreateTeamInput,
  type SendMessageInput,
} from '@/types/agent/agent-team';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import { useSettingsStore } from '@/stores/settings';
import { createTeamFromTemplate, getAgentTeamManager } from '@/lib/ai/agent/agent-team';
import { useAgentTeam } from './use-agent-team';

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: jest.fn(),
}));

jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock('@/lib/ai/agent/agent-team', () => ({
  getAgentTeamManager: jest.fn(),
  createTeamFromTemplate: jest.fn(),
}));

describe('useAgentTeam manager-store sync', () => {
  const mockStoreUpsertTeam = jest.fn();
  const mockStoreUpsertTeammate = jest.fn();
  const mockStoreUpsertTask = jest.fn();
  const mockStoreUpsertMessage = jest.fn();
  const mockStoreSetTaskStatus = jest.fn();
  const mockStoreSetActiveTeam = jest.fn();
  const mockStoreAddEvent = jest.fn();

  const mockManagerCreateTeam = jest.fn();
  const mockManagerGetTeammate = jest.fn();
  const mockManagerAddTeammate = jest.fn();
  const mockManagerCreateTask = jest.fn();
  const mockManagerSendMessage = jest.fn();
  const mockManagerDelegateTaskToBackground = jest.fn();
  const mockManagerGetTask = jest.fn();
  const mockManagerGetTeam = jest.fn();
  const mockManagerAssessTeamRouting = jest.fn();
  const mockManagerSelectExecutionPattern = jest.fn();

  const useAgentTeamStoreMock = useAgentTeamStore as unknown as jest.MockedFunction<typeof useAgentTeamStore>;
  const useSettingsStoreMock = useSettingsStore as unknown as jest.MockedFunction<typeof useSettingsStore>;
  const getAgentTeamManagerMock = getAgentTeamManager as jest.MockedFunction<typeof getAgentTeamManager>;
  const createTeamFromTemplateMock =
    createTeamFromTemplate as jest.MockedFunction<typeof createTeamFromTemplate>;

  beforeEach(() => {
    jest.clearAllMocks();

    useSettingsStoreMock.mockImplementation((selector) => {
      if (typeof selector !== 'function') return {} as never;
      return selector({
        defaultProvider: 'openai',
        providerSettings: {
          openai: {
            providerId: 'openai',
            enabled: true,
            defaultModel: 'gpt-test-model',
            apiKeys: ['fallback-api-key'],
            baseURL: 'https://api.example.com',
          },
        },
        getActiveApiKey: () => 'active-api-key',
      } as never);
    });

    const storeState = {
      teams: {},
      activeTeamId: null,
      selectedTeammateId: null,
      displayMode: 'expanded',
      isPanelOpen: false,
      templates: {},
      upsertTeam: mockStoreUpsertTeam,
      upsertTeammate: mockStoreUpsertTeammate,
      upsertTask: mockStoreUpsertTask,
      upsertMessage: mockStoreUpsertMessage,
      setTeamStatus: jest.fn(),
      setTeammateStatus: jest.fn(),
      setTeammateProgress: jest.fn(),
      setTaskStatus: mockStoreSetTaskStatus,
      claimTask: jest.fn(),
      assignTask: jest.fn(),
      deleteTask: jest.fn(),
      removeTeammate: jest.fn(),
      deleteTeam: jest.fn(),
      cleanupTeam: jest.fn(),
      updateTeam: jest.fn(),
      addEvent: mockStoreAddEvent,
      addTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      setActiveTeam: mockStoreSetActiveTeam,
      setSelectedTeammate: jest.fn(),
      setDisplayMode: jest.fn(),
      setIsPanelOpen: jest.fn(),
      getTeammates: jest.fn().mockReturnValue([]),
      getTeamTasks: jest.fn().mockReturnValue([]),
      getTeamMessages: jest.fn().mockReturnValue([]),
      getUnreadMessages: jest.fn().mockReturnValue([]),
    };

    useAgentTeamStoreMock.mockImplementation((selector) => {
      if (typeof selector !== 'function') return storeState as never;
      return selector(storeState as never);
    });

    getAgentTeamManagerMock.mockReturnValue({
      createTeam: mockManagerCreateTeam,
      getTeammate: mockManagerGetTeammate,
      addTeammate: mockManagerAddTeammate,
      createTask: mockManagerCreateTask,
      sendMessage: mockManagerSendMessage,
      getTask: mockManagerGetTask,
      getTeam: mockManagerGetTeam,
      executeTeam: jest.fn(),
      cancelTeam: jest.fn(),
      pauseTeam: jest.fn(),
      resumeTeam: jest.fn(),
      removeTeammate: jest.fn(),
      shutdownTeammate: jest.fn(),
      claimTask: jest.fn(),
      assignTask: jest.fn(),
      cleanupTeam: jest.fn(),
      writeSharedMemory: jest.fn(),
      readSharedMemory: jest.fn(),
      readAllSharedMemory: jest.fn(),
      createConsensus: jest.fn(),
      castVote: jest.fn(),
      getConsensus: jest.fn(),
      getTeamConsensus: jest.fn(),
      delegateTaskToBackground: mockManagerDelegateTaskToBackground,
      assessTeamRouting: mockManagerAssessTeamRouting,
      selectExecutionPattern: mockManagerSelectExecutionPattern,
    } as never);
  });

  it('returns manager team id and upserts manager team/lead entities', () => {
    const managerLead: AgentTeammate = {
      id: 'manager-lead-1',
      teamId: 'manager-team-1',
      name: 'Team Lead',
      description: 'Lead teammate from manager',
      role: 'lead',
      status: 'idle',
      config: {},
      completedTaskIds: [],
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      progress: 0,
      createdAt: new Date('2026-03-04T09:00:00.000Z'),
    };

    const managerTeam: AgentTeam = {
      id: 'manager-team-1',
      name: 'Manager Team',
      description: 'Created by manager',
      task: 'Test manager-first create',
      status: 'idle',
      config: { ...DEFAULT_TEAM_CONFIG },
      leadId: managerLead.id,
      teammateIds: [managerLead.id],
      taskIds: [],
      messageIds: [],
      progress: 0,
      totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      createdAt: new Date('2026-03-04T09:00:00.000Z'),
    };

    mockManagerCreateTeam.mockReturnValue(managerTeam);
    mockManagerGetTeammate.mockReturnValue(managerLead);

    const { result } = renderHook(() => useAgentTeam());

    let createdTeam: AgentTeam;
    act(() => {
      createdTeam = result.current.createTeam({
        name: 'UI Input Team',
        task: 'Sync to manager IDs',
      });
    });

    expect(createdTeam!.id).toBe(managerTeam.id);
    expect(mockManagerCreateTeam).toHaveBeenCalledTimes(1);

    const managerCreateInput = mockManagerCreateTeam.mock.calls[0]?.[0] as CreateTeamInput;
    expect(managerCreateInput.config).toEqual(
      expect.objectContaining({
        defaultProvider: 'openai',
        defaultModel: 'gpt-test-model',
        defaultApiKey: 'active-api-key',
        defaultBaseURL: 'https://api.example.com',
      })
    );

    expect(mockStoreUpsertTeam).toHaveBeenCalledWith(managerTeam);
    expect(mockManagerGetTeammate).toHaveBeenCalledWith(managerTeam.leadId);
    expect(mockStoreUpsertTeammate).toHaveBeenCalledWith(managerLead);
    expect(mockStoreSetActiveTeam).toHaveBeenCalledWith(managerTeam.id);
  });

  it('createTeamFromTemplate upserts manager team and teammates using manager IDs', () => {
    const managerLead: AgentTeammate = {
      id: 'template-lead-1',
      teamId: 'template-team-1',
      name: 'Template Lead',
      description: 'Template lead',
      role: 'lead',
      status: 'idle',
      config: {},
      completedTaskIds: [],
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      progress: 0,
      createdAt: new Date('2026-03-04T09:00:00.000Z'),
    };

    const managerSpecialist: AgentTeammate = {
      id: 'template-specialist-1',
      teamId: 'template-team-1',
      name: 'Template Specialist',
      description: 'Handles specialist work',
      role: 'teammate',
      status: 'idle',
      config: {},
      completedTaskIds: [],
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      progress: 0,
      createdAt: new Date('2026-03-04T09:00:00.000Z'),
    };

    const managerTeam: AgentTeam = {
      id: 'template-team-1',
      name: 'Template Team',
      description: 'Manager-created template team',
      task: 'Do template work',
      status: 'idle',
      config: { ...DEFAULT_TEAM_CONFIG },
      leadId: managerLead.id,
      teammateIds: [managerLead.id, managerSpecialist.id],
      taskIds: [],
      messageIds: [],
      progress: 0,
      totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      createdAt: new Date('2026-03-04T09:00:00.000Z'),
    };

    const template: AgentTeamTemplate = {
      id: 'research-template',
      name: 'Research Template',
      description: 'Template for research',
      category: 'research',
      teammates: [
        {
          name: 'Research Specialist',
          description: 'Collects research',
          specialization: 'research',
        },
      ],
      config: {
        executionMode: 'coordinated',
      },
    };

    createTeamFromTemplateMock.mockReturnValue(managerTeam);
    mockManagerGetTeammate.mockImplementation((teammateId: string) => {
      if (teammateId === managerLead.id) return managerLead;
      if (teammateId === managerSpecialist.id) return managerSpecialist;
      return undefined;
    });

    const { result } = renderHook(() => useAgentTeam());

    let createdTeam: AgentTeam;
    act(() => {
      createdTeam = result.current.createTeamFromTemplate(template, 'Template task');
    });

    expect(createdTeam!.id).toBe(managerTeam.id);
    expect(createTeamFromTemplateMock).toHaveBeenCalledWith(
      template,
      'Template task',
      expect.objectContaining({
        defaultProvider: 'openai',
        defaultModel: 'gpt-test-model',
        defaultApiKey: 'active-api-key',
        defaultBaseURL: 'https://api.example.com',
      }),
      undefined
    );
    expect(mockStoreUpsertTeam).toHaveBeenCalledWith(managerTeam);
    expect(mockStoreUpsertTeammate).toHaveBeenCalledWith(managerLead);
    expect(mockStoreUpsertTeammate).toHaveBeenCalledWith(managerSpecialist);
    expect(mockStoreSetActiveTeam).toHaveBeenCalledWith(managerTeam.id);
  });

  it('addTeammate returns manager teammate and upserts by manager id', () => {
    const managerTeammate: AgentTeammate = {
      id: 'manager-teammate-2',
      teamId: 'manager-team-1',
      name: 'Manager Teammate',
      description: 'From manager',
      role: 'teammate',
      status: 'idle',
      config: {},
      completedTaskIds: [],
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      progress: 0,
      createdAt: new Date('2026-03-04T09:00:00.000Z'),
    };
    mockManagerAddTeammate.mockReturnValue(managerTeammate);

    const { result } = renderHook(() => useAgentTeam());
    const input: AddTeammateInput = { teamId: 'manager-team-1', name: 'UI Teammate' };

    let createdTeammate: AgentTeammate;
    act(() => {
      createdTeammate = result.current.addTeammate(input);
    });

    expect(createdTeammate!.id).toBe(managerTeammate.id);
    expect(mockManagerAddTeammate).toHaveBeenCalledWith(input);
    expect(mockStoreUpsertTeammate).toHaveBeenCalledWith(managerTeammate);
  });

  it('addTeammate throws when manager rejects teammate creation', () => {
    mockManagerAddTeammate.mockReturnValue(null);

    const { result } = renderHook(() => useAgentTeam());

    expect(() =>
      act(() => {
        result.current.addTeammate({ teamId: 'manager-team-404', name: 'No Team' });
      })
    ).toThrow('Failed to add teammate to team: manager-team-404');
    expect(mockStoreUpsertTeammate).not.toHaveBeenCalled();
  });

  it('createTask returns manager task and upserts by manager id', () => {
    const managerTask: AgentTeamTask = {
      id: 'manager-task-1',
      teamId: 'manager-team-1',
      title: 'Manager task',
      description: 'Created by manager',
      status: 'pending',
      priority: 'normal',
      dependencies: [],
      tags: [],
      createdAt: new Date('2026-03-04T09:00:00.000Z'),
      order: 0,
    };
    mockManagerCreateTask.mockReturnValue(managerTask);

    const { result } = renderHook(() => useAgentTeam());
    const input: CreateTaskInput = {
      teamId: 'manager-team-1',
      title: 'UI task title',
      description: 'UI task description',
    };

    let createdTask: AgentTeamTask;
    act(() => {
      createdTask = result.current.createTask(input);
    });

    expect(createdTask!.id).toBe(managerTask.id);
    expect(mockManagerCreateTask).toHaveBeenCalledWith(input);
    expect(mockStoreUpsertTask).toHaveBeenCalledWith(managerTask);
  });

  it('sendMessage returns manager message and upserts by manager id', () => {
    const managerMessage: AgentTeamMessage = {
      id: 'manager-message-1',
      teamId: 'manager-team-1',
      type: 'broadcast',
      senderId: 'manager-lead-1',
      senderName: 'Team Lead',
      content: 'Manager broadcast',
      read: false,
      timestamp: new Date('2026-03-04T09:00:00.000Z'),
    };
    mockManagerSendMessage.mockReturnValue(managerMessage);

    const { result } = renderHook(() => useAgentTeam());
    const input: SendMessageInput = {
      teamId: 'manager-team-1',
      senderId: 'manager-lead-1',
      content: 'UI message',
    };

    let sentMessage: AgentTeamMessage;
    act(() => {
      sentMessage = result.current.sendMessage(input);
    });

    expect(sentMessage!.id).toBe(managerMessage.id);
    expect(mockManagerSendMessage).toHaveBeenCalledWith(input);
    expect(mockStoreUpsertMessage).toHaveBeenCalledWith(managerMessage);
  });

  it('delegateTaskToBackground syncs delegation progress and terminal snapshots', async () => {
    const updatedTask: AgentTeamTask = {
      id: 'task-1',
      teamId: 'team-1',
      title: 'Delegated task',
      description: 'Run in background',
      status: 'completed',
      priority: 'background',
      dependencies: [],
      tags: [],
      result: 'done',
      createdAt: new Date('2026-03-04T09:00:00.000Z'),
      order: 0,
      metadata: {
        delegationId: 'delegation-1',
        delegationStatus: 'completed',
      },
    };

    const updatedTeam: AgentTeam = {
      id: 'team-1',
      name: 'Delegation Team',
      description: 'delegation',
      task: 'task',
      status: 'executing',
      config: { ...DEFAULT_TEAM_CONFIG },
      leadId: 'lead-1',
      teammateIds: ['lead-1'],
      taskIds: ['task-1'],
      messageIds: [],
      progress: 30,
      totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      createdAt: new Date('2026-03-04T09:00:00.000Z'),
    };

    mockManagerDelegateTaskToBackground.mockResolvedValue('delegation-1');
    mockManagerGetTask.mockReturnValue(updatedTask);
    mockManagerGetTeam.mockReturnValue(updatedTeam);

    const { result } = renderHook(() => useAgentTeam());

    let delegationId: string | null = null;
    await act(async () => {
      delegationId = await result.current.delegateTaskToBackground('team-1', 'task-1');
    });

    expect(delegationId).toBe('delegation-1');
    expect(mockStoreSetTaskStatus).toHaveBeenCalledWith('task-1', 'in_progress');
    expect(mockManagerDelegateTaskToBackground).toHaveBeenCalledWith('team-1', 'task-1', undefined);
    expect(mockStoreUpsertTask).toHaveBeenCalledWith(updatedTask);
    expect(mockStoreUpsertTeam).toHaveBeenCalledWith(updatedTeam);
    expect(mockStoreAddEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'delegation_completed',
        teamId: 'team-1',
        taskId: 'task-1',
      })
    );
  });

  it('assessTeamRouting returns the manager assessment and syncs the refreshed team snapshot', () => {
    const assessment: TeamRoutingAssessment = {
      recommendedPattern: 'parallel_specialists',
      confidence: 0.88,
      reason: 'Complex task with parallelizable specialist work',
      factors: {
        taskComplexity: 'complex',
        specializationNeeded: true,
        contextIsolationNeeded: true,
        delegationCandidate: false,
        budgetPressure: 'low',
      },
      createdAt: new Date('2026-03-14T10:00:00.000Z'),
    };

    const updatedTeam: AgentTeam = {
      id: 'team-1',
      name: 'Routing Team',
      description: 'routing',
      task: 'task',
      status: 'idle',
      config: { ...DEFAULT_TEAM_CONFIG },
      routingAssessment: assessment,
      selectedExecutionPattern: 'parallel_specialists',
      leadId: 'lead-1',
      teammateIds: ['lead-1'],
      taskIds: [],
      messageIds: [],
      progress: 0,
      totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      createdAt: new Date('2026-03-14T10:00:00.000Z'),
    };

    mockManagerAssessTeamRouting.mockReturnValue(assessment);
    mockManagerGetTeam.mockReturnValue(updatedTeam);

    const { result } = renderHook(() => useAgentTeam());
    const api = result.current as typeof result.current & {
      assessTeamRouting?: (teamId: string) => TeamRoutingAssessment | null;
    };

    let returnedAssessment: TeamRoutingAssessment | null | undefined;
    act(() => {
      returnedAssessment = api.assessTeamRouting?.('team-1');
    });

    expect(returnedAssessment).toEqual(assessment);
    expect(mockManagerAssessTeamRouting).toHaveBeenCalledWith('team-1');
    expect(mockStoreUpsertTeam).toHaveBeenCalledWith(updatedTeam);
    expect(mockStoreAddEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'routing_assessed',
        teamId: 'team-1',
      })
    );
  });

  it('selectExecutionPattern persists the operator override through the manager and store', () => {
    const updatedTeam: AgentTeam = {
      id: 'team-1',
      name: 'Routing Team',
      description: 'routing',
      task: 'task',
      status: 'idle',
      config: { ...DEFAULT_TEAM_CONFIG },
      routingAssessment: {
        recommendedPattern: 'parallel_specialists',
        confidence: 0.88,
        reason: 'Complex task with parallelizable specialist work',
        factors: {
          taskComplexity: 'complex',
          specializationNeeded: true,
          contextIsolationNeeded: true,
          delegationCandidate: false,
          budgetPressure: 'low',
        },
        createdAt: new Date('2026-03-14T10:00:00.000Z'),
        overridePattern: 'background_handoff',
        acceptedPattern: 'background_handoff',
      },
      selectedExecutionPattern: 'background_handoff',
      leadId: 'lead-1',
      teammateIds: ['lead-1'],
      taskIds: [],
      messageIds: [],
      progress: 0,
      totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      createdAt: new Date('2026-03-14T10:00:00.000Z'),
    };

    mockManagerSelectExecutionPattern.mockReturnValue(updatedTeam);

    const { result } = renderHook(() => useAgentTeam());
    const api = result.current as typeof result.current & {
      selectExecutionPattern?: (teamId: string, pattern: string) => AgentTeam | null;
    };

    let selectedTeam: AgentTeam | null | undefined;
    act(() => {
      selectedTeam = api.selectExecutionPattern?.('team-1', 'background_handoff');
    });

    expect(selectedTeam).toEqual(updatedTeam);
    expect(mockManagerSelectExecutionPattern).toHaveBeenCalledWith('team-1', 'background_handoff');
    expect(mockStoreUpsertTeam).toHaveBeenCalledWith(updatedTeam);
    expect(mockStoreAddEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'pattern_selected',
        teamId: 'team-1',
      })
    );
  });
});
