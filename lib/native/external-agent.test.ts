/**
 * External Agent API Tests
 */

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  spawnExternalAgent,
  sendToExternalAgent,
  killExternalAgent,
  getExternalAgentStatus,
  listExternalAgents,
  killAllExternalAgents,
  receiveExternalAgentStderr,
  isExternalAgentRunning,
  getExternalAgentInfo,
  setExternalAgentRunning,
  setExternalAgentFailed,
  acpTerminalCreate,
  acpTerminalOutput,
  acpTerminalKill,
  acpTerminalRelease,
  acpTerminalWaitForExit,
  acpTerminalWrite,
  acpTerminalGetSessionTerminals,
  acpTerminalKillSessionTerminals,
  acpTerminalIsRunning,
  acpTerminalGetInfo,
  acpTerminalList,
  executeCommand,
  createInteractiveTerminal,
  cleanupSessionTerminals,
  onExternalAgentSpawn,
  onExternalAgentStdout,
  onExternalAgentExit,
  onExternalAgentStateChange,
  onExternalAgentStderr,
} from './external-agent'

// Mock Tauri APIs
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}))

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(),
}))

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>
const mockListen = listen as jest.MockedFunction<typeof listen>

describe('External Agent API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('External Agent Commands', () => {
    it('should spawn external agent', async () => {
      mockInvoke.mockResolvedValueOnce('agent-123')

      const config = {
        id: 'test-agent',
        command: 'node',
        args: ['script.js'],
      }

      const result = await spawnExternalAgent(config)

      expect(mockInvoke).toHaveBeenCalledWith('spawn_external_agent', { config })
      expect(result).toBe('agent-123')
    })

    it('should send message to external agent', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await sendToExternalAgent('agent-123', 'hello')

      expect(mockInvoke).toHaveBeenCalledWith('send_to_external_agent', {
        agentId: 'agent-123',
        message: 'hello',
      })
    })

    it('should kill external agent', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await killExternalAgent('agent-123')

      expect(mockInvoke).toHaveBeenCalledWith('kill_external_agent', {
        agentId: 'agent-123',
      })
    })

    it('should get external agent status', async () => {
      mockInvoke.mockResolvedValueOnce('Running')

      const status = await getExternalAgentStatus('agent-123')

      expect(mockInvoke).toHaveBeenCalledWith('get_external_agent_status', {
        agentId: 'agent-123',
      })
      expect(status).toBe('Running')
    })

    it('should list external agents', async () => {
      mockInvoke.mockResolvedValueOnce(['agent-1', 'agent-2'])

      const agents = await listExternalAgents()

      expect(mockInvoke).toHaveBeenCalledWith('list_external_agents')
      expect(agents).toEqual(['agent-1', 'agent-2'])
    })

    it('should kill all external agents', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await killAllExternalAgents()

      expect(mockInvoke).toHaveBeenCalledWith('kill_all_external_agents')
    })

    it('should receive stderr from external agent', async () => {
      mockInvoke.mockResolvedValueOnce(['error line 1', 'error line 2'])

      const stderr = await receiveExternalAgentStderr('agent-123')

      expect(mockInvoke).toHaveBeenCalledWith('receive_external_agent_stderr', {
        agentId: 'agent-123',
      })
      expect(stderr).toEqual(['error line 1', 'error line 2'])
    })

    it('should check if external agent is running', async () => {
      mockInvoke.mockResolvedValueOnce(true)

      const isRunning = await isExternalAgentRunning('agent-123')

      expect(mockInvoke).toHaveBeenCalledWith('is_external_agent_running', {
        agentId: 'agent-123',
      })
      expect(isRunning).toBe(true)
    })

    it('should get external agent info', async () => {
      const mockInfo = {
        id: 'agent-123',
        pid: 12345,
        state: 'Running',
        command: 'node',
        args: ['script.js'],
        cwd: '/home/user',
        env: { NODE_ENV: 'development' },
      }
      mockInvoke.mockResolvedValueOnce(mockInfo)

      const info = await getExternalAgentInfo('agent-123')

      expect(mockInvoke).toHaveBeenCalledWith('get_external_agent_info', {
        agentId: 'agent-123',
      })
      expect(info).toEqual(mockInfo)
    })

    it('should set external agent state to running', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await setExternalAgentRunning('agent-123')

      expect(mockInvoke).toHaveBeenCalledWith('set_external_agent_running', {
        agentId: 'agent-123',
      })
    })

    it('should set external agent state to failed', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await setExternalAgentFailed('agent-123')

      expect(mockInvoke).toHaveBeenCalledWith('set_external_agent_failed', {
        agentId: 'agent-123',
      })
    })
  })

  describe('ACP Terminal Commands', () => {
    it('should create terminal', async () => {
      mockInvoke.mockResolvedValueOnce('term_1')

      const result = await acpTerminalCreate('session-1', 'bash', ['-c', 'echo hello'], '/tmp')

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_create', {
        sessionId: 'session-1',
        command: 'bash',
        args: ['-c', 'echo hello'],
        cwd: '/tmp',
      })
      expect(result).toBe('term_1')
    })

    it('should get terminal output', async () => {
      const mockOutput = { output: 'hello\n', exitCode: 0 }
      mockInvoke.mockResolvedValueOnce(mockOutput)

      const result = await acpTerminalOutput('term_1')

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_output', {
        terminalId: 'term_1',
      })
      expect(result).toEqual(mockOutput)
    })

    it('should kill terminal', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await acpTerminalKill('term_1')

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_kill', {
        terminalId: 'term_1',
      })
    })

    it('should release terminal', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await acpTerminalRelease('term_1')

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_release', {
        terminalId: 'term_1',
      })
    })

    it('should wait for terminal exit', async () => {
      mockInvoke.mockResolvedValueOnce(0)

      const exitCode = await acpTerminalWaitForExit('term_1', 30)

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_wait_for_exit', {
        terminalId: 'term_1',
        timeout: 30,
      })
      expect(exitCode).toBe(0)
    })

    it('should write to terminal', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await acpTerminalWrite('term_1', 'ls -la\n')

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_write', {
        terminalId: 'term_1',
        data: 'ls -la\n',
      })
    })

    it('should get session terminals', async () => {
      mockInvoke.mockResolvedValueOnce(['term_1', 'term_2'])

      const terminals = await acpTerminalGetSessionTerminals('session-1')

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_get_session_terminals', {
        sessionId: 'session-1',
      })
      expect(terminals).toEqual(['term_1', 'term_2'])
    })

    it('should kill session terminals', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await acpTerminalKillSessionTerminals('session-1')

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_kill_session_terminals', {
        sessionId: 'session-1',
      })
    })

    it('should check if terminal is running', async () => {
      mockInvoke.mockResolvedValueOnce(true)

      const isRunning = await acpTerminalIsRunning('term_1')

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_is_running', {
        terminalId: 'term_1',
      })
      expect(isRunning).toBe(true)
    })

    it('should get terminal info', async () => {
      const mockInfo = {
        id: 'term_1',
        sessionId: 'session-1',
        command: 'bash',
        state: { type: 'Running' },
        exitCode: null,
      }
      mockInvoke.mockResolvedValueOnce(mockInfo)

      const info = await acpTerminalGetInfo('term_1')

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_get_info', {
        terminalId: 'term_1',
      })
      expect(info).toEqual(mockInfo)
    })

    it('should list all terminals', async () => {
      mockInvoke.mockResolvedValueOnce(['term_1', 'term_2', 'term_3'])

      const terminals = await acpTerminalList()

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_list')
      expect(terminals).toEqual(['term_1', 'term_2', 'term_3'])
    })
  })

  describe('Event Listeners', () => {
    it('should listen for spawn events', async () => {
      const mockUnlisten = jest.fn()
      mockListen.mockResolvedValueOnce(mockUnlisten)

      const callback = jest.fn()
      const unlisten = await onExternalAgentSpawn(callback)

      expect(mockListen).toHaveBeenCalledWith(
        'external-agent://spawn',
        expect.any(Function)
      )
      expect(unlisten).toBe(mockUnlisten)
    })

    it('should listen for stdout events', async () => {
      const mockUnlisten = jest.fn()
      mockListen.mockResolvedValueOnce(mockUnlisten)

      const callback = jest.fn()
      const unlisten = await onExternalAgentStdout(callback)

      expect(mockListen).toHaveBeenCalledWith(
        'external-agent://stdout',
        expect.any(Function)
      )
      expect(unlisten).toBe(mockUnlisten)
    })

    it('should listen for exit events', async () => {
      const mockUnlisten = jest.fn()
      mockListen.mockResolvedValueOnce(mockUnlisten)

      const callback = jest.fn()
      const unlisten = await onExternalAgentExit(callback)

      expect(mockListen).toHaveBeenCalledWith(
        'external-agent://exit',
        expect.any(Function)
      )
      expect(unlisten).toBe(mockUnlisten)
    })

    it('should listen for state change events', async () => {
      const mockUnlisten = jest.fn()
      mockListen.mockResolvedValueOnce(mockUnlisten)

      const callback = jest.fn()
      const unlisten = await onExternalAgentStateChange(callback)

      expect(mockListen).toHaveBeenCalledWith(
        'external-agent://state-change',
        expect.any(Function)
      )
      expect(unlisten).toBe(mockUnlisten)
    })

    it('should listen for stderr events', async () => {
      const mockUnlisten = jest.fn()
      mockListen.mockResolvedValueOnce(mockUnlisten)

      const callback = jest.fn()
      const unlisten = await onExternalAgentStderr(callback)

      expect(mockListen).toHaveBeenCalledWith(
        'external-agent://stderr',
        expect.any(Function)
      )
      expect(unlisten).toBe(mockUnlisten)
    })
  })

  describe('High-level Helpers', () => {
    it('should execute command and wait for result', async () => {
      // Create terminal
      mockInvoke.mockResolvedValueOnce('term_1')
      // Wait for exit
      mockInvoke.mockResolvedValueOnce(0)
      // Get output
      mockInvoke.mockResolvedValueOnce({ output: 'hello world\n', exitCode: 0 })
      // Release terminal
      mockInvoke.mockResolvedValueOnce(undefined)

      const result = await executeCommand('session-1', 'echo', ['hello world'])

      expect(result).toEqual({ output: 'hello world\n', exitCode: 0 })
    })

    it('should create interactive terminal', async () => {
      mockInvoke.mockResolvedValueOnce('term_1')

      const terminal = await createInteractiveTerminal('session-1', 'bash')

      expect(terminal.terminalId).toBe('term_1')
      expect(typeof terminal.write).toBe('function')
      expect(typeof terminal.read).toBe('function')
      expect(typeof terminal.isRunning).toBe('function')
      expect(typeof terminal.kill).toBe('function')
      expect(typeof terminal.waitForExit).toBe('function')
      expect(typeof terminal.release).toBe('function')
    })

    it('should cleanup session terminals', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await cleanupSessionTerminals('session-1')

      expect(mockInvoke).toHaveBeenCalledWith('acp_terminal_kill_session_terminals', {
        sessionId: 'session-1',
      })
    })
  })
})
