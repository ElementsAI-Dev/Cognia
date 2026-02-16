import {
  DEFAULT_TEAM_CONFIG,
  BUILT_IN_TEAM_TEMPLATES,
  type AgentTeam,
  type AgentTeammate,
  type AgentTeamTask,
  type AgentTeamMessage,
  type AgentTeamTemplate,
  type AgentTeamEvent,
  type TeamDisplayMode,
} from '@/types/agent/agent-team';

export const builtInTemplatesMap = BUILT_IN_TEAM_TEMPLATES.reduce(
  (acc: Record<string, AgentTeamTemplate>, template: AgentTeamTemplate) => ({
    ...acc,
    [template.id]: template,
  }),
  {} as Record<string, AgentTeamTemplate>
);

export const initialState = {
  teams: {} as Record<string, AgentTeam>,
  teammates: {} as Record<string, AgentTeammate>,
  tasks: {} as Record<string, AgentTeamTask>,
  messages: {} as Record<string, AgentTeamMessage>,
  templates: builtInTemplatesMap,
  events: [] as AgentTeamEvent[],
  activeTeamId: null as string | null,
  selectedTeammateId: null as string | null,
  displayMode: 'expanded' as TeamDisplayMode,
  isPanelOpen: false,
  defaultConfig: { ...DEFAULT_TEAM_CONFIG },
};
