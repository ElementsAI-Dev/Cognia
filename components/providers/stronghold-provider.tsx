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
  const [showUnlockDialog, setShowUnlockDialog] = useState(() => {
    // Initialize based on autoPrompt preference
    return autoPrompt;
  });

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    const success = await stronghold.initialize(password);
    if (success) {
      setShowUnlockDialog(false);
    }
    return success;
  }, [stronghold]);

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
