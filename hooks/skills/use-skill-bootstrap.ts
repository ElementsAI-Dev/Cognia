'use client';

import { useCallback, useEffect } from 'react';
import { createLogger } from '@/lib/logger';
import type {
  Skill,
  SkillActivationJournal,
  SkillBootstrapFailureSeverity,
  SkillBootstrapPhase,
  SkillBootstrapPhaseStatus,
  SkillBootstrapPhaseTelemetry,
} from '@/types/system/skill';
import {
  activateSkillsTransactional,
  assertRequiredPhasesCompleted,
  classifyBootstrapFailure,
  resolveSkillActivationOrder,
} from '@/lib/skills/bootstrap-lifecycle';
import { getAllBuiltinSkills } from '@/lib/skills/builtin';
import { useSkillStore } from '@/stores/skills/skill-store';
import { useNativeSkills } from './use-native-skills';
import { useSkillSync, useSkillSyncAvailable } from './use-skill-sync';

interface RunBootstrapOptions {
  loadBuiltinSkills?: boolean;
  force?: boolean;
  safeToKeepSkillIds?: string[];
}

interface UseSkillBootstrapReturn {
  bootstrapState: 'idle' | 'syncing' | 'ready' | 'error';
  bootstrapPhase: SkillBootstrapPhase;
  bootstrapPhaseStatus: SkillBootstrapPhaseStatus;
  bootstrapTelemetry: SkillBootstrapPhaseTelemetry[];
  bootstrapFailureSeverity: SkillBootstrapFailureSeverity | null;
  lastActivationJournal: SkillActivationJournal | null;
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
    bootstrapPhase,
    bootstrapPhaseStatus,
    bootstrapTelemetry,
    bootstrapFailureSeverity,
    lastActivationJournal,
    lastBootstrapAt,
    lastBootstrapError,
    importBuiltinSkills,
    validateSkill,
    activateSkill,
    deactivateSkill,
    setBootstrapState,
    setBootstrapPhase,
    appendBootstrapTelemetry,
    setLastActivationJournal,
    setSyncMetadata,
  } = useSkillStore();
  const { syncFromNative } = useSkillSync();
  const { installed: nativeInstalled } = useNativeSkills();
  const isNativeAvailable = useSkillSyncAvailable();

  const runBootstrap = useCallback(async (options: RunBootstrapOptions = {}) => {
    const {
      loadBuiltinSkills = true,
      force = false,
      safeToKeepSkillIds = [],
    } = options;

    if (bootstrapCompleted && !force) {
      return;
    }
    if (bootstrapPromise && !force) {
      return bootstrapPromise;
    }

    const phaseSet = new Set<SkillBootstrapPhase>();
    let activationJournal: SkillActivationJournal | null = null;
    let currentPhase: SkillBootstrapPhase = 'hydrate';

    const beginPhase = (phase: SkillBootstrapPhase, affectedSkillIds: string[] = []): Date => {
      currentPhase = phase;
      const startedAt = new Date();
      setBootstrapPhase(phase, 'running', {
        startedAt,
        endedAt: null,
        errorCode: null,
        errorMessage: null,
        errorSeverity: null,
        affectedSkillIds,
      });
      appendBootstrapTelemetry({
        phase,
        status: 'running',
        startedAt,
        affectedSkillIds,
      });
      return startedAt;
    };

    const completePhase = (
      phase: SkillBootstrapPhase,
      startedAt: Date,
      affectedSkillIds: string[] = [],
      status: SkillBootstrapPhaseStatus = 'success'
    ) => {
      const endedAt = new Date();
      setBootstrapPhase(phase, status, {
        startedAt,
        endedAt,
        affectedSkillIds,
      });
      appendBootstrapTelemetry({
        phase,
        status,
        startedAt,
        endedAt,
        affectedSkillIds,
      });
      if (status === 'success') {
        phaseSet.add(phase);
      }
    };

    const execute = async () => {
      setBootstrapState('syncing', null);
      setLastActivationJournal(null);
      setSyncMetadata({
        syncState: 'syncing',
        lastSyncDirection: 'bootstrap',
        lastSyncOutcome: 'idle',
        lastSyncError: null,
      });

      const hydrateStartedAt = beginPhase('hydrate');
      completePhase('hydrate', hydrateStartedAt);

      const discoverStartedAt = beginPhase('discover');
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

      const discoveredSkills = Object.values(useSkillStore.getState().skills)
        .filter((skill) => skill.status === 'enabled');
      completePhase('discover', discoverStartedAt, discoveredSkills.map((skill) => skill.id));

      const validateStartedAt = beginPhase('validate', discoveredSkills.map((skill) => skill.id));
      const invalidSkills = discoveredSkills
        .map((skill) => ({
          skill,
          errors: validateSkill(skill).filter((error) => error.severity === 'error'),
        }))
        .filter((entry) => entry.errors.length > 0);

      if (invalidSkills.length > 0) {
        throw new Error(
          `Skill validation failed: ${invalidSkills.map((entry) => entry.skill.id).join(', ')}`
        );
      }
      completePhase('validate', validateStartedAt, discoveredSkills.map((skill) => skill.id));

      const resolveOrderStartedAt = beginPhase('resolve_order', discoveredSkills.map((skill) => skill.id));
      const orderResult = resolveSkillActivationOrder(discoveredSkills);
      if (orderResult.missingDependencies.length > 0) {
        throw new Error(
          `Missing dependencies: ${orderResult.missingDependencies
            .map((entry) => `${entry.skillId}->${entry.dependency}`)
            .join(', ')}`
        );
      }
      if (orderResult.cycles.length > 0) {
        throw new Error(`Dependency cycle detected: ${orderResult.cycles.join(', ')}`);
      }
      const orderedSkills = orderResult.ordered;
      completePhase('resolve_order', resolveOrderStartedAt, orderedSkills.map((skill) => skill.id));

      const activateStartedAt = beginPhase('activate', orderedSkills.map((skill) => skill.id));
      const safeToKeepSet = new Set(safeToKeepSkillIds);
      const activationCandidates = orderedSkills
        .filter((skill) => skill.isActive || skill.tags.includes('auto-activate'));

      const activationResult = await activateSkillsTransactional({
        skills: activationCandidates,
        activate: async (skill: Skill) => {
          if (!skill.isActive) {
            activateSkill(skill.id);
          }
        },
        deactivate: async (skill: Skill) => {
          deactivateSkill(skill.id);
        },
        isSafeToKeep: (skill: Skill) => safeToKeepSet.has(skill.id),
      });

      activationJournal = activationResult.journal;
      setLastActivationJournal(activationJournal);
      if (activationResult.failure && activationResult.failure.severity === 'hard') {
        throw new Error(`${activationResult.failure.code}: ${activationResult.failure.message}`);
      }

      completePhase('activate', activateStartedAt, activationCandidates.map((skill) => skill.id));

      const verifyStartedAt = beginPhase('verify');
      assertRequiredPhasesCompleted(new Set<SkillBootstrapPhase>([...phaseSet, 'verify']));

      if (activationJournal.outcome === 'rolled_back' || activationJournal.failed.length > 0) {
        throw new Error('Verification failed: activation run did not commit successfully');
      }

      completePhase('verify', verifyStartedAt);

      const readyAt = new Date();
      setBootstrapPhase('ready', 'success', {
        startedAt: readyAt,
        endedAt: readyAt,
      });
      appendBootstrapTelemetry({
        phase: 'ready',
        status: 'success',
        startedAt: readyAt,
        endedAt: readyAt,
      });

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
        const failure = classifyBootstrapFailure(currentPhase, error);
        const failedAt = new Date();

        setBootstrapPhase('failed', 'error', {
          startedAt: failedAt,
          endedAt: failedAt,
          errorCode: failure.code,
          errorMessage: failure.message,
          errorSeverity: failure.severity,
          affectedSkillIds: activationJournal?.attempted ?? [],
        });

        appendBootstrapTelemetry({
          phase: currentPhase,
          status: 'error',
          startedAt: failedAt,
          endedAt: failedAt,
          errorCode: failure.code,
          errorMessage: failure.message,
          affectedSkillIds: activationJournal?.attempted ?? [],
        });

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
          phase: currentPhase,
          failureCode: failure.code,
          failureSeverity: failure.severity,
        });
        throw error;
      })
      .finally(() => {
        bootstrapPromise = null;
      });

    return bootstrapPromise;
  }, [
    activateSkill,
    appendBootstrapTelemetry,
    deactivateSkill,
    importBuiltinSkills,
    isNativeAvailable,
    nativeInstalled.length,
    setBootstrapPhase,
    setBootstrapState,
    setLastActivationJournal,
    setSyncMetadata,
    syncFromNative,
    validateSkill,
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
    bootstrapPhase,
    bootstrapPhaseStatus,
    bootstrapTelemetry,
    bootstrapFailureSeverity,
    lastActivationJournal,
    lastBootstrapAt,
    lastBootstrapError,
    runBootstrap,
  };
}

export default useSkillBootstrap;
