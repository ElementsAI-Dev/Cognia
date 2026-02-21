import type {
  EditorCommandContribution,
  EditorContextSnapshot,
  RegisteredEditorContext,
} from '@/types/editor/workbench';

type RegistryListener = () => void;

interface InternalRegisteredEditorContext extends RegisteredEditorContext {
  registeredAt: number;
}

const contextsByToken = new Map<string, InternalRegisteredEditorContext>();
let activeEditorToken: string | null = null;
let revision = 0;
const listeners = new Set<RegistryListener>();

function emitRegistryChange(): void {
  revision += 1;
  for (const listener of listeners) {
    listener();
  }
}

function generateToken(contextId: string): string {
  return `${contextId}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeCommandList(commands: EditorCommandContribution[] | undefined): EditorCommandContribution[] {
  if (!commands || commands.length === 0) {
    return [];
  }
  return commands.filter((command) => typeof command?.id === 'string' && command.id.length > 0);
}

export interface RegisterEditorContextInput
  extends Omit<RegisteredEditorContext, 'token' | 'commands'> {
  token?: string;
  commands?: EditorCommandContribution[];
}

export function registerEditorContext(input: RegisterEditorContextInput): string {
  const token = input.token ?? generateToken(input.contextId);
  contextsByToken.set(token, {
    token,
    contextId: input.contextId,
    label: input.label,
    languageId: input.languageId,
    runtimeMode: input.runtimeMode,
    editor: input.editor,
    capabilities: input.capabilities,
    commands: normalizeCommandList(input.commands),
    registeredAt: Date.now(),
  });
  if (!activeEditorToken) {
    activeEditorToken = token;
  }
  emitRegistryChange();
  return token;
}

export function updateEditorContext(
  token: string,
  updates: Partial<Omit<RegisteredEditorContext, 'token'>>
): void {
  const existing = contextsByToken.get(token);
  if (!existing) {
    return;
  }
  const next: InternalRegisteredEditorContext = {
    ...existing,
    ...updates,
    commands: normalizeCommandList(updates.commands ?? existing.commands),
  };
  contextsByToken.set(token, next);
  emitRegistryChange();
}

export function unregisterEditorContext(token: string): void {
  if (!contextsByToken.has(token)) {
    return;
  }
  contextsByToken.delete(token);
  if (activeEditorToken === token) {
    const next = contextsByToken.values().next();
    activeEditorToken = next.done ? null : next.value.token;
  }
  emitRegistryChange();
}

export function setActiveEditorContext(token: string | null): void {
  if (token !== null && !contextsByToken.has(token)) {
    return;
  }
  activeEditorToken = token;
  emitRegistryChange();
}

export function getActiveEditorContextToken(): string | null {
  return activeEditorToken;
}

export function getActiveEditorContext(): RegisteredEditorContext | null {
  if (!activeEditorToken) {
    return null;
  }
  const context = contextsByToken.get(activeEditorToken);
  return context ?? null;
}

export function listEditorContexts(): EditorContextSnapshot[] {
  return Array.from(contextsByToken.values())
    .sort((a, b) => b.registeredAt - a.registeredAt)
    .map((context) => ({
      token: context.token,
      contextId: context.contextId,
      label: context.label,
      languageId: context.languageId,
      runtimeMode: context.runtimeMode,
      capabilities: context.capabilities,
      commandCount: context.commands.length,
      isActive: context.token === activeEditorToken,
    }));
}

function checkCommandCapability(
  context: RegisteredEditorContext,
  command: EditorCommandContribution
): boolean {
  const required = command.requiresCapability;
  if (!required) {
    return true;
  }
  const requiredItems = Array.isArray(required) ? required : [required];
  return requiredItems.every((capability) => context.capabilities.capabilities[capability]);
}

export function getActiveEditorCommands(): EditorCommandContribution[] {
  const context = getActiveEditorContext();
  if (!context) {
    return [];
  }
  return context.commands.filter((command) => {
    const visible = command.when ? command.when() : true;
    return visible && checkCommandCapability(context, command);
  });
}

export async function runActiveEditorCommand(commandId: string): Promise<boolean> {
  const commands = getActiveEditorCommands();
  const command = commands.find((item) => item.id === commandId);
  if (!command) {
    return false;
  }
  await command.run();
  return true;
}

export function subscribeEditorContextRegistry(listener: RegistryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getEditorContextRegistryRevision(): number {
  return revision;
}
