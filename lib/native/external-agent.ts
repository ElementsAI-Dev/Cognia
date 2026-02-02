/**
 * External Agent API
 *
 * Provides TypeScript wrappers for external agent and ACP terminal management.
 * Used for spawning, managing, and communicating with external agent processes.
 */

import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'

// ============================================================================
// Types
// ============================================================================

/** External agent spawn configuration */
export interface ExternalAgentSpawnConfig {
  id: string
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
}

/** Terminal state */
export type TerminalState =
  | { type: 'Running' }
  | { type: 'Exited'; code: number }
  | { type: 'Killed' }
  | { type: 'Error'; message: string }

/** Terminal output result */
export interface TerminalOutputResult {
  output: string
  exitCode: number | null
}

/** Terminal info */
export interface TerminalInfo {
  id: string
  sessionId: string
  command: string
  state: TerminalState
  exitCode: number | null
}

/** External agent event payloads */
export interface ExternalAgentSpawnEvent {
  agentId: string
  status: string
}

export interface ExternalAgentStdoutEvent {
  agentId: string
  data: string
}

export interface ExternalAgentExitEvent {
  agentId: string
  code: number
}

export interface ExternalAgentStateChangeEvent {
  agentId: string
  state: 'Starting' | 'Running' | 'Stopping' | 'Stopped' | 'Failed'
}

export interface ExternalAgentStderrEvent {
  agentId: string
  data: string
}

// ============================================================================
// External Agent Commands
// ============================================================================

/**
 * Spawn an external agent process
 */
export async function spawnExternalAgent(
  config: ExternalAgentSpawnConfig
): Promise<string> {
  return invoke<string>('spawn_external_agent', { config })
}

/**
 * Send a message to an external agent process
 */
export async function sendToExternalAgent(
  agentId: string,
  message: string
): Promise<void> {
  return invoke<void>('send_to_external_agent', { agentId, message })
}

/**
 * Kill an external agent process
 */
export async function killExternalAgent(agentId: string): Promise<void> {
  return invoke<void>('kill_external_agent', { agentId })
}

/**
 * Get status of an external agent process
 */
export async function getExternalAgentStatus(agentId: string): Promise<string> {
  return invoke<string>('get_external_agent_status', { agentId })
}

/**
 * List all external agent processes
 */
export async function listExternalAgents(): Promise<string[]> {
  return invoke<string[]>('list_external_agents')
}

/**
 * Kill all external agent processes
 */
export async function killAllExternalAgents(): Promise<void> {
  return invoke<void>('kill_all_external_agents')
}

/**
 * Receive stderr from an external agent process
 */
export async function receiveExternalAgentStderr(
  agentId: string
): Promise<string[]> {
  return invoke<string[]>('receive_external_agent_stderr', { agentId })
}

/**
 * Check if an external agent process is running
 */
export async function isExternalAgentRunning(agentId: string): Promise<boolean> {
  return invoke<boolean>('is_external_agent_running', { agentId })
}

/**
 * External agent process info
 */
export interface ExternalAgentInfo {
  id: string
  pid: number | null
  state: string
  command: string
  args: string[]
  cwd: string | null
  env: Record<string, string>
}

/**
 * Get detailed info about an external agent process
 */
export async function getExternalAgentInfo(
  agentId: string
): Promise<ExternalAgentInfo> {
  return invoke<ExternalAgentInfo>('get_external_agent_info', { agentId })
}

/**
 * Set external agent state to Running
 */
export async function setExternalAgentRunning(agentId: string): Promise<void> {
  return invoke<void>('set_external_agent_running', { agentId })
}

/**
 * Set external agent state to Failed
 */
export async function setExternalAgentFailed(agentId: string): Promise<void> {
  return invoke<void>('set_external_agent_failed', { agentId })
}

// ============================================================================
// ACP Terminal Commands
// ============================================================================

/**
 * Create a new terminal for ACP agent
 */
export async function acpTerminalCreate(
  sessionId: string,
  command: string,
  args: string[] = [],
  cwd?: string
): Promise<string> {
  return invoke<string>('acp_terminal_create', { sessionId, command, args, cwd })
}

/**
 * Get output from an ACP terminal
 */
export async function acpTerminalOutput(
  terminalId: string
): Promise<TerminalOutputResult> {
  return invoke<TerminalOutputResult>('acp_terminal_output', { terminalId })
}

/**
 * Kill an ACP terminal
 */
export async function acpTerminalKill(terminalId: string): Promise<void> {
  return invoke<void>('acp_terminal_kill', { terminalId })
}

/**
 * Release an ACP terminal (remove from manager)
 */
export async function acpTerminalRelease(terminalId: string): Promise<void> {
  return invoke<void>('acp_terminal_release', { terminalId })
}

/**
 * Wait for an ACP terminal to exit
 */
export async function acpTerminalWaitForExit(
  terminalId: string,
  timeout?: number
): Promise<number> {
  return invoke<number>('acp_terminal_wait_for_exit', { terminalId, timeout })
}

/**
 * Write to an ACP terminal
 */
export async function acpTerminalWrite(
  terminalId: string,
  data: string
): Promise<void> {
  return invoke<void>('acp_terminal_write', { terminalId, data })
}

/**
 * Get all terminals for a session
 */
export async function acpTerminalGetSessionTerminals(
  sessionId: string
): Promise<string[]> {
  return invoke<string[]>('acp_terminal_get_session_terminals', { sessionId })
}

/**
 * Kill all terminals for a session
 */
export async function acpTerminalKillSessionTerminals(
  sessionId: string
): Promise<void> {
  return invoke<void>('acp_terminal_kill_session_terminals', { sessionId })
}

/**
 * Check if a terminal is running
 */
export async function acpTerminalIsRunning(
  terminalId: string
): Promise<boolean> {
  return invoke<boolean>('acp_terminal_is_running', { terminalId })
}

/**
 * Get terminal info
 */
export async function acpTerminalGetInfo(
  terminalId: string
): Promise<TerminalInfo> {
  return invoke<TerminalInfo>('acp_terminal_get_info', { terminalId })
}

/**
 * List all terminal IDs
 */
export async function acpTerminalList(): Promise<string[]> {
  return invoke<string[]>('acp_terminal_list')
}

// ============================================================================
// Event Listeners
// ============================================================================

/**
 * Listen for external agent spawn events
 */
export async function onExternalAgentSpawn(
  callback: (event: ExternalAgentSpawnEvent) => void
): Promise<UnlistenFn> {
  return listen<ExternalAgentSpawnEvent>('external-agent://spawn', (event) => {
    callback(event.payload)
  })
}

/**
 * Listen for external agent stdout events
 */
export async function onExternalAgentStdout(
  callback: (event: ExternalAgentStdoutEvent) => void
): Promise<UnlistenFn> {
  return listen<ExternalAgentStdoutEvent>('external-agent://stdout', (event) => {
    callback(event.payload)
  })
}

/**
 * Listen for external agent exit events
 */
export async function onExternalAgentExit(
  callback: (event: ExternalAgentExitEvent) => void
): Promise<UnlistenFn> {
  return listen<ExternalAgentExitEvent>('external-agent://exit', (event) => {
    callback(event.payload)
  })
}

/**
 * Listen for external agent state change events
 */
export async function onExternalAgentStateChange(
  callback: (event: ExternalAgentStateChangeEvent) => void
): Promise<UnlistenFn> {
  return listen<ExternalAgentStateChangeEvent>('external-agent://state-change', (event) => {
    callback(event.payload)
  })
}

/**
 * Listen for external agent stderr events
 */
export async function onExternalAgentStderr(
  callback: (event: ExternalAgentStderrEvent) => void
): Promise<UnlistenFn> {
  return listen<ExternalAgentStderrEvent>('external-agent://stderr', (event) => {
    callback(event.payload)
  })
}

// ============================================================================
// High-level Helpers
// ============================================================================

/**
 * Execute a command in a terminal and wait for it to complete
 */
export async function executeCommand(
  sessionId: string,
  command: string,
  args: string[] = [],
  options?: {
    cwd?: string
    timeout?: number
    onOutput?: (output: string) => void
  }
): Promise<{ output: string; exitCode: number }> {
  const terminalId = await acpTerminalCreate(
    sessionId,
    command,
    args,
    options?.cwd
  )

  try {
    // Poll for output if callback provided
    if (options?.onOutput) {
      const pollInterval = setInterval(async () => {
        try {
          const result = await acpTerminalOutput(terminalId)
          if (result.output) {
            options.onOutput!(result.output)
          }
        } catch {
          // Terminal may have been released
        }
      }, 100)

      try {
        const exitCode = await acpTerminalWaitForExit(terminalId, options?.timeout)
        clearInterval(pollInterval)

        // Get final output
        const result = await acpTerminalOutput(terminalId)
        return { output: result.output, exitCode }
      } catch (error) {
        clearInterval(pollInterval)
        throw error
      }
    }

    // Simple wait without polling
    const exitCode = await acpTerminalWaitForExit(terminalId, options?.timeout)
    const result = await acpTerminalOutput(terminalId)
    return { output: result.output, exitCode }
  } finally {
    // Always release the terminal
    await acpTerminalRelease(terminalId).catch(() => {
      // Ignore release errors
    })
  }
}

/**
 * Run an interactive terminal session
 */
export async function createInteractiveTerminal(
  sessionId: string,
  command: string,
  args: string[] = [],
  cwd?: string
): Promise<{
  terminalId: string
  write: (data: string) => Promise<void>
  read: () => Promise<TerminalOutputResult>
  isRunning: () => Promise<boolean>
  kill: () => Promise<void>
  waitForExit: (timeout?: number) => Promise<number>
  release: () => Promise<void>
}> {
  const terminalId = await acpTerminalCreate(sessionId, command, args, cwd)

  return {
    terminalId,
    write: (data: string) => acpTerminalWrite(terminalId, data),
    read: () => acpTerminalOutput(terminalId),
    isRunning: () => acpTerminalIsRunning(terminalId),
    kill: () => acpTerminalKill(terminalId),
    waitForExit: (timeout?: number) => acpTerminalWaitForExit(terminalId, timeout),
    release: () => acpTerminalRelease(terminalId),
  }
}

/**
 * Clean up all terminals for a session
 */
export async function cleanupSessionTerminals(sessionId: string): Promise<void> {
  await acpTerminalKillSessionTerminals(sessionId)
}
