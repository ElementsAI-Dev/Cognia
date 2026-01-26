/**
 * Comments - Element-level comment system with threading
 * Enables collaborative feedback on design elements
 */

import { nanoid } from 'nanoid';

export interface CommentReply {
  id: string;
  commentId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  isEdited: boolean;
}

export interface DesignComment {
  id: string;
  designId: string;
  elementId?: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  replies: CommentReply[];
  position?: {
    x: number;
    y: number;
  };
  isEdited: boolean;
}

export interface CommentThread {
  comment: DesignComment;
  replyCount: number;
  lastActivity: Date;
  participants: string[];
}

const STORAGE_KEY = 'cognia-designer-comments';

/**
 * Get all comments from storage
 */
function getAllComments(): DesignComment[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const comments = JSON.parse(stored) as DesignComment[];
    return comments.map((c) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
      resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : undefined,
      replies: c.replies.map((r) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
      })),
    }));
  } catch {
    return [];
  }
}

/**
 * Save comments to storage
 */
function saveComments(comments: DesignComment[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
}

/**
 * Get comments for a specific design
 */
export function getDesignComments(designId: string): DesignComment[] {
  return getAllComments().filter((c) => c.designId === designId);
}

/**
 * Get comments for a specific element
 */
export function getElementComments(designId: string, elementId: string): DesignComment[] {
  return getAllComments().filter(
    (c) => c.designId === designId && c.elementId === elementId
  );
}

/**
 * Get unresolved comments for a design
 */
export function getUnresolvedComments(designId: string): DesignComment[] {
  return getDesignComments(designId).filter((c) => !c.resolved);
}

/**
 * Add a comment to a design
 */
export function addComment(
  designId: string,
  authorId: string,
  authorName: string,
  content: string,
  options: {
    elementId?: string;
    position?: { x: number; y: number };
  } = {}
): DesignComment {
  const comment: DesignComment = {
    id: nanoid(),
    designId,
    elementId: options.elementId,
    authorId,
    authorName,
    content,
    createdAt: new Date(),
    resolved: false,
    replies: [],
    position: options.position,
    isEdited: false,
  };

  const comments = getAllComments();
  comments.push(comment);
  saveComments(comments);

  return comment;
}

/**
 * Edit a comment
 */
export function editComment(
  commentId: string,
  newContent: string,
  authorId: string
): DesignComment | null {
  const comments = getAllComments();
  const index = comments.findIndex((c) => c.id === commentId);
  
  if (index === -1) return null;
  
  // Only author can edit
  if (comments[index].authorId !== authorId) return null;
  
  comments[index] = {
    ...comments[index],
    content: newContent,
    updatedAt: new Date(),
    isEdited: true,
  };
  
  saveComments(comments);
  return comments[index];
}

/**
 * Delete a comment
 */
export function deleteComment(commentId: string, authorId: string): boolean {
  const comments = getAllComments();
  const comment = comments.find((c) => c.id === commentId);
  
  if (!comment || comment.authorId !== authorId) return false;
  
  const filtered = comments.filter((c) => c.id !== commentId);
  saveComments(filtered);
  
  return true;
}

/**
 * Add a reply to a comment
 */
export function addReply(
  commentId: string,
  authorId: string,
  authorName: string,
  content: string
): CommentReply | null {
  const comments = getAllComments();
  const index = comments.findIndex((c) => c.id === commentId);
  
  if (index === -1) return null;
  
  const reply: CommentReply = {
    id: nanoid(),
    commentId,
    authorId,
    authorName,
    content,
    createdAt: new Date(),
    isEdited: false,
  };
  
  comments[index].replies.push(reply);
  saveComments(comments);
  
  return reply;
}

/**
 * Edit a reply
 */
export function editReply(
  commentId: string,
  replyId: string,
  newContent: string,
  authorId: string
): CommentReply | null {
  const comments = getAllComments();
  const commentIndex = comments.findIndex((c) => c.id === commentId);
  
  if (commentIndex === -1) return null;
  
  const replyIndex = comments[commentIndex].replies.findIndex(
    (r) => r.id === replyId
  );
  
  if (replyIndex === -1) return null;
  
  // Only author can edit
  if (comments[commentIndex].replies[replyIndex].authorId !== authorId) {
    return null;
  }
  
  comments[commentIndex].replies[replyIndex] = {
    ...comments[commentIndex].replies[replyIndex],
    content: newContent,
    updatedAt: new Date(),
    isEdited: true,
  };
  
  saveComments(comments);
  return comments[commentIndex].replies[replyIndex];
}

/**
 * Delete a reply
 */
export function deleteReply(
  commentId: string,
  replyId: string,
  authorId: string
): boolean {
  const comments = getAllComments();
  const commentIndex = comments.findIndex((c) => c.id === commentId);
  
  if (commentIndex === -1) return false;
  
  const reply = comments[commentIndex].replies.find((r) => r.id === replyId);
  if (!reply || reply.authorId !== authorId) return false;
  
  comments[commentIndex].replies = comments[commentIndex].replies.filter(
    (r) => r.id !== replyId
  );
  
  saveComments(comments);
  return true;
}

/**
 * Resolve a comment
 */
export function resolveComment(
  commentId: string,
  resolvedBy: string
): DesignComment | null {
  const comments = getAllComments();
  const index = comments.findIndex((c) => c.id === commentId);
  
  if (index === -1) return null;
  
  comments[index] = {
    ...comments[index],
    resolved: true,
    resolvedBy,
    resolvedAt: new Date(),
  };
  
  saveComments(comments);
  return comments[index];
}

/**
 * Unresolve a comment
 */
export function unresolveComment(commentId: string): DesignComment | null {
  const comments = getAllComments();
  const index = comments.findIndex((c) => c.id === commentId);
  
  if (index === -1) return null;
  
  comments[index] = {
    ...comments[index],
    resolved: false,
    resolvedBy: undefined,
    resolvedAt: undefined,
  };
  
  saveComments(comments);
  return comments[index];
}

/**
 * Get comment threads for a design (organized by element)
 */
export function getCommentThreads(designId: string): CommentThread[] {
  const comments = getDesignComments(designId);
  
  return comments.map((comment) => {
    const participants = new Set<string>([comment.authorId]);
    comment.replies.forEach((r) => participants.add(r.authorId));
    
    const lastReplyDate = comment.replies.length > 0
      ? comment.replies[comment.replies.length - 1].createdAt
      : comment.createdAt;
    
    return {
      comment,
      replyCount: comment.replies.length,
      lastActivity: lastReplyDate,
      participants: Array.from(participants),
    };
  }).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
}

/**
 * Get comment count for a design
 */
export function getCommentCount(designId: string): {
  total: number;
  resolved: number;
  unresolved: number;
} {
  const comments = getDesignComments(designId);
  const resolved = comments.filter((c) => c.resolved).length;
  
  return {
    total: comments.length,
    resolved,
    unresolved: comments.length - resolved,
  };
}

/**
 * Get elements with comments
 */
export function getElementsWithComments(designId: string): string[] {
  const comments = getDesignComments(designId);
  const elementIds = new Set<string>();
  
  comments.forEach((c) => {
    if (c.elementId) {
      elementIds.add(c.elementId);
    }
  });
  
  return Array.from(elementIds);
}

/**
 * Delete all comments for a design
 */
export function deleteDesignComments(designId: string): number {
  const allComments = getAllComments();
  const remaining = allComments.filter((c) => c.designId !== designId);
  const deletedCount = allComments.length - remaining.length;
  
  saveComments(remaining);
  return deletedCount;
}

const commentsAPI = {
  getDesignComments,
  getElementComments,
  getUnresolvedComments,
  addComment,
  editComment,
  deleteComment,
  addReply,
  editReply,
  deleteReply,
  resolveComment,
  unresolveComment,
  getCommentThreads,
  getCommentCount,
  getElementsWithComments,
  deleteDesignComments,
};

export default commentsAPI;
