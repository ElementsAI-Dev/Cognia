/**
 * Tests for Session Store
 */

import { act } from '@testing-library/react';
import { useSessionStore, selectSessions, selectActiveSessionId } from './session-store';

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useSessionStore.getState();
      expect(state.sessions).toEqual([]);
      expect(state.activeSessionId).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create session with defaults', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession();
      });

      const state = useSessionStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.activeSessionId).toBe(session!.id);
      expect(session!.title).toBe('New Chat');
      expect(session!.provider).toBe('openai');
      expect(session!.mode).toBe('chat');
    });

    it('should create session with custom values', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({
          title: 'Custom Chat',
          provider: 'anthropic',
          model: 'claude-3',
          mode: 'agent',
          systemPrompt: 'You are helpful',
        });
      });

      expect(session!.title).toBe('Custom Chat');
      expect(session!.provider).toBe('anthropic');
      expect(session!.model).toBe('claude-3');
      expect(session!.mode).toBe('agent');
      expect(session!.systemPrompt).toBe('You are helpful');
    });

    it('should add new session at the beginning', () => {
      act(() => {
        useSessionStore.getState().createSession({ title: 'First' });
        useSessionStore.getState().createSession({ title: 'Second' });
      });

      const sessions = useSessionStore.getState().sessions;
      expect(sessions[0].title).toBe('Second');
      expect(sessions[1].title).toBe('First');
    });
  });

  describe('deleteSession', () => {
    it('should delete session and select next', () => {
      act(() => {
        useSessionStore.getState().createSession({ title: 'First' });
        useSessionStore.getState().createSession({ title: 'Second' });
      });

      const firstId = useSessionStore.getState().sessions[1].id;
      const secondId = useSessionStore.getState().sessions[0].id;

      act(() => {
        useSessionStore.getState().setActiveSession(secondId);
        useSessionStore.getState().deleteSession(secondId);
      });

      expect(useSessionStore.getState().sessions).toHaveLength(1);
      expect(useSessionStore.getState().activeSessionId).toBe(firstId);
    });

    it('should set activeSessionId to null when last session deleted', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession();
      });

      act(() => {
        useSessionStore.getState().deleteSession(session!.id);
      });

      expect(useSessionStore.getState().sessions).toHaveLength(0);
      expect(useSessionStore.getState().activeSessionId).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session properties', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Original' });
      });

      act(() => {
        useSessionStore.getState().updateSession(session!.id, { title: 'Updated' });
      });

      expect(useSessionStore.getState().sessions[0].title).toBe('Updated');
    });
  });

  describe('setActiveSession', () => {
    it('should set active session id', () => {
      let session1;
      act(() => {
        session1 = useSessionStore.getState().createSession({ title: 'First' });
        useSessionStore.getState().createSession({ title: 'Second' });
      });

      act(() => {
        useSessionStore.getState().setActiveSession(session1!.id);
      });

      expect(useSessionStore.getState().activeSessionId).toBe(session1!.id);
    });
  });

  describe('duplicateSession', () => {
    it('should duplicate session', () => {
      let original;
      act(() => {
        original = useSessionStore.getState().createSession({
          title: 'Original',
          provider: 'anthropic',
          systemPrompt: 'Test prompt',
        });
      });

      let duplicate;
      act(() => {
        duplicate = useSessionStore.getState().duplicateSession(original!.id);
      });

      expect(duplicate).not.toBeNull();
      expect(duplicate!.title).toBe('Original (copy)');
      expect(duplicate!.provider).toBe('anthropic');
      expect(duplicate!.systemPrompt).toBe('Test prompt');
      expect(duplicate!.id).not.toBe(original!.id);
    });

    it('should return null for non-existent session', () => {
      const duplicate = useSessionStore.getState().duplicateSession('non-existent');
      expect(duplicate).toBeNull();
    });
  });

  describe('togglePinSession', () => {
    it('should toggle pinned state', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession();
      });

      expect(useSessionStore.getState().sessions[0].pinned).toBeFalsy();

      act(() => {
        useSessionStore.getState().togglePinSession(session!.id);
      });

      expect(useSessionStore.getState().sessions[0].pinned).toBe(true);

      act(() => {
        useSessionStore.getState().togglePinSession(session!.id);
      });

      expect(useSessionStore.getState().sessions[0].pinned).toBe(false);
    });
  });

  describe('branching', () => {
    let sessionId: string;

    beforeEach(() => {
      act(() => {
        const session = useSessionStore.getState().createSession();
        sessionId = session.id;
      });
    });

    it('should create a branch', () => {
      let branch;
      act(() => {
        branch = useSessionStore.getState().createBranch(sessionId, 'msg-1', 'My Branch');
      });

      expect(branch).not.toBeNull();
      expect(branch!.name).toBe('My Branch');
      expect(branch!.branchPointMessageId).toBe('msg-1');
      expect(useSessionStore.getState().sessions[0].activeBranchId).toBe(branch!.id);
    });

    it('should switch branches', () => {
      let branch1;
      act(() => {
        branch1 = useSessionStore.getState().createBranch(sessionId, 'msg-1');
        useSessionStore.getState().createBranch(sessionId, 'msg-2');
      });

      act(() => {
        useSessionStore.getState().switchBranch(sessionId, branch1!.id);
      });

      expect(useSessionStore.getState().sessions[0].activeBranchId).toBe(branch1!.id);
    });

    it('should delete branch', () => {
      let branch;
      act(() => {
        branch = useSessionStore.getState().createBranch(sessionId, 'msg-1');
      });

      act(() => {
        useSessionStore.getState().deleteBranch(sessionId, branch!.id);
      });

      expect(useSessionStore.getState().getBranches(sessionId)).toHaveLength(0);
    });

    it('should rename branch', () => {
      let branch;
      act(() => {
        branch = useSessionStore.getState().createBranch(sessionId, 'msg-1', 'Original');
      });

      act(() => {
        useSessionStore.getState().renameBranch(sessionId, branch!.id, 'Renamed');
      });

      const branches = useSessionStore.getState().getBranches(sessionId);
      expect(branches[0].name).toBe('Renamed');
    });
  });

  describe('bulk operations', () => {
    it('should clear all sessions', () => {
      act(() => {
        useSessionStore.getState().createSession();
        useSessionStore.getState().createSession();
      });

      act(() => {
        useSessionStore.getState().clearAllSessions();
      });

      expect(useSessionStore.getState().sessions).toHaveLength(0);
      expect(useSessionStore.getState().activeSessionId).toBeNull();
    });

    it('should import sessions', () => {
      const sessionsToImport = [
        {
          id: 'imported-1',
          title: 'Imported 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          provider: 'openai' as const,
          model: 'gpt-4',
          mode: 'chat' as const,
          messageCount: 0,
        },
      ];

      act(() => {
        useSessionStore.getState().importSessions(sessionsToImport);
      });

      expect(useSessionStore.getState().sessions).toHaveLength(1);
      expect(useSessionStore.getState().sessions[0].title).toBe('Imported 1');
    });
  });

  describe('selectors', () => {
    it('should get session by id', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      expect(useSessionStore.getState().getSession(session!.id)?.title).toBe('Test');
      expect(useSessionStore.getState().getSession('non-existent')).toBeUndefined();
    });

    it('should get active session', () => {
      act(() => {
        useSessionStore.getState().createSession({ title: 'Active' });
      });

      expect(useSessionStore.getState().getActiveSession()?.title).toBe('Active');
    });

    it('should select sessions', () => {
      act(() => {
        useSessionStore.getState().createSession();
      });

      expect(selectSessions(useSessionStore.getState())).toHaveLength(1);
    });

    it('should select active session id', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession();
      });

      expect(selectActiveSessionId(useSessionStore.getState())).toBe(session!.id);
    });
  });

  describe('Environment Management', () => {
    it('should create session with virtualEnvId', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({
          title: 'With Env',
          virtualEnvId: 'env-123',
        });
      });

      expect(session!.virtualEnvId).toBe('env-123');
    });

    it('should set session environment', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      act(() => {
        useSessionStore.getState().setSessionEnvironment(session!.id, 'env-456', '/path/to/env');
      });

      const updated = useSessionStore.getState().getSession(session!.id);
      expect(updated?.virtualEnvId).toBe('env-456');
      expect(updated?.virtualEnvPath).toBe('/path/to/env');
    });

    it('should get session environment', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
        useSessionStore.getState().setSessionEnvironment(session!.id, 'env-789', '/path/to/env');
      });

      const env = useSessionStore.getState().getSessionEnvironment(session!.id);
      expect(env.envId).toBe('env-789');
      expect(env.envPath).toBe('/path/to/env');
    });

    it('should return null for session without environment', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      const env = useSessionStore.getState().getSessionEnvironment(session!.id);
      expect(env.envId).toBeNull();
      expect(env.envPath).toBeNull();
    });

    it('should clear session environment', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
        useSessionStore.getState().setSessionEnvironment(session!.id, 'env-123', '/path');
      });

      act(() => {
        useSessionStore.getState().clearSessionEnvironment(session!.id);
      });

      const env = useSessionStore.getState().getSessionEnvironment(session!.id);
      expect(env.envId).toBeNull();
      expect(env.envPath).toBeNull();
    });

    it('should update session timestamp when setting environment', async () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      const originalUpdate = useSessionStore.getState().getSession(session!.id)?.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      act(() => {
        useSessionStore.getState().setSessionEnvironment(session!.id, 'env-123', '/path');
      });

      const newUpdate = useSessionStore.getState().getSession(session!.id)?.updatedAt;
      expect(newUpdate).not.toEqual(originalUpdate);
    });

    it('should handle setting null environment', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
        useSessionStore.getState().setSessionEnvironment(session!.id, 'env-123', '/path');
      });

      act(() => {
        useSessionStore.getState().setSessionEnvironment(session!.id, null, null);
      });

      const updated = useSessionStore.getState().getSession(session!.id);
      expect(updated?.virtualEnvId).toBeUndefined();
      expect(updated?.virtualEnvPath).toBeUndefined();
    });
  });
});
