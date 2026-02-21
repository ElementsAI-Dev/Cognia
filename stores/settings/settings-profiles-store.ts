/**
 * Settings Profiles Store
 * Allows users to save and load multiple appearance setting configurations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  DEFAULT_BACKGROUND_SETTINGS,
  normalizeBackgroundSettings,
  migrateAndSanitizeBackgroundSettings,
} from '@/lib/themes';
import type { BackgroundSettings, UICustomization, ColorThemePreset } from '@/lib/themes';
import type { Theme, CustomTheme } from '@/stores/settings/settings-store';

export interface SettingsProfile {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  // Theme settings
  theme: Theme;
  colorTheme: ColorThemePreset;
  activeCustomThemeId: string | null;
  customThemes: CustomTheme[];
  // Background settings
  backgroundSettings: BackgroundSettings;
  // UI customization
  uiCustomization: UICustomization;
  // Message bubble style
  messageBubbleStyle: 'default' | 'minimal' | 'bordered' | 'gradient';
  // UI font size
  uiFontSize: number;
}

interface SettingsProfilesState {
  profiles: SettingsProfile[];
  activeProfileId: string | null;

  // Actions
  createProfile: (name: string, description?: string) => string;
  updateProfile: (id: string, updates: Partial<Omit<SettingsProfile, 'id' | 'createdAt'>>) => void;
  deleteProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  duplicateProfile: (id: string, newName: string) => string | null;
  setActiveProfile: (id: string | null) => void;
  getProfile: (id: string) => SettingsProfile | undefined;
  saveCurrentSettingsToProfile: (id: string) => void;
  exportProfile: (id: string) => string | null;
  importProfile: (json: string) => { success: boolean; error?: string; profileId?: string };
}

export const useSettingsProfilesStore = create<SettingsProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,

      createProfile: (name, description) => {
        const id = `profile-${nanoid(10)}`;
        const now = new Date();

        // Get current settings from settings store (will be imported dynamically)
        const newProfile: SettingsProfile = {
          id,
          name,
          description,
          createdAt: now,
          updatedAt: now,
          // Default values - will be overwritten when saved
          theme: 'system',
          colorTheme: 'default',
          activeCustomThemeId: null,
          customThemes: [],
          backgroundSettings: { ...DEFAULT_BACKGROUND_SETTINGS },
          uiCustomization: {
            borderRadius: 'md',
            spacing: 'comfortable',
            shadowIntensity: 'subtle',
            enableAnimations: true,
            enableBlur: true,
            sidebarWidth: 280,
            chatMaxWidth: 900,
            messageDensity: 'default',
            avatarStyle: 'circle',
            timestampFormat: 'relative',
            showAvatars: true,
            showUserAvatar: false,
            showAssistantAvatar: true,
            messageAlignment: 'alternate',
            inputPosition: 'bottom',
            uiFontFamily: 'system',
          },
          messageBubbleStyle: 'default',
          uiFontSize: 14,
        };

        set((state) => ({
          profiles: [...state.profiles, newProfile],
        }));

        return id;
      },

      updateProfile: (id, updates) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id ? { ...profile, ...updates, updatedAt: new Date() } : profile
          ),
        }));
      },

      deleteProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((profile) => profile.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }));
      },

      renameProfile: (id, name) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id ? { ...profile, name, updatedAt: new Date() } : profile
          ),
        }));
      },

      duplicateProfile: (id, newName) => {
        const original = get().profiles.find((p) => p.id === id);
        if (!original) return null;

        const newId = `profile-${nanoid(10)}`;
        const now = new Date();

        const duplicated: SettingsProfile = {
          ...original,
          id: newId,
          name: newName,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          profiles: [...state.profiles, duplicated],
        }));

        return newId;
      },

      setActiveProfile: (id) => {
        set({ activeProfileId: id });
      },

      getProfile: (id) => {
        return get().profiles.find((p) => p.id === id);
      },

      saveCurrentSettingsToProfile: (_id) => {
        // This will be called from the component with current settings
        // The actual settings will be passed via updateProfile
      },

      exportProfile: (id) => {
        const profile = get().profiles.find((p) => p.id === id);
        if (!profile) return null;

        const exportData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          profile: {
            name: profile.name,
            description: profile.description,
            theme: profile.theme,
            colorTheme: profile.colorTheme,
            customThemes: profile.customThemes,
            backgroundSettings: profile.backgroundSettings,
            uiCustomization: profile.uiCustomization,
            messageBubbleStyle: profile.messageBubbleStyle,
            uiFontSize: profile.uiFontSize,
          },
        };

        return JSON.stringify(exportData, null, 2);
      },

      importProfile: (json) => {
        try {
          const data = JSON.parse(json);

          if (!data.version || !data.profile) {
            return { success: false, error: 'Invalid profile format' };
          }

          if (!data.profile.name) {
            return { success: false, error: 'Profile missing name' };
          }

          const id = `profile-${nanoid(10)}`;
          const now = new Date();

          const migratedBackground = migrateAndSanitizeBackgroundSettings(
            data.profile.backgroundSettings,
            {
              downgradeUnresolvedLocalToNone: true,
              allowIncompleteUrlSource: false,
            }
          );

          if (!migratedBackground.success) {
            return {
              success: false,
              error: migratedBackground.error ?? 'Invalid background settings',
            };
          }

          const newProfile: SettingsProfile = {
            id,
            name: data.profile.name,
            description: data.profile.description,
            createdAt: now,
            updatedAt: now,
            theme: data.profile.theme || 'system',
            colorTheme: data.profile.colorTheme || 'default',
            activeCustomThemeId: null,
            customThemes: data.profile.customThemes || [],
            backgroundSettings: migratedBackground.settings,
            uiCustomization: data.profile.uiCustomization || {
              borderRadius: 'md',
              spacing: 'comfortable',
              shadowIntensity: 'subtle',
              enableAnimations: true,
              enableBlur: true,
              sidebarWidth: 280,
              chatMaxWidth: 900,
              messageDensity: 'default',
              avatarStyle: 'circle',
              timestampFormat: 'relative',
              showAvatars: true,
              showUserAvatar: false,
              showAssistantAvatar: true,
              messageAlignment: 'alternate',
              inputPosition: 'bottom',
              uiFontFamily: 'system',
            },
            messageBubbleStyle: data.profile.messageBubbleStyle || 'default',
            uiFontSize: data.profile.uiFontSize || 14,
          };

          set((state) => ({
            profiles: [...state.profiles, newProfile],
          }));

          return { success: true, profileId: id };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse profile JSON',
          };
        }
      },
    }),
    {
      name: 'cognia-settings-profiles',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsProfilesState> | undefined;
        const persistedProfiles = persisted?.profiles;

        const profiles = Array.isArray(persistedProfiles)
          ? persistedProfiles.map((p) => {
              const migrated = migrateAndSanitizeBackgroundSettings(
                (p as SettingsProfile).backgroundSettings,
                {
                  downgradeUnresolvedLocalToNone: true,
                  allowIncompleteUrlSource: false,
                }
              );
              return {
                ...p,
                backgroundSettings: migrated.success
                  ? migrated.settings
                  : normalizeBackgroundSettings(DEFAULT_BACKGROUND_SETTINGS),
              };
            })
          : currentState.profiles;

        return {
          ...currentState,
          ...persisted,
          profiles,
        };
      },
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
      }),
    }
  )
);

export default useSettingsProfilesStore;
