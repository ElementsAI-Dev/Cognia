/**
 * Tests for CollabAwareness - Collaboration user presence management
 */

import { CollabAwareness, type CollabUserState } from './collab-awareness';

describe('CollabAwareness', () => {
  let awareness: CollabAwareness;

  beforeEach(() => {
    awareness = new CollabAwareness();
  });

  afterEach(() => {
    awareness.destroy();
  });

  describe('initialization', () => {
    it('should initialize with no users', () => {
      expect(awareness.getLocalUser()).toBeNull();
      expect(awareness.getRemoteUsers()).toEqual([]);
      expect(awareness.getAllUsers()).toEqual([]);
    });

    it('should accept custom configuration', () => {
      const customAwareness = new CollabAwareness({
        inactivityTimeout: 30000,
        updateThrottle: 100,
      });
      expect(customAwareness.getLocalUser()).toBeNull();
      customAwareness.destroy();
    });
  });

  describe('setLocalUser', () => {
    it('should set local user with provided data', () => {
      const id = awareness.setLocalUser({
        name: 'Test User',
        color: '#ff0000',
      });

      const user = awareness.getLocalUser();
      expect(user).not.toBeNull();
      expect(user?.name).toBe('Test User');
      expect(user?.color).toBe('#ff0000');
      expect(user?.isOnline).toBe(true);
      expect(id).toBe(user?.id);
    });

    it('should generate id if not provided', () => {
      const id = awareness.setLocalUser({ name: 'User' });
      expect(id).toBeDefined();
      expect(id.length).toBeGreaterThan(0);
    });

    it('should use provided id', () => {
      const id = awareness.setLocalUser({ id: 'custom-id', name: 'User' });
      expect(id).toBe('custom-id');
    });

    it('should generate color if not provided', () => {
      awareness.setLocalUser({ name: 'User' });
      const user = awareness.getLocalUser();
      expect(user?.color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should notify listeners', () => {
      const callback = jest.fn();
      awareness.subscribe(callback);

      awareness.setLocalUser({ name: 'User' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ name: 'User' }),
      ]));
    });
  });

  describe('updateLocalCursor', () => {
    it('should update cursor position', () => {
      awareness.setLocalUser({ name: 'User' });
      awareness.updateLocalCursor({ line: 10, column: 5 });

      const user = awareness.getLocalUser();
      expect(user?.cursor).toEqual({ line: 10, column: 5 });
    });

    it('should update lastActive timestamp', () => {
      awareness.setLocalUser({ name: 'User' });
      const beforeUpdate = awareness.getLocalUser()?.lastActive;

      // Update cursor (which updates lastActive)
      awareness.updateLocalCursor({ line: 1, column: 1 });

      const afterUpdate = awareness.getLocalUser()?.lastActive;
      expect(afterUpdate?.getTime()).toBeGreaterThanOrEqual(beforeUpdate?.getTime() || 0);
    });

    it('should do nothing if no local user', () => {
      expect(() => {
        awareness.updateLocalCursor({ line: 1, column: 1 });
      }).not.toThrow();
    });
  });

  describe('updateLocalSelection', () => {
    it('should update selection range', () => {
      awareness.setLocalUser({ name: 'User' });
      awareness.updateLocalSelection({
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      });

      const user = awareness.getLocalUser();
      expect(user?.selection).toEqual({
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      });
    });

    it('should clear selection when null', () => {
      awareness.setLocalUser({ name: 'User' });
      awareness.updateLocalSelection({
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      });
      awareness.updateLocalSelection(null);

      const user = awareness.getLocalUser();
      expect(user?.selection).toBeUndefined();
    });
  });

  describe('setRemoteUser', () => {
    it('should add remote user', () => {
      const remoteUser: CollabUserState = {
        id: 'remote-1',
        name: 'Remote User',
        color: '#00ff00',
        lastActive: new Date(),
        isOnline: true,
      };

      awareness.setRemoteUser(remoteUser);

      const users = awareness.getRemoteUsers();
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('Remote User');
    });

    it('should update existing remote user', () => {
      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'User 1',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
      });

      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'User 1 Updated',
        color: '#00ff00',
        lastActive: new Date(),
        isOnline: true,
      });

      const users = awareness.getRemoteUsers();
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('User 1 Updated');
    });

    it('should notify listeners', () => {
      const callback = jest.fn();
      awareness.subscribe(callback);

      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'Remote',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
      });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('updateRemoteCursor', () => {
    it('should update remote user cursor', () => {
      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'Remote',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
      });

      awareness.updateRemoteCursor('remote-1', { line: 5, column: 3 });

      const user = awareness.getUserById('remote-1');
      expect(user?.cursor).toEqual({ line: 5, column: 3 });
    });

    it('should do nothing for non-existent user', () => {
      expect(() => {
        awareness.updateRemoteCursor('non-existent', { line: 1, column: 1 });
      }).not.toThrow();
    });
  });

  describe('updateRemoteSelection', () => {
    it('should update remote user selection', () => {
      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'Remote',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
      });

      awareness.updateRemoteSelection('remote-1', {
        startLine: 2,
        startColumn: 0,
        endLine: 5,
        endColumn: 10,
      });

      const user = awareness.getUserById('remote-1');
      expect(user?.selection).toEqual({
        startLine: 2,
        startColumn: 0,
        endLine: 5,
        endColumn: 10,
      });
    });

    it('should clear selection when null', () => {
      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'Remote',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
        selection: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 },
      });

      awareness.updateRemoteSelection('remote-1', null);

      const user = awareness.getUserById('remote-1');
      expect(user?.selection).toBeUndefined();
    });
  });

  describe('removeRemoteUser', () => {
    it('should remove remote user', () => {
      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'Remote',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
      });

      awareness.removeRemoteUser('remote-1');

      expect(awareness.getRemoteUsers()).toHaveLength(0);
    });

    it('should notify listeners', () => {
      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'Remote',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
      });

      const callback = jest.fn();
      awareness.subscribe(callback);

      awareness.removeRemoteUser('remote-1');

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('setRemoteUserOffline', () => {
    it('should mark user as offline', () => {
      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'Remote',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
      });

      awareness.setRemoteUserOffline('remote-1');

      const user = awareness.getUserById('remote-1');
      expect(user?.isOnline).toBe(false);
    });
  });

  describe('getOnlineUsers', () => {
    it('should return only online users', () => {
      awareness.setLocalUser({ name: 'Local' });
      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'Online Remote',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
      });
      awareness.setRemoteUser({
        id: 'remote-2',
        name: 'Offline Remote',
        color: '#00ff00',
        lastActive: new Date(),
        isOnline: false,
      });
      // Mark remote-2 as offline
      awareness.setRemoteUserOffline('remote-2');

      const onlineUsers = awareness.getOnlineUsers();

      expect(onlineUsers).toHaveLength(2);
      expect(onlineUsers.map((u) => u.name)).toContain('Local');
      expect(onlineUsers.map((u) => u.name)).toContain('Online Remote');
      expect(onlineUsers.map((u) => u.name)).not.toContain('Offline Remote');
    });
  });

  describe('getAllUsers', () => {
    it('should return local and all remote users', () => {
      awareness.setLocalUser({ name: 'Local' });
      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'Remote 1',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
      });
      awareness.setRemoteUser({
        id: 'remote-2',
        name: 'Remote 2',
        color: '#00ff00',
        lastActive: new Date(),
        isOnline: false,
      });

      const allUsers = awareness.getAllUsers();

      expect(allUsers).toHaveLength(3);
    });
  });

  describe('getUserById', () => {
    it('should return local user by id', () => {
      const id = awareness.setLocalUser({ name: 'Local' });

      const user = awareness.getUserById(id);

      expect(user?.name).toBe('Local');
    });

    it('should return remote user by id', () => {
      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'Remote',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
      });

      const user = awareness.getUserById('remote-1');

      expect(user?.name).toBe('Remote');
    });

    it('should return null for non-existent id', () => {
      const user = awareness.getUserById('non-existent');
      expect(user).toBeNull();
    });
  });

  describe('subscribe', () => {
    it('should call callback on changes', () => {
      const callback = jest.fn();
      awareness.subscribe(callback);

      awareness.setLocalUser({ name: 'User' });

      expect(callback).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = awareness.subscribe(callback);

      unsubscribe();
      awareness.setLocalUser({ name: 'User' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      awareness.subscribe(callback1);
      awareness.subscribe(callback2);

      awareness.setLocalUser({ name: 'User' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should remove all users', () => {
      awareness.setLocalUser({ name: 'Local' });
      awareness.setRemoteUser({
        id: 'remote-1',
        name: 'Remote',
        color: '#ff0000',
        lastActive: new Date(),
        isOnline: true,
      });

      awareness.clear();

      expect(awareness.getLocalUser()).toBeNull();
      expect(awareness.getRemoteUsers()).toHaveLength(0);
    });

    it('should notify listeners', () => {
      awareness.setLocalUser({ name: 'User' });
      const callback = jest.fn();
      awareness.subscribe(callback);

      awareness.clear();

      expect(callback).toHaveBeenCalledWith([]);
    });
  });

  describe('destroy', () => {
    it('should clear all data and listeners', () => {
      awareness.setLocalUser({ name: 'User' });
      const callback = jest.fn();
      awareness.subscribe(callback);

      awareness.destroy();

      expect(awareness.getLocalUser()).toBeNull();
      awareness.setLocalUser({ name: 'New User' });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should throttle rapid cursor updates', () => {
      const callback = jest.fn();
      awareness.setLocalUser({ name: 'User' });
      awareness.subscribe(callback);
      callback.mockClear();

      for (let i = 0; i < 10; i++) {
        awareness.updateLocalCursor({ line: i, column: i });
      }

      expect(callback.mock.calls.length).toBeLessThan(10);

      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalled();
    });
  });
});
