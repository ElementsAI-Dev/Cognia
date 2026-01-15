/**
 * Session Store Goal Management Tests
 * Tests for the chat goal functionality in session store
 */

import { act, renderHook } from '@testing-library/react';
import { useSessionStore } from './session-store';

describe('Session Store - Goal Management', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useSessionStore.getState().clearAllSessions();
    });
  });

  describe('setGoal', () => {
    it('should create a new goal for a session', () => {
      const { result } = renderHook(() => useSessionStore());

      // Create a session first
      const session = result.current.createSession({ title: 'Test Session' });

      // Set a goal
      act(() => {
        result.current.setGoal(session.id, {
          content: 'Learn React hooks',
          progress: 0,
        });
      });

      // Verify goal was created
      const updatedSession = result.current.getSession(session.id);
      expect(updatedSession?.goal).toBeDefined();
      expect(updatedSession?.goal?.content).toBe('Learn React hooks');
      expect(updatedSession?.goal?.status).toBe('active');
      expect(updatedSession?.goal?.progress).toBe(0);
    });

    it('should generate unique goal IDs', () => {
      const { result } = renderHook(() => useSessionStore());

      const session1 = result.current.createSession({ title: 'Session 1' });
      const session2 = result.current.createSession({ title: 'Session 2' });

      act(() => {
        result.current.setGoal(session1.id, { content: 'Goal 1' });
        result.current.setGoal(session2.id, { content: 'Goal 2' });
      });

      const s1 = result.current.getSession(session1.id);
      const s2 = result.current.getSession(session2.id);

      expect(s1?.goal?.id).not.toBe(s2?.goal?.id);
    });
  });

  describe('updateGoal', () => {
    it('should update goal content', () => {
      const { result } = renderHook(() => useSessionStore());

      const session = result.current.createSession({ title: 'Test Session' });
      act(() => {
        result.current.setGoal(session.id, { content: 'Original goal' });
      });

      act(() => {
        result.current.updateGoal(session.id, { content: 'Updated goal' });
      });

      const updatedSession = result.current.getSession(session.id);
      expect(updatedSession?.goal?.content).toBe('Updated goal');
    });

    it('should update goal progress', () => {
      const { result } = renderHook(() => useSessionStore());

      const session = result.current.createSession({ title: 'Test Session' });
      act(() => {
        result.current.setGoal(session.id, { content: 'My goal', progress: 0 });
      });

      act(() => {
        result.current.updateGoal(session.id, { progress: 50 });
      });

      const updatedSession = result.current.getSession(session.id);
      expect(updatedSession?.goal?.progress).toBe(50);
    });
  });

  describe('completeGoal', () => {
    it('should mark goal as completed with 100% progress', () => {
      const { result } = renderHook(() => useSessionStore());

      const session = result.current.createSession({ title: 'Test Session' });
      act(() => {
        result.current.setGoal(session.id, { content: 'My goal', progress: 50 });
      });

      act(() => {
        result.current.completeGoal(session.id);
      });

      const updatedSession = result.current.getSession(session.id);
      expect(updatedSession?.goal?.status).toBe('completed');
      expect(updatedSession?.goal?.progress).toBe(100);
      expect(updatedSession?.goal?.completedAt).toBeDefined();
    });
  });

  describe('pauseGoal', () => {
    it('should pause an active goal', () => {
      const { result } = renderHook(() => useSessionStore());

      const session = result.current.createSession({ title: 'Test Session' });
      act(() => {
        result.current.setGoal(session.id, { content: 'My goal' });
      });

      act(() => {
        result.current.pauseGoal(session.id);
      });

      const updatedSession = result.current.getSession(session.id);
      expect(updatedSession?.goal?.status).toBe('paused');
    });
  });

  describe('resumeGoal', () => {
    it('should resume a paused goal', () => {
      const { result } = renderHook(() => useSessionStore());

      const session = result.current.createSession({ title: 'Test Session' });
      act(() => {
        result.current.setGoal(session.id, { content: 'My goal' });
        result.current.pauseGoal(session.id);
      });

      act(() => {
        result.current.resumeGoal(session.id);
      });

      const updatedSession = result.current.getSession(session.id);
      expect(updatedSession?.goal?.status).toBe('active');
    });
  });

  describe('clearGoal', () => {
    it('should remove goal from session', () => {
      const { result } = renderHook(() => useSessionStore());

      const session = result.current.createSession({ title: 'Test Session' });
      act(() => {
        result.current.setGoal(session.id, { content: 'My goal' });
      });

      // Verify goal exists
      expect(result.current.getSession(session.id)?.goal).toBeDefined();

      act(() => {
        result.current.clearGoal(session.id);
      });

      // Verify goal is removed
      const updatedSession = result.current.getSession(session.id);
      expect(updatedSession?.goal).toBeUndefined();
    });
  });

  describe('getGoal', () => {
    it('should return goal for existing session', () => {
      const { result } = renderHook(() => useSessionStore());

      const session = result.current.createSession({ title: 'Test Session' });
      act(() => {
        result.current.setGoal(session.id, { content: 'My goal' });
      });

      const goal = result.current.getGoal(session.id);
      expect(goal).toBeDefined();
      expect(goal?.content).toBe('My goal');
    });

    it('should return undefined for session without goal', () => {
      const { result } = renderHook(() => useSessionStore());

      const session = result.current.createSession({ title: 'Test Session' });

      const goal = result.current.getGoal(session.id);
      expect(goal).toBeUndefined();
    });

    it('should return undefined for non-existent session', () => {
      const { result } = renderHook(() => useSessionStore());

      const goal = result.current.getGoal('non-existent-id');
      expect(goal).toBeUndefined();
    });
  });
});
