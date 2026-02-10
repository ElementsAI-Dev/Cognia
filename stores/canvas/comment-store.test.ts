/**
 * Tests for Comment Store
 */

import { act, renderHook } from '@testing-library/react';
import { useCommentStore } from './comment-store';

const createRange = (startLine: number, endLine: number) => ({
  startLine,
  startColumn: 0,
  endLine,
  endColumn: 0,
});

describe('useCommentStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCommentStore());
    act(() => {
      result.current.clearDocumentComments('doc1');
    });
  });

  describe('addComment', () => {
    it('should add a new comment', () => {
      const { result } = renderHook(() => useCommentStore());

      act(() => {
        result.current.addComment('doc1', {
          content: 'Test comment',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 5),
        });
      });

      const comments = result.current.getCommentsForDocument('doc1');
      expect(comments.length).toBe(1);
      expect(comments[0].content).toBe('Test comment');
    });

    it('should assign unique IDs', () => {
      const { result } = renderHook(() => useCommentStore());

      act(() => {
        result.current.addComment('doc1', {
          content: 'Comment 1',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 1),
        });
        result.current.addComment('doc1', {
          content: 'Comment 2',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(2, 2),
        });
      });

      const comments = result.current.getCommentsForDocument('doc1');
      expect(comments[0].id).not.toBe(comments[1].id);
    });
  });

  describe('updateComment', () => {
    it('should update comment content', () => {
      const { result } = renderHook(() => useCommentStore());

      let commentId: string;
      act(() => {
        const comment = result.current.addComment('doc1', {
          content: 'Original',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 1),
        });
        commentId = comment.id;
      });

      act(() => {
        result.current.updateComment('doc1', commentId!, 'Updated');
      });

      const comments = result.current.getCommentsForDocument('doc1');
      const updated = comments.find(c => c.id === commentId);
      expect(updated?.content).toBe('Updated');
    });
  });

  describe('deleteComment', () => {
    it('should remove a comment', () => {
      const { result } = renderHook(() => useCommentStore());

      let commentId: string;
      act(() => {
        const comment = result.current.addComment('doc1', {
          content: 'To delete',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 1),
        });
        commentId = comment.id;
      });

      act(() => {
        result.current.deleteComment('doc1', commentId!);
      });

      expect(result.current.getCommentsForDocument('doc1').length).toBe(0);
    });
  });

  describe('resolveComment', () => {
    it('should mark comment as resolved', () => {
      const { result } = renderHook(() => useCommentStore());

      let commentId: string;
      act(() => {
        const comment = result.current.addComment('doc1', {
          content: 'Issue',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 1),
        });
        commentId = comment.id;
      });

      act(() => {
        result.current.resolveComment('doc1', commentId!);
      });

      const comments = result.current.getCommentsForDocument('doc1');
      const resolved = comments.find(c => c.id === commentId);
      expect(resolved?.resolvedAt).toBeDefined();
    });
  });

  describe('replyToComment', () => {
    it('should add a reply to a comment', () => {
      const { result } = renderHook(() => useCommentStore());

      let parentId: string;
      act(() => {
        const parent = result.current.addComment('doc1', {
          content: 'Parent',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 1),
        });
        parentId = parent.id;
      });

      act(() => {
        result.current.replyToComment('doc1', parentId!, {
          content: 'Reply',
          documentId: 'doc1',
          authorId: 'user2',
          authorName: 'User 2',
        });
      });

      const comments = result.current.getCommentsForDocument('doc1');
      const replies = comments.filter(c => c.parentId === parentId);
      expect(replies.length).toBe(1);
      expect(replies[0].content).toBe('Reply');
    });
  });

  describe('addReaction', () => {
    it('should add a reaction to a comment', () => {
      const { result } = renderHook(() => useCommentStore());

      let commentId: string;
      act(() => {
        const comment = result.current.addComment('doc1', {
          content: 'React to me',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 1),
        });
        commentId = comment.id;
      });

      act(() => {
        result.current.addReaction('doc1', commentId!, '👍', 'user2');
      });

      const comments = result.current.getCommentsForDocument('doc1');
      const comment = comments.find(c => c.id === commentId);
      expect(comment?.reactions?.some(r => r.emoji === '👍')).toBe(true);
    });
  });

  describe('getCommentsInRange', () => {
    it('should find comments in a line range', () => {
      const { result } = renderHook(() => useCommentStore());

      act(() => {
        result.current.addComment('doc1', {
          content: 'In range',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(3, 7),
        });
        result.current.addComment('doc1', {
          content: 'Out of range',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(10, 15),
        });
      });

      const inRange = result.current.getCommentsInRange('doc1', createRange(1, 8));
      expect(inRange.length).toBe(1);
      expect(inRange[0].content).toBe('In range');
    });
  });

  describe('getUnresolvedComments', () => {
    it('should return only unresolved comments', () => {
      const { result } = renderHook(() => useCommentStore());

      let commentId: string;
      act(() => {
        result.current.addComment('doc1', {
          content: 'Unresolved',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 1),
        });
        const toResolve = result.current.addComment('doc1', {
          content: 'Will resolve',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(2, 2),
        });
        commentId = toResolve.id;
      });

      act(() => {
        result.current.resolveComment('doc1', commentId!);
      });

      const unresolved = result.current.getUnresolvedComments('doc1');
      expect(unresolved.length).toBe(1);
      expect(unresolved[0].content).toBe('Unresolved');
    });
  });

  describe('Date serialization', () => {
    it('should store createdAt as Date objects', () => {
      const { result } = renderHook(() => useCommentStore());

      act(() => {
        result.current.addComment('doc1', {
          content: 'Date test',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 1),
        });
      });

      const comments = result.current.getCommentsForDocument('doc1');
      expect(comments[0].createdAt).toBeInstanceOf(Date);
    });

    it('should store updatedAt as Date after update', () => {
      const { result } = renderHook(() => useCommentStore());

      let commentId: string;
      act(() => {
        const comment = result.current.addComment('doc1', {
          content: 'Original',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 1),
        });
        commentId = comment.id;
      });

      act(() => {
        result.current.updateComment('doc1', commentId!, 'Updated');
      });

      const comments = result.current.getCommentsForDocument('doc1');
      const updated = comments.find(c => c.id === commentId);
      expect(updated?.updatedAt).toBeInstanceOf(Date);
    });

    it('should store resolvedAt as Date after resolve', () => {
      const { result } = renderHook(() => useCommentStore());

      let commentId: string;
      act(() => {
        const comment = result.current.addComment('doc1', {
          content: 'Resolve test',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 1),
        });
        commentId = comment.id;
      });

      act(() => {
        result.current.resolveComment('doc1', commentId!);
      });

      const comments = result.current.getCommentsForDocument('doc1');
      const resolved = comments.find(c => c.id === commentId);
      expect(resolved?.resolvedAt).toBeInstanceOf(Date);
    });

    it('should revive Date strings from localStorage via custom storage', () => {
      // Simulate what the custom storage.getItem does
      const isoDate = '2025-01-15T10:30:00.000Z';
      const stored = JSON.stringify({
        state: {
          comments: {
            doc1: [
              {
                id: 'c1',
                content: 'Test',
                createdAt: isoDate,
                updatedAt: isoDate,
                resolvedAt: isoDate,
                reactions: [],
              },
            ],
          },
        },
        version: 0,
      });

      // Set in localStorage
      localStorage.setItem('cognia-canvas-comments', stored);

      // Read it back using the custom storage logic
      const raw = localStorage.getItem('cognia-canvas-comments');
      expect(raw).toBeTruthy();

      const parsed = JSON.parse(raw!);
      if (parsed?.state?.comments) {
        for (const docComments of Object.values(parsed.state.comments)) {
          if (Array.isArray(docComments)) {
            for (const comment of docComments as Record<string, unknown>[]) {
              if (typeof comment.createdAt === 'string') comment.createdAt = new Date(comment.createdAt as string);
              if (typeof comment.updatedAt === 'string') comment.updatedAt = new Date(comment.updatedAt as string);
              if (typeof comment.resolvedAt === 'string') comment.resolvedAt = new Date(comment.resolvedAt as string);
            }
          }
        }
      }

      const revived = parsed.state.comments.doc1[0];
      expect(revived.createdAt).toBeInstanceOf(Date);
      expect(revived.updatedAt).toBeInstanceOf(Date);
      expect(revived.resolvedAt).toBeInstanceOf(Date);
      expect((revived.createdAt as Date).toISOString()).toBe(isoDate);

      // Cleanup
      localStorage.removeItem('cognia-canvas-comments');
    });
  });

  describe('clearDocumentComments', () => {
    it('should clear all comments for a document', () => {
      const { result } = renderHook(() => useCommentStore());

      act(() => {
        result.current.addComment('doc1', {
          content: 'Comment 1',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(1, 1),
        });
        result.current.addComment('doc1', {
          content: 'Comment 2',
          documentId: 'doc1',
          authorId: 'user1',
          authorName: 'User 1',
          range: createRange(2, 2),
        });
      });

      expect(result.current.getCommentsForDocument('doc1').length).toBe(2);

      act(() => {
        result.current.clearDocumentComments('doc1');
      });

      expect(result.current.getCommentsForDocument('doc1').length).toBe(0);
    });
  });
});
