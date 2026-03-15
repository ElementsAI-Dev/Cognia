export type PluginCapabilitySupport = 'supported' | 'partial' | 'experimental' | 'blocked';

export interface CapabilityContractEntry {
  id: string;
  support: PluginCapabilitySupport;
}

const CAPABILITY_CONTRACTS: readonly CapabilityContractEntry[] = [
  { id: 'tools', support: 'supported' },
  { id: 'components', support: 'supported' },
  { id: 'modes', support: 'supported' },
  { id: 'skills', support: 'blocked' },
  { id: 'themes', support: 'partial' },
  { id: 'commands', support: 'supported' },
  { id: 'hooks', support: 'supported' },
  { id: 'processors', support: 'experimental' },
  { id: 'providers', support: 'experimental' },
  { id: 'exporters', support: 'partial' },
  { id: 'importers', support: 'partial' },
  { id: 'a2ui', support: 'supported' },
  { id: 'python', support: 'supported' },
  { id: 'scheduler', support: 'supported' },
] as const;

const contractMap = new Map(CAPABILITY_CONTRACTS.map((entry) => [entry.id, entry]));

export interface CapabilityValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateCapabilityContract(capabilities: string[] = []): CapabilityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const capability of capabilities) {
    const contract = contractMap.get(capability);
    if (!contract) {
      errors.push(`Capability "${capability}" is unknown to the SDK capability matrix.`);
      continue;
    }

    if (contract.support === 'blocked') {
      errors.push(`Capability "${capability}" is blocked by the current host capability matrix.`);
      continue;
    }

    if (contract.support !== 'supported') {
      warnings.push(`Capability "${capability}" is only ${contract.support}ly supported by the current host capability matrix.`);
    }
  }

  return { errors, warnings };
}
