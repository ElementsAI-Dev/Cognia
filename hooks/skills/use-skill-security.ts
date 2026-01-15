/**
 * useSkillSecurity - Hook for skill security scanning
 *
 * Provides security scanning functionality for skills
 */

import { useState, useCallback } from 'react';
import * as nativeSkill from '@/lib/native/skill';
import type {
  SecurityScanReport,
  SecurityScanOptions,
  SecurityFinding,
  SecuritySeverity,
} from '@/lib/native/skill';

export type {
  SecurityScanReport,
  SecurityScanOptions,
  SecurityFinding,
  SecuritySeverity,
};

interface UseSkillSecurityState {
  isScanning: boolean;
  lastReport: SecurityScanReport | null;
  error: string | null;
  ruleCount: number | null;
}

interface UseSkillSecurityActions {
  scanInstalled: (directory: string, options?: SecurityScanOptions) => Promise<SecurityScanReport | null>;
  scanPath: (path: string, options?: SecurityScanOptions) => Promise<SecurityScanReport | null>;
  clearReport: () => void;
  clearError: () => void;
  loadRuleCount: () => Promise<void>;
}

export type UseSkillSecurityReturn = UseSkillSecurityState & UseSkillSecurityActions;

/**
 * Get severity badge color
 */
export function getSeverityColor(severity: SecuritySeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-600 text-white';
    case 'high':
      return 'bg-orange-500 text-white';
    case 'medium':
      return 'bg-yellow-500 text-black';
    case 'low':
      return 'bg-blue-500 text-white';
    case 'info':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
}

/**
 * Get severity label
 */
export function getSeverityLabel(severity: SecuritySeverity): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    case 'info':
      return 'Info';
    default:
      return 'Unknown';
  }
}

/**
 * Get category label
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    command_execution: 'Command Execution',
    code_injection: 'Code Injection',
    filesystem_access: 'Filesystem Access',
    network_access: 'Network Access',
    sensitive_data: 'Sensitive Data',
    privilege_escalation: 'Privilege Escalation',
    obfuscated_code: 'Obfuscated Code',
    other: 'Other',
  };
  return labels[category] || category;
}

/**
 * Get risk score color
 */
export function getRiskScoreColor(score: number): string {
  if (score >= 75) return 'text-red-600';
  if (score >= 50) return 'text-orange-500';
  if (score >= 25) return 'text-yellow-600';
  return 'text-green-600';
}

/**
 * Hook for skill security scanning
 */
export function useSkillSecurity(): UseSkillSecurityReturn {
  const [state, setState] = useState<UseSkillSecurityState>({
    isScanning: false,
    lastReport: null,
    error: null,
    ruleCount: null,
  });

  const isAvailable = nativeSkill.isNativeSkillAvailable();

  const scanInstalled = useCallback(
    async (directory: string, options?: SecurityScanOptions): Promise<SecurityScanReport | null> => {
      if (!isAvailable) {
        setState((s) => ({ ...s, error: 'Native skill service not available' }));
        return null;
      }

      setState((s) => ({ ...s, isScanning: true, error: null }));

      try {
        const report = await nativeSkill.scanInstalledSkill(directory, options);
        setState((s) => ({ ...s, isScanning: false, lastReport: report }));
        return report;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setState((s) => ({ ...s, isScanning: false, error: errorMsg }));
        return null;
      }
    },
    [isAvailable]
  );

  const scanPath = useCallback(
    async (path: string, options?: SecurityScanOptions): Promise<SecurityScanReport | null> => {
      if (!isAvailable) {
        setState((s) => ({ ...s, error: 'Native skill service not available' }));
        return null;
      }

      setState((s) => ({ ...s, isScanning: true, error: null }));

      try {
        const report = await nativeSkill.scanSkillPath(path, options);
        setState((s) => ({ ...s, isScanning: false, lastReport: report }));
        return report;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setState((s) => ({ ...s, isScanning: false, error: errorMsg }));
        return null;
      }
    },
    [isAvailable]
  );

  const clearReport = useCallback(() => {
    setState((s) => ({ ...s, lastReport: null }));
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const loadRuleCount = useCallback(async () => {
    if (!isAvailable) return;
    try {
      const count = await nativeSkill.getSecurityRuleCount();
      setState((s) => ({ ...s, ruleCount: count }));
    } catch {
      // Ignore errors for rule count
    }
  }, [isAvailable]);

  return {
    ...state,
    scanInstalled,
    scanPath,
    clearReport,
    clearError,
    loadRuleCount,
  };
}

export default useSkillSecurity;
