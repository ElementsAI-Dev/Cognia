import type {
  BackgroundAgent,
  BackgroundAgentQueueState,
} from '@/types/agent/background-agent';
export const initialState = {
  agents: {} as Record<string, BackgroundAgent>,
  queue: {
    items: [],
    maxConcurrent: 3,
    currentlyRunning: 0,
    isPaused: false,
  } as BackgroundAgentQueueState,
  isPanelOpen: false,
  selectedAgentId: null as string | null,
};
