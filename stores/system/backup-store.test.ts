/**
 * Tests for Backup Reminder Store
 */

import { act } from '@testing-library/react';
import { useBackupStore } from './backup-store';

describe('useBackupStore', () => {
  beforeEach(() => {
    useBackupStore.setState({
      lastBackupDate: null,
      backupReminderDays: 7,
      isReminderDismissed: false,
      dismissedAt: null,
      totalBackupCount: 0,
    });
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useBackupStore.getState();
      expect(state.lastBackupDate).toBeNull();
      expect(state.backupReminderDays).toBe(7);
      expect(state.isReminderDismissed).toBe(false);
      expect(state.dismissedAt).toBeNull();
      expect(state.totalBackupCount).toBe(0);
    });
  });

  describe('markBackupComplete', () => {
    it('should record backup date and increment count', () => {
      act(() => {
        useBackupStore.getState().markBackupComplete();
      });

      const state = useBackupStore.getState();
      expect(state.lastBackupDate).not.toBeNull();
      expect(state.totalBackupCount).toBe(1);
      expect(state.isReminderDismissed).toBe(false);
      expect(state.dismissedAt).toBeNull();
    });

    it('should increment count on multiple backups', () => {
      act(() => {
        useBackupStore.getState().markBackupComplete();
        useBackupStore.getState().markBackupComplete();
        useBackupStore.getState().markBackupComplete();
      });

      expect(useBackupStore.getState().totalBackupCount).toBe(3);
    });

    it('should clear dismissed state after backup', () => {
      act(() => {
        useBackupStore.getState().dismissReminder();
      });

      expect(useBackupStore.getState().isReminderDismissed).toBe(true);

      act(() => {
        useBackupStore.getState().markBackupComplete();
      });

      expect(useBackupStore.getState().isReminderDismissed).toBe(false);
      expect(useBackupStore.getState().dismissedAt).toBeNull();
    });
  });

  describe('dismissReminder', () => {
    it('should set dismissed state with timestamp', () => {
      act(() => {
        useBackupStore.getState().dismissReminder();
      });

      const state = useBackupStore.getState();
      expect(state.isReminderDismissed).toBe(true);
      expect(state.dismissedAt).not.toBeNull();
    });
  });

  describe('setReminderInterval', () => {
    it('should set reminder interval in days', () => {
      act(() => {
        useBackupStore.getState().setReminderInterval(14);
      });

      expect(useBackupStore.getState().backupReminderDays).toBe(14);
    });

    it('should clamp interval to minimum 1 day', () => {
      act(() => {
        useBackupStore.getState().setReminderInterval(0);
      });

      expect(useBackupStore.getState().backupReminderDays).toBe(1);
    });

    it('should clamp interval to maximum 90 days', () => {
      act(() => {
        useBackupStore.getState().setReminderInterval(120);
      });

      expect(useBackupStore.getState().backupReminderDays).toBe(90);
    });
  });

  describe('resetBackupHistory', () => {
    it('should reset all backup state', () => {
      act(() => {
        useBackupStore.getState().markBackupComplete();
        useBackupStore.getState().markBackupComplete();
        useBackupStore.getState().dismissReminder();
      });

      act(() => {
        useBackupStore.getState().resetBackupHistory();
      });

      const state = useBackupStore.getState();
      expect(state.lastBackupDate).toBeNull();
      expect(state.totalBackupCount).toBe(0);
      expect(state.isReminderDismissed).toBe(false);
      expect(state.dismissedAt).toBeNull();
    });
  });

  describe('shouldShowReminder', () => {
    it('should show reminder when never backed up', () => {
      expect(useBackupStore.getState().shouldShowReminder()).toBe(true);
    });

    it('should not show reminder right after backup', () => {
      act(() => {
        useBackupStore.getState().markBackupComplete();
      });

      expect(useBackupStore.getState().shouldShowReminder()).toBe(false);
    });

    it('should not show reminder within 24h of dismissal', () => {
      act(() => {
        useBackupStore.getState().dismissReminder();
      });

      expect(useBackupStore.getState().shouldShowReminder()).toBe(false);
    });

    it('should show reminder when enough days passed since last backup', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      useBackupStore.setState({ lastBackupDate: eightDaysAgo });

      expect(useBackupStore.getState().shouldShowReminder()).toBe(true);
    });

    it('should not show reminder when backup is recent', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      useBackupStore.setState({ lastBackupDate: twoDaysAgo });

      expect(useBackupStore.getState().shouldShowReminder()).toBe(false);
    });

    it('should show reminder after dismissal expires (>24h)', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      useBackupStore.setState({
        isReminderDismissed: true,
        dismissedAt: twoDaysAgo,
        lastBackupDate: null,
      });

      expect(useBackupStore.getState().shouldShowReminder()).toBe(true);
    });
  });

  describe('daysSinceLastBackup', () => {
    it('should return null when never backed up', () => {
      expect(useBackupStore.getState().daysSinceLastBackup()).toBeNull();
    });

    it('should return 0 for today backup', () => {
      act(() => {
        useBackupStore.getState().markBackupComplete();
      });

      expect(useBackupStore.getState().daysSinceLastBackup()).toBe(0);
    });

    it('should return correct days since last backup', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      useBackupStore.setState({ lastBackupDate: fiveDaysAgo });

      expect(useBackupStore.getState().daysSinceLastBackup()).toBe(5);
    });
  });
});
