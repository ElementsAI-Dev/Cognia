/**
 * Types for SocialShareDialog component
 */

import type { Session } from '@/types/core';

export type ShareFormat = 'text' | 'markdown' | 'image' | 'link' | 'qrcode';

export interface SocialShareDialogProps {
  session: Session;
  trigger?: React.ReactNode;
}
