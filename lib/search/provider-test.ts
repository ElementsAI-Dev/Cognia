/**
 * Search provider connection testing utility
 * Extracted from components/settings/system/search-settings.tsx
 */

import type { SearchProviderSettings, SearchProviderType } from '@/types/search';

/**
 * Test provider connection via API route (to avoid importing server-only modules)
 * @param provider - The search provider type to test
 * @param apiKey - The API key to test
 * @returns Promise<boolean> - True if connection is successful
 */
export async function testProviderConnection(
  provider: SearchProviderType,
  apiKey: string,
  providerSettings?: Partial<SearchProviderSettings>
): Promise<boolean> {
  try {
    const response = await fetch('/api/search/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        apiKey,
        providerSettings,
      }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}
