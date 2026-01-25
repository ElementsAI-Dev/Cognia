/**
 * Settings Profiles Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useSettingsProfilesStore } from './settings-profiles-store';

// Reset store before each test
beforeEach(() => {
  const { result } = renderHook(() => useSettingsProfilesStore());
  act(() => {
    // Clear all profiles
    result.current.profiles.forEach((p) => {
      result.current.deleteProfile(p.id);
    });
    result.current.setActiveProfile(null);
  });
});

describe('useSettingsProfilesStore', () => {
  describe('createProfile', () => {
    it('should create a new profile with given name', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let profileId: string;
      act(() => {
        profileId = result.current.createProfile('Test Profile', 'Test description');
      });

      expect(result.current.profiles).toHaveLength(1);
      expect(result.current.profiles[0].name).toBe('Test Profile');
      expect(result.current.profiles[0].description).toBe('Test description');
      expect(result.current.profiles[0].id).toBe(profileId!);
    });

    it('should create profile with default settings', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      act(() => {
        result.current.createProfile('Default Test');
      });

      const profile = result.current.profiles[0];
      expect(profile.theme).toBe('system');
      expect(profile.colorTheme).toBe('default');
      expect(profile.backgroundSettings.enabled).toBe(false);
      expect(profile.uiCustomization.borderRadius).toBe('md');
    });
  });

  describe('updateProfile', () => {
    it('should update profile properties', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let profileId: string;
      act(() => {
        profileId = result.current.createProfile('Original Name');
      });

      act(() => {
        result.current.updateProfile(profileId!, {
          name: 'Updated Name',
          theme: 'dark',
          colorTheme: 'ocean',
        });
      });

      const profile = result.current.profiles.find((p) => p.id === profileId);
      expect(profile?.name).toBe('Updated Name');
      expect(profile?.theme).toBe('dark');
      expect(profile?.colorTheme).toBe('ocean');
    });

    it('should update updatedAt timestamp', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let profileId: string;
      act(() => {
        profileId = result.current.createProfile('Test');
      });

      const originalUpdatedAt = result.current.profiles[0].updatedAt;

      // Wait a bit to ensure timestamp changes
      jest.advanceTimersByTime(100);

      act(() => {
        result.current.updateProfile(profileId!, { name: 'Updated' });
      });

      expect(result.current.profiles[0].updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile by id', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let profileId: string;
      act(() => {
        profileId = result.current.createProfile('To Delete');
      });

      expect(result.current.profiles).toHaveLength(1);

      act(() => {
        result.current.deleteProfile(profileId!);
      });

      expect(result.current.profiles).toHaveLength(0);
    });

    it('should clear activeProfileId if deleting active profile', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let profileId: string;
      act(() => {
        profileId = result.current.createProfile('Active');
        result.current.setActiveProfile(profileId);
      });

      expect(result.current.activeProfileId).toBe(profileId!);

      act(() => {
        result.current.deleteProfile(profileId!);
      });

      expect(result.current.activeProfileId).toBeNull();
    });
  });

  describe('renameProfile', () => {
    it('should rename a profile', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let profileId: string;
      act(() => {
        profileId = result.current.createProfile('Old Name');
      });

      act(() => {
        result.current.renameProfile(profileId!, 'New Name');
      });

      expect(result.current.profiles[0].name).toBe('New Name');
    });
  });

  describe('duplicateProfile', () => {
    it('should create a copy of a profile', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let originalId: string;
      act(() => {
        originalId = result.current.createProfile('Original');
        result.current.updateProfile(originalId, {
          theme: 'dark',
          colorTheme: 'forest',
        });
      });

      let duplicateId: string | null = null;
      act(() => {
        duplicateId = result.current.duplicateProfile(originalId!, 'Copy');
      });

      expect(result.current.profiles).toHaveLength(2);

      const duplicate = result.current.profiles.find((p) => p.id === duplicateId);
      expect(duplicate?.name).toBe('Copy');
      expect(duplicate?.theme).toBe('dark');
      expect(duplicate?.colorTheme).toBe('forest');
    });

    it('should return null for non-existent profile', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let duplicateId: string | null = null;
      act(() => {
        duplicateId = result.current.duplicateProfile('non-existent', 'Copy');
      });

      expect(duplicateId).toBeNull();
    });
  });

  describe('setActiveProfile', () => {
    it('should set active profile id', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let profileId: string;
      act(() => {
        profileId = result.current.createProfile('Test');
      });

      act(() => {
        result.current.setActiveProfile(profileId!);
      });

      expect(result.current.activeProfileId).toBe(profileId!);
    });

    it('should allow setting to null', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let profileId: string;
      act(() => {
        profileId = result.current.createProfile('Test');
        result.current.setActiveProfile(profileId);
      });

      act(() => {
        result.current.setActiveProfile(null);
      });

      expect(result.current.activeProfileId).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('should return profile by id', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let profileId: string;
      act(() => {
        profileId = result.current.createProfile('Test');
      });

      const profile = result.current.getProfile(profileId!);
      expect(profile?.name).toBe('Test');
    });

    it('should return undefined for non-existent id', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      const profile = result.current.getProfile('non-existent');
      expect(profile).toBeUndefined();
    });
  });

  describe('exportProfile', () => {
    it('should export profile as JSON string', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let profileId: string;
      act(() => {
        profileId = result.current.createProfile('Export Test', 'Test description');
      });

      const json = result.current.exportProfile(profileId!);
      expect(json).not.toBeNull();

      const parsed = JSON.parse(json!);
      expect(parsed.version).toBe('1.0');
      expect(parsed.profile.name).toBe('Export Test');
      expect(parsed.profile.description).toBe('Test description');
    });

    it('should return null for non-existent profile', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      const json = result.current.exportProfile('non-existent');
      expect(json).toBeNull();
    });
  });

  describe('importProfile', () => {
    it('should import valid profile JSON', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      const importData = JSON.stringify({
        version: '1.0',
        profile: {
          name: 'Imported Profile',
          description: 'Imported description',
          theme: 'dark',
          colorTheme: 'ocean',
        },
      });

      let importResult: { success: boolean; profileId?: string };
      act(() => {
        importResult = result.current.importProfile(importData);
      });

      expect(importResult!.success).toBe(true);
      expect(importResult!.profileId).toBeDefined();

      const imported = result.current.profiles.find((p) => p.id === importResult!.profileId);
      expect(imported?.name).toBe('Imported Profile');
      expect(imported?.theme).toBe('dark');
    });

    it('should reject invalid JSON', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      let importResult: { success: boolean; error?: string };
      act(() => {
        importResult = result.current.importProfile('invalid json');
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toBeDefined();
    });

    it('should reject missing version', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      const importData = JSON.stringify({
        profile: { name: 'Test' },
      });

      let importResult: { success: boolean; error?: string };
      act(() => {
        importResult = result.current.importProfile(importData);
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toBe('Invalid profile format');
    });

    it('should reject missing profile name', () => {
      const { result } = renderHook(() => useSettingsProfilesStore());

      const importData = JSON.stringify({
        version: '1.0',
        profile: {},
      });

      let importResult: { success: boolean; error?: string };
      act(() => {
        importResult = result.current.importProfile(importData);
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toBe('Profile missing name');
    });
  });
});
