'use client';

/**
 * StrongholdProvider - Manages Stronghold secure storage initialization
 * 
 * This provider handles:
 * - Stronghold initialization on app startup
 * - Password prompt for unlocking the vault
 * - Migration of existing API keys to secure storage
 * - State management for Stronghold availability
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useStronghold, type StrongholdState } from '@/hooks/native';
import { useSettingsStore } from '@/stores/settings';
import {
  migrateApiKeysToStronghold,
  secureGetProviderApiKey,
  secureGetProviderApiKeys,
  secureGetSearchApiKey,
  secureGetCustomProviderApiKey,
  isStrongholdAvailable,
} from '@/lib/native/stronghold-integration';
import type { SearchProviderType } from '@/types/search';

interface StrongholdContextValue extends StrongholdState {
  unlock: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
  showUnlockDialog: boolean;
  setShowUnlockDialog: (show: boolean) => void;
}

const StrongholdContext = createContext<StrongholdContextValue | null>(null);

interface StrongholdProviderProps {
  children: ReactNode;
  autoPrompt?: boolean;
}

export function StrongholdProvider({ children, autoPrompt = false }: StrongholdProviderProps) {
  const stronghold = useStronghold();
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const customProviders = useSettingsStore((state) => state.customProviders);
  const searchProviders = useSettingsStore((state) => state.searchProviders);
  const tavilyApiKey = useSettingsStore((state) => state.tavilyApiKey);
  const setProviderSettings = useSettingsStore((state) => state.setProviderSettings);
  const updateCustomProvider = useSettingsStore((state) => state.updateCustomProvider);
  const setSearchProviderSettings = useSettingsStore((state) => state.setSearchProviderSettings);
  const setTavilyApiKey = useSettingsStore((state) => state.setTavilyApiKey);
  const [showUnlockDialog, setShowUnlockDialog] = useState(() => {
    // Initialize based on autoPrompt preference
    return autoPrompt;
  });

  const hydrateApiKeysFromStronghold = useCallback(async (): Promise<void> => {
    if (!isStrongholdAvailable()) return;

    await migrateApiKeysToStronghold({
      providerSettings,
      customProviders,
      searchProviders,
      tavilyApiKey,
    });

    for (const [providerId] of Object.entries(providerSettings)) {
      const [secureKey, secureKeys] = await Promise.all([
        secureGetProviderApiKey(providerId),
        secureGetProviderApiKeys(providerId),
      ]);

      if (secureKey || (secureKeys && secureKeys.length > 0)) {
        setProviderSettings(providerId, {
          apiKey: secureKey ?? '',
          apiKeys: secureKeys && secureKeys.length > 0 ? secureKeys : [],
        });
      }
    }

    for (const [providerId] of Object.entries(customProviders)) {
      const secureKey = await secureGetCustomProviderApiKey(providerId);
      if (secureKey) {
        updateCustomProvider(providerId, { apiKey: secureKey });
      }
    }

    for (const [providerId] of Object.entries(searchProviders) as [SearchProviderType, unknown][]) {
      const secureKey = await secureGetSearchApiKey(providerId);
      if (secureKey) {
        setSearchProviderSettings(providerId, { apiKey: secureKey });
      }
    }

    const tavilySecureKey = await secureGetSearchApiKey('tavily');
    if (tavilySecureKey) {
      setTavilyApiKey(tavilySecureKey);
    }
  }, [
    providerSettings,
    customProviders,
    searchProviders,
    tavilyApiKey,
    setProviderSettings,
    updateCustomProvider,
    setSearchProviderSettings,
    setTavilyApiKey,
  ]);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    const success = await stronghold.initialize(password);
    if (success) {
      setShowUnlockDialog(false);
      await hydrateApiKeysFromStronghold();
    }
    return success;
  }, [stronghold, hydrateApiKeysFromStronghold]);

  const lock = useCallback(async (): Promise<void> => {
    await stronghold.lock();
  }, [stronghold]);

  const value: StrongholdContextValue = {
    ...stronghold,
    unlock,
    lock,
    showUnlockDialog,
    setShowUnlockDialog,
  };

  return (
    <StrongholdContext.Provider value={value}>
      {children}
    </StrongholdContext.Provider>
  );
}

export function useStrongholdContext() {
  const context = useContext(StrongholdContext);
  if (!context) {
    throw new Error('useStrongholdContext must be used within a StrongholdProvider');
  }
  return context;
}

export function useStrongholdOptional() {
  return useContext(StrongholdContext);
}

export default StrongholdProvider;
