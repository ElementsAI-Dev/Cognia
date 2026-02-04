/**
 * Collaboration Awareness - User presence, cursors, and selection synchronization
 *
 * NOTE: This is COLLABORATION awareness (user presence in shared editing sessions),
 * NOT system awareness (CPU, memory, app focus) which is in lib/native/awareness.ts
 */

import { nanoid } from 'nanoid';
import type { CursorPosition, LineRange } from '@/types/canvas/collaboration';

export interface CollabUserState {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string;
  cursor?: CursorPosition;
  selection?: LineRange;
  lastActive: Date;
  isOnline: boolean;
}

export interface CollabAwarenessConfig {
  inactivityTimeout?: number;
  updateThrottle?: number;
}

export type AwarenessChangeCallback = (users: CollabUserState[]) => void;

const DEFAULT_CONFIG: CollabAwarenessConfig = {
  inactivityTimeout: 60000,
  updateThrottle: 50,
};

export class CollabAwareness {
  private localUser: CollabUserState | null = null;
  private remoteUsers: Map<string, CollabUserState> = new Map();
  private listeners: Set<AwarenessChangeCallback> = new Set();
  private config: CollabAwarenessConfig;
  private inactivityTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private lastUpdateTime = 0;
  private pendingUpdate: ReturnType<typeof setTimeout> | null = null;

  constructor(config: CollabAwarenessConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setLocalUser(user: Partial<CollabUserState> & { name: string }): string {
    const id = user.id || nanoid();
    this.localUser = {
      id,
      name: user.name,
      color: user.color || this.generateColor(id),
      avatarUrl: user.avatarUrl,
      cursor: user.cursor,
      selection: user.selection,
      lastActive: new Date(),
      isOnline: true,
    };
    this.notifyListeners();
    return id;
  }

  getLocalUser(): CollabUserState | null {
    return this.localUser;
  }

  updateLocalCursor(cursor: CursorPosition): void {
    if (!this.localUser) return;

    this.localUser = {
      ...this.localUser,
      cursor,
      lastActive: new Date(),
    };
    this.throttledNotify();
  }

  updateLocalSelection(selection: LineRange | null): void {
    if (!this.localUser) return;

    this.localUser = {
      ...this.localUser,
      selection: selection || undefined,
      lastActive: new Date(),
    };
    this.throttledNotify();
  }

  setRemoteUser(user: CollabUserState): void {
    this.remoteUsers.set(user.id, {
      ...user,
      lastActive: new Date(),
      isOnline: true,
    });

    this.resetInactivityTimer(user.id);
    this.notifyListeners();
  }

  updateRemoteCursor(userId: string, cursor: CursorPosition): void {
    const user = this.remoteUsers.get(userId);
    if (!user) return;

    this.remoteUsers.set(userId, {
      ...user,
      cursor,
      lastActive: new Date(),
    });

    this.resetInactivityTimer(userId);
    this.throttledNotify();
  }

  updateRemoteSelection(userId: string, selection: LineRange | null): void {
    const user = this.remoteUsers.get(userId);
    if (!user) return;

    this.remoteUsers.set(userId, {
      ...user,
      selection: selection || undefined,
      lastActive: new Date(),
    });

    this.resetInactivityTimer(userId);
    this.throttledNotify();
  }

  removeRemoteUser(userId: string): void {
    this.remoteUsers.delete(userId);
    this.clearInactivityTimer(userId);
    this.notifyListeners();
  }

  setRemoteUserOffline(userId: string): void {
    const user = this.remoteUsers.get(userId);
    if (!user) return;

    this.remoteUsers.set(userId, {
      ...user,
      isOnline: false,
    });
    this.notifyListeners();
  }

  getRemoteUsers(): CollabUserState[] {
    return Array.from(this.remoteUsers.values());
  }

  getOnlineUsers(): CollabUserState[] {
    const users: CollabUserState[] = [];
    if (this.localUser) {
      users.push(this.localUser);
    }
    for (const user of this.remoteUsers.values()) {
      if (user.isOnline) {
        users.push(user);
      }
    }
    return users;
  }

  getAllUsers(): CollabUserState[] {
    const users: CollabUserState[] = [];
    if (this.localUser) {
      users.push(this.localUser);
    }
    users.push(...this.remoteUsers.values());
    return users;
  }

  getUserById(id: string): CollabUserState | null {
    if (this.localUser?.id === id) {
      return this.localUser;
    }
    return this.remoteUsers.get(id) || null;
  }

  subscribe(callback: AwarenessChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  clear(): void {
    this.localUser = null;
    this.remoteUsers.clear();
    this.clearAllInactivityTimers();
    this.notifyListeners();
  }

  destroy(): void {
    this.clear();
    this.listeners.clear();
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate);
      this.pendingUpdate = null;
    }
  }

  private notifyListeners(): void {
    const users = this.getAllUsers();
    this.listeners.forEach((callback) => callback(users));
  }

  private throttledNotify(): void {
    const now = Date.now();
    const throttle = this.config.updateThrottle || 50;

    if (now - this.lastUpdateTime >= throttle) {
      this.lastUpdateTime = now;
      this.notifyListeners();
      return;
    }

    if (this.pendingUpdate) {
      return;
    }

    this.pendingUpdate = setTimeout(() => {
      this.pendingUpdate = null;
      this.lastUpdateTime = Date.now();
      this.notifyListeners();
    }, throttle - (now - this.lastUpdateTime));
  }

  private resetInactivityTimer(userId: string): void {
    this.clearInactivityTimer(userId);

    const timeout = this.config.inactivityTimeout || 60000;
    const timer = setTimeout(() => {
      this.setRemoteUserOffline(userId);
    }, timeout);

    this.inactivityTimers.set(userId, timer);
  }

  private clearInactivityTimer(userId: string): void {
    const timer = this.inactivityTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.inactivityTimers.delete(userId);
    }
  }

  private clearAllInactivityTimers(): void {
    this.inactivityTimers.forEach((timer) => clearTimeout(timer));
    this.inactivityTimers.clear();
  }

  private generateColor(id: string): string {
    const colors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
      '#84cc16',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  }
}

export const collabAwareness = new CollabAwareness();

export default CollabAwareness;
