/**
 * Canvas Collaboration Types - Real-time editing, comments, and sharing
 */

export interface LineRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  color: string;
  cursor?: CursorPosition;
  selection?: LineRange;
  lastActive: Date;
  isOnline: boolean;
}

export interface CollaborativeSession {
  id: string;
  documentId: string;
  ownerId: string;
  participants: Participant[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  shareLink?: string;
  permissions: SessionPermissions;
}

export interface SessionPermissions {
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canExport: boolean;
}

export interface CanvasComment {
  id: string;
  documentId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  range: LineRange;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  reactions: CommentReaction[];
  parentId?: string;
}

export interface CommentReaction {
  emoji: string;
  users: string[];
}

export interface CommentThread {
  id: string;
  rootComment: CanvasComment;
  replies: CanvasComment[];
  isResolved: boolean;
}

export interface RemoteCursor {
  participantId: string;
  position: CursorPosition;
  selection?: LineRange;
  color: string;
  name: string;
}

export interface CollaborationUpdate {
  type: 'cursor' | 'selection' | 'content' | 'comment' | 'participant';
  participantId: string;
  timestamp: Date;
  data: unknown;
}

export interface ContentUpdate {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  text?: string;
  length?: number;
  origin: string;
}

export interface ShareOptions {
  expiresAt?: Date;
  maxParticipants?: number;
  requireAuth: boolean;
  permissions: SessionPermissions;
}

export interface CollaborationState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError?: string;
  session?: CollaborativeSession;
  localParticipant?: Participant;
  remoteCursors: RemoteCursor[];
  pendingUpdates: CollaborationUpdate[];
}

export type CollaborationEventType = 
  | 'connected'
  | 'disconnected'
  | 'participant-joined'
  | 'participant-left'
  | 'cursor-moved'
  | 'selection-changed'
  | 'content-updated'
  | 'comment-added'
  | 'comment-resolved'
  | 'error';

export interface CollaborationEvent {
  type: CollaborationEventType;
  timestamp: Date;
  participantId?: string;
  data?: unknown;
}
