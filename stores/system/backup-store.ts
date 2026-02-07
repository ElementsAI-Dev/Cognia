/**
 * Backup Reminder Store
 * Tracks backup status and reminds users to back up their data periodically
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface BackupState {
  lastBackupDate: string | null;
  backupReminderDays: number;
  isReminderDismissed: boolean;
  dismissedAt: string | null;
  totalBackupCount: number;

  // Computed
  shouldShowReminder: () => boolean;
  daysSinceLastBackup: () => number | null;

  // Actions
  markBackupComplete: () => void;
  dismissReminder: () => void;
  setReminderInterval: (days: number) => void;
  resetBackupHistory: () => void;
}

const DEFAULT_REMINDER_DAYS = 7;

export const useBackupStore = create<BackupState>()(
  persist(
    (set, get) => ({
      lastBackupDate: null,
      backupReminderDays: DEFAULT_REMINDER_DAYS,
      isReminderDismissed: false,
      dismissedAt: null,
      totalBackupCount: 0,

      shouldShowReminder: () => {
        const { lastBackupDate, backupReminderDays, isReminderDismissed, dismissedAt } = get();

        // If dismissed recently (within 24 hours), don't show
        if (isReminderDismissed && dismissedAt) {
          const dismissedTime = new Date(dismissedAt).getTime();
          const now = Date.now();
          if (now - dismissedTime < 24 * 60 * 60 * 1000) {
            return false;
          }
        }

        // If never backed up and has been using app for a while
        if (!lastBackupDate) {
          return true;
        }

        // Check if enough days have passed since last backup
        const lastBackup = new Date(lastBackupDate).getTime();
        const now = Date.now();
        const daysSince = Math.floor((now - lastBackup) / (1000 * 60 * 60 * 24));

        return daysSince >= backupReminderDays;
      },

      daysSinceLastBackup: () => {
        const { lastBackupDate } = get();
        if (!lastBackupDate) return null;

        const lastBackup = new Date(lastBackupDate).getTime();
        const now = Date.now();
        return Math.floor((now - lastBackup) / (1000 * 60 * 60 * 24));
      },

      markBackupComplete: () =>
        set((state) => ({
          lastBackupDate: new Date().toISOString(),
          isReminderDismissed: false,
          dismissedAt: null,
          totalBackupCount: state.totalBackupCount + 1,
        })),

      dismissReminder: () =>
        set({
          isReminderDismissed: true,
          dismissedAt: new Date().toISOString(),
        }),

      setReminderInterval: (days: number) =>
        set({
          backupReminderDays: Math.max(1, Math.min(90, days)),
        }),

      resetBackupHistory: () =>
        set({
          lastBackupDate: null,
          isReminderDismissed: false,
          dismissedAt: null,
          totalBackupCount: 0,
        }),
    }),
    {
      name: 'cognia-backup',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version === 0) {
          // v0 -> v1: Ensure newer fields exist
          if (state.totalBackupCount === undefined) {
            state.totalBackupCount = 0;
          }
          if (state.isReminderDismissed === undefined) {
            state.isReminderDismissed = false;
          }
          if (state.dismissedAt === undefined) {
            state.dismissedAt = null;
          }
        }
        return state;
      },
      partialize: (state) => ({
        lastBackupDate: state.lastBackupDate,
        backupReminderDays: state.backupReminderDays,
        isReminderDismissed: state.isReminderDismissed,
        dismissedAt: state.dismissedAt,
        totalBackupCount: state.totalBackupCount,
      }),
    }
  )
);

export default useBackupStore;
