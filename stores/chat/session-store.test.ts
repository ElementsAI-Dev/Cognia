/**
 * Tests for Session Store
 */

import { act } from '@testing-library/react';
import { useSessionStore, selectSessions, selectActiveSessionId } from './session-store';

// Mock plugin lifecycle hooks
const mockDispatchOnSessionCreate = jest.fn();
const mockDispatchOnSessionDelete = jest.fn();
const mockDispatchOnSessionSwitch = jest.fn();
const mockDispatchOnSessionRename = jest.fn();
const mockDispatchOnSessionClear = jest.fn();
const mockDispatchOnChatModeSwitch = jest.fn();
const mockDispatchOnModelSwitch = jest.fn();
const mockDispatchOnSystemPromptChange = jest.fn();

// Mock database repositories and logger used by delete operations
const mockDeleteBySessionId = jest.fn().mockResolvedValue(undefined);
const mockDeleteTracesBySessionId = jest.fn().mockResolvedValue(0);

jest.mock('@/lib/db', () => ({
  messageRepository: {
    deleteBySessionId: (...args: unknown[]) => mockDeleteBySessionId(...args),
  },
  agentTraceRepository: {
    deleteBySessionId: (...args: unknown[]) => mockDeleteTracesBySessionId(...args),
  },
  db: {
    summaries: {
      where: () => ({ equals: () => ({ delete: () => Promise.resolve(0) }) }),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    chat: { error: jest.fn() },
  },
}));

jest.mock('@/lib/plugin', () => ({
  getPluginLifecycleHooks: () => ({
    dispatchOnSessionCreate: mockDispatchOnSessionCreate,
    dispatchOnSessionDelete: mockDispatchOnSessionDelete,
    dispatchOnSessionSwitch: mockDispatchOnSessionSwitch,
    dispatchOnSessionRename: mockDispatchOnSessionRename,
    dispatchOnSessionClear: mockDispatchOnSessionClear,
    dispatchOnChatModeSwitch: mockDispatchOnChatModeSwitch,
    dispatchOnModelSwitch: mockDispatchOnModelSwitch,
    dispatchOnSystemPromptChange: mockDispatchOnSystemPromptChange,
  }),
}));

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
    });
    jest.clearAllMocks();
  });

  describe('mode switching', () => {
    it('should ignore switchMode when session is missing or same mode', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({ mode: 'chat' });
      });

      const originalHistory = useSessionStore.getState().modeHistory.length;

      act(() => {
        useSessionStore.getState().switchMode('missing', 'agent');
        useSessionStore.getState().switchMode(session!.id, 'chat');
      });

      expect(useSessionStore.getState().modeHistory).toHaveLength(originalHistory);
      expect(useSessionStore.getState().getSession(session!.id)?.mode).toBe('chat');
    });

    it('creates a new session when switching modes with context', () => {
      let session;
      act(() => {
        session = useSessionStore.getState().createSession({ mode: 'chat', title: 'Base' });
      });

      let newSession;
      act(() => {
        newSession = useSessionStore.getState().switchModeWithNewSession(session!.id, 'agent', {
          carryContext: true,
          summary: 'summary text',
        });
      });

      expect(newSession!.id).not.toBe(session!.id);
      expect(newSession!.mode).toBe('agent');
      expect(newSession!.carriedContext?.fromSessionId).toBe(session!.id);
      expect(useSessionStore.getState().activeSessionId).toBe(newSession!.id);
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

  describe('tag management', () => {
    it('should add a tag to a session', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      act(() => {
        useSessionStore.getState().addTag(session!.id, 'important');
      });

      const updated = useSessionStore.getState().getSession(session!.id);
      expect(updated?.tags).toEqual(['important']);
    });

    it('should normalize tags to lowercase', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      act(() => {
        useSessionStore.getState().addTag(session!.id, '  Important  ');
      });

      const updated = useSessionStore.getState().getSession(session!.id);
      expect(updated?.tags).toEqual(['important']);
    });

    it('should not add duplicate tags', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      act(() => {
        useSessionStore.getState().addTag(session!.id, 'work');
        useSessionStore.getState().addTag(session!.id, 'work');
      });

      const updated = useSessionStore.getState().getSession(session!.id);
      expect(updated?.tags).toEqual(['work']);
    });

    it('should not add empty tags', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      act(() => {
        useSessionStore.getState().addTag(session!.id, '   ');
      });

      const updated = useSessionStore.getState().getSession(session!.id);
      expect(updated?.tags).toBeUndefined();
    });

    it('should remove a tag from a session', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
        useSessionStore.getState().addTag(session!.id, 'work');
        useSessionStore.getState().addTag(session!.id, 'personal');
      });

      act(() => {
        useSessionStore.getState().removeTag(session!.id, 'work');
      });

      const updated = useSessionStore.getState().getSession(session!.id);
      expect(updated?.tags).toEqual(['personal']);
    });

    it('should set all tags at once', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
        useSessionStore.getState().addTag(session!.id, 'old');
      });

      act(() => {
        useSessionStore.getState().setTags(session!.id, ['New', 'Tags']);
      });

      const updated = useSessionStore.getState().getSession(session!.id);
      expect(updated?.tags).toEqual(['new', 'tags']);
    });

    it('should get sessions by tag', () => {
      act(() => {
        const s1 = useSessionStore.getState().createSession({ title: 'S1' });
        const s2 = useSessionStore.getState().createSession({ title: 'S2' });
        useSessionStore.getState().createSession({ title: 'S3' });
        useSessionStore.getState().addTag(s1.id, 'work');
        useSessionStore.getState().addTag(s2.id, 'work');
      });

      const workSessions = useSessionStore.getState().getSessionsByTag('work');
      expect(workSessions).toHaveLength(2);
    });

    it('should get all unique tags', () => {
      act(() => {
        const s1 = useSessionStore.getState().createSession({ title: 'S1' });
        const s2 = useSessionStore.getState().createSession({ title: 'S2' });
        useSessionStore.getState().addTag(s1.id, 'work');
        useSessionStore.getState().addTag(s1.id, 'coding');
        useSessionStore.getState().addTag(s2.id, 'work');
        useSessionStore.getState().addTag(s2.id, 'personal');
      });

      const allTags = useSessionStore.getState().getAllTags();
      expect(allTags).toEqual(['coding', 'personal', 'work']);
    });
  });

  describe('archive management', () => {
    it('should archive a session', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      act(() => {
        useSessionStore.getState().archiveSession(session!.id);
      });

      const updated = useSessionStore.getState().getSession(session!.id);
      expect(updated?.isArchived).toBe(true);
      expect(updated?.archivedAt).toBeInstanceOf(Date);
    });

    it('should switch active session when archiving the active one', () => {
      let session1: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      let session2: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session1 = useSessionStore.getState().createSession({ title: 'First' });
        session2 = useSessionStore.getState().createSession({ title: 'Second' });
        useSessionStore.getState().setActiveSession(session2!.id);
      });

      act(() => {
        useSessionStore.getState().archiveSession(session2!.id);
      });

      expect(useSessionStore.getState().activeSessionId).toBe(session1!.id);
    });

    it('should unarchive a session', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
        useSessionStore.getState().archiveSession(session!.id);
      });

      act(() => {
        useSessionStore.getState().unarchiveSession(session!.id);
      });

      const updated = useSessionStore.getState().getSession(session!.id);
      expect(updated?.isArchived).toBe(false);
      expect(updated?.archivedAt).toBeUndefined();
    });

    it('should get archived sessions', () => {
      act(() => {
        const s1 = useSessionStore.getState().createSession({ title: 'S1' });
        useSessionStore.getState().createSession({ title: 'S2' });
        useSessionStore.getState().archiveSession(s1.id);
      });

      const archived = useSessionStore.getState().getArchivedSessions();
      expect(archived).toHaveLength(1);
      expect(archived[0].title).toBe('S1');
    });

    it('should get active (non-archived) sessions', () => {
      act(() => {
        const s1 = useSessionStore.getState().createSession({ title: 'S1' });
        useSessionStore.getState().createSession({ title: 'S2' });
        useSessionStore.getState().archiveSession(s1.id);
      });

      const active = useSessionStore.getState().getActiveSessions();
      expect(active).toHaveLength(1);
      expect(active[0].title).toBe('S2');
    });
  });

  describe('bulk archive and tag operations', () => {
    it('should bulk archive sessions', () => {
      let s1: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      let s2: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        s1 = useSessionStore.getState().createSession({ title: 'S1' });
        s2 = useSessionStore.getState().createSession({ title: 'S2' });
        useSessionStore.getState().createSession({ title: 'S3' });
      });

      act(() => {
        useSessionStore.getState().bulkArchiveSessions([s1!.id, s2!.id]);
      });

      const archived = useSessionStore.getState().getArchivedSessions();
      const active = useSessionStore.getState().getActiveSessions();
      expect(archived).toHaveLength(2);
      expect(active).toHaveLength(1);
    });

    it('should bulk tag sessions', () => {
      let s1: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      let s2: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        s1 = useSessionStore.getState().createSession({ title: 'S1' });
        s2 = useSessionStore.getState().createSession({ title: 'S2' });
      });

      act(() => {
        useSessionStore.getState().bulkTagSessions([s1!.id, s2!.id], 'project-x');
      });

      expect(useSessionStore.getState().getSession(s1!.id)?.tags).toEqual(['project-x']);
      expect(useSessionStore.getState().getSession(s2!.id)?.tags).toEqual(['project-x']);
    });

    it('should not add empty tag via bulk tag', () => {
      let s1: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        s1 = useSessionStore.getState().createSession({ title: 'S1' });
      });

      act(() => {
        useSessionStore.getState().bulkTagSessions([s1!.id], '   ');
      });

      expect(useSessionStore.getState().getSession(s1!.id)?.tags).toBeUndefined();
    });
  });

  describe('input draft management', () => {
    it('should set and get input draft for a session', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      act(() => {
        useSessionStore.getState().setInputDraft(session!.id, 'Hello, this is a draft');
      });

      const draft = useSessionStore.getState().getInputDraft(session!.id);
      expect(draft).toBe('Hello, this is a draft');
    });

    it('should return empty string for non-existent draft', () => {
      const draft = useSessionStore.getState().getInputDraft('non-existent-id');
      expect(draft).toBe('');
    });

    it('should clear input draft for a session', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
        useSessionStore.getState().setInputDraft(session!.id, 'Draft to clear');
      });

      act(() => {
        useSessionStore.getState().clearInputDraft(session!.id);
      });

      const draft = useSessionStore.getState().getInputDraft(session!.id);
      expect(draft).toBe('');
    });

    it('should update existing draft', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
        useSessionStore.getState().setInputDraft(session!.id, 'Initial draft');
      });

      act(() => {
        useSessionStore.getState().setInputDraft(session!.id, 'Updated draft');
      });

      const draft = useSessionStore.getState().getInputDraft(session!.id);
      expect(draft).toBe('Updated draft');
    });

    it('should manage drafts for multiple sessions independently', () => {
      let session1: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      let session2: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session1 = useSessionStore.getState().createSession({ title: 'Session 1' });
        session2 = useSessionStore.getState().createSession({ title: 'Session 2' });
        useSessionStore.getState().setInputDraft(session1!.id, 'Draft for session 1');
        useSessionStore.getState().setInputDraft(session2!.id, 'Draft for session 2');
      });

      expect(useSessionStore.getState().getInputDraft(session1!.id)).toBe('Draft for session 1');
      expect(useSessionStore.getState().getInputDraft(session2!.id)).toBe('Draft for session 2');

      act(() => {
        useSessionStore.getState().clearInputDraft(session1!.id);
      });

      expect(useSessionStore.getState().getInputDraft(session1!.id)).toBe('');
      expect(useSessionStore.getState().getInputDraft(session2!.id)).toBe('Draft for session 2');
    });
  });

  describe('plugin hook dispatches', () => {
    it('should dispatch onSessionCreate when creating a session', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      expect(mockDispatchOnSessionCreate).toHaveBeenCalledWith(session!.id);
    });

    it('should dispatch onSessionDelete when deleting a session', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Test' });
      });

      act(() => {
        useSessionStore.getState().deleteSession(session!.id);
      });

      expect(mockDispatchOnSessionDelete).toHaveBeenCalledWith(session!.id);
    });

    it('should dispatch onSessionSwitch when switching active session', () => {
      let session1: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session1 = useSessionStore.getState().createSession({ title: 'First' });
        useSessionStore.getState().createSession({ title: 'Second' });
      });

      mockDispatchOnSessionSwitch.mockClear();
      act(() => {
        useSessionStore.getState().setActiveSession(session1!.id);
      });

      expect(mockDispatchOnSessionSwitch).toHaveBeenCalledWith(session1!.id);
    });

    it('should dispatch onSessionRename when title changes via updateSession', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Original' });
      });

      act(() => {
        useSessionStore.getState().updateSession(session!.id, { title: 'Renamed' });
      });

      expect(mockDispatchOnSessionRename).toHaveBeenCalledWith(session!.id, 'Original', 'Renamed');
    });

    it('should NOT dispatch onSessionRename when title stays the same', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'Same' });
      });

      act(() => {
        useSessionStore.getState().updateSession(session!.id, { title: 'Same' });
      });

      expect(mockDispatchOnSessionRename).not.toHaveBeenCalled();
    });

    it('should dispatch onSessionClear for each session when deleteAllSessions is called', () => {
      act(() => {
        useSessionStore.getState().createSession({ title: 'S1' });
        useSessionStore.getState().createSession({ title: 'S2' });
      });

      act(() => {
        useSessionStore.getState().deleteAllSessions();
      });

      expect(mockDispatchOnSessionClear).toHaveBeenCalledTimes(2);
    });

    it('should dispatch onChatModeSwitch when mode changes', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ mode: 'chat' });
      });

      act(() => {
        useSessionStore.getState().switchMode(session!.id, 'agent');
      });

      expect(mockDispatchOnChatModeSwitch).toHaveBeenCalledWith(session!.id, 'agent', 'chat');
    });

    it('should NOT dispatch onChatModeSwitch when mode is the same', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ mode: 'chat' });
      });

      act(() => {
        useSessionStore.getState().switchMode(session!.id, 'chat');
      });

      expect(mockDispatchOnChatModeSwitch).not.toHaveBeenCalled();
    });

    it('should dispatch onModelSwitch when provider or model changes via updateSession', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ provider: 'openai', model: 'gpt-4o' });
      });

      act(() => {
        useSessionStore.getState().updateSession(session!.id, { provider: 'anthropic', model: 'claude-3' });
      });

      expect(mockDispatchOnModelSwitch).toHaveBeenCalledWith('anthropic', 'claude-3', 'openai', 'gpt-4o');
    });

    it('should NOT dispatch onModelSwitch when provider and model stay the same', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ provider: 'openai', model: 'gpt-4o' });
      });

      act(() => {
        useSessionStore.getState().updateSession(session!.id, { title: 'New Title' });
      });

      expect(mockDispatchOnModelSwitch).not.toHaveBeenCalled();
    });

    it('should dispatch onSystemPromptChange when systemPrompt changes', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ systemPrompt: 'Old prompt' });
      });

      act(() => {
        useSessionStore.getState().updateSession(session!.id, { systemPrompt: 'New prompt' });
      });

      expect(mockDispatchOnSystemPromptChange).toHaveBeenCalledWith(session!.id, 'New prompt', 'Old prompt');
    });

    it('should NOT dispatch onSystemPromptChange when prompt stays the same', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ systemPrompt: 'Same prompt' });
      });

      act(() => {
        useSessionStore.getState().updateSession(session!.id, { title: 'New Title' });
      });

      expect(mockDispatchOnSystemPromptChange).not.toHaveBeenCalled();
    });
  });

  describe('IndexedDB cleanup on deletion', () => {
    it('should call messageRepository.deleteBySessionId when deleting a session', () => {
      let session: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        session = useSessionStore.getState().createSession({ title: 'To Delete' });
      });

      act(() => {
        useSessionStore.getState().deleteSession(session!.id);
      });

      expect(mockDeleteBySessionId).toHaveBeenCalledWith(session!.id);
      expect(mockDeleteTracesBySessionId).toHaveBeenCalledWith(session!.id);
    });

    it('should cleanup IndexedDB for all sessions when deleteAllSessions is called', () => {
      let s1: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      let s2: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        s1 = useSessionStore.getState().createSession({ title: 'S1' });
        s2 = useSessionStore.getState().createSession({ title: 'S2' });
      });

      act(() => {
        useSessionStore.getState().deleteAllSessions();
      });

      expect(mockDeleteBySessionId).toHaveBeenCalledWith(s1!.id);
      expect(mockDeleteBySessionId).toHaveBeenCalledWith(s2!.id);
      expect(mockDeleteTracesBySessionId).toHaveBeenCalledWith(s1!.id);
      expect(mockDeleteTracesBySessionId).toHaveBeenCalledWith(s2!.id);
    });

    it('should cleanup IndexedDB for bulk deleted sessions', () => {
      let s1: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      let s2: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      let s3: ReturnType<typeof useSessionStore.getState>['sessions'][0] | undefined;
      act(() => {
        s1 = useSessionStore.getState().createSession({ title: 'S1' });
        s2 = useSessionStore.getState().createSession({ title: 'S2' });
        s3 = useSessionStore.getState().createSession({ title: 'S3' });
      });

      act(() => {
        useSessionStore.getState().bulkDeleteSessions([s1!.id, s2!.id]);
      });

      expect(mockDeleteBySessionId).toHaveBeenCalledWith(s1!.id);
      expect(mockDeleteBySessionId).toHaveBeenCalledWith(s2!.id);
      expect(mockDeleteBySessionId).not.toHaveBeenCalledWith(s3!.id);
      expect(useSessionStore.getState().sessions).toHaveLength(1);
      expect(useSessionStore.getState().sessions[0].id).toBe(s3!.id);
    });
  });
});
