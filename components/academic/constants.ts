/**
 * Academic Component Constants
 * Shared UI constants for academic components
 */

import {
  Clock,
  BookMarked,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import type { PaperReadingStatus } from '@/types/academic';

export const STATUS_ICONS: Record<PaperReadingStatus, typeof Clock> = {
  unread: Clock,
  reading: BookMarked,
  completed: CheckCircle2,
  archived: Archive,
};

export const STATUS_COLORS: Record<PaperReadingStatus, string> = {
  unread: 'text-muted-foreground',
  reading: 'text-blue-500',
  completed: 'text-green-500',
  archived: 'text-gray-400',
};

export const STATUS_OPTIONS: { value: PaperReadingStatus; label: string }[] = [
  { value: 'unread', label: 'Unread' },
  { value: 'reading', label: 'Reading' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];
