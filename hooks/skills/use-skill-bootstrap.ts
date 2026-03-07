'use client';

import { useCallback, useEffect } from 'react';
import { createLogger } from '@/lib/logger';
import { getAllBuiltinSkills } from '@/lib/skills/builtin';
import { useSkillStore } from '@/stores/skills/skill-store';
import { useNativeSkills } from './use-native-skills';
import { useSkillSync, useSkillSyncAvailable } from './use-skill-sync';

interface RunBootstrapOptions {
  loadBuiltinSkills?: boolean;
  force?: boolean;
}

interface UseSkillBootstrapReturn {
  bootstrapState: 'idle' | 'syncing' | 'ready' | 'error';
  lastBootstrapAt: Date | null;
  lastBootstrapError: string | null;
  runBootstrap: (options?: RunBootstrapOptions) => Promise<void>;
}

const skillBootstrapLogger = createLogger('skills:bootstrap');

let bootstrapPromise: Promise<void> | null = null;
let bootstrapCompleted = false;
let nativeFollowUpRequired = false;
let nativeFollowUpPromise: Promise<void> | null = null;

export function resetSkillBootstrapForTests(): void {
  bootstrapPromise = null;
  bootstrapCompleted = false;
  nativeFollowUpRequired = false;
  nativeFollowUpPromise = null;
}

export function useSkillBootstrap(): UseSkillBootstrapReturn {
  const {
    bootstrapState,
    lastBootstrapAt,
    lastBootstrapError,
    importBuiltinSkills,
    setBootstrapState,
    setSyncMetadata,
  } = useSkillStore();
  const { syncFromNative } = useSkillSync();
  const { installed: nativeInstalled } = useNativeSkills();
  const isNativeAvailable = useSkillSyncAvailable();

  const runBootstrap = useCallback(async (options: RunBootstrapOptions = {}) => {
    const {
      loadBuiltinSkills = true,
      force = false,
    } = options;

    if (bootstrapCompleted && !force) {
      return;
    }
    if (bootstrapPromise && !force) {
      return bootstrapPromise;
    }

    const execute = async () => {
      setBootstrapState('syncing', null);
      setSyncMetadata({
        syncState: 'syncing',
        lastSyncDirection: 'bootstrap',
        lastSyncOutcome: 'idle',
        lastSyncError: null,
      });

      if (loadBuiltinSkills) {
        const builtinSkills = getAllBuiltinSkills();
        importBuiltinSkills(builtinSkills);
        skillBootstrapLogger.info('Reconciled built-in skills during bootstrap', {
          action: 'runBootstrap',
          count: builtinSkills.length,
        });
      }

      if (isNativeAvailable) {
        await syncFromNative();
        nativeFollowUpRequired = nativeInstalled.length === 0;
      }

      setBootstrapState('ready', null);
      setSyncMetadata({
        syncState: 'ready',
        lastSyncDirection: 'bootstrap',
        lastSyncOutcome: 'success',
        lastSyncError: null,
        lastSyncAt: new Date(),
      });
      bootstrapCompleted = true;
    };

    bootstrapPromise = execute()
      .catch((error) => {
        setBootstrapState('error', 'i18n:syncBootstrapFailed');
        setSyncMetadata({
          syncState: 'error',
          lastSyncDirection: 'bootstrap',
          lastSyncOutcome: 'failure',
          lastSyncError: 'i18n:syncBootstrapFailed',
          lastSyncAt: new Date(),
        });
        skillBootstrapLogger.error('Skill bootstrap failed', error as Error, {
          action: 'runBootstrap',
        });
        throw error;
      })
      .finally(() => {
        bootstrapPromise = null;
      });

    return bootstrapPromise;
  }, [
    importBuiltinSkills,
    isNativeAvailable,
    nativeInstalled.length,
    setBootstrapState,
    setSyncMetadata,
    syncFromNative,
  ]);

  useEffect(() => {
    if (!isNativeAvailable || !bootstrapCompleted || !nativeFollowUpRequired) {
      return;
    }
    if (nativeInstalled.length === 0 || nativeFollowUpPromise) {
      return;
    }

    nativeFollowUpPromise = (async () => {
      skillBootstrapLogger.info('Running follow-up native reconciliation after bootstrap', {
        action: 'followUpNativeReconcile',
        nativeInstalled: nativeInstalled.length,
      });

      setSyncMetadata({
        syncState: 'syncing',
        lastSyncDirection: 'from-native',
        lastSyncOutcome: 'idle',
        lastSyncError: null,
      });

      try {
        await syncFromNative();
        nativeFollowUpRequired = false;
      } catch (error) {
        setSyncMetadata({
          syncState: 'error',
          lastSyncDirection: 'from-native',
          lastSyncOutcome: 'failure',
          lastSyncError: 'i18n:syncFromNativeFailed',
          lastSyncAt: new Date(),
        });
        skillBootstrapLogger.error('Follow-up native reconciliation failed', error as Error, {
          action: 'followUpNativeReconcile',
        });
      } finally {
        nativeFollowUpPromise = null;
      }
    })();
  }, [
    isNativeAvailable,
    nativeInstalled.length,
    setSyncMetadata,
    syncFromNative,
  ]);

  return {
    bootstrapState,
    lastBootstrapAt,
    lastBootstrapError,
    runBootstrap,
  };
}

export default useSkillBootstrap;
