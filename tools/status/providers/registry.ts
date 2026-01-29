/**
 * Provider registry for status monitoring
 */

import type { ProviderConfig } from '../types.js'
import { allConfigs } from './configs.js'

const providerMap = new Map<string, ProviderConfig>()

// Initialize registry
for (const config of allConfigs) {
  providerMap.set(config.id, config)
}

export function getProvider(id: string): ProviderConfig | undefined {
  return providerMap.get(id)
}

export function getAllProviders(): ProviderConfig[] {
  return Array.from(providerMap.values())
}

export function getProvidersByRegion(region: 'US' | 'CN' | 'EU'): ProviderConfig[] {
  return getAllProviders().filter((p) => p.region === region)
}

export function listProviderIds(): string[] {
  return Array.from(providerMap.keys())
}

export function hasProvider(id: string): boolean {
  return providerMap.has(id)
}

export function getProviderCount(): number {
  return providerMap.size
}

export function getRegionCounts(): Record<string, number> {
  const counts: Record<string, number> = { US: 0, CN: 0, EU: 0 }
  for (const config of providerMap.values()) {
    counts[config.region] = (counts[config.region] || 0) + 1
  }
  return counts
}
