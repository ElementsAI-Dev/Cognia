import type { PluginCapability } from '@/types/plugin';
import type { PluginPointGovernanceMode } from './plugin-points';

export type PluginCapabilitySupport = 'supported' | 'partial' | 'experimental' | 'blocked';

export interface PluginCapabilityContract {
  id: PluginCapability;
  support: PluginCapabilitySupport;
  manifestFields: readonly string[];
  runtimeBinding: string;
  docs: string;
  requiredTests: readonly string[];
}

export interface PluginCapabilityDiagnostic {
  code:
    | 'plugin.capability.unknown'
    | 'plugin.capability.partial'
    | 'plugin.capability.experimental'
    | 'plugin.capability.blocked';
  severity: 'warning' | 'error';
  capability: string;
  message: string;
  hint?: string;
  contract?: PluginCapabilityContract;
}

export interface PluginCapabilityValidationOutcome {
  allowed: boolean;
  diagnostics: PluginCapabilityDiagnostic[];
}

export const PLUGIN_CAPABILITY_CONTRACTS: readonly PluginCapabilityContract[] = [
  {
    id: 'tools',
    support: 'supported',
    manifestFields: ['tools'],
    runtimeBinding: 'context.agent.registerTool + PluginRegistry tools',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['lib/plugin/core/manager.test.ts', 'lib/plugin/package/marketplace-install-descriptor.test.ts'],
  },
  {
    id: 'components',
    support: 'supported',
    manifestFields: ['a2uiComponents'],
    runtimeBinding: 'context.a2ui.registerComponent + Plugin A2UI bridge',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['stores/plugin/plugin-store.test.ts'],
  },
  {
    id: 'modes',
    support: 'supported',
    manifestFields: ['modes'],
    runtimeBinding: 'PluginRegistry modes',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['lib/plugin/core/manager.test.ts'],
  },
  {
    id: 'skills',
    support: 'blocked',
    manifestFields: [],
    runtimeBinding: 'No host skill runtime binding',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['lib/plugin/core/validation.test.ts'],
  },
  {
    id: 'themes',
    support: 'partial',
    manifestFields: [],
    runtimeBinding: 'Theme API surface exists without full extension lifecycle parity',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['lib/plugin/core/validation.test.ts'],
  },
  {
    id: 'commands',
    support: 'supported',
    manifestFields: ['commands'],
    runtimeBinding: 'PluginRegistry commands + slash command registry',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['lib/plugin/core/manager.test.ts'],
  },
  {
    id: 'hooks',
    support: 'supported',
    manifestFields: [],
    runtimeBinding: 'PluginLifecycleHooks + hooks-system',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['lib/plugin/core/manager.test.ts'],
  },
  {
    id: 'processors',
    support: 'experimental',
    manifestFields: [],
    runtimeBinding: 'No stable processor pipeline contract yet',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['lib/plugin/core/validation.test.ts'],
  },
  {
    id: 'providers',
    support: 'experimental',
    manifestFields: [],
    runtimeBinding: 'Provider extension integration is not production-ready',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['lib/plugin/core/validation.test.ts'],
  },
  {
    id: 'exporters',
    support: 'partial',
    manifestFields: [],
    runtimeBinding: 'Export API exists without full package/runtime parity',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['lib/plugin/core/validation.test.ts'],
  },
  {
    id: 'importers',
    support: 'partial',
    manifestFields: [],
    runtimeBinding: 'Import API exists without full package/runtime parity',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['lib/plugin/core/validation.test.ts'],
  },
  {
    id: 'a2ui',
    support: 'supported',
    manifestFields: ['a2uiComponents', 'a2uiTemplates'],
    runtimeBinding: 'Plugin A2UI bridge',
    docs: 'docs/features/plugin-development.md#a2ui-integration',
    requiredTests: ['stores/plugin/plugin-store.test.ts'],
  },
  {
    id: 'python',
    support: 'supported',
    manifestFields: ['pythonMain', 'pythonDependencies'],
    runtimeBinding: 'PyO3/Tauri python runtime',
    docs: 'docs/features/plugin-development.md#plugin-types',
    requiredTests: ['lib/plugin/core/manager.test.ts'],
  },
  {
    id: 'scheduler',
    support: 'supported',
    manifestFields: ['scheduledTasks'],
    runtimeBinding: 'Plugin scheduler executor',
    docs: 'docs/features/plugin-development.md#capabilities',
    requiredTests: ['plugin-sdk/typescript/src/manifest/types.test.ts'],
  },
] as const;

export const CANONICAL_PLUGIN_CAPABILITIES = PLUGIN_CAPABILITY_CONTRACTS.map((entry) => entry.id) as readonly PluginCapability[];

const capabilityContractMap = new Map(
  PLUGIN_CAPABILITY_CONTRACTS.map((entry) => [entry.id, entry]),
);

export function getPluginCapabilityContract(
  capability: PluginCapability | string,
): PluginCapabilityContract | undefined {
  return capabilityContractMap.get(capability as PluginCapability);
}

export function validatePluginCapabilities(
  capabilities: readonly string[],
  options: { governanceMode?: PluginPointGovernanceMode } = {},
): PluginCapabilityValidationOutcome {
  const governanceMode = options.governanceMode || 'warn';
  const diagnostics: PluginCapabilityDiagnostic[] = [];

  for (const capability of capabilities) {
    const contract = getPluginCapabilityContract(capability);
    if (!contract) {
      diagnostics.push({
        code: 'plugin.capability.unknown',
        severity: 'error',
        capability,
        message: `Unknown capability "${capability}".`,
      });
      continue;
    }

    if (contract.support === 'supported') {
      continue;
    }

    if (contract.support === 'blocked') {
      diagnostics.push({
        code: 'plugin.capability.blocked',
        severity: governanceMode === 'block' ? 'error' : 'warning',
        capability,
        message: `Capability "${capability}" is blocked by the current host contract.`,
        hint: `Remove "${capability}" from the manifest or wait until the host exposes a supported runtime binding.`,
        contract,
      });
      continue;
    }

    diagnostics.push({
      code:
        contract.support === 'partial'
          ? 'plugin.capability.partial'
          : 'plugin.capability.experimental',
      severity: 'warning',
      capability,
      message: `Capability "${capability}" is only ${contract.support}ly supported by the current host contract.`,
      hint: `Use "${capability}" with caution until host/runtime parity is completed.`,
      contract,
    });
  }

  return {
    allowed: diagnostics.every((entry) => entry.severity !== 'error'),
    diagnostics,
  };
}
