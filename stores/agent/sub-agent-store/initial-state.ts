import { BUILT_IN_SUBAGENT_TEMPLATES } from '@/types/agent/sub-agent';
import type { SubAgent, SubAgentGroup, SubAgentTemplate, SubAgentMetrics } from '@/types/agent/sub-agent';

export const builtInTemplatesMap = BUILT_IN_SUBAGENT_TEMPLATES.reduce(
  (acc: Record<string, SubAgentTemplate>, template: SubAgentTemplate) => ({
    ...acc,
    [template.id]: template,
  }),
  {} as Record<string, SubAgentTemplate>
);

export const initialState = {
  subAgents: {} as Record<string, SubAgent>,
  groups: {} as Record<string, SubAgentGroup>,
  templates: builtInTemplatesMap,
  metrics: {} as Record<string, SubAgentMetrics>,
  activeParentId: null as string | null,
};
