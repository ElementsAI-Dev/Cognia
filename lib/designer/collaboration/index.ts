/**
 * Collaboration module index
 * Re-exports all collaboration features
 */

export {
  type ShareableDesign,
  type PermissionLevel,
  type SharePermission,
  type ShareLink,
  type ShareSettings,
  createShareableDesign,
  updateShareableDesign,
  deleteShareableDesign,
  getShareableDesign,
  getSharedDesigns,
  createShareLink,
  getShareLinkByToken,
  accessSharedDesign,
  revokeShareLink,
  getDesignShareLinks,
  generateShareUrl,
  parseShareToken,
  getUserSharedDesigns,
  getPublicDesigns,
} from './share-manager';

export {
  type CommentReply,
  type DesignComment,
  type CommentThread,
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
} from './comments';

export {
  CollabAwareness,
  collabAwareness,
  type CollabUserState,
  type CollabAwarenessConfig,
  type AwarenessChangeCallback,
} from './collab-awareness';
