/**
 * Working Memory - Short-term context management for conversations
 * 
 * Implements a hierarchical memory architecture inspired by:
 * - MemGPT/Letta: OS-style memory management
 * - Human cognitive architecture: Working memory + Long-term memory
 * 
 * Features:
 * - Session-scoped temporary memory
 * - Token budget management
 * - Automatic memory promotion/demotion
 * - Context window optimization
 */

import type { Memory, MemoryType } from '@/types';
import type { ActivatedMemory } from './memory-activator';

export interface WorkingMemoryConfig {
  maxTokens: number;
  reservedTokens: number;
  maxRecentMessages: number;
  maxActivatedMemories: number;
  enableScratchpad: boolean;
  autoPromoteThreshold: number;
  autoDemoteThreshold: number;
}

export const DEFAULT_WORKING_MEMORY_CONFIG: WorkingMemoryConfig = {
  maxTokens: 4000,
  reservedTokens: 500,
  maxRecentMessages: 10,
  maxActivatedMemories: 10,
  enableScratchpad: true,
  autoPromoteThreshold: 0.8,
  autoDemoteThreshold: 0.2,
};

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface SessionContext {
  currentTask?: string;
  userIntent?: string;
  scratchpad: string;
  pendingActions: string[];
  lastUpdated: Date;
}

export interface WorkingMemoryState {
  sessionId: string;
  sessionContext: SessionContext;
  recentMessages: ConversationMessage[];
  activatedMemories: ActivatedMemory[];
  tokenUsage: {
    messages: number;
    memories: number;
    context: number;
    total: number;
  };
}

export interface MemoryPromotionCandidate {
  memory: Memory;
  reason: string;
  score: number;
}

export interface MemoryDemotionCandidate {
  memoryId: string;
  reason: string;
}

export class WorkingMemory {
  private config: WorkingMemoryConfig;
  private state: WorkingMemoryState;

  constructor(sessionId: string, config: Partial<WorkingMemoryConfig> = {}) {
    this.config = { ...DEFAULT_WORKING_MEMORY_CONFIG, ...config };
    this.state = {
      sessionId,
      sessionContext: {
        scratchpad: '',
        pendingActions: [],
        lastUpdated: new Date(),
      },
      recentMessages: [],
      activatedMemories: [],
      tokenUsage: {
        messages: 0,
        memories: 0,
        context: 0,
        total: 0,
      },
    };
  }

  getState(): WorkingMemoryState {
    return { ...this.state };
  }

  getSessionId(): string {
    return this.state.sessionId;
  }

  addMessage(message: ConversationMessage): void {
    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date(),
    };

    this.state.recentMessages.push(messageWithTimestamp);

    // Trim to max recent messages
    if (this.state.recentMessages.length > this.config.maxRecentMessages) {
      this.state.recentMessages = this.state.recentMessages.slice(-this.config.maxRecentMessages);
    }

    this.updateTokenUsage();
  }

  getRecentMessages(limit?: number): ConversationMessage[] {
    const count = limit ?? this.config.maxRecentMessages;
    return this.state.recentMessages.slice(-count);
  }

  clearMessages(): void {
    this.state.recentMessages = [];
    this.updateTokenUsage();
  }

  setActivatedMemories(memories: ActivatedMemory[]): void {
    this.state.activatedMemories = memories.slice(0, this.config.maxActivatedMemories);
    this.updateTokenUsage();
  }

  addActivatedMemory(memory: ActivatedMemory): void {
    // Check if already exists
    const existingIdx = this.state.activatedMemories.findIndex(
      m => m.memory.id === memory.memory.id
    );

    if (existingIdx >= 0) {
      // Update existing
      this.state.activatedMemories[existingIdx] = memory;
    } else {
      // Add new
      this.state.activatedMemories.push(memory);
    }

    // Trim to max
    if (this.state.activatedMemories.length > this.config.maxActivatedMemories) {
      // Sort by score and keep top N
      this.state.activatedMemories.sort((a, b) => b.activationScore - a.activationScore);
      this.state.activatedMemories = this.state.activatedMemories.slice(0, this.config.maxActivatedMemories);
    }

    this.updateTokenUsage();
  }

  removeActivatedMemory(memoryId: string): void {
    this.state.activatedMemories = this.state.activatedMemories.filter(
      m => m.memory.id !== memoryId
    );
    this.updateTokenUsage();
  }

  getActivatedMemories(): ActivatedMemory[] {
    return [...this.state.activatedMemories];
  }

  updateSessionContext(updates: Partial<SessionContext>): void {
    this.state.sessionContext = {
      ...this.state.sessionContext,
      ...updates,
      lastUpdated: new Date(),
    };
    this.updateTokenUsage();
  }

  getSessionContext(): SessionContext {
    return { ...this.state.sessionContext };
  }

  appendToScratchpad(content: string): void {
    if (!this.config.enableScratchpad) return;

    const scratchpad = this.state.sessionContext.scratchpad;
    this.state.sessionContext.scratchpad = scratchpad
      ? `${scratchpad}\n${content}`
      : content;
    this.state.sessionContext.lastUpdated = new Date();
    this.updateTokenUsage();
  }

  clearScratchpad(): void {
    this.state.sessionContext.scratchpad = '';
    this.updateTokenUsage();
  }

  addPendingAction(action: string): void {
    this.state.sessionContext.pendingActions.push(action);
  }

  removePendingAction(index: number): void {
    this.state.sessionContext.pendingActions.splice(index, 1);
  }

  clearPendingActions(): void {
    this.state.sessionContext.pendingActions = [];
  }

  getTokenUsage(): WorkingMemoryState['tokenUsage'] {
    return { ...this.state.tokenUsage };
  }

  getAvailableTokens(): number {
    return this.config.maxTokens - this.config.reservedTokens - this.state.tokenUsage.total;
  }

  isWithinBudget(): boolean {
    return this.state.tokenUsage.total <= this.config.maxTokens - this.config.reservedTokens;
  }

  private updateTokenUsage(): void {
    // Estimate token counts (rough approximation: ~4 chars per token)
    const charToTokens = (text: string) => Math.ceil(text.length / 4);

    const messagesTokens = this.state.recentMessages.reduce(
      (sum, m) => sum + charToTokens(m.content),
      0
    );

    const memoriesTokens = this.state.activatedMemories.reduce(
      (sum, m) => sum + charToTokens(m.memory.content),
      0
    );

    const contextTokens =
      charToTokens(this.state.sessionContext.scratchpad) +
      charToTokens(this.state.sessionContext.currentTask || '') +
      charToTokens(this.state.sessionContext.userIntent || '') +
      this.state.sessionContext.pendingActions.reduce((sum, a) => sum + charToTokens(a), 0);

    this.state.tokenUsage = {
      messages: messagesTokens,
      memories: memoriesTokens,
      context: contextTokens,
      total: messagesTokens + memoriesTokens + contextTokens,
    };
  }

  findPromotionCandidates(): MemoryPromotionCandidate[] {
    const candidates: MemoryPromotionCandidate[] = [];

    for (const activated of this.state.activatedMemories) {
      if (activated.activationScore >= this.config.autoPromoteThreshold) {
        // Check if it should be promoted to long-term memory
        const isTemporary = activated.memory.scope === 'session';
        
        if (isTemporary) {
          candidates.push({
            memory: activated.memory,
            reason: `High activation score (${(activated.activationScore * 100).toFixed(0)}%) suggests global relevance`,
            score: activated.activationScore,
          });
        }
      }
    }

    return candidates;
  }

  findDemotionCandidates(): MemoryDemotionCandidate[] {
    const candidates: MemoryDemotionCandidate[] = [];

    for (const activated of this.state.activatedMemories) {
      if (activated.activationScore <= this.config.autoDemoteThreshold) {
        candidates.push({
          memoryId: activated.memory.id,
          reason: `Low activation score (${(activated.activationScore * 100).toFixed(0)}%)`,
        });
      }
    }

    return candidates;
  }

  compressForContext(maxTokens?: number): string {
    const budget = maxTokens ?? this.getAvailableTokens();
    const charBudget = budget * 4; // Rough conversion

    const parts: string[] = [];
    let usedChars = 0;

    // 1. Add session context (highest priority)
    if (this.state.sessionContext.currentTask) {
      const taskText = `Current task: ${this.state.sessionContext.currentTask}`;
      if (usedChars + taskText.length < charBudget) {
        parts.push(taskText);
        usedChars += taskText.length;
      }
    }

    // 2. Add activated memories (sorted by score)
    const sortedMemories = [...this.state.activatedMemories].sort(
      (a, b) => b.activationScore - a.activationScore
    );

    const memoryParts: string[] = [];
    for (const activated of sortedMemories) {
      const memText = `- ${activated.memory.content}`;
      if (usedChars + memText.length < charBudget * 0.4) {
        memoryParts.push(memText);
        usedChars += memText.length;
      } else {
        break;
      }
    }

    if (memoryParts.length > 0) {
      parts.push(`Relevant memories:\n${memoryParts.join('\n')}`);
    }

    // 3. Add recent message summary if space available
    if (this.state.recentMessages.length > 0 && usedChars < charBudget * 0.8) {
      const recentCount = Math.min(3, this.state.recentMessages.length);
      const recent = this.state.recentMessages.slice(-recentCount);
      const recentText = recent.map(m => `${m.role}: ${m.content.slice(0, 100)}...`).join('\n');
      
      if (usedChars + recentText.length < charBudget) {
        parts.push(`Recent context:\n${recentText}`);
      }
    }

    return parts.join('\n\n');
  }

  buildPromptSection(): string {
    const sections: string[] = [];

    // Session context
    if (this.state.sessionContext.currentTask) {
      sections.push(`## Current Task\n${this.state.sessionContext.currentTask}`);
    }

    // Activated memories by type
    const memoryGroups: Record<MemoryType, string[]> = {
      preference: [],
      fact: [],
      instruction: [],
      context: [],
    };

    for (const activated of this.state.activatedMemories) {
      const { memory } = activated;
      memoryGroups[memory.type].push(`- ${memory.content}`);
    }

    if (memoryGroups.preference.length > 0) {
      sections.push(`## User Preferences\n${memoryGroups.preference.join('\n')}`);
    }
    if (memoryGroups.fact.length > 0) {
      sections.push(`## About the User\n${memoryGroups.fact.join('\n')}`);
    }
    if (memoryGroups.instruction.length > 0) {
      sections.push(`## User Instructions\n${memoryGroups.instruction.join('\n')}`);
    }
    if (memoryGroups.context.length > 0) {
      sections.push(`## Context\n${memoryGroups.context.join('\n')}`);
    }

    // Scratchpad (for AI's working notes)
    if (this.config.enableScratchpad && this.state.sessionContext.scratchpad) {
      sections.push(`## Working Notes\n${this.state.sessionContext.scratchpad}`);
    }

    return sections.join('\n\n');
  }

  reset(): void {
    this.state = {
      sessionId: this.state.sessionId,
      sessionContext: {
        scratchpad: '',
        pendingActions: [],
        lastUpdated: new Date(),
      },
      recentMessages: [],
      activatedMemories: [],
      tokenUsage: {
        messages: 0,
        memories: 0,
        context: 0,
        total: 0,
      },
    };
  }
}

export function createWorkingMemory(
  sessionId: string,
  config?: Partial<WorkingMemoryConfig>
): WorkingMemory {
  return new WorkingMemory(sessionId, config);
}

export default WorkingMemory;
